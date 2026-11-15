/**
 * J.A.V.I Universal API Client
 * Handles authentication tokens, cookie sessions, automatic token refresh,
 * typed endpoints for auth, profile, jobs, applications, tasks, notifications, and settings.
 */

export class ApiError extends Error {
  status: number;
  data: any;

  constructor(status: number, message: string, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

const TOKEN_KEY = 'javi_access_token';

export const tokenStorage = {
  get: (): string | null => {
    try {
      return localStorage.getItem(TOKEN_KEY);
    } catch {
      return null;
    }
  },
  set: (token: string): void => {
    try {
      localStorage.setItem(TOKEN_KEY, token);
    } catch (e) {
      console.warn('Failed to store access token', e);
    }
  },
  clear: (): void => {
    try {
      localStorage.removeItem(TOKEN_KEY);
    } catch (e) {
      console.warn('Failed to clear access token', e);
    }
  },
  hasToken: (): boolean => !!tokenStorage.get(),
};

function getApiBase(): string {
  const envUrl = (import.meta.env.VITE_API_BASE_URL || '').trim();
  if (!envUrl) {
    return '/api';
  }
  const clean = envUrl.replace(/\/+$/, '');
  return clean.endsWith('/api') ? clean : `${clean}/api`;
}

// Base API URL prefix (supports Vite env or defaults to /api proxy)
export const API_BASE = getApiBase();

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  json?: any;
  body?: BodyInit;
  params?: Record<string, string | number | boolean | undefined | null>;
  skipAuth?: boolean;
  skipRefresh?: boolean;
}

// Queue for handling simultaneous refresh requests
let isRefreshing = false;
let refreshPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
      });

      if (!res.ok) {
        tokenStorage.clear();
        return null;
      }

      const data = await res.json();
      if (data?.accessToken) {
        tokenStorage.set(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch (err) {
      tokenStorage.clear();
      return null;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

/**
 * Core fetch wrapper with auth header injection, error handling, and 401 auto-refresh retry
 */
export async function api<T = any>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const {
    method = options.json !== undefined || options.body !== undefined ? 'POST' : 'GET',
    headers = {},
    json,
    body,
    params,
    skipAuth = false,
    skipRefresh = false,
  } = options;

  // Build full URL
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  let path: string;
  if (cleanEndpoint.startsWith('/api/')) {
    path = API_BASE.endsWith('/api')
      ? `${API_BASE.slice(0, -4)}${cleanEndpoint}`
      : `${API_BASE}${cleanEndpoint}`;
  } else {
    path = `${API_BASE}${cleanEndpoint}`;
  }

  let url = path;
  if (params) {
    const searchParams = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      if (value !== undefined && value !== null) {
        searchParams.append(key, String(value));
      }
    }
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes('?') ? '&' : '?') + queryString;
    }
  }

  const reqHeaders: Record<string, string> = { ...headers };

  // Set Content-Type for JSON
  let reqBody = body;
  if (json !== undefined) {
    reqHeaders['Content-Type'] = 'application/json';
    reqBody = JSON.stringify(json);
  }

  // Attach Bearer token if available
  const token = tokenStorage.get();
  if (token && !skipAuth && !reqHeaders['Authorization']) {
    reqHeaders['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, {
    method,
    headers: reqHeaders,
    body: reqBody,
    credentials: 'include', // Includes HTTP-only refresh cookies
  });

  // Handle 401 Unauthorized: Attempt token refresh once
  if (res.status === 401 && !skipAuth && !skipRefresh && !cleanEndpoint.includes('/auth/')) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      // Retry original request with new token
      return api<T>(endpoint, {
        ...options,
        skipRefresh: true,
        headers: {
          ...headers,
          Authorization: `Bearer ${newToken}`,
        },
      });
    }
  }

  // Parse response
  const contentType = res.headers.get('content-type') || '';
  let responseData: any;

  if (contentType.includes('application/json')) {
    responseData = await res.json().catch(() => ({}));
  } else {
    responseData = await res.text().catch(() => '');
  }

  if (!res.ok) {
    const message =
      (responseData && typeof responseData === 'object' && (responseData.error || responseData.message)) ||
      (typeof responseData === 'string' && responseData) ||
      `Request failed with status ${res.status}`;
    throw new ApiError(res.status, message, responseData);
  }

  return responseData as T;
}

