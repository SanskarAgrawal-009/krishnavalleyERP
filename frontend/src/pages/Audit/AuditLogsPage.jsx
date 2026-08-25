import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { auditService } from '../../services/auditService.js';
import {
  ShieldCheck,
  Activity,
  Trash2,
  RefreshCw,
  History,
  AlertTriangle,
  Search,
  Filter,
  Download,
  Calendar,
  User,
  Clock,
  Laptop,
  CheckCircle2,
  XCircle,
  Eye,
  ArrowRight,
  Layers,
  Sparkles,
  Loader2,
  FileText,
  Lock,
  Zap,
  Info,
  X
} from 'lucide-react';

export const AuditLogsPage = () => {
  const { user: currentUser } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const tabParam = searchParams.get('tab');

  const [activeTab, setActiveTab] = useState(tabParam || 'activity');

  useEffect(() => {
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [tabParam]);
  const [logs, setLogs] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [moduleFilter, setModuleFilter] = useState('all');
  const [actionFilter, setActionFilter] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // Selected Log for Deep Inspection Drawer / Modal
  const [selectedLog, setSelectedLog] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Tabs matching diagram
  const tabs = [
    { id: 'activity', label: 'Activity Logs', icon: Activity, desc: 'General CRUD operations & actions' },
    { id: 'deleted', label: 'Deleted Records', icon: Trash2, desc: 'Deleted entities & snapshots' },
    { id: 'updated', label: 'Updated Records', icon: RefreshCw, desc: 'Field-level before/after diffs' },
    { id: 'logins', label: 'Login History', icon: History, desc: 'Auth logins, logouts & device audits' },
    { id: 'errors', label: 'Error Logs', icon: AlertTriangle, desc: 'API exceptions & status failures' },
  ];

  // Fetch Logs
  const fetchLogs = async (page = 1) => {
    setLoading(true);
    try {
      const [logsRes, statsRes] = await Promise.all([
        auditService.getAuditLogs({
          tab: activeTab,
          module: moduleFilter,
          action: actionFilter,
          search: searchTerm,
          startDate,
          endDate,
          page,
          limit: 25,
        }),
        auditService.getAuditStats(),
      ]);

      if (logsRes.success) {
        setLogs(logsRes.data || []);
        setPagination(logsRes.pagination || { page: 1, totalPages: 1, total: 0 });
      }
      if (statsRes.success) {
        setStats(statsRes.data);
      }
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs(1);
  }, [activeTab, moduleFilter, actionFilter]);

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    setSearchParams({ tab: tabId });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchLogs(1);
  };

  const getActionColor = (action, status) => {
    if (status === 'FAILURE' || action === 'EXCEPTION' || action === 'LOGIN_FAILED') return { bg: '#fee2e2', text: '#dc2626', border: '#fca5a5' };
    if (action === 'DELETE') return { bg: '#ffe4e6', text: '#e11d48', border: '#fecdd3' };
    if (action === 'CREATE') return { bg: '#dcfce7', text: '#16a34a', border: '#bbf7d0' };
    if (action === 'UPDATE') return { bg: '#e0f2fe', text: '#0284c7', border: '#bae6fd' };
    if (action === 'LOGIN_SUCCESS') return { bg: '#f0fdf4', text: '#15803d', border: '#86efac' };
    return { bg: '#f1f5f9', text: '#475569', border: '#e2e8f0' };
  };

  const getModuleBadge = (mod) => {
    const map = {
      leads: { label: 'Leads CRM', color: '#1d4ed8', bg: '#eff6ff' },
      agent: { label: 'Agent Portal', color: '#7c3aed', bg: '#f5f3ff' },
      sales: { label: 'Sales Deals', color: '#0d9488', bg: '#f0fdfa' },
      inventory: { label: 'Inventory', color: '#b45309', bg: '#fffbeb' },
      materials: { label: 'Materials', color: '#c2410c', bg: '#fff7ed' },
      customers: { label: 'Customers', color: '#4338ca', bg: '#eef2ff' },
      rentals: { label: 'Rentals', color: '#0369a1', bg: '#f0f9ff' },
      maintenance: { label: 'Maintenance', color: '#4d7c0f', bg: '#f7fee7' },
      hr: { label: 'Workforce HR', color: '#be185d', bg: '#fdf2f8' },
      settings: { label: 'Settings', color: '#15803d', bg: '#f0fdf4' },
      users: { label: 'Access Control', color: '#6d28d9', bg: '#f5f3ff' },
      auth: { label: 'Authentication', color: '#334155', bg: '#f8fafc' },
    };
    return map[mod] || { label: mod?.toUpperCase() || 'SYSTEM', color: '#475569', bg: '#f1f5f9' };
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner - Rich Purple Theme */}
      <div
        style={{
          background: 'linear-gradient(135deg, #4a148c 0%, #6a1b9a 50%, #8e24aa 100%)',
          borderRadius: '20px',
          padding: '28px 32px',
          color: '#ffffff',
          boxShadow: '0 12px 36px rgba(74, 20, 140, 0.25)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '20px',
        }}
      >
        <div style={{ maxWidth: '650px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: 'rgba(255, 255, 255, 0.2)',
                backdropFilter: 'blur(8px)',
                fontSize: '0.78rem',
                fontWeight: '800',
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
              }}
            >
              <ShieldCheck size={14} />
              Module 15 • Security & Audit Governance
            </span>
          </div>
          <h1 style={{ margin: '0 0 6px', fontSize: '1.85rem', fontWeight: '800', letterSpacing: '-0.02em' }}>
            System Audit Logs & CRUD Tracker
          </h1>
          <p style={{ margin: 0, fontSize: '0.92rem', color: '#f3e5f5', lineHeight: 1.5 }}>
            Real-time immutable audit trail capturing every CRUD operation, before/after diffs, deleted entity snapshots, authentication sessions, and system exceptions across Krishna Valley ERP.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <a
            href={auditService.getExportUrl('csv', activeTab)}
            target="_blank"
            rel="noreferrer"
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              backgroundColor: 'rgba(255, 255, 255, 0.15)',
              border: '1px solid rgba(255, 255, 255, 0.3)',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.88rem',
              textDecoration: 'none',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
            }}
          >
            <Download size={16} />
            <span>Export CSV</span>
          </a>

          <button
            onClick={() => fetchLogs(pagination.page)}
            style={{
              padding: '10px 18px',
              borderRadius: '12px',
              backgroundColor: '#ffffff',
              border: 'none',
              color: '#4a148c',
              fontWeight: '800',
              fontSize: '0.88rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            }}
          >
            <RefreshCw size={16} />
            <span>Refresh Feed</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Bar */}
      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
          <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f3e8ff', color: '#7e22ce', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Activity size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Today's CRUD Operations</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>{stats.totalActivitiesToday || 0}</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#ffe4e6', color: '#e11d48', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Trash2 size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Deleted Records Vault</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#e11d48' }}>{stats.totalDeletedRecords || 0}</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#e0f2fe', color: '#0284c7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <RefreshCw size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Modified Record Diffs</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#0284c7' }}>{stats.totalUpdatedRecords || 0}</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#f0fdf4', color: '#16a34a', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <History size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Successful Logins Today</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#16a34a' }}>{stats.loginSuccessToday || 0}</div>
            </div>
          </div>

          <div style={{ backgroundColor: '#ffffff', padding: '18px 20px', borderRadius: '16px', border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '14px' }}>
            <div style={{ width: '44px', height: '44px', borderRadius: '12px', backgroundColor: '#fee2e2', color: '#dc2626', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <AlertTriangle size={22} />
            </div>
            <div>
              <div style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>System Errors Today</div>
              <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#dc2626' }}>{stats.totalErrorsToday || 0}</div>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div style={{ backgroundColor: '#ffffff', borderRadius: '18px', border: '1px solid #e2e8f0', padding: '24px', boxShadow: '0 2px 10px rgba(0,0,0,0.03)' }}>
        {/* Navigation Tabs */}
        <div style={{ display: 'flex', gap: '8px', borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', marginBottom: '20px', overflowX: 'auto' }}>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 18px',
                  borderRadius: '10px',
                  border: 'none',
                  backgroundColor: isActive ? '#f3e8ff' : 'transparent',
                  color: isActive ? '#6b21a8' : '#64748b',
                  fontWeight: isActive ? '800' : '600',
                  fontSize: '0.9rem',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  transition: 'all 0.15s ease',
                }}
              >
                <Icon size={17} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Filter Controls Bar */}
        <form onSubmit={handleSearchSubmit} style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '20px', alignItems: 'center' }}>
          <div style={{ flex: '1', minWidth: '220px', position: 'relative' }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            <input
              type="text"
              placeholder="Search by summary, username, resource or IP..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{ width: '100%', padding: '9px 12px 9px 36px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
          </div>

          <select
            value={moduleFilter}
            onChange={(e) => setModuleFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: '600' }}
          >
            <option value="all">All Modules</option>
            <option value="leads">Leads CRM</option>
            <option value="agent">Agent Portal</option>
            <option value="sales">Sales Deals</option>
            <option value="inventory">Inventory & Flats</option>
            <option value="materials">Materials & Stores</option>
            <option value="customers">Customers</option>
            <option value="rentals">Rentals</option>
            <option value="maintenance">Maintenance</option>
            <option value="hr">HR Workforce</option>
            <option value="settings">Settings</option>
            <option value="users">Access Control</option>
            <option value="auth">Auth & Logins</option>
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff', fontWeight: '600' }}
          >
            <option value="all">All Actions</option>
            <option value="CREATE">CREATE</option>
            <option value="UPDATE">UPDATE</option>
            <option value="DELETE">DELETE</option>
            <option value="LOGIN_SUCCESS">LOGIN_SUCCESS</option>
            <option value="LOGIN_FAILED">LOGIN_FAILED</option>
            <option value="EXCEPTION">EXCEPTION</option>
          </select>

          <button
            type="submit"
            style={{
              padding: '9px 18px',
              borderRadius: '10px',
              backgroundColor: '#6a1b9a',
              color: '#ffffff',
              border: 'none',
              fontWeight: '700',
              fontSize: '0.85rem',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <Filter size={15} />
            <span>Filter</span>
          </button>
        </form>

        {/* Audit Table Feed */}
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#64748b' }}>
            <Loader2 size={30} style={{ animation: 'spin 1s linear infinite', margin: '0 auto 10px', color: '#6a1b9a' }} />
            <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: '600' }}>Loading audit records...</p>
          </div>
        ) : logs.length === 0 ? (
          <div style={{ padding: '48px', textAlign: 'center', color: '#64748b', border: '1px dashed #cbd5e1', borderRadius: '12px' }}>
            <Info size={32} style={{ margin: '0 auto 8px', color: '#94a3b8' }} />
            <p style={{ margin: 0, fontSize: '0.95rem', fontWeight: '600' }}>No audit records found matching your filters.</p>
          </div>
        ) : activeTab === 'deleted' ? (
          /* ========================================================= */
          /* DEDICATED DELETED RECORDS VAULT TABLE                     */
          /* ========================================================= */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#fff1f2', borderBottom: '1px solid #fecdd3', color: '#9f1239', fontWeight: '700' }}>
                  <th style={{ padding: '12px 14px' }}>Deletion Time</th>
                  <th style={{ padding: '12px 14px' }}>Deleted Entity / Lead</th>
                  <th style={{ padding: '12px 14px' }}>Contact & Mobile</th>
                  <th style={{ padding: '12px 14px' }}>Module</th>
                  <th style={{ padding: '12px 14px' }}>Captured Record Summary</th>
                  <th style={{ padding: '12px 14px' }}>Deleted By</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>View Archive</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const snapshot = log.deletionDetails?.fullDeletedSnapshot || {};
                  const entityName = snapshot.name || snapshot.title || snapshot.flatNumber || snapshot.customerName || log.resourceName || 'Unknown Entity';
                  const entityMobile = snapshot.mobileNo || snapshot.phone || snapshot.customerMobile || (log.resourceName?.includes('(') ? log.resourceName.split('(')[1]?.replace(')', '') : '');
                  const entityEmail = snapshot.email || '';
                  const budgetVal = snapshot.budget || snapshot.price || snapshot.dealValue || null;
                  const reqVal = snapshot.requirement || snapshot.bhkType || '';

                  return (
                    <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9', backgroundColor: '#fffdfd' }}>
                      {/* Deletion Time */}
                      <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#9f1239' }}>
                          {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Deleted Entity / Lead Name */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '800', color: '#881337', fontSize: '0.92rem' }}>
                          {entityName}
                        </div>
                        {entityEmail && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                            {entityEmail}
                          </div>
                        )}
                      </td>

                      {/* Contact & Mobile */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        {entityMobile ? (
                          <span
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '4px',
                              padding: '3px 8px',
                              borderRadius: '6px',
                              backgroundColor: '#eff6ff',
                              color: '#1d4ed8',
                              fontWeight: '700',
                              fontSize: '0.78rem',
                              border: '1px solid #bfdbfe',
                            }}
                          >
                            {entityMobile}
                          </span>
                        ) : (
                          <span style={{ color: '#94a3b8', fontSize: '0.78rem' }}>No Phone</span>
                        )}
                      </td>

                      {/* Module */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: '#ffe4e6',
                            color: '#e11d48',
                            fontWeight: '800',
                            fontSize: '0.72rem',
                            textTransform: 'uppercase',
                          }}
                        >
                          {log.module}
                        </span>
                      </td>

                      {/* Captured Record Summary */}
                      <td style={{ padding: '12px 14px', maxWidth: '320px' }}>
                        <div style={{ fontSize: '0.8rem', color: '#1e293b', lineHeight: 1.35 }}>
                          {budgetVal && <strong>Budget: ₹{Number(budgetVal).toLocaleString('en-IN')} • </strong>}
                          {reqVal && <span>Req: {reqVal} • </span>}
                          <span style={{ color: '#64748b' }}>{log.summary}</span>
                        </div>
                      </td>

                      {/* Deleted By */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>
                          {log.performedBy?.name || log.performedBy?.username || 'Admin'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          @{log.performedBy?.username || 'admin'}
                        </div>
                      </td>

                      {/* View Archive Button */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailModalOpen(true);
                          }}
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#ffe4e6',
                            color: '#e11d48',
                            border: '1px solid #fecdd3',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={13} />
                          <span>View Archive</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          /* ========================================================= */
          /* GENERAL ACTIVITY & CRUD LOGS TABLE                        */
          /* ========================================================= */
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', color: '#475569', fontWeight: '700' }}>
                  <th style={{ padding: '12px 14px' }}>Timestamp</th>
                  <th style={{ padding: '12px 14px' }}>Action</th>
                  <th style={{ padding: '12px 14px' }}>Module</th>
                  <th style={{ padding: '12px 14px' }}>Activity Summary</th>
                  <th style={{ padding: '12px 14px' }}>Performed By</th>
                  <th style={{ padding: '12px 14px' }}>IP / Device</th>
                  <th style={{ padding: '12px 14px', textAlign: 'right' }}>Inspect</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => {
                  const actStyle = getActionColor(log.action, log.status);
                  const modBadge = getModuleBadge(log.module);

                  return (
                    <tr key={log._id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      {/* Timestamp */}
                      <td style={{ padding: '12px 14px', color: '#475569', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#1e293b' }}>
                          {new Date(log.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#94a3b8' }}>
                          {new Date(log.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                        </div>
                      </td>

                      {/* Action */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: actStyle.bg,
                            color: actStyle.text,
                            border: `1px solid ${actStyle.border}`,
                            fontWeight: '800',
                            fontSize: '0.72rem',
                            letterSpacing: '0.03em',
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      {/* Module */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <span
                          style={{
                            display: 'inline-block',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            backgroundColor: modBadge.bg,
                            color: modBadge.color,
                            fontWeight: '700',
                            fontSize: '0.75rem',
                          }}
                        >
                          {modBadge.label}
                        </span>
                      </td>

                      {/* Summary */}
                      <td style={{ padding: '12px 14px', maxWidth: '340px' }}>
                        <div style={{ fontWeight: '600', color: '#0f172a', lineHeight: 1.35 }}>
                          {log.summary}
                        </div>
                        {log.resourceName && log.resourceName !== log.summary && (
                          <div style={{ fontSize: '0.74rem', color: '#64748b', marginTop: '2px' }}>
                            Resource: <strong style={{ color: '#334155' }}>{log.resourceName}</strong>
                          </div>
                        )}
                      </td>

                      {/* Performed By */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap' }}>
                        <div style={{ fontWeight: '700', color: '#0f172a' }}>
                          {log.performedBy?.name || log.performedBy?.username || 'System'}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#64748b' }}>
                          @{log.performedBy?.username || 'system'} • <span style={{ textTransform: 'capitalize', color: '#4338ca', fontWeight: '600' }}>{log.performedBy?.role || 'automated'}</span>
                        </div>
                      </td>

                      {/* IP / Device */}
                      <td style={{ padding: '12px 14px', whiteSpace: 'nowrap', color: '#64748b', fontSize: '0.78rem' }}>
                        <div>{log.ipAddress || '127.0.0.1'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#94a3b8', maxWidth: '140px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {log.httpMethod ? `${log.httpMethod} ${log.endpoint || ''}` : log.userAgent?.slice(0, 24)}
                        </div>
                      </td>

                      {/* Inspect Button */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <button
                          onClick={() => {
                            setSelectedLog(log);
                            setDetailModalOpen(true);
                          }}
                          title="Inspect raw audit payload & diffs"
                          style={{
                            padding: '6px 12px',
                            borderRadius: '8px',
                            backgroundColor: '#f3e8ff',
                            color: '#6b21a8',
                            border: '1px solid #e9d5ff',
                            fontWeight: '700',
                            fontSize: '0.75rem',
                            cursor: 'pointer',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '4px',
                          }}
                        >
                          <Eye size={13} />
                          <span>Inspect</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {pagination.totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #f1f5f9' }}>
            <div style={{ fontSize: '0.82rem', color: '#64748b' }}>
              Showing {logs.length} of {pagination.total} audit records (Page {pagination.page} of {pagination.totalPages})
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                disabled={pagination.page <= 1}
                onClick={() => fetchLogs(pagination.page - 1)}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', fontSize: '0.8rem', cursor: pagination.page <= 1 ? 'not-allowed' : 'pointer' }}
              >
                Previous
              </button>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => fetchLogs(pagination.page + 1)}
                style={{ padding: '6px 14px', borderRadius: '8px', border: '1px solid #cbd5e1', backgroundColor: '#ffffff', fontWeight: '600', fontSize: '0.8rem', cursor: pagination.page >= pagination.totalPages ? 'not-allowed' : 'pointer' }}
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Deep Inspection Modal */}
      {detailModalOpen && selectedLog && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            backgroundColor: 'rgba(15, 23, 42, 0.65)',
            backdropFilter: 'blur(4px)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '20px',
          }}
        >
          <div
            style={{
              backgroundColor: '#ffffff',
              borderRadius: '20px',
              maxWidth: '750px',
              width: '100%',
              maxHeight: '85vh',
              overflowY: 'auto',
              boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Modal Header */}
            <div style={{ padding: '20px 24px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#f8fafc', borderTopLeftRadius: '20px', borderTopRightRadius: '20px' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                  <span style={{ padding: '3px 8px', borderRadius: '6px', backgroundColor: '#f3e8ff', color: '#6b21a8', fontWeight: '800', fontSize: '0.75rem' }}>
                    {selectedLog.action}
                  </span>
                  <span style={{ fontWeight: '800', fontSize: '1.1rem', color: '#0f172a' }}>
                    Audit Record Inspector
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                  ID: {selectedLog._id} • {new Date(selectedLog.timestamp).toLocaleString('en-IN')}
                </div>
              </div>
              <button
                onClick={() => setDetailModalOpen(false)}
                style={{ padding: '6px', borderRadius: '8px', border: 'none', backgroundColor: '#e2e8f0', cursor: 'pointer', display: 'flex' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              {/* Summary & Actor Card */}
              <div style={{ backgroundColor: '#f8fafc', padding: '16px', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
                <div style={{ fontSize: '0.95rem', fontWeight: '700', color: '#1e293b', marginBottom: '8px' }}>
                  {selectedLog.summary}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '10px', fontSize: '0.8rem' }}>
                  <div><span style={{ color: '#64748b' }}>User:</span> <strong>{selectedLog.performedBy?.name} (@{selectedLog.performedBy?.username})</strong></div>
                  <div><span style={{ color: '#64748b' }}>Role:</span> <strong>{selectedLog.performedBy?.role}</strong></div>
                  <div><span style={{ color: '#64748b' }}>IP Address:</span> <strong>{selectedLog.ipAddress}</strong></div>
                  <div><span style={{ color: '#64748b' }}>Module:</span> <strong>{selectedLog.module}</strong></div>
                </div>
              </div>

              {/* Dedicated Deleted Entity Card with Name, Mobile, Email, Budget */}
              {selectedLog.deletionDetails?.isDeletedRecord && (
                <div style={{ backgroundColor: '#fff1f2', border: '1px solid #fecdd3', padding: '18px', borderRadius: '14px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                    <Trash2 size={18} style={{ color: '#e11d48' }} />
                    <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: '800', color: '#9f1239' }}>
                      Deleted Record Identity & Snapshot
                    </h4>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px', marginBottom: '14px' }}>
                    <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                      <div style={{ fontSize: '0.72rem', color: '#9f1239', fontWeight: '700', textTransform: 'uppercase' }}>Entity / Lead Name</div>
                      <div style={{ fontSize: '1rem', fontWeight: '800', color: '#881337', marginTop: '2px' }}>
                        {selectedLog.deletionDetails?.fullDeletedSnapshot?.name || selectedLog.deletionDetails?.fullDeletedSnapshot?.title || selectedLog.deletionDetails?.fullDeletedSnapshot?.flatNumber || selectedLog.resourceName || 'Unknown'}
                      </div>
                    </div>

                    <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                      <div style={{ fontSize: '0.72rem', color: '#9f1239', fontWeight: '700', textTransform: 'uppercase' }}>Contact Mobile Number</div>
                      <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1d4ed8', marginTop: '2px' }}>
                        {selectedLog.deletionDetails?.fullDeletedSnapshot?.mobileNo || selectedLog.deletionDetails?.fullDeletedSnapshot?.phone || 'No Phone Registered'}
                      </div>
                    </div>

                    {(selectedLog.deletionDetails?.fullDeletedSnapshot?.email || selectedLog.deletionDetails?.fullDeletedSnapshot?.budget) && (
                      <div style={{ backgroundColor: '#ffffff', padding: '10px 12px', borderRadius: '8px', border: '1px solid #fecdd3' }}>
                        <div style={{ fontSize: '0.72rem', color: '#9f1239', fontWeight: '700', textTransform: 'uppercase' }}>Budget / Price Value</div>
                        <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#0d904f', marginTop: '2px' }}>
                          {selectedLog.deletionDetails?.fullDeletedSnapshot?.budget ? `₹${Number(selectedLog.deletionDetails.fullDeletedSnapshot.budget).toLocaleString('en-IN')}` : (selectedLog.deletionDetails?.fullDeletedSnapshot?.price ? `₹${Number(selectedLog.deletionDetails.fullDeletedSnapshot.price).toLocaleString('en-IN')}` : 'N/A')}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ fontSize: '0.8rem', color: '#881337', marginBottom: '8px', fontWeight: '600' }}>
                    Deletion Reason: {selectedLog.deletionDetails.reason || 'User initiated deletion'}
                  </div>
                  <pre style={{ margin: 0, padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fecdd3', fontSize: '0.75rem', maxHeight: '180px', overflowY: 'auto' }}>
                    {JSON.stringify(selectedLog.deletionDetails.fullDeletedSnapshot || selectedLog.changes?.previousState || {}, null, 2)}
                  </pre>
                </div>
              )}

              {/* Error Stack Trace if error */}
              {selectedLog.errorDetails?.message && (
                <div style={{ backgroundColor: '#fef2f2', border: '1px solid #fca5a5', padding: '16px', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 6px', fontSize: '0.9rem', fontWeight: '800', color: '#991b1b' }}>
                    Exception Diagnostics
                  </h4>
                  <div style={{ fontSize: '0.82rem', color: '#b91c1c', fontWeight: '600', marginBottom: '8px' }}>
                    {selectedLog.errorDetails.message}
                  </div>
                  {selectedLog.errorDetails.stack && (
                    <pre style={{ margin: 0, padding: '12px', backgroundColor: '#ffffff', borderRadius: '8px', border: '1px solid #fca5a5', fontSize: '0.72rem', color: '#7f1d1d', maxHeight: '180px', overflowY: 'auto' }}>
                      {selectedLog.errorDetails.stack}
                    </pre>
                  )}
                </div>
              )}

              {/* Raw JSON Snapshot */}
              <div>
                <h4 style={{ margin: '0 0 8px', fontSize: '0.85rem', fontWeight: '700', color: '#475569' }}>
                  Raw Audit Payload
                </h4>
                <pre style={{ margin: 0, padding: '14px', backgroundColor: '#0f172a', color: '#38bdf8', borderRadius: '10px', fontSize: '0.75rem', maxHeight: '200px', overflowY: 'auto' }}>
                  {JSON.stringify(selectedLog, null, 2)}
                </pre>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{ padding: '16px 24px', borderTop: '1px solid #e2e8f0', display: 'flex', justifyContent: 'flex-end', backgroundColor: '#f8fafc', borderBottomLeftRadius: '20px', borderBottomRightRadius: '20px' }}>
              <button
                onClick={() => setDetailModalOpen(false)}
                style={{ padding: '8px 18px', borderRadius: '8px', backgroundColor: '#6a1b9a', color: '#ffffff', border: 'none', fontWeight: '700', fontSize: '0.85rem', cursor: 'pointer' }}
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AuditLogsPage;
