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
          background: '#17652f',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 4px rgba(23,101,47,0.2)'
        };
      case 'secondary':
        return {
          background: '#ffffff',
          color: '#1f2937',
          border: '1px solid #e8e6df',
          boxShadow: '0 1px 2px rgba(0,0,0,0.03)'
        };
      case 'danger':
        return {
          background: '#b91c1c',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 4px rgba(185,28,28,0.2)'
        };
      default: // primary
        return {
          background: '#17652f',
          color: '#ffffff',
          border: 'none',
          boxShadow: '0 2px 4px rgba(23,101,47,0.2)'
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
