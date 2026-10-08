import React, { useState, useEffect } from 'react';
import {
  Users,
  HardHat,
  Shield,
  Briefcase,
  UserPlus,
  Search,
  Filter,
  Eye,
  Trash2,
  Edit2,
  CheckCircle2,
  Clock,
  Upload,
  ArrowRight,
  TrendingUp,
  Building2,
  Phone,
  Mail,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { taskforceManagerService } from '../../services/taskforceManagerService.js';
import { useToast } from '../../context/ToastContext.jsx';
import { AddTeamMemberModal } from './AddTeamMemberModal.jsx';

export const TaskforceTeamTab = ({
  onViewMemberDashboard,
  onAssignTaskToMember,
  systemUsers = [],
}) => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [members, setMembers] = useState([]);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLevelFilter, setSelectedLevelFilter] = useState('all'); // 'all' | 'head' | 'supervisor' | 'helper'
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetchTeam();
  }, []);

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await taskforceManagerService.getTeam();
      if (res && res.success) {
        setMembers(res.members || []);
      } else {
        showToast(res?.message || 'Failed to load taskforce team', 'error');
      }
    } catch (err) {
      console.error('Error fetching team:', err);
      showToast(err.message || 'Error fetching team', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteMember = async (member) => {
    if (!window.confirm(`Are you sure you want to remove ${member.name} (${member.hierarchyLevel.toUpperCase()}) from the Taskforce?`)) {
      return;
    }
    try {
      const res = await taskforceManagerService.deleteTeamMember(member._id);
      if (res && res.success) {
        showToast(res.message || 'Member removed', 'success');
        fetchTeam();
      } else {
        showToast(res?.message || 'Failed to remove member', 'error');
      }
    } catch (err) {
      console.error('Error deleting member:', err);
      showToast(err.message || 'Failed to remove member', 'error');
    }
  };

  // Hierarchy stats
  const headsCount = members.filter((m) => m.hierarchyLevel === 'head').length;
  const supervisorsCount = members.filter((m) => m.hierarchyLevel === 'supervisor').length;
  const helpersCount = members.filter((m) => m.hierarchyLevel === 'helper').length;

  const filteredMembers = members.filter((m) => {
    if (selectedLevelFilter !== 'all' && m.hierarchyLevel !== selectedLevelFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = (m.name || '').toLowerCase().includes(q);
      const matchTrade = (m.trade || '').toLowerCase().includes(q);
      const matchPhone = (m.mobileNo || '').includes(q);
      return matchName || matchTrade || matchPhone;
    }
    return true;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      
      {/* Top Bar with Hierarchy Metrics & Add Member CTA */}
      <div
        style={{
          background: '#ffffff',
          borderRadius: '16px',
          border: '1px solid #e2e8f0',
          padding: '20px 24px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.04)',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h2 style={{ margin: 0, fontSize: '1.25rem', fontWeight: '800', color: '#0f172a' }}>
                Taskforce Team Hierarchy &amp; Members
              </h2>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: '#eff6ff',
                  color: '#2563eb',
                  border: '1px solid #bfdbfe',
                  fontSize: '0.72rem',
                  fontWeight: '700',
                  padding: '2px 8px',
                  borderRadius: '12px',
                }}
              >
                Helper → Supervisor → Head
              </span>
            </div>
            <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#64748b' }}>
              Assign tasks specifically to team members with scoped data access (Helpers view own uploads; Supervisors view helper data; Heads view all 3).
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setIsAddModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '8px 16px',
                borderRadius: '9px',
                background: '#2563eb',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.82rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(37, 99, 235, 0.28)',
              }}
            >
              <UserPlus size={16} />
              <span>Add Team Member</span>
            </button>
          </div>
        </div>

        {/* Hierarchy Stats Strips */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
          {[
            {
              id: 'all',
              label: 'Total Workforce',
              count: members.length,
              icon: Users,
              color: '#0f172a',
              bg: '#f8fafc',
              border: '#e2e8f0',
            },
            {
              id: 'head',
              label: 'Department Heads',
              count: headsCount,
              icon: Briefcase,
              color: '#0891b2',
              bg: '#ecfeff',
              border: '#a5f3fc',
              desc: 'Oversees all 3 tiers',
            },
            {
              id: 'supervisor',
              label: 'Site Supervisors',
              count: supervisorsCount,
              icon: Shield,
              color: '#4f46e5',
              bg: '#eef2ff',
              border: '#c7d2fe',
              desc: 'Oversees self + helpers',
            },
            {
              id: 'helper',
              label: 'Field Helpers',
              count: helpersCount,
              icon: HardHat,
              color: '#2563eb',
              bg: '#eff6ff',
              border: '#bfdbfe',
              desc: 'Scoped to own uploads',
            },
          ].map((tier) => (
            <div
              key={tier.id}
              onClick={() => setSelectedLevelFilter(tier.id)}
              style={{
                background: selectedLevelFilter === tier.id ? tier.bg : '#ffffff',
                border: selectedLevelFilter === tier.id ? `2px solid ${tier.color}` : `1px solid ${tier.border}`,
                borderRadius: '12px',
                padding: '12px 16px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#64748b' }}>{tier.label}</span>
                <tier.icon size={16} color={tier.color} />
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px', marginTop: '6px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '800', color: tier.color }}>{tier.count}</span>
                {tier.desc && <span style={{ fontSize: '0.68rem', color: '#94a3b8' }}>({tier.desc})</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Toolbar: Search & Level Tabs */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px' }}>
        <div style={{ display: 'flex', gap: '6px' }}>
          {[
            { id: 'all', label: 'All Members' },
            { id: 'head', label: 'Heads' },
            { id: 'supervisor', label: 'Supervisors' },
            { id: 'helper', label: 'Helpers' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedLevelFilter(tab.id)}
              style={{
                padding: '6px 14px',
                borderRadius: '8px',
                fontSize: '0.76rem',
                fontWeight: selectedLevelFilter === tab.id ? '700' : '600',
                border: selectedLevelFilter === tab.id ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                background: selectedLevelFilter === tab.id ? '#eff6ff' : '#ffffff',
                color: selectedLevelFilter === tab.id ? '#1e40af' : '#475569',
                cursor: 'pointer',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ position: 'relative' }}>
          <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '9px' }} />
          <input
            type="text"
            placeholder="Search by name, trade, phone..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              padding: '6px 12px 6px 30px',
              borderRadius: '8px',
              border: '1px solid #cbd5e1',
              fontSize: '0.78rem',
              width: '240px',
            }}
          />
        </div>
      </div>

      {/* Team Cards Grid */}
      {filteredMembers.length === 0 ? (
        <div
          style={{
            background: '#ffffff',
            borderRadius: '12px',
            padding: '50px 20px',
            textAlign: 'center',
            border: '1px dashed #cbd5e1',
            color: '#64748b',
          }}
        >
          <Users size={40} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontWeight: '800', fontSize: '0.96rem', color: '#1e293b' }}>
            No team members found
          </div>
          <p style={{ margin: '4px 0 16px', fontSize: '0.78rem' }}>
            Start by adding team members in the Helper, Supervisor, or Head hierarchy.
          </p>
          <button
            onClick={() => setIsAddModalOpen(true)}
            style={{
              padding: '8px 16px',
              borderRadius: '8px',
              background: '#2563eb',
              color: '#ffffff',
              border: 'none',
              fontSize: '0.8rem',
              fontWeight: '700',
              cursor: 'pointer',
            }}
          >
            + Add First Team Member
          </button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '16px' }}>
          {filteredMembers.map((m) => {
            const isHead = m.hierarchyLevel === 'head';
            const isSupervisor = m.hierarchyLevel === 'supervisor';
            const isHelper = m.hierarchyLevel === 'helper';

            const badgeBg = isHead ? '#ecfeff' : isSupervisor ? '#eef2ff' : '#eff6ff';
            const badgeColor = isHead ? '#0e7490' : isSupervisor ? '#4338ca' : '#1d4ed8';
            const badgeBorder = isHead ? '#a5f3fc' : isSupervisor ? '#c7d2fe' : '#bfdbfe';

            return (
              <div
                key={m._id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #e2e8f0',
                  borderRadius: '14px',
                  padding: '16px 18px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
                  transition: 'all 0.15s ease',
                }}
              >
                {/* Card Header */}
                <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div
                      style={{
                        width: '42px',
                        height: '42px',
                        borderRadius: '10px',
                        background: isHead
                          ? 'linear-gradient(135deg, #0891b2, #0e7490)'
                          : isSupervisor
                          ? 'linear-gradient(135deg, #4f46e5, #4338ca)'
                          : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                        color: '#ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {isHead ? <Briefcase size={20} /> : isSupervisor ? <Shield size={20} /> : <HardHat size={20} />}
                    </div>

                    <div>
                      <div style={{ fontWeight: '800', fontSize: '0.94rem', color: '#0f172a' }}>
                        {m.name}
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#64748b' }}>{m.trade || 'General Operations'}</div>
                    </div>
                  </div>

                  <span
                    style={{
                      padding: '2px 8px',
                      borderRadius: '6px',
                      fontSize: '0.68rem',
                      fontWeight: '800',
                      textTransform: 'uppercase',
                      background: badgeBg,
                      color: badgeColor,
                      border: `1px solid ${badgeBorder}`,
                    }}
                  >
                    {m.hierarchyLevel}
                  </span>
                </div>

                {/* Reporting Info */}
                {(m.supervisorId || m.headId) && (
                  <div
                    style={{
                      background: '#f8fafc',
                      borderRadius: '8px',
                      padding: '6px 10px',
                      fontSize: '0.72rem',
                      color: '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '6px',
                    }}
                  >
                    <span style={{ fontWeight: '700', color: '#64748b' }}>Reporting:</span>
                    {m.supervisorId && <span>Lead: {m.supervisorId.name}</span>}
                    {m.supervisorId && m.headId && <span>•</span>}
                    {m.headId && <span>Head: {m.headId.name}</span>}
                  </div>
                )}

                {/* Workload Stats Row */}
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '6px',
                    textAlign: 'center',
                    background: '#f8fafc',
                    borderRadius: '8px',
                    padding: '8px',
                  }}
                >
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>Active Tasks</div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#2563eb' }}>
                      {m.stats?.activeTasks || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>Completed</div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#16a34a' }}>
                      {m.stats?.completedTasks || 0}
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700' }}>Proofs/Uploads</div>
                    <div style={{ fontSize: '1rem', fontWeight: '800', color: '#7c3aed' }}>
                      {m.stats?.uploadCount || 0}
                    </div>
                  </div>
                </div>

                {/* Contact & Status */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.72rem', color: '#64748b' }}>
                  {m.mobileNo ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={12} /> {m.mobileNo}
                    </div>
                  ) : (
                    <span>No Phone</span>
                  )}
                  {m.userId ? (
                    <span style={{ color: '#16a34a', fontWeight: '700' }}>• Login Linked</span>
                  ) : (
                    <span style={{ color: '#94a3b8' }}>• Field Only</span>
                  )}
                </div>

                {/* Card Actions */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderTop: '1px solid #f1f5f9',
                    paddingTop: '10px',
                    marginTop: 'auto',
                  }}
                >
                  <button
                    type="button"
                    onClick={() => onViewMemberDashboard && onViewMemberDashboard(m._id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '6px 12px',
                      borderRadius: '7px',
                      background: '#eff6ff',
                      color: '#1d4ed8',
                      border: '1px solid #bfdbfe',
                      fontSize: '0.74rem',
                      fontWeight: '700',
                      cursor: 'pointer',
                    }}
                  >
                    <Eye size={13} /> View Dashboard
                  </button>

                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button
                      type="button"
                      onClick={() => onAssignTaskToMember && onAssignTaskToMember(m)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '7px',
                        background: '#2563eb',
                        color: '#ffffff',
                        border: 'none',
                        fontSize: '0.74rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                      }}
                      title="Assign task directly to this member"
                    >
                      Assign Task
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteMember(m)}
                      style={{
                        padding: '6px',
                        borderRadius: '6px',
                        background: '#f1f5f9',
                        color: '#94a3b8',
                        border: 'none',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                      }}
                      onMouseEnter={(e) => { e.currentTarget.style.color = '#ef4444'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.color = '#94a3b8'; }}
                      title="Remove member"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add Team Member Modal */}
      <AddTeamMemberModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        existingMembers={members}
        systemUsers={systemUsers}
        onMemberAdded={() => fetchTeam()}
      />
    </div>
  );
};

export default TaskforceTeamTab;
