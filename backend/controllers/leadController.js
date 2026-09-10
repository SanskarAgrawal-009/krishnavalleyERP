import Lead from '../models/Lead.js';
import Flat from '../models/Flat.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import SalesLead from '../models/SalesLead.js';
import CommissionLedger from '../models/CommissionLedger.js';
import SystemSettings from '../models/SystemSettings.js';
import SalesTeamMember from '../models/SalesTeamMember.js';
import {
  getNextSalesTeamMember,
  distributeUnassignedLeads,
  getSalesTeamOverview,
} from '../services/roundRobinService.js';
import {
  getMetaConfig,
  updateMetaConfig,
  verifyMetaWebhook,
  ingestMetaLead,
  createTestMetaLead,
} from '../services/metaAdsService.js';
import { recordAuditEvent } from '../middleware/auditMiddleware.js';
import { escapeRegex } from '../utils/regexUtil.js';
import {
  getDueRemindersForUser,
  dispatchManualReminder,
} from '../services/reminderSchedulerService.js';
import googleCalendarService from '../services/googleCalendarService.js';

// Helper to get configured agent maturity window days (from System Settings or default 5 days)
export const getMaturityDays = async () => {
  try {
    const s = await SystemSettings.findOne({ singletonKey: 'GLOBAL_ERP_SETTINGS' });
    return Number(s?.systemPreferences?.agentMaturityWindowDays) || 5;
  } catch {
    return 5;
  }
};

// Helper function to credit agent commission upon site visit maturity and initialize dynamic handover window
export const processAgentCommission = async (lead, verifiedByUserId = null) => {
  try {
    if (!lead || !lead.agentId) return null;

    const maturityDays = await getMaturityDays();
    const completedDate = lead.siteVisitDetails?.completedDate || new Date();
    const handoverDate = new Date(completedDate.getTime() + maturityDays * 24 * 60 * 60 * 1000);
    const isPastHandover = Date.now() >= handoverDate.getTime();

    // Check if commission is already credited
    if (lead.commission && lead.commission.status === 'credited') {
      lead.siteVisitDetails = {
        ...lead.siteVisitDetails,
        completedDate,
        handoverDate,
        isHandedOver: isPastHandover,
        maturityPeriodDays: maturityDays,
      };
      await lead.save();
      return null;
    }

    const agent = await User.findById(lead.agentId);
    if (!agent) return null;

    const commissionType = agent.agentProfile?.commissionType || 'percentage';
    const commissionRate = Number(agent.agentProfile?.commissionRate) || (commissionType === 'percentage' ? 2 : 25000);

    let calculatedAmount = 0;
    const baseAmount = Number(lead.budget) || 4500000; // Default base benchmark if budget not set

    if (commissionType === 'percentage') {
      calculatedAmount = Math.round((baseAmount * commissionRate) / 100);
    } else {
      calculatedAmount = Math.round(commissionRate);
    }

    if (calculatedAmount <= 0) return null;

    // Create Commission Ledger record
    const ledgerEntry = await CommissionLedger.create({
      agentId: agent._id,
      leadId: lead._id,
      leadName: lead.name,
      leadMobile: lead.mobileNo,
      flatId: lead.assignedFlat || null,
      triggerEvent: 'site_visit_completed',
      commissionType,
      commissionRate,
      baseAmount,
      calculatedAmount,
      siteVisitDate: completedDate,
      status: 'credited',
      creditedAt: new Date(),
      remarks: `Automated ${commissionType === 'percentage' ? `${commissionRate}%` : `₹${commissionRate} flat`} commission on site visit maturity (5-day handover initiated)`,
      verifiedBy: verifiedByUserId || null,
    });

    // Update Agent wallet and earnings
    agent.agentProfile = agent.agentProfile || {};
    agent.agentProfile.walletBalance = (Number(agent.agentProfile.walletBalance) || 0) + calculatedAmount;
    agent.agentProfile.totalEarned = (Number(agent.agentProfile.totalEarned) || 0) + calculatedAmount;
    agent.agentProfile.maturedLeadsCount = (Number(agent.agentProfile.maturedLeadsCount) || 0) + 1;
    await agent.save();

    // Update lead commission metadata and 5-day handover details
    lead.commission = {
      commissionType,
      commissionRate,
      amount: calculatedAmount,
      status: 'credited',
      creditedAt: new Date(),
      ledgerId: ledgerEntry._id,
      notes: `Credited ₹${calculatedAmount.toLocaleString('en-IN')} to agent @${agent.username}. Handover to inhouse CRM on ${handoverDate.toLocaleDateString('en-IN')}.`,
    };
    lead.status = 'site_visit_completed';
    lead.siteVisitDetails = {
      ...lead.siteVisitDetails,
      completedDate,
      handoverDate,
      isHandedOver: isPastHandover,
      maturityPeriodDays: 5,
    };
    await lead.save();

    // Audit Event for Commission Credit
    await recordAuditEvent({
      eventType: 'TRANSACTION',
      action: 'COMMISSION_CREDIT',
      module: 'agent',
      resourceType: 'CommissionLedger',
      resourceId: ledgerEntry._id,
      resourceName: `Commission: ₹${calculatedAmount.toLocaleString('en-IN')} for ${agent.firstName} ${agent.lastName || ''}`,
      user: agent,
      summary: `Automated ${commissionType === 'percentage' ? `${commissionRate}%` : `₹${commissionRate}`} commission of ₹${calculatedAmount.toLocaleString('en-IN')} credited to Agent @${agent.username} for Lead "${lead.name}". 5-day exclusive window ends ${handoverDate.toLocaleDateString('en-IN')}.`,
      changes: {
        commissionAmount: calculatedAmount,
        walletBalance: agent.agentProfile.walletBalance,
        handoverDate,
      },
    });

    console.log(`💰 [Commission Auto-Credit] Credited ₹${calculatedAmount} to agent ${agent.firstName} (@${agent.username}) | Handover Date: ${handoverDate.toISOString()}`);
    return { calculatedAmount, ledgerEntry, handoverDate };
  } catch (error) {
    console.error('Error processing agent commission:', error);
    return null;
  }
};

