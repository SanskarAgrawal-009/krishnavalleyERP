import NotificationConfig from '../models/NotificationConfig.js';
import NotificationLog from '../models/NotificationLog.js';

/**
 * Clean phone number to E.164 without leading plus for WhatsApp Graph API (e.g. 919876543210)
 */
export const sanitizeWhatsAppPhone = (phone) => {
  if (!phone) return '';
  let cleaned = String(phone).replace(/[^0-9]/g, '');
  // Default to India (+91) if 10-digit standard Indian mobile
  if (cleaned.length === 10) {
    cleaned = '91' + cleaned;
  }
  return cleaned;
};

/**
 * Generate standard WhatsApp Web / WhatsApp Desktop Click-to-Chat deep link
 */
export const generateWhatsAppWebUrl = (phone, text = '') => {
  const clean = sanitizeWhatsAppPhone(phone);
  const encoded = encodeURIComponent(text);
  return `https://wa.me/${clean}?text=${encoded}`;
};

/**
 * Resolve WhatsApp configuration from database or env
 */
export const resolveWhatsAppConfig = async (overrideConfig = null) => {
  let dbCfg = null;
  try {
    const configDoc = await NotificationConfig.findOne();
    if (configDoc && configDoc.whatsapp) {
      dbCfg = configDoc.whatsapp;
    }
  } catch (err) {
    console.warn('Could not read WhatsApp config from DB, using defaults:', err.message);
  }

  const cfg = overrideConfig || dbCfg || {};

  return {
    enabled: cfg.enabled !== undefined ? Boolean(cfg.enabled) : true,
    provider: cfg.provider || 'meta_cloud',
    apiKey: cfg.apiKey || process.env.META_WA_ACCESS_TOKEN || '',
    phoneNumberId: cfg.phoneNumberId || process.env.META_WA_PHONE_NUMBER_ID || '',
    businessAccountId: cfg.businessAccountId || process.env.META_WA_WABA_ID || '',
    senderNumber: cfg.senderNumber || process.env.META_WA_SENDER_NUMBER || '+91 98765 43210',
    webhookVerifyToken: cfg.webhookVerifyToken || process.env.META_WA_WEBHOOK_TOKEN || 'kv_whatsapp_secret_token',
    defaultLanguage: cfg.defaultLanguage || 'en_US',
    environment: cfg.environment || process.env.NODE_ENV || 'sandbox',
    twilioAccountSid: cfg.twilioAccountSid || process.env.TWILIO_ACCOUNT_SID || '',
    twilioAuthToken: cfg.twilioAuthToken || process.env.TWILIO_AUTH_TOKEN || '',
    twilioFromNumber: cfg.twilioFromNumber || process.env.TWILIO_WA_NUMBER || ''
  };
};

/**
 * Send WhatsApp notification via Meta Cloud API, Twilio, or Click-to-Chat fallback
 */
