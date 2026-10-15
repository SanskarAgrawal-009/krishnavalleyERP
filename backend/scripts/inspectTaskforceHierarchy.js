import { connectDB } from '../config/db.js';
import { TaskforceMember } from '../models/TaskforceMember.js';
import { User } from '../models/User.js';
import { Task } from '../models/Task.js';
import mongoose from 'mongoose';

async function main() {
  await connectDB();
  const members = await TaskforceMember.find({ status: { $ne: 'deleted' } })
    .populate('headId', 'name hierarchyLevel department')
    .populate('supervisorId', 'name hierarchyLevel department')
    .populate('userId', 'username email role isTaskforceMember taskforceHierarchyLevel department')
    .lean();

  console.log(`\n=== TASKFORCE MEMBERS (${members.length}) ===`);
  for (const m of members) {
    console.log(`[${m.hierarchyLevel.toUpperCase()}] ${m.name}`);
    console.log(`   Dept: "${m.department}", Trade: "${m.trade}"`);
    console.log(`   Head: ${m.headId ? m.headId.name : 'NONE'}`);
    console.log(`   Supervisor: ${m.supervisorId ? m.supervisorId.name : 'NONE'}`);
    console.log(`   User: ${m.userId ? `${m.userId.username} (dept: ${m.userId.department}, isTF: ${m.userId.isTaskforceMember}, level: ${m.userId.taskforceHierarchyLevel})` : 'NO LINKED USER'}`);
  }

  const tasks = await Task.find({}).lean();
  console.log(`\n=== TASKS (${tasks.length}) ===`);
  for (const t of tasks) {
    console.log(`[${t.taskCode}] "${t.title}" | Dept: "${t.department}" | Status: "${t.status}" | AssignedTo: ${JSON.stringify(t.assignedTo)} | AssignedMembers: ${JSON.stringify(t.assignedMembers)}`);
  }

  await mongoose.disconnect();
}

main().catch(console.error);
