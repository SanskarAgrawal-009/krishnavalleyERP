import { request } from './api.js';

export const rentalService = {
  // Table 1: Active Rental Register (Current Owners)
  getActiveRentals: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rentals/active${query ? `?${query}` : ''}`);
  },

  // Table 2: Previous Owners Trail (Ownership History)
  getPreviousOwnersHistory: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rentals/history${query ? `?${query}` : ''}`);
  },

  // Update Rental Terms (Tenure, Rent, Dates, TDS)
  updateRentalTerms: (flatId, data) =>
    request(`/rentals/${flatId}/terms`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Record Disbursement Payout
  recordRentalPayout: (flatId, data) =>
    request(`/rentals/${flatId}/payout`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Resale / Ownership Transfer (Archives old owner to Table 2, sets up new owner in Table 1)
  transferOwnership: (flatId, data) =>
    request(`/rentals/${flatId}/transfer`, {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Manual Rental Enrollment (Matching Required Columns)
  createManualRental: (data) =>
    request('/rentals/manual', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Batch Import Rentals from Excel
  importRentalsExcel: (data) =>
    request('/rentals/import-excel', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Table 3: Rental Passbook Ledgers for All Customers
  getRentalLedgers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/rentals/ledgers${query ? `?${query}` : ''}`);
  },

  // Auto-generate full tenure passbook from active rental register
  autoGenerateLedgers: (data = {}) =>
    request('/rentals/ledgers/auto-generate', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Upload Excel, calculate paid months from tenure/net amount/paid, generate passbook entries
  uploadLedgerExcelAndGenerate: (data) =>
    request('/rentals/ledgers/upload-excel', {
      method: 'POST',
      body: JSON.stringify(data)
    }),

  // Update or disburse an individual passbook entry
  updatePassbookEntry: (flatId, data) =>
    request(`/rentals/ledgers/${flatId}/entry`, {
      method: 'PUT',
      body: JSON.stringify(data)
    }),

  // Delete / Unenroll active rental entry
  deleteRental: (flatId) =>
    request(`/rentals/${flatId}`, {
      method: 'DELETE'
    }),

  // Delete historical previous owner entry
  deleteOwnershipHistory: (flatId, historyId) =>
    request(`/rentals/${flatId}/history/${historyId}`, {
      method: 'DELETE'
    })
};

export default rentalService;
