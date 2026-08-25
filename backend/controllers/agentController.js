import Lead from '../models/Lead.js';
import User from '../models/User.js';
import { Role } from '../models/Role.js';
import CommissionLedger from '../models/CommissionLedger.js';
import SiteVisit from '../models/SiteVisit.js';
import AuditLog from '../models/AuditLog.js';
import { recordAuditEvent } from '../middleware/auditMiddleware.js';
import { uploadFileToS3 } from '../config/s3.js';
import { escapeRegex } from '../utils/regexUtil.js';
import mongoose from 'mongoose';
import { processAgentCommission, processExpiredAgentLeadsDebit } from './leadController.js';

// Helper to decorate lead with 5-day maturity window metadata
const enrichAgentLead = (lead) => {
  const obj = lead.toObject ? lead.toObject() : { ...lead };
  const now = Date.now();

  if (obj.siteVisitDetails?.completedDate) {
    const completedTime = new Date(obj.siteVisitDetails.completedDate).getTime();
    const maturityDays = Number(obj.siteVisitDetails.maturityPeriodDays) || 5;
    const handoverTime = obj.siteVisitDetails.handoverDate
      ? new Date(obj.siteVisitDetails.handoverDate).getTime()
      : completedTime + maturityDays * 24 * 60 * 60 * 1000;

    const isHandedOver = now >= handoverTime || !!obj.siteVisitDetails.isHandedOver;
    const isDebited = obj.commission?.status === 'debited' || obj.commission?.status === 'reverted';
    const isBooked = obj.status === 'booked';
    const daysRemaining = (isHandedOver || isDebited || isBooked)
      ? 0
      : Math.max(1, Math.ceil((handoverTime - now) / (1000 * 60 * 60 * 24)));

    let stageLabel = 'In Agent Pipeline';
    if (isBooked) {
      stageLabel = 'Deal Booked & Finalized';
    } else if (isDebited || isHandedOver) {
      stageLabel = 'Handed Over to Inhouse CRM (Commission Debited)';
    } else {
      stageLabel = `Exclusive Agent Window (${daysRemaining} day${daysRemaining > 1 ? 's' : ''} left)`;
    }

    obj.maturityMeta = {
      isHandedOver,
      isDebited,
      handoverDate: new Date(handoverTime),
      daysRemainingInMaturity: daysRemaining,
      maturityPeriodDays: obj.siteVisitDetails.maturityPeriodDays || 5,
      stageLabel,
    };
  } else {
    obj.maturityMeta = {
      isHandedOver: false,
      isDebited: false,
      handoverDate: null,
      daysRemainingInMaturity: null,
      maturityPeriodDays: 5,
      stageLabel: obj.status === 'site_visit_scheduled' ? 'Site Visit Scheduled' : 'In Agent Pipeline',
    };
  }

  return obj;
};

/**
 * @desc   Get Agent Dashboard KPIs and summary
 * @route  GET /api/agent/dashboard
 * @access Private (Agent / Admin)
 */
