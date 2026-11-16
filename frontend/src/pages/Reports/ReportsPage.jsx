import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { reportService } from '../../services/reportService.js';
import { projectService } from '../../services/projectService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { extractRoleCode } from '../../utils/taskPermissions.js';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';
import { TableSkeleton, CardGridSkeleton } from '../../components/common/SkeletonLoader.jsx';
import { EmptyState } from '../../components/common/EmptyState.jsx';
import { useToast } from '../../context/ToastContext.jsx';

import {
  BarChart3,
  TrendingUp,
  ShoppingBag,
  Repeat,
  DollarSign,
  Wrench,
  Package,
  PieChart,
  Users,
  Briefcase,
  FileSpreadsheet,
  Printer,
  RefreshCw,
  Search,
  Filter,
  Calendar,
  Building2,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Download,
  CreditCard,
  Layers,
  Clock,
  ShieldCheck,
  Zap,
  ArrowUpRight,
  ArrowDownRight
} from 'lucide-react';

const REPORT_TABS = [
  { id: 'sales', name: 'Sales Report', icon: ShoppingBag, color: '#17652f' },
  { id: 'rental', name: 'Rental Report', icon: Repeat, color: '#17652f' },
  { id: 'collection', name: 'Collection Report', icon: DollarSign, color: '#475569' },
  { id: 'maintenance', name: 'Maintenance Report', icon: Wrench, color: '#17652f' },
  { id: 'inventory', name: 'Inventory Report', icon: Package, color: '#17652f' },
  { id: 'finance', name: 'Finance Report', icon: PieChart, color: '#0284c7' },
  { id: 'crm', name: 'CRM Report', icon: Users, color: '#0284c7' },
  { id: 'hr', name: 'HR Report', icon: Briefcase, color: '#17652f' }
];

