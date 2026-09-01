import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Bell, Trash2, Check, ExternalLink, Loader2 } from 'lucide-react';
import notificationsService from '../../services/notifications';

function NotificationCenter() {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef(null);

  const fetchUnreadCount = async () => {
    try {
      const data = await notificationsService.getUnreadCount();
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to fetch unread count:', err.message);
    }
  };

  const loadNotificationsList = async () => {
    setLoading(true);
    try {
      const data = await notificationsService.getNotifications();
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (err) {
      console.error('Failed to load notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  // Poll unread count every 30 seconds
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
    setIsOpen(!isOpen);
    if (!isOpen) {
      loadNotificationsList();
    }
  };

  const handleNotificationClick = async (notif) => {
    setIsOpen(false);
    if (!notif.read) {
      try {
        await notificationsService.markAsRead(notif._id);
        fetchUnreadCount();
      } catch (err) {
        console.error('Failed to mark notification as read:', err.message);
      }
    }
    if (notif.link) {
      // Validate that it is an internal application link
      if (notif.link.startsWith('/')) {
        navigate(notif.link);
      }
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

  // Helper to format relative time
  const formatRelativeTime = (dateStr) => {
    const now = new Date();
    const date = new Date(dateStr);
    const diffMs = now.getTime() - date.getTime();
    const diffSecs = Math.round(diffMs / 1000);
    const diffMins = Math.round(diffSecs / 60);
    const diffHrs = Math.round(diffMins / 60);
    const diffDays = Math.round(diffHrs / 24);

    if (diffSecs < 60) return 'just now';
    if (diffMins < 60) return `${diffMins} min ago`;
    if (diffHrs < 24) return `${diffHrs} hr ago`;
    return `${diffDays} days ago`;
  };

  return (
    <div className="relative font-sans select-none" ref={containerRef}>
      {/* Bell Button */}
      <button
        onClick={toggleDropdown}
        aria-label="Notifications"
        className="relative p-2 rounded-lg bg-white/[0.02] border border-white/5 hover:bg-white/[0.06] hover:border-white/10 text-muted hover:text-text transition-all cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50"
      >
        <Bell className="w-4.5 h-4.5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-[16px] px-1 rounded-full bg-rose-500 text-[10px] font-bold text-white flex items-center justify-center border border-[#0B0F19]">
            {unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2.5 w-80 sm:w-96 rounded-2xl border border-white/5 bg-[#111827] shadow-2xl z-50 overflow-hidden animate-fade-in max-h-[480px] flex flex-col">
          {/* Header */}
          <div className="p-4 border-b border-white/5 flex items-center justify-between">
            <h4 className="text-sm font-bold text-text">Notifications</h4>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="text-[10px] font-bold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors cursor-pointer"
              >
                <Check className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
          </div>

          {/* List area */}
          <div className="overflow-y-auto flex-1 divide-y divide-white/[0.04]">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-5 h-5 text-primary animate-spin" />
              </div>
            ) : notifications.length === 0 ? (
              <div className="py-12 px-4 text-center">
                <p className="text-xs text-muted">You&apos;re all caught up.</p>
                <p className="text-[10px] text-muted/60 mt-1">Important study updates will appear here.</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif._id}
                  onClick={() => handleNotificationClick(notif)}
                  className={`p-4 flex gap-3 transition-colors cursor-pointer hover:bg-white/[0.02] ${
                    !notif.read ? 'bg-primary/[0.02]' : ''
                  }`}
                >
                  {/* Status dot */}
                  <div className="shrink-0 pt-1">
                    {!notif.read ? (
                      <span className="w-2 h-2 rounded-full bg-primary block" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-transparent block" />
                    )}
                  </div>

                  {/* Message body */}
                  <div className="flex-1 space-y-1 min-w-0">
                    <p className={`text-xs font-semibold text-text truncate ${!notif.read ? 'font-bold' : ''}`}>
                      {notif.title}
                    </p>
                    <p className="text-xs text-muted leading-normal text-left">
                      {notif.message}
                    </p>
                    <span className="text-[10px] text-muted/60 block">
                      {formatRelativeTime(notif.createdAt)}
                    </span>
                  </div>

                  {/* Actions */}
                  <div className="shrink-0 flex items-center gap-1.5 self-center">
                    {notif.link && <ExternalLink className="w-3 h-3 text-muted/40" />}
                    <button
                      onClick={(e) => handleDelete(e, notif._id)}
                      className="p-1 rounded hover:bg-white/[0.06] text-muted/40 hover:text-rose-400 transition-all cursor-pointer"
                      title="Delete notification"
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
            className="p-3 border-t border-white/5 bg-white/[0.01] hover:bg-white/[0.03] text-center text-xs font-bold text-muted hover:text-text block transition-colors cursor-pointer"
          >
            View all notifications
          </Link>
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
