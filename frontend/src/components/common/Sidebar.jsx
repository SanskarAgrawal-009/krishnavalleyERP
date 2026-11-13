import React from 'react';
import { useTheme } from '../../context/ThemeContext.jsx';
import { 
  Building2, 
  LayoutDashboard, 
  Users, 
  BookCheck, 
  CreditCard, 
  UserCheck, 
  BarChart3, 
  Settings 
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { isDark, brandHeaderUrl } = useTheme();

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'inventory', label: 'Unit Matrix & Inventory', icon: Building2 },
    { id: 'leads', label: 'Leads & CRM', icon: Users },
    { id: 'bookings', label: 'Bookings & Sales', icon: BookCheck },
    { id: 'finance', label: 'Milestone Billing & Dues', icon: CreditCard },
    { id: 'customers', label: 'Buyer Profiles & KYC', icon: UserCheck },
    { id: 'settings', label: 'ERP Settings & Roles', icon: Settings }
  ];

  return (
    <aside style={{
      width: '260px',
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '18px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <img
          src={brandHeaderUrl}
          alt="Krishna Valley Enterprise Platform"
          style={{
            width: '100%',
            maxWidth: '215px',
            height: 'auto',
            maxHeight: '74px',
            objectFit: 'contain',
            display: 'block'
          }}
        />
      </div>

      {/* Navigation Links */}
      <nav style={{ padding: '16px 12px', display: 'flex', flexDirection: 'column', gap: '6px', flex: 1 }}>
        {menuItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '12px 14px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '0.875rem',
                fontWeight: isActive ? '600' : '500',
                color: isActive ? '#fff' : 'var(--text-secondary)',
                backgroundColor: isActive ? 'var(--primary-700)' : 'transparent',
                textAlign: 'left',
                width: '100%'
              }}
            >
              <Icon size={18} color={isActive ? '#fff' : 'var(--text-muted)'} />
              {item.label}
            </button>
          );
        })}
      </nav>

      {/* Footer Profile */}
      <div style={{
        padding: '16px 20px',
        borderTop: '1px solid var(--border-subtle)',
        display: 'flex',
        alignItems: 'center',
        gap: '10px'
      }}>
        <div style={{
          width: '34px',
          height: '34px',
          borderRadius: '50%',
          background: '#374151',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontWeight: '700',
          fontSize: '0.85rem'
        }}>
          KV
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827', whiteSpace: 'nowrap' }}>
            Krishna Valley Admin
          </div>
          <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
            Super Admin
          </div>
        </div>
      </div>
    </aside>
  );
};
