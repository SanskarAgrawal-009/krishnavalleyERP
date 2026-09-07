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

export const BulkEnrollRentalModal = ({
  isOpen,
  onClose,
  selectedFlats: propSelectedFlats = [],
  building = null,
  project = null,
  onSuccess
}) => {
  const [selectedFlats, setSelectedFlats] = useState(propSelectedFlats);
  const [allFlatsList, setAllFlatsList] = useState([]);
  const [fetchingFlats, setFetchingFlats] = useState(false);

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
      if (propSelectedFlats && propSelectedFlats.length > 0) {
        setSelectedFlats(propSelectedFlats);
        if (propSelectedFlats[0].basePrice) setAgreedDealPrice(propSelectedFlats[0].basePrice);
        if (propSelectedFlats[0].bhkType) setBhkType(propSelectedFlats[0].bhkType);
      } else {
        setFetchingFlats(true);
        projectService.getFlats()
          .then((res) => {
            const list = res.data || (Array.isArray(res) ? res : []);
            setAllFlatsList(list);
          })
          .catch((err) => console.error('Error fetching flats for rental enrollment:', err))
          .finally(() => setFetchingFlats(false));
      }
    }
  }, [isOpen, propSelectedFlats]);

  if (!isOpen) return null;

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const totalDealAmount = agreedDealPrice * (selectedFlats.length || 1);
  const totalPaidAmount = previousPaidAmount * (selectedFlats.length || 1);
  const totalRentalRevenue = monthlyRent * tenureMonths * (selectedFlats.length || 1);
  const isFullyPaid = previousPaidAmount >= agreedDealPrice;

  const handleToggleFlatChoice = (flat) => {
    const flatId = flat._id || flat.id;
    if (selectedFlats.some(f => (f._id || f.id) === flatId)) {
      setSelectedFlats(prev => prev.filter(f => (f._id || f.id) !== flatId));
    } else {
      setSelectedFlats(prev => [...prev, flat]);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!ownerName.trim()) {
      alert('Please enter Buyer / Owner Name');
      return;
    }

    if (selectedFlats.length === 0) {
      alert('Please select at least one flat to enroll');
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
        alert(res.message || 'Selected units successfully enrolled under 3-Year Rental Management!');
        if (onSuccess) onSuccess();
        onClose();
      } else {
        alert(res.message || 'Failed to enroll units.');
      }
    } catch (err) {
      console.error('Error enrolling flats in rental:', err);
      alert(err.message || 'Error executing rental enrollment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Enroll ${selectedFlats.length > 0 ? selectedFlats.length : ''} Unit(s) in 3-Year Guaranteed Rental Program`}
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
              Target Rental Units ({selectedFlats.length} Selected):
            </span>
            <span style={{ fontSize: '0.74rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '4px', fontWeight: '800' }}>
              36-MONTH RENT-BACK CONTRACT
            </span>
          </div>

          {selectedFlats.length > 0 ? (
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
                  <Home size={12} color="#2563eb" /> Flat {f.flatNumber} {f.buildingName ? `(${f.buildingName})` : ''}
                </span>
              ))}
            </div>
          ) : (
            <div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: '8px' }}>
                Select from available inventory below:
              </div>
              <div style={{ maxHeight: '120px', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {allFlatsList.map((f) => {
                  const isSelected = selectedFlats.some(sf => (sf._id || sf.id) === (f._id || f.id));
                  return (
                    <button
                      key={f._id || f.id}
                      type="button"
                      onClick={() => handleToggleFlatChoice(f)}
                      style={{
                        padding: '4px 8px',
                        borderRadius: '6px',
                        fontSize: '0.75rem',
                        fontWeight: '700',
                        border: isSelected ? '1.5px solid #2563eb' : '1px solid #cbd5e1',
                        background: isSelected ? '#eff6ff' : '#ffffff',
                        color: isSelected ? '#1d4ed8' : '#334155',
                        cursor: 'pointer'
                      }}
                    >
                      Flat {f.flatNumber} {isSelected ? '✓' : ''}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Section 1: Buyer / Owner Details */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={15} color="#2563eb" /> 1. Registered Titleholder / Owner Details
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

        {/* Section 2: 3-Year Rental Terms & Guaranteed Payouts */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#7c3aed', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Sparkles size={15} color="#7c3aed" /> 2. 3-Year Guaranteed Rent-Back Terms
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Monthly Guaranteed Rent (₹/mo) *
              </label>
              <input
                type="number"
                min="1000"
                step="1000"
                required
                value={monthlyRent}
                onChange={(e) => setMonthlyRent(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1.5px solid #7c3aed', fontSize: '0.85rem', fontWeight: '700', color: '#6d28d9' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Rental Start Date *
              </label>
              <input
                type="date"
                required
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
                value={tenureMonths}
                onChange={(e) => setTenureMonths(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Guaranteed Yield Summary Callout */}
          <div style={{
            background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)',
            border: '1px solid #ddd6fe',
            borderRadius: '8px',
            padding: '12px 16px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '10px'
          }}>
            <div>
              <span style={{ fontSize: '0.74rem', fontWeight: '700', color: '#6d28d9' }}>36-MONTH CUMULATIVE GUARANTEED PAYOUT</span>
              <div style={{ fontSize: '1.2rem', fontWeight: '800', color: '#4c1d95' }}>
                {formatINR(totalRentalRevenue)}
              </div>
            </div>

            <div style={{ fontSize: '0.75rem', color: '#5b21b6' }}>
              <span>{formatINR(monthlyRent)}/mo × {tenureMonths} months × {selectedFlats.length || 1} Unit(s)</span>
            </div>
          </div>
        </div>

        {/* Section 3: Optional Initial Sales Allotment Value */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ fontSize: '0.86rem', fontWeight: '800', color: '#1e293b', borderBottom: '1px solid #e2e8f0', paddingBottom: '6px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Receipt size={15} color="#16a34a" /> 3. Property Valuation &amp; Allotment Agreement
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Deal Price (Per Flat)
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
                Initial Paid Credit (Per Flat)
              </label>
              <input
                type="number"
                min="0"
                step="25000"
                value={previousPaidAmount}
                onChange={(e) => setPreviousPaidAmount(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '0.78rem', fontWeight: '700', color: '#334155', marginBottom: '4px' }}>
                Agreement Date
              </label>
              <input
                type="date"
                value={agreementDate}
                onChange={(e) => setAgreementDate(e.target.value)}
                style={{ width: '100%', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '9px 18px',
              background: '#ffffff',
              border: '1px solid #dadce0',
              borderRadius: '6px',
              color: '#374151',
              fontSize: '0.84rem',
              fontWeight: '600',
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
              background: '#7c3aed',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontSize: '0.84rem',
              fontWeight: '700',
              cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              boxShadow: '0 2px 6px rgba(124, 58, 237, 0.3)'
            }}
          >
            <ShieldCheck size={16} />
            {loading ? 'Enrolling Units...' : `Confirm Enrollment (${selectedFlats.length || 0} Units)`}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default BulkEnrollRentalModal;
