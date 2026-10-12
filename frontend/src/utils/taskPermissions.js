/**
 * taskPermissions.js
 * Centralized authorization rules for Taskforce operations and task assignment.
 */

/**
 * Check if the user is authorized to create and assign tasks.
 * RULE: Only Admin, Taskforce Manager, and the VP Department can assign tasks. No one else.
 */
export const canUserAssignTasks = (user, userRole = '') => {
  if (!user) return false;

  const role = (
    userRole ||
    (typeof user?.role === 'string'
      ? user.role
      : user?.role?.roleCode || user?.roleCode || '')
  ).toLowerCase().trim();

  const dept = (
    user?.department ||
    user?.departmentCode ||
    user?.dept ||
    ''
  ).toLowerCase().trim();

  const designation = (
    user?.designation ||
    user?.title ||
    ''
  ).toLowerCase().trim();

  // 1. Admin (admin or super_admin)
  const isAdmin = role === 'admin' || role === 'super_admin';

  // 2. Taskforce Manager
  const isTaskforceManager = role === 'taskforce_manager' || role === 'taskforce_mgr';

  // 3. VP Department (e.g. "VP's", "VP", "Vice President")
  const isVPDept =
    dept === "vp's" ||
    dept === 'vp' ||
    dept.startsWith('vp') ||
    dept.includes('vice president') ||
    role === 'vp' ||
    role.includes('vp') ||
    designation.includes('vp') ||
    designation.includes('vice president');

  return isAdmin || isTaskforceManager || isVPDept;
};

/**
 * Check if a user belongs to the Taskforce Team.
 * Super Admin and General Managers have nothing to do with the Taskforce Dashboard.
 */
export const isTaskforceTeamMember = (user, userRole = '') => {
  if (!user) return false;

  const role = (
    userRole ||
    (typeof user?.role === 'string'
      ? user.role
      : user?.role?.roleCode || user?.roleCode || '')
  ).toLowerCase().trim();

  // Super Admin has nothing to do with the Taskforce Dashboard
  if (role === 'super_admin') return false;

  // General Managers (sales, rental, hr, accounts, etc.) have nothing to do with the Taskforce Dashboard
  if (
    role === 'sales_head' ||
    role === 'sales_manager' ||
    role === 'rental_manager' ||
    role === 'hr_manager' ||
    role === 'accounts_manager' ||
    role === 'accountant' ||
    role === 'agent'
  ) {
    return false;
  }

  // Taskforce Team Members:
  // - Taskforce Manager
  // - Taskforce Leads / Supervisors / Field Helpers
  // - Members in VP's Department
  // - Explicit isTaskforceMember flag
  const isExplicitTaskforceRole = [
    'taskforce_manager',
    'taskforce_mgr',
    'taskforce_lead',
    'taskforce_supervisor',
    'head',
    'supervisor',
    'helper',
  ].includes(role);

  const dept = (user?.department || '').toLowerCase().trim();
  const isTaskforceDept = dept.includes('taskforce') || dept === "vp's" || dept === 'vp';

  return isExplicitTaskforceRole || Boolean(user?.isTaskforceMember) || isTaskforceDept;
};
