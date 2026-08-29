import { request } from './api.js';

export const inventoryService = {
  getSummary: () => request('/inventory/summary'),

  // 1. Materials
  createMaterial: (data) => request('/inventory/materials', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getMaterials: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/materials${query ? `?${query}` : ''}`);
  },

  // 2. Stores & Stocks
  createStore: (data) => request('/inventory/stores', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  updateStore: (id, data) => request(`/inventory/stores/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data)
  }),
  deleteStore: (id) => request(`/inventory/stores/${id}`, {
    method: 'DELETE'
  }),
  getStores: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/stores${query ? `?${query}` : ''}`);
  },
  getStocks: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/stocks${query ? `?${query}` : ''}`);
  },

  // 3. Vendors
  createVendor: (data) => request('/inventory/vendors', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getVendors: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/vendors${query ? `?${query}` : ''}`);
  },

  // 4. Purchase Orders
  createPurchaseOrder: (data) => request('/inventory/purchase-orders', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getPurchaseOrders: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/purchase-orders${query ? `?${query}` : ''}`);
  },

  // 5. Goods Receipts (GRN)
  createGoodsReceipt: (data) => request('/inventory/goods-receipts', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getGoodsReceipts: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/goods-receipts${query ? `?${query}` : ''}`);
  },

  // 6. Material Issues
  createMaterialIssue: (data) => request('/inventory/material-issues', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  getMaterialIssues: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/material-issues${query ? `?${query}` : ''}`);
  },

  // 7. Stock Transfers
  createStockTransfer: (data) => request('/inventory/stock-transfers', {
    method: 'POST',
    body: JSON.stringify(data)
  }),
  createTransfer: function (data) {
    return this.createStockTransfer(data);
  },
  getStockTransfers: (params = {}) => {
    const query = new URLSearchParams(params).toString();
    return request(`/inventory/stock-transfers${query ? `?${query}` : ''}`);
  },
  getTransfers: function (params = {}) {
    return this.getStockTransfers(params);
  }
};
