import axios from 'axios';

const API_BASE = process.env.EXPO_PUBLIC_BACKEND_URL || '';

const api = axios.create({
  baseURL: `${API_BASE}/api`,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

let authToken: string | null = null;

export function setAuthToken(token: string | null) {
  authToken = token;
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export function getAuthToken() {
  return authToken;
}

// Error formatting
export function formatApiError(error: any): string {
  if (error?.response?.data?.detail) {
    const detail = error.response.data.detail;
    if (typeof detail === 'string') return detail;
    if (Array.isArray(detail)) return detail.map((e: any) => e?.msg || JSON.stringify(e)).join(' ');
    if (detail?.msg) return detail.msg;
    return String(detail);
  }
  return error?.message || 'Une erreur est survenue';
}

export default api;
