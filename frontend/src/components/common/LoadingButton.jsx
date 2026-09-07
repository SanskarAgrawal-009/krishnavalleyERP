import React from 'react';
import { RefreshCw } from 'lucide-react';

/**
 * LoadingButton - Standardized button with animated spinner and disabled state
 * during saving, updating, or editing operations.
 */
export const LoadingButton = ({
  children,
  loading = false,
  loadingText = 'Saving Changes...',
  icon: Icon,
  variant = 'primary', // 'primary' | 'secondary' | 'success' | 'danger'
  disabled = false,
  onClick,
  type = 'button',
  style = {},
  className = ''
}) => {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          background: '#16a34a',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 4px rgba(22,163,74,0.25)'
        };
      case 'secondary':
        return {
          background: '#ffffff',
          color: '#334155',
          border: '1px solid #cbd5e1',
          boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
        };
      case 'danger':
        return {
          background: '#dc2626',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 4px rgba(220,38,38,0.25)'
        };
      default: // primary
        return {
          background: '#1a73e8',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 4px rgba(26,115,232,0.25)'
        };
    }
  };

  const isDisabled = disabled || loading;
  const variantStyles = getVariantStyles();

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={isDisabled}
      className={className}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '9px 18px',
        borderRadius: '6px',
        fontWeight: '700',
        fontSize: '0.84rem',
        cursor: isDisabled ? 'not-allowed' : 'pointer',
        opacity: isDisabled ? 0.72 : 1,
        transition: 'all 0.15s ease',
        ...variantStyles,
        ...style
      }}
    >
      {loading ? (
        <>
          <RefreshCw size={15} className="spin" />
          <span>{loadingText}</span>
        </>
      ) : (
        <>
          {Icon && <Icon size={15} />}
          <span>{children}</span>
        </>
      )}
    </button>
  );
};
