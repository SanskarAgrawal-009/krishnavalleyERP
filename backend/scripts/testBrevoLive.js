import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { sendEmail, verifyEmailConnection } from '../services/emailService.js';

dotenv.config();

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB.');

  try {
    console.log('1. Checking connection verification...');
    const verifyRes = await verifyEmailConnection();
    console.log('Verify Result:', verifyRes);

    if (!verifyRes.success) {
      console.error('Verification failed. Aborting send.');
      return;
    }

    console.log('\n2. Dispatching live test email via Brevo SMTP relay...');
    const result = await sendEmail({
      to: 'krishna.valley.tech@gmail.com',
      subject: 'Krishna Valley ERP – Brevo Live Delivery Verification',
      bodyHtml: '<div style="font-size: 15px; color: #334155;"><p style="font-weight: 700; color: #0f172a;">Hello,</p><p>🎉 This email confirms that the <strong>Krishna Valley ERP Brevo Gateway</strong> is fully active and delivering emails live to your inbox!</p><p>All property documents, client receipts, and CRM reminders can now be dispatched to any client without landing in spam.</p></div>',
      variables: { client_name: 'System Admin' },
      isTest: true
    });

    console.log('\n✅ Live Email Dispatched Successfully!');
    console.log('Details:', {
      messageId: result.messageId,
      status: result.status,
      recipient: result.recipient,
      channel: result.channel,
      provider: result.provider
    });
  } catch (err) {
    console.error('❌ Error during test:', err.message);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

main();
