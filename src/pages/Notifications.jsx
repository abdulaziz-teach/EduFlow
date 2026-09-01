import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, ArrowLeft, Trash2, Check, BellRing } from 'lucide-react';
import notificationsService from '../services/notifications';

function Notifications() {
  const navigate = useNavigate();
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = async () => {
    setLoading(true);
    setError('');
    try {
      const data = await notificationsService.getNotifications();
      setNotifications(data.notifications);
    } catch (err) {
      setError('Failed to load notifications list.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, []);

  const handleNotificationClick = async (notif) => {
    if (!notif.read) {
      try {
        await notificationsService.markAsRead(notif._id);
        setNotifications((prev) =>
          prev.map((n) => (n._id === notif._id ? { ...n, read: true, readAt: new Date() } : n))
        );
      } catch (err) {
        console.error('Failed to mark read:', err.message);
      }
    }
    if (notif.link && notif.link.startsWith('/')) {
      navigate(notif.link);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsService.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true, readAt: new Date() })));
    } catch (err) {
      setError('Failed to mark all notifications as read.');
    }
  };

  const handleDelete = async (id) => {
    try {
      await notificationsService.deleteNotification(id);
      setNotifications((prev) => prev.filter((n) => n._id !== id));
    } catch (err) {
      setError('Failed to delete notification.');
    }
  };

  const formatDate = (dateStr) => {
    return new Date(dateStr).toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="pt-24 pb-16 px-4 sm:px-6 lg:px-8 bg-[#0B0F19] min-h-screen text-text">
      <div className="max-w-3xl mx-auto space-y-6 font-sans">
        
        {/* Back Link */}
        <button
          onClick={() => navigate('/dashboard')}
          className="flex items-center gap-1.5 text-sm text-muted hover:text-text transition-colors cursor-pointer select-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Dashboard
        </button>

        {/* Header Title */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 select-none border-b border-white/5 pb-4">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold text-text mb-1 flex items-center gap-2">
              <BellRing className="w-6 h-6 text-primary" />
              Notifications
            </h1>
            <p className="text-xs text-muted">Stay updated on your personalized learning journey.</p>
          </div>

          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded bg-primary/10 border border-primary/20 text-primary hover:bg-primary/20 transition-all cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              Mark all as read
            </button>
          )}
        </div>

        {error && (
          <div className="p-3.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs md:text-sm text-rose-400 select-none">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-6 h-6 text-primary animate-spin" />
          </div>
        ) : notifications.length === 0 ? (
          /* Empty state */
          <div className="rounded-2xl border border-white/5 bg-[#111827] p-12 text-center max-w-md mx-auto select-none">
            <div className="w-14 h-14 rounded-full bg-white/[0.02] border border-white/5 flex items-center justify-center mx-auto mb-4">
              <BellRing className="w-6 h-6 text-muted/40" />
            </div>
            <h3 className="text-base font-bold text-text mb-1">You&apos;re all caught up</h3>
            <p className="text-xs text-muted">
              Important study updates and achievements will appear here.
            </p>
          </div>
        ) : (
          /* Full notifications list */
          <div className="space-y-3">
            {notifications.map((notif) => (
              <div
                key={notif._id}
                onClick={() => handleNotificationClick(notif)}
                className={`rounded-2xl border p-4 flex gap-4 transition-all cursor-pointer hover:bg-white/[0.02] ${
                  !notif.read
                    ? 'border-primary/20 bg-primary/[0.02]'
                    : 'border-white/5 bg-[#111827]/40'
                }`}
              >
                {/* Status Dot */}
                <div className="shrink-0 pt-1 select-none">
                  {!notif.read ? (
                    <span className="w-2.5 h-2.5 rounded-full bg-primary block" />
                  ) : (
                    <span className="w-2.5 h-2.5 rounded-full bg-transparent block" />
                  )}
                </div>

                {/* Message Body */}
                <div className="flex-1 space-y-1.5 min-w-0">
                  <div className="flex items-center gap-2 select-none">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded border capitalize ${
                      notif.type === 'achievement'
                        ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                        : notif.type === 'streak'
                          ? 'bg-orange-500/10 text-orange-400 border-orange-500/20'
                          : 'bg-white/[0.04] text-muted border-white/5'
                    }`}>
                      {notif.type.replace('_', ' ')}
                    </span>
                    <span className="text-[10px] text-muted">{formatDate(notif.createdAt)}</span>
                  </div>
                  
                  <h4 className={`text-xs md:text-sm font-bold text-text leading-tight ${!notif.read ? 'font-bold text-primary-hover' : ''}`}>
                    {notif.title}
                  </h4>
                  <p className="text-xs md:text-sm text-muted text-left leading-relaxed">
                    {notif.message}
                  </p>
                </div>

                {/* Delete Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(notif._id);
                  }}
                  className="shrink-0 p-2 rounded hover:bg-white/[0.06] text-muted/40 hover:text-rose-400 transition-all self-center cursor-pointer"
                  title="Delete notification"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default Notifications;
