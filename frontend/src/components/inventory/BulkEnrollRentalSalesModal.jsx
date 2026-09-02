import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { projectService } from '../../services/projectService.js';
import {
  Building2,
  Home,
  User,
  Phone,
  Mail,
  DollarSign,
  Calendar,
  Clock,
  ShieldCheck,
  CheckCircle2,
  Layers,
  ArrowRight,
  Receipt,
  Sparkles,
  CreditCard
} from 'lucide-react';

export const BulkEnrollRentalSalesModal = ({
  isOpen,
  onClose,
  selectedFlats = [],
  building = null,
  project = null,
  onSuccess
}) => {
  const [ownerName, setOwnerName] = useState('');
  const [ownerMobile, setOwnerMobile] = useState('');
  const [ownerEmail, setOwnerEmail] = useState('');
  const [agreedDealPrice, setAgreedDealPrice] = useState(4500000);
  const [previousPaidAmount, setPreviousPaidAmount] = useState(1000000);
  const [paymentMode, setPaymentMode] = useState('bank_transfer');
  const [transactionReference, setTransactionReference] = useState('');
  const [agreementDate, setAgreementDate] = useState(new Date().toISOString().slice(0, 10));
  
  // 3-Year Rental Terms
  const [rentalStartDate, setRentalStartDate] = useState(new Date().toISOString().slice(0, 10));
  const [tenureMonths, setTenureMonths] = useState(36);
  const [monthlyRent, setMonthlyRent] = useState(25000);
  const [bhkType, setBhkType] = useState('2BHK');

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (selectedFlats.length > 0 && selectedFlats[0].basePrice) {
        setAgreedDealPrice(selectedFlats[0].basePrice);
      }
      if (selectedFlats.length > 0 && selectedFlats[0].bhkType) {
        setBhkType(selectedFlats[0].bhkType);
      }
    }
  }, [isOpen, selectedFlats]);

  if (!isOpen) return null;

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const totalDealAmount = agreedDealPrice * selectedFlats.length;
  const totalPaidAmount = previousPaidAmount * selectedFlats.length;
  const totalRentalRevenue = monthlyRent * tenureMonths * selectedFlats.length;
  const isFullyPaid = previousPaidAmount >= agreedDealPrice;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      alert('Please enter Buyer / Owner Name');
      return;
    }

    if (selectedFlats.length === 0) {
      alert('No flats selected');
      return;
    }

    setLoading(true);
    try {
      const flatIds = selectedFlats.map((f) => f._id || f.id);
      const res = await projectService.bulkEnrollRentalSales({
        flatIds,
        ownerName: ownerName.trim(),
        ownerMobile: ownerMobile.trim(),
        ownerEmail: ownerEmail.trim(),
        agreedDealPrice: Number(agreedDealPrice),
        previousPaidAmount: Number(previousPaidAmount),
        paymentMode,
        transactionReference: transactionReference.trim(),
        agreementDate,
        rentalStartDate,
        tenureMonths: Number(tenureMonths) || 36,
        monthlyRent: Number(monthlyRent),
        bhkType
      });

      if (res.success) {
        alert(res.message || 'Selected flats successfully enrolled under 3-Year Rental Management & Sales Allotment!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert(res.message || 'Failed to enroll flats.');
      }
    } catch (err) {
      console.error('Error enrolling flats:', err);
      alert(err.message || 'Error executing bulk enrollment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Enroll ${selectedFlats.length} Selected Unit(s) in 3-Year Rental & Sales Allotment`}
      maxWidth="780px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
        
        {/* Selected Units Summary Banner */}
        <div style={{
          background: '#f8fafc',
          border: '1px solid #cbd5e1',
          borderRadius: '10px',
          padding: '14px 18px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
            <span style={{ fontSize: '0.85rem', fontWeight: '800', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Building2 size={16} color="#2563eb" />
              Target Units ({selectedFlats.length} Flats):
            </span>
            <span style={{ fontSize: '0.74rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
              3-YEAR GUARANTEED PROGRAM
            </span>
          </div>

          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
            {selectedFlats.map((f) => (
              <span
                key={f._id || f.id}
                style={{
                  background: '#ffffff',
                  border: '1px solid #cbd5e1',
                  color: '#1e293b',
                  fontSize: '0.76rem',
                  fontWeight: '700',
                  padding: '3px 8px',
                  borderRadius: '6px',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '4px'
                }}
              >
                <Home size={12} color="#2563eb" /> Flat {f.flatNumber} (Fl. {f.floor})
              </span>
            ))}
          </div>
        </div>

        {/* Section 1: Buyer / Owner Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={15} color="#2563eb" /> 1. Buyer &amp; Property Owner Details
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Owner Full Name *
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Aditya Pratap Singh"
                value={ownerName}
                onChange={(e) => setOwnerName(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Mobile Number
              </label>
              <input
                type="text"
                placeholder="e.g. 9810112233"
                value={ownerMobile}
                onChange={(e) => setOwnerMobile(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                Email Address
              </label>
              <input
                type="email"
                placeholder="buyer@gmail.com"
                value={ownerEmail}
                onChange={(e) => setOwnerEmail(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Sales Allotment & Previous Payments Recorded */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Receipt size={15} color="#16a34a" /> 2. Sales Allotment &amp; Previous Payments Credit
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Agreed Deal Price (Per Flat)
              </label>
              <input
                type="number"
                min="0"
                step="50000"
                value={agreedDealPrice}
                onChange={(e) => setAgreedDealPrice(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#16a34a', marginBottom: '4px' }}>
                Previous Payments Made (Per Flat)
              </label>
              <input
                type="number"
                min="0"
                step="25000"
                value={previousPaidAmount}
                onChange={(e) => setPreviousPaidAmount(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #16a34a', fontSize: '0.85rem', fontWeight: '700' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Payment Mode
              </label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
              >
                <option value="bank_transfer">Bank Transfer / NEFT / RTGS</option>
                <option value="cheque">Cheque / Demand Draft</option>
                <option value="upi">UPI / Online Gateway</option>
                <option value="cash">Cash Receipt</option>
              </select>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '600', color: '#334155', marginBottom: '4px' }}>
                UTR / Cheque / Ref Number
              </label>
              <input
                type="text"
                placeholder="e.g. HDFC998234 / CHQ-1002"
                value={transactionReference}
                onChange={(e) => setTransactionReference(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Agreement (BBA) Date
              </label>
              <input
                type="date"
                value={agreementDate}
                onChange={(e) => setAgreementDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Unit BHK Type
              </label>
              <select
                value={bhkType}
                onChange={(e) => setBhkType(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', backgroundColor: '#ffffff' }}
              >
                <option value="1BHK">1 BHK</option>
                <option value="2BHK">2 BHK</option>
                <option value="3BHK">3 BHK</option>
                <option value="4BHK">4 BHK</option>
                <option value="Service Apartment">Service Apartment</option>
                <option value="Studio">Studio</option>
                <option value="Penthouse">Penthouse</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: 3-Year Guaranteed Rental Terms */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={15} color="#9333ea" /> 3. Guaranteed 3-Year Rent-Back Program
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#9333ea', marginBottom: '4px' }}>
                Guaranteed Monthly Rent to Owner (₹/mo)
              </label>
              <input
                type="number"
                min="0"
                step="1000"
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #9333ea', fontSize: '0.85rem', fontWeight: '700', color: '#7e22ce' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Rental Start Date
              </label>
              <input
                type="date"
                value={rentalStartDate}
                onChange={(e) => setRentalStartDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Tenure (Months)
              </label>
              <input
                type="number"
                min="1"
                max="120"
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: '700' }}
              />
            </div>
          </div>
        </div>

        {/* Financial Overview Card */}
        <div style={{
          background: '#f1f5f9',
          border: '1px solid #cbd5e1',
          borderRadius: '8px',
          padding: '12px 16px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '10px',
          textAlign: 'center'
        }}>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>TOTAL DEAL VALUE</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#0f172a' }}>{formatINR(totalDealAmount)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#166534', fontWeight: '700' }}>PREVIOUS PAYMENTS CREDITED</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#166534' }}>{formatINR(totalPaidAmount)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#7e22ce', fontWeight: '700' }}>TOTAL RENTAL PAYOUT ({tenureMonths} MO)</div>
            <div style={{ fontSize: '1rem', fontWeight: '800', color: '#7e22ce' }}>{formatINR(totalRentalRevenue)}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: '700' }}>SALES STATUS</div>
            <span style={{ fontSize: '0.75rem', fontWeight: '800', color: isFullyPaid ? '#166534' : '#1d4ed8' }}>
              {isFullyPaid ? 'FULLY PAID' : 'AGREEMENT COMPLETED'}
            </span>
          </div>
        </div>

        {/* Action Footer */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e2e8f0', paddingTop: '14px' }}>
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            style={{
              padding: '9px 18px',
              background: '#f1f5f9',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.85rem',
              color: '#475569',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>

          <button
            type="submit"
            disabled={loading}
            style={{
              padding: '9px 24px',
              background: '#2563eb',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.88rem',
              color: '#ffffff',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 2px 4px rgba(37, 99, 235, 0.2)'
            }}
          >
            {loading ? 'Processing Enrollment...' : `Confirm & Enroll ${selectedFlats.length} Flat(s)`}
          </button>
        </div>

      </form>
    </Modal>
  );
};
