import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { 
  User, 
  Phone, 
  Mail, 
  Briefcase, 
  Building2, 
  Calendar, 
  Clock, 
  DollarSign, 
  ShieldCheck, 
  Upload, 
  ExternalLink,
  CheckCircle,
  XCircle,
  FileText
} from 'lucide-react';

export const EmployeeDetailModal = ({
  isOpen,
  onClose,
  employee,
  onUpdateLeaveStatus,
  onPaySalary,
  onUploadDoc
}) => {
  const [activeTab, setActiveTab] = useState('attendance'); // 'attendance' | 'leaves' | 'payroll' | 'docs'

  // Document Upload State
  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState('aadhaar');
  const [docName, setDocName] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  if (!employee) return null;

  const attendanceList = employee.attendance || [];
  const leavesList = employee.leaves || [];
  const payrollList = employee.payroll || [];
  const documentsList = employee.documents || [];

  const formatINR = (val) => {
    if (val === undefined || val === null || isNaN(val)) return '₹0';
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val);
  };

  const handleDocSubmit = async (e) => {
    e.preventDefault();
    if (!docFile) return;
    setUploadingDoc(true);
    const formData = new FormData();
    formData.append('documentFile', docFile);
    formData.append('documentType', docType);
    formData.append('documentName', docName || docFile.name);

    try {
      await onUploadDoc(employee._id, formData);
      setDocFile(null);
      setDocName('');
    } finally {
      setUploadingDoc(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Employee Dossier: ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`}
      maxWidth="840px"
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Top Hero Banner */}
        <div style={{
          background: '#f8f9fa',
          border: '1px solid #dadce0',
          borderRadius: 'var(--radius-sm)',
          padding: '14px 18px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <span style={{ fontSize: '1.25rem', fontWeight: '800', color: '#111827' }}>
                {employee.firstName} {employee.lastName}
              </span>
              <StatusBadge status={employee.employmentStatus} />
              <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '4px', background: 'rgba(59, 130, 246, 0.15)', color: '#60a5fa', fontWeight: '700' }}>
                {employee.employmentType.replace('_', ' ').toUpperCase()}
              </span>
            </div>

            <div style={{ display: 'flex', gap: '14px', fontSize: '0.78rem', color: '#374151', marginTop: '6px', flexWrap: 'wrap' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Building2 size={13} color="#1a73e8" /> <strong>Dept:</strong> {employee.departmentName || employee.departmentId?.departmentName || employee.departmentId?.name || 'Civil & Structural Engineering'}</span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}><Briefcase size={13} color="#137333" /> <strong>Role:</strong> {employee.designation || employee.roleName || employee.roleId?.roleName || 'Senior Site Engineer'}</span>
              <span>• <strong>Phone:</strong> {employee.phone || employee.mobileNo || 'N/A'}</span>
              <span>• <strong>Joined:</strong> {employee.joiningDate ? new Date(employee.joiningDate).toLocaleDateString('en-IN') : 'N/A'}</span>
            </div>
          </div>

          <div style={{ textAlign: 'right' }}>
            <span style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '700' }}>EMPLOYEE CODE</span>
            <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1a73e8' }}>
              {employee.employeeCode}
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          display: 'flex',
          background: '#f8f9fa',
          padding: '4px',
          borderRadius: 'var(--radius-sm)',
          border: '1px solid #dadce0',
          gap: '4px',
          overflowX: 'auto'
        }}>
          {[
            { id: 'attendance', label: `Attendance (${attendanceList.length})`, icon: Clock },
            { id: 'leaves', label: `Leaves (${leavesList.length})`, icon: Calendar },
            { id: 'payroll', label: `Payroll (${payrollList.length})`, icon: DollarSign },
            { id: 'docs', label: `S3 Documents (${documentsList.length})`, icon: ShieldCheck }
          ].map((tab) => {
            const isSelected = activeTab === tab.id;
            return (
              <button
                type="button"
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  borderRadius: '4px',
                  background: isSelected ? 'linear-gradient(135deg, var(--primary-600), var(--primary-700))' : 'transparent',
                  color: isSelected ? '#fff' : 'var(--text-secondary)',
                  fontWeight: isSelected ? '700' : '500',
                  fontSize: '0.8rem',
                  border: 'none',
                  cursor: 'pointer',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* ================= TAB 1: ATTENDANCE LOG ================= */}
        {activeTab === 'attendance' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827' }}>Daily Attendance Log</h4>

            {attendanceList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563', fontSize: '0.78rem' }}>
                No attendance logged yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {attendanceList.map((a, idx) => (
                  <div key={idx} style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#111827', fontSize: '0.82rem' }}>
                        {new Date(a.date).toLocaleDateString('en-IN', { weekday: 'short', day: '2-digit', month: 'short', year: 'numeric' })}
                      </strong>
                      <div style={{ fontSize: '0.72rem', color: '#4b5563' }}>
                        Working Hours: {a.workingHours} hrs {a.remarks ? `• ${a.remarks}` : ''}
                      </div>
                    </div>

                    <span style={{
                      padding: '2px 8px',
                      borderRadius: '4px',
                      fontSize: '0.7rem',
                      fontWeight: '700',
                      textTransform: 'capitalize',
                      background: a.status === 'present' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                      color: a.status === 'present' ? '#10b981' : '#ef4444'
                    }}>
                      {a.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 2: LEAVES ================= */}
        {activeTab === 'leaves' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827' }}>Leave Applications & History</h4>

            {leavesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563', fontSize: '0.78rem' }}>
                No leave applications on record.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leavesList.map((l) => (
                  <div key={l._id} style={{ background: '#f8f9fa', padding: '10px 12px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#c084fc', fontWeight: '700', textTransform: 'capitalize', fontSize: '0.82rem' }}>
                          {l.leaveType} Leave ({l.numberOfDays} Days)
                        </span>
                        <StatusBadge status={l.status} />
                      </div>
                      <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>
                        {new Date(l.fromDate).toLocaleDateString('en-IN')} to {new Date(l.toDate).toLocaleDateString('en-IN')} • Reason: {l.reason || 'N/A'}
                      </div>
                    </div>

                    {l.status === 'pending' && (
                      <div style={{ display: 'flex', gap: '6px' }}>
                        <button
                          type="button"
                          onClick={() => onUpdateLeaveStatus(employee._id, l._id, 'approved')}
                          style={{ padding: '4px 10px', background: 'rgba(16, 185, 129, 0.15)', color: '#10b981', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateLeaveStatus(employee._id, l._id, 'rejected')}
                          style={{ padding: '4px 10px', background: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Reject
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 3: PAYROLL & SALARY SLIPS ================= */}
        {activeTab === 'payroll' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#10b981' }}>Salary Slips & Disbursal History</h4>

            {payrollList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563', fontSize: '0.78rem' }}>
                No payroll processed yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {payrollList.map((p) => (
                  <div key={p._id} style={{ background: '#f8f9fa', padding: '10px 14px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <strong style={{ color: '#111827', fontSize: '0.85rem' }}>
                        Month {p.month} / {p.year}
                      </strong>
                      <div style={{ fontSize: '0.72rem', color: '#4b5563', marginTop: '2px' }}>
                        Basic: {formatINR(p.basicSalary)} | Allowances: +{formatINR(p.allowances)} | Deductions: -{formatINR(p.deductions + (p.unpaidLeaveDeduction || 0))}
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1rem', fontWeight: '800', color: '#10b981' }}>{formatINR(p.netSalary)}</div>
                        <span style={{ fontSize: '0.68rem', color: p.status === 'paid' ? '#10b981' : '#fbbf24', textTransform: 'uppercase', fontWeight: '700' }}>
                          {p.status}
                        </span>
                      </div>

                      {p.status !== 'paid' && (
                        <button
                          type="button"
                          onClick={() => onPaySalary(employee._id, p._id, { paymentMethod: 'bank_transfer' })}
                          style={{ padding: '5px 12px', background: '#10b981', color: '#111827', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Disburse Salary
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ================= TAB 4: S3 DOCUMENTS ================= */}
        {activeTab === 'docs' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827' }}>
                KYC & Qualification Document Vault ({documentsList.length})
              </h4>
            </div>

            {/* Upload form */}
            <form onSubmit={handleDocSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1.2fr auto', gap: '8px', alignItems: 'center', background: '#f8f9fa', padding: '8px 10px', borderRadius: '4px' }}>
              <select
                value={docType}
                onChange={(e) => setDocType(e.target.value)}
                style={{ fontSize: '0.75rem' }}
              >
                <option value="aadhaar">Aadhaar Card</option>
                <option value="pan">PAN Card</option>
                <option value="joining_letter">Joining Letter</option>
                <option value="qualification">Degree / Diploma</option>
                <option value="salary_slip">Past Salary Slip</option>
                <option value="bank_document">Bank Cheque / Passbook</option>
              </select>

              <input
                type="text"
                placeholder="Document Title"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                style={{ fontSize: '0.75rem' }}
              />

              <div>
                <input
                  type="file"
                  id="empDocInput"
                  onChange={(e) => setDocFile(e.target.files?.[0] || null)}
                  style={{ display: 'none' }}
                />
                <label
                  htmlFor="empDocInput"
                  style={{ padding: '5px 10px', background: '#f8f9fa', border: '1px solid #dadce0', borderRadius: '4px', fontSize: '0.72rem', cursor: 'pointer', color: docFile ? '#10b981' : 'var(--text-secondary)' }}
                >
                  <Upload size={12} /> {docFile ? docFile.name : 'Choose File'}
                </label>
              </div>

              <button
                type="submit"
                disabled={!docFile || uploadingDoc}
                style={{ padding: '5px 12px', background: '#3b82f6', color: '#111827', borderRadius: '4px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
              >
                {uploadingDoc ? 'Uploading...' : 'Upload S3'}
              </button>
            </form>

            {/* Documents List */}
            {documentsList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '16px', color: '#4b5563', fontSize: '0.75rem' }}>
                No documents uploaded yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                {documentsList.map((d, idx) => (
                  <div key={idx} style={{ background: '#f8f9fa', padding: '8px 12px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <strong style={{ color: '#111827', fontSize: '0.8rem' }}>{d.documentName}</strong>
                      <span style={{ fontSize: '0.7rem', color: '#4b5563', marginLeft: '8px' }}>({d.documentType})</span>
                    </div>

                    <a
                      href={d.fileUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ padding: '3px 8px', background: '#2563eb', color: '#111827', borderRadius: '4px', textDecoration: 'none', fontSize: '0.7rem', fontWeight: '700' }}
                    >
                      <ExternalLink size={11} /> View S3 Doc
                    </a>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

      </div>
    </Modal>
  );
};
