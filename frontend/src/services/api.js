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

export const request = async (endpoint, options = {}) => {
  const token = localStorage.getItem('kv_token');
  const isFormData = options.body instanceof FormData;

  const headers = {
    ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...options.headers
  };

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
  }
};
