import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import { Building2, Home } from 'lucide-react';

export const NewStoreModal = ({ isOpen, onClose, onSubmit }) => {
  const [projects, setProjects] = useState([]);
  const [storeCode, setStoreCode] = useState(`STR-${Date.now().toString().slice(-4)}`);
  const [storeName, setStoreName] = useState('');
  const [projectId, setProjectId] = useState('');
  const [location, setLocation] = useState('Ground Floor Site Warehouse');

  useEffect(() => {
    if (isOpen) {
      projectService.getProjects().then((res) => {
        if (res.data) {
          setProjects(res.data);
          if (res.data.length > 0) setProjectId(res.data[0]._id);
        }
      });
      setStoreCode(`STR-${Date.now().toString().slice(-4)}`);
      setStoreName('');
      setLocation('Ground Floor Site Warehouse');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!projectId || !storeName) {
      alert('Please select a project and enter store name');
      return;
    }
    onSubmit({
      storeCode,
      storeName,
      projectId,
      location,
      status: 'active'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create Project Material Store / Warehouse"
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
            Linked Construction Project *
          </label>
          <select
            required
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            <option value="">-- Select Project --</option>
            {projects.map((p) => (
              <option key={p._id} value={p._id}>
                {p.projectName} ({p.projectCode})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Store Code *
            </label>
            <input
              type="text"
              required
              value={storeCode}
              onChange={(e) => setStoreCode(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Store Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Central Site Warehouse A"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
            Physical Location / Site Bay
          </label>
          <input
            type="text"
            placeholder="e.g. Ground Floor, Tower A North Bay"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #dadce0',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '9px 22px',
              background: '#137333',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(19, 115, 51, 0.3)'
            }}
          >
            Create Store
          </button>
        </div>
      </form>
    </Modal>
  );
};
