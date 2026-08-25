import bcrypt from 'bcryptjs';
import { Permission } from '../models/Permission.js';
import { Branch } from '../models/Branch.js';
import { Role } from '../models/Role.js';
import { User } from '../models/User.js';
import { Lead } from '../models/Lead.js';
import { CommissionLedger } from '../models/CommissionLedger.js';

const PERMISSION_DEFINITIONS = [
  // Dashboard
  { permissionName: 'View Dashboard Analytics', permissionCode: 'dashboard:view', module: 'Dashboard', action: 'view', description: 'Access Command Center and system analytics' },

  // Inventory & Sites
  { permissionName: 'View Projects & Flats', permissionCode: 'inventory:view', module: 'Inventory', action: 'view', description: 'View projects, towers, and flat availability' },
  { permissionName: 'Create Projects & Flats', permissionCode: 'inventory:create', module: 'Inventory', action: 'create', description: 'Add new projects, buildings, and inventory units' },
  { permissionName: 'Edit Inventory Details', permissionCode: 'inventory:edit', module: 'Inventory', action: 'edit', description: 'Update pricing, specifications, and unit statuses' },
  { permissionName: 'Full Inventory Management', permissionCode: 'inventory:manage', module: 'Inventory', action: 'manage', description: 'Delete units, manage site configurations' },

  // Materials & Stores
  { permissionName: 'View Materials Ledger', permissionCode: 'materials:view', module: 'Materials', action: 'view', description: 'View stock levels, materials catalog, and vendors' },
  { permissionName: 'Create PO & GRN', permissionCode: 'materials:create', module: 'Materials', action: 'create', description: 'Create Purchase Orders and Goods Receipts' },
  { permissionName: 'Material Issues & Transfers', permissionCode: 'materials:issue', module: 'Materials', action: 'manage', description: 'Issue stock to sites and execute inter-site transfers' },
  { permissionName: 'Full Materials Management', permissionCode: 'materials:manage', module: 'Materials', action: 'manage', description: 'Manage vendors, catalogs, and store locations' },

  // CRM & Leads
  { permissionName: 'View Leads & Pipeline', permissionCode: 'crm:view', module: 'CRM', action: 'view', description: 'View sales inquiries, scheduled visits, and follow-ups' },
  { permissionName: 'Create & Capture Leads', permissionCode: 'crm:create', module: 'CRM', action: 'create', description: 'Add buyer inquiries and schedule site visits' },
  { permissionName: 'Update Lead Pipeline', permissionCode: 'crm:edit', module: 'CRM', action: 'edit', description: 'Log follow-up conversations and update stage' },
  { permissionName: 'Export CRM Data', permissionCode: 'crm:export', module: 'CRM', action: 'export', description: 'Export leads and client contact lists' },

  // Agent Specific Privileges
  { permissionName: 'View My Agent Leads', permissionCode: 'agent:leads', module: 'CRM', action: 'view', description: 'View own submitted leads and status' },
  { permissionName: 'Upload & Submit Leads', permissionCode: 'agent:upload', module: 'CRM', action: 'create', description: 'Submit new buyer leads into portal' },
  { permissionName: 'View Commission Wallet', permissionCode: 'agent:wallet', module: 'CRM', action: 'view', description: 'Access commission statement and wallet balance' },

  // Sales Engine
  { permissionName: 'View Sales Deals', permissionCode: 'sales:view', module: 'Sales', action: 'view', description: 'View sales deals, allotments, and payment milestones' },
  { permissionName: 'Create Sales Booking', permissionCode: 'sales:create', module: 'Sales', action: 'create', description: 'Book new units, configure payment schedules' },
  { permissionName: 'Record Payments & Milestones', permissionCode: 'sales:edit', module: 'Sales', action: 'edit', description: 'Collect installments and update demand status' },
  { permissionName: 'Approve Discounts & Cancellations', permissionCode: 'sales:approve', module: 'Sales', action: 'approve', description: 'Approve custom payment plans and unit cancellations' },

  // Customers CRM
  { permissionName: 'View Customer Passbooks', permissionCode: 'customers:view', module: 'Customers', action: 'view', description: 'View customer directory and financial passbooks' },
  { permissionName: 'Manage Customer Records', permissionCode: 'customers:manage', module: 'Customers', action: 'manage', description: 'Update KYC, contact details, and account status' },

  // Rentals
  { permissionName: 'View Rental Contracts', permissionCode: 'rentals:view', module: 'Rentals', action: 'view', description: 'View leased units, tenant agreements, and rent yields' },
  { permissionName: 'Create Rental Leases', permissionCode: 'rentals:create', module: 'Rentals', action: 'create', description: 'Create tenant contracts and rent-back agreements' },
  { permissionName: 'Manage Rent Collections', permissionCode: 'rentals:manage', module: 'Rentals', action: 'manage', description: 'Record monthly rents, penalties, and disbursements' },

  // Maintenance & Service Tickets
  { permissionName: 'View Maintenance & Tickets', permissionCode: 'maintenance:view', module: 'Maintenance', action: 'view', description: 'View service tickets, maintenance bills' },
  { permissionName: 'Create Maintenance Bills', permissionCode: 'maintenance:create', module: 'Maintenance', action: 'create', description: 'Generate monthly CAM bills and work orders' },
  { permissionName: 'Resolve Service Requests', permissionCode: 'maintenance:manage', module: 'Maintenance', action: 'manage', description: 'Assign technicians and close complaint tickets' },

  // HR & Payroll
  { permissionName: 'View Staff & Attendance', permissionCode: 'hr:view', module: 'HR', action: 'view', description: 'View employee directory and daily attendance' },
  { permissionName: 'Manage Attendance & Leaves', permissionCode: 'hr:edit', module: 'HR', action: 'edit', description: 'Mark attendance and approve leave requests' },
  { permissionName: 'Process Monthly Payroll', permissionCode: 'hr:payroll', module: 'HR', action: 'approve', description: 'Calculate net salaries, deductions, and issue payslips' },
  { permissionName: 'Manage HR Directory', permissionCode: 'hr:manage', module: 'HR', action: 'manage', description: 'Add new staff, upload KYC documents, configure designations' },

  // Document Vault
  { permissionName: 'View Documents Vault', permissionCode: 'documents:view', module: 'Documents', action: 'view', description: 'Access S3 document vault and legal agreements' },
  { permissionName: 'Upload Documents', permissionCode: 'documents:upload', module: 'Documents', action: 'create', description: 'Upload title deeds, blueprints, KYC, and agreements' },
  { permissionName: 'Manage Document Archive', permissionCode: 'documents:manage', module: 'Documents', action: 'manage', description: 'Delete or archive confidential documents' },

  // Notifications Hub
  { permissionName: 'View Notification Logs', permissionCode: 'notifications:view', module: 'Notifications', action: 'view', description: 'View automated WhatsApp/SMS/Email reminder logs' },
  { permissionName: 'Send Manual Broadcasts', permissionCode: 'notifications:send', module: 'Notifications', action: 'create', description: 'Send broadcasts and configure reminder templates' },

  // BI Reports & Analytics
  { permissionName: 'View BI Reports', permissionCode: 'reports:view', module: 'Reports', action: 'view', description: 'Access analytical charts and summary reports' },
  { permissionName: 'Financial & P&L Reports', permissionCode: 'reports:financial', module: 'Reports', action: 'manage', description: 'Access cash flows, aging analysis, and revenue audits' },
  { permissionName: 'Export Reports', permissionCode: 'reports:export', module: 'Reports', action: 'export', description: 'Download Excel and PDF audit reports' },

  // User & Access Control
  { permissionName: 'View Users & Roles', permissionCode: 'users:view', module: 'AccessControl', action: 'view', description: 'View system user directory and role permissions' },
  { permissionName: 'Manage Users & Permissions', permissionCode: 'users:manage', module: 'AccessControl', action: 'manage', description: 'Create users, assign roles, and modify access privileges' },
];

