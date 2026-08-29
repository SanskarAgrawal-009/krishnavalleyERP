import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { CreditCard, Upload, CheckCircle2, FileText, Calendar, Building, DollarSign } from 'lucide-react';
import { formatINR } from '../../utils/formatters.js';

export const DisburseSalaryModal = ({ isOpen, onClose, onDisburse, payrollItem }) => {
  const [paymentMethod, setPaymentMethod] = useState('bank_transfer');
  const [paymentReference, setPaymentReference] = useState('');
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().slice(0, 10));
  const [paymentProofFile, setPaymentProofFile] = useState(null);
  const [remarks, setRemarks] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPaymentMethod('bank_transfer');
      setPaymentReference(`UTR-${Date.now().toString().slice(-6)}`);
      setPaymentDate(new Date().toISOString().slice(0, 10));
      setPaymentProofFile(null);
      setRemarks('');
    }
  }, [isOpen, payrollItem]);

  if (!payrollItem) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('paymentMethod', paymentMethod);
      formData.append('paymentReference', paymentReference.trim() || `SAL-${Date.now().toString().slice(-6)}`);
      formData.append('paymentDate', paymentDate);
      if (remarks.trim()) {
        formData.append('remarks', remarks.trim());
      }
      if (paymentProofFile) {
        formData.append('paymentProof', paymentProofFile);
      }

      await onDisburse(payrollItem.employeeId, payrollItem.payrollId || payrollItem._id || payrollItem.id, formData);
      onClose();
    } catch (err) {
      alert(err.message || 'Error processing salary disbursement');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Disburse Staff Salary & Upload Proof"
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        
        {/* Employee & Payroll Summary Card */}
        <div style={{
          backgroundColor: '#f8fafc',
          border: '1px solid #e2e8f0',
          borderRadius: '8px',
          padding: '12px 14px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div>
            <div style={{ fontWeight: '800', color: '#0f172a', fontSize: '0.95rem' }}>
              {payrollItem.employeeName}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '2px' }}>
              Code: <strong style={{ color: '#334151' }}>{payrollItem.employeeCode}</strong> • {payrollItem.departmentName || payrollItem.roleName || 'Staff'}
            </div>
            <div style={{ fontSize: '0.72rem', color: '#166534', fontWeight: '700', marginTop: '3px' }}>
              Period: {payrollItem.monthName} {payrollItem.year}
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '0.7rem', color: '#64748b', textTransform: 'uppercase', fontWeight: '700' }}>
              Net Payable
            </div>
            <div style={{ fontSize: '1.25rem', fontWeight: '800', color: '#15803d' }}>
              {formatINR(payrollItem.netSalary)}
            </div>
          </div>
        </div>

        {/* Payment Mode Selection */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Payment Mode / Method *
            </label>
            <select
              required
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem', padding: '7px 10px', borderRadius: '6px' }}
            >
              <option value="bank_transfer">Direct Bank Transfer (NEFT / RTGS / IMPS)</option>
              <option value="upi">UPI (GPay / PhonePe / Paytm)</option>
              <option value="cheque">Company Cheque</option>
              <option value="cash">Cash Voucher</option>
              <option value="other">Other Digital Transfer</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Disbursement Date *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem', padding: '6px 10px', borderRadius: '6px' }}
            >
            </input>
          </div>
        </div>

        {/* Transaction Reference / UTR Number */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
            Transaction Ref / UTR / Cheque Number *
          </label>
          <input
            type="text"
            required
            placeholder="e.g. UTR-9837201948 or CHQ-005921"
            value={paymentReference}
            onChange={(e) => setPaymentReference(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem', padding: '7px 10px', borderRadius: '6px' }}
          />
        </div>

        {/* Payment Done Screenshot / Payment Slip Upload */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
            Attach Payment Slip / Screenshot Proof
          </label>
          <div style={{
            border: '2px dashed #cbd5e1',
            borderRadius: '8px',
            padding: '14px',
            textAlign: 'center',
            backgroundColor: paymentProofFile ? '#f0fdf4' : '#ffffff',
            borderColor: paymentProofFile ? '#86efac' : '#cbd5e1',
            transition: 'all 0.2s ease'
          }}>
            <input
              type="file"
              id="paymentSlipInput"
              accept="image/*,application/pdf"
              style={{ display: 'none' }}
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setPaymentProofFile(e.target.files[0]);
                }
              }}
            />
            <label
              htmlFor="paymentSlipInput"
              style={{ cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}
            >
              <Upload size={22} color={paymentProofFile ? '#16a34a' : '#64748b'} />
              <span style={{ fontSize: '0.8rem', fontWeight: '600', color: paymentProofFile ? '#166534' : '#1e293b' }}>
                {paymentProofFile ? paymentProofFile.name : 'Choose Payment Screenshot or Slip (PDF/JPG/PNG)'}
              </span>
              <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>
                {paymentProofFile ? `${(paymentProofFile.size / 1024).toFixed(1)} KB • Click to change file` : 'Maximum file size: 25MB'}
              </span>
            </label>
          </div>
        </div>

        {/* Remarks / Notes */}
        <div>
          <label style={{ fontSize: '0.75rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '600' }}>
            Remarks / Transfer Note (Optional)
          </label>
          <input
            type="text"
            placeholder="e.g. Salary credited via corporate HDFC net banking"
            value={remarks}
            onChange={(e) => setRemarks(e.target.value)}
            style={{ width: '100%', fontSize: '0.82rem', padding: '6px 10px', borderRadius: '6px' }}
          />
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '8px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              padding: '7px 16px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              border: '1px solid #cbd5e1',
              borderRadius: '6px',
              fontWeight: '600',
              fontSize: '0.82rem',
              cursor: 'pointer'
            }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            style={{
              padding: '7px 20px',
              backgroundColor: isSubmitting ? '#93c5fd' : '#15803d',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              fontSize: '0.82rem',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <CheckCircle2 size={16} />
            {isSubmitting ? 'Processing & Uploading...' : 'Confirm & Disburse Salary'}
          </button>
        </div>

      </form>
    </Modal>
  );
};

export default DisburseSalaryModal;
