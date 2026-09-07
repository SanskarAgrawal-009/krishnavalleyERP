import React from 'react';
import { Filter, Layers, Plus, RefreshCw } from 'lucide-react';

/**
 * Reusable EmptyState component with contextual actions.
 */
export const EmptyState = ({
  icon: Icon = Layers,
  title = 'No Records Found',
  description = 'There are no items matching your criteria at this moment.',
  primaryAction,
  primaryActionLabel = 'Clear Filters',
  primaryActionIcon: PrimaryIcon = RefreshCw,
  secondaryAction,
  secondaryActionLabel,
  secondaryActionIcon: SecondaryIcon = Plus,
  style = {},
  className = ''
}) => {
  return (
    <div
      className={`g-card ${className}`}
      style={{
        textAlign: 'center',
        padding: '50px 24px',
        borderRadius: '12px',
        border: '1px dashed #cbd5e1',
        background: '#ffffff',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        ...style
      }}
    >
      <div
        style={{
          width: '56px',
          height: '56px',
          borderRadius: '16px',
          background: '#f1f5f9',
          color: '#64748b',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: '16px'
        }}
      >
        <Icon size={28} />
      </div>

      <h4
        style={{
          fontSize: '1.15rem',
          fontWeight: '700',
          color: '#0f172a',
          margin: '0 0 6px 0'
        }}
      >
        {title}
      </h4>

      <p
        style={{
          fontSize: '0.86rem',
          color: '#64748b',
          maxWidth: '460px',
          margin: '0 auto 20px',
          lineHeight: '1.5'
        }}
      >
        {description}
      </p>

      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap', justifyContent: 'center' }}>
        {primaryAction && (
          <button
            type="button"
            onClick={primaryAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 18px',
              borderRadius: '8px',
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(26,115,232,0.25)',
              transition: 'all 0.15s ease'
            }}
          >
            {PrimaryIcon && <PrimaryIcon size={15} />}
            {primaryActionLabel}
          </button>
        )}

        {secondaryAction && (
          <button
            type="button"
            onClick={secondaryAction}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '9px 16px',
              borderRadius: '8px',
              background: '#ffffff',
              color: '#334155',
              border: '1px solid #cbd5e1',
              fontWeight: '600',
              fontSize: '0.84rem',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            {SecondaryIcon && <SecondaryIcon size={15} />}
            {secondaryActionLabel}
          </button>
        )}
      </div>
    </div>
  );
};
