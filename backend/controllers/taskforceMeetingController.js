import { TaskforceMeeting } from '../models/TaskforceMeeting.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import NotificationLog from '../models/NotificationLog.js';

/**
 * Helper to escape regex search queries
 */
const escapeRegex = (str = '') => str.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&');

/**
 * @desc   Get list of Taskforce Meetings with search and filters
 * @route  GET /api/taskforce-meetings
 * @access Authenticated (tasks:view)
 */
export const getMeetings = async (req, res) => {
  try {
    const {
      search,
      status,
      meetingType,
      department,
      momStatus,
      from,
      to,
      page = 1,
      limit = 25,
      sortBy = 'scheduledDate',
      sortOrder = 'desc',
    } = req.query;

    const query = {};

    // Search query matching title, meetingCode, agenda, location
    if (search && search.trim()) {
      const rx = new RegExp(escapeRegex(search.trim()), 'i');
      query.$or = [
        { title: rx },
        { meetingCode: rx },
        { agenda: rx },
        { locationDetails: rx },
        { organizerName: rx },
      ];
    }

    if (status && status !== 'all') {
      query.status = status;
    }

    if (meetingType && meetingType !== 'all') {
      query.meetingType = meetingType;
    }

    if (department && department !== 'all') {
      query.$or = query.$or || [];
      query.$or.push(
        { department: new RegExp(`^${escapeRegex(department.trim())}$`, 'i') },
        { department: 'all' }
      );
    }

    if (momStatus && momStatus !== 'all') {
      query['mom.momStatus'] = momStatus;
    }

    // Date range filter
    if (from || to) {
      query.scheduledDate = {};
      if (from) {
        const fromDate = new Date(from);
        fromDate.setHours(0, 0, 0, 0);
        query.scheduledDate.$gte = fromDate;
      }
      if (to) {
        const toDate = new Date(to);
        toDate.setHours(23, 59, 59, 999);
        query.scheduledDate.$lte = toDate;
      }
    }

    // Filter to only meetings where logged-in user is attendee or organizer
    if (req.query.myMeetings === 'true' && req.user) {
      const currentUserId = req.user._id || req.user.id;
      const userCondition = [
        { organizer: currentUserId },
        { 'attendees.user': currentUserId },
      ];
      if (query.$or) {
        query.$and = [{ $or: query.$or }, { $or: userCondition }];
        delete query.$or;
      } else {
        query.$or = userCondition;
      }
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 25));
    const skip = (pageNum - 1) * limitNum;
    const sort = { [sortBy]: sortOrder === 'asc' ? 1 : -1 };

    const [meetings, total] = await Promise.all([
      TaskforceMeeting.find(query)
        .populate('organizer', 'firstName lastName username email role department designation')
        .populate('attendees.user', 'firstName lastName username email department designation')
        .populate('mom.recordedBy', 'firstName lastName username email role')
        .populate('mom.approvedBy', 'firstName lastName username email role')
        .populate('mom.actionItems.assignedTo', 'firstName lastName username email department')
        .populate('mom.actionItems.linkedTaskId', 'taskCode title status priority dueDate')
        .sort(sort)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      TaskforceMeeting.countDocuments(query),
    ]);

    return res.json({
      success: true,
      data: meetings,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum) || 1,
      },
    });
  } catch (error) {
    console.error('Error fetching taskforce meetings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve taskforce meetings',
      error: error.message,
    });
  }
};

/**
 * @desc   Get upcoming meetings for current logged-in account (as attendee or organizer)
 * @route  GET /api/taskforce-meetings/my-upcoming
 * @access Authenticated
 */