export const sendWhatsApp = async ({
  to,
  text,
  headerText,
  buttonText,
  buttonUrl,
  templateName,
  variables = {},
  mediaUrl = null,
  isTest = false,
  customConfig = null
}) => {
  const cfg = await resolveWhatsAppConfig(customConfig);

  if (!cfg.enabled && !isTest) {
    throw new Error('WhatsApp messaging is currently disabled in system settings.');
  }

  const cleanPhone = sanitizeWhatsAppPhone(to);
  if (!cleanPhone) {
    throw new Error('Valid recipient phone number is required for WhatsApp dispatch.');
  }

  const clickToChatUrl = generateWhatsAppWebUrl(cleanPhone, text);

  const logEntry = {
    channel: 'whatsapp',
    recipient: to,
    recipientName: variables.client_name || 'WhatsApp Client',
    templateCode: templateName || 'WHATSAPP_MESSAGE',
    subject: headerText || 'WhatsApp Notification',
    contentPreview: text ? text.substring(0, 180) + '...' : 'WhatsApp Document/Media',
    provider: cfg.provider,
    status: 'sent',
    responseDetails: {
      provider: cfg.provider,
      senderNumber: cfg.senderNumber,
      environment: cfg.environment,
      clickToChatUrl,
      timestamp: new Date().toISOString()
    }
  };

  // Case 1: Meta Cloud API (Official WhatsApp Business Graph API)
  if (cfg.provider === 'meta_cloud' && cfg.apiKey && cfg.phoneNumberId) {
    try {
      const graphUrl = `https://graph.facebook.com/v21.0/${cfg.phoneNumberId}/messages`;
      
      let payload;
      if (templateName && templateName !== 'WHATSAPP_MESSAGE' && templateName !== 'DIRECT_WHATSAPP') {
        // Meta Template Dispatch
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'template',
          template: {
            name: templateName.toLowerCase(),
            language: { code: cfg.defaultLanguage || 'en_US' },
            components: []
          }
        };
      } else {
        // Direct Text Dispatch
        payload = {
          messaging_product: 'whatsapp',
          recipient_type: 'individual',
          to: cleanPhone,
          type: 'text',
          text: {
            preview_url: true,
            body: text
          }
        };
      }

      const res = await fetch(graphUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error?.message || `Meta Cloud API responded with status ${res.status}`);
      }

      const messageId = data.messages?.[0]?.id || `wamid_${Date.now()}`;
      logEntry.status = 'delivered';
      logEntry.responseDetails.messageId = messageId;
      logEntry.responseDetails.metaResponse = data;
      const savedLog = await NotificationLog.create(logEntry);

      return {
        success: true,
        channel: 'whatsapp',
        provider: 'meta_cloud',
        messageId,
        status: 'delivered',
        recipient: cleanPhone,
        clickToChatUrl,
        logId: savedLog._id
      };
    } catch (error) {
      logEntry.status = 'failed';
      logEntry.errorMessage = error.message;
      logEntry.responseDetails.error = error.message;
      await NotificationLog.create(logEntry);
      throw error;
    }
  }

  // Case 2: Twilio WhatsApp API
  if (cfg.provider === 'twilio' && cfg.twilioAccountSid && cfg.twilioAuthToken) {
    try {
      const fromNumber = cfg.twilioFromNumber.startsWith('whatsapp:')
        ? cfg.twilioFromNumber
        : `whatsapp:${cfg.twilioFromNumber}`;
      const toNumber = `whatsapp:+${cleanPhone}`;

      const twilioUrl = `https://api.twilio.com/2010-04-01/Accounts/${cfg.twilioAccountSid}/Messages.json`;
      const formParams = new URLSearchParams();
      formParams.append('From', fromNumber);
      formParams.append('To', toNumber);
      formParams.append('Body', text);
      if (mediaUrl) formParams.append('MediaUrl', mediaUrl);

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
        throw new Error(data.message || `Twilio responded with error code ${data.code}`);
      }

      logEntry.status = 'delivered';
      logEntry.responseDetails.messageId = data.sid;
      logEntry.responseDetails.twilioResponse = data;
      const savedLog = await NotificationLog.create(logEntry);

      return {
        success: true,
        channel: 'whatsapp',
        provider: 'twilio',
        messageId: data.sid,
        status: 'delivered',
        recipient: cleanPhone,
        clickToChatUrl,
        logId: savedLog._id
      };
    } catch (error) {
      logEntry.status = 'failed';
      logEntry.errorMessage = error.message;
      await NotificationLog.create(logEntry);
      throw error;
    }
  }

  // Case 3: Sandbox Simulation & Click-to-Chat Generation
  const simMessageId = `wamid_sim_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  logEntry.status = 'delivered';
  logEntry.responseDetails.messageId = simMessageId;
  logEntry.responseDetails.simulated = true;
  logEntry.responseDetails.note = 'Dispatched in sandbox mode. Click-to-Chat deep link generated.';
  const savedLog = await NotificationLog.create(logEntry);

  return {
    success: true,
    simulated: true,
    channel: 'whatsapp',
    provider: cfg.provider,
    messageId: simMessageId,
    status: 'delivered',
    recipient: cleanPhone,
    clickToChatUrl,
    preview: text,
    note: 'Message prepared in sandbox mode. Direct WhatsApp link provided.',
    logId: savedLog._id
  };
};

/**
 * Handle Meta WhatsApp Webhook Challenge verification
 */
export const verifyMetaWebhook = (query, expectedToken) => {
  const mode = query['hub.mode'];
  const token = query['hub.verify_token'];
  const challenge = query['hub.challenge'];

  if (mode === 'subscribe' && token === expectedToken) {
    return { verified: true, challenge };
  }
  return { verified: false };
};

/**
 * Inbound status update from Meta WhatsApp Webhook
 */
export const handleMetaStatusWebhook = async (body) => {
  try {
    const entry = body.entry?.[0];
    const changes = entry?.changes?.[0];
    const value = changes?.value;
    const statuses = value?.statuses;

    if (statuses && Array.isArray(statuses)) {
      for (const item of statuses) {
        const wamid = item.id;
        const status = item.status; // sent, delivered, read, failed

        if (wamid) {
          const mappedStatus = status === 'failed' ? 'failed' : 'delivered';
          await NotificationLog.findOneAndUpdate(
            { 'responseDetails.messageId': wamid },
            {
              status: mappedStatus,
              $set: {
                'responseDetails.deliveryStatus': status,
                'responseDetails.statusTimestamp': item.timestamp
              }
            }
          );
        }
      }
    }
    return { success: true };
  } catch (err) {
    console.error('Error handling Meta WhatsApp webhook status:', err);
    return { success: false, error: err.message };
  }
};

export default {
  sanitizeWhatsAppPhone,
  generateWhatsAppWebUrl,
  resolveWhatsAppConfig,
  sendWhatsApp,
  verifyMetaWebhook,
  handleMetaStatusWebhook
};
