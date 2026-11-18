import React, { useState, useEffect, useMemo } from 'react';
import { rentalService } from '../../services/rentalService.js';
import { projectService } from '../../services/projectService.js';
import {
  Building2, Calendar, DollarSign, User, Clock, ShieldCheck,
  CheckCircle2, AlertCircle, Search, Check, X, RefreshCw,
  Home, Layers, ChevronRight, ArrowLeft, TrendingUp, Upload, FileText
} from 'lucide-react';

const STEPS = [
  { id: 1, title: 'Select Flat', subtitle: 'Project → Tower → Flat', icon: Home, color: '#17652f' },
  { id: 2, title: 'Owner Details', subtitle: 'KYC & Registry', icon: User, color: '#17652f' },
  { id: 3, title: 'Rent & TDS', subtitle: 'Monthly Pricing', icon: DollarSign, color: '#17652f' },
  { id: 4, title: 'Contract', subtitle: 'Dates & Review', icon: Calendar, color: '#334155' },
];

export const ManualRentalEntryModal = ({
  isOpen,
  onClose,
  onSuccess,
  initialTower
}) => {
  const [flatsList, setFlatsList] = useState([]);
  const [projectsList, setProjectsList] = useState([]);
  const [loadingFlats, setLoadingFlats] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  // Scaffolding State: Project → Tower → Flat
  const [selectedProjectId, setSelectedProjectId] = useState(null);
  const [selectedTowerId, setSelectedTowerId] = useState(null);
  const [selectedFlat, setSelectedFlat] = useState(null);
  const [selectedFloor, setSelectedFloor] = useState('all');
  const [rentalStatusFilter, setRentalStatusFilter] = useState('all');
  const [flatSearchQuery, setFlatSearchQuery] = useState('');

  // Form State
  const [ownerName, setOwnerName] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [registryDate, setRegistryDate] = useState(new Date().toISOString().slice(0, 10));
  const [rentAmount, setRentAmount] = useState(31000);
  const [applyTds, setApplyTds] = useState(true);
  const [tdsMode, setTdsMode] = useState('percentage');
  const [tdsPercentage, setTdsPercentage] = useState(10);
  const [tdsAmount, setTdsAmount] = useState(3100);
  const [startDate, setStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [endDate, setEndDate] = useState('');
  const [tenureMonths, setTenureMonths] = useState(36);
  const [totalPaid, setTotalPaid] = useState(0);
  const [registryFile, setRegistryFile] = useState(null);

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  // Fetch projects + flats when modal opens
  useEffect(() => {
    if (isOpen) {
      setLoadingFlats(true);
      setErrorMsg('');

      Promise.all([
        projectService.getProjects(),
        projectService.getFlats()
      ])
        .then(([projRes, flatsRes]) => {
          const projects = projRes?.data || (Array.isArray(projRes) ? projRes : []);
          const flats = flatsRes?.data || (Array.isArray(flatsRes) ? flatsRes : []);
          setProjectsList(projects);
          setFlatsList(flats);

          // Auto-select project if only one exists
          if (projects.length === 1) {
            setSelectedProjectId(String(projects[0]._id || projects[0].id));
            if (initialTower && projects[0].buildings) {
              const matched = projects[0].buildings.find(b =>
                (b.buildingName || '').toLowerCase().trim() === initialTower.toLowerCase().trim()
              );
              if (matched) setSelectedTowerId(String(matched._id || matched.id));
            }
          }
        })
        .catch((err) => console.error('Error fetching data for rental selection:', err))
        .finally(() => setLoadingFlats(false));
    } else {
      setSelectedFlat(null);
      setSelectedProjectId(null);
      setSelectedTowerId(null);
      setSelectedFloor('all');
      setRentalStatusFilter('all');
      setFlatSearchQuery('');
      setOwnerName('');
      setOwnerMobile('');
      setOwnerEmail('');
      setRentAmount(31000);
      setApplyTds(true);
      setTdsMode('percentage');
      setTdsPercentage(10);
      setTdsAmount(3100);
      setTenureMonths(36);
      setTotalPaid(0);
      setRegistryFile(null);
      setCurrentStep(1);
    }
  }, [isOpen]);

  // Derived: selected project object
  const selectedProject = useMemo(() => {
    if (!selectedProjectId) return null;
    return projectsList.find((p) => String(p._id || p.id) === selectedProjectId) || null;
  }, [projectsList, selectedProjectId]);

  // Derived: towers (buildings) for selected project
  const availableTowers = useMemo(() => {
    if (!selectedProject) return [];
    return (selectedProject.buildings || []).map((b) => ({
      _id: String(b._id || b.id),
      name: b.buildingName || b.name || 'Unknown',
      code: b.buildingCode || b.code || '',
      floors: b.numberOfFloors || 0,
      totalFlats: b.totalFlats || 0,
    }));
  }, [selectedProject]);

  // Handle initial tower selection when towers are ready
  useEffect(() => {
    if (initialTower && availableTowers.length > 0 && !selectedTowerId) {
      const match = availableTowers.find(t =>
        t.name.toLowerCase().trim() === initialTower.toLowerCase().trim()
      );
      if (match) setSelectedTowerId(match._id);
    }
  }, [initialTower, availableTowers, selectedTowerId]);

  // Derived: selected tower object
  const selectedTower = useMemo(() => {
    if (!selectedTowerId) return null;
    return availableTowers.find((t) => t._id === selectedTowerId) || null;
  }, [availableTowers, selectedTowerId]);

  // Derived: flats filtered strictly by selected tower's buildingId or tower name
  const towerFlats = useMemo(() => {
    if (!selectedTower) return [];
    const tId = String(selectedTower._id || '');
    const tName = (selectedTower.name || '').toLowerCase().trim();
    return flatsList.filter((f) => {
      const flatBldgId = String(f.buildingId?._id || f.buildingId || '');
      if (flatBldgId && tId && flatBldgId === tId) return true;
      const flatTower = (f.tower || f.buildingName || '').toLowerCase().trim();
      if (flatTower && tName && flatTower === tName) return true;
      if (tName.includes('tower b') || tName === 'b') {
        return (f.flatNumber || '').toUpperCase().startsWith('B-');
      }
      if (tName.includes('tower a') || tName === 'a') {
        return !((f.flatNumber || '').toUpperCase().startsWith('B-'));
      }
      return false;
    });
  }, [flatsList, selectedTower]);

  // Derived: unique floors available in this tower
  const availableFloors = useMemo(() => {
    const floorsSet = new Set();
    towerFlats.forEach(f => {
      if (f.floor !== undefined && f.floor !== null) {
        floorsSet.add(Number(f.floor));
      }
    });
    return Array.from(floorsSet).sort((a, b) => a - b);
  }, [towerFlats]);

  // Derived: search & filter within selected tower
  const filteredFlats = useMemo(() => {
    return towerFlats.filter((f) => {
      if (selectedFloor !== 'all' && Number(f.floor) !== Number(selectedFloor)) {
        return false;
      }
      const hasRental = Boolean(f.takenForRental || f.rentalDetails?.guaranteedMonthlyRent);
      if (rentalStatusFilter === 'available' && hasRental) return false;
      if (rentalStatusFilter === 'rental' && !hasRental) return false;
      if (flatSearchQuery.trim()) {
        const q = flatSearchQuery.toLowerCase().trim();
        const matches = (f.flatNumber || '').toLowerCase().includes(q) ||
          (f.bhkType || '').toLowerCase().includes(q) ||
          String(f.floor || '').includes(q) ||
          (f.currentOwner?.name || '').toLowerCase().includes(q);
        if (!matches) return false;
      }
      return true;
    });
  }, [towerFlats, selectedFloor, rentalStatusFilter, flatSearchQuery]);

  if (!isOpen) return null;

  // Auto Calculations
  const grossRent = Math.max(0, Number(rentAmount) || 0);
  let finalTdsAmount = 0;
  let effectiveTdsPct = 0;

  if (applyTds) {
    if (tdsMode === 'amount') {
      finalTdsAmount = Math.max(0, Number(tdsAmount) || 0);
      effectiveTdsPct = grossRent > 0 ? Number(((finalTdsAmount / grossRent) * 100).toFixed(2)) : 0;
    } else {
      effectiveTdsPct = Math.max(0, Number(tdsPercentage) || 0);
      finalTdsAmount = Math.round(grossRent * (effectiveTdsPct / 100));
    }
  }

  const netAmount = grossRent - finalTdsAmount;
  const tenure = Math.max(1, Number(tenureMonths) || 36);
  const totalCommitment = grossRent * tenure;
  const paid = Math.max(0, Number(totalPaid) || 0);
  const outstandingBalance = Math.max(0, totalCommitment - paid);

  const calculateEndingDate = (startStr, months) => {
    if (!startStr) return '—';
    const d = new Date(startStr);
    if (isNaN(d.getTime())) return '—';
    d.setMonth(d.getMonth() + Number(months));
    return d.toISOString().slice(0, 10);
  };

  const endingDate = calculateEndingDate(startDate, tenure);
  const formatINR = (val) => `₹${Number(val || 0).toLocaleString('en-IN')}`;

  // Handle Flat Selection
  const handleSelectFlat = (flat) => {
    setSelectedFlat(flat);
    setErrorMsg('');
    if (flat.currentOwner?.name) setOwnerName(flat.currentOwner.name);
    if (flat.currentOwner?.mobileNo && flat.currentOwner.mobileNo !== '—') setOwnerMobile(flat.currentOwner.mobileNo);
    if (flat.currentOwner?.email && flat.currentOwner.email !== '—') setOwnerEmail(flat.currentOwner.email);
    if (flat.rentalDetails?.guaranteedMonthlyRent) {
      const gRent = flat.rentalDetails.guaranteedMonthlyRent;
      setRentAmount(gRent);
      if (flat.rentalDetails.applyTds !== undefined) setApplyTds(flat.rentalDetails.applyTds !== false);
      if (flat.rentalDetails.tdsMode) setTdsMode(flat.rentalDetails.tdsMode);
      if (flat.rentalDetails.tdsPercentage !== undefined) setTdsPercentage(flat.rentalDetails.tdsPercentage);
      if (flat.rentalDetails.tdsAmount !== undefined) setTdsAmount(flat.rentalDetails.tdsAmount);
      else setTdsAmount(Math.round(gRent * (Number(flat.rentalDetails.tdsPercentage || 10) / 100)));
    }
    if (flat.rentalDetails?.tenureMonths) setTenureMonths(flat.rentalDetails.tenureMonths);
    if (flat.rentalDetails?.startDate) setStartDate(new Date(flat.rentalDetails.startDate).toISOString().slice(0, 10));
    if (flat.rentalDetails?.mouDate) setRegistryDate(new Date(flat.rentalDetails.mouDate).toISOString().slice(0, 10));
    // Auto-advance to step 2
    setCurrentStep(2);
  };

  const handleSubmit = async () => {
    if (!selectedFlat) {
      setErrorMsg('Please select a flat unit from the list.');
      setCurrentStep(1);
      return;
    }
    if (!ownerName.trim()) {
      setErrorMsg('Please enter the owner name.');
      setCurrentStep(2);
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      const payload = {
        flatId: selectedFlat._id || selectedFlat.id,
        flatNumber: selectedFlat.flatNumber,
        projectId: selectedProjectId || selectedFlat.projectId?._id || selectedFlat.projectId,
        buildingId: selectedTowerId || selectedFlat.buildingId?._id || selectedFlat.buildingId,
        tower: selectedTower?.name || selectedFlat.buildingName || selectedFlat.tower,
        ownerName: ownerName.trim(),
        ownerMobile: ownerMobile.trim(),
        ownerEmail: ownerEmail.trim(),
        registryDate,
        rentAmount: grossRent,
        applyTds,
        tdsMode,
        tdsPercentage: effectiveTdsPct,
        tdsAmount: finalTdsAmount,
        startDate,
        endDate: endDate || endingDate,
        tenureMonths: tenure,
        totalPaid: paid
      };

      const res = await rentalService.createManualRental(payload);
      if (res.success) {
        const createdFlatId = res.data?._id || selectedFlat._id || selectedFlat.id;
        if (registryFile && createdFlatId) {
          try {
            await rentalService.uploadRegistryDocument(createdFlatId, registryFile);
          } catch (docErr) {
            console.warn('Could not auto-upload registry document:', docErr);
          }
        }
        onClose();
        if (onSuccess) {
          try { onSuccess(); } catch (e) { console.warn('onSuccess callback error:', e); }
        }
      } else {
        setErrorMsg(res.message || 'Failed to enroll flat into rental register');
      }
    } catch (err) {
      console.error('Manual rental enrollment error:', err);
      setErrorMsg(err.message || 'Error executing manual rental enrollment');
    } finally {
      setSubmitting(false);
    }
  };

  // Step validation
  const validateStep = (step) => {
    switch (step) {
      case 1: return !!selectedFlat;
      case 2: return ownerName.trim().length > 0;
      case 3: return grossRent > 0;
      case 4: return !!startDate;
      default: return true;
    }
  };

  const goNext = () => {
    if (currentStep < STEPS.length && validateStep(currentStep)) {
      setCurrentStep(s => s + 1);
    }
  };

  const goPrev = () => {
    if (currentStep > 1) setCurrentStep(s => s - 1);
  };

  const goToStep = (step) => {
    if (step < currentStep || validateStep(currentStep)) setCurrentStep(step);
  };

  // Common styles
  const inputStyle = {
    width: '100%', padding: '10px 12px', borderRadius: '8px',
    border: '1.5px solid #e2e8f0', fontSize: '0.88rem', outline: 'none',
    boxSizing: 'border-box', transition: 'border-color 0.2s, box-shadow 0.2s',
    fontFamily: "'Inter', sans-serif", background: '#ffffff',
  };
  const focusStyle = { borderColor: '#17652f', boxShadow: '0 0 0 3px rgba(23, 101, 47,0.1)' };
  const labelStyle = {
    display: 'block', fontSize: '0.72rem', fontWeight: '700', color: '#64748b',
    marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.05em',
  };
  const applyFocus = (e) => Object.assign(e.target.style, focusStyle);
  const removeFocus = (e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; };

  // ==========================================
  // STEP 1: Select Flat (Project → Tower → Flat Scaffolding)
  // ==========================================
  const renderStep1 = () => {
    // Stage A: Multi-project selector (if more than 1 project and none selected)
    if (!selectedProjectId && projectsList.length > 1) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'stepSlide 0.35s ease' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #17652f, #17652f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={16} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Step 1: Select Project</h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Choose the project to enroll a rental flat into</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '12px' }}>
            {projectsList.map((p) => {
              const bldgCount = p.buildings?.length || 0;
              const totalFlats = (p.buildings || []).reduce((acc, b) => acc + (b.flats?.length || b.totalFlats || 0), 0);
              return (
                <div
                  key={p._id || p.id}
                  onClick={() => {
                    setSelectedProjectId(String(p._id || p.id));
                    setSelectedTowerId(null);
                    setSelectedFlat(null);
                  }}
                  style={{
                    padding: '16px 18px', borderRadius: '12px', border: '1.5px solid #e2e8f0',
                    background: '#ffffff', cursor: 'pointer', transition: 'all 0.15s ease',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.05)'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; e.currentTarget.style.background = '#f0fdf4'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                    <div style={{ fontWeight: '700', fontSize: '1.02rem', color: '#0f172a' }}>{p.projectName}</div>
                    <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '6px', background: '#e8f2e5', color: '#17652f', fontWeight: '700' }}>
                      {p.projectCode || 'ACTIVE'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.78rem', color: '#64748b', display: 'flex', gap: '14px' }}>
                    <span>🏛️ {bldgCount} Towers</span>
                    <span>🏢 {totalFlats} Total Flats</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Stage B: Tower selector (if no tower is chosen yet)
    if (!selectedTowerId) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', animation: 'stepSlide 0.35s ease' }}>
          {/* Scaffolding Bar */}
          <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.82rem', color: '#475569' }}>
              <span style={{ fontWeight: '700', color: '#17652f' }}>1. Project:</span>
              <span style={{ fontWeight: '600', color: '#0f172a' }}>{selectedProject?.projectName || 'Krishna Valley Resorts'}</span>
            </div>
            {projectsList.length > 1 && (
              <button
                type="button"
                onClick={() => { setSelectedProjectId(null); setSelectedTowerId(null); setSelectedFlat(null); }}
                style={{ background: 'none', border: 'none', color: '#17652f', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer' }}
              >
                Change Project
              </button>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '4px 0' }}>
            <div style={{
              width: '32px', height: '32px', borderRadius: '10px',
              background: 'linear-gradient(135deg, #17652f, #17652f)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              <Building2 size={16} color="#fff" />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Step 2: Choose Tower / Building</h3>
              <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Select the tower to access its exact flat inventory</p>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))', gap: '14px' }}>
            {availableTowers.map((tower) => {
              const countForTower = flatsList.filter(f => {
                const bId = String(f.buildingId?._id || f.buildingId || '');
                if (bId && bId === tower._id) return true;
                const tName = (f.tower || f.buildingName || '').toLowerCase().trim();
                const myName = (tower.name || '').toLowerCase().trim();
                if (tName && myName && tName === myName) return true;
                if (myName.includes('tower b') || myName === 'b') return (f.flatNumber || '').toUpperCase().startsWith('B-');
                if (myName.includes('tower a') || myName === 'a') return !((f.flatNumber || '').toUpperCase().startsWith('B-'));
                return false;
              }).length;

              return (
                <div
                  key={tower._id}
                  onClick={() => {
                    setSelectedTowerId(tower._id);
                    setSelectedFlat(null);
                    setSelectedFloor('all');
                    setRentalStatusFilter('all');
                    setFlatSearchQuery('');
                  }}
                  style={{
                    padding: '18px 20px', borderRadius: '14px', border: '1.5px solid #e2e8f0',
                    background: '#ffffff', cursor: 'pointer', transition: 'all 0.18s ease',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.04)', display: 'flex', flexDirection: 'column', gap: '8px'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#17652f'; e.currentTarget.style.background = '#f0fdf4'; e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 6px 14px rgba(23, 101, 47,0.12)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#ffffff'; e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 2px 5px rgba(0,0,0,0.04)'; }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <Building2 size={20} color="#17652f" />
                      <span style={{ fontWeight: '700', fontSize: '1.08rem', color: '#0f172a' }}>{tower.name}</span>
                    </div>
                    <span style={{
                      padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem',
                      fontWeight: '700', background: '#e8f2e5', color: '#17652f'
                    }}>
                      {tower.code || 'BUILDING'}
                    </span>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '0.78rem', color: '#64748b' }}>
                    <span>🏢 {countForTower > 0 ? countForTower : tower.totalFlats || '—'} Flat Units</span>
                    <span>📏 {tower.floors ? `${tower.floors} Floors` : 'Multi-floor'}</span>
                  </div>

                  <div style={{
                    marginTop: '6px', padding: '6px 10px', background: '#f8fafc',
                    borderRadius: '8px', fontSize: '0.74rem', color: '#17652f',
                    fontWeight: '700', display: 'flex', alignItems: 'center', justifyContent: 'space-between'
                  }}>
                    <span>Select {tower.name} Inventory</span>
                    <ChevronRight size={14} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      );
    }

    // Stage C: Confirmed Selected Flat (Unit is Locked)
    if (selectedFlat) {
      return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px', animation: 'stepSlide 0.35s ease' }}>
          {/* Breadcrumb path */}
          <div style={{
            display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.75rem',
            color: '#64748b', background: '#f8fafc', padding: '8px 12px', borderRadius: '8px', border: '1px solid #e2e8f0'
          }}>
            <span style={{ color: '#17652f', fontWeight: '700' }}>Project:</span>
            <span>{selectedProject?.projectName || 'Krishna Valley Resorts'}</span>
            <ChevronRight size={12} color="#94a3b8" />
            <span style={{ color: '#17652f', fontWeight: '700' }}>Tower:</span>
            <span>{selectedTower?.name || selectedFlat.buildingName || 'Tower'}</span>
            <ChevronRight size={12} color="#94a3b8" />
            <span style={{ color: '#17652f', fontWeight: '700' }}>Flat:</span>
            <span style={{ fontWeight: '700', color: '#0f172a' }}>{selectedFlat.flatNumber}</span>
          </div>

          <div style={{
            background: 'linear-gradient(135deg, #e8f2e5, #ffffff)', border: '2px solid #17652f', borderRadius: '14px',
            padding: '16px 20px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', boxShadow: '0 4px 12px rgba(23, 101, 47,0.12)',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '46px', height: '46px', borderRadius: '12px',
                background: 'linear-gradient(135deg, #17652f, #17652f)',
                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
              }}>
                <Check size={26} strokeWidth={2.5} />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.25rem', fontWeight: '700', color: '#17652f' }}>
                    Flat {selectedFlat.flatNumber}
                  </span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem',
                    fontWeight: '700', background: '#e8f2e5', color: '#17652f',
                  }}>{selectedFlat.bhkType || '2BHK'}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '6px', fontSize: '0.72rem',
                    fontWeight: '600', background: '#e2e8f0', color: '#475569',
                  }}>Floor {selectedFlat.floor}</span>
                  <span style={{
                    padding: '2px 8px', borderRadius: '6px', fontSize: '0.68rem',
                    fontWeight: '700', background: '#17652f', color: '#ffffff'
                  }}>
                    LOCKED & ASSIGNED
                  </span>
                </div>
                <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: '4px' }}>
                  {selectedTower?.name || selectedFlat.buildingName || 'Tower'} • {selectedProject?.projectName || 'Krishna Valley Resorts'}
                  {selectedFlat.carpetArea ? ` • ${selectedFlat.carpetArea} sq.ft` : ''}
                  {selectedFlat.currentOwner?.name ? ` • Owner: ${selectedFlat.currentOwner.name}` : ''}
                </div>
                <div style={{ fontSize: '0.68rem', color: '#64748b', marginTop: '3px', fontFamily: 'monospace' }}>
                  Target Unit ID: {String(selectedFlat._id || selectedFlat.id)}
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end' }}>
              <button
                type="button"
                onClick={() => { setSelectedFlat(null); }}
                style={{
                  padding: '6px 14px', background: '#ffffff', border: '1px solid #cbd5e1',
                  borderRadius: '8px', color: '#334155', fontSize: '0.78rem', fontWeight: '700',
                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                  boxShadow: '0 1px 2px rgba(0,0,0,0.05)'
                }}
              >
                <X size={13} /> Change Flat
              </button>
              <button
                type="button"
                onClick={() => { setSelectedFlat(null); setSelectedTowerId(null); }}
                style={{
                  background: 'none', border: 'none', color: '#64748b',
                  fontSize: '0.7rem', fontWeight: '600', cursor: 'pointer', textDecoration: 'underline'
                }}
              >
                Switch Tower
              </button>
            </div>
          </div>

          <div style={{
            padding: '10px 14px', background: '#f8fafc', borderRadius: '10px',
            border: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <ShieldCheck size={16} color="#17652f" />
            <span style={{ fontSize: '0.78rem', color: '#334155' }}>
              Rental terms will be <strong>exclusively attached</strong> to Flat <strong>{selectedFlat.flatNumber}</strong> ({selectedTower?.name}). Click <strong>Continue</strong> below to proceed to Owner Details.
            </span>
          </div>
        </div>
      );
    }

    // Stage D: Tower Flat Inventory Selector (Tower is chosen, choosing flat)
    const totalCount = towerFlats.length;
    const activeCount = towerFlats.filter(f => f.takenForRental || f.rentalDetails?.guaranteedMonthlyRent).length;
    const availCount = totalCount - activeCount;

    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', animation: 'stepSlide 0.35s ease' }}>
        {/* Scaffolding Breadcrumb Context Bar */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: '#f8fafc', padding: '10px 14px', borderRadius: '10px', border: '1px solid #e2e8f0'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem' }}>
            <span style={{ color: '#17652f', fontWeight: '700' }}>Project:</span>
            <span style={{ color: '#0f172a', fontWeight: '600' }}>{selectedProject?.projectName || 'Krishna Valley Resorts'}</span>
            <ChevronRight size={13} color="#94a3b8" />
            <span style={{ color: '#17652f', fontWeight: '700' }}>Tower:</span>
            <span style={{
              background: '#e8f2e5', color: '#17652f', padding: '2px 8px', borderRadius: '6px', fontWeight: '700'
            }}>
              {selectedTower?.name || 'Selected Tower'}
            </span>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>({totalCount} Units)</span>
          </div>

          <button
            type="button"
            onClick={() => { setSelectedTowerId(null); setSelectedFlat(null); }}
            style={{
              padding: '4px 10px', background: '#ffffff', border: '1px solid #cbd5e1',
              borderRadius: '6px', color: '#334155', fontSize: '0.74rem', fontWeight: '700',
              cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px'
            }}
          >
            <ArrowLeft size={12} /> Switch Tower
          </button>
        </div>

        {/* Filter Toolbar: Search, Floor Pills, Status Pills */}
        <div style={{
          background: '#ffffff', border: '1.5px solid #e2e8f0', borderRadius: '12px',
          padding: '12px 14px', display: 'flex', flexDirection: 'column', gap: '10px'
        }}>
          {/* Row 1: Search & Status Pills */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative', flex: '1 1 200px' }}>
              <Search size={14} color="#94a3b8" style={{ position: 'absolute', left: '10px', top: '10px' }} />
              <input
                type="text"
                placeholder={`Search Flat in ${selectedTower?.name || 'Tower'} (e.g. 101, owner...)...`}
                value={flatSearchQuery}
                onChange={(e) => setFlatSearchQuery(e.target.value)}
                style={{ ...inputStyle, paddingLeft: '32px', paddingRight: '28px', fontSize: '0.82rem', padding: '7px 10px 7px 32px' }}
                onFocus={applyFocus}
                onBlur={removeFocus}
                autoFocus
              />
              {flatSearchQuery && (
                <button
                  type="button"
                  onClick={() => setFlatSearchQuery('')}
                  style={{
                    position: 'absolute', right: '8px', top: '8px', background: 'none',
                    border: 'none', color: '#94a3b8', cursor: 'pointer', padding: 0
                  }}
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Status Pills */}
            <div style={{ display: 'flex', gap: '4px', background: '#f1f5f9', padding: '3px', borderRadius: '8px' }}>
              {[
                { id: 'all', label: `All (${totalCount})` },
                { id: 'available', label: `Available (${availCount})` },
                { id: 'rental', label: `In Rental (${activeCount})` },
              ].map(st => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setRentalStatusFilter(st.id)}
                  style={{
                    padding: '4px 9px', borderRadius: '6px', border: 'none',
                    fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer',
                    background: rentalStatusFilter === st.id ? '#17652f' : 'transparent',
                    color: rentalStatusFilter === st.id ? '#ffffff' : '#64748b',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* Row 2: Floor Pills */}
          {availableFloors.length > 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', overflowX: 'auto', paddingBottom: '2px' }}>
              <span style={{ fontSize: '0.7rem', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', flexShrink: 0 }}>
                Floor:
              </span>
              <button
                type="button"
                onClick={() => setSelectedFloor('all')}
                style={{
                  padding: '2px 8px', borderRadius: '5px', border: 'none', fontSize: '0.7rem',
                  fontWeight: '700', cursor: 'pointer', flexShrink: 0,
                  background: selectedFloor === 'all' ? '#17652f' : '#f1f5f9',
                  color: selectedFloor === 'all' ? '#ffffff' : '#475569'
                }}
              >
                All
              </button>
              {availableFloors.map((flr) => (
                <button
                  key={flr}
                  type="button"
                  onClick={() => setSelectedFloor(flr)}
                  style={{
                    padding: '2px 8px', borderRadius: '5px', border: 'none', fontSize: '0.7rem',
                    fontWeight: '700', cursor: 'pointer', flexShrink: 0,
                    background: selectedFloor === flr ? '#17652f' : '#f1f5f9',
                    color: selectedFloor === flr ? '#ffffff' : '#475569'
                  }}
                >
                  {flr === 0 ? 'G' : `F${flr}`}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Flat Grid Display */}
        {loadingFlats ? (
          <div style={{ padding: '30px', textAlign: 'center', color: '#64748b', fontSize: '0.84rem' }}>
            <RefreshCw size={18} style={{ margin: '0 auto 6px', display: 'block', animation: 'spin 0.8s linear infinite' }} />
            Loading {selectedTower?.name} flats...
          </div>
        ) : filteredFlats.length === 0 ? (
          <div style={{
            padding: '30px 20px', textAlign: 'center', color: '#64748b', fontSize: '0.82rem',
            background: '#f8fafc', borderRadius: '12px', border: '1.5px dashed #cbd5e1'
          }}>
            <div>No flats match your filter criteria in {selectedTower?.name}.</div>
            <button
              type="button"
              onClick={() => { setFlatSearchQuery(''); setSelectedFloor('all'); setRentalStatusFilter('all'); }}
              style={{
                marginTop: '8px', padding: '4px 12px', background: '#17652f', color: '#fff',
                border: 'none', borderRadius: '6px', fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer'
              }}
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div>
            <div style={{
              maxHeight: '260px', overflowY: 'auto', paddingRight: '4px',
              display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: '8px',
            }}>
              {filteredFlats.map((f) => {
                const hasRental = Boolean(f.takenForRental || f.rentalDetails?.guaranteedMonthlyRent);
                return (
                  <div
                    key={f._id || f.id}
                    onClick={() => handleSelectFlat(f)}
                    style={{
                      padding: '10px 12px', borderRadius: '10px',
                      border: '1.5px solid #e2e8f0', background: '#ffffff',
                      cursor: 'pointer', display: 'flex', flexDirection: 'column', gap: '3px',
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#17652f';
                      e.currentTarget.style.background = '#f0fdf4';
                      e.currentTarget.style.transform = 'translateY(-1px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#e2e8f0';
                      e.currentTarget.style.background = '#ffffff';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: '700', fontSize: '0.94rem', color: '#0f172a' }}>{f.flatNumber}</span>
                      <span style={{
                        padding: '1px 6px', borderRadius: '4px', fontSize: '0.66rem', fontWeight: '700',
                        background: hasRental ? '#e0f2fe' : '#e8f2e5',
                        color: hasRental ? '#0369a1' : '#17652f',
                      }}>
                        {f.bhkType || '2BHK'}
                      </span>
                    </div>

                    <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
                      Floor {f.floor} {f.carpetArea ? `• ${f.carpetArea} sq.ft` : ''}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2px' }}>
                      <span style={{
                        fontSize: '0.66rem', fontWeight: '700',
                        color: hasRental ? '#0284c7' : '#17652f'
                      }}>
                        {hasRental ? `In Rental` : `Available`}
                      </span>
                      {f.rentalDetails?.guaranteedMonthlyRent ? (
                        <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#17652f' }}>
                          ₹{(f.rentalDetails.guaranteedMonthlyRent / 1000).toFixed(0)}k/mo
                        </span>
                      ) : null}
                    </div>

                    {f.currentOwner?.name && (
                      <div style={{
                        fontSize: '0.68rem', color: '#475569', fontWeight: '600',
                        overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
                      }}>
                        👤 {f.currentOwner.name}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '8px', textAlign: 'center' }}>
              Showing {filteredFlats.length} of {towerFlats.length} units in {selectedTower?.name} • Click any unit to lock & assign
            </div>
          </div>
        )}
      </div>
    );
  };

  // ==========================================
  // STEP 2: Owner Details
  // ==========================================
  const renderStep2 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepSlide 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #17652f, #17652f)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <User size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Owner & Registry Details</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>
            Owner KYC for Flat {selectedFlat?.flatNumber || '—'}
          </p>
        </div>
      </div>

      <div>
        <label style={labelStyle}>Owner Full Name *</label>
        <input
          type="text" required placeholder="e.g. Ved Prakash Agarwal"
          value={ownerName} onChange={(e) => setOwnerName(e.target.value)}
          style={{ ...inputStyle, fontSize: '1rem', fontWeight: '700' }}
          onFocus={applyFocus} onBlur={removeFocus} autoFocus
        />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Owner Mobile</label>
          <input
            type="text" placeholder="9876543210"
            value={ownerMobile} onChange={(e) => setOwnerMobile(e.target.value)}
            style={inputStyle} onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
        <div>
          <label style={labelStyle}>Owner Email</label>
          <input
            type="email" placeholder="owner@example.com"
            value={ownerEmail} onChange={(e) => setOwnerEmail(e.target.value)}
            style={inputStyle} onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
      </div>

      <div>
        <label style={labelStyle}>Registry / MOU Date *</label>
        <input
          type="date" required value={registryDate}
          onChange={(e) => setRegistryDate(e.target.value)}
          style={inputStyle} onFocus={applyFocus} onBlur={removeFocus}
        />
      </div>

      {/* Owner Registry Document Upload Section */}
      <div>
        <label style={labelStyle}>
          Owner Registry Document (Sale Deed / Registry Proof)
        </label>
        <div style={{
          border: registryFile ? '1.5px solid #cde4c9' : '1.5px dashed #cbd5e1',
          borderRadius: '10px',
          padding: '14px',
          background: registryFile ? '#e8f2e5' : '#fafafa',
          textAlign: 'center',
          transition: 'all 0.2s ease'
        }}>
          {registryFile ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px', textAlign: 'left', overflow: 'hidden' }}>
                <div style={{
                  width: '36px', height: '36px', borderRadius: '8px',
                  background: '#17652f', color: '#fff',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                }}>
                  <FileText size={18} />
                </div>
                <div style={{ overflow: 'hidden' }}>
                  <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#17652f', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {registryFile.name}
                  </div>
                  <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>
                    {(registryFile.size / 1024).toFixed(1)} KB • Attached for Flat {selectedFlat?.flatNumber || 'Unit'}
                  </div>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegistryFile(null)}
                style={{
                  padding: '4px 8px', borderRadius: '6px',
                  background: '#f1f5f9', color: '#0f172a', border: '1px solid #e2e8f0',
                  fontSize: '0.74rem', fontWeight: '700', cursor: 'pointer'
                }}
              >
                Remove
              </button>
            </div>
          ) : (
            <label style={{ display: 'block', cursor: 'pointer', padding: '6px 0' }}>
              <Upload size={22} color="#64748b" style={{ margin: '0 auto 6px', display: 'block' }} />
              <div style={{ fontSize: '0.84rem', fontWeight: '700', color: '#334155' }}>
                Upload Owner Registry Document
              </div>
              <div style={{ fontSize: '0.72rem', color: '#94a3b8', marginTop: '2px' }}>
                Click to attach Sale Deed / Registry Copy (PDF, PNG, JPG up to 25MB)
              </div>
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                style={{ display: 'none' }}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) setRegistryFile(f);
                }}
              />
            </label>
          )}
        </div>
      </div>

      {/* Selected flat info */}
      {selectedFlat && (
        <div style={{
          padding: '10px 14px', background: '#e8f2e5', borderRadius: '10px',
          border: '1px solid #e8f2e5', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <CheckCircle2 size={16} color="#17652f" />
          <span style={{ fontSize: '0.78rem', color: '#17652f', fontWeight: '600' }}>
            Enrolling <strong>Flat {selectedFlat.flatNumber}</strong> • {selectedFlat.buildingName || 'Tower'} • Floor {selectedFlat.floor}
          </span>
        </div>
      )}
    </div>
  );

  // ==========================================
  // STEP 3: Rent & TDS
  // ==========================================
  const renderStep3 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepSlide 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #17652f, #17652f)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <DollarSign size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Rent Amount & TDS</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Set gross rent and TDS deduction for Flat {selectedFlat?.flatNumber || '—'}</p>
        </div>
      </div>

      {/* Gross Rent */}
      <div>
        <label style={labelStyle}>Gross Monthly Rent (₹) *</label>
        <div style={{ position: 'relative' }}>
          <span style={{
            position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)',
            fontWeight: '600', color: '#17652f', fontSize: '1rem',
          }}>₹</span>
          <input
            type="number" required min="1000" step="500"
            value={rentAmount}
            onChange={(e) => {
              const val = e.target.value === '' ? '' : Number(e.target.value);
              setRentAmount(val);
              if (tdsMode === 'percentage' && val) {
                setTdsAmount(Math.round(val * (tdsPercentage / 100)));
              }
            }}
            style={{ ...inputStyle, paddingLeft: '30px', fontSize: '1.1rem', fontWeight: '600', color: '#0f172a' }}
            onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
      </div>

      {/* TDS Config */}
      <div style={{
        background: '#f8fafc', border: '1px solid #e2e8f0',
        borderRadius: '12px', padding: '16px 18px',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
          <label style={{
            display: 'flex', alignItems: 'center', gap: '8px',
            fontSize: '0.82rem', fontWeight: '700', color: '#334155', cursor: 'pointer',
          }}>
            <input
              type="checkbox" checked={applyTds}
              onChange={(e) => setApplyTds(e.target.checked)}
              style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: '#17652f' }}
            />
            Apply TDS Deduction
          </label>

          {applyTds && (
            <div style={{ display: 'flex', background: '#e2e8f0', borderRadius: '8px', padding: '3px', gap: '2px' }}>
              <button type="button" onClick={() => setTdsMode('percentage')} style={{
                padding: '4px 12px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', border: 'none',
                cursor: 'pointer', background: tdsMode === 'percentage' ? '#17652f' : 'transparent',
                color: tdsMode === 'percentage' ? '#fff' : '#475569', transition: 'all 0.2s',
              }}>% Percent</button>
              <button type="button" onClick={() => setTdsMode('amount')} style={{
                padding: '4px 12px', fontSize: '0.75rem', fontWeight: '700', borderRadius: '6px', border: 'none',
                cursor: 'pointer', background: tdsMode === 'amount' ? '#17652f' : 'transparent',
                color: tdsMode === 'amount' ? '#fff' : '#475569', transition: 'all 0.2s',
              }}>₹ Amount</button>
            </div>
          )}
        </div>

        {applyTds ? (
          tdsMode === 'percentage' ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <input
                  type="number" min="0" max="100" step="0.1"
                  value={tdsPercentage}
                  onChange={(e) => {
                    const p = Number(e.target.value);
                    setTdsPercentage(p);
                    setTdsAmount(Math.round(grossRent * (p / 100)));
                  }}
                  style={{ ...inputStyle, paddingRight: '28px', fontWeight: '700' }}
                  onFocus={applyFocus} onBlur={removeFocus}
                />
                <span style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>%</span>
              </div>
              <span style={{
                padding: '8px 14px', background: '#f1f5f9', color: '#334155',
                borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', whiteSpace: 'nowrap',
              }}>− {formatINR(finalTdsAmount)}</span>
            </div>
          ) : (
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ position: 'relative', flex: 1 }}>
                <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontSize: '0.85rem', color: '#64748b', fontWeight: '700' }}>₹</span>
                <input
                  type="number" min="0" step="100"
                  value={tdsAmount}
                  onChange={(e) => {
                    const amt = Number(e.target.value);
                    setTdsAmount(amt);
                    if (grossRent > 0) setTdsPercentage(Number(((amt / grossRent) * 100).toFixed(2)));
                  }}
                  style={{ ...inputStyle, paddingLeft: '28px', fontWeight: '700' }}
                  onFocus={applyFocus} onBlur={removeFocus}
                />
              </div>
              <span style={{
                padding: '8px 14px', background: '#e8f2e5', color: '#17652f',
                borderRadius: '8px', fontSize: '0.82rem', fontWeight: '700', whiteSpace: 'nowrap',
              }}>{effectiveTdsPct}% rate</span>
            </div>
          )
        ) : (
          <div style={{
            padding: '10px 14px', background: '#f1f5f9', borderRadius: '8px',
            color: '#64748b', fontSize: '0.85rem', fontWeight: '600', textAlign: 'center',
          }}>No TDS will be deducted (0%)</div>
        )}
      </div>

      {/* Net Preview */}
      <div style={{
        padding: '14px 18px', background: 'linear-gradient(135deg, #e8f2e5, #e8f2e5)',
        border: '1.5px solid #cde4c9', borderRadius: '12px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: '0.82rem', color: '#17652f', fontWeight: '700' }}>Net Monthly Payout:</span>
        <div style={{ textAlign: 'right' }}>
          <span style={{ fontSize: '1.2rem', fontWeight: '600', color: '#17652f' }}>{formatINR(netAmount)}</span>
          <span style={{ fontSize: '0.72rem', color: '#17652f', display: 'block', fontWeight: '600' }}>per month</span>
        </div>
      </div>
    </div>
  );

  // ==========================================
  // STEP 4: Contract & Review
  // ==========================================
  const renderStep4 = () => (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '18px', animation: 'stepSlide 0.35s ease' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <div style={{
          width: '32px', height: '32px', borderRadius: '10px',
          background: 'linear-gradient(135deg, #334155, #334155)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <Calendar size={16} color="#fff" />
        </div>
        <div>
          <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: '600', color: '#0f172a' }}>Contract Period & Review</h3>
          <p style={{ margin: 0, fontSize: '0.76rem', color: '#64748b' }}>Set dates, tenure, and review before enrollment</p>
        </div>
      </div>

      {/* Dates */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 0.8fr 1fr', gap: '14px' }}>
        <div>
          <label style={labelStyle}>Start Date *</label>
          <input
            type="date" required value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            style={inputStyle} onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
        <div>
          <label style={labelStyle}>Tenure (Months) *</label>
          <input
            type="number" required min="1" max="120"
            value={tenureMonths} onChange={(e) => setTenureMonths(e.target.value)}
            style={{ ...inputStyle, fontWeight: '600', fontSize: '1rem', textAlign: 'center' }}
            onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
            <label style={{ ...labelStyle, marginBottom: 0 }}>End Date *</label>
            <button type="button" onClick={() => {
              if (startDate) {
                const d = new Date(startDate);
                if (!isNaN(d.getTime())) { d.setMonth(d.getMonth() + Number(tenureMonths || 36)); setEndDate(d.toISOString().slice(0, 10)); }
              }
            }} style={{
              border: 'none', background: '#e8f2e5', color: '#17652f', fontSize: '0.68rem',
              fontWeight: '700', cursor: 'pointer', borderRadius: '4px', padding: '2px 6px',
            }}>Auto</button>
          </div>
          <input
            type="date" required value={endDate || endingDate}
            onChange={(e) => setEndDate(e.target.value)}
            style={{ ...inputStyle, borderColor: '#17652f', fontWeight: '700', color: '#17652f' }}
          />
        </div>
      </div>

      {/* Total Paid */}
      <div>
        <label style={labelStyle}>Total Paid / Disbursed So Far (₹)</label>
        <div style={{ position: 'relative' }}>
          <span style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', fontWeight: '700', color: '#64748b' }}>₹</span>
          <input
            type="number" min="0" step="1000" value={totalPaid}
            onChange={(e) => setTotalPaid(e.target.value)}
            style={{ ...inputStyle, paddingLeft: '28px', fontWeight: '700' }}
            onFocus={applyFocus} onBlur={removeFocus}
          />
        </div>
      </div>

      {/* Financial Summary */}
      <div style={{
        background: 'linear-gradient(135deg, #e8f2e5, #e8f2e5)',
        border: '1.5px solid #cde4c9', borderRadius: '12px', padding: '16px 20px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
          <TrendingUp size={16} color="#17652f" />
          <span style={{ fontSize: '0.82rem', fontWeight: '600', color: '#17652f', textTransform: 'uppercase' }}>Financial Summary</span>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '12px' }}>
          <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e8f2e5' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>TOTAL PAYMENT</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '600', color: '#17652f' }}>{formatINR(totalCommitment)}</span>
            <span style={{ fontSize: '0.66rem', color: '#17652f', display: 'block', marginTop: '2px' }}>
              {formatINR(grossRent)} × {tenure} mos
            </span>
          </div>
          <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e8f2e5' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>TOTAL PAID</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '600', color: '#17652f' }}>{formatINR(paid)}</span>
            <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>Disbursed</span>
          </div>
          <div style={{ background: '#fff', padding: '12px 14px', borderRadius: '10px', border: '1px solid #e8f2e5' }}>
            <span style={{ fontSize: '0.68rem', color: '#64748b', fontWeight: '700', display: 'block' }}>OUTSTANDING</span>
            <span style={{ fontSize: '1.15rem', fontWeight: '600', color: outstandingBalance > 0 ? '#0f172a' : '#17652f' }}>
              {formatINR(outstandingBalance)}
            </span>
            <span style={{ fontSize: '0.66rem', color: '#64748b', display: 'block', marginTop: '2px' }}>Remaining</span>
          </div>
        </div>
      </div>

      {/* Summary Table */}
      <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '14px 16px' }}>
        <h4 style={{ margin: '0 0 10px', fontSize: '0.78rem', fontWeight: '600', color: '#334155', textTransform: 'uppercase' }}>Enrollment Summary</h4>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '5px', fontSize: '0.82rem' }}>
          {[
            { label: 'Flat', value: `Flat ${selectedFlat?.flatNumber || '—'}` },
            { label: 'Owner', value: ownerName || '—' },
            { label: 'Gross Rent', value: `${formatINR(grossRent)}/mo` },
            { label: 'Net Rent', value: `${formatINR(netAmount)}/mo` },
            { label: 'TDS', value: applyTds ? `${effectiveTdsPct}% (${formatINR(finalTdsAmount)})` : 'None' },
            { label: 'Tenure', value: `${tenure} months` },
            { label: 'Start', value: startDate ? new Date(startDate).toLocaleDateString('en-IN') : '—' },
            { label: 'End', value: (endDate || endingDate) !== '—' ? new Date(endDate || endingDate).toLocaleDateString('en-IN') : '—' },
          ].map((item, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              padding: '5px 10px', borderRadius: '6px',
              background: i % 2 === 0 ? '#ffffff' : '#f1f5f9',
            }}>
              <span style={{ color: '#64748b', fontWeight: '600' }}>{item.label}</span>
              <span style={{ color: '#0f172a', fontWeight: '700' }}>{item.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  const renderCurrentStep = () => {
    switch (currentStep) {
      case 1: return renderStep1();
      case 2: return renderStep2();
      case 3: return renderStep3();
      case 4: return renderStep4();
      default: return null;
    }
  };

  return (
    <div style={{
      position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.45)',
      backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center',
      justifyContent: 'center', zIndex: 1100, padding: '16px',
    }}>
      <div style={{
        background: '#ffffff', borderRadius: '16px', width: '100%',
        maxWidth: '700px', maxHeight: '92vh', display: 'flex',
        flexDirection: 'column', boxShadow: '0 20px 45px rgba(0,0,0,0.1)',
        overflow: 'hidden', position: 'relative'
      }}>
        {/* Minimal Close Button (Top Right) */}
        <button
          onClick={onClose}
          style={{
            position: 'absolute', top: '16px', right: '18px',
            background: 'transparent', border: 'none', borderRadius: '50%',
            color: '#94a3b8', cursor: 'pointer', padding: '6px', display: 'flex',
            alignItems: 'center', justifyContent: 'center', zIndex: 10,
            transition: 'background 0.15s ease, color 0.15s ease'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.background = '#f1f5f9'; e.currentTarget.style.color = '#334155'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94a3b8'; }}
          aria-label="Close"
        >
          <X size={18} />
        </button>

        {/* HEADER (Centered & Clean) */}
        <div style={{
          padding: '24px 32px 12px', textAlign: 'center',
          backgroundColor: '#ffffff'
        }}>
          <h2 style={{
            margin: '0 0 4px', fontSize: '1.35rem', fontWeight: '600',
            color: '#1e293b', letterSpacing: '-0.02em'
          }}>
            Manual rental enrollment
          </h2>
          <p style={{ margin: 0, fontSize: '0.82rem', color: '#64748b' }}>
            Step {currentStep} of {STEPS.length} — {STEPS[currentStep - 1].subtitle}
          </p>
        </div>

        {/* STEPPER (Matching Dashed-Line Reference Design) */}
        <div className="form-stepper-header">
          {STEPS.map((step, idx) => {
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;
            return (
              <React.Fragment key={step.id}>
                <button
                  type="button"
                  onClick={() => goToStep(step.id)}
                  className="form-stepper-item"
                >
                  <div className={`form-stepper-circle ${isCompleted ? 'completed' : isActive ? 'active' : 'upcoming'}`}>
                    {isCompleted ? <Check size={12} strokeWidth={3} /> : step.id}
                  </div>
                  <span className={`form-stepper-label ${isActive ? 'active' : ''}`}>
                    {step.title}
                  </span>
                </button>
                {idx < STEPS.length - 1 && (
                  <div className="form-stepper-line" />
                )}
              </React.Fragment>
            );
          })}
        </div>

        {/* CONTENT */}
        <div style={{ padding: '8px 32px 24px', overflowY: 'auto', flex: 1 }}>
          {renderCurrentStep()}
        </div>

        {/* ERROR */}
        {errorMsg && (
          <div style={{
            margin: '0 32px 12px', padding: '10px 14px', background: '#fef2f2',
            border: '1px solid #fee2e2', borderRadius: '8px', fontSize: '0.82rem',
            color: '#991b1b', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '8px',
          }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* FOOTER */}
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          padding: '16px 32px', borderTop: '1px solid #f1f5f9', background: '#ffffff',
        }}>
          <button
            type="button" onClick={currentStep === 1 ? onClose : goPrev}
            style={{
              padding: '10px 24px', borderRadius: '8px', border: 'none',
              background: '#f1f5f9', color: '#475569', fontSize: '0.86rem', fontWeight: '600',
              cursor: 'pointer', transition: 'background-color 0.15s ease',
            }}
            onMouseOver={(e) => { e.currentTarget.style.background = '#e2e8f0'; }}
            onMouseOut={(e) => { e.currentTarget.style.background = '#f1f5f9'; }}
          >
            {currentStep === 1 ? 'Cancel' : 'Back'}
          </button>

          {currentStep < STEPS.length ? (
            <button
              type="button" onClick={goNext} disabled={!validateStep(currentStep)}
              style={{
                padding: '10px 28px', borderRadius: '8px', border: 'none',
                background: validateStep(currentStep) ? '#17652f' : '#e2e8f0',
                color: validateStep(currentStep) ? '#ffffff' : '#94a3b8',
                fontSize: '0.86rem', fontWeight: '600',
                cursor: validateStep(currentStep) ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
              }}
            >
              Continue
            </button>
          ) : (
            <button
              type="button" onClick={handleSubmit} disabled={submitting}
              style={{
                padding: '10px 28px', borderRadius: '8px', border: 'none',
                background: '#17652f',
                color: '#ffffff', fontSize: '0.86rem', fontWeight: '600',
                cursor: submitting ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', gap: '8px',
                transition: 'all 0.15s ease',
              }}
            >
              <CheckCircle2 size={16} />
              {submitting ? 'Enrolling...' : `Enroll Flat ${selectedFlat?.flatNumber || ''}`}
            </button>
          )}
        </div>
      </div>

      <style>{`
        @keyframes stepSlide {
          from { opacity: 0; transform: translateY(8px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default ManualRentalEntryModal;