export const getMyUpcomingMeetings = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);

    // Look for scheduled, in-progress, or rescheduled meetings today or later
    const query = {
      $or: [
        { organizer: userId },
        { 'attendees.user': userId },
      ],
      scheduledDate: { $gte: startOfToday },
      status: { $in: ['scheduled', 'in_progress', 'rescheduled'] },
    };

    const meetings = await TaskforceMeeting.find(query)
      .populate('organizer', 'firstName lastName username email department role')
      .populate('attendees.user', 'firstName lastName username email department role')
      .populate('projectId', 'name code')
      .sort({ scheduledDate: 1, startTime: 1 })
      .lean();

    // Enrich with reminder & alarm calculation flags
    const enriched = meetings.map((m) => {
      const d = new Date(m.scheduledDate);
      const isToday =
        d.getFullYear() === now.getFullYear() &&
        d.getMonth() === now.getMonth() &&
        d.getDate() === now.getDate();

      let minutesRemaining = null;
      let isDueSoon = false;
      let isPast = false;

      if (m.startTime) {
        // e.g. "10:30", "14:00", "02:30 PM"
        const cleanTime = m.startTime.trim();
        const parts = cleanTime.split(' ');
        const [hStr, mStr] = parts[0].split(':');
        let hours = parseInt(hStr, 10) || 0;
        let mins = parseInt(mStr, 10) || 0;

        if (parts[1]) {
          const meridiem = parts[1].toUpperCase();
          if (meridiem === 'PM' && hours < 12) hours += 12;
          if (meridiem === 'AM' && hours === 12) hours = 0;
        }

        const meetingDateTime = new Date(d);
        meetingDateTime.setHours(hours, mins, 0, 0);

        const diffMs = meetingDateTime.getTime() - now.getTime();
        minutesRemaining = Math.round(diffMs / (60 * 1000));
        isDueSoon = isToday && minutesRemaining >= -20 && minutesRemaining <= 60;
        isPast = isToday ? minutesRemaining < -20 : d < startOfToday;
      }

      return {
        ...m,
        isToday,
        isDueSoon,
        isPast,
        minutesRemaining,
        venue: m.locationDetails || (m.locationType === 'virtual' ? 'Virtual Conference Room' : 'Krishna Valley Site Operations Room'),
        attendeesCount: Array.isArray(m.attendees) ? m.attendees.length : 0,
      };
    });

    return res.json({
      success: true,
      data: enriched,
    });
  } catch (error) {
    console.error('Error fetching user upcoming meetings:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve upcoming scheduled meetings',
      error: error.message,
    });
  }
};

/**
 * @desc   Get KPI metrics for Meetings & MoM Overview
 * @route  GET /api/taskforce-meetings/stats
 * @access Authenticated (tasks:view)
 */
export const getMeetingStats = async (req, res) => {
  try {
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    const [
      totalMeetings,
      upcomingScheduled,
      todayMeetings,
      completedWithMoM,
      pendingMoM,
      executiveReviews,
      allMeetings,
    ] = await Promise.all([
      TaskforceMeeting.countDocuments(),
      TaskforceMeeting.countDocuments({
        status: 'scheduled',
        scheduledDate: { $gte: startOfToday },
      }),
      TaskforceMeeting.countDocuments({
        scheduledDate: { $gte: startOfToday, $lte: endOfToday },
        status: { $ne: 'cancelled' },
      }),
      TaskforceMeeting.countDocuments({
        'mom.momStatus': { $in: ['published', 'approved'] },
      }),
      TaskforceMeeting.countDocuments({
        $or: [
          { status: 'completed', 'mom.momStatus': { $in: ['pending', 'draft'] } },
          { scheduledDate: { $lt: startOfToday }, status: { $ne: 'cancelled' }, 'mom.momStatus': { $in: ['pending', 'draft'] } },
        ],
      }),
      TaskforceMeeting.countDocuments({ meetingType: 'executive_review' }),
      TaskforceMeeting.find({}, { 'mom.actionItems': 1 }).lean(),
    ]);

    // Aggregate Action Items
    let totalActionItems = 0;
    let convertedTasksCount = 0;
    let pendingActionItems = 0;

    allMeetings.forEach((m) => {
      if (m.mom?.actionItems?.length) {
        m.mom.actionItems.forEach((ai) => {
          totalActionItems++;
          if (ai.status === 'converted_to_task' || ai.linkedTaskId) {
            convertedTasksCount++;
          } else if (ai.status === 'pending' || ai.status === 'in_progress') {
            pendingActionItems++;
          }
        });
      }
    });

    return res.json({
      success: true,
      stats: {
        totalMeetings,
        upcomingScheduled,
        todayMeetings,
        completedWithMoM,
        pendingMoM,
        executiveReviews,
        totalActionItems,
        convertedTasksCount,
        pendingActionItems,
      },
    });
  } catch (error) {
    console.error('Error fetching meeting stats:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to compute meeting statistics',
      error: error.message,
    });
  }
};

