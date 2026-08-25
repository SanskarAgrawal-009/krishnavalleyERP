import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import { customerService } from '../../services/customerService.js';
import { AlertTriangle, Upload, DollarSign, FileText } from 'lucide-react';

export const NewPenaltyModal = ({ isOpen, onClose, onSubmit }) => {
  const [flats, setFlats] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [customerType, setCustomerType] = useState('tenant');
  const [violationType, setViolationType] = useState('late_payment');
  const [penaltyAmount, setPenaltyAmount] = useState(1500);
  const [description, setDescription] = useState('');
  const [evidenceFile, setEvidenceFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      projectService.getFlats().then((res) => {
        if (res.data) setFlats(res.data);
      });
      customerService.getCustomers().then((res) => {
        if (res.data) setCustomers(res.data);
      });

      setSelectedFlatId('');
      setSelectedCustomerId('');
      setCustomerType('tenant');
      setViolationType('late_payment');
      setPenaltyAmount(1500);
      setDescription('');
      setEvidenceFile(null);
    }
  }, [isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const matchedFlat = flats.find((f) => f._id === selectedFlatId);
    if (!matchedFlat || !selectedCustomerId) {
      alert('Please choose a flat and the occupant/tenant.');
      return;
    }

    setSubmitting(true);
    const formData = new FormData();
    formData.append('projectId', matchedFlat.projectId?._id || matchedFlat.projectId);
    formData.append('buildingId', matchedFlat.buildingId);
    formData.append('flatId', selectedFlatId);
    formData.append('customerId', selectedCustomerId);
    formData.append('customerType', customerType);
    formData.append('violationType', violationType);
    formData.append('penaltyAmount', Number(penaltyAmount));
    formData.append('description', description || 'Rule violation penalty');
    if (evidenceFile) {
      formData.append('evidenceFile', evidenceFile);
    }

    try {
      await onSubmit(formData);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Levy Tenant / Occupant Penalty Fine"
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Flat Unit *</label>
            <select
              required
              value={selectedFlatId}
              onChange={(e) => setSelectedFlatId(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="">-- Choose Flat --</option>
              {flats.map((f) => {
                const flr = f.floor !== undefined && f.floor !== null ? f.floor : 1;
                const bld = f.buildingName || 'Tower';
                return (
                  <option key={f._id} value={f._id}>
                    Flat {f.flatNumber} • Floor {flr} • {bld} [{f.projectId?.projectName || 'Project'}]
                  </option>
                );
              })}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>Penalized Customer *</label>
            <select
              required
              value={selectedCustomerId}
              onChange={(e) => {
                setSelectedCustomerId(e.target.value);
                const matched = customers.find((c) => c._id === e.target.value);
                if (matched) setCustomerType(matched.customerType || 'tenant');
              }}
              style={{ width: '100%' }}
            >
              <option value="">-- Choose Tenant/Owner --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.customerType === 'tenant' ? '[Tenant] ' : '[Owner] '}{c.name} ({c.mobileNo})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Violation Infraction Type *</label>
            <select
              value={violationType}
              onChange={(e) => setViolationType(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              <option value="late_payment">Late Rent / Maintenance Fine</option>
              <option value="noise_disturbance">Noise Disturbance / Party</option>
              <option value="illegal_parking">Unauthorized / Illegal Parking</option>
              <option value="property_damage">Common Area Property Damage</option>
              <option value="garbage_disposal">Improper Waste Disposal</option>
              <option value="unauthorized_renovation">Unauthorized Renovation</option>
              <option value="pet_policy">Pet Policy Violation</option>
              <option value="other">Other Bylaw Violation</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Fine Amount (₹) *</label>
            <input
              type="number"
              required
              value={penaltyAmount}
              onChange={(e) => setPenaltyAmount(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>Violation Summary & Notice *</label>
          <textarea
            rows={2}
            required
            placeholder="Describe the incident, time of violation, and reason for penalty fine..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* S3 Evidence Upload */}
        <div>
          <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
            Attach Photographic Evidence / CCTV Snip to S3
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <input
              type="file"
              id="penaltyEvidence"
              accept="image/*,.pdf"
              onChange={(e) => setEvidenceFile(e.target.files?.[0] || null)}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="penaltyEvidence"
              style={{
                padding: '6px 12px',
                background: '#f8f9fa',
                border: '1px solid #dadce0',
                borderRadius: '4px',
                fontSize: '0.75rem',
                color: evidenceFile ? '#10b981' : 'var(--text-secondary)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '5px'
              }}
            >
              <Upload size={13} /> {evidenceFile ? evidenceFile.name : 'Choose Evidence Photo'}
            </label>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 14px', background: '#f8f9fa', color: '#374151', borderRadius: '4px' }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={submitting}
            style={{
              padding: '7px 18px',
              background: 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: '#111827',
              fontWeight: '700',
              borderRadius: '4px',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Levying Fine...' : 'Levy Penalty Notice'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
