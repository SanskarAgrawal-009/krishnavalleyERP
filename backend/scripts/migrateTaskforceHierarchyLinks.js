import { connectDB } from '../config/db.js';
import { TaskforceMember } from '../models/TaskforceMember.js';
import { User } from '../models/User.js';
import mongoose from 'mongoose';

async function main() {
  await connectDB();

  const members = await TaskforceMember.find({ status: { $ne: 'deleted' } });
  console.log(`Found ${members.length} active Taskforce members.`);

  // Group heads by normalized department
  const headsByDept = {};
  for (const m of members) {
    if (m.hierarchyLevel === 'head') {
      const deptKey = (m.department || m.trade || '').toLowerCase().trim();
      if (!headsByDept[deptKey]) headsByDept[deptKey] = [];
      headsByDept[deptKey].push(m);
    }
  }

  // Group supervisors by normalized department
  const supervisorsByDept = {};
  for (const m of members) {
    if (m.hierarchyLevel === 'supervisor') {
      const deptKey = (m.department || m.trade || '').toLowerCase().trim();
      if (!supervisorsByDept[deptKey]) supervisorsByDept[deptKey] = [];
      supervisorsByDept[deptKey].push(m);
    }
  }

  let linkedCount = 0;
  for (const m of members) {
    const deptKey = (m.department || m.trade || '').toLowerCase().trim();
    let updated = false;

    // Link supervisor to department head
    if (m.hierarchyLevel === 'supervisor' && !m.headId) {
      const heads = headsByDept[deptKey];
      if (heads && heads.length > 0) {
        m.headId = heads[0]._id;
        updated = true;
        console.log(`Linked Supervisor "${m.name}" (${m.department}) -> Head "${heads[0].name}"`);
      }
    }

    // Link helper to department head and supervisor
    if (m.hierarchyLevel === 'helper') {
      if (!m.headId) {
        const heads = headsByDept[deptKey];
        if (heads && heads.length > 0) {
          m.headId = heads[0]._id;
          updated = true;
          console.log(`Linked Helper "${m.name}" (${m.department}) -> Head "${heads[0].name}"`);
        }
      }
      if (!m.supervisorId) {
        const sups = supervisorsByDept[deptKey];
        if (sups && sups.length > 0) {
          m.supervisorId = sups[0]._id;
          updated = true;
          console.log(`Linked Helper "${m.name}" (${m.department}) -> Supervisor "${sups[0].name}"`);
        }
      }
    }

    if (updated) {
      await m.save();
      linkedCount++;
    }

    // Also verify and sync linked User document
    if (m.userId) {
      const user = await User.findById(m.userId);
      if (user) {
        let userUpdated = false;
        if (!user.isTaskforceMember) {
          user.isTaskforceMember = true;
          userUpdated = true;
        }
        if (user.taskforceHierarchyLevel !== m.hierarchyLevel) {
          user.taskforceHierarchyLevel = m.hierarchyLevel;
          userUpdated = true;
        }
        if (!user.department && m.department) {
          user.department = m.department;
          userUpdated = true;
        }
        if (userUpdated) {
          await user.save();
          console.log(`Synced user record for "${user.username}" (${user.taskforceHierarchyLevel}, ${user.department})`);
        }
      }
    }
  }

  console.log(`\nSuccessfully linked ${linkedCount} members into their department hierarchies!`);
  await mongoose.disconnect();
}

main().catch(console.error);
