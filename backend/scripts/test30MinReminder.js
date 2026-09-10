import dotenv from 'dotenv';
import mongoose from 'mongoose';
import Lead from '../models/Lead.js';
import User from '../models/User.js';
import {
  checkAndDispatchReminders,
  getDueRemindersForUser,
  composeTeamFollowUpReminder
} from '../services/reminderSchedulerService.js';

dotenv.config();

async function run30MinReminderTest() {
  console.log('🧪 Starting 30-Minute Team Reminder Engine Diagnostics...');
  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB.');

  let testLeadId = null;

  try {
    // 1. Find an active team member / user
    const testUser = await User.findOne({ email: 'krishna.valley.tech@gmail.com' }) ||
                     await User.findOne({ role: 'admin' }) ||
                     await User.findOne({});
    console.log(`👤 Using Test Sales Rep / Assignee: ${testUser.firstName} ${testUser.lastName || ''} (${testUser.email || 'no-email'})`);

    // 2. Create a test lead with a follow-up scheduled in 20 minutes (inside 30-min window)
    const scheduledTime = new Date(Date.now() + 20 * 60 * 1000); // 20 minutes from now

    const testLead = await Lead.create({
      name: 'Diagnostic Test Prospect',
      mobileNo: '+91 99999 88888',
      email: 'test.prospect@krishnavalley.com',
      leadSource: 'website',
      status: 'in_discussion',
      assignedTo: testUser._id,
      requirement: 'Tower A - 2BHK Luxury Unit',
      followUps: [
        {
          mode: 'call',
          status: 'pending',
          date: new Date(),
          nextFollowUpDate: scheduledTime,
          notes: 'Discuss Tower A pricing breakdown and site walkthrough timing.',
          assignedTo: testUser._id,
          scheduledBy: testUser._id,
          reminderStatus: {
            teamNotified: false,
            clientNotified: false
          }
        }
      ]
    });

    testLeadId = testLead._id;
    console.log(`📋 Created Test Lead "${testLead.name}" (ID: ${testLeadId})`);
    console.log(`⏰ Scheduled Follow-up: ${scheduledTime.toLocaleTimeString('en-IN')} (in ~20 mins)`);

    // 3. Test In-App & CRM Due Reminders query
    console.log('\n--- Step 1: Testing getDueRemindersForUser query ---');
    const dueData = await getDueRemindersForUser(testUser._id);
    const foundIn30Min = dueData.upcoming30Min.find(r => r.leadId === testLeadId.toString());

    if (foundIn30Min) {
      console.log('✅ SUCCESS: Follow-up detected in 30-min upcoming window!');
      console.log('   • Prospect:', foundIn30Min.leadName);
      console.log('   • Mode:', foundIn30Min.mode);
      console.log('   • Minutes Remaining:', foundIn30Min.minutesRemaining);
      console.log('   • isDueIn30Min flag:', foundIn30Min.isDueIn30Min);
      console.log('   • Generated WhatsApp Click-to-chat:', Boolean(foundIn30Min.whatsAppClickUrl));
    } else {
      console.error('❌ FAIL: Follow-up was not found in upcoming30Min window!');
    }

    // 4. Test composition of the 30-min notification template
    console.log('\n--- Step 2: Testing Message Composition ---');
    const template = composeTeamFollowUpReminder(testLead, testLead.followUps[0]);
    console.log('✅ Subject:', template.subject);
    console.log('✅ Plaintext Preview:\n' + template.text.split('\n').map(l => '   ' + l).join('\n'));

    // 5. Test checkAndDispatchReminders execution
    console.log('\n--- Step 3: Executing checkAndDispatchReminders() ---');
    await checkAndDispatchReminders();

    // 6. Verify that lead record was updated with teamNotified: true
    console.log('\n--- Step 4: Verifying Database Update ---');
    const updatedLead = await Lead.findById(testLeadId);
    const updatedFu = updatedLead.followUps[0];

    console.log('   • teamNotified:', updatedFu.reminderStatus?.teamNotified);
    console.log('   • teamNotifiedAt:', updatedFu.reminderStatus?.teamNotifiedAt);
    console.log('   • teamChannels:', updatedFu.reminderStatus?.teamChannels);

    if (updatedFu.reminderStatus?.teamNotified === true) {
      console.log('\n🎉 ALL 30-MINUTE REMINDER CHECKS PASSED!');
    } else {
      console.error('\n⚠️ teamNotified was not updated to true.');
    }

  } catch (err) {
    console.error('❌ Error during 30-min reminder test:', err);
  } finally {
    // 7. Cleanup test lead
    if (testLeadId) {
      await Lead.findByIdAndDelete(testLeadId);
      console.log(`\n🧹 Cleaned up temporary test lead (${testLeadId}).`);
    }
    await mongoose.disconnect();
    console.log('Disconnected from MongoDB.');
  }
}

run30MinReminderTest();
