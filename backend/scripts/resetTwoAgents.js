import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import path from 'path';
import { fileURLToPath } from 'url';

import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { Branch } from '../models/Branch.js';
import Lead from '../models/Lead.js';
import SiteVisit from '../models/SiteVisit.js';
import Project from '../models/Project.js';
import Flat from '../models/Flat.js';
import CommissionLedger from '../models/CommissionLedger.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

async function resetTwoAgents() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishna_valley_erp';
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas successfully.');

    // 1. Ensure Agent Role exists
    let agentRole = await Role.findOne({ roleCode: 'agent' });
    if (!agentRole) {
      console.log('Creating Agent role...');
      agentRole = await Role.create({
        roleName: 'Channel Partner / Agent',
        roleCode: 'agent',
        description: 'Authorized Channel Partner & Real Estate Broker for Krishna Valley projects.',
        isActive: true,
        isSystemRole: true,
        permissions: ['agent:leads'],
      });
    }

    // 2. Ensure Default Branch exists
    let defaultBranch = await Branch.findOne();
    if (!defaultBranch) {
      defaultBranch = await Branch.create({
        branchName: 'Mathura Head Office',
        branchCode: 'HO-MTH',
        city: 'Mathura',
        state: 'Uttar Pradesh',
        isActive: true,
      });
    }

    // 3. Delete all existing agent users (leaving admin/staff accounts intact)
    const adminUsernames = ['admin', 'sales_head', 'site_eng', 'hr_manager', 'accounts_head'];
    console.log('Removing old agent accounts and cleaning up...');

    const deletedAgents = await User.deleteMany({
      $and: [
        { username: { $nin: adminUsernames } },
        {
          $or: [
            { roleId: agentRole._id },
            { 'agentProfile.agentCode': { $exists: true } },
            { username: { $regex: /^agent/i } },
            { email: { $regex: /agent|krishnavalleypartners/i } },
          ],
        },
      ],
    });
    console.log(`Removed ${deletedAgents.deletedCount} old agent accounts.`);

    // 4. Delete old CommissionLedger and SiteVisit records from old agents
    await CommissionLedger.deleteMany({});
    await SiteVisit.deleteMany({});
    await Lead.deleteMany({ leadSource: 'agent' });
    console.log('Cleaned old agent commissions, site visits, and agent leads.');

    // 5. Get sample projects and flats for linking
    const projects = await Project.find().limit(3);
    const flats = await Flat.find().limit(10);

    const targetProj1 = projects[0] || null;
    const targetProj2 = projects[1] || projects[0] || null;
    const flat1 = flats[0] || null;
    const flat2 = flats[1] || null;
    const flat3 = flats[2] || null;
    const flat4 = flats[3] || null;

    // Hash password for both agents
    const passwordHash = await bcrypt.hash('Agent@123', 10);

    // =========================================================
    // CREATE AGENT 1: Rahul Sharma (agent.rahul / Agent@123)
    // =========================================================
    const agent1 = await User.create({
      firstName: 'Rahul',
      lastName: 'Sharma',
      username: 'agent.rahul',
      email: 'agent.rahul@krishnavalley.com',
      mobileNo: '9876543210',
      passwordHash,
      roleId: agentRole._id,
      status: 'active',
      branchAccess: [{ branchId: defaultBranch._id, accessLevel: 'manage', isPrimary: true }],
      agentProfile: {
        agentCode: 'AGT-101',
        agencyName: 'Vrindavan Prime Realtors',
        reraNumber: 'UPRERAAGT10188',
        commissionType: 'percentage',
        commissionRate: 2.5,
        tier: 'Platinum',
        city: 'Vrindavan',
        walletBalance: 90000,
        totalEarned: 180000,
        maturedLeadsCount: 2,
        leads: [],
        siteVisits: [],
        bankDetails: {
          accountHolder: 'Rahul Sharma',
          accountNumber: '30981234567890',
          ifscCode: 'HDFC0001234',
          bankName: 'HDFC Bank Vrindavan',
          upiId: '9876543210@upi',
        },
      },
    });

    // =========================================================
    // CREATE AGENT 2: Amit Verma (agent.amit / Agent@123)
    // =========================================================
    const agent2 = await User.create({
      firstName: 'Amit',
      lastName: 'Verma',
      username: 'agent.amit',
      email: 'agent.amit@krishnavalley.com',
      mobileNo: '9812345678',
      passwordHash,
      roleId: agentRole._id,
      status: 'active',
      branchAccess: [{ branchId: defaultBranch._id, accessLevel: 'manage', isPrimary: true }],
      agentProfile: {
        agentCode: 'AGT-102',
        agencyName: 'Braj Bhoomi Properties',
        reraNumber: 'UPRERAAGT10299',
        commissionType: 'percentage',
        commissionRate: 2.0,
        tier: 'Gold',
        city: 'Mathura',
        walletBalance: 50000,
        totalEarned: 120000,
        maturedLeadsCount: 1,
        leads: [],
        siteVisits: [],
        bankDetails: {
          accountHolder: 'Amit Verma',
          accountNumber: '40989876543210',
          ifscCode: 'ICIC0005678',
          bankName: 'ICICI Bank Mathura',
          upiId: '9812345678@upi',
        },
      },
    });

    console.log('✅ Created Agent 1: Rahul Sharma (@agent.rahul / Agent@123)');
    console.log('✅ Created Agent 2: Amit Verma (@agent.amit / Agent@123)');

    // =========================================================
    // SEED SAMPLE LEADS & VISITS FOR AGENT 1 (Rahul Sharma)
    // =========================================================
    const lead1_1 = await Lead.create({
      name: 'Dr. Alok Nath Dixit',
      mobileNo: '9811223344',
      email: 'alok.dixit@example.com',
      budget: 8500000,
      requirement: '3BHK Luxury Villa',
      agentId: agent1._id,
      leadSource: 'agent',
      status: 'site_visit_completed_pending_approval',
      assignedFlat: flat1?._id || null,
      siteVisitDetails: {
        completedDate: new Date(),
        feedback: 'Client attended site visit with Vrindavan Prime Realtors. Highly impressed with tower location.',
        isVerified: false,
        approvalStatus: 'pending',
        submittedByAgent: agent1._id,
      },
      followUps: [
        {
          date: new Date(Date.now() - 2 * 86400000),
          mode: 'call',
          notes: 'Client inquired about 3BHK villa with garden facing.',
          status: 'completed',
        },
        {
          date: new Date(),
          mode: 'site_visit',
          notes: 'Site visit conducted. Client loved the sample flat and asked for floor plan payment breakdown.',
          status: 'completed',
        },
      ],
    });

    const lead1_2 = await Lead.create({
      name: 'Smt. Sunita Singhal',
      mobileNo: '9871556677',
      email: 'sunita.singhal@example.com',
      budget: 4800000,
      requirement: '2BHK Premium Apartment',
      agentId: agent1._id,
      leadSource: 'agent',
      status: 'site_visit_completed',
      assignedFlat: flat2?._id || null,
      siteVisitDetails: {
        completedDate: new Date(Date.now() - 1 * 86400000),
        handoverDate: new Date(Date.now() + 4 * 86400000),
        isHandedOver: false,
        maturityPeriodDays: 5,
        feedback: 'Site visit approved by Inhouse Sales Head.',
        isVerified: true,
        approvalStatus: 'approved',
        verifiedBy: null,
      },
      commission: {
        commissionType: 'percentage',
        commissionRate: 2.5,
        amount: 120000,
        status: 'credited',
        creditedAt: new Date(),
        notes: 'Credited ₹1,20,000 to Rahul Sharma. 5-day exclusive window active.',
      },
      followUps: [
        {
          date: new Date(Date.now() - 3 * 86400000),
          mode: 'call',
          notes: 'Initial discussion on budget and payment plan.',
          status: 'completed',
        },
        {
          date: new Date(Date.now() - 1 * 86400000),
          mode: 'site_visit',
          notes: 'Site visit conducted and approved.',
          status: 'completed',
        },
      ],
    });

    const visit1_1 = await SiteVisit.create({
      visitCode: 'KV-SV-1001',
      leadId: lead1_1._id,
      agentId: agent1._id,
      agentCode: 'AGT-101',
      agentName: 'Rahul Sharma',
      agentMobile: '9876543210',
      partyName: 'Dr. Alok Nath Dixit',
      partyMobile: '9811223344',
      projectId: targetProj1?._id || null,
      flatIds: flat1 ? [flat1._id] : [],
      visitDate: new Date(),
      partySelfieUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=60',
      discussionNotes: 'Client explored tower specs, amenities and payment schedule with Rahul Sharma.',
      verificationStatus: 'pending',
      bookingStatus: 'not_booked',
      commissionAmount: 212500,
    });

    const visit1_2 = await SiteVisit.create({
      visitCode: 'KV-SV-1002',
      leadId: lead1_2._id,
      agentId: agent1._id,
      agentCode: 'AGT-101',
      agentName: 'Rahul Sharma',
      agentMobile: '9876543210',
      partyName: 'Smt. Sunita Singhal',
      partyMobile: '9871556677',
      projectId: targetProj1?._id || null,
      flatIds: flat2 ? [flat2._id] : [],
      visitDate: new Date(Date.now() - 1 * 86400000),
      partySelfieUrl: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=400&auto=format&fit=crop&q=60',
      discussionNotes: 'Verified site visit with Sunita Singhal. Client confirmed booking intention.',
      verificationStatus: 'approved',
      bookingStatus: 'not_booked',
      commissionAmount: 120000,
    });

    const comm1 = await CommissionLedger.create({
      agentId: agent1._id,
      leadId: lead1_2._id,
      leadName: 'Smt. Sunita Singhal',
      leadMobile: '9871556677',
      flatId: flat2?._id || null,
      transactionType: 'credit',
      triggerEvent: 'site_visit_completed',
      commissionType: 'percentage',
      commissionRate: 2.5,
      baseAmount: 4800000,
      calculatedAmount: 120000,
      siteVisitDate: new Date(Date.now() - 1 * 86400000),
      status: 'credited',
      creditedAt: new Date(),
      remarks: 'Automated 2.5% commission on site visit maturity for Smt. Sunita Singhal',
    });

    lead1_2.commission.ledgerId = comm1._id;
    await lead1_2.save();

    // Link leads and visits to Agent 1 document
    agent1.agentProfile.leads = [lead1_1._id, lead1_2._id];
    agent1.agentProfile.siteVisits = [visit1_1._id, visit1_2._id];
    await agent1.save();

    // =========================================================
    // SEED SAMPLE LEADS & VISITS FOR AGENT 2 (Amit Verma)
    // =========================================================
    const lead2_1 = await Lead.create({
      name: 'Shri Brajesh Agarwal',
      mobileNo: '9922334455',
      email: 'brajesh.agarwal@example.com',
      budget: 3500000,
      requirement: '1BHK Studio Unit',
      agentId: agent2._id,
      leadSource: 'agent',
      status: 'site_visit_completed_pending_approval',
      assignedFlat: flat3?._id || null,
      siteVisitDetails: {
        completedDate: new Date(),
        feedback: 'Client visited site with Amit Verma from Braj Bhoomi Properties.',
        isVerified: false,
        approvalStatus: 'pending',
        submittedByAgent: agent2._id,
      },
      followUps: [
        {
          date: new Date(),
          mode: 'site_visit',
          notes: 'Conducted site visit for 1BHK Studio unit.',
          status: 'completed',
        },
      ],
    });

    const lead2_2 = await Lead.create({
      name: 'Capt. Rakesh Bhardwaj',
      mobileNo: '9711889900',
      email: 'rakesh.bhardwaj@example.com',
      budget: 6000000,
      requirement: '2BHK Executive Suite',
      agentId: agent2._id,
      leadSource: 'agent',
      status: 'new',
      assignedFlat: flat4?._id || null,
      followUps: [
        {
          date: new Date(),
          mode: 'call',
          notes: 'Client looking for investment property near Highway.',
          status: 'pending',
        },
      ],
    });

    const visit2_1 = await SiteVisit.create({
      visitCode: 'KV-SV-1003',
      leadId: lead2_1._id,
      agentId: agent2._id,
      agentCode: 'AGT-102',
      agentName: 'Amit Verma',
      agentMobile: '9812345678',
      partyName: 'Shri Brajesh Agarwal',
      partyMobile: '9922334455',
      projectId: targetProj2?._id || null,
      flatIds: flat3 ? [flat3._id] : [],
      visitDate: new Date(),
      partySelfieUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&auto=format&fit=crop&q=60',
      discussionNotes: 'Client inspected unit finishes and asked for loan assistance options.',
      verificationStatus: 'pending',
      bookingStatus: 'not_booked',
      commissionAmount: 70000,
    });

    const comm2 = await CommissionLedger.create({
      agentId: agent2._id,
      leadId: lead2_1._id,
      leadName: 'Shri Brajesh Agarwal',
      leadMobile: '9922334455',
      flatId: flat3?._id || null,
      transactionType: 'credit',
      triggerEvent: 'site_visit_completed',
      commissionType: 'percentage',
      commissionRate: 2.0,
      baseAmount: 3500000,
      calculatedAmount: 70000,
      siteVisitDate: new Date(),
      status: 'credited',
      creditedAt: new Date(),
      remarks: 'Automated 2.0% commission on site visit for Shri Brajesh Agarwal',
    });

    // Link leads and visits to Agent 2 document
    agent2.agentProfile.leads = [lead2_1._id, lead2_2._id];
    agent2.agentProfile.siteVisits = [visit2_1._id];
    await agent2.save();

    console.log('\n=========================================================');
    console.log('🎉 EXACTLY TWO AGENTS CONFIGURED IN MONGODB:');
    console.log('=========================================================');
    console.log('1️⃣ AGENT 1:');
    console.log('   👤 Name:       Rahul Sharma');
    console.log('   🔑 Username:   agent.rahul');
    console.log('   📧 Email:      agent.rahul@krishnavalley.com');
    console.log('   🔒 Password:   Agent@123');
    console.log('   🏷️ Agent Code: AGT-101');
    console.log('   🏢 Agency:     Vrindavan Prime Realtors (Vrindavan)');
    console.log('   ⭐ Tier:       Platinum (2.5% Commission)');
    console.log('---------------------------------------------------------');
    console.log('2️⃣ AGENT 2:');
    console.log('   👤 Name:       Amit Verma');
    console.log('   🔑 Username:   agent.amit');
    console.log('   📧 Email:      agent.amit@krishnavalley.com');
    console.log('   🔒 Password:   Agent@123');
    console.log('   🏷️ Agent Code: AGT-102');
    console.log('   🏢 Agency:     Braj Bhoomi Properties (Mathura)');
    console.log('   ⭐ Tier:       Gold (2.0% Commission)');
    console.log('=========================================================\n');

    process.exit(0);
  } catch (error) {
    console.error('Error resetting agents:', error);
    process.exit(1);
  }
}

resetTwoAgents();
