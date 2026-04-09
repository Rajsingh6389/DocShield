import axios from 'axios'
import { useAuthStore } from '../store/useStore'
import { API_BASE_URL, ENDPOINTS } from '../urls/api'

const api = axios.create({ 
  baseURL: API_BASE_URL
})

api.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token
  if (token) config.headers.Authorization = `Bearer ${token}`
  return config
})

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      useAuthStore.getState().logout()
      window.location.href = '/login'
    }
    return Promise.reject(err)
  },
)

// ── Auth ───────────────────────────────────────────────
export const authApi = {
  register: (data) => api.post(ENDPOINTS.AUTH.REGISTER, data),
  login: (data) => api.post(ENDPOINTS.AUTH.LOGIN, data),
  me: () => api.get(ENDPOINTS.AUTH.ME),
  setup2fa: () => api.post(ENDPOINTS.AUTH.SETUP_2FA),
  verify2fa: (code) => api.post(ENDPOINTS.AUTH.VERIFY_2FA(code)),
  disable2fa: () => api.post(ENDPOINTS.AUTH.DISABLE_2FA),
}

// ── Documents ──────────────────────────────────────────
export const documentsApi = {
  upload: (formData, onProgress) => api.post(ENDPOINTS.DOCUMENTS.UPLOAD, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
    onUploadProgress: (e) => onProgress?.(Math.round((e.loaded * 100) / e.total)),
  }),
  bulkUpload: (formData) => api.post(ENDPOINTS.DOCUMENTS.BULK_UPLOAD, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  list: (params) => api.get(ENDPOINTS.DOCUMENTS.LIST, { params }),
  get: (id) => api.get(ENDPOINTS.DOCUMENTS.GET(id)),
  delete: (id) => api.delete(ENDPOINTS.DOCUMENTS.DELETE(id)),
  download: (id) => `${api.defaults.baseURL}${ENDPOINTS.DOCUMENTS.DOWNLOAD(id)}`,
}

// ── Analysis ───────────────────────────────────────────
export const analysisApi = {
  result: (docId) => api.get(ENDPOINTS.ANALYSIS.RESULT(docId)),
  status: (docId) => api.get(ENDPOINTS.ANALYSIS.STATUS(docId)),
  retry: (docId) => api.post(`/analysis/${docId}/retry`),
  heatmapUrl: (docId) => `${api.defaults.baseURL}${ENDPOINTS.ANALYSIS.HEATMAP(docId)}`,
  reportUrl: (docId) => `${api.defaults.baseURL}${ENDPOINTS.ANALYSIS.REPORT(docId)}`,
}

// ── Cases ──────────────────────────────────────────────
export const casesApi = {
  list: (params) => api.get(ENDPOINTS.CASES.LIST, { params }),
  get: (id) => api.get(ENDPOINTS.CASES.GET(id)),
  update: (id, data) => api.patch(ENDPOINTS.CASES.UPDATE(id), data),
}

// ── Admin ──────────────────────────────────────────────
export const adminApi = {
  stats: () => api.get(ENDPOINTS.ADMIN.STATS),
  users: () => api.get(ENDPOINTS.ADMIN.USERS),
  setActive: (id, active) => api.patch(ENDPOINTS.ADMIN.SET_ACTIVE(id, active)),
  setRole: (id, role) => api.patch(ENDPOINTS.ADMIN.SET_ROLE(id, role)),
  auditLogs: (page = 1) => api.get(ENDPOINTS.ADMIN.AUDIT_LOGS(page)),
}

// ── Notifications ──────────────────────────────────────
export const notificationsApi = {
  list: (unreadOnly = false) => api.get(ENDPOINTS.NOTIFICATIONS.LIST(unreadOnly)),
  markRead: (id) => api.post(ENDPOINTS.NOTIFICATIONS.MARK_READ(id)),
  markAllRead: () => api.post(ENDPOINTS.NOTIFICATIONS.MARK_ALL_READ),
}

// ── Blockchain ──────────────────────────────────────────
export const blockchainApi = {
  register: (formData) => api.post(ENDPOINTS.BLOCKCHAIN.REGISTER, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
  verify: (formData) => api.post(ENDPOINTS.BLOCKCHAIN.VERIFY, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }),
}

export default api
