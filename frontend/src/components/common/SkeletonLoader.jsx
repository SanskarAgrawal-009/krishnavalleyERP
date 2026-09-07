import React from 'react';

/**
 * Atomic Skeleton component with configurable variant and shimmer animation.
 */
export const Skeleton = ({
  variant = 'text', // 'text' | 'rectangular' | 'circular'
  width,
  height,
  borderRadius,
  className = '',
  style = {}
}) => {
  const getRadius = () => {
    if (borderRadius !== undefined) return borderRadius;
    if (variant === 'circular') return '50%';
    if (variant === 'rectangular') return '8px';
    return '4px'; // text
  };

  const getDefaultHeight = () => {
    if (height !== undefined) return height;
    if (variant === 'circular') return width || '40px';
    if (variant === 'rectangular') return '120px';
    return '14px'; // text
  };

  return (
    <div
      className={`skeleton-loader ${className}`}
      style={{
        width: width || (variant === 'text' ? '100%' : '100%'),
        height: getDefaultHeight(),
        borderRadius: getRadius(),
        ...style
      }}
    />
  );
};

/**
 * Skeleton designed specifically to mimic data tables with headers and rows.
 */
export const TableSkeleton = ({
  rows = 6,
  columns = 5,
  showHeader = true,
  className = '',
  style = {}
}) => {
  return (
    <div
      className={`g-card ${className}`}
      style={{
        padding: '0',
        borderRadius: '12px',
        overflow: 'hidden',
        width: '100%',
        boxSizing: 'border-box',
        ...style
      }}
    >
      <div style={{ width: '100%', overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
          {showHeader && (
            <thead>
              <tr style={{ background: '#f8f9fa', borderBottom: '1px solid #dadce0' }}>
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <th key={colIdx} style={{ padding: '14px 18px' }}>
                    <Skeleton
                      variant="text"
                      width={colIdx === 0 ? '70%' : colIdx === columns - 1 ? '40%' : '60%'}
                      height="14px"
                    />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {Array.from({ length: rows }).map((_, rowIdx) => (
              <tr key={rowIdx} style={{ borderBottom: '1px solid #f1f3f4' }}>
                {Array.from({ length: columns }).map((_, colIdx) => (
                  <td key={colIdx} style={{ padding: '14px 18px', verticalAlign: 'middle' }}>
                    {colIdx === 0 ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <Skeleton variant="circular" width="36px" height="36px" />
                        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                          <Skeleton variant="text" width="75%" height="14px" />
                          <Skeleton variant="text" width="45%" height="11px" />
                        </div>
                      </div>
                    ) : colIdx === columns - 1 ? (
                      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px' }}>
                        <Skeleton variant="rectangular" width="32px" height="30px" borderRadius="6px" />
                        <Skeleton variant="rectangular" width="32px" height="30px" borderRadius="6px" />
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                        <Skeleton
                          variant="text"
                          width={colIdx % 2 === 0 ? '80%' : '55%'}
                          height="13px"
                        />
                        {rowIdx % 2 === 0 && (
                          <Skeleton variant="text" width="35%" height="10px" />
                        )}
                      </div>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

/**
 * Skeleton designed for Grid of cards (Projects, Buildings, KPI Stat Cards).
 */
export const CardGridSkeleton = ({
  cards = 4,
  columns = 'repeat(auto-fill, minmax(280px, 1fr))',
  height = '140px',
  className = '',
  style = {}
}) => {
  return (
    <div
      className={className}
      style={{
        display: 'grid',
        gridTemplateColumns: columns,
        gap: '18px',
        width: '100%',
        ...style
      }}
    >
      {Array.from({ length: cards }).map((_, idx) => (
        <div
          key={idx}
          className="g-card"
          style={{
            padding: '20px',
            borderRadius: '12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            minHeight: height,
            boxSizing: 'border-box'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div style={{ flex: 1, marginRight: '16px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <Skeleton variant="text" width="45%" height="12px" />
              <Skeleton variant="text" width="70%" height="24px" />
            </div>
            <Skeleton variant="circular" width="38px" height="38px" />
          </div>
          <div style={{ marginTop: '16px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <Skeleton variant="text" width="85%" height="12px" />
            <Skeleton variant="text" width="50%" height="10px" />
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Skeleton designed to match detail modals (FlatDetailModal, RentalDetailModal, CustomerDetailModal).
 */
export const DetailModalSkeleton = () => {
  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top Banner Skeleton */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px', paddingBottom: '16px', borderBottom: '1px solid #f1f3f4' }}>
        <Skeleton variant="rectangular" width="54px" height="54px" borderRadius="12px" />
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Skeleton variant="text" width="220px" height="22px" />
            <Skeleton variant="rectangular" width="75px" height="20px" borderRadius="10px" />
          </div>
          <Skeleton variant="text" width="320px" height="13px" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div style={{ display: 'flex', gap: '10px', borderBottom: '1px solid #f1f3f4', paddingBottom: '10px' }}>
        <Skeleton variant="rectangular" width="100px" height="32px" borderRadius="6px" />
        <Skeleton variant="rectangular" width="110px" height="32px" borderRadius="6px" />
        <Skeleton variant="rectangular" width="120px" height="32px" borderRadius="6px" />
      </div>

      {/* 2x2 Grid of Spec Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px' }}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} style={{ background: '#f8fafc', padding: '16px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <Skeleton variant="text" width="40%" height="11px" />
            <Skeleton variant="text" width="80%" height="18px" />
            <Skeleton variant="text" width="60%" height="12px" />
          </div>
        ))}
      </div>

      {/* Large Content Block */}
      <div style={{ background: '#f8fafc', padding: '18px', borderRadius: '10px', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <Skeleton variant="text" width="30%" height="16px" />
        <Skeleton variant="text" width="100%" height="12px" />
        <Skeleton variant="text" width="95%" height="12px" />
        <Skeleton variant="text" width="85%" height="12px" />
      </div>
    </div>
  );
};
