export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api';

export const ENDPOINTS = {
  AUTH: {
    REGISTER: '/auth/register',
    LOGIN: '/auth/login',
    ME: '/auth/me',
    SETUP_2FA: '/auth/2fa/setup',
    VERIFY_2FA: (code) => `/auth/2fa/verify?code=${code}`,
    DISABLE_2FA: '/auth/2fa/disable',
  },
  DOCUMENTS: {
    UPLOAD: '/documents/upload',
    BULK_UPLOAD: '/documents/bulk-upload',
    LIST: '/documents/',
    GET: (id) => `/documents/${id}`,
    DELETE: (id) => `/documents/${id}`,
    DOWNLOAD: (id) => `/documents/${id}/download`,
  },
  ANALYSIS: {
    RESULT: (docId) => `/analysis/${docId}/result`,
    STATUS: (docId) => `/analysis/${docId}/status`,
    HEATMAP: (docId) => `/analysis/${docId}/heatmap`,
    REPORT: (docId) => `/analysis/${docId}/report`,
  },
  ADMIN: {
    STATS: '/admin/stats',
    USERS: '/admin/users',
    SET_ACTIVE: (id, active) => `/admin/users/${id}/activate?active=${active}`,
    SET_ROLE: (id, role) => `/admin/users/${id}/role?role=${role}`,
    AUDIT_LOGS: (page = 1) => `/admin/audit-logs?page=${page}`,
  },
  NOTIFICATIONS: {
    LIST: (unreadOnly = false) => `/notifications/?unread_only=${unreadOnly}`,
    MARK_READ: (id) => `/notifications/${id}/read`,
    MARK_ALL_READ: '/notifications/read-all',
  },
  CASES: {
    LIST: '/cases/',
    GET: (id) => `/cases/${id}`,
    UPDATE: (id) => `/cases/${id}`,
  }
};

export const getWsStatusUrl = (id) => {
  const protocol = window.location.protocol === 'https:' ? 'wss' : 'ws';
  // Use the same host as the API, or fallback to current host
  const host = API_BASE_URL.startsWith('http') 
    ? new URL(API_BASE_URL).host.replace('localhost', '127.0.0.1') 
    : window.location.host;
  return `${protocol}://${host}/ws/status/${id}`;
};
