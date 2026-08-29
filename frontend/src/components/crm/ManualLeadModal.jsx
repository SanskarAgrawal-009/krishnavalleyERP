import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { User, Phone, Mail, Home, MessageSquare, Plus } from 'lucide-react';
import { projectService } from '../../services/projectService.js';
import { sanitizeAlphabetsOnly, sanitizePhone, sanitizeEmail, isValidEmail } from '../../utils/inputValidators.js';

export const ManualLeadModal = ({ isOpen, onClose, onSubmit, lead = null }) => {
  const [formData, setFormData] = useState({
    name: '',
    mobileNo: '',
    email: '',
    assignedFlat: '',
    addInitialFollowUp: false,
    initialFollowUp: {
      mode: 'call',
      notes: '',
      nextFollowUpDate: '',
      status: 'pending'
    }
  });

  const [flats, setFlats] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);

  // Fetch available flats for assignment dropdown
  useEffect(() => {
    if (isOpen) {
      setLoadingFlats(true);
      projectService.getFlats()
        .then((res) => {
          if (res.data) setFlats(res.data);
        })
        .catch((err) => console.error('Error loading flats:', err))
        .finally(() => setLoadingFlats(false));
    }
  }, [isOpen]);

  useEffect(() => {
    if (lead) {
      setFormData({
        name: lead.name || '',
        mobileNo: lead.mobileNo || '',
        email: lead.email || '',
        assignedFlat: lead.assignedFlat?._id || lead.assignedFlat || '',
        addInitialFollowUp: false,
        initialFollowUp: {
          mode: 'call',
          notes: '',
          nextFollowUpDate: '',
          status: 'pending'
        }
      });
    } else {
      setFormData({
        name: '',
        mobileNo: '',
        email: '',
        assignedFlat: '',
        addInitialFollowUp: false,
        initialFollowUp: {
          mode: 'call',
          notes: '',
          nextFollowUpDate: '',
          status: 'pending'
        }
      });
    }
  }, [lead, isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter prospect full name');
      return;
    }

    if (!formData.mobileNo.trim() || formData.mobileNo.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile number');
      return;
    }

    if (formData.email && !isValidEmail(formData.email)) {
      alert('Please enter a valid email address');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      mobileNo: formData.mobileNo.trim(),
      email: formData.email.trim(),
      assignedFlat: formData.assignedFlat || null
    };

    if (!lead && formData.addInitialFollowUp && (formData.initialFollowUp.notes || formData.initialFollowUp.nextFollowUpDate)) {
      payload.initialFollowUp = {
        date: new Date(),
        mode: formData.initialFollowUp.mode,
        notes: formData.initialFollowUp.notes.trim(),
        nextFollowUpDate: formData.initialFollowUp.nextFollowUpDate ? new Date(formData.initialFollowUp.nextFollowUpDate) : null,
        status: formData.initialFollowUp.status
      };
    }

    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? `Edit Lead: ${lead.name}` : 'Manual Entry: New CRM Lead'}
      maxWidth="600px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        {/* Full Name */}
        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: '700' }}>
            <User size={14} color="#1a73e8" />
            Prospect Full Name * (Alphabets only)
          </label>
          <input
            type="text"
            required
            placeholder="e.g. Ramesh Chandra Sharma"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: sanitizeAlphabetsOnly(e.target.value) })}
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
        </div>

        {/* Mobile Number & Email */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: '700' }}>
              <Phone size={14} color="#137333" />
              Mobile Number * (Numbers only)
            </label>
            <input
              type="tel"
              required
              placeholder="e.g. +91 98765 43210"
              value={formData.mobileNo}
              onChange={(e) => setFormData({ ...formData, mobileNo: sanitizePhone(e.target.value) })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: '700' }}>
              <Mail size={14} color="#1a73e8" />
              Email Address
            </label>
            <input
              type="email"
              placeholder="e.g. ramesh@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: sanitizeEmail(e.target.value) })}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        {/* Assigned Flat Selection */}
        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px', fontWeight: '700' }}>
            <Home size={14} color="#8b5cf6" />
            Assign Flat / Unit (Optional)
          </label>
          <select
            value={formData.assignedFlat}
            onChange={(e) => setFormData({ ...formData, assignedFlat: e.target.value })}
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            <option value="">-- No Flat Assigned (General Prospect) --</option>
            {flats.map((f) => {
              const projName = f.projectId?.projectName || 'Project';
              const bldName = f.buildingName || 'Tower';
              const flr = f.floor !== undefined && f.floor !== null ? f.floor : 1;
              return (
                <option key={f._id} value={f._id}>
                  Flat {f.flatNumber} • Floor {flr} • {bldName} [{projName}] - {f.bhkType || '2BHK'} ({f.status})
                </option>
              );
            })}
          </select>
          {formData.assignedFlat && (() => {
            const selected = flats.find((f) => f._id === formData.assignedFlat);
            if (!selected) return null;
            return (
              <div style={{
                marginTop: '6px',
                padding: '6px 10px',
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '6px',
                fontSize: '0.76rem',
                color: '#166534',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <span>🏢 <strong>Floor:</strong> {selected.floor || 1}</span>
                <span>•</span>
                <span>🏛️ <strong>Tower:</strong> {selected.buildingName || 'Main Tower'}</span>
                <span>•</span>
                <span>🏠 <strong>BHK:</strong> {selected.bhkType || '2BHK'}</span>
                <span>•</span>
                <span>🏷️ <strong>Status:</strong> {selected.status}</span>
              </div>
            );
          })()}
          <span style={{ fontSize: '0.74rem', color: '#4b5563', marginTop: '3px', display: 'block' }}>
            Directly binds this lead to unit and floor inventory in MongoDB.
          </span>
        </div>

        {/* Optional Initial Follow-Up Section (Only on create) */}
        {!lead && (
          <div style={{
            background: '#f8f9fa',
            border: '1px solid #dadce0',
            borderRadius: '8px',
            padding: '14px',
            marginTop: '2px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: formData.addInitialFollowUp ? '12px' : '0' }}>
              <label htmlFor="initFollowUpToggle" style={{ fontSize: '0.82rem', fontWeight: '700', color: '#111827', display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: 0 }}>
                <input
                  type="checkbox"
                  id="initFollowUpToggle"
                  checked={formData.addInitialFollowUp}
                  onChange={(e) => setFormData({ ...formData, addInitialFollowUp: e.target.checked })}
                  style={{ width: '16px', height: '16px', cursor: 'pointer' }}
                />
                Log First Follow-up Activity Now
              </label>
            </div>

            {formData.addInitialFollowUp && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', paddingTop: '8px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                      Mode of Contact *
                    </label>
                    <select
                      value={formData.initialFollowUp.mode}
                      onChange={(e) => setFormData({
                        ...formData,
                        initialFollowUp: { ...formData.initialFollowUp, mode: e.target.value }
                      })}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    >
                      <option value="call">Phone Call</option>
                      <option value="whatsapp">WhatsApp</option>
                      <option value="site_visit">Site Visit</option>
                      <option value="meeting">Meeting / Office Visit</option>
                      <option value="email">Email</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                      Next Follow-Up Date & Time
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.initialFollowUp.nextFollowUpDate}
                      onChange={(e) => setFormData({
                        ...formData,
                        initialFollowUp: { ...formData.initialFollowUp, nextFollowUpDate: e.target.value }
                      })}
                      style={{ width: '100%', fontSize: '0.85rem' }}
                    />
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                    Discussion Remarks / Client Requirement Notes
                  </label>
                  <textarea
                    rows={2}
                    placeholder="e.g. Inquired about flat availability. Client requested quotation. Arranged callback."
                    value={formData.initialFollowUp.notes}
                    onChange={(e) => setFormData({
                      ...formData,
                      initialFollowUp: { ...formData.initialFollowUp, notes: e.target.value }
                    })}
                    style={{ width: '100%', fontSize: '0.85rem', resize: 'vertical' }}
                  />
                </div>
              </div>
            )}
          </div>
        )}

        {/* Action Buttons */}
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
            {lead ? 'Save Lead' : 'Create Lead'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
