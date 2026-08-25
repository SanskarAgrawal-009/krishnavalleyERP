import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { salesService } from '../../services/salesService.js';
import { Upload, FileText, ShoppingBag } from 'lucide-react';

export const UploadSalesAgreementModal = ({ isOpen, onClose, onUpload, onSubmit }) => {
  const [leads, setLeads] = useState([]);
  const [selectedLeadId, setSelectedLeadId] = useState('');
  const [agreementNumber, setAgreementNumber] = useState('');
  const [agreementDate, setAgreementDate] = useState(new Date().toISOString().slice(0, 10));
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      salesService.getSalesLeads().then((res) => {
        const leadList = res.data?.leads || res.data || [];
        setLeads(leadList);
        if (leadList.length > 0) {
          setSelectedLeadId(leadList[0]._id);
        }
      }).catch(console.error);
      setAgreementNumber(`BBA-${Date.now().toString().slice(-6)}`);
      setFile(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedLeadId || !file) {
      alert('Please select a booking/buyer and choose an agreement PDF file');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('agreementDoc', file);
    formData.append('agreementNumber', agreementNumber);
    formData.append('agreementDate', agreementDate);
    formData.append('verificationStatus', 'verified');

    try {
      const uploadFn = onUpload || onSubmit;
      if (typeof uploadFn === 'function') {
        await uploadFn(selectedLeadId, formData);
      } else {
        await salesService.uploadAgreementFile(selectedLeadId, formData);
      }
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to upload sales agreement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Builder-Buyer Sales Agreement (Saved in S3)"
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Select Sales Booking / Buyer *
          </label>
          <select
            required
            value={selectedLeadId}
            onChange={(e) => setSelectedLeadId(e.target.value)}
            style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
          >
            {leads.map((lead) => (
              <option key={lead._id} value={lead._id}>
                {lead.name} • Flat {lead.flatId?.flatNumber || 'Unit'} ({lead.projectId?.projectName || 'Krishna Valley'})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
              Agreement Document No. *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. BBA-2026-0042"
              value={agreementNumber}
              onChange={(e) => setAgreementNumber(e.target.value)}
              style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
              Execution Date *
            </label>
            <input
              type="date"
              required
              value={agreementDate}
              onChange={(e) => setAgreementDate(e.target.value)}
              style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Agreement File (PDF Document) *
          </label>
          <input
            type="file"
            id="salesAgreementFileInput"
            accept=".pdf,.doc,.docx"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="salesAgreementFileInput"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '18px',
              background: '#f8f9fa',
              border: '1px dashed var(--border-subtle)',
              borderRadius: '6px',
              fontSize: '0.82rem',
              cursor: 'pointer',
              color: file ? '#10b981' : '#4b5563',
              fontWeight: '500'
            }}
          >
            <Upload size={18} />
            {file ? `Selected: ${file.name}` : 'Click to Browse Signed BBA Sales Agreement PDF'}
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f8f9fa', color: '#374151', borderRadius: '6px', border: '1px solid #dadce0', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={uploading || !file} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #1a73e8, #0d47a1)', color: '#ffffff', fontWeight: '700', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
            {uploading ? 'Uploading to S3...' : 'Upload Sales Agreement to S3'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
