import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { hrService } from '../../services/hrService.js';
import { sanitizeAlphabetsOnly, sanitizePhone, sanitizeEmail, sanitizeDigitsOnly, isValidEmail } from '../../utils/inputValidators.js';

export const NewEmployeeModal = ({ isOpen, onClose, onSubmit }) => {
  const [departments, setDepartments] = useState([]);
  const [allRoles, setAllRoles] = useState([]);
  const [departmentRoles, setDepartmentRoles] = useState([]);

  const [employeeCode, setEmployeeCode] = useState(`EMP-${Date.now().toString().slice(-4)}`);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [mobileNo, setMobileNo] = useState('');
  const [email, setEmail] = useState('');
  const [gender, setGender] = useState('male');
  const [bloodGroup, setBloodGroup] = useState('B+');
  const [workLocation, setWorkLocation] = useState('Head Office - Krishna Valley');
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [employmentType, setEmploymentType] = useState('full_time');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [initialSalary, setInitialSalary] = useState('');

  // Regulatory & Identity
  const [aadhaarNumber, setAadhaarNumber] = useState('');
  const [panNumber, setPanNumber] = useState('');
  const [uanNumber, setUanNumber] = useState('');

  // Bank Wire Details
  const [bankName, setBankName] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [ifscCode, setIfscCode] = useState('');

  // Address & Emergency
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [emergencyRel, setEmergencyRel] = useState('Family');

  useEffect(() => {
    if (isOpen) {
      hrService.getMaster().then((res) => {
        if (res.data) {
          const depts = res.data.departments || [];
          const rls = res.data.roles || [];
          setDepartments(depts);
          setAllRoles(rls);

          if (depts.length > 0) {
            const firstDept = depts[0];
            setDepartmentId(firstDept._id);

            const matchedRoles = rls.filter(
              (r) => r.departmentCode === firstDept.departmentCode ||
                     r.departmentName?.toLowerCase() === firstDept.departmentName?.toLowerCase()
            );
            const rolesToSet = matchedRoles.length > 0 ? matchedRoles : rls;
            setDepartmentRoles(rolesToSet);
            if (rolesToSet.length > 0) setRoleId(rolesToSet[0]._id);
          }
        }
      });
      setEmployeeCode(`EMP-${Date.now().toString().slice(-4)}`);
      setFirstName('');
      setLastName('');
      setMobileNo('');
      setEmail('');
      setBloodGroup('B+');
      setWorkLocation('Head Office - Krishna Valley');
      setAadhaarNumber('');
      setPanNumber('');
      setUanNumber('');
      setBankName('');
      setAccountNumber('');
      setIfscCode('');
      setCity('');
      setState('');
      setEmergencyName('');
      setEmergencyPhone('');
      setEmergencyRel('Family');
      setInitialSalary('');
    }
  }, [isOpen]);

  const handleDepartmentChange = (newDeptId) => {
    setDepartmentId(newDeptId);
    const selectedDept = departments.find((d) => d._id === newDeptId);
    if (selectedDept) {
      const matchedRoles = allRoles.filter(
        (r) => r.departmentCode === selectedDept.departmentCode ||
               r.departmentName?.toLowerCase() === selectedDept.departmentName?.toLowerCase()
      );
      const rolesToSet = matchedRoles.length > 0 ? matchedRoles : allRoles;
      setDepartmentRoles(rolesToSet);
      if (rolesToSet.length > 0) {
        setRoleId(rolesToSet[0]._id);
      } else {
        setRoleId('');
      }
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!firstName.trim() || !mobileNo.trim()) {
      alert('Please enter first name and phone number');
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

    onSubmit({
      employeeCode,
      firstName,
      lastName,
      mobileNo,
      email,
      gender,
      bloodGroup,
      workLocation,
      joiningDate,
      employmentType,
      departmentId,
      roleId,
      initialSalary: Number(initialSalary) || 0,
      idCardDetails: {
        aadhaarNumber: aadhaarNumber.trim(),
        panNumber: panNumber.trim().toUpperCase(),
        uanNumber: uanNumber.trim(),
        idCardIssued: true
      },
      bankDetails: {
        bankName: bankName.trim(),
        accountNumber: accountNumber.trim(),
        ifscCode: ifscCode.trim().toUpperCase(),
        accountHolderName: `${firstName} ${lastName || ''}`.trim()
      },
      address: { city, state, country: 'India' },
      emergencyContact: { name: emergencyName, relationship: emergencyRel, mobileNo: emergencyPhone }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Onboard new employee"
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        
        {/* Basic Identity */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Employee code *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                required
                className="form-card-input"
                value={employeeCode}
                onChange={(e) => setEmployeeCode(e.target.value)}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>First name *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                required
                placeholder="e.g. Vikram"
                className="form-card-input"
                value={firstName}
                onChange={(e) => setFirstName(sanitizeAlphabetsOnly(e.target.value))}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Last name</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. Chauhan"
                className="form-card-input"
                value={lastName}
                onChange={(e) => setLastName(sanitizeAlphabetsOnly(e.target.value))}
              />
            </div>
          </div>
        </div>

        {/* Contact & Demographics */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Mobile phone *</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="tel"
                required
                placeholder="e.g. 9876543210"
                className="form-card-input"
                value={mobileNo}
                onChange={(e) => setMobileNo(sanitizePhone(e.target.value))}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Email address</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="email"
                placeholder="e.g. vikram@example.com"
                className="form-card-input"
                value={email}
                onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Gender</span>
            </div>
            <div className="form-card-input-row">
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="form-card-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>
          </div>
        </div>

        {/* Department & Role */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Department *</span>
            </div>
            <div className="form-card-input-row">
              <select
                required
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="form-card-input"
                style={{ cursor: 'pointer' }}
              >
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.departmentName}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Designation / Role *</span>
            </div>
            <div className="form-card-input-row">
              <select
                required
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                className="form-card-input"
                style={{ cursor: 'pointer' }}
              >
                {departmentRoles.length === 0 ? (
                  <option value="">No roles defined</option>
                ) : (
                  departmentRoles.map((r) => (
                    <option key={r._id || r.roleCode} value={r._id}>
                      {r.roleName}
                    </option>
                  ))
                )}
              </select>
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Employment type</span>
            </div>
            <div className="form-card-input-row">
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                className="form-card-input"
                style={{ cursor: 'pointer' }}
              >
                <option value="full_time">Full-Time Staff</option>
                <option value="contract">Site Contract</option>
                <option value="intern">Intern / Trainee</option>
                <option value="part_time">Part-Time</option>
              </select>
            </div>
          </div>
        </div>

        {/* Salary & Location */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Base monthly salary</span>
              <span className="form-card-badge">Monthly</span>
            </div>
            <div className="form-card-input-row">
              <span style={{ color: '#64748b', fontWeight: '600' }}>₹</span>
              <input
                type="text"
                placeholder="e.g. 45000"
                className="form-card-input"
                value={initialSalary}
                onChange={(e) => setInitialSalary(sanitizeDigitsOnly(e.target.value))}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Work location</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. Head Office - Krishna Valley"
                className="form-card-input"
                value={workLocation}
                onChange={(e) => setWorkLocation(e.target.value)}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Joining date</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="date"
                className="form-card-input"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* KYC details */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Aadhaar number</span>
              <span className="form-card-badge">KYC</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="12-digit number"
                className="form-card-input"
                value={aadhaarNumber}
                onChange={(e) => setAadhaarNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>PAN number</span>
              <span className="form-card-badge">KYC</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="ABCDE1234F"
                className="form-card-input"
                value={panNumber}
                onChange={(e) => setPanNumber(e.target.value.toUpperCase())}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>UAN / PF number</span>
              <span className="form-card-badge">Optional</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="UAN number"
                className="form-card-input"
                value={uanNumber}
                onChange={(e) => setUanNumber(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Bank account */}
        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1.2fr 1fr', gap: '10px' }}>
          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Salary bank name</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. HDFC Bank, SBI"
                className="form-card-input"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>Account number</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="Account number"
                className="form-card-input"
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>
          </div>

          <div className="form-card-box">
            <div className="form-card-prompt">
              <span>IFSC code</span>
            </div>
            <div className="form-card-input-row">
              <input
                type="text"
                placeholder="e.g. HDFC0001234"
                className="form-card-input"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
              />
            </div>
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
            Onboard employee
          </button>
        </div>
      </form>
    </Modal>
  );
};
