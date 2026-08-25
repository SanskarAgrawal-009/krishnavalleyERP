import React, { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
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

  const { user: currentUser } = useAuth();
  const userRole = currentUser?.role?.roleCode || currentUser?.roleCode || currentUser?.role || '';
  const canApprove = ['admin', 'sales_head', 'crm_manager', 'super_admin', 'general_manager'].includes(userRole);

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
      <div className="g-card" style={{
        padding: '24px 28px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px'
      }}>
        <div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '12px' }}>
            Agent Site Visit Verification & Approvals Hub
            <span style={{ fontSize: '0.74rem', background: '#e0e7ff', color: '#3730a3', padding: '3px 10px', borderRadius: '6px', fontWeight: '800' }}>
              CHANNEL PARTNER ENGINE
            </span>
          </div>
          <div style={{ fontSize: '0.88rem', color: '#4b5563', marginTop: '4px', fontWeight: '500' }}>
            Verify on-ground agent visits with visiting parties, inspect photo proofs, and automate agent commission credits upon flat booking.
          </div>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            type="button"
            onClick={fetchSiteVisits}
            className="btn-secondary"
            style={{ padding: '9px 16px', fontSize: '0.84rem' }}
          >
            <RefreshCw size={14} className={loading ? 'spin' : ''} />
            Refresh
          </button>

          <button
            type="button"
            onClick={() => setIsNewModalOpen(true)}
            style={{
              background: '#1a73e8',
              color: '#ffffff',
              padding: '9px 18px',
              borderRadius: '6px',
              fontSize: '0.84rem',
              fontWeight: '800',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <Plus size={15} /> Log New Agent Site Visit
          </button>
        </div>
      </div>

      {/* Top Metrics Ribbon */}
      <div className="grid-cols-4">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>TOTAL VISITS LOGGED</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e8f0fe', color: '#1a73e8' }}>
              <Calendar size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#1a73e8', marginTop: '4px' }}>
            {totalVisits}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Channel partner site visits</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>AWAITING APPROVAL</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#fef7e0', color: '#b06000' }}>
              <Clock size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#b06000', marginTop: '4px' }}>
            {pendingVisits}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Pending maker-checker review</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>APPROVED VISITS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#e6f4ea', color: '#137333' }}>
              <ShieldCheck size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.6rem', fontWeight: '800', color: '#137333', marginTop: '4px' }}>
            {approvedVisits}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Eligible for auto-commission</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <span style={{ fontSize: '0.78rem', color: '#4b5563', fontWeight: '700' }}>AUTOMATED COMMISSIONS</span>
            <div style={{ padding: '6px', borderRadius: '6px', background: '#f3e8ff', color: '#8b5cf6' }}>
              <DollarSign size={16} />
            </div>
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: '800', color: '#8b5cf6', marginTop: '4px' }}>
            {formatINR(totalCommissionCredited)}
          </div>
          <span style={{ fontSize: '0.74rem', color: '#4b5563', fontWeight: '600' }}>Credited on booked deals</span>
        </div>
      </div>

      {/* Filter Ribbon */}
      <div className="g-card" style={{ padding: '12px 16px', display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ flex: '1.2 1 240px', position: 'relative' }}>
          <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
          <input
            type="text"
            placeholder="Search by Agent Code (e.g. AGT-101), Party Name, Mobile, or Visit Code..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{ width: '100%', paddingLeft: '30px', fontSize: '0.82rem' }}
          />
        </div>

        <div style={{ width: '180px' }}>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            style={{ width: '100%', fontSize: '0.82rem' }}
          >
            <option value="">All Verification Statuses</option>
            <option value="pending">⏳ Pending Review</option>
            <option value="approved">✓ Approved</option>
            <option value="rejected">✕ Rejected</option>
          </select>
        </div>

        <div style={{ width: '180px' }}>
          <select
            value={projectFilter}
            onChange={(e) => setProjectFilter(e.target.value)}
            style={{ width: '100%', fontSize: '0.82rem' }}
          >
            <option value="">All Projects</option>
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
              padding: '6px 12px',
              background: '#fef2f2',
              color: '#ba1a1a',
              border: '1px solid #fecaca',
              borderRadius: '6px',
              fontSize: '0.76rem',
              fontWeight: '700',
              cursor: 'pointer'
            }}
          >
            Reset Filters
          </button>
        )}
      </div>

      {/* Main Table Register */}
      <div className="g-card" style={{ overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto' }}>
          <table>
            <thead>
              <tr>
                <th>Visit Code & Date</th>
                <th>Agent (Code & Agency)</th>
                <th>Customer / Visiting Party</th>
                <th>Project & Units Visited</th>
                <th>Photo Proof</th>
                <th>Verification Status</th>
                <th>Booking & Commission Status</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredVisits.length === 0 ? (
                <tr>
                  <td colSpan={8} style={{ textAlign: 'center', padding: '36px', color: '#64748b', fontWeight: '500' }}>
                    No site visits found matching your criteria. Click "Log New Agent Site Visit" to register a visit.
                  </td>
                </tr>
              ) : (
                filteredVisits.map((visit) => {
                  const isPending = visit.verificationStatus === 'pending';
                  const isApproved = visit.verificationStatus === 'approved';
                  const isRejected = visit.verificationStatus === 'rejected';
                  const isBooked = visit.bookingStatus === 'booked';

                  return (
                    <tr key={visit._id || visit.id}>
                      {/* 1. Visit Code & Date */}
                      <td>
                        <strong style={{ color: '#1a73e8' }}>{visit.visitCode}</strong>
                        <div style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '600' }}>
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
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span style={{ padding: '2px 6px', background: '#e0e7ff', color: '#3730a3', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '800', fontFamily: 'monospace' }}>
                            {visit.agentCode}
                          </span>
                          <strong style={{ color: '#1e293b', fontSize: '0.84rem' }}>{visit.agentName}</strong>
                        </div>
                        <div style={{ fontSize: '0.72rem', color: '#475569', marginTop: '2px' }}>
                          {visit.agencyName || 'Independent Partner'} • 📞 {visit.agentPhone || ''}
                        </div>
                      </td>

                      {/* 3. Visiting Party */}
                      <td>
                        <div style={{ fontWeight: '800', color: '#1e293b' }}>
                          {visit.partyName}
                        </div>
                        <div style={{ fontSize: '0.74rem', color: '#1a73e8', fontWeight: '700' }}>
                          📞 {visit.partyMobile}
                        </div>
                      </td>

                      {/* 4. Project & Units */}
                      <td>
                        <div style={{ fontWeight: '700', color: '#334155' }}>
                          {visit.projectId?.projectName || 'Krishna Valley'}
                        </div>
                        {visit.flatIds && visit.flatIds.length > 0 ? (
                          <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap', marginTop: '2px' }}>
                            {visit.flatIds.map((f) => (
                              <span key={f._id || f} style={{ fontSize: '0.68rem', padding: '1px 5px', background: '#f1f5f9', color: '#334155', borderRadius: '3px', fontWeight: '700' }}>
                                Flat {f.flatNumber || 'Unit'}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>General Site Tour</span>
                        )}
                      </td>

                      {/* 5. Photo Proof */}
                      <td>
                        {visit.partySelfieUrl ? (
                          <a
                            href={visit.partySelfieUrl}
                            target="_blank"
                            rel="noreferrer"
                            style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', color: '#1a73e8', fontSize: '0.74rem', fontWeight: '700' }}
                          >
                            <img
                              src={visit.partySelfieUrl}
                              alt="Selfie"
                              style={{ width: '32px', height: '32px', borderRadius: '4px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                            />
                            <span>View Proof</span>
                          </a>
                        ) : (
                          <span style={{ fontSize: '0.7rem', color: '#94a3b8', fontStyle: 'italic' }}>No photo</span>
                        )}
                      </td>

                      {/* 6. Verification Status */}
                      <td>
                        {isPending && (
                          <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#fef3c7', color: '#b45309', fontWeight: '800', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                            <Clock size={11} /> Pending Review
                          </span>
                        )}
                        {isApproved && (
                          <div>
                            <span style={{ padding: '4px 8px', borderRadius: '12px', background: '#dcfce7', color: '#15803d', fontWeight: '800', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <CheckCircle2 size={11} /> Approved
                            </span>
                            {visit.verifiedBy && (
                              <div style={{ fontSize: '0.66rem', color: '#64748b', marginTop: '2px' }}>
                                by {visit.verifiedBy?.firstName || 'Manager'}
                              </div>
                            )}
                          </div>
                        )}
                        {isRejected && (
                          <span title={visit.rejectionReason} style={{ padding: '4px 8px', borderRadius: '12px', background: '#fee2e2', color: '#b91c1c', fontWeight: '800', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'help' }}>
                            <AlertCircle size={11} /> Rejected
                          </span>
                        )}
                      </td>

                      {/* 7. Booking & Commission Status */}
                      <td>
                        {isBooked ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ padding: '3px 8px', borderRadius: '6px', background: '#f3e8ff', color: '#7e22ce', fontWeight: '800', fontSize: '0.72rem', display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                              <Award size={12} /> Deal Booked
                            </span>
                            <span style={{ fontSize: '0.72rem', fontWeight: '800', color: '#15803d' }}>
                              {formatINR(visit.commissionAmount)} Credited
                            </span>
                          </div>
                        ) : isApproved ? (
                          <span style={{ fontSize: '0.72rem', color: '#15803d', fontWeight: '700' }}>
                            Eligible for Auto-Credit upon Booking
                          </span>
                        ) : (
                          <span style={{ fontSize: '0.72rem', color: '#94a3b8' }}>
                            Pending visit approval
                          </span>
                        )}
                      </td>

                      {/* 8. Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          {isPending && canApprove ? (
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(visit)}
                              style={{
                                padding: '5px 12px',
                                background: '#1a73e8',
                                color: '#ffffff',
                                borderRadius: '5px',
                                fontSize: '0.74rem',
                                fontWeight: '800',
                                border: 'none',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <ShieldCheck size={13} /> Review & Approve
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => handleOpenVerify(visit)}
                              style={{
                                padding: '4px 10px',
                                background: '#f1f5f9',
                                border: '1px solid #cbd5e1',
                                borderRadius: '4px',
                                fontSize: '0.74rem',
                                fontWeight: '700',
                                color: '#334155',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}
                            >
                              <Eye size={12} /> Details
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
