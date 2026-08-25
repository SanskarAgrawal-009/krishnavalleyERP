import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import { Upload, Layers } from 'lucide-react';

export const UploadBlueprintModal = ({ isOpen, onClose, onUpload, onSubmit }) => {
  const [projects, setProjects] = useState([]);
  const [flats, setFlats] = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [title, setTitle] = useState('');
  const [floorPlanType, setFloorPlanType] = useState('2d_layout');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      projectService.getFlats().then((res) => {
        if (res.data) {
          setFlats(res.data);
          if (res.data.length > 0) setSelectedFlatId(res.data[0]._id);
        }
      });
      setTitle('');
      setFile(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFlatId || !file) {
      alert('Please choose a flat and select a blueprint file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('blueprintFile', file);
    formData.append('title', title || file.name);
    formData.append('floorPlanType', floorPlanType);

    try {
      const uploadFn = onUpload || onSubmit;
      if (typeof uploadFn === 'function') {
        await uploadFn(selectedFlatId, formData);
      }
      onClose();
    } catch (err) {
      alert(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Architectural Blueprint / Floorplan (Saved in S3)"
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div>
          <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Select Property Flat *</label>
          <select
            required
            value={selectedFlatId}
            onChange={(e) => setSelectedFlatId(e.target.value)}
            style={{ width: '100%', fontSize: '0.8rem' }}
          >
            {flats.map((f) => (
              <option key={f._id} value={f._id}>
                Flat {f.flatNumber} • {f.projectId?.projectName || 'Project'} ({f.status})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Blueprint Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. 3BHK Luxury Layout & Electrical Grid"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Plan Type</label>
            <select
              value={floorPlanType}
              onChange={(e) => setFloorPlanType(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              <option value="2d_layout">2D Layout Plan</option>
              <option value="3d_render">3D Architectural Render</option>
              <option value="structural">Structural RCC Detail</option>
              <option value="electrical">Electrical Wiring</option>
              <option value="plumbing">Plumbing & Drainage</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '4px' }}>Blueprint File (PDF, CAD DWG, PNG, JPEG) *</label>
          <input
            type="file"
            id="bpFileInput"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="bpFileInput"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '16px',
              background: '#f8f9fa',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '4px',
              fontSize: '0.8rem',
              cursor: 'pointer',
              color: file ? '#10b981' : 'var(--text-secondary)'
            }}
          >
            <Upload size={16} />
            {file ? `Selected: ${file.name}` : 'Click to Browse Blueprint Document'}
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 14px', background: '#f8f9fa', color: '#374151', borderRadius: '4px' }}>
            Cancel
          </button>
          <button type="submit" disabled={uploading || !file} style={{ padding: '7px 18px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#111827', fontWeight: '700', borderRadius: '4px', cursor: 'pointer' }}>
            {uploading ? 'Uploading to S3...' : 'Upload Blueprint to S3'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