// -----------------------------------------------------------------------------
// 1. Authentication API
// -----------------------------------------------------------------------------
export interface RegisterPayload {
  email: string;
  password: string;
  name?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
}

export const authApi = {
  /** Register a new user */
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const data = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      json: payload,
      skipAuth: true,
    });
    if (data?.accessToken) {
      tokenStorage.set(data.accessToken);
    }
    return data;
  },

  /** Login existing user */
  login: async (payload: LoginPayload): Promise<AuthResponse> => {
    const data = await api<AuthResponse>('/auth/login', {
      method: 'POST',
      json: payload,
      skipAuth: true,
    });
    if (data?.accessToken) {
      tokenStorage.set(data.accessToken);
    }
    return data;
  },

  /** Refresh access token using HTTP-only cookie */
  refresh: async (): Promise<AuthResponse> => {
    const data = await api<AuthResponse>('/auth/refresh', {
      method: 'POST',
      skipAuth: true,
    });
    if (data?.accessToken) {
      tokenStorage.set(data.accessToken);
    }
    return data;
  },

  /** Logout current session */
  logout: async (): Promise<void> => {
    try {
      await api('/auth/logout', { method: 'POST', skipAuth: true });
    } finally {
      tokenStorage.clear();
    }
  },

  /** Check if user has an active token stored */
  isAuthenticated: (): boolean => tokenStorage.hasToken(),

  /** Get token */
  getToken: (): string | null => tokenStorage.get(),

  /** Set token manually */
  setToken: (token: string): void => tokenStorage.set(token),

  /** Clear token */
  clearToken: (): void => tokenStorage.clear(),
};

// -----------------------------------------------------------------------------
// 2. Profile API
// -----------------------------------------------------------------------------
export const profileApi = {
  /** Get current user's profile */
  get: async (): Promise<any> => {
    return api('/profile');
  },

  /** Update user profile */
  update: async (profile: any): Promise<any> => {
    return api('/profile', {
      method: 'PUT',
      json: profile,
    });
  },

  /** Upload CV (PDF or DOCX) for parsing & extraction */
  uploadCv: async (file: File): Promise<any> => {
    const formData = new FormData();
    formData.append('cv', file);
    return api('/profile/cv', {
      method: 'POST',
      body: formData,
    });
  },

  /** Mark a parsed profile field as verified */
  verify: async (fieldKey: string): Promise<any> => {
    return api('/profile/verify', {
      method: 'POST',
      json: { key: fieldKey },
    });
  },

  /** Add a monitored company career page */
  addCareerPage: async (url: string): Promise<any> => {
    return api('/profile/career-pages', {
      method: 'POST',
      json: { url },
    });
  },

  /** Remove a monitored career page */
  removeCareerPage: async (url: string): Promise<any> => {
    return api('/profile/career-pages', {
      method: 'DELETE',
      json: { url },
    });
  },
};

// -----------------------------------------------------------------------------
// 3. Jobs API
// -----------------------------------------------------------------------------
export interface ManualJobPayload {
  url: string;
  title: string;
  company: string;
  description: string;
  location?: string;
  remote?: boolean;
}

