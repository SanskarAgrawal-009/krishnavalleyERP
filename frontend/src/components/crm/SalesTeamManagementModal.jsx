import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { leadService } from '../../services/leadService.js';
import { authService } from '../../services/authService.js';
import { Users, UserPlus, RefreshCw, CheckCircle2, XCircle, Trash2, ArrowRight, ShieldCheck, Clock, Zap } from 'lucide-react';

export const SalesTeamManagementModal = ({
  isOpen,
  onClose,
  onTeamUpdated,
}) => {
  const [teamData, setTeamData] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [addingUser, setAddingUser] = useState(false);

  // Form for adding new member
  const [selectedUserId, setSelectedUserId] = useState('');
  const [newRoleTitle, setNewRoleTitle] = useState('Sales Executive');

  const fetchTeam = async () => {
    try {
      setLoading(true);
      const res = await leadService.getSalesTeam();
      if (res) setTeamData(res);
    } catch (err) {
      console.error('Error fetching sales team:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await authService.getUsers({ limit: 100 });
      if (res.data) setAllUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchTeam();
      fetchUsers();
    }
  }, [isOpen]);

  const handleToggleActive = async (member) => {
    try {
      await leadService.updateSalesTeamMember(member._id, {
        isActiveInRoundRobin: !member.isActiveInRoundRobin,
      });
      fetchTeam();
      if (onTeamUpdated) onTeamUpdated();
    } catch (err) {
      alert(err.message || 'Failed to update member status');
    }
  };

  const handleRemoveMember = async (member) => {
    const memberName = `${member.userId?.firstName || ''} ${member.userId?.lastName || ''}`.trim() || member.userId?.username;
    if (window.confirm(`Remove ${memberName} from the Round-Robin sales pool? (Their user account will remain active).`)) {
      try {
        await leadService.removeSalesTeamMember(member._id);
        fetchTeam();
        if (onTeamUpdated) onTeamUpdated();
      } catch (err) {
        alert(err.message || 'Failed to remove member');
      }
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!selectedUserId) {
      alert('Please select a user from the system');
      return;
    }
    try {
      await leadService.addSalesTeamMember({
        userId: selectedUserId,
        roleTitle: newRoleTitle.trim(),
      });
      setSelectedUserId('');
      setAddingUser(false);
      fetchTeam();
      if (onTeamUpdated) onTeamUpdated();
    } catch (err) {
      alert(err.message || 'Failed to add sales team member');
    }
  };

  if (!isOpen) return null;

  const teamMembers = teamData?.teamMembers || [];
  const nextInQueueId = teamData?.nextInQueue?._id;

  // Filter users not already in team
  const existingUserIds = new Set(teamMembers.map((m) => m.userId?._id?.toString()));
  const eligibleUsers = allUsers.filter((u) => !existingUserIds.has(u._id?.toString()));

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Sales Team & Round-Robin Lead Rotation Engine"
      maxWidth="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Info Banner */}
        <div style={{
          padding: '14px 18px',
          background: 'linear-gradient(135deg, #eff6ff 0%, #f0fdf4 100%)',
          borderRadius: '10px',
          border: '1px solid #bfdbfe',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ fontSize: '0.94rem', fontWeight: '700', color: '#1e3a8a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Zap size={16} color="#2563eb" />
              Automated 1-by-1 Sequential Lead Rotation
            </div>
            <div style={{ fontSize: '0.8rem', color: '#3b82f6', marginTop: '3px' }}>
              Incoming leads are distributed alternatively among active members (Member 1 → Member 2 → Member 3 → Member 1).
            </div>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setAddingUser(!addingUser)}
              className="btn-primary"
              style={{ padding: '7px 14px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              <UserPlus size={14} />
              {addingUser ? 'Close Form' : 'Add Team Member'}
            </button>
            <button
              onClick={fetchTeam}
              className="btn-secondary"
              style={{ padding: '7px 12px' }}
              title="Refresh Team Status"
            >
              <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Add Member Dropdown Form */}
        {addingUser && (
          <form onSubmit={handleAddMember} style={{
            padding: '16px',
            background: '#f8fafc',
            borderRadius: '10px',
            border: '1px dashed #94a3b8',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#0f172a' }}>
              Enroll Existing User into Sales Team Pool
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 2fr auto', gap: '10px', alignItems: 'flex-end' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '4px', display: 'block' }}>
                  Select User *
                </label>
                <select
                  required
                  value={selectedUserId}
                  onChange={(e) => setSelectedUserId(e.target.value)}
                  className="g-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem' }}
                >
                  <option value="">-- Choose System User --</option>
                  {eligibleUsers.map((u) => (
                    <option key={u._id} value={u._id}>
                      {u.firstName} {u.lastName || ''} (@{u.username} • {u.roleId?.roleName || 'Staff'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#475569', marginBottom: '4px', display: 'block' }}>
                  Role Designation *
                </label>
                <input
                  type="text"
                  required
                  value={newRoleTitle}
                  onChange={(e) => setNewRoleTitle(e.target.value)}
                  placeholder="e.g., Sales Executive, Telecaller"
                  className="g-input"
                  style={{ width: '100%', padding: '8px 10px', fontSize: '0.82rem' }}
                />
              </div>

              <button
                type="submit"
                className="btn-primary"
                style={{ padding: '9px 18px', fontSize: '0.82rem', whiteSpace: 'nowrap' }}
              >
                Enroll Member
              </button>
            </div>
          </form>
        )}

        {/* Team Members List */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Current Rotation Queue ({teamMembers.length} Members • {teamData?.activeInRotationCount || 0} Active)
          </div>

          {teamMembers.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#94a3b8' }}>
              No sales team members registered yet.
            </div>
          ) : (
            teamMembers.map((member, index) => {
              const u = member.userId;
              const isNext = member._id === nextInQueueId;
              const isActive = member.isActiveInRoundRobin && u?.status === 'active';

              return (
                <div
                  key={member._id}
                  style={{
                    padding: '14px 18px',
                    borderRadius: '10px',
                    border: isNext ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                    background: isNext ? '#f0f7ff' : (isActive ? '#ffffff' : '#f8fafc'),
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '12px',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {/* Member Identity & Queue Pos */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                    <div style={{
                      width: '32px',
                      height: '32px',
                      borderRadius: '50%',
                      background: isNext ? '#2563eb' : '#e2e8f0',
                      color: isNext ? '#ffffff' : '#475569',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontWeight: '800',
                      fontSize: '0.84rem'
                    }}>
                      {index + 1}
                    </div>

                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '0.94rem', fontWeight: '700', color: '#0f172a' }}>
                          {u?.firstName} {u?.lastName || ''}
                        </span>
                        <span style={{ fontSize: '0.74rem', color: '#64748b' }}>@{u?.username}</span>

                        {isNext && (
                          <span style={{
                            fontSize: '0.68rem',
                            background: '#2563eb',
                            color: '#ffffff',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            fontWeight: '800',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '3px'
                          }}>
                            <Zap size={10} /> NEXT LEAD
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                        {member.roleTitle || 'Sales Executive'} • {u?.mobileNo || 'No Phone'}
                      </div>
                    </div>
                  </div>

                  {/* Workload Stats */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '0.8rem' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>
                        {member.metrics?.totalAssigned || member.leadsAssignedCount || 0}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Total Leads</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '800', color: '#2563eb', fontSize: '0.95rem' }}>
                        {member.metrics?.activeLeads || 0}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Active</div>
                    </div>

                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontWeight: '800', color: '#16a34a', fontSize: '0.95rem' }}>
                        {member.metrics?.convertedLeads || 0}
                      </div>
                      <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Converted</div>
                    </div>

                    {/* Active In Round-Robin Toggle Button */}
                    <button
                      type="button"
                      onClick={() => handleToggleActive(member)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: 'none',
                        cursor: 'pointer',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        background: member.isActiveInRoundRobin ? '#dcfce7' : '#fee2e2',
                        color: member.isActiveInRoundRobin ? '#15803d' : '#b91c1c',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '5px'
                      }}
                      title={member.isActiveInRoundRobin ? 'Click to Pause (e.g., On Leave)' : 'Click to Activate for Round Robin'}
                    >
                      {member.isActiveInRoundRobin ? (
                        <>
                          <CheckCircle2 size={13} /> Active in Rotation
                        </>
                      ) : (
                        <>
                          <XCircle size={13} /> Paused
                        </>
                      )}
                    </button>

                    {/* Remove Member Button */}
                    <button
                      type="button"
                      onClick={() => handleRemoveMember(member)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#94a3b8',
                        cursor: 'pointer',
                        padding: '4px'
                      }}
                      title="Remove from Sales Team Pool"
                    >
                      <Trash2 size={16} color="#ef4444" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button
            onClick={onClose}
            className="btn-primary"
            style={{ padding: '9px 24px', fontSize: '0.85rem' }}
          >
            Done
          </button>
        </div>

      </div>
    </Modal>
  );
};

export default SalesTeamManagementModal;
