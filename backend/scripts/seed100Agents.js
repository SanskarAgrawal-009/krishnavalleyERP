import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import { User } from '../models/User.js';
import { Role } from '../models/Role.js';
import { Branch } from '../models/Branch.js';
import Lead from '../models/Lead.js';
import SiteVisit from '../models/SiteVisit.js';
import Project from '../models/Project.js';
import Flat from '../models/Flat.js';
import CommissionLedger from '../models/CommissionLedger.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const FIRST_NAMES = [
  'Amit', 'Rahul', 'Suresh', 'Ramesh', 'Pooja', 'Vikram', 'Anil', 'Deepak', 'Rajesh', 'Sunil',
  'Manoj', 'Neeraj', 'Pankaj', 'Sanjay', 'Dinesh', 'Ajay', 'Vijay', 'Rohit', 'Ashok', 'Gaurav',
  'Mohit', 'Sachin', 'Naveen', 'Alok', 'Pradeep', 'Santosh', 'Mahesh', 'Kamal', 'Ravi', 'Mukesh',
  'Kishore', 'Praveen', 'Harish', 'Vinod', 'Anand', 'Hemant', 'Tarun', 'Lalit', 'Varun', 'Yogesh',
  'Bhupendra', 'Chirag', 'Devendra', 'Girish', 'Jagdish', 'Kailash', 'Laxman', 'Madhav', 'Narayan', 'Omkar',
];

const LAST_NAMES = [
  'Sharma', 'Verma', 'Gupta', 'Singh', 'Agrawal', 'Mishra', 'Pandey', 'Chauhan', 'Yadav', 'Tiwari',
  'Saxena', 'Bhardwaj', 'Dubey', 'Shukla', 'Chaturvedi', 'Tripathi', 'Gautam', 'Joshi', 'Bhatnagar', 'Mathur',
  'Dixit', 'Rawat', 'Pathak', 'Upadhyay', 'Chaudhary', 'Tomar', 'Rathore', 'Solanki', 'Parihar', 'Lodhi'
];

const AGENCY_PREFIXES = [
  'Braj Bhoomi', 'Radha Krishna', 'Vrindavan Prime', 'Mathura Gold', 'Shri Dham', 'Govardhan Valley',
  'Yamuna Enclave', 'Apex Landbase', 'Heritage Realtors', 'Sanatan Properties', 'Dwarkadhish Realty',
  'Divine City Infra', 'Royal Brij Estates', 'Kalka Promoters', 'Gokul Associates', 'Paramount Landbase',
  'Shri Giriraj Realtors', 'Keshav Associates', 'Bankey Bihari Realtech', 'Kalyan Estates'
];

const AGENCY_SUFFIXES = [
  'Realtors', 'Properties', 'Associates', 'Realtech', 'Estates', 'Infra', 'Landbase', 'Consultants', 'Promoters', 'Group'
];

const CITIES = ['Mathura', 'Vrindavan', 'Agra', 'Delhi NCR', 'Noida', 'Gurugram', 'Faridabad', 'Aligarh', 'Bharatpur', 'Hathras'];

const TIERS = [
  { tier: 'Platinum', rate: 3.0, weight: 20 },
  { tier: 'Gold', rate: 2.5, weight: 40 },
  { tier: 'Silver', rate: 2.0, weight: 40 },
  { tier: 'Standard', rate: 1.5, weight: 20 },
];

