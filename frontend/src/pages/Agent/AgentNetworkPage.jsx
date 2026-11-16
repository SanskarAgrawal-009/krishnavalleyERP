import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { agentService } from '../../services/agentService.js';
import { useAuth } from '../../context/AuthContext.jsx';
import { AddAgentModal } from '../../components/agents/AddAgentModal.jsx';
import {
  Users, Search, Filter, RefreshCw, ChevronLeft, ChevronRight,
  Award, Wallet, TrendingUp, Phone, Mail, Building2, MapPin,
  CheckCircle2, Clock, XCircle, Eye, ArrowUpDown, UserCheck,
  Shield, Star, Briefcase, DollarSign, BarChart3, Hash, ExternalLink, UserPlus
} from 'lucide-react';

export const AgentNetworkPage = () => {
  const { isSuperAdmin, hasPermission, hasAnyPermission } = useAuth();
  const canCreateAgent = isSuperAdmin || hasAnyPermission(['agent:create', 'agent:manage', 'crm:create', 'crm:manage', 'users:manage']);
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
  const [showAddAgent, setShowAddAgent] = useState(false);
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
      case 'Platinum': return { bg: '#e8f2e5', color: '#17652f', border: '#cde4c9' };
      case 'Gold': return { bg: '#f8fafc', color: '#334155', border: '#cbd5e1' };
      case 'Silver': return { bg: '#f1f5f9', color: '#475569', border: '#cbd5e1' };
      default: return { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb' };
    }
  };

  const statusBadge = (status) => {
    if (status === 'active') return { bg: '#e8f2e5', color: '#17652f', label: 'Active' };
    if (status === 'inactive') return { bg: '#f1f5f9', color: '#0f172a', label: 'Inactive' };
    if (status === 'suspended') return { bg: '#f1f5f9', color: '#334155', label: 'Suspended' };
    return { bg: '#f1f5f9', color: '#64748b', label: status };
  };

  const kpiCards = [
    { label: 'Channel partners', value: networkKPIs.totalAgents || 0, icon: Users, color: '#17652f', bg: '#e8f2e5' },
    { label: 'Active partners', value: networkKPIs.activeAgents || 0, icon: UserCheck, color: '#17652f', bg: '#e8f2e5' },
    { label: 'Total earnings', value: `₹${((networkKPIs.totalEarnings || 0) / 100000).toFixed(1)}L`, icon: TrendingUp, color: '#17652f', bg: '#e8f2e5' },
    { label: 'Outstanding wallet', value: `₹${((networkKPIs.totalWallet || 0) / 100000).toFixed(1)}L`, icon: Wallet, color: '#17652f', bg: '#e8f2e5' },
    { label: 'Matured visits', value: networkKPIs.totalMatured || 0, icon: CheckCircle2, color: '#17652f', bg: '#e8f2e5' },
    { label: 'Average commission', value: `${(networkKPIs.avgCommRate || 2).toFixed(1)}%`, icon: BarChart3, color: '#17652f', bg: '#e8f2e5' },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
      {/* Header Banner */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '8px',
          padding: '20px 24px',
          border: '1px solid #e5e7eb',
          color: '#111827',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '16px',
        }}
      >
        <div style={{ maxWidth: '650px' }}>
          <h1 style={{ margin: '0 0 4px', fontSize: '1.5rem', fontWeight: '600', color: '#111827' }}>
            Channel partners
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5 }}>
            Registered channel partners, commission structures, partner tiers, and site visit verifications.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          {canCreateAgent && (
            <button
              onClick={() => setShowAddAgent(true)}
              style={{
                padding: '8px 16px',
                borderRadius: '6px',
                border: 'none',
                background: '#17652f',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <UserPlus size={14} /> Add partner
            </button>
          )}
          <button
            onClick={() => { setPage(1); fetchAgents(); }}
            style={{
              padding: '8px 14px',
              borderRadius: '6px',
              border: '1px solid #e5e7eb',
              background: '#ffffff',
              color: '#374151',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
            }}
          >
            <RefreshCw size={14} style={{ color: '#17652f' }} /> Refresh
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
        {kpiCards.map((kpi, i) => (
          <div key={i} style={{
            background: '#ffffff', borderRadius: '8px', padding: '16px',
            border: '1px solid #e5e7eb',
            display: 'flex', flexDirection: 'column', gap: '8px',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '32px', height: '32px', borderRadius: '6px',
                backgroundColor: kpi.bg, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>
                <kpi.icon size={16} style={{ color: kpi.color }} />
              </div>
              <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '600', lineHeight: '1.2' }}>{kpi.label}</span>
            </div>
            <span style={{ fontSize: '1.35rem', fontWeight: '600', color: '#111827' }}>{kpi.value}</span>
          </div>
        ))}
      </div>

      {/* Filters Bar */}
      <div style={{
        display: 'flex', alignItems: 'center', gap: '12px',
        background: '#ffffff', borderRadius: '8px', padding: '12px 16px',
        border: '1px solid #e5e7eb',
        flexWrap: 'wrap',
      }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '220px' }}>
          <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by name, code, agency, or phone..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{
              width: '100%', padding: '8px 12px 8px 34px', borderRadius: '6px',
              border: '1px solid #e5e7eb', fontSize: '0.82rem', boxSizing: 'border-box',
              outline: 'none',
            }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.82rem', color: '#374151', cursor: 'pointer', fontWeight: '500' }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="suspended">Suspended</option>
        </select>

        <select
          value={tierFilter}
          onChange={(e) => { setTierFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.82rem', color: '#374151', cursor: 'pointer', fontWeight: '500' }}
        >
          <option value="all">All tiers</option>
          <option value="Platinum">Platinum</option>
          <option value="Gold">Gold</option>
          <option value="Silver">Silver</option>
          <option value="Standard">Standard</option>
        </select>

        <select
          value={cityFilter}
          onChange={(e) => { setCityFilter(e.target.value); setPage(1); }}
          style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.82rem', color: '#374151', cursor: 'pointer', fontWeight: '500' }}
        >
          <option value="all">All cities</option>
          {['Mathura', 'Vrindavan', 'Agra', 'Delhi NCR', 'Noida', 'Gurugram', 'Faridabad', 'Aligarh', 'Bharatpur', 'Hathras'].map(c => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <span style={{ fontSize: '0.78rem', color: '#6b7280', fontWeight: '500', marginLeft: 'auto' }}>
          Page {pagination.page || page} of {pagination.totalPages || 1} • Showing {agents.length} of {pagination.total}
        </span>
      </div>

      {/* Agents Table */}
      <div style={{
        background: '#ffffff', borderRadius: '8px', overflow: 'hidden',
        border: '1px solid #e5e7eb',
      }}>
        {loading ? (
          <div style={{ padding: '80px 0', textAlign: 'center' }}>
            <div style={{ width: '32px', height: '32px', border: '3px solid #e5e7eb', borderTopColor: '#17652f', borderRadius: '50%', animation: 'spin 0.8s linear infinite', margin: '0 auto 12px' }} />
            <p style={{ color: '#6b7280', fontSize: '0.85rem' }}>Loading partners...</p>
          </div>
        ) : agents.length === 0 ? (
          <div style={{ padding: '60px 0', textAlign: 'center' }}>
            <Users size={36} style={{ color: '#9ca3af', marginBottom: '12px' }} />
            <h4 style={{ margin: 0, color: '#111827', fontSize: '1rem', fontWeight: '600' }}>No partners found</h4>
            <p style={{ color: '#6b7280', fontSize: '0.82rem', marginTop: '4px' }}>Try adjusting your search or filters.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table style={{ width: '100%', minWidth: '850px', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <thead>
                <tr style={{ backgroundColor: '#f9fafb', borderBottom: '1px solid #e5e7eb', color: '#4b5563', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort('name')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Partner <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>Agency and code</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>Tier</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>City</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort('commissionRate')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Commission <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort('walletBalance')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Wallet balance <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', cursor: 'pointer' }} onClick={() => handleSort('totalEarned')}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                      Total earned <ArrowUpDown size={11} />
                    </span>
                  </th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>Leads</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>Visits</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600' }}>Status</th>
                  <th style={{ padding: '12px 16px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
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
                        borderBottom: '1px solid #f3f4f6',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                      }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                      onClick={() => setSelectedAgent(selectedAgent?._id === agent._id ? null : agent)}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '34px', height: '34px', borderRadius: '6px',
                            background: '#e8f2e5',
                            border: '1px solid #cde4c9',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#17652f', fontWeight: '600', fontSize: '0.78rem',
                            flexShrink: 0,
                          }}>
                            {(agent.firstName?.[0] || '').toUpperCase()}{(agent.lastName?.[0] || '').toUpperCase()}
                          </div>
                          <div>
                            <div style={{ fontWeight: '600', color: '#111827', fontSize: '0.84rem' }}>
                              {agent.firstName} {agent.lastName}
                            </div>
                            <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                              <Phone size={10} style={{ marginRight: '2px' }} />{agent.mobileNo || '—'}
                            </div>
                          </div>
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ fontWeight: '500', color: '#374151', fontSize: '0.82rem' }}>{ap.agencyName || '—'}</div>
                        <div style={{ fontSize: '0.74rem', color: '#17652f', fontWeight: '600' }}>
                          <Hash size={10} style={{ marginRight: '1px' }} />{ap.agentCode || '—'}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          fontSize: '0.72rem', fontWeight: '500',
                          backgroundColor: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                          display: 'inline-flex', alignItems: 'center', gap: '3px',
                        }}>
                          <Star size={10} /> {ap.tier || 'Standard'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '3px', fontSize: '0.8rem', color: '#4b5563', fontWeight: '500' }}>
                          <MapPin size={11} /> {ap.city || '—'}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: '600', color: '#17652f', fontSize: '0.85rem' }}>
                          {ap.commissionRate || 2}%
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: '600', color: '#111827', fontSize: '0.85rem' }}>
                          ₹{(ap.walletBalance || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontWeight: '600', color: '#374151', fontSize: '0.84rem' }}>
                          ₹{(ap.totalEarned || 0).toLocaleString('en-IN')}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '2px', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111827' }}>{agent.leadStats?.total || 0}</span>
                          {(agent.leadStats?.pending || 0) > 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#b45309', fontWeight: '500' }}>
                              {agent.leadStats.pending} pending
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', gap: '2px', flexDirection: 'column' }}>
                          <span style={{ fontSize: '0.8rem', fontWeight: '600', color: '#111827' }}>{agent.visitStats?.total || 0}</span>
                          {(agent.visitStats?.approved || 0) > 0 && (
                            <span style={{ fontSize: '0.7rem', color: '#17652f', fontWeight: '500' }}>
                              {agent.visitStats.approved} approved
                            </span>
                          )}
                        </div>
                      </td>

                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          padding: '2px 8px', borderRadius: '4px',
                          fontSize: '0.72rem', fontWeight: '600',
                          backgroundColor: sb.bg, color: sb.color,
                        }}>
                          {sb.label}
                        </span>
                      </td>

                      <td style={{ padding: '12px 16px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/agent-profile/${agent._id}`);
                            }}
                            title="Open full agent profile with leads, visits, and approvals"
                            style={{
                              padding: '5px 10px', borderRadius: '6px',
                              background: '#17652f',
                              color: '#ffffff', border: 'none',
                              fontSize: '0.74rem', fontWeight: '600', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                            }}
                          >
                            <ExternalLink size={11} /> View profile
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedAgent(selectedAgent?._id === agent._id ? null : agent);
                            }}
                            style={{
                              padding: '5px 10px', borderRadius: '6px',
                              backgroundColor: selectedAgent?._id === agent._id ? '#111827' : '#ffffff',
                              color: selectedAgent?._id === agent._id ? '#ffffff' : '#374151',
                              border: '1px solid ' + (selectedAgent?._id === agent._id ? '#111827' : '#e5e7eb'),
                              fontSize: '0.74rem', fontWeight: '600', cursor: 'pointer',
                              display: 'inline-flex', alignItems: 'center', gap: '4px',
                            }}
                          >
                            <Eye size={11} /> {selectedAgent?._id === agent._id ? 'Close' : 'Quick view'}
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
            padding: '14px 18px', borderTop: '1px solid #e5e7eb',
          }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{
                padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
                backgroundColor: page <= 1 ? '#f9fafb' : '#ffffff', color: page <= 1 ? '#9ca3af' : '#374151',
                fontSize: '0.8rem', fontWeight: '500', cursor: page <= 1 ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '4px',
              }}
            >
              <ChevronLeft size={14} /> Previous
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
                    padding: '6px 10px', borderRadius: '6px',
                    border: pg === page ? '1px solid #17652f' : '1px solid #e5e7eb',
                    backgroundColor: pg === page ? '#e8f2e5' : '#ffffff',
                    color: pg === page ? '#17652f' : '#374151',
                    fontSize: '0.8rem', fontWeight: pg === page ? '600' : '500',
                    cursor: 'pointer', minWidth: '32px',
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
                padding: '6px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
                backgroundColor: page >= pagination.totalPages ? '#f9fafb' : '#ffffff',
                color: page >= pagination.totalPages ? '#9ca3af' : '#374151',
                fontSize: '0.8rem', fontWeight: '500',
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
          background: '#ffffff', borderRadius: '8px',
          border: '1px solid #e5e7eb',
          padding: '20px',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '18px' }}>
            <div style={{ display: 'flex', gap: '14px', alignItems: 'center' }}>
              <div style={{
                width: '48px', height: '48px', borderRadius: '8px',
                background: '#e8f2e5',
                border: '1px solid #cde4c9',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#17652f', fontWeight: '600', fontSize: '1rem',
              }}>
                {(selectedAgent.firstName?.[0] || '').toUpperCase()}{(selectedAgent.lastName?.[0] || '').toUpperCase()}
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600', color: '#111827' }}>
                  {selectedAgent.firstName} {selectedAgent.lastName}
                </h3>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginTop: '4px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.78rem', color: '#17652f', fontWeight: '600' }}>
                    {selectedAgent.agentProfile?.agentCode}
                  </span>
                  <span style={{ fontSize: '0.74rem', color: '#9ca3af' }}>•</span>
                  <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '500' }}>
                    {selectedAgent.agentProfile?.agencyName}
                  </span>
                  {selectedAgent.agentProfile?.tier && (() => {
                    const tc = tierColor(selectedAgent.agentProfile.tier);
                    return (
                      <span style={{
                        padding: '2px 8px', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '500',
                        backgroundColor: tc.bg, color: tc.color, border: `1px solid ${tc.border}`,
                      }}>
                         {selectedAgent.agentProfile.tier}
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
                  padding: '7px 14px', borderRadius: '6px', border: 'none',
                  background: '#17652f',
                  color: '#ffffff', fontSize: '0.8rem', fontWeight: '600', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: '6px',
                }}
              >
                <ExternalLink size={13} /> Open profile
              </button>
              <button
                onClick={() => setSelectedAgent(null)}
                style={{
                  padding: '7px 12px', borderRadius: '6px', border: '1px solid #e5e7eb',
                  backgroundColor: '#ffffff', color: '#4b5563', fontSize: '0.8rem',
                  fontWeight: '500', cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            {[
              { label: 'Commission rate', value: `${selectedAgent.agentProfile?.commissionRate || 2}%`, icon: DollarSign, color: '#17652f' },
              { label: 'Wallet balance', value: `₹${(selectedAgent.agentProfile?.walletBalance || 0).toLocaleString('en-IN')}`, icon: Wallet, color: '#17652f' },
              { label: 'Total earned', value: `₹${(selectedAgent.agentProfile?.totalEarned || 0).toLocaleString('en-IN')}`, icon: TrendingUp, color: '#17652f' },
              { label: 'Matured visits', value: selectedAgent.agentProfile?.maturedLeadsCount || 0, icon: CheckCircle2, color: '#17652f' },
            ].map((metric, i) => (
              <div key={i} style={{
                padding: '14px', borderRadius: '6px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                  <metric.icon size={14} style={{ color: metric.color }} />
                  <span style={{ fontSize: '0.74rem', color: '#6b7280', fontWeight: '500' }}>{metric.label}</span>
                </div>
                <span style={{ fontSize: '1.15rem', fontWeight: '600', color: '#111827' }}>{metric.value}</span>
              </div>
            ))}
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px' }}>
            <div style={{ padding: '14px', borderRadius: '6px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: '600', color: '#111827' }}>Contact details</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: '#4b5563' }}>
                <span><Phone size={12} style={{ marginRight: '4px' }} />{selectedAgent.mobileNo || '—'}</span>
                <span><Mail size={12} style={{ marginRight: '4px' }} />{selectedAgent.email || '—'}</span>
                <span><MapPin size={12} style={{ marginRight: '4px' }} />{selectedAgent.agentProfile?.city || '—'}</span>
                <span><Shield size={12} style={{ marginRight: '4px' }} />RERA: {selectedAgent.agentProfile?.reraNumber || '—'}</span>
              </div>
            </div>
            <div style={{ padding: '14px', borderRadius: '6px', backgroundColor: '#f9fafb', border: '1px solid #e5e7eb' }}>
              <h5 style={{ margin: '0 0 8px', fontSize: '0.8rem', fontWeight: '600', color: '#111827' }}>Bank details</h5>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', fontSize: '0.8rem', color: '#4b5563' }}>
                <span><Briefcase size={12} style={{ marginRight: '4px' }} />{selectedAgent.agentProfile?.bankDetails?.bankName || '—'}</span>
                <span>Account: {selectedAgent.agentProfile?.bankDetails?.accountNumber || '—'}</span>
                <span>IFSC: {selectedAgent.agentProfile?.bankDetails?.ifscCode || '—'}</span>
                <span>UPI: {selectedAgent.agentProfile?.bankDetails?.upiId || '—'}</span>
              </div>
            </div>
          </div>

          {/* Lead and Visit Stats */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginTop: '14px' }}>
            {[
              { label: 'Total leads', value: selectedAgent.leadStats?.total || 0, bg: '#f9fafb', color: '#111827' },
              { label: 'Pending approval', value: selectedAgent.leadStats?.pending || 0, bg: '#fef3c7', color: '#92400e' },
              { label: 'Total visits', value: selectedAgent.visitStats?.total || 0, bg: '#f9fafb', color: '#111827' },
              { label: 'Approved visits', value: selectedAgent.visitStats?.approved || 0, bg: '#e8f2e5', color: '#17652f' },
              { label: 'Pending visits', value: selectedAgent.visitStats?.pending || 0, bg: '#fef3c7', color: '#92400e' },
            ].map((s, i) => (
              <div key={i} style={{
                padding: '10px', borderRadius: '6px', backgroundColor: s.bg, border: '1px solid #e5e7eb', textAlign: 'center',
              }}>
                <div style={{ fontSize: '1.1rem', fontWeight: '600', color: s.color }}>{s.value}</div>
                <div style={{ fontSize: '0.72rem', fontWeight: '500', color: s.color }}>{s.label}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add Agent Modal */}
      <AddAgentModal
        isOpen={showAddAgent}
        onClose={() => setShowAddAgent(false)}
        onAgentAdded={() => {
          setShowAddAgent(false);
          setPage(1);
          fetchAgents();
        }}
      />

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
