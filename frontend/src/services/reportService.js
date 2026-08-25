import { request } from './api.js';

const buildQuery = (params = {}) => {
  const q = new URLSearchParams();
  if (params.projectId && params.projectId !== 'all') q.append('projectId', params.projectId);
  if (params.dateRange && params.dateRange !== 'all') q.append('dateRange', params.dateRange);
  if (params.customStart) q.append('customStart', params.customStart);
  if (params.customEnd) q.append('customEnd', params.customEnd);
  const qs = q.toString();
  return qs ? `?${qs}` : '';
};

export const reportService = {
  getSalesReport: (params) => request(`/reports/sales${buildQuery(params)}`),
  getRentalReport: (params) => request(`/reports/rental${buildQuery(params)}`),
  getCollectionReport: (params) => request(`/reports/collection${buildQuery(params)}`),
  getMaintenanceReport: (params) => request(`/reports/maintenance${buildQuery(params)}`),
  getInventoryReport: (params) => request(`/reports/inventory${buildQuery(params)}`),
  getFinanceReport: (params) => request(`/reports/finance${buildQuery(params)}`),
  getCRMReport: (params) => request(`/reports/crm${buildQuery(params)}`),
  getHRReport: (params) => request(`/reports/hr${buildQuery(params)}`),

  // Utility to export array of objects to CSV download in browser
  exportToCSV: (data, filename = 'report.csv') => {
    if (!data || !data.length) {
      alert('No data available to export.');
      return;
    }
    const headers = Object.keys(data[0]);
    const csvRows = [];
    csvRows.push(headers.join(','));

    for (const row of data) {
      const values = headers.map((header) => {
        const val = row[header];
        if (val === null || val === undefined) return '""';
        const escaped = ('' + val).replace(/"/g, '""');
        return `"${escaped}"`;
      });
      csvRows.push(values.join(','));
    }

    const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }
};
