import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const sync = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/krishna-valley-erp';
  await mongoose.connect(uri);
  console.log('Connected to MongoDB at', uri.split('@')[1] || uri);

  const Lead = mongoose.models.Lead || mongoose.model('Lead', new mongoose.Schema({}, { strict: false }));
  const SiteVisit = mongoose.models.SiteVisit || mongoose.model('SiteVisit', new mongoose.Schema({}, { strict: false }));
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));

  const leads = await Lead.find({ agentId: { $ne: null } });
  console.log(`Found ${leads.length} leads attributed to agents.`);

  let leadCount = 0;
  for (const l of leads) {
    if (l.agentId) {
      await User.findByIdAndUpdate(l.agentId, {
        $addToSet: { 'agentProfile.leads': l._id },
      });
      leadCount++;
    }
  }

  const visits = await SiteVisit.find({ agentId: { $ne: null } });
  console.log(`Found ${visits.length} site visits attributed to agents.`);

  let visitCount = 0;
  for (const v of visits) {
    if (v.agentId) {
      await User.findByIdAndUpdate(v.agentId, {
        $addToSet: {
          'agentProfile.siteVisits': v._id,
          ...(v.leadId ? { 'agentProfile.leads': v.leadId } : {}),
        },
      });
      visitCount++;
    }
  }

  console.log(`✅ Successfully synced ${leadCount} leads and ${visitCount} site visits directly into agent MongoDB schemas!`);
  process.exit(0);
};

sync().catch((err) => {
  console.error('Sync error:', err);
  process.exit(1);
});
