import { resolveEmailConfig, verifyEmailConnection, sendEmail } from '../services/emailService.js';
import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

async function runTest() {
  console.log('🧪 Connecting to MongoDB...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('Connected to MongoDB successfully.');

  try {
    // 1. Test config resolution with override
    const config = await resolveEmailConfig({ provider: 'resend' });
    console.log('Resolved Resend Email Config:', {
      provider: config.provider,
      hasApiKey: Boolean(config.apiKey),
      fromEmail: config.fromEmail,
      fromName: config.fromName,
      environment: config.environment,
      enabled: config.enabled
    });

    // 2. Test Resend Email Simulation (sandbox mode)
    const sendResult = await sendEmail({
      to: 'test-recipient@example.com',
      subject: 'Resend Gateway Verification Test',
      text: 'This is a test verifying Resend integration for Krishna Valley ERP.',
      isTest: true,
      customConfig: { provider: 'resend', apiKey: '' }
    });

    console.log('✅ Send test email result via Resend (Sandbox simulation):', sendResult);
  } finally {
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

runTest().catch((err) => {
  console.error('Error running test:', err);
  process.exit(1);
});
