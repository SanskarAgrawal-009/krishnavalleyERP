import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { Clock, CheckCircle } from 'lucide-react';

export const LogAttendanceModal = ({ isOpen, onClose, employees, onSubmit }) => {
  const [selectedEmpId, setSelectedEmpId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [status, setStatus] = useState('present');
  const [workingHours, setWorkingHours] = useState(8.5);
  const [remarks, setRemarks] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedEmpId) {
      alert('Please select an employee');
      return;
    }

    onSubmit(selectedEmpId, {
      date,
      status,
      workingHours: Number(workingHours),
      remarks
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Record Staff Daily Attendance"
      maxWidth="520px"
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Attendance Date *
            </label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Status *
            </label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            >
              <option value="present">Present</option>
              <option value="late">Late Arrival</option>
              <option value="half_day">Half Day</option>
              <option value="leave">Approved Leave</option>
              <option value="absent">Absent</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '14px' }}>
          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Working Hours
            </label>
            <input
              type="number"
              step="0.5"
              value={workingHours}
              onChange={(e) => setWorkingHours(e.target.value)}
              style={{ width: '100%', fontSize: '0.85rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.78rem', color: '#374151', display: 'block', marginBottom: '4px', fontWeight: '700' }}>
              Shift Remarks
            </label>
            <input
              type="text"
              placeholder="e.g. On-site supervision"
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
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
            Log Attendance
          </button>
        </div>
      </form>
    </Modal>
  );
};
