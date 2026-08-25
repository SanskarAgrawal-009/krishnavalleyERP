import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import { customerService } from '../../services/customerService.js';
import { DollarSign, Home, Calendar, Layers, CheckCircle, Loader2 } from 'lucide-react';

export const NewBillModal = ({ isOpen, onClose, onCreateSingle, onGenerateBatch, onSubmit }) => {
  const [mode, setMode] = useState('batch'); // 'batch' | 'single'
  const [submitting, setSubmitting] = useState(false);

  // Common Month State
  const [billingMonth, setBillingMonth] = useState(
    new Date().toLocaleString('default', { month: 'long', year: 'numeric' })
  );
  const [dueDate, setDueDate] = useState(
    new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10)
  );

  // Batch Form State
  const [batchAmount, setBatchAmount] = useState(3500);
  const [batchUtility, setBatchUtility] = useState(500);

  // Single Form State
  const [flats, setFlats] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [selectedFlatId, setSelectedFlatId] = useState('');
  const [selectedPayerId, setSelectedPayerId] = useState('');
  const [payerType, setPayerType] = useState('owner');
  const [maintenanceAmount, setMaintenanceAmount] = useState(3500);
  const [utilityCharges, setUtilityCharges] = useState(500);

  useEffect(() => {
    if (isOpen) {
      setBillingMonth(new Date().toLocaleString('default', { month: 'long', year: 'numeric' }));
      setDueDate(new Date(Date.now() + 15 * 86400000).toISOString().slice(0, 10));
      
      projectService.getFlats().then((res) => {
        if (res.data && res.data.length > 0) {
          setFlats(res.data);
          if (!selectedFlatId) {
            setSelectedFlatId(res.data[0]._id);
          }
        }
      }).catch(err => console.error('Error fetching flats:', err));

      customerService.getCustomers().then((res) => {
        if (res.data && res.data.length > 0) {
          setCustomers(res.data);
          if (!selectedPayerId) {
            setSelectedPayerId(res.data[0]._id);
            setPayerType(res.data[0].customerType || 'owner');
          }
        }
      }).catch(err => console.error('Error fetching customers:', err));
    }
  }, [isOpen]);

  const handleFlatSelect = (flatId) => {
    setSelectedFlatId(flatId);
    if (!flatId) return;
    // Attempt auto-match customer owner or tenant
    const matchedCustomer = customers.find((c) =>
      (c.ownerDetails?.propertyIds?.some((p) => (p._id || p).toString() === flatId.toString())) ||
      (c.tenantDetails?.rentalDetails?.flatId?.toString() === flatId.toString())
    );
    if (matchedCustomer) {
      setSelectedPayerId(matchedCustomer._id);
      setPayerType(matchedCustomer.customerType || 'owner');
    }
  };

  const handleSingleSubmit = async (e) => {
    e.preventDefault();
    const matchedFlat = flats.find((f) => f._id === selectedFlatId);
    if (!matchedFlat || !selectedPayerId) {
      alert('Please select a flat and a customer payer.');
      return;
    }

    const payload = {
      projectId: matchedFlat.projectId?._id || matchedFlat.projectId,
      buildingId: matchedFlat.buildingId || matchedFlat.projectId?._id || matchedFlat.projectId,
      flatId: selectedFlatId,
      payerType,
      payerId: selectedPayerId,
      billingMonth,
      maintenanceAmount: Number(maintenanceAmount),
      utilityCharges: Number(utilityCharges),
      dueDate
    };

    setSubmitting(true);
    try {
      if (onCreateSingle) {
        await onCreateSingle(payload);
      } else if (onSubmit) {
        await onSubmit(payload);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleBatchSubmit = async (e) => {
    e.preventDefault();
    const payload = {
      billingMonth,
      defaultAmount: Number(batchAmount),
      defaultUtility: Number(batchUtility),
      dueDate
    };

    setSubmitting(true);
    try {
      if (onGenerateBatch) {
        await onGenerateBatch(payload);
      } else if (onSubmit) {
        await onSubmit(payload);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Society Maintenance Bills"
      maxWidth="580px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Toggle Mode */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '8px',
          background: '#f1f3f4',
          padding: '4px',
          borderRadius: '8px',
          border: '1px solid #dadce0'
        }}>
          <button
            type="button"
            onClick={() => setMode('batch')}
            style={{
              padding: '9px',
              borderRadius: '6px',
              background: mode === 'batch' ? '#1a73e8' : 'transparent',
              color: mode === 'batch' ? '#ffffff' : '#374151',
              fontWeight: '700',
              fontSize: '0.84rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Batch Generate for All Flats
          </button>

          <button
            type="button"
            onClick={() => setMode('single')}
            style={{
              padding: '9px',
              borderRadius: '6px',
              background: mode === 'single' ? '#1a73e8' : 'transparent',
              color: mode === 'single' ? '#ffffff' : '#374151',
              fontWeight: '700',
              fontSize: '0.84rem',
              border: 'none',
              cursor: 'pointer',
              transition: 'all 0.15s ease'
            }}
          >
            Single Flat Bill
          </button>
        </div>

        {/* BATCH GENERATOR */}
        {mode === 'batch' && (
          <form onSubmit={handleBatchSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Billing Month *</label>
                <input
                  type="text"
                  required
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Due Date *</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Standard Maintenance (₹) *</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={batchAmount}
                  onChange={(e) => setBatchAmount(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Common Utilities / Water (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={batchUtility}
                  onChange={(e) => setBatchUtility(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>

            <div style={{ background: '#e8f0fe', padding: '12px 14px', borderRadius: '6px', fontSize: '0.78rem', color: '#1a73e8', border: '1px solid #d2e3fc', lineHeight: '1.5' }}>
              <strong>⚡ Dynamic Occupancy Billing Rules for {billingMonth}:</strong>
              <ul style={{ margin: '6px 0 0 16px', padding: 0, display: 'flex', flexDirection: 'column', gap: '3px' }}>
                <li><strong>Owner-Occupied Units:</strong> Billed to registered property buyers/owners.</li>
                <li><strong>Rental / Corporate Leases:</strong> Billed to individual tenants or company entities.</li>
                <li><strong>Unsold & Vacant Units:</strong> Excluded (₹0 billed, no maintenance charge).</li>
              </ul>
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f1f3f4', color: '#374151', borderRadius: '6px', border: '1px solid #dadce0', fontWeight: '600', cursor: 'pointer' }}>
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
                {submitting ? 'Generating Occupancy Bills...' : 'Generate Occupancy Bills'}
              </button>
            </div>
          </form>
        )}

        {/* SINGLE FLAT BILL */}
        {mode === 'single' && (
          <form onSubmit={handleSingleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#374151', display: 'block', marginBottom: '4px' }}>Select Flat Unit *</label>
                <select
                  required
                  value={selectedFlatId}
                  onChange={(e) => handleFlatSelect(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="">-- Choose Flat --</option>
                  {flats.map((f) => {
                    const flr = f.floor !== undefined && f.floor !== null ? f.floor : 1;
                    const bld = f.buildingName || 'Tower';
                    const occStatus = f.status === 'sold' ? 'Owner-Occupied' : (f.takenForRental ? 'Leased' : (f.status === 'available' ? 'Unsold/Vacant' : f.status));
                    return (
                      <option key={f._id} value={f._id}>
                        Flat {f.flatNumber} • Floor {flr} • {bld} [{occStatus}]
                      </option>
                    );
                  })}
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.78rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Billed Payer *</label>
                <select
                  required
                  value={selectedPayerId}
                  onChange={(e) => {
                    setSelectedPayerId(e.target.value);
                    const matched = customers.find((c) => c._id === e.target.value);
                    if (matched) setPayerType(matched.customerType || 'owner');
                  }}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Choose Resident/Owner --</option>
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
                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Billing Month</label>
                <input
                  type="text"
                  required
                  value={billingMonth}
                  onChange={(e) => setBillingMonth(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Maintenance (₹)</label>
                <input
                  type="number"
                  required
                  min="0"
                  value={maintenanceAmount}
                  onChange={(e) => setMaintenanceAmount(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Utilities (₹)</label>
                <input
                  type="number"
                  min="0"
                  value={utilityCharges}
                  onChange={(e) => setUtilityCharges(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem' }}
                />
              </div>
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '600', color: '#374151', display: 'block', marginBottom: '4px' }}>Due Date</label>
              <input
                type="date"
                required
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem' }}
              />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
              <button type="button" onClick={onClose} style={{ padding: '8px 16px', background: '#f1f3f4', color: '#374151', borderRadius: '6px', border: '1px solid #dadce0', fontWeight: '600', cursor: 'pointer' }}>
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
                {submitting ? 'Issuing Bill...' : 'Issue Maintenance Bill'}
              </button>
            </div>
          </form>
        )}

      </div>
    </Modal>
  );
};

