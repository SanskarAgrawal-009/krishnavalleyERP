/**
 * Frontend Utilities for Real Estate ERP
 */

export const formatINR = (val) => {
  if (val === undefined || val === null || isNaN(val)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(val);
};

export const formatCompactINR = (val) => {
  if (!val) return '₹0';
  if (val >= 10000000) return `₹${(val / 10000000).toFixed(2)} Cr`;
  if (val >= 100000) return `₹${(val / 100000).toFixed(2)} L`;
  if (val >= 1000) return `₹${(val / 1000).toFixed(1)} K`;
  return `₹${val}`;
};

export const formatDate = (dateStr) => {
  if (!dateStr) return '-';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const formatFloor = (floor) => {
  if (floor === undefined || floor === null || floor === '') return 'Ground Floor';
  const f = Number(floor);
  if (isNaN(f) || f === 0) return 'Ground Floor';
  if (f === 1) return '1st Floor';
  if (f === 2) return '2nd Floor';
  if (f === 3) return '3rd Floor';
  return `Floor ${f}`;
};
