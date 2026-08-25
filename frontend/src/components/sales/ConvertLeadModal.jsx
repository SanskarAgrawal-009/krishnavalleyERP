import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { User, Phone, Home, Building2, Layers, CheckCircle2, ArrowRight } from 'lucide-react';
import { projectService } from '../../services/projectService.js';

export const ConvertLeadModal = ({ isOpen, onClose, onConvert, lead = null }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && lead) {
      setLoading(true);
      const flatObj = lead.assignedFlat;
      const initialFlatId = flatObj?._id || (typeof flatObj === 'string' ? flatObj : '');
      const initialProjId = flatObj?.projectId?._id || flatObj?.projectId || '';
      const initialBldId = flatObj?.buildingId?._id || flatObj?.buildingId || '';

      if (initialFlatId) setSelectedFlatId(initialFlatId);
      if (initialProjId) setSelectedProjectId(initialProjId);
      if (initialBldId) setSelectedBuildingId(initialBldId);

      projectService.getProjects()
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setProjects(res.data);
            const pId = initialProjId || res.data[0]._id || res.data[0].id;
            setSelectedProjectId(pId);

            const proj = res.data.find((p) => (p._id || p.id) === pId) || res.data[0];
            if (proj?.buildings && proj.buildings.length > 0) {
              const bId = initialBldId || proj.buildings[0]._id || proj.buildings[0].id;
              setSelectedBuildingId(bId);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, lead]);

  // Load flats when building is chosen
  useEffect(() => {
    if (selectedProjectId && selectedBuildingId) {
      projectService.getFlats({ projectId: selectedProjectId, buildingId: selectedBuildingId })
        .then((res) => {
          if (res.data) {
            setFlats(res.data);
            // If lead already has assigned flat in this building, keep it, else pick first flat
            const hasAssigned = res.data.some((f) => f._id === selectedFlatId);
            if (!hasAssigned && res.data.length > 0) {
              setSelectedFlatId(res.data[0]._id);
            }
          }
        });
    } else {
      setFlats([]);
    }
  }, [selectedProjectId, selectedBuildingId]);

  const selectedProject = projects.find((p) => (p._id || p.id) === selectedProjectId);
  const buildings = selectedProject?.buildings || [];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!selectedFlatId) {
      alert('Please select a Flat/Unit to complete sales conversion');
      return;
    }

    onConvert({
      leadId: lead._id,
      projectId: selectedProjectId || selectedProject?._id,
      buildingId: selectedBuildingId,
      flatId: selectedFlatId
    });
  };

  if (!lead) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Convert Lead to Sales: "${lead.name}"`}
      maxWidth="560px"
    >
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Customer Summary Box */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dadce0',
          borderRadius: 'var(--radius-sm)',
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <User size={15} color="var(--primary-500)" /> {lead.name}
            </div>
            <div style={{ fontSize: '0.8rem', color: '#374151', marginTop: '2px', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Phone size={13} color="#10b981" /> {lead.mobileNo} {lead.email ? `• ${lead.email}` : ''}
            </div>
          </div>

          <span style={{ fontSize: '0.75rem', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', padding: '4px 8px', borderRadius: '4px', fontWeight: '700' }}>
            Ready for Booking
          </span>
        </div>

        {/* Property Selector Hierarchy */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <span style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827' }}>
            Allot Property Unit *
          </span>

          {/* Project */}
          <div>
            <label style={{ fontSize: '0.75rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
              <Building2 size={13} color="var(--primary-500)" /> Select Project *
            </label>
            <select
              required
              value={selectedProjectId}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                setSelectedBuildingId('');
                setSelectedFlatId('');
              }}
              style={{ width: '100%' }}
            >
              <option value="">-- Choose Project --</option>
              {projects.map((p) => (
                <option key={p._id || p.id} value={p._id || p.id}>
                  {p.projectName} ({p.projectCode})
                </option>
              ))}
            </select>
          </div>

          {/* Building */}
          {selectedProjectId && (
            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '3px' }}>
                <Layers size={13} color="#60a5fa" /> Select Building / Tower *
              </label>
              <select
                required
                value={selectedBuildingId}
                onChange={(e) => {
                  setSelectedBuildingId(e.target.value);
                  setSelectedFlatId('');
                }}
                style={{ width: '100%' }}
              >
                <option value="">-- Choose Building / Tower --</option>
                {buildings.map((b) => (
                  <option key={b._id || b.id} value={b._id || b.id}>
                    {b.buildingName} ({b.buildingCode}) • {b.numberOfFloors} Floors
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Flat */}
          {selectedBuildingId && (
            <div>
              <label style={{ fontSize: '0.78rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '4px', marginBottom: '4px', fontWeight: '700' }}>
                <Home size={13} color="#8b5cf6" /> Select Flat / Unit *
              </label>
              <select
                required
                value={selectedFlatId}
                onChange={(e) => setSelectedFlatId(e.target.value)}
                style={{ width: '100%', fontSize: '0.85rem' }}
              >
                <option value="">-- Choose Flat --</option>
                {flats.map((f) => {
                  const flr = f.floor !== undefined && f.floor !== null ? f.floor : 1;
                  return (
                    <option key={f._id} value={f._id}>
                      Flat {f.flatNumber} (Floor {flr}) • {f.bhkType || '2BHK'} • Status: {f.status} {f.takenForRental ? '(Rental)' : ''}
                    </option>
                  );
                })}
              </select>

              {selectedFlatId && (() => {
                const matchedFlat = flats.find((f) => f._id === selectedFlatId);
                if (!matchedFlat) return null;
                return (
                  <div style={{
                    marginTop: '8px',
                    padding: '10px 14px',
                    background: '#f0fdf4',
                    border: '1px solid #bbf7d0',
                    borderRadius: '6px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '12px',
                    fontSize: '0.78rem',
                    color: '#166534'
                  }}>
                    <div>🏢 <strong>Floor:</strong> Floor {matchedFlat.floor || 1}</div>
                    <div>•</div>
                    <div>🏠 <strong>Config:</strong> {matchedFlat.bhkType || '2BHK'} ({matchedFlat.carpetArea || 950} sq.ft)</div>
                    <div>•</div>
                    <div>🧭 <strong>Facing:</strong> {matchedFlat.facing || 'East'}</div>
                    <div>•</div>
                    <div>💰 <strong>Valuation:</strong> ₹{(matchedFlat.basePrice || 4500000).toLocaleString('en-IN')}</div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        {/* Note */}
        <div style={{
          fontSize: '0.75rem',
          color: '#414754',
          background: '#e8f0fe',
          padding: '10px 14px',
          borderRadius: '6px',
          border: '1px solid #d2e3fc',
          lineHeight: 1.4
        }}>
          <strong>Note:</strong> Converting this lead will automatically initialize the <strong>Sales Lifecycle</strong> (Booking, Agreement, Payment Plan, Receipts & Demand Letters) and update the Flat inventory status to <strong>HOLD</strong>.
        </div>

        {/* Submit Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', background: '#f8f9fa', color: '#374151', borderRadius: 'var(--radius-sm)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '8px 20px',
              background: 'linear-gradient(135deg, #10b981, var(--primary-700))',
              color: '#111827',
              fontWeight: '700',
              borderRadius: 'var(--radius-sm)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer'
            }}
          >
            Confirm & Send to Sales <ArrowRight size={15} />
          </button>
        </div>
      </form>
    </Modal>
  );
};
