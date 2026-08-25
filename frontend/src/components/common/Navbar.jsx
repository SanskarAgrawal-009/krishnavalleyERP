import React from 'react';
import { Bell, Search, ShieldCheck } from 'lucide-react';

export const Navbar = () => {
  return (
    <header style={{
      height: '70px',
      background: '#ffffff',
      borderBottom: '1px solid var(--border-subtle)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px'
    }}>
      {/* Search Bar */}
      <div style={{ position: 'relative', width: '380px' }}>
        <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#4b5563' }} />
        <input
          type="text"
          placeholder="Search by Unit No, Customer Name, Booking ID or Lead..."
          style={{ width: '100%', paddingLeft: '38px', fontSize: '0.875rem' }}
        />
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '18px' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          background: 'rgba(20, 184, 166, 0.1)',
          border: '1px solid rgba(20, 184, 166, 0.3)',
          borderRadius: 'var(--radius-full)',
          fontSize: '0.75rem',
          color: 'var(--primary-500)',
          fontWeight: '600'
        }}>
          <ShieldCheck size={14} />
          UP RERA Verified
        </div>

        <button style={{
          width: '38px',
          height: '38px',
          borderRadius: '50%',
          background: '#f8f9fa',
          border: '1px solid #dadce0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#374151'
        }}>
          <Bell size={18} />
        </button>
      </div>
    </header>
  );
};
