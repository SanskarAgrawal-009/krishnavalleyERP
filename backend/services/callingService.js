import NotificationConfig from '../models/NotificationConfig.js';
import CallLog from '../models/CallLog.js';
import Lead from '../models/Lead.js';

/**
 * Resolve active Telephony configuration
 */
export const resolveTelephonyConfig = async (overrideConfig = null) => {
  let dbCfg = null;
  try {
    const configDoc = await NotificationConfig.findOne();
    if (configDoc && configDoc.telephony) {
      dbCfg = configDoc.telephony;
    }
  } catch (err) {
    console.warn('Could not read Telephony config from DB, using defaults:', err.message);
  }

  const cfg = overrideConfig || dbCfg || {};

  return {
    enabled: cfg.enabled !== undefined ? Boolean(cfg.enabled) : true,
    provider: cfg.provider || 'browser_dialer',
    twilioAccountSid: cfg.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: cfg.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || '',
    twilioCallerId: cfg.twilioCallerId || process.env.TWILIO_CALLER_ID || '+91 98765 43210',
    exotelApiKey: cfg.exotelApiKey || process.env.EXOTEL_API_KEY || '',
    exotelApiToken: cfg.exotelApiToken || process.env.EXOTEL_API_TOKEN || '',
    exotelSubdomain: cfg.exotelSubdomain || process.env.EXOTEL_SUBDOMAIN || 'api.exotel.com',
    exotelCallerId: cfg.exotelCallerId || process.env.EXOTEL_CALLER_ID || '08088997766',
    recordCalls: Boolean(cfg.recordCalls),
    environment: cfg.environment || process.env.NODE_ENV || 'sandbox'
  };
};

/**
 * Clean phone number for dialing
 */
export const sanitizeDialPhone = (phone) => {
  if (!phone) return '';
  return String(phone).replace(/[^0-9+]/g, '');
};

/**
 * Initiate an Outbound Call (Twilio Voice, Exotel Click-to-Call, or In-App Softphone)
 */
