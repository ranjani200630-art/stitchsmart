import React, { useState, useEffect, useRef } from 'react';

const NOTIF_ICONS = {
  order_created: '🛍️',
  order_confirmed: '✅',
  order_in_progress: '✂️',
  order_ready_pickup: '👗',
  order_completed: '🎉',
  order_cancelled: '❌',
  delivery_date_updated: '📅',
  order_delayed: '⚠️',
  admin_alert: '🔔',
  general_alert: 'ℹ️'
};

const formatTimeAgo = (dateStr) => {
  if (!dateStr) return '';
  const now = new Date();
  const past = new Date(dateStr);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'Just now';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDays = Math.floor(diffHr / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return past.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
};

export const NotificationBell = ({ onSelectOrder, currentTab }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'
  const dropdownRef = useRef(null);

  // Fetch unread count
  const fetchUnreadCount = async () => {
    try {
      const res = await fetch('/api/notifications/unread-count', {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to load unread count:', err.message);
    }
  };

  // Fetch full notifications list
  const fetchNotifications = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/notifications?limit=25', {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setNotifications(data.notifications || []);
        setUnreadCount(data.unreadCount || 0);
      }
    } catch (err) {
      console.warn('Failed to fetch notifications:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUnreadCount();
  }, [currentTab]);

  // When dropdown opens, fetch latest notifications
  useEffect(() => {
    if (isOpen) {
      fetchNotifications();
    }
  }, [isOpen]);

  // Close dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Mark single notification as read
  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}/read`, {
        method: 'PATCH',
        credentials: 'include'
      });
      if (res.ok) {
        setNotifications((prev) =>
          prev.map((n) => (n._id === id ? { ...n, isRead: true } : n))
        );
        setUnreadCount((c) => Math.max(0, c - 1));
      }
    } catch (err) {
      console.warn('Failed to mark read:', err.message);
    }
  };

  // Mark all as read
  const handleMarkAllRead = async () => {
    try {
      const res = await fetch('/api/notifications/read-all', {
        method: 'PATCH',
        credentials: 'include'
      });
      if (res.ok) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        setUnreadCount(0);
      }
    } catch (err) {
      console.warn('Failed to mark all read:', err.message);
    }
  };

  // Delete notification
  const handleDelete = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      const res = await fetch(`/api/notifications/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (res.ok) {
        const deletedNotif = notifications.find((n) => n._id === id);
        if (deletedNotif && !deletedNotif.isRead) {
          setUnreadCount((c) => Math.max(0, c - 1));
        }
        setNotifications((prev) => prev.filter((n) => n._id !== id));
      }
    } catch (err) {
      console.warn('Failed to delete notification:', err.message);
    }
  };

  // Click on notification: mark read and open order modal if order exists
  const handleNotificationClick = async (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }

    if (notif.order && onSelectOrder) {
      const orderId = typeof notif.order === 'object' ? notif.order._id : notif.order;
      try {
        const res = await fetch(`/api/orders/${orderId}`, {
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok && data.success && data.order) {
          onSelectOrder(data.order);
          setIsOpen(false);
        }
      } catch (err) {
        console.warn('Failed to load order from notification:', err.message);
      }
    }
  };

  const displayedNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.isRead)
      : notifications;

  return (
    <div className="notification-bell-wrapper" ref={dropdownRef}>
      <button
        type="button"
        className={`nav-bell-btn ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        title="Notifications & Alerts"
        aria-label="Notifications"
      >
        <span className="bell-icon">&#128276;</span>
        {unreadCount > 0 && (
          <span className="unread-badge">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="notifications-dropdown">
          <div className="notif-dropdown-header">
            <div className="notif-header-title">
              <strong>Notifications</strong>
              {unreadCount > 0 && (
                <span className="unread-pill">{unreadCount} new</span>
              )}
            </div>

            <div className="notif-header-actions">
              {unreadCount > 0 && (
                <button
                  type="button"
                  className="btn-link notif-mark-all"
                  onClick={handleMarkAllRead}
                >
                  Mark all read
                </button>
              )}
            </div>
          </div>

          <div className="notif-filter-tabs">
            <button
              type="button"
              className={`notif-tab ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              All ({notifications.length})
            </button>
            <button
              type="button"
              className={`notif-tab ${filter === 'unread' ? 'active' : ''}`}
              onClick={() => setFilter('unread')}
            >
              Unread ({unreadCount})
            </button>
          </div>

          <div className="notif-list-container">
            {loading ? (
              <div className="notif-empty-state">
                <div className="spinner notif-spinner"></div>
                <span>Loading notifications...</span>
              </div>
            ) : displayedNotifications.length === 0 ? (
              <div className="notif-empty-state">
                <span className="notif-empty-icon">&#129697;</span>
                <p>No {filter === 'unread' ? 'unread ' : ''}notifications.</p>
              </div>
            ) : (
              displayedNotifications.map((n) => {
                const icon = NOTIF_ICONS[n.type] || '🔔';
                const isPickup = n.type === 'order_ready_pickup';
                const isDelayed = n.type === 'order_delayed';

                return (
                  <div
                    key={n._id}
                    className={`notif-item ${!n.isRead ? 'notif-unread' : ''} ${
                      isPickup ? 'notif-pickup' : ''
                    } ${isDelayed ? 'notif-delayed' : ''}`}
                    onClick={() => handleNotificationClick(n)}
                  >
                    <div className="notif-icon-col">
                      <span className="notif-type-icon">{icon}</span>
                    </div>

                    <div className="notif-content-col">
                      <div className="notif-item-top">
                        <strong className="notif-item-title">{n.title}</strong>
                        <span className="notif-time">{formatTimeAgo(n.createdAt)}</span>
                      </div>
                      <p className="notif-item-msg">{n.message}</p>
                      {n.order && (
                        <span className="notif-order-tag">
                          Click to view Order #{n.metadata?.orderNumber || 'Details'} &rarr;
                        </span>
                      )}
                    </div>

                    <div className="notif-actions-col">
                      {!n.isRead && (
                        <button
                          type="button"
                          className="notif-action-btn"
                          title="Mark as read"
                          onClick={(e) => handleMarkAsRead(n._id, e)}
                        >
                          ●
                        </button>
                      )}
                      <button
                        type="button"
                        className="notif-delete-btn"
                        title="Delete notification"
                        onClick={(e) => handleDelete(n._id, e)}
                      >
                        &times;
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}
    </div>
  );
};
