import SalesTeamMember from '../models/SalesTeamMember.js';
import Lead from '../models/Lead.js';
import User from '../models/User.js';

/**
 * Get the next sales team member in sequential round-robin rotation.
 * Alternates one-by-one among active sales team members.
 */
export const getNextSalesTeamMember = async () => {
  try {
    // 1. Find all members who are active in round-robin
    const activeMembers = await SalesTeamMember.find({ isActiveInRoundRobin: true })
      .populate('userId', 'firstName lastName username email mobileNo status')
      .sort({ lastAssignedAt: 1, order: 1, createdAt: 1 });

    // Filter out any members whose User account is inactive
    const validMembers = activeMembers.filter(
      (m) => m.userId && m.userId.status !== 'inactive' && m.userId.status !== 'suspended'
    );

    if (validMembers.length === 0) {
      // Fallback: Check if there's any user with role sales_head or sales_executive
      const fallbackUser = await User.findOne({
        username: { $in: ['sales_head', 'admin'] },
        status: 'active',
      });
      return fallbackUser ? { member: null, user: fallbackUser } : null;
    }

    // The first member in the sorted list has waited the longest (or never assigned)
    const selectedMember = validMembers[0];

    // Update assignment metrics for the selected member
    selectedMember.lastAssignedAt = new Date();
    selectedMember.leadsAssignedCount = (selectedMember.leadsAssignedCount || 0) + 1;
    await selectedMember.save();

    return {
      member: selectedMember,
      user: selectedMember.userId,
    };
  } catch (error) {
    console.error('Error selecting next sales team member in round robin:', error);
    return null;
  }
};

/**
 * Distribute a batch of unassigned leads evenly across the active sales team one-by-one.
 */
export const distributeUnassignedLeads = async (leadIds = null, initiatedByUserId = null) => {
  try {
    let query = {
      assignedTo: null,
      status: { $nin: ['converted', 'lost'] },
    };

    if (Array.isArray(leadIds) && leadIds.length > 0) {
      query._id = { $in: leadIds };
    }

    const unassignedLeads = await Lead.find(query).sort({ createdAt: 1 });
    if (unassignedLeads.length === 0) {
      return { success: true, count: 0, message: 'No unassigned leads found to distribute.' };
    }

    // Active members in round robin
    const activeMembers = await SalesTeamMember.find({ isActiveInRoundRobin: true })
      .populate('userId', 'firstName lastName username email mobileNo')
      .sort({ order: 1, createdAt: 1 });

    const validMembers = activeMembers.filter((m) => m.userId);
    if (validMembers.length === 0) {
      throw new Error('No active sales team members available in round-robin rotation.');
    }

    const distributionSummary = {};
    validMembers.forEach((m) => {
      const name = `${m.userId.firstName || ''} ${m.userId.lastName || ''}`.trim() || m.userId.username;
      distributionSummary[m.userId._id.toString()] = {
        memberId: m._id,
        userId: m.userId._id,
        name,
        assignedCount: 0,
      };
    });

    let memberIndex = 0;
    const updatedLeads = [];

    for (const lead of unassignedLeads) {
      const targetMember = validMembers[memberIndex % validMembers.length];
      memberIndex++;

      lead.assignedTo = targetMember.userId._id;
      lead.assignedAt = new Date();
      lead.assignedBy = initiatedByUserId || null;

      lead.assignmentHistory = lead.assignmentHistory || [];
      lead.assignmentHistory.push({
        assignedTo: targetMember.userId._id,
        assignedBy: initiatedByUserId || null,
        assignedAt: new Date(),
        reason: 'Automated 1-by-1 Round Robin Distribution',
      });

      await lead.save();
      updatedLeads.push(lead._id);

      // Update team member stats
      targetMember.leadsAssignedCount = (targetMember.leadsAssignedCount || 0) + 1;
      targetMember.lastAssignedAt = new Date();
      await targetMember.save();

      const userKey = targetMember.userId._id.toString();
      if (distributionSummary[userKey]) {
        distributionSummary[userKey].assignedCount++;
      }
    }

    return {
      success: true,
      count: updatedLeads.length,
      distributionSummary: Object.values(distributionSummary),
      message: `Successfully distributed ${updatedLeads.length} leads across ${validMembers.length} team members one-by-one.`,
    };
  } catch (error) {
    console.error('Error distributing unassigned leads:', error);
    throw error;
  }
};

/**
 * Get comprehensive Sales Team Overview and performance metrics.
 */
export const getSalesTeamOverview = async () => {
  try {
    const teamMembers = await SalesTeamMember.find()
      .populate('userId', 'firstName lastName username email mobileNo status lastLoginAt')
      .populate('addedBy', 'firstName lastName username')
      .sort({ order: 1, createdAt: 1 });

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const enrichedMembers = await Promise.all(
      teamMembers.map(async (member) => {
        if (!member.userId) return null;

        const userId = member.userId._id;

        const [totalAssigned, activeLeads, convertedLeads, todayFollowUps] = await Promise.all([
          Lead.countDocuments({ assignedTo: userId }),
          Lead.countDocuments({ assignedTo: userId, status: { $nin: ['converted', 'lost'] } }),
          Lead.countDocuments({ assignedTo: userId, status: 'converted' }),
          Lead.countDocuments({
            assignedTo: userId,
            'followUps.nextFollowUpDate': { $gte: todayStart, $lte: todayEnd },
            'followUps.status': 'pending',
          }),
        ]);

        return {
          _id: member._id,
          userId: member.userId,
          roleTitle: member.roleTitle,
          isActiveInRoundRobin: member.isActiveInRoundRobin,
          order: member.order,
          leadsAssignedCount: member.leadsAssignedCount || totalAssigned,
          lastAssignedAt: member.lastAssignedAt,
          maxActiveLeads: member.maxActiveLeads,
          metrics: {
            totalAssigned,
            activeLeads,
            convertedLeads,
            todayFollowUps,
            conversionRate: totalAssigned > 0 ? Math.round((convertedLeads / totalAssigned) * 100) : 0,
          },
        };
      })
    );

    const validEnriched = enrichedMembers.filter(Boolean);

    // Determine who is next in line for round robin
    const activeInRotation = validEnriched
      .filter((m) => m.isActiveInRoundRobin && m.userId?.status === 'active')
      .sort((a, b) => {
        if (!a.lastAssignedAt && b.lastAssignedAt) return -1;
        if (a.lastAssignedAt && !b.lastAssignedAt) return 1;
        if (!a.lastAssignedAt && !b.lastAssignedAt) return a.order - b.order;
        return new Date(a.lastAssignedAt) - new Date(b.lastAssignedAt);
      });

    const nextInQueue = activeInRotation.length > 0 ? activeInRotation[0] : null;

    return {
      success: true,
      totalTeamMembers: validEnriched.length,
      activeInRotationCount: activeInRotation.length,
      nextInQueue,
      teamMembers: validEnriched,
    };
  } catch (error) {
    console.error('Error fetching sales team overview:', error);
    throw error;
  }
};
