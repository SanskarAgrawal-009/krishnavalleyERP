import React from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

export const ToastContainer = ({ toasts, onDismiss }) => {
  if (!toasts || toasts.length === 0) return null;

  const getToastConfig = (type) => {
    switch (type) {
      case 'success':
        return {
          icon: CheckCircle2,
          bg: '#f0fdf4',
          border: '#86efac',
          color: '#166534',
          iconColor: '#16a34a'
        };
      case 'error':
        return {
          icon: XCircle,
          bg: '#fef2f2',
          border: '#fca5a5',
          color: '#991b1b',
          iconColor: '#dc2626'
        };
      case 'warning':
        return {
          icon: AlertTriangle,
          bg: '#fffbeb',
          border: '#fde68a',
          color: '#92400e',
          iconColor: '#d97706'
        };
      default:
        return {
          icon: Info,
          bg: '#eff6ff',
          border: '#bfdbfe',
          color: '#1e40af',
          iconColor: '#2563eb'
        };
    }
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: '20px',
        right: '20px',
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        gap: '10px',
        maxWidth: '420px',
        width: 'calc(100% - 40px)',
        pointerEvents: 'none'
      }}
    >
      {toasts.map((t) => {
        const config = getToastConfig(t.type);
        const IconComp = config.icon;

        return (
          <div
            key={t.id}
            className="toast-item"
            style={{
              pointerEvents: 'auto',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '12px',
              padding: '12px 16px',
              borderRadius: '10px',
              backgroundColor: config.bg,
              border: `1px solid ${config.border}`,
              color: config.color,
              boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)',
              animation: 'toast-slide-in 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards'
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flex: 1, minWidth: 0 }}>
              <IconComp size={18} color={config.iconColor} style={{ flexShrink: 0 }} />
              <div
                style={{
                  fontSize: '0.84rem',
                  fontWeight: '600',
                  lineHeight: '1.4',
                  wordBreak: 'break-word'
                }}
              >
                {t.message}
              </div>
            </div>

            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              style={{
                background: 'transparent',
                border: 'none',
                color: config.color,
                opacity: 0.65,
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: '4px',
                flexShrink: 0
              }}
              onMouseEnter={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '0.65')}
            >
              <X size={15} />
            </button>
          </div>
        );
      })}
    </div>
  );
};
