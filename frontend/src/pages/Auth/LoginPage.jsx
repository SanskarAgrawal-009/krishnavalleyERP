import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import {
  Building2,
  Lock,
  User,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  CheckCircle2,
  KeyRound,
  Sparkles,
  Users,
  Compass,
  Briefcase,
  DollarSign,
  Wrench,
  Loader2
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
  const [activeDemoRole, setActiveDemoRole] = useState(null);

  const from = location.state?.from?.pathname || '/dashboard';

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!identifier.trim() || !password) {
      setErrorMessage('Please enter your username/email and password.');
      return;
    }

    setLoading(true);
    setErrorMessage('');

    try {
      const userRes = await login(identifier.trim(), password);
      const targetPath = userRes?.role?.roleCode === 'agent' ? '/agent-portal' : from;
      navigate(targetPath, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickDemoLogin = async (username, pass, roleLabel) => {
    setActiveDemoRole(roleLabel);
    setIdentifier(username);
    setPassword(pass);
    setErrorMessage('');
    setLoading(true);

    try {
      const userRes = await login(username, pass);
      const targetPath = userRes?.role?.roleCode === 'agent' ? '/agent-portal' : from;
      navigate(targetPath, { replace: true });
    } catch (err) {
      setErrorMessage(err.message || 'Demo login failed. Ensure the server is running.');
    } finally {
      setLoading(false);
      setActiveDemoRole(null);
    }
  };

  const demoAccounts = [
    { label: 'Super Admin', username: 'admin', pass: 'Admin@12345', icon: ShieldCheck, color: '#1a73e8', bg: '#e8f0fe', desc: 'Full System Control' },
    { label: 'Sales Head', username: 'sales_head', pass: 'Sales@12345', icon: Users, color: '#0d904f', bg: '#e6f4ea', desc: 'CRM & Bookings' },
    { label: 'Agent Partner', username: 'agent_rahul', pass: 'Agent@12345', icon: Sparkles, color: '#e37400', bg: '#fef7e0', desc: 'Leads & Commission Wallet' },
    { label: 'Site Engineer', username: 'site_eng', pass: 'Site@12345', icon: Wrench, color: '#0284c7', bg: '#e0f2fe', desc: 'Inventory & Materials' },
    { label: 'HR Manager', username: 'hr_manager', pass: 'Hr@12345', icon: Briefcase, color: '#9334e6', bg: '#f3e8fd', desc: 'Staff & Attendance' },
    { label: 'Accounts Head', username: 'accounts_head', pass: 'Accounts@12345', icon: DollarSign, color: '#1292b3', bg: '#e4f7fb', desc: 'Finance & Passbooks' },
  ];

  return (
    <div
      style={{
        minHeight: '100vh',
        width: '100%',
        backgroundColor: '#0c1626',
        backgroundImage: `
          radial-gradient(at 0% 0%, rgba(26, 115, 232, 0.18) 0px, transparent 50%),
          radial-gradient(at 100% 100%, rgba(13, 144, 79, 0.14) 0px, transparent 50%),
          radial-gradient(at 50% 50%, rgba(16, 32, 59, 0.9) 0%, #080f1d 100%)
        `,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        boxSizing: 'border-box',
        fontFamily: "'Google Sans', 'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
        color: '#e2e8f0',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Ambient background glow ornaments */}
      <div
        style={{
          position: 'absolute',
          top: '-15%',
          left: '-10%',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(26, 115, 232, 0.22) 0%, rgba(26, 115, 232, 0) 70%)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: '-15%',
          right: '-10%',
          width: '550px',
          height: '550px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(13, 144, 79, 0.18) 0%, rgba(13, 144, 79, 0) 70%)',
          pointerEvents: 'none',
        }}
      />

      <div
        style={{
          width: '100%',
          maxWidth: '1080px',
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(340px, 1fr))',
          gap: '32px',
          alignItems: 'stretch',
          zIndex: 1,
        }}
      >
        {/* Left Side: Enterprise Showcase Card */}
        <div
          style={{
            backgroundColor: 'rgba(19, 31, 53, 0.75)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.09)',
            padding: '40px 36px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
          }}
        >
          <div>
            {/* Brand Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px', marginBottom: '28px' }}>
              <div
                style={{
                  width: '48px',
                  height: '48px',
                  borderRadius: '12px',
                  backgroundColor: '#1a73e8',
                  color: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: '800',
                  fontSize: '1.4rem',
                  boxShadow: '0 8px 20px rgba(26, 115, 232, 0.4)',
                  letterSpacing: '1px',
                }}
              >
                KV
              </div>
              <div>
                <h1 style={{ margin: 0, fontSize: '1.35rem', fontWeight: '700', color: '#ffffff', letterSpacing: '-0.02em' }}>
                  Krishna Valley
                </h1>
                <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8', fontWeight: '500', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Real Estate ERP Engine
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '28px' }}>
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  backgroundColor: 'rgba(26, 115, 232, 0.15)',
                  color: '#8ab4f8',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                  border: '1px solid rgba(138, 180, 248, 0.25)',
                  marginBottom: '14px',
                }}
              >
                <Sparkles size={13} />
                Role-Based Multi-Branch Gateway
              </span>
              <h2 style={{ fontSize: '1.65rem', fontWeight: '700', color: '#f8fafc', lineHeight: 1.25, margin: '0 0 12px' }}>
                Secure Enterprise Portal & Resource Planning
              </h2>
              <p style={{ fontSize: '0.9rem', color: '#94a3b8', lineHeight: 1.6, margin: 0 }}>
                Unified management platform for Krishna Valley Vrindavan projects, multi-branch operations, sales lifecycles, site materials, tenant leases, and workforce automation.
              </p>
            </div>

            {/* Feature points */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(13, 144, 79, 0.2)', color: '#34a853', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <ShieldCheck size={16} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0' }}>Granular Access Control</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Dynamic permission enforcement across 12 distinct functional modules.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(26, 115, 232, 0.2)', color: '#8ab4f8', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <Compass size={16} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0' }}>Multi-Branch Site Segregation</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>View, edit, or manage levels tailored per site office and project location.</p>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px' }}>
                <div style={{ width: '28px', height: '28px', borderRadius: '6px', backgroundColor: 'rgba(227, 116, 0, 0.2)', color: '#fbbc04', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                  <KeyRound size={16} />
                </div>
                <div>
                  <h4 style={{ margin: '0 0 2px', fontSize: '0.88rem', fontWeight: '600', color: '#e2e8f0' }}>Security Guardrails</h4>
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#94a3b8' }}>Auto-lockouts on failed attempts and cryptographically signed JWT sessions.</p>
                </div>
              </div>
            </div>
          </div>

          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '0.75rem', color: '#64748b' }}>© 2026 Krishna Valley Real Estate Ltd.</span>
            <span style={{ fontSize: '0.75rem', color: '#38bdf8', fontWeight: '600' }}>Vrindavan Projects Online</span>
          </div>
        </div>

        {/* Right Side: Login Form Card */}
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '24px',
            padding: '40px 36px',
            color: '#1e293b',
            boxShadow: '0 24px 60px rgba(0, 0, 0, 0.45)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#0f172a', margin: '0 0 6px', letterSpacing: '-0.02em' }}>
                Sign in to your account
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#64748b', margin: 0 }}>
                Enter your system credentials or choose a quick demo profile below.
              </p>
            </div>

            {/* Error Notification Alert */}
            {errorMessage && (
              <div
                style={{
                  padding: '12px 14px',
                  borderRadius: '10px',
                  backgroundColor: '#fef2f2',
                  border: '1px solid #fecaca',
                  color: '#991b1b',
                  fontSize: '0.85rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  marginBottom: '20px',
                  lineHeight: 1.4,
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Login Form */}
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              {/* Username or Email */}
              <div>
                <label
                  htmlFor="identifier"
                  style={{ display: 'block', fontSize: '0.82rem', fontWeight: '600', color: '#334155', marginBottom: '6px' }}
                >
                  Username or Corporate Email
                </label>
                <div style={{ position: 'relative' }}>
                  <User
                    size={18}
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                  />
                  <input
                    id="identifier"
                    type="text"
                    required
                    placeholder="e.g. admin or admin@krishnavalley.com"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 14px 12px 42px',
                      fontSize: '0.92rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1a73e8';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(26, 115, 232, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.backgroundColor = '#f8fafc';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label
                    htmlFor="password"
                    style={{ fontSize: '0.82rem', fontWeight: '600', color: '#334155' }}
                  >
                    Password
                  </label>
                  <span
                    style={{ fontSize: '0.78rem', color: '#1a73e8', cursor: 'pointer', fontWeight: '500' }}
                    onClick={() => alert('Please contact system administrator to reset password.')}
                  >
                    Forgot password?
                  </span>
                </div>
                <div style={{ position: 'relative' }}>
                  <Lock
                    size={18}
                    style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }}
                  />
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    placeholder="••••••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    style={{
                      width: '100%',
                      boxSizing: 'border-box',
                      padding: '12px 42px 12px 42px',
                      fontSize: '0.92rem',
                      borderRadius: '10px',
                      border: '1px solid #cbd5e1',
                      outline: 'none',
                      backgroundColor: '#f8fafc',
                      color: '#0f172a',
                      transition: 'all 0.2s ease',
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#1a73e8';
                      e.target.style.backgroundColor = '#ffffff';
                      e.target.style.boxShadow = '0 0 0 3px rgba(26, 115, 232, 0.15)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#cbd5e1';
                      e.target.style.backgroundColor = '#f8fafc';
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
              </div>

              {/* Remember me option */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <input
                  id="remember"
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  style={{ width: '16px', height: '16px', accentColor: '#1a73e8', cursor: 'pointer' }}
                />
                <label htmlFor="remember" style={{ fontSize: '0.82rem', color: '#64748b', cursor: 'pointer' }}>
                  Keep me signed in for 7 days
                </label>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                style={{
                  padding: '13px 20px',
                  backgroundColor: '#1a73e8',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: '600',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: '0 4px 12px rgba(26, 115, 232, 0.3)',
                  transition: 'all 0.2s ease',
                  opacity: loading ? 0.75 : 1,
                  marginTop: '6px',
                }}
                onMouseEnter={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = '#1557b0';
                }}
                onMouseLeave={(e) => {
                  if (!loading) e.currentTarget.style.backgroundColor = '#1a73e8';
                }}
              >
                {loading && !activeDemoRole ? (
                  <>
                    <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Authenticate & Access ERP</span>
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          </div>

          {/* Quick Demo Switcher Pills */}
          <div style={{ marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
              <span style={{ fontSize: '0.78rem', fontWeight: '700', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                ⚡ Quick 1-Click Role Login (Demo / Testing)
              </span>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: '8px' }}>
              {demoAccounts.map((account) => {
                const IconComponent = account.icon;
                const isSelected = activeDemoRole === account.label;
                return (
                  <button
                    key={account.label}
                    type="button"
                    disabled={loading}
                    onClick={() => handleQuickDemoLogin(account.username, account.pass, account.label)}
                    style={{
                      padding: '8px 10px',
                      borderRadius: '8px',
                      backgroundColor: account.bg,
                      border: `1px solid ${account.color}30`,
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'flex-start',
                      cursor: loading ? 'not-allowed' : 'pointer',
                      textAlign: 'left',
                      transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                      opacity: loading && !isSelected ? 0.6 : 1,
                    }}
                    onMouseEnter={(e) => {
                      if (!loading) {
                        e.currentTarget.style.transform = 'translateY(-2px)';
                        e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)';
                      }
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', width: '100%', marginBottom: '2px' }}>
                      <IconComponent size={14} style={{ color: account.color }} />
                      <span style={{ fontSize: '0.8rem', fontWeight: '700', color: '#1e293b' }}>
                        {account.label}
                      </span>
                    </div>
                    <span style={{ fontSize: '0.7rem', color: '#64748b' }}>{account.desc}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default LoginPage;
