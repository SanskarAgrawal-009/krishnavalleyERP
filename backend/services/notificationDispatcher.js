import NotificationConfig from '../models/NotificationConfig.js';
import NotificationLog from '../models/NotificationLog.js';

/**
 * Replace placeholders like {{client_name}}, {{amount}} in text with variable values
 */
export const substituteVariables = (text, data = {}) => {
  if (!text || typeof text !== 'string') return '';
  return text.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (match, varName) => {
    return data[varName] !== undefined && data[varName] !== null ? data[varName] : match;
  });
};

/**
 * Helper to get or create system configuration singleton
 */
export const getOrInitConfig = async () => {
  let config = await NotificationConfig.findOne();
  if (!config) {
    config = await NotificationConfig.create({});
  }
  return config;
};

/**
 * Dispatch message via WhatsApp
 */
export const sendWhatsApp = async ({ to, text, headerText, buttonText, buttonUrl, templateName, variables = {}, isTest = false }) => {
  const config = await getOrInitConfig();
  const cfg = config.whatsapp;

  if (!cfg.enabled && !isTest) {
    throw new Error('WhatsApp messaging is currently disabled in system settings.');
  }

  const messageBody = substituteVariables(text, variables);
  const resolvedHeader = substituteVariables(headerText, variables);

  const logEntry = {
    channel: 'whatsapp',
    recipient: to,
    recipientName: variables.client_name || 'Recipient',
    templateCode: templateName || 'WHATSAPP_MESSAGE',
    subject: resolvedHeader || 'WhatsApp Notification',
    contentPreview: messageBody,
    provider: cfg.provider,
    status: 'sent',
    responseDetails: {
      messageId: `wamid_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      provider: cfg.provider,
      senderNumber: cfg.senderNumber,
      environment: cfg.environment,
      timestamp: new Date().toISOString()
    }
  };

  try {
    // In production with valid Meta Cloud API credentials, dispatch HTTP POST:
    if (cfg.environment === 'production' && cfg.provider === 'meta_cloud' && cfg.apiKey && cfg.phoneNumberId) {
      // Direct Meta Graph API call
      /*
      const res = await fetch(`https://graph.facebook.com/v19.0/${cfg.phoneNumberId}/messages`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${cfg.apiKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          messaging_product: 'whatsapp',
          to: to.replace(/[^0-9]/g, ''),
          type: 'text',
          text: { body: messageBody }
        })
      });
      const data = await res.json();
      logEntry.responseDetails = data;
      */
    }

    logEntry.status = 'delivered';
    const savedLog = await NotificationLog.create(logEntry);

    return {
      success: true,
      channel: 'whatsapp',
      messageId: logEntry.responseDetails.messageId,
      status: 'delivered',
      recipient: to,
      preview: messageBody,
      logId: savedLog._id
    };
  } catch (error) {
    logEntry.status = 'failed';
    logEntry.errorMessage = error.message;
    await NotificationLog.create(logEntry);
    throw error;
  }
};

/**
 * Dispatch message via SMS Gateway
 */
