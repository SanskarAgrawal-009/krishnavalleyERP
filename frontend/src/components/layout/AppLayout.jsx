import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorBoundary } from '../common/ErrorBoundary.jsx';
import {
  LayoutDashboard,
  Building2,
  Package,
  Users,
  ShoppingBag,
  UserCheck,
  Repeat,
  Wrench,
  Briefcase,
  Folder,
  Bell,
  BarChart3,
  Search,
  Plus,
  ShieldCheck,
  Menu,
  X,
  ChevronDown,
  ChevronRight,
  DollarSign,
  Award,
  Truck,
  ShoppingCart,
  CheckCircle,
  ArrowUpRight,
  Mail,
  Smartphone,
  MessageSquare,
  FileText,
  PieChart,
  Calendar,
  Layers,
  Settings,
  HelpCircle,
  Sliders,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowLeftRight,
  LogOut,
  User,
  KeyRound,
  Sparkles,
  AlertTriangle,
  Clock
} from 'lucide-react';

const NAV_ITEMS = [
  {
    path: '/dashboard',
    label: 'Dashboard',
    icon: LayoutDashboard,
    badge: 'Live',
    permission: 'dashboard:view'
  },
  {
    path: '/inventory',
    label: 'Sites & Inventory',
    icon: Building2,
    badge: 'Master',
    permission: 'inventory:view',
    subItems: [
      { path: '/inventory?view=projects', label: 'All Projects & Sites', icon: Building2 },
      { path: '/inventory?view=buildings', label: 'Buildings & Towers', icon: Layers },
      { path: '/inventory?view=flats', label: 'Flats & Availability', icon: Building2 }
    ]
  },
  {
    path: '/materials',
    label: 'Material & Stores',
    icon: Package,
    permission: 'materials:view',
    subItems: [
      { path: '/materials?tab=stocks', label: 'Stock Ledger', icon: DollarSign },
      { path: '/materials?tab=materials', label: 'Materials Catalog', icon: Package },
      { path: '/materials?tab=stores', label: 'Stores & Warehouses', icon: Building2 },
      { path: '/materials?tab=vendors', label: 'Vendors Register', icon: Truck },
      { path: '/materials?tab=pos', label: 'Purchase Orders (POs)', icon: ShoppingCart },
      { path: '/materials?tab=grns', label: 'Goods Receipts (GRN)', icon: CheckCircle },
      { path: '/materials?tab=issues', label: 'Material Issues', icon: ArrowUpRight },
      { path: '/materials?tab=transfers', label: 'Site Transfers', icon: Repeat }
    ]
  },
  {
    path: '/agent-portal',
    label: 'Agent Portal & Leads',
    icon: Sparkles,
    badge: 'Partner',
    permission: 'agent:leads',
    subItems: [
      { path: '/agent-portal?tab=leads', label: 'My Leads Pipeline', icon: Users },
      { path: '/site-visits', label: 'Site Visits & Verifications', icon: ShieldCheck },
      { path: '/agent-portal?tab=commissions', label: 'Commission Statement', icon: DollarSign }
    ]
  },
  {
    path: '/agent-network',
    label: 'Agent Network',
    icon: Users,
    subItems: [
      { path: '/agent-network', label: 'Channel Partner Directory', icon: Users },
      { path: '/site-visits', label: 'Site Visit Approvals', icon: ShieldCheck },
    ]
  },
  {
    path: '/crm',
    label: 'CRM & Lead Engine',
    icon: Users,
    permission: 'crm:view',
    subItems: [
      { path: '/crm?tab=inquiries', label: 'Inquiries & Leads', icon: Users },
      { path: '/crm?tab=visits', label: 'Scheduled Visits Calendar', icon: Calendar },
      { path: '/crm?tab=pipeline', label: 'Follow-up Pipeline', icon: Sliders }
    ]
  },
  {
    path: '/sales',
    label: 'Sales & Allotments',
    icon: ShoppingBag,
    permission: 'sales:view',
    subItems: [
      { path: '/sales?tab=deals', label: 'Sales Deals Register', icon: ShoppingBag },
      { path: '/sales?tab=lifecycle', label: 'Milestone Demands', icon: DollarSign },
      { path: '/sales?tab=messaging', label: 'Buyer Messaging Center', icon: MessageSquare }
    ]
  },
  {
    path: '/customers',
    label: 'Customer Management',
    icon: UserCheck,
    permission: 'customers:view',
    subItems: [
      { path: '/customers?tab=directory', label: 'Customer Directory', icon: UserCheck },
      { path: '/customers?tab=passbook', label: 'Customer Passbooks', icon: FileText }
    ]
  },
  {
    path: '/rentals',
    label: 'Rental & Rent-Back',
    icon: Repeat,
    permission: 'rentals:view',
    subItems: [
      { path: '/rentals?tab=contracts', label: 'Rental Contracts', icon: Repeat },
      { path: '/rentals?tab=rentback', label: 'Guaranteed Yields', icon: DollarSign },
      { path: '/rentals?tab=messaging', label: 'Tenant Messaging', icon: MessageSquare }
    ]
  },
  {
    path: '/maintenance',
    label: 'Maintenance & Services',
    icon: Wrench,
    permission: 'maintenance:view',
    subItems: [
      { path: '/maintenance?tab=bills', label: 'Maintenance Bills', icon: DollarSign },
      { path: '/maintenance?tab=tickets', label: 'Service Tickets & SLA', icon: Wrench },
      { path: '/maintenance?tab=penalties', label: 'Rule Infractions & Penalties', icon: AlertTriangle }
    ]
  },
  {
    path: '/hr',
    label: 'Workforce & HR',
    icon: Briefcase,
    permission: 'hr:view',
    subItems: [
      { path: '/hr?tab=directory', label: 'Staff Directory', icon: Users },
      { path: '/hr?tab=attendance', label: 'Daily Attendance', icon: Calendar },
      { path: '/hr?tab=leaves', label: 'Leave Requests', icon: Clock },
      { path: '/hr?tab=payroll', label: 'Monthly Payroll', icon: DollarSign }
    ]
  },
  {
    path: '/documents',
    label: 'Documents Vault',
    icon: Folder,
    permission: 'documents:view',
    subItems: [
      { path: '/documents?tab=sales', label: 'Sales Agreements', icon: FileText },
      { path: '/documents?tab=rental', label: 'Rental Leases', icon: Repeat },
      { path: '/documents?tab=blueprints', label: 'Floor Blueprints', icon: Layers },
      { path: '/documents?tab=legal', label: 'Legal & Title Vault', icon: ShieldCheck },
      { path: '/documents?tab=signatures', label: 'Digital Signatures', icon: Award }
    ]
  },
  {
    path: '/notifications',
    label: 'Notifications Hub',
    icon: Bell,
    badge: 'Hub',
    permission: 'notifications:view',
    subItems: [
      { path: '/notifications?tab=templates', label: 'Reminder Templates', icon: FileText },
      { path: '/notifications?tab=whatsapp', label: 'WhatsApp Gateway', icon: MessageSquare },
      { path: '/notifications?tab=sms', label: 'SMS Gateway', icon: Smartphone },
      { path: '/notifications?tab=email', label: 'Email Engine', icon: Mail },
      { path: '/notifications?tab=push', label: 'Push Notifications', icon: Bell },
      { path: '/notifications?tab=logs', label: 'Audit Logs', icon: CheckCircle }
    ]
  },
  {
    path: '/reports',
    label: 'BI Reports & Analytics',
    icon: BarChart3,
    highlight: true,
    badge: 'BI',
    frozen: true, // [FROZEN FOR PRODUCTION DEPLOYMENT - Kept offline for future updates]
    permission: 'reports:view',
    subItems: [
      { path: '/reports/sales', label: 'Sales Report' },
      { path: '/reports/rental', label: 'Rental Report' },
      { path: '/reports/collection', label: 'Collection & Aging' },
      { path: '/reports/maintenance', label: 'Maintenance Report' },
      { path: '/reports/inventory', label: 'Inventory Report' },
      { path: '/reports/finance', label: 'Finance & P&L' },
      { path: '/reports/crm', label: 'CRM Funnel' },
      { path: '/reports/hr', label: 'HR & Payroll' }
    ]
  },
  {
    path: '/access-control',
    label: 'Access Control & Users',
    icon: ShieldCheck,
    highlight: false,
    badge: 'Admin',
    permission: 'users:view',
    subItems: [
      { path: '/access-control?tab=users', label: 'User Directory', icon: Users },
      { path: '/access-control?tab=roles', label: 'Role Permissions Matrix', icon: ShieldCheck },
      { path: '/access-control?tab=branches', label: 'Branch Locations', icon: Building2 }
    ]
  },
  {
    path: '/settings',
    label: '14. Settings',
    icon: Settings,
    badge: 'Core',
    frozen: true, // [FROZEN FOR PRODUCTION DEPLOYMENT - Kept offline for laptop]
    permission: 'settings:view',
    subItems: [
      { path: '/settings?tab=company', label: 'Company Profile', icon: Building2 },
      { path: '/settings?tab=financialYear', label: 'Financial Year', icon: Calendar },
      { path: '/settings?tab=taxes', label: 'Taxes & GST Slabs', icon: DollarSign },
      { path: '/settings?tab=paymentGateway', label: 'Payment Gateway', icon: DollarSign },
      { path: '/settings?tab=email', label: 'Email (SMTP)', icon: Mail },
      { path: '/settings?tab=whatsappApi', label: 'WhatsApp Cloud API', icon: MessageSquare },
      { path: '/settings?tab=backup', label: 'Database Backup', icon: Folder },
      { path: '/settings?tab=systemPreferences', label: 'System Preferences', icon: Sliders }
    ]
  },
  {
    path: '/audit-logs',
    label: '15. Audit Logs',
    icon: ShieldCheck,
    badge: 'Sec',
    frozen: true, // [FROZEN FOR PRODUCTION DEPLOYMENT - Kept offline for laptop]
    permission: 'users:view',
    subItems: [
      { path: '/audit-logs?tab=activity', label: 'Activity Logs (CRUD)', icon: FileText },
      { path: '/audit-logs?tab=deleted', label: 'Deleted Records Vault', icon: FileText },
      { path: '/audit-logs?tab=updated', label: 'Updated Records (Diffs)', icon: FileText },
      { path: '/audit-logs?tab=logins', label: 'Login History', icon: User },
      { path: '/audit-logs?tab=errors', label: 'Error & Exception Logs', icon: FileText }
    ]
  }
];

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout, hasPermission, isSuperAdmin, login } = useAuth();
  
  // Profile dropdown state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Close profile dropdown on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Responsive layout state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(() => {
    // Check if user previously collapsed sidebar
    return localStorage.getItem('kv_sidebar_collapsed') === 'true';
  });
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  const [navSearch, setNavSearch] = useState('');
  const [hoveredFlyout, setHoveredFlyout] = useState(null);

  // Accordion state for expandable parent modules
  const [expanded, setExpanded] = useState({});

  // Responsive window resize listener
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 1024;
      setIsMobile(mobile);
      if (!mobile) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Keyboard shortcut: Ctrl+B or Cmd+B to toggle sidebar collapse
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'b') {
        e.preventDefault();
        if (!isMobile) {
          setIsCollapsed((prev) => {
            const next = !prev;
            localStorage.setItem('kv_sidebar_collapsed', String(next));
            return next;
          });
        } else {
          setMobileMenuOpen((prev) => !prev);
        }
      } else if (e.key === 'Escape' && mobileMenuOpen) {
        setMobileMenuOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isMobile, mobileMenuOpen]);

  // Filter items based on user permissions, role, and search
  const userRole = (user?.role?.roleCode || user?.roleCode || user?.role || '').toLowerCase();
  const isAgentUser = userRole === 'agent';
  const isOfflineDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // 0. Frozen modules: removed from live production deployment, retained in project offline for future updates
    if (item.frozen && !isOfflineDev) {
      return false;
    }

    // 1. Agent Portal is exclusively for logged-in Agents
    if (item.path === '/agent-portal') {
      return isAgentUser;
    }

    // 2. Agent Network Directory is exclusively for inhouse staff & management
    if (item.path === '/agent-network') {
      return !isAgentUser;
    }

    if (!item.permission) return true;
    return hasPermission(item.permission);
  });

  // Helper to check if a navigation module or one of its child sub-items matches current location
  const isItemActive = (item) => {
    if (!item) return false;
    if (item.path === '/agent-portal' && !isAgentUser) return false;
    if (item.path === '/agent-network' && isAgentUser) return false;

    if (item.path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname === '/';
    }

    // 1. Direct match on parent path
    if (location.pathname === item.path || location.pathname.startsWith(`${item.path}/`)) {
      return true;
    }

    // 2. Match on any sub-item path (including distinct sub-routes like /site-visits)
    if (item.subItems && item.subItems.length > 0) {
      return item.subItems.some((sub) => {
        const subBase = sub.path.split('?')[0];
        return location.pathname === subBase || location.pathname.startsWith(`${subBase}/`);
      });
    }

    return false;
  };

  // Auto-expand only the current active module (closing all other lists)
  useEffect(() => {
    let matchedPath = null;
    visibleNavItems.forEach((item) => {
      if (item.path !== '/dashboard' && isItemActive(item)) {
        matchedPath = item.path;
      }
    });

    if (matchedPath) {
      setExpanded({ [matchedPath]: true });
    } else if (location.pathname === '/dashboard' || location.pathname === '/') {
      setExpanded({});
    }

    setMobileMenuOpen(false);
    setHoveredFlyout(null);
  }, [location.pathname, isAgentUser]);

  const toggleCollapse = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('kv_sidebar_collapsed', String(next));
      return next;
    });
  };

  const toggleExpand = (path, e) => {
    if (e) {
      e.stopPropagation();
      e.preventDefault();
    }
    setExpanded((prev) => {
      const isCurrentlyOpen = Boolean(prev[path]);
      if (isCurrentlyOpen) {
        // If clicking on the currently open module, collapse it
        return {};
      } else {
        // Open ONLY this module and automatically close all other lists
        return { [path]: true };
      }
    });
  };

  const handleRowClick = (item, e) => {
    if (item.subItems && item.subItems.length > 0) {
      // Toggle the clicked module (opens it and closes any other open list)
      toggleExpand(item.path, e);

      // Navigate to the module if not already in it
      const isAlreadyInModule = isItemActive(item);
      if (!isAlreadyInModule) {
        navigate(item.path);
      }
    } else {
      setExpanded({});
      navigate(item.path);
      if (isMobile) setMobileMenuOpen(false);
    }
  };

  const [globalSearch, setGlobalSearch] = useState('');
  const handleGlobalSearch = (e) => {
    e.preventDefault();
    if (globalSearch.trim()) {
      navigate(`/crm?search=${encodeURIComponent(globalSearch.trim())}`);
    }
  };

  const filteredNavItems = visibleNavItems.map((item) => {
    if (!navSearch.trim()) return item;
    const query = navSearch.toLowerCase();
    const parentMatches = item.label.toLowerCase().includes(query);
    const matchingSubs = (item.subItems || []).filter((sub) =>
      sub.label.toLowerCase().includes(query)
    );

    if (parentMatches || matchingSubs.length > 0) {
      return {
        ...item,
        subItems: matchingSubs.length > 0 ? matchingSubs : item.subItems,
        forceOpen: true
      };
    }
    return null;
  }).filter(Boolean);

  // Sidebar width configuration
  const sidebarWidth = isMobile ? 288 : isCollapsed ? 76 : 280;

  return (
    <div
      className="bg-background text-on-surface font-body-md"
      style={{
        height: '100vh',
        maxHeight: '100vh',
        overflow: 'hidden',
        display: 'flex',
        position: 'relative',
        backgroundColor: 'var(--background)'
      }}
    >
      {/* Mobile Drawer Backdrop */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(25, 28, 29, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 45,
            transition: 'opacity 0.25s ease'
          }}
          aria-hidden="true"
        />
      )}

      {/* ======================================================== */}
      {/* 1. SIDEBAR NAVIGATION RAIL                                */}
      {/* ======================================================== */}
      <nav
        style={{
          width: `${sidebarWidth}px`,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 50,
          backgroundColor: '#f8f9fa',
          borderRight: '1px solid #dadce0',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isMobile && mobileMenuOpen ? '0 12px 40px rgba(0,0,0,0.25)' : 'none',
          transform: isMobile
            ? mobileMenuOpen
              ? 'translateX(0)'
              : 'translateX(-100%)'
            : 'translateX(0)',
          transition: 'width 0.25s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div
          style={{
            padding: isCollapsed && !isMobile ? '16px 12px' : '18px 18px 14px',
            borderBottom: '1px solid #edeef0',
            backgroundColor: '#f8f9fa',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed && !isMobile ? 'center' : 'space-between' }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/dashboard')}
              title="Krishna Valley ERP"
            >
              <div
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '8px',
                  backgroundColor: '#1a73e8',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '1.05rem',
                  boxShadow: '0 2px 6px rgba(26,115,232,0.25)',
                  flexShrink: 0
                }}
              >
                KV
              </div>

              {(!isCollapsed || isMobile) && (
                <div style={{ minWidth: 0 }}>
                  <h1
                    style={{
                      fontSize: '1rem',
                      fontWeight: '700',
                      color: 'var(--on-surface)',
                      lineHeight: 1.2,
                      whiteSpace: 'nowrap',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis'
                    }}
                  >
                    Krishna Valley
                  </h1>
                  <p
                    style={{
                      fontSize: '0.74rem',
                      color: 'var(--on-surface-variant)',
                      fontWeight: '500',
                      whiteSpace: 'nowrap'
                    }}
                  >
                    Enterprise Platform
                  </p>
                </div>
              )}
            </div>

            {/* Mobile close button */}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: '6px',
                  color: 'var(--on-surface-variant)',
                  background: '#f3f4f5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #dadce0',
                  cursor: 'pointer'
                }}
                aria-label="Close sidebar menu"
              >
                <X size={18} />
              </button>
            )}

            {/* Desktop collapse toggle */}
            {!isMobile && !isCollapsed && (
              <button
                onClick={toggleCollapse}
                title="Collapse sidebar (Ctrl+B)"
                style={{
                  padding: '6px',
                  color: 'var(--on-surface-variant)',
                  background: 'transparent',
                  borderRadius: '6px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: 'none',
                  cursor: 'pointer',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#edeeef'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <PanelLeftClose size={18} />
              </button>
            )}
          </div>

          {/* Desktop expand button when in collapsed mode */}
          {!isMobile && isCollapsed && (
            <button
              onClick={toggleCollapse}
              title="Expand sidebar (Ctrl+B)"
              style={{
                width: '100%',
                padding: '6px 0',
                color: 'var(--on-surface-variant)',
                background: '#edeeef',
                borderRadius: '6px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <PanelLeftOpen size={16} />
            </button>
          )}

          {/* Quick Action CTA Button */}
          {(!isCollapsed || isMobile) ? (
            <button
              onClick={() => {
                navigate('/sales');
                if (isMobile) setMobileMenuOpen(false);
              }}
              style={{
                width: '100%',
                backgroundColor: '#1a73e8',
                color: '#ffffff',
                padding: '9px 14px',
                borderRadius: '8px',
                fontWeight: '600',
                fontSize: '0.85rem',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(26,115,232,0.3)',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#1557d0'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#1a73e8'; }}
            >
              <Plus size={16} strokeWidth={2.5} />
              New Project / Deal
            </button>
          ) : (
            <button
              onClick={() => navigate('/sales')}
              title="New Project / Deal"
              style={{
                width: '40px',
                height: '40px',
                margin: '0 auto',
                backgroundColor: '#1a73e8',
                color: '#ffffff',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: 'none',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(26,115,232,0.3)'
              }}
            >
              <Plus size={20} strokeWidth={2.5} />
            </button>
          )}

          {/* Menu Search Filter */}
          {(!isCollapsed || isMobile) && (
            <div style={{ position: 'relative' }}>
              <Search
                size={14}
                color="var(--outline)"
                style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Filter menu..."
                value={navSearch}
                onChange={(e) => setNavSearch(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#ffffff',
                  border: '1px solid #dadce0',
                  borderRadius: '8px',
                  paddingLeft: '32px',
                  paddingRight: navSearch ? '28px' : '10px',
                  paddingTop: '6px',
                  paddingBottom: '6px',
                  fontSize: '0.8rem',
                  color: 'var(--on-surface)',
                  fontWeight: '500'
                }}
              />
              {navSearch && (
                <button
                  onClick={() => setNavSearch('')}
                  style={{
                    position: 'absolute',
                    right: '6px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--outline)',
                    cursor: 'pointer',
                    padding: '2px',
                    display: 'flex',
                    alignItems: 'center'
                  }}
                  title="Clear search"
                >
                  <X size={13} />
                </button>
              )}
            </div>
          )}
        </div>

        {/* Scrollable Navigation Tree */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isCollapsed && !isMobile ? '12px 6px' : '12px 0',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {filteredNavItems.map((item) => {
            const IconComp = item.icon;
            const isDashboard = item.path === '/dashboard';
            const isSelected = isItemActive(item);
            const isOpen = item.forceOpen || Boolean(expanded[item.path]);
            const hasSubs = item.subItems && item.subItems.length > 0;
            const showFlyout = hoveredFlyout === item.path && isCollapsed && !isMobile;

            return (
              <div
                key={item.path}
                style={{ marginBottom: '3px', position: 'relative' }}
                onMouseEnter={() => isCollapsed && !isMobile && setHoveredFlyout(item.path)}
                onMouseLeave={() => isCollapsed && !isMobile && setHoveredFlyout(null)}
              >
                {/* Unified Parent Module Nav Item (Full Row Combined) */}
                <div
                  onClick={(e) => handleRowClick(item, e)}
                  title={isCollapsed && !isMobile ? item.label : undefined}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: isCollapsed && !isMobile ? 'center' : 'space-between',
                    padding: isCollapsed && !isMobile ? '10px 0' : '10px 14px 10px 18px',
                    marginRight: isCollapsed && !isMobile ? '0' : '12px',
                    borderRadius: isCollapsed && !isMobile ? '8px' : '0 9999px 9999px 0',
                    backgroundColor: isSelected
                      ? (item.highlight ? '#fee2e2' : '#4d8efe')
                      : 'transparent',
                    color: isSelected
                      ? (item.highlight ? '#991b1b' : '#00285c')
                      : 'var(--on-surface-variant)',
                    fontWeight: isSelected ? '700' : '500',
                    fontSize: '0.86rem',
                    cursor: 'pointer',
                    userSelect: 'none',
                    transition: 'all 0.15s ease',
                    minHeight: '42px'
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = '#edeeef';
                      e.currentTarget.style.color = 'var(--on-surface)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                      e.currentTarget.style.color = 'var(--on-surface-variant)';
                    }
                  }}
                >
                  {/* Left: Icon & Label */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                    <IconComp
                      size={19}
                      color={
                        isSelected
                          ? (item.highlight ? '#991b1b' : '#00285c')
                          : 'var(--on-surface-variant)'
                      }
                      strokeWidth={isSelected ? 2.5 : 2}
                      style={{ flexShrink: 0 }}
                    />

                    {(!isCollapsed || isMobile) && (
                      <span
                        style={{
                          flex: 1,
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis'
                        }}
                      >
                        {item.label}
                      </span>
                    )}
                  </div>

                  {/* Right: Badge & Chevron Indicator */}
                  {(!isCollapsed || isMobile) && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', flexShrink: 0 }}>
                      {item.badge && (
                        <span
                          style={{
                            fontSize: '0.65rem',
                            fontWeight: '700',
                            backgroundColor: isSelected
                              ? '#00285c'
                              : (item.highlight ? '#ba1a1a' : '#1a73e8'),
                            color: '#ffffff',
                            padding: '1px 6px',
                            borderRadius: '9999px'
                          }}
                        >
                          {item.badge}
                        </span>
                      )}

                      {hasSubs && (
                        <span
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: isSelected
                              ? (item.highlight ? '#991b1b' : '#00285c')
                              : 'var(--on-surface-variant)',
                            transition: 'transform 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
                            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                          }}
                        >
                          <ChevronDown size={17} />
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Sub-menu Navigation Links (Expanded Tree) */}
                {hasSubs && isOpen && (!isCollapsed || isMobile) && (
                  <div
                    style={{
                      paddingLeft: '28px',
                      paddingRight: '12px',
                      marginTop: '2px',
                      marginBottom: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '2px',
                      borderLeft: '2px solid #dadce0',
                      marginLeft: '26px'
                    }}
                  >
                    {item.subItems.map((sub) => {
                      const currentFull = `${location.pathname}${location.search}`;
                      const subBase = sub.path.split('?')[0];
                      const isSubActive =
                        currentFull === sub.path ||
                        (location.pathname === subBase && (!sub.path.includes('?') || currentFull.startsWith(sub.path)));

                      return (
                        <NavLink
                          key={sub.path}
                          to={sub.path}
                          onClick={() => isMobile && setMobileMenuOpen(false)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '7px 12px',
                            borderRadius: '6px',
                            fontSize: '0.8rem',
                            fontWeight: isSubActive ? '700' : '500',
                            textDecoration: 'none',
                            color: isSubActive ? '#1a73e8' : 'var(--on-surface-variant)',
                            backgroundColor: isSubActive ? '#e8f0fe' : 'transparent',
                            transition: 'all 0.12s ease'
                          }}
                          onMouseEnter={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.backgroundColor = '#edeeef';
                              e.currentTarget.style.color = 'var(--on-surface)';
                            }
                          }}
                          onMouseLeave={(e) => {
                            if (!isSubActive) {
                              e.currentTarget.style.backgroundColor = 'transparent';
                              e.currentTarget.style.color = 'var(--on-surface-variant)';
                            }
                          }}
                        >
                          <span
                            style={{
                              width: '5px',
                              height: '5px',
                              borderRadius: '50%',
                              backgroundColor: isSubActive ? '#1a73e8' : '#727785',
                              flexShrink: 0
                            }}
                          />
                          <span
                            style={{
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis'
                            }}
                          >
                            {sub.label}
                          </span>
                        </NavLink>
                      );
                    })}
                  </div>
                )}

                {/* Collapsed Mode Flyout Popover */}
                {showFlyout && (
                  <div
                    style={{
                      position: 'absolute',
                      left: '74px',
                      top: '0',
                      backgroundColor: '#ffffff',
                      border: '1px solid #dadce0',
                      borderRadius: '8px',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
                      padding: '8px',
                      minWidth: '200px',
                      zIndex: 100,
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '4px'
                    }}
                  >
                    <div
                      style={{
                        padding: '6px 10px',
                        fontSize: '0.82rem',
                        fontWeight: '700',
                        color: '#1a73e8',
                        borderBottom: '1px solid #edeef0',
                        marginBottom: '4px'
                      }}
                    >
                      {item.label}
                    </div>
                    {(item.subItems || [{ path: item.path, label: item.label }]).map((sub) => (
                      <NavLink
                        key={sub.path}
                        to={sub.path}
                        onClick={() => setHoveredFlyout(null)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          padding: '6px 10px',
                          borderRadius: '6px',
                          fontSize: '0.8rem',
                          color: 'var(--on-surface)',
                          textDecoration: 'none',
                          fontWeight: '500'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f5'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                      >
                        {sub.label}
                      </NavLink>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Bottom Pinned Area */}
        <div
          style={{
            padding: isCollapsed && !isMobile ? '12px 6px' : '14px 16px',
            borderTop: '1px solid #dadce0',
            backgroundColor: '#f8f9fa'
          }}
        >
          {/* Operational Status Pill */}
          {(!isCollapsed || isMobile) ? (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 10px',
                borderRadius: '6px',
                backgroundColor: '#e6f4ea',
                color: '#137333',
                fontSize: '0.74rem',
                fontWeight: '600',
                marginBottom: '10px'
              }}
            >
              <ShieldCheck size={14} style={{ flexShrink: 0 }} />
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                System Online • All 12 Active
              </span>
            </div>
          ) : (
            <div
              title="System Online • All 12 Modules Active"
              style={{
                width: '32px',
                height: '32px',
                margin: '0 auto 8px',
                borderRadius: '50%',
                backgroundColor: '#e6f4ea',
                color: '#137333',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <ShieldCheck size={16} />
            </div>
          )}

          {/* Quick Footer Links */}
          {(!isCollapsed || isMobile) ? (
            <div style={{ display: 'flex', gap: '6px', flexDirection: 'column' }}>
              <NavLink
                to="/notifications"
                onClick={() => isMobile && setMobileMenuOpen(false)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  padding: '6px 10px',
                  borderRadius: '6px',
                  color: 'var(--on-surface-variant)',
                  textDecoration: 'none',
                  fontSize: '0.8rem',
                  fontWeight: '500'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#edeeef'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <HelpCircle size={16} /> Help & Documentation
              </NavLink>

              {isOfflineDev && (
                <NavLink
                  to="/settings"
                  onClick={() => isMobile && setMobileMenuOpen(false)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '6px 10px',
                    borderRadius: '6px',
                    color: 'var(--on-surface-variant)',
                    textDecoration: 'none',
                    fontSize: '0.8rem',
                    fontWeight: '500'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#edeeef'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
                >
                  <Settings size={16} /> System Settings
                </NavLink>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'center' }}>
              <button
                onClick={() => navigate('/notifications')}
                title="Help & Documentation"
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  border: 'none',
                  color: 'var(--on-surface-variant)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer'
                }}
              >
                <HelpCircle size={17} />
              </button>

              {isOfflineDev && (
                <button
                  onClick={() => navigate('/settings')}
                  title="System Settings"
                  style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '6px',
                    backgroundColor: 'transparent',
                    border: 'none',
                    color: 'var(--on-surface-variant)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer'
                  }}
                >
                  <Settings size={17} />
                </button>
              )}
            </div>
          )}
        </div>
      </nav>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT WRAPPER                                   */}
      {/* ======================================================== */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          maxHeight: '100vh',
          minWidth: 0,
          marginLeft: isMobile ? '0' : `${sidebarWidth}px`,
          transition: 'margin-left 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Sticky Top Header Navbar */}
        <header
          style={{
            height: '68px',
            minHeight: '68px',
            maxHeight: '68px',
            backgroundColor: '#ffffff',
            borderBottom: '1px solid #dadce0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '0 18px' : '0 36px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            gap: '16px',
            flexShrink: 0,
            boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
          }}
        >
          {/* Left Title & Mobile Menu Toggle */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexShrink: 0 }}>
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(true)}
                style={{
                  padding: '8px',
                  background: '#f3f4f5',
                  color: 'var(--on-surface)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #dadce0',
                  cursor: 'pointer'
                }}
                aria-label="Open Navigation Sidebar"
              >
                <Menu size={19} />
              </button>
            )}

            <div
              style={{
                fontSize: isMobile ? '1rem' : '1.2rem',
                fontWeight: '700',
                color: '#1a73e8',
                letterSpacing: '-0.01em',
                cursor: 'pointer'
              }}
              onClick={() => navigate('/dashboard')}
            >
              Krishna Valley ERP
            </div>
          </div>

          {/* Omnisearch Bar */}
          <form
            onSubmit={handleGlobalSearch}
            style={{
              flex: 1,
              maxWidth: '560px',
              padding: '0 4px',
              display: isMobile && window.innerWidth < 640 ? 'none' : 'block'
            }}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={16}
                color="var(--outline)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search projects, resources, or documents..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#f3f4f5',
                  border: '1px solid #dadce0',
                  borderRadius: '8px',
                  paddingLeft: '38px',
                  paddingRight: '14px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  fontSize: '0.875rem',
                  color: 'var(--on-surface)',
                  fontWeight: '500'
                }}
              />
            </div>
          </form>

          {/* Right Action Icons & Avatar Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Notification Hub */}
            <button
              onClick={() => navigate('/notifications')}
              title="Notification Center"
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'var(--on-surface-variant)',
                position: 'relative',
                cursor: 'pointer',
                border: 'none',
                transition: 'background-color 0.15s ease'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f5'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <Bell size={19} />
              <span
                style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  width: '7px',
                  height: '7px',
                  borderRadius: '50%',
                  backgroundColor: '#ba1a1a',
                  border: '1.5px solid #ffffff'
                }}
              />
            </button>

            {/* Reports & Analytics shortcut (Offline development only) */}
            {isOfflineDev && (
              <button
                onClick={() => navigate('/reports')}
                title="Reports & Analytics Hub (Offline Development)"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: 'var(--on-surface-variant)',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'background-color 0.15s ease'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#f3f4f5'; }}
                onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <BarChart3 size={19} />
              </button>
            )}

            {/* User Identity & Profile Menu Dropdown */}
            <div ref={profileDropdownRef} style={{ position: 'relative', marginLeft: '6px' }}>
              <div
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '4px 8px 4px 6px',
                  borderRadius: '24px',
                  border: '1px solid #dadce0',
                  backgroundColor: profileDropdownOpen ? '#e8f0fe' : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={user ? `${user.firstName} ${user.lastName} (${user.role?.roleName || 'User'})` : 'Account'}
              >
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    backgroundColor: '#1a73e8',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '0.8rem',
                    boxShadow: '0 2px 5px rgba(26,115,232,0.25)'
                  }}
                >
                  {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                </div>

                <div style={{ display: 'none', flexDirection: 'column', textAlign: 'left', lineHeight: 1.2 }}>
                  <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#1f2937' }}>
                    {user?.firstName || 'User'}
                  </span>
                  <span style={{ fontSize: '0.7rem', color: '#6b7280' }}>
                    {user?.role?.roleName || 'Staff'}
                  </span>
                </div>

                <ChevronDown size={14} style={{ color: '#5f6368', transform: profileDropdownOpen ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s ease' }} />
              </div>

              {/* Profile Dropdown Card */}
              {profileDropdownOpen && (
                <div
                  style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: '280px',
                    backgroundColor: '#ffffff',
                    borderRadius: '14px',
                    boxShadow: '0 12px 36px rgba(0,0,0,0.15)',
                    border: '1px solid #e5e7eb',
                    padding: '16px',
                    zIndex: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                  }}
                >
                  {/* User Profile Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', borderBottom: '1px solid #f3f4f6', paddingBottom: '12px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '50%',
                        backgroundColor: '#e8f0fe',
                        color: '#1a73e8',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontWeight: '700',
                        fontSize: '1rem'
                      }}
                    >
                      {user?.firstName?.[0] || 'U'}{user?.lastName?.[0] || ''}
                    </div>
                    <div style={{ overflow: 'hidden' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '700', color: '#111827', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {user?.firstName} {user?.lastName}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        @{user?.username} • {user?.email}
                      </div>
                      <div style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', marginTop: '4px', padding: '2px 6px', borderRadius: '4px', backgroundColor: '#e0f2fe', color: '#0369a1', fontSize: '0.68rem', fontWeight: '600' }}>
                        <ShieldCheck size={11} />
                        <span>{user?.role?.roleName || 'User'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Primary Branch Info */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#4b5563', padding: '6px 8px', borderRadius: '6px', backgroundColor: '#f9fafb' }}>
                    <Building2 size={14} style={{ color: '#9ca3af' }} />
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {user?.primaryBranch?.branchName || 'Mathura Head Office'}
                    </span>
                  </div>

                  {/* Access Control shortcut (if authorized) */}
                  {(isSuperAdmin || hasPermission('users:view')) && (
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        navigate('/access-control');
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#f0f9ff',
                        color: '#0284c7',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        textAlign: 'left'
                      }}
                    >
                      <ShieldCheck size={15} />
                      <span>Manage Users & Roles</span>
                    </button>
                  )}

                  {/* Switch Role Quick Tester (Offline development only) */}
                  {isOfflineDev && (
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '10px' }}>
                      <div style={{ fontSize: '0.7rem', fontWeight: '700', color: '#9ca3af', textTransform: 'uppercase', marginBottom: '6px' }}>
                        ⚡ Quick Role Switch (Demo)
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                        {[
                          { label: 'Admin', user: 'admin', pass: 'Admin@12345' },
                          { label: 'Sales Head', user: 'sales_head', pass: 'Sales@12345' },
                          { label: 'Site Eng.', user: 'site_eng', pass: 'Site@12345' },
                          { label: 'HR Head', user: 'hr_manager', pass: 'Hr@12345' },
                        ].map((demo) => (
                          <button
                            key={demo.label}
                            onClick={async () => {
                              try {
                                await login(demo.user, demo.pass);
                                setProfileDropdownOpen(false);
                                navigate('/dashboard');
                              } catch (e) {
                                alert(e.message);
                              }
                            }}
                            style={{
                              padding: '4px 6px',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              backgroundColor: '#ffffff',
                              fontSize: '0.72rem',
                              fontWeight: '600',
                              color: '#374151',
                              cursor: 'pointer'
                            }}
                          >
                            {demo.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Logout Action */}
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
                    <button
                      onClick={() => {
                        setProfileDropdownOpen(false);
                        logout();
                        navigate('/login');
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: 'none',
                        backgroundColor: '#fff5f5',
                        color: '#dc2626',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        cursor: 'pointer'
                      }}
                    >
                      <LogOut size={15} />
                      <span>Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Scrollable Middle Canvas for Route Content */}
        <main
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '24px 16px 48px' : '32px 40px 64px',
            boxSizing: 'border-box',
            width: '100%'
          }}
        >
          <div style={{ maxWidth: '1680px', margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
            <ErrorBoundary key={location.pathname}>
              <Outlet />
            </ErrorBoundary>
          </div>
        </main>

        {/* Sticky Bottom Footer */}
        <footer
          style={{
            backgroundColor: '#f8f9fa',
            borderTop: '1px solid #dadce0',
            padding: '14px 28px',
            display: 'flex',
            flexDirection: isMobile ? 'column' : 'row',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: '12px',
            position: 'sticky',
            bottom: 0,
            zIndex: 30,
            flexShrink: 0,
            boxShadow: '0 -2px 8px rgba(0,0,0,0.03)'
          }}
        >
          <div style={{ fontSize: '0.8rem', fontWeight: '600', color: 'var(--secondary)' }}>
            System Status: All Systems Operational • Vrindavan Projects Online
          </div>
          <div style={{ display: 'flex', gap: '16px', fontSize: '0.8rem', color: 'var(--on-surface-variant)' }}>
            <span style={{ cursor: 'pointer' }}>Privacy Policy</span>
            <span>•</span>
            <span style={{ cursor: 'pointer' }}>Terms of Service</span>
            <span>•</span>
            <span style={{ cursor: 'pointer' }}>Support</span>
          </div>
        </footer>
      </div>
    </div>
  );
};

export default AppLayout;