// Helper function to auto-debit commission on unclosed leads that exceeded the dynamic maturity window
export const processExpiredAgentLeadsDebit = async () => {
  try {
    const maturityDays = await getMaturityDays();
    const expiryThreshold = new Date(Date.now() - maturityDays * 24 * 60 * 60 * 1000);

    // Find agent leads where site visit was completed > maturityDays ago, commission was credited, but deal was NOT booked
    const expiredLeads = await Lead.find({
      agentId: { $ne: null },
      'siteVisitDetails.completedDate': { $lte: expiryThreshold },
      'commission.status': 'credited',
      status: { $nin: ['booked', 'lost'] },
    });

    for (const lead of expiredLeads) {
      const agent = await User.findById(lead.agentId);
      const debitAmount = Number(lead.commission?.amount) || 0;

      if (agent && debitAmount > 0) {
        // 1. Debit Agent Wallet Balance
        agent.agentProfile = agent.agentProfile || {};
        agent.agentProfile.walletBalance = Math.max(0, (Number(agent.agentProfile.walletBalance) || 0) - debitAmount);
        await agent.save();

        // 2. Create Debit Record in Commission Ledger
        const debitLedger = await CommissionLedger.create({
          agentId: agent._id,
          leadId: lead._id,
          leadName: lead.name,
          leadMobile: lead.mobileNo,
          flatId: lead.assignedFlat || null,
          transactionType: 'debit',
          triggerEvent: '5_day_expiry_debit',
          commissionType: lead.commission?.commissionType || 'percentage',
          commissionRate: lead.commission?.commissionRate || 2,
          baseAmount: lead.budget || 0,
          calculatedAmount: debitAmount,
          siteVisitDate: lead.siteVisitDetails?.completedDate || expiryThreshold,
          status: 'debited',
          debitedAt: new Date(),
          remarks: `Commission of ₹${debitAmount.toLocaleString('en-IN')} debited upon ${maturityDays}-day maturity expiration without conversion. Handed over to inhouse CRM team.`,
        });

        // 3. Mark Lead Commission as Debited and Handed Over
        lead.commission.status = 'debited';
        lead.commission.debitedAt = new Date();
        lead.commission.debitLedgerId = debitLedger._id;
        lead.commission.notes = `${lead.commission.notes || ''} | Debited on ${new Date().toLocaleDateString('en-IN')} (${maturityDays}-day window expired).`;
        lead.siteVisitDetails.isHandedOver = true;
        lead.siteVisitDetails.handoverDate = lead.siteVisitDetails.handoverDate || expiryThreshold;
        await lead.save();

        // Audit Event for Commission Debit Expiration
        await recordAuditEvent({
          eventType: 'TRANSACTION',
          action: 'COMMISSION_DEBIT',
          module: 'agent',
          resourceType: 'CommissionLedger',
          resourceId: debitLedger._id,
          resourceName: `Debit: ₹${debitAmount.toLocaleString('en-IN')} from ${agent.firstName} ${agent.lastName || ''}`,
          user: agent,
          summary: `5-Day Exclusive Maturity Period expired without booking. Commission of ₹${debitAmount.toLocaleString('en-IN')} debited from Agent @${agent.username}. Lead "${lead.name}" handed over to inhouse CRM.`,
          changes: {
            debitedAmount: debitAmount,
            walletBalance: agent.agentProfile.walletBalance,
          },
        });

        console.log(`🔻 [Commission Auto-Debit] Debited ₹${debitAmount} from agent @${agent.username} for expired lead ${lead.name}`);
      }
    }
  } catch (error) {
    console.error('Error processing expired agent lead debits:', error);
  }
};

