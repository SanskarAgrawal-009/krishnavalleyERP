/**
 * Real Estate Business Formatters (INR Currency, Area Conversion, Dates)
 */

export const formatCurrencyINR = (amount) => {
  if (amount === undefined || amount === null || isNaN(amount)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0
  }).format(amount);
};

export const formatSqFtToSqYd = (sqft) => {
  if (!sqft) return 0;
  return (sqft / 9).toFixed(2);
};

export const formatIndianNumberWords = (num) => {
  if (!num) return 'Zero';
  if (num >= 10000000) {
    return `${(num / 10000000).toFixed(2)} Crore`;
  } else if (num >= 100000) {
    return `${(num / 100000).toFixed(2)} Lakh`;
  } else if (num >= 1000) {
    return `${(num / 1000).toFixed(2)} Thousand`;
  }
  return num.toString();
};

export const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};