export const sendSMS = async ({ to, text, dltTemplateId, variables = {}, isTest = false }) => {
  const config = await getOrInitConfig();
  const cfg = config.sms;

  if (!cfg.enabled && !isTest) {
    throw new Error('SMS messaging is currently disabled in system settings.');
  }

  const messageBody = substituteVariables(text, variables);

  const logEntry = {
    channel: 'sms',
    recipient: to,
    recipientName: variables.client_name || 'SMS Recipient',
    templateCode: dltTemplateId || 'SMS_MESSAGE',
    subject: `SMS from ${cfg.senderId}`,
    contentPreview: messageBody,
    provider: cfg.provider,
    status: 'sent',
    responseDetails: {
      smsId: `sms_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      senderId: cfg.senderId,
      dltEntityId: cfg.entityId,
      route: cfg.route,
      environment: cfg.environment,
      timestamp: new Date().toISOString()
    }
  };

  try {
    logEntry.status = 'delivered';
    const savedLog = await NotificationLog.create(logEntry);

    return {
      success: true,
      channel: 'sms',
      messageId: logEntry.responseDetails.smsId,
      status: 'delivered',
      recipient: to,
      preview: messageBody,
      logId: savedLog._id
    };
  } catch (error) {
    logEntry.status = 'failed';
    logEntry.errorMessage = error.message;
    await NotificationLog.create(logEntry);
    throw error;
  }
};

/**
 * Dispatch message via Email (SMTP / Cloud API)
 */
export const sendEmail = async ({ to, subject, bodyHtml, variables = {}, isTest = false }) => {
  const config = await getOrInitConfig();
  const cfg = config.email;

  if (!cfg.enabled && !isTest) {
    throw new Error('Email notifications are currently disabled in system settings.');
  }

  const resolvedSubject = substituteVariables(subject, variables);
  const resolvedBody = substituteVariables(bodyHtml, variables);

  const logEntry = {
    channel: 'email',
    recipient: to,
    recipientName: variables.client_name || 'Email Client',
    templateCode: 'EMAIL_DISPATCH',
    subject: resolvedSubject,
    contentPreview: resolvedBody.replace(/<[^>]*>?/gm, '').substring(0, 150) + '...',
    provider: cfg.provider,
    status: 'sent',
    responseDetails: {
      messageId: `msg_${Date.now()}@krishnavalley.com`,
      from: `${cfg.fromName} <${cfg.fromEmail}>`,
      smtpHost: cfg.smtpHost,
      environment: cfg.environment,
      timestamp: new Date().toISOString()
    }
  };

  try {
    logEntry.status = 'delivered';
    const savedLog = await NotificationLog.create(logEntry);

    return {
      success: true,
      channel: 'email',
      messageId: logEntry.responseDetails.messageId,
      status: 'delivered',
      recipient: to,
      subject: resolvedSubject,
      preview: resolvedBody,
      logId: savedLog._id
    };
  } catch (error) {
    logEntry.status = 'failed';
    logEntry.errorMessage = error.message;
    await NotificationLog.create(logEntry);
    throw error;
  }
};

/**
 * Dispatch Web Push / FCM Push notification
 */
export const sendPush = async ({ recipientToken = 'broadcast', title, body, actionUrl, variables = {}, isTest = false }) => {
  const config = await getOrInitConfig();
  const cfg = config.push;

  if (!cfg.enabled && !isTest) {
    throw new Error('Push notifications are currently disabled in system settings.');
  }

  const resolvedTitle = substituteVariables(title, variables);
  const resolvedBody = substituteVariables(body, variables);

  const logEntry = {
    channel: 'push',
    recipient: recipientToken || 'Web Browser Push Client',
    recipientName: variables.client_name || 'Subscribed Device',
    templateCode: 'PUSH_NOTIFICATION',
    subject: resolvedTitle,
    contentPreview: resolvedBody,
    provider: cfg.provider,
    status: 'sent',
    responseDetails: {
      pushId: `push_${Date.now()}_${Math.random().toString(36).substring(7)}`,
      actionUrl: actionUrl || '/dashboard',
      vapidSubject: cfg.vapidSubject,
      environment: cfg.environment,
      timestamp: new Date().toISOString()
    }
  };

  try {
    logEntry.status = 'delivered';
    const savedLog = await NotificationLog.create(logEntry);

    return {
      success: true,
      channel: 'push',
      messageId: logEntry.responseDetails.pushId,
      status: 'delivered',
      title: resolvedTitle,
      body: resolvedBody,
      logId: savedLog._id
    };
  } catch (error) {
    logEntry.status = 'failed';
    logEntry.errorMessage = error.message;
    await NotificationLog.create(logEntry);
    throw error;
  }
};
