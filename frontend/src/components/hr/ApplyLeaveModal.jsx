import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';

export const ApplyLeaveModal = ({ isOpen, onClose, employees, onSubmit }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [leaveType, setLeaveType] = useState('casual');
  const [fromDate, setFromDate] = useState(new Date().toISOString().slice(0, 10));
  const [toDate, setToDate] = useState(new Date().toISOString().slice(0, 10));
  const [isHalfDay, setIsHalfDay] = useState(false);
  const [numberOfDays, setNumberOfDays] = useState(1);
  const [reason, setReason] = useState('Personal family event');
  const [status, setStatus] = useState('approved');

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
      title="Record staff leave"
      maxWidth="540px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Staff Member Card */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Staff member *</span>
          </div>
          <div className="form-card-input-row">
            <select
              required
              value={selectedEmpId}
              onChange={(e) => setSelectedEmpId(e.target.value)}
              className="form-card-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="">-- Choose staff member --</option>
              {employees.map((e) => (
                <option key={e._id || e.id} value={e._id || e.id}>
                  {e.firstName} {e.lastName} ({e.employeeCode}) • {e.departmentName || e.department || 'Staff'}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Live Employee Leave Balance Card */}
        {selectedEmployee && (
          <div style={{
            padding: '12px 14px',
            backgroundColor: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: '10px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.72rem', fontWeight: '600', color: '#64748b', textTransform: 'uppercase' }}>
                Remaining leave quotas
              </span>
              <span style={{ fontSize: '0.74rem', color: '#64748b' }}>
                Used: {((leaveBalance.casualLeave?.used || 0) + (leaveBalance.sickLeave?.used || 0) + (leaveBalance.earnedLeave?.used || 0))} days
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px' }}>
              <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#e8f2e5', textAlign: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#17652f', display: 'block' }}>CASUAL</span>
                <strong style={{ fontSize: '0.94rem', color: '#17652f' }}>{clRemaining}</strong>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#f1f5f9', textAlign: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#475569', display: 'block' }}>SICK</span>
                <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>{slRemaining}</strong>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#e8f2e5', textAlign: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#17652f', display: 'block' }}>EARNED</span>
                <strong style={{ fontSize: '0.94rem', color: '#17652f' }}>{elRemaining}</strong>
              </div>

              <div style={{ padding: '6px 8px', borderRadius: '6px', background: '#f1f5f9', textAlign: 'center' }}>
                <span style={{ fontSize: '0.66rem', fontWeight: '700', color: '#475569', display: 'block' }}>UNPAID</span>
                <strong style={{ fontSize: '0.94rem', color: '#0f172a' }}>{leaveBalance.unpaidLeave?.used || 0}</strong>
              </div>
            </div>
          </div>
        )}

        {/* Leave Category Card */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Leave category *</span>
          </div>
          <div className="form-card-input-row">
            <select
              value={leaveType}
              onChange={(e) => setLeaveType(e.target.value)}
              className="form-card-input"
              style={{ cursor: 'pointer' }}
            >
              <option value="casual">Casual Leave (CL - Paid)</option>
              <option value="sick">Sick / Medical Leave (SL - Paid)</option>
              <option value="earned">Earned / Privilege Leave (EL - Paid)</option>
              <option value="unpaid">Leave Without Pay (LWP - Unpaid)</option>
              <option value="maternity">Maternity / Paternity Leave</option>
              <option value="other">Compassionate / Other</option>
            </select>
          </div>
        </div>

        {/* Half Day Option Card */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Is this a half-day leave?</span>
            <span className="form-card-badge">{numberOfDays} {numberOfDays === 1 ? 'day' : 'days'} total</span>
          </div>
          <div className="form-card-choices">
            <label className="form-card-choice" onClick={() => {
              setIsHalfDay(true);
              handleDatesChange(fromDate, toDate, true);
            }}>
              <input
                type="radio"
                name="isHalfDay"
                checked={isHalfDay === true}
                onChange={() => {
                  setIsHalfDay(true);
                  handleDatesChange(fromDate, toDate, true);
                }}
                style={{ accentColor: '#17652f' }}
              />
              <span>Yes, half-day (0.5 day)</span>
            </label>
            <label className="form-card-choice" onClick={() => {
              setIsHalfDay(false);
              handleDatesChange(fromDate, toDate, false);
            }}>
              <input
                type="radio"
                name="isHalfDay"
                checked={isHalfDay === false}
                onChange={() => {
                  setIsHalfDay(false);
                  handleDatesChange(fromDate, toDate, false);
                }}
                style={{ accentColor: '#17652f' }}
              />
              <span>Full day</span>
            </label>
          </div>
        </div>

        {/* Date Row */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>From date *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="date"
                required
                className="form-card-input"
                value={fromDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setFromDate(val);
                  if (toDate < val || isHalfDay) setToDate(val);
                  handleDatesChange(val, isHalfDay ? val : toDate);
                }}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>To date *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="date"
                required
                disabled={isHalfDay}
                className="form-card-input"
                value={isHalfDay ? fromDate : toDate}
                onChange={(e) => {
                  const val = e.target.value;
                  setToDate(val);
                  handleDatesChange(fromDate, val);
                }}
                style={{ opacity: isHalfDay ? 0.6 : 1 }}
              />
            </div>
          </div>
        </div>

        {/* Reason / Remarks */}
        <div className="form-card-box">
          <div className="form-card-prompt">
            <span>Reason or remarks</span>
          </div>
          <div className="form-card-input-row">
            <input
              type="text"
              placeholder="e.g. Personal family event, medical rest..."
              className="form-card-input"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
        </div>

        {/* Footer */}
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
            style={{
              padding: '9px 24px',
              borderRadius: '8px',
              border: 'none',
              background: '#17652f',
              color: '#ffffff',
              fontWeight: '700',
              fontSize: '0.86rem',
              cursor: 'pointer'
            }}
          >
            Record staff leave
          </button>
        </div>
      </form>
    </Modal>
  );
};
