import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Building2,
  Lock,
  Mail,
  Eye,
  EyeOff,
  ArrowRight,
  AlertCircle,
  CheckCircle2,
  Users,
  Briefcase,
  DollarSign,
  Wrench,
  Loader2,
  Target,
  BarChart3,
  Sparkles,
  ShieldCheck,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export const LoginPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeDemoRole, setActiveDemoRole] = useState(null);
  const [showQuickRoles, setShowQuickRoles] = useState(false);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your email/username and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const userRes = await login(identifier.trim(), password);
      setSuccessMessage('Authentication successful! Opening Krishna Valley ERP...');
      const roleCode = userRes?.role?.roleCode || userRes?.user?.role?.roleCode;
      const targetPath = roleCode === 'agent'
        ? '/agent-portal'
        : (roleCode === 'hr_manager' && from === '/dashboard'
          ? '/hr'
          : (roleCode === 'taskforce_manager' && from === '/dashboard'
            ? '/taskforce-dashboard'
            : from));
      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 400);
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (username, pass, roleLabel) => {
    if (loading) return;
    setActiveDemoRole(roleLabel);
    setIdentifier(username);
    setPassword(pass);
    setErrorMessage('');
    setSuccessMessage('');
    setLoading(true);

    try {
      const userRes = await login(username, pass);
      setSuccessMessage(`Signed in as ${roleLabel}! Redirecting...`);
      const roleCode = userRes?.role?.roleCode || userRes?.user?.role?.roleCode;
      const targetPath = roleCode === 'agent'
        ? '/agent-portal'
        : (roleCode === 'hr_manager' && from === '/dashboard'
          ? '/hr'
          : (roleCode === 'taskforce_manager' && from === '/dashboard'
            ? '/taskforce-dashboard'
            : from));
      setTimeout(() => {
        navigate(targetPath, { replace: true });
      }, 400);
    } catch (err) {
      setErrorMessage(err.message || 'Demo login failed. Ensure the server is running.');
      setLoading(false);
      setActiveDemoRole(null);
    }
  };

  const demoAccounts = [
    { label: 'Super Admin', username: 'admin', pass: 'Admin@12345', icon: ShieldCheck, role: 'admin' },
    { label: 'Taskforce Manager', username: 'taskforce_mgr', pass: 'Taskforce@12345', icon: Target, role: 'taskforce_manager' },
    { label: 'Sales Head', username: 'sales_head', pass: 'Sales@12345', icon: Users, role: 'sales_head' },
    { label: 'Agent Partner', username: 'agent_rahul', pass: 'Agent@12345', icon: Sparkles, role: 'agent' },
    { label: 'Site Engineer', username: 'site_eng', pass: 'Site@12345', icon: Wrench, role: 'site_engineer' },
    { label: 'HR Manager', username: 'hr_manager', pass: 'Hr@12345', icon: Briefcase, role: 'hr_manager' },
    { label: 'Accounts Head', username: 'accounts_head', pass: 'Accounts@12345', icon: DollarSign, role: 'accounts_head' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundImage: 'url(/login-bg.jpg)',
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        boxSizing: 'border-box',
        fontFamily: "'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        overflowX: 'hidden',
      }}
    >
      {/* Subtle overlay to enhance contrast and readability */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: 'linear-gradient(to right, rgba(255, 255, 255, 0.08) 0%, rgba(0, 0, 0, 0.05) 50%, rgba(0, 0, 0, 0.15) 100%)',
          pointerEvents: 'none',
        }}
      />

      {/* Main Container */}
      <div
        style={{
          width: '100%',
          maxWidth: '1240px',
          minHeight: '100vh',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '40px 48px',
          boxSizing: 'border-box',
          position: 'relative',
          zIndex: 1,
          gap: '40px',
        }}
        className="login-container-responsive"
      >
        {/* Left Hero Section: Headline, Curved Underline, Value Props */}
        <div
          style={{
            flex: '1 1 540px',
            maxWidth: '580px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
          className="login-hero-left"
        >
          {/* Top Pill Badge */}
          <div style={{ marginBottom: '22px' }}>
            <span
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '7px 16px',
                borderRadius: '30px',
                backgroundColor: 'rgba(30, 95, 95, 0.88)',
                backdropFilter: 'blur(8px)',
                color: '#ffffff',
                fontSize: '0.82rem',
                fontWeight: '600',
                letterSpacing: '0.01em',
                boxShadow: '0 4px 14px rgba(0, 0, 0, 0.18)',
              }}
            >
              <Building2 size={15} color="#ffffff" />
              <span>Krishna Valley ERP</span>
            </span>
          </div>

          {/* Large Bold Headline */}
          <div style={{ marginBottom: '16px' }}>
            <h1
              style={{
                fontSize: 'clamp(2.4rem, 4.2vw, 3.4rem)',
                fontWeight: '800',
                lineHeight: 1.1,
                color: '#0e3d2a',
                margin: 0,
                letterSpacing: '-0.03em',
              }}
            >
              Manage. Monitor.
              <br />
              Grow Together.
            </h1>

            {/* Organic curved underline */}
            <svg
              width="240"
              height="16"
              viewBox="0 0 240 16"
              fill="none"
              style={{ marginTop: '8px', display: 'block' }}
            >
              <path
                d="M 4 12 Q 120 2 236 12"
                stroke="#17652f"
                strokeWidth="3.5"
                strokeLinecap="round"
              />
            </svg>
          </div>

          {/* Subheading / Description */}
          <p
            style={{
              fontSize: '1.02rem',
              lineHeight: 1.55,
              color: '#1f3b30',
              fontWeight: '500',
              margin: '0 0 34px 0',
              maxWidth: '460px',
            }}
          >
            A unified platform to manage projects, sales, rentals, inventory and operations at Krishna Valley.
          </p>

          {/* 3 Value Proposition Cards */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '18px',
              flexWrap: 'wrap',
            }}
          >
            {/* Feature 1: Project Management */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(232, 242, 229, 0.92)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  flexShrink: 0,
                }}
              >
                <Building2 size={22} color="#17652f" />
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#0e3828', lineHeight: 1.25 }}>
                Project
                <br />
                Management
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '36px', backgroundColor: 'rgba(15, 60, 40, 0.22)' }} />

            {/* Feature 2: Lead & Sales CRM */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(232, 242, 229, 0.92)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  flexShrink: 0,
                }}
              >
                <Users size={22} color="#17652f" />
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#0e3828', lineHeight: 1.25 }}>
                Lead &amp;
                <br />
                Sales CRM
              </div>
            </div>

            {/* Divider */}
            <div style={{ width: '1px', height: '36px', backgroundColor: 'rgba(15, 60, 40, 0.22)' }} />

            {/* Feature 3: Reports & Analytics */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div
                style={{
                  width: '46px',
                  height: '46px',
                  borderRadius: '12px',
                  backgroundColor: 'rgba(232, 242, 229, 0.92)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
                  flexShrink: 0,
                }}
              >
                <BarChart3 size={22} color="#17652f" />
              </div>
              <div style={{ fontSize: '0.86rem', fontWeight: '700', color: '#0e3828', lineHeight: 1.25 }}>
                Reports &amp;
                <br />
                Analytics
              </div>
            </div>
          </div>
        </div>

        {/* Right Section: Clean White Floating Login Card */}
        <div
          style={{
            flex: '0 0 420px',
            maxWidth: '430px',
            width: '100%',
            backgroundColor: '#ffffff',
            borderRadius: '28px',
            padding: '36px 36px',
            boxSizing: 'border-box',
            boxShadow: '0 20px 50px rgba(0, 0, 0, 0.16), 0 2px 10px rgba(0, 0, 0, 0.08)',
            position: 'relative',
          }}
          className="login-card-right"
        >
          {/* Logo Header */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <img
                src="/assets/login-card-logo.png"
                alt="Krishna Valley Real Estate ERP"
                style={{
                  width: '210px',
                  maxWidth: '90%',
                  height: 'auto',
                  display: 'block',
                  margin: '0 auto',
                  objectFit: 'contain',
                }}
                onError={(e) => {
                  e.currentTarget.src = '/assets/logo-light.png';
                  e.currentTarget.style.width = '70px';
                }}
              />
            </div>

            {/* Welcome Text */}
            <div style={{ marginBottom: '22px' }}>
              <h2
                style={{
                  fontSize: '1.45rem',
                  fontWeight: '700',
                  color: '#155633',
                  margin: '0 0 4px 0',
                  letterSpacing: '-0.02em',
                }}
              >
                Welcome Back
              </h2>
              <p
                style={{
                  fontSize: '0.88rem',
                  color: '#5a6b63',
                  margin: 0,
                  fontWeight: '500',
                }}
              >
                Sign in to access Krishna Valley ERP
              </p>
            </div>

            {/* Feedback Messages */}
            {successMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#f0fdf4',
                  border: '1px solid #86efac',
                  color: '#166534',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontWeight: '600',
                }}
              >
                <CheckCircle2 size={16} style={{ flexShrink: 0, color: '#16a34a' }} />
                <span>{successMessage}</span>
              </div>
            )}

            {errorMessage && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fca5a5',
                  color: '#991b1b',
                  fontSize: '0.82rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  marginBottom: '16px',
                  fontWeight: '500',
                }}
              >
                <AlertCircle size={16} style={{ flexShrink: 0, color: '#dc2626' }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              {/* Input: Email or Username */}
              <div style={{ position: 'relative' }}>
                <Mail
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="identifier"
                  type="text"
                  required
                  placeholder="Email or Username"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '13px 16px 13px 44px',
                    fontSize: '0.92rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#17652f';
                    e.target.style.boxShadow = '0 0 0 3px rgba(23, 101, 47, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              {/* Input: Password */}
              <div style={{ position: 'relative' }}>
                <Lock
                  size={18}
                  style={{
                    position: 'absolute',
                    left: '16px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    color: '#94a3b8',
                    pointerEvents: 'none',
                  }}
                />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  placeholder="Password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    padding: '13px 44px 13px 44px',
                    fontSize: '0.92rem',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    outline: 'none',
                    backgroundColor: '#ffffff',
                    color: '#1f2937',
                    transition: 'border-color 0.15s ease, box-shadow 0.15s ease',
                    fontFamily: 'inherit',
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#17652f';
                    e.target.style.boxShadow = '0 0 0 3px rgba(23, 101, 47, 0.12)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.boxShadow = 'none';
                  }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    padding: '4px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Options Row: Remember me + Forgot password */}
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  margin: '2px 0 6px 0',
                  fontSize: '0.84rem',
                }}
              >
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    color: '#374151',
                    fontWeight: '500',
                    userSelect: 'none',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      accentColor: '#17652f',
                      cursor: 'pointer',
                      borderRadius: '4px',
                    }}
                  />
                  <span>Remember me</span>
                </label>

                <button
                  type="button"
                  onClick={() => alert('Please contact the IT System Administrator to reset your password.')}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#17652f',
                    fontSize: '0.84rem',
                    fontWeight: '600',
                    cursor: 'pointer',
                    padding: 0,
                  }}
                >
                  Forgot password?
                </button>
              </div>

              {/* Sign In Button */}
              {loading ? (
                <div
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    backgroundColor: '#e8f2e5',
                    border: '1.5px solid #cde4c9',
                    color: '#17652f',
                    borderRadius: '12px',
                    fontSize: '0.95rem',
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '10px',
                    boxSizing: 'border-box',
                  }}
                >
                  <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                  <span>Signing in...</span>
                </div>
              ) : (
                <button
                  type="submit"
                  style={{
                    width: '100%',
                    padding: '13px 20px',
                    backgroundColor: '#125225',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '12px',
                    fontSize: '0.96rem',
                    fontWeight: '600',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    boxShadow: '0 4px 12px rgba(18, 82, 37, 0.28)',
                    transition: 'background-color 0.15s ease, transform 0.1s ease',
                    boxSizing: 'border-box',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = '#0e3f1d';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = '#125225';
                  }}
                >
                  <span>Sign In</span>
                  <ArrowRight size={17} />
                </button>
              )}
            </form>

            {/* Quick Demo Switcher - Collapsible Dropdown for Testing/Dev convenience */}
            <div
              style={{
                marginTop: '18px',
                paddingTop: '14px',
                borderTop: '1px solid #f1f5f9',
              }}
            >
              <button
                type="button"
                onClick={() => setShowQuickRoles(!showQuickRoles)}
                style={{
                  width: '100%',
                  background: 'transparent',
                  border: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '4px 2px',
                  cursor: 'pointer',
                  color: '#64748b',
                  fontSize: '0.74rem',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.04em',
                }}
              >
                <span>1-Click Demo Profiles ({demoAccounts.length})</span>
                {showQuickRoles ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              </button>

              {showQuickRoles && (
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(2, 1fr)',
                    gap: '6px',
                    marginTop: '10px',
                    maxHeight: '160px',
                    overflowY: 'auto',
                  }}
                >
                  {demoAccounts.map((account) => {
                    const IconComp = account.icon;
                    const isSelected = activeDemoRole === account.label;
                    return (
                      <button
                        key={account.label}
                        type="button"
                        disabled={loading}
                        onClick={() => handleQuickDemoLogin(account.username, account.pass, account.label)}
                        style={{
                          padding: '6px 8px',
                          borderRadius: '8px',
                          backgroundColor: '#f8fafc',
                          border: '1px solid #e2e8f0',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px',
                          cursor: loading ? 'not-allowed' : 'pointer',
                          textAlign: 'left',
                          fontSize: '0.74rem',
                          fontWeight: '600',
                          color: '#334155',
                          transition: 'all 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!loading) {
                            e.currentTarget.style.backgroundColor = '#e8f2e5';
                            e.currentTarget.style.borderColor = '#cde4c9';
                            e.currentTarget.style.color = '#17652f';
                          }
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.backgroundColor = '#f8fafc';
                          e.currentTarget.style.borderColor = '#e2e8f0';
                          e.currentTarget.style.color = '#334155';
                        }}
                      >
                        {isSelected ? (
                          <Loader2 size={12} style={{ color: '#17652f', animation: 'spin 1s linear infinite' }} />
                        ) : (
                          <IconComp size={12} style={{ color: '#17652f' }} />
                        )}
                        <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {account.label}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Responsive styling */}
        <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @media (max-width: 920px) {
          .login-container-responsive {
            flex-direction: column !important;
            padding: 30px 20px !important;
            justify-content: center !important;
            min-height: auto !important;
          }
          .login-hero-left {
            max-width: 100% !important;
            text-align: center !important;
            align-items: center !important;
            margin-bottom: 24px !important;
          }
          .login-hero-left svg {
            margin: 8px auto !important;
          }
          .login-card-right {
            max-width: 100% !important;
            width: 100% !important;
          }
        }
      `}</style>
      </div>
      );
};

      export default LoginPage;
