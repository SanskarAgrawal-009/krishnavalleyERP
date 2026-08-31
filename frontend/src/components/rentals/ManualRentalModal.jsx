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
  Key, 
  DollarSign, 
  Calendar, 
  Repeat, 
  FileText, 
  ShieldCheck, 
  ArrowRight,
  TrendingUp,
  Layers,
  AlertCircle,
  CheckCircle2,
  Loader2,
  Mail,
  PlusCircle,
  Trash2,
  Sparkles
} from 'lucide-react';

export const ManualRentalModal = ({ isOpen, onClose, onSubmit, contract = null }) => {
  // Inventory & Customers List
  const [projects, setProjects] = useState([]);
  const [flats, setFlats] = useState([]);
  const [owners, setOwners] = useState([]);
  const [tenants, setTenants] = useState([]);

  // Lease Mode: 'single' (1 Flat) vs 'multi' (Multiple Flats / Corporate Bundle)
  const [leaseMode, setLeaseMode] = useState('single');

  // Single Flat Selection
  const [selectedProjectId, setSelectedProjectId] = useState('');
  const [selectedBuildingId, setSelectedBuildingId] = useState('');
  const [selectedFlatId, setSelectedFlatId] = useState('');
  // Auto-Fetch & Quick-Add Owner State for Single Mode
  const [selectedOwnerId, setSelectedOwnerId] = useState('');
  const [isAddingNewOwner, setIsAddingNewOwner] = useState(false);
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerPhone, setNewOwnerPhone] = useState('');
  const [isFetchingOwner, setIsFetchingOwner] = useState(false);
  const [fetchedOwnerInfo, setFetchedOwnerInfo] = useState(null);
  const [ownerFetchStatus, setOwnerFetchStatus] = useState(''); // 'found_local' | 'found_api' | 'found_sales' | 'not_found' | 'error'

  // Helper: default 3-year date (36 months = 1095 days)
  const default3YearEnd = () => {
    const d = new Date();
    d.setFullYear(d.getFullYear() + 3);
    return d.toISOString().slice(0, 10);
  };

  // Rent-Back Configuration (Company takes flat from owner - 3 Year Mandatory Policy)
  const [rentBackEnabled, setRentBackEnabled] = useState(false);
  const [rentBackForm, setRentBackForm] = useState({
    agreementNumber: `RB-${Date.now().toString().slice(-6)}`,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: default3YearEnd(),
    monthlyRent: 0,
    securityDeposit: 0,
    rentDueDay: 5,
    status: 'active'
  });

  // Tenant Agreement Configuration (Company leases flat to tenant - 3 Year Policy)
  const [tenantAgreementForm, setTenantAgreementForm] = useState({
    agreementNumber: `TA-${Date.now().toString().slice(-6)}`,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: default3YearEnd(),
    monthlyRent: 0,
    rentDueDay: 5,
    status: 'active'
  });

  // Security Deposit Tracking
  const [tenantDepositReq, setTenantDepositReq] = useState(0);
  const [tenantDepositPaid, setTenantDepositPaid] = useState(0);

  const [ownerDepositReq, setOwnerDepositReq] = useState(0);
  const [ownerDepositPaid, setOwnerDepositPaid] = useState(0);

  // Allocation & Remarks
  const [allocationStatus, setAllocationStatus] = useState('occupied');
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

      // Load Customers
      customerService.getCustomers({ customerType: 'owner' }).then((res) => {
        if (res.data) setOwners(res.data);
      });
      customerService.getCustomers({ customerType: 'tenant' }).then((res) => {
        if (res.data) setTenants(res.data);
      });

      if (contract) {
        setSelectedProjectId(contract.projectId?._id || contract.projectId || '');
        setSelectedBuildingId(contract.buildingId || '');
        setSelectedFlatId(contract.flatId?._id || contract.flatId || '');
        setSelectedOwnerId(contract.ownerId?._id || contract.ownerId || '');
        setSelectedTenantId(contract.tenantId?._id || contract.tenantId || '');

        if (contract.isMultiUnit || (contract.flatIds && contract.flatIds.length > 1)) {
          setLeaseMode('multi');
          const loadedUnits = (contract.leasedUnits || []).map((u) => ({
            flatId: u.flatId?._id || u.flatId,
            flatNumber: u.flatNumber || u.flatId?.flatNumber || 'Unit',
            projectId: contract.projectId?._id || contract.projectId,
            projectName: contract.projectId?.projectName || '',
            ownerId: u.ownerId?._id || u.ownerId,
            ownerName: u.ownerId?.name || 'Owner',
            ownerPhone: u.ownerId?.mobileNo || '',
            monthlyRentBack: u.monthlyRentBack || 20000,
            monthlyTenantRent: u.monthlyTenantRent || 28000,
            securityDeposit: u.depositAmount || 40000
          }));
          setSelectedUnits(loadedUnits);
        } else {
          setLeaseMode('single');
          setSelectedUnits([]);
        }

        if (contract.ownerId) {
          setFetchedOwnerInfo(typeof contract.ownerId === 'object' ? contract.ownerId : null);
          setOwnerFetchStatus('found_local');
        }

        setRentBackEnabled(contract.rentBack?.enabled || false);
        if (contract.rentBack) {
          setRentBackForm({
            agreementNumber: contract.rentBack.agreementNumber || '',
            startDate: contract.rentBack.startDate ? new Date(contract.rentBack.startDate).toISOString().slice(0, 10) : '',
            endDate: contract.rentBack.endDate ? new Date(contract.rentBack.endDate).toISOString().slice(0, 10) : '',
            monthlyRent: contract.rentBack.monthlyRent || 0,
            securityDeposit: contract.rentBack.securityDeposit || 0,
            rentDueDay: contract.rentBack.rentDueDay || 5,
            status: contract.rentBack.status || 'active'
          });
        }

        if (contract.tenantAgreement) {
          setTenantAgreementForm({
            agreementNumber: contract.tenantAgreement.agreementNumber || '',
            startDate: contract.tenantAgreement.startDate ? new Date(contract.tenantAgreement.startDate).toISOString().slice(0, 10) : '',
            endDate: contract.tenantAgreement.endDate ? new Date(contract.tenantAgreement.endDate).toISOString().slice(0, 10) : '',
            monthlyRent: contract.tenantAgreement.monthlyRent || 0,
            rentDueDay: contract.tenantAgreement.rentDueDay || 5,
            status: contract.tenantAgreement.status || 'active'
          });
        }

        setTenantDepositReq(contract.securityDeposit?.tenantDeposit?.requiredAmount || 0);
        setTenantDepositPaid(contract.securityDeposit?.tenantDeposit?.paidAmount || 0);
        setOwnerDepositReq(contract.securityDeposit?.ownerDeposit?.requiredAmount || 0);
        setOwnerDepositPaid(contract.securityDeposit?.ownerDeposit?.paidAmount || 0);
        setAllocationStatus(contract.allocation?.status || 'allocated');
        setRemarks(contract.remarks || '');
      } else {
        // Reset
        setLeaseMode('single');
        setSelectedProjectId('');
        setSelectedBuildingId('');
        setSelectedFlatId('');
        setSelectedOwnerId('');
        setIsAddingNewOwner(false);
        setNewOwnerName('');
        setNewOwnerPhone('');
        setSelectedUnits([]);
        setSelectedTenantId('');
        setIsAddingNewTenant(false);
        setNewTenantName('');
        setNewTenantPhone('');
        setFetchedOwnerInfo(null);
        setOwnerFetchStatus('');
        setRentBackForm({
          agreementNumber: `RB-${Date.now().toString().slice(-6)}`,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: default3YearEnd(),
          monthlyRent: 0,
          securityDeposit: 0,
          rentDueDay: 5,
          status: 'active'
        });
        setTenantAgreementForm({
          agreementNumber: `TA-${Date.now().toString().slice(-6)}`,
          startDate: new Date().toISOString().slice(0, 10),
          endDate: default3YearEnd(),
          monthlyRent: 0,
          rentDueDay: 5,
          status: 'active'
        });
        setTenantDepositReq(0);
        setTenantDepositPaid(0);
        setOwnerDepositReq(0);
        setOwnerDepositPaid(0);
        setAllocationStatus('occupied');
        setRemarks('');
      }
    }
  }, [isOpen, contract]);

  // Recalculate totals whenever selectedUnits change in Multi-Flat mode
  const recalculateMultiUnitTotals = (unitsList) => {
    let totRentBack = 0;
    let totTenantRent = 0;
    let totOwnerDeposit = 0;
    let totTenantDeposit = 0;

    unitsList.forEach((u) => {
      const rb = Number(u.monthlyRentBack) || 0;
      const tr = Number(u.monthlyTenantRent) || 0;
      const dep = Number(u.securityDeposit) || 0;
      totRentBack += rb;
      totTenantRent += tr;
      totOwnerDeposit += dep;
      totTenantDeposit += (tr * 2); // 2 months standard deposit
    });

    setRentBackForm((prev) => ({ ...prev, monthlyRent: totRentBack, securityDeposit: totOwnerDeposit }));
    setTenantAgreementForm((prev) => ({ ...prev, monthlyRent: totTenantRent }));
    setOwnerDepositReq(totOwnerDeposit);
    setOwnerDepositPaid(totOwnerDeposit);
    setTenantDepositReq(totTenantDeposit);
    setTenantDepositPaid(totTenantDeposit);
  };

  // Add Flat Unit to Multi-Flat Bundle
  const handleAddUnitToBundle = async (fId) => {
    if (!fId) return;
    if (selectedUnits.some((u) => u.flatId === fId)) {
      alert('This flat is already added to the lease bundle.');
      return;
    }

    const matchedFlat = flats.find((f) => (f._id || f.id) === fId);
    if (!matchedFlat) return;

    setIsAddingUnit(true);
    let ownerObj = null;

    // Check local owners
    const localOwner = owners.find((o) =>
      o.ownerDetails?.propertyIds?.some((p) => (p._id || p)?.toString() === fId.toString())
    );

    if (localOwner) {
      ownerObj = localOwner;
    } else {
      try {
        const res = await rentalService.getOwnerByFlat(fId);
        if (res && res.success && res.data) {
          ownerObj = res.data;
          setOwners((prev) => (!prev.some((o) => o._id === ownerObj._id) ? [ownerObj, ...prev] : prev));
        }
      } catch (err) {
        console.error('Error auto-fetching owner for bundle unit:', err);
      }
    }

    const expTenantRent = matchedFlat.rentalDetails?.expectedRent || 0;
    const expRentBack = expTenantRent ? Math.round(expTenantRent * 0.8) : 0;
    const expDep = matchedFlat.rentalDetails?.securityDeposit || (expTenantRent * 2);

    const newUnit = {
      flatId: matchedFlat._id,
      flatNumber: matchedFlat.flatNumber,
      projectId: matchedFlat.projectId?._id || matchedFlat.projectId,
      projectName: matchedFlat.projectId?.projectName || 'Project',
      buildingId: matchedFlat.buildingId,
      ownerId: ownerObj ? ownerObj._id : '',
      ownerName: ownerObj ? ownerObj.name : 'Unassigned Owner',
      ownerPhone: ownerObj ? ownerObj.mobileNo : '',
      monthlyRentBack: expRentBack,
      monthlyTenantRent: expTenantRent,
      securityDeposit: expDep
    };

    const updated = [...selectedUnits, newUnit];
    setSelectedUnits(updated);
    recalculateMultiUnitTotals(updated);

    if (!selectedProjectId && newUnit.projectId) {
      setSelectedProjectId(newUnit.projectId);
    }
    if (!selectedOwnerId && newUnit.ownerId) {
      setSelectedOwnerId(newUnit.ownerId);
    }

    setUnitToAddFlatId('');
    setIsAddingUnit(false);
  };

  // Remove Flat Unit from Bundle
  const handleRemoveUnitFromBundle = (fId) => {
    const updated = selectedUnits.filter((u) => u.flatId !== fId);
    setSelectedUnits(updated);
    recalculateMultiUnitTotals(updated);
  };

  // Update Individual Unit Rent
  const handleUpdateUnitRent = (fId, field, value) => {
    const numVal = Number(value) || 0;
    const updated = selectedUnits.map((u) => (u.flatId === fId ? { ...u, [field]: numVal } : u));
    setSelectedUnits(updated);
    recalculateMultiUnitTotals(updated);
  };

  // Single Flat Select Handler
  const handleFlatSelect = async (fId) => {
    setSelectedFlatId(fId);

    if (!fId) {
      setSelectedProjectId('');
      setSelectedBuildingId('');
      setSelectedOwnerId('');
      setFetchedOwnerInfo(null);
      setOwnerFetchStatus('');
      return;
    }

    const matchedFlat = flats.find((f) => (f._id || f.id) === fId);
    if (matchedFlat) {
      setSelectedProjectId(matchedFlat.projectId?._id || matchedFlat.projectId);
      setSelectedBuildingId(matchedFlat.buildingId);

      // Bind to database values if available
      if (matchedFlat.rentalDetails?.expectedRent) {
        const expRent = matchedFlat.rentalDetails.expectedRent;
        const dep = matchedFlat.rentalDetails.securityDeposit || (expRent * 2);
        setTenantAgreementForm(prev => ({ ...prev, monthlyRent: expRent }));
        setRentBackForm(prev => ({ ...prev, monthlyRent: Math.round(expRent * 0.8), securityDeposit: dep }));
        setTenantDepositReq(dep);
        setTenantDepositPaid(dep);
        setOwnerDepositReq(dep);
        setOwnerDepositPaid(dep);
      }
    }

    // 1. Instant check in loaded owners state
    const localMatchedOwner = owners.find((o) =>
      o.ownerDetails?.propertyIds?.some((p) => (p._id || p)?.toString() === fId.toString())
    );

    if (localMatchedOwner) {
      setSelectedOwnerId(localMatchedOwner._id);
      setFetchedOwnerInfo(localMatchedOwner);
      setOwnerFetchStatus('found_local');
    }

    // 2. Perform background API lookup for owner
    setIsFetchingOwner(true);
    try {
      const res = await rentalService.getOwnerByFlat(fId);
      if (res && res.success && res.data) {
        const ownerData = res.data;
        setOwners((prev) => (!prev.some((o) => o._id === ownerData._id) ? [ownerData, ...prev] : prev));
        setSelectedOwnerId(ownerData._id);
        setFetchedOwnerInfo(ownerData);
        setOwnerFetchStatus(res.source === 'sales_registry' ? 'found_sales' : 'found_api');
      } else if (!localMatchedOwner) {
        setSelectedOwnerId('');
        setFetchedOwnerInfo(null);
        setOwnerFetchStatus('not_found');
      }
    } catch (err) {
      console.error('Error auto-fetching owner details for flat:', err);
      if (!localMatchedOwner) setOwnerFetchStatus('error');
    } finally {
      setIsFetchingOwner(false);
    }
  };

  const handleOwnerChange = (oId) => {
    setSelectedOwnerId(oId);
    const matched = owners.find((o) => o._id === oId);
    setFetchedOwnerInfo(matched || null);
    if (matched) setOwnerFetchStatus('manual_selected');
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();

    let ownerIdToUse = selectedOwnerId;
    let tenantIdToUse = selectedTenantId;

    // 1. Auto-create Owner if quick-add was used
    if (isAddingNewOwner) {
      if (!newOwnerName.trim() || !newOwnerPhone.trim()) {
        alert('Please enter both Flat Owner Name and Mobile Number');
        return;
      }
      try {
        const createOwnerRes = await customerService.createCustomer({
          name: newOwnerName.trim(),
          mobileNo: newOwnerPhone.trim(),
          customerType: 'owner',
          ownerDetails: {
            propertyIds: selectedFlatId ? [selectedFlatId] : [],
            ownershipType: 'individual',
            ownershipPercentage: 100
          }
        });
        if (createOwnerRes.data?._id) {
          ownerIdToUse = createOwnerRes.data._id;
          setSelectedOwnerId(ownerIdToUse);
          setOwners((prev) => [createOwnerRes.data, ...prev]);
        }
      } catch (err) {
        console.error('Error creating new owner:', err);
        alert(err.message || 'Failed to auto-register new owner');
        return;
      }
    }

    // 2. Auto-create Tenant if quick-add was used
    if (isAddingNewTenant) {
      if (!newTenantName.trim() || !newTenantPhone.trim()) {
        alert('Please enter both Tenant Name and Mobile Number');
        return;
      }
      try {
        const createRes = await customerService.createCustomer({
          name: newTenantName.trim(),
          mobileNo: newTenantPhone.trim(),
          customerType: 'tenant',
          tenantDetails: {
            tenantType: 'individual',
            rentalDetails: {
              monthlyRent: Number(tenantAgreementForm.monthlyRent) || 0,
              securityDeposit: Number(tenantDepositReq) || 0,
              rentDueDay: Number(tenantAgreementForm.rentDueDay) || 5,
              rentStatus: 'active'
            }
          }
        });
        if (createRes.data?._id) {
          tenantIdToUse = createRes.data._id;
          setSelectedTenantId(tenantIdToUse);
          setTenants((prev) => [createRes.data, ...prev]);
        }
      } catch (err) {
        console.error('Error creating new tenant:', err);
        alert(err.message || 'Failed to auto-register new tenant');
        return;
      }
    }

    if (!tenantIdToUse) {
      alert('Please select or enter a Tenant (Client or Corporate)');
      return;
    }

    let payload;

    if (leaseMode === 'multi') {
      if (selectedUnits.length === 0) {
        alert('Please add at least one Flat unit to the multi-flat lease bundle');
        return;
      }

      const primaryFlatId = selectedUnits[0].flatId;
      const primaryOwnerId = selectedUnits[0].ownerId || ownerIdToUse || (owners.length > 0 ? owners[0]._id : null);
      const primaryProjectId = selectedUnits[0].projectId || selectedProjectId || (projects.length > 0 ? projects[0]._id : null);
      const primaryBuildingId = selectedUnits[0].buildingId || selectedBuildingId;

      payload = {
        projectId: primaryProjectId,
        buildingId: primaryBuildingId,
        flatId: primaryFlatId,
        flatIds: selectedUnits.map((u) => u.flatId),
        leasedUnits: selectedUnits.map((u) => ({
          flatId: u.flatId,
          ownerId: u.ownerId || primaryOwnerId,
          flatNumber: u.flatNumber,
          monthlyRentBack: Number(u.monthlyRentBack) || 0,
          monthlyTenantRent: Number(u.monthlyTenantRent) || 0,
          depositAmount: Number(u.securityDeposit) || 0
        })),
        isMultiUnit: selectedUnits.length > 1,
        totalUnitsCount: selectedUnits.length,
        ownerId: primaryOwnerId,
        tenantId: tenantIdToUse,
        rentBack: {
          enabled: rentBackEnabled,
          ...rentBackForm,
          monthlyRent: Number(rentBackForm.monthlyRent),
          securityDeposit: Number(rentBackForm.securityDeposit),
          rentDueDay: Number(rentBackForm.rentDueDay)
        },
        tenantAgreement: {
          ...tenantAgreementForm,
          monthlyRent: Number(tenantAgreementForm.monthlyRent),
          rentDueDay: Number(tenantAgreementForm.rentDueDay)
        },
        allocation: {
          status: allocationStatus,
          allocationDate: new Date(),
          moveInDate: new Date(tenantAgreementForm.startDate)
        },
        securityDeposit: {
          tenantDeposit: {
            requiredAmount: Number(tenantDepositReq),
            paidAmount: Number(tenantDepositPaid)
          },
          ownerDeposit: {
            requiredAmount: Number(ownerDepositReq),
            paidAmount: Number(ownerDepositPaid)
          }
        },
        remarks
      };
    } else {
      if (!selectedFlatId || !ownerIdToUse) {
        alert('Please select a Flat and Flat Owner');
        return;
      }

      const matchedFlat = flats.find((f) => f._id === selectedFlatId);
      const resolvedProjectId = selectedProjectId || matchedFlat?.projectId?._id || matchedFlat?.projectId;
      const resolvedBuildingId = selectedBuildingId || matchedFlat?.buildingId;

      payload = {
        projectId: resolvedProjectId,
        buildingId: resolvedBuildingId,
        flatId: selectedFlatId,
        flatIds: [selectedFlatId],
        leasedUnits: [
          {
            flatId: selectedFlatId,
            ownerId: ownerIdToUse,
            flatNumber: matchedFlat?.flatNumber || 'Unit',
            monthlyRentBack: Number(rentBackForm.monthlyRent) || 0,
            monthlyTenantRent: Number(tenantAgreementForm.monthlyRent) || 0,
            depositAmount: Number(ownerDepositReq) || 0
          }
        ],
        isMultiUnit: false,
        totalUnitsCount: 1,
        ownerId: ownerIdToUse,
        tenantId: tenantIdToUse,
        rentBack: {
          enabled: rentBackEnabled,
          ...rentBackForm,
          monthlyRent: Number(rentBackForm.monthlyRent),
          securityDeposit: Number(rentBackForm.securityDeposit),
          rentDueDay: Number(rentBackForm.rentDueDay)
        },
        tenantAgreement: {
          ...tenantAgreementForm,
          monthlyRent: Number(tenantAgreementForm.monthlyRent),
          rentDueDay: Number(tenantAgreementForm.rentDueDay)
        },
        allocation: {
          status: allocationStatus,
          allocationDate: new Date(),
          moveInDate: new Date(tenantAgreementForm.startDate)
        },
        securityDeposit: {
          tenantDeposit: {
            requiredAmount: Number(tenantDepositReq),
            paidAmount: Number(tenantDepositPaid)
          },
          ownerDeposit: {
            requiredAmount: Number(ownerDepositReq),
            paidAmount: Number(ownerDepositPaid)
          }
        },
        remarks
      };
    }

    onSubmit(payload);
  };

  const monthlySpreadProfit =
    (Number(tenantAgreementForm.monthlyRent) || 0) -
    (rentBackEnabled ? Number(rentBackForm.monthlyRent) || 0 : 0);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={contract ? 'Edit Rental Contract & Agreement' : 'New Rental Allocation & Multi-Flat Agreement'}
      maxWidth="880px"
    >
      <form onSubmit={handleFormSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Mode Switcher: Single vs Multi-Flat Lease */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: '#f1f3f4',
          padding: '4px',
          borderRadius: '8px',
          flexWrap: 'wrap',
          gap: '8px'
        }}>
          <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#111827', paddingLeft: '8px' }}>
            LEASE ALLOCATION MODE:
          </div>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              type="button"
              onClick={() => setLeaseMode('single')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: leaseMode === 'single' ? '#1a73e8' : 'transparent',
                color: leaseMode === 'single' ? '#ffffff' : '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Home size={14} /> Single Unit Lease (1 Flat)
            </button>
            <button
              type="button"
              onClick={() => setLeaseMode('multi')}
              style={{
                padding: '6px 14px',
                borderRadius: '6px',
                border: 'none',
                fontSize: '0.78rem',
                fontWeight: '700',
                cursor: 'pointer',
                background: leaseMode === 'multi' ? '#8b5cf6' : 'transparent',
                color: leaseMode === 'multi' ? '#ffffff' : '#374151',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'all 0.15s ease'
              }}
            >
              <Building2 size={14} /> Multi-Flat / Corporate Bundle Lease
            </button>
          </div>
        </div>

        {/* Step 1: Flat & Owner Selection */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px', margin: 0 }}>
              {leaseMode === 'multi' ? <Building2 size={16} color="#8b5cf6" /> : <Home size={16} color="var(--primary-500)" />}
              1. {leaseMode === 'multi' ? 'Multi-Flat Units Selection & Title Owners' : 'Select Property Unit, Flat Owner & Tenant'}
            </h4>
            {leaseMode === 'multi' && (
              <span style={{ fontSize: '0.72rem', background: '#f3e8ff', color: '#8b5cf6', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                {selectedUnits.length} Flats in Lease Bundle
              </span>
            )}
          </div>

          {/* ================= MULTI-FLAT BUNDLE PICKER ================= */}
          {leaseMode === 'multi' ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Unit Adder Toolbar */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr auto',
                gap: '10px',
                alignItems: 'flex-end',
                background: '#f8f9fa',
                padding: '10px 12px',
                borderRadius: '6px',
                border: '1px solid #dadce0'
              }}>
                <div>
                  <label style={{ fontSize: '0.74rem', color: '#374151', display: 'block', marginBottom: '3px', fontWeight: '600' }}>
                    Select Flat to Add to Corporate Lease Bundle:
                  </label>
                  <select
                    value={unitToAddFlatId}
                    onChange={(e) => setUnitToAddFlatId(e.target.value)}
                    style={{ width: '100%', fontSize: '0.82rem' }}
                  >
                    <option value="">-- Choose Flat to Add --</option>
                    {flats
                      .filter((f) => !selectedUnits.some((u) => u.flatId === f._id))
                      .map((f) => {
                        const flr = f.floor !== undefined && f.floor !== null ? f.floor : 1;
                        const bld = f.buildingName || 'Tower';
                        return (
                          <option key={f._id} value={f._id}>
                            Flat {f.flatNumber} • Floor {flr} • {bld} [{f.projectId?.projectName || 'Project'}] - {f.bhkType || '2BHK'} ({f.status})
                          </option>
                        );
                      })}
                  </select>
                </div>

                <button
                  type="button"
                  disabled={!unitToAddFlatId || isAddingUnit}
                  onClick={() => handleAddUnitToBundle(unitToAddFlatId)}
                  style={{
                    padding: '8px 16px',
                    background: '#8b5cf6',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '0.8rem',
                    fontWeight: '700',
                    cursor: unitToAddFlatId ? 'pointer' : 'not-allowed',
                    opacity: unitToAddFlatId ? 1 : 0.6,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    whiteSpace: 'nowrap'
                  }}
                >
                  {isAddingUnit ? <Loader2 size={14} className="animate-spin" /> : <PlusCircle size={14} />}
                  + Add Flat to Lease
                </button>
              </div>

              {/* Selected Units Table */}
              {selectedUnits.length === 0 ? (
                <div style={{
                  padding: '24px 16px',
                  textAlign: 'center',
                  background: '#ffffff',
                  border: '1px dashed #dadce0',
                  borderRadius: '6px',
                  color: '#6b7280'
                }}>
                  <Building2 size={28} color="#9ca3af" style={{ margin: '0 auto 6px' }} />
                  <div style={{ fontWeight: '700', color: '#111827', fontSize: '0.85rem' }}>No flats added to bundle yet</div>
                  <div style={{ fontSize: '0.74rem' }}>Select flats above to lease multiple units together to a corporate client or tenant.</div>
                </div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '6px' }}>
                  <table style={{ margin: 0, fontSize: '0.78rem' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb' }}>
                        <th>Flat Unit</th>
                        <th>Auto-Detected Owner</th>
                        <th style={{ width: '130px' }}>Rent-Back Payout (₹)</th>
                        <th style={{ width: '130px' }}>Tenant Rent (₹)</th>
                        <th style={{ width: '50px', textAlign: 'center' }}>Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedUnits.map((unit) => (
                        <tr key={unit.flatId}>
                          <td>
                            <strong style={{ color: '#111827' }}>Flat {unit.flatNumber}</strong>
                            <div style={{ fontSize: '0.7rem', color: '#6b7280' }}>{unit.projectName}</div>
                          </td>
                          <td>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                              <ShieldCheck size={14} color="#16a34a" />
                              <strong style={{ color: '#166534' }}>{unit.ownerName}</strong>
                            </div>
                            {unit.ownerPhone && (
                              <div style={{ fontSize: '0.7rem', color: '#4b5563' }}>Ph: {unit.ownerPhone}</div>
                            )}
                          </td>
                          <td>
                            <input
                              type="number"
                              value={unit.monthlyRentBack}
                              onChange={(e) => handleUpdateUnitRent(unit.flatId, 'monthlyRentBack', e.target.value)}
                              style={{ width: '100%', padding: '4px 8px', fontSize: '0.78rem' }}
                            />
                          </td>
                          <td>
                            <input
                              type="number"
                              value={unit.monthlyTenantRent}
                              onChange={(e) => handleUpdateUnitRent(unit.flatId, 'monthlyTenantRent', e.target.value)}
                              style={{ width: '100%', padding: '4px 8px', fontSize: '0.78rem' }}
                            />
                          </td>
                          <td style={{ textAlign: 'center' }}>
                            <button
                              type="button"
                              onClick={() => handleRemoveUnitFromBundle(unit.flatId)}
                              title="Remove Flat from Bundle"
                              style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ba1a1a',
                                cursor: 'pointer',
                                padding: '4px'
                              }}
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Multi-Unit Lease Aggregate Bar */}
              {selectedUnits.length > 0 && (
                <div style={{
                  background: '#f3e8ff',
                  border: '1px solid #e9d5ff',
                  borderRadius: '6px',
                  padding: '10px 14px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '12px'
                }}>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#6b21a8', fontWeight: '700' }}>TOTAL UNITS IN BUNDLE</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#581c87' }}>
                      {selectedUnits.length} Flats
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#6b21a8', fontWeight: '700' }}>COMBINED RENT-BACK PAYOUT</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#b06000' }}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rentBackForm.monthlyRent)} / mo
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#6b21a8', fontWeight: '700' }}>COMBINED TENANT LEASE</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#137333' }}>
                      {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tenantAgreementForm.monthlyRent)} / mo
                    </div>
                  </div>
                  <div>
                    <span style={{ fontSize: '0.7rem', color: '#6b21a8', fontWeight: '700' }}>NET COMPANY SPREAD</span>
                    <div style={{ fontSize: '1.1rem', fontWeight: '800', color: monthlySpreadProfit >= 0 ? '#137333' : '#ba1a1a' }}>
                      +{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(monthlySpreadProfit)} / mo
                    </div>
                  </div>
                </div>
              )}

              {/* Tenant Selection */}
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px', fontWeight: '700' }}>
                  Tenant (Corporate Client / Lease Holder) *
                </label>
                <select
                  required
                  value={selectedTenantId}
                  onChange={(e) => setSelectedTenantId(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="">-- Choose Corporate / Individual Tenant --</option>
                  {tenants.map((t) => (
                    <option key={t._id} value={t._id}>
                      {t.tenantDetails?.tenantType === 'company' ? '[Corporate Company] ' : '[Individual] '}{t.name} ({t.mobileNo})
                    </option>
                  ))}
                </select>
              </div>
            </div>
          ) : (
            /* ================= SINGLE FLAT PICKER ================= */
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
                {/* Flat Picker */}
                <div>
                  <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                    Select Flat Unit *
                  </label>
                  <select
                    required
                    value={selectedFlatId}
                    onChange={(e) => handleFlatSelect(e.target.value)}
                    style={{ width: '100%' }}
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

                {/* Owner Picker with Quick-Add Support */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block' }}>
                      Flat Owner (Title Holder) *
                    </label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      {isFetchingOwner && (
                        <span style={{ fontSize: '0.7rem', color: '#1a73e8', display: 'flex', alignItems: 'center', gap: '3px', fontWeight: '700' }}>
                          <Loader2 size={12} className="animate-spin" /> Auto-fetching...
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={() => setIsAddingNewOwner(!isAddingNewOwner)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          color: '#1a73e8',
                          fontSize: '0.72rem',
                          fontWeight: '700',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px'
                        }}
                      >
                        {isAddingNewOwner ? '← Select Existing' : '+ Enter New Owner'}
                      </button>
                    </div>
                  </div>

                  {!isAddingNewOwner ? (
                    <select
                      required={!isAddingNewOwner}
                      value={selectedOwnerId}
                      onChange={(e) => handleOwnerChange(e.target.value)}
                      style={{
                        width: '100%',
                        borderColor: (ownerFetchStatus === 'found_api' || ownerFetchStatus === 'found_local' || ownerFetchStatus === 'found_sales') ? '#10b981' : undefined
                      }}
                    >
                      <option value="">-- Choose Owner --</option>
                      {owners.map((o) => (
                        <option key={o._id} value={o._id}>
                          {o.name} ({o.mobileNo})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Owner Name (e.g. Rajesh Gupta)"
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #1a73e8' }}
                      />
                      <input
                        type="text"
                        placeholder="Mobile (e.g. 9876543210)"
                        value={newOwnerPhone}
                        onChange={(e) => setNewOwnerPhone(e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #1a73e8' }}
                      />
                    </div>
                  )}
                </div>

                {/* Tenant Picker with Quick-Add Support */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                    <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block' }}>
                      Tenant (Client / Corporate) *
                    </label>
                    <button
                      type="button"
                      onClick={() => setIsAddingNewTenant(!isAddingNewTenant)}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: '#1a73e8',
                        fontSize: '0.72rem',
                        fontWeight: '700',
                        cursor: 'pointer',
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}
                    >
                      {isAddingNewTenant ? '← Select Existing' : '+ Enter New Tenant'}
                    </button>
                  </div>

                  {!isAddingNewTenant ? (
                    <select
                      required={!isAddingNewTenant}
                      value={selectedTenantId}
                      onChange={(e) => setSelectedTenantId(e.target.value)}
                      style={{ width: '100%' }}
                    >
                      <option value="">-- Choose Tenant --</option>
                      {tenants.map((t) => (
                        <option key={t._id} value={t._id}>
                          {t.tenantDetails?.tenantType === 'company' ? '[Corporate] ' : '[Individual] '}{t.name} ({t.mobileNo})
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '6px' }}>
                      <input
                        type="text"
                        placeholder="Tenant Name (e.g. Kavita Sharma)"
                        value={newTenantName}
                        onChange={(e) => setNewTenantName(e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #1a73e8' }}
                      />
                      <input
                        type="text"
                        placeholder="Mobile (e.g. 9876543299)"
                        value={newTenantPhone}
                        onChange={(e) => setNewTenantPhone(e.target.value)}
                        style={{ padding: '6px 8px', fontSize: '0.8rem', borderRadius: '4px', border: '1px solid #1a73e8' }}
                      />
                    </div>
                  )}
                </div>
              </div>

              {/* Auto-Fetched Owner Card / Alerts */}
              {selectedFlatId && (
                <div>
                  {fetchedOwnerInfo ? (
                    <div style={{
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      padding: '10px 14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                      flexWrap: 'wrap'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{ background: '#dcfce7', padding: '7px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <ShieldCheck size={18} color="#16a34a" />
                        </div>
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <strong style={{ fontSize: '0.85rem', color: '#166534' }}>{fetchedOwnerInfo.name}</strong>
                            <span style={{ fontSize: '0.68rem', background: '#dcfce7', color: '#15803d', padding: '1px 6px', borderRadius: '4px', fontWeight: '700' }}>
                              {ownerFetchStatus === 'found_sales' ? 'Auto-Linked from Sales' : (ownerFetchStatus === 'manual_selected' ? 'Selected Owner' : 'Verified Flat Owner')}
                            </span>
                          </div>
                          <div style={{ fontSize: '0.74rem', color: '#15803d', display: 'flex', alignItems: 'center', gap: '12px', marginTop: '2px', flexWrap: 'wrap' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <Phone size={12} /> {fetchedOwnerInfo.mobileNo}
                            </span>
                            {fetchedOwnerInfo.email && (
                              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                <Mail size={12} /> {fetchedOwnerInfo.email}
                              </span>
                            )}
                            {fetchedOwnerInfo.ownerDetails?.ownershipPercentage && (
                              <span>Share: {fetchedOwnerInfo.ownerDetails.ownershipPercentage}%</span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700', textAlign: 'right' }}>
                        ✓ Auto-Fetched & Bound
                      </div>
                    </div>
                  ) : ownerFetchStatus === 'not_found' && !isFetchingOwner ? (
                    <div style={{
                      background: '#fefce8',
                      border: '1px solid #fef08a',
                      borderRadius: '6px',
                      padding: '8px 12px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      fontSize: '0.74rem',
                      color: '#854d0e'
                    }}>
                      <AlertCircle size={15} color="#ca8a04" />
                      <span>No registered owner found for this flat. Please choose an owner from the dropdown or register a new one in Customer Management.</span>
                    </div>
                  ) : null}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Step 2: Rent-Back Toggle & Terms (Company takes from Owner) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderColor: rentBackEnabled ? 'rgba(168, 85, 247, 0.4)' : 'var(--border-subtle)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Repeat size={16} color="#c084fc" />
              <div>
                <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#c084fc', margin: 0 }}>
                  2. Rent-Back Agreement (Taking flat{leaseMode === 'multi' ? 's' : ''} from Owner{leaseMode === 'multi' ? 's' : ''})
                </h4>
                <p style={{ fontSize: '0.72rem', color: '#4b5563', margin: 0 }}>
                  Company guarantees monthly rent payout to flat title holder{leaseMode === 'multi' ? 's' : ''}
                </p>
              </div>
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', fontWeight: '700', color: '#111827', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rentBackEnabled}
                onChange={(e) => setRentBackEnabled(e.target.checked)}
              />
              Enable Rent-Back
            </label>
          </div>

          {rentBackEnabled && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '6px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    Rent-Back Agreement #
                  </label>
                  <input
                    type="text"
                    value={rentBackForm.agreementNumber}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, agreementNumber: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    Total Monthly Payout to Owners (₹) *
                  </label>
                  <input
                    type="number"
                    value={rentBackForm.monthlyRent}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, monthlyRent: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    Total Deposit to Owners (₹)
                  </label>
                  <input
                    type="number"
                    value={ownerDepositReq}
                    onChange={(e) => {
                      setOwnerDepositReq(e.target.value);
                      setOwnerDepositPaid(e.target.value);
                    }}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    Payout Due Day
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={rentBackForm.rentDueDay}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, rentDueDay: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    Rent-Back Start Date
                  </label>
                  <input
                    type="date"
                    value={rentBackForm.startDate}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, startDate: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>

                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                    Rent-Back End Date
                  </label>
                  <input
                    type="date"
                    value={rentBackForm.endDate}
                    onChange={(e) => setRentBackForm({ ...rentBackForm, endDate: e.target.value })}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Tenant Lease Agreement (Company to Tenant) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderColor: 'rgba(59, 130, 246, 0.4)' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#60a5fa', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <FileText size={15} /> 3. Tenant Lease Agreement & Rent Terms
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Tenant Agreement # *
              </label>
              <input
                type="text"
                required
                value={tenantAgreementForm.agreementNumber}
                onChange={(e) => setTenantAgreementForm({ ...tenantAgreementForm, agreementNumber: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Monthly Rent from Tenant (₹) *
              </label>
              <input
                type="number"
                required
                value={tenantAgreementForm.monthlyRent}
                onChange={(e) => setTenantAgreementForm({ ...tenantAgreementForm, monthlyRent: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Tenant Security Deposit (₹)
              </label>
              <input
                type="number"
                value={tenantDepositReq}
                onChange={(e) => {
                  setTenantDepositReq(e.target.value);
                  setTenantDepositPaid(e.target.value);
                }}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Rent Collection Day
              </label>
              <input
                type="number"
                min="1"
                max="31"
                value={tenantAgreementForm.rentDueDay}
                onChange={(e) => setTenantAgreementForm({ ...tenantAgreementForm, rentDueDay: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Tenant Lease Start Date
              </label>
              <input
                type="date"
                value={tenantAgreementForm.startDate}
                onChange={(e) => setTenantAgreementForm({ ...tenantAgreementForm, startDate: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                Tenant Lease End Date
              </label>
              <input
                type="date"
                value={tenantAgreementForm.endDate}
                onChange={(e) => setTenantAgreementForm({ ...tenantAgreementForm, endDate: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>
          </div>
        </div>

        {/* Step 4: Margin / Profit Real-Time Summary */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dadce0',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <span style={{ fontSize: '0.72rem', color: '#4b5563', fontWeight: '700' }}>MONTHLY NET COMPANY YIELD</span>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: monthlySpreadProfit >= 0 ? '#10b981' : '#ef4444' }}>
              +{new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(monthlySpreadProfit)} / mo
            </div>
            <span style={{ fontSize: '0.7rem', color: '#4b5563' }}>
              Inflow: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(tenantAgreementForm.monthlyRent)} • Outflow: {rentBackEnabled ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(rentBackForm.monthlyRent) : '₹0'}
            </span>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 16px',
                background: '#ffffff',
                border: '1px solid #dadce0',
                borderRadius: '6px',
                color: '#374151',
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
                padding: '8px 20px',
                background: '#1a73e8',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.82rem',
                cursor: 'pointer'
              }}
            >
              {contract ? 'Save Contract Changes' : 'Initialize Rental Contract'}
            </button>
          </div>
        </div>

      </form>
    </Modal>
  );
};
