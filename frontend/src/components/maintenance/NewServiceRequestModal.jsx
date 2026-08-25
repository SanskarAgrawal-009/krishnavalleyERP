import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import { customerService } from '../../services/customerService.js';
import { Wrench, Home, User, AlertTriangle } from 'lucide-react';

export const NewServiceRequestModal = ({ isOpen, onClose, onSubmit }) => {
  const [flats, setFlats] = useState([]);
  const [customers, setCustomers] = useState([]);

  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [selectedRequesterId, setSelectedRequesterId] = useState('');
  const [requesterType, setRequesterType] = useState('tenant');
  const [category, setCategory] = useState('plumbing');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [billedTo, setBilledTo] = useState('free_warranty');

  // Technician details
  const [technicianName, setTechnicianName] = useState('');
  const [technicianPhone, setTechnicianPhone] = useState('');

  useEffect(() => {
    if (isOpen) {
      projectService.getFlats().then((res) => {
        if (res.data) setFlats(res.data);
      });
      customerService.getCustomers().then((res) => {
        if (res.data) setCustomers(res.data);
      });

      // Reset form
      setSelectedFlatId('');
      setSelectedRequesterId('');
      setRequesterType('tenant');
      setCategory('plumbing');
      setTitle('');
      setDescription('');
      setPriority('medium');
      setBilledTo('free_warranty');
      setTechnicianName('');
      setTechnicianPhone('');
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const matchedFlat = flats.find((f) => f._id === selectedFlatId);
    if (!matchedFlat || !selectedRequesterId) {
      alert('Please choose a flat and a requester customer.');
      return;
    }

    onSubmit({
      projectId: matchedFlat.projectId?._id || matchedFlat.projectId,
      buildingId: matchedFlat.buildingId,
      flatId: selectedFlatId,
      requesterType,
      requesterId: selectedRequesterId,
      category,
      title,
      description,
      priority,
      billedTo,
      assignedTechnician: technicianName ? {
        name: technicianName,
        phone: technicianPhone,
        agency: 'In-House Facilities Team'
      } : undefined
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Raise Maintenance / Service Request"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>Affected Flat Unit *</label>
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
            <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>Requester (Tenant / Owner) *</label>
            <select
              required
              value={selectedRequesterId}
              onChange={(e) => {
                setSelectedRequesterId(e.target.value);
                const matched = customers.find((c) => c._id === e.target.value);
                if (matched) setRequesterType(matched.customerType || 'tenant');
              }}
              style={{ width: '100%' }}
            >
              <option value="">-- Choose Resident --</option>
              {customers.map((c) => (
                <option key={c._id} value={c._id}>
                  {c.customerType === 'owner' ? '[Owner] ' : '[Tenant] '}{c.name} ({c.mobileNo})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Category *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              <option value="plumbing">Plumbing</option>
              <option value="electrical">Electrical</option>
              <option value="hvac_ac">AC / HVAC</option>
              <option value="carpentry">Carpentry</option>
              <option value="painting">Painting</option>
              <option value="civil_work">Civil & Seepage</option>
              <option value="cleaning">Housekeeping</option>
              <option value="pest_control">Pest Control</option>
              <option value="security">Lock & Security</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Priority</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              <option value="low">Low (Standard)</option>
              <option value="medium">Medium</option>
              <option value="high">High (Urgent)</option>
              <option value="urgent">Critical Emergency</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Billing Mode</label>
            <select
              value={billedTo}
              onChange={(e) => setBilledTo(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              <option value="free_warranty">Free Warranty</option>
              <option value="tenant">Billed to Tenant</option>
              <option value="owner">Billed to Owner</option>
              <option value="society_fund">Society CAM Fund</option>
            </select>
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>Issue Headline *</label>
          <input
            type="text"
            required
            placeholder="e.g. Master bathroom water leakage under sink"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>Detailed Description</label>
          <textarea
            rows={2}
            placeholder="Explain the issue location and severity..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            style={{ width: '100%' }}
          />
        </div>

        {/* Optional Technician Assignment */}
        <div style={{ background: '#f8f9fa', padding: '10px 12px', borderRadius: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: '#4b5563' }}>Assign Technician Name</label>
            <input
              type="text"
              placeholder="e.g. Mukesh Kumar (Plumber)"
              value={technicianName}
              onChange={(e) => setTechnicianName(e.target.value)}
              style={{ width: '100%', fontSize: '0.78rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: '#4b5563' }}>Technician Phone</label>
            <input
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={technicianPhone}
              onChange={(e) => setTechnicianPhone(e.target.value)}
              style={{ width: '100%', fontSize: '0.78rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '6px' }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 14px', background: '#f8f9fa', color: '#374151', borderRadius: '4px' }}>
            Cancel
          </button>
          <button type="submit" style={{ padding: '7px 18px', background: 'linear-gradient(135deg, #10b981, var(--primary-700))', color: '#111827', fontWeight: '700', borderRadius: '4px', cursor: 'pointer' }}>
            Create Work Order Ticket
          </button>
        </div>
      </form>
    </Modal>
  );
};
