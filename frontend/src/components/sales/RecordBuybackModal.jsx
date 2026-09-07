import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import {
  RotateCcw,
  ShieldCheck,
  User,
  DollarSign,
  Calendar,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Building2,
  ArrowRight,
  Search
} from 'lucide-react';

export const RecordBuybackModal = ({ isOpen, onClose, flat: propFlat, flatsList = [], onSuccess }) => {
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [availableFlats, setAvailableFlats] = useState([]);
  const [fetchingFlats, setFetchingFlats] = useState(false);

  // Active flat being processed
  const [activeFlat, setActiveFlat] = useState(propFlat || null);

  const [transferType, setTransferType] = useState('buyback'); // 'buyback' | 'resale'
  const [transferDealValue, setTransferDealValue] = useState(5000000);
  const [transferDate, setTransferDate] = useState(new Date().toISOString().slice(0, 10));
  const [remarks, setRemarks] = useState('');

  // Rent Given to Previous Owner Archive Fields
  const [rentPaidToPreviousOwner, setRentPaidToPreviousOwner] = useState(0);
  const [monthlyRent, setMonthlyRent] = useState(0);
  const [paidMonths, setPaidMonths] = useState(0);
  const [prevPan, setPrevPan] = useState('');
  const [prevBankName, setPrevBankName] = useState('');
  const [prevAccountNo, setPrevAccountNo] = useState('');

  // New Buyer Details (if direct resale)
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [newDealPrice, setNewDealPrice] = useState(5500000);
  const [newPaidAmount, setNewPaidAmount] = useState(5500000);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setError(null);
      if (propFlat) {
        setActiveFlat(propFlat);
        setSelectedFlatId(propFlat._id || propFlat.id);
        setTransferDealValue(propFlat.basePrice || 5000000);
        setRentPaidToPreviousOwner(propFlat?.rentalDetails?.totalRentPaid || propFlat?.rentalDetails?.prePossessionTotalPaid || 0);
        setMonthlyRent(propFlat?.rentalDetails?.monthlyRent || 0);
      } else {
        // Load sold or occupied flats if not provided
        if (flatsList.length > 0) {
          setAvailableFlats(flatsList);
        } else {
          setFetchingFlats(true);
          projectService.getFlats()
            .then((res) => {
              const allFlats = res.data || (Array.isArray(res) ? res : []);
              // Prefer flats that are sold or have owners
              const soldFlats = allFlats.filter(f => (f.status || '').toLowerCase() !== 'available');
              setAvailableFlats(soldFlats.length > 0 ? soldFlats : allFlats);
            })
            .catch((err) => console.error('Error fetching flats for buyback:', err))
            .finally(() => setFetchingFlats(false));
        }
      }
    }
  }, [isOpen, propFlat, flatsList]);

  // Handle flat picker change
  const handleFlatSelection = (flatId) => {
    setSelectedFlatId(flatId);
    const chosen = availableFlats.find(f => (f._id || f.id) === flatId);
    if (chosen) {
      setActiveFlat(chosen);
      setTransferDealValue(chosen.basePrice || 5000000);
      setRentPaidToPreviousOwner(chosen?.rentalDetails?.totalRentPaid || chosen?.rentalDetails?.prePossessionTotalPaid || 0);
      setMonthlyRent(chosen?.rentalDetails?.monthlyRent || 0);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!activeFlat) {
      setError('Please select a unit to process');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const payload = {
        transferType,
        transferDealValue: Number(transferDealValue) || 0,
        transferDate,
        rentPaidToPreviousOwner: Number(rentPaidToPreviousOwner) || 0,
        totalRentPaid: Number(rentPaidToPreviousOwner) || 0,
        monthlyRent: Number(monthlyRent) || 0,
        paidMonths: Number(paidMonths) || 0,
        panNumber: prevPan.trim(),
        bankName: prevBankName.trim(),
        accountNumber: prevAccountNo.trim(),
        remarks: remarks || (transferType === 'buyback' ? 'Repurchased by Company' : `Transferred to ${newOwnerName}`),
        ...(transferType === 'resale' ? {
          newOwner: {
            name: newOwnerName.trim(),
            mobileNo: newOwnerPhone.trim(),
            email: newOwnerEmail.trim(),
            agreedDealPrice: Number(newDealPrice) || 0,
            bookingAmountPaid: Number(newPaidAmount) || 0,
            paymentPlanType: Number(newPaidAmount) >= Number(newDealPrice) ? 'full_payment' : 'installment'
          }
        } : {})
      };

      const flatId = activeFlat._id || activeFlat.id;
      const res = await projectService.recordFlatBuybackOrResale(flatId, payload);
      if (res.success) {
        alert(res.message || 'Buyback/Resale transaction executed successfully!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        setError(res.message || 'Action failed');
      }
    } catch (err) {
      console.error('Error recording buyback/resale:', err);
      setError(err.message || 'An error occurred while executing transaction');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Record Buyback / Resale Transfer ${activeFlat ? `— Unit ${activeFlat.flatNumber}` : ''}`}
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Flat Selection (if not pre-selected) */}
        {!propFlat && (
          <div>
            <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
              Select Property Unit to Process: *
            </label>
            <select
              value={selectedFlatId}
              onChange={(e) => handleFlatSelection(e.target.value)}
              required
              style={{
                width: '100%',
                padding: '8px 12px',
                borderRadius: '8px',
                border: '1.5px solid #cbd5e1',
                fontSize: '0.86rem',
                color: '#0f172a',
                background: '#ffffff'
              }}
            >
              <option value="">-- Choose Unit --</option>
              {availableFlats.map((f) => (
                <option key={f._id || f.id} value={f._id || f.id}>
                  Flat {f.flatNumber} {f.buildingName ? `(${f.buildingName})` : ''} — {f.currentOwner?.name || f.status || 'Active'}
                </option>
              ))}
            </select>
            {fetchingFlats && <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Loading inventory...</span>}
          </div>
        )}

        {/* Current Owner Banner */}
        {activeFlat && (
          <div style={{
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>CURRENT REGISTERED TITLEHOLDER</span>
              <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e293b' }}>
                {activeFlat.currentOwner?.name || activeFlat.salesDetails?.buyerName || 'Developer / Unassigned'}
              </div>
              <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                {activeFlat.currentOwner?.mobileNo || 'Contact on file'}
              </span>
            </div>

            <div style={{ textAlign: 'right' }}>
              <span style={{ fontSize: '0.72rem', color: '#64748b', fontWeight: '700' }}>PRIOR TRANSFERS / BUYBACKS</span>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0284c7' }}>
                {activeFlat.buybackCount || 0} Time(s)
              </div>
            </div>
          </div>
        )}

        {/* Action Type Selector */}
        <div>
          <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1e293b', display: 'block', marginBottom: '6px' }}>
            Select Transfer Type:
          </label>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <button
              type="button"
              onClick={() => setTransferType('buyback')}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: transferType === 'buyback' ? '#16a34a' : '#cbd5e1',
                background: transferType === 'buyback' ? '#f0fdf4' : '#ffffff',
                color: transferType === 'buyback' ? '#166534' : '#475569',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.85rem' }}>🔄 1. Company Buyback</strong>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Company repurchases flat. Moves current owner to History and resets unit to Available.
              </span>
            </button>

            <button
              type="button"
              onClick={() => setTransferType('resale')}
              style={{
                padding: '10px 14px',
                borderRadius: '8px',
                border: '2px solid',
                borderColor: transferType === 'resale' ? '#0284c7' : '#cbd5e1',
                background: transferType === 'resale' ? '#f0f9ff' : '#ffffff',
                color: transferType === 'resale' ? '#0369a1' : '#475569',
                cursor: 'pointer',
                textAlign: 'left'
              }}
            >
              <strong style={{ display: 'block', fontSize: '0.85rem' }}>🤝 2. Direct Resale / Allotment</strong>
              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>
                Archives old owner into History and registers a new buyer title immediately.
              </span>
            </button>
          </div>
        </div>

        {/* Financial & Date Details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '3px' }}>
              {transferType === 'buyback' ? 'Buyback Deal Value (₹) *' : 'Transfer Deal Value (₹) *'}
            </label>
            <input
              type="number"
              required
              value={transferDealValue}
              onChange={(e) => setTransferDealValue(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.84rem',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1'
              }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '3px' }}>
              Execution / Transfer Date *
            </label>
            <input
              type="date"
              required
              value={transferDate}
              onChange={(e) => setTransferDate(e.target.value)}
              style={{
                width: '100%',
                fontSize: '0.84rem',
                padding: '8px 10px',
                borderRadius: '6px',
                border: '1px solid #cbd5e1'
              }}
            />
          </div>
        </div>

        {/* Rent Given to Outgoing / Previous Owner */}
        <div style={{
          background: '#fefce8',
          border: '1px solid #fef08a',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.8rem', fontWeight: '800', color: '#854d0e' }}>
              💰 Rent Disbursed to Outgoing / Prior Owner
            </span>
            <span style={{ fontSize: '0.72rem', color: '#a16207' }}>
              Archive historical payout records for audit trail
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#713f12', display: 'block', marginBottom: '2px', fontWeight: '700' }}>
                Total Rent Paid (₹)
              </label>
              <input
                type="number"
                placeholder="e.g. 1600000"
                value={rentPaidToPreviousOwner}
                onChange={(e) => setRentPaidToPreviousOwner(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', fontWeight: '700', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#713f12', display: 'block', marginBottom: '2px' }}>
                Monthly Rent (₹/mo)
              </label>
              <input
                type="number"
                placeholder="e.g. 16000"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#713f12', display: 'block', marginBottom: '2px' }}>
                Paid Months Count
              </label>
              <input
                type="number"
                placeholder="e.g. 100"
                value={paidMonths}
                onChange={(e) => setPaidMonths(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#713f12', display: 'block', marginBottom: '2px' }}>
                Previous Owner PAN
              </label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                value={prevPan}
                onChange={(e) => setPrevPan(e.target.value.toUpperCase())}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#713f12', display: 'block', marginBottom: '2px' }}>
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. PNB / SBI"
                value={prevBankName}
                onChange={(e) => setPrevBankName(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#713f12', display: 'block', marginBottom: '2px' }}>
                Account Number
              </label>
              <input
                type="text"
                placeholder="e.g. 0983000100..."
                value={prevAccountNo}
                onChange={(e) => setPrevAccountNo(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* New Buyer Details (if Resale) */}
        {transferType === 'resale' && (
          <div style={{
            background: '#f0f9ff',
            border: '1px solid #bae6fd',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
          }}>
            <h5 style={{ margin: 0, fontSize: '0.82rem', color: '#0369a1', fontWeight: '800' }}>
              New Registered Buyer Details
            </h5>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>New Buyer Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Mehta"
                  value={newOwnerName}
                  onChange={(e) => setNewOwnerName(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>New Buyer Mobile *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. +91 98112 23344"
                  value={newOwnerPhone}
                  onChange={(e) => setNewOwnerPhone(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
              <div>
                <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>New Agreed Sale Price (₹) *</label>
                <input
                  type="number"
                  required
                  value={newDealPrice}
                  onChange={(e) => setNewDealPrice(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Amount Paid by New Buyer (₹) *</label>
                <input
                  type="number"
                  required
                  value={newPaidAmount}
                  onChange={(e) => setNewPaidAmount(e.target.value)}
                  style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>
            </div>
          </div>
        )}

        <div>
          <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '3px' }}>
            Transaction Remarks / Reason
          </label>
          <textarea
            rows="2"
            placeholder="e.g. Executed repurchase under buyback guarantee terms..."
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            style={{ width: '100%', fontSize: '0.8rem', padding: '6px 8px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
          />
        </div>

        {error && (
          <div style={{
            padding: '8px 12px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            borderRadius: '6px',
            color: '#991b1b',
            fontSize: '0.8rem'
          }}>
            {error}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 16px',
              background: '#ffffff',
              border: '1px solid #dadce0',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '0.82rem',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '8px 20px',
              background: transferType === 'buyback' ? '#16a34a' : '#0284c7',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.82rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            {loading ? (
              <>
                <Loader2 size={15} className="spin" /> Processing...
              </>
            ) : (
              <>
                <CheckCircle2 size={15} /> Execute {transferType === 'buyback' ? 'Buyback' : 'Resale'}
              </>
            )}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default RecordBuybackModal;
