import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { LoadingButton } from '../common/LoadingButton.jsx';
import { projectService } from '../../services/projectService.js';
import { customerService } from '../../services/customerService.js';
import { rentalService } from '../../services/rentalService.js';
import { 
  Building2, 
  Home, 
  User, 
  DollarSign, 
  Calendar, 
  Repeat, 
  FileText, 
  CheckCircle2, 
  Loader2,
  ChevronRight,
  ArrowLeft,
  Check,
  ShieldCheck,
  AlertCircle
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Property & Owner', subtitle: 'Select Unit & KYC', icon: Home },
  { id: 2, title: 'Rent & TDS Terms', subtitle: 'Monthly Returns', icon: DollarSign },
  { id: 3, title: 'Tenure & Review', subtitle: 'Dates & Finalize', icon: Calendar }
];

export const ManualRentalModal = ({ isOpen, onClose, onSubmit, contract = null, rental = null }) => {
  const activeContract = contract || rental;
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [stepError, setStepError] = useState('');

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
      setCurrentStep(1);
      setStepError('');

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

      if (activeContract) {
        // Populate if editing
        setSelectedProjectId(activeContract.projectId?._id || activeContract.projectId || '');
        setSelectedBuildingId(activeContract.buildingId || '');
        setSelectedFlatId(activeContract.flatId?._id || activeContract.flatId || '');
        setSelectedOwnerId(activeContract.ownerId?._id || activeContract.ownerId || '');
        
        if (activeContract.rentBack) {
          setRentBackForm({
            agreementNumber: activeContract.rentBack.agreementNumber || `MOU-KV-${Date.now().toString().slice(-6)}`,
            startDate: activeContract.rentBack.startDate ? new Date(activeContract.rentBack.startDate).toISOString().slice(0, 10) : new Date().toISOString().slice(0, 10),
            endDate: activeContract.rentBack.endDate ? new Date(activeContract.rentBack.endDate).toISOString().slice(0, 10) : default3YearEnd(),
            monthlyRent: activeContract.rentBack.monthlyRent || 31000,
            applyTds: activeContract.rentBack.applyTds !== false,
            tdsPercentage: activeContract.rentBack.tdsPercentage !== undefined ? activeContract.rentBack.tdsPercentage : 10,
            rentDueDay: activeContract.rentBack.rentDueDay || 25,
            tenureMonths: activeContract.rentBack.tenureMonths || 36,
            status: activeContract.rentBack.status || 'active'
          });
        }
        setRemarks(activeContract.remarks || '');
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
  }, [isOpen, activeContract]);

  // Handle Flat Selection & Auto-fetch owner
  const handleFlatSelect = async (flatId) => {
    setSelectedFlatId(flatId);
    setStepError('');
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
      setStepError('Please provide owner name and mobile number');
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
          registrationStatus: 'registered'
        }
      });
      if (res.data) {
        setOwners(prev => [...prev, res.data]);
        setSelectedOwnerId(res.data._id);
        setFetchedOwnerInfo(res.data);
        setIsAddingNewOwner(false);
        setNewOwnerName('');
        setNewOwnerPhone('');
        setStepError('');
      }
    } catch (err) {
      console.error('Error creating owner:', err);
      setStepError('Failed to create new owner record');
    }
  };

  // Math Helpers
  const grossRent = Number(rentBackForm.monthlyRent) || 0;
  const isTds = rentBackForm.applyTds;
  const tdsPct = isTds ? (Number(rentBackForm.tdsPercentage) || 0) : 0;
  const tdsAmount = Math.round(grossRent * (tdsPct / 100));
  const netMonthlyPayout = grossRent - tdsAmount;
  const tenure = Number(rentBackForm.tenureMonths) || 36;
  const totalCommitment = netMonthlyPayout * tenure;

  const validateStep = (step) => {
    setStepError('');
    if (step === 1) {
      if (!selectedFlatId) {
        setStepError('Please select a property flat unit');
        return false;
      }
      if (!selectedOwnerId) {
        setStepError('Please select or add a property owner');
        return false;
      }
    }
    if (step === 2) {
      if (!rentBackForm.agreementNumber.trim()) {
        setStepError('Please enter an agreement / MOU number');
        return false;
      }
      if (!rentBackForm.monthlyRent || Number(rentBackForm.monthlyRent) <= 0) {
        setStepError('Please enter a valid gross monthly rent');
        return false;
      }
    }
    if (step === 3) {
      if (!rentBackForm.startDate) {
        setStepError('Please specify agreement start date');
        return false;
      }
      if (!rentBackForm.endDate) {
        setStepError('Please specify agreement end date');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handlePrev = () => {
    setStepError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) return;

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

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return '₹' + Number(val).toLocaleString('en-IN');
  };

  const selectedFlatObj = flats.find(f => f._id === selectedFlatId);
  const selectedOwnerObj = fetchedOwnerInfo || owners.find(o => o._id === selectedOwnerId);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={activeContract ? "Edit Rent-Back Agreement" : "New Guaranteed Rent-Back Agreement"}
      maxWidth="780px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

        {/* STEPPER BAR */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: '#f8fafc',
          padding: '12px 16px',
          borderRadius: '10px',
          border: '1px solid #e2e8f0',
          position: 'relative'
        }}>
          {STEPS.map((step, idx) => {
            const Icon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <React.Fragment key={step.id}>
                <div
                  onClick={() => {
                    if (isCompleted) setCurrentStep(step.id);
                  }}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    cursor: isCompleted ? 'pointer' : 'default',
                    opacity: currentStep < step.id ? 0.6 : 1
                  }}
                >
                  <div style={{
                    width: '32px',
                    height: '32px',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: isCompleted ? '#16a34a' : isActive ? '#2563eb' : '#e2e8f0',
                    color: isCompleted || isActive ? '#ffffff' : '#64748b',
                    fontSize: '0.8rem',
                    fontWeight: '800',
                    transition: 'all 0.2s ease',
                    boxShadow: isActive ? '0 0 0 3px rgba(37, 99, 235, 0.2)' : 'none'
                  }}>
                    {isCompleted ? <Check size={16} strokeWidth={3} /> : <Icon size={16} />}
                  </div>
                  <div>
                    <div style={{
                      fontSize: '0.78rem',
                      fontWeight: isActive ? '800' : '600',
                      color: isActive ? '#0f172a' : isCompleted ? '#16a34a' : '#64748b',
                      lineHeight: 1.2
                    }}>
                      {step.title}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#94a3b8' }}>
                      {step.subtitle}
                    </div>
                  </div>
                </div>

                {idx < STEPS.length - 1 && (
                  <div style={{
                    flex: 1,
                    height: '2px',
                    margin: '0 12px',
                    background: currentStep > idx + 1 ? '#16a34a' : '#e2e8f0'
                  }} />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* ERROR BANNER */}
        {stepError && (
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            borderRadius: '8px',
            background: '#fef2f2',
            border: '1px solid #fecaca',
            color: '#dc2626',
            fontSize: '0.8rem',
            fontWeight: '600'
          }}>
            <AlertCircle size={16} />
            <span>{stepError}</span>
          </div>
        )}

        {/* STEP CONTENT CONTAINER */}
        <form onSubmit={handleSubmit} style={{ minHeight: '320px', display: 'flex', flexDirection: 'column' }}>

          {/* STEP 1: PROPERTY & OWNER */}
          {currentStep === 1 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
              <div style={{
                background: '#eff6ff',
                border: '1px solid #bfdbfe',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ background: '#dbeafe', padding: '8px', borderRadius: '50%', color: '#1d4ed8' }}>
                  <Home size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e3a8a', margin: 0 }}>
                    Step 1: Property Unit & Registered Owner
                  </h4>
                  <p style={{ fontSize: '0.74rem', color: '#3b82f6', margin: '2px 0 0' }}>
                    Select the unit to enroll into the 3-Year Guaranteed Rent-Back Scheme.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '4px' }}>
                    Flat Unit *
                  </label>
                  <select
                    required
                    value={selectedFlatId}
                    onChange={(e) => handleFlatSelect(e.target.value)}
                    style={{
                      width: '100%',
                      fontSize: '0.84rem',
                      padding: '9px 12px',
                      borderRadius: '8px',
                      border: '1px solid #cbd5e1',
                      background: '#ffffff'
                    }}
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
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '4px' }}>
                    <label style={{ fontSize: '0.78rem', fontWeight: '700', color: '#334155', display: 'block' }}>
                      Property Owner *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewOwner(!isAddingNewOwner)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#2563eb',
                        fontSize: '0.74rem',
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
                      style={{
                        width: '100%',
                        fontSize: '0.84rem',
                        padding: '9px 12px',
                        borderRadius: '8px',
                        border: '1px solid #cbd5e1',
                        background: '#ffffff'
                      }}
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
                        style={{ padding: '8px 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #2563eb' }}
                      />
                      <input
                        type="text"
                        placeholder="Mobile"
                        value={newOwnerPhone}
                        onChange={(e) => setNewOwnerPhone(e.target.value)}
                        style={{ padding: '8px 10px', fontSize: '0.82rem', borderRadius: '6px', border: '1px solid #2563eb' }}
                      />
                      <button
                        type="button"
                        onClick={handleCreateNewOwner}
                        style={{
                          padding: '8px 14px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '0.78rem',
                          fontWeight: '700',
                          cursor: 'pointer'
                        }}
                      >
                        Save
                      </button>
                    </div>
                  )}
                </div>
              </div>

              {/* Status Banner */}
              {isFetchingOwner && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.78rem', color: '#2563eb', background: '#eff6ff', padding: '8px 12px', borderRadius: '6px' }}>
                  <Loader2 size={14} className="spin" /> Verifying ownership records for this unit...
                </div>
              )}

              {fetchedOwnerInfo && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', fontSize: '0.8rem', color: '#166534', background: '#f0fdf4', border: '1px solid #bbf7d0', padding: '10px 14px', borderRadius: '8px' }}>
                  <CheckCircle2 size={18} color="#16a34a" />
                  <div>
                    <strong>{fetchedOwnerInfo.name}</strong> • Mobile: {fetchedOwnerInfo.mobileNo || 'N/A'} {fetchedOwnerInfo.email ? `• ${fetchedOwnerInfo.email}` : ''}
                    <div style={{ fontSize: '0.72rem', color: '#15803d', marginTop: '2px' }}>
                      Status: Verified Titleholder
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* STEP 2: RENT & TDS */}
          {currentStep === 2 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
              <div style={{
                background: '#f0fdf4',
                border: '1px solid #86efac',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '50%', color: '#16a34a' }}>
                  <Repeat size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#14532d', margin: 0 }}>
                    Step 2: Guaranteed Rent-Back Financial Terms
                  </h4>
                  <p style={{ fontSize: '0.74rem', color: '#166534', margin: '2px 0 0' }}>
                    Configure monthly rent amount, TDS deductions, and auto-disbursement.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <div>
                  <label style={{ fontSize: '0.78rem', color: '#334155', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                    Agreement / MOU Number *
                  </label>
                  <input
                    type="text"
                    required
                    value={rentBackForm.agreementNumber}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, agreementNumber: e.target.value })}
                    style={{ width: '100%', fontSize: '0.84rem', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.78rem', color: '#334155', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                    Gross Monthly Rent (₹) *
                  </label>
                  <input
                    type="number"
                    required
                    value={rentBackForm.monthlyRent}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, monthlyRent: e.target.value })}
                    style={{ width: '100%', fontSize: '0.9rem', fontWeight: '800', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div style={{
                background: '#f8fafc',
                border: '1px solid #e2e8f0',
                borderRadius: '8px',
                padding: '14px',
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr',
                gap: '16px',
                alignItems: 'center'
              }}>
                <div>
                  <label style={{ fontSize: '0.8rem', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: '700', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={rentBackForm.applyTds}
                      onChange={(e) => setRentBackForm({ ...rentBackForm, applyTds: e.target.checked })}
                      style={{ width: '16px', height: '16px' }}
                    />
                    Deduct TDS (Section 194-IB / 194-I)
                  </label>
                  <p style={{ fontSize: '0.72rem', color: '#64748b', margin: '4px 0 0 24px' }}>
                    TDS is legally withheld and remitted against owner PAN.
                  </p>
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#475569', display: 'block', marginBottom: '3px', fontWeight: '700' }}>
                    TDS Deduction Percentage
                  </label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="number"
                      disabled={!rentBackForm.applyTds}
                      value={rentBackForm.tdsPercentage}
                      onChange={(e) => setRentBackForm({ ...rentBackForm, tdsPercentage: e.target.value })}
                      placeholder="10"
                      style={{
                        width: '100%',
                        fontSize: '0.84rem',
                        padding: '7px 10px',
                        borderRadius: '6px',
                        border: '1px solid #cbd5e1',
                        background: rentBackForm.applyTds ? '#fff' : '#f1f5f9'
                      }}
                    />
                    <span style={{ fontSize: '0.85rem', fontWeight: '700', color: '#64748b' }}>%</span>
                  </div>
                </div>
              </div>

              {/* Real-Time Calculation Preview Card */}
              <div style={{
                background: '#ffffff',
                border: '1.5px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr 1fr',
                gap: '12px'
              }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>Gross Rent</span>
                  <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#334155' }}>
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
                  <span style={{ fontSize: '0.7rem', color: '#15803d', fontWeight: '700', textTransform: 'uppercase' }}>Net Monthly to Owner</span>
                  <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#16a34a' }}>
                    {formatINR(netMonthlyPayout)} / mo
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* STEP 3: TENURE, DATES & REVIEW */}
          {currentStep === 3 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'fadeIn 0.2s ease' }}>
              <div style={{
                background: '#fff7ed',
                border: '1px solid #fed7aa',
                borderRadius: '8px',
                padding: '12px 14px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{ background: '#ffedd5', padding: '8px', borderRadius: '50%', color: '#ea580c' }}>
                  <Calendar size={18} />
                </div>
                <div>
                  <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#9a3412', margin: 0 }}>
                    Step 3: Agreement Tenure & Payout Schedule
                  </h4>
                  <p style={{ fontSize: '0.74rem', color: '#c2410c', margin: '2px 0 0' }}>
                    Set agreement start/end dates, monthly disbursement day, and banking notes.
                  </p>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#334155', display: 'block', marginBottom: '3px', fontWeight: '700' }}>
                    Rental Start Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={rentBackForm.startDate}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, startDate: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#334155', display: 'block', marginBottom: '3px', fontWeight: '700' }}>
                    Rental End Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={rentBackForm.endDate}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, endDate: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#334155', display: 'block', marginBottom: '3px', fontWeight: '700' }}>
                    NEFT Payout Day *
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    required
                    value={rentBackForm.rentDueDay}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, rentDueDay: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.74rem', color: '#334155', display: 'block', marginBottom: '3px', fontWeight: '700' }}>
                    Tenure (Months)
                  </label>
                  <input
                    type="number"
                    value={rentBackForm.tenureMonths}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, tenureMonths: e.target.value })}
                    style={{ width: '100%', fontSize: '0.82rem', padding: '7px 10px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ fontSize: '0.74rem', color: '#334155', display: 'block', marginBottom: '3px', fontWeight: '700' }}>
                  Contract Notes / Banking Remarks
                </label>
                <input
                  type="text"
                  placeholder="e.g. Disbursed via PNB A/C: 0983000100182033, IFSC: PUNB0098300 (PAN: ABCDE1234F)"
                  value={remarks}
                  onChange={(e) => setRemarks(e.target.value)}
                  style={{ width: '100%', fontSize: '0.82rem', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1' }}
                />
              </div>

              {/* Final Summary Card */}
              <div style={{
                background: '#f8fafc',
                border: '1px solid #cbd5e1',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'grid',
                gridTemplateColumns: '1.2fr 1fr 1fr',
                gap: '12px'
              }}>
                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                    Unit & Owner
                  </div>
                  <div style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a' }}>
                    Flat {selectedFlatObj?.flatNumber || 'N/A'}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {selectedOwnerObj?.name || 'Owner N/A'}
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                    Monthly Net
                  </div>
                  <div style={{ fontSize: '0.95rem', fontWeight: '800', color: '#16a34a' }}>
                    {formatINR(netMonthlyPayout)} / mo
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    Gross: {formatINR(grossRent)} (TDS {tdsPct}%)
                  </div>
                </div>

                <div>
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700', textTransform: 'uppercase' }}>
                    36-Month Commitment
                  </div>
                  <div style={{ fontSize: '1rem', fontWeight: '800', color: '#2563eb' }}>
                    {formatINR(totalCommitment)}
                  </div>
                  <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                    {tenure} months total
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* FOOTER ACTIONS */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginTop: 'auto',
            paddingTop: '16px',
            borderTop: '1px solid #e2e8f0'
          }}>
            {currentStep > 1 ? (
              <button
                type="button"
                onClick={handlePrev}
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '8px 16px',
                  borderRadius: '6px',
                  background: '#f1f5f9',
                  border: '1px solid #cbd5e1',
                  color: '#475569',
                  fontSize: '0.82rem',
                  fontWeight: '700',
                  cursor: 'pointer'
                }}
              >
                <ArrowLeft size={15} /> Previous
              </button>
            ) : (
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                style={{
                  padding: '8px 16px',
                  background: '#f8fafc',
                  border: '1px solid #cbd5e1',
                  borderRadius: '6px',
                  color: '#475569',
                  fontWeight: '700',
                  fontSize: '0.82rem',
                  cursor: submitting ? 'not-allowed' : 'pointer'
                }}
              >
                Cancel
              </button>
            )}

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              {currentStep < 3 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px',
                    padding: '8px 18px',
                    borderRadius: '6px',
                    background: '#2563eb',
                    border: 'none',
                    color: '#ffffff',
                    fontSize: '0.82rem',
                    fontWeight: '700',
                    cursor: 'pointer'
                  }}
                >
                  Continue to Next Step <ChevronRight size={15} />
                </button>
              ) : (
                <LoadingButton
                  type="submit"
                  loading={submitting}
                  loadingText={activeContract ? 'Saving Agreement...' : 'Initializing Rent-Back...'}
                  variant="success"
                >
                  {activeContract ? 'Save Agreement Changes' : 'Initialize Rent-Back Agreement'}
                </LoadingButton>
              )}
            </div>
          </div>

        </form>
      </div>
    </Modal>
  );
};

export default ManualRentalModal;
