import React from 'react';

export const StatCard = ({
  title,
  value,
  subtext,
  icon: Icon,
  trend,
  trendType = 'positive', // 'positive' | 'negative' | 'neutral'
  badge,
  onClick,
  style = {}
}) => {
  return (
    <div
      className="g-card p-6 flex flex-col justify-between"
      style={{
        padding: '22px 24px',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        height: '136px',
        cursor: onClick ? 'pointer' : 'default',
        position: 'relative',
        overflow: 'hidden',
        ...style
      }}
      onClick={onClick}
    >
      {/* Top row: Metric label & Icon */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <span
          className="font-label-lg"
          style={{
            fontSize: '0.78rem',
            fontWeight: '600',
            color: 'var(--on-surface-variant)',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}
        >
          {title}
        </span>
        {Icon && (
          <div
            style={{
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              backgroundColor: 'var(--surface-container-low)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: 'var(--primary-container)',
              border: '1px solid var(--outline-variant)'
            }}
          >
            <Icon size={18} strokeWidth={2} />
          </div>
        )}
      </div>

      {/* Bottom row: Value & Trend Indicator */}
      <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', marginTop: '12px' }}>
        <div
          className="font-headline-lg"
          style={{
            fontSize: '1.9rem',
            fontWeight: '700',
            lineHeight: 1,
            color: 'var(--on-surface)',
            letterSpacing: '-0.02em'
          }}
        >
          {value}
        </div>

        {(trend || subtext || badge) && (
          <div
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '4px',
              fontSize: '0.75rem',
              fontWeight: '600',
              padding: '2px 8px',
              borderRadius: '9999px',
              backgroundColor:
                trendType === 'positive'
                  ? '#eff6ff'
                  : trendType === 'negative'
                  ? '#f1f5f9'
                  : '#f8fafc',
              color:
                trendType === 'positive'
                  ? '#1d4ed8'
                  : trendType === 'negative'
                  ? '#0f172a'
                  : '#475569',
              border:
                trendType === 'positive'
                  ? '1px solid #bfdbfe'
                  : '1px solid #cbd5e1'
            }}
          >
            {trend || subtext || badge}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;

