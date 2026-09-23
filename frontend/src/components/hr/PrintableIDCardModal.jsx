import React, { useState } from 'react';
import { Printer, X, ShieldCheck, Building2, Phone, Heart, Calendar, MapPin, Award, CheckCircle2, RotateCw } from 'lucide-react';

export const PrintableIDCardModal = ({ isOpen, onClose, employee }) => {
  const [viewMode, setViewMode] = useState('both'); // 'both' | 'front' | 'back'

  if (!isOpen || !employee) return null;

  const handlePrint = () => {
    window.print();
  };

  const getInitials = (firstName = '', lastName = '') => {
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || 'KV';
  };

  const deptName = employee.departmentName || employee.departmentId?.departmentName || employee.departmentId?.name || employee.department || 'Civil & Structural Engineering';
  const roleName = employee.designation || employee.roleName || employee.roleId?.roleName || employee.roleId?.name || employee.role || 'Senior Site Engineer';
  const blood = employee.bloodGroup || 'B+';
  const phone = employee.mobileNo || employee.phone || 'N/A';
  const empCode = employee.employeeCode || 'KV-EMP-001';
  const workLoc = employee.workLocation || 'Site Office - Krishna Valley';
  const emergencyName = employee.emergencyContact?.name || 'Emergency Helpline';
  const emergencyPhone = employee.emergencyContact?.mobileNo || '+91 98765 00000';
  const emergencyRel = employee.emergencyContact?.relationship || 'Contact';

  const issueDateStr = employee.idCardDetails?.issueDate
    ? new Date(employee.idCardDetails.issueDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : employee.joiningDate
    ? new Date(employee.joiningDate).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'Apr 2024';

  const validUntilStr = employee.idCardDetails?.validUntil
    ? new Date(employee.idCardDetails.validUntil).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })
    : 'Mar 2027';

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(15, 23, 42, 0.75)',
        backdropFilter: 'blur(5px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          backgroundColor: '#ffffff',
          borderRadius: '16px',
          width: '100%',
          maxWidth: '860px',
          maxHeight: '94vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
          overflow: 'hidden'
        }}
      >
        {/* Top Control Bar (Hidden on print) */}
        <div
          className="no-print"
          style={{
            padding: '14px 20px',
            backgroundColor: '#0f172a',
            color: '#ffffff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderBottom: '1px solid #1e293b'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ padding: '6px', borderRadius: '6px', background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa' }}>
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3 style={{ fontSize: '0.98rem', fontWeight: '800', margin: 0, color: '#f8fafc' }}>
                Official Staff Identity Card
              </h3>
              <p style={{ fontSize: '0.74rem', color: '#94a3b8', margin: 0 }}>
                {employee.firstName} {employee.lastName} • {empCode} • {deptName}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            {/* View Selector */}
            <div style={{ display: 'flex', background: '#1e293b', padding: '3px', borderRadius: '6px' }}>
              {[
                { id: 'both', label: 'Front & Back' },
                { id: 'front', label: 'Front Only' },
                { id: 'back', label: 'Back Only' }
              ].map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => setViewMode(m.id)}
                  style={{
                    padding: '4px 10px',
                    fontSize: '0.72rem',
                    fontWeight: viewMode === m.id ? '700' : '500',
                    color: viewMode === m.id ? '#ffffff' : '#94a3b8',
                    background: viewMode === m.id ? '#2563eb' : 'transparent',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: 'pointer'
                  }}
                >
                  {m.label}
                </button>
              ))}
            </div>

            <button
              type="button"
              onClick={handlePrint}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 14px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                border: 'none',
                borderRadius: '6px',
                fontWeight: '700',
                fontSize: '0.78rem',
                cursor: 'pointer',
                boxShadow: '0 2px 4px rgba(16, 185, 129, 0.3)'
              }}
            >
              <Printer size={14} /> Print ID Card
            </button>

            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '6px',
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                border: 'none',
                color: '#94a3b8',
                borderRadius: '6px',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* Printable Area */}
        <div
          id="idCardPrintSection"
          style={{
            padding: '32px 24px',
            backgroundColor: '#f1f5f9',
            overflowY: 'auto',
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            minHeight: '440px'
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: '28px',
              justifyContent: 'center',
              alignItems: 'center',
              flexWrap: 'wrap'
            }}
          >
            {/* ================= CARD FRONT ================= */}
            {(viewMode === 'both' || viewMode === 'front') && (
              <div
                style={{
                  width: '320px',
                  height: '500px',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.15)',
                  border: '1px solid #cbd5e1',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
                }}
              >
                {/* Lanyard Slot Hole Simulation */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '36px',
                    height: '8px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    zIndex: 10
                  }}
                />

                {/* Card Header */}
                <div
                  style={{
                    background: 'linear-gradient(135deg, #1e3a8a 0%, #1e40af 50%, #0369a1 100%)',
                    color: '#ffffff',
                    padding: '24px 16px 14px',
                    textAlign: 'center',
                    borderBottom: '3px solid #f59e0b',
                    position: 'relative'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', marginBottom: '2px' }}>
                    <Building2 size={16} color="#fbbf24" />
                    <span style={{ fontSize: '0.92rem', fontWeight: '900', letterSpacing: '0.8px', color: '#ffffff' }}>
                      KRISHNA VALLEY
                    </span>
                  </div>
                  <div style={{ fontSize: '0.62rem', letterSpacing: '1.2px', textTransform: 'uppercase', color: '#93c5fd', fontWeight: '700' }}>
                    REAL ESTATE & INFRASTRUCTURE
                  </div>
                  <div style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    fontSize: '0.6rem',
                    background: 'rgba(255, 255, 255, 0.18)',
                    color: '#fef08a',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontWeight: '800',
                    letterSpacing: '0.5px'
                  }}>
                    STAFF IDENTITY CARD
                  </div>
                </div>

                {/* Employee Photo & Identification */}
                <div style={{ padding: '16px 16px 10px', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                  {/* Photo Container */}
                  <div
                    style={{
                      width: '88px',
                      height: '88px',
                      borderRadius: '50%',
                      padding: '3px',
                      background: 'linear-gradient(135deg, #1e40af, #f59e0b)',
                      boxShadow: '0 4px 12px rgba(30, 64, 175, 0.25)',
                      marginBottom: '10px',
                      position: 'relative'
                    }}
                  >
                    {employee.idCardDetails?.photoUrl ? (
                      <img
                        src={employee.idCardDetails.photoUrl}
                        alt="Staff"
                        style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                      />
                    ) : (
                      <div
                        style={{
                          width: '100%',
                          height: '100%',
                          borderRadius: '50%',
                          background: 'linear-gradient(135deg, #0284c7, #1e3a8a)',
                          color: '#ffffff',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.5rem',
                          fontWeight: '800'
                        }}
                      >
                        {getInitials(employee.firstName, employee.lastName)}
                      </div>
                    )}
                    <span
                      style={{
                        position: 'absolute',
                        bottom: '2px',
                        right: '2px',
                        background: '#10b981',
                        borderRadius: '50%',
                        width: '18px',
                        height: '18px',
                        border: '2px solid #ffffff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                    >
                      <CheckCircle2 size={10} color="#ffffff" />
                    </span>
                  </div>

                  {/* Name & Title */}
                  <h4 style={{ fontSize: '1.05rem', fontWeight: '800', color: '#0f172a', margin: '0 0 2px' }}>
                    {employee.firstName} {employee.lastName}
                  </h4>
                  <div style={{ fontSize: '0.74rem', fontWeight: '700', color: '#1d4ed8' }}>
                    {roleName}
                  </div>
                  <div style={{ fontSize: '0.66rem', color: '#64748b', fontWeight: '600', marginTop: '1px' }}>
                    {deptName}
                  </div>

                  {/* Employee Code Badge */}
                  <div
                    style={{
                      marginTop: '8px',
                      padding: '3px 12px',
                      backgroundColor: '#eff6ff',
                      border: '1px solid #bfdbfe',
                      borderRadius: '12px',
                      fontSize: '0.74rem',
                      fontWeight: '800',
                      color: '#1e40af',
                      letterSpacing: '0.5px'
                    }}
                  >
                    EMP ID: {empCode}
                  </div>
                </div>

                {/* Details Grid */}
                <div
                  style={{
                    padding: '8px 16px',
                    margin: '0 12px',
                    backgroundColor: '#ffffff',
                    borderRadius: '8px',
                    border: '1px solid #e2e8f0',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '8px 12px',
                    fontSize: '0.68rem'
                  }}
                >
                  <div>
                    <span style={{ color: '#64748b', fontWeight: '600', display: 'block', fontSize: '0.62rem' }}>BLOOD GROUP</span>
                    <strong style={{ color: '#b91c1c', fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '3px' }}>
                      <Heart size={10} fill="#b91c1c" /> {blood}
                    </strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontWeight: '600', display: 'block', fontSize: '0.62rem' }}>PHONE NO.</span>
                    <strong style={{ color: '#0f172a' }}>{phone}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontWeight: '600', display: 'block', fontSize: '0.62rem' }}>ISSUED ON</span>
                    <strong style={{ color: '#0f172a' }}>{issueDateStr}</strong>
                  </div>

                  <div>
                    <span style={{ color: '#64748b', fontWeight: '600', display: 'block', fontSize: '0.62rem' }}>VALID TILL</span>
                    <strong style={{ color: '#047857' }}>{validUntilStr}</strong>
                  </div>
                </div>

                {/* Footer Strip */}
                <div
                  style={{
                    marginTop: 'auto',
                    backgroundColor: '#f8fafc',
                    borderTop: '1px solid #e2e8f0',
                    padding: '8px 14px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <MapPin size={11} color="#64748b" />
                    <span style={{ fontSize: '0.62rem', color: '#64748b', fontWeight: '600', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {workLoc}
                    </span>
                  </div>

                  <div style={{ textAlign: 'right' }}>
                    <span style={{ fontSize: '0.58rem', color: '#94a3b8', display: 'block', fontWeight: '600' }}>AUTHORIZED</span>
                    <span style={{ fontSize: '0.68rem', fontWeight: '800', color: '#1e3a8a', fontStyle: 'italic' }}>KV-HRD</span>
                  </div>
                </div>
              </div>
            )}

            {/* ================= CARD BACK ================= */}
            {(viewMode === 'both' || viewMode === 'back') && (
              <div
                style={{
                  width: '320px',
                  height: '500px',
                  backgroundColor: '#ffffff',
                  borderRadius: '16px',
                  boxShadow: '0 12px 30px -8px rgba(0, 0, 0, 0.15)',
                  border: '1px solid #cbd5e1',
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                  position: 'relative',
                  background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)'
                }}
              >
                {/* Lanyard Slot Hole */}
                <div
                  style={{
                    position: 'absolute',
                    top: '8px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '36px',
                    height: '8px',
                    backgroundColor: '#e2e8f0',
                    borderRadius: '4px',
                    border: '1px solid #cbd5e1',
                    zIndex: 10
                  }}
                />

                {/* Back Header */}
                <div
                  style={{
                    background: '#0f172a',
                    color: '#ffffff',
                    padding: '24px 16px 12px',
                    textAlign: 'center',
                    borderBottom: '2px solid #3b82f6'
                  }}
                >
                  <div style={{ fontSize: '0.78rem', fontWeight: '800', letterSpacing: '0.5px' }}>
                    KRISHNA VALLEY DEVELOPERS
                  </div>
                  <div style={{ fontSize: '0.62rem', color: '#94a3b8' }}>
                    TERMS & REGULATORY INSTRUCTIONS
                  </div>
                </div>

                <div style={{ padding: '14px 16px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {/* Terms List */}
                  <div style={{ fontSize: '0.64rem', color: '#334155', lineHeight: '1.4', background: '#f8fafc', padding: '10px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ fontWeight: '800', color: '#0f172a', marginBottom: '4px' }}>Cardholder Guidelines:</div>
                    <ul style={{ margin: 0, paddingLeft: '14px' }}>
                      <li>This credential is the property of Krishna Valley Real Estate Developers Pvt. Ltd.</li>
                      <li>Must be displayed visibly on all project construction sites and client offices.</li>
                      <li>In case of loss, notify HR immediately at hr@krishnavalley.com.</li>
                      <li>Surrender this badge upon separation from the company.</li>
                    </ul>
                  </div>

                  {/* Emergency Contact */}
                  <div
                    style={{
                      background: '#fef2f2',
                      border: '1px solid #fecaca',
                      padding: '8px 10px',
                      borderRadius: '8px',
                      fontSize: '0.68rem'
                    }}
                  >
                    <span style={{ fontSize: '0.6rem', color: '#b91c1c', fontWeight: '800', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '4px' }}>
                      <Phone size={10} /> IN EMERGENCY NOTIFY:
                    </span>
                    <div style={{ fontWeight: '800', color: '#0f172a', marginTop: '2px' }}>
                      {emergencyName} ({emergencyRel})
                    </div>
                    <div style={{ color: '#b91c1c', fontWeight: '700' }}>
                      {emergencyPhone}
                    </div>
                  </div>

                  {/* Registered Address */}
                  <div style={{ fontSize: '0.62rem', color: '#64748b', lineHeight: '1.3' }}>
                    <strong>Corporate Headquarters:</strong>
                    <div>Krishna Valley City Center, NH-19, Mathura-Vrindavan Highway, Uttar Pradesh - 281001</div>
                    <div style={{ marginTop: '2px' }}>Phone: +91 98765 43210 • info@krishnavalley.com</div>
                  </div>

                  {/* Barcode / QR Simulation */}
                  <div
                    style={{
                      marginTop: '6px',
                      padding: '8px',
                      background: '#ffffff',
                      border: '1px solid #cbd5e1',
                      borderRadius: '6px',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    {/* Barcode lines */}
                    <div style={{ display: 'flex', gap: '2px', height: '26px', alignItems: 'center' }}>
                      {[2, 1, 3, 1, 2, 4, 1, 2, 3, 2, 1, 3, 2, 4, 1, 2, 1, 3, 2, 1, 4, 2, 1, 3, 1, 2].map((w, i) => (
                        <div key={i} style={{ width: `${w}px`, height: '100%', backgroundColor: '#0f172a' }} />
                      ))}
                    </div>
                    <span style={{ fontSize: '0.58rem', fontWeight: '800', color: '#475569', letterSpacing: '2px' }}>
                      *{empCode}*
                    </span>
                  </div>
                </div>

                {/* Footer Stamp */}
                <div
                  style={{
                    marginTop: 'auto',
                    backgroundColor: '#0f172a',
                    color: '#94a3b8',
                    padding: '8px 14px',
                    fontSize: '0.6rem',
                    textAlign: 'center'
                  }}
                >
                  Authorized Signatory • Human Resources & Security Administration
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Print Styles */}
        <style>
          {`
            @media print {
              body * {
                visibility: hidden;
              }
              #idCardPrintSection, #idCardPrintSection * {
                visibility: visible;
              }
              #idCardPrintSection {
                position: absolute;
                left: 0;
                top: 0;
                width: 100%;
                background: white !important;
                padding: 10mm !important;
              }
              .no-print {
                display: none !important;
              }
            }
          `}
        </style>
      </div>
    </div>
  );
};
