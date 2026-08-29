import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Bell,
  AlertTriangle,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  DollarSign,
  Calendar,
  Package,
  Repeat,
  Users,
  CheckCheck,
  Trash2,
  X
} from 'lucide-react';

const DEFAULT_NOTIFICATIONS = [
  {
    id: 'notif-1',
    category: 'alerts',
    severity: 'urgent',
    title: 'CLP Milestone Demand Due',
    message: 'Demand note for 5th Floor Slab Casting is pending payment for Flat 304 (₹4,20,000).',
    time: '25m ago',
    route: '/sales?tab=lifecycle',
    icon: DollarSign,
    color: '#ef4444',
    bgColor: '#fef2f2'
  },
  {
    id: 'notif-2',
    category: 'reminders',
    severity: 'info',
    title: 'Site Visit Scheduled Today',
    message: 'Site visit at Krishna Valley Heights (3 BHK Sample Flat) with prospect Ananya Sharma at 4:30 PM.',
    time: 'In 2 hours',
    route: '/crm?tab=visits',
    icon: Calendar,
    color: '#2563eb',
    bgColor: '#eff6ff'
  },
  {
    id: 'notif-3',
    category: 'alerts',
    severity: 'warning',
    title: 'Low Material Inventory Warning',
    message: 'Stock alert: UltraTech OPC 53 Cement has dropped to 32 bags (reorder safety threshold: 50 bags).',
    time: '1h ago',
    route: '/materials?tab=stocks',
    icon: Package,
    color: '#f59e0b',
    bgColor: '#fffbeb'
  },
  {
    id: 'notif-4',
    category: 'reminders',
    severity: 'success',
    title: 'Monthly Payroll Disbursal',
    message: 'Salary calculation ready for August 2026. Staff members pending payment slip disbursement.',
    time: '3h ago',
    route: '/hr?tab=payroll',
    icon: FileText,
    color: '#10b981',
    bgColor: '#ecfdf5'
  },
  {
    id: 'notif-5',
    category: 'alerts',
    severity: 'warning',
    title: 'Tenant Lease Expiry Approaching',
    message: 'Residential lease for Flat B-102 (Tenant: Rahul Mehra) expires in 15 days. Renewal needed.',
    time: 'Yesterday',
    route: '/rentals?tab=contracts',
    icon: Repeat,
    color: '#f97316',
    bgColor: '#fff7ed'
  },
  {
    id: 'notif-6',
    category: 'reminders',
    severity: 'info',
    title: 'Pending Leave Request Approval',
    message: 'Site Engineer Rajesh Kumar applied for 3 days Earned Leave starting next Monday.',
    time: 'Yesterday',
    route: '/hr?tab=leaves',
    icon: Users,
    color: '#8b5cf6',
    bgColor: '#f5f3ff'
  }
];