/**
 * @desc   Get single meeting details by ID
 * @route  GET /api/taskforce-meetings/:id
 * @access Authenticated (tasks:view)
 */
export const getMeetingById = async (req, res) => {
  try {
    const meeting = await TaskforceMeeting.findById(req.params.id)
      .populate('organizer', 'firstName lastName username email role department designation')
      .populate('attendees.user', 'firstName lastName username email department designation')
      .populate('mom.recordedBy', 'firstName lastName username email role')
      .populate('mom.approvedBy', 'firstName lastName username email role')
      .populate('mom.actionItems.assignedTo', 'firstName lastName username email department')
      .populate('mom.actionItems.linkedTaskId', 'taskCode title status priority dueDate assignedTo')
      .lean();

    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    return res.json({
      success: true,
      data: meeting,
    });
  } catch (error) {
    console.error('Error fetching meeting details:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to load meeting details',
      error: error.message,
    });
  }
};

/**
 * @desc   Schedule a new Taskforce Meeting
 * @route  POST /api/taskforce-meetings
 * @access Authenticated (tasks:create, tasks:manage)
 */
export const createMeeting = async (req, res) => {
  try {
    const {
      title,
      agenda = '',
      meetingType = 'site_progress',
      department = 'all',
      projectId,
      scheduledDate,
      startTime,
      endTime = '',
      durationMinutes = 45,
      locationType = 'site_office',
      locationDetails = 'Krishna Valley Site Operations Room',
      meetingLink = '',
      priority = 'medium',
      attendees = [],
    } = req.body;

    if (!title || !title.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Meeting title is required',
      });
    }

    if (!scheduledDate) {
      return res.status(400).json({
        success: false,
        message: 'Meeting scheduled date is required',
      });
    }

    if (!startTime || !startTime.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Meeting start time is required',
      });
    }

    // Process and sanitize attendees
    const formattedAttendees = [];
    if (Array.isArray(attendees)) {
      for (const att of attendees) {
        if (!att) continue;
        if (typeof att === 'string') {
          // Passed user ID
          const u = await User.findById(att).select('firstName lastName username email department role');
          if (u) {
            formattedAttendees.push({
              user: u._id,
              name: `${u.firstName || ''} ${u.lastName || ''}`.trim() || u.username,
              role: u.role || 'member',
              department: u.department || 'general',
              email: u.email || '',
              attendanceStatus: 'invited',
            });
          }
        } else if (att.user || att.name) {
          formattedAttendees.push({
            user: att.user || null,
            name: att.name || 'Attendee',
            role: att.role || 'member',
            department: att.department || 'general',
            email: att.email || '',
            phone: att.phone || '',
            attendanceStatus: att.attendanceStatus || 'invited',
          });
        }
      }
    }

    const organizerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

    const newMeeting = new TaskforceMeeting({
      title: title.trim(),
      agenda: agenda.trim(),
      meetingType,
      department,
      projectId: projectId || null,
      scheduledDate: new Date(scheduledDate),
      startTime: startTime.trim(),
      endTime: endTime.trim(),
      durationMinutes: Number(durationMinutes) || 45,
      locationType,
      locationDetails: locationDetails.trim(),
      meetingLink: meetingLink.trim(),
      priority,
      organizer: req.user.id,
      organizerName,
      attendees: formattedAttendees,
      status: 'scheduled',
      mom: {
        momStatus: 'pending',
        keyDecisions: [],
        actionItems: [],
        attachments: [],
      },
      auditTrail: [
        {
          action: 'MEETING_SCHEDULED',
          performedBy: req.user.id,
          performedByName: organizerName,
          timestamp: new Date(),
          notes: `Meeting scheduled for ${new Date(scheduledDate).toLocaleDateString()} at ${startTime}`,
        },
      ],
    });

    await newMeeting.save();

    // Send targeted in-app notifications strictly to attendees
    try {
      const dateStr = new Date(scheduledDate).toLocaleDateString('en-IN', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });

      for (const att of formattedAttendees) {
        if (att.user && att.user.toString() !== req.user.id.toString()) {
          await NotificationLog.create({
            channel: 'push',
            recipient: att.user.toString(),
            recipientName: att.name || 'Team Member',
            templateCode: 'TASKFORCE_MEETING_SCHEDULED',
            subject: `Meeting Scheduled: ${newMeeting.title}`,
            contentPreview: `Meeting "${newMeeting.title}" (${newMeeting.meetingCode}) scheduled on ${dateStr} at ${startTime}. Venue: ${locationDetails}`,
            status: 'delivered',
            metadata: {
              meetingId: newMeeting._id,
              meetingCode: newMeeting.meetingCode,
              scheduledDate: newMeeting.scheduledDate,
              startTime: newMeeting.startTime,
              locationDetails: newMeeting.locationDetails,
              organizerName,
              type: 'meeting_invite',
            },
          });
        }
      }
    } catch (notifErr) {
      console.warn('Meeting invite notification log error (non-blocking):', notifErr);
    }

    return res.status(201).json({
      success: true,
      message: 'Meeting scheduled successfully',
      data: newMeeting,
    });
  } catch (error) {
    console.error('Error creating meeting:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to schedule meeting',
      error: error.message,
    });
  }
};

