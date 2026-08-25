import React from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { ShieldAlert, Lock, Loader2, ArrowLeft } from 'lucide-react';

export const ProtectedRoute = ({
  children,
  permission,
  permissions = [],
  role,
  roles = [],
}) => {
  const { isAuthenticated, isLoading, user, hasPermission, hasRole, hasAnyRole, isSuperAdmin } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div
        style={{
          height: '100vh',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#f8f9fa',
          color: '#1a73e8',
          gap: '16px',
        }}
      >
        <div
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '14px',
            backgroundColor: '#1a73e8',
            color: '#fff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: '1.5rem',
            fontWeight: '700',
            boxShadow: '0 4px 16px rgba(26,115,232,0.3)',
          }}
        >
          KV
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#5f6368', fontSize: '0.95rem' }}>
          <Loader2 size={18} style={{ animation: 'spin 1s linear infinite' }} />
          <span>Verifying security session...</span>
        </div>
        <style>{`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}</style>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Super Admin has master unrestricted access
  if (isSuperAdmin) {
    return children;
  }

  // Permission Checks
  let isAuthorized = true;

  if (permission && !hasPermission(permission)) {
    isAuthorized = false;
  }

  if (permissions.length > 0 && !permissions.some((p) => hasPermission(p))) {
    isAuthorized = false;
  }

  if (role && !hasRole(role)) {
    isAuthorized = false;
  }

  if (roles.length > 0 && !hasAnyRole(roles)) {
    isAuthorized = false;
  }

  // Render Access Denied Card if user lacks permission
  if (!isAuthorized) {
    return (
      <div
        style={{
          padding: '60px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '70vh',
        }}
      >
        <div
          style={{
            backgroundColor: '#ffffff',
            borderRadius: '20px',
            border: '1px solid #e2e8f0',
            padding: '40px 32px',
            maxWidth: '520px',
            width: '100%',
            textAlign: 'center',
            boxShadow: '0 10px 30px rgba(0,0,0,0.06)',
          }}
        >
          <div
            style={{
              width: '64px',
              height: '64px',
              borderRadius: '50%',
              backgroundColor: '#fee2e2',
              color: '#dc2626',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 20px',
            }}
          >
            <Lock size={32} />
          </div>

          <h2 style={{ margin: '0 0 8px', fontSize: '1.4rem', fontWeight: '800', color: '#0f172a' }}>
            Access Restricted
          </h2>

          <p style={{ margin: '0 0 20px', fontSize: '0.92rem', color: '#64748b', lineHeight: 1.5 }}>
            Your role (<strong>{user?.role?.roleName || user?.role || 'Current Role'}</strong>) does not have authorization to view this ERP module.
          </p>

          <div
            style={{
              display: 'inline-block',
              padding: '8px 16px',
              borderRadius: '10px',
              backgroundColor: '#f1f5f9',
              color: '#475569',
              fontSize: '0.82rem',
              fontWeight: '600',
              marginBottom: '24px',
            }}
          >
            Required Privilege: <code>{permission || permissions.join(' or ') || role || roles.join(', ')}</code>
          </div>

          <div>
            <button
              onClick={() => navigate('/dashboard')}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 20px',
                borderRadius: '10px',
                backgroundColor: '#1a73e8',
                color: '#ffffff',
                border: 'none',
                fontSize: '0.9rem',
                fontWeight: '700',
                cursor: 'pointer',
              }}
            >
              <ArrowLeft size={16} />
              <span>Back to Command Center</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return children;
};

export default ProtectedRoute;
