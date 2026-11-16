import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { User, Phone, Home, Building2, Layers, ArrowRight } from 'lucide-react';
import { projectService } from '../../services/projectService.js';

export const ConvertLeadModal = ({ isOpen, onClose, onConvert, lead = null }) => {
  const [projects, setProjects] = useState([]);
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [flats, setFlats] = useState([]);
  const [loading, setLoading] = useState(false);

  // Direct Buyer Form State (when booking without an existing CRM lead)
  const [buyerName, setBuyerName] = useState('');
  const [buyerMobile, setBuyerMobile] = useState('');
  const [buyerEmail, setBuyerEmail] = useState('');
  const [agreedDealPrice, setAgreedDealPrice] = useState(4500000);
  const [bookingTokenAmount, setBookingTokenAmount] = useState(100000);
  const [paymentPlanType, setPaymentPlanType] = useState('installment');

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      if (lead) {
        setBuyerName(lead.name || '');
        setBuyerMobile(lead.mobileNo || '');
        setBuyerEmail(lead.email || '');
      } else {
        setBuyerName('');
        setBuyerMobile('');
        setBuyerEmail('');
      }
      setAgreedDealPrice(4500000);
      setBookingTokenAmount(100000);
      setPaymentPlanType('installment');

      const flatObj = lead?.assignedFlat;
      const initialFlatId = flatObj?._id || (typeof flatObj === 'string' ? flatObj : '');
      const initialProjId = flatObj?.projectId?._id || flatObj?.projectId || '';
      const initialBldId = flatObj?.buildingId?._id || flatObj?.buildingId || '';

      if (initialFlatId) setSelectedFlatId(initialFlatId);
      if (initialProjId) setSelectedProjectId(initialProjId);
      if (initialBldId) setSelectedBuildingId(initialBldId);

      projectService.getProjects()
        .then((res) => {
          if (res.data && res.data.length > 0) {
            setProjects(res.data);
            const pId = initialProjId || res.data[0]._id || res.data[0].id;
            setSelectedProjectId(pId);

            const proj = res.data.find((p) => (p._id || p.id) === pId) || res.data[0];
            if (proj?.buildings && proj.buildings.length > 0) {
              const bId = initialBldId || proj.buildings[0]._id || proj.buildings[0].id;
              setSelectedBuildingId(bId);
            }
          }
        })
        .finally(() => setLoading(false));
    }
  }, [isOpen, lead]);

  // Load flats when building is chosen
  useEffect(() => {
    if (selectedProjectId && selectedBuildingId) {
      projectService.getFlats({ projectId: selectedProjectId, buildingId: selectedBuildingId })
        .then((res) => {
          if (res.data) {
            setFlats(res.data);
            const hasAssigned = res.data.some((f) => f._id === selectedFlatId);
            if (!hasAssigned && res.data.length > 0) {
              setSelectedFlatId(res.data[0]._id);
            }
          }
        });
    } else {
      setFlats([]);
    }
  }, [selectedProjectId, selectedBuildingId]);

  const selectedProject = projects.find((p) => (p._id || p.id) === selectedProjectId);
  const buildings = selectedProject?.buildings || [];

  const handleFormSubmit = (e) => {
    e.preventDefault();
    if (!lead && (!buyerName.trim() || !buyerMobile.trim())) {
      alert('Please provide buyer full name and mobile number');
      return;
    }
    if (!selectedFlatId) {
      alert('Please select a unit to complete booking');
      return;
    }

    onConvert({
      leadId: lead?._id || undefined,
      name: lead?.name || buyerName.trim(),
      mobileNo: lead?.mobileNo || buyerMobile.trim(),
      email: lead?.email || buyerEmail.trim(),
      projectId: selectedProjectId || selectedProject?._id,
      buildingId: selectedBuildingId,
      flatId: selectedFlatId,
      agreedDealPrice: Number(agreedDealPrice) || 4500000,
      bookingTokenAmount: Number(bookingTokenAmount) || 0,
      paymentPlanType
    });
  };

  const matchedFlat = flats.find((f) => f._id === selectedFlatId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={lead ? `Convert lead to sale: ${lead.name}` : 'New sales booking'}
      maxWidth="560px"
    >
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Customer Dossier Card */}
        {lead ? (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <div style={{ fontSize: '0.94rem', fontWeight: '700', color: '#0f172a' }}>
                {lead.name}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                {lead.mobileNo} {lead.email ? `• ${lead.email}` : ''}
              </div>
            </div>
            <span className="form-card-badge">CRM Lead</span>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>Buyer full name *</span>
              </div>
              <div className="form-card-input-row">
                <input
                  type="text"
                  required
                  placeholder="e.g. Aditya Pratap Singh"
                  className="form-card-input"
                  value={buyerName}
                  onChange={(e) => setBuyerName(e.target.value)}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Mobile number *</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="tel"
                    required
                    placeholder="e.g. 9810112233"
                    className="form-card-input"
                    value={buyerMobile}
                    onChange={(e) => setBuyerMobile(e.target.value)}
                  />
                </div>
              </div>

              <div className="form-card-box">
                <div className="form-card-prompt">
                  <span>Email address</span>
                </div>
                <div className="form-card-input-row">
                  <input
                    type="email"
                    placeholder="e.g. buyer@gmail.com"
                    className="form-card-input"
                    value={buyerEmail}
                    onChange={(e) => setBuyerEmail(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Property Unit Allocation */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>Select project *</span>
              </div>
              <div className="form-card-input-row">
                <select
                  required
                  value={selectedProjectId}
                  onChange={(e) => {
                    setSelectedProjectId(e.target.value);
                    setSelectedBuildingId('');
                    setSelectedFlatId('');
                  }}
                  className="form-card-input"
                  style={{ cursor: 'pointer' }}
                >
                  <option value="">-- Choose Project --</option>
                  {projects.map((p) => (
                    <option key={p._id || p.id} value={p._id || p.id}>
                      {p.projectName} ({p.projectCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-card-box">
              <div className="form-card-prompt">
                <span>Select tower / building *</span>
              </div>
              <div className="form-card-input-row">
                <select
                  required
                  disabled={!selectedProjectId}
                  value={selectedBuildingId}
                  onChange={(e) => {
                    setSelectedBuildingId(e.target.value);
                    setSelectedFlatId('');
                  }}
                  className="form-card-input"
                  style={{ cursor: selectedProjectId ? 'pointer' : 'not-allowed' }}
                >
                  <option value="">-- Choose Tower --</option>
                  {buildings.map((b) => (
                    <option key={b._id || b.id} value={b._id || b.id}>
                      {b.buildingName} ({b.buildingCode})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Select flat / unit *</span>
              {matchedFlat && <span className="form-card-badge">{matchedFlat.bhkType || '2BHK'}</span>}
            </div>
            <div className="form-card-input-row">
              <select
                required
                disabled={!selectedBuildingId}
                value={selectedFlatId}
                onChange={(e) => setSelectedFlatId(e.target.value)}
                className="form-card-input"
                style={{ cursor: selectedBuildingId ? 'pointer' : 'not-allowed' }}
              >
                <option value="">-- Choose Flat --</option>
                {flats.map((f) => {
                  const flr = f.floor !== undefined && f.floor !== null ? f.floor : 1;
                  return (
                    <option key={f._id} value={f._id}>
                      Flat {f.flatNumber} (Floor {flr}) • {f.bhkType || '2BHK'} • Status: {f.status}
                    </option>
                  );
                })}
              </select>
            </div>
          </div>
        </div>

        {/* Financial Deal Terms */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Agreed deal price</span>
              <span className="form-card-badge">Total</span>
            </div>
            <div className="form-card-input-row">
              <span style={{ color: '#64748b', fontWeight: '600' }}>₹</span>
              <input
                type="number"
                required
                min="0"
                className="form-card-input"
                value={agreedDealPrice}
                onChange={(e) => setAgreedDealPrice(e.target.value)}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Booking token amount</span>
              <span className="form-card-badge">Advance</span>
            </div>
            <div className="form-card-input-row">
              <span style={{ color: '#64748b', fontWeight: '600' }}>₹</span>
              <input
                type="number"
                required
                min="0"
                className="form-card-input"
                value={bookingTokenAmount}
                onChange={(e) => setBookingTokenAmount(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Payment Plan */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Payment plan structure</span>
          </div>
          <div className="form-card-input-row">
            <select
              value={paymentPlanType}
              onChange={(e) => setPaymentPlanType(e.target.value)}
              className="form-card-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="installment">Construction Linked Plan (CLP) / Installments</option>
              <option value="down_payment">Down Payment Plan</option>
              <option value="custom">Custom Milestone Plan</option>
            </select>
          </div>
        </div>

        {/* Bottom Actions */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginTop: '10px',
          paddingTop: '16px',
          borderTop: '1px solid #f1f5f9'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 20px',
              borderRadius: '8px',
              border: 'none',
              background: '#f1f5f9',
              color: '#475569',
              fontWeight: '600',
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#17652f',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            Confirm & start booking
          </button>
        </div>
      </form>
    </Modal>
  );
};