export const seedAuthDefaults = async () => {
  try {
    console.log('🔄 Checking and initializing Authentication & Role-Based Access Control data...');

    // 1. Seed Permissions
    const permissionDocs = [];
    for (const def of PERMISSION_DEFINITIONS) {
      let perm = await Permission.findOne({ permissionCode: def.permissionCode });
      if (!perm) {
        perm = await Permission.create(def);
      }
      permissionDocs.push(perm);
    }
    const permMap = permissionDocs.reduce((acc, p) => ({ ...acc, [p.permissionCode]: p._id }), {});

    // 2. Seed Branches
    const defaultBranches = [
      {
        branchName: 'Krishna Valley Head Office (Mathura)',
        branchCode: 'HQ-MATHURA',
        address: { addressLine1: 'Civil Lines, Mathura', city: 'Mathura', state: 'Uttar Pradesh', pincode: '281001' },
        contactNumber: '+91 98765 43210',
        contactEmail: 'hq@krishnavalley.com',
        isHeadOffice: true,
        isActive: true,
      },
      {
        branchName: 'Krishna Valley Vrindavan Project Site',
        branchCode: 'SITE-VRINDAVAN',
        address: { addressLine1: 'Raman Reti Road, Vrindavan', city: 'Vrindavan', state: 'Uttar Pradesh', pincode: '281121' },
        contactNumber: '+91 98765 43211',
        contactEmail: 'vrindavan.site@krishnavalley.com',
        isHeadOffice: false,
        isActive: true,
      },
      {
        branchName: 'Delhi NCR Regional Hub',
        branchCode: 'REG-DELHI',
        address: { addressLine1: 'Connaught Place', city: 'New Delhi', state: 'Delhi', pincode: '110001' },
        contactNumber: '+91 98765 43212',
        contactEmail: 'delhi@krishnavalley.com',
        isHeadOffice: false,
        isActive: true,
      },
    ];

    const branchDocs = [];
    for (const b of defaultBranches) {
      let branch = await Branch.findOne({ branchCode: b.branchCode });
      if (!branch) {
        branch = await Branch.create(b);
      }
      branchDocs.push(branch);
    }
    const primaryBranch = branchDocs.find((b) => b.isHeadOffice) || branchDocs[0];

    // 3. Define and Seed Roles
    const roleDefinitions = [
      {
        roleName: 'Super Administrator',
        roleCode: 'super_admin',
        description: 'Full unrestricted access to all ERP modules, data, financial reports, and system settings.',
        isSystemRole: true,
        permissions: permissionDocs.map((p) => p._id), // All permissions
      },
      {
        roleName: 'Project & Site Manager',
        roleCode: 'project_manager',
        description: 'Oversees site execution, property inventory, store materials, tickets, and operational reports.',
        isSystemRole: true,
        permissions: [
          permMap['dashboard:view'],
          permMap['inventory:view'],
          permMap['inventory:create'],
          permMap['inventory:edit'],
          permMap['inventory:manage'],
          permMap['materials:view'],
          permMap['materials:create'],
          permMap['materials:issue'],
          permMap['materials:manage'],
          permMap['maintenance:view'],
          permMap['maintenance:manage'],
          permMap['documents:view'],
          permMap['documents:upload'],
          permMap['reports:view'],
          permMap['reports:export'],
        ].filter(Boolean),
      },
      {
        roleName: 'Sales & CRM Head',
        roleCode: 'sales_head',
        description: 'Manages sales pipelines, buyer allotments, payment milestones, lead inquiries, and CRM reports.',
        isSystemRole: true,
        permissions: [
          permMap['dashboard:view'],
          permMap['crm:view'],
          permMap['crm:create'],
          permMap['crm:edit'],
          permMap['crm:export'],
          permMap['sales:view'],
          permMap['sales:create'],
          permMap['sales:edit'],
          permMap['sales:approve'],
          permMap['customers:view'],
          permMap['customers:manage'],
          permMap['inventory:view'],
          permMap['notifications:view'],
          permMap['notifications:send'],
          permMap['reports:view'],
          permMap['reports:export'],
        ].filter(Boolean),
      },
      {
        roleName: 'Agent (Channel Partner)',
        roleCode: 'agent',
        description: 'Authorized Channel Partner / Agent. Can submit buyer leads, track live pipeline progress, and earn commissions upon site visit maturity.',
        isSystemRole: true,
        permissions: [
          permMap['dashboard:view'],
          permMap['crm:view'],
          permMap['crm:create'],
          permMap['crm:edit'],
          permMap['agent:leads'],
          permMap['agent:upload'],
          permMap['agent:wallet'],
          permMap['inventory:view'],
        ].filter(Boolean),
      },
      {
        roleName: 'Site & Stores Engineer',
        roleCode: 'site_engineer',
        description: 'Responsible for site material stocks, GRN receipts, store transfers, and construction logs.',
        isSystemRole: true,
        permissions: [
          permMap['dashboard:view'],
          permMap['inventory:view'],
          permMap['materials:view'],
          permMap['materials:create'],
          permMap['materials:issue'],
          permMap['maintenance:view'],
          permMap['maintenance:manage'],
          permMap['documents:view'],
        ].filter(Boolean),
      },
      {
        roleName: 'Accounts & Finance Head',
        roleCode: 'accounts_manager',
        description: 'Manages payment collections, customer passbooks, rental yields, maintenance billing, and payroll.',
        isSystemRole: true,
        permissions: [
          permMap['dashboard:view'],
          permMap['sales:view'],
          permMap['sales:edit'],
          permMap['customers:view'],
          permMap['customers:manage'],
          permMap['rentals:view'],
          permMap['rentals:manage'],
          permMap['maintenance:view'],
          permMap['maintenance:create'],
          permMap['hr:view'],
          permMap['hr:payroll'],
          permMap['reports:view'],
          permMap['reports:financial'],
          permMap['reports:export'],
        ].filter(Boolean),
      },
      {
        roleName: 'HR & Payroll Manager',
        roleCode: 'hr_manager',
        description: 'Manages staff directory, daily biometric attendance, leave approvals, and monthly salary disbursement.',
        isSystemRole: true,
        permissions: [
          permMap['dashboard:view'],
          permMap['hr:view'],
          permMap['hr:edit'],
          permMap['hr:payroll'],
          permMap['hr:manage'],
          permMap['documents:view'],
          permMap['documents:upload'],
          permMap['reports:view'],
        ].filter(Boolean),
      },
      {
        roleName: 'Rental & Tenant Relations',
        roleCode: 'tenant_relations',
        description: 'Handles tenant lease contracts, guaranteed rent-back yields, tenant messaging, and service tickets.',
        isSystemRole: true,
        permissions: [
          permMap['dashboard:view'],
          permMap['rentals:view'],
          permMap['rentals:create'],
          permMap['rentals:manage'],
          permMap['maintenance:view'],
          permMap['notifications:view'],
          permMap['notifications:send'],
          permMap['reports:view'],
        ].filter(Boolean),
      },
    ];

    const roleDocs = {};
    for (const r of roleDefinitions) {
      let role = await Role.findOne({ roleCode: r.roleCode });
      if (!role) {
        role = await Role.create(r);
      } else {
        role.permissions = r.permissions;
        role.roleName = r.roleName;
        role.description = r.description;
        await role.save();
      }
      roleDocs[r.roleCode] = role;
    }

    // 4. Seed Default Users
    const defaultUsers = [
      {
        firstName: 'System',
        lastName: 'Administrator',
        username: 'admin',
        email: 'admin@krishnavalley.com',
        mobileNo: '+91 98765 00001',
        passwordPlain: 'Admin@12345',
        roleCode: 'super_admin',
      },
      {
        firstName: 'Rajesh',
        lastName: 'Sharma',
        username: 'sales_head',
        email: 'sales.head@krishnavalley.com',
        mobileNo: '+91 98765 00002',
        passwordPlain: 'Sales@12345',
        roleCode: 'sales_head',
      },
      {
        firstName: 'Rahul',
        lastName: 'Sharma',
        username: 'agent_rahul',
        email: 'agent.rahul@krishnavalley.com',
        mobileNo: '+91 98765 00010',
        passwordPlain: 'Agent@12345',
        roleCode: 'agent',
        agentProfile: {
          agentCode: 'AGT-101',
          agencyName: 'Vrindavan Prime Realty Partners',
          reraNumber: 'UPRERAAGT12894',
          commissionType: 'percentage',
          commissionRate: 2, // 2% per matured site visit
          walletBalance: 90000,
          totalEarned: 90000,
          maturedLeadsCount: 1,
          bankDetails: {
            accountHolder: 'Rahul Sharma',
            accountNumber: '918237461928',
            ifscCode: 'HDFC0001234',
            bankName: 'HDFC Bank Mathura',
            upiId: 'rahul.realty@okhdfcbank',
          },
        },
      },
      {
        firstName: 'Amit',
        lastName: 'Verma',
        username: 'site_eng',
        email: 'site.engineer@krishnavalley.com',
        mobileNo: '+91 98765 00003',
        passwordPlain: 'Site@12345',
        roleCode: 'site_engineer',
      },
      {
        firstName: 'Priya',
        lastName: 'Nair',
        username: 'hr_manager',
        email: 'hr.manager@krishnavalley.com',
        mobileNo: '+91 98765 00004',
        passwordPlain: 'Hr@12345',
        roleCode: 'hr_manager',
      },
      {
        firstName: 'Vikram',
        lastName: 'Gupta',
        username: 'accounts_head',
        email: 'accounts@krishnavalley.com',
        mobileNo: '+91 98765 00005',
        passwordPlain: 'Accounts@12345',
        roleCode: 'accounts_manager',
      },
    ];

    let agentUserDoc = null;

    for (const u of defaultUsers) {
      let user = await User.findOne({
        $or: [{ username: u.username }, { email: u.email }],
      });

      const role = roleDocs[u.roleCode];
      if (!role) continue;

      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(u.passwordPlain, salt);

      if (!user) {
        user = await User.create({
          firstName: u.firstName,
          lastName: u.lastName,
          username: u.username,
          email: u.email,
          mobileNo: u.mobileNo,
          passwordHash,
          roleId: role._id,
          branchAccess: [
            {
              branchId: primaryBranch._id,
              accessLevel: 'manage',
              isPrimary: true,
            },
          ],
          status: 'active',
          failedLoginAttempts: 0,
          agentProfile: u.agentProfile || undefined,
        });

        if (!role.users.includes(user._id)) {
          role.users.push(user._id);
          await role.save();
        }
      } else {
        user.roleId = role._id;
        user.status = 'active';
        user.failedLoginAttempts = 0;
        user.accountLockedUntil = null;
        user.passwordHash = passwordHash;
        if (u.agentProfile) {
          user.agentProfile = { ...user.agentProfile, ...u.agentProfile };
        }
        if (!user.branchAccess || user.branchAccess.length === 0) {
          user.branchAccess = [
            {
              branchId: primaryBranch._id,
              accessLevel: 'manage',
              isPrimary: true,
            },
          ];
        }
        await user.save();

        if (!role.users.includes(user._id)) {
          role.users.push(user._id);
          await role.save();
        }
      }

      if (u.username === 'agent_rahul') {
        agentUserDoc = user;
      }
    }

    // 5. Seed sample agent leads if agent exists
    if (agentUserDoc) {
      const existingAgentLeads = await Lead.countDocuments({ agentId: agentUserDoc._id });
      if (existingAgentLeads === 0) {
        // Sample Lead 1: Matured Site Visit (Commission Credited)
        const maturedLead = await Lead.create({
          name: 'Sunil Aggarwal',
          mobileNo: '+91 98111 22334',
          email: 'sunil.aggarwal@gmail.com',
          budget: 4500000,
          requirement: '2BHK Deluxe Suite (Vrindavan Heritage)',
          leadSource: 'agent',
          status: 'site_visit_completed',
          agentId: agentUserDoc._id,
          siteVisitDetails: {
            completedDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            visitedBy: 'Sunil Aggarwal & Family',
            feedback: 'Loved Tower B 3rd Floor unit. Discussing payment milestones with sales head.',
          },
          commission: {
            commissionType: 'percentage',
            commissionRate: 2,
            amount: 90000,
            status: 'credited',
            creditedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
            notes: '2% commission on ₹45,00,000 budget credited on verified site visit.',
          },
          followUps: [
            {
              date: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
              mode: 'call',
              notes: 'Initial requirement discussion. Interested in 2BHK.',
              status: 'completed',
            },
            {
              date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
              mode: 'site_visit',
              notes: 'Site visit conducted at Vrindavan Project. Lead matured.',
              status: 'completed',
            },
          ],
        });

        await CommissionLedger.create({
          agentId: agentUserDoc._id,
          leadId: maturedLead._id,
          leadName: maturedLead.name,
          leadMobile: maturedLead.mobileNo,
          triggerEvent: 'site_visit_completed',
          commissionType: 'percentage',
          commissionRate: 2,
          baseAmount: 4500000,
          calculatedAmount: 90000,
          siteVisitDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          status: 'credited',
          creditedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
          remarks: 'Automated 2% commission on site visit maturity',
        });

        // Sample Lead 2: Site Visit Scheduled (Ready to be matured by agent/admin)
        await Lead.create({
          name: 'Meenakshi Sundaram',
          mobileNo: '+91 98222 44556',
          email: 'meenakshi.s@outlook.com',
          budget: 6000000,
          requirement: '3BHK Premium Garden View',
          leadSource: 'agent',
          status: 'site_visit_scheduled',
          agentId: agentUserDoc._id,
          siteVisitDetails: {
            scheduledDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
          },
          commission: {
            commissionType: 'percentage',
            commissionRate: 2,
            amount: 0,
            status: 'pending',
          },
          followUps: [
            {
              date: new Date(),
              mode: 'site_visit',
              notes: 'Site visit scheduled for this weekend. Potential 2% commission (₹1,20,000) on maturity.',
              nextFollowUpDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
              status: 'pending',
            },
          ],
        });

        // Sample Lead 3: New Inquiry
        await Lead.create({
          name: 'Deepak Singhal',
          mobileNo: '+91 98333 77889',
          email: 'deepak.singhal@yahoo.com',
          budget: 3500000,
          requirement: '1BHK Studio Apartment',
          leadSource: 'agent',
          status: 'new',
          agentId: agentUserDoc._id,
          commission: {
            commissionType: 'percentage',
            commissionRate: 2,
            amount: 0,
            status: 'pending',
          },
          followUps: [
            {
              date: new Date(),
              mode: 'call',
              notes: 'Client looking for rental yield investment in Vrindavan.',
              status: 'pending',
            },
          ],
        });
      }
    }

    console.log('✅ Auth, Agent Roles & Commission seed data ready!');
  } catch (error) {
    console.error('❌ Error during Auth Seeding:', error.message);
  }
};

export default seedAuthDefaults;
