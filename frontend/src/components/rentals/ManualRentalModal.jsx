import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import { customerService } from '../../services/customerService.js';
import { rentalService } from '../../services/rentalService.js';
import { 
  Building2, 
  Home, 
  User, 
  Phone, 
  DollarSign, 
  Calendar, 
  Repeat, 
  FileText, 
  ShieldCheck, 
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  CreditCard
} from 'lucide-react';

export const ManualRentalModal = ({ isOpen, onClose, onSubmit, contract = null }) => {
  // Inventory & Customers List
  const [projects, setProjects] = useState([]);
  const [flats, setFlats] = useState([]);
  const [owners, setOwners] = useState([]);

  // Single Flat Selection
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFlatId, setSelectedFlatId] = useState('');

  // Auto-Fetch & Quick-Add Owner State
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [isAddingNewOwner, setIsAddingNewOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [isFetchingOwner, setIsFetchingOwner] = useState(false);
  const [fetchedOwnerInfo, setFetchedOwnerInfo] = useState(null);
  const [ownerFetchStatus, setOwnerFetchStatus] = useState('');

  // Helper: default 3-year date (36 months)
  const default3YearEnd = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 3);
    return d.toISOString().slice(0, 10);
  };

  // 36-Month Permanent Owner Rent-Back Agreement
  const [rentBackForm, setRentBackForm] = useState({
    agreementNumber: `MOU-KV-${Date.now().toString().slice(-6)}`,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: default3YearEnd(),
    monthlyRent: 31000,
    applyTds: true,
    tdsPercentage: 10,
    rentDueDay: 25,
    tenureMonths: 36,
    status: 'active'
  });

  const [remarks, setRemarks] = useState('');

  useEffect(() => {
    if (isOpen) {
      // Load Projects & Flats
      projectService.getProjects().then((res) => {
        if (res.data) setProjects(res.data);
      });
      projectService.getFlats().then((res) => {
        if (res.data) setFlats(res.data);
      });

      // Load Customers (Owners only)
      customerService.getCustomers({ customerType: 'owner' }).then((res) => {
        if (res.data) setOwners(res.data);
      });

      if (contract) {
        // Populate if editing
        setSelectedProjectId(contract.projectId?._id || contract.projectId || '');
        setSelectedBuildingId(contract.buildingId || '');
        setSelectedFlatId(contract.flatId?._id || contract.flatId || '');
        setSelectedOwnerId(contract.ownerId?._id || contract.ownerId || '');
        
        if (contract.rentBack) {
          setRentBackForm({
            agreementNumber: contract.rentBack.agreementNumber || `MOU-KV-${Date.now().toString().slice(-6)}`,
            startDate: contract.rentBack.startDate ? new Date(contract.rentBack.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            endDate: contract.rentBack.endDate ? new Date(contract.rentBack.endDate).toISOString().slice(0, 10) : default3YearEnd(),
            monthlyRent: contract.rentBack.monthlyRent || 31000,
            applyTds: contract.rentBack.applyTds !== false,
            tdsPercentage: contract.rentBack.tdsPercentage !== undefined ? contract.rentBack.tdsPercentage : 10,
            rentDueDay: contract.rentBack.rentDueDay || 25,
            tenureMonths: contract.rentBack.tenureMonths || 36,
            status: contract.rentBack.status || 'active'
          });
        }
        setRemarks(contract.remarks || '');
      } else {
        // Reset defaults
        setSelectedProjectId('');
        setSelectedBuildingId('');
        setSelectedFlatId('');
        setSelectedOwnerId('');
        setFetchedOwnerInfo(null);
        setOwnerFetchStatus('');
        setRentBackForm({
          agreementNumber: `MOU-KV-${Date.now().toString().slice(-6)}`,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: default3YearEnd(),
          monthlyRent: 31000,
          applyTds: true,
          tdsPercentage: 10,
          rentDueDay: 25,
          tenureMonths: 36,
          status: 'active'
        });
        setRemarks('');
      }
    }
  }, [isOpen, contract]);

  // Handle Flat Selection & Auto-fetch owner
  const handleFlatSelect = async (flatId) => {
    setSelectedFlatId(flatId);
    if (!flatId) {
      setSelectedOwnerId('');
      setFetchedOwnerInfo(null);
      setOwnerFetchStatus('');
      return;
    }

    const flat = flats.find(f => f._id === flatId);
    if (flat) {
      if (flat.projectId) setSelectedProjectId(flat.projectId._id || flat.projectId);
      if (flat.buildingId) setSelectedBuildingId(flat.buildingId._id || flat.buildingId);
      
      // If flat has guaranteed monthly rent configured, use it
      if (flat.rentalDetails?.guaranteedMonthlyRent) {
        setRentBackForm(prev => ({
          ...prev,
          monthlyRent: flat.rentalDetails.guaranteedMonthlyRent,
          applyTds: flat.rentalDetails.applyTds !== false,
          tdsPercentage: flat.rentalDetails.tdsPercentage !== undefined ? flat.rentalDetails.tdsPercentage : 10
        }));
      }
    }

    setIsFetchingOwner(true);
    setOwnerFetchStatus('fetching');

    try {
      const res = await rentalService.getOwnerByFlat(flatId);
      if (res.data) {
        const foundOwner = res.data;
        setFetchedOwnerInfo(foundOwner);
        setSelectedOwnerId(foundOwner._id);
        setOwnerFetchStatus(res.source === 'sales_registry' ? 'found_sales' : 'found_api');
      } else {
        // Fallback: check local owners list
        const localOwner = owners.find(o => 
          o.ownerDetails?.propertyIds?.some(p => (p._id || p) === flatId)
        );
        if (localOwner) {
          setFetchedOwnerInfo(localOwner);
          setSelectedOwnerId(localOwner._id);
          setOwnerFetchStatus('found_local');
        } else {
          setFetchedOwnerInfo(null);
          setSelectedOwnerId('');
          setOwnerFetchStatus('not_found');
        }
      }
    } catch (err) {
      console.error('Error fetching owner for flat:', err);
      setOwnerFetchStatus('error');
    } finally {
      setIsFetchingOwner(false);
    }
  };

  const handleCreateNewOwner = async () => {
    if (!newOwnerName.trim() || !newOwnerPhone.trim()) {
      alert('Please provide owner name and phone number');
      return;
    }
    try {
      const res = await customerService.createCustomer({
        name: newOwnerName.trim(),
        mobileNo: newOwnerPhone.trim(),
        customerType: 'owner',
        status: 'active',
        ownerDetails: {
          propertyIds: selectedFlatId ? [selectedFlatId] : [],
          ownershipType: 'individual',
          ownershipPercentage: 100
        }
      });
      if (res.data) {
        setOwners(prev => [...prev, res.data]);
        setSelectedOwnerId(res.data._id);
        setFetchedOwnerInfo(res.data);
        setIsAddingNewOwner(false);
        setNewOwnerName('');
        setNewOwnerPhone('');
        setOwnerFetchStatus('found_api');
      }
    } catch (err) {
      alert(err.message || 'Failed to create owner');
    }
  };

  // Calculations
  const grossRent = Number(rentBackForm.monthlyRent) || 0;
  const isTds = rentBackForm.applyTds;
  const tdsPct = isTds ? (Number(rentBackForm.tdsPercentage) || 10) : 0;
  const tdsAmount = Math.round(grossRent * (tdsPct / 100));
  const netMonthlyPayout = grossRent - tdsAmount;
  const tenure = Number(rentBackForm.tenureMonths) || 36;
  const totalCommitment = netMonthlyPayout * tenure;

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!selectedFlatId) {
      alert('Please select a property unit');
      return;
    }
    if (!selectedOwnerId) {
      alert('Please select or assign a property owner');
      return;
    }

    const payload = {
      projectId: selectedProjectId,
      buildingId: selectedBuildingId,
      flatId: selectedFlatId,
      ownerId: selectedOwnerId,
      status: 'active',
      rentBack: {
        enabled: true,
        agreementNumber: rentBackForm.agreementNumber,
        startDate: rentBackForm.startDate,
        endDate: rentBackForm.endDate,
        monthlyRent: grossRent,
        applyTds: isTds,
        tdsPercentage: tdsPct,
        tdsAmount,
        netMonthlyAmount: netMonthlyPayout,
        tenureMonths: tenure,
        total36MonthCommitment: totalCommitment,
        rentDueDay: Number(rentBackForm.rentDueDay) || 25,
        status: 'active'
      },
      remarks
    };

    onSubmit(payload);
  };

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN');
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contract ? "Edit 36-Month Rent-Back Agreement" : "New 36-Month Guaranteed Rent-Back Agreement"}
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        
        {/* Step 1: Select Flat & Auto-Fetch Owner */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px', border: '1.5px solid #e2e8f0' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '50%' }}>
              <Home size={18} color="#4338ca" />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#1e1b4b', margin: 0 }}>
                1. Property Unit & Registered Owner
              </h4>
              <p style={{ fontSize: '0.74rem', color: '#64748b', margin: '2px 0 0 0' }}>
                Select the flat unit to enroll into the 3-Year Guaranteed Rent-Back Scheme.
              </p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '3px' }}>
                Flat Unit *
              </label>
              <select
                required
                value={selectedFlatId}
                onChange={(e) => handleFlatSelect(e.target.value)}
                style={{ width: '100%', fontSize: '0.84rem', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
              >
                <option value="">-- Choose Flat Unit --</option>
                {flats.map((f) => (
                  <option key={f._id} value={f._id}>
                    Flat {f.flatNumber} ({f.buildingId?.buildingName || 'Tower A'}) — {f.status?.toUpperCase() || 'AVAILABLE'}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                <label style={{ fontSize: '0.75rem', fontWeight: '700', color: '#334155', display: 'block' }}>
                  Property Owner *
                </label>
                <button
                  type="button"
                  onClick={() => setIsAddingNewOwner(!isAddingNewOwner)}
                  style={{
                    background: 'transparent',
                    border: 'none',
                    color: '#2563eb',
                    fontSize: '0.72rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  {isAddingNewOwner ? '← Choose Existing' : '+ Quick-Add Owner'}
                </button>
              </div>

              {!isAddingNewOwner ? (
                <select
                  required
                  value={selectedOwnerId}
                  onChange={(e) => {
                    setSelectedOwnerId(e.target.value);
                    const o = owners.find(x => x._id === e.target.value);
                    setFetchedOwnerInfo(o || null);
                  }}
                  style={{ width: '100%', fontSize: '0.84rem', padding: '8px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                >
                  <option value="">-- Choose Registered Owner --</option>
                  {owners.map((o) => (
                    <option key={o._id} value={o._id}>
                      {o.name} ({o.mobileNo})
                    </option>
                  ))}
                </select>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr auto', gap: '6px' }}>
                  <input
                    type="text"
                    placeholder="Owner Name"
                    value={newOwnerName}
                    onChange={(e) => setNewOwnerName(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #2563eb' }}
                  />
                  <input
                    type="text"
                    placeholder="Mobile Number"
                    value={newOwnerPhone}
                    onChange={(e) => setNewOwnerPhone(e.target.value)}
                    style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #2563eb' }}
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewOwner}
                    style={{ padding: '6px 12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Save
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Auto-Fetch Status Strip */}
          {isFetchingOwner && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.76rem', color: '#2563eb', background: '#eff6ff', padding: '6px 10px', borderRadius: '6px' }}>
              <Loader2 size={13} className="spin" /> Verifying ownership records for this unit...
            </div>
          )}

          {fetchedOwnerInfo && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.78rem', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '8px 12px', borderRadius: '6px' }}>
              <CheckCircle2 size={16} color="#16a34a" />
              <span>Registered Titleholder: <strong>{fetchedOwnerInfo.name}</strong> ({fetchedOwnerInfo.mobileNo})</span>
            </div>
          )}
        </div>

        {/* Step 2: 36-Month Guaranteed Rent-Back Parameters */}
        <div className="glass-panel" style={{
          display: 'flex',
          flexDirection: 'column',
          gap: '14px',
          border: '1.5px solid #86efac',
          background: '#f0fdf4'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '50%' }}>
              <Repeat size={18} color="#16a34a" />
            </div>
            <div>
              <h4 style={{ fontSize: '0.95rem', fontWeight: '800', color: '#14532d', margin: 0 }}>
                2. Guaranteed Rent-Back Financial Terms (Developer to Owner)
              </h4>
              <p style={{ fontSize: '0.74rem', color: '#166534', margin: '2px 0 0 0' }}>
                Fixed 36-month assured rental return disbursed directly to the owner's bank account.
              </p>
            </div>
          </div>

          {/* MOU # & Dates */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', display: 'block', marginBottom: '2px', fontWeight: '700' }}>
                Agreement / MOU Number *
              </label>
              <input
                type="text"
                required
                value={rentBackForm.agreementNumber}
                onChange={(e) => setRentBackForm({ ...rentBackForm, agreementNumber: e.target.value })}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #86efac' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', display: 'block', marginBottom: '2px', fontWeight: '700' }}>
                Rental Start Date *
              </label>
              <input
                type="date"
                required
                value={rentBackForm.startDate}
                onChange={(e) => setRentBackForm({ ...rentBackForm, startDate: e.target.value })}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #86efac' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', display: 'block', marginBottom: '2px', fontWeight: '700' }}>
                Rental End Date (3-Year Term) *
              </label>
              <input
                type="date"
                required
                value={rentBackForm.endDate}
                onChange={(e) => setRentBackForm({ ...rentBackForm, endDate: e.target.value })}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #86efac' }}
              />
            </div>
          </div>

          {/* Monthly Rent, TDS & Payout Day */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', display: 'block', marginBottom: '2px', fontWeight: '700' }}>
                Gross Monthly Rent (₹) *
              </label>
              <input
                type="number"
                required
                value={rentBackForm.monthlyRent}
                onChange={(e) => setRentBackForm({ ...rentBackForm, monthlyRent: e.target.value })}
                style={{ width: '100%', fontSize: '0.85rem', fontWeight: '800', padding: '7px', borderRadius: '5px', border: '1px solid #86efac' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '2px', fontWeight: '700', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={rentBackForm.applyTds}
                  onChange={(e) => setRentBackForm({ ...rentBackForm, applyTds: e.target.checked })}
                />
                Apply TDS
              </label>
              <input
                type="number"
                disabled={!rentBackForm.applyTds}
                value={rentBackForm.tdsPercentage}
                onChange={(e) => setRentBackForm({ ...rentBackForm, tdsPercentage: e.target.value })}
                placeholder="10%"
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #86efac', background: rentBackForm.applyTds ? '#fff' : '#f1f5f9' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', display: 'block', marginBottom: '2px', fontWeight: '700' }}>
                NEFT Payout Day *
              </label>
              <input
                type="number"
                min="1"
                max="31"
                required
                value={rentBackForm.rentDueDay}
                onChange={(e) => setRentBackForm({ ...rentBackForm, rentDueDay: e.target.value })}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #86efac' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', display: 'block', marginBottom: '2px', fontWeight: '700' }}>
                Contract Tenure (Mo)
              </label>
              <input
                type="number"
                value={rentBackForm.tenureMonths}
                onChange={(e) => setRentBackForm({ ...rentBackForm, tenureMonths: e.target.value })}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #86efac' }}
              />
            </div>
          </div>

          {/* Real-Time Financial Breakdown Summary */}
          <div style={{
            background: '#ffffff',
            border: '1px solid #bbf7d0',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'grid',
            gridTemplateColumns: '1fr 1fr 1fr',
            gap: '12px'
          }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Gross Rent</span>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#7c3aed' }}>
                {formatINR(grossRent)} / mo
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: isTds ? '#b91c1c' : '#059669', fontWeight: '700', textTransform: 'uppercase' }}>
                {isTds ? `TDS (${tdsPct}%)` : 'TDS Withheld'}
              </span>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: isTds ? '#ef4444' : '#059669' }}>
                {isTds ? `- ${formatINR(tdsAmount)}` : '₹0 (100% Payout)'}
              </div>
            </div>

            <div>
              <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>Net Disbursed to Owner</span>
              <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#16a34a' }}>
                {formatINR(netMonthlyPayout)} / mo
              </div>
              <span style={{ fontSize: '0.68rem', color: '#047857' }}>36-Mo Total: {formatINR(totalCommitment)}</span>
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#166534', display: 'block', marginBottom: '2px', fontWeight: '700' }}>
              Contract Notes / Banking Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. Disbursed via PNB A/C: 0983000100182033, IFSC: PUNB0098300 (PAN: ABCDE1234F)"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem', padding: '7px', borderRadius: '5px', border: '1px solid #86efac' }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '14px'
        }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '8px 18px',
              background: '#f8fafc',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              color: '#334155',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            style={{
              padding: '8px 24px',
              background: '#16a34a',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '800',
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(22, 163, 74, 0.25)'
            }}
          >
            {contract ? 'Save Agreement Changes' : 'Initialize Rent-Back Agreement'}
          </button>
        </div>

      </form>
    </Modal>
  );
};