/**
 * @desc   Update meeting details
 * @route  PUT /api/taskforce-meetings/:id
 * @access Authenticated (tasks:manage, tasks:edit)
 */
export const updateMeeting = async (req, res) => {
  try {
    const meeting = await TaskforceMeeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    const {
      title,
      agenda,
      meetingType,
      department,
      projectId,
      scheduledDate,
      startTime,
      endTime,
      durationMinutes,
      locationType,
      locationDetails,
      meetingLink,
      priority,
      status,
      attendees,
    } = req.body;

    if (title !== undefined) meeting.title = title.trim();
    if (agenda !== undefined) meeting.agenda = agenda.trim();
    if (meetingType !== undefined) meeting.meetingType = meetingType;
    if (department !== undefined) meeting.department = department;
    if (projectId !== undefined) meeting.projectId = projectId || null;
    if (scheduledDate !== undefined) meeting.scheduledDate = new Date(scheduledDate);
    if (startTime !== undefined) meeting.startTime = startTime.trim();
    if (endTime !== undefined) meeting.endTime = endTime.trim();
    if (durationMinutes !== undefined) meeting.durationMinutes = Number(durationMinutes);
    if (locationType !== undefined) meeting.locationType = locationType;
    if (locationDetails !== undefined) meeting.locationDetails = locationDetails.trim();
    if (meetingLink !== undefined) meeting.meetingLink = meetingLink.trim();
    if (priority !== undefined) meeting.priority = priority;
    if (status !== undefined) meeting.status = status;

    if (Array.isArray(attendees)) {
      meeting.attendees = attendees;
    }

    const performerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;
    meeting.auditTrail.push({
      action: 'MEETING_UPDATED',
      performedBy: req.user.id,
      performedByName: performerName,
      timestamp: new Date(),
      notes: `Updated meeting details / status changed to ${meeting.status}`,
    });

    await meeting.save();

    // Send update notification to attendees
    try {
      const dateStr = meeting.scheduledDate
        ? new Date(meeting.scheduledDate).toLocaleDateString('en-IN', {
            weekday: 'short',
            month: 'short',
            day: 'numeric',
          })
        : '';

      if (Array.isArray(meeting.attendees)) {
        for (const att of meeting.attendees) {
          const attUserId = att.user?._id || att.user;
          if (attUserId && attUserId.toString() !== req.user.id.toString()) {
            await NotificationLog.create({
              channel: 'push',
              recipient: attUserId.toString(),
              recipientName: att.name || 'Team Member',
              templateCode: 'TASKFORCE_MEETING_UPDATED',
              subject: `Meeting Updated: ${meeting.title}`,
              contentPreview: `Meeting "${meeting.title}" (${meeting.meetingCode}) has been updated. Date: ${dateStr} at ${meeting.startTime}. Venue: ${meeting.locationDetails || 'Site Office'}`,
              status: 'delivered',
              metadata: {
                meetingId: meeting._id,
                meetingCode: meeting.meetingCode,
                scheduledDate: meeting.scheduledDate,
                startTime: meeting.startTime,
                locationDetails: meeting.locationDetails,
                type: 'meeting_update',
              },
            });
          }
        }
      }
    } catch (notifErr) {
      console.warn('Meeting update notification error (non-blocking):', notifErr);
    }

    return res.json({
      success: true,
      message: 'Meeting updated successfully',
      data: meeting,
    });
  } catch (error) {
    console.error('Error updating meeting:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update meeting',
      error: error.message,
    });
  }
};

