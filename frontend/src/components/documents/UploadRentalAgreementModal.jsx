import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { rentalService } from '../../services/rentalService.js';
import { projectService } from '../../services/projectService.js';
import { Upload, FileText, CheckCircle2, AlertCircle, Building2, ShieldCheck, Loader2 } from 'lucide-react';

export const UploadRentalAgreementModal = ({ isOpen, onClose, onUpload, onSubmit }) => {
  const [units, setUnits] = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [agreementType, setAgreementType] = useState('lease'); // 'lease' | 'rentback' | 'registry'
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [loadingUnits, setLoadingUnits] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFile(null);
      setErrorMessage('');
      setLoadingUnits(true);

      rentalService.getActiveRentals()
        .then((res) => {
          const list = res.data?.rentals || (Array.isArray(res.data) ? res.data : []);
          if (list && list.length > 0) {
            setUnits(list);
            setSelectedFlatId(list[0]._id);
          } else {
            // Fallback to all flats from project inventory
            projectService.getFlats()
              .then((flatRes) => {
                const flats = flatRes.data?.flats || (Array.isArray(flatRes.data) ? flatRes.data : []);
                setUnits(flats);
                if (flats.length > 0) setSelectedFlatId(flats[0]._id);
              })
              .catch(console.error);
          }
        })
        .catch((err) => {
          console.error('Error fetching rentals for modal:', err);
          projectService.getFlats()
            .then((flatRes) => {
              const flats = flatRes.data?.flats || (Array.isArray(flatRes.data) ? flatRes.data : []);
              setUnits(flats);
              if (flats.length > 0) setSelectedFlatId(flats[0]._id);
            })
            .catch(console.error);
        })
        .finally(() => {
          setLoadingUnits(false);
        });
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedFlatId) {
      setErrorMessage('Please select a property unit.');
      return;
    }
    if (!file) {
      setErrorMessage('Please select a signed agreement or deed PDF/document.');
      return;
    }

    setUploading(true);
    setErrorMessage('');

    try {
      if (agreementType === 'registry') {
        await rentalService.uploadRegistryDocument(selectedFlatId, file);
      } else {
        await rentalService.uploadAgreement(selectedFlatId, file);
      }

      if (typeof onUpload === 'function') {
        onUpload();
      } else if (typeof onSubmit === 'function') {
        onSubmit();
      }
      onClose();
    } catch (err) {
      console.error('Error uploading agreement:', err);
      setErrorMessage(err.message || 'Failed to upload rental agreement');
    } finally {
      setUploading(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Upload Rental / Lease Agreement (Archived in Vault)"
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {errorMessage && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: '#fee2e2',
            border: '1px solid #f87171',
            borderRadius: '6px',
            color: '#b91c1c',
            fontSize: '0.82rem'
          }}>
            <AlertCircle size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
            Select Property Unit / Rental Contract *
          </label>
          <div style={{ position: 'relative' }}>
            <select
              required
              value={selectedFlatId}
              onChange={(e) => setSelectedFlatId(e.target.value)}
              disabled={loadingUnits || uploading}
              style={{
                width: '100%',
                fontSize: '0.84rem',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                background: '#ffffff',
                color: '#111827',
                outline: 'none'
              }}
            >
              {loadingUnits ? (
                <option value="">Loading rental register units...</option>
              ) : units.length === 0 ? (
                <option value="">No units found</option>
              ) : (
                units.map((u) => {
                  const flatNo = u.flatNumber || u.flatId?.flatNumber || 'Unit';
                  const party = u.ownerName || u.tenantDetails?.name || u.ownerDetails?.name || u.currentOwner?.name || 'Owner';
                  const rent = u.rentAmount ? ` • ₹${Number(u.rentAmount).toLocaleString('en-IN')}/mo` : (u.monthlyRent ? ` • ₹${Number(u.monthlyRent).toLocaleString('en-IN')}/mo` : '');
                  return (
                    <option key={u._id} value={u._id}>
                      Flat {flatNo} — {party}{rent}
                    </option>
                  );
                })
              )}
            </select>
          </div>
          <span style={{ fontSize: '0.72rem', color: '#6b7280', marginTop: '4px', display: 'block' }}>
            Select the flat or rental contract to attach this legal agreement to.
          </span>
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
            Agreement Category *
          </label>
          <select
            value={agreementType}
            onChange={(e) => setAgreementType(e.target.value)}
            disabled={uploading}
            style={{
              width: '100%',
              fontSize: '0.84rem',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              background: '#ffffff',
              color: '#111827',
              outline: 'none'
            }}
          >
            <option value="lease">Tenant Lease Deed / Tenancy Agreement (PDF)</option>
            <option value="rentback">Owner Guaranteed Yield Rent-Back Agreement (MOU / PDF)</option>
            <option value="registry">Property Registry Document / Sale Deed (PDF)</option>
          </select>
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '6px', fontWeight: '600' }}>
            Signed Legal Document (PDF / Image) *
          </label>
          <input
            type="file"
            id="rentalAgreementFileInput"
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            required
            disabled={uploading}
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            style={{ display: 'none' }}
          />
          <label
            htmlFor="rentalAgreementFileInput"
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
              padding: '24px 16px',
              background: file ? '#f0fdf4' : '#f9fafb',
              border: `2px dashed ${file ? '#22c55e' : '#d1d5db'}`,
              borderRadius: '8px',
              fontSize: '0.84rem',
              cursor: uploading ? 'not-allowed' : 'pointer',
              color: file ? '#15803d' : '#4b5563',
              fontWeight: '500',
              transition: 'all 0.2s ease',
              textAlign: 'center'
            }}
          >
            {file ? (
              <>
                <CheckCircle2 size={26} color="#16a34a" />
                <div style={{ fontWeight: '700', color: '#16a34a', wordBreak: 'break-all' }}>
                  {file.name}
                </div>
                <div style={{ fontSize: '0.74rem', color: '#4b5563' }}>
                  {formatFileSize(file.size)} • Click to replace file
                </div>
              </>
            ) : (
              <>
                <Upload size={26} color="#6b7280" />
                <div style={{ fontWeight: '600', color: '#1f2937' }}>
                  Click to Browse or Drag & Drop Agreement PDF
                </div>
                <div style={{ fontSize: '0.74rem', color: '#9ca3af' }}>
                  Accepts PDF, DOC, DOCX, JPG, PNG (Max 30MB)
                </div>
              </>
            )}
          </label>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '10px 12px',
          background: '#f8fafc',
          borderRadius: '6px',
          border: '1px solid #e2e8f0',
          fontSize: '0.74rem',
          color: '#475569'
        }}>
          <ShieldCheck size={16} color="#0284c7" />
          <span>Documents are securely archived and encrypted in the S3 vault.</span>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={uploading}
            style={{
              padding: '9px 18px',
              background: '#ffffff',
              color: '#374151',
              borderRadius: '6px',
              border: '1px solid #d1d5db',
              cursor: uploading ? 'not-allowed' : 'pointer',
              fontSize: '0.84rem',
              fontWeight: '600'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={uploading || !file || !selectedFlatId}
            style={{
              padding: '9px 22px',
              background: uploading || !file || !selectedFlatId ? '#9ca3af' : 'linear-gradient(135deg, #10b981, #059669)',
              color: '#ffffff',
              fontWeight: '700',
              borderRadius: '6px',
              cursor: uploading || !file || !selectedFlatId ? 'not-allowed' : 'pointer',
              border: 'none',
              fontSize: '0.84rem',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {uploading ? (
              <>
                <Loader2 size={16} className="spin" />
                Uploading Document...
              </>
            ) : (
              'Upload to Document Vault'
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default UploadRentalAgreementModal;
