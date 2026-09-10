import nodemailer from 'nodemailer';
import { Resend } from 'resend';
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

  const dbData = dbEmailCfg ? (typeof dbEmailCfg.toObject === 'function' ? dbEmailCfg.toObject() : dbEmailCfg) : {};
  let mergedOverrides = {};
  if (overrideConfig && typeof overrideConfig === 'object') {
    for (const [key, value] of Object.entries(overrideConfig)) {
      if (value !== undefined && value !== null && value !== '') {
        mergedOverrides[key] = value;
      }
    }
  }
  const cfg = { ...dbData, ...mergedOverrides };

  const provider = cfg.provider || process.env.EMAIL_PROVIDER || (process.env.BREVO_API_KEY ? 'brevo' : (process.env.RESEND_API_KEY ? 'resend' : 'resend'));
  const apiKey = cfg.apiKey || (provider === 'brevo' ? (cfg.smtpPassword || process.env.BREVO_API_KEY || '') : (provider === 'resend' ? cfg.smtpPassword : '')) || (provider === 'brevo' ? process.env.BREVO_API_KEY : process.env.RESEND_API_KEY) || '';

  const defaultFrom = provider === 'brevo' 
    ? (cfg.smtpUser || process.env.BREVO_FROM || 'krishna.valley.tech@gmail.com')
    : (provider === 'resend' ? 'onboarding@resend.dev' : 'notifications@krishnavalley.com');
  const fromEmail = cfg.fromEmail || process.env.BREVO_FROM || process.env.RESEND_FROM || process.env.SMTP_FROM || process.env.COMPANY_EMAIL || defaultFrom;
  const fromName = cfg.fromName || process.env.BREVO_FROM_NAME || process.env.RESEND_FROM_NAME || process.env.SMTP_FROM_NAME || 'Krishna Valley ERP';
  const replyTo = cfg.replyTo || process.env.BREVO_REPLY_TO || process.env.RESEND_REPLY_TO || process.env.SMTP_REPLY_TO || 'support@krishnavalley.com';
  const environment = cfg.environment || process.env.NODE_ENV || 'sandbox';
  const enabled = cfg.enabled !== undefined ? Boolean(cfg.enabled) : true;

  // SMTP Settings (Brevo SMTP relay, Resend SMTP relay, or Custom SMTP)
  const defaultHost = provider === 'brevo' ? 'smtp-relay.brevo.com' : (provider === 'resend' ? 'smtp.resend.com' : 'smtp.gmail.com');
  const host = cfg.smtpHost || process.env.SMTP_HOST || defaultHost;
  const defaultPort = provider === 'brevo' ? 587 : (provider === 'resend' ? 465 : 587);
  const port = Number(cfg.smtpPort || process.env.SMTP_PORT || defaultPort);
  const secure = cfg.secure !== undefined ? Boolean(cfg.secure) : (port === 465);
  const defaultUser = provider === 'brevo' ? (cfg.smtpUser || process.env.BREVO_USER || 'b8cb49001@smtp-brevo.com') : (provider === 'resend' ? 'resend' : '');
  const user = cfg.smtpUser || process.env.SMTP_USER || defaultUser;
  const pass = cfg.smtpPassword || (provider === 'brevo' || provider === 'resend' ? apiKey : '') || process.env.SMTP_PASS || process.env.EMAIL_PASS || '';

  return {
    provider,
    apiKey,
    host,
    port,
    secure,
    auth: user && pass ? { user, pass } : undefined,
    fromEmail,
    fromName,
    replyTo,
    environment,
    enabled
  };
};

/**
 * Verify Resend API Key validity directly with the Resend API
 */