export const jobsApi = {
  /** List jobs with optional keyword search */
  list: async (params?: { q?: string; limit?: number; skip?: number }): Promise<{ jobs: any[]; total: number; count: number }> => {
    return api('/jobs', { params: params as any });
  },

  /** Add a manual job via URL paste */
  addManual: async (payload: ManualJobPayload): Promise<any> => {
    return api('/jobs/manual', {
      method: 'POST',
      json: payload,
    });
  },

  /** Import jobs via URL or file (PDF, CSV, XLSX, text) */
  importJobs: async (options: { url?: string; file?: File }): Promise<any> => {
    if (options.file) {
      const formData = new FormData();
      formData.append('file', options.file);
      if (options.url) formData.append('url', options.url);
      return api('/jobs/import', {
        method: 'POST',
        body: formData,
      });
    }
    return api('/jobs/import', {
      method: 'POST',
      json: { url: options.url },
    });
  },

  /** Get a job by ID */
  get: async (id: string): Promise<any> => {
    return api(`/jobs/${id}`);
  },
};

// -----------------------------------------------------------------------------
// 4. Applications API
// -----------------------------------------------------------------------------
export interface ApplicationListParams {
  status?: string;
  limit?: number;
  skip?: number;
}

export const applicationsApi = {
  /** List user applications */
  list: async (params?: ApplicationListParams): Promise<any> => {
    return api('/applications', { params: params as any });
  },

  /** Get application details */
  get: async (id: string): Promise<any> => {
    return api(`/applications/${id}`);
  },

  /** Update tailored CV or cover letter */
  updateDocuments: async (id: string, docs: { tailoredCv?: string; coverLetter?: string }): Promise<any> => {
    return api(`/applications/${id}/documents`, {
      method: 'PATCH',
      json: docs,
    });
  },

  /** Approve drafted application for submission */
  approve: async (id: string): Promise<any> => {
    return api(`/applications/${id}/approve`, { method: 'POST' });
  },

  /** Regenerate tailored documents with LLM */
  regenerate: async (id: string): Promise<any> => {
    return api(`/applications/${id}/regenerate`, { method: 'POST' });
  },

  /** Archive application */
  archive: async (id: string): Promise<any> => {
    return api(`/applications/${id}/archive`, { method: 'POST' });
  },

  /** Manually update status (e.g. Replied, Interview, Offer) */
  updateStatus: async (id: string, status: string): Promise<any> => {
    return api(`/applications/${id}/status`, {
      method: 'POST',
      json: { status },
    });
  },
};

// -----------------------------------------------------------------------------
// 5. Tasks API ("Needs You" Queue)
// -----------------------------------------------------------------------------
export interface AnswerTaskPayload {
  answer: string;
  saveToBank?: boolean;
}

export const tasksApi = {
  /** List pending tasks requiring user action */
  list: async (): Promise<any> => {
    return api('/tasks');
  },

  /** Provide an answer to an unblockable question */
  answer: async (id: string, payload: AnswerTaskPayload): Promise<any> => {
    return api(`/tasks/${id}/answer`, {
      method: 'POST',
      json: payload,
    });
  },

  /** Mark a manual application task as done */
  markDone: async (id: string): Promise<any> => {
    return api(`/tasks/${id}/done`, { method: 'POST' });
  },

  /** Retry failed form submission */
  retry: async (id: string): Promise<any> => {
    return api(`/tasks/${id}/retry`, { method: 'POST' });
  },

  /** Dismiss task */
  dismiss: async (id: string): Promise<any> => {
    return api(`/tasks/${id}/dismiss`, { method: 'POST' });
  },
};

