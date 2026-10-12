/**
 * departmentIcons.js
 * FontAwesome icon mappings and themes for all Krishna Valley Departments & Hierarchy tiers.
 */

export const DEPARTMENT_ICON_MAP = [
  {
    keywords: ['human resource', 'hr', 'people', 'talent'],
    icon: 'fa-solid fa-users',
    color: '#8b5cf6', // Violet
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    keywords: ['i.t.', 'it', 'software', 'tech', 'computer'],
    icon: 'fa-solid fa-laptop-code',
    color: '#0284c7', // Sky Blue
    bg: '#f0f9ff',
    border: '#bae6fd',
  },
  {
    keywords: ['procurement', 'purchase', 'vendor', 'supply', 'proc'],
    icon: 'fa-solid fa-box-open',
    color: '#d97706', // Amber / Orange
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    keywords: ['hotel', 'guest', 'stay', 'hospitality'],
    icon: 'fa-solid fa-hotel',
    color: '#ec4899', // Pink
    bg: '#fdf2f8',
    border: '#fbcfe8',
  },
  {
    keywords: ['security', 'guard', 'cctv', 'surveil', 'access', 'gate', 'sec'],
    icon: 'fa-solid fa-shield-halved',
    color: '#475569', // Slate
    bg: '#f8fafc',
    border: '#cbd5e1',
  },
  {
    keywords: ['accounts', 'account', 'finance', 'billing', 'tax', 'audit', 'acc'],
    icon: 'fa-solid fa-sack-dollar',
    color: '#10b981', // Emerald
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
  {
    keywords: ['c.r.m.', 'crm', 'client', 'customer', 'relationship'],
    icon: 'fa-solid fa-handshake',
    color: '#f59e0b', // Gold / Amber
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    keywords: ['admin / operations', 'admin', 'operations', 'governance'],
    icon: 'fa-solid fa-building',
    color: '#6366f1', // Indigo
    bg: '#eef2ff',
    border: '#c7d2fe',
  },
  {
    keywords: ['maintenance', 'maint', 'repair', 'servicing', 'fix'],
    icon: 'fa-solid fa-wrench',
    color: '#06b6d4', // Cyan
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
  {
    keywords: ['civil', 'snag', 'mason', 'concrete', 'structure', 'build'],
    icon: 'fa-solid fa-trowel-bricks',
    color: '#ea580c', // Rust Orange
    bg: '#fff7ed',
    border: '#fed7aa',
  },
  {
    keywords: ['licensing', 'license', 'permit', 'statutory', 'compliance', 'lic'],
    icon: 'fa-solid fa-scroll',
    color: '#eab308', // Warm Yellow
    bg: '#fefce8',
    border: '#fef08a',
  },
  {
    keywords: ['vp', "vp's", 'vice president', 'president'],
    icon: 'fa-solid fa-crown',
    color: '#7c3aed', // Royal Violet
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
];

export const getDepartmentTheme = (deptName) => {
  if (!deptName) {
    return {
      icon: 'fa-solid fa-layer-group',
      color: '#2563eb',
      bg: '#eff6ff',
      border: '#bfdbfe',
    };
  }
  const clean = deptName.toLowerCase().trim();
  const match = DEPARTMENT_ICON_MAP.find((entry) =>
    entry.keywords.some((k) => clean.includes(k))
  );

  if (match) {
    return match;
  }

  return {
    icon: 'fa-solid fa-layer-group',
    color: '#005bbf',
    bg: '#eff6ff',
    border: '#bfdbfe',
  };
};

export const getDepartmentIcon = (deptName) => {
  return getDepartmentTheme(deptName).icon;
};

export const getDepartmentColor = (deptName) => {
  return getDepartmentTheme(deptName).color;
};

export const getHierarchyTheme = (level) => {
  const norm = (level || '').toLowerCase().trim();
  if (norm === 'head') {
    return {
      icon: 'fa-solid fa-user-tie',
      title: 'Department Head',
      levelText: 'Level 3',
      color: '#92400e',
      bg: '#fef3c7',
      border: '#fde68a',
      badgeBg: '#fef3c7',
      badgeColor: '#78350f',
      badgeBorder: '#fcd34d',
    };
  }
  if (norm === 'supervisor') {
    return {
      icon: 'fa-solid fa-user-gear',
      title: 'Site Supervisor',
      levelText: 'Level 2',
      color: '#1d4ed8',
      bg: '#eff6ff',
      border: '#bfdbfe',
      badgeBg: '#dbeafe',
      badgeColor: '#1e40af',
      badgeBorder: '#93c5fd',
    };
  }
  return {
    icon: 'fa-solid fa-person-digging',
    title: 'Field Helper',
    levelText: 'Level 1',
    color: '#166534',
    bg: '#f0fdf4',
    border: '#bbf7d0',
    badgeBg: '#dcfce7',
    badgeColor: '#15803d',
    badgeBorder: '#86efac',
  };
};
