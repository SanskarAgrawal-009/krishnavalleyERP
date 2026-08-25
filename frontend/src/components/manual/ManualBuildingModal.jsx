import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';

export const ManualBuildingModal = ({ isOpen, onClose, onSubmit, projectName }) => {
  const [formData, setFormData] = useState({
    buildingName: '',
    buildingCode: '',
    numberOfFloors: 5,
    flatsPerFloor: 4,
    status: 'under_construction'
  });

  const totalEstimatedFlats = (Number(formData.numberOfFloors) || 0) * (Number(formData.flatsPerFloor) || 0);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      numberOfFloors: Number(formData.numberOfFloors),
      flatsPerFloor: Number(formData.flatsPerFloor),
      totalFlats: totalEstimatedFlats
    });
    setFormData({ buildingName: '', buildingCode: '', numberOfFloors: 5, flatsPerFloor: 4, status: 'under_construction' });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Manual Entry: Add Building / Tower to "${projectName || 'Project'}"`}
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Building Name & Code */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Building / Tower Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Tower A (Emerald Heights)"
              value={formData.buildingName}
              onChange={(e) => setFormData({ ...formData, buildingName: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Building Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. TWR-A"
              value={formData.buildingCode}
              onChange={(e) => setFormData({ ...formData, buildingCode: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Floors & Flats Per Floor */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Number of Floors *
            </label>
            <input
              type="number"
              required
              min="1"
              max="150"
              value={formData.numberOfFloors}
              onChange={(e) => setFormData({ ...formData, numberOfFloors: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Flats per Floor
            </label>
            <input
              type="number"
              required
              min="1"
              max="30"
              value={formData.flatsPerFloor}
              onChange={(e) => setFormData({ ...formData, flatsPerFloor: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Total Unit Estimation & Status */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
          <div style={{
            background: '#e8f0fe',
            border: '1px solid #bfdbfe',
            borderRadius: '6px',
            padding: '8px 12px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <span style={{ fontSize: '0.7rem', color: '#1e40af', fontWeight: '700' }}>ESTIMATED TOTAL UNITS</span>
            <span style={{ fontSize: '1.2rem', fontWeight: '800', color: '#1a73e8' }}>{totalEstimatedFlats} Flats</span>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Construction Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="planned">Planned</option>
              <option value="under_construction">Under Construction</option>
              <option value="completed">Completed</option>
              <option value="on_hold">On Hold</option>
            </select>
          </div>
        </div>

        {/* Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '9px 18px', background: '#f3f4f6', color: '#374151', border: '1px solid #dadce0', borderRadius: '6px', fontWeight: '600', cursor: 'pointer' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '9px 22px',
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(26, 115, 232, 0.3)'
            }}
          >
            Add Building
          </button>
        </div>
      </form>
    </Modal>
  );
};