export const verifyResendConnection = async (apiKey) => {
  const key = (apiKey || process.env.RESEND_API_KEY || '').trim();
  if (!key) {
    return {
      success: false,
      message: 'Resend API Key is missing. Please provide your Resend API Key (starts with re_).',
      details: {
        hasApiKey: false,
        provider: 'resend'
      }
    };
  }

  const startTime = Date.now();
  try {
    const resend = new Resend(key);
    const { data, error } = await resend.apiKeys.list();
    const latencyMs = Date.now() - startTime;

    if (error) {
      return {
        success: false,
        message: `Resend API verification failed: ${error.message || error.name || 'Invalid API key'}`,
        details: {
          provider: 'resend',
          error,
          latencyMs,
          verifiedAt: new Date().toISOString()
        }
      };
    }

    return {
      success: true,
      message: 'Resend API Key verified successfully! Email dispatch gateway is ready.',
      details: {
        provider: 'resend',
        keyPreview: `${key.substring(0, 6)}...${key.substring(key.length - 4)}`,
        latencyMs,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      message: `Resend API connection error: ${err.message}`,
      details: {
        provider: 'resend',
        latencyMs,
        verifiedAt: new Date().toISOString()
      }
    };
  }
};

/**
 * Verify Brevo API Key validity directly with the Brevo API
 */
export const verifyBrevoConnection = async (apiKey) => {
  const key = (apiKey || process.env.BREVO_API_KEY || '').trim();
  if (!key) {
    return {
      success: false,
      message: 'Brevo API Key is missing. Please provide your Brevo API Key (starts with xkeysib-).',
      details: {
        hasApiKey: false,
        provider: 'brevo'
      }
    };
  }

  const startTime = Date.now();
  try {
    const res = await fetch('https://api.brevo.com/v3/account', {
      method: 'GET',
      headers: {
        'api-key': key,
        'Accept': 'application/json'
      }
    });

    const data = await res.json();
    const latencyMs = Date.now() - startTime;

    if (!res.ok) {
      return {
        success: false,
        message: `Brevo API verification failed: ${data.message || res.statusText}`,
        details: {
          provider: 'brevo',
          error: data,
          latencyMs,
          verifiedAt: new Date().toISOString()
        }
      };
    }

    const planName = data.plan?.[0]?.type || 'Free';
    const credits = data.plan?.[0]?.credits !== undefined ? data.plan[0].credits : 'Unlimited/Daily';

    return {
      success: true,
      message: `Brevo API Key verified successfully! Account: ${data.email || 'Active'}`,
      details: {
        provider: 'brevo',
        accountEmail: data.email,
        plan: planName,
        credits,
        keyPreview: `${key.substring(0, 8)}...${key.substring(key.length - 4)}`,
        latencyMs,
        verifiedAt: new Date().toISOString()
      }
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      message: `Brevo API connection error: ${err.message}`,
      details: {
        provider: 'brevo',
        latencyMs,
        verifiedAt: new Date().toISOString()
      }
    };
  }
};

/**
 * Create a nodemailer transporter instance based on resolved configuration
 */
export const createSmtpTransporter = (resolvedConfig) => {
  const isGmail = (resolvedConfig.host || '').toLowerCase().includes('gmail.com') || resolvedConfig.provider === 'gmail';

  if (isGmail && resolvedConfig.auth && resolvedConfig.auth.user) {
    return nodemailer.createTransport({
      service: 'gmail',
      auth: resolvedConfig.auth
    });
  }

  const transportOptions = {
    host: resolvedConfig.host,
    port: resolvedConfig.port,
    secure: resolvedConfig.secure,
    name: resolvedConfig.host || 'localhost',
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

  // If Resend provider, verify via Resend API
  if (resolved.provider === 'resend') {
    return verifyResendConnection(resolved.apiKey || resolved.auth?.pass);
  }

  // If Brevo provider: verify via Brevo API if key starts with xkeysib- or is supplied
  if (resolved.provider === 'brevo') {
    const brevoKey = (resolved.apiKey || resolved.auth?.pass || '').trim();
    if (brevoKey && (brevoKey.startsWith('xkeysib-') || !resolved.auth?.user)) {
      return verifyBrevoConnection(brevoKey);
    }
  }

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
 * Unified email connection verifier
 */
export const verifyEmailConnection = async (overrideConfig = null) => {
  return verifySmtpConnection(overrideConfig);
};

/**
 * Wrap content in a modern, responsive Krishna Valley branded email template
 */
export const wrapInBrandedTemplate = ({ contentHtml, subject, preheader = '', contactEmail = 'krishna.valley.tech@gmail.com' }) => {
  if (contentHtml && contentHtml.includes('<!DOCTYPE html>')) {
    return contentHtml;
  }

  // Strip redundant outer nested container wrappers if provided by seed templates
  let cleanContent = (contentHtml || '').trim();
  if (/^<div style="[^"]*max-width:\s*600px/i.test(cleanContent)) {
    cleanContent = cleanContent.replace(/^<div style="[^"]*max-width:\s*600px[^"]*">/i, '');
    if (cleanContent.endsWith('</div>')) {
      cleanContent = cleanContent.slice(0, -6).trim();
    }
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject || 'Krishna Valley'}</title>
</head>
<body style="margin: 0; padding: 24px 16px; background-color: #ffffff; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased; color: #1e293b;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width: 560px; margin: 0 auto; background-color: #ffffff;">
    <tr>
      <td style="padding: 0 0 16px 0; border-bottom: 2px solid #0f172a;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          <tr>
            <td style="font-size: 16px; font-weight: 700; color: #0f172a; letter-spacing: 0.5px;">KRISHNA VALLEY</td>
            <td align="right" style="font-size: 12px; color: #64748b; font-weight: 500;">Client Services</td>
          </tr>
        </table>
      </td>
    </tr>
    <tr>
      <td style="padding: 24px 0 20px 0; font-size: 15px; line-height: 1.6; color: #334155;">
        ${cleanContent}
      </td>
    </tr>
    <tr>
      <td style="padding: 18px 0 0 0; border-top: 1px solid #e2e8f0; font-size: 12px; line-height: 1.5; color: #64748b;">
        <p style="margin: 0 0 4px 0; font-weight: 600; color: #334155;">Krishna Valley Infrastructure &amp; Developers Pvt. Ltd.</p>
        <p style="margin: 0 0 4px 0;">Vrindavan Campus, NH-19, Mathura - Vrindavan, Uttar Pradesh 281121</p>
        <p style="margin: 0; color: #94a3b8; font-size: 11px;">
          Direct inquiries: <a href="mailto:${contactEmail}" style="color: #0f766e; text-decoration: none;">${contactEmail}</a>
        </p>
      </td>
    </tr>
  </table>
</body>
</html>`.trim();
};

/**
 * Convert HTML content to clean, readable plain text for multipart/alternative MIME
 */
export const convertHtmlToText = (html) => {
  if (!html) return '';
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<br\s*[\/]?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/tr>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<li[^>]*>/gi, '• ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&bull;/g, '•')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
};

/**
 * Dispatch real email via Resend API or SMTP
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

  const finalSubject = subject || 'Notification from Krishna Valley';
  const finalHtml = wrapInBrandedTemplate({ contentHtml: bodyHtml || `<p>${text || ''}</p>`, subject: finalSubject });
  const plainText = text || convertHtmlToText(bodyHtml || finalHtml);
  const senderDisplayName = (resolved.fromName || 'Krishna Valley').replace(/\bERP\b/gi, '').trim() || 'Krishna Valley';

  // Anti-Spam Alignment: When relaying via Gmail SMTP without a verified custom domain,
  // the 'from' email address MUST match the authenticated Gmail username (e.g. your Gmail).
  // Mismatched sender domains (e.g. notifications@krishnavalley.com via personal Gmail)
  // trigger Google's SPF/DMARC anti-spoofing filter and land directly in Spam!
  let effectiveFromEmail = (resolved.fromEmail || '').trim();
  const isGmailRelay = (resolved.provider === 'gmail' || (resolved.host || '').toLowerCase().includes('gmail.com'));
  if (isGmailRelay && resolved.auth?.user && resolved.auth.user.includes('@')) {
    effectiveFromEmail = resolved.auth.user.trim();
  }
  const formattedFrom = `"${senderDisplayName}" <${effectiveFromEmail}>`;

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
      from: formattedFrom,
      provider: resolved.provider,
      environment: resolved.environment,
      timestamp: new Date().toISOString()
    }
  };

  // ==========================================
  // DISPATCH PATH A: RESEND API
  // ==========================================
  if (resolved.provider === 'resend') {
    // If no Resend API key in sandbox mode, simulate gracefully
    if (!resolved.apiKey) {
      if (resolved.environment === 'sandbox' || isTest) {
        const simMessageId = `sim_resend_${Date.now()}@resend.dev`;
        logEntry.status = 'delivered';
        logEntry.responseDetails.messageId = simMessageId;
        logEntry.responseDetails.simulated = true;
        logEntry.responseDetails.note = 'Dispatched in sandbox mode (no live Resend API Key configured).';
        const savedLog = await NotificationLog.create(logEntry);

        return {
          success: true,
          simulated: true,
          channel: 'email',
          provider: 'resend',
          messageId: simMessageId,
          status: 'delivered',
          recipient: to,
          subject: finalSubject,
          note: 'Email simulated in sandbox. Configure a live Resend API Key (re_...) to deliver to real inboxes.',
          logId: savedLog._id
        };
      } else {
        throw new Error('Resend API Key is not configured for production email dispatch.');
      }
    }

    try {
      const resend = new Resend(resolved.apiKey.trim());

      // Resend requires either onboarding@resend.dev or a verified custom domain.
      // Freemail domains (@gmail.com, @yahoo.com, etc.) cannot be verified on Resend.
      let resendSenderEmail = (resolved.fromEmail || 'onboarding@resend.dev').trim();
      const domainPart = (resendSenderEmail.split('@')[1] || '').toLowerCase();
      const isFreemail = ['gmail.com', 'googlemail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'icloud.com', 'aol.com'].includes(domainPart);
      if (isFreemail || !resendSenderEmail.includes('@')) {
        resendSenderEmail = 'onboarding@resend.dev';
      }

      const resendPayload = {
        from: `"${senderDisplayName}" <${resendSenderEmail}>`,
        to: Array.isArray(to) ? to : [to],
        subject: finalSubject,
        html: finalHtml,
        text: plainText,
        reply_to: resolved.replyTo || (resolved.fromEmail !== 'onboarding@resend.dev' ? resolved.fromEmail : undefined)
      };

      if (attachments && attachments.length > 0) {
        resendPayload.attachments = attachments.map(att => ({
          filename: att.filename || 'attachment',
          content: att.content || att.path
        }));
      }

      const { data, error } = await resend.emails.send(resendPayload);

      if (error) {
        throw new Error(error.message || 'Resend failed to deliver email.');
      }

      logEntry.status = 'delivered';
      logEntry.responseDetails.messageId = data.id;
      logEntry.responseDetails.resendId = data.id;
      const savedLog = await NotificationLog.create(logEntry);

      return {
        success: true,
        channel: 'email',
        provider: 'resend',
        messageId: data.id,
        status: 'delivered',
        recipient: to,
        subject: finalSubject,
        logId: savedLog._id
      };
    } catch (error) {
      let friendlyError = error.message;
      if (friendlyError.includes('You can only send testing emails to your own email address')) {
        const match = friendlyError.match(/\(([^)]+)\)/);
        const ownerEmail = match ? match[1] : 'your registered Resend address';
        friendlyError = `Resend Testing Mode: When sending from onboarding@resend.dev, emails can only be sent to your registered Resend account (${ownerEmail}). To dispatch to other recipients, please verify a custom domain at https://resend.com/domains.`;
      }
      logEntry.status = 'failed';
      logEntry.errorMessage = friendlyError;
      logEntry.responseDetails.error = friendlyError;
      await NotificationLog.create(logEntry);
      throw new Error(friendlyError);
    }
  }

  // ==========================================
  // DISPATCH PATH B: BREVO REST API (Used when API key xkeysib- is provided)
  // ==========================================
  const isBrevoApiMode = resolved.provider === 'brevo' && resolved.apiKey && resolved.apiKey.startsWith('xkeysib-');
  if (isBrevoApiMode) {
    try {
      const recipientList = (Array.isArray(to) ? to : [to]).map(recipient => {
        if (typeof recipient === 'string') {
          return { email: recipient.trim(), name: variables.client_name || undefined };
        }
        return recipient;
      });

      const brevoPayload = {
        sender: {
          name: senderDisplayName,
          email: resolved.fromEmail || resolved.auth?.user || 'krishna.valley.tech@gmail.com'
        },
        to: recipientList,
        subject: finalSubject,
        htmlContent: finalHtml,
        textContent: plainText,
        replyTo: {
          email: resolved.replyTo || resolved.fromEmail || 'krishna.valley.tech@gmail.com',
          name: senderDisplayName
        }
      };

      if (attachments && attachments.length > 0) {
        brevoPayload.attachment = attachments.map(att => {
          let contentBase64 = '';
          if (Buffer.isBuffer(att.content)) {
            contentBase64 = att.content.toString('base64');
          } else if (typeof att.content === 'string') {
            contentBase64 = Buffer.from(att.content).toString('base64');
          }
          return {
            name: att.filename || 'attachment',
            content: contentBase64,
            url: att.path || undefined
          };
        });
      }

      const brevoRes = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
          'api-key': brevoKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(brevoPayload)
      });

      const brevoData = await brevoRes.json();

      if (!brevoRes.ok) {
        throw new Error(brevoData.message || `Brevo returned HTTP ${brevoRes.status}`);
      }

      const messageId = brevoData.messageId || `brevo_${Date.now()}`;
      logEntry.status = 'delivered';
      logEntry.responseDetails.messageId = messageId;
      logEntry.responseDetails.brevoId = messageId;
      const savedLog = await NotificationLog.create(logEntry);

      return {
        success: true,
        channel: 'email',
        provider: 'brevo',
        messageId,
        status: 'delivered',
        recipient: to,
        subject: finalSubject,
        logId: savedLog._id
      };
    } catch (error) {
      logEntry.status = 'failed';
      logEntry.errorMessage = error.message;
      logEntry.responseDetails.error = error.message;
      await NotificationLog.create(logEntry);
      throw new Error(`Brevo Dispatch Error: ${error.message}`);
    }
  }

  // ==========================================
  // DISPATCH PATH C: SMTP RELAY (NODEMAILER)
  // ==========================================
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
        provider: resolved.provider,
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
    const mailOptions = {
      from: formattedFrom,
      to,
      subject: finalSubject,
      date: new Date(),
      text: plainText,
      html: finalHtml,
      attachments
    };

    if (resolved.replyTo && resolved.replyTo.trim().toLowerCase() !== resolved.fromEmail.trim().toLowerCase()) {
      mailOptions.replyTo = resolved.replyTo.trim();
    }

    const info = await transporter.sendMail(mailOptions);

    logEntry.status = 'delivered';
    logEntry.responseDetails.messageId = info.messageId;
    logEntry.responseDetails.response = info.response;
    const savedLog = await NotificationLog.create(logEntry);

    return {
      success: true,
      channel: 'email',
      provider: resolved.provider,
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
  verifyResendConnection,
  verifyBrevoConnection,
  verifySmtpConnection,
  verifyEmailConnection,
  sendEmail,
  wrapInBrandedTemplate
};
