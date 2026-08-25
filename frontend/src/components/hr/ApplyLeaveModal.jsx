import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Calendar, FileText } from 'lucide-react';

export const ApplyLeaveModal = ({ isOpen, onClose, employees, onSubmit }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date(Date.now() + 86400000).toISOString().slice(0, 10));
  const [numberOfDays, setNumberOfDays] = useState(2);
  const [reason, setReason] = useState('Personal family event');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert('Please choose an employee');
      return;
    }

    onSubmit(selectedEmpId, {
      leaveType,
      fromDate,
      toDate,
      numberOfDays: Number(numberOfDays),
      reason
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Apply Leave Application"
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
            Select Employee *
          </label>
          <select
            required
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            <option value="">-- Choose Employee --</option>
            {employees.map((e) => (
              <option key={e._id} value={e._id}>
                {e.firstName} {e.lastName} ({e.employeeCode})
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Leave Category *
            </label>
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="casual">Casual Leave (Paid)</option>
              <option value="sick">Sick / Medical Leave</option>
              <option value="earned">Earned Privilege Leave</option>
              <option value="unpaid">Leave Without Pay (LWP)</option>
              <option value="maternity">Maternity / Paternity</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              No. of Days *
            </label>
            <input
              type="number"
              required
              min="0.5"
              step="0.5"
              value={numberOfDays}
              onChange={(e) => setNumberOfDays(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              From Date *
            </label>
            <input
              type="date"
              required
              value={fromDate}
              onChange={(e) => setFromDate(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              To Date *
            </label>
            <input
              type="date"
              required
              value={toDate}
              onChange={(e) => setToDate(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>
        </div>

        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
            Reason for Leave Application
          </label>
          <textarea
            rows={2}
            placeholder="State the reason for absence..."
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            style={{ width: '100%', fontSize: '0.85rem' }}
          />
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
            Submit Application
          </button>
        </div>
      </form>
    </Modal>
  );
};
