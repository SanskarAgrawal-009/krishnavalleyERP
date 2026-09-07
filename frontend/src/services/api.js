/**
 * API Fetch wrapper for Krishna Valley ERP
 */

const defaultBackend = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')
  ? 'http://localhost:5000'
  : 'https://54-83-115-193.sslip.io';

export const RAW_API_URL = import.meta.env.VITE_API_URL || defaultBackend;
export const BASE_URL = RAW_API_URL.endsWith('/api') ? RAW_API_URL : `${RAW_API_URL.replace(/\/$/, '')}/api`;
export const BACKEND_URL = RAW_API_URL.replace(/\/api$/, '').replace(/\/$/, '');

/**
 * Resolves any file path (S3 or local uploads) to an absolute URL
 */
export const getFileUrl = (filePath) => {
  if (!filePath) return '';
  if (
    filePath.startsWith('http://') ||
    filePath.startsWith('https://') ||
    filePath.startsWith('data:') ||
    filePath.startsWith('blob:')
  ) {
    return filePath;
  }
  const cleanPath = filePath.startsWith('/') ? filePath : `/${filePath}`;
  return `${BACKEND_URL}${cleanPath}`;
};

// DSA In-Flight Promise Cache (O(1) Map for deduplicating concurrent GET requests)
const inFlightGetRequests = new Map();

// Global Network Activity Tracker & Observer Pattern
let activeRequestsCount = 0;
const apiLoadingSubscribers = new Set();

const notifySubscribers = () => {
  const isLoading = activeRequestsCount > 0;
  apiLoadingSubscribers.forEach((fn) => {
    try {
      fn(isLoading, activeRequestsCount);
    } catch (e) {
      console.error('API subscriber error:', e);
    }
  });
};

export const subscribeToApiLoading = (callback) => {
  apiLoadingSubscribers.add(callback);
  callback(activeRequestsCount > 0, activeRequestsCount);
  return () => {
    apiLoadingSubscribers.delete(callback);
  };
};

export const request = async (endpoint, options = {}) => {
  const method = (options.method || 'GET').toUpperCase();
  const isGet = method === 'GET' && !options.body;

  // If duplicate GET is already in-flight, reuse existing Promise (O(1) lookup)
  if (isGet && inFlightGetRequests.has(endpoint)) {
    return inFlightGetRequests.get(endpoint);
  }

  const token = localStorage.getItem('kv_token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

  const executeRequest = async () => {
    activeRequestsCount++;
    notifySubscribers();

    try {
      const res = await fetch(`${BASE_URL}${endpoint}`, {
        ...options,
        headers
      });

      const text = await res.text();
      let data;
      try {
        data = text ? JSON.parse(text) : {};
      } catch {
        if (!res.ok) {
          throw new Error(`HTTP ${res.status}: ${text || res.statusText || 'Request failed'}`);
        }
        data = { message: text };
      }

      if (!res.ok) {
        throw new Error(data.message || `API Request failed (${res.status})`);
      }
      return data;
    } catch (error) {
      console.error(`API Error on [${endpoint}]:`, error.message);
      throw error;
    } finally {
      activeRequestsCount = Math.max(0, activeRequestsCount - 1);
      notifySubscribers();

      if (isGet) {
        inFlightGetRequests.delete(endpoint);
      }
    }
  };

  if (isGet) {
    const promise = executeRequest();
    inFlightGetRequests.set(endpoint, promise);
    return promise;
  }

  return executeRequest();
};