export const getAgentDashboard = async (req, res) => {
  try {
    // Allow inhouse team to view any agent's dashboard via ?agentId=xxx
    const agentId = req.query.agentId || req.user?.id;
    if (!agentId) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }

    // Process any expired debits before fetching dashboard
    await processExpiredAgentLeadsDebit();

    const agent = await User.findById(agentId).select('-passwordHash');
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent profile not found' });
    }

    const [leads, commissions] = await Promise.all([
      Lead.find({ agentId })
        .populate({
          path: 'assignedFlat',
          populate: { path: 'projectId', select: 'projectName projectCode' },
        })
        .sort({ updatedAt: -1 }),
      CommissionLedger.find({ agentId }).sort({ createdAt: -1 }),
    ]);

    const enrichedLeads = leads.map(enrichAgentLead);

    const activePipeline = enrichedLeads.filter((l) => !l.maturityMeta.isHandedOver && !l.maturityMeta.isDebited);
    const handedOverPipeline = enrichedLeads.filter((l) => l.maturityMeta.isHandedOver || l.maturityMeta.isDebited);

    const totalLeads = enrichedLeads.length;
    const stageCounts = {
      new: enrichedLeads.filter((l) => l.status === 'new').length,
      contacted: enrichedLeads.filter((l) => l.status === 'contacted').length,
      site_visit_scheduled: enrichedLeads.filter((l) => l.status === 'site_visit_scheduled').length,
      site_visit_completed: enrichedLeads.filter((l) => l.status === 'site_visit_completed' || l.status === 'matured').length,
      in_exclusive_window: activePipeline.filter((l) => l.status === 'site_visit_completed').length,
      handed_over: handedOverPipeline.length,
      booked: enrichedLeads.filter((l) => l.status === 'booked').length,
      lost: enrichedLeads.filter((l) => l.status === 'lost').length,
    };

    const maturedLeads = enrichedLeads.filter(
      (l) => l.status === 'site_visit_completed' || l.status === 'matured' || l.commission?.status === 'credited'
    );

    const profile = agent.agentProfile || {
      commissionType: 'percentage',
      commissionRate: 2,
      walletBalance: 0,
      totalEarned: 0,
      maturedLeadsCount: 0,
    };

    const totalDebited = commissions
      .filter((c) => c.transactionType === 'debit' || c.status === 'debited')
      .reduce((sum, c) => sum + (c.calculatedAmount || 0), 0);

    return res.json({
      success: true,
      data: {
        agent: {
          _id: agent._id,
          firstName: agent.firstName,
          lastName: agent.lastName,
          username: agent.username,
          email: agent.email,
          mobileNo: agent.mobileNo,
          agentProfile: profile,
        },
        metrics: {
          totalLeads,
          maturedVisits: maturedLeads.length,
          activePipelineCount: activePipeline.length,
          handedOverCount: handedOverPipeline.length,
          walletBalance: profile.walletBalance || 0,
          totalEarned: profile.totalEarned || 0,
          totalDebited,
          commissionType: profile.commissionType || 'percentage',
          commissionRate: profile.commissionRate || 2,
          stageCounts,
        },
        recentLeads: enrichedLeads.slice(0, 8),
        recentCommissions: commissions.slice(0, 10),
      },
    });
  } catch (error) {
    console.error('getAgentDashboard error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Get Agent's own leads with segmentation and 5-day maturity metadata
 * @route  GET /api/agent/leads
 * @access Private (Agent)
 */
export const getAgentLeads = async (req, res) => {
  try {
    const agentId = req.query.agentId || req.user?.id;
    const { status, search, segment } = req.query; // segment: 'active' | 'handed_over' | 'all'

    // Process any expired debits before fetching leads
    await processExpiredAgentLeadsDebit();

    const filter = { agentId };
    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { name: regex },
        { mobileNo: regex },
        { email: regex },
        { requirement: regex },
      ];
    }

    const leads = await Lead.find(filter)
      .populate({
        path: 'assignedFlat',
        populate: { path: 'projectId', select: 'projectName projectCode' },
      })
      .populate('commission.ledgerId')
      .populate('commission.debitLedgerId')
      .sort({ updatedAt: -1 });

    let enriched = leads.map(enrichAgentLead);

    // Segment filtering
    if (segment === 'active') {
      enriched = enriched.filter((l) => !l.maturityMeta.isHandedOver && !l.maturityMeta.isDebited);
    } else if (segment === 'handed_over') {
      enriched = enriched.filter((l) => l.maturityMeta.isHandedOver || l.maturityMeta.isDebited);
    }

    return res.json({
      success: true,
      count: enriched.length,
      data: enriched,
    });
  } catch (error) {
    console.error('getAgentLeads error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Upload / Register a new lead by agent
 * @route  POST /api/agent/upload
 * @access Private (Agent)
 */
export const uploadAgentLead = async (req, res) => {
  try {
    const agentId = req.user?.id;
    const { name, mobileNo, email, budget, requirement, assignedFlat, initialNotes, scheduledSiteVisitDate } = req.body;

    if (!name || !mobileNo) {
      return res.status(400).json({
        success: false,
        message: 'Client name and mobile number are required',
      });
    }

    const leadData = {
      name: name.trim(),
      mobileNo: mobileNo.trim(),
      email: email ? email.trim() : '',
      budget: Number(budget) || 0,
      requirement: requirement || '2BHK Apartment',
      leadSource: 'agent',
      agentId,
      assignedFlat: assignedFlat || null,
      status: scheduledSiteVisitDate ? 'site_visit_scheduled' : 'new',
      createdBy: agentId,
      followUps: [],
    };

    if (scheduledSiteVisitDate) {
      leadData.siteVisitDetails = {
        scheduledDate: new Date(scheduledSiteVisitDate),
        maturityPeriodDays: 5,
      };
      leadData.followUps.push({
        date: new Date(),
        mode: 'site_visit',
        notes: initialNotes || 'Site visit scheduled by agent',
        nextFollowUpDate: new Date(scheduledSiteVisitDate),
        status: 'pending',
      });
    } else if (initialNotes) {
      leadData.followUps.push({
        date: new Date(),
        mode: 'call',
        notes: initialNotes,
        status: 'pending',
      });
    }

    const lead = new Lead(leadData);
    const saved = await lead.save();

    // Persist lead directly into the Agent's MongoDB document schema
    await User.findByIdAndUpdate(agentId, {
      $addToSet: { 'agentProfile.leads': saved._id },
    });

    const populated = await Lead.findById(saved._id).populate({
      path: 'assignedFlat',
      populate: { path: 'projectId', select: 'projectName projectCode' },
    });

    // Explicit Audit Event for Agent Lead Upload
    await recordAuditEvent({
      eventType: 'CRUD',
      action: 'LEAD_SUBMITTED',
      module: 'agent',
      resourceType: 'Lead',
      resourceId: saved._id,
      resourceName: saved.name,
      req,
      summary: `Channel Partner registered new buyer lead "${saved.name}" (Mobile: ${saved.mobileNo}, Budget: ₹${saved.budget.toLocaleString('en-IN')})`,
      changes: {
        budget: saved.budget,
        requirement: saved.requirement,
        scheduledSiteVisitDate,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Lead submitted successfully into your pipeline!',
      data: enrichAgentLead(populated),
    });
  } catch (error) {
    console.error('uploadAgentLead error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Get Agent Commission Ledger History with itemized Credit and Debit entries
 * @route  GET /api/agent/commissions
 * @access Private (Agent / Admin)
 */
export const getAgentCommissions = async (req, res) => {
  try {
    const agentId = req.query.agentId || req.user?.id;

    // Process any expired debits before fetching commissions
    await processExpiredAgentLeadsDebit();

    const commissions = await CommissionLedger.find({ agentId })
      .populate('leadId', 'name mobileNo budget status')
      .populate({
        path: 'flatId',
        populate: { path: 'projectId', select: 'projectName' },
      })
      .sort({ createdAt: -1 });

    const totalCredited = commissions
      .filter((c) => (c.transactionType === 'credit' || !c.transactionType) && (c.status === 'credited' || c.status === 'paid'))
      .reduce((sum, c) => sum + (c.calculatedAmount || 0), 0);

    const totalDebited = commissions
      .filter((c) => c.transactionType === 'debit' || c.status === 'debited')
      .reduce((sum, c) => sum + (c.calculatedAmount || 0), 0);

    const netBalance = Math.max(0, totalCredited - totalDebited);

    return res.json({
      success: true,
      count: commissions.length,
      totalCredited,
      totalDebited,
      netBalance,
      data: commissions,
    });
  } catch (error) {
    console.error('getAgentCommissions error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Lookup Agent by Unique Agent Code (e.g. AGT-101)
 * @route  GET /api/agent/lookup/:code
 * @access Public / Private
 */
export const lookupAgentByCode = async (req, res) => {
  try {
    const { code } = req.params;
    if (!code) {
      return res.status(400).json({ success: false, message: 'Agent code is required' });
    }
    const cleanCode = code.trim().toUpperCase();
    const agent = await User.findOne({
      $or: [
        { 'agentProfile.agentCode': cleanCode },
        { username: cleanCode.toLowerCase() },
        { email: cleanCode.toLowerCase() },
      ],
    }).select('-passwordHash');

    if (!agent) {
      return res.status(404).json({ success: false, message: `No active agent found with code "${cleanCode}"` });
    }

    return res.json({
      success: true,
      data: {
        agentId: agent._id,
        agentCode: agent.agentProfile?.agentCode || cleanCode,
        agentName: `${agent.firstName} ${agent.lastName || ''}`.trim(),
        agencyName: agent.agentProfile?.agencyName || 'Independent Real Estate Channel Partner',
        phone: agent.mobileNo || agent.phone || 'N/A',
        email: agent.email,
        commissionType: agent.agentProfile?.commissionType || 'percentage',
        commissionRate: agent.agentProfile?.commissionRate || 2,
        walletBalance: agent.agentProfile?.walletBalance || 0,
        maturedLeadsCount: agent.agentProfile?.maturedLeadsCount || 0,
      },
    });
  } catch (error) {
    console.error('lookupAgentByCode error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Record a new Verified Site Visit for an Agent with Party & Photo Proof
 * @route  POST /api/agent/site-visits
 * @access Private
 */
export const recordSiteVisit = async (req, res) => {
  try {
    const {
      agentCode,
      partyName,
      partyMobile,
      partyEmail,
      projectId,
      buildingId,
      flatIds,
      visitDate,
      visitNotes,
      latitude,
      longitude,
    } = req.body;

    if (!agentCode || !partyName || !partyMobile || !projectId) {
      return res.status(400).json({
        success: false,
        message: 'Agent code, party name, party mobile, and project are required',
      });
    }

    const cleanCode = agentCode.trim().toUpperCase();
    const agent = await User.findOne({
      $or: [
        { 'agentProfile.agentCode': cleanCode },
        { username: cleanCode.toLowerCase() },
        { email: cleanCode.toLowerCase() },
      ],
    });

    if (!agent) {
      return res.status(404).json({
        success: false,
        message: `Invalid Agent Code "${cleanCode}". Please verify the agent code.`,
      });
    }

    // Parse flatIds
    let parsedFlatIds = [];
    if (flatIds) {
      try {
        parsedFlatIds = Array.isArray(flatIds) ? flatIds : JSON.parse(flatIds);
      } catch (e) {
        parsedFlatIds = typeof flatIds === 'string' ? flatIds.split(',').map((s) => s.trim()).filter(Boolean) : [];
      }
    }

    let partySelfieUrl = '';
    if (req.file) {
      const uploadRes = await uploadFileToS3(
        req.file.buffer,
        req.file.originalname,
        req.file.mimetype,
        'site_visits'
      );
      partySelfieUrl = uploadRes.documentUrl;
    }

    // Link or auto-create CRM Lead
    let lead = await Lead.findOne({ mobileNo: partyMobile.trim() });
    if (!lead) {
      lead = new Lead({
        name: partyName.trim(),
        mobileNo: partyMobile.trim(),
        email: partyEmail ? partyEmail.trim() : undefined,
        leadSource: 'agent',
        agentId: agent._id,
        status: 'site_visit_scheduled',
        assignedFlat: parsedFlatIds.length > 0 ? parsedFlatIds[0] : undefined,
        siteVisitDetails: {
          scheduledDate: visitDate ? new Date(visitDate) : new Date(),
          visitorType: 'party',
        },
      });
      await lead.save();
    } else {
      lead.agentId = agent._id;
      lead.leadSource = 'agent';
      if (!lead.assignedFlat && parsedFlatIds.length > 0) {
        lead.assignedFlat = parsedFlatIds[0];
      }
      await lead.save();
    }

    const siteVisit = new SiteVisit({
      agentId: agent._id,
      agentCode: agent.agentProfile?.agentCode || cleanCode,
      agentName: `${agent.firstName} ${agent.lastName || ''}`.trim(),
      agencyName: agent.agentProfile?.agencyName || '',
      agentPhone: agent.mobileNo || '',
      leadId: lead._id,
      partyName: partyName.trim(),
      partyMobile: partyMobile.trim(),
      partyEmail: partyEmail ? partyEmail.trim() : '',
      projectId,
      buildingId: buildingId || undefined,
      flatIds: parsedFlatIds,
      visitDate: visitDate ? new Date(visitDate) : new Date(),
      visitNotes: visitNotes || '',
      partySelfieUrl,
      locationCoordinates: latitude && longitude ? { latitude: Number(latitude), longitude: Number(longitude) } : undefined,
      verificationStatus: 'pending',
      submittedBy: req.user?.id || agent._id,
    });

    const saved = await siteVisit.save();

    // Persist both site visit and linked lead directly in the Agent's MongoDB document schema
    await User.findByIdAndUpdate(agent._id, {
      $addToSet: {
        'agentProfile.siteVisits': saved._id,
        'agentProfile.leads': lead._id,
      },
    });

    const populated = await SiteVisit.findById(saved._id)
      .populate('agentId', 'firstName lastName mobileNo email agentProfile')
      .populate('projectId', 'projectName projectCode')
      .populate('flatIds', 'flatNumber floorNumber block status');

    // Audit Event for Site Visit Registration
    await recordAuditEvent({
      eventType: 'CRUD',
      action: 'SITE_VISIT_LOGGED',
      module: 'agent',
      resourceType: 'SiteVisit',
      resourceId: saved._id,
      resourceName: saved.visitCode,
      req,
      summary: `Verified site visit recorded (Code: ${saved.visitCode}) for client "${saved.partyName}" (${saved.partyMobile}) with Agent ${saved.agentName} (Code: ${saved.agentCode})`,
      changes: {
        visitDate: saved.visitDate,
        hasSelfieProof: !!saved.partySelfieUrl,
        hasGpsCoordinates: !!saved.locationCoordinates,
      },
    });

    return res.status(201).json({
      success: true,
      message: 'Site visit logged successfully! Awaiting verification and approval.',
      data: populated,
    });
  } catch (error) {
    console.error('recordSiteVisit error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Get All Logged Site Visits with Filters
 * @route  GET /api/agent/site-visits
 * @access Private
 */
export const getSiteVisits = async (req, res) => {
  try {
    const { status, agentCode, search, projectId, agentId } = req.query;
    const filter = {};

    // Filter by specific agent ID (for viewing agent profile)
    if (agentId) filter.agentId = agentId;

    if (status) filter.verificationStatus = status;
    if (projectId) filter.projectId = projectId;
    if (agentCode) filter.agentCode = agentCode.trim().toUpperCase();

    if (search) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$or = [
        { visitCode: regex },
        { agentCode: regex },
        { agentName: regex },
        { partyName: regex },
        { partyMobile: regex },
      ];
    }

    const visits = await SiteVisit.find(filter)
      .populate('agentId', 'firstName lastName mobileNo email agentProfile')
      .populate('projectId', 'projectName projectCode')
      .populate('flatIds', 'flatNumber floorNumber block status')
      .populate('verifiedBy', 'firstName lastName')
      .sort({ createdAt: -1 });

    return res.json({
      success: true,
      count: visits.length,
      data: visits,
    });
  } catch (error) {
    console.error('getSiteVisits error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Admin / Management Approval of Agent Site Visit
 * @route  PUT /api/agent/site-visits/:id/verify
 * @access Private (Admin / Sales Manager)
 */
export const verifySiteVisit = async (req, res) => {
  try {
    const { id } = req.params;
    const { action, rejectionReason, verificationNotes } = req.body;

    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ success: false, message: 'Action must be "approve" or "reject"' });
    }

    const visit = await SiteVisit.findById(id);
    if (!visit) {
      return res.status(404).json({ success: false, message: 'Site visit record not found' });
    }

    if (action === 'reject' && !rejectionReason?.trim()) {
      return res.status(400).json({ success: false, message: 'Rejection reason is required' });
    }

    visit.verificationStatus = action === 'approve' ? 'approved' : 'rejected';
    visit.verifiedBy = req.user?.id || null;
    visit.verifiedAt = new Date();
    if (action === 'reject') {
      visit.rejectionReason = rejectionReason.trim();
    } else {
      visit.rejectionReason = undefined;
    }
    if (verificationNotes) {
      visit.verificationNotes = verificationNotes.trim();
    }

    await visit.save();

    // If approved, update linked CRM Lead & process commission credit
    let commissionResult = null;
    if (action === 'approve' && visit.leadId) {
      const lead = await Lead.findById(visit.leadId);
      if (lead) {
        lead.status = 'site_visit_completed';
        lead.siteVisitDetails = {
          ...lead.siteVisitDetails,
          completedDate: visit.visitDate || new Date(),
          isVerified: true,
          verifiedBy: req.user?.id,
          approvalStatus: 'approved',
          verificationNotes: verificationNotes || 'Approved by inhouse management',
        };
        await lead.save();

        commissionResult = await processAgentCommission(lead, req.user?.id);
      }
    } else if (action === 'reject' && visit.leadId) {
      const lead = await Lead.findById(visit.leadId);
      if (lead) {
        lead.status = 'site_visit_rejected';
        lead.siteVisitDetails = {
          ...lead.siteVisitDetails,
          isVerified: false,
          verifiedBy: req.user?.id,
          approvalStatus: 'rejected',
          rejectionReason: rejectionReason?.trim(),
        };
        await lead.save();
      }
    }

    const populated = await SiteVisit.findById(visit._id)
      .populate('agentId', 'firstName lastName mobileNo email agentProfile')
      .populate('projectId', 'projectName projectCode')
      .populate('flatIds', 'flatNumber floorNumber block status')
      .populate('verifiedBy', 'firstName lastName');

    // Audit Event for Site Visit Approval / Rejection
    await recordAuditEvent({
      eventType: 'BUSINESS_LOGIC',
      action: action === 'approve' ? 'SITE_VISIT_APPROVED' : 'SITE_VISIT_REJECTED',
      module: 'agent',
      resourceType: 'SiteVisit',
      resourceId: visit._id,
      resourceName: visit.visitCode,
      req,
      summary: action === 'approve'
        ? `Inhouse verified and approved Site Visit "${visit.visitCode}" for Agent "${visit.agentName}". ${commissionResult ? `₹${commissionResult.calculatedAmount.toLocaleString('en-IN')} commission credited.` : ''}`
        : `Inhouse rejected Site Visit "${visit.visitCode}" for Agent "${visit.agentName}". Reason: ${rejectionReason}`,
      changes: {
        verificationStatus: visit.verificationStatus,
        verificationNotes,
        rejectionReason,
      },
    });

    return res.json({
      success: true,
      message: action === 'approve' ? 'Site visit verified & approved successfully!' : 'Site visit has been rejected.',
      data: populated,
      commissionResult,
    });
  } catch (error) {
    console.error('verifySiteVisit error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Helper: Automated Commission Credit when a Flat Booking is confirmed
 */
export const autoCreditAgentBookingCommission = async (salesLead, targetFlat = null, dealValue = 0) => {
  try {
    if (!salesLead) return null;

    const buyerMobile = salesLead.mobileNo ? salesLead.mobileNo.trim() : '';
    const leadId = salesLead.leadId?._id || salesLead.leadId;

    // Find any approved site visit for this party or lead
    let siteVisit = null;
    if (leadId) {
      siteVisit = await SiteVisit.findOne({
        leadId,
        verificationStatus: 'approved',
        bookingStatus: { $ne: 'booked' },
      }).sort({ createdAt: -1 });
    }

    if (!siteVisit && buyerMobile) {
      siteVisit = await SiteVisit.findOne({
        partyMobile: buyerMobile,
        verificationStatus: 'approved',
        bookingStatus: { $ne: 'booked' },
      }).sort({ createdAt: -1 });
    }

    // Also check if CRM Lead directly has an agent assigned
    let agentId = siteVisit?.agentId;
    let agent = null;

    if (!agentId && leadId) {
      const lead = await Lead.findById(leadId);
      if (lead && lead.agentId) {
        agentId = lead.agentId;
      }
    }

    if (!agentId) {
      console.log(`[Commission Engine] No verified agent site visit or agent linked for buyer ${salesLead.name} (${buyerMobile})`);
      return null;
    }

    agent = await User.findById(agentId);
    if (!agent) return null;

    const commissionType = agent.agentProfile?.commissionType || 'percentage';
    const commissionRate = Number(agent.agentProfile?.commissionRate) || (commissionType === 'percentage' ? 2 : 25000);

    const baseAmount = dealValue || targetFlat?.basePrice || salesLead.paymentPlan?.totalAmount || 4500000;
    let calculatedAmount = 0;

    if (commissionType === 'percentage') {
      calculatedAmount = Math.round((baseAmount * commissionRate) / 100);
    } else {
      calculatedAmount = Math.round(commissionRate);
    }

    if (calculatedAmount <= 0) return null;

    // Check if commission already credited for this sales lead
    const existingLedger = await CommissionLedger.findOne({
      agentId: agent._id,
      $or: [
        { leadId: leadId || undefined },
        { remarks: new RegExp(`Booking for Flat ${targetFlat?.flatNumber || ''}`, 'i') },
      ],
      triggerEvent: 'booking_confirmed',
      status: 'credited',
    });

    if (existingLedger) {
      console.log(`[Commission Engine] Commission already credited for Sales Lead ${salesLead._id}`);
      return existingLedger;
    }

    // 1. Create CommissionLedger entry
    const ledgerEntry = await CommissionLedger.create({
      agentId: agent._id,
      leadId: leadId || new mongoose.Types.ObjectId(),
      leadName: salesLead.name,
      leadMobile: salesLead.mobileNo,
      flatId: salesLead.flatId || targetFlat?._id || null,
      transactionType: 'credit',
      triggerEvent: 'booking_confirmed',
      commissionType,
      commissionRate,
      baseAmount,
      calculatedAmount,
      siteVisitDate: siteVisit?.visitDate || new Date(),
      status: 'credited',
      creditedAt: new Date(),
      remarks: `Automated ${commissionType === 'percentage' ? `${commissionRate}%` : `₹${commissionRate}`} commission on Confirmed Booking of Flat ${targetFlat?.flatNumber || ''} (Deal Value: ₹${baseAmount.toLocaleString('en-IN')})`,
    });

    // 2. Increment Agent Wallet and total earnings
    agent.agentProfile = agent.agentProfile || {};
    agent.agentProfile.walletBalance = (Number(agent.agentProfile.walletBalance) || 0) + calculatedAmount;
    agent.agentProfile.totalEarned = (Number(agent.agentProfile.totalEarned) || 0) + calculatedAmount;
    agent.agentProfile.maturedLeadsCount = (Number(agent.agentProfile.maturedLeadsCount) || 0) + 1;
    await agent.save();

    // 3. Update SiteVisit record if exists
    if (siteVisit) {
      siteVisit.bookingStatus = 'booked';
      siteVisit.salesLeadId = salesLead._id;
      siteVisit.bookedFlatId = salesLead.flatId || targetFlat?._id;
      siteVisit.bookedAt = new Date();
      siteVisit.commissionStatus = 'credited';
      siteVisit.commissionAmount = calculatedAmount;
      siteVisit.commissionLedgerId = ledgerEntry._id;
      await siteVisit.save();
    }

    console.log(`✅ [Commission Engine] Automated Commission of ₹${calculatedAmount.toLocaleString('en-IN')} credited to Agent "${agent.firstName} ${agent.lastName}" (Code: ${agent.agentProfile?.agentCode || 'N/A'}) for Booking ID: ${salesLead._id}`);

    // Audit Event for Booking Commission Auto-Credit
    await recordAuditEvent({
      eventType: 'TRANSACTION',
      action: 'COMMISSION_CREDIT',
      module: 'agent',
      resourceType: 'CommissionLedger',
      resourceId: ledgerEntry._id,
      resourceName: `Booking Commission: ₹${calculatedAmount.toLocaleString('en-IN')}`,
      user: agent,
      summary: `Confirmed Flat Booking automated commission of ₹${calculatedAmount.toLocaleString('en-IN')} credited to Agent "${agent.firstName} ${agent.lastName}" (Deal Value: ₹${baseAmount.toLocaleString('en-IN')})`,
      changes: {
        calculatedAmount,
        walletBalance: agent.agentProfile.walletBalance,
        salesLeadId: salesLead._id,
      },
    });

    return ledgerEntry;
  } catch (err) {
    console.error('[Commission Engine] Error auto-crediting commission on booking:', err);
    return null;
  }
};

/**
 * @desc   Get all agents / channel partners for admin agent network directory
 * @route  GET /api/agent/all
 * @access Private (Admin / CRM Manager)
 */
export const getAllAgents = async (req, res) => {
  try {
    const { search, status, tier, city, sortBy, sortOrder, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(page) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
    const skip = (pageNum - 1) * limitNum;

    // 1. Identify Agent Roles and Admin Roles
    const [agentRoles, adminRoles] = await Promise.all([
      Role.find({
        $or: [
          { roleCode: 'agent' },
          { roleName: /agent|channel partner/i },
        ],
      }).select('_id'),
      Role.find({
        roleCode: { $in: ['super_admin', 'sales_head', 'site_engineer', 'hr_manager', 'accounts_manager'] },
      }).select('_id'),
    ]);

    const agentRoleIds = agentRoles.map(r => r._id);
    const adminRoleIds = adminRoles.map(r => r._id);

    const baseAgentFilter = {
      $and: [
        {
          $or: [
            { roleId: { $in: agentRoleIds } },
            { 'agentProfile.agentCode': { $exists: true, $ne: '', $ne: null } },
            { 'agentProfile.agencyName': { $exists: true, $ne: '', $ne: null } },
          ],
        },
        {
          roleId: { $nin: adminRoleIds },
          username: { $nin: ['admin', 'sales_head', 'site_eng', 'hr_manager', 'accounts_head'] },
        },
      ],
    };

    const filter = { ...baseAgentFilter };

    if (status && status !== 'all') {
      filter.status = status;
    }

    if (search) {
      const regex = new RegExp(escapeRegex(search.trim()), 'i');
      filter.$and.push({
        $or: [
          { firstName: regex },
          { lastName: regex },
          { 'agentProfile.agentCode': regex },
          { 'agentProfile.agencyName': regex },
          { 'agentProfile.city': regex },
          { mobileNo: regex },
          { email: regex },
          { username: regex },
        ],
      });
    }

    if (tier && tier !== 'all') {
      filter['agentProfile.tier'] = tier;
    }

    if (city && city !== 'all') {
      filter['agentProfile.city'] = city;
    }

    // Sorting
    const sortField = sortBy || 'createdAt';
    const sortDir = sortOrder === 'asc' ? 1 : -1;
    const sortObj = {};
    if (sortField === 'walletBalance') {
      sortObj['agentProfile.walletBalance'] = sortDir;
    } else if (sortField === 'totalEarned') {
      sortObj['agentProfile.totalEarned'] = sortDir;
    } else if (sortField === 'commissionRate') {
      sortObj['agentProfile.commissionRate'] = sortDir;
    } else if (sortField === 'maturedLeadsCount') {
      sortObj['agentProfile.maturedLeadsCount'] = sortDir;
    } else if (sortField === 'name') {
      sortObj['firstName'] = sortDir;
    } else {
      sortObj[sortField] = sortDir;
    }

    const [agents, total] = await Promise.all([
      User.find(filter)
        .select('-passwordHash')
        .populate('roleId', 'roleName roleCode')
        .sort(sortObj)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(filter),
    ]);

    // Aggregate KPIs
    const allAgentIds = agents.map(a => a._id);
    const [leadCounts, siteVisitCounts] = await Promise.all([
      Lead.aggregate([
        { $match: { agentId: { $in: allAgentIds } } },
        { $group: { _id: '$agentId', total: { $sum: 1 }, pending: { $sum: { $cond: [{ $eq: ['$status', 'site_visit_completed_pending_approval'] }, 1, 0] } } } },
      ]),
      SiteVisit.aggregate([
        { $match: { agentId: { $in: allAgentIds } } },
        { $group: { _id: '$agentId', total: { $sum: 1 }, approved: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'approved'] }, 1, 0] } }, pending: { $sum: { $cond: [{ $eq: ['$verificationStatus', 'pending'] }, 1, 0] } } } },
      ]),
    ]);

    const leadMap = {};
    leadCounts.forEach(l => { leadMap[l._id.toString()] = l; });
    const visitMap = {};
    siteVisitCounts.forEach(v => { visitMap[v._id.toString()] = v; });

    const enrichedAgents = agents.map((a) => {
      const code = a.agentProfile?.agentCode || `AGT-${a._id.toString().slice(-4).toUpperCase()}`;
      return {
        ...a,
        agentProfile: {
          ...a.agentProfile,
          agentCode: code,
          agencyName: a.agentProfile?.agencyName || 'Independent Channel Partner',
          tier: a.agentProfile?.tier || 'Standard',
          city: a.agentProfile?.city || 'Mathura/Vrindavan',
          commissionRate: a.agentProfile?.commissionRate || 2,
          walletBalance: a.agentProfile?.walletBalance || 0,
          totalEarned: a.agentProfile?.totalEarned || 0,
        },
        leadStats: leadMap[a._id.toString()] || { total: 0, pending: 0 },
        visitStats: visitMap[a._id.toString()] || { total: 0, approved: 0, pending: 0 },
      };
    });

    // Network-wide summary KPIs
    const networkKPIs = await User.aggregate([
      { $match: baseAgentFilter },
      {
        $group: {
          _id: null,
          totalAgents: { $sum: 1 },
          activeAgents: { $sum: { $cond: [{ $eq: ['$status', 'active'] }, 1, 0] } },
          totalWallet: { $sum: { $ifNull: ['$agentProfile.walletBalance', 0] } },
          totalEarnings: { $sum: { $ifNull: ['$agentProfile.totalEarned', 0] } },
          totalMatured: { $sum: { $ifNull: ['$agentProfile.maturedLeadsCount', 0] } },
          avgCommRate: { $avg: { $ifNull: ['$agentProfile.commissionRate', 2] } },
        },
      },
    ]);

    return res.json({
      success: true,
      data: enrichedAgents,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
      networkKPIs: networkKPIs[0] || {
        totalAgents: total,
        activeAgents: total,
        totalWallet: 0,
        totalEarnings: 0,
        totalMatured: 0,
        avgCommRate: 2,
      },
    });
  } catch (error) {
    console.error('getAllAgents error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Get Agent-Specific Audit Logs & Activity History
 * @route  GET /api/agent/audit-logs
 * @access Private (Agent / Admin)
 */
export const getAgentAuditLogs = async (req, res) => {
  try {
    const targetAgentId = req.query.agentId || req.user?.id;
    if (!targetAgentId) {
      return res.status(400).json({ success: false, message: 'Agent identification required' });
    }

    const agent = await User.findById(targetAgentId).select('-passwordHash');
    if (!agent) {
      return res.status(404).json({ success: false, message: 'Agent profile not found' });
    }

    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 25));
    const skip = (page - 1) * limit;

    const agentCode = agent.agentProfile?.agentCode || '';
    const username = agent.username || '';

    const orConditions = [
      { 'performedBy.userId': agent._id },
      { resourceId: agent._id.toString() },
    ];

    if (agentCode) {
      const codeRegex = new RegExp(escapeRegex(agentCode), 'i');
      orConditions.push({ summary: codeRegex });
      orConditions.push({ resourceName: codeRegex });
    }

    if (username) {
      const userRegex = new RegExp(escapeRegex(username), 'i');
      orConditions.push({ summary: userRegex });
    }

    const query = {
      $or: orConditions,
    };

    const [logs, total] = await Promise.all([
      AuditLog.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      AuditLog.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: logs,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error) {
    console.error('getAgentAuditLogs error:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

