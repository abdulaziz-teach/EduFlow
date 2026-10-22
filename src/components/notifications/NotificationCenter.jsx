import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import {
  Bell,
  Trash2,
  Check,
  ExternalLink,
  Loader2,
  Trophy,
  Flame,
  Sparkles,
  BookOpen,
  Clock,
  ShieldAlert,
  Layers,
} from 'lucide-react';
import notificationsService from '../../services/notifications';

function getNotificationIcon(type) {
  const t = String(type).toUpperCase();
  if (t.includes('ACHIEVEMENT') || t.includes('WALLET')) {
    return <Trophy className="w-3.5 h-3.5 text-amber-400" />;
  }
  if (t.includes('STREAK')) {
    return <Flame className="w-3.5 h-3.5 text-orange-400" />;
  }
  if (t.includes('INSIGHT') || t.includes('RECOMMENDATION') || t.includes('REVIEW_RECOMMENDATION')) {
    return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
  }
  if (t.includes('COURSE')) {
    return <BookOpen className="w-3.5 h-3.5 text-blue-400" />;
  }
  if (t.includes('FLASHCARD')) {
    return <Layers className="w-3.5 h-3.5 text-emerald-400" />;
  }
  if (t.includes('SECURITY') || t.includes('SYSTEM')) {
    return <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />;
  }
  return <Clock className="w-3.5 h-3.5 text-primary" />;
}

function NotificationCenter() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'unread'
  const containerRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const res = await notificationsService.getUnreadCount();
      setUnreadCount(res.data?.unreadCount ?? res.unreadCount ?? 0);
    } catch (err) {
      console.error('Failed to fetch unread count:', err.message);
    }
  };

  const loadNotificationsList = async () => {
    setLoading(true);
    try {
      const res = await notificationsService.getNotifications({ limit: 15 });
      const data = res.data || res;
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount ?? 0);
    } catch (err) {
      console.error('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Poll unread count periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 30000);
    return () => clearInterval(interval);
  }, []);

  // Handle outside clicks to close dropdown
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const toggleDropdown = () => {
    const next = !isOpen;
    setIsOpen(next);
    if (next) {
      loadNotificationsList();
    }
  };

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.read) {
      try {
        await notificationsService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true } : n))
        );
        fetchUnreadCount();
      } catch (err) {
        console.error('Failed to mark notification as read:', err.message);
      }
    }
    if (notif.link && typeof notif.link === 'string' && notif.link.startsWith('/')) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (err) {
      console.error('Failed to mark all as read:', err.message);
    }
  };

  const handleDelete = async (e, id) => {
    e.stopPropagation();
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
      fetchUnreadCount();
    } catch (err) {
      console.error('Failed to delete notification:', err.message);
    }
  };

  const formatRelativeTime = (dateStr) => {
    if (!dateStr) return '';
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.max(0, Math.round(diffMs / 1000));
    const diffMins = Math.round(diffSecs / 60);
    const diffHrs = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHrs / 24);

    if (diffSecs < 60) return '1m';
    if (diffMins < 60) return `${diffMins}m`;
    if (diffHrs < 24) return `${diffHrs}h`;
    return `${diffDays}d`;
  };

  const displayedNotifications =
    activeTab === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  return (
    <div className="relative font-sans select-none" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        aria-label={t('notifications.title')}
        className="relative p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 text-muted hover:text-text transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border border-[#0B0F19] shadow-sm">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="fixed sm:absolute right-2 sm:right-0 top-16 sm:top-auto sm:mt-2.5 w-[calc(100vw-1rem)] max-w-[360px] sm:w-96 rounded-2xl border border-white/10 bg-[#111827] shadow-2xl z-50 overflow-hidden animate-fade-in max-h-[80vh] sm:max-h-[520px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/5">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-text">{t('notifications.title')}</h4>
                {unreadCount > 0 && (
                  <span className="px-1.5 py-0.5 rounded-full text-[10px] font-bold bg-primary/20 text-primary border border-primary/30">
                    {unreadCount}
                  </span>
                )}
              </div>
              {unreadCount > 0 && (
                <button
                  onClick={handleMarkAllRead}
                  className="text-[11px] font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <Check className="w-3.5 h-3.5" />
                  {t('notifications.markAllRead')}
                </button>
              )}
            </div>

            {/* Sub-tabs */}
            <div className="flex gap-2">
              <button
                onClick={() => setActiveTab('all')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'all'
                    ? 'bg-white/10 text-text'
                    : 'text-muted hover:text-text hover:bg-white/[0.04]'
                }`}
              >
                {t('notifications.filters.all')}
              </button>
              <button
                onClick={() => setActiveTab('unread')}
                className={`px-3 py-1 rounded-lg text-xs font-semibold transition-all ${
                  activeTab === 'unread'
                    ? 'bg-white/10 text-text'
                    : 'text-muted hover:text-text hover:bg-white/[0.04]'
                }`}
              >
                {t('notifications.unreadOnly')} {unreadCount > 0 ? `(${unreadCount})` : ''}
              </button>
            </div>
          </div>

          {/* List area */}
          <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-xs text-muted">
                  {activeTab === 'unread'
                    ? (t('notifications.noUnread') || 'No unread notifications.')
                    : t('notifications.noNotifications')}
                </p>
                <p className="text-[11px] text-muted/60 mt-1">
                  {t('notifications.emptyDesc') || 'Study reminders and achievements will appear here.'}
                </p>
              </div>
            ) : (
              displayedNotifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-3.5 flex gap-3 transition-colors cursor-pointer hover:bg-white/[0.03] ${
                    !notif.read ? 'bg-primary/[0.03]' : ''
                  }`}
                >
                  {/* Category Icon */}
                  <div className="shrink-0 w-8 h-8 rounded-lg bg-white/[0.04] border border-white/5 flex items-center justify-center self-start mt-0.5">
                    {getNotificationIcon(notif.type)}
                  </div>

                  {/* Message body */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <p
                        className={`text-xs font-semibold text-text truncate ${
                          !notif.read ? 'font-bold text-text' : 'text-text/90'
                        }`}
                      >
                        {notif.title}
                      </p>
                      {notif.priority === 'urgent' && (
                        <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-rose-500/20 text-rose-400 border border-rose-500/30">
                          {t('notifications.urgent') || 'Urgent'}
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-muted leading-relaxed line-clamp-2 text-left break-words">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-muted/60 block">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1 self-center">
                    {notif.link && <ExternalLink className="w-3 h-3 text-muted/40" />}
                    <button
                      onClick={(e) => handleDelete(e, notif._id)}
                      className="p-1 rounded hover:bg-white/[0.06] text-muted/40 hover:text-rose-400 transition-all cursor-pointer"
                      title={t('common.delete')}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer view all */}
          <Link
            to="/notifications"
            onClick={() => setIsOpen(false)}
            className="p-3 border-t border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-center text-xs font-bold text-primary hover:text-primary-hover block transition-colors cursor-pointer"
          >
            {t('notifications.viewAll')} &rarr;
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
