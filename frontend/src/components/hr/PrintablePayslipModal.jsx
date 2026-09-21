import React, { useRef } from 'react';
import { Printer, Download, X, Building2, CheckCircle2 } from 'lucide-react';

export const PrintablePayslipModal = ({ isOpen, onClose, payrollItem }) => {
  const printRef = useRef(null);

  if (!isOpen || !payrollItem) return null;

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const monthName = monthNames[(payrollItem.month || 1) - 1] || `Month ${payrollItem.month}`;
  const year = payrollItem.year || new Date().getFullYear();

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  // Convert numbers to Indian English Words
  const numberToWords = (num) => {
    if (!num || isNaN(num)) return 'Zero Rupees Only';
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    const inWords = (n) => {
      if ((n = n.toString()).length > 9) return 'Overflow';
      let n_arr = ('000000000' + n).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
      if (!n_arr) return '';
      let str = '';
      str += Number(n_arr[1]) !== 0 ? (a[Number(n_arr[1])] || b[n_arr[1][0]] + ' ' + a[n_arr[1][1]]) + 'Crore ' : '';
      str += Number(n_arr[2]) !== 0 ? (a[Number(n_arr[2])] || b[n_arr[2][0]] + ' ' + a[n_arr[2][1]]) + 'Lakh ' : '';
      str += Number(n_arr[3]) !== 0 ? (a[Number(n_arr[3])] || b[n_arr[3][0]] + ' ' + a[n_arr[3][1]]) + 'Thousand ' : '';
      str += Number(n_arr[4]) !== 0 ? (a[Number(n_arr[4])] || b[n_arr[4][0]] + ' ' + a[n_arr[4][1]]) + 'Hundred ' : '';
      str += Number(n_arr[5]) !== 0 ? (str !== '' ? 'and ' : '') + (a[Number(n_arr[5])] || b[n_arr[5][0]] + ' ' + a[n_arr[5][1]]) : '';
      return str.trim();
    };

    return `Rupees ${inWords(Math.round(num))} Only`;
  };

  const basic = payrollItem.basicSalary || 0;
  const allowances = payrollItem.allowances || 0;
  const hra = Math.round(allowances * 0.6);
  const conveyance = Math.round(allowances * 0.4);
  const gross = basic + allowances;

  const deductions = payrollItem.deductions || 0;
  const pf = Math.round(deductions * 0.7);
  const esi = Math.round(deductions * 0.3);
  const lwp = payrollItem.unpaidLeaveDeduction || 0;
  const totalDeductions = deductions + lwp;

  const netSalary = payrollItem.netSalary || (gross - totalDeductions);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
    >
      {/* Container */}
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '12px',
          width: '100%',
          maxWidth: '820px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          overflow: 'hidden'
        }}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: '12px 20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Building2 size={18} color="#60a5fa" />
            <strong style={{ fontSize: '0.95rem' }}>Official Staff Payslip Preview</strong>
            <span style={{ fontSize: '0.72rem', background: '#1e293b', padding: '2px 8px', borderRadius: '4px', color: '#94a3b8' }}>
              {monthName} {year}
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
            <button
              type="button"
              onClick={handlePrint}
              style={{
                backgroundColor: '#1a73e8',
                color: '#ffffff',
                border: 'none',
                padding: '6px 14px',
                borderRadius: '6px',
                fontSize: '0.8rem',
                fontWeight: '700',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                cursor: 'pointer'
              }}
            >
              <Printer size={14} /> Print / Save PDF
            </button>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: '#94a3b8',
                cursor: 'pointer',
                padding: '4px',
                display: 'flex',
                alignItems: 'center'
              }}
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {/* Printable Payslip Body */}
        <div
          ref={printRef}
          id="printable-payslip"
          style={{
            padding: '36px 40px',
            backgroundColor: '#ffffff',
            color: '#0f172a',
            overflowY: 'auto',
            fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
          }}
        >
          {/* Company Header */}
          <div style={{ borderBottom: '2px solid #1a73e8', paddingBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{ fontSize: '1.4rem', fontWeight: '900', color: '#1a73e8', letterSpacing: '-0.5px' }}>
                  KRISHNA VALLEY
                </span>
                <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#475569', letterSpacing: '1px' }}>
                  INFRASTRUCTURE & DEVELOPERS
                </span>
              </div>
              <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#64748b' }}>
                Civil Lines, Mathura, Uttar Pradesh - 281001 • info@krishnavalley.com
              </p>
              <p style={{ margin: '2px 0 0', fontSize: '0.72rem', color: '#94a3b8' }}>
                RERA Reg No: UPRERAAGT12894 • CIN: U70109UP2020PTC132890
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '1.1rem', fontWeight: '800', color: '#0f172a', textTransform: 'uppercase' }}>
                SALARY PAYSLIP
              </div>
              <div style={{ fontSize: '0.85rem', fontWeight: '700', color: '#1a73e8', marginTop: '2px' }}>
                {monthName.toUpperCase()} {year}
              </div>
              <div style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '2px' }}>
                Generated: {new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
              </div>
            </div>
          </div>

          {/* Employee & Bank Info Matrix */}
          <div style={{ margin: '20px 0', border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
              <tbody>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <td style={{ padding: '8px 14px', width: '20%', fontWeight: '700', color: '#475569' }}>Employee Code:</td>
                  <td style={{ padding: '8px 14px', width: '30%', fontWeight: '800', color: '#1a73e8' }}>{payrollItem.employeeCode || 'N/A'}</td>
                  <td style={{ padding: '8px 14px', width: '20%', fontWeight: '700', color: '#475569' }}>Staff Name:</td>
                  <td style={{ padding: '8px 14px', width: '30%', fontWeight: '800', color: '#0f172a' }}>{payrollItem.employeeName}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '8px 14px', fontWeight: '700', color: '#475569' }}>Department:</td>
                  <td style={{ padding: '8px 14px', color: '#1e293b' }}>{payrollItem.departmentName || 'Operations'}</td>
                  <td style={{ padding: '8px 14px', fontWeight: '700', color: '#475569' }}>Designation:</td>
                  <td style={{ padding: '8px 14px', color: '#1e293b' }}>{payrollItem.designation || payrollItem.roleName || 'Staff Member'}</td>
                </tr>
                <tr style={{ borderBottom: '1px solid #e2e8f0', backgroundColor: '#f8fafc' }}>
                  <td style={{ padding: '8px 14px', fontWeight: '700', color: '#475569' }}>Payment Mode:</td>
                  <td style={{ padding: '8px 14px', color: '#1e293b', textTransform: 'capitalize' }}>
                    {payrollItem.paymentMethod ? payrollItem.paymentMethod.replace(/_/g, ' ') : 'Bank Transfer / NEFT'}
                  </td>
                  <td style={{ padding: '8px 14px', fontWeight: '700', color: '#475569' }}>Payment Ref / UTR:</td>
                  <td style={{ padding: '8px 14px', color: '#0f172a', fontWeight: '700', fontFamily: 'monospace' }}>
                    {payrollItem.paymentReference || 'SAL-KV-AUTO'}
                  </td>
                </tr>
                <tr>
                  <td style={{ padding: '8px 14px', fontWeight: '700', color: '#475569' }}>Disbursement Date:</td>
                  <td style={{ padding: '8px 14px', color: '#1e293b' }}>
                    {payrollItem.paymentDate ? new Date(payrollItem.paymentDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : 'End of Month'}
                  </td>
                  <td style={{ padding: '8px 14px', fontWeight: '700', color: '#475569' }}>Status:</td>
                  <td style={{ padding: '8px 14px' }}>
                    <span style={{
                      backgroundColor: payrollItem.status === 'paid' ? '#dcfce7' : '#fef3c7',
                      color: payrollItem.status === 'paid' ? '#166534' : '#92400e',
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontWeight: '800',
                      fontSize: '0.72rem',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      {payrollItem.status === 'paid' ? '✓ DISBURSED' : 'PROCESSED / PENDING'}
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Salary Breakdown (Earnings & Deductions) */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '20px 0' }}>
            {/* Left: Earnings */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#f0fdf4', padding: '10px 14px', borderBottom: '1px solid #bbf7d0', fontWeight: '800', color: '#166534', fontSize: '0.85rem' }}>
                EARNINGS & ALLOWANCES
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#334155' }}>Basic Salary</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', fontWeight: '700', color: '#0f172a' }}>{formatINR(basic)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#334155' }}>House Rent Allowance (HRA)</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: '#0f172a' }}>{formatINR(hra)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#334155' }}>Conveyance & Travel Allowance</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: '#0f172a' }}>{formatINR(conveyance)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#334155' }}>Special Site Allowance</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: '#0f172a' }}>₹0</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: '800', borderTop: '2px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 14px', color: '#0f172a' }}>GROSS EARNINGS (A)</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#16a34a', fontSize: '0.92rem' }}>{formatINR(gross)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Right: Deductions */}
            <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', overflow: 'hidden' }}>
              <div style={{ backgroundColor: '#fef2f2', padding: '10px 14px', borderBottom: '1px solid #fecaca', fontWeight: '800', color: '#991b1b', fontSize: '0.85rem' }}>
                STATUTORY DEDUCTIONS
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.82rem' }}>
                <tbody>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#334155' }}>Provident Fund (PF - 12%)</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: '#0f172a' }}>{formatINR(pf)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#334155' }}>Employee State Insurance (ESI)</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: '#0f172a' }}>{formatINR(esi)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#334155' }}>Leave Without Pay (LWP) Deductions</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: lwp > 0 ? '#dc2626' : '#0f172a' }}>{formatINR(lwp)}</td>
                  </tr>
                  <tr style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px 14px', color: '#334155' }}>Professional Tax / TDS</td>
                    <td style={{ padding: '8px 14px', textAlign: 'right', color: '#0f172a' }}>₹0</td>
                  </tr>
                  <tr style={{ backgroundColor: '#f8fafc', fontWeight: '800', borderTop: '2px solid #e2e8f0' }}>
                    <td style={{ padding: '10px 14px', color: '#0f172a' }}>TOTAL DEDUCTIONS (B)</td>
                    <td style={{ padding: '10px 14px', textAlign: 'right', color: '#dc2626', fontSize: '0.92rem' }}>{formatINR(totalDeductions)}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Net Salary Highlight Box */}
          <div
            style={{
              border: '2px solid #1a73e8',
              backgroundColor: '#eff6ff',
              borderRadius: '8px',
              padding: '16px 20px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              margin: '20px 0'
            }}
          >
            <div>
              <span style={{ fontSize: '0.75rem', fontWeight: '800', color: '#1e40af', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                NET SALARY PAYABLE (A - B)
              </span>
              <div style={{ fontSize: '0.85rem', color: '#475569', fontStyle: 'italic', marginTop: '4px' }}>
                {numberToWords(netSalary)}
              </div>
            </div>
            <div style={{ fontSize: '1.6rem', fontWeight: '900', color: '#1d4ed8' }}>
              {formatINR(netSalary)}
            </div>
          </div>

          {/* Remarks & Signatures Footer */}
          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px', alignItems: 'flex-end' }}>
            <div style={{ fontSize: '0.72rem', color: '#64748b' }}>
              <strong>Notice:</strong> This is a system-generated authentic salary payslip issued by Krishna Valley Infrastructure & Developers ERP System. Any queries regarding attendance or deduction calculations should be submitted to the HR Department within 7 days of disbursement.
            </div>

            <div style={{ textAlign: 'center' }}>
              <div style={{ borderBottom: '1px dashed #94a3b8', height: '40px', marginBottom: '6px' }}></div>
              <div style={{ fontSize: '0.78rem', fontWeight: '800', color: '#0f172a' }}>Authorized Signatory</div>
              <div style={{ fontSize: '0.68rem', color: '#64748b' }}>Krishna Valley HR & Finance</div>
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #printable-payslip, #printable-payslip * {
            visibility: visible;
          }
          #printable-payslip {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            padding: 20px !important;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
};
