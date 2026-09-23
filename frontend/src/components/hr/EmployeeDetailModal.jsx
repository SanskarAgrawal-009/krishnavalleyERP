import React, { useState } from 'react';
import { Modal } from '../common/Modal.jsx';
import { StatusBadge } from '../common/StatusBadge.jsx';
import { DisburseSalaryModal } from './DisburseSalaryModal.jsx';
import { PrintableIDCardModal } from './PrintableIDCardModal.jsx';
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
  FileText,
  Printer,
  Heart,
  CreditCard,
  MapPin,
  CheckCircle2
} from 'lucide-react';

export const EmployeeDetailModal = ({
  isOpen,
  onClose,
  employee,
  onUpdateLeaveStatus,
  onPaySalary,
  onUploadDoc
}) => {
  const [activeTab, setActiveTab] = useState('id_badge'); // 'id_badge' | 'leaves' | 'attendance' | 'payroll' | 'docs'

  // ID Card Print Modal State
  const [isIDCardModalOpen, setIsIDCardModalOpen] = useState(false);

  // Document Upload State
  const [docFile, setDocFile] = useState(null);
  const [docType, setDocType] = useState('aadhaar');
  const [docName, setDocName] = useState('');
  const [uploadingDoc, setUploadingDoc] = useState(false);

  // Disburse Modal State
  const [isDisburseOpen, setIsDisburseOpen] = useState(false);
  const [selectedPayroll, setSelectedPayroll] = useState(null);

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

          <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
            <div>
              <span style={{ fontSize: '0.7rem', color: '#4b5563', fontWeight: '700' }}>EMPLOYEE CODE</span>
              <div style={{ fontSize: '0.92rem', fontWeight: '800', color: '#1a73e8' }}>
                {employee.employeeCode}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setIsIDCardModalOpen(true)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '5px 12px',
                background: '#1e40af',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontSize: '0.75rem',
                fontWeight: '700',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(30, 64, 175, 0.25)'
              }}
            >
              <Printer size={13} /> Print ID Badge
            </button>
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
            { id: 'id_badge', label: `Staff ID Badge`, icon: ShieldCheck },
            { id: 'leaves', label: `Leaves & Quotas (${leavesList.length})`, icon: Calendar },
            { id: 'attendance', label: `Attendance (${attendanceList.length})`, icon: Clock },
            { id: 'payroll', label: `Payroll & Bank (${payrollList.length})`, icon: DollarSign },
            { id: 'docs', label: `S3 Documents (${documentsList.length})`, icon: FileText }
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

        {/* ================= TAB: STAFF ID BADGE & REGULATORY IDENTIFIERS ================= */}
        {activeTab === 'id_badge' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <h4 style={{ fontSize: '0.92rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                  Official Krishna Valley Staff Identity Badge
                </h4>
                <p style={{ fontSize: '0.74rem', color: '#6b7280', margin: '2px 0 0' }}>
                  Standard corporate and construction site access credential issued by HR.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsIDCardModalOpen(true)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '7px 14px',
                  backgroundColor: '#10b981',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '6px',
                  fontWeight: '700',
                  fontSize: '0.78rem',
                  cursor: 'pointer'
                }}
              >
                <Printer size={14} /> Open Full Size Printable Card
              </button>
            </div>

            {/* Badge Preview and Details Split */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '16px' }}>
              {/* Mini Card Preview */}
              <div
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
                  border: '1px solid #cbd5e1',
                  borderRadius: '12px',
                  padding: '16px',
                  boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '12px'
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '2px solid #f59e0b', paddingBottom: '8px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Building2 size={16} color="#1e40af" />
                    <span style={{ fontSize: '0.85rem', fontWeight: '900', color: '#1e3a8a', letterSpacing: '0.5px' }}>
                      KRISHNA VALLEY
                    </span>
                  </div>
                  <span style={{ fontSize: '0.62rem', background: '#e0f2fe', color: '#0369a1', padding: '2px 6px', borderRadius: '4px', fontWeight: '800' }}>
                    AUTHORIZED ID
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                  <div
                    style={{
                      width: '56px',
                      height: '56px',
                      borderRadius: '50%',
                      background: 'linear-gradient(135deg, #1e40af, #0284c7)',
                      color: '#ffffff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '1.2rem',
                      fontWeight: '800',
                      flexShrink: 0
                    }}
                  >
                    {employee.firstName.charAt(0)}{employee.lastName?.charAt(0) || ''}
                  </div>

                  <div>
                    <h5 style={{ fontSize: '0.98rem', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>
                      {employee.firstName} {employee.lastName}
                    </h5>
                    <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#1d4ed8' }}>
                      {employee.designation || employee.roleName || 'Senior Site Engineer'}
                    </div>
                    <div style={{ fontSize: '0.68rem', color: '#64748b' }}>
                      {employee.departmentName || 'Civil & Structural Engineering'}
                    </div>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', background: '#f1f5f9', padding: '10px', borderRadius: '8px', fontSize: '0.7rem' }}>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: '700', display: 'block' }}>EMP ID CODE</span>
                    <strong style={{ color: '#1e40af' }}>{employee.employeeCode}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: '700', display: 'block' }}>BLOOD GROUP</span>
                    <strong style={{ color: '#b91c1c' }}>{employee.bloodGroup || 'B+'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: '700', display: 'block' }}>EMERGENCY CONTACT</span>
                    <strong style={{ color: '#0f172a' }}>{employee.emergencyContact?.mobileNo || 'N/A'}</strong>
                  </div>
                  <div>
                    <span style={{ color: '#64748b', fontSize: '0.62rem', fontWeight: '700', display: 'block' }}>ASSIGNED LOCATION</span>
                    <strong style={{ color: '#047857' }}>{employee.workLocation || 'Site Office'}</strong>
                  </div>
                </div>
              </div>

              {/* Regulatory Identity Numbers Vault */}
              <div
                style={{
                  background: '#f8fafc',
                  border: '1px solid #e2e8f0',
                  borderRadius: '12px',
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '10px'
                }}
              >
                <h5 style={{ fontSize: '0.82rem', fontWeight: '800', color: '#0f172a', margin: 0, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                  Government Regulatory Credentials
                </h5>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>AADHAAR NUMBER</span>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>
                        {employee.idCardDetails?.aadhaarNumber ? `•••• •••• ${employee.idCardDetails.aadhaarNumber.slice(-4)}` : 'Not Provided'}
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: employee.idCardDetails?.aadhaarNumber ? '#e6f4ea' : '#fef3c7', color: employee.idCardDetails?.aadhaarNumber ? '#137333' : '#b45309', fontWeight: '700' }}>
                      {employee.idCardDetails?.aadhaarNumber ? 'Recorded' : 'Pending'}
                    </span>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>PAN CARD NUMBER</span>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>
                        {employee.idCardDetails?.panNumber || 'Not Provided'}
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: employee.idCardDetails?.panNumber ? '#e6f4ea' : '#fef3c7', color: employee.idCardDetails?.panNumber ? '#137333' : '#b45309', fontWeight: '700' }}>
                      {employee.idCardDetails?.panNumber ? 'Recorded' : 'Pending'}
                    </span>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>UAN / PROVIDENT FUND</span>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>
                        {employee.idCardDetails?.uanNumber || 'Not Assigned'}
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: '700' }}>
                      PF ID
                    </span>
                  </div>

                  <div style={{ background: '#ffffff', padding: '8px 12px', borderRadius: '6px', border: '1px solid #cbd5e1', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <span style={{ fontSize: '0.65rem', color: '#64748b', fontWeight: '700', display: 'block' }}>ESI INSURANCE NUMBER</span>
                      <strong style={{ fontSize: '0.84rem', color: '#0f172a' }}>
                        {employee.idCardDetails?.esiNumber || 'Not Enrolled'}
                      </strong>
                    </div>
                    <span style={{ fontSize: '0.65rem', padding: '2px 8px', borderRadius: '4px', background: '#f1f5f9', color: '#475569', fontWeight: '700' }}>
                      ESI
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

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

        {/* ================= TAB 2: LEAVES & QUOTA METERS ================= */}
        {activeTab === 'leaves' && (
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#111827', margin: 0 }}>
                Leave Quota Balances & History
              </h4>
            </div>

            {/* Quota meters */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px' }}>
              <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#1d4ed8', display: 'block' }}>CASUAL LEAVES (CL)</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#1e40af', marginTop: '2px' }}>
                  {Math.max(0, (employee.leaveBalance?.casualLeave?.total || 12) - (employee.leaveBalance?.casualLeave?.used || 0))}
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '500' }}> / {employee.leaveBalance?.casualLeave?.total || 12} left</span>
                </div>
                <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Used: {employee.leaveBalance?.casualLeave?.used || 0} days</span>
              </div>

              <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#fef3c7', border: '1px solid #fde68a' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#b45309', display: 'block' }}>SICK LEAVES (SL)</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#92400e', marginTop: '2px' }}>
                  {Math.max(0, (employee.leaveBalance?.sickLeave?.total || 10) - (employee.leaveBalance?.sickLeave?.used || 0))}
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '500' }}> / {employee.leaveBalance?.sickLeave?.total || 10} left</span>
                </div>
                <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Used: {employee.leaveBalance?.sickLeave?.used || 0} days</span>
              </div>

              <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#ecfdf5', border: '1px solid #a7f3d0' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#047857', display: 'block' }}>EARNED LEAVES (EL)</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#065f46', marginTop: '2px' }}>
                  {Math.max(0, (employee.leaveBalance?.earnedLeave?.total || 15) - (employee.leaveBalance?.earnedLeave?.used || 0))}
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '500' }}> / {employee.leaveBalance?.earnedLeave?.total || 15} left</span>
                </div>
                <span style={{ fontSize: '0.64rem', color: '#64748b' }}>Used: {employee.leaveBalance?.earnedLeave?.used || 0} days</span>
              </div>

              <div style={{ padding: '8px 12px', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1' }}>
                <span style={{ fontSize: '0.68rem', fontWeight: '700', color: '#475569', display: 'block' }}>LWP (UNPAID)</span>
                <div style={{ fontSize: '1.15rem', fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                  {employee.leaveBalance?.unpaidLeave?.used || 0}
                  <span style={{ fontSize: '0.74rem', color: '#64748b', fontWeight: '500' }}> Days Taken</span>
                </div>
                <span style={{ fontSize: '0.64rem', color: '#dc2626' }}>Salary deducted</span>
              </div>
            </div>

            {leavesList.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '24px', color: '#4b5563', fontSize: '0.78rem' }}>
                No leave records on file.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {leavesList.map((l) => (
                  <div key={l._id} style={{ background: '#f8f9fa', padding: '10px 12px', borderRadius: '4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{ color: '#1e3a8a', fontWeight: '700', textTransform: 'capitalize', fontSize: '0.82rem' }}>
                          {l.leaveType} Leave ({l.numberOfDays} Day{l.numberOfDays > 1 ? 's' : ''})
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
          <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ fontSize: '0.88rem', fontWeight: '800', color: '#10b981', margin: 0 }}>
                Salary Slips & Disbursal History
              </h4>
            </div>

            {/* Bank wire info card */}
            <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '10px 14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px' }}>
              <div>
                <span style={{ fontSize: '0.64rem', fontWeight: '700', color: '#64748b', display: 'block', textTransform: 'uppercase' }}>
                  Bank Wire Account for Salary
                </span>
                <strong style={{ fontSize: '0.82rem', color: '#0f172a' }}>
                  {employee.bankDetails?.bankName || 'Bank Not Specified'} • A/C: {employee.bankDetails?.accountNumber || 'N/A'} • IFSC: {employee.bankDetails?.ifscCode || 'N/A'}
                </strong>
              </div>
              {employee.bankDetails?.upiId && (
                <span style={{ fontSize: '0.72rem', color: '#1e40af', background: '#eff6ff', padding: '2px 8px', borderRadius: '4px', fontWeight: '700' }}>
                  UPI: {employee.bankDetails.upiId}
                </span>
              )}
            </div>

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

                      {p.status !== 'paid' ? (
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedPayroll({
                              employeeId: employee._id,
                              payrollId: p._id,
                              employeeName: `${employee.firstName || ''} ${employee.lastName || ''}`.trim() || 'Staff Member',
                              employeeCode: employee.employeeCode || '',
                              departmentName: employee.departmentName,
                              roleName: employee.designation,
                              month: p.month,
                              monthName: `Month ${p.month}`,
                              year: p.year,
                              netSalary: p.netSalary
                            });
                            setIsDisburseOpen(true);
                          }}
                          style={{ padding: '5px 12px', background: '#10b981', color: '#ffffff', border: 'none', borderRadius: '4px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer' }}
                        >
                          Disburse Salary
                        </button>
                      ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '2px' }}>
                          <span style={{ fontSize: '0.7rem', color: '#10b981', fontWeight: '700' }}>
                            ✓ Disbursed ({p.paymentMethod === 'upi' ? 'UPI' : (p.paymentMethod ? p.paymentMethod.replace(/_/g, ' ') : 'Bank Transfer')})
                          </span>
                          {(p.paymentProof?.fileUrl || p.payslipUrl) && (
                            <a
                              href={p.paymentProof?.fileUrl || p.payslipUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              style={{ fontSize: '0.7rem', color: '#3b82f6', textDecoration: 'underline', fontWeight: '600' }}
                            >
                              View Slip / Proof
                            </a>
                          )}
                        </div>
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
      <DisburseSalaryModal
        isOpen={isDisburseOpen}
        onClose={() => {
          setIsDisburseOpen(false);
          setSelectedPayroll(null);
        }}
        payrollItem={selectedPayroll}
        onDisburse={onPaySalary}
      />
      <PrintableIDCardModal
        isOpen={isIDCardModalOpen}
        onClose={() => setIsIDCardModalOpen(false)}
        employee={employee}
      />
    </Modal>
  );
};
