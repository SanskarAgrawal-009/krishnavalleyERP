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
        border: '1px dashed #e8e6df',
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
          background: '#e8f2e5',
          color: '#17652f',
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
          color: '#1f2937',
          margin: '0 0 6px 0'
        }}
      >
        {title}
      </h4>

      <p
        style={{
          fontSize: '0.86rem',
          color: '#596372',
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
              background: '#17652f',
              color: '#ffffff',
              border: 'none',
              fontWeight: '600',
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(23,101,47,0.2)',
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
              color: '#1f2937',
              border: '1px solid #e8e6df',
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
