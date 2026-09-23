import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { hrService } from '../../services/hrService.js';
import { User, Phone, Mail, Building2, Briefcase, DollarSign, Calendar, ShieldCheck, HeartHandshake } from 'lucide-react';
import { isValidEmail } from '../../utils/inputValidators.js';

export const EditEmployeeModal = ({ isOpen, onClose, employee, onUpdated, masterData }) => {
  const [departments, setDepartments] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [departmentRoles, setDepartmentRoles] = useState([]);

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('male');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [workLocation, setWorkLocation] = useState('Head Office - Krishna Valley');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [joiningDate, setJoiningDate] = useState('');
  const [employmentType, setEmploymentType] = useState('full_time');
  const [employmentStatus, setEmploymentStatus] = useState('active');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [basicSalary, setBasicSalary] = useState('');
  const [allowances, setAllowances] = useState('');
  const [deductions, setDeductions] = useState('');

  // Regulatory & Identity
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [uanNumber, setUanNumber] = useState('');
  const [esiNumber, setEsiNumber] = useState('');

  // Bank Wire Details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [upiId, setUpiId] = useState('');

  // Leave Quotas
  const [clTotal, setClTotal] = useState(12);
  const [slTotal, setSlTotal] = useState(10);
  const [elTotal, setElTotal] = useState(15);

  // Address & Emergency Contact
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyRelationship, setEmergencyRelationship] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (masterData) {
      setDepartments(masterData.departments || []);
      setAllRoles(masterData.roles || []);
    }
  }, [masterData]);

  useEffect(() => {
    if (isOpen && employee) {
      setFirstName(employee.firstName || '');
      setLastName(employee.lastName || '');
      setMobileNo(employee.mobileNo || employee.phone || '');
      setEmail(employee.email || '');
      setGender(employee.gender || 'male');
      setBloodGroup(employee.bloodGroup || 'B+');
      setWorkLocation(employee.workLocation || 'Head Office - Krishna Valley');
      setDateOfBirth(employee.dateOfBirth ? new Date(employee.dateOfBirth).toISOString().slice(0, 10) : '');
      setJoiningDate(employee.joiningDate ? new Date(employee.joiningDate).toISOString().slice(0, 10) : '');
      setEmploymentType(employee.employmentType || 'full_time');
      setEmploymentStatus(employee.employmentStatus || 'active');

      const deptId = employee.departmentId?._id || employee.departmentId || '';
      const rId = employee.roleId?._id || employee.roleId || '';
      setDepartmentId(deptId);
      setRoleId(rId);

      const basic = employee.salaryStructure?.basicSalary || 45000;
      const allow = employee.salaryStructure?.allowances !== undefined ? employee.salaryStructure.allowances : Math.round(basic * 0.25);
      const ded = employee.salaryStructure?.deductions !== undefined ? employee.salaryStructure.deductions : 0;
      setBasicSalary(basic);
      setAllowances(allow);
      setDeductions(ded);

      setAadhaarNumber(employee.idCardDetails?.aadhaarNumber || '');
      setPanNumber(employee.idCardDetails?.panNumber || '');
      setUanNumber(employee.idCardDetails?.uanNumber || '');
      setEsiNumber(employee.idCardDetails?.esiNumber || '');

      setBankName(employee.bankDetails?.bankName || '');
      setAccountNumber(employee.bankDetails?.accountNumber || '');
      setIfscCode(employee.bankDetails?.ifscCode || '');
      setUpiId(employee.bankDetails?.upiId || '');

      setClTotal(employee.leaveBalance?.casualLeave?.total !== undefined ? employee.leaveBalance.casualLeave.total : 12);
      setSlTotal(employee.leaveBalance?.sickLeave?.total !== undefined ? employee.leaveBalance.sickLeave.total : 10);
      setElTotal(employee.leaveBalance?.earnedLeave?.total !== undefined ? employee.leaveBalance.earnedLeave.total : 15);

      setCity(employee.address?.city || '');
      setState(employee.address?.state || '');
      setEmergencyName(employee.emergencyContact?.name || '');
      setEmergencyRelationship(employee.emergencyContact?.relationship || '');
      setEmergencyPhone(employee.emergencyContact?.mobileNo || '');

      // Populate department roles
      const depts = masterData?.departments || [];
      const rls = masterData?.roles || [];
      const selectedDept = depts.find((d) => d._id?.toString() === deptId?.toString());
      if (selectedDept) {
        const matched = rls.filter(
          (r) => r.departmentCode === selectedDept.departmentCode ||
                 r.departmentName?.toLowerCase() === selectedDept.departmentName?.toLowerCase()
        );
        setDepartmentRoles(matched.length > 0 ? matched : rls);
      } else {
        setDepartmentRoles(rls);
      }
    }
  }, [isOpen, employee, masterData]);

  const handleDepartmentChange = (newDeptId) => {
    setDepartmentId(newDeptId);
    const depts = masterData?.departments || departments;
    const rls = masterData?.roles || allRoles;
    const selectedDept = depts.find((d) => d._id?.toString() === newDeptId?.toString());
    if (selectedDept) {
      const matched = rls.filter(
        (r) => r.departmentCode === selectedDept.departmentCode ||
               r.departmentName?.toLowerCase() === selectedDept.departmentName?.toLowerCase()
      );
      const rolesToSet = matched.length > 0 ? matched : rls;
      setDepartmentRoles(rolesToSet);
      if (rolesToSet.length > 0) {
        setRoleId(rolesToSet[0]._id);
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!firstName.trim() || !mobileNo.trim()) {
      alert('First name and mobile number are required.');
      return;
    }

    if (mobileNo.replace(/\D/g, '').length < 10) {
      alert('Mobile number must have at least 10 numeric digits');
      return;
    }

    if (email && !isValidEmail(email)) {
      alert('Please enter a valid email address');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        firstName,
        lastName,
        mobileNo,
        email,
        gender,
        bloodGroup,
        workLocation,
        dateOfBirth: dateOfBirth || undefined,
        joiningDate: joiningDate || undefined,
        employmentType,
        employmentStatus,
        departmentId,
        roleId,
        salaryStructure: {
          basicSalary: Number(basicSalary) || 0,
          allowances: Number(allowances) || 0,
          deductions: Number(deductions) || 0
        },
        idCardDetails: {
          aadhaarNumber: aadhaarNumber.trim(),
          panNumber: panNumber.trim().toUpperCase(),
          uanNumber: uanNumber.trim(),
          esiNumber: esiNumber.trim(),
          idCardIssued: true
        },
        bankDetails: {
          bankName: bankName.trim(),
          accountNumber: accountNumber.trim(),
          ifscCode: ifscCode.trim().toUpperCase(),
          upiId: upiId.trim(),
          accountHolderName: `${firstName} ${lastName || ''}`.trim()
        },
        leaveBalance: {
          casualLeave: { total: Number(clTotal) },
          sickLeave: { total: Number(slTotal) },
          earnedLeave: { total: Number(elTotal) }
        },
        address: { city, state, country: 'India' },
        emergencyContact: {
          name: emergencyName,
          relationship: emergencyRelationship,
          mobileNo: emergencyPhone
        }
      };

      const res = await hrService.updateEmployee(employee._id || employee.id, payload);
      alert(res.message || 'Employee profile updated successfully!');
      onUpdated(res.data);
      onClose();
    } catch (err) {
      alert(err.message || 'Failed to update employee');
    } finally {
      setSaving(false);
    }
  };

  if (!employee) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit Employee: ${employee.firstName} ${employee.lastName} (${employee.employeeCode})`}
      maxWidth="760px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
        
        {/* Section 1: Basic Identity */}
        <div>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <User size={14} /> Personal & Contact Information
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>First Name *</label>
              <input
                type="text"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Last Name</label>
              <input
                type="text"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Mobile Phone Number *</label>
              <input
                type="text"
                value={mobileNo}
                onChange={(e) => setMobileNo(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Corporate / Personal Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Gender</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#b91c1c', marginBottom: '4px' }}>Blood Group</label>
              <select
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #fca5a5', fontSize: '0.85rem', background: '#fff', fontWeight: '700', color: '#b91c1c' }}
              >
                {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map((bg) => (
                  <option key={bg} value={bg}>{bg}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2: Department & Designation */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Building2 size={14} /> Department, Role & Placement
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Department *</label>
              <select
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}
              >
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.departmentName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Designation / Job Role *</label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                required
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}
              >
                {departmentRoles.map((r) => (
                  <option key={r._id} value={r._id}>{r.roleName}</option>
                ))}
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff' }}
              >
                <option value="full_time">Full Time Permanent</option>
                <option value="part_time">Part Time</option>
                <option value="contract">Contract / Retainer</option>
                <option value="temporary">Temporary / Site Labour</option>
                <option value="intern">Intern</option>
              </select>
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Employment Status</label>
              <select
                value={employmentStatus}
                onChange={(e) => setEmploymentStatus(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', background: '#fff', fontWeight: '700', color: employmentStatus === 'active' ? '#137333' : '#c5221f' }}
              >
                <option value="active">Active (On-Roll)</option>
                <option value="on_leave">On Leave</option>
                <option value="suspended">Suspended</option>
                <option value="resigned">Resigned / Notice Period</option>
                <option value="terminated">Terminated</option>
              </select>
            </div>
            <div style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Work Location / Assigned Site Office</label>
              <input
                type="text"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
                placeholder="e.g. Tower A Site Office, Vrindavan Highway"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2B: ID & Regulatory Identification */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <ShieldCheck size={14} /> Staff ID & Government Identity Proofs
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Aadhaar Number (12 Digits)</label>
              <input
                type="text"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
                placeholder="xxxx xxxx xxxx"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>PAN Card Number</label>
              <input
                type="text"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
                placeholder="ABCDE1234F"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>UAN / PF Number</label>
              <input
                type="text"
                value={uanNumber}
                onChange={(e) => setUanNumber(e.target.value)}
                placeholder="UAN Number"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>ESI Number</label>
              <input
                type="text"
                value={esiNumber}
                onChange={(e) => setEsiNumber(e.target.value)}
                placeholder="ESI Number"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2C: Bank Details */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={14} /> Bank Account & Wire Details
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Bank Name</label>
              <input
                type="text"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                placeholder="e.g. HDFC Bank, SBI"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Account Number</label>
              <input
                type="text"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                placeholder="Account number"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>IFSC Code</label>
              <input
                type="text"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                placeholder="HDFC0001234"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>UPI ID</label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="user@upi"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Section 2D: Annual Leave Quotas (HR Managed) */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Calendar size={14} /> Annual Leave Quotas (HR Managed)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Casual Leave Quota (CL)</label>
              <input
                type="number"
                value={clTotal}
                onChange={(e) => setClTotal(e.target.value)}
                min="0"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', fontWeight: '700' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Sick Leave Quota (SL)</label>
              <input
                type="number"
                value={slTotal}
                onChange={(e) => setSlTotal(e.target.value)}
                min="0"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', fontWeight: '700' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Earned / Privilege Leave (EL)</label>
              <input
                type="number"
                value={elTotal}
                onChange={(e) => setElTotal(e.target.value)}
                min="0"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', fontWeight: '700' }}
              />
            </div>
          </div>
        </div>

        {/* Section 3: Salary Structure */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <DollarSign size={14} /> Monthly Salary Structure (INR)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Basic Monthly Salary (₹)</label>
              <input
                type="number"
                value={basicSalary}
                onChange={(e) => {
                  const b = Number(e.target.value);
                  setBasicSalary(e.target.value);
                  setAllowances(Math.round(b * 0.25));
                }}
                min="0"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem', fontWeight: '700' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Allowances / HRA (₹)</label>
              <input
                type="number"
                value={allowances}
                onChange={(e) => setAllowances(e.target.value)}
                min="0"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Standard Deductions (₹)</label>
              <input
                type="number"
                value={deductions}
                onChange={(e) => setDeductions(e.target.value)}
                min="0"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Section 4: Location & Emergency Contact */}
        <div style={{ borderTop: '1px solid #e5e7eb', paddingTop: '12px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#1a73e8', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
            <HeartHandshake size={14} /> Location & Emergency Contact
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>City</label>
              <input
                type="text"
                value={city}
                onChange={(e) => setCity(e.target.value)}
                placeholder="e.g. Mathura / Vrindavan"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>State</label>
              <input
                type="text"
                value={state}
                onChange={(e) => setState(e.target.value)}
                placeholder="e.g. Uttar Pradesh"
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Emergency Contact Name</label>
              <input
                type="text"
                value={emergencyName}
                onChange={(e) => setEmergencyName(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: '700', color: '#374151', marginBottom: '4px' }}>Emergency Contact Mobile</label>
              <input
                type="text"
                value={emergencyPhone}
                onChange={(e) => setEmergencyPhone(e.target.value)}
                style={{ width: '100%', padding: '8px 10px', borderRadius: '6px', border: '1px solid #d1d5db', fontSize: '0.85rem' }}
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', borderTop: '1px solid #e5e7eb', paddingTop: '14px', marginTop: '6px' }}>
          <button
            type="button"
            onClick={onClose}
            style={{ padding: '8px 16px', borderRadius: '6px', border: '1px solid #d1d5db', background: '#ffffff', fontSize: '0.85rem', fontWeight: '600', cursor: 'pointer', color: '#4b5563' }}
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={saving}
            style={{ padding: '8px 20px', borderRadius: '6px', border: 'none', background: '#1a73e8', color: '#ffffff', fontSize: '0.85rem', fontWeight: '700', cursor: 'pointer' }}
          >
            {saving ? 'Saving...' : 'Update Employee Profile'}
          </button>
        </div>

      </form>
    </Modal>
  );
};
