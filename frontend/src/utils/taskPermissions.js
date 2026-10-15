/**
 * taskPermissions.js
 * Centralized authorization rules for Taskforce operations and task assignment.
 */

/**
 * Helper to safely extract a normalized string role code from any input.
 */
export const extractRoleCode = (user, passedRole = '') => {
  if (typeof passedRole === 'string' && passedRole.trim()) {
    return passedRole.toLowerCase().trim();
  }
  if (passedRole && typeof passedRole === 'object') {
    const code = passedRole.roleCode || passedRole.code || passedRole.roleName || passedRole.name || '';
    if (typeof code === 'string' && code.trim()) {
      return code.toLowerCase().trim();
    }
  }
  if (typeof user === 'string' && user.trim()) {
    return user.toLowerCase().trim();
  }
  if (!user || typeof user !== 'object') {
    return '';
  }
  if (typeof user.role === 'string' && user.role.trim()) {
    return user.role.toLowerCase().trim();
  }
  if (user.role && typeof user.role === 'object') {
    const code = user.role.roleCode || user.role.code || user.role.roleName || user.role.name || '';
    if (typeof code === 'string' && code.trim()) {
      return code.toLowerCase().trim();
    }
  }
  if (user.roleId && typeof user.roleId === 'object') {
    const code = user.roleId.roleCode || user.roleId.code || user.roleId.roleName || user.roleId.name || '';
    if (typeof code === 'string' && code.trim()) {
      return code.toLowerCase().trim();
    }
  }
  if (typeof user.roleCode === 'string' && user.roleCode.trim()) {
    return user.roleCode.toLowerCase().trim();
  }
  return '';
};

/**
 * Helper to safely extract normalized department string from user.
 */
export const extractDepartment = (user) => {
  if (!user) return '';
  const d = user.department || user.departmentCode || user.dept || '';
  if (typeof d === 'string') return d.toLowerCase().trim();
  if (d && typeof d === 'object') {
    const name = d.name || d.department || d.deptName || '';
    return typeof name === 'string' ? name.toLowerCase().trim() : '';
  }
  return '';
};

/**
 * Check if the user is authorized to create and assign tasks.
 * RULE: Only Admin, Taskforce Manager, and the VP Department can assign tasks. No one else.
 */
export const canUserAssignTasks = (user, userRole = '') => {
  if (!user) return false;

  const role = extractRoleCode(user, userRole);
  const dept = extractDepartment(user);
  const designation = typeof user?.designation === 'string' ? user.designation.toLowerCase().trim() : '';

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

  // 4. Check explicit permissions
  const perms = (user.permissionCodes || (user.permissions || []).map((p) => (typeof p === 'string' ? p : p.permissionCode))).filter(Boolean);
  const hasTaskCreatePerm = perms.includes('tasks:create') || perms.includes('tasks:manage');

  // 5. Department Head / Taskforce Lead
  const isHead = role === 'taskforce_lead' || role === 'head' || user?.taskforceHierarchyLevel === 'head';

  return isAdmin || isTaskforceManager || isVPDept || hasTaskCreatePerm || isHead;
};

/**
 * Check if a user belongs to the Taskforce Team or has administrative task visibility.
 */
export const isTaskforceTeamMember = (user, userRole = '') => {
  if (!user) return false;

  const role = extractRoleCode(user, userRole);

  // Administrators and Taskforce Managers always have full access
  if (role === 'super_admin' || role === 'admin' || role === 'taskforce_manager' || role === 'taskforce_mgr') {
    return true;
  }

  // External Channel Partners (Agents) do not have access to internal taskforce ops
  if (role === 'agent') {
    return false;
  }

  // Check explicit permissions
  const perms = (user.permissionCodes || (user.permissions || []).map((p) => (typeof p === 'string' ? p : p.permissionCode))).filter(Boolean);
  if (perms.includes('tasks:manage') || perms.includes('tasks:view')) {
    return true;
  }

  // Taskforce Team Members:
  // - Taskforce Leads / Supervisors / Field Helpers
  // - Members in VP's Department
  // - Explicit isTaskforceMember flag
  // - taskforceHierarchyLevel set
  const isExplicitTaskforceRole = [
    'taskforce_lead',
    'taskforce_supervisor',
    'taskforce_member',
    'head',
    'supervisor',
    'helper',
  ].includes(role);

  const dept = extractDepartment(user);
  const isTaskforceDept = dept.includes('taskforce') || dept === "vp's" || dept === 'vp';

  return isExplicitTaskforceRole || Boolean(user?.isTaskforceMember) || Boolean(user?.taskforceHierarchyLevel) || isTaskforceDept;
};