/**
 * @desc   Delete / Cancel Meeting
 * @route  DELETE /api/taskforce-meetings/:id
 * @access Authenticated (tasks:manage)
 */
export const deleteMeeting = async (req, res) => {
  try {
    const meeting = await TaskforceMeeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    await TaskforceMeeting.findByIdAndDelete(req.params.id);

    return res.json({
      success: true,
      message: 'Meeting deleted successfully',
    });
  } catch (error) {
    console.error('Error deleting meeting:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete meeting',
      error: error.message,
    });
  }
};

/**
 * @desc   Record / Update MoM (Minutes of Meeting)
 * @route  PUT /api/taskforce-meetings/:id/mom
 * @access Authenticated (tasks:manage, tasks:create)
 */
export const saveMoM = async (req, res) => {
  try {
    const meeting = await TaskforceMeeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    const {
      momStatus = 'draft',
      discussionSummary = '',
      keyDecisions = [],
      generalNotes = '',
      actionItems = [],
      attendeeAttendance = [], // [{ attendeeId, status }]
      attachments = [],
    } = req.body;

    const performerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

    if (!meeting.mom) {
      meeting.mom = { momStatus: 'draft', actionItems: [], keyDecisions: [], attachments: [] };
    }

    meeting.mom.discussionSummary = discussionSummary;
    meeting.mom.generalNotes = generalNotes;

    // Filter and sanitize key decisions
    if (Array.isArray(keyDecisions)) {
      meeting.mom.keyDecisions = keyDecisions.map((d) => (typeof d === 'string' ? d.trim() : '')).filter(Boolean);
    }

    // Update Action Items while preserving any existing task linkages
    if (Array.isArray(actionItems)) {
      const existingLinkedTasks = new Map();
      if (meeting.mom.actionItems?.length) {
        meeting.mom.actionItems.forEach((item) => {
          if (item._id && item.linkedTaskId) {
            existingLinkedTasks.set(item._id.toString(), {
              linkedTaskId: item.linkedTaskId,
              linkedTaskCode: item.linkedTaskCode,
              status: item.status,
            });
          }
        });
      }

      meeting.mom.actionItems = actionItems.map((item, idx) => {
        const itemId = item._id ? item._id.toString() : null;
        const preserved = itemId ? existingLinkedTasks.get(itemId) : null;
        const code = item.actionItemCode || `ACT-${meeting.meetingCode || 'MTG'}-${idx + 1}`;

        return {
          _id: item._id || undefined,
          actionItemCode: code,
          title: (item.title || '').trim(),
          description: (item.description || '').trim(),
          assignedTo: item.assignedTo || null,
          assignedToName: item.assignedToName || '',
          department: item.department || meeting.department || 'civil',
          dueDate: item.dueDate ? new Date(item.dueDate) : undefined,
          priority: item.priority || 'medium',
          status: preserved?.status || item.status || 'pending',
          linkedTaskId: preserved?.linkedTaskId || item.linkedTaskId || null,
          linkedTaskCode: preserved?.linkedTaskCode || item.linkedTaskCode || '',
        };
      }).filter((item) => item.title);
    }

    // Update Attendee attendance statuses if provided
    if (Array.isArray(attendeeAttendance) && attendeeAttendance.length) {
      const attendanceMap = new Map();
      attendeeAttendance.forEach((att) => {
        if (att.id || att._id) {
          attendanceMap.set((att.id || att._id).toString(), att.status || att.attendanceStatus);
        }
      });

      meeting.attendees.forEach((att) => {
        const attId = att._id ? att._id.toString() : null;
        if (attId && attendanceMap.has(attId)) {
          att.attendanceStatus = attendanceMap.get(attId);
        }
      });
    }

    if (Array.isArray(attachments)) {
      meeting.mom.attachments = attachments;
    }

    // MoM Recording Info
    meeting.mom.recordedBy = req.user.id;
    meeting.mom.recordedByName = performerName;

    // Status transition
    const previousStatus = meeting.mom.momStatus;
    meeting.mom.momStatus = momStatus;

    if (momStatus === 'published' && previousStatus !== 'published') {
      meeting.mom.publishedAt = new Date();
    }

    // If meeting was scheduled or in_progress, automatically set to completed once MoM is draft/published
    if (meeting.status === 'scheduled' || meeting.status === 'in_progress') {
      meeting.status = 'completed';
    }

    meeting.auditTrail.push({
      action: momStatus === 'published' ? 'MOM_PUBLISHED' : 'MOM_SAVED',
      performedBy: req.user.id,
      performedByName: performerName,
      timestamp: new Date(),
      notes: `MoM status saved as ${momStatus} with ${meeting.mom.actionItems.length} action item(s)`,
    });

    await meeting.save();

    const populated = await TaskforceMeeting.findById(meeting._id)
      .populate('organizer', 'firstName lastName username email role department')
      .populate('attendees.user', 'firstName lastName username email department')
      .populate('mom.recordedBy', 'firstName lastName username email role')
      .populate('mom.approvedBy', 'firstName lastName username email role')
      .populate('mom.actionItems.assignedTo', 'firstName lastName username email department')
      .populate('mom.actionItems.linkedTaskId', 'taskCode title status priority dueDate')
      .lean();

    return res.json({
      success: true,
      message: momStatus === 'published' ? 'MoM published successfully' : 'MoM saved successfully',
      data: populated,
    });
  } catch (error) {
    console.error('Error saving MoM:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to record Minutes of Meeting',
      error: error.message,
    });
  }
};

