import CallLog from '../models/CallLog.js';
import NotificationConfig from '../models/NotificationConfig.js';
import {
  initiateCall,
  logCallInteraction,
  handleTelephonyWebhook,
  resolveTelephonyConfig
} from '../services/callingService.js';
import { escapeRegex } from '../utils/regexUtil.js';

/**
 * @desc   Initiate an Outbound Call via Calling API / In-App Softphone
 * @route  POST /api/calls/initiate
 * @access Private (Agent / Admin)
 */
export const initiateOutboundCall = async (req, res) => {
  try {
    const { leadPhone, agentPhone, clientName, leadId, customerId, notes } = req.body;

    if (!leadPhone) {
      return res.status(400).json({ success: false, message: 'Recipient phone number is required.' });
    }

    const callerAgentPhone = agentPhone || req.user?.mobileNo || '+91 98765 43210';
    const callerAgentId = req.user?._id || req.user?.id || null;

    const result = await initiateCall({
      leadPhone,
      agentPhone: callerAgentPhone,
      clientName: clientName || 'Lead Contact',
      leadId,
      customerId,
      agentId: callerAgentId,
      notes
    });

    return res.json({
      success: true,
      message: result.message || 'Call initiated successfully',
      data: result
    });
  } catch (error) {
    console.error('Error initiating outbound call:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Log Call Outcome & Notes after a call session
 * @route  POST /api/calls/log
 * @access Private (Agent / Admin)
 */
export const logCall = async (req, res) => {
  try {
    const {
      callLogId,
      leadId,
      customerId,
      clientName,
      clientPhone,
      durationSeconds,
      outcome,
      notes,
      callStatus,
      recordingUrl
    } = req.body;

    const agentId = req.user?._id || req.user?.id || null;

    const result = await logCallInteraction({
      callLogId,
      leadId,
      customerId,
      agentId,
      clientName,
      clientPhone,
      durationSeconds,
      outcome,
      notes,
      callStatus,
      recordingUrl
    });

    return res.json({
      success: true,
      message: result.message,
      data: result.callLog
    });
  } catch (error) {
    console.error('Error logging call interaction:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Get Call History & Logs
 * @route  GET /api/calls/logs
 * @access Private (Admin / Agent)
 */
export const getCallHistory = async (req, res) => {
  try {
    const { leadId, customerId, agentId, status, outcome, search, limit = 50, page = 1 } = req.query;
    const filter = {};

    if (leadId) filter.leadId = leadId;
    if (customerId) filter.customerId = customerId;
    if (agentId) filter.agentId = agentId;
    if (status && status !== 'all') filter.callStatus = status;
    if (outcome && outcome !== 'all') filter.outcome = outcome;

    if (search) {
      const regex = new RegExp(escapeRegex(search), 'i');
      filter.$or = [
        { clientName: regex },
        { clientPhone: regex },
        { notes: regex }
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const [logs, total] = await Promise.all([
      CallLog.find(filter)
        .populate('agentId', 'username firstName lastName')
        .populate('leadId', 'name mobileNo requirement')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(Number(limit)),
      CallLog.countDocuments(filter)
    ]);

    const summary = {
      totalCalls: await CallLog.countDocuments(),
      completed: await CallLog.countDocuments({ callStatus: 'completed' }),
      interested: await CallLog.countDocuments({ outcome: { $in: ['interested_site_visit', 'interested_followup'] } }),
      missedOrBusy: await CallLog.countDocuments({ callStatus: { $in: ['busy', 'no_answer', 'failed'] } })
    };

    return res.json({
      success: true,
      count: logs.length,
      total,
      summary,
      data: logs
    });
  } catch (error) {
    console.error('Error fetching call logs:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Get Telephony Configuration
 * @route  GET /api/calls/config
 * @access Private (Admin)
 */
export const getTelephonyConfig = async (req, res) => {
  try {
    const config = await resolveTelephonyConfig();
    return res.json({ success: true, data: config });
  } catch (error) {
    console.error('Error fetching telephony config:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Update Telephony Configuration
 * @route  PUT /api/calls/config
 * @access Private (Admin)
 */
export const updateTelephonyConfig = async (req, res) => {
  try {
    const payload = req.body;
    let configDoc = await NotificationConfig.findOne();
    if (!configDoc) {
      configDoc = await NotificationConfig.create({ telephony: payload });
    } else {
      configDoc.telephony = { ...configDoc.telephony, ...payload };
      await configDoc.save();
    }

    return res.json({
      success: true,
      message: 'Telephony settings updated successfully',
      data: configDoc.telephony
    });
  } catch (error) {
    console.error('Error updating telephony config:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

/**
 * @desc   Public Webhook for Telephony Status (Twilio / Exotel Call Callbacks)
 * @route  POST /api/calls/webhook/status
 * @access Public Webhook
 */
export const handleWebhookStatus = async (req, res) => {
  try {
    const payload = req.body || req.query;
    await handleTelephonyWebhook(payload);
    return res.status(200).send('<Response></Response>');
  } catch (error) {
    console.error('Telephony status webhook error:', error);
    return res.status(200).send('<Response></Response>');
  }
};

/**
 * @desc   Public Webhook returning TwiML instructions for Twilio Voice calls
 * @route  POST /api/calls/webhook/twiml
 * @access Public Webhook
 */
export const handleTwiMLResponse = async (req, res) => {
  const to = req.query.to || req.body.To || '';
  const twiml = `<?xml version="1.0" encoding="UTF-8"?>
<Response>
  <Say voice="Polly.Aditi" language="en-IN">Thank you for connecting with Krishna Valley Real Estate ERP. Your call is being bridged.</Say>
  <Dial callerId="${req.body.From || '+91 98765 43210'}">${to}</Dial>
</Response>`;

  res.type('text/xml');
  return res.send(twiml);
};

export default {
  initOutboundCall: initiateOutboundCall,
  logCall,
  getCallHistory,
  getTelephonyConfig,
  updateTelephonyConfig,
  handleWebhookStatus,
  handleTwiMLResponse
};