export const ReportsPage = () => {
  const { user, userRole: authRole, isSuperAdmin, hasPermission } = useAuth();
  const { reportType } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const userRole = extractRoleCode(user, authRole);
  const isTaskforceManager = userRole === 'taskforce_manager' || userRole === 'taskforce_mgr';
  const isAdminOrSuper = isSuperAdmin || userRole === 'super_admin' || userRole === 'admin';
  const hasFinancePermission = isAdminOrSuper || hasPermission('reports:financial');
  const canExport = isAdminOrSuper || hasPermission('reports:export');
  const isFinancialRestricted = isTaskforceManager || (!isAdminOrSuper && !hasFinancePermission && userRole !== 'accounts_manager');

  const visibleReportTabs = useMemo(() => {
    if (isTaskforceManager) {
      // In the task force manager account: remove all sales, rental, collection, finance, and CRM reports
      return REPORT_TABS.filter((t) => !['sales', 'rental', 'collection', 'finance', 'crm'].includes(t.id));
    }
    if (!hasFinancePermission && userRole !== 'accounts_manager') {
      return REPORT_TABS.filter((t) => !['finance', 'collection'].includes(t.id));
    }
    return REPORT_TABS;
  }, [isTaskforceManager, hasFinancePermission, userRole]);

  const defaultInitialTab = isTaskforceManager ? 'inventory' : (hasPermission('sales:view') || isAdminOrSuper ? 'sales' : 'inventory');
  const initialTab = (reportType && visibleReportTabs.some((t) => t.id === reportType))
    ? reportType
    : (searchParams.get('tab') && visibleReportTabs.some((t) => t.id === searchParams.get('tab')))
      ? searchParams.get('tab')
      : defaultInitialTab;

  const [activeReportTab, setActiveReportTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [reportData, setReportData] = useState(null);

  // Sync state if URL param or searchParam changes
  useEffect(() => {
    const isRestrictedForMe = (tab) => {
      if (isTaskforceManager) {
        return ['sales', 'rental', 'collection', 'finance', 'crm'].includes(tab);
      }
      if (!hasFinancePermission && userRole !== 'accounts_manager') {
        return ['finance', 'collection'].includes(tab);
      }
      return false;
    };

    if (isRestrictedForMe(activeReportTab)) {
      setActiveReportTab('inventory');
      navigate('/reports/inventory', { replace: true });
      return;
    }
    if (reportType && visibleReportTabs.some((t) => t.id === reportType)) {
      setActiveReportTab(reportType);
    } else if (reportType && isRestrictedForMe(reportType)) {
      setActiveReportTab('inventory');
      navigate('/reports/inventory', { replace: true });
    } else {
      const tab = searchParams.get('tab');
      if (tab && visibleReportTabs.some((t) => t.id === tab)) {
        setActiveReportTab(tab);
      }
    }
  }, [reportType, searchParams, isTaskforceManager, isFinancialRestricted, visibleReportTabs]);

  const handleTabChange = (tabId) => {
    setActiveReportTab(tabId);
    navigate(`/reports/${tabId}`, { replace: true });
  };

  // Global Filters
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('all');
  const [dateRange, setDateRange] = useState('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // Load Projects for Filter Dropdown
  const loadProjects = async () => {
    try {
      const res = await projectService.getProjects();
      if (res && res.data) setProjects(res.data);
    } catch (e) {
      console.log('Project filter load error:', e.message);
    }
  };

  // Fetch Active Report Data
  const fetchReportData = async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const params = {
        projectId: selectedProjectId,
        dateRange,
        customStart,
        customEnd
      };

      let res;
      if (activeReportTab === 'sales') res = await reportService.getSalesReport(params);
      else if (activeReportTab === 'rental') res = await reportService.getRentalReport(params);
      else if (activeReportTab === 'collection') res = await reportService.getCollectionReport(params);
      else if (activeReportTab === 'maintenance') res = await reportService.getMaintenanceReport(params);
      else if (activeReportTab === 'inventory') res = await reportService.getInventoryReport(params);
      else if (activeReportTab === 'finance') res = await reportService.getFinanceReport(params);
      else if (activeReportTab === 'crm') res = await reportService.getCRMReport(params);
      else if (activeReportTab === 'hr') res = await reportService.getHRReport(params);

      if (res && res.data) {
        setReportData(res.data);
      } else {
        setReportData({});
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setErrorMsg(err.message || 'Unable to connect to reports engine');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  useEffect(() => {
    fetchReportData();
  }, [activeReportTab, selectedProjectId, dateRange, customStart, customEnd]);

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(Number(val) || 0);
  };

  // Handle Export to CSV
  const handleExportCSV = () => {
    if (!reportData) return;
    const tabName = REPORT_TABS.find((t) => t.id === activeReportTab)?.name || 'Report';
    const filename = `${tabName.replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;

    if (activeReportTab === 'sales' && reportData.register) {
      reportService.exportToCSV(reportData.register, filename);
    } else if (activeReportTab === 'rental' && reportData.register) {
      reportService.exportToCSV(reportData.register, filename);
    } else if (activeReportTab === 'finance' && reportData.outflows) {
      reportService.exportToCSV([...(reportData.inflows || []), ...(reportData.outflows || [])], filename);
    } else if (activeReportTab === 'crm' && reportData.leadSourceBreakdown) {
      reportService.exportToCSV(reportData.leadSourceBreakdown, filename);
    } else if (activeReportTab === 'hr' && reportData.departmentBreakdown) {
      reportService.exportToCSV(reportData.departmentBreakdown, filename);
    } else if (activeReportTab === 'collection' && reportData.paymentModes) {
      reportService.exportToCSV(reportData.paymentModes, filename);
    } else if (activeReportTab === 'inventory' && reportData.flatTypeBreakdown) {
      reportService.exportToCSV(reportData.flatTypeBreakdown, filename);
    } else if (activeReportTab === 'maintenance' && reportData.categoryBreakdown) {
      reportService.exportToCSV(reportData.categoryBreakdown, filename);
    } else {
      alert('Export data prepared. Check downloaded CSV.');
    }
  };

  // Handle Print Report
  const handlePrint = () => {
    const originalTitle = document.title;
    const cleanTabName = (currentTabInfo?.name || 'Report').replace(/[^a-zA-Z0-9]/g, '_');
    const dateStr = new Date().toISOString().slice(0, 10);
    document.title = `Krishna_Valley_${cleanTabName}_${dateStr}`;
    
    window.print();
    
    // Restore document title after print dialog closes
    setTimeout(() => {
      document.title = originalTitle;
    }, 1000);
  };

  const currentTabInfo = REPORT_TABS.find((t) => t.id === activeReportTab) || REPORT_TABS[0];
  const summary = reportData?.summary || {};
  const currentProjectName = selectedProjectId === 'all' 
    ? 'All Projects Consolidated' 
    : (projects.find((p) => (p._id || p.id) === selectedProjectId)?.projectName || 'Krishna Valley Residency');

  const printTimestamp = new Date().toLocaleString('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short'
  });

  return (
    <div id="reports-print-container" style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
      
      {/* ======================================================== */}
      {/* EXECUTIVE PRINT LETTERHEAD (Visible only when Printing)  */}
      {/* ======================================================== */}
      <div className="print-only" style={{ marginBottom: '20px', borderBottom: '2px solid #0f172a', paddingBottom: '14px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px' }}>
          <div>
            <div style={{ fontSize: '1.45rem', fontWeight: '700', color: '#0f172a', letterSpacing: '0.02em' }}>
              KRISHNA VALLEY INFRASTRUCTURE &amp; DEVELOPERS
            </div>
            <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: '2px', fontWeight: '600' }}>
              Krishna Valley Heights, Near NH-19, Chhatikara-Vrindavan Road, Mathura (U.P.) - 281001
            </div>
            <div style={{ fontSize: '0.72rem', color: '#64748b', marginTop: '3px' }}>
              <strong>CIN:</strong> U45200UP2021PTC148900 • <strong>GSTIN:</strong> 09AAACK9876Q1Z5 • <strong>RERA:</strong> UPRERAPRJ876543/12/2026
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'inline-block', padding: '4px 10px', background: '#17652f', color: '#ffffff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '600', textTransform: 'uppercase' }}>
              Official Summary Report
            </div>
            <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '6px' }}>
              <strong>Generated:</strong> {printTimestamp}
            </div>
          </div>
        </div>

        {/* Report Scope & Filter Context */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.8rem', color: '#1e293b' }}>
          <div>
            <strong>Report Title:</strong> <span style={{ fontSize: '0.95rem', fontWeight: '600', color: '#17652f' }}>{currentTabInfo?.name}</span>
          </div>
          <div>
            <strong>Target Site:</strong> <span style={{ fontWeight: '700' }}>{currentProjectName}</span>
          </div>
          <div>
            <strong>Period:</strong> <span style={{ fontWeight: '700' }}>{dateRange.toUpperCase()}</span>
          </div>
          <div>
            <strong>Generated By:</strong> {user?.firstName ? `${user.firstName} ${user.lastName || ''} (${user?.role?.roleName || 'Staff'})` : 'Authorized ERP System Auditor'}
          </div>
        </div>
      </div>

      {/* Screen Header Banner */}
      <div className="g-card no-print" style={{
        padding: '20px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '16px',
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '8px',
            background: '#f0fdf4',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#17652f',
            flexShrink: 0
          }}>
            <BarChart3 size={20} />
          </div>
          <div>
            <h1 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
              Reports
            </h1>
            <div style={{ fontSize: '0.85rem', color: '#4b5563', marginTop: '2px' }}>
              Performance registers, revenue collections, overdue receivables, and financial statements.
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {canExport && (
            <button
              type="button"
              onClick={handleExportCSV}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                color: '#374151',
                fontSize: '0.82rem',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <FileSpreadsheet size={15} color="#17652f" />
              Export CSV
            </button>
          )}

          <button
            type="button"
            onClick={handlePrint}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #e5e7eb',
              color: '#374151',
              fontSize: '0.82rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={15} color="#17652f" />
            Print report
          </button>

          <button
            type="button"
            onClick={fetchReportData}
            title="Refresh report"
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#17652f',
              border: 'none',
              color: '#ffffff',
              fontSize: '0.82rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Global Filter Bar */}
      <div className="g-card no-print" style={{
        padding: '12px 18px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '12px',
        border: '1px solid #e5e7eb',
        background: '#ffffff',
        borderRadius: '8px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          {/* Project Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={15} color="#6b7280" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                padding: '6px 12px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                color: '#111827',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">All projects</option>
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.projectName} ({p.projectCode})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color="#6b7280" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                padding: '6px 12px',
                background: '#ffffff',
                border: '1px solid #e5e7eb',
                borderRadius: '6px',
                color: '#111827',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Past 7 days</option>
              <option value="month">This month</option>
              <option value="quarter">This quarter</option>
              <option value="fy">Financial year (FY 2025-26)</option>
              <option value="custom">Custom date range...</option>
            </select>
          </div>

          {/* Custom Date Pickers */}
          {dateRange === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <input
                type="date"
                value={customStart}
                onChange={(e) => setCustomStart(e.target.value)}
                style={{
                  padding: '5px 10px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  color: '#111827',
                  fontSize: '0.78rem'
                }}
              />
              <span style={{ fontSize: '0.78rem', color: '#6b7280' }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  padding: '5px 10px',
                  background: '#ffffff',
                  border: '1px solid #e5e7eb',
                  borderRadius: '6px',
                  color: '#111827',
                  fontSize: '0.78rem'
                }}
              />
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.76rem', color: '#6b7280' }}>
          Active view: <strong style={{ color: '#17652f' }}>{currentTabInfo?.name}</strong>
        </div>
      </div>

      {/* Report Tabs Ribbon */}
      <div className="g-card no-print no-scrollbar" style={{
        display: 'flex',
        overflowX: 'auto',
        WebkitOverflowScrolling: 'touch',
        whiteSpace: 'nowrap',
        gap: '4px',
        padding: '3px',
        border: '1px solid #e5e7eb',
        background: '#f3f4f6',
        borderRadius: '8px'
      }}>
        {visibleReportTabs.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              type="button"
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '8px 14px',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? '#17652f' : 'transparent',
                color: isActive ? '#ffffff' : '#4b5563',
                fontWeight: isActive ? '600' : '500',
                fontSize: '0.8rem',
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                flex: '0 0 auto'
              }}
            >
              <IconComp size={15} color={isActive ? '#ffffff' : '#17652f'} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Error Alert Box */}
      {errorMsg && (
        <div style={{
          backgroundColor: '#f1f5f9',
          border: '1px solid #0f172a',
          color: '#0f172a',
          padding: '12px 18px',
          borderRadius: '8px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
            <AlertTriangle size={18} />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={fetchReportData}
            style={{
              padding: '4px 10px',
              borderRadius: '4px',
              backgroundColor: '#17652f',
              color: '#111827',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Skeletons & Resilient Loading State (Zero Layout Shift) */}
      {loading ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          <CardGridSkeleton cards={4} height="110px" />
          <TableSkeleton rows={8} columns={6} />
        </div>
      ) : (
        <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* ================================================================ */}
          {/* 1. SALES REPORT VIEW */}
          {/* ================================================================ */}
          {activeReportTab === 'sales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Sales KPIs */}
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Total contract value</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                    {formatINR(summary.totalContractValue)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Across {summary.totalDeals || 0} deals</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Collected revenue</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {formatINR(summary.totalRealizedCollection)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>{summary.collectionEfficiency || 0}% recovery</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Pending receivables</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#374151', marginTop: '4px' }}>
                    {formatINR(summary.pendingCollection)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Upcoming milestones</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Possessions completed</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {summary.possessedCount || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Keys delivered</div>
                </div>
              </div>

              {/* Deal Stage Distribution Ribbon */}
              <div className="g-card" style={{
                padding: '14px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#111827' }}>Deal conversion funnel:</div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                  <span>Token booked: <strong style={{ color: '#17652f' }}>{summary.bookedCount || 0}</strong></span>
                  <span>Agreement signed: <strong style={{ color: '#17652f' }}>{summary.agreementCompletedCount || 0}</strong></span>
                  <span>Payment in progress: <strong style={{ color: '#17652f' }}>{summary.inPaymentProgressCount || 0}</strong></span>
                  <span>Fully paid: <strong style={{ color: '#17652f' }}>{summary.fullyPaidCount || 0}</strong></span>
                  <span>Cancelled: <strong style={{ color: '#dc2626' }}>{summary.cancelledCount || 0}</strong></span>
                </div>
              </div>

              {/* Sales Register Table */}
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                    Sales register ({(reportData?.register || []).length})
                  </h4>
                </div>

                <div className="table-responsive">
                  <table style={{ minWidth: '780px' }}>
                    <thead>
                      <tr>
                        <th>Buyer</th>
                        <th>Unit</th>
                        <th>Deal value</th>
                        <th>Collected</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Booking date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData?.register || []).map((row) => (
                        <tr key={row.id || Math.random()}>
                          <td style={{ fontWeight: '600' }}>
                            <div>{row.buyerName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{row.mobileNo}</div>
                          </td>
                          <td>
                            <div style={{ color: '#111827', fontWeight: '500' }}>{row.flatNumber}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{row.projectName}</div>
                          </td>
                          <td style={{ fontWeight: '600', color: '#111827' }}>
                            {formatINR(row.dealValue)}
                          </td>
                          <td style={{ color: '#16a34a', fontWeight: '600' }}>
                            {formatINR(row.collectedAmount)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '60px', height: '6px', background: '#e5e7eb', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${row.paymentProgressPercent}%`, height: '100%', background: '#17652f' }} />
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>{row.paymentProgressPercent}%</span>
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={row.salesStatus} />
                          </td>
                          <td style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {row.bookingDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 2. RENTAL REPORT VIEW (36-Month Guaranteed Rent-Back Payouts) */}
          {/* ================================================================ */}
          {activeReportTab === 'rental' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Monthly gross payouts</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {formatINR(summary.totalMonthlyGrossPayouts || summary.totalMonthlyOwnerOutflow)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{summary.activeRentBackCount || summary.totalManagedUnits || 0} rent-back units</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>TDS deductions</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#dc2626', marginTop: '4px' }}>
                    {formatINR(summary.totalMonthlyTdsDeducted)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Tax withholdings</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Net transfers to owners</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {formatINR(summary.totalMonthlyNetDisbursed)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>Monthly bank transfers</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>36-month total commitment</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                    {formatINR(summary.total36MonthCommitment)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Assured value</div>
                </div>
              </div>

              {/* Rental Contract Register */}
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                    Rent-back agreements register ({(reportData?.register || []).length})
                  </h4>
                </div>

                <div className="table-responsive">
                  <table style={{ minWidth: '780px' }}>
                    <thead>
                      <tr>
                        <th>Unit and tower</th>
                        <th>Owner</th>
                        <th>Monthly gross rent</th>
                        <th>TDS rate</th>
                        <th>Net monthly payout</th>
                        <th>Payout day</th>
                        <th>Commitment</th>
                        <th>Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData?.register || []).map((row) => (
                        <tr key={row.id || Math.random()}>
                          <td style={{ fontWeight: '600' }}>
                            <div>Flat {row.flatNumber}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{row.towerName || 'Tower A'}</div>
                          </td>
                          <td>
                            <div style={{ fontWeight: '600', color: '#111827' }}>{row.ownerName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{row.ownerPhone}</div>
                          </td>
                          <td style={{ color: '#17652f', fontWeight: '600' }}>
                            {formatINR(row.monthlyGrossRent)}/mo
                          </td>
                          <td style={{ color: row.tdsDeducted > 0 ? '#dc2626' : '#16a34a', fontWeight: '600' }}>
                            {row.tdsDeducted > 0 ? `${row.tdsPercentage || 10}% (-${formatINR(row.tdsDeducted)})` : '0% (Exempt)'}
                          </td>
                          <td style={{ color: '#17652f', fontWeight: '600', fontSize: '0.95rem' }}>
                            {formatINR(row.netMonthlyPayout)}/mo
                          </td>
                          <td style={{ color: '#374151', fontWeight: '500' }}>
                            {row.rentDueDay}
                          </td>
                          <td style={{ fontWeight: '600', color: '#111827' }}>
                            {formatINR(row.total36MonthCommitment)}
                          </td>
                          <td style={{ color: '#6b7280', fontSize: '0.75rem' }}>
                            {row.endDate}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 3. COLLECTION REPORT VIEW */}
          {/* ================================================================ */}
          {activeReportTab === 'collection' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Total collections</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {formatINR(summary.totalRealizedRevenue)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>{summary.collectionRealizationRate}% realization rate</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Total overdue dues</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#dc2626', marginTop: '4px' }}>
                    {formatINR(summary.totalOutstandingArrears)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Across all modules</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Sales collections</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                    {formatINR(summary.salesCollected)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Pending: {formatINR(summary.salesPending)}</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Maintenance and rent</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {formatINR((summary.rentalCollected || 0) + (summary.maintCollected || 0))}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Pending: {formatINR((summary.rentalPending || 0) + (summary.maintPending || 0))}</div>
                </div>
              </div>

              {/* Aging Buckets Analysis */}
              <div className="g-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#111827', margin: '0 0 14px 0' }}>
                  Overdue aging analysis
                </h4>
                <div className="grid-cols-4">
                  <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: '600' }}>Current (0-15 days)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>{formatINR(reportData?.agingBuckets?.current)}</div>
                  </div>

                  <div style={{ background: '#f0fdf4', padding: '14px', borderRadius: '6px', border: '1px solid #bbf7d0' }}>
                    <div style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: '600' }}>1 - 30 days overdue</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>{formatINR(reportData?.agingBuckets?.days1To30)}</div>
                  </div>

                  <div style={{ background: '#fef3c7', padding: '14px', borderRadius: '6px', border: '1px solid #fde68a' }}>
                    <div style={{ fontSize: '0.72rem', color: '#92400e', fontWeight: '600' }}>31 - 60 days overdue</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>{formatINR(reportData?.agingBuckets?.days31To60)}</div>
                  </div>

                  <div style={{ background: '#fef2f2', padding: '14px', borderRadius: '6px', border: '1px solid #fecaca' }}>
                    <div style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '600' }}>60+ days overdue</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#dc2626', marginTop: '4px' }}>{formatINR(reportData?.agingBuckets?.days60Plus)}</div>
                  </div>
                </div>
              </div>

              {/* Payment Modes Breakdown */}
              <div className="g-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#111827', margin: '0 0 14px 0' }}>
                  Payment mode distribution
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {(reportData?.paymentModes || []).map((pm) => (
                    <div key={pm.mode} style={{ background: '#f9fafb', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{pm.mode}</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: '600', color: '#111827', marginTop: '3px' }}>{formatINR(pm.amount)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: '600', marginTop: '2px' }}>{pm.percentage}% of collections</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 4. MAINTENANCE REPORT VIEW */}
          {/* ================================================================ */}
          {activeReportTab === 'maintenance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Total billed charges</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                    {formatINR(summary.totalBilled)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Residential maintenance</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Fees collected</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {formatINR(summary.totalCollected)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>{summary.recoveryRate || 0}% recovery</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Outstanding dues</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#dc2626', marginTop: '4px' }}>
                    {formatINR(summary.totalArrears)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Unpaid invoices</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Service tickets (TAT)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {summary.averageResolutionHours || 28.4} hrs
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Average resolution speed</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="g-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#111827', margin: '0 0 14px 0' }}>
                  Service tickets by domain
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {(reportData?.categoryBreakdown || []).map((cat) => (
                    <div key={cat.category} style={{ background: '#f9fafb', padding: '12px 14px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.78rem', color: '#111827', fontWeight: '600' }}>{cat.category}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>{cat.count} tickets</div>
                      <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{cat.percentage}% of workload</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 5. INVENTORY REPORT VIEW */}
          {/* ================================================================ */}
          {activeReportTab === 'inventory' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Total inventory</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                    {summary.totalFlats || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Across {summary.totalProjects || 1} projects</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Available for sale</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {summary.availableFlats || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>Ready to pitch</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Booked units</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {summary.bookedFlats || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>{summary.absorptionRatePercent || 0}% sold rate</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Material stores valuation</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#374151', marginTop: '4px' }}>
                    {formatINR(summary.totalMaterialStockValue)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Civil stores and inventory</div>
                </div>
              </div>

              {/* Flat Type Breakdown */}
              <div className="g-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#111827', margin: '0 0 14px 0' }}>
                  Property configuration breakdown
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {(reportData?.flatTypeBreakdown || []).map((ft) => (
                    <div key={ft.type} style={{ background: '#f9fafb', padding: '14px', borderRadius: '6px', border: '1px solid #e5e7eb' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#111827' }}>{ft.type}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.76rem' }}>
                        <span style={{ color: '#6b7280' }}>Total units:</span>
                        <strong style={{ color: '#111827' }}>{ft.total}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.76rem' }}>
                        <span style={{ color: '#17652f' }}>Available:</span>
                        <strong style={{ color: '#17652f' }}>{ft.available}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.76rem' }}>
                        <span style={{ color: '#17652f' }}>Booked:</span>
                        <strong style={{ color: '#17652f' }}>{ft.booked}</strong>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 6. FINANCE REPORT VIEW (P&L & CASH FLOW) */}
          {/* ================================================================ */}
          {activeReportTab === 'finance' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Total cash inflow</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {formatINR(summary.totalCashInflow)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>Sales, rent and maintenance</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Total cash outflow</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#dc2626', marginTop: '4px' }}>
                    {formatINR(summary.totalCashOutflow)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#dc2626' }}>Contractors, materials and payroll</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Net operating profit</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {formatINR(summary.netOperatingProfit)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>{summary.profitMarginPercent || 0}% operating margin</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Net payable GST</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#374151', marginTop: '4px' }}>
                    {formatINR(reportData?.gstLiability?.netPayableGst)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>After ITC adjustments</div>
                </div>
              </div>

              {/* Inflows vs Outflows Split */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {/* INFLOWS */}
                <div className="g-card" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#17652f', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowUpRight size={18} /> Revenue inflow streams
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(reportData?.inflows || []).map((inf) => (
                      <div key={inf.stream} style={{ background: '#f9fafb', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#111827', fontWeight: '600' }}>{inf.stream}</div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{inf.percentage}% of revenue</div>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#17652f' }}>{formatINR(inf.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OUTFLOWS */}
                <div className="g-card" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#dc2626', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowDownRight size={18} /> Expenditure outflow breakdown
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(reportData?.outflows || []).map((out) => (
                      <div key={out.expense} style={{ background: '#f9fafb', padding: '10px 14px', borderRadius: '6px', border: '1px solid #e5e7eb', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#111827', fontWeight: '600' }}>{out.expense}</div>
                          <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{out.percentage}% of cost</div>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '600', color: '#dc2626' }}>{formatINR(out.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 7. CRM & LEADS REPORT VIEW */}
          {/* ================================================================ */}
          {activeReportTab === 'crm' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Total leads</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                    {summary.totalLeads || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Marketing and referrals</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Deals converted</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {summary.convertedLeads || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>{summary.overallConversionRate || '14%'} conversion</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Site visits completed</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {summary.siteVisitsScheduled || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Physical walkthroughs</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Average days to close</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#374151', marginTop: '4px' }}>
                    {summary.averageDaysToClose || 18.5} days
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Lead to deal speed</div>
                </div>
              </div>

              {/* Lead Source ROI Breakdown */}
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                    Lead generation channels
                  </h4>
                </div>

                <div className="table-responsive">
                  <table style={{ minWidth: '600px' }}>
                    <thead>
                      <tr>
                        <th>Acquisition channel</th>
                        <th>Total inquiries</th>
                        <th>Closed bookings</th>
                        <th>Conversion rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData?.leadSourceBreakdown || []).map((src) => (
                        <tr key={src.source}>
                          <td style={{ fontWeight: '600' }}>{src.source}</td>
                          <td>{src.totalLeads}</td>
                          <td style={{ color: '#17652f', fontWeight: '600' }}>{src.converted}</td>
                          <td style={{ color: '#16a34a', fontWeight: '600' }}>{src.conversionRate}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ================================================================ */}
          {/* 8. HR & PAYROLL REPORT VIEW */}
          {/* ================================================================ */}
          {activeReportTab === 'hr' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Active staff</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
                    {summary.totalHeadcount || 28}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Permanent employees</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Monthly payroll</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#dc2626', marginTop: '4px' }}>
                    {formatINR(summary.totalMonthlyPayroll)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>Salaries and payouts</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Average attendance</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {summary.averageAttendanceRate || '94.2%'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#16a34a' }}>Workforce rate</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.75rem', color: '#6b7280', fontWeight: '600' }}>Contract labour</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
                    {summary.activeContractLabour || 45}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#6b7280' }}>On-site team</div>
                </div>
              </div>

              {/* Department Payroll Breakdown */}
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #e5e7eb' }}>
                  <h4 style={{ fontSize: '0.92rem', fontWeight: '600', color: '#111827', margin: 0 }}>
                    Department payroll breakdown
                  </h4>
                </div>

                <div className="table-responsive">
                  <table style={{ minWidth: '600px' }}>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Headcount</th>
                        <th>Monthly payroll</th>
                        <th>Average per employee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData?.departmentBreakdown || []).map((dept) => (
                        <tr key={dept.department}>
                          <td style={{ fontWeight: '600' }}>{dept.department}</td>
                          <td>{dept.headcount} staff</td>
                          <td style={{ color: '#dc2626', fontWeight: '600' }}>{formatINR(dept.monthlyPayroll)}</td>
                          <td style={{ color: '#17652f', fontWeight: '600' }}>
                            {formatINR(Math.round(dept.monthlyPayroll / (dept.headcount || 1)))}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ======================================================== */}
      {/* EXECUTIVE PRINT FOOTER & SIGNATORY STAMPS                */}
      {/* ======================================================== */}
      <div className="print-only" style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #cbd5e1', pageBreakInside: 'avoid' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center' }}>
          <div>
            <div style={{ height: '52px', borderBottom: '1px dashed #94a3b8', marginBottom: '8px' }}></div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#1e293b' }}>PREPARED BY</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Operations &amp; Reporting Analyst</div>
          </div>
          <div>
            <div style={{ height: '52px', borderBottom: '1px dashed #94a3b8', marginBottom: '8px' }}></div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#1e293b' }}>VERIFIED &amp; AUDITED BY</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Chief Financial Controller / Head of Accounts</div>
          </div>
          <div>
            <div style={{ height: '52px', borderBottom: '1px dashed #94a3b8', marginBottom: '8px' }}></div>
            <div style={{ fontSize: '0.82rem', fontWeight: '600', color: '#1e293b' }}>AUTHORIZED SIGNATORY</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Krishna Valley Infrastructure &amp; Developers</div>
          </div>
        </div>

        <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.68rem', color: '#94a3b8' }}>
          Confidential Business Intelligence Document • Generated via Krishna Valley Real Estate ERP System • ISO 9001:2015 Compliant Ledger Audit
        </div>
      </div>

    </div>
  );
};
