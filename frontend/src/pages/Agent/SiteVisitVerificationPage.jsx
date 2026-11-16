import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { extractRoleCode } from '../../utils/taskPermissions.js';
import { agentService } from '../../services/agentService.js';
import { projectService } from '../../services/projectService.js';
import { NewSiteVisitModal } from '../../components/agent/NewSiteVisitModal.jsx';
import { VerifySiteVisitModal } from '../../components/agent/VerifySiteVisitModal.jsx';
import { StatusBadge } from '../../components/common/StatusBadge.jsx';

import {
  Sparkles,
  Users,
  Search,
  RefreshCw,
  Plus,
  Clock,
  CheckCircle2,
  AlertCircle,
  ShieldCheck,
  Building2,
  Home,
  Calendar,
  ExternalLink,
  DollarSign,
  TrendingUp,
  Award,
  ChevronRight,
  Eye
} from 'lucide-react';

export const SiteVisitVerificationPage = () => {
  const [siteVisits, setSiteVisits] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [projectFilter, setProjectFilter] = useState('');

  // Modals
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [isVerifyModalOpen, setIsVerifyModalOpen] = useState(false);
  const [selectedVisitForVerify, setSelectedVisitForVerify] = useState(null);

  const { user: currentUser, isSuperAdmin, hasPermission, hasAnyPermission } = useAuth();
  const userRole = extractRoleCode(currentUser);
  const canApprove = isSuperAdmin || ['admin', 'sales_head', 'crm_manager', 'super_admin', 'general_manager'].includes(userRole) || hasAnyPermission(['agent:verify', 'crm:manage', 'sales:approve', 'crm:edit']);
  const canLogVisit = isSuperAdmin || hasAnyPermission(['agent:upload', 'agent:leads', 'crm:create', 'crm:edit']);

  const fetchSiteVisits = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (projectFilter) params.projectId = projectFilter;
      if (searchTerm) params.search = searchTerm;

      const res = await agentService.getSiteVisits(params);
      if (res.data) setSiteVisits(res.data);
    } catch (err) {
      console.error('Error fetching site visits:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    projectService.getProjects().then((res) => {
      if (res.data) setProjects(res.data);
    });
  }, []);

  useEffect(() => {
    fetchSiteVisits();
  }, [statusFilter, projectFilter]);

  const handleOpenVerify = (visit) => {
    setSelectedVisitForVerify(visit);
    setIsVerifyModalOpen(true);
  };

  const formatINR = (val) => {
    if (!val || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Metrics
  const totalVisits = siteVisits.length;
  const pendingVisits = siteVisits.filter((v) => v.verificationStatus === 'pending').length;
  const approvedVisits = siteVisits.filter((v) => v.verificationStatus === 'approved').length;
  const totalCommissionCredited = siteVisits
    .filter((v) => v.commissionStatus === 'credited')
    .reduce((sum, v) => sum + (v.commissionAmount || 0), 0);

  // Client search filter
  const filteredVisits = siteVisits.filter((v) => {
    if (!searchTerm.trim()) return true;
    const term = searchTerm.toLowerCase();
    const vCode = (v.visitCode || '').toLowerCase();
    const aCode = (v.agentCode || '').toLowerCase();
    const aName = (v.agentName || '').toLowerCase();
    const pName = (v.partyName || '').toLowerCase();
    const pMobile = (v.partyMobile || '').toLowerCase();
    return vCode.includes(term) || aCode.includes(term) || aName.includes(term) || pName.includes(term) || pMobile.includes(term);
  });

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
            Site visit verification
          </h1>
          <p style={{ margin: 0, fontSize: '0.85rem', color: '#4b5563', lineHeight: 1.5 }}>
            Verify on-ground agent site visits, review photo proofs, and process commission credits.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchSiteVisits}
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
            <RefreshCw size={14} className={loading ? 'spin' : ''} style={{ color: '#17652f' }} />
            Refresh
          </button>

          {canLogVisit && (
            <button
              type="button"
              onClick={() => setIsNewModalOpen(true)}
              style={{
                background: '#17652f',
                color: '#ffffff',
                padding: '8px 16px',
                borderRadius: '6px',
                fontSize: '0.82rem',
                fontWeight: '600',
                border: 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
              }}
            >
              <Plus size={14} /> Log visit
            </button>
          )}
        </div>
      </div>

      {/* Top Metrics Ribbon */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px' }}>
        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '600' }}>Total visits</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f2e5', color: '#17652f' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#111827', marginTop: '4px' }}>
            {totalVisits}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>Channel partner site visits</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '600' }}>Pending approval</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef3c7', color: '#92400e' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#92400e', marginTop: '4px' }}>
            {pendingVisits}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>Pending verification review</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '600' }}>Approved visits</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f2e5', color: '#17652f' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
            {approvedVisits}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>Verified site visits</span>
        </div>

        <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '600' }}>Commissions credited</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f2e5', color: '#17652f' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '600', color: '#17652f', marginTop: '4px' }}>
            {formatINR(totalCommissionCredited)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#6b7280' }}>Credited on booked deals</span>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1.2 1 240px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by agent code, customer name, phone, or visit code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '32px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.82rem', boxSizing: 'border-box' }}
          />
        </div>

        <div style={{ width: '180px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.82rem', color: '#374151' }}
          >
            <option value="">All verification statuses</option>
            <option value="pending">Pending review</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <div style={{ width: '180px' }}>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #e5e7eb', fontSize: '0.82rem', color: '#374151' }}
          >
            <option value="">All projects</option>
            {projects.map((p) => (
              <option key={p._id || p.id} value={p._id || p.id}>
                {p.projectName}
              </option>
            ))}
          </select>
        </div>

        {(searchTerm || statusFilter || projectFilter) && (
          <button
            type="button"
            onClick={() => {
              setSearchTerm('');
              setStatusFilter('');
              setProjectFilter('');
            }}
            style={{
              padding: '8px 12px',
              background: '#ffffff',
              color: '#374151',
              border: '1px solid #e5e7eb',
              borderRadius: '6px',
              fontSize: '0.8rem',
              fontWeight: '500',
              cursor: 'pointer'
            }}
          >
            Reset filters
          </button>
        )}
      </div>

      {/* Main Table Register */}
      <div style={{ background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
        <div className="table-responsive">
          <table style={{ minWidth: '820px', width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
            <thead>
              <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb', textAlign: 'left', color: '#4b5563' }}>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Visit code and date</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Agent</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Customer</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Project and units</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Photo proof</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Verification status</th>
                <th style={{ padding: '12px 14px', fontWeight: '600' }}>Commission status</th>
                <th style={{ padding: '12px 14px', fontWeight: '600', textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#6b7280', fontWeight: '500' }}>
                    No site visits found matching your criteria.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit) => {
                  const isPending = visit.verificationStatus === 'pending';
                  const isApproved = visit.verificationStatus === 'approved';
                  const isRejected = visit.verificationStatus === 'rejected';
                  const isBooked = visit.bookingStatus === 'booked';

                  return (
                    <tr key={visit._id || visit.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      {/* 1. Visit Code & Date */}
                      <td style={{ padding: '12px 14px' }}>
                        <strong style={{ color: '#17652f' }}>{visit.visitCode}</strong>
                        <div style={{ fontSize: '0.74rem', color: '#6b7280' }}>
                          {new Date(visit.visitDate).toLocaleDateString('en-IN', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </td>

                      {/* 2. Agent Info */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ padding: '2px 6px', background: '#e8f2e5', color: '#17652f', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '600', fontFamily: 'monospace' }}>
                            {visit.agentCode}
                          </span>
                          <strong style={{ color: '#111827', fontSize: '0.84rem' }}>{visit.agentName}</strong>
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#6b7280', marginTop: '2px' }}>
                          {visit.agencyName || 'Independent partner'} • {visit.agentPhone || ''}
                        </div>
                      </td>

                      {/* 3. Visiting Party */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '600', color: '#111827' }}>
                          {visit.partyName}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#17652f', fontWeight: '600' }}>
                          {visit.partyMobile}
                        </div>
                      </td>

                      {/* 4. Project & Units */}
                      <td style={{ padding: '12px 14px' }}>
                        <div style={{ fontWeight: '600', color: '#374151' }}>
                          {visit.projectId?.projectName || 'Krishna Valley'}
                        </div>
                        {visit.flatIds && visit.flatIds.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {visit.flatIds.map((f) => (
                              <span key={f._id || f} style={{ fontSize: '0.68rem', padding: '1px 5px', background: '#f1f5f9', color: '#334155', borderRadius: '3px', fontWeight: '600' }}>
                                Flat {f.flatNumber || 'Unit'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#6b7280' }}>General site tour</span>
                        )}
                      </td>

                      {/* 5. Photo Proof */}
                      <td style={{ padding: '12px 14px' }}>
                        {visit.partySelfieUrl ? (
                          <a
                            href={visit.partySelfieUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#17652f', fontSize: '0.74rem', fontWeight: '600' }}
                          >
                            <img
                              src={visit.partySelfieUrl}
                              alt="Selfie"
                              style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #e5e7eb' }}
                            />
                            <span>View proof</span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.74rem', color: '#9ca3af' }}>No photo</span>
                        )}
                      </td>

                      {/* 6. Verification Status */}
                      <td style={{ padding: '12px 14px' }}>
                        {isPending && (
                          <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#fef3c7', color: '#92400e', fontWeight: '500', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} /> Pending review
                          </span>
                        )}
                        {isApproved && (
                          <div>
                            <span style={{ padding: '3px 8px', borderRadius: '4px', background: '#e8f2e5', color: '#17652f', fontWeight: '600', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={11} /> Approved
                            </span>
                            {visit.verifiedBy && (
                              <div style={{ fontSize: '0.7rem', color: '#6b7280', marginTop: '2px' }}>
                                by {visit.verifiedBy?.firstName || 'Manager'}
                              </div>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <span title={visit.rejectionReason} style={{ padding: '3px 8px', borderRadius: '4px', background: '#fee2e2', color: '#991b1b', fontWeight: '500', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={11} /> Rejected
                          </span>
                        )}
                      </td>

                      {/* 7. Booking & Commission Status */}
                      <td style={{ padding: '12px 14px' }}>
                        {isBooked ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ padding: '2px 6px', borderRadius: '4px', background: '#e8f2e5', color: '#17652f', fontWeight: '600', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Award size={11} /> Deal booked
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#17652f' }}>
                              {formatINR(visit.commissionAmount)} credited
                            </span>
                          </div>
                        ) : isApproved ? (
                          <span style={{ fontSize: '0.72rem', color: '#17652f', fontWeight: '600' }}>
                            Eligible on booking
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#9ca3af' }}>
                            Pending approval
                          </span>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td style={{ padding: '12px 14px', textAlign: 'right' }}>
                        <div style={{ display: 'inline-flex', gap: '6px' }}>
                          {isPending && canApprove ? (
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(visit)}
                              style={{
                                padding: '5px 12px',
                                background: '#17652f',
                                color: '#ffffff',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: '600',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <ShieldCheck size={13} /> Review visit
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(visit)}
                              style={{
                                padding: '5px 10px',
                                background: '#ffffff',
                                border: '1px solid #e5e7eb',
                                borderRadius: '6px',
                                fontSize: '0.74rem',
                                fontWeight: '500',
                                color: '#374151',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Eye size={12} /> View details
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODALS */}
      <NewSiteVisitModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        onSubmitSuccess={fetchSiteVisits}
      />

      <VerifySiteVisitModal
        isOpen={isVerifyModalOpen}
        onClose={() => setIsVerifyModalOpen(false)}
        siteVisit={selectedVisitForVerify}
        onVerificationSuccess={fetchSiteVisits}
      />

    </div>
  );
};

export default SiteVisitVerificationPage;
