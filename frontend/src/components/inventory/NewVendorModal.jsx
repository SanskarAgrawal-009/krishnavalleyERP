import { Modal } from '../common/Modal.jsx';
import { Truck, Phone, Mail } from 'lucide-react';
import { sanitizeAlphabetsOnly, sanitizePhone, sanitizeEmail, sanitizeGovtId, sanitizeGst, isValidEmail } from '../../utils/inputValidators.js';

export const NewVendorModal = ({ isOpen, onClose, onSubmit }) => {
  const [vendorCode, setVendorCode] = useState(`VEN-${Date.now().toString().slice(-4)}`);
  const [vendorName, setVendorName] = useState('');
  const [contactName, setContactName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');
  const [city, setCity] = useState('Jaipur');
  const [state, setState] = useState('Rajasthan');
  const [gstNumber, setGstNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('Net 30 Days');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!vendorName.trim()) {
      alert('Please enter Vendor / Company name');
      return;
    }
    if (!mobileNo.trim() || mobileNo.replace(/\D/g, '').length < 10) {
      alert('Please enter a valid 10-digit mobile phone number');
      return;
    }
    if (email && !isValidEmail(email)) {
      alert('Please enter a valid email address');
      return;
    }
    if (panNumber && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(panNumber)) {
      alert('PAN number must follow format ABCDE1234F');
      return;
    }
    onSubmit({
      vendorCode,
      vendorName,
      contactPerson: {
        name: contactName,
        mobileNo,
        email
      },
      phone: mobileNo,
      email,
      address: {
        city,
        state,
        country: 'India'
      },
      gstNumber,
      panNumber,
      paymentTerms,
      status: 'active'
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Register Material Supplier / Vendor"
      maxWidth="620px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Vendor Code *
            </label>
            <input
              type="text"
              required
              value={vendorCode}
              onChange={(e) => setVendorCode(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Vendor / Company Name *
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Jindal Steel & Power Ltd"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Contact Person (Alphabets only)
            </label>
            <input
              type="text"
              placeholder="e.g. Sunil Agarwal"
              value={contactName}
              onChange={(e) => setContactName(sanitizeAlphabetsOnly(e.target.value))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Mobile Phone * (Numbers only)
            </label>
            <input
              type="tel"
              required
              placeholder="+91 98290 12345"
              value={mobileNo}
              onChange={(e) => setMobileNo(sanitizePhone(e.target.value))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Email Address
            </label>
            <input
              type="email"
              placeholder="sales@vendor.com"
              value={email}
              onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              GST Identification #
            </label>
            <input
              type="text"
              placeholder="08AAACJ1234F1Z8"
              value={gstNumber}
              onChange={(e) => setGstNumber(sanitizeGst(e.target.value))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              PAN Card Number
            </label>
            <input
              type="text"
              placeholder="AAACJ1234F"
              value={panNumber}
              onChange={(e) => setPanNumber(sanitizeGovtId(e.target.value, 'pan'))}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Payment Credit Terms
            </label>
            <input
              type="text"
              value={paymentTerms}
              onChange={(e) => setPaymentTerms(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: '#f3f4f6',
              color: '#374151',
              border: '1px solid #dadce0',
              borderRadius: '6px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            style={{
              padding: '9px 22px',
              background: '#1a73e8',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(26, 115, 232, 0.3)'
            }}
          >
            Save Vendor
          </button>
        </div>
      </form>
    </Modal>
  );
};
