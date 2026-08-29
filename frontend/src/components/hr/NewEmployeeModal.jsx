import React, { useState, useEffect } from 'react';
import { Modal } from '../common/Modal.jsx';
import { hrService } from '../../services/hrService.js';
import { User, Phone, Mail, Building2, Briefcase, DollarSign, Calendar } from 'lucide-react';
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
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().slice(0, 10));
  const [employmentType, setEmploymentType] = useState('full_time');
  const [departmentId, setDepartmentId] = useState('');
  const [roleId, setRoleId] = useState('');
  const [initialSalary, setInitialSalary] = useState(45000);

  // Address & Emergency
  const [city, setCity] = useState('Jaipur');
  const [state, setState] = useState('Rajasthan');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');

  // Initial Master Data Fetch
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

            // Filter roles for the first department
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
    }
  }, [isOpen]);

  // Dynamically filter roles whenever departmentId changes
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
      joiningDate,
      employmentType,
      departmentId,
      roleId,
      initialSalary: Number(initialSalary),
      address: { city, state, country: 'India' },
      emergencyContact: { name: emergencyName, mobileNo: emergencyPhone }
    });
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Onboard New Employee"
      maxWidth="680px"
    >
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1.2fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Emp Code *</label>
            <input
              type="text"
              required
              value={employeeCode}
              onChange={(e) => setEmployeeCode(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>First Name * (Alphabets only)</label>
            <input
              type="text"
              required
              placeholder="e.g. Vikram"
              value={firstName}
              onChange={(e) => setFirstName(sanitizeAlphabetsOnly(e.target.value))}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Last Name (Alphabets only)</label>
            <input
              type="text"
              placeholder="e.g. Chauhan"
              value={lastName}
              onChange={(e) => setLastName(sanitizeAlphabetsOnly(e.target.value))}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.2fr 1fr', gap: '10px' }}>
          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Mobile Phone * (Numbers only)</label>
            <input
              type="tel"
              required
              placeholder="+91 98765 43210"
              value={mobileNo}
              onChange={(e) => setMobileNo(sanitizePhone(e.target.value))}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Email</label>
            <input
              type="email"
              placeholder="vikram@krishnavalley.com"
              value={email}
              onChange={(e) => setEmail(sanitizeEmail(e.target.value))}
              style={{ width: '100%', fontSize: '0.8rem' }}
            />
          </div>

          <div>
            <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Gender</label>
            <select
              value={gender}
              onChange={(e) => setGender(e.target.value)}
              style={{ width: '100%', fontSize: '0.8rem' }}
            >
              <option value="male">Male</option>
              <option value="female">Female</option>
              <option value="other">Other</option>
            </select>
          </div>
        </div>

        {/* Organizational Position */}
        <div className="glass-panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <h4 style={{ fontSize: '0.85rem', fontWeight: '800', color: '#111827' }}>Organizational Placement & Compensation</h4>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px', fontWeight: '700' }}>Department *</label>
              <select
                required
                value={departmentId}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem', borderColor: '#1a73e8' }}
              >
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>
                    {d.departmentName} ({d.departmentCode})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px', fontWeight: '700' }}>
                Designation / Role * ({departmentRoles.length} available)
              </label>
              <select
                required
                value={roleId}
                onChange={(e) => setRoleId(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem' }}
              >
                {departmentRoles.length === 0 ? (
                  <option value="">No roles defined for this department</option>
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

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Employment Type</label>
              <select
                value={employmentType}
                onChange={(e) => setEmploymentType(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem' }}
              >
                <option value="full_time">Full-Time Staff</option>
                <option value="contract">Site Contract</option>
                <option value="intern">Intern / Trainee</option>
                <option value="part_time">Part-Time</option>
              </select>
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Joining Date</label>
              <input
                type="date"
                value={joiningDate}
                onChange={(e) => setJoiningDate(e.target.value)}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>

            <div>
              <label style={{ fontSize: '0.72rem', color: '#374151', display: 'block', marginBottom: '2px' }}>Base Monthly Salary (₹, Numbers only)</label>
              <input
                type="text"
                value={initialSalary}
                onChange={(e) => setInitialSalary(sanitizeDigitsOnly(e.target.value))}
                style={{ width: '100%', fontSize: '0.8rem' }}
              />
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
          <button type="button" onClick={onClose} style={{ padding: '7px 14px', background: '#f8f9fa', color: '#374151', borderRadius: '4px' }}>
            Cancel
          </button>
          <button type="submit" style={{ padding: '7px 18px', background: 'linear-gradient(135deg, #10b981, #059669)', color: '#111827', fontWeight: '700', borderRadius: '4px', cursor: 'pointer' }}>
            Onboard Employee
          </button>
        </div>
      </form>
    </Modal>
  );
};
