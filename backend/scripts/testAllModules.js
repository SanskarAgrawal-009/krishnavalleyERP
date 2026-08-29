import dotenv from 'dotenv';
import mongoose from 'mongoose';

dotenv.config();

const API_BASE = 'http://localhost:5000/api';

async function runSystemDiagnostics() {
  console.log('====================================================');
  console.log('🚀 KRISHNA VALLEY ERP - FULL SYSTEM & MODULE AUDIT');
  console.log('====================================================\n');

  // 1. DATABASE CONNECTION
  console.log('1️⃣ CHECKING DATABASE CONNECTION...');
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('   ✅ MongoDB Atlas connected successfully.');
  } catch (err) {
    console.error('   ❌ MongoDB Atlas connection failed:', err.message);
    process.exit(1);
  }

  // 2. ADMIN USER & AUTH TOKEN VIA LOGIN API
  console.log('\n2️⃣ AUTHENTICATING ADMIN USER VIA API...');
  let token;
  try {
    const loginRes = await fetch(`${API_BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: 'admin@krishnavalley.com', password: 'Admin@12345' })
    });
    const loginData = await loginRes.json();
    if (!loginData.success || !loginData.token) {
      throw new Error(loginData.message || 'Login failed');
    }
    token = loginData.token;
    console.log(`   ✅ Admin authenticated: ${loginData.user.email} (Role: ${loginData.user.role?.roleName || loginData.user.role?.roleCode})`);
    console.log(`   ✅ Permissions loaded: ${loginData.user.permissions?.length || 0} active permissions`);
  } catch (err) {
    console.error('   ❌ Failed to authenticate admin user:', err.message);
    process.exit(1);
  }

  const headers = {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`
  };

  // 3. TESTING API ENDPOINTS FOR EACH MODULE IN THE USER'S LIST
  console.log('\n3️⃣ TESTING API HEALTH ACROSS ALL MODULES:');

  const testEndpoints = [
    { module: 'Core Health', name: 'System Health Check', url: '/health' },
    { module: 'Sales & Allotments', name: 'Get Sales Bookings', url: '/sales' },
    { module: 'Customer Management', name: 'Get Customer Directory', url: '/customers' },
    { module: 'Rental & Rent-Back', name: 'Get Rental Contracts', url: '/rentals' },
    { module: 'Maintenance & CAM', name: 'Get CAM Billings', url: '/maintenance/bills' },
    { module: 'Maintenance & CAM', name: 'Get Service Requests', url: '/maintenance/service-requests' },
    { module: 'Workforce & HR', name: 'Get Employees', url: '/hr/employees' },
    { module: 'Workforce & HR', name: 'Get HR Master (Depts & Roles)', url: '/hr/master' },
    { module: 'Documents Vault', name: 'Get Unified Document Vault', url: '/documents/vault' },
    { module: 'Notifications Hub', name: 'Get Notification Templates', url: '/notifications/templates' },
    { module: 'Notifications Hub', name: 'Get Notification Logs', url: '/notifications/logs' },
    { module: 'BI Reports & Analytics', name: 'Get Sales BI Report', url: '/reports/sales' },
    { module: 'BI Reports & Analytics', name: 'Get Financial BI Report', url: '/reports/finance' },
    { module: 'BI Reports & Analytics', name: 'Get Inventory BI Report', url: '/reports/inventory' },
    { module: 'Access Control & Admin', name: 'Get Users List', url: '/users' },
    { module: 'Access Control & Admin', name: 'Get Roles & Permissions', url: '/roles' },
    { module: '14. Settings (Core)', name: 'Get System Settings', url: '/settings' },
    { module: '15. Audit Logs (Sec)', name: 'Get Security Audit Logs', url: '/audit-logs' },
    { module: 'Property Inventory', name: 'Get Flats & Availability', url: '/flats' },
    { module: 'CRM & Lead Engine', name: 'Get CRM Leads', url: '/leads' },
    { module: 'Material & Warehouse', name: 'Get Warehouses / Stores', url: '/inventory/stores' },
    { module: 'Material & Warehouse', name: 'Get Material Inventory', url: '/inventory/materials' },
    { module: 'Material & Warehouse', name: 'Get Stock Transfers', url: '/inventory/stock-transfers' }
  ];

  let passedCount = 0;
  let failedCount = 0;

  for (const ep of testEndpoints) {
    try {
      const res = await fetch(`${API_BASE}${ep.url}`, { headers });
      const status = res.status;
      if (res.ok || status === 200 || status === 201) {
        console.log(`   ✅ [${ep.module}] ${ep.name} -> HTTP ${status} (OK)`);
        passedCount++;
      } else {
        const text = await res.text();
        console.log(`   ⚠️ [${ep.module}] ${ep.name} -> HTTP ${status} (${text.slice(0, 80)})`);
        failedCount++;
      }
    } catch (err) {
      console.log(`   ❌ [${ep.module}] ${ep.name} -> Fetch error: ${err.message}`);
      failedCount++;
    }
  }

  console.log(`\n📊 API HEALTH TEST SUMMARY: ${passedCount} Passed, ${failedCount} Failed out of ${testEndpoints.length} endpoints tested.`);

  await mongoose.disconnect();
  process.exit(failedCount > 0 ? 1 : 0);
}

runSystemDiagnostics();
