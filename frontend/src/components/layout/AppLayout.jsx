import React, { useState, useEffect, useRef } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ErrorBoundary } from '../common/ErrorBoundary.jsx';
import { NotificationAlertBox } from './NotificationAlertBox.jsx';
import { useReminderAlerts } from '../../hooks/useReminderAlerts.js';
import { InAppReminderBanner } from '../common/InAppReminderBanner.jsx';
import { TaskChatNotifier } from '../taskforce/TaskChatNotifier.jsx';
import { isTaskforceTeamMember, extractRoleCode } from '../../utils/taskPermissions.js';
import { useTheme } from '../../context/ThemeContext.jsx';
import {
  LayoutDashboard,
  Home,
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
  PhoneCall,
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
  Clock,
  BookOpen,
  History,
  Target,
  Shield,
  Sun,
  Moon
} from 'lucide-react';

export const NAV_CATEGORIES = [
  {
    categoryKey: 'command',
    categoryLabel: 'Executive & Strategy',
    items: [
      {
        path: '/dashboard',
        label: 'Executive Dashboard',
        icon: Home,
        badge: 'Live',
        permission: 'dashboard:view'
      },
      {
        path: '/taskforce-dashboard',
        label: 'Taskforce Dashboard',
        icon: Target,
        badge: 'Ops Live',
        highlight: true,
        permission: ['tasks:view', 'tasks:manage']
      },
      {
        path: '/taskforce',
        label: 'Taskforce & Allocation',
        icon: Target,
        badge: 'Directives',
        permission: 'tasks:view',
        subItems: [
          { path: '/taskforce-dashboard', label: 'Operations Dashboard', icon: LayoutDashboard },
          { path: '/taskforce?view=kanban', label: 'Taskforce Board', icon: Layers },
          { path: '/taskforce?view=radar', label: 'Follow-up Radar', icon: Clock },
          { path: '/taskforce?view=list', label: 'Directives Register', icon: FileText },
          { path: '/taskforce?view=team', label: 'Team Hierarchy', icon: Users },
          { path: '/taskforce?view=meetings', label: 'Meetings & MoM', icon: Calendar },
          { path: '/taskforce?view=reports', label: 'Weekly Reports & Analytics', icon: BarChart3 },
        ]
      },
      {
        path: '/taskforce-manager',
        label: 'Taskforce Manager',
        icon: Shield,
        badge: 'New',
        highlight: true,
        permission: ['tasks:manage', 'tasks:view'],
        subItems: [
          { path: '/taskforce-manager?tab=team', label: 'Departments & Hierarchy', icon: Building2, permission: 'tasks:manage' },
          { path: '/taskforce-manager?tab=workforce', label: 'Team & Workload', icon: Users, permission: 'tasks:view' },
          { path: '/taskforce-manager?tab=delegation', label: 'Delegation Hub', icon: Target, permission: 'tasks:manage' },
        ],
      },
      {
        path: '/reports',
        label: 'BI Reports & Analytics',
        icon: BarChart3,
        highlight: true,
        badge: 'BI',
        permission: 'reports:view',
        subItems: [
          { path: '/reports/sales', label: 'Sales Report', permission: 'sales:view' },
          { path: '/reports/rental', label: 'Rental Report', permission: 'rentals:view' },
          { path: '/reports/collection', label: 'Collection & Aging', permission: 'reports:financial' },
          { path: '/reports/maintenance', label: 'Maintenance Report', permission: 'maintenance:view' },
          { path: '/reports/inventory', label: 'Inventory Report', permission: 'inventory:view' },
          { path: '/reports/finance', label: 'Finance & P&L', permission: 'reports:financial' },
          { path: '/reports/crm', label: 'CRM Funnel', permission: 'crm:view' },
          { path: '/reports/hr', label: 'HR & Payroll', permission: 'hr:view' }
        ]
      }
    ]
  },
  {
    categoryKey: 'property',
    categoryLabel: 'Property & Engineering',
    items: [
      {
        path: '/inventory',
        label: 'Sites & Inventory',
        icon: Building2,
        badge: 'Master',
        permission: 'inventory:view',
        subItems: [
          { path: '/inventory?view=projects', label: 'All Projects & Sites', icon: Building2 },
          { path: '/inventory?view=buildings', label: 'Buildings & Towers', icon: Layers },
          { path: '/inventory?view=flats', label: 'Flats & Availability Matrix', icon: Building2 }
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
          { path: '/materials?tab=pos', label: 'Purchase Orders (POs)', icon: ShoppingCart, permission: 'materials:create' },
          { path: '/materials?tab=grns', label: 'Goods Receipts (GRN)', icon: CheckCircle, permission: 'materials:create' },
          { path: '/materials?tab=issues', label: 'Material Issues', icon: ArrowUpRight, permission: 'materials:issue' },
          { path: '/materials?tab=transfers', label: 'Site Transfers', icon: Repeat, permission: 'materials:issue' }
        ]
      },
      {
        path: '/maintenance',
        label: 'Maintenance & Facility',
        icon: Wrench,
        permission: 'maintenance:view',
        subItems: [
          { path: '/maintenance?tab=bills', label: 'Maintenance Bills', icon: DollarSign, permission: 'maintenance:create' },
          { path: '/maintenance?tab=tickets', label: 'Service Tickets & SLA', icon: Wrench },
          { path: '/maintenance?tab=penalties', label: 'Rule Infractions & Penalties', icon: AlertTriangle }
        ]
      }
    ]
  },
  {
    categoryKey: 'sales',
    categoryLabel: 'Sales & Customer CRM',
    items: [
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
          { path: '/sales?tab=resale', label: 'Resale & Ownership History', icon: History },
          { path: '/sales?tab=messaging', label: 'Buyer Messaging Center', icon: MessageSquare }
        ]
      },
      {
        path: '/customers',
        label: 'Customer Accounts',
        icon: UserCheck,
        permission: 'customers:view',
        subItems: [
          { path: '/customers?tab=directory', label: 'Customer Directory', icon: UserCheck },
          { path: '/customers?tab=passbook', label: 'Customer Passbooks', icon: FileText }
        ]
      },
      {
        path: '/rentals',
        label: 'Rental Management',
        icon: Repeat,
        badge: 'Assured',
        permission: 'rentals:view',
        subItems: [
          { path: '/rentals?tab=active', label: 'Active Rental Register', icon: Building2 },
          { path: '/rentals?tab=history', label: 'Previous Owners Trail', icon: History },
          { path: '/rentals/ledgers', label: 'Rental Passbooks & Ledgers', icon: BookOpen, permission: 'rentals:manage' }
        ]
      }
    ]
  },
  {
    categoryKey: 'partners',
    categoryLabel: 'Channel Partners',
    items: [
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
        permission: ['agent:view', 'agent:manage', 'crm:view', 'sales:view', 'crm:manage'],
        subItems: [
          { path: '/agent-network', label: 'Channel Partner Directory', icon: Users },
          { path: '/site-visits', label: 'Site Visit Approvals', icon: ShieldCheck, permission: 'agent:verify' },
        ]
      },
      {
        path: '/settings',
        label: 'System Settings',
        icon: Settings,
        permission: ['settings:view', 'users:manage']
      }
    ]
  },
  {
    categoryKey: 'workforce',
    categoryLabel: 'Workforce & Assets',
    items: [
      {
        path: '/hr',
        label: 'Workforce & HR',
        icon: Briefcase,
        permission: 'hr:view',
        subItems: [
          { path: '/hr?tab=directory', label: 'Staff Directory', icon: Users },
          { path: '/hr?tab=id_cards', label: 'Staff ID Badges & Identity', icon: ShieldCheck },
          { path: '/hr?tab=leaves', label: 'Leave Quotas & Approvals', icon: Clock },
          { path: '/hr?tab=attendance', label: 'Daily Shift Attendance', icon: Calendar },
          { path: '/hr?tab=payroll', label: 'Monthly Payroll Register', icon: DollarSign, permission: 'hr:payroll' },
          { path: '/hr?tab=dept_roles', label: 'Departments & Roles', icon: Building2 }
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
        label: 'Notifications & Comms',
        icon: Bell,
        badge: 'Hub',
        permission: 'notifications:view',
        subItems: [
          { path: '/notifications?tab=templates', label: 'Reminder Templates', icon: FileText },
          { path: '/notifications?tab=calling', label: 'Telephony & Calling API', icon: PhoneCall },
          { path: '/notifications?tab=whatsapp', label: 'WhatsApp Gateway', icon: MessageSquare },
          { path: '/notifications?tab=sms', label: 'SMS Gateway', icon: Smartphone },
          { path: '/notifications?tab=email', label: 'Email Engine', icon: Mail },
          { path: '/notifications?tab=push', label: 'Push Notifications', icon: Bell },
          { path: '/notifications?tab=logs', label: 'Audit Logs', icon: CheckCircle }
        ]
      }
    ]
  },
  {
    categoryKey: 'governance',
    categoryLabel: 'Administration & Security',
    items: [
      {
        path: '/access-control',
        label: 'Access Control & Users',
        icon: ShieldCheck,
        badge: 'Admin',
        permission: ['users:view', 'roles:view', 'users:manage', 'roles:manage'],
        subItems: [
          { path: '/access-control?tab=users', label: 'User Directory', icon: Users },
          { path: '/access-control?tab=roles', label: 'Role Permissions Matrix', icon: ShieldCheck, permission: 'roles:view' },
          { path: '/access-control?tab=branches', label: 'Branch Locations', icon: Building2 }
        ]
      },
      {
        path: '/audit-logs',
        label: 'Audit Logs & Vault',
        icon: ShieldCheck,
        badge: 'Sec',
        permission: ['audit:view', 'users:view'],
        subItems: [
          { path: '/audit-logs?tab=activity', label: 'Activity Logs (CRUD)', icon: FileText },
          { path: '/audit-logs?tab=deleted', label: 'Deleted Records Vault', icon: FileText },
          { path: '/audit-logs?tab=updated', label: 'Updated Records (Diffs)', icon: FileText },
          { path: '/audit-logs?tab=logins', label: 'Login History', icon: User },
          { path: '/audit-logs?tab=errors', label: 'Error & Exception Logs', icon: FileText }
        ]
      }
    ]
  }
];

