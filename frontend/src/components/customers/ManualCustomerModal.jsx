import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { LoadingButton } from '../common/LoadingButton.jsx';
import { projectService } from '../../services/projectService.js';
import { Home } from 'lucide-react';

export const ManualCustomerModal = ({ isOpen, onClose, onSubmit, customer = null }) => {
  const [submitting, setSubmitting] = useState(false);
  const [flats, setFlats] = useState([]);

  // Base Identity
  const [name, setName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');
  const [alternatePhone, setAlternatePhone] = useState('');
  const [address, setAddress] = useState({
    street: '',
    city: 'Mathura',
    state: 'Uttar Pradesh',
    pincode: '281001',
    country: 'India'
  });

  // Owner KYC & Properties
  const [ownershipType, setOwnershipType] = useState('individual');
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    branch: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: '',
    upiId: ''
  });

  // Nominee Details
  const [nominee, setNominee] = useState({
    name: '',
    relation: '',
    contactNo: ''
  });

  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      projectService.getFlats().then((res) => {
        if (res.data) setFlats(res.data);
      });

      if (customer) {
        setName(customer.name || '');
        setMobileNo(customer.mobileNo || '');
        setEmail(customer.email || '');
        setAlternatePhone(customer.alternateMobileNo || customer.alternatePhone || '');
        
        const rawAddr = customer.address || {};
        setAddress({
          street: rawAddr.street || rawAddr.addressLine1 || customer.permanentAddress || '',
          city: rawAddr.city || 'Mathura',
          state: rawAddr.state || 'Uttar Pradesh',
          pincode: rawAddr.pincode || '281001',
          country: rawAddr.country || 'India'
        });

        const od = customer.ownerDetails || {};
        const cb = customer.bankDetails || {};
        const ob = od.bankDetails || {};

        setOwnershipType(od.ownershipType || 'individual');
        setSelectedPropertyIds((od.propertyIds || []).map(p => p._id || p));
        setPanNumber(customer.panNumber || od.panNumber || '');
        setAadhaarNumber(customer.aadhaarNumber || od.aadhaarNumber || '');
        
        setBankDetails({
          bankName: cb.bankName || ob.bankName || '',
          branch: cb.branch || ob.branch || '',
          accountNumber: cb.accountNumber || cb.accountNo || ob.accountNumber || ob.accountNo || '',
          ifscCode: cb.ifscCode || cb.ifsc || ob.ifscCode || ob.ifsc || '',
          accountHolderName: cb.accountHolderName || ob.accountHolderName || customer.name || '',
          upiId: cb.upiId || ob.upiId || ''
        });

        const nom = od.nominee || {};
        setNominee({
          name: nom.name || '',
          relation: nom.relation || nom.relationship || '',
          contactNo: nom.contactNo || nom.mobileNo || ''
        });

        setNotes(customer.notes || '');
      } else {
        setName('');
        setMobileNo('');
        setEmail('');
        setAlternatePhone('');
        setAddress({
          street: '',
          city: 'Mathura',
          state: 'Uttar Pradesh',
          pincode: '281001',
          country: 'India'
        });
        setOwnershipType('individual');
        setSelectedPropertyIds([]);
        setPanNumber('');
        setAadhaarNumber('');
        setBankDetails({
          bankName: '',
          branch: '',
          accountNumber: '',
          ifscCode: '',
          accountHolderName: '',
          upiId: ''
        });
        setNominee({ name: '', relation: '', contactNo: '' });
        setNotes('');
      }
    }
  }, [isOpen, customer]);

  const togglePropertySelection = (flatId) => {
    setSelectedPropertyIds(prev => 
      prev.includes(flatId) ? prev.filter(id => id !== flatId) : [...prev, flatId]
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!name.trim() || !mobileNo.trim()) {
      alert('Please fill in Owner Name and Mobile Number.');
      return;
    }

    const formattedAddress = address.street
      ? `${address.street}, ${address.city || 'Mathura'}, ${address.state || 'Uttar Pradesh'} - ${address.pincode || '281001'}`
      : undefined;

    const normalizedBank = {
      bankName: bankDetails.bankName?.trim() || '',
      branch: bankDetails.branch?.trim() || '',
      accountNumber: bankDetails.accountNumber?.trim() || '',
      accountNo: bankDetails.accountNumber?.trim() || '',
      ifscCode: bankDetails.ifscCode?.trim().toUpperCase() || '',
      ifsc: bankDetails.ifscCode?.trim().toUpperCase() || '',
      accountHolderName: bankDetails.accountHolderName?.trim() || name.trim(),
      upiId: bankDetails.upiId?.trim() || ''
    };

    const payload = {
      name: name.trim(),
      mobileNo: mobileNo.trim(),
      alternateMobileNo: alternatePhone.trim() || undefined,
      alternatePhone: alternatePhone.trim() || undefined,
      email: email.trim() || undefined,
      customerType: 'owner',
      status: 'active',
      address: {
        addressLine1: address.street || '',
        street: address.street || '',
        city: address.city || 'Mathura',
        state: address.state || 'Uttar Pradesh',
        pincode: address.pincode || '281001',
        country: address.country || 'India'
      },
      permanentAddress: formattedAddress,
      panNumber: panNumber.trim().toUpperCase() || undefined,
      aadhaarNumber: aadhaarNumber.trim() || undefined,
      bankDetails: normalizedBank,
      ownerDetails: {
        ownershipType,
        ownershipPercentage: 100,
        propertyIds: selectedPropertyIds,
        panNumber: panNumber.trim().toUpperCase(),
        aadhaarNumber: aadhaarNumber.trim(),
        permanentAddress: formattedAddress,
        bankDetails: normalizedBank,
        nominee: {
          name: nominee.name?.trim() || '',
          relation: nominee.relation?.trim() || '',
          relationship: nominee.relation?.trim() || '',
          contactNo: nominee.contactNo?.trim() || '',
          mobileNo: nominee.contactNo?.trim() || ''
        }
      },
      notes
    };

    setSubmitting(true);
    try {
      await onSubmit(payload);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? `Edit property owner: ${customer.name}` : 'Register property owner'}
      maxWidth="720px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Personal Details Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Owner full name *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Singhal"
                className="form-card-input"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Mobile number *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                className="form-card-input"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Email & Alternate Phone */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Email address</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="email"
                placeholder="e.g. rajesh@gmail.com"
                className="form-card-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Alternate phone</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="tel"
                placeholder="e.g. 9811223344"
                className="form-card-input"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* KYC: PAN & Aadhaar */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>PAN number</span>
              <span className="form-card-badge">KYC</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                className="form-card-input"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Aadhaar number</span>
              <span className="form-card-badge">KYC</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. 1234 5678 9012"
                className="form-card-input"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Residence Address */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Street / Residence address</span>
          </div>
          <div className="form-card-input-row">
            <input
              type="text"
              placeholder="e.g. Flat 101, Civil Lines, Mathura, UP - 281001"
              className="form-card-input"
              value={address.street}
              onChange={(e) => setAddress({ ...address, street: e.target.value })}
            />
          </div>
        </div>

        {/* Allotted Units */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Allotted units ({selectedPropertyIds.length} selected)</span>
            <span className="form-card-badge">Click to toggle</span>
          </div>
          <div style={{ maxHeight: '110px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px', paddingTop: '6px' }}>
            {flats.map((flat) => {
              const isSelected = selectedPropertyIds.includes(flat._id);
              return (
                <button
                  type="button"
                  key={flat._id}
                  onClick={() => togglePropertySelection(flat._id)}
                  style={{
                    padding: '4px 10px',
                    borderRadius: '6px',
                    fontSize: '0.76rem',
                    fontWeight: isSelected ? '700' : '500',
                    border: isSelected ? '1px solid #17652f' : '1px solid #e2e8f0',
                    background: isSelected ? '#e8f2e5' : '#ffffff',
                    color: isSelected ? '#17652f' : '#475569',
                    cursor: 'pointer'
                  }}
                >
                  Flat {flat.flatNumber} {isSelected ? '✓' : ''}
                </button>
              );
            })}
          </div>
        </div>

        {/* Bank Account for Payouts */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Bank name</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. HDFC Bank"
                className="form-card-input"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Account number</span>
              <span className="form-card-badge">Payout Account</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. 0983000100182033"
                className="form-card-input"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>IFSC code</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. HDFC0001234"
                className="form-card-input"
                value={bankDetails.ifscCode}
                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>UPI ID (optional)</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. rajesh@upi"
                className="form-card-input"
                value={bankDetails.upiId || ''}
                onChange={(e) => setBankDetails({ ...bankDetails, upiId: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Nominee & Notes */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Nominee name</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. Anita Singhal"
                className="form-card-input"
                value={nominee.name}
                onChange={(e) => setNominee({ ...nominee, name: e.target.value })}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Internal notes</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. Registry completed 2024"
                className="form-card-input"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Modal Footer */}
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
            disabled={submitting}
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
            disabled={submitting}
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#17652f',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.86rem',
              cursor: submitting ? 'not-allowed' : 'pointer'
            }}
          >
            {submitting ? 'Saving...' : customer ? 'Update owner profile' : 'Save owner profile'}
          </button>
        </div>

      </form>
    </Modal>
  );
};
