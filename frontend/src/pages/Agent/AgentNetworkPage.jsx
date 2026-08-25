import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../../services/agentService.js';
import {
  Users, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Award, Wallet, TrendingUp, Phone, Mail, Building2, MapPin,
  CheckCircle2, Clock, XCircle, Eye, ArrowUpDown, UserCheck,
  Shield, Star, Briefcase, DollarSign, BarChart3, Hash, ExternalLink
} from 'lucide-react';

export const AgentNetworkPage = () => {
  const navigate = useNavigate();
  const [agents, setAgents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [tierFilter, setTierFilter] = useState('all');
  const [cityFilter, setCityFilter] = useState('all');
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState('desc');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ total: 0, totalPages: 1 });
  const [networkKPIs, setNetworkKPIs] = useState({});
  const [selectedAgent, setSelectedAgent] = useState(null);
  const LIMIT = 20;

  const fetchAgents = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: LIMIT, sortBy, sortOrder };
      if (search) params.search = search;
      if (statusFilter !== 'all') params.status = statusFilter;
      if (tierFilter !== 'all') params.tier = tierFilter;
      if (cityFilter !== 'all') params.city = cityFilter;

      const res = await agentService.getAllAgents(params);
      if (res.success) {
        setAgents(res.data || []);
        setPagination(res.pagination || { total: 0, totalPages: 1 });
        setNetworkKPIs(res.networkKPIs || {});
      }
    } catch (err) {
      console.error('Error fetching agents:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search, statusFilter, tierFilter, cityFilter, sortBy, sortOrder]);

  useEffect(() => { fetchAgents(); }, [fetchAgents]);

  // Debounced search
  const [searchInput, setSearchInput] = useState('');
  useEffect(() => {
    const timer = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchInput]);

  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
    setPage(1);
  };

  const tierColor = (tier) => {
    switch (tier) {
      case 'Platinum': return { bg: '#eff6ff', color: '#1d4ed8', border: '#bfdbfe' };
      case 'Gold': return { bg: '#fffbeb', color: '#b45309', border: '#fde68a' };
      case 'Silver': return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      default: return { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' };
    }
  };

  const statusBadge = (status) => {
    if (status === 'active') return { bg: '#dcfce7', color: '#15803d', label: 'Active' };
    if (status === 'inactive') return { bg: '#fee2e2', color: '#b91c1c', label: 'Inactive' };
    if (status === 'suspended') return { bg: '#fef3c7', color: '#92400e', label: 'Suspended' };
    return { bg: '#f1f5f9', color: '#64748b', label: status };
  };

  const kpiCards = [
    { label: 'Total Channel Partners', value: networkKPIs.totalAgents || 0, icon: Users, color: '#1a73e8', bg: '#eff6ff' },
    { label: 'Active Partners', value: networkKPIs.activeAgents || 0, icon: UserCheck, color: '#15803d', bg: '#f0fdf4' },
    { label: 'Total Network Earnings', value: `₹${((networkKPIs.totalEarnings || 0) / 100000).toFixed(1)}L`, icon: TrendingUp, color: '#7c3aed', bg: '#faf5ff' },
    { label: 'Outstanding Wallet', value: `₹${((networkKPIs.totalWallet || 0) / 100000).toFixed(1)}L`, icon: Wallet, color: '#0d9488', bg: '#f0fdfa' },
    { label: 'Total Matured Visits', value: networkKPIs.totalMatured || 0, icon: CheckCircle2, color: '#ea580c', bg: '#fff7ed' },
    { label: 'Avg Commission Rate', value: `${(networkKPIs.avgCommRate || 2).toFixed(1)}%`, icon: BarChart3, color: '#be185d', bg: '#fdf2f8' },
  ];

  return (
    <div style={{ padding: '28px 32px', fontFamily: "'Inter', sans-serif", maxWidth: '1600px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.65rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>
            🤝 Channel Partner Network
          </h1>
          <p style={{ margin: '4px 0 0', fontSize: '0.88rem', color: '#64748b', fontWeight: '500' }}>
            {pagination.total} registered agents across {new Set(agents.map(a => a.agentProfile?.city).filter(Boolean)).size}+ cities • Manage commissions, tiers & verifications
          </p>
        </div>
        <button
          onClick={() => { setPage(1); fetchAgents(); }}
          style={{
            padding: '10px 20px', borderRadius: '10px', border: 'none',
            background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
            color: '#fff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: '6px',
            boxShadow: '0 4px 12px rgba(26,115,232,0.3)',
          }}
        >
          <RefreshCw size={14} /> Refresh Network
        </button>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6, 1fr)', gap: '14px', marginBottom: '24px' }}>
        {kpiCards.map((kpi, i) => (
          <div key={i} style={{
            background: '#ffffff', borderRadius: '14px', padding: '18px 16px',
            boxShadow: '0 1px 8px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '34px', height: '34px', borderRadius: '10px',
                backgroundColor: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <kpi.icon size={17} style={{ color: kpi.color }} />
              </div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600', lineHeight: '1.2' }}>{kpi.label}</span>
            </div>
            <span style={{ fontSize: '1.35rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.02em' }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '18px',
        background: '#ffffff', borderRadius: '14px', padding: '14px 18px',
        boxShadow: '0 1px 6px rgba(0,0,0,0.05)', border: '1px solid #f1f5f9',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          <input
            type="text"
            placeholder="Search by name, code, agency, mobile..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: '100%', padding: '9px 14px 9px 36px', borderRadius: '10px',
              border: '1px solid #e2e8f0', fontSize: '0.84rem', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#334155', cursor: 'pointer', fontWeight: '600' }}
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>

        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#334155', cursor: 'pointer', fontWeight: '600' }}
        >
          <option value="all">All Tiers</option>
          <option value="Platinum">💎 Platinum</option>
          <option value="Gold">🥇 Gold</option>
          <option value="Silver">🥈 Silver</option>
          <option value="Standard">📋 Standard</option>
        </select>

        <select
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          style={{ padding: '9px 14px', borderRadius: '10px', border: '1px solid #e2e8f0', fontSize: '0.82rem', color: '#334155', cursor: 'pointer', fontWeight: '600' }}
        >
          <option value="all">All Cities</option>
          {['Mathura', 'Vrindavan', 'Agra', 'Delhi NCR', 'Noida', 'Gurugram', 'Faridabad', 'Aligarh', 'Bharatpur', 'Hathras'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>

        <span style={{ fontSize: '0.78rem', color: '#94a3b8', fontWeight: '600', marginLeft: 'auto' }}>
          Page {pagination.page || page} of {pagination.totalPages || 1} • Showing {agents.length} of {pagination.total}
        </span>
      </div>

      {/* Agents Table */}
      <div style={{
        background: '#ffffff', borderRadius: '16px', overflow: 'hidden',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)', border: '1px solid #f1f5f9',
      }}>
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: '38px', height: '38px', border: '3px solid #e2e8f0', borderTopColor: '#1a73e8', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#64748b', fontSize: '0.88rem' }}>Loading agent network...</p>
          </div>
        ) : agents.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <Users size={40} style={{ color: '#cbd5e1', marginBottom: '12px' }} />
            <h4 style={{ margin: 0, color: '#334155' }}>No agents found</h4>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', marginTop: '4px' }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#64748b', textAlign: 'left' }}>
                  <th style={{ padding: '13px 16px', fontWeight: '700', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Agent <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ padding: '13px 16px', fontWeight: '700' }}>Agency & Code</th>
                  <th style={{ padding: '13px 16px', fontWeight: '700' }}>Tier</th>
                  <th style={{ padding: '13px 16px', fontWeight: '700' }}>City</th>
                  <th style={{ padding: '13px 16px', fontWeight: '700', cursor: 'pointer' }} onClick={() => handleSort('commissionRate')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Comm % <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ padding: '13px 16px', fontWeight: '700', cursor: 'pointer' }} onClick={() => handleSort('walletBalance')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Wallet <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ padding: '13px 16px', fontWeight: '700', cursor: 'pointer' }} onClick={() => handleSort('totalEarned')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Total Earned <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ padding: '13px 16px', fontWeight: '700' }}>Leads</th>
                  <th style={{ padding: '13px 16px', fontWeight: '700' }}>Visits</th>
                  <th style={{ padding: '13px 16px', fontWeight: '700' }}>Status</th>
                  <th style={{ padding: '13px 16px', fontWeight: '700', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {agents.map((agent) => {
                  const ap = agent.agentProfile || {};
                  const tc = tierColor(ap.tier);
                  const sb = statusBadge(agent.status);

                  return (
                    <tr
                      key={agent._id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#fafbfd')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => setSelectedAgent(selectedAgent?._id === agent._id ? null : agent)}
                    >
                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '36px', height: '36px', borderRadius: '10px',
                            background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#fff', fontWeight: '800', fontSize: '0.78rem',
                            flexShrink: 0,
                          }}>
                            {(agent.firstName?.[0] || '').toUpperCase()}{(agent.lastName?.[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '700', color: '#0f172a', fontSize: '0.84rem' }}>
                              {agent.firstName} {agent.lastName}
                            </div>
                            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                              <Phone size={10} style={{ marginRight: '2px' }} />{agent.mobileNo || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ fontWeight: '600', color: '#334155', fontSize: '0.82rem' }}>{ap.agencyName || '—'}</div>
                        <div style={{ fontSize: '0.72rem', color: '#1a73e8', fontWeight: '700' }}>
                          <Hash size={10} style={{ marginRight: '1px' }} />{ap.agentCode || '—'}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 10px', borderRadius: '20px',
                          fontSize: '0.72rem', fontWeight: '800',
                          backgroundColor: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                        }}>
                          <Star size={10} /> {ap.tier || 'Standard'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', color: '#475569', fontWeight: '600' }}>
                          <MapPin size={11} /> {ap.city || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: '800', color: '#7c3aed', fontSize: '0.88rem' }}>
                          {ap.commissionRate || 2}%
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: '800', color: '#0d9488', fontSize: '0.88rem' }}>
                          ₹{(ap.walletBalance || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{ fontWeight: '700', color: '#334155', fontSize: '0.84rem' }}>
                          ₹{(ap.totalEarned || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155' }}>{agent.leadStats?.total || 0}</span>
                          {(agent.leadStats?.pending || 0) > 0 && (
                            <span style={{ fontSize: '0.68rem', color: '#b45309', fontWeight: '700' }}>
                              {agent.leadStats.pending} pending
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <div style={{ display: 'flex', gap: '4px', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155' }}>{agent.visitStats?.total || 0}</span>
                          {(agent.visitStats?.approved || 0) > 0 && (
                            <span style={{ fontSize: '0.68rem', color: '#15803d', fontWeight: '700' }}>
                              {agent.visitStats.approved} approved
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '14px 16px' }}>
                        <span style={{
                          padding: '3px 8px', borderRadius: '8px',
                          fontSize: '0.72rem', fontWeight: '700',
                          backgroundColor: sb.bg, color: sb.color,
                        }}>
                          {sb.label}
                        </span>
                      </td>

                      <td style={{ padding: '14px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/agent-profile/${agent._id}`);
                            }}
                            title="Open full agent profile with leads, visits & approvals"
                            style={{
                              padding: '5px 10px', borderRadius: '8px',
                              background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
                              color: '#fff', border: 'none',
                              fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                              boxShadow: '0 2px 6px rgba(26,115,232,0.3)',
                            }}
                          >
                            <ExternalLink size={11} /> Profile
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAgent(selectedAgent?._id === agent._id ? null : agent);
                            }}
                            style={{
                              padding: '5px 10px', borderRadius: '8px',
                              backgroundColor: selectedAgent?._id === agent._id ? '#334155' : '#f1f5f9',
                              color: selectedAgent?._id === agent._id ? '#fff' : '#475569',
                              border: '1px solid ' + (selectedAgent?._id === agent._id ? '#334155' : '#cbd5e1'),
                              fontSize: '0.74rem', fontWeight: '600', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                            }}
                          >
                            <Eye size={11} /> {selectedAgent?._id === agent._id ? 'Close' : 'Quick'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '16px 18px', borderTop: '1px solid #f1f5f9',
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                backgroundColor: page <= 1 ? '#f8fafc' : '#fff', color: page <= 1 ? '#cbd5e1' : '#334155',
                fontSize: '0.82rem', fontWeight: '600', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <ChevronLeft size={14} /> Prev
            </button>

            {Array.from({ length: Math.min(7, pagination.totalPages) }, (_, i) => {
              let pg;
              if (pagination.totalPages <= 7) {
                pg = i + 1;
              } else if (page <= 4) {
                pg = i + 1;
              } else if (page >= pagination.totalPages - 3) {
                pg = pagination.totalPages - 6 + i;
              } else {
                pg = page - 3 + i;
              }
              return (
                <button
                  key={pg}
                  onClick={() => setPage(pg)}
                  style={{
                    padding: '7px 12px', borderRadius: '8px',
                    border: pg === page ? '1.5px solid #1a73e8' : '1px solid #e2e8f0',
                    backgroundColor: pg === page ? '#eff6ff' : '#fff',
                    color: pg === page ? '#1a73e8' : '#475569',
                    fontSize: '0.82rem', fontWeight: pg === page ? '800' : '600',
                    cursor: 'pointer', minWidth: '36px',
                  }}
                >
                  {pg}
                </button>
              );
            })}

            <button
              onClick={() => setPage(p => Math.min(pagination.totalPages, p + 1))}
              disabled={page >= pagination.totalPages}
              style={{
                padding: '7px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                backgroundColor: page >= pagination.totalPages ? '#f8fafc' : '#fff',
                color: page >= pagination.totalPages ? '#cbd5e1' : '#334155',
                fontSize: '0.82rem', fontWeight: '600',
                cursor: page >= pagination.totalPages ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              Next <ChevronRight size={14} />
            </button>
          </div>
        )}
      </div>

      {/* Agent Detail Card (Expanded) */}
      {selectedAgent && (
        <div style={{
          marginTop: '20px', background: '#ffffff', borderRadius: '16px',
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', border: '1px solid #e2e8f0',
          padding: '24px', animation: 'fadeIn 0.3s ease',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '14px',
                background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#fff', fontWeight: '800', fontSize: '1.1rem',
              }}>
                {(selectedAgent.firstName?.[0] || '').toUpperCase()}{(selectedAgent.lastName?.[0] || '').toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>
                  {selectedAgent.firstName} {selectedAgent.lastName}
                </h3>
                <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.82rem', color: '#1a73e8', fontWeight: '700' }}>
                    {selectedAgent.agentProfile?.agentCode}
                  </span>
                  <span style={{ fontSize: '0.78rem', color: '#64748b' }}>•</span>
                  <span style={{ fontSize: '0.82rem', color: '#475569', fontWeight: '600' }}>
                    {selectedAgent.agentProfile?.agencyName}
                  </span>
                  {selectedAgent.agentProfile?.tier && (() => {
                    const tc = tierColor(selectedAgent.agentProfile.tier);
                    return (
                      <span style={{
                        padding: '2px 8px', borderRadius: '12px', fontSize: '0.72rem', fontWeight: '800',
                        backgroundColor: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                      }}>
                        ⭐ {selectedAgent.agentProfile.tier}
                      </span>
                    );
                  })()}
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => navigate(`/agent-profile/${selectedAgent._id}`)}
                style={{
                  padding: '8px 16px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #1a73e8, #1557b0)',
                  color: '#fff', fontSize: '0.82rem', fontWeight: '700', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                  boxShadow: '0 3px 10px rgba(26,115,232,0.3)',
                }}
              >
                <ExternalLink size={14} /> Open Full Profile & Approvals
              </button>
              <button
                onClick={() => setSelectedAgent(null)}
                style={{
                  padding: '6px 14px', borderRadius: '8px', border: '1px solid #e2e8f0',
                  backgroundColor: '#f8fafc', color: '#64748b', fontSize: '0.78rem',
                  fontWeight: '600', cursor: 'pointer',
                }}
              >
                ✕ Close
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
            {[
              { label: 'Commission Rate', value: `${selectedAgent.agentProfile?.commissionRate || 2}%`, icon: DollarSign, color: '#7c3aed' },
              { label: 'Wallet Balance', value: `₹${(selectedAgent.agentProfile?.walletBalance || 0).toLocaleString('en-IN')}`, icon: Wallet, color: '#0d9488' },
              { label: 'Total Earned', value: `₹${(selectedAgent.agentProfile?.totalEarned || 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: '#15803d' },
              { label: 'Matured Visits', value: selectedAgent.agentProfile?.maturedLeadsCount || 0, icon: CheckCircle2, color: '#ea580c' },
            ].map((metric, i) => (
              <div key={i} style={{
                padding: '16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '6px' }}>
                  <metric.icon size={15} style={{ color: metric.color }} />
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '600' }}>{metric.label}</span>
                </div>
                <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#0f172a' }}>{metric.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
            <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>📋 Contact Details</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.82rem', color: '#475569' }}>
                <span><Phone size={12} style={{ marginRight: '4px' }} />{selectedAgent.mobileNo || '—'}</span>
                <span><Mail size={12} style={{ marginRight: '4px' }} />{selectedAgent.email || '—'}</span>
                <span><MapPin size={12} style={{ marginRight: '4px' }} />{selectedAgent.agentProfile?.city || '—'}</span>
                <span><Shield size={12} style={{ marginRight: '4px' }} />RERA: {selectedAgent.agentProfile?.reraNumber || '—'}</span>
              </div>
            </div>
            <div style={{ padding: '14px 16px', borderRadius: '12px', backgroundColor: '#f8fafc', border: '1px solid #e2e8f0' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '0.82rem', fontWeight: '700', color: '#334155' }}>🏦 Bank Details</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', fontSize: '0.82rem', color: '#475569' }}>
                <span><Briefcase size={12} style={{ marginRight: '4px' }} />{selectedAgent.agentProfile?.bankDetails?.bankName || '—'}</span>
                <span>A/C: {selectedAgent.agentProfile?.bankDetails?.accountNumber || '—'}</span>
                <span>IFSC: {selectedAgent.agentProfile?.bankDetails?.ifscCode || '—'}</span>
                <span>UPI: {selectedAgent.agentProfile?.bankDetails?.upiId || '—'}</span>
              </div>
            </div>
          </div>

          {/* Lead and Visit Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: '12px', marginTop: '16px' }}>
            {[
              { label: 'Total Leads', value: selectedAgent.leadStats?.total || 0, bg: '#eff6ff', color: '#1a73e8' },
              { label: 'Pending Approval', value: selectedAgent.leadStats?.pending || 0, bg: '#fef3c7', color: '#b45309' },
              { label: 'Total Visits', value: selectedAgent.visitStats?.total || 0, bg: '#f0fdf4', color: '#15803d' },
              { label: 'Approved Visits', value: selectedAgent.visitStats?.approved || 0, bg: '#dcfce7', color: '#166534' },
              { label: 'Pending Visits', value: selectedAgent.visitStats?.pending || 0, bg: '#fef3c7', color: '#92400e' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '12px', borderRadius: '10px', backgroundColor: s.bg, textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: '600', color: s.color, opacity: 0.8 }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-6px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default AgentNetworkPage;
