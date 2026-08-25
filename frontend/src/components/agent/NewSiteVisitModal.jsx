import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { agentService } from '../../services/agentService.js';
import { projectService } from '../../services/projectService.js';
import { 
  Building2, 
  User, 
  Phone, 
  Mail, 
  Calendar, 
  MapPin, 
  Upload, 
  CheckCircle2, 
  AlertCircle, 
  Loader2, 
  Search, 
  Sparkles,
  Home
} from 'lucide-react';

export const NewSiteVisitModal = ({ isOpen, onClose, onSubmitSuccess }) => {
  const [agentCode, setAgentCode] = useState('');
  const [lookingUpAgent, setLookingUpAgent] = useState(false);
  const [agentInfo, setAgentInfo] = useState(null);
  const [agentError, setAgentError] = useState('');

  // Party Details
  const [partyName, setPartyName] = useState('');
  const [partyMobile, setPartyMobile] = useState('');
  const [partyEmail, setPartyEmail] = useState('');

  // Project & Flat
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [flats, setFlats] = useState([]);
  const [selectedFlatIds, setSelectedFlatIds] = useState([]);
  const [visitDate, setVisitDate] = useState(new Date().toISOString().slice(0, 16));
  const [visitNotes, setVisitNotes] = useState('');

  // Photo / Selfie Proof
  const [proofFile, setProofFile] = useState(null);
  const [proofPreview, setProofPreview] = useState('');

  const [submitting, setSubmitting] = useState(false);

  // Load Projects on Open
  useEffect(() => {
    if (isOpen) {
      projectService.getProjects().then((res) => {
        if (res.data && res.data.length > 0) {
          setProjects(res.data);
          setSelectedProjectId(res.data[0]._id || res.data[0].id);
        }
      });
      projectService.getFlats().then((res) => {
        if (res.data) setFlats(res.data);
      });

      // Reset
      setAgentCode('');
      setAgentInfo(null);
      setAgentError('');
      setPartyName('');
      setPartyMobile('');
      setPartyEmail('');
      setSelectedFlatIds([]);
      setVisitDate(new Date().toISOString().slice(0, 16));
      setVisitNotes('');
      setProofFile(null);
      setProofPreview('');
    }
  }, [isOpen]);

  // Handle Agent Code Lookup
  const handleLookupAgent = async (codeToLookup) => {
    const code = codeToLookup || agentCode;
    if (!code || !code.trim()) {
      setAgentInfo(null);
      setAgentError('Please enter an Agent Code');
      return;
    }

    setLookingUpAgent(true);
    setAgentError('');
    try {
      const res = await agentService.lookupAgentByCode(code.trim());
      if (res.data) {
        setAgentInfo(res.data);
        setAgentError('');
      } else {
        setAgentInfo(null);
        setAgentError('Agent not found for this code');
      }
    } catch (err) {
      setAgentInfo(null);
      setAgentError(err.message || 'Agent not found with this code');
    } finally {
      setLookingUpAgent(false);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) {
      setProofFile(file);
      setProofPreview(URL.createObjectURL(file));
    }
  };

  const handleToggleFlat = (flatId) => {
    if (selectedFlatIds.includes(flatId)) {
      setSelectedFlatIds(selectedFlatIds.filter((id) => id !== flatId));
    } else {
      setSelectedFlatIds([...selectedFlatIds, flatId]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!agentInfo) {
      alert('Please enter a valid Agent Code and verify the agent first.');
      return;
    }
    if (!partyName.trim() || !partyMobile.trim()) {
      alert('Please enter visitor Party Name and Mobile Number.');
      return;
    }
    if (!selectedProjectId) {
      alert('Please select the Project visited.');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('agentCode', agentInfo.agentCode);
      formData.append('partyName', partyName.trim());
      formData.append('partyMobile', partyMobile.trim());
      if (partyEmail.trim()) formData.append('partyEmail', partyEmail.trim());
      formData.append('projectId', selectedProjectId);
      if (selectedFlatIds.length > 0) {
        formData.append('flatIds', JSON.stringify(selectedFlatIds));
      }
      formData.append('visitDate', new Date(visitDate).toISOString());
      if (visitNotes.trim()) formData.append('visitNotes', visitNotes.trim());
      if (proofFile) formData.append('partySelfie', proofFile);

      const res = await agentService.recordSiteVisit(formData);
      alert(res.message || 'Agent site visit logged successfully! Awaiting verification approval.');
      if (onSubmitSuccess) onSubmitSuccess(res.data);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to log site visit');
    } finally {
      setSubmitting(false);
    }
  };

  const availableProjectFlats = flats.filter(
    (f) => (f.projectId?._id || f.projectId) === selectedProjectId
  );

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log & Verify Agent Site Visit with Party">
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* STEP 1: AGENT CODE VERIFICATION */}
        <div style={{ background: '#f8fafc', padding: '14px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Sparkles size={14} color="#1a73e8" /> 1. Enter Agent Code *
            </label>
            <span style={{ fontSize: '0.7rem', color: '#64748b' }}>e.g. AGT-101, KV-AGT-001</span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <input
              type="text"
              required
              placeholder="Enter Agent Unique Code (e.g. AGT-101)..."
              value={agentCode}
              onChange={(e) => {
                setAgentCode(e.target.value.toUpperCase());
                setAgentInfo(null);
                setAgentError('');
              }}
              onBlur={() => {
                if (agentCode.trim() && !agentInfo) handleLookupAgent(agentCode.trim());
              }}
              style={{
                flex: 1,
                fontFamily: 'monospace',
                fontWeight: '700',
                fontSize: '0.9rem',
                textTransform: 'uppercase',
                borderColor: agentInfo ? '#16a34a' : agentError ? '#dc2626' : '#cbd5e1'
              }}
            />
            <button
              type="button"
              onClick={() => handleLookupAgent()}
              disabled={lookingUpAgent || !agentCode.trim()}
              style={{
                padding: '0 16px',
                background: '#1a73e8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.8rem',
                cursor: lookingUpAgent ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              {lookingUpAgent ? <Loader2 size={14} className="spin" /> : <Search size={14} />}
              Lookup
            </button>
          </div>

          {/* AGENT AUTO-LOOKUP SUCCESS BADGE */}
          {agentInfo && (
            <div style={{ marginTop: '10px', padding: '10px 12px', background: '#f0fdf4', borderRadius: '6px', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontWeight: '800', color: '#166534', fontSize: '0.86rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <CheckCircle2 size={15} color="#16a34a" /> {agentInfo.agentName} ({agentInfo.agentCode})
                </div>
                <div style={{ fontSize: '0.74rem', color: '#15803d', marginTop: '2px' }}>
                  🏢 {agentInfo.agencyName} • 📞 {agentInfo.phone}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.7rem', padding: '2px 8px', background: '#dcfce7', color: '#14532d', borderRadius: '12px', fontWeight: '800' }}>
                  {agentInfo.commissionType === 'percentage' ? `${agentInfo.commissionRate}% Commission Rate` : `₹${agentInfo.commissionRate} Flat Rate`}
                </span>
              </div>
            </div>
          )}

          {agentError && (
            <div style={{ marginTop: '8px', padding: '8px 12px', background: '#fef2f2', borderRadius: '6px', border: '1px solid #fecaca', color: '#b91c1c', fontSize: '0.76rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <AlertCircle size={14} /> {agentError}
            </div>
          )}
        </div>

        {/* STEP 2: VISITING PARTY DETAILS */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
            2. Customer / Visiting Party Information *
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700', display: 'block', marginBottom: '3px' }}>Party Full Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Chandra Sharma"
                value={partyName}
                onChange={(e) => setPartyName(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700', display: 'block', marginBottom: '3px' }}>Mobile Number *</label>
              <input
                type="tel"
                required
                placeholder="+91 98765 43210"
                value={partyMobile}
                onChange={(e) => setPartyMobile(e.target.value)}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <div style={{ marginTop: '8px' }}>
            <label style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700', display: 'block', marginBottom: '3px' }}>Email Address (Optional)</label>
            <input
              type="email"
              placeholder="party.customer@example.com"
              value={partyEmail}
              onChange={(e) => setPartyEmail(e.target.value)}
              style={{ width: '100%' }}
            />
          </div>
        </div>

        {/* STEP 3: PROPERTY & SITE VISIT DETAILS */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', marginBottom: '8px', display: 'block' }}>
            3. Project & Properties Visited *
          </label>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700', display: 'block', marginBottom: '3px' }}>Project Visited *</label>
              <select
                value={selectedProjectId}
                onChange={(e) => {
                  setSelectedProjectId(e.target.value);
                  setSelectedFlatIds([]);
                }}
                required
                style={{ width: '100%' }}
              >
                {projects.map((p) => (
                  <option key={p._id || p.id} value={p._id || p.id}>
                    {p.projectName} ({p.projectCode || 'SITE'})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700', display: 'block', marginBottom: '3px' }}>Visit Date & Time *</label>
              <input
                type="datetime-local"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Unit selection pills */}
          <div style={{ marginTop: '10px' }}>
            <label style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700', display: 'block', marginBottom: '4px' }}>
              Flats / Units Inspected During Visit:
            </label>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', maxHeight: '100px', overflowY: 'auto', padding: '6px', background: '#f8fafc', borderRadius: '6px', border: '1px solid #e2e8f0' }}>
              {availableProjectFlats.length === 0 ? (
                <span style={{ fontSize: '0.74rem', color: '#94a3b8' }}>No flats listed in this project</span>
              ) : (
                availableProjectFlats.map((flat) => {
                  const isSelected = selectedFlatIds.includes(flat._id);
                  return (
                    <button
                      type="button"
                      key={flat._id}
                      onClick={() => handleToggleFlat(flat._id)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        border: isSelected ? '1px solid #1a73e8' : '1px solid #cbd5e1',
                        background: isSelected ? '#e8f0fe' : '#ffffff',
                        color: isSelected ? '#1a73e8' : '#334155',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}
                    >
                      <Home size={11} /> Flat {flat.flatNumber} (Fl: {flat.floorNumber || '1'})
                    </button>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* STEP 4: VERIFICATION PROOF (PARTY PHOTO / SELFIE AT SITE) */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: '800', color: '#1e293b', textTransform: 'uppercase', marginBottom: '6px', display: 'block' }}>
            4. Site Visit Verification Proof (Selfie / Photo with Party at Site)
          </label>
          <div style={{ border: '1px dashed #94a3b8', borderRadius: '8px', padding: '12px', background: '#f8fafc', textAlign: 'center' }}>
            <input
              type="file"
              accept="image/*,application/pdf"
              id="partySelfieInput"
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <label
              htmlFor="partySelfieInput"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                background: '#ffffff',
                border: '1px solid #cbd5e1',
                borderRadius: '6px',
                fontSize: '0.78rem',
                fontWeight: '700',
                color: '#1e293b',
                cursor: 'pointer'
              }}
            >
              <Upload size={14} color="#1a73e8" /> {proofFile ? 'Change Photo' : 'Upload Party Selfie / Geo-Photo Proof'}
            </label>

            {proofPreview && (
              <div style={{ marginTop: '10px', display: 'flex', justifyContent: 'center' }}>
                <img
                  src={proofPreview}
                  alt="Site Visit Proof Preview"
                  style={{ maxHeight: '110px', borderRadius: '6px', objectFit: 'cover', border: '1px solid #cbd5e1' }}
                />
              </div>
            )}
            <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '6px' }}>
              Upload selfie with customer at site, geo-tagged image, or physical visitor register slip.
            </div>
          </div>
        </div>

        {/* Visit Notes */}
        <div>
          <label style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700', display: 'block', marginBottom: '3px' }}>Discussion Notes & Requirements</label>
          <textarea
            rows="2"
            placeholder="e.g. Visited 3BHK flat 402, looking for East facing, ready for booking next week..."
            value={visitNotes}
            onChange={(e) => setVisitNotes(e.target.value)}
            style={{ width: '100%', fontSize: '0.8rem' }}
          />
        </div>

        {/* ACTION BUTTONS */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontWeight: '700',
              color: '#334155',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={submitting || !agentInfo}
            style={{
              padding: '8px 20px',
              background: '#1a73e8',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '800',
              color: '#ffffff',
              fontSize: '0.84rem',
              cursor: submitting || !agentInfo ? 'not-allowed' : 'pointer',
              opacity: submitting || !agentInfo ? 0.6 : 1,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {submitting ? <Loader2 size={15} className="spin" /> : <CheckCircle2 size={15} />}
            Log Verified Visit & Submit for Approval
          </button>
        </div>

      </form>
    </Modal>
  );
};
