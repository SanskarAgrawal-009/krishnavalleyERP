import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { maintenanceService } from '../../services/maintenanceService.js';
import { 
  Wrench, 
  User, 
  Phone, 
  Home, 
  Calendar, 
  DollarSign, 
  CheckCircle, 
  Clock, 
  Upload, 
  ExternalLink,
  ShieldCheck,
  Loader2
} from 'lucide-react';

export const ServiceRequestDetailModal = ({
  isOpen,
  onClose,
  serviceRequest,
  request: propRequest,
  onUpdateRequest,
  onUpdateStatus,
  onSubmit,
  onUploadPhoto
}) => {
  const reqData = serviceRequest || propRequest;

  const [status, setStatus] = useState('open');
  const [techName, setTechName] = useState('');
  const [techPhone, setTechPhone] = useState('');
  const [estimatedCost, setEstimatedCost] = useState(0);
  const [finalCost, setFinalCost] = useState(0);
  const [resolutionNotes, setResolutionNotes] = useState('');
  const [billedTo, setBilledTo] = useState('free_warranty');
  const [submitting, setSubmitting] = useState(false);

  const [photoFile, setPhotoFile] = useState(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);

  useEffect(() => {
    if (reqData) {
      setStatus(reqData.status || 'open');
      setTechName(reqData.assignedTechnician?.name || reqData.assignedTo || '');
      setTechPhone(reqData.assignedTechnician?.phone || '');
      setEstimatedCost(reqData.estimatedCost || 0);
      setFinalCost(reqData.finalCost || 0);
      setResolutionNotes(reqData.resolutionNotes || '');
      setBilledTo(reqData.billedTo || 'free_warranty');
      setPhotoFile(null);
    }
  }, [reqData, isOpen]);

  if (!isOpen || !reqData) return null;

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    const payload = {
      status,
      assignedTechnician: {
        name: techName,
        phone: techPhone,
        agency: 'Facilities Service Team'
      },
      assignedTo: techName,
      estimatedCost: Number(estimatedCost),
      finalCost: Number(finalCost),
      resolutionNotes,
      billedTo
    };

    try {
      if (onUpdateRequest) {
        await onUpdateRequest(reqData._id || reqData.id, payload);
      } else if (onUpdateStatus) {
        await onUpdateStatus(reqData._id || reqData.id, payload, resolutionNotes);
      } else if (onSubmit) {
        await onSubmit(reqData._id || reqData.id, payload);
      }
    } catch (err) {
      console.error('Error updating work order:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const handlePhotoUpload = async (e) => {
    e.preventDefault();
    if (!photoFile) return;
    setUploadingPhoto(true);
    const formData = new FormData();
    formData.append('photoFile', photoFile);

    try {
      if (onUploadPhoto) {
        await onUploadPhoto(reqData._id || reqData.id, formData);
      } else {
        await maintenanceService.uploadServicePhoto(reqData._id || reqData.id, formData);
      }
      alert('Service photo uploaded successfully!');
      setPhotoFile(null);
      if (onClose) onClose();
    } catch (err) {
      alert(err.message || 'Failed to upload photo');
    } finally {
      setUploadingPhoto(false);
    }
  };

  const photos = reqData.photos || [];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Work Order Ticket #${reqData.ticketNumber || reqData.ticketCode || 'Ticket'} — Flat ${reqData.flatId?.flatNumber || 'Unit'}`}
      maxWidth="720px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Ticket Header Banner */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dadce0',
          borderRadius: '8px',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
              <span style={{ fontSize: '1.15rem', fontWeight: '800', color: '#111827' }}>{reqData.title}</span>
              <StatusBadge status={reqData.status} />
              <span style={{ fontSize: '0.72rem', padding: '2px 8px', borderRadius: '4px', background: '#fee2e2', color: '#dc2626', fontWeight: '700', textTransform: 'uppercase' }}>
                {reqData.priority || 'medium'} Priority
              </span>
            </div>

            <div style={{ display: 'flex', gap: '12px', fontSize: '0.78rem', color: '#4b5563', marginTop: '6px', flexWrap: 'wrap' }}>
              <span><strong>Unit:</strong> Flat {reqData.flatId?.flatNumber || 'N/A'} ({reqData.projectId?.projectName || 'Project'})</span>
              {reqData.requesterId && <span>• <strong>Requester:</strong> {reqData.requesterId?.name} ({reqData.requesterType || 'Resident'})</span>}
              <span>• <strong>Raised:</strong> {reqData.createdAt ? new Date(reqData.createdAt).toLocaleDateString('en-IN') : 'Recently'}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: '#6b7280', fontWeight: '700' }}>CATEGORY</span>
            <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1a73e8', textTransform: 'capitalize' }}>
              {(reqData.category || 'General').replace('_', ' ')}
            </div>
          </div>
        </div>

        {/* Issue Description */}
        <div style={{ background: '#f8f9fa', border: '1px solid #e5e7eb', padding: '12px 14px', borderRadius: '6px', fontSize: '0.82rem', color: '#374151', lineHeight: '1.4' }}>
          <strong style={{ color: '#111827' }}>Resident Problem Statement: </strong>
          {reqData.description || 'No additional details provided.'}
        </div>

        {/* Work Order Update Form */}
        <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <h4 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wrench size={16} color="#10b981" /> Update Work Order & Technician Assignment
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Ticket Status</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                style={{ width: '100%', fontSize: '0.84rem' }}
              >
                <option value="open">Open</option>
                <option value="assigned">Assigned</option>
                <option value="in_progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Technician Name</label>
              <input
                type="text"
                placeholder="e.g. Ramesh Kumar"
                value={techName}
                onChange={(e) => setTechName(e.target.value)}
                style={{ width: '100%', fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Technician Phone</label>
              <input
                type="tel"
                placeholder="+91 98765 43210"
                value={techPhone}
                onChange={(e) => setTechPhone(e.target.value)}
                style={{ width: '100%', fontSize: '0.84rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Estimated Cost (₹)</label>
              <input
                type="number"
                min="0"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
                style={{ width: '100%', fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Final Cost (₹)</label>
              <input
                type="number"
                min="0"
                value={finalCost}
                onChange={(e) => setFinalCost(e.target.value)}
                style={{ width: '100%', fontSize: '0.84rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.76rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Billed To</label>
              <select
                value={billedTo}
                onChange={(e) => setBilledTo(e.target.value)}
                style={{ width: '100%', fontSize: '0.84rem' }}
              >
                <option value="free_warranty">Free Warranty</option>
                <option value="tenant">Billed to Tenant</option>
                <option value="owner">Billed to Owner</option>
                <option value="society_fund">Society CAM Fund</option>
              </select>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.76rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Resolution Remarks & Completion Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Replaced damaged valve, tested line pressure, confirmed zero leaks with resident..."
              value={resolutionNotes}
              onChange={(e) => setResolutionNotes(e.target.value)}
              style={{ width: '100%', fontSize: '0.84rem' }}
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{ padding: '8px 16px', background: '#f1f3f4', color: '#374151', borderRadius: '6px', border: '1px solid #dadce0', fontWeight: '600', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              style={{
                padding: '8px 20px',
                background: '#1a73e8',
                color: '#ffffff',
                fontWeight: '700',
                borderRadius: '6px',
                border: 'none',
                cursor: submitting ? 'not-allowed' : 'pointer',
                opacity: submitting ? 0.7 : 1
              }}
            >
              {submitting ? 'Updating Work Order...' : 'Update Work Order'}
            </button>
          </div>
        </form>

        {/* Photos & Proof Section */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', background: '#ffffff', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '16px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827' }}>
              Service Photos & Inspection Proof ({photos.length})
            </h4>

            <form onSubmit={handlePhotoUpload} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <input
                type="file"
                id="srPhotoInput"
                accept="image/*"
                onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                style={{ display: 'none' }}
              />
              <label
                htmlFor="srPhotoInput"
                style={{ padding: '6px 12px', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '6px', fontSize: '0.76rem', cursor: 'pointer', color: '#374151', fontWeight: '600' }}
              >
                <Upload size={13} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} /> {photoFile ? photoFile.name : 'Choose Photo'}
              </label>
              <button
                type="submit"
                disabled={!photoFile || uploadingPhoto}
                style={{
                  padding: '6px 14px',
                  background: '#1a73e8',
                  color: '#ffffff',
                  borderRadius: '6px',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  border: 'none',
                  cursor: (!photoFile || uploadingPhoto) ? 'not-allowed' : 'pointer',
                  opacity: (!photoFile || uploadingPhoto) ? 0.6 : 1
                }}
              >
                {uploadingPhoto ? 'Uploading...' : 'Upload Photo'}
              </button>
            </form>
          </div>

          {photos.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '18px', color: '#6b7280', fontSize: '0.8rem', background: '#f9fafb', borderRadius: '6px', border: '1px dashed #d1d5db' }}>
              No photos attached to this ticket yet. Click "Choose Photo" to upload proof.
            </div>
          ) : (
            <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
              {photos.map((p, idx) => (
                <a
                  key={idx}
                  href={p.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ textDecoration: 'none', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: '#f8f9fa', padding: '8px', borderRadius: '6px', border: '1px solid #dadce0' }}
                >
                  <img src={p.fileUrl} alt="proof" style={{ width: '88px', height: '66px', objectFit: 'cover', borderRadius: '4px' }} />
                  <span style={{ fontSize: '0.7rem', color: '#1a73e8', fontWeight: '600' }}>View Proof ↗</span>
                </a>
              ))}
            </div>
          )}
        </div>

      </div>
    </Modal>
  );
};