export const initiateCall = async ({
  leadPhone,
  agentPhone = '+91 98765 43210',
  clientName = 'Client',
  leadId = null,
  customerId = null,
  agentId = null,
  notes = '',
  customConfig = null
}) => {
  const cfg = await resolveTelephonyConfig(customConfig);

  if (!cfg.enabled) {
    throw new Error('Telephony / Calling services are currently disabled in system settings.');
  }

  const cleanLeadPhone = sanitizeDialPhone(leadPhone);
  if (!cleanLeadPhone) {
    throw new Error('A valid destination phone number is required to place a call.');
  }

  // Resolve Lead automatically by ID or 10-digit mobile number match
  let resolvedLeadId = leadId;
  let resolvedClientName = clientName;

  if (!resolvedLeadId && cleanLeadPhone) {
    try {
      const tenDigits = cleanLeadPhone.replace(/[^0-9]/g, '').slice(-10);
      if (tenDigits.length >= 10) {
        const matched = await Lead.findOne({ mobileNo: { $regex: tenDigits } });
        if (matched) {
          resolvedLeadId = matched._id;
          if (!resolvedClientName || resolvedClientName === 'Client' || resolvedClientName === 'Lead Contact' || resolvedClientName === 'Prospective Buyer') {
            resolvedClientName = matched.name;
          }
        }
      }
    } catch (e) {
      console.warn('Lead lookup in initiateCall failed:', e.message);
    }
  }

  // Pre-create initial CallLog in DB
  const initialCallLog = await CallLog.create({
    leadId: resolvedLeadId,
    customerId,
    agentId,
    clientName: resolvedClientName,
    clientPhone: cleanLeadPhone,
    agentPhone: sanitizeDialPhone(agentPhone),
    direction: 'outbound',
    provider: cfg.provider,
    callStatus: 'in_progress',
    notes: notes || 'Call session initiated',
    metadata: {
      environment: cfg.environment,
      initiatedAt: new Date().toISOString()
    }
  });

  // Case 1: Twilio Voice API Integration
  if (cfg.provider === 'twilio' && cfg.twilioAccountSid && cfg.twilioAuthToken) {
    try {
      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${cfg.twilioAccountSid}/Calls.json`;
      const formParams = new URLSearchParams();
      formParams.append('From', cfg.twilioCallerId);
      formParams.append('To', cleanLeadPhone);

      // Return a basic TwiML greeting or bridge instruction
      const twiml = `<Response><Say voice="Polly.Aditi" language="en-IN">Hello ${resolvedClientName}, connecting you with your Krishna Valley Relationship Manager. Please hold.</Say><Dial record="${cfg.recordCalls ? 'record-from-answer' : 'do-not-record'}">${agentPhone}</Dial></Response>`;
      formParams.append('Twiml', twiml);

      if (cfg.recordCalls) {
        formParams.append('Record', 'true');
      }

      const authHeader = 'Basic ' + Buffer.from(`${cfg.twilioAccountSid}:${cfg.twilioAuthToken}`).toString('base64');
      const res = await fetch(twilioUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formParams.toString()
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || `Twilio call dispatch failed with code ${data.code}`);
      }

      initialCallLog.callSid = data.sid;
      initialCallLog.callStatus = 'ringing';
      initialCallLog.metadata.twilioResponse = data;
      await initialCallLog.save();

      return {
        success: true,
        provider: 'twilio',
        callSid: data.sid,
        status: 'ringing',
        callLogId: initialCallLog._id,
        message: `Call initiated via Twilio to ${cleanLeadPhone}`
      };
    } catch (error) {
      initialCallLog.callStatus = 'failed';
      initialCallLog.notes = `Twilio Error: ${error.message}`;
      await initialCallLog.save();
      throw error;
    }
  }

  // Case 2: Exotel Click-to-Call API
  if (cfg.provider === 'exotel' && cfg.exotelApiKey && cfg.exotelApiToken) {
    try {
      const exotelUrl = `https://${cfg.exotelSubdomain}/v1/Accounts/${cfg.exotelApiKey}/Calls/connect.json`;
      const formParams = new URLSearchParams();
      formParams.append('From', agentPhone);
      formParams.append('To', cleanLeadPhone);
      formParams.append('CallerId', cfg.exotelCallerId);

      const authHeader = 'Basic ' + Buffer.from(`${cfg.exotelApiKey}:${cfg.exotelApiToken}`).toString('base64');
      const res = await fetch(exotelUrl, {
        method: 'POST',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: formParams.toString()
      });

      const data = await res.json();
      const callSid = data?.Call?.Sid || `exo_${Date.now()}`;

      initialCallLog.callSid = callSid;
      initialCallLog.callStatus = 'ringing';
      initialCallLog.metadata.exotelResponse = data;
      await initialCallLog.save();

      return {
        success: true,
        provider: 'exotel',
        callSid,
        status: 'ringing',
        callLogId: initialCallLog._id,
        message: `Call bridged via Exotel between ${agentPhone} and ${cleanLeadPhone}`
      };
    } catch (error) {
      initialCallLog.callStatus = 'failed';
      initialCallLog.notes = `Exotel Error: ${error.message}`;
      await initialCallLog.save();
      throw error;
    }
  }

  // Case 3: In-App Softphone / Browser Dialer / Sandbox Simulation
  const simCallSid = `call_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  initialCallLog.callSid = simCallSid;
  initialCallLog.callStatus = 'in_progress';
  initialCallLog.metadata.simulated = true;
  initialCallLog.metadata.deviceDialUrl = `tel:${cleanLeadPhone}`;
  await initialCallLog.save();

  return {
    success: true,
    provider: cfg.provider,
    simulated: true,
    callSid: simCallSid,
    status: 'in_progress',
    callLogId: initialCallLog._id,
    deviceDialUrl: `tel:${cleanLeadPhone}`,
    message: `Softphone call session initiated for ${clientName} (${cleanLeadPhone})`
  };
};

/**
 * Log outcome, notes, and duration of a completed call session and sync to Lead interaction history
 */
export const logCallInteraction = async ({
  callLogId,
  leadId,
  customerId,
  agentId,
  clientName,
  clientPhone,
  durationSeconds = 0,
  outcome = 'general_discussion',
  notes = '',
  callStatus = 'completed',
  recordingUrl = null
}) => {
  let callRecord = null;

  if (callLogId) {
    callRecord = await CallLog.findById(callLogId);
  }

  if (!callRecord) {
    callRecord = new CallLog({
      leadId,
      customerId,
      agentId,
      clientName: clientName || 'Lead Contact',
      clientPhone: clientPhone || '+91 98765 43210',
      direction: 'outbound',
      provider: 'browser_dialer'
    });
  }

  callRecord.durationSeconds = Number(durationSeconds) || 0;
  callRecord.outcome = outcome;
  callRecord.notes = notes;
  callRecord.callStatus = callStatus;
  if (recordingUrl) callRecord.recordingUrl = recordingUrl;
  await callRecord.save();

  // If connected to a Lead (or matched by mobile phone), sync directly to Lead.followUps!
  let targetLeadId = leadId || callRecord.leadId;

  if (!targetLeadId && (clientPhone || callRecord.clientPhone)) {
    try {
      const tenDigits = (clientPhone || callRecord.clientPhone).replace(/[^0-9]/g, '').slice(-10);
      if (tenDigits.length >= 10) {
        const matched = await Lead.findOne({ mobileNo: { $regex: tenDigits } });
        if (matched) {
          targetLeadId = matched._id;
          callRecord.leadId = matched._id;
          if (!callRecord.clientName || callRecord.clientName === 'Client' || callRecord.clientName === 'Lead Contact' || callRecord.clientName === 'Prospective Buyer') {
            callRecord.clientName = matched.name;
          }
          await callRecord.save();
        }
      }
    } catch (e) {
      console.warn('Lead lookup in logCallInteraction failed:', e.message);
    }
  }

  if (targetLeadId) {
    try {
      const outcomeLabels = {
        interested: 'Interested - Milestone Progressing',
        interested_site_visit: 'Interested - Site Visit Requested',
        interested_followup: 'Interested - Follow-up Requested',
        not_interested: 'Not Interested',
        ringing_unanswered: 'Ringing - Unanswered',
        busy: 'Line Busy',
        not_reachable: 'Phone Not Reachable',
        wrong_number: 'Wrong Number',
        callback_requested: 'Callback Requested',
        general_discussion: 'General Inquiry Discussion',
        other: 'Other'
      };

      const outcomeText = outcomeLabels[outcome] || outcome;
      const formattedNotes = `[Call Dispatched • Duration: ${durationSeconds}s • Status: ${callStatus}] ${outcomeText}. Remarks: ${notes || 'No remarks entered.'}`;

      await Lead.findByIdAndUpdate(targetLeadId, {
        $push: {
          followUps: {
            date: new Date(),
            mode: 'call',
            notes: formattedNotes,
            status: 'completed'
          }
        }
      });
    } catch (err) {
      console.warn('Could not auto-append followUp to Lead:', err.message);
    }
  }

  return {
    success: true,
    callLog: callRecord,
    callLogId: callRecord._id,
    message: 'Call outcome and notes recorded successfully in CRM ledger.'
  };
};

/**
 * Handle incoming telephony status webhooks (Twilio / Exotel)
 */
export const handleTelephonyWebhook = async (payload) => {
  const callSid = payload.CallSid || payload.CallSid || payload.Call?.Sid;
  const callStatus = (payload.CallStatus || payload.Status || '').toLowerCase();
  const duration = Number(payload.CallDuration || payload.Duration) || 0;
  const recordingUrl = payload.RecordingUrl || null;

  if (callSid) {
    const updateFields = {};
    if (callStatus) updateFields.callStatus = callStatus;
    if (duration > 0) updateFields.durationSeconds = duration;
    if (recordingUrl) updateFields.recordingUrl = recordingUrl;
    updateFields['metadata.lastWebhookPayload'] = payload;

    await CallLog.findOneAndUpdate({ callSid }, updateFields);
  }

  return { success: true };
};

export const initiateOutboundCall = initiateCall;

export default {
  resolveTelephonyConfig,
  sanitizeDialPhone,
  initiateCall,
  initiateOutboundCall,
  logCallInteraction,
  handleTelephonyWebhook
};
