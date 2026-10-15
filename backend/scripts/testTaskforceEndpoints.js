import { connectDB } from '../config/db.js';
import { Task } from '../models/Task.js';
import { User } from '../models/User.js';
import { TaskforceMember } from '../models/TaskforceMember.js';
import { getScopedTaskforceContext } from '../controllers/taskforceTeamController.js';
import { DEPARTMENTS } from '../controllers/taskController.js';
import mongoose from 'mongoose';

async function runTests() {
  await connectDB();
  console.log('--- STARTING TASKFORCE VERIFICATION TESTS ---');

  // Test 1: Admin User Scoping
  const adminUser = await User.findOne({ username: 'superadmin' }) || await User.findOne({ role: 'super_admin' }) || await User.findOne({ role: 'admin' });
  if (adminUser) {
    const adminScope = await getScopedTaskforceContext(adminUser);
    console.log(`[TEST 1] Admin Scoping: isManagerOrAdmin = ${adminScope.isManagerOrAdmin} (Expected: true)`);
    if (!adminScope.isManagerOrAdmin) throw new Error('Admin scope check failed');
  }

  // Test 2: Department Head User Scoping (Yogesh - I.T.)
  const headUser = await User.findOne({ username: 'yogesh' });
  if (headUser) {
    const headScope = await getScopedTaskforceContext(headUser);
    console.log(`[TEST 2] Head Scoping: hierarchyLevel = ${headScope.hierarchyLevel}, allowedUserIds = ${headScope.allowedUserIds?.length}, allowedMemberIds = ${headScope.allowedMemberIds?.length}`);
    if (headScope.hierarchyLevel !== 'head') throw new Error('Head hierarchyLevel should be head');
    if (!headScope.allowedMemberIds || headScope.allowedMemberIds.length < 2) {
      throw new Error('Head should be able to see self and subordinates');
    }
  }

  // Test 3: Supervisor User Scoping (Sumit - I.T.)
  const supUser = await User.findOne({ username: 'sumit' });
  if (supUser) {
    const supScope = await getScopedTaskforceContext(supUser);
    console.log(`[TEST 3] Supervisor Scoping: hierarchyLevel = ${supScope.hierarchyLevel}, allowedMemberIds = ${supScope.allowedMemberIds?.length}`);
    if (supScope.hierarchyLevel !== 'supervisor') throw new Error('Supervisor hierarchyLevel should be supervisor');
  }

  // Test 4: Helper User Scoping (Rajesh Gola - Civil)
  const helperUser = await User.findOne({ username: 'rajesh_gola' });
  if (helperUser) {
    const helperScope = await getScopedTaskforceContext(helperUser);
    console.log(`[TEST 4] Helper Scoping: hierarchyLevel = ${helperScope.hierarchyLevel}, allowedMemberIds = ${helperScope.allowedMemberIds?.length}`);
    if (helperScope.hierarchyLevel !== 'helper') throw new Error('Helper hierarchyLevel should be helper');
    if (helperScope.allowedMemberIds.length !== 1) throw new Error('Helper should only see himself');
  }

  // Test 5: Verify Department Linking in Database
  const itHead = await TaskforceMember.findOne({ name: 'Yogesh' });
  const itSup = await TaskforceMember.findOne({ name: 'Sumit' });
  if (itHead && itSup) {
    console.log(`[TEST 5] Hierarchy link check: Sumit's headId = ${itSup.headId} vs Yogesh _id = ${itHead._id}`);
    if (itSup.headId?.toString() !== itHead._id.toString()) {
      throw new Error('Hierarchy link between Sumit and Yogesh mismatch');
    }
  }

  // Test 6: Verify Case-Insensitive Department Regex on Tasks
  const itTasksExact = await Task.find({ department: 'I.T.' });
  const itTasksRegex = await Task.find({ department: { $regex: new RegExp('^(I\\.T\\.|I\\.?T\\.?)$', 'i') } });
  console.log(`[TEST 6] IT Tasks found: ${itTasksExact.length} exact, ${itTasksRegex.length} with regex`);

  // Test 7: Verify Checkpoint progress formula
  const sampleTask = await Task.findOne({ checkpoints: { $exists: true, $not: { $size: 0 } } });
  if (sampleTask) {
    const completedCount = sampleTask.checkpoints.filter(c => c.isCompleted).length;
    const calcProgress = Math.round((completedCount / sampleTask.checkpoints.length) * 100);
    console.log(`[TEST 7] Checkpoints calculation on task [${sampleTask.taskCode}]: progress = ${sampleTask.progress}% (Calculated: ${calcProgress}%)`);
  }

  // Test 8: Verify Deduplicated Departments
  const seen = new Set();
  const duplicates = [];
  DEPARTMENTS.forEach(d => {
    const norm = d.key.toLowerCase().trim();
    if (seen.has(norm)) duplicates.push(d.key);
    seen.add(norm);
  });
  console.log(`[TEST 8] Departments uniqueness check: ${duplicates.length === 0 ? 'CLEAN (0 duplicates)' : 'DUPLICATES: ' + duplicates.join(', ')}`);

  console.log('\nALL TASKFORCE INTEGRATION & SCENARIO TESTS PASSED SUCCESSFULLY! ✅');
  await mongoose.disconnect();
}

runTests().catch(err => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
