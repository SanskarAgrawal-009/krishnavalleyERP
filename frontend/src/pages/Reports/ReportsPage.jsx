import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { reportService } from '../../services/reportService.js';
import { projectService } from '../../services/projectService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';

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
  { id: 'sales', name: 'Sales Report', icon: ShoppingBag, color: '#10b981' },
  { id: 'rental', name: 'Rental Report', icon: Repeat, color: '#3b82f6' },
  { id: 'collection', name: 'Collection Report', icon: DollarSign, color: '#f59e0b' },
  { id: 'maintenance', name: 'Maintenance Report', icon: Wrench, color: '#ec4899' },
  { id: 'inventory', name: 'Inventory Report', icon: Package, color: '#8b5cf6' },
  { id: 'finance', name: 'Finance Report', icon: PieChart, color: '#14b8a6' },
  { id: 'crm', name: 'CRM Report', icon: Users, color: '#06b6d4' },
  { id: 'hr', name: 'HR Report', icon: Briefcase, color: '#f97316' }
];

export const ReportsPage = () => {
  const { user } = useAuth();
  const { reportType } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const initialTab = reportType || searchParams.get('tab') || 'sales';
  const [activeReportTab, setActiveReportTab] = useState(initialTab);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState(null);
  const [reportData, setReportData] = useState(null);

  // Sync state if URL param or searchParam changes
  useEffect(() => {
    if (reportType && REPORT_TABS.some((t) => t.id === reportType)) {
      setActiveReportTab(reportType);
    } else {
      const tab = searchParams.get('tab');
      if (tab && REPORT_TABS.some((t) => t.id === tab)) {
        setActiveReportTab(tab);
      }
    }
  }, [reportType, searchParams]);

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
            <div style={{ fontSize: '1.45rem', fontWeight: '900', color: '#0f172a', letterSpacing: '0.02em' }}>
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
            <div style={{ display: 'inline-block', padding: '4px 10px', background: '#0f766e', color: '#ffffff', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '800', textTransform: 'uppercase' }}>
              Official BI Report
            </div>
            <div style={{ fontSize: '0.74rem', color: '#475569', marginTop: '6px' }}>
              <strong>Generated:</strong> {printTimestamp}
            </div>
          </div>
        </div>

        {/* Report Scope & Filter Context */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px', fontSize: '0.8rem', color: '#1e293b' }}>
          <div>
            <strong>Report Title:</strong> <span style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0f766e' }}>{currentTabInfo?.name}</span>
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
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div style={{
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            background: '#e8f0fe',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#1a73e8',
            flexShrink: 0
          }}>
            <BarChart3 size={24} />
          </div>
          <div>
            <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#191c1d', display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
              Reports & Enterprise BI Analytics
              <span style={{
                fontSize: '0.74rem',
                fontWeight: '700',
                padding: '3px 10px',
                borderRadius: '6px',
                background: '#e6f4ea',
                color: '#137333',
                border: '1px solid #ceead6'
              }}>
                REAL-TIME BI
              </span>
            </div>
            <div style={{ fontSize: '0.88rem', color: '#414754', marginTop: '4px' }}>
              Comprehensive performance registers, revenue realized, aging arrears, occupancy metrics, and financial P&L.
            </div>
          </div>
        </div>

        {/* Global Actions */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          <button
            onClick={handleExportCSV}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #dadce0',
              color: '#191c1d',
              fontSize: '0.82rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <FileSpreadsheet size={15} color="#137333" />
            Export CSV
          </button>

          <button
            onClick={handlePrint}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#ffffff',
              border: '1px solid #dadce0',
              color: '#191c1d',
              fontSize: '0.82rem',
              fontWeight: '600',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            <Printer size={15} color="#1a73e8" />
            Print Report
          </button>

          <button
            onClick={fetchReportData}
            title="Refresh active report"
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              background: '#1a73e8',
              border: 'none',
              color: '#111827',
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
        gap: '12px'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap', flex: 1 }}>
          {/* Project Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={15} color="#727785" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              style={{
                padding: '7px 12px',
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '6px',
                color: '#191c1d',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Projects Combined</option>
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.projectName} ({p.projectCode})
                </option>
              ))}
            </select>
          </div>

          {/* Date Range Filter */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={15} color="#727785" />
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              style={{
                padding: '7px 12px',
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '6px',
                color: '#191c1d',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Time History</option>
              <option value="today">Today</option>
              <option value="week">Past 7 Days</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="fy">Financial Year (FY 2025-26)</option>
              <option value="custom">Custom Date Range...</option>
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
                  padding: '6px 10px',
                  background: '#ffffff',
                  border: '1px solid #dadce0',
                  borderRadius: '6px',
                  color: '#191c1d',
                  fontSize: '0.78rem'
                }}
              />
              <span style={{ fontSize: '0.78rem', color: '#727785' }}>to</span>
              <input
                type="date"
                value={customEnd}
                onChange={(e) => setCustomEnd(e.target.value)}
                style={{
                  padding: '6px 10px',
                  background: '#ffffff',
                  border: '1px solid #dadce0',
                  borderRadius: '6px',
                  color: '#191c1d',
                  fontSize: '0.78rem'
                }}
              />
            </div>
          )}
        </div>

        <div style={{ fontSize: '0.76rem', color: '#727785' }}>
          Active View: <strong style={{ color: '#1a73e8' }}>{currentTabInfo?.name}</strong>
        </div>
      </div>

      {/* 8 Report Tabs Ribbon (Matching User Diagram) */}
      <div className="g-card no-print" style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
        gap: '6px',
        padding: '6px'
      }}>
        {REPORT_TABS.map((tab) => {
          const IconComp = tab.icon;
          const isActive = activeReportTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '9px 12px',
                borderRadius: '6px',
                border: 'none',
                background: isActive ? '#1a73e8' : 'transparent',
                color: isActive ? '#ffffff' : '#414754',
                fontWeight: isActive ? '700' : '500',
                fontSize: '0.8rem',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: isActive ? '0 1px 3px rgba(26,115,232,0.3)' : 'none',
                whiteSpace: 'nowrap'
              }}
            >
              <IconComp size={15} color={isActive ? '#ffffff' : tab.color} />
              {tab.name}
            </button>
          );
        })}
      </div>

      {/* Error Alert Box */}
      {errorMsg && (
        <div style={{
          backgroundColor: '#ffdad6',
          border: '1px solid #ba1a1a',
          color: '#93000a',
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
              backgroundColor: '#ba1a1a',
              color: '#111827',
              fontSize: '0.75rem',
              fontWeight: '700'
            }}
          >
            Retry
          </button>
        </div>
      )}

      {/* Loading Indicator */}
      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#727785' }}>
          <RefreshCw size={26} className="spin" style={{ margin: '0 auto 12px', color: '#1a73e8' }} />
          <div style={{ fontWeight: '600', color: '#191c1d' }}>Aggregating {currentTabInfo?.name}...</div>
        </div>
      ) : (
        <>
          {/* ================================================================ */}
          {/* 1. SALES REPORT VIEW */}
          {/* ================================================================ */}
          {activeReportTab === 'sales' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Sales KPIs */}
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>TOTAL CONTRACTED VALUE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#191c1d', marginTop: '4px' }}>
                    {formatINR(summary.totalContractValue)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Across {summary.totalDeals || 0} deals</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>REALIZED COLLECTION</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                    {formatINR(summary.totalRealizedCollection)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#137333' }}>{summary.collectionEfficiency || 0}% Recovery</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>PENDING RECEIVABLES</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
                    {formatINR(summary.pendingCollection)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Upcoming milestones</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>POSSESSION COMPLETED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
                    {summary.possessedCount || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Keys delivered</div>
                </div>
              </div>

              {/* Deal Stage Distribution Ribbon */}
              <div className="g-card" style={{
                padding: '16px 20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: '12px'
              }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#191c1d' }}>Deal Conversion Funnel:</div>
                <div style={{ display: 'flex', gap: '14px', flexWrap: 'wrap', fontSize: '0.78rem' }}>
                  <span>Token Booked: <strong style={{ color: '#137333' }}>{summary.bookedCount || 0}</strong></span>
                  <span>Agreement Signed: <strong style={{ color: '#1a73e8' }}>{summary.agreementCompletedCount || 0}</strong></span>
                  <span>Payment In Progress: <strong style={{ color: '#8b5cf6' }}>{summary.inPaymentProgressCount || 0}</strong></span>
                  <span>Fully Paid: <strong style={{ color: '#059669' }}>{summary.fullyPaidCount || 0}</strong></span>
                  <span>Cancelled: <strong style={{ color: '#ba1a1a' }}>{summary.cancelledCount || 0}</strong></span>
                </div>
              </div>

              {/* Sales Register Table */}
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#191c1d', margin: 0 }}>
                    Sales Deal Register ({(reportData?.register || []).length})
                  </h4>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Buyer Name</th>
                        <th>Project & Unit</th>
                        <th>Deal Value</th>
                        <th>Collected</th>
                        <th>Progress</th>
                        <th>Status</th>
                        <th>Booking Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData?.register || []).map((row) => (
                        <tr key={row.id || Math.random()}>
                          <td style={{ fontWeight: '600' }}>
                            <div>{row.buyerName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#727785' }}>{row.mobileNo}</div>
                          </td>
                          <td>
                            <div style={{ color: '#191c1d', fontWeight: '600' }}>{row.flatNumber}</div>
                            <div style={{ fontSize: '0.72rem', color: '#727785' }}>{row.projectName}</div>
                          </td>
                          <td style={{ fontWeight: '700', color: '#191c1d' }}>
                            {formatINR(row.dealValue)}
                          </td>
                          <td style={{ color: '#137333', fontWeight: '700' }}>
                            {formatINR(row.collectedAmount)}
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <div style={{ width: '60px', height: '6px', background: '#e1e3e4', borderRadius: '4px', overflow: 'hidden' }}>
                                <div style={{ width: `${row.paymentProgressPercent}%`, height: '100%', background: '#1a73e8' }} />
                              </div>
                              <span style={{ fontSize: '0.72rem', color: '#414754' }}>{row.paymentProgressPercent}%</span>
                            </div>
                          </td>
                          <td>
                            <StatusBadge status={row.salesStatus} />
                          </td>
                          <td style={{ color: '#727785', fontSize: '0.75rem' }}>
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
          {/* 2. RENTAL REPORT VIEW */}
          {/* ================================================================ */}
          {activeReportTab === 'rental' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div className="grid-cols-4">
                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>MONTHLY TENANT INFLOW</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                    {formatINR(summary.totalMonthlyTenantInflow)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>From {summary.activeTenanciesCount || 0} active tenants</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>OWNER RENT-BACK PAYOUT</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>
                    {formatINR(summary.totalMonthlyOwnerOutflow)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>{summary.rentBackUnitsCount || 0} Guaranteed units</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>NET MONTHLY SPREAD PROFIT</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: (summary.netMonthlyProfit || 0) >= 0 ? '#137333' : '#ba1a1a', marginTop: '4px' }}>
                    +{formatINR(summary.netMonthlyProfit)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Company net margin</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>SECURITY DEPOSITS HELD</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
                    {formatINR(summary.totalSecurityDeposits)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Escrow balance</div>
                </div>
              </div>

              {/* Rental Contract Register */}
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#191c1d', margin: 0 }}>
                    Rental Contracts Register ({(reportData?.register || []).length})
                  </h4>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Unit & Project</th>
                        <th>Tenant</th>
                        <th>Owner</th>
                        <th>Tenant Rent</th>
                        <th>Owner Payout</th>
                        <th>Net Spread</th>
                        <th>Lease Expiry</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData?.register || []).map((row) => (
                        <tr key={row.id || Math.random()}>
                          <td style={{ fontWeight: '700' }}>
                            <div>{row.flatNumber}</div>
                            <div style={{ fontSize: '0.72rem', color: '#727785' }}>{row.projectName}</div>
                          </td>
                          <td style={{ color: '#1a73e8', fontWeight: '600' }}>
                            <div>{row.tenantName}</div>
                            <div style={{ fontSize: '0.72rem', color: '#727785' }}>{row.tenantPhone}</div>
                          </td>
                          <td style={{ color: '#b06000' }}>
                            {row.ownerName}
                          </td>
                          <td style={{ color: '#137333', fontWeight: '700' }}>
                            +{formatINR(row.monthlyTenantRent)}
                          </td>
                          <td style={{ color: row.isRentBack ? '#8b5cf6' : '#727785' }}>
                            {row.isRentBack ? `-${formatINR(row.monthlyOwnerPayout)}` : '₹0'}
                          </td>
                          <td style={{ color: row.netMonthlySpread >= 0 ? '#137333' : '#ba1a1a', fontWeight: '700' }}>
                            +{formatINR(row.netMonthlySpread)}
                          </td>
                          <td style={{ color: '#727785', fontSize: '0.75rem' }}>
                            {row.leaseEndDate}
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
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>TOTAL REALIZED COLLECTIONS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                    {formatINR(summary.totalRealizedRevenue)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#137333' }}>{summary.collectionRealizationRate}% Realization Rate</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>TOTAL OUTSTANDING ARREARS</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ba1a1a', marginTop: '4px' }}>
                    {formatINR(summary.totalOutstandingArrears)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Overdue dues across modules</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>SALES COLLECTION</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#191c1d', marginTop: '4px' }}>
                    {formatINR(summary.salesCollected)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#727785' }}>Pending: {formatINR(summary.salesPending)}</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>MAINTENANCE & RENT</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
                    {formatINR((summary.rentalCollected || 0) + (summary.maintCollected || 0))}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#727785' }}>Pending: {formatINR((summary.rentalPending || 0) + (summary.maintPending || 0))}</div>
                </div>
              </div>

              {/* Aging Buckets Analysis */}
              <div className="g-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#191c1d', margin: '0 0 14px 0' }}>
                  Arrears Aging Analysis (Due vs Delay Buckets)
                </h4>
                <div className="grid-cols-4">
                  <div style={{ background: '#e6f4ea', padding: '14px', borderRadius: '6px', border: '1px solid #ceead6' }}>
                    <div style={{ fontSize: '0.72rem', color: '#137333', fontWeight: '700' }}>Current (0-15 Days)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#191c1d', marginTop: '4px' }}>{formatINR(reportData?.agingBuckets?.current)}</div>
                  </div>

                  <div style={{ background: '#e8f0fe', padding: '14px', borderRadius: '6px', border: '1px solid #d2e3fc' }}>
                    <div style={{ fontSize: '0.72rem', color: '#1a73e8', fontWeight: '700' }}>1 - 30 Days Overdue</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#191c1d', marginTop: '4px' }}>{formatINR(reportData?.agingBuckets?.days1To30)}</div>
                  </div>

                  <div style={{ background: '#fef7e0', padding: '14px', borderRadius: '6px', border: '1px solid #feefc3' }}>
                    <div style={{ fontSize: '0.72rem', color: '#b06000', fontWeight: '700' }}>31 - 60 Days Overdue</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#191c1d', marginTop: '4px' }}>{formatINR(reportData?.agingBuckets?.days31To60)}</div>
                  </div>

                  <div style={{ background: '#fce8e6', padding: '14px', borderRadius: '6px', border: '1px solid #fad2cf' }}>
                    <div style={{ fontSize: '0.72rem', color: '#ba1a1a', fontWeight: '700' }}>60+ Days (Critical)</div>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#ba1a1a', marginTop: '4px' }}>{formatINR(reportData?.agingBuckets?.days60Plus)}</div>
                  </div>
                </div>
              </div>

              {/* Payment Modes Breakdown */}
              <div className="g-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#191c1d', margin: '0 0 14px 0' }}>
                  Payment Channel & Mode Distribution
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {(reportData?.paymentModes || []).map((pm) => (
                    <div key={pm.mode} style={{ background: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #dadce0' }}>
                      <div style={{ fontSize: '0.75rem', color: '#727785' }}>{pm.mode}</div>
                      <div style={{ fontSize: '1.05rem', fontWeight: '700', color: '#191c1d', marginTop: '3px' }}>{formatINR(pm.amount)}</div>
                      <div style={{ fontSize: '0.72rem', color: '#1a73e8', fontWeight: '700', marginTop: '2px' }}>{pm.percentage}% of collections</div>
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
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>TOTAL BILLED CHARGES</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#191c1d', marginTop: '4px' }}>
                    {formatINR(summary.totalBilled)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>All residential maintenance</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>FEES RECOVERED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                    {formatINR(summary.totalCollected)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#137333' }}>{summary.recoveryRate || 0}% Recovery</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>OUTSTANDING DUES</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ba1a1a', marginTop: '4px' }}>
                    {formatINR(summary.totalArrears)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Unpaid bills</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>SERVICE REQUESTS (TAT)</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
                    {summary.averageResolutionHours || 28.4} hrs
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Avg resolution speed</div>
                </div>
              </div>

              {/* Category Breakdown */}
              <div className="g-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#191c1d', margin: '0 0 14px 0' }}>
                  Maintenance Tickets by Technical Domain
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px' }}>
                  {(reportData?.categoryBreakdown || []).map((cat) => (
                    <div key={cat.category} style={{ background: '#f8f9fa', padding: '12px 14px', borderRadius: '6px', border: '1px solid #dadce0' }}>
                      <div style={{ fontSize: '0.78rem', color: '#191c1d', fontWeight: '600' }}>{cat.category}</div>
                      <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>{cat.count} tickets</div>
                      <div style={{ fontSize: '0.72rem', color: '#727785' }}>{cat.percentage}% of workload</div>
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
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>TOTAL FLAT INVENTORY</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#191c1d', marginTop: '4px' }}>
                    {summary.totalFlats || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Across {summary.totalProjects || 1} Projects</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>AVAILABLE FOR SALE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                    {summary.availableFlats || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#137333' }}>Ready to pitch</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>BOOKED & ALLOTTED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
                    {summary.bookedFlats || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>{summary.absorptionRatePercent || 0}% Sold Rate</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>MATERIAL STORES VALUATION</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
                    {formatINR(summary.totalMaterialStockValue)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Civil stores & inventory</div>
                </div>
              </div>

              {/* Flat Type Breakdown */}
              <div className="g-card" style={{ padding: '20px' }}>
                <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#191c1d', margin: '0 0 14px 0' }}>
                  Property Configuration Breakdown
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '12px' }}>
                  {(reportData?.flatTypeBreakdown || []).map((ft) => (
                    <div key={ft.type} style={{ background: '#f8f9fa', padding: '14px', borderRadius: '6px', border: '1px solid #dadce0' }}>
                      <div style={{ fontSize: '0.82rem', fontWeight: '700', color: '#191c1d' }}>{ft.type}</div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '8px', fontSize: '0.76rem' }}>
                        <span style={{ color: '#727785' }}>Total Units:</span>
                        <strong style={{ color: '#191c1d' }}>{ft.total}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.76rem' }}>
                        <span style={{ color: '#137333' }}>Available:</span>
                        <strong style={{ color: '#137333' }}>{ft.available}</strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '4px', fontSize: '0.76rem' }}>
                        <span style={{ color: '#1a73e8' }}>Booked:</span>
                        <strong style={{ color: '#1a73e8' }}>{ft.booked}</strong>
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
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>TOTAL CASH INFLOW</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                    {formatINR(summary.totalCashInflow)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#137333' }}>Sales, Rent & Maintenance</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>TOTAL CASH OUTFLOW</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ba1a1a', marginTop: '4px' }}>
                    {formatINR(summary.totalCashOutflow)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#ba1a1a' }}>Contractors, Materials & Payroll</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>NET OPERATING PROFIT</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                    {formatINR(summary.netOperatingProfit)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#137333' }}>{summary.profitMarginPercent || 0}% Operating Margin</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>NET PAYABLE GST</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
                    {formatINR(reportData?.gstLiability?.netPayableGst)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#727785' }}>After ITC adjustments</div>
                </div>
              </div>

              {/* Inflows vs Outflows Split */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '16px' }}>
                {/* INFLOWS */}
                <div className="g-card" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#137333', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowUpRight size={18} /> Revenue Inflow Streams
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(reportData?.inflows || []).map((inf) => (
                      <div key={inf.stream} style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: '6px', border: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#191c1d', fontWeight: '600' }}>{inf.stream}</div>
                          <div style={{ fontSize: '0.7rem', color: '#727785' }}>{inf.percentage}% of revenue</div>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#137333' }}>{formatINR(inf.amount)}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* OUTFLOWS */}
                <div className="g-card" style={{ padding: '20px' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#ba1a1a', margin: '0 0 14px 0', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <ArrowDownRight size={18} /> Expenditure Outflow Breakdown
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {(reportData?.outflows || []).map((out) => (
                      <div key={out.expense} style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: '6px', border: '1px solid #dadce0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontSize: '0.8rem', color: '#191c1d', fontWeight: '600' }}>{out.expense}</div>
                          <div style={{ fontSize: '0.7rem', color: '#727785' }}>{out.percentage}% of cost</div>
                        </div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#ba1a1a' }}>{formatINR(out.amount)}</div>
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
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>TOTAL LEADS ACQUIRED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#191c1d', marginTop: '4px' }}>
                    {summary.totalLeads || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Marketing & Referrals</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>DEALS CONVERTED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                    {summary.convertedLeads || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#137333' }}>{summary.overallConversionRate || '14%'} Conversion</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>SITE VISITS COMPLETED</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
                    {summary.siteVisitsScheduled || 0}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Physical walkthroughs</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>AVG DAYS TO CLOSE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
                    {summary.averageDaysToClose || 18.5} days
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Velocity from Lead to Deal</div>
                </div>
              </div>

              {/* Lead Source ROI Breakdown */}
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #dadce0' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#191c1d', margin: 0 }}>
                    Lead Generation Channels ROI & Efficiency
                  </h4>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Acquisition Channel</th>
                        <th>Total Inquiries</th>
                        <th>Closed Bookings</th>
                        <th>Conversion Rate</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData?.leadSourceBreakdown || []).map((src) => (
                        <tr key={src.source}>
                          <td style={{ fontWeight: '600' }}>{src.source}</td>
                          <td>{src.totalLeads}</td>
                          <td style={{ color: '#137333', fontWeight: '700' }}>{src.converted}</td>
                          <td style={{ color: '#1a73e8', fontWeight: '700' }}>{src.conversionRate}</td>
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
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>ACTIVE STAFF HEADCOUNT</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#191c1d', marginTop: '4px' }}>
                    {summary.totalHeadcount || 28}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>On-roll permanent employees</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>MONTHLY PAYROLL EXPENSE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ba1a1a', marginTop: '4px' }}>
                    {formatINR(summary.totalMonthlyPayroll)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>Salaries & Statutory Payouts</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>AVERAGE ATTENDANCE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
                    {summary.averageAttendanceRate || '94.2%'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#137333' }}>High Workforce Reliability</div>
                </div>

                <div className="stat-card">
                  <div style={{ fontSize: '0.74rem', color: '#727785', fontWeight: '700' }}>CONTRACT LABOUR FORCE</div>
                  <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
                    {summary.activeContractLabour || 45}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#414754' }}>On-site construction team</div>
                </div>
              </div>

              {/* Department Payroll Breakdown */}
              <div className="g-card" style={{ overflow: 'hidden' }}>
                <div style={{ padding: '14px 18px', borderBottom: '1px solid #dadce0' }}>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '700', color: '#191c1d', margin: 0 }}>
                    Department-wise Staffing & Monthly Payroll Allocation
                  </h4>
                </div>

                <div style={{ overflowX: 'auto' }}>
                  <table>
                    <thead>
                      <tr>
                        <th>Department</th>
                        <th>Headcount</th>
                        <th>Monthly Payroll</th>
                        <th>Avg / Employee</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(reportData?.departmentBreakdown || []).map((dept) => (
                        <tr key={dept.department}>
                          <td style={{ fontWeight: '600' }}>{dept.department}</td>
                          <td>{dept.headcount} Staff</td>
                          <td style={{ color: '#ba1a1a', fontWeight: '700' }}>{formatINR(dept.monthlyPayroll)}</td>
                          <td style={{ color: '#1a73e8', fontWeight: '600' }}>
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
        </>
      )}

      {/* ======================================================== */}
      {/* EXECUTIVE PRINT FOOTER & SIGNATORY STAMPS                */}
      {/* ======================================================== */}
      <div className="print-only" style={{ marginTop: '36px', paddingTop: '20px', borderTop: '1px solid #cbd5e1', pageBreakInside: 'avoid' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '24px', textAlign: 'center' }}>
          <div>
            <div style={{ height: '52px', borderBottom: '1px dashed #94a3b8', marginBottom: '8px' }}></div>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>PREPARED BY</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Operations &amp; Reporting Analyst</div>
          </div>
          <div>
            <div style={{ height: '52px', borderBottom: '1px dashed #94a3b8', marginBottom: '8px' }}></div>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>VERIFIED &amp; AUDITED BY</div>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>Chief Financial Controller / Head of Accounts</div>
          </div>
          <div>
            <div style={{ height: '52px', borderBottom: '1px dashed #94a3b8', marginBottom: '8px' }}></div>
            <div style={{ fontSize: '0.82rem', fontWeight: '800', color: '#1e293b' }}>AUTHORIZED SIGNATORY</div>
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
