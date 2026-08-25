import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const inspect = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Role = mongoose.models.Role || mongoose.model('Role', new mongoose.Schema({}, { strict: false }));

  const users = await User.find().select('firstName lastName username email roleId agentProfile status').lean();
  const roles = await Role.find().lean();
  const roleMap = {};
  roles.forEach(r => { roleMap[r._id.toString()] = r; });

  console.log(`Total Users in DB: ${users.length}`);

  let agentCount = 0;
  users.forEach((u, i) => {
    const role = roleMap[u.roleId?.toString()];
    const roleCode = role?.roleCode || 'no_role';
    const isAgent = roleCode === 'agent' || !!u.agentProfile?.agentCode;
    if (isAgent) agentCount++;
    console.log(`[${i+1}] ${u.firstName} ${u.lastName || ''} (@${u.username}) | Role: ${roleCode} | AgentCode: ${u.agentProfile?.agentCode || 'NONE'} | Agency: ${u.agentProfile?.agencyName || 'NONE'}`);
  });

  console.log(`\nIdentified agents: ${agentCount} out of ${users.length} users`);
  process.exit(0);
};

inspect().catch(err => { console.error(err); process.exit(1); });
