import React, { useState, useMemo } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Trash2, AlertTriangle, CheckSquare, Square, RefreshCw, Layers } from 'lucide-react';
import { leadService } from '../../services/leadService.js';

const ALL_STAGES = [
  { id: 'lost', label: 'Lost / Dropped', color: '#dc2626', bg: '#fef2f2', border: '#fecaca', desc: 'Leads marked as uninterested, budget mismatch, or unresponsive' },
  { id: 'new', label: 'New Prospect', color: '#1a73e8', bg: '#eff6ff', border: '#bfdbfe', desc: 'Freshly ingested leads awaiting first contact' },
  { id: 'contacted', label: 'Contacted', color: '#0284c7', bg: '#f0f9ff', border: '#bae6fd', desc: 'Initial contact made, preliminary inquiry completed' },
  { id: 'in_discussion', label: 'In Discussion', color: '#7c3aed', bg: '#f5f3ff', border: '#ddd6fe', desc: 'Active conversation regarding floor plans and quotations' },
  { id: 'followup_scheduled', label: 'Follow-Up Scheduled', color: '#b45309', bg: '#fef3c7', border: '#fde68a', desc: 'Specific callback or meeting scheduled in calendar' },
  { id: 'site_visit_scheduled', label: 'Visit Scheduled', color: '#ea580c', bg: '#fff7ed', border: '#ffedd5', desc: 'Prospect scheduled to visit site and inspect units' },
  { id: 'site_visit_completed', label: 'Site Visit Done', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0', desc: 'Completed walkthrough on site with relationship manager' },
  { id: 'negotiation', label: 'Negotiation', color: '#4338ca', border: '#c7d2fe', bg: '#e0e7ff', desc: 'Price or payment plan discussions underway' },
  { id: 'converted', label: 'Converted Deal', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0', desc: 'Booked / converted deals' },
];

export const BulkDeleteByStageModal = ({
  isOpen,
  onClose,
  onSuccess,
  leads = [],
  initialStage = null
}) => {
  const [selectedStages, setSelectedStages] = useState([]);
  const [confirmInput, setConfirmInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Sync initial stage when modal opens
  React.useEffect(() => {
    if (isOpen) {
      if (initialStage && ALL_STAGES.some((s) => s.id === initialStage)) {
        setSelectedStages([initialStage]);
      } else {
        setSelectedStages([]);
      }
      setConfirmInput('');
      setErrorMsg('');
    }
  }, [isOpen, initialStage]);

  // Compute live count of leads for each stage
  const stageCounts = useMemo(() => {
    const counts = {};
    ALL_STAGES.forEach((s) => {
      counts[s.id] = 0;
    });
    leads.forEach((l) => {
      const st = l.status || 'new';
      if (counts[st] !== undefined) {
        counts[st]++;
      } else {
        counts[st] = (counts[st] || 0) + 1;
      }
    });
    return counts;
  }, [leads]);

  // Compute total leads that would be deleted
  const totalLeadsToDelete = useMemo(() => {
    return selectedStages.reduce((acc, st) => acc + (stageCounts[st] || 0), 0);
  }, [selectedStages, stageCounts]);

  const toggleStage = (stageId) => {
    setErrorMsg('');
    setSelectedStages((prev) =>
      prev.includes(stageId)
        ? prev.filter((s) => s !== stageId)
        : [...prev, stageId]
    );
  };

  const handleSelectAllWithLeads = () => {
    setErrorMsg('');
    const withLeads = ALL_STAGES.filter((s) => (stageCounts[s.id] || 0) > 0).map((s) => s.id);
    setSelectedStages(withLeads);
  };

  const handleClearSelection = () => {
    setErrorMsg('');
    setSelectedStages([]);
  };

  const isConfirmed = confirmInput.trim().toUpperCase() === 'DELETE';

  const handleDelete = async () => {
    if (selectedStages.length === 0) {
      setErrorMsg('Please select at least one stage to delete leads from.');
      return;
    }

    if (totalLeadsToDelete === 0) {
      setErrorMsg('Selected stages currently have 0 leads to delete.');
      return;
    }

    if (!isConfirmed) {
      setErrorMsg('Please type DELETE in the box below to confirm permanent deletion.');
      return;
    }

    setLoading(true);
    setErrorMsg('');
    try {
      const res = await leadService.bulkDeleteByStage({
        stages: selectedStages
      });

      if (res.success) {
        alert(res.message || `Successfully deleted ${res.deletedCount || totalLeadsToDelete} leads.`);
        if (onSuccess) onSuccess(res.deletedCount);
        onClose();
      } else {
        setErrorMsg(res.message || 'Failed to bulk delete leads.');
      }
    } catch (err) {
      setErrorMsg(err.message || 'An error occurred while deleting leads.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Bulk Delete Leads by Stage"
      maxWidth="680px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Warning Banner */}
        <div style={{
          display: 'flex',
          gap: '12px',
          alignItems: 'flex-start',
          padding: '12px 14px',
          background: '#fef2f2',
          border: '1px solid #fecaca',
          borderRadius: '8px',
          color: '#991b1b',
          fontSize: '0.82rem'
        }}>
          <AlertTriangle size={18} style={{ flexShrink: 0, marginTop: '2px', color: '#dc2626' }} />
          <div>
            <strong style={{ display: 'block', fontSize: '0.86rem', marginBottom: '2px', color: '#b91c1c' }}>
              Permanent Deletion Warning
            </strong>
            Deleting leads by stage permanently purges all matching lead records, their contact information, follow-up history logs, and notes from MongoDB. This operation cannot be undone.
          </div>
        </div>

        {/* Quick Select Bar */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Layers size={15} color="#475569" />
            <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#1e293b' }}>
              Select Pipeline Stage(s) to Delete:
            </span>
          </div>
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={handleSelectAllWithLeads}
              style={{
                background: '#f1f5f9',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: '700',
                color: '#334155',
                cursor: 'pointer'
              }}
            >
              Select All Active
            </button>
            <button
              type="button"
              onClick={handleClearSelection}
              style={{
                background: 'transparent',
                border: '1px solid #e2e8f0',
                borderRadius: '6px',
                padding: '4px 10px',
                fontSize: '0.74rem',
                fontWeight: '600',
                color: '#64748b',
                cursor: 'pointer'
              }}
            >
              Clear
            </button>
          </div>
        </div>

        {/* Stage Selection Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))',
          gap: '10px',
          maxHeight: '280px',
          overflowY: 'auto',
          padding: '4px',
          borderRadius: '8px'
        }}>
          {ALL_STAGES.map((s) => {
            const isSelected = selectedStages.includes(s.id);
            const count = stageCounts[s.id] || 0;
            return (
              <div
                key={s.id}
                onClick={() => toggleStage(s.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  border: isSelected ? `2px solid ${s.color}` : '1px solid #e2e8f0',
                  background: isSelected ? s.bg : '#ffffff',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease',
                  boxShadow: isSelected ? '0 2px 4px rgba(0,0,0,0.06)' : 'none'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {isSelected ? (
                    <CheckSquare size={16} color={s.color} />
                  ) : (
                    <Square size={16} color="#94a3b8" />
                  )}
                  <div>
                    <div style={{ fontSize: '0.82rem', fontWeight: '700', color: isSelected ? s.color : '#1e293b' }}>
                      {s.label}
                    </div>
                    <div style={{ fontSize: '0.70rem', color: '#64748b' }}>
                      Stage: {s.id}
                    </div>
                  </div>
                </div>

                <span style={{
                  fontSize: '0.75rem',
                  fontWeight: '800',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  background: count > 0 ? (isSelected ? s.color : '#f1f5f9') : '#f8fafc',
                  color: count > 0 ? (isSelected ? '#ffffff' : '#0f172a') : '#94a3b8'
                }}>
                  {count}
                </span>
              </div>
            );
          })}
        </div>

        {/* Impact Summary Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: selectedStages.length > 0 ? '#fff1f2' : '#f8fafc',
          border: selectedStages.length > 0 ? '1px solid #fecdd3' : '1px solid #e2e8f0',
          borderRadius: '8px'
        }}>
          <div>
            <span style={{ fontSize: '0.78rem', color: '#64748b', display: 'block' }}>
              Stages Selected: <strong>{selectedStages.length}</strong>
            </span>
            <span style={{ fontSize: '0.94rem', fontWeight: '800', color: selectedStages.length > 0 ? '#be123c' : '#334155' }}>
              Total Leads to Delete: {totalLeadsToDelete}
            </span>
          </div>
          {selectedStages.length > 0 && (
            <div style={{
              display: 'flex',
              gap: '4px',
              flexWrap: 'wrap',
              maxWidth: '300px',
              justifyContent: 'flex-end'
            }}>
              {selectedStages.map((st) => (
                <span
                  key={st}
                  style={{
                    fontSize: '0.68rem',
                    fontWeight: '700',
                    background: '#ffffff',
                    border: '1px solid #fda4af',
                    color: '#be123c',
                    padding: '2px 6px',
                    borderRadius: '4px'
                  }}
                >
                  {ALL_STAGES.find((x) => x.id === st)?.label || st} ({stageCounts[st] || 0})
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Safety Confirmation Text */}
        {totalLeadsToDelete > 0 && (
          <div style={{
            background: '#fafafa',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            padding: '12px 14px'
          }}>
            <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '6px' }}>
              Type <span style={{ color: '#dc2626', fontWeight: '900', letterSpacing: '0.05em' }}>DELETE</span> below to confirm:
            </label>
            <input
              type="text"
              placeholder="Type DELETE to confirm"
              value={confirmInput}
              onChange={(e) => {
                setConfirmInput(e.target.value);
                setErrorMsg('');
              }}
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                border: isConfirmed ? '2px solid #16a34a' : '1px solid #cbd5e1',
                fontSize: '0.86rem',
                fontWeight: '700',
                outline: 'none',
                boxSizing: 'border-box'
              }}
            />
          </div>
        )}

        {errorMsg && (
          <div style={{ color: '#dc2626', fontSize: '0.80rem', fontWeight: '700' }}>
            {errorMsg}
          </div>
        )}

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '9px 18px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #dadce0',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={loading || selectedStages.length === 0 || totalLeadsToDelete === 0 || !isConfirmed}
            style={{
              padding: '9px 20px',
              background: (loading || selectedStages.length === 0 || totalLeadsToDelete === 0 || !isConfirmed)
                ? '#9ca3af'
                : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '800',
              fontSize: '0.82rem',
              cursor: (loading || selectedStages.length === 0 || totalLeadsToDelete === 0 || !isConfirmed)
                ? 'not-allowed'
                : 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: (loading || selectedStages.length === 0 || totalLeadsToDelete === 0 || !isConfirmed)
                ? 'none'
                : '0 2px 6px rgba(220, 38, 38, 0.3)'
            }}
          >
            {loading ? (
              <>
                <RefreshCw size={14} className="spin" /> Deleting {totalLeadsToDelete} Leads...
              </>
            ) : (
              <>
                <Trash2 size={14} /> Delete {totalLeadsToDelete} Leads in Stage(s)
              </>
            )}
          </button>
        </div>
      </div>
    </Modal>
  );
};