export const NAV_ITEMS = NAV_CATEGORIES.flatMap((category) => category.items);

export const AppLayout = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, userRole: authRole, logout, hasPermission, isSuperAdmin, login } = useAuth();
  const { theme, isDark, toggleTheme, logoUrl, logoPngUrl, brandHeaderUrl } = useTheme();

  // Profile dropdown state
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const profileDropdownRef = useRef(null);

  // Notification Alert Box dropdown state
  const [notifBoxOpen, setNotifBoxOpen] = useState(false);
  const [unreadNotifCount, setUnreadNotifCount] = useState(0);
  const notifRef = useRef(null);

  // Automated 10-Minute Task & Site Visit Reminders Hook
  const { activeAlert, dismissReminder, snoozeReminder, allReminders } = useReminderAlerts();

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (profileDropdownRef.current && !profileDropdownRef.current.contains(e.target)) {
        setProfileDropdownOpen(false);
      }
      if (notifRef.current && !notifRef.current.contains(e.target)) {
        setNotifBoxOpen(false);
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

  // Resizable draggable sidebar width state (persisted)
  const [customSidebarWidth, setCustomSidebarWidth] = useState(() => {
    try {
      const saved = localStorage.getItem('kv_sidebar_width');
      const parsed = parseInt(saved, 10);
      return !isNaN(parsed) && parsed >= 160 && parsed <= 500 ? parsed : 260;
    } catch {
      return 260;
    }
  });
  const [isResizing, setIsResizing] = useState(false);

  // Mouse drag-to-resize listener for sidebar edge
  useEffect(() => {
    if (!isResizing) return;

    const handleMouseMove = (e) => {
      const clientX = e.clientX;
      if (clientX < 110) {
        setIsCollapsed(true);
        try {
          localStorage.setItem('kv_sidebar_collapsed', 'true');
        } catch { /* ignore */ }
      } else {
        setIsCollapsed(false);
        try {
          localStorage.setItem('kv_sidebar_collapsed', 'false');
        } catch { /* ignore */ }
        const clamped = Math.max(160, Math.min(clientX, 500));
        setCustomSidebarWidth(clamped);
        try {
          localStorage.setItem('kv_sidebar_width', String(clamped));
        } catch { /* ignore */ }
      }
    };

    const handleMouseUp = () => {
      setIsResizing(false);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };
  }, [isResizing]);

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

  // Mobile Omnisearch overlay state
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);

  // Filter items based on user permissions, role, and search
  const userRole = extractRoleCode(user, authRole);
  const isAgentUser = userRole === 'agent';
  const isTaskforceManager = userRole === 'taskforce_manager' || userRole === 'taskforce_mgr';
  const isTaskforceUser = isTaskforceTeamMember(user, userRole);
  const isFinancialRestricted = isTaskforceManager || (!isSuperAdmin && !hasPermission('reports:financial') && userRole !== 'accounts_manager');

  const FINANCIAL_PATHS = [
    '/reports/finance',
    '/reports/collection',
    '/reports/sales',
    '/reports/rental',
    '/reports/crm',
    '/maintenance?tab=bills',
    '/rentals/ledgers',
    '/hr?tab=payroll',
    '/customers?tab=passbook',
    '/documents?tab=sales',
    '/documents?tab=rental'
  ];

  const isOfflineDev = typeof window !== 'undefined' && (
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  );

  // Dynamic quick action configuration matching user role and permissions
  const getQuickActionConfig = () => {
    if (isAgentUser) {
      return {
        label: 'Submit Prospective Lead',
        shortLabel: 'New Lead',
        path: '/agent-portal?tab=leads',
        icon: Plus,
      };
    }
    if (userRole === 'taskforce_manager' || isTaskforceUser) {
      return {
        label: 'New Task Directive',
        shortLabel: 'Task',
        path: '/taskforce',
        icon: Target,
      };
    }
    if (hasPermission('sales:create') || isSuperAdmin) {
      return {
        label: 'New Project / Deal',
        shortLabel: 'New Deal',
        path: '/sales',
        icon: Plus,
      };
    }
    if (hasPermission('crm:create')) {
      return {
        label: 'Capture New Lead',
        shortLabel: 'New Lead',
        path: '/crm',
        icon: Plus,
      };
    }
    if (hasPermission('materials:create')) {
      return {
        label: 'New Material PO/GRN',
        shortLabel: 'New PO',
        path: '/materials',
        icon: Package,
      };
    }
    if (hasPermission('inventory:create')) {
      return {
        label: 'Add Flat / Unit',
        shortLabel: 'New Flat',
        path: '/inventory',
        icon: Building2,
      };
    }
    if (hasPermission('hr:manage')) {
      return {
        label: 'Add Staff Member',
        shortLabel: 'Add Staff',
        path: '/hr',
        icon: Users,
      };
    }
    if (hasPermission('maintenance:create')) {
      return {
        label: 'New Service Ticket',
        shortLabel: 'Ticket',
        path: '/maintenance',
        icon: Wrench,
      };
    }
    return {
      label: 'New Directive',
      shortLabel: 'Add',
      path: '/dashboard',
      icon: Plus,
    };
  };

  const quickActionConfig = getQuickActionConfig();
  const QuickActionIcon = quickActionConfig.icon;

  // Sub-item permission & financial restriction validator
  const isSubItemPermitted = (sub) => {
    if (isFinancialRestricted && FINANCIAL_PATHS.includes(sub.path)) return false;
    if (isTaskforceManager && (
      sub.path.startsWith('/reports/sales') ||
      sub.path.startsWith('/reports/rental') ||
      sub.path.startsWith('/reports/crm') ||
      sub.path.startsWith('/reports/finance') ||
      sub.path.startsWith('/reports/collection') ||
      sub.path.startsWith('/documents?tab=sales') ||
      sub.path.startsWith('/documents?tab=rental')
    )) {
      return false;
    }
    if (!isTaskforceUser && sub.path === '/taskforce-dashboard') return false;
    if (!sub.permission) return true;
    if (Array.isArray(sub.permission)) {
      return sub.permission.some((p) => hasPermission(p));
    }
    return hasPermission(sub.permission);
  };

  const visibleNavItems = NAV_ITEMS.filter((item) => {
    // 1. Agent Portal is exclusively for logged-in Agents
    if (item.path === '/agent-portal') {
      return isAgentUser;
    }

    // 2. Agent Network Directory is exclusively for inhouse staff & management (not agents, and not taskforce manager)
    if (item.path === '/agent-network') {
      return !isAgentUser && !isTaskforceManager;
    }

    // 3. Hide sales, CRM, customers, and rentals from taskforce manager
    if (isTaskforceManager && (item.path === '/sales' || item.path === '/customers' || item.path === '/rentals' || item.path === '/crm')) {
      return false;
    }

    // 4. Hide financial routes from general financial-restricted users
    if (isFinancialRestricted && (item.path === '/sales' || item.path === '/customers' || item.path === '/rentals')) {
      return false;
    }

    // 5. Hide Executive Dashboard for taskforce manager (dedicated Taskforce Dashboard is used)
    if (isTaskforceManager && item.path === '/dashboard') {
      return false;
    }

    // 6. Taskforce Dashboard is exclusively for Taskforce team members & Admin
    if (item.path === '/taskforce-dashboard') {
      return isTaskforceUser;
    }

    if (!item.permission) return true;
    if (Array.isArray(item.permission)) {
      return item.permission.some((p) => hasPermission(p));
    }
    return hasPermission(item.permission);
  }).map((item) => {
    if (!item.subItems) return item;
    return {
      ...item,
      subItems: item.subItems.filter(isSubItemPermitted)
    };
  });

  // Helper to check if a navigation module or one of its child sub-items matches current location
  const isItemActive = (item) => {
    if (!item) return false;
    if (item.path === '/agent-portal' && !isAgentUser) return false;
    if (item.path === '/agent-network' && isAgentUser) return false;

    if (item.path === '/dashboard') {
      return (location.pathname === '/dashboard' || location.pathname === '/') && userRole !== 'taskforce_manager';
    }

    if (item.path === '/taskforce-dashboard') {
      return location.pathname === '/taskforce-dashboard' || (location.pathname === '/' && userRole === 'taskforce_manager');
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
      if (isTaskforceManager) {
        navigate(`/taskforce?search=${encodeURIComponent(globalSearch.trim())}`);
      } else {
        navigate(`/crm?search=${encodeURIComponent(globalSearch.trim())}`);
      }
    }
  };

  const filteredCategories = NAV_CATEGORIES.filter((category) => {
    if (isTaskforceManager && (category.categoryKey === 'sales' || category.categoryKey === 'partners')) {
      return false;
    }
    return true;
  }).map((category) => {
    const visibleCategoryItems = category.items.filter((item) => {
      if (item.path === '/agent-portal') return isAgentUser;
      if (item.path === '/agent-network') return !isAgentUser && !isTaskforceManager;
      if (isTaskforceManager && (item.path === '/sales' || item.path === '/customers' || item.path === '/rentals' || item.path === '/crm')) {
        return false;
      }
      if (isFinancialRestricted && (item.path === '/sales' || item.path === '/customers' || item.path === '/rentals')) {
        return false;
      }
      if (isTaskforceManager && item.path === '/dashboard') {
        return false;
      }
      if (item.path === '/taskforce-dashboard') {
        return isTaskforceUser;
      }
      if (!item.permission) return true;
      if (Array.isArray(item.permission)) {
        return item.permission.some((p) => hasPermission(p));
      }
      return hasPermission(item.permission);
    }).map((item) => {
      if (!item.subItems) return item;
      return {
        ...item,
        subItems: item.subItems.filter(isSubItemPermitted)
      };
    });

    if (!navSearch.trim()) {
      return {
        ...category,
        items: visibleCategoryItems
      };
    }

    const query = navSearch.toLowerCase();
    const categoryMatches = category.categoryLabel.toLowerCase().includes(query);

    const matchingItems = visibleCategoryItems.map((item) => {
      const parentMatches = item.label.toLowerCase().includes(query);
      const matchingSubs = (item.subItems || []).filter((sub) =>
        sub.label.toLowerCase().includes(query)
      );

      if (categoryMatches || parentMatches || matchingSubs.length > 0) {
        return {
          ...item,
          subItems: matchingSubs.length > 0 ? matchingSubs : item.subItems,
          forceOpen: true
        };
      }
      return null;
    }).filter(Boolean);

    return {
      ...category,
      items: matchingItems
    };
  }).filter((category) => category.items.length > 0);

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

  // Sidebar width configuration (Dynamic & Resizable)
  const sidebarWidth = isMobile ? 288 : isCollapsed ? 72 : customSidebarWidth;

  return (
    <div
      className="app-shell bg-background text-on-surface font-body-md"
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
          className="no-print"
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
        className="sidebar app-sidebar"
        style={{
          width: `${sidebarWidth}px`,
          height: '100vh',
          position: 'fixed',
          left: 0,
          top: 0,
          zIndex: 50,
          backgroundColor: isDark ? '#0b1120' : '#faf8f5',
          borderRight: isDark ? '1px solid #1e293b' : '1px solid #ede8df',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: isMobile && mobileMenuOpen ? '0 12px 40px rgba(0,0,0,0.25)' : 'none',
          transform: isMobile
            ? mobileMenuOpen
              ? 'translateX(0)'
              : 'translateX(-100%)'
            : 'translateX(0)',
          transition: isResizing
            ? 'none'
            : 'width 0.22s cubic-bezier(0.4, 0, 0.2, 1), transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)'
        }}
        aria-label="Main Navigation"
      >
        {/* Brand Header */}
        <div
          style={{
            padding: isCollapsed && !isMobile ? '16px 8px' : '20px 18px 8px',
            backgroundColor: 'transparent',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: isCollapsed && !isMobile ? 'center' : 'space-between', width: '100%' }}>
            {(!isCollapsed || isMobile) ? (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  width: '100%',
                  padding: '4px 0'
                }}
                onClick={() => navigate(isTaskforceManager ? '/taskforce-dashboard' : '/dashboard')}
                title="Krishna Valley Enterprise Platform"
              >
                <img
                  src={brandHeaderUrl}
                  alt="Krishna Valley Enterprise Platform"
                  style={{
                    width: '100%',
                    maxWidth: '215px',
                    height: 'auto',
                    maxHeight: '76px',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>
            ) : (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  cursor: 'pointer',
                  width: '100%',
                  padding: '4px 0'
                }}
                onClick={() => navigate(isTaskforceManager ? '/taskforce-dashboard' : '/dashboard')}
                title="Krishna Valley ERP"
              >
                <img
                  src={logoPngUrl}
                  alt="Krishna Valley Logo"
                  style={{
                    width: '42px',
                    height: '42px',
                    objectFit: 'contain',
                    display: 'block'
                  }}
                />
              </div>
            )}

            {/* Mobile close button */}
            {isMobile && (
              <button
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  padding: '6px',
                  color: 'var(--on-surface-variant)',
                  background: isDark ? '#1e293b' : '#f3f4f5',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isDark ? '1px solid #334155' : '1px solid #dadce0',
                  cursor: 'pointer',
                  flexShrink: 0
                }}
                aria-label="Close sidebar menu"
              >
                <X size={18} />
              </button>
            )}
          </div>

          {/* Vrindavan Cluster Enterprise Account Card */}
          {(!isCollapsed || isMobile) && (
            <div
              onClick={() => navigate(isTaskforceManager ? '/taskforce-dashboard' : '/dashboard')}
              style={{
                margin: '2px 0 6px',
                padding: '9px 12px',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                border: isDark ? '1px solid #334155' : '1px solid #e8e6df',
                borderRadius: '12px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
                transition: 'all 0.15s ease'
              }}
              title="Current Cluster: Vrindavan Cluster"
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: '#17652f',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '0.78rem',
                  fontWeight: '700',
                  letterSpacing: '0.02em',
                  flexShrink: 0
                }}
              >
                KV
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: isDark ? '#f8fafc' : '#1f2937', lineHeight: 1.2, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  Vrindavan Cluster
                </div>
                <div style={{ fontSize: '0.68rem', color: isDark ? '#94a3b8' : '#6b7280', marginTop: '2px' }}>
                  Enterprise Account
                </div>
              </div>
              <ChevronDown size={14} color={isDark ? '#94a3b8' : '#9ca3af'} />
            </div>
          )}

          {/* Mobile User Identity Pill */}
          {isMobile && user && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                padding: '8px 10px',
                backgroundColor: isDark ? '#1e293b' : '#ffffff',
                borderRadius: '8px',
                border: isDark ? '1px solid #334155' : '1px solid #dadce0',
                boxShadow: '0 1px 2px rgba(0,0,0,0.04)'
              }}
            >
              <div
                style={{
                  width: '32px',
                  height: '32px',
                  borderRadius: '50%',
                  backgroundColor: isDark ? '#17652f' : '#e8f2e5',
                  color: isDark ? '#4a9e68' : '#17652f',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  flexShrink: 0
                }}
              >
                {user?.firstName?.[0] || 'U'}
              </div>
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ fontSize: '0.82rem', fontWeight: '700', color: 'var(--on-surface)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {user?.firstName} {user?.lastName}
                </div>
                <div style={{ fontSize: '0.7rem', color: 'var(--on-surface-variant)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <ShieldCheck size={11} color="#17652f" />
                  <span>{user?.role?.roleName || userRole || 'User'}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Scrollable Navigation Tree */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: isCollapsed && !isMobile ? '10px 6px' : '8px 0',
            WebkitOverflowScrolling: 'touch'
          }}
        >
          {filteredCategories.map((category, catIdx) => (
            <div key={category.categoryKey} style={{ marginBottom: isCollapsed && !isMobile ? '4px' : '10px' }}>
              {/* Category Header (when expanded) */}
              {(!isCollapsed || isMobile) && catIdx > 0 && (
                <div
                  style={{
                    padding: '14px 18px 6px',
                    fontSize: '0.67rem',
                    fontWeight: '800',
                    color: '#94a3b8',
                    letterSpacing: '0.08em',
                    textTransform: 'uppercase',
                    userSelect: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>{category.categoryLabel}</span>
                  <span
                    style={{
                      fontSize: '0.62rem',
                      fontWeight: '700',
                      color: '#94a3b8',
                      backgroundColor: isDark ? '#1e293b' : '#e2e8f0',
                      padding: '1px 5px',
                      borderRadius: '10px',
                    }}
                  >
                    {category.items.length}
                  </span>
                </div>
              )}

              {/* Collapsed Category Divider */}
              {isCollapsed && !isMobile && catIdx > 0 && (
                <div
                  style={{
                    margin: '8px 10px',
                    borderTop: isDark ? '1px solid #1e293b' : '1px solid #e2e8f0',
                  }}
                />
              )}

              {category.items.map((item) => {
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
                        padding: isCollapsed && !isMobile ? '10px 0' : '10px 14px',
                        margin: isCollapsed && !isMobile ? '2px 8px' : '2px 10px',
                        borderRadius: '10px',
                        backgroundColor: isSelected
                          ? '#17652f'
                          : 'transparent',
                        color: isSelected
                          ? '#ffffff'
                          : (isDark ? '#cbd5e1' : '#2d3748'),
                        fontWeight: isSelected ? '600' : '500',
                        fontSize: '0.88rem',
                        cursor: 'pointer',
                        userSelect: 'none',
                        transition: 'all 0.15s ease',
                        minHeight: '42px',
                        boxShadow: isSelected ? '0 1px 3px rgba(0,0,0,0.08)' : 'none'
                      }}
                      onMouseEnter={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(23, 101, 47, 0.06)';
                          e.currentTarget.style.color = isDark ? '#ffffff' : '#17652f';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isSelected) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = isDark ? '#cbd5e1' : '#2d3748';
                        }
                      }}
                    >
                      {/* Left: Icon & Label */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0, flex: 1 }}>
                        <IconComp
                          size={19}
                          color={
                            isSelected
                              ? '#ffffff'
                              : (isDark ? '#94a3b8' : '#4a5568')
                          }
                          strokeWidth={isSelected ? 2.4 : 2}
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
                                  ? 'rgba(255, 255, 255, 0.25)'
                                  : (item.highlight ? '#17652f' : '#17652f'),
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
                                  ? '#ffffff'
                                  : (isDark ? '#94a3b8' : '#718096'),
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
                          borderLeft: isDark ? '2px solid #1e293b' : '2px solid #e2e8df',
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
                                color: isSubActive ? (isDark ? '#86efac' : '#17652f') : (isDark ? '#94a3b8' : 'var(--on-surface-variant)'),
                                backgroundColor: isSubActive ? (isDark ? 'rgba(23, 101, 47, 0.25)' : '#e8f2e5') : 'transparent',
                                transition: 'all 0.12s ease'
                              }}
                              onMouseEnter={(e) => {
                                if (!isSubActive) {
                                  e.currentTarget.style.backgroundColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(23, 101, 47, 0.04)';
                                  e.currentTarget.style.color = isDark ? '#ffffff' : '#17652f';
                                }
                              }}
                              onMouseLeave={(e) => {
                                if (!isSubActive) {
                                  e.currentTarget.style.backgroundColor = 'transparent';
                                  e.currentTarget.style.color = isDark ? '#94a3b8' : 'var(--on-surface-variant)';
                                }
                              }}
                            >
                              <span
                                style={{
                                  width: '5px',
                                  height: '5px',
                                  borderRadius: '50%',
                                  backgroundColor: isSubActive ? '#17652f' : '#94a3b8',
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
                            color: '#17652f',
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
          ))}
        </div>

        {/* Bottom spacing for clean, minimal navigation flow */}
        <div style={{ height: '16px', flexShrink: 0 }} />

        {/* Resizable Draggable Right-Edge Handle */}
        {!isMobile && (
          <div
            onMouseDown={(e) => {
              e.preventDefault();
              setIsResizing(true);
            }}
            onDoubleClick={() => {
              setIsCollapsed((prev) => {
                const next = !prev;
                try {
                  localStorage.setItem('kv_sidebar_collapsed', String(next));
                } catch { /* ignore */ }
                return next;
              });
            }}
            title="Click and drag left or right to resize or collapse sidebar. Double-click to toggle collapse."
            style={{
              position: 'absolute',
              top: 0,
              right: '-4px',
              width: '8px',
              height: '100%',
              cursor: 'col-resize',
              zIndex: 60,
              backgroundColor: isResizing ? '#17652f' : 'transparent',
              transition: isResizing ? 'none' : 'background-color 0.15s ease',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              userSelect: 'none'
            }}
            onMouseEnter={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = isDark ? 'rgba(96, 165, 250, 0.45)' : 'rgba(26, 115, 232, 0.35)';
              }
            }}
            onMouseLeave={(e) => {
              if (!isResizing) {
                e.currentTarget.style.backgroundColor = 'transparent';
              }
            }}
          >
            {/* Visual Grip Indicator */}
            <div
              style={{
                width: '2px',
                height: '42px',
                borderRadius: '2px',
                backgroundColor: isResizing ? '#ffffff' : (isDark ? 'rgba(255,255,255,0.3)' : 'rgba(0,0,0,0.2)'),
                pointerEvents: 'none',
              }}
            />
          </div>
        )}
      </nav>

      {/* ======================================================== */}
      {/* 2. MAIN CONTENT WRAPPER                                   */}
      {/* ======================================================== */}
      <div
        className="main-wrapper"
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          height: '100vh',
          maxHeight: '100vh',
          minWidth: 0,
          marginLeft: isMobile ? '0' : `${sidebarWidth}px`,
          transition: isResizing ? 'none' : 'margin-left 0.22s cubic-bezier(0.4, 0, 0.2, 1)',
          position: 'relative',
          overflow: 'hidden'
        }}
      >
        {/* Sticky Top Header Navbar */}
        <header
          className="app-header"
          style={{
            height: '64px',
            minHeight: '64px',
            maxHeight: '64px',
            backgroundColor: isDark ? '#0b1120' : '#ffffff',
            borderBottom: isDark ? '1px solid #1e293b' : '1px solid #e8e6df',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: isMobile ? '0 16px' : '0 28px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
            gap: '16px',
            flexShrink: 0,
            boxShadow: '0 1px 2px rgba(0,0,0,0.02)'
          }}
        >
          {/* Header Left: On mobile show hamburger + small logo. On desktop show nothing on left so search bar aligns cleanly */}
          {isMobile ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexShrink: 0 }}>
              <button
                onClick={() => setMobileMenuOpen(true)}
                style={{
                  padding: '8px',
                  background: isDark ? '#1e293b' : '#f3f4f5',
                  color: 'var(--on-surface)',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: isDark ? '1px solid #334155' : '1px solid #dadce0',
                  cursor: 'pointer'
                }}
                aria-label="Open Navigation Sidebar"
              >
                <Menu size={19} />
              </button>
              <img
                src={logoPngUrl}
                alt="Krishna Valley"
                style={{
                  width: '32px',
                  height: '32px',
                  objectFit: 'contain'
                }}
              />
            </div>
          ) : null}

          {/* Omnisearch Bar - Reference Image Minimal Pill */}
          <form
            onSubmit={handleGlobalSearch}
            style={{
              flex: 1,
              maxWidth: '520px',
              display: isMobile && window.innerWidth < 640 ? 'none' : 'block'
            }}
          >
            <div style={{ position: 'relative', width: '100%' }}>
              <Search
                size={16}
                color={isDark ? '#94a3b8' : '#718096'}
                style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search projects, leads, sites, materials, or documents..."
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: isDark ? '#1e293b' : '#faf9f6',
                  border: isDark ? '1px solid #334155' : '1px solid #e8e6df',
                  borderRadius: '10px',
                  paddingLeft: '40px',
                  paddingRight: '74px',
                  paddingTop: '9px',
                  paddingBottom: '9px',
                  fontSize: '0.85rem',
                  color: isDark ? '#f8fafc' : '#1f2937',
                  outline: 'none',
                  fontWeight: '400',
                  transition: 'all 0.15s ease'
                }}
              />
              <span
                style={{
                  position: 'absolute',
                  right: '10px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  fontSize: '0.67rem',
                  fontWeight: '600',
                  color: isDark ? '#94a3b8' : '#718096',
                  backgroundColor: isDark ? '#0f172a' : '#ffffff',
                  border: isDark ? '1px solid #334155' : '1px solid #e8e6df',
                  padding: '2px 7px',
                  borderRadius: '6px',
                  pointerEvents: 'none'
                }}
              >
                Ctrl + K
              </span>
            </div>
          </form>

          {/* Right Action Icons & Avatar Profile */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            {/* Notification Alert Box Dropdown */}
            <div ref={notifRef} style={{ position: 'relative' }}>
              <button
                type="button"
                onClick={() => setNotifBoxOpen(!notifBoxOpen)}
                title="Notifications, Reminders & Alerts"
                style={{
                  width: '38px',
                  height: '38px',
                  borderRadius: '50%',
                  backgroundColor: notifBoxOpen ? (isDark ? '#1e293b' : '#e8f2e5') : 'transparent',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: notifBoxOpen ? '#17652f' : 'var(--on-surface-variant)',
                  position: 'relative',
                  cursor: 'pointer',
                  border: 'none',
                  transition: 'all 0.15s ease'
                }}
                onMouseEnter={(e) => { if (!notifBoxOpen) e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f3f4f2'; }}
                onMouseLeave={(e) => { if (!notifBoxOpen) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <Bell size={19} />
                {/* Emerald Green unread indicator dot matching reference image */}
                <span
                  style={{
                    position: 'absolute',
                    top: '8px',
                    right: '8px',
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: '#10b981',
                    border: '1.5px solid #ffffff'
                  }}
                />
              </button>

              <NotificationAlertBox
                isOpen={notifBoxOpen}
                onClose={() => setNotifBoxOpen(false)}
                onCountChange={(cnt) => setUnreadNotifCount(cnt)}
                activeReminders={allReminders}
              />
            </div>

            {/* Help / Guide button */}
            <button
              type="button"
              onClick={() => navigate('/notifications')}
              title="Help & System Documentation"
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
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : '#f3f4f2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = 'transparent'; }}
            >
              <HelpCircle size={19} />
            </button>

            {/* Theme Mode Toggle (Light / Dark) */}
            <button
              type="button"
              onClick={toggleTheme}
              title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '50%',
                backgroundColor: isDark ? '#1e293b' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: isDark ? '#facc15' : 'var(--on-surface-variant)',
                cursor: 'pointer',
                border: isDark ? '1px solid #334155' : 'none',
                transition: 'all 0.2s ease',
                boxShadow: isDark ? '0 2px 6px rgba(0,0,0,0.3)' : 'none'
              }}
              onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#334155' : '#f3f4f2'; }}
              onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = isDark ? '#1e293b' : 'transparent'; }}
            >
              {isDark ? <Sun size={19} /> : <Moon size={19} />}
            </button>

            {/* User Identity & Profile Menu Dropdown */}
            <div ref={profileDropdownRef} style={{ position: 'relative', marginLeft: '4px' }}>
              <div
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 6px',
                  borderRadius: '24px',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
                title={user ? `${user.firstName} ${user.lastName} (${user.role?.roleName || 'User'})` : 'Account'}
              >
                <div
                  style={{
                    width: '34px',
                    height: '34px',
                    borderRadius: '50%',
                    backgroundColor: '#17652f',
                    color: '#ffffff',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: '700',
                    fontSize: '0.82rem',
                    letterSpacing: '0.02em',
                    boxShadow: '0 1px 3px rgba(23, 101, 47, 0.25)'
                  }}
                >
                  {user?.firstName?.[0] || 'S'}{user?.lastName?.[0] || 'A'}
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
                        backgroundColor: '#e8f2e5',
                        color: '#17652f',
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
                        Quick Role Switch (Demo)
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

                  {/* Theme Mode Toggle Row */}
                  <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '8px' }}>
                    <button
                      type="button"
                      onClick={() => {
                        toggleTheme();
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 10px',
                        borderRadius: '8px',
                        border: '1px solid var(--border-subtle)',
                        backgroundColor: isDark ? '#1e293b' : '#f8fafc',
                        color: 'var(--on-surface)',
                        fontSize: '0.82rem',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {isDark ? <Sun size={15} color="#facc15" /> : <Moon size={15} color="#64748b" />}
                        <span>Appearance Theme</span>
                      </span>
                      <span style={{
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        padding: '2px 8px',
                        borderRadius: '10px',
                        backgroundColor: isDark ? '#334155' : '#e2e8f0',
                        color: isDark ? '#f8fafc' : '#334155'
                      }}>
                        {isDark ? '🌙 Dark' : '☀️ Light'}
                      </span>
                    </button>
                  </div>

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
                        backgroundColor: '#f1f5f9',
                        color: '#0f172a',
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

        {/* Mobile Search Overlay Input */}
        {isMobile && mobileSearchOpen && (
          <div
            style={{
              padding: '10px 16px',
              backgroundColor: '#ffffff',
              borderBottom: '1px solid #dadce0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.06)',
              zIndex: 25
            }}
          >
            <form onSubmit={handleGlobalSearch} style={{ flex: 1, position: 'relative' }}>
              <Search
                size={16}
                color="var(--outline)"
                style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }}
              />
              <input
                type="text"
                placeholder="Search projects, leads, documents..."
                autoFocus
                value={globalSearch}
                onChange={(e) => setGlobalSearch(e.target.value)}
                style={{
                  width: '100%',
                  backgroundColor: '#f3f4f5',
                  border: '1px solid #dadce0',
                  borderRadius: '8px',
                  paddingLeft: '38px',
                  paddingRight: '32px',
                  paddingTop: '8px',
                  paddingBottom: '8px',
                  fontSize: '16px',
                  color: 'var(--on-surface)'
                }}
              />
              {globalSearch && (
                <button
                  type="button"
                  onClick={() => setGlobalSearch('')}
                  style={{
                    position: 'absolute',
                    right: '8px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: 'var(--outline)',
                    cursor: 'pointer'
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </form>
            <button
              type="button"
              onClick={() => setMobileSearchOpen(false)}
              style={{
                padding: '8px 12px',
                background: '#f1f5f9',
                border: 'none',
                borderRadius: '8px',
                fontSize: '0.82rem',
                fontWeight: '600',
                color: '#475569',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        )}

        {/* Scrollable Middle Canvas for Route Content */}
        <main
          className="app-main"
          style={{
            flex: 1,
            overflowY: 'auto',
            overflowX: 'hidden',
            padding: isMobile ? '16px 12px 82px' : '32px 40px 64px',
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

        {/* Sticky Bottom Footer (Desktop & Tablet only) */}
        {!isMobile && (
          <footer
            className="app-footer"
            style={{
              backgroundColor: '#f8f9fa',
              borderTop: '1px solid #dadce0',
              padding: '14px 28px',
              display: 'flex',
              flexDirection: 'row',
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
        )}

        {/* ======================================================== */}
        {/* Mobile Bottom Navigation Bar (Tailored to Role & Permissions) */}
        {/* ======================================================== */}
        {isMobile && (
          <nav className="mobile-bottom-nav" aria-label="Quick Mobile Navigation">
            {/* Tab 1: Dashboard */}
            <button
              type="button"
              className={`mobile-nav-btn ${location.pathname === '/' || location.pathname === '/dashboard' || location.pathname === '/taskforce-dashboard' ? 'active' : ''}`}
              onClick={() => navigate(userRole === 'taskforce_manager' ? '/taskforce-dashboard' : '/dashboard')}
            >
              <LayoutDashboard size={20} />
              <span>Dashboard</span>
            </button>

            {/* Tab 2: Primary Operational Hub */}
            {isAgentUser ? (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname === '/agent-portal' ? 'active' : ''}`}
                onClick={() => navigate('/agent-portal?tab=leads')}
              >
                <Users size={20} />
                <span>My Leads</span>
              </button>
            ) : isTaskforceUser ? (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname === '/taskforce' ? 'active' : ''}`}
                onClick={() => navigate('/taskforce')}
              >
                <Layers size={20} />
                <span>Tasks</span>
              </button>
            ) : hasPermission('crm:view') ? (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname === '/crm' ? 'active' : ''}`}
                onClick={() => navigate('/crm')}
              >
                <Users size={20} />
                <span>CRM Leads</span>
              </button>
            ) : hasPermission('materials:view') ? (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname === '/materials' ? 'active' : ''}`}
                onClick={() => navigate('/materials')}
              >
                <Package size={20} />
                <span>Stores</span>
              </button>
            ) : (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname === '/inventory' ? 'active' : ''}`}
                onClick={() => navigate('/inventory')}
              >
                <Building2 size={20} />
                <span>Inventory</span>
              </button>
            )}

            {/* Center Action FAB */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              <button
                type="button"
                className="mobile-action-fab"
                onClick={() => navigate(quickActionConfig.path)}
                title={quickActionConfig.label}
                aria-label={quickActionConfig.label}
              >
                <QuickActionIcon size={22} strokeWidth={2.5} />
              </button>
              <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#17652f', marginTop: '2px' }}>
                {quickActionConfig.shortLabel || 'Add'}
              </span>
            </div>

            {/* Tab 3: Secondary Module */}
            {isAgentUser ? (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname === '/site-visits' ? 'active' : ''}`}
                onClick={() => navigate('/site-visits')}
              >
                <ShieldCheck size={20} />
                <span>Visits</span>
              </button>
            ) : isTaskforceUser ? (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname.startsWith('/taskforce-manager') ? 'active' : ''}`}
                onClick={() => navigate('/taskforce-manager')}
              >
                <Shield size={20} />
                <span>Manager</span>
              </button>
            ) : hasPermission('sales:view') ? (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname === '/sales' ? 'active' : ''}`}
                onClick={() => navigate('/sales')}
              >
                <ShoppingBag size={20} />
                <span>Sales</span>
              </button>
            ) : hasPermission('inventory:view') ? (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname === '/inventory' ? 'active' : ''}`}
                onClick={() => navigate('/inventory')}
              >
                <Building2 size={20} />
                <span>Inventory</span>
              </button>
            ) : hasPermission('reports:view') ? (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname.startsWith('/reports') ? 'active' : ''}`}
                onClick={() => navigate('/reports')}
              >
                <BarChart3 size={20} />
                <span>Reports</span>
              </button>
            ) : (
              <button
                type="button"
                className={`mobile-nav-btn ${location.pathname === '/documents' ? 'active' : ''}`}
                onClick={() => navigate('/documents')}
              >
                <Folder size={20} />
                <span>Vault</span>
              </button>
            )}

            {/* Tab 4: Menu Drawer Trigger */}
            <button
              type="button"
              className="mobile-nav-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <Menu size={20} />
              <span>Menu</span>
            </button>
          </nav>
        )}

        {/* Floating 10-Minute Reminder Alert Banner with Chime & Actions */}
        <InAppReminderBanner
          activeAlert={activeAlert}
          onDismiss={dismissReminder}
          onSnooze={snoozeReminder}
        />

        {/* Global Live Task Chat & Message Pop-up Notifier */}
        <TaskChatNotifier />
      </div>
    </div>
  );
};

export default AppLayout;
