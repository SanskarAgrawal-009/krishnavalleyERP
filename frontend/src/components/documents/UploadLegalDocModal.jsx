import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import { ShieldCheck, Upload, FileText } from 'lucide-react';

export const UploadLegalDocModal = ({ isOpen, onClose, onUpload, onSubmit }) => {
  const [projects, setProjects] = useState([]);
  const [projectId, setProjectId] = useState('');
  const [title, setTitle] = useState('');
  const [documentType, setDocumentType] = useState('rera_registration');
  const [issuingAuthority, setIssuingAuthority] = useState('Rajasthan Real Estate Regulatory Authority (RERA)');
  const [issueDate, setIssueDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState('');
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      projectService.getProjects().then((res) => {
        if (res.data) {
          setProjects(res.data);
          if (res.data.length > 0) setProjectId(res.data[0]._id);
        }
      });
      setTitle('');
      setFile(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file || !title) {
      alert('Please enter title and select document file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('legalFile', file);
    formData.append('title', title);
    formData.append('documentType', documentType);
    formData.append('projectId', projectId);
    formData.append('issuingAuthority', issuingAuthority);
    formData.append('issueDate', issueDate);
    formData.append('description', description);

    try {
      const uploadFn = onUpload || onSubmit;
      if (typeof uploadFn === 'function') {
        await uploadFn(formData);
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
      title="Upload Legal Master Document (Saved in S3)"
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Document Title *</label>
            <input
              type="text"
              required
              placeholder="e.g. Project Phase 1 RERA Registration Certificate"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Legal Category *</label>
            <select
              value={documentType}
              onChange={(e) => setDocumentType(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              <option value="rera_registration">RERA Registration</option>
              <option value="land_title_deed">Land Title & Ownership Deed</option>
              <option value="sanctioned_plan">Municipal Sanctioned Plan</option>
              <option value="fire_noc">Fire & Safety NOC</option>
              <option value="occupancy_certificate">Occupancy Certificate (OC)</option>
              <option value="completion_certificate">Completion Certificate (CC)</option>
              <option value="environmental_clearance">Environmental Clearance</option>
              <option value="maintenance_bylaws">Society Maintenance Bylaws</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Related Project</label>
            <select
              value={projectId}
              onChange={(e) => setProjectId(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              <option value="">-- Master Document (Global) --</option>
              {projects.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.projectName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Issuing Authority</label>
            <input
              type="text"
              value={issuingAuthority}
              onChange={(e) => setIssuingAuthority(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '4px' }}>Document File (PDF or High-Res Scan) *</label>
          <input
            type="file"
            id="legalFileInput"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="legalFileInput"
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
            {file ? `Selected: ${file.name}` : 'Click to Browse Legal Master PDF'}
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 14px', background: '#f8f9fa', color: '#374151', borderRadius: '4px' }}>
            Cancel
          </button>
          <button type="submit" disabled={uploading || !file} style={{ padding: '7px 18px', background: 'linear-gradient(135deg, #3b82f6, #1d4ed8)', color: '#111827', fontWeight: '700', borderRadius: '4px', cursor: 'pointer' }}>
            {uploading ? 'Uploading to S3...' : 'Upload Legal Doc to S3'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