/**
 * @desc   Convert a specific MoM action item into a real Taskforce Task
 * @route  POST /api/taskforce-meetings/:id/convert-action-item
 * @access Authenticated (tasks:create, tasks:manage)
 */
export const convertActionItemToTask = async (req, res) => {
  try {
    const { actionItemId } = req.body;
    if (!actionItemId) {
      return res.status(400).json({
        success: false,
        message: 'Action item ID is required',
      });
    }

    const meeting = await TaskforceMeeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    if (!meeting.mom || !meeting.mom.actionItems?.length) {
      return res.status(400).json({
        success: false,
        message: 'No action items found in this meeting',
      });
    }

    const actionItem = meeting.mom.actionItems.id(actionItemId);
    if (!actionItem) {
      return res.status(404).json({
        success: false,
        message: 'Action item not found in meeting',
      });
    }

    // Check if already converted
    if (actionItem.linkedTaskId) {
      const existingTask = await Task.findById(actionItem.linkedTaskId);
      if (existingTask) {
        return res.json({
          success: true,
          message: 'Action item is already converted to task',
          task: existingTask,
          actionItem,
        });
      }
    }

    // Prepare Task Description & Linkage
    const taskTitle = `[MoM: ${meeting.meetingCode}] ${actionItem.title}`;
    const taskDescription = [
      actionItem.description || '',
      '',
      '--- TASKFORCE MEETING ORIGIN ---',
      `Meeting Code: ${meeting.meetingCode}`,
      `Meeting Title: ${meeting.title}`,
      `Meeting Date: ${new Date(meeting.scheduledDate).toLocaleDateString()}`,
      `Action Item Code: ${actionItem.actionItemCode || 'ACT-001'}`,
      `Organizer: ${meeting.organizerName || 'Executive Desk'}`,
      meeting.mom.discussionSummary ? `Summary Context: ${meeting.mom.discussionSummary.slice(0, 300)}...` : '',
    ].filter(Boolean).join('\n');

    const defaultDueDate = actionItem.dueDate || new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const assignedUserIds = actionItem.assignedTo ? [actionItem.assignedTo] : [];

    const newTask = new Task({
      title: taskTitle,
      description: taskDescription,
      department: actionItem.department || (meeting.department !== 'all' ? meeting.department : 'civil'),
      priority: actionItem.priority || meeting.priority || 'medium',
      status: 'pending',
      assignedBy: req.user.id,
      assignedTo: assignedUserIds,
      startDate: new Date(),
      dueDate: defaultDueDate,
      isMDDirective: meeting.meetingType === 'executive_review',
      tags: ['meeting_action_item', meeting.meetingCode, 'taskforce'],
      followUpSchedule: {
        nextFollowUpDate: defaultDueDate,
        frequency: 'daily',
        followUpCount: 0,
      },
      auditTrail: [
        {
          action: 'CREATED_FROM_MOM_ACTION_ITEM',
          performedBy: req.user.id,
          details: `Directly generated from MoM Action Item (${actionItem.actionItemCode || 'ACT-001'}) in Meeting ${meeting.meetingCode}`,
          timestamp: new Date(),
        },
      ],
    });

    await newTask.save();

    // Update Action item with linked task
    actionItem.linkedTaskId = newTask._id;
    actionItem.linkedTaskCode = newTask.taskCode;
    actionItem.status = 'converted_to_task';

    const performerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;
    meeting.auditTrail.push({
      action: 'ACTION_ITEM_CONVERTED_TO_TASK',
      performedBy: req.user.id,
      performedByName: performerName,
      timestamp: new Date(),
      notes: `Action item "${actionItem.title}" converted to Task ${newTask.taskCode}`,
    });

    await meeting.save();

    return res.status(201).json({
      success: true,
      message: `Action item converted to Task ${newTask.taskCode}`,
      task: newTask,
      actionItem,
    });
  } catch (error) {
    console.error('Error converting action item to task:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to convert action item to task',
      error: error.message,
    });
  }
};