async function seed100Agents() {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/krishna_valley_erp';
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB Atlas successfully.');

    // 1. Get or Create Agent Role
    let agentRole = await Role.findOne({ roleCode: 'agent' });
    if (!agentRole) {
      console.log('Creating Agent role...');
      agentRole = await Role.create({
        roleName: 'Channel Partner / Agent',
        roleCode: 'agent',
        description: 'Authorized Channel Partner & Real Estate Broker for Krishna Valley projects.',
        isActive: true,
        isSystemRole: true,
        permissions: [],
      });
    }

    // 2. Get or Create Default Branch
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

    // 3. Get Project and Flats for sample lead association
    const projects = await Project.find();
    const flats = await Flat.find();

    const passwordHash = await bcrypt.hash('password123', 10);

    console.log('Generating 120 Channel Partners / Agents...');
    const agentsToInsert = [];
    const generatedAgentCodes = new Set();

    let codeCounter = 101;

    for (let i = 0; i < 120; i++) {
      const fName = FIRST_NAMES[i % FIRST_NAMES.length];
      const lName = LAST_NAMES[(i * 3) % LAST_NAMES.length];
      const prefix = AGENCY_PREFIXES[i % AGENCY_PREFIXES.length];
      const suffix = AGENCY_SUFFIXES[(i * 2) % AGENCY_SUFFIXES.length];
      const agencyName = `${prefix} ${suffix}`;
      const city = CITIES[i % CITIES.length];

      const agentCode = `AGT-${codeCounter}`;
      generatedAgentCodes.add(agentCode);

      // Determine tier
      let tierObj = TIERS[0];
      if (i < 20) tierObj = TIERS[0]; // Platinum
      else if (i < 60) tierObj = TIERS[1]; // Gold
      else if (i < 100) tierObj = TIERS[2]; // Silver
      else tierObj = TIERS[3]; // Standard

      const mobileNo = `98${Math.floor(10000000 + Math.random() * 89999999)}`;
      const username = `agent.${fName.toLowerCase()}${codeCounter}`;
      const email = `${username}@krishnavalleypartners.in`;

      const walletBalance = Math.floor(Math.random() * 15) * 25000 + 25000; // 25k to 400k
      const totalEarned = walletBalance + Math.floor(Math.random() * 20) * 50000;
      const maturedCount = Math.floor(totalEarned / 75000) + 1;

      const reraNum = `UPRERAAGT${Math.floor(10000 + Math.random() * 89999)}`;

      const agentDoc = {
        firstName: fName,
        lastName: lName,
        username,
        email,
        mobileNo,
        passwordHash,
        roleId: agentRole._id,
        status: i % 25 === 0 ? 'inactive' : 'active',
        branchAccess: [{ branchId: defaultBranch._id, accessLevel: 'manage', isPrimary: true }],
        agentProfile: {
          agentCode,
          agencyName,
          reraNumber: reraNum,
          commissionType: 'percentage',
          commissionRate: tierObj.rate,
          tier: tierObj.tier,
          city,
          walletBalance,
          totalEarned,
          maturedLeadsCount: maturedCount,
          bankDetails: {
            accountHolder: `${fName} ${lName}`,
            accountNumber: `3098${Math.floor(10000000 + Math.random() * 89999999)}`,
            ifscCode: ['HDFC0001234', 'ICIC0005678', 'SBIN0009876', 'PUNB0004321', 'UTIB0002468'][i % 5],
            bankName: ['HDFC Bank', 'ICICI Bank', 'State Bank of India', 'Punjab National Bank', 'Axis Bank'][i % 5],
            upiId: `${mobileNo}@upi`,
          },
        },
      };

      agentsToInsert.push(agentDoc);
      codeCounter++;
    }

    // Upsert / Insert Agents
    let createdCount = 0;
    let updatedCount = 0;

    for (const ag of agentsToInsert) {
      const existing = await User.findOne({ username: ag.username });
      if (existing) {
        existing.agentProfile = ag.agentProfile;
        existing.roleId = ag.roleId;
        existing.mobileNo = ag.mobileNo;
        await existing.save();
        updatedCount++;
      } else {
        await User.create(ag);
        createdCount++;
      }
    }

    console.log(`Agents Processed: ${createdCount} created, ${updatedCount} updated. Total ~120 agents in database.`);

    // 4. Seed sample Site Visits and Leads for the first 25 agents so inhouse verification can be tested
    const seededAgents = await User.find({ 'agentProfile.agentCode': { $exists: true, $ne: '' } }).limit(25);

    console.log('Seeding sample site visits with inhouse pending verification...');
    const SAMPLE_CLIENTS = [
      { name: 'Dr. Alok Nath Dixit', mobile: '9811223344', requirement: '3BHK Luxury Villa', budget: 8500000 },
      { name: 'Smt. Sunita Singhal', mobile: '9871556677', requirement: '2BHK Premium Apartment', budget: 4800000 },
      { name: 'Shri Brajesh Agarwal', mobile: '9922334455', requirement: '1BHK Studio Unit', budget: 2800000 },
      { name: 'Capt. Rakesh Bhardwaj', mobile: '9711889900', requirement: '4BHK Penthouse', budget: 12500000 },
      { name: 'Er. Sandeep Mittal', mobile: '9833445566', requirement: '2BHK Executive Flat', budget: 5200000 },
      { name: 'Prof. Hemant Tripathi', mobile: '9911224466', requirement: '3BHK Garden Apartment', budget: 7400000 },
    ];

    let visitCount = 0;
    for (let i = 0; i < seededAgents.length && i < SAMPLE_CLIENTS.length; i++) {
      const ag = seededAgents[i];
      const client = SAMPLE_CLIENTS[i];
      const targetProj = projects[i % projects.length] || null;
      const targetFlat = flats[i % flats.length] || null;

      // Create or update Lead
      let lead = await Lead.findOne({ mobileNo: client.mobile });
      if (!lead) {
        lead = await Lead.create({
          name: client.name,
          mobileNo: client.mobile,
          budget: client.budget,
          requirement: client.requirement,
          agentId: ag._id,
          leadSource: 'agent',
          status: i % 2 === 0 ? 'site_visit_completed_pending_approval' : 'site_visit_completed',
          assignedFlat: targetFlat?._id || null,
          siteVisitDetails: {
            completedDate: new Date(),
            feedback: `Client attended site visit with ${ag.agentProfile?.agencyName || 'Agent'}. Highly impressed with location.`,
            isVerified: i % 2 !== 0,
            approvalStatus: i % 2 === 0 ? 'pending' : 'approved',
            submittedByAgent: ag._id,
            verifiedBy: i % 2 !== 0 ? ag._id : null,
          },
          followUps: [{
            date: new Date(),
            mode: 'site_visit',
            notes: `Site visit conducted by ${ag.firstName} ${ag.lastName} (${ag.agentProfile?.agentCode}).`,
            status: 'completed',
          }]
        });
      }

      // Create SiteVisit record
      const visitCode = `KV-SV-${1000 + i}`;
      let visit = await SiteVisit.findOne({ visitCode });
      if (!visit) {
        visit = await SiteVisit.create({
          visitCode,
          leadId: lead._id,
          agentId: ag._id,
          agentCode: ag.agentProfile?.agentCode || 'AGT-101',
          agentName: `${ag.firstName} ${ag.lastName}`,
          agentMobile: ag.mobileNo,
          partyName: client.name,
          partyMobile: client.mobile,
          projectId: targetProj?._id || null,
          flatIds: targetFlat ? [targetFlat._id] : [],
          visitDate: new Date(),
          partySelfieUrl: 'https://images.unsplash.com/photo-1560250097-0b93528c311a?w=400&auto=format&fit=crop&q=60',
          discussionNotes: `Visiting party explored tower specs and pricing with ${ag.agentProfile?.agencyName}.`,
          verificationStatus: i % 2 === 0 ? 'pending' : 'approved',
          bookingStatus: i === 1 ? 'booked' : 'not_booked',
          commissionAmount: Math.round((client.budget * (ag.agentProfile?.commissionRate || 2)) / 100),
        });
        visitCount++;
      }

      // Store lead and site visit in agent User schema
      await User.findByIdAndUpdate(ag._id, {
        $addToSet: {
          'agentProfile.leads': lead._id,
          'agentProfile.siteVisits': visit._id,
        },
      });
    }

    console.log(`Sample Site Visits Seeded: ${visitCount}`);
    console.log('🎉 100+ Agents and Network Seed Completed Successfully!');
    process.exit(0);
  } catch (error) {
    console.error('Seeding error:', error);
    process.exit(1);
  }
}

seed100Agents();