// Get All Leads with search, filtering and agent maturity rule scoping
export const getLeads = async (req, res) => {
  try {
    // Process any expired agent lead debits first
    await processExpiredAgentLeadsDebit();

    const maturityDays = await getMaturityDays();
    const expiryThreshold = new Date(Date.now() - maturityDays * 24 * 60 * 60 * 1000);

    const { search, mode, status, flatId, agentId, assignedTo } = req.query;
    let queryConditions = [];

    // If logged in as Agent, restrict leads to ONLY this agent's own leads
    if (req.user && (req.user.role === 'agent' || req.user.roleCode === 'agent')) {
      queryConditions.push({ agentId: req.user.id });
    } else if (agentId) {
      queryConditions.push({ agentId });
    } else {
      // Inhouse Sales / CRM Team Rule:
      // Exclude agent leads that have NOT yet reached the maturity period!
      queryConditions.push({
        $or: [
          { agentId: null },
          { agentId: { $exists: false } },
          { 'siteVisitDetails.completedDate': { $lte: expiryThreshold } },
          { 'siteVisitDetails.isHandedOver': true },
        ],
      });
    }

    // Inhouse Sales Team Member Filter (Assigned to Me / Specific Team Member / Unassigned)
    if (assignedTo) {
      if (assignedTo === 'me') {
        const currentUserId = req.user?.id || req.user?._id;
        if (currentUserId) {
          queryConditions.push({ assignedTo: currentUserId });
        }
      } else if (assignedTo === 'unassigned') {
        queryConditions.push({
          $or: [{ assignedTo: null }, { assignedTo: { $exists: false } }],
        });
      } else {
        queryConditions.push({ assignedTo });
      }
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      queryConditions.push({
        $or: [
          { name: regex },
          { mobileNo: regex },
          { email: regex },
          { requirement: regex },
          { city: regex },
          { state: regex },
        ],
      });
    }

    if (req.query.leadSource || req.query.source) {
      queryConditions.push({ leadSource: req.query.leadSource || req.query.source });
    }

    // Shift converted leads to Sales & Allotment: exclude converted leads by default from CRM
    if (status) {
      queryConditions.push({ status });
    } else {
      queryConditions.push({ status: { $ne: 'converted' } });
    }

    if (mode) {
      queryConditions.push({ 'followUps.mode': mode });
    }

    if (flatId) {
      queryConditions.push({ assignedFlat: flatId });
    }

    const finalFilter = queryConditions.length > 0 ? { $and: queryConditions } : {};

    const leads = await Lead.find(finalFilter)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode buildings' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('assignedBy', 'firstName lastName username')
      .populate('createdBy', 'firstName lastName username')
      .populate('followUps.assignedTo', 'firstName lastName username')
      .populate('followUps.scheduledBy', 'firstName lastName username')
      .populate('followUps.completedBy', 'firstName lastName username')
      .populate('externalSiteVisits.accompaniedBy', 'firstName lastName username')
      .populate('externalSiteVisits.assignedFlat', 'flatNumber projectId')
      .sort({ updatedAt: -1 });

    return res.json({ success: true, count: leads.length, data: leads });
  } catch (error) {
    console.error('Error fetching leads:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Get Single Lead with full timeline & populated fields
export const getLeadById = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode buildings' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('assignedBy', 'firstName lastName username')
      .populate('assignmentHistory.assignedTo', 'firstName lastName username')
      .populate('assignmentHistory.assignedBy', 'firstName lastName username')
      .populate('followUps.assignedTo', 'firstName lastName username')
      .populate('followUps.scheduledBy', 'firstName lastName username')
      .populate('followUps.completedBy', 'firstName lastName username')
      .populate('externalSiteVisits.accompaniedBy', 'firstName lastName username')
      .populate('externalSiteVisits.assignedFlat', 'flatNumber projectId')
      .populate('commission.ledgerId');

    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    // Security check for agent role
    if (req.user && (req.user.role === 'agent' || req.user.roleCode === 'agent')) {
      if (lead.agentId?._id?.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized to view this lead' });
      }
    }

    return res.json({ success: true, data: lead });
  } catch (error) {
    console.error('Error fetching lead by id:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Create Lead (handles agent attribution and initial follow-up)
export const createLead = async (req, res) => {
  try {
    const {
      name,
      mobileNo,
      email,
      city,
      state,
      country,
      address,
      pincode,
      budget,
      requirement,
      assignedFlat,
      agentId,
      assignedTo,
      leadSource,
      initialFollowUp,
      metaAdDetails,
      metaCustomQuestions,
      status = 'new',
    } = req.body;

    if (!name || !mobileNo) {
      return res.status(400).json({
        success: false,
        message: 'Lead name and mobileNo are required',
      });
    }

    // Determine agent attribution
    let assignedAgentId = agentId || null;
    if (req.user && (req.user.role === 'agent' || req.user.roleCode === 'agent')) {
      assignedAgentId = req.user.id;
    }

    // Determine Inhouse Sales Team Member Assignment (Round-Robin alternating 1-by-1)
    let assignedMemberId = null;
    let assignmentReason = null;

    if (assignedTo && assignedTo !== 'auto' && assignedTo !== 'unassigned') {
      assignedMemberId = assignedTo;
      assignmentReason = 'Manually Assigned on Lead Creation';
    } else if (assignedTo !== 'unassigned') {
      // Default: Automated Round Robin 1-by-1 sequential assignment
      const nextMemberResult = await getNextSalesTeamMember();
      if (nextMemberResult && nextMemberResult.user) {
        assignedMemberId = nextMemberResult.user._id;
        assignmentReason = 'Automated Round-Robin Sequential Distribution';
      }
    }

    const leadData = {
      name: name.trim(),
      mobileNo: mobileNo.trim(),
      email: email ? email.trim() : '',
      city: city ? city.trim() : '',
      state: state ? state.trim() : '',
      country: country ? country.trim() : 'India',
      address: address ? address.trim() : '',
      pincode: pincode ? pincode.trim() : '',
      budget: Number(budget) || 0,
      requirement: requirement || '2BHK Apartment',
      leadSource: leadSource || (assignedAgentId ? 'agent' : 'direct'),
      assignedFlat: assignedFlat || null,
      agentId: assignedAgentId,
      assignedTo: assignedMemberId,
      assignedAt: assignedMemberId ? new Date() : null,
      assignedBy: req.user?.id || null,
      metaAdDetails: metaAdDetails || undefined,
      metaCustomQuestions: Array.isArray(metaCustomQuestions) ? metaCustomQuestions : [],
      assignmentHistory: assignedMemberId
        ? [
            {
              assignedTo: assignedMemberId,
              assignedBy: req.user?.id || null,
              assignedAt: new Date(),
              reason: assignmentReason,
            },
          ]
        : [],
      status,
      createdBy: req.user?.id || null,
      followUps: [],
    };

    if (initialFollowUp && (initialFollowUp.notes || initialFollowUp.nextFollowUpDate || initialFollowUp.mode)) {
      leadData.followUps.push({
        date: initialFollowUp.date || new Date(),
        mode: initialFollowUp.mode || 'call',
        notes: initialFollowUp.notes || '',
        nextFollowUpDate: initialFollowUp.nextFollowUpDate || null,
        status: initialFollowUp.status || 'pending',
        assignedTo: assignedMemberId,
        scheduledBy: req.user?.id || null,
      });
    }

    const lead = new Lead(leadData);
    const savedLead = await lead.save();

    // Persist lead directly into agent's User document schema
    if (savedLead.agentId) {
      await User.findByIdAndUpdate(savedLead.agentId, {
        $addToSet: { 'agentProfile.leads': savedLead._id },
      });
    }

    const populated = await Lead.findById(savedLead._id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('assignedBy', 'firstName lastName username');

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error creating lead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update Lead Profile & Assigned Flat
export const updateLead = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, mobileNo, email, budget, requirement, assignedFlat, status, agentId, siteVisitDetails } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (name) lead.name = name.trim();
    if (mobileNo) lead.mobileNo = mobileNo.trim();
    if (email !== undefined) lead.email = email.trim();
    if (budget !== undefined) lead.budget = Number(budget);
    if (requirement) lead.requirement = requirement;
    if (assignedFlat !== undefined) lead.assignedFlat = assignedFlat === '' ? null : assignedFlat;
    if (agentId !== undefined) {
      const prevAgentId = lead.agentId;
      lead.agentId = agentId || null;
      if (prevAgentId && prevAgentId.toString() !== (agentId || '').toString()) {
        await User.findByIdAndUpdate(prevAgentId, {
          $pull: { 'agentProfile.leads': lead._id },
        });
      }
      if (agentId) {
        await User.findByIdAndUpdate(agentId, {
          $addToSet: { 'agentProfile.leads': lead._id },
        });
      }
    }
    if (siteVisitDetails) lead.siteVisitDetails = { ...lead.siteVisitDetails, ...siteVisitDetails };

    // Inhouse Sales Team Member Assignment Update
    if (req.body.assignedTo !== undefined) {
      const prevAssignedTo = lead.assignedTo;
      const newAssignedTo = req.body.assignedTo === '' || req.body.assignedTo === null ? null : req.body.assignedTo;
      lead.assignedTo = newAssignedTo;
      lead.assignedAt = newAssignedTo ? new Date() : null;
      lead.assignedBy = req.user?.id || null;

      if (newAssignedTo && prevAssignedTo?.toString() !== newAssignedTo?.toString()) {
        lead.assignmentHistory = lead.assignmentHistory || [];
        lead.assignmentHistory.push({
          assignedTo: newAssignedTo,
          assignedBy: req.user?.id || null,
          assignedAt: new Date(),
          reason: req.body.assignmentReason || 'Reassigned by Sales Head',
        });
      }
    }

    if (status) {
      lead.status = status;
      // Trigger commission credit if site visit is marked completed
      if ((status === 'site_visit_completed' || status === 'matured') && lead.agentId) {
        await processAgentCommission(lead, req.user?.id);
      }

      // Auto-shift converted lead to Sales & Allotment
      if (status === 'converted') {
        try {
          const existingSalesLead = await SalesLead.findOne({ leadId: lead._id });
          if (!existingSalesLead && lead.assignedFlat) {
            const flatDoc = await Flat.findById(lead.assignedFlat);
            if (flatDoc) {
              const dealPrice = Number(lead.budget) || flatDoc.basePrice || 4500000;
              await SalesLead.create({
                leadId: lead._id,
                name: lead.name,
                mobileNo: lead.mobileNo,
                email: lead.email || '',
                projectId: flatDoc.projectId,
                buildingId: flatDoc.buildingId,
                flatId: lead.assignedFlat,
                salesStatus: 'converted',
                booking: {
                  isBooked: false,
                  bookingDate: new Date(),
                  bookingAmount: 0,
                  bookingStatus: 'pending'
                },
                agreement: {
                  required: true,
                  uploaded: false,
                  verificationStatus: 'pending'
                },
                paymentPlan: {
                  type: 'installment',
                  totalAmount: dealPrice,
                  bookingAmount: 0,
                  remainingAmount: dealPrice,
                  numberOfInstallments: 0
                }
              });
              await Flat.findByIdAndUpdate(lead.assignedFlat, { status: 'hold' });
              console.log(`[Sales Allotment] Auto-shifted converted lead "${lead.name}" to SalesLead`);
            }
          }
        } catch (salesShiftErr) {
          console.error('Error shifting converted lead to SalesLead:', salesShiftErr);
        }
      }
    }

    await lead.save();

    const populated = await Lead.findById(id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('assignedBy', 'firstName lastName username')
      .populate('assignmentHistory.assignedTo', 'firstName lastName username')
      .populate('assignmentHistory.assignedBy', 'firstName lastName username');

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Error updating lead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete Lead
export const deleteLead = async (req, res) => {
  try {
    const { id } = req.params;
    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    if (req.user && (req.user.role === 'agent' || req.user.roleCode === 'agent')) {
      if (lead.agentId?.toString() !== req.user.id.toString()) {
        return res.status(403).json({ success: false, message: 'Unauthorized to delete this lead' });
      }
    }

    const deletedSnapshot = lead.toObject();

    // Delete from MongoDB
    await Lead.findByIdAndDelete(id);

    // Remove from agent's User document schema
    if (lead.agentId) {
      await User.findByIdAndUpdate(lead.agentId, {
        $pull: { 'agentProfile.leads': lead._id },
      });
    }

    // Record explicit audit log with Name, Mobile No, and full snapshot
    await recordAuditEvent({
      eventType: 'CRUD',
      action: 'DELETE',
      module: 'leads',
      resourceType: 'Lead',
      resourceId: lead._id,
      resourceName: `${lead.name} (${lead.mobileNo || 'No Phone'})`,
      user: req.user,
      req,
      status: 'SUCCESS',
      summary: `Deleted Lead: "${lead.name}" • Mobile: ${lead.mobileNo || 'N/A'} • Email: ${lead.email || 'N/A'} • Budget: ₹${(lead.budget || 0).toLocaleString('en-IN')}`,
      deletionDetails: {
        isDeletedRecord: true,
        deletedItemSummary: `${lead.name} | Mobile: ${lead.mobileNo || 'N/A'} | Req: ${lead.requirement || 'General'} | Budget: ₹${(lead.budget || 0).toLocaleString('en-IN')}`,
        fullDeletedSnapshot: deletedSnapshot,
        reason: req.body?.reason || 'Deleted by user',
      },
    });

    return res.json({
      success: true,
      message: `Lead "${lead.name}" (${lead.mobileNo || ''}) deleted successfully`,
      data: deletedSnapshot,
    });
  } catch (error) {
    console.error('Error deleting lead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Add Follow-Up to Lead (detects site_visit completion and triggers commission credit)
export const addFollowUp = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, mode, notes, nextFollowUpDate, status } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const newFollowUp = {
      date: date || new Date(),
      mode: mode || 'call',
      notes: notes || '',
      nextFollowUpDate: nextFollowUpDate || null,
      status: status || 'pending',
    };

    lead.followUps.push(newFollowUp);

    // If follow-up is a completed site visit
    if (mode === 'site_visit') {
      if (status === 'completed') {
        lead.status = 'site_visit_completed';
        lead.siteVisitDetails = {
          completedDate: date || new Date(),
          visitedBy: lead.name,
          feedback: notes || 'Site visit completed successfully',
          verifiedBy: req.user?.id || null,
        };
        await lead.save();
        await processAgentCommission(lead, req.user?.id);
      } else {
        lead.status = 'site_visit_scheduled';
        lead.siteVisitDetails = {
          scheduledDate: nextFollowUpDate || date || new Date(),
        };
      }
    }

    await lead.save();

    // Asynchronously sync to Google Calendar if pending/scheduled
    if (newFollowUp.status === 'pending' || newFollowUp.nextFollowUpDate) {
      const addedFu = lead.followUps[lead.followUps.length - 1];
      googleCalendarService.createOrUpdateFollowUpEvent({
        lead,
        followUp: addedFu,
        assignedUser: lead.assignedTo,
      }).catch(err => console.warn('Background Google Calendar sync error:', err.message));
    }

    const populated = await Lead.findById(id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile');

    return res.status(201).json({ success: true, data: populated });
  } catch (error) {
    console.error('Error adding follow-up:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Update a Specific Follow-Up (team member executes, updates status, remarks, or reschedules)
export const updateFollowUp = async (req, res) => {
  try {
    const { id, followUpId } = req.params;
    const { mode, notes, nextFollowUpDate, status, date, feedback, rescheduledTo } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const followUp = lead.followUps.id(followUpId);
    if (!followUp) return res.status(404).json({ success: false, message: 'Follow-up record not found' });

    if (mode) followUp.mode = mode;
    if (notes !== undefined) followUp.notes = notes;
    if (nextFollowUpDate !== undefined) followUp.nextFollowUpDate = nextFollowUpDate;
    if (status) followUp.status = status;
    if (date) followUp.date = date;
    if (feedback !== undefined) followUp.feedback = feedback;

    if (status === 'completed') {
      followUp.completedAt = new Date();
      followUp.completedBy = req.user?.id || null;
      if (feedback && !followUp.notes) {
        followUp.notes = feedback;
      }
    } else if (status === 'rescheduled') {
      followUp.rescheduledTo = rescheduledTo || nextFollowUpDate || null;
      if (nextFollowUpDate) {
        followUp.nextFollowUpDate = nextFollowUpDate;
      }
    }

    // Check if updated to completed site visit
    if ((followUp.mode === 'site_visit' || mode === 'site_visit') && (status === 'completed' || followUp.status === 'completed')) {
      lead.status = 'site_visit_completed';
      lead.siteVisitDetails = {
        ...lead.siteVisitDetails,
        completedDate: followUp.date || new Date(),
        feedback: feedback || followUp.notes || 'Site visit completed',
        verifiedBy: req.user?.id || null,
      };
      await lead.save();
      await processAgentCommission(lead, req.user?.id);
    }

    await lead.save();

    // Asynchronously update Google Calendar event
    if (status === 'cancelled') {
      if (followUp.googleCalendar?.eventId) {
        googleCalendarService.deleteFollowUpEvent({ eventId: followUp.googleCalendar.eventId })
          .catch(err => console.warn('Google Calendar delete error:', err.message));
      }
    } else {
      googleCalendarService.createOrUpdateFollowUpEvent({
        lead,
        followUp,
        assignedUser: followUp.assignedTo || lead.assignedTo,
      }).catch(err => console.warn('Background Google Calendar update error:', err.message));
    }

    const populated = await Lead.findById(id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode buildings' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('assignedBy', 'firstName lastName username')
      .populate('followUps.scheduledBy', 'firstName lastName username')
      .populate('followUps.assignedTo', 'firstName lastName username')
      .populate('followUps.completedBy', 'firstName lastName username')
      .populate('externalSiteVisits.accompaniedBy', 'firstName lastName username');

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Error updating follow-up:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Delete a Follow-Up
export const deleteFollowUp = async (req, res) => {
  try {
    const { id, followUpId } = req.params;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const targetFu = lead.followUps.id(followUpId);
    if (targetFu?.googleCalendar?.eventId) {
      googleCalendarService.deleteFollowUpEvent({ eventId: targetFu.googleCalendar.eventId })
        .catch(err => console.warn('Google Calendar delete error:', err.message));
    }

    lead.followUps.pull({ _id: followUpId });
    await lead.save();

    const populated = await Lead.findById(id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode buildings' },
      })
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('followUps.scheduledBy', 'firstName lastName username')
      .populate('followUps.assignedTo', 'firstName lastName username')
      .populate('followUps.completedBy', 'firstName lastName username');

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Error deleting follow-up:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Log External / Direct Lead Site Visit
 * POST /api/leads/external-site-visit
 * POST /api/leads/:id/external-site-visit
 */
export const logExternalSiteVisitAction = async (req, res) => {
  try {
    const leadId = req.params.id || req.body.leadId;
    const {
      name,
      mobileNo,
      email,
      city,
      state,
      country,
      assignedFlatId,
      flatLabel,
      visitDate,
      accompaniedBy,
      numberOfPersons = 1,
      cabDetails = {},
      interestRating = 4,
      feedback = '',
      nextStep = '',
      isScheduledOnly = false,
    } = req.body;

    let lead;

    if (leadId) {
      lead = await Lead.findById(leadId);
      if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });
      if (assignedFlatId && !lead.assignedFlat) {
        lead.assignedFlat = assignedFlatId;
      }
    } else {
      // New Walk-in / Direct External Lead
      if (!name || !mobileNo) {
        return res.status(400).json({ success: false, message: 'Visitor name and mobile number are required.' });
      }

      // Check if lead with phone already exists
      const existing = await Lead.findOne({ mobileNo: mobileNo.trim() });
      if (existing) {
        lead = existing;
        if (assignedFlatId && !lead.assignedFlat) {
          lead.assignedFlat = assignedFlatId;
        }
      } else {
        lead = new Lead({
          name: name.trim(),
          mobileNo: mobileNo.trim(),
          email: email ? email.trim() : undefined,
          city: city || 'Vrindavan',
          state: state || 'Uttar Pradesh',
          country: country || 'India',
          leadSource: 'walk_in',
          requirement: flatLabel || 'Site Visit Walk-in',
          assignedFlat: assignedFlatId || undefined,
          assignedTo: accompaniedBy || req.user?.id || undefined,
          assignedBy: req.user?.id || undefined,
          assignedAt: new Date(),
          createdBy: req.user?.id || undefined,
        });
      }
    }

    const vDate = visitDate ? new Date(visitDate) : new Date();
    const isCompleted = !isScheduledOnly && vDate <= new Date(Date.now() + 60 * 60 * 1000);

    // Add to externalSiteVisits array
    const visitEntry = {
      visitorName: name || lead.name,
      visitorPhone: mobileNo || lead.mobileNo,
      visitorEmail: email || lead.email || '',
      visitDate: vDate,
      assignedFlat: assignedFlatId || lead.assignedFlat || null,
      flatLabel: flatLabel || '',
      accompaniedBy: accompaniedBy || lead.assignedTo || req.user?.id || null,
      numberOfPersons: Number(numberOfPersons) || 1,
      cabDetails: {
        isCabProvided: !!cabDetails.isCabProvided,
        cabNumber: cabDetails.cabNumber || '',
        driverName: cabDetails.driverName || '',
        driverPhone: cabDetails.driverPhone || '',
        pickupLocation: cabDetails.pickupLocation || '',
      },
      interestRating: Number(interestRating) || 4,
      feedback: feedback || 'Client completed direct site visit.',
      nextStep: nextStep || '',
      loggedBy: req.user?.id || null,
      createdAt: new Date(),
    };

    if (!lead.externalSiteVisits) {
      lead.externalSiteVisits = [];
    }
    lead.externalSiteVisits.push(visitEntry);

    // Update lead status and siteVisitDetails
    if (isCompleted) {
      lead.status = 'site_visit_completed';
      lead.siteVisitDetails = {
        ...lead.siteVisitDetails,
        completedDate: vDate,
        visitedBy: lead.name,
        feedback: feedback || 'Site visit completed successfully.',
        verifiedBy: req.user?.id || null,
        isVerified: true,
      };

      // Also record follow-up
      lead.followUps.push({
        date: vDate,
        mode: 'site_visit',
        notes: `[Direct Site Visit]: Visited ${flatLabel || 'Project'}. Interest: ${interestRating}/5. ${feedback ? `Feedback: "${feedback}"` : ''} ${nextStep ? `Next step: ${nextStep}` : ''}`.trim(),
        status: 'completed',
        completedAt: new Date(),
        completedBy: req.user?.id || null,
        assignedTo: accompaniedBy || lead.assignedTo || req.user?.id || null,
        scheduledBy: req.user?.id || null,
        feedback: feedback || '',
      });

      // If lead had an agent attached, process commission
      if (lead.agentId) {
        await processAgentCommission(lead, req.user?.id);
      }
    } else {
      lead.status = 'site_visit_scheduled';
      lead.siteVisitDetails = {
        ...lead.siteVisitDetails,
        scheduledDate: vDate,
      };

      lead.followUps.push({
        date: new Date(),
        nextFollowUpDate: vDate,
        mode: 'site_visit',
        notes: `[Scheduled Site Visit]: ${flatLabel || 'Project'}. Visitors: ${numberOfPersons}. ${feedback ? `Notes: ${feedback}` : ''}`.trim(),
        status: 'pending',
        assignedTo: accompaniedBy || lead.assignedTo || req.user?.id || null,
        scheduledBy: req.user?.id || null,
      });
    }

    await lead.save();

    const populated = await Lead.findById(lead._id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode buildings' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile')
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('assignedBy', 'firstName lastName username')
      .populate('followUps.assignedTo', 'firstName lastName username')
      .populate('followUps.scheduledBy', 'firstName lastName username')
      .populate('followUps.completedBy', 'firstName lastName username')
      .populate('externalSiteVisits.accompaniedBy', 'firstName lastName username')
      .populate('externalSiteVisits.loggedBy', 'firstName lastName username');

    return res.status(201).json({
      success: true,
      message: isCompleted
        ? 'External site visit recorded successfully and lead stage updated.'
        : 'Site visit scheduled successfully.',
      data: populated,
    });
  } catch (error) {
    console.error('Error logging external site visit:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Explicit Action: Submit Site Visit (Agent submits for approval, or inhouse matures directly)
export const matureSiteVisitAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { completedDate, feedback } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const userRole = (req.user?.role || req.user?.roleCode || '').toLowerCase();
    const isAgent = userRole === 'agent' || userRole === 'channel_partner';

    if (isAgent) {
      // 1. AGENT SUBMISSION: Requires Inhouse Team Approval before commission credit
      lead.status = 'site_visit_completed_pending_approval';
      lead.siteVisitDetails = {
        completedDate: completedDate || new Date(),
        feedback: feedback || 'Site visit conducted with client. Awaiting inhouse verification.',
        isVerified: false,
        approvalStatus: 'pending',
        submittedByAgent: req.user?.id || null,
        submittedAt: new Date(),
      };

      lead.followUps.push({
        date: completedDate || new Date(),
        mode: 'site_visit',
        notes: feedback ? `[Agent Visit Logged]: ${feedback}` : 'Agent submitted site visit for inhouse verification.',
        status: 'pending',
      });

      await lead.save();

      const populated = await Lead.findById(id)
        .populate({
          path: 'assignedFlat',
          populate: { path: 'projectId', select: 'projectName projectCode' },
        })
        .populate('agentId', 'firstName lastName username email agentProfile');

      return res.json({
        success: true,
        message: 'Site visit submitted successfully! Awaiting review and approval from the Inhouse Sales/CRM team before commission credit.',
        data: populated,
        requiresApproval: true,
      });
    }

    // 2. INHOUSE DIRECT APPROVAL
    const maturityDays = await getMaturityDays();
    const cDate = completedDate ? new Date(completedDate) : new Date();
    const hDate = new Date(cDate.getTime() + maturityDays * 24 * 60 * 60 * 1000);

    lead.status = 'site_visit_completed';
    lead.siteVisitDetails = {
      completedDate: cDate,
      feedback: feedback || 'Site visit conducted and verified by Inhouse team',
      isVerified: true,
      approvalStatus: 'approved',
      verifiedBy: req.user?.id || null,
      verifiedAt: new Date(),
      maturityPeriodDays: maturityDays,
      handoverDate: hDate,
    };

    lead.followUps.push({
      date: cDate,
      mode: 'site_visit',
      notes: feedback || 'Site visit verified by inhouse team. Commission credited.',
      status: 'completed',
    });

    await lead.save();

    const commissionResult = await processAgentCommission(lead, req.user?.id);

    const populated = await Lead.findById(id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile');

    await recordAuditEvent({
      eventType: 'BUSINESS_LOGIC',
      action: 'SITE_VISIT_APPROVED',
      module: 'agent',
      resourceType: 'Lead',
      resourceId: lead._id,
      resourceName: lead.name,
      req,
      summary: `Site visit completed and matured for "${lead.name}". ${commissionResult ? `₹${commissionResult.calculatedAmount.toLocaleString('en-IN')} credited to agent.` : ''}`,
    });

    return res.json({
      success: true,
      message: commissionResult
        ? `Site visit verified! ₹${commissionResult.calculatedAmount.toLocaleString('en-IN')} commission credited to agent account.`
        : 'Site visit marked as completed.',
      data: populated,
      commissionResult,
    });
  } catch (error) {
    console.error('Error maturing site visit:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Inhouse Team Action: Approve Agent Site Visit & Trigger Commission Credit
export const approveSiteVisitAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { verificationNotes } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const maturityDays = await getMaturityDays();
    const cDate = lead.siteVisitDetails?.completedDate || new Date();
    const hDate = new Date(cDate.getTime() + maturityDays * 24 * 60 * 60 * 1000);

    lead.status = 'site_visit_completed';
    lead.siteVisitDetails = {
      ...lead.siteVisitDetails,
      isVerified: true,
      approvalStatus: 'approved',
      verifiedBy: req.user?.id || null,
      verifiedAt: new Date(),
      verificationNotes: verificationNotes || 'Approved by inhouse management',
      maturityPeriodDays: maturityDays,
      handoverDate: hDate,
    };

    lead.followUps.push({
      date: new Date(),
      mode: 'site_visit',
      notes: `[Inhouse Approved]: Site visit verified by inhouse team. ${verificationNotes || ''}`,
      status: 'completed',
    });

    await lead.save();

    // Trigger automated commission credit to Agent
    const commissionResult = await processAgentCommission(lead, req.user?.id);

    const populated = await Lead.findById(id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile');

    await recordAuditEvent({
      eventType: 'BUSINESS_LOGIC',
      action: 'SITE_VISIT_APPROVED',
      module: 'agent',
      resourceType: 'Lead',
      resourceId: lead._id,
      resourceName: lead.name,
      req,
      summary: `Inhouse verified and approved agent site visit for Lead "${lead.name}". ${commissionResult ? `₹${commissionResult.calculatedAmount.toLocaleString('en-IN')} commission credited.` : ''} Notes: ${verificationNotes || 'Approved'}`,
    });

    return res.json({
      success: true,
      message: commissionResult
        ? `Site visit approved! ₹${commissionResult.calculatedAmount.toLocaleString('en-IN')} commission credited to agent account.`
        : 'Site visit approved successfully.',
      data: populated,
      commissionResult,
    });
  } catch (error) {
    console.error('Error approving site visit:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// Inhouse Team Action: Reject Agent Site Visit
export const rejectSiteVisitAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    lead.status = 'site_visit_rejected';
    lead.siteVisitDetails = {
      ...lead.siteVisitDetails,
      isVerified: false,
      approvalStatus: 'rejected',
      rejectionReason: rejectionReason.trim(),
      rejectedBy: req.user?.id || null,
      rejectedAt: new Date(),
    };

    lead.followUps.push({
      date: new Date(),
      mode: 'site_visit',
      notes: `[Inhouse Rejected]: Site visit rejected by inhouse team. Reason: ${rejectionReason.trim()}`,
      status: 'cancelled',
    });

    await lead.save();

    await recordAuditEvent({
      eventType: 'BUSINESS_LOGIC',
      action: 'SITE_VISIT_REJECTED',
      module: 'agent',
      resourceType: 'Lead',
      resourceId: lead._id,
      resourceName: lead.name,
      req,
      summary: `Inhouse rejected agent site visit for Lead "${lead.name}". Rejection Reason: ${rejectionReason.trim()}`,
    });

    const populated = await Lead.findById(id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile');

    return res.json({
      success: true,
      message: 'Site visit has been marked as rejected.',
      data: populated,
    });
  } catch (error) {
    console.error('Error rejecting site visit:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

// =========================================================================
// INHOUSE SALES TEAM & ROUND-ROBIN DISTRIBUTION ACTIONS
// =========================================================================

/**
 * Assign one or multiple leads to a specific sales team member
 * POST /api/leads/assign
 */
export const assignLeadsAction = async (req, res) => {
  try {
    const { leadIds, leadId, assignedTo, reason, notes } = req.body;
    const targetIds = leadIds || (leadId ? [leadId] : []);

    if (!Array.isArray(targetIds) || targetIds.length === 0) {
      return res.status(400).json({ success: false, message: 'Please provide at least one leadId to assign.' });
    }

    let targetUser = null;
    if (assignedTo) {
      targetUser = await User.findById(assignedTo).select('firstName lastName username email');
      if (!targetUser) {
        return res.status(404).json({ success: false, message: 'Target team member not found.' });
      }
    }

    const assignedByName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username : 'Sales Head';
    const targetUserName = targetUser ? `${targetUser.firstName || ''} ${targetUser.lastName || ''}`.trim() || targetUser.username : 'Unassigned';

    const updatedLeads = [];
    for (const id of targetIds) {
      const lead = await Lead.findById(id);
      if (!lead) continue;

      const prevAssignedTo = lead.assignedTo;
      lead.assignedTo = assignedTo || null;
      lead.assignedAt = assignedTo ? new Date() : null;
      lead.assignedBy = req.user?.id || null;

      lead.assignmentHistory = lead.assignmentHistory || [];
      lead.assignmentHistory.push({
        assignedTo: assignedTo || null,
        assignedBy: req.user?.id || null,
        assignedAt: new Date(),
        reason: reason || notes || `Assigned to ${targetUserName} by ${assignedByName}`,
      });

      if (notes && notes.trim()) {
        lead.followUps.push({
          date: new Date(),
          mode: 'other',
          notes: `[Lead Assignment]: ${notes.trim()} (Assigned to ${targetUserName})`,
          status: 'completed',
          assignedTo: assignedTo || null,
          scheduledBy: req.user?.id || null,
        });
      }

      await lead.save();
      updatedLeads.push(lead._id);

      // If assigned to a team member, update their assigned count
      if (assignedTo && prevAssignedTo?.toString() !== assignedTo.toString()) {
        await SalesTeamMember.findOneAndUpdate(
          { userId: assignedTo },
          {
            $inc: { leadsAssignedCount: 1 },
            $set: { lastAssignedAt: new Date() }
          }
        );
      }
    }

    return res.json({
      success: true,
      count: updatedLeads.length,
      message: `Successfully assigned ${updatedLeads.length} lead(s) to ${targetUserName}.`,
    });
  } catch (error) {
    console.error('Error assigning leads:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Trigger batch round-robin 1-by-1 distribution of unassigned leads
 * POST /api/leads/distribute-round-robin
 */
export const distributeRoundRobinAction = async (req, res) => {
  try {
    const { leadIds } = req.body;
    const result = await distributeUnassignedLeads(leadIds, req.user?.id);
    return res.json(result);
  } catch (error) {
    console.error('Error running round-robin distribution:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Quick status update by team member or sales head
 * PATCH /api/leads/:id/status
 */
export const updateLeadStatusAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, notes, nextFollowUpDate, mode } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, message: 'Status is required.' });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const prevStatus = lead.status;
    lead.status = status;

    // Log status change in follow-ups
    const updaterName = req.user ? `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username : 'Team Member';
    const followUpNote = notes && notes.trim()
      ? `[Stage: ${status.toUpperCase()}]: ${notes.trim()} (Updated by ${updaterName})`
      : `Lead stage updated from ${prevStatus} to ${status} by ${updaterName}`;

    lead.followUps.push({
      date: new Date(),
      mode: mode || 'call',
      notes: followUpNote,
      nextFollowUpDate: nextFollowUpDate ? new Date(nextFollowUpDate) : null,
      status: 'completed',
      assignedTo: lead.assignedTo || req.user?.id || null,
      scheduledBy: req.user?.id || null,
    });

    if (status === 'site_visit_scheduled' && nextFollowUpDate) {
      lead.siteVisitDetails = {
        ...lead.siteVisitDetails,
        scheduledDate: new Date(nextFollowUpDate),
      };
    } else if (status === 'site_visit_completed') {
      lead.siteVisitDetails = {
        ...lead.siteVisitDetails,
        completedDate: new Date(),
        visitedBy: lead.name,
        feedback: notes || 'Site visit completed',
        verifiedBy: req.user?.id || null,
      };
      if (lead.agentId) {
        await processAgentCommission(lead, req.user?.id);
      }
    }

    await lead.save();

    const populated = await Lead.findById(id)
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('assignedBy', 'firstName lastName username')
      .populate('agentId', 'firstName lastName username email agentProfile')
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode' },
      });

    return res.json({
      success: true,
      message: `Lead status successfully updated to "${status}".`,
      data: populated,
    });
  } catch (error) {
    console.error('Error updating lead status:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Schedule follow-up for a lead
 * POST /api/leads/:id/schedule-follow-up
 */
export const scheduleFollowUpAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { date, nextFollowUpDate, mode, notes, status = 'pending', assignedTo } = req.body;

    if (!nextFollowUpDate && !date) {
      return res.status(400).json({ success: false, message: 'Follow-up date/time is required.' });
    }

    const lead = await Lead.findById(id);
    if (!lead) {
      return res.status(404).json({ success: false, message: 'Lead not found.' });
    }

    const scheduledDate = nextFollowUpDate ? new Date(nextFollowUpDate) : new Date(date);

    lead.followUps.push({
      date: new Date(),
      mode: mode || 'call',
      notes: notes ? notes.trim() : 'Scheduled follow-up',
      nextFollowUpDate: scheduledDate,
      status: status || 'pending',
      assignedTo: assignedTo || lead.assignedTo || req.user?.id || null,
      scheduledBy: req.user?.id || null,
    });

    if (mode === 'site_visit') {
      lead.status = 'site_visit_scheduled';
      lead.siteVisitDetails = {
        ...lead.siteVisitDetails,
        scheduledDate,
      };
    } else if (lead.status === 'new') {
      lead.status = 'contacted';
    }

    await lead.save();

    // Asynchronously sync newly scheduled follow-up to Google Calendar
    const addedScheduleFu = lead.followUps[lead.followUps.length - 1];
    googleCalendarService.createOrUpdateFollowUpEvent({
      lead,
      followUp: addedScheduleFu,
      assignedUser: assignedTo || lead.assignedTo,
    }).catch(err => console.warn('Background Google Calendar schedule error:', err.message));

    const populated = await Lead.findById(id)
      .populate('assignedTo', 'firstName lastName username email mobileNo')
      .populate('assignedBy', 'firstName lastName username')
      .populate('agentId', 'firstName lastName username email agentProfile')
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode buildings' },
      })
      .populate('followUps.scheduledBy', 'firstName lastName username')
      .populate('followUps.assignedTo', 'firstName lastName username')
      .populate('followUps.completedBy', 'firstName lastName username');

    return res.status(201).json({
      success: true,
      message: 'Follow-up scheduled successfully.',
      data: populated,
    });
  } catch (error) {
    console.error('Error scheduling follow-up:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Get sales team overview and metrics
 * GET /api/leads/team
 */
export const getSalesTeamAction = async (req, res) => {
  try {
    const overview = await getSalesTeamOverview();
    return res.json(overview);
  } catch (error) {
    console.error('Error fetching sales team overview:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Add a user to the sales team round-robin pool
 * POST /api/leads/team
 */
export const addSalesTeamMemberAction = async (req, res) => {
  try {
    const { userId, roleTitle, order, maxActiveLeads, phoneExtension } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: 'User ID is required to add team member.' });
    }

    const existing = await SalesTeamMember.findOne({ userId });
    if (existing) {
      return res.status(400).json({ success: false, message: 'This user is already a sales team member.' });
    }

    const userDoc = await User.findById(userId);
    if (!userDoc) {
      return res.status(404).json({ success: false, message: 'User not found in system.' });
    }

    const count = await SalesTeamMember.countDocuments();
    const newMember = await SalesTeamMember.create({
      userId,
      roleTitle: roleTitle || 'Sales Executive',
      order: order !== undefined ? Number(order) : count + 1,
      maxActiveLeads: Number(maxActiveLeads) || 50,
      phoneExtension: phoneExtension || userDoc.mobileNo || '',
      isActiveInRoundRobin: true,
      addedBy: req.user?.id || null,
    });

    const populated = await SalesTeamMember.findById(newMember._id).populate(
      'userId',
      'firstName lastName username email mobileNo'
    );

    return res.status(201).json({
      success: true,
      message: `${userDoc.firstName} ${userDoc.lastName || ''} successfully added to Sales Team!`,
      data: populated,
    });
  } catch (error) {
    console.error('Error adding sales team member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update sales team member properties (e.g. toggle active/inactive in round-robin)
 * PUT /api/leads/team/:id
 */
export const updateSalesTeamMemberAction = async (req, res) => {
  try {
    const { id } = req.params;
    const { roleTitle, isActiveInRoundRobin, order, maxActiveLeads, phoneExtension } = req.body;

    const member = await SalesTeamMember.findById(id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Sales team member not found.' });
    }

    if (roleTitle !== undefined) member.roleTitle = roleTitle;
    if (isActiveInRoundRobin !== undefined) member.isActiveInRoundRobin = Boolean(isActiveInRoundRobin);
    if (order !== undefined) member.order = Number(order);
    if (maxActiveLeads !== undefined) member.maxActiveLeads = Number(maxActiveLeads);
    if (phoneExtension !== undefined) member.phoneExtension = phoneExtension;

    await member.save();

    const populated = await SalesTeamMember.findById(id).populate(
      'userId',
      'firstName lastName username email mobileNo status'
    );

    return res.json({
      success: true,
      message: 'Sales team member updated successfully.',
      data: populated,
    });
  } catch (error) {
    console.error('Error updating sales team member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Remove a user from the sales team pool
 * DELETE /api/leads/team/:id
 */
export const deleteSalesTeamMemberAction = async (req, res) => {
  try {
    const { id } = req.params;
    const member = await SalesTeamMember.findById(id);
    if (!member) {
      return res.status(404).json({ success: false, message: 'Sales team member not found.' });
    }

    await SalesTeamMember.findByIdAndDelete(id);

    return res.json({
      success: true,
      message: 'Member removed from sales team round-robin pool.',
    });
  } catch (error) {
    console.error('Error removing sales team member:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Meta Webhook Verification for Facebook/Instagram Lead Ads
 * GET /api/leads/meta-webhook
 */
export const metaWebhookVerifyAction = async (req, res) => {
  try {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    const verifiedChallenge = await verifyMetaWebhook(mode, token, challenge);
    if (verifiedChallenge) {
      console.log('✅ Meta Webhook Hub Challenge verified successfully!');
      return res.status(200).send(verifiedChallenge);
    }

    console.warn('⚠️ Meta Webhook verification failed. Token mismatch.');
    return res.status(403).send('Verification failed');
  } catch (error) {
    console.error('Error in metaWebhookVerifyAction:', error);
    return res.status(500).send('Server error');
  }
};

/**
 * Meta Webhook Event Ingestion (Real-Time Facebook/Instagram Lead Ads)
 * POST /api/leads/meta-webhook
 */
export const metaWebhookReceiveAction = async (req, res) => {
  try {
    const body = req.body;

    // Meta expects an immediate 200 response
    res.status(200).send('EVENT_RECEIVED');

    if (body.object === 'page') {
      for (const entry of body.entry || []) {
        for (const change of entry.changes || []) {
          if (change.field === 'leadgen') {
            const leadData = change.value;
            console.log(`📥 Incoming Meta Ad Lead event: leadgen_id=${leadData.leadgen_id}, form_id=${leadData.form_id}`);
            
            // Process lead in background
            ingestMetaLead({
              leadgenId: leadData.leadgen_id,
              formId: leadData.form_id,
              pageId: leadData.page_id,
              adId: leadData.ad_id,
              adSetId: leadData.adgroup_id,
              rawPayload: leadData,
            }).catch((err) => console.error('Error ingesting Meta webhook lead:', err));
          }
        }
      }
    }
  } catch (error) {
    console.error('Error in metaWebhookReceiveAction:', error);
  }
};

/**
 * Get Meta Ads Configuration
 * GET /api/leads/meta-config
 */
export const getMetaConfigAction = async (req, res) => {
  try {
    const config = await getMetaConfig();
    return res.json({
      success: true,
      data: config,
    });
  } catch (error) {
    console.error('Error fetching Meta config:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Update Meta Ads Configuration
 * PUT /api/leads/meta-config
 */
export const updateMetaConfigAction = async (req, res) => {
  try {
    const config = await updateMetaConfig(req.body);
    return res.json({
      success: true,
      message: 'Meta Ads integration settings updated successfully.',
      data: config,
    });
  } catch (error) {
    console.error('Error updating Meta config:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * Simulate / Ingest Test Meta Lead
 * POST /api/leads/meta-test-lead
 */
export const testMetaLeadAction = async (req, res) => {
  try {
    const result = await createTestMetaLead(req.body);
    return res.status(201).json({
      success: true,
      message: 'Meta Ad Lead ingested and auto-assigned sequentially via Round-Robin!',
      data: result.lead,
    });
  } catch (error) {
    console.error('Error creating test Meta lead:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * GET /api/leads/reminders/due
 * Returns active reminders due in 10 minutes, due today, or overdue for the logged-in user
 */
export const getDueRemindersAction = async (req, res) => {
  try {
    const data = await getDueRemindersForUser(req.user);
    return res.json({
      success: true,
      data
    });
  } catch (error) {
    console.error('Error fetching due reminders:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/leads/reminders/send-manual
 * Send an immediate manual reminder to client (site visit) or team member (follow-up)
 */
export const sendManualReminderAction = async (req, res) => {
  try {
    const { leadId, targetType, channel, siteVisitId, followUpId, customText } = req.body;
    if (!leadId) {
      return res.status(400).json({ success: false, message: 'leadId is required.' });
    }

    const result = await dispatchManualReminder({
      leadId,
      targetType: targetType || 'client',
      channel: channel || 'whatsapp',
      siteVisitId,
      followUpId,
      customText,
      user: req.user
    });

    return res.json({
      success: true,
      message: `Reminder successfully dispatched via ${result.channel}!`,
      data: result
    });
  } catch (error) {
    console.error('Error sending manual reminder:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * POST /api/leads/reminders/snooze
 * Snooze an upcoming reminder by N minutes
 */
export const snoozeReminderAction = async (req, res) => {
  try {
    const { leadId, followUpId, siteVisitId, snoozeMinutes = 5 } = req.body;
    if (!leadId) return res.status(400).json({ success: false, message: 'leadId is required.' });

    const lead = await Lead.findById(leadId);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found.' });

    const snoozedUntil = new Date(Date.now() + Number(snoozeMinutes) * 60 * 1000);

    if (followUpId) {
      const fu = (lead.followUps || []).find(f => f._id?.toString() === followUpId);
      if (fu) {
        if (!fu.reminderStatus) fu.reminderStatus = {};
        fu.reminderStatus.snoozedUntil = snoozedUntil;
      }
    }

    if (siteVisitId) {
      const esv = (lead.externalSiteVisits || []).find(v => v._id?.toString() === siteVisitId);
      if (esv) {
        if (!esv.reminderStatus) esv.reminderStatus = {};
        esv.reminderStatus.snoozedUntil = snoozedUntil;
      }
    }

    await lead.save();
    return res.json({
      success: true,
      message: `Reminder snoozed for ${snoozeMinutes} minutes.`,
      snoozedUntil
    });
  } catch (error) {
    console.error('Error snoozing reminder:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};


