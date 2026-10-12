/**
 * departmentIcons.js
 * FontAwesome icon mappings and themes for all Krishna Valley Departments & Hierarchy tiers.
 */

export const DEPARTMENT_ICON_MAP = [
  {
    keywords: ['vp', "vp's", 'vice president', 'president'],
    icon: 'fa-solid fa-crown',
    color: '#7c3aed', // Royal Violet
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    keywords: ['paint', 'waterproof', 'coating'],
    icon: 'fa-solid fa-paint-roller',
    color: '#8b5cf6', // Violet / Purple
    bg: '#f5f3ff',
    border: '#ddd6fe',
  },
  {
    keywords: ['elect', 'power', 'wiring', 'light'],
    icon: 'fa-solid fa-bolt-lightning',
    color: '#f59e0b', // Amber / Gold
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    keywords: ['plumb', 'sanitat', 'water', 'pipe', 'drain'],
    icon: 'fa-solid fa-faucet-drip',
    color: '#06b6d4', // Cyan
    bg: '#ecfeff',
    border: '#a5f3fc',
  },
  {
    keywords: ['civil', 'snag', 'mason', 'concrete', 'structure', 'build'],
    icon: 'fa-solid fa-helmet-safety',
    color: '#2563eb', // Royal Blue
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    keywords: ['carpent', 'wood', 'furniture', 'door', 'joiner'],
    icon: 'fa-solid fa-hammer',
    color: '#d97706', // Bronze / Warm Amber
    bg: '#fffbeb',
    border: '#fde68a',
  },
  {
    keywords: ['clean', 'housekeep', 'hygiene', 'sweep'],
    icon: 'fa-solid fa-broom',
    color: '#10b981', // Emerald
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
  {
    keywords: ['secur', 'guard', 'cctv', 'surveil', 'access', 'gate'],
    icon: 'fa-solid fa-shield-halved',
    color: '#64748b', // Slate
    bg: '#f8fafc',
    border: '#cbd5e1',
  },
  {
    keywords: ['hvac', 'ac', 'cool', 'ventil', 'air'],
    icon: 'fa-solid fa-fan',
    color: '#0ea5e9', // Sky Blue
    bg: '#f0f9ff',
    border: '#bae6fd',
  },
  {
    keywords: ['crm', 'sales', 'lead', 'client', 'customer'],
    icon: 'fa-solid fa-headset',
    color: '#3b82f6',
    bg: '#eff6ff',
    border: '#bfdbfe',
  },
  {
    keywords: ['account', 'finance', 'billing', 'tax', 'audit'],
    icon: 'fa-solid fa-file-invoice-dollar',
    color: '#059669',
    bg: '#ecfdf5',
    border: '#a7f3d0',
  },
  {
    keywords: ['maint', 'repair', 'fix'],
    icon: 'fa-solid fa-wrench',
    color: '#ea580c',
    bg: '#fff7ed',
    border: '#fed7aa',
  },
  {
    keywords: ['gen', 'operat', 'logist'],
    icon: 'fa-solid fa-gears',
    color: '#475569',
    bg: '#f1f5f9',
    border: '#cbd5e1',
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
