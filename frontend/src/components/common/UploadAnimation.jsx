import React, { useState, useEffect } from 'react';
import { UploadCloud, CheckCircle2, RefreshCw, FileSpreadsheet, Sparkles } from 'lucide-react';

/**
 * UploadAnimation - Displays an active uploading and database synchronization animation.
 */
export const UploadAnimation = ({
  fileName = 'Inventory_Sheet.xlsx',
  recordCount,
  category = 'inventory' // 'inventory' | 'rentals' | 'history'
}) => {
  const [stage, setStage] = useState(0);

  const stages = [
    'Parsing file structure & data columns...',
    'Validating phone numbers, PAN, & bank records...',
    'Verifying 3-Year Guaranteed Rent-Back terms...',
    'Writing unit entries & database indexing...',
    'Finalizing sync with MongoDB cluster...'
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setStage((prev) => (prev < stages.length - 1 ? prev + 1 : prev));
    }, 1200);

    return () => clearInterval(interval);
  }, [stages.length]);

  return (
    <div
      style={{
        padding: '36px 24px',
        textAlign: 'center',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '16px',
        background: 'linear-gradient(135deg, #f8fafc, #eff6ff)',
        borderRadius: '16px',
        border: '1.5px solid #bfdbfe'
      }}
    >
      {/* Pulsing Icon */}
      <div
        style={{
          width: '76px',
          height: '76px',
          borderRadius: '50%',
          background: '#1a73e8',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          animation: 'pulseUploadBlue 1.6s infinite ease-in-out',
          boxShadow: '0 8px 24px rgba(26, 115, 232, 0.3)'
        }}
      >
        <UploadCloud size={38} className="spin" style={{ animationDuration: '4s' }} />
      </div>

      <div>
        <h4 style={{ margin: '0 0 4px 0', fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
          Processing &amp; Uploading File
        </h4>
        <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', fontSize: '0.84rem', color: '#1e40af', background: '#dbeafe', padding: '3px 10px', borderRadius: '12px', fontWeight: '600' }}>
          <FileSpreadsheet size={14} />
          <span>{fileName}</span>
          {recordCount ? <span>({recordCount} Rows)</span> : null}
        </div>
      </div>

      {/* Progress Bar */}
      <div
        style={{
          width: '100%',
          maxWidth: '380px',
          height: '8px',
          background: '#e2e8f0',
          borderRadius: '10px',
          overflow: 'hidden',
          position: 'relative'
        }}
      >
        <div
          style={{
            width: '100%',
            height: '100%',
            background: 'linear-gradient(90deg, #3b82f6, #60a5fa, #2563eb)',
            backgroundSize: '200% 100%',
            animation: 'topBarGlow 1.2s linear infinite',
            borderRadius: '10px'
          }}
        />
      </div>

      {/* Dynamic Stage Text */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.84rem', color: '#475569', fontWeight: '600' }}>
        <RefreshCw size={14} className="spin" color="#2563eb" />
        <span>{stages[stage]}</span>
      </div>
    </div>
  );
};