// -----------------------------------------------------------------------------
// 6. Notifications API
// -----------------------------------------------------------------------------
export const notificationsApi = {
  /** List user notifications (optionally filtered by unread) */
  list: async (params?: { unread?: boolean; limit?: number }): Promise<any> => {
    const q = new URLSearchParams();
    if (params?.unread) q.set('unread', 'true');
    if (params?.limit) q.set('limit', String(params.limit));
    const qs = q.toString();
    return api(`/notifications${qs ? `?${qs}` : ''}`);
  },

  /** Get count of unread notifications for badge */
  getUnreadCount: async (): Promise<{ success: boolean; unreadCount: number }> => {
    return api('/notifications/unread-count');
  },

  /** Mark a single notification as read */
  markRead: async (id: string): Promise<any> => {
    return api(`/notifications/${id}/read`, { method: 'POST' });
  },

  /** Mark all notifications as read */
  markAllRead: async (): Promise<any> => {
    return api('/notifications/read-all', { method: 'POST' });
  },

  /** Delete a notification */
  delete: async (id: string): Promise<any> => {
    return api(`/notifications/${id}`, { method: 'DELETE' });
  },

  /** Clear all notifications */
  clearAll: async (): Promise<any> => {
    return api('/notifications', { method: 'DELETE' });
  },

  /** Dispatch a notification */
  create: async (data: { type: string; title: string; body: string; data?: any }): Promise<any> => {
    return api('/notifications', { method: 'POST', json: data });
  },
};

// -----------------------------------------------------------------------------
// 7. Me / Account API
// -----------------------------------------------------------------------------
export const meApi = {
  /** Download JSON export of all user data (GDPR / data portability) */
  exportData: async (): Promise<any> => {
    return api('/me/export');
  },

  /** Permanently delete account and all data */
  deleteAccount: async (password: string): Promise<void> => {
    await api('/me', {
      method: 'DELETE',
      json: { password },
    });
    tokenStorage.clear();
  },
};

// -----------------------------------------------------------------------------
// 8. Gmail Integration API
// -----------------------------------------------------------------------------
export const gmailApi = {
  /** Get OAuth URL to connect Gmail */
  connect: async (): Promise<{ url: string }> => {
    return api('/gmail/connect');
  },

  /** Disconnect connected Gmail account */
  disconnect: async (): Promise<void> => {
    return api('/gmail', { method: 'DELETE' });
  },
};

// -----------------------------------------------------------------------------
// 9. Business Mode API
// -----------------------------------------------------------------------------
export interface BusinessSearchParams {
  query: string;
  location?: string;
  lat?: number;
  lng?: number;
  radiusKm?: number;
}

export const businessApi = {
  /** Search businesses near location, scan presence, and qualify needs */
  search: async (params: BusinessSearchParams): Promise<any> => {
    return api('/business/search', {
      method: 'POST',
      json: params,
    });
  },

  /** List qualified business leads */
  list: async (stage?: string): Promise<any> => {
    return api('/business/leads', {
      params: stage ? { stage } : undefined,
    });
  },

  /** Get single business lead dossier */
  getLead: async (id: string): Promise<any> => {
    return api(`/business/leads/${id}`, {
      method: 'GET',
    });
  },

  /** Generate or re-synthesize tailored value pitch */
  generatePitch: async (id: string): Promise<any> => {
    return api(`/business/leads/${id}/pitch`, {
      method: 'POST',
    });
  },

  /** Launch multi-channel outreach sequence */
  startSequence: async (id: string): Promise<any> => {
    return api(`/business/leads/${id}/sequence/start`, {
      method: 'POST',
    });
  },

  /** Pause active outreach sequence */
  pauseSequence: async (id: string): Promise<any> => {
    return api(`/business/leads/${id}/sequence/pause`, {
      method: 'POST',
    });
  },

  /** Dismiss business lead */
  dismiss: async (id: string): Promise<any> => {
    return api(`/business/leads/${id}/dismiss`, {
      method: 'POST',
    });
  },
};

// -----------------------------------------------------------------------------
// 9. Analytics API
// -----------------------------------------------------------------------------
export const analyticsApi = {
  /** Get live conversion rates and funnel stages */
  getFunnel: async (): Promise<any> => {
    return api('/analytics/funnel', {
      method: 'GET',
    });
  },
};

// Export unified client object as default and named export
export const javiApi = {
  auth: authApi,
  profile: profileApi,
  jobs: jobsApi,
  applications: applicationsApi,
  tasks: tasksApi,
  notifications: notificationsApi,
  business: businessApi,
  analytics: analyticsApi,
  me: meApi,
  gmail: gmailApi,
};

export default api;
