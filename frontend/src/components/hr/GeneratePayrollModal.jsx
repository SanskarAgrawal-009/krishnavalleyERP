import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { DollarSign, Layers, CheckCircle } from 'lucide-react';

export const GeneratePayrollModal = ({ isOpen, onClose, onGenerate, onSubmit }) => {
  const [month, setMonth] = useState(new Date().getMonth() + 1);
  const [year, setYear] = useState(new Date().getFullYear());
  const [defaultBasic, setDefaultBasic] = useState(40000);
  const [isProcessing, setIsProcessing] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const handler = onGenerate || onSubmit;
    if (!handler) return;
    
    setIsProcessing(true);
    try {
      await handler({
        month: Number(month),
        year: Number(year),
        defaultBasic: Number(defaultBasic)
      });
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Monthly Staff Payroll"
      maxWidth="480px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Salary Month *</label>
            <select
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              {[
                { m: 1, name: 'January' },
                { m: 2, name: 'February' },
                { m: 3, name: 'March' },
                { m: 4, name: 'April' },
                { m: 5, name: 'May' },
                { m: 6, name: 'June' },
                { m: 7, name: 'July' },
                { m: 8, name: 'August' },
                { m: 9, name: 'September' },
                { m: 10, name: 'October' },
                { m: 11, name: 'November' },
                { m: 12, name: 'December' }
              ].map((item) => (
                <option key={item.m} value={item.m}>
                  {item.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Year *</label>
            <input
              type="number"
              required
              value={year}
              onChange={(e) => setYear(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Base Salary Reference (₹)</label>
          <input
            type="number"
            value={defaultBasic}
            onChange={(e) => setDefaultBasic(e.target.value)}
            style={{ width: '100%', fontSize: '0.8rem' }}
          />
        </div>

        <div style={{ background: '#e8f0fe', padding: '10px 12px', borderRadius: '4px', fontSize: '0.75rem', color: '#414754', border: '1px solid #d2e3fc' }}>
          <strong>Automated Calculations:</strong> Will scan all active staff, apply 25% HRA/allowances, deduct 12% PF/ESI, and deduct exact salary for any unapproved or unpaid leaves taken in the month.
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button type="button" onClick={onClose} disabled={isProcessing} style={{ padding: '7px 14px', background: '#f8f9fa', color: '#374151', borderRadius: '4px', border: '1px solid #dadce0', cursor: 'pointer' }}>
            Cancel
          </button>
          <button
            type="submit"
            disabled={isProcessing}
            style={{
              padding: '8px 18px',
              background: isProcessing ? '#9ca3af' : '#137333',
              color: '#ffffff',
              fontWeight: '700',
              borderRadius: '4px',
              cursor: isProcessing ? 'not-allowed' : 'pointer',
              border: 'none'
            }}
          >
            {isProcessing ? 'Processing Calculations...' : 'Calculate & Process Payroll'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
