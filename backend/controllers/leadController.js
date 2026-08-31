import Lead from '../models/Lead.js';
import Flat from '../models/Flat.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import SalesLead from '../models/SalesLead.js';
import CommissionLedger from '../models/CommissionLedger.js';
import SystemSettings from '../models/SystemSettings.js';
import { recordAuditEvent } from '../middleware/auditMiddleware.js';
import { escapeRegex } from '../utils/regexUtil.js';

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

    const { search, mode, status, flatId, agentId } = req.query;
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

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      queryConditions.push({
        $or: [
          { name: regex },
          { mobileNo: regex },
          { email: regex },
          { requirement: regex },
        ],
      });
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
      .populate('createdBy', 'firstName lastName username')
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
      budget,
      requirement,
      assignedFlat,
      agentId,
      leadSource,
      initialFollowUp,
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

    const leadData = {
      name: name.trim(),
      mobileNo: mobileNo.trim(),
      email: email ? email.trim() : '',
      budget: Number(budget) || 0,
      requirement: requirement || '2BHK Apartment',
      leadSource: leadSource || (assignedAgentId ? 'agent' : 'direct'),
      assignedFlat: assignedFlat || null,
      agentId: assignedAgentId,
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
      .populate('agentId', 'firstName lastName username email agentProfile');

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
      .populate('agentId', 'firstName lastName username email agentProfile');

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

// Update a Specific Follow-Up (triggers commission on site visit completion)
export const updateFollowUp = async (req, res) => {
  try {
    const { id, followUpId } = req.params;
    const { mode, notes, nextFollowUpDate, status, date } = req.body;

    const lead = await Lead.findById(id);
    if (!lead) return res.status(404).json({ success: false, message: 'Lead not found' });

    const followUp = lead.followUps.id(followUpId);
    if (!followUp) return res.status(404).json({ success: false, message: 'Follow-up record not found' });

    if (mode) followUp.mode = mode;
    if (notes !== undefined) followUp.notes = notes;
    if (nextFollowUpDate !== undefined) followUp.nextFollowUpDate = nextFollowUpDate;
    if (status) followUp.status = status;
    if (date) followUp.date = date;

    // Check if updated to completed site visit
    if ((followUp.mode === 'site_visit' || mode === 'site_visit') && (status === 'completed' || followUp.status === 'completed')) {
      lead.status = 'site_visit_completed';
      lead.siteVisitDetails = {
        completedDate: followUp.date || new Date(),
        feedback: followUp.notes || 'Site visit completed',
        verifiedBy: req.user?.id || null,
      };
      await lead.save();
      await processAgentCommission(lead, req.user?.id);
    }

    await lead.save();

    const populated = await Lead.findById(id)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode' },
      })
      .populate('agentId', 'firstName lastName username email agentProfile');

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

    lead.followUps.pull({ _id: followUpId });
    await lead.save();

    const populated = await Lead.findById(id).populate({
      path: 'assignedFlat',
      populate: { path: 'projectId', select: 'projectName projectCode' },
    });

    return res.json({ success: true, data: populated });
  } catch (error) {
    console.error('Error deleting follow-up:', error);
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