export const NotificationAlertBox = ({ isOpen, onClose, onCountChange }) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('all'); // 'all' | 'alerts' | 'reminders'
  const [readIds, setReadIds] = useState(() => {
    try {
      const stored = localStorage.getItem('kv_read_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  const [dismissedIds, setDismissedIds] = useState(() => {
    try {
      const stored = localStorage.getItem('kv_dismissed_notifications');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Calculate unread count
  const activeNotifications = DEFAULT_NOTIFICATIONS.filter((n) => !dismissedIds.includes(n.id));
  const unreadCount = activeNotifications.filter((n) => !readIds.includes(n.id)).length;

  useEffect(() => {
    if (onCountChange) {
      onCountChange(unreadCount);
    }
  }, [unreadCount, onCountChange]);

  const handleMarkAsRead = (id) => {
    if (!readIds.includes(id)) {
      const updated = [...readIds, id];
      setReadIds(updated);
      localStorage.setItem('kv_read_notifications', JSON.stringify(updated));
    }
  };

  const handleMarkAllAsRead = () => {
    const allIds = activeNotifications.map((n) => n.id);
    setReadIds(allIds);
    localStorage.setItem('kv_read_notifications', JSON.stringify(allIds));
  };

  const handleDismiss = (e, id) => {
    e.stopPropagation();
    const updated = [...dismissedIds, id];
    setDismissedIds(updated);
    localStorage.setItem('kv_dismissed_notifications', JSON.stringify(updated));
  };

  const handleClearAll = () => {
    const allIds = DEFAULT_NOTIFICATIONS.map((n) => n.id);
    setDismissedIds(allIds);
    localStorage.setItem('kv_dismissed_notifications', JSON.stringify(allIds));
  };

  const handleItemClick = (notification) => {
    handleMarkAsRead(notification.id);
    if (notification.route) {
      navigate(notification.route);
      onClose();
    }
  };

  const filteredNotifications = activeNotifications.filter((n) => {
    if (activeTab === 'alerts') return n.category === 'alerts';
    if (activeTab === 'reminders') return n.category === 'reminders';
    return true;
  });

  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'absolute',
        top: 'calc(100% + 10px)',
        right: '-10px',
        width: '390px',
        maxWidth: '92vw',
        backgroundColor: '#ffffff',
        borderRadius: '14px',
        boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.22), 0 0 0 1px rgba(0, 0, 0, 0.08)',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        overflow: 'hidden',
        animation: 'fadeInSlideDown 0.2s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: '14px 18px 12px 18px',
          borderBottom: '1px solid #f1f5f9',
          backgroundColor: '#fafbfc',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              backgroundColor: '#e0f2fe',
              color: '#0284c7',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <Bell size={16} />
          </div>
          <div>
            <span style={{ fontSize: '0.92rem', fontWeight: '800', color: '#0f172a' }}>
              Notifications & Alerts
            </span>
            {unreadCount > 0 && (
              <span
                style={{
                  marginLeft: '8px',
                  backgroundColor: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.68rem',
                  fontWeight: '700',
                  padding: '2px 7px',
                  borderRadius: '10px'
                }}
              >
                {unreadCount} new
              </span>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
          {unreadCount > 0 && (
            <button
              type="button"
              onClick={handleMarkAllAsRead}
              title="Mark all as read"
              style={{
                background: 'none',
                border: 'none',
                color: '#2563eb',
                fontSize: '0.72rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 6px',
                borderRadius: '4px'
              }}
            >
              <CheckCheck size={14} /> Read all
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              color: '#94a3b8',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              padding: '2px'
            }}
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Tabs Filter */}
      <div
        style={{
          display: 'flex',
          padding: '6px 12px',
          gap: '6px',
          backgroundColor: '#ffffff',
          borderBottom: '1px solid #f1f5f9'
        }}
      >
        {[
          { id: 'all', label: 'All', count: activeNotifications.length },
          {
            id: 'alerts',
            label: '⚠️ Alerts',
            count: activeNotifications.filter((n) => n.category === 'alerts').length
          },
          {
            id: 'reminders',
            label: '⏰ Reminders',
            count: activeNotifications.filter((n) => n.category === 'reminders').length
          }
        ].map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              style={{
                flex: 1,
                padding: '6px 8px',
                borderRadius: '6px',
                border: 'none',
                backgroundColor: isActive ? '#0f172a' : '#f1f5f9',
                color: isActive ? '#ffffff' : '#475569',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '5px',
                transition: 'all 0.15s ease'
              }}
            >
              <span>{tab.label}</span>
              <span
                style={{
                  fontSize: '0.65rem',
                  opacity: isActive ? 0.9 : 0.7,
                  backgroundColor: isActive ? 'rgba(255,255,255,0.2)' : '#e2e8f0',
                  padding: '1px 5px',
                  borderRadius: '6px'
                }}
              >
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div
        style={{
          maxHeight: '340px',
          overflowY: 'auto',
          display: 'flex',
          flexDirection: 'column',
          backgroundColor: '#ffffff'
        }}
      >
        {filteredNotifications.length === 0 ? (
          <div
            style={{
              padding: '40px 20px',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '10px'
            }}
          >
            <div
              style={{
                width: '46px',
                height: '46px',
                borderRadius: '50%',
                backgroundColor: '#f1f5f9',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#10b981'
              }}
            >
              <CheckCircle2 size={24} />
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: '700', fontSize: '0.88rem', color: '#1e293b' }}>
                All caught up!
              </p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                No active notifications or reminders in this category.
              </p>
            </div>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const isRead = readIds.includes(notif.id);
            const IconComponent = notif.icon || Bell;
            return (
              <div
                key={notif.id}
                onClick={() => handleItemClick(notif)}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px',
                  padding: '12px 16px',
                  borderBottom: '1px solid #f8fafc',
                  backgroundColor: isRead ? '#ffffff' : '#f8fbff',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.backgroundColor = isRead ? '#f8fafc' : '#f0f7ff';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = isRead ? '#ffffff' : '#f8fbff';
                }}
              >
                {/* Severity Accent Bar */}
                <div
                  style={{
                    position: 'absolute',
                    left: 0,
                    top: 0,
                    bottom: 0,
                    width: '3px',
                    backgroundColor: isRead ? 'transparent' : notif.color
                  }}
                />

                {/* Category Icon */}
                <div
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '8px',
                    backgroundColor: notif.bgColor,
                    color: notif.color,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    marginTop: '2px'
                  }}
                >
                  <IconComponent size={16} />
                </div>

                {/* Content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2px' }}>
                    <span
                      style={{
                        fontSize: '0.8rem',
                        fontWeight: isRead ? '600' : '800',
                        color: isRead ? '#334155' : '#0f172a'
                      }}
                    >
                      {notif.title}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#94a3b8', flexShrink: 0 }}>
                      {notif.time}
                    </span>
                  </div>

                  <p
                    style={{
                      margin: 0,
                      fontSize: '0.74rem',
                      lineHeight: '1.35',
                      color: isRead ? '#64748b' : '#334155',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}
                  >
                    {notif.message}
                  </p>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px' }}>
                    <span
                      style={{
                        fontSize: '0.65rem',
                        fontWeight: '700',
                        color: notif.color,
                        backgroundColor: notif.bgColor,
                        padding: '1px 6px',
                        borderRadius: '4px',
                        textTransform: 'uppercase'
                      }}
                    >
                      {notif.category}
                    </span>
                    <span style={{ fontSize: '0.68rem', color: '#2563eb', fontWeight: '600' }}>
                      Click to view →
                    </span>
                  </div>
                </div>

                {/* Dismiss Button */}
                <button
                  type="button"
                  onClick={(e) => handleDismiss(e, notif.id)}
                  title="Dismiss notification"
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#cbd5e1',
                    cursor: 'pointer',
                    padding: '2px',
                    borderRadius: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = '#ef4444';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = '#cbd5e1';
                  }}
                >
                  <X size={13} />
                </button>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      {activeNotifications.length > 0 && (
        <div
          style={{
            padding: '10px 16px',
            borderTop: '1px solid #f1f5f9',
            backgroundColor: '#fafbfc',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}
        >
          <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
            {activeNotifications.length} alerts & reminders
          </span>
          <button
            type="button"
            onClick={handleClearAll}
            style={{
              background: 'none',
              border: 'none',
              color: '#ef4444',
              fontSize: '0.72rem',
              fontWeight: '700',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}
          >
            <Trash2 size={12} /> Clear all
          </button>
        </div>
      )}
    </div>
  );
};
