import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import { ProtectedRoute } from './components/auth/ProtectedRoute.jsx';
import { AppLayout } from './components/layout/AppLayout.jsx';

import { LoginPage } from './pages/Auth/LoginPage.jsx';
import { UserManagementPage } from './pages/Auth/UserManagementPage.jsx';
import { AgentPortalPage } from './pages/Agent/AgentPortalPage.jsx';
import { SiteVisitVerificationPage } from './pages/Agent/SiteVisitVerificationPage.jsx';
import { AgentNetworkPage } from './pages/Agent/AgentNetworkPage.jsx';
import { AgentProfilePage } from './pages/Agent/AgentProfilePage.jsx';

import { CommandCenterPage } from './pages/Dashboard/CommandCenterPage.jsx';
import { PropertyInventoryPage } from './pages/Inventory/PropertyInventoryPage.jsx';
import { MaterialInventoryPage } from './pages/Inventory/MaterialInventoryPage.jsx';
import { LeadsPage } from './pages/CRM/LeadsPage.jsx';
import { SalesPage } from './pages/Sales/SalesPage.jsx';
import { CustomersPage } from './pages/Customers/CustomersPage.jsx';
import { RentalsPage } from './pages/Rentals/RentalsPage.jsx';
import { MaintenancePage } from './pages/Maintenance/MaintenancePage.jsx';
import { HRPage } from './pages/HR/HRPage.jsx';
import { DocumentManagementPage } from './pages/Documents/DocumentManagementPage.jsx';
import { NotificationManagementPage } from './pages/Notifications/NotificationManagementPage.jsx';
import { ReportsPage } from './pages/Reports/ReportsPage.jsx';
import { SettingsPage } from './pages/Settings/SettingsPage.jsx';
import { AuditLogsPage } from './pages/Audit/AuditLogsPage.jsx';

import './styles/global.css';
import './styles/layout.css';

export const App = () => {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          {/* Public Authentication Route */}
          <Route path="/login" element={<LoginPage />} />

          {/* Protected ERP Application Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <AppLayout />
              </ProtectedRoute>
            }
          >
            {/* Default to Command Center Dashboard */}
            <Route index element={<CommandCenterPage />} />
            <Route path="dashboard" element={<CommandCenterPage />} />

            {/* Agent Dedicated Workspace */}
            <Route
              path="agent-portal"
              element={
                <ProtectedRoute permission="agent:leads">
                  <AgentPortalPage />
                </ProtectedRoute>
              }
            />

            {/* Agent Site Visit Verification & Approvals Hub */}
            <Route
              path="site-visits"
              element={
                <ProtectedRoute>
                  <SiteVisitVerificationPage />
                </ProtectedRoute>
              }
            />

            {/* Agent Network Directory (Admin / CRM) */}
            <Route
              path="agent-network"
              element={
                <ProtectedRoute>
                  <AgentNetworkPage />
                </ProtectedRoute>
              }
            />

            {/* Agent Profile & Verification Hub (Admin / CRM Inspection) */}
            <Route
              path="agent-profile/:agentId"
              element={
                <ProtectedRoute>
                  <AgentProfilePage />
                </ProtectedRoute>
              }
            />
            <Route
              path="agent-profile"
              element={
                <ProtectedRoute>
                  <AgentProfilePage />
                </ProtectedRoute>
              }
            />

            {/* Inventory & Projects */}
            <Route
              path="inventory"
              element={
                <ProtectedRoute permission="inventory:view">
                  <PropertyInventoryPage />
                </ProtectedRoute>
              }
            />

            {/* Materials & Stores */}
            <Route
              path="materials"
              element={
                <ProtectedRoute permission="materials:view">
                  <MaterialInventoryPage />
                </ProtectedRoute>
              }
            />

            {/* CRM & Lead Engine */}
            <Route
              path="crm"
              element={
                <ProtectedRoute permission="crm:view">
                  <LeadsPage />
                </ProtectedRoute>
              }
            />

            {/* Sales & Deals */}
            <Route
              path="sales"
              element={
                <ProtectedRoute permission="sales:view">
                  <SalesPage />
                </ProtectedRoute>
              }
            />

            {/* Customers & Passbooks */}
            <Route
              path="customers"
              element={
                <ProtectedRoute permission="customers:view">
                  <CustomersPage />
                </ProtectedRoute>
              }
            />

            {/* Rentals & Tenant Management */}
            <Route
              path="rentals"
              element={
                <ProtectedRoute permission="rentals:view">
                  <RentalsPage />
                </ProtectedRoute>
              }
            />

            {/* Maintenance & Services */}
            <Route
              path="maintenance"
              element={
                <ProtectedRoute permission="maintenance:view">
                  <MaintenancePage />
                </ProtectedRoute>
              }
            />

            {/* HR & Workforce */}
            <Route
              path="hr"
              element={
                <ProtectedRoute permission="hr:view">
                  <HRPage />
                </ProtectedRoute>
              }
            />

            {/* Documents Vault */}
            <Route
              path="documents"
              element={
                <ProtectedRoute permission="documents:view">
                  <DocumentManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Notifications Hub */}
            <Route
              path="notifications"
              element={
                <ProtectedRoute permission="notifications:view">
                  <NotificationManagementPage />
                </ProtectedRoute>
              }
            />

            {/* Reports & Analytics (Frozen for deployment, retained for offline development) */}
            <Route
              path="reports"
              element={
                <ProtectedRoute permission="reports:view">
                  {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (
                    <ReportsPage />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )}
                </ProtectedRoute>
              }
            />
            <Route
              path="reports/:reportType"
              element={
                <ProtectedRoute permission="reports:view">
                  {typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? (
                    <ReportsPage />
                  ) : (
                    <Navigate to="/dashboard" replace />
                  )}
                </ProtectedRoute>
              }
            />

            {/* User & Access Control Governance */}
            <Route
              path="access-control"
              element={
                <ProtectedRoute permission="users:view">
                  <UserManagementPage />
                </ProtectedRoute>
              }
            />
            <Route path="users" element={<Navigate to="/access-control" replace />} />
            <Route path="roles" element={<Navigate to="/access-control?tab=roles" replace />} />

            {/* 14. Global System Settings */}
            <Route
              path="settings"
              element={
                <ProtectedRoute permission="settings:view">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="settings/:tab"
              element={
                <ProtectedRoute permission="settings:view">
                  <SettingsPage />
                </ProtectedRoute>
              }
            />

            {/* 15. Audit Logs Governance */}
            <Route
              path="audit-logs"
              element={
                <ProtectedRoute permission="users:view">
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />
            <Route
              path="audit-logs/:tab"
              element={
                <ProtectedRoute permission="users:view">
                  <AuditLogsPage />
                </ProtectedRoute>
              }
            />

            {/* Catch-all fallback inside protected app */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>

          {/* Root catch-all */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
};

export default App;
