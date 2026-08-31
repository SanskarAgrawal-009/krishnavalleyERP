import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import NotificationConfig from '../models/NotificationConfig.js';
import NotificationLog from '../models/NotificationLog.js';

dotenv.config();

/**
 * Helper to retrieve active email configuration with fallback to environment variables
 */
export const resolveEmailConfig = async (overrideConfig = null) => {
  let dbEmailCfg = null;
  try {
    const configDoc = await NotificationConfig.findOne();
    if (configDoc && configDoc.email) {
      dbEmailCfg = configDoc.email;
    }
  } catch (err) {
    console.warn('Could not read NotificationConfig from DB, using fallback env:', err.message);
  }

  const cfg = overrideConfig || dbEmailCfg || {};

  const host = cfg.smtpHost || process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = Number(cfg.smtpPort || process.env.SMTP_PORT || 587);
  const secure = cfg.secure !== undefined ? Boolean(cfg.secure) : (port === 465);
  const user = cfg.smtpUser || process.env.SMTP_USER || process.env.EMAIL_USER || '';
  const pass = cfg.smtpPassword || process.env.SMTP_PASS || process.env.EMAIL_PASS || '';
  const fromEmail = cfg.fromEmail || process.env.SMTP_FROM || process.env.COMPANY_EMAIL || 'notifications@krishnavalley.com';
  const fromName = cfg.fromName || process.env.SMTP_FROM_NAME || 'Krishna Valley Real Estate ERP';
  const replyTo = cfg.replyTo || process.env.SMTP_REPLY_TO || fromEmail;
  const environment = cfg.environment || process.env.NODE_ENV || 'sandbox';
  const provider = cfg.provider || 'smtp';
  const enabled = cfg.enabled !== undefined ? Boolean(cfg.enabled) : true;

  return {
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    fromEmail,
    fromName,
    replyTo,
    environment,
    provider,
    enabled
  };
};

/**
 * Create a nodemailer transporter instance based on resolved configuration
 */
export const createSmtpTransporter = (resolvedConfig) => {
  const transportOptions = {
    host: resolvedConfig.host,
    port: resolvedConfig.port,
    secure: resolvedConfig.secure,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    tls: {
      rejectUnauthorized: resolvedConfig.environment === 'production'
    }
  };

  if (resolvedConfig.auth && resolvedConfig.auth.user) {
    transportOptions.auth = resolvedConfig.auth;
  }

  return nodemailer.createTransport(transportOptions);
};

/**
 * Verify SMTP server connection and authentication
 */
