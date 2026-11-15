import { useEffect, useRef, useState, type FC } from 'react';
import {
  BellIcon,
  BriefcaseIcon,
  CheckIcon,
  FileTextIcon,
  SparklesIcon,
  XIcon,
  ZapIcon,
} from '@/assets/icons';
import { notificationsApi } from '@/api';
import type { DashboardTab } from './Sidebar';

export interface NotificationItem {
  _id: string;
  id?: string;
  type: string;
  title: string;
  body: string;
  readAt?: string | null;
  createdAt?: string;
  data?: Record<string, any>;
}

interface NotificationPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTab?: (tab: DashboardTab) => void;
  onUnreadCountChange?: (count: number) => void;
}

function timeAgo(dateString?: string): string {
  if (!dateString) return 'Just now';
  const diffMs = Date.now() - new Date(dateString).getTime();
  const diffSecs = Math.max(1, Math.floor(diffMs / 1000));
  if (diffSecs < 60) return `${diffSecs}s ago`;
  const diffMins = Math.floor(diffSecs / 60);
  if (diffMins < 60) return `${diffMins}m ago`;
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) return 'Yesterday';
  return `${diffDays}d ago`;
}

export const NotificationPopup: FC<NotificationPopupProps> = ({
  isOpen,
  onClose,
  onSelectTab,
  onUnreadCountChange,
}) => {
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [filter, setFilter] = useState<'all' | 'unread'>('all');
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadNotifications = async () => {
    setLoading(true);
    try {
      const res = await notificationsApi.list();
      const list = Array.isArray(res) ? res : res?.notifications || [];
      setNotifications(list);
      const unread = list.filter((n: NotificationItem) => !n.readAt).length;
      if (onUnreadCountChange) onUnreadCountChange(unread);
    } catch (e) {
      console.warn('Could not load notifications:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadNotifications();
    }
  }, [isOpen]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [isOpen, onClose]);

  const handleMarkAsRead = async (id: string, e?: React.MouseEvent) => {
    e?.stopPropagation();
    try {
      await notificationsApi.markRead(id);
      setNotifications((prev) =>
        prev.map((n) => ((n._id || n.id) === id ? { ...n, readAt: new Date().toISOString() } : n)),
      );
      if (onUnreadCountChange) {
        const remainingUnread = notifications.filter(
          (n) => (n._id || n.id) !== id && !n.readAt,
        ).length;
        onUnreadCountChange(remainingUnread);
      }
    } catch (err) {
      console.warn('Mark read failed:', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await notificationsApi.markAllRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, readAt: new Date().toISOString() })));
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch (err) {
      console.warn('Mark all read failed:', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await notificationsApi.delete(id);
      const updated = notifications.filter((n) => (n._id || n.id) !== id);
      setNotifications(updated);
      if (onUnreadCountChange) {
        onUnreadCountChange(updated.filter((n) => !n.readAt).length);
      }
    } catch (err) {
      console.warn('Delete notification failed:', err);
    }
  };

  const handleNotificationClick = (item: NotificationItem) => {
    // 1. Mark as read
    if (!item.readAt) {
      handleMarkAsRead(item._id || item.id || '');
    }

    // 2. Navigate based on type
    if (onSelectTab) {
      if (item.type === 'needs_user' || item.type === 'draft_needs_attention') {
        onSelectTab('needs_you');
      } else if (item.type === 'draft_ready') {
        onSelectTab('drafts');
      } else if (item.type === 'interview_invite' || item.type === 'sent') {
        onSelectTab('tracker');
      }
    }

    onClose();
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.readAt).length;
  const filteredList = notifications.filter((n) => (filter === 'unread' ? !n.readAt : true));

  const getIconForType = (type: string) => {
    switch (type) {
      case 'interview_invite':
        return <SparklesIcon size={14} color="#10b981" />;
      case 'needs_user':
      case 'draft_needs_attention':
      case 'send_blocked':
        return <ZapIcon size={14} color="#f59e0b" />;
      case 'draft_ready':
      case 'sent':
        return <FileTextIcon size={14} color="#2563eb" />;
      default:
        return <BriefcaseIcon size={14} color="#6366f1" />;
    }
  };

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: 0,
        width: 360,
        maxHeight: 520,
        background: '#fff',
        borderRadius: 14,
        border: '1px solid #e5e7eb',
        boxShadow: '0 12px 36px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.06)',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 1000,
        overflow: 'hidden',
        animation: 'jj-fade-in 0.18s ease-out',
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 16px',
          borderBottom: '1px solid #f1f2f5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#fafbfc',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 13.5, fontWeight: 700, color: '#111827' }}>Notifications</span>
          {unreadCount > 0 && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 700,
                color: '#fff',
                background: '#ef4444',
                padding: '2px 7px',
                borderRadius: 999,
              }}
            >
              {unreadCount} new
            </span>
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllRead}
              style={{
                background: 'transparent',
                border: 0,
                color: '#2563eb',
                fontSize: 11,
                fontWeight: 600,
                cursor: 'pointer',
                padding: '3px 6px',
                borderRadius: 4,
              }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#edf3ff')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              Mark all as read
            </button>
          )}

          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 0,
              color: '#9ca3af',
              cursor: 'pointer',
              padding: 4,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: 6,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <XIcon size={14} color="#6b7280" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div
        style={{
          display: 'flex',
          gap: 6,
          padding: '8px 16px',
          borderBottom: '1px solid #f3f4f6',
          background: '#fff',
        }}
      >
        <button
          type="button"
          onClick={() => setFilter('all')}
          style={{
            background: filter === 'all' ? '#0b0b0c' : '#f3f4f6',
            color: filter === 'all' ? '#fff' : '#4b5563',
            border: 0,
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          All ({notifications.length})
        </button>
        <button
          type="button"
          onClick={() => setFilter('unread')}
          style={{
            background: filter === 'unread' ? '#0b0b0c' : '#f3f4f6',
            color: filter === 'unread' ? '#fff' : '#4b5563',
            border: 0,
            borderRadius: 6,
            padding: '3px 10px',
            fontSize: 11,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          Unread ({unreadCount})
        </button>
      </div>

      {/* Notification List */}
      <div
        style={{
          overflowY: 'auto',
          maxHeight: 380,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {loading && notifications.length === 0 ? (
          <div style={{ padding: '36px 0', textAlign: 'center', color: '#9ca3af', fontSize: 12 }}>
            Loading updates...
          </div>
        ) : filteredList.length === 0 ? (
          <div style={{ padding: '40px 20px', textAlign: 'center', color: '#6b7280', fontSize: 12 }}>
            <div style={{ margin: '0 auto 8px', width: 36, height: 36, borderRadius: '50%', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <BellIcon size={18} color="#9ca3af" />
            </div>
            <div style={{ fontWeight: 600, color: '#374151' }}>You're all caught up!</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>
              {filter === 'unread' ? 'No unread notifications.' : 'New alerts and status updates will appear here.'}
            </div>
          </div>
        ) : (
          filteredList.map((item) => {
            const isUnread = !item.readAt;

            return (
              <div
                key={item._id || item.id}
                onClick={() => handleNotificationClick(item)}
                style={{
                  padding: '12px 16px',
                  borderBottom: '1px solid #f8fafc',
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  cursor: 'pointer',
                  background: isUnread ? '#f8fafc' : '#fff',
                  transition: 'background 0.15s ease',
                  position: 'relative',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = isUnread ? '#f1f5f9' : '#fafafa')}
                onMouseLeave={(e) => (e.currentTarget.style.background = isUnread ? '#f8fafc' : '#fff')}
              >
                {/* Type Icon */}
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: '50%',
                    background: isUnread ? '#fff' : '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: 2,
                  }}
                >
                  {getIconForType(item.type)}
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: 3 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                    <span
                      style={{
                        fontSize: 12,
                        fontWeight: isUnread ? 700 : 500,
                        color: isUnread ? '#0f172a' : '#334155',
                        lineHeight: 1.3,
                      }}
                    >
                      {item.title}
                    </span>
                    <span style={{ fontSize: 10, color: '#94a3b8', flexShrink: 0 }}>
                      {timeAgo(item.createdAt)}
                    </span>
                  </div>

                  {item.body && (
                    <p
                      style={{
                        margin: 0,
                        fontSize: 11,
                        color: '#64748b',
                        lineHeight: 1.4,
                        overflow: 'hidden',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {item.body}
                    </p>
                  )}
                </div>

                {/* Right controls: Unread blue dot & delete button */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, marginTop: 4 }}>
                  {isUnread && (
                    <span
                      style={{
                        width: 7,
                        height: 7,
                        borderRadius: '50%',
                        background: '#2563eb',
                        display: 'inline-block',
                      }}
                      title="Unread"
                    />
                  )}

                  <button
                    type="button"
                    onClick={(e) => handleDelete(item._id || item.id || '', e)}
                    title="Dismiss"
                    style={{
                      background: 'transparent',
                      border: 0,
                      color: '#cbd5e1',
                      cursor: 'pointer',
                      padding: 2,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      borderRadius: 4,
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.color = '#ef4444')}
                    onMouseLeave={(e) => (e.currentTarget.style.color = '#cbd5e1')}
                  >
                    <XIcon size={12} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
