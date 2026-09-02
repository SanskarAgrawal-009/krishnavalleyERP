import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import { 
  Building2, 
  Home, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  CreditCard, 
  ShieldCheck, 
  FileText, 
  Upload, 
  ExternalLink,
  PlusCircle,
  Trash2,
  Calendar,
  DollarSign,
  Key,
  Repeat
} from 'lucide-react';

export const ManualCustomerModal = ({ isOpen, onClose, onSubmit, customer = null }) => {
  // Inventory
  const [projects, setProjects] = useState([]);
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
  const [ownershipType, setOwnershipType] = useState('individual'); // 'individual' | 'joint' | 'corporate'
  const [selectedPropertyIds, setSelectedPropertyIds] = useState([]);
  const [panNumber, setPanNumber] = useState('');
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [bankDetails, setBankDetails] = useState({
    bankName: '',
    branch: '',
    accountNumber: '',
    ifscCode: '',
    accountHolderName: ''
  });

  // Nominee Details
  const [nominee, setNominee] = useState({
    name: '',
    relation: '',
    contactNo: ''
  });

  // 3-Year Guaranteed Rent-Back Configuration
  const [optInRentBack, setOptInRentBack] = useState(true);
  const [guaranteedMonthlyRent, setGuaranteedMonthlyRent] = useState(31000);
  const [payoutDueDay, setPayoutDueDay] = useState(25);
  const [notes, setNotes] = useState('');

  useEffect(() => {
    if (isOpen) {
      projectService.getProjects().then((res) => {
        if (res.data) setProjects(res.data);
      });
      projectService.getFlats().then((res) => {
        if (res.data) setFlats(res.data);
      });

      if (customer) {
        setName(customer.name || '');
        setMobileNo(customer.mobileNo || '');
        setEmail(customer.email || '');
        setAlternatePhone(customer.alternatePhone || '');
        setAddress(customer.address || {
          street: '',
          city: 'Mathura',
          state: 'Uttar Pradesh',
          pincode: '281001',
          country: 'India'
        });

        const od = customer.ownerDetails || {};
        setOwnershipType(od.ownershipType || 'individual');
        setSelectedPropertyIds((od.propertyIds || []).map(p => p._id || p));
        setPanNumber(customer.panNumber || od.panNumber || '');
        setAadhaarNumber(customer.aadhaarNumber || od.aadhaarNumber || '');
        setBankDetails(od.bankDetails || {
          bankName: '',
          branch: '',
          accountNumber: '',
          ifscCode: '',
          accountHolderName: customer.name || ''
        });
        setNominee(od.nominee || { name: '', relation: '', contactNo: '' });
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
          accountHolderName: ''
        });
        setNominee({ name: '', relation: '', contactNo: '' });
        setOptInRentBack(true);
        setGuaranteedMonthlyRent(31000);
        setPayoutDueDay(25);
        setNotes('');
      }
    }
  }, [isOpen, customer]);

  const togglePropertySelection = (flatId) => {
    setSelectedPropertyIds(prev => 
      prev.includes(flatId) ? prev.filter(id => id !== flatId) : [...prev, flatId]
    );
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name.trim() || !mobileNo.trim()) {
      alert('Please fill in Owner Name and Mobile Number.');
      return;
    }

    const payload = {
      name: name.trim(),
      mobileNo: mobileNo.trim(),
      email: email.trim() || undefined,
      alternatePhone: alternatePhone.trim() || undefined,
      customerType: 'owner',
      status: 'active',
      address,
      panNumber: panNumber.trim().toUpperCase() || undefined,
      aadhaarNumber: aadhaarNumber.trim() || undefined,
      ownerDetails: {
        ownershipType,
        ownershipPercentage: 100,
        propertyIds: selectedPropertyIds,
        panNumber: panNumber.trim().toUpperCase(),
        aadhaarNumber: aadhaarNumber.trim(),
        bankDetails,
        nominee
      },
      notes
    };

    onSubmit(payload);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={customer ? `Edit Property Owner: ${customer.name}` : 'Register New Property Owner & Titleholder'}
      maxWidth="820px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Section 1: Basic Identity */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#1e1b4b', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={16} color="#4338ca" /> 1. Owner Identity &amp; Contact Details
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '2px' }}>
                Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Rajesh Singhal"
                value={name}
                onChange={(e) => setName(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '2px' }}>
                Primary Mobile Number *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 9876543210"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '2px' }}>
                Alternative Phone
              </label>
              <input
                type="text"
                placeholder="e.g. 9811223344"
                value={alternatePhone}
                onChange={(e) => setAlternatePhone(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '2px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="e.g. rajesh@gmail.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '2px' }}>
                PAN Number
              </label>
              <input
                type="text"
                placeholder="e.g. ABCDE1234F"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.74rem', fontWeight: '700', color: '#334155', display: 'block', marginBottom: '2px' }}>
                Aadhaar Number
              </label>
              <input
                type="text"
                placeholder="e.g. 1234 5678 9012"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                style={{ width: '100%', fontSize: '0.82rem', padding: '7px', borderRadius: '5px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Allotted Flat Units */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#0f172a', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Home size={16} color="#2563eb" /> 2. Allotted Property Units ({selectedPropertyIds.length} Selected)
            </h4>
            <span style={{ fontSize: '0.72rem', color: '#64748b' }}>Select all units owned by this titleholder</span>
          </div>

          <div style={{ maxHeight: '140px', overflowY: 'auto', border: '1px solid #cbd5e1', borderRadius: '6px', padding: '8px', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '6px' }}>
            {flats.map((flat) => {
              const isSelected = selectedPropertyIds.includes(flat._id);
              return (
                <button
                  type="button"
                  key={flat._id}
                  onClick={() => togglePropertySelection(flat._id)}
                  style={{
                    padding: '6px 10px',
                    borderRadius: '5px',
                    fontSize: '0.75rem',
                    fontWeight: isSelected ? '800' : '600',
                    border: isSelected ? '1.5px solid #2563eb' : '1px solid #e2e8f0',
                    background: isSelected ? '#eff6ff' : '#ffffff',
                    color: isSelected ? '#1d4ed8' : '#334155',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between'
                  }}
                >
                  <span>Flat {flat.flatNumber}</span>
                  {isSelected && <span style={{ color: '#2563eb' }}>✓</span>}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section 3: Owner Bank Details (For Rent Payouts & Transfers) */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #bbf7d0', background: '#f0fdf4' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#166534', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <CreditCard size={16} color="#16a34a" /> 3. Banking &amp; NEFT Payout Account
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                Bank Name
              </label>
              <input
                type="text"
                placeholder="e.g. Punjab National Bank"
                value={bankDetails.bankName}
                onChange={(e) => setBankDetails({ ...bankDetails, bankName: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #86efac' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                Branch
              </label>
              <input
                type="text"
                placeholder="e.g. Civil Lines, Mathura"
                value={bankDetails.branch}
                onChange={(e) => setBankDetails({ ...bankDetails, branch: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #86efac' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                Account Number
              </label>
              <input
                type="text"
                placeholder="e.g. 0983000100182033"
                value={bankDetails.accountNumber}
                onChange={(e) => setBankDetails({ ...bankDetails, accountNumber: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #86efac' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                IFSC Code
              </label>
              <input
                type="text"
                placeholder="e.g. PUNB0098300"
                value={bankDetails.ifscCode}
                onChange={(e) => setBankDetails({ ...bankDetails, ifscCode: e.target.value.toUpperCase() })}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #86efac' }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Nominee Details & Notes */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid #e2e8f0' }}>
          <h4 style={{ fontSize: '0.9rem', fontWeight: '800', color: '#334155', margin: 0, display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={16} color="#64748b" /> 4. Nominee &amp; Additional Information
          </h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                Nominee Name
              </label>
              <input
                type="text"
                placeholder="e.g. Anita Singhal"
                value={nominee.name}
                onChange={(e) => setNominee({ ...nominee, name: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                Relation
              </label>
              <input
                type="text"
                placeholder="e.g. Spouse / Son"
                value={nominee.relation}
                onChange={(e) => setNominee({ ...nominee, relation: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
                Nominee Contact
              </label>
              <input
                type="text"
                placeholder="e.g. 9876500000"
                value={nominee.contactNo}
                onChange={(e) => setNominee({ ...nominee, contactNo: e.target.value })}
                style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
              />
            </div>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#475569', fontWeight: '700', display: 'block', marginBottom: '2px' }}>
              Internal Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Agreement signed in 2023, 36 months assured payout enrolled"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem', padding: '6px', borderRadius: '4px', border: '1px solid #cbd5e1' }}
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div style={{
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '10px',
          borderTop: '1px solid #e2e8f0',
          paddingTop: '12px'
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
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '800',
              fontSize: '0.84rem',
              cursor: 'pointer',
              boxShadow: '0 2px 4px rgba(26, 115, 232, 0.25)'
            }}
          >
            {customer ? 'Update Titleholder' : 'Save Owner Profile'}
          </button>
        </div>

      </form>
    </Modal>
  );
};
