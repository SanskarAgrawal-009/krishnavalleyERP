import React from 'react';
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
      background: '#ffffff',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      minHeight: '100vh'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, var(--primary-600), var(--accent-gold-500))',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#111827',
          boxShadow: 'var(--shadow-glow)'
        }}>
          <Building2 size={22} />
        </div>
        <div>
          <div style={{ fontSize: '1rem', fontWeight: '800', letterSpacing: '-0.02em', color: '#111827' }}>
            KRISHNA VALLEY
          </div>
          <div style={{ fontSize: '0.7rem', color: 'var(--primary-500)', fontWeight: '600', textTransform: 'uppercase' }}>
            Enterprise ERP
          </div>
        </div>
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
