import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import { arePhoneNumbersSame } from '../../utils/phoneValidator.js';
import { 
  sanitizeAlphabetsOnly, 
  sanitizeDigitsOnly, 
  sanitizePhone, 
  sanitizePincode, 
  sanitizeGovtId, 
  sanitizeGst, 
  sanitizeEmail, 
  isValidEmail 
} from '../../utils/inputValidators.js';
import { 
  User, 
  Phone, 
  Mail, 
  Home, 
  Building2, 
  Briefcase, 
  Key, 
  Calendar, 
  MapPin, 
  DollarSign, 
  ShieldCheck, 
  FileText
} from 'lucide-react';

export const ManualCustomerModal = ({ isOpen, onClose, onSubmit, customer = null }) => {
  const [customerType, setCustomerType] = useState('owner'); // 'owner' | 'tenant'
  const [tenantType, setTenantType] = useState('individual'); // 'individual' | 'company'

  // Basic Info
  const [name, setName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [alternateMobileNo, setAlternateMobileNo] = useState('');
  const [email, setEmail] = useState('');

  // Address
  const [address, setAddress] = useState({
    addressLine1: '',
    addressLine2: '',
    locality: '',
    city: '',
    state: '',
    pincode: '',
    country: 'India'
  });

  // Owner Details
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [ownershipType, setOwnershipType] = useState('individual');
  const [ownershipPercentage, setOwnershipPercentage] = useState(100);

  // Individual Tenant Details
  const [fatherName, setFatherName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [governmentIdType, setGovernmentIdType] = useState('aadhaar');
  const [governmentIdNumber, setGovernmentIdNumber] = useState('');

  // Company Tenant Details
  const [companyName, setCompanyName] = useState('');
  const [registrationNumber, setRegistrationNumber] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [registeredAddress, setRegisteredAddress] = useState('');
  const [contactPerson, setContactPerson] = useState({
    name: '',
    mobileNo: '',
    email: '',
    designation: 'Managing Director'
  });

  // Rental Details
  const [rentalFlatId, setRentalFlatId] = useState('');
  const [leaseStartDate, setLeaseStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [leaseEndDate, setLeaseEndDate] = useState(new Date(Date.now() + 365 * 86400000).toISOString().slice(0, 10));
  const [monthlyRent, setMonthlyRent] = useState('');
  const [securityDeposit, setSecurityDeposit] = useState('');
  const [rentDueDay, setRentDueDay] = useState(5);
  const [rentStatus, setRentStatus] = useState('active');

  // Inventory Data for Selection
  const [allFlats, setAllFlats] = useState([]);

  useEffect(() => {
    if (isOpen) {
      projectService.getFlats().then((res) => {
        if (res.data) setAllFlats(res.data);
      });

      if (customer) {
        setCustomerType(customer.customerType || 'owner');
        setName(customer.name || '');
        setMobileNo(customer.mobileNo || '');
        setAlternateMobileNo(customer.alternateMobileNo || '');
        setEmail(customer.email || '');
        setAddress(customer.address || {});

        if (customer.customerType === 'owner' && customer.ownerDetails) {
          setSelectedPropertyIds((customer.ownerDetails.propertyIds || []).map((p) => p._id || p));
          setOwnershipType(customer.ownerDetails.ownershipType || 'individual');
          setOwnershipPercentage(customer.ownerDetails.ownershipPercentage || 100);
        }

        if (customer.customerType === 'tenant' && customer.tenantDetails) {
          const td = customer.tenantDetails;
          setTenantType(td.tenantType || 'individual');
          if (td.individual) {
            setFatherName(td.individual.fatherName || '');
            setDateOfBirth(td.individual.dateOfBirth ? new Date(td.individual.dateOfBirth).toISOString().slice(0, 10) : '');
            setGovernmentIdType(td.individual.governmentIdType || 'aadhaar');
            setGovernmentIdNumber(td.individual.governmentIdNumber || '');
          }
          if (td.company) {
            setCompanyName(td.company.companyName || '');
            setRegistrationNumber(td.company.registrationNumber || '');
            setGstNumber(td.company.gstNumber || '');
            setPanNumber(td.company.panNumber || '');
            setRegisteredAddress(td.company.registeredAddress || '');
            setContactPerson(td.company.contactPerson || { name: '', mobileNo: '', email: '', designation: '' });
          }
          if (td.rentalDetails) {
            setRentalFlatId(td.rentalDetails.flatId?._id || td.rentalDetails.flatId || '');
            setLeaseStartDate(td.rentalDetails.leaseStartDate ? new Date(td.rentalDetails.leaseStartDate).toISOString().slice(0, 10) : '');
            setLeaseEndDate(td.rentalDetails.leaseEndDate ? new Date(td.rentalDetails.leaseEndDate).toISOString().slice(0, 10) : '');
            setMonthlyRent(td.rentalDetails.monthlyRent || 0);
            setSecurityDeposit(td.rentalDetails.securityDeposit || 0);
            setRentDueDay(td.rentalDetails.rentDueDay || 5);
            setRentStatus(td.rentalDetails.rentStatus || 'active');
          }
        }
      } else {
        // Reset Defaults
        setCustomerType('owner');
        setTenantType('individual');
        setName('');
        setMobileNo('');
        setAlternateMobileNo('');
        setEmail('');
        setAddress({ addressLine1: '', addressLine2: '', locality: '', city: '', state: '', pincode: '', country: 'India' });
        setSelectedPropertyIds([]);
        setOwnershipType('individual');
        setOwnershipPercentage(100);
        setFatherName('');
        setDateOfBirth('');
        setGovernmentIdType('aadhaar');
        setGovernmentIdNumber('');
        setCompanyName('');
        setRegistrationNumber('');
        setGstNumber('');
        setPanNumber('');
        setRegisteredAddress('');
        setContactPerson({ name: '', mobileNo: '', email: '', designation: 'Director' });
        setRentalFlatId('');
        setMonthlyRent('');
        setSecurityDeposit('');
        setRentDueDay(5);
        setRentStatus('active');
      }
    }
  }, [isOpen, customer]);

  const handleFlatSelectionForRental = (fId) => {
    setRentalFlatId(fId);
    if (fId && allFlats.length > 0) {
      const selected = allFlats.find(f => f._id === fId);
      if (selected?.rentalDetails?.expectedRent) {
        setMonthlyRent(String(selected.rentalDetails.expectedRent));
        setSecurityDeposit(String(selected.rentalDetails.securityDeposit || (selected.rentalDetails.expectedRent * 2)));
      }
    }
  };

  const isDuplicatePhone = arePhoneNumbersSame(mobileNo, alternateMobileNo);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (arePhoneNumbersSame(mobileNo, alternateMobileNo)) {
      alert('Primary mobile number and alternate mobile number cannot be the same. Please provide a different alternate number or leave it blank.');
      return;
    }

    if (!name.trim()) {
      alert('Please enter a valid customer full name.');
      return;
    }

    if (!mobileNo.trim() || mobileNo.replace(/\D/g, '').length < 10) {
      alert('Primary mobile number must contain at least 10 numeric digits.');
      return;
    }

    if (alternateMobileNo && alternateMobileNo.replace(/\D/g, '').length < 10) {
      alert('Alternate mobile number must contain at least 10 numeric digits if provided.');
      return;
    }

    if (email && !isValidEmail(email)) {
      alert('Please enter a valid email address (e.g. name@domain.com).');
      return;
    }

    if (address.pincode && address.pincode.length !== 6) {
      alert('Pincode must be exactly 6 numeric digits.');
      return;
    }

    if (customerType === 'tenant' && tenantType === 'individual' && governmentIdNumber) {
      if (governmentIdType === 'aadhaar' && governmentIdNumber.length !== 12) {
        alert('Aadhaar Card number must be exactly 12 numeric digits (no alphabets).');
        return;
      }
      if (governmentIdType === 'pan' && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(governmentIdNumber)) {
        alert('PAN number must follow format ABCDE1234F (5 uppercase letters, 4 numbers, 1 letter).');
        return;
      }
    }

    const payload = {
      customerType,
      name,
      mobileNo,
      alternateMobileNo,
      email,
      address,
      status: 'active'
    };

    if (customerType === 'owner') {
      payload.ownerDetails = {
        propertyIds: selectedPropertyIds,
        ownershipType,
        ownershipPercentage: Number(ownershipPercentage)
      };
    } else {
      payload.tenantDetails = {
        tenantType,
        individual: tenantType === 'individual' ? {
          fatherName,
          dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : null,
          governmentIdType,
          governmentIdNumber
        } : undefined,
        company: tenantType === 'company' ? {
          companyName,
          registrationNumber,
          gstNumber,
          panNumber,
          registeredAddress,
          contactPerson
        } : undefined,
        rentalDetails: {
          flatId: rentalFlatId || null,
          leaseStartDate: leaseStartDate ? new Date(leaseStartDate) : null,
          leaseEndDate: leaseEndDate ? new Date(leaseEndDate) : null,
          monthlyRent: Number(monthlyRent),
          securityDeposit: Number(securityDeposit),
          rentDueDay: Number(rentDueDay),
          rentStatus
        }
      };
    }

    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? `Edit Customer: ${customer.name}` : 'Register New Customer (Owner / Tenant)'}
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Customer Type Selector Tabs */}
        {!customer && (
          <div style={{
            display: 'grid',
            gridTemplateColumns: '1fr 1fr',
            gap: '10px',
            background: '#f8f9fa',
            padding: '6px',
            borderRadius: 'var(--radius-sm)',
            border: '1px solid #dadce0'
          }}>
            <button
              type="button"
              onClick={() => setCustomerType('owner')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '4px',
                background: customerType === 'owner' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'transparent',
                color: customerType === 'owner' ? '#fff' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Key size={16} /> 1. Flat Owner / Allottee
            </button>

            <button
              type="button"
              onClick={() => setCustomerType('tenant')}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '10px',
                borderRadius: '4px',
                background: customerType === 'tenant' ? 'linear-gradient(135deg, #3b82f6, #1d4ed8)' : 'transparent',
                color: customerType === 'tenant' ? '#fff' : 'var(--text-secondary)',
                fontWeight: '700',
                fontSize: '0.85rem',
                border: 'none',
                cursor: 'pointer'
              }}
            >
              <Home size={16} /> 2. Tenant (Rental Holding)
            </button>
          </div>
        )}

        {/* Basic Personal / Contact Details */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={15} color="var(--primary-500)" /> Basic Contact & Personal Information
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Full Name / Legal Entity Name * (Alphabets only)
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Ramesh Chandra Sharma"
                value={name}
                onChange={(e) => setName(sanitizeAlphabetsOnly(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Primary Mobile Number * (Numbers only)
              </label>
              <input
                type="tel"
                required
                placeholder="e.g. +91 98290 12345"
                value={mobileNo}
                onChange={(e) => setMobileNo(sanitizePhone(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ fontSize: '0.75rem', color: isDuplicatePhone ? '#dc2626' : '#374151', display: 'block', marginBottom: '3px', fontWeight: isDuplicatePhone ? '700' : 'normal' }}>
                Alternate Mobile No (Numbers only)
              </label>
              <input
                type="tel"
                placeholder="e.g. +91 94140 54321"
                value={alternateMobileNo}
                onChange={(e) => setAlternateMobileNo(sanitizePhone(e.target.value))}
                style={{
                  width: '100%',
                  borderColor: isDuplicatePhone ? '#dc2626' : undefined,
                  backgroundColor: isDuplicatePhone ? '#fff5f5' : undefined
                }}
              />
              {isDuplicatePhone && (
                <span style={{ fontSize: '0.72rem', color: '#dc2626', fontWeight: '600', marginTop: '3px', display: 'block' }}>
                  ⚠️ Alternate mobile number cannot be the same as primary mobile number.
                </span>
              )}
            </div>

            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. customer@domain.com"
                value={email}
                onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
                style={{ width: '100%' }}
              />
            </div>
          </div>

          {/* Address Fields */}
          <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Address Line</label>
              <input
                type="text"
                placeholder="Flat / Street / Area"
                value={address.addressLine1}
                onChange={(e) => setAddress({ ...address, addressLine1: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>City (Alphabets only)</label>
              <input
                type="text"
                placeholder="City"
                value={address.city}
                onChange={(e) => setAddress({ ...address, city: sanitizeAlphabetsOnly(e.target.value) })}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Pincode (6 digits only)</label>
              <input
                type="text"
                maxLength={6}
                placeholder="e.g. 302001"
                value={address.pincode}
                onChange={(e) => setAddress({ ...address, pincode: sanitizePincode(e.target.value) })}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>
          </div>
        </div>

        {/* ================= OWNER SPECIFIC DETAILS ================= */}
        {customerType === 'owner' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', borderColor: 'rgba(168, 85, 247, 0.4)' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#c084fc', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Key size={15} /> Owner Property Holdings & Title Details
            </h4>

            {/* Owned Property Multi-Selector */}
            <div>
              <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '4px' }}>
                Allotted / Owned Flat Units *
              </label>
              <select
                multiple
                value={selectedPropertyIds}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, (option) => option.value);
                  setSelectedPropertyIds(selected);
                }}
                style={{ width: '100%', minHeight: '90px', padding: '6px', fontSize: '0.82rem' }}
              >
                {allFlats.map((f) => {
                  const flr = f.floor !== undefined && f.floor !== null ? f.floor : 1;
                  const bld = f.buildingName || 'Tower';
                  return (
                    <option key={f._id} value={f._id}>
                      Flat {f.flatNumber} • Floor {flr} • {bld} [{f.projectId?.projectName || 'Project'}] - {f.bhkType || '2BHK'} ({f.status})
                    </option>
                  );
                })}
              </select>
              <span style={{ fontSize: '0.72rem', color: '#414754', marginTop: '2px', display: 'block' }}>
                Tip: Hold Ctrl (Windows) / Cmd (Mac) to select multiple flats with floor mapping for this owner.
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Ownership Type
                </label>
                <select
                  value={ownershipType}
                  onChange={(e) => setOwnershipType(e.target.value)}
                  style={{ width: '100%' }}
                >
                  <option value="individual">Individual Ownership</option>
                  <option value="company">Corporate / Company</option>
                  <option value="joint">Joint Allotment</option>
                </select>
              </div>

              <div>
                <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '3px' }}>
                  Ownership Percentage (%)
                </label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={ownershipPercentage}
                  onChange={(e) => setOwnershipPercentage(e.target.value)}
                  style={{ width: '100%' }}
                />
              </div>
            </div>
          </div>
        )}

        {/* ================= TENANT SPECIFIC DETAILS ================= */}
        {customerType === 'tenant' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            {/* Tenant Category Toggle: Individual vs Company */}
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
              <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#111827' }}>Tenant Category:</span>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tenantTypeRadio"
                  checked={tenantType === 'individual'}
                  onChange={() => setTenantType('individual')}
                />
                Individual Tenant (Resident)
              </label>

              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <input
                  type="radio"
                  name="tenantTypeRadio"
                  checked={tenantType === 'company'}
                  onChange={() => setTenantType('company')}
                />
                Company / Corporate Tenant (Multi-Unit Lease)
              </label>
            </div>

            {/* Individual Tenant KYC */}
            {tenantType === 'individual' && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderColor: 'rgba(59, 130, 246, 0.4)' }}>
                <h5 style={{ fontSize: '0.82rem', fontWeight: '700', color: '#60a5fa' }}>Individual KYC & Identification</h5>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Father's / Spouse Name (Alphabets only)</label>
                    <input
                      type="text"
                      placeholder="e.g. Ramesh Chandra"
                      value={fatherName}
                      onChange={(e) => setFatherName(sanitizeAlphabetsOnly(e.target.value))}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Date of Birth</label>
                    <input
                      type="date"
                      value={dateOfBirth}
                      onChange={(e) => setDateOfBirth(e.target.value)}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Govt ID Type</label>
                    <select
                      value={governmentIdType}
                      onChange={(e) => {
                        const newType = e.target.value;
                        setGovernmentIdType(newType);
                        setGovernmentIdNumber(sanitizeGovtId(governmentIdNumber, newType));
                      }}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    >
                      <option value="aadhaar">Aadhaar Card (12 Digits Only)</option>
                      <option value="pan">PAN Card (10 Alphanumeric)</option>
                      <option value="passport">Passport</option>
                      <option value="driving_license">Driving License</option>
                      <option value="voter_id">Voter ID</option>
                    </select>
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>
                      Govt ID Number * {governmentIdType === 'aadhaar' ? '(12 Numbers Only)' : governmentIdType === 'pan' ? '(10 Chars: ABCDE1234F)' : ''}
                    </label>
                    <input
                      type="text"
                      placeholder={
                        governmentIdType === 'aadhaar' 
                          ? '12-digit Aadhaar Number (Numbers only)' 
                          : governmentIdType === 'pan' 
                          ? '10-character PAN (e.g. ABCDE1234F)' 
                          : 'Govt ID Number'
                      }
                      value={governmentIdNumber}
                      onChange={(e) => setGovernmentIdNumber(sanitizeGovtId(e.target.value, governmentIdType))}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Corporate / Company Tenant */}
            {tenantType === 'company' && (
              <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px', borderColor: 'rgba(245, 158, 11, 0.4)' }}>
                <h5 style={{ fontSize: '0.82rem', fontWeight: '700', color: '#f59e0b', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  <Building2 size={14} /> Corporate Tenant Details
                </h5>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Company Registered Name *</label>
                    <input
                      type="text"
                      placeholder="e.g. Infosys Technologies Ltd"
                      value={companyName}
                      onChange={(e) => setCompanyName(e.target.value)}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>GST Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 08AAACH7409R1ZZ"
                      value={gstNumber}
                      onChange={(e) => setGstNumber(sanitizeGst(e.target.value))}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Company PAN #</label>
                    <input
                      type="text"
                      placeholder="e.g. AAACH7409R"
                      value={panNumber}
                      onChange={(e) => setPanNumber(sanitizeGovtId(e.target.value, 'pan'))}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>CIN / Registration #</label>
                    <input
                      type="text"
                      placeholder="e.g. U72200KA1981PLC013115"
                      value={registrationNumber}
                      onChange={(e) => setRegistrationNumber(e.target.value)}
                      style={{ width: '100%', fontSize: '0.8rem' }}
                    />
                  </div>
                </div>

                {/* Contact Person */}
                <div style={{ background: '#f8f9fa', padding: '8px 10px', borderRadius: '4px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#4b5563' }}>Contact Person (Alphabets only)</label>
                    <input
                      type="text"
                      placeholder="Name"
                      value={contactPerson.name}
                      onChange={(e) => setContactPerson({ ...contactPerson, name: sanitizeAlphabetsOnly(e.target.value) })}
                      style={{ width: '100%', fontSize: '0.75rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#4b5563' }}>Phone (Numbers only)</label>
                    <input
                      type="tel"
                      placeholder="Phone"
                      value={contactPerson.mobileNo}
                      onChange={(e) => setContactPerson({ ...contactPerson, mobileNo: sanitizePhone(e.target.value) })}
                      style={{ width: '100%', fontSize: '0.75rem' }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.68rem', color: '#4b5563' }}>Designation (Alphabets only)</label>
                    <input
                      type="text"
                      placeholder="e.g. Admin Lead"
                      value={contactPerson.designation}
                      onChange={(e) => setContactPerson({ ...contactPerson, designation: sanitizeAlphabetsOnly(e.target.value) })}
                      style={{ width: '100%', fontSize: '0.75rem' }}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Rental Contract Terms */}
            <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h5 style={{ fontSize: '0.82rem', fontWeight: '700', color: '#10b981', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <DollarSign size={14} /> Tenancy & Rental Lease Terms
              </h5>

              <div>
                <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
                  Leased Flat / Unit *
                </label>
                <select
                  required
                  value={rentalFlatId}
                  onChange={(e) => handleFlatSelectionForRental(e.target.value)}
                  style={{ width: '100%', fontSize: '0.85rem' }}
                >
                  <option value="">-- Choose Rented Flat --</option>
                  {allFlats.map((f) => {
                    const flr = f.floor !== undefined && f.floor !== null ? f.floor : 1;
                    const bld = f.buildingName || 'Tower';
                    return (
                      <option key={f._id} value={f._id}>
                        Flat {f.flatNumber} • Floor {flr} • {bld} [{f.projectId?.projectName || 'Project'}] - {f.bhkType || '2BHK'} (Status: {f.status})
                      </option>
                    );
                  })}
                </select>

                {rentalFlatId && (() => {
                  const matchedFlat = allFlats.find((f) => f._id === rentalFlatId);
                  if (!matchedFlat) return null;
                  return (
                    <div style={{
                      marginTop: '6px',
                      padding: '6px 12px',
                      background: '#f0fdf4',
                      border: '1px solid #bbf7d0',
                      borderRadius: '6px',
                      fontSize: '0.76rem',
                      color: '#166534',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <span>🏢 <strong>Floor:</strong> Floor {matchedFlat.floor || 1}</span>
                      <span>•</span>
                      <span>🏛️ <strong>Tower:</strong> {matchedFlat.buildingName || 'Main Building'}</span>
                      <span>•</span>
                      <span>🏠 <strong>BHK:</strong> {matchedFlat.bhkType || '2BHK'}</span>
                    </div>
                  );
                })()}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Monthly Rent (₹, Numbers only)</label>
                  <input
                    type="text"
                    value={monthlyRent}
                    onChange={(e) => setMonthlyRent(sanitizeDigitsOnly(e.target.value))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Deposit (₹, Numbers only)</label>
                  <input
                    type="text"
                    value={securityDeposit}
                    onChange={(e) => setSecurityDeposit(sanitizeDigitsOnly(e.target.value))}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Rent Due Day (1-31)</label>
                  <input
                    type="text"
                    maxLength={2}
                    value={rentDueDay}
                    onChange={(e) => {
                      const v = sanitizeDigitsOnly(e.target.value, 2);
                      if (!v || (Number(v) >= 1 && Number(v) <= 31)) setRentDueDay(v);
                    }}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Rent Status</label>
                  <select
                    value={rentStatus}
                    onChange={(e) => setRentStatus(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  >
                    <option value="active">Active</option>
                    <option value="overdue">Overdue</option>
                    <option value="terminated">Terminated</option>
                    <option value="expired">Expired</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Lease Start Date</label>
                  <input
                    type="date"
                    value={leaseStartDate}
                    onChange={(e) => setLeaseStartDate(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Lease End Date</label>
                  <input
                    type="date"
                    value={leaseEndDate}
                    onChange={(e) => setLeaseEndDate(e.target.value)}
                    style={{ width: '100%', fontSize: '0.8rem' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Submit */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', background: '#f8f9fa', color: '#374151', borderRadius: 'var(--radius-sm)' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '8px 22px',
              background: customerType === 'owner' ? 'linear-gradient(135deg, #8b5cf6, #6d28d9)' : 'linear-gradient(135deg, #3b82f6, #1d4ed8)',
              color: '#111827',
              fontWeight: '700',
              borderRadius: 'var(--radius-sm)',
              cursor: 'pointer'
            }}
          >
            {customer ? 'Update Customer Profile' : 'Save & Register Customer'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