export const verifySmtpConnection = async (overrideConfig = null) => {
  const resolved = await resolveEmailConfig(overrideConfig);
  const startTime = Date.now();

  if (!resolved.auth || !resolved.auth.user || !resolved.auth.pass) {
    return {
      success: false,
      message: 'SMTP credentials missing. Please provide username/email and password or app password.',
      details: {
        host: resolved.host,
        port: resolved.port,
        secure: resolved.secure,
        hasUser: Boolean(resolved.auth?.user),
        hasPassword: Boolean(resolved.auth?.pass)
      }
    };
  }

  try {
    const transporter = createSmtpTransporter(resolved);
    await transporter.verify();
    const latencyMs = Date.now() - startTime;

    return {
      success: true,
      message: `SMTP Connection verified successfully (${resolved.host}:${resolved.port})`,
      details: {
        host: resolved.host,
        port: resolved.port,
        secure: resolved.secure,
        user: resolved.auth.user,
        latencyMs,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (error) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      message: `SMTP Connection failed: ${error.message}`,
      details: {
        code: error.code || 'UNKNOWN_ERROR',
        command: error.command || null,
        response: error.response || null,
        host: resolved.host,
        port: resolved.port,
        latencyMs,
        verifiedAt: new Date().toISOString()
      }
    };
  }
};

/**
 * Wrap content in a modern, responsive Krishna Valley branded email template
 */
export const wrapInBrandedTemplate = ({ contentHtml, subject, preheader = '' }) => {
  if (contentHtml && contentHtml.includes('<!DOCTYPE html>')) {
    return contentHtml;
  }

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'Krishna Valley ERP'}</title>
  <style>
    body { margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f1f5f9; color: #1e293b; }
    .email-container { max-width: 620px; margin: 30px auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 16px rgba(0, 0, 0, 0.08); border: 1px solid #e2e8f0; }
    .email-header { background: linear-gradient(135deg, #0f766e 0%, #0d9488 100%); padding: 28px 32px; text-align: center; color: #ffffff; }
    .email-header h1 { margin: 0; font-size: 22px; font-weight: 800; letter-spacing: 0.5px; }
    .email-header p { margin: 6px 0 0 0; font-size: 13px; opacity: 0.9; }
    .email-body { padding: 32px; font-size: 15px; line-height: 1.6; color: #334155; }
    .email-footer { background: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px 32px; text-align: center; font-size: 12px; color: #64748b; }
    .email-footer a { color: #0d9488; text-decoration: none; font-weight: 600; }
    .preheader { display: none !important; visibility: hidden; opacity: 0; color: transparent; height: 0; width: 0; }
  </style>
</head>
<body>
  ${preheader ? `<span class="preheader">${preheader}</span>` : ''}
  <div class="email-container">
    <div class="email-header">
      <h1>KRISHNA VALLEY REAL ESTATE</h1>
      <p>Official Digital ERP Notification Service</p>
    </div>
    <div class="email-body">
      ${contentHtml}
    </div>
    <div class="email-footer">
      <p style="margin: 0 0 6px 0;"><strong>Krishna Valley Infrastructure & Developers Pvt. Ltd.</strong></p>
      <p style="margin: 0 0 6px 0;">Vrindavan Campus, NH-19, Mathura - Vrindavan, UP 281121</p>
      <p style="margin: 0;">This is an automated operational notification. For queries, contact <a href="mailto:support@krishnavalley.com">support@krishnavalley.com</a></p>
    </div>
  </div>
</body>
</html>
  `.trim();
};

/**
 * Dispatch real email via SMTP
 */
export const sendEmail = async ({
  to,
  subject,
  bodyHtml,
  text,
  attachments = [],
  variables = {},
  isTest = false,
  customConfig = null
}) => {
  const resolved = await resolveEmailConfig(customConfig);

  if (!resolved.enabled && !isTest) {
    throw new Error('Email notifications are currently disabled in system settings.');
  }

  const finalSubject = subject || 'Notification from Krishna Valley Real Estate';
  const finalHtml = wrapInBrandedTemplate({ contentHtml: bodyHtml || `<p>${text || ''}</p>`, subject: finalSubject });
  const plainText = text || (bodyHtml ? bodyHtml.replace(/<[^>]*>?/gm, '').trim() : '');

  const logEntry = {
    channel: 'email',
    recipient: to,
    recipientName: variables.client_name || 'Email Recipient',
    templateCode: 'EMAIL_DISPATCH',
    subject: finalSubject,
    contentPreview: plainText.substring(0, 180) + '...',
    provider: resolved.provider,
    status: 'sent',
    responseDetails: {
      from: `"${resolved.fromName}" <${resolved.fromEmail}>`,
      smtpHost: resolved.host,
      environment: resolved.environment,
      timestamp: new Date().toISOString()
    }
  };

  // If no auth credentials in sandbox mode, simulate gracefully
  if (!resolved.auth || !resolved.auth.user || !resolved.auth.pass) {
    if (resolved.environment === 'sandbox' || isTest) {
      const simMessageId = `sim_smtp_${Date.now()}@krishnavalley.com`;
      logEntry.status = 'delivered';
      logEntry.responseDetails.messageId = simMessageId;
      logEntry.responseDetails.simulated = true;
      logEntry.responseDetails.note = 'Dispatched in sandbox mode (no live SMTP credentials configured).';
      const savedLog = await NotificationLog.create(logEntry);

      return {
        success: true,
        simulated: true,
        channel: 'email',
        messageId: simMessageId,
        status: 'delivered',
        recipient: to,
        subject: finalSubject,
        note: 'Email simulated in sandbox. Configure live SMTP credentials to relay through mail server.',
        logId: savedLog._id
      };
    } else {
      throw new Error('SMTP credentials (username/password) are not configured for production email dispatch.');
    }
  }

  try {
    const transporter = createSmtpTransporter(resolved);
    const info = await transporter.sendMail({
      from: `"${resolved.fromName}" <${resolved.fromEmail}>`,
      to,
      replyTo: resolved.replyTo,
      subject: finalSubject,
      text: plainText,
      html: finalHtml,
      attachments
    });

    logEntry.status = 'delivered';
    logEntry.responseDetails.messageId = info.messageId;
    logEntry.responseDetails.response = info.response;
    const savedLog = await NotificationLog.create(logEntry);

    return {
      success: true,
      channel: 'email',
      messageId: info.messageId,
      status: 'delivered',
      recipient: to,
      subject: finalSubject,
      logId: savedLog._id
    };
  } catch (error) {
    logEntry.status = 'failed';
    logEntry.errorMessage = error.message;
    logEntry.responseDetails.error = error.stack || error.message;
    await NotificationLog.create(logEntry);
    throw error;
  }
};

export default {
  resolveEmailConfig,
  verifySmtpConnection,
  sendEmail,
  wrapInBrandedTemplate
};
