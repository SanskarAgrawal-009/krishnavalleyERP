import React from 'react';
import { useAuth } from '../../context/AuthContext.jsx';
import { ShieldAlert, Lock } from 'lucide-react';

export const PermissionGuard = ({
  children,
  permission,
  role,
  roles = [],
  fallback = null,
  showDeniedCard = false,
}) => {
  const { hasPermission, hasRole, hasAnyRole, isSuperAdmin } = useAuth();

  if (isSuperAdmin) {
    return <>{children}</>;
  }

  let isAuthorized = true;

  if (permission && !hasPermission(permission)) {
    isAuthorized = false;
  }

  if (role && !hasRole(role)) {
    isAuthorized = false;
  }

  if (roles.length > 0 && !hasAnyRole(roles)) {
    isAuthorized = false;
  }

  if (!isAuthorized) {
    if (showDeniedCard) {
      return (
        <div
          style={{
            padding: '40px 24px',
            backgroundColor: '#ffffff',
            borderRadius: '12px',
            border: '1px solid #e0e0e0',
            textAlign: 'center',
            maxWidth: '520px',
            margin: '40px auto',
            boxShadow: '0 4px 16px rgba(0,0,0,0.05)',
          }}
        >
          <div
            style={{
              width: '54px',
              height: '54px',
              borderRadius: '50%',
              backgroundColor: '#feebc8',
              color: '#c05621',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}
          >
            <Lock size={26} />
          </div>
          <h3 style={{ margin: '0 0 8px', fontSize: '1.25rem', color: '#2d3748', fontWeight: '600' }}>
            Access Restricted
          </h3>
          <p style={{ margin: '0 0 20px', fontSize: '0.9rem', color: '#718096', lineHeight: 1.5 }}>
            Your account role does not have permission to view or manage this section. If you require access, please contact your ERP system administrator.
          </p>
        </div>
      );
    }
    return fallback;
  }

  return <>{children}</>;
};

export default PermissionGuard;
