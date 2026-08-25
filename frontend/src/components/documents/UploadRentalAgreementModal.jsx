import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { rentalService } from '../../services/rentalService.js';
import { Upload, Repeat, FileText } from 'lucide-react';

export const UploadRentalAgreementModal = ({ isOpen, onClose, onUpload, onSubmit }) => {
  const [rentals, setRentals] = useState([]);
  const [selectedRentalId, setSelectedRentalId] = useState('');
  const [agreementType, setAgreementType] = useState('tenant'); // 'tenant' | 'rentback'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      rentalService.getRentals().then((res) => {
        const list = res.data?.rentals || res.data || [];
        setRentals(list);
        if (list.length > 0) {
          setSelectedRentalId(list[0]._id);
        }
      }).catch(console.error);
      setFile(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedRentalId || !file) {
      alert('Please choose a rental contract and select an agreement PDF');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('agreementFile', file);

    try {
      if (agreementType === 'tenant') {
        await rentalService.uploadTenantAgreementDoc(selectedRentalId, formData);
      } else {
        await rentalService.uploadRentBackDoc(selectedRentalId, formData);
      }
      if (typeof onUpload === 'function') onUpload();
      if (typeof onSubmit === 'function') onSubmit();
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to upload rental agreement');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Rental / Lease Agreement (Saved in S3)"
      maxWidth="560px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Select Property Rental Contract *
          </label>
          <select
            required
            value={selectedRentalId}
            onChange={(e) => setSelectedRentalId(e.target.value)}
            style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
          >
            {rentals.map((r) => (
              <option key={r._id} value={r._id}>
                Flat {r.flatId?.flatNumber || 'Unit'} • {r.tenantDetails?.name || r.ownerDetails?.name || 'Contract'} ({r.tenantType || 'Rental'})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Agreement Category *
          </label>
          <select
            value={agreementType}
            onChange={(e) => setAgreementType(e.target.value)}
            style={{ width: '100%', fontSize: '0.82rem', padding: '8px 10px' }}
          >
            <option value="tenant">Tenant Lease Deed / Tenancy Agreement</option>
            <option value="rentback">Owner Rent-Back Guaranteed Yield Agreement</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Signed Agreement PDF *
          </label>
          <input
            type="file"
            id="rentalAgreementFileInput"
            accept=".pdf,.doc,.docx"
            required
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="rentalAgreementFileInput"
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
            {file ? `Selected: ${file.name}` : 'Click to Browse Signed Rental / Lease Agreement PDF'}
          </label>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f8f9fa', color: '#374151', borderRadius: '6px', border: '1px solid #dadce0', cursor: 'pointer' }}>
            Cancel
          </button>
          <button type="submit" disabled={uploading || !file} style={{ padding: '8px 20px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#ffffff', fontWeight: '700', borderRadius: '6px', cursor: 'pointer', border: 'none' }}>
            {uploading ? 'Uploading to S3...' : 'Upload Rental Agreement to S3'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
