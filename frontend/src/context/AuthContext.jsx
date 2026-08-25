import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authService } from '../services/authService.js';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const savedUser = localStorage.getItem('kv_user');
      return savedUser ? JSON.parse(savedUser) : null;
    } catch {
      return null;
    }
  });

  const [token, setToken] = useState(() => localStorage.getItem('kv_token') || null);
  const [isLoading, setIsLoading] = useState(true);

  // Synchronize authentication state on load
  const checkAuth = useCallback(async () => {
    const storedToken = localStorage.getItem('kv_token');
    if (!storedToken) {
      setUser(null);
      setToken(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await authService.getMe();
      if (res && res.success && res.user) {
        setUser(res.user);
        localStorage.setItem('kv_user', JSON.stringify(res.user));
      } else {
        throw new Error('Session invalid');
      }
    } catch (err) {
      console.warn('Authentication token verification failed:', err.message);
      localStorage.removeItem('kv_token');
      localStorage.removeItem('kv_user');
      setUser(null);
      setToken(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Login handler
  const login = async (identifier, password) => {
    const res = await authService.login(identifier, password);
    if (res && res.success) {
      setToken(res.token);
      setUser(res.user);
      localStorage.setItem('kv_token', res.token);
      localStorage.setItem('kv_user', JSON.stringify(res.user));
      return res;
    }
    throw new Error(res?.message || 'Login failed');
  };

  // Logout handler
  const logout = async () => {
    try {
      await authService.logout();
    } finally {
      localStorage.removeItem('kv_token');
      localStorage.removeItem('kv_user');
      setToken(null);
      setUser(null);
    }
  };

  // Permission and role checking helpers
  const isSuperAdmin = user?.role?.roleCode === 'super_admin' || user?.role?.roleCode === 'admin';

  const hasPermission = (permissionCode) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    const userCodes = user.permissionCodes || (user.permissions || []).map((p) => (typeof p === 'string' ? p : p.permissionCode));
    return userCodes.includes(permissionCode);
  };

  const hasRole = (roleCode) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    return (user?.role?.roleCode || '').toLowerCase() === roleCode.toLowerCase();
  };

  const hasAnyRole = (roleCodes = []) => {
    if (!user) return false;
    if (isSuperAdmin) return true;
    const currentRole = (user?.role?.roleCode || '').toLowerCase();
    return roleCodes.map((r) => r.toLowerCase()).includes(currentRole);
  };

  const primaryBranch = user?.primaryBranch || user?.branchAccess?.find((b) => b.isPrimary)?.branchId || user?.branchAccess?.[0]?.branchId;

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!token && !!user,
        isLoading,
        login,
        logout,
        refreshUser: checkAuth,
        hasPermission,
        hasRole,
        hasAnyRole,
        isSuperAdmin,
        primaryBranch,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export default AuthContext;
