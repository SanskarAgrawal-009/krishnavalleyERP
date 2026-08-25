import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';

export const ManualProjectModal = ({ isOpen, onClose, onSubmit, project = null }) => {
  const [formData, setFormData] = useState({
    projectName: '',
    projectCode: '',
    address: {
      addressLine1: '',
      addressLine2: '',
      locality: '',
      city: '',
      state: '',
      pincode: '',
      country: 'India'
    },
    status: 'planning'
  });

  useEffect(() => {
    if (project) {
      setFormData({
        projectName: project.projectName || '',
        projectCode: project.projectCode || '',
        address: {
          addressLine1: project.address?.addressLine1 || '',
          addressLine2: project.address?.addressLine2 || '',
          locality: project.address?.locality || '',
          city: project.address?.city || '',
          state: project.address?.state || '',
          pincode: project.address?.pincode || '',
          country: project.address?.country || 'India'
        },
        status: project.status || 'planning'
      });
    } else {
      setFormData({
        projectName: '',
        projectCode: '',
        address: {
          addressLine1: '',
          addressLine2: '',
          locality: '',
          city: '',
          state: '',
          pincode: '',
          country: 'India'
        },
        status: 'planning'
      });
    }
  }, [project, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={project ? `Edit Project: ${project.projectName}` : 'Manual Entry: New Project'}
      maxWidth="650px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Row 1: Project Name & Code */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px' }}>
              Project Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Krishna Valley Heights"
              value={formData.projectName}
              onChange={(e) => setFormData({ ...formData, projectName: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px' }}>
              Project Code *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. KVH-01"
              value={formData.projectCode}
              onChange={(e) => setFormData({ ...formData, projectCode: e.target.value })}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* Address Fields */}
        <div style={{ background: '#f8f9fa', padding: '14px', borderRadius: 'var(--radius-sm)', border: '1px solid #dadce0', display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#4b5563' }}>Project Address</span>
          
          <div>
            <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
              Address Line 1 *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Plot No 12, Main Mathura Road"
              value={formData.address.addressLine1}
              onChange={(e) => setFormData({ ...formData, address: { ...formData.address, addressLine1: e.target.value } })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Address Line 2
              </label>
              <input
                type="text"
                placeholder="e.g. Near Krishna Temple"
                value={formData.address.addressLine2}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, addressLine2: e.target.value } })}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Locality
              </label>
              <input
                type="text"
                placeholder="e.g. Chhatikara"
                value={formData.address.locality}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, locality: e.target.value } })}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                City *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Vrindavan"
                value={formData.address.city}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, city: e.target.value } })}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                State *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Uttar Pradesh"
                value={formData.address.state}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, state: e.target.value } })}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Pincode *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 281121"
                value={formData.address.pincode}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, pincode: e.target.value } })}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Country
              </label>
              <input
                type="text"
                value={formData.address.country}
                onChange={(e) => setFormData({ ...formData, address: { ...formData.address, country: e.target.value } })}
                style={{ width: '100%', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Status */}
        <div>
          <label style={{ fontSize: '0.8rem', color: '#374151', display: 'block', marginBottom: '4px' }}>
            Project Status
          </label>
          <select
            value={formData.status}
            onChange={(e) => setFormData({ ...formData, status: e.target.value })}
            style={{ width: '100%' }}
          >
            <option value="planning">Planning</option>
            <option value="under_construction">Under Construction</option>
            <option value="completed">Completed</option>
            <option value="on_hold">On Hold</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {/* Buttons */}
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
              background: 'linear-gradient(135deg, var(--primary-600), var(--primary-700))',
              color: '#111827',
              fontWeight: '700',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            {project ? 'Save Project' : 'Create Project'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
