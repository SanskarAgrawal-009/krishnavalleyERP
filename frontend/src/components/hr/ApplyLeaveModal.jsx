import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Calendar, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

export const ApplyLeaveModal = ({ isOpen, onClose, employees, onSubmit }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [reason, setReason] = useState('Personal family event');
  const [status, setStatus] = useState('approved'); // Default: immediate HR approval

  const selectedEmployee = employees.find((e) => e._id === selectedEmpId || e.id === selectedEmpId);
  const leaveBalance = selectedEmployee?.leaveBalance || {
    casualLeave: { total: 12, used: 0 },
    sickLeave: { total: 10, used: 0 },
    earnedLeave: { total: 15, used: 0 },
    unpaidLeave: { used: 0 }
  };

  const getRemaining = (total = 0, used = 0) => Math.max(0, total - used);

  const clRemaining = getRemaining(leaveBalance.casualLeave?.total, leaveBalance.casualLeave?.used);
  const slRemaining = getRemaining(leaveBalance.sickLeave?.total, leaveBalance.sickLeave?.used);
  const elRemaining = getRemaining(leaveBalance.earnedLeave?.total, leaveBalance.earnedLeave?.used);

  const handleDatesChange = (newFrom, newTo, half = isHalfDay) => {
    if (half) {
      setNumberOfDays(0.5);
      return;
    }
    const d1 = new Date(newFrom);
    const d2 = new Date(newTo);
    if (!isNaN(d1) && !isNaN(d2) && d2 >= d1) {
      const diffTime = Math.abs(d2 - d1);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
      setNumberOfDays(diffDays);
    } else {
      setNumberOfDays(1);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert('Please choose a staff member.');
      return;
    }

    const days = isHalfDay ? 0.5 : (Number(numberOfDays) || 1);

    onSubmit(selectedEmpId, {
      leaveType,
      fromDate,
      toDate: isHalfDay ? fromDate : toDate,
      numberOfDays: days,
      reason: reason || 'Approved administrative leave',
      status
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Staff Leave (HR Central Administration)"
      maxWidth="580px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div>
          <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
            Staff Member *
          </label>
          <select
            required
            value={selectedEmpId}
            onChange={(e) => {
              setSelectedEmpId(e.target.value);
            }}
            style={{ width: '100%', fontSize: '0.85rem' }}
          >
            <option value="">-- Choose Staff Member --</option>
            {employees.map((e) => (
              <option key={e._id || e.id} value={e._id || e.id}>
                {e.firstName} {e.lastName} ({e.employeeCode}) • {e.departmentName || e.department || 'Staff'}
              </option>
            ))}
          </select>
        </div>

        {/* Live Employee Leave Balance Meter */}
        {selectedEmployee && (
          <div
            style={{
              padding: '10px 14px',
              backgroundColor: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: '8px',
              display: 'flex',
              flexDirection: 'column',
              gap: '6px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.74rem', fontWeight: '800', color: '#1e3a8a', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Annual Leave Quotas & Remaining Balances
              </span>
              <span style={{ fontSize: '0.7rem', color: '#64748b' }}>
                Total Used: {((leaveBalance.casualLeave?.used || 0) + (leaveBalance.sickLeave?.used || 0) + (leaveBalance.earnedLeave?.used || 0))} Days
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr 1fr', gap: '8px', marginTop: '2px' }}>
              <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#1d4ed8', display: 'block' }}>CASUAL (CL)</span>
                <strong style={{ fontSize: '0.92rem', color: clRemaining > 0 ? '#1e40af' : '#dc2626' }}>
                  {clRemaining} <span style={{ fontSize: '0.65rem', fontWeight: '500', color: '#64748b' }}>/ {leaveBalance.casualLeave?.total || 12}</span>
                </strong>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#fef3c7', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#b45309', display: 'block' }}>SICK (SL)</span>
                <strong style={{ fontSize: '0.92rem', color: slRemaining > 0 ? '#92400e' : '#dc2626' }}>
                  {slRemaining} <span style={{ fontSize: '0.65rem', fontWeight: '500', color: '#64748b' }}>/ {leaveBalance.sickLeave?.total || 10}</span>
                </strong>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#047857', display: 'block' }}>EARNED (EL)</span>
                <strong style={{ fontSize: '0.92rem', color: elRemaining > 0 ? '#065f46' : '#dc2626' }}>
                  {elRemaining} <span style={{ fontSize: '0.65rem', fontWeight: '500', color: '#64748b' }}>/ {leaveBalance.earnedLeave?.total || 15}</span>
                </strong>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.62rem', fontWeight: '700', color: '#475569', display: 'block' }}>LWP (UNPAID)</span>
                <strong style={{ fontSize: '0.92rem', color: '#0f172a' }}>
                  {leaveBalance.unpaidLeave?.used || 0} <span style={{ fontSize: '0.65rem', fontWeight: '500', color: '#64748b' }}>Days</span>
                </strong>
              </div>
            </div>
          </div>
        )}

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
              <option value="casual">Casual Leave (CL - Paid)</option>
              <option value="sick">Sick / Medical Leave (SL - Paid)</option>
              <option value="earned">Earned / Privilege Leave (EL - Paid)</option>
              <option value="unpaid">Leave Without Pay (LWP - Salary Deducted)</option>
              <option value="maternity">Maternity / Paternity Leave</option>
              <option value="other">Compassionate / Other</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Leave Duration & Half-Day
            </label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', height: '36px' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', fontWeight: '600', cursor: 'pointer' }}>
                <input
                  type="checkbox"
                  checked={isHalfDay}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setIsHalfDay(checked);
                    handleDatesChange(fromDate, toDate, checked);
                  }}
                />
                Half-Day (0.5)
              </label>

              <div style={{ fontSize: '0.78rem', fontWeight: '700', color: '#1e3a8a', background: '#eff6ff', padding: '4px 10px', borderRadius: '4px' }}>
                Total: {numberOfDays} Day{numberOfDays > 1 ? 's' : ''}
              </div>
            </div>
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
              onChange={(e) => {
                const val = e.target.value;
                setFromDate(val);
                if (toDate < val || isHalfDay) setToDate(val);
                handleDatesChange(val, isHalfDay ? val : toDate);
              }}
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
              disabled={isHalfDay}
              value={isHalfDay ? fromDate : toDate}
              onChange={(e) => {
                const val = e.target.value;
                setToDate(val);
                handleDatesChange(fromDate, val);
              }}
              style={{ width: '100%', fontSize: '0.85rem', opacity: isHalfDay ? 0.6 : 1 }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              HR Action Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem', fontWeight: '700', color: status === 'approved' ? '#047857' : '#b45309' }}
            >
              <option value="approved">Approved by HR (Immediate)</option>
              <option value="pending">Mark Pending / Verification Required</option>
            </select>
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Reason / Remarks for Leave
            </label>
            <input
              type="text"
              placeholder="e.g. Urgent personal site leave, medical rest..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
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
              background: 'linear-gradient(135deg, #1e40af, #2563eb)',
              color: '#ffffff',
              border: 'none',
              borderRadius: '6px',
              fontWeight: '700',
              cursor: 'pointer',
              boxShadow: '0 2px 6px rgba(30, 64, 175, 0.3)'
            }}
          >
            Record & Save Staff Leave
          </button>
        </div>
      </form>
    </Modal>
  );
};