/**
 * @desc   Executive Sign-off / Approval for MoM
 * @route  POST /api/taskforce-meetings/:id/approve-mom
 * @access Authenticated (tasks:manage, admin, executive)
 */
export const approveMoM = async (req, res) => {
  try {
    const meeting = await TaskforceMeeting.findById(req.params.id);
    if (!meeting) {
      return res.status(404).json({
        success: false,
        message: 'Meeting not found',
      });
    }

    if (!meeting.mom || meeting.mom.momStatus === 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Cannot approve MoM because no minutes have been recorded or published yet',
      });
    }

    const { remarks = 'Approved by Executive Authority' } = req.body;
    const performerName = `${req.user.firstName || ''} ${req.user.lastName || ''}`.trim() || req.user.username;

    meeting.mom.momStatus = 'approved';
    meeting.mom.approvedBy = req.user.id;
    meeting.mom.approvedByName = performerName;
    meeting.mom.approvedAt = new Date();
    meeting.mom.approvalRemarks = remarks;

    meeting.auditTrail.push({
      action: 'MOM_APPROVED',
      performedBy: req.user.id,
      performedByName: performerName,
      timestamp: new Date(),
      notes: `MoM officially approved. Remarks: ${remarks}`,
    });

    await meeting.save();

    return res.json({
      success: true,
      message: 'MoM officially approved and signed off',
      data: meeting,
    });
  } catch (error) {
    console.error('Error approving MoM:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to approve Minutes of Meeting',
      error: error.message,
    });
  }
};
