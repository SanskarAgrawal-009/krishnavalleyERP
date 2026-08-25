import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), 'backend/.env') });

const check = async () => {
  const uri = process.env.MONGO_URI || process.env.MONGODB_URI;
  await mongoose.connect(uri);
  const User = mongoose.models.User || mongoose.model('User', new mongoose.Schema({}, { strict: false }));
  const Role = mongoose.models.Role || mongoose.model('Role', new mongoose.Schema({}, { strict: false }));
  const AccessControl = mongoose.models.AccessControl || mongoose.model('AccessControl', new mongoose.Schema({}, { strict: false }));

  const allUsers = await User.countDocuments();
  const withAgentProfile = await User.countDocuments({ agentProfile: { $exists: true, $ne: null } });
  const withAgentCode = await User.countDocuments({ 'agentProfile.agentCode': { $exists: true, $ne: '' } });

  const agentRole = await Role.findOne({ roleCode: 'agent' });
  const agentAC = await AccessControl.findOne({ roleCode: 'agent' });
  const withAgentRole = agentRole ? await User.countDocuments({ roleId: agentRole._id }) : 0;
  const withAgentAC = agentAC ? await User.countDocuments({ roleId: agentAC._id }) : 0;

  console.log({
    allUsers,
    withAgentProfile,
    withAgentCode,
    withAgentRole,
    withAgentAC,
    agentRoleId: agentRole?._id,
    agentACId: agentAC?._id
  });

  const sampleUsers = await User.find({ agentProfile: { $exists: true } }).limit(5).select('firstName lastName username roleId agentProfile').lean();
  console.log('Sample Users with agentProfile:');
  console.log(JSON.stringify(sampleUsers, null, 2));

  process.exit(0);
};

check().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
