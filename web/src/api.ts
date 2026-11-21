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

/** Number of steps in the profile setup wizard (pages/profile-setup). */
export const SETUP_STEP_COUNT = 9;

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

/**
 * Candidate Authentication & Onboarding State Storage
 * Tracks user details and exact funnel progress (otp_pending -> profile_setup -> completed)
 */
export const authStateStorage = {
  getLastName: (): string => {
    try {
      return localStorage.getItem('javi_last_name') || localStorage.getItem('javi_user_name') || '';
    } catch {
      return '';
    }
  },
  setLastName: (name: string): void => {
    try {
      if (name) {
        localStorage.setItem('javi_last_name', name);
        localStorage.setItem('javi_user_name', name);
      }
    } catch {}
  },
  getLastEmail: (): string => {
    try {
      return localStorage.getItem('javi_last_email') || '';
    } catch {
      return '';
    }
  },
  setLastEmail: (email: string): void => {
    try {
      if (email) localStorage.setItem('javi_last_email', email);
    } catch {}
  },
  getStage: (): string => {
    try {
      return localStorage.getItem('javi_onboarding_stage') || 'otp_pending';
    } catch {
      return 'otp_pending';
    }
  },
  setStage: (stage: 'otp_pending' | 'profile_setup' | 'completed'): void => {
    try {
      localStorage.setItem('javi_onboarding_stage', stage);
    } catch {}
  },
  getSetupStep: (): number => {
    try {
      const s = parseInt(localStorage.getItem('javi_setup_step') || '1', 10);
      return s >= 1 && s <= SETUP_STEP_COUNT ? s : 1;
    } catch {
      return 1;
    }
  },
  setSetupStep: (step: number): void => {
    try {
      localStorage.setItem('javi_setup_step', String(step));
    } catch {}
  },
  saveSession: (user?: { name?: string; email?: string; onboardingStage?: string }): void => {
    if (user?.name) authStateStorage.setLastName(user.name);
    if (user?.email) authStateStorage.setLastEmail(user.email);
    if (user?.onboardingStage) authStateStorage.setStage(user.onboardingStage as any);
  },
};

/**
 * Route candidate to their exact position in the funnel
 */
export function getRouteForStage(stage?: string, email?: string, name?: string): string {
  if (stage === 'otp_pending') {
    const q = email ? `?email=${encodeURIComponent(email)}${name ? `&name=${encodeURIComponent(name)}` : ''}` : '';
    return `/verify-otp${q}`;
  }
  if (stage === 'profile_setup') {
    return '/setup';
  }
  return '/dash';
}

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

  // Attach Bearer token if available (supports local JWT & Clerk sessions)
  let token = tokenStorage.get();
  if (!token && typeof window !== 'undefined' && (window as any).Clerk?.session) {
    try {
      token = await (window as any).Clerk.session.getToken();
      if (token) {
        tokenStorage.set(token);
      }
    } catch {
      // Ignore
    }
  }
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
  ok?: boolean;
  stage?: string;
  message?: string;
  email?: string;
  user?: {
    id: string;
    email: string;
    name?: string;
    onboardingStage?: string;
    isEmailVerified?: boolean;
    profileImage?: string;
  };
}

export interface VerifyOtpPayload {
  email: string;
  otp: string;
}

export const authApi = {
  /** Register a new user and trigger OTP email */
  register: async (payload: RegisterPayload): Promise<AuthResponse> => {
    const data = await api<AuthResponse>('/auth/register', {
      method: 'POST',
      json: payload,
      skipAuth: true,
    });
    if (payload.name) authStateStorage.setLastName(payload.name);
    if (payload.email) authStateStorage.setLastEmail(payload.email);
    authStateStorage.setStage('otp_pending');
    if (data?.accessToken && data?.stage !== 'otp_pending') {
      tokenStorage.set(data.accessToken);
    }
    return data;
  },

  /** Verify OTP code sent to user email */
  verifyOtp: async (payload: VerifyOtpPayload): Promise<AuthResponse> => {
    const data = await api<AuthResponse>('/auth/verify-otp', {
      method: 'POST',
      json: payload,
      skipAuth: true,
    });
    if (data?.accessToken) {
      tokenStorage.set(data.accessToken);
    }
    if (data?.user) {
      authStateStorage.saveSession(data.user);
    } else {
      authStateStorage.setStage('profile_setup');
    }
    return data;
  },

  /** Resend verification OTP code */
  resendOtp: async (email: string): Promise<{ ok: boolean; message: string }> => {
    return api<{ ok: boolean; message: string }>('/auth/resend-otp', {
      method: 'POST',
      json: { email },
      skipAuth: true,
    });
  },

  /** Request password reset email */
  forgotPassword: async (email: string): Promise<{ ok: boolean; message: string }> => {
    return api<{ ok: boolean; message: string }>('/auth/forgot-password', {
      method: 'POST',
      json: { email },
      skipAuth: true,
    });
  },

  /** Submit OTP and new password */
  resetPassword: async (email: string, otp: string, newPassword?: string): Promise<{ ok: boolean; message: string }> => {
    return api<{ ok: boolean; message: string }>('/auth/reset-password', {
      method: 'POST',
      json: { email, otp, newPassword },
      skipAuth: true,
    });
  },

  /** Get authenticated user profile & onboarding stage */
  getMe: async (): Promise<{
    id: string;
    email: string;
    name?: string;
    isEmailVerified?: boolean;
    onboardingStage?: string;
    profileImage?: string;
  }> => {
    return api('/auth/me');
  },

  /** Update current onboarding stage */
  updateOnboardingStage: async (stage: 'otp_pending' | 'profile_setup' | 'completed'): Promise<{ ok: boolean; stage: string }> => {
    authStateStorage.setStage(stage);
    return api('/auth/onboarding-stage', {
      method: 'PUT',
      json: { stage },
    });
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
    if (data?.user) {
      authStateStorage.saveSession(data.user);
    }
    return data;
  },

  /** Google OAuth authentication (creates or logs in user, verifies email, issues JWT) */
  googleLogin: async (payload: { email: string; name?: string; avatarUrl?: string }): Promise<AuthResponse> => {
    const data = await api<AuthResponse>('/auth/google', {
      method: 'POST',
      json: payload,
      skipAuth: true,
    });
    if (data?.accessToken) {
      tokenStorage.set(data.accessToken);
    }
    if (data?.user) {
      authStateStorage.saveSession(data.user);
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
      skipAuth: !tokenStorage.hasToken(),
    });
  },

  /**
   * Mark the profile verified. The server checks required fields and, on a 422, returns
   * `details.missing` (labels of what's still empty).
   */
  verify: async (): Promise<{ status: 'verified'; queuedDrafts: number }> => {
    return api('/profile/verify', { method: 'POST' });
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

  /**
   * Apply to one or many links. Each is saved as a job (JS pages rendered), tailored, and applied
   * to in the JAVI browser, following the profile's approval rules.
   */
  addLinks: async (urls: string[]): Promise<{
    count: number;
    queued: number;
    results: Array<{ url: string; status: 'queued' | 'already_added' | 'failed'; title?: string; company?: string; error?: string }>;
  }> => {
    return api('/jobs/links', { method: 'POST', json: { urls } });
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
// 9. Business Mode API (leads from OpenStreetMap / CSV / manual, audit, quote, pitch)
// -----------------------------------------------------------------------------
export type LeadStatus = 'new' | 'contacted' | 'replied' | 'call_booked' | 'won' | 'lost';
export type Vertical = 'restaurant' | 'salon' | 'clinic' | 'shop' | 'school' | 'real_estate' | 'other';
export type TierId = 'good' | 'better' | 'best';

export interface LeadContact { kind: string; value: string; name?: string; isBusinessLine?: boolean }
export interface AuditFinding { id: string; title: string; evidence: string; howToCheck: string; severity: 'high' | 'medium' | 'low'; offer?: string }
export interface QuoteTier { tier: TierId; setup: number; monthly: number; includes: string[]; recommended?: boolean }
export interface LeadQuote {
  offer: string;
  tiers: QuoteTier[];
  floor: { setup: number; monthly: number };
  cost: { setup: number; monthly: number };
  monthlyValue?: number;
  warnings: string[];
  paymentOptions: Array<{ id: string; label: string; detail: string }>;
}
export interface LeadPitch { id: string; variant: 'observation' | 'question' | 'proof'; channel: 'email' | 'whatsapp'; subject?: string; body: string; waLink?: string; polished?: boolean; createdAt: string }
export interface BusinessLead {
  _id: string;
  status: LeadStatus;
  source: 'osm' | 'csv' | 'manual' | 'referral';
  osmId?: string;
  referredBy?: string;
  name: string;
  vertical: Vertical;
  category?: string;
  area?: string;
  address?: string;
  location?: { lat: number; lng: number };
  website?: string;
  openingHours?: string;
  contacts: LeadContact[];
  consent?: { given: boolean; at?: string; channel?: string; note?: string };
  valueInputs: Record<string, number>;
  audit?: { ranAt: string; url?: string; reachable?: boolean; findings: AuditFinding[]; error?: string };
  quote?: LeadQuote;
  pitches: LeadPitch[];
  notes: Array<{ text: string; at: string }>;
  lostReason?: string;
  deal?: { offer: string; tier: TierId; setup: number; monthly: number; startedAt: string };
  updatedAt?: string;
}
export interface ValueEstimate { monthly: number; parts: Array<{ label: string; monthly: number; formula: string }>; assumptions: string[]; sentence: string; missing: string[] }
export interface CatalogVertical {
  id: Vertical;
  label: string;
  primaryOffer: string;
  primaryLabel: string;
  valueInputs: Array<{ id: string; label: string; unit: string; default?: number; ownerNumber: boolean }>;
}
export interface BusinessServicesProfile {
  brandName?: string;
  city?: string;
  publicPhone?: string;
  publicEmail?: string;
  physicalAddress?: string;
  hourlyRate: number;
  fxRate: number;
  marginPct: number;
  monthlyIncomeTarget?: number;
  guarantees: { ownership: boolean; liveByDays?: number };
  capacityPerMonth?: number | null;
  caseStudies: Array<{ name: string; vertical?: string; offer?: string; result: string; url?: string; permissionToShare: boolean }>;
}

export const businessApi = {
  catalog: (): Promise<{ verticals: CatalogVertical[]; offers: Array<{ id: string; label: string; fixes: string }> }> => api('/business/catalog'),
  getServices: (): Promise<BusinessServicesProfile> => api('/business/services'),
  saveServices: (body: Partial<BusinessServicesProfile>): Promise<BusinessServicesProfile> => api('/business/services', { method: 'PUT', json: body }),

  /** OpenStreetMap search by business type and area. Public servers can take up to a minute or two. */
  search: (vertical: Vertical, area: string, radiusM?: number): Promise<{ added: number; cached: boolean; leads: BusinessLead[]; center: { lat: number; lng: number; label: string }; attribution: string }> =>
    api('/business/leads/search', { method: 'POST', json: { vertical, area, radiusM } }),
  importLeads: (file: File): Promise<{ created: number; skipped: string[] }> => {
    const fd = new FormData();
    fd.append('file', file);
    return api('/business/leads/import', { method: 'POST', body: fd });
  },
  add: (body: { name: string; vertical: Vertical; area?: string; website?: string; contacts?: LeadContact[]; referredBy?: string; consent?: { given: boolean; channel?: string; note?: string } }): Promise<BusinessLead> =>
    api('/business/leads', { method: 'POST', json: body }),
  list: (filter?: { status?: LeadStatus; vertical?: Vertical }): Promise<{ leads: BusinessLead[] }> => api('/business/leads', { params: filter }),
  get: (id: string): Promise<{ lead: BusinessLead; value: ValueEstimate | null }> => api(`/business/leads/${id}`),
  patch: (id: string, body: { valueInputs?: Record<string, number>; note?: string; consent?: { given: boolean; channel?: string; note?: string }; contacts?: LeadContact[]; vertical?: Vertical; website?: string }): Promise<{ lead: BusinessLead; value: ValueEstimate | null }> =>
    api(`/business/leads/${id}`, { method: 'PATCH', json: body }),
  remove: (id: string): Promise<void> => api(`/business/leads/${id}`, { method: 'DELETE' }),
  audit: (id: string): Promise<BusinessLead> => api(`/business/leads/${id}/audit`, { method: 'POST' }),
  quote: (id: string, offer?: string): Promise<{ lead: BusinessLead; value: ValueEstimate | null }> => api(`/business/leads/${id}/quote`, { method: 'POST', json: { offer } }),
  pitch: (id: string, variant: LeadPitch['variant'], channel: LeadPitch['channel'], polish = false): Promise<{ lead: BusinessLead; pitch: LeadPitch }> =>
    api(`/business/leads/${id}/pitch`, { method: 'POST', json: { variant, channel, polish } }),
  scripts: (id: string): Promise<{ call: string[]; walkIn: string[]; objections: Array<{ objection: string; answer: string }>; takeaway: string; capacityNote?: string }> =>
    api(`/business/leads/${id}/scripts`),
  move: (id: string, to: LeadStatus, extra: { note?: string; lostReason?: string; deal?: { tier: TierId; setup?: number; monthly?: number } } = {}): Promise<BusinessLead> =>
    api(`/business/leads/${id}/status`, { method: 'POST', json: { to, ...extra } }),
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

// -----------------------------------------------------------------------------
// 10. Diagnostic & Automated Tests API (Form Auto-Fill & WhatsApp Alerts)
// -----------------------------------------------------------------------------
export const testApi = {
  /** Tests candidate form mapping (LinkedIn, ATS fields, contacts, PDF resume) */
  testFormFill: async (): Promise<any> => {
    return api('/test/form-fill', { method: 'POST' });
  },
  /** Sends live WhatsApp alert to contact number with multi-provider fallback */
  testWhatsApp: async (payload: { phone?: string; message?: string; type?: string } = {}): Promise<any> => {
    return api('/test/whatsapp', { method: 'POST', json: payload });
  },
  /** Runs end-to-end simulated form submission and sends confirmation WhatsApp alert */
  testE2EApply: async (): Promise<any> => {
    return api('/test/e2e-apply', { method: 'POST' });
  },
  /** Executes complete LLM CV tailoring (e.g. Stripe Payments), custom questions, form autofill, and WhatsApp dispatch */
  testStripeTailoredApply: async (): Promise<any> => {
    return api('/test/stripe-tailored-apply', { method: 'POST' });
  },
};

// -----------------------------------------------------------------------------
// 10b. Reply links (public): the page a WhatsApp "Answer here" link opens
// -----------------------------------------------------------------------------
export interface PublicTask {
  id: string;
  reason: string;
  message: string;
  status: 'open' | 'answered' | 'done' | 'dismissed';
  live: boolean;
  questions: Array<{ key: string; label: string; type: string; options?: string[]; required: boolean; suggested?: string; isSalary?: boolean }>;
  jobTitle?: string;
  company?: string;
  openUrl?: string;
}

export const replyApi = {
  get: (token: string): Promise<PublicTask> => api(`/reply/${encodeURIComponent(token)}`, { skipAuth: true }),
  send: (token: string, action: 'answer' | 'continue' | 'submitted', answers?: Record<string, string>): Promise<PublicTask> =>
    api(`/reply/${encodeURIComponent(token)}`, { method: 'POST', json: { action, answers }, skipAuth: true }),
};

// -----------------------------------------------------------------------------
// 11. Taxonomy API (Dynamic Roles, Industries, Skills & Locations)
// -----------------------------------------------------------------------------
export const taxonomyApi = {
  getRoles: async (query?: string, category?: string): Promise<{ roles: any[]; count: number }> => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    if (category) params.set('category', category);
    const qs = params.toString();
    return api(`/taxonomy/roles${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getIndustries: async (query?: string): Promise<{ industries: any[]; count: number }> => {
    const params = new URLSearchParams();
    if (query) params.set('query', query);
    const qs = params.toString();
    return api(`/taxonomy/industries${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getLocations: async (region?: string, query?: string): Promise<{ locations: any[]; count: number }> => {
    const params = new URLSearchParams();
    if (region) params.set('region', region);
    if (query) params.set('query', query);
    const qs = params.toString();
    return api(`/taxonomy/locations${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  getSkills: async (headline?: string, role?: string, query?: string): Promise<{
    headline: string;
    targetRole: string;
    skills: string[];
    suggestedHeadlines: string[];
  }> => {
    const params = new URLSearchParams();
    if (headline) params.set('headline', headline);
    if (role) params.set('role', role);
    if (query) params.set('query', query);
    const qs = params.toString();
    return api(`/taxonomy/skills${qs ? `?${qs}` : ''}`, { method: 'GET' });
  },

  /** Several target roles at once; suggestions are merged across them. */
  getSkillsForRoles: async (roles: string[], headline?: string): Promise<{
    targetRoles: string[];
    skills: string[];
    suggestedHeadlines: string[];
  }> => {
    return api('/taxonomy/skills', { method: 'GET', params: { roles: roles.join(','), headline } });
  },

  /** Searchable skill catalog (name or alias), max 50 results. */
  getSkillCatalog: async (query?: string, category?: string): Promise<{
    skills: Array<{ id: string; name: string; category: string; aliases: string[] }>;
    categories: string[];
    count: number;
  }> => {
    return api('/taxonomy/skills/catalog', { method: 'GET', params: { query, category } });
  },

  /** Job fields: role categories with their roles, plus industries. */
  getFields: async (): Promise<{
    fields: Array<{ category: string; roles: Array<{ id: string; name: string; slug: string }> }>;
    industries: Array<{ id: string; name: string; slug: string; description: string }>;
  }> => {
    return api('/taxonomy/fields', { method: 'GET' });
  },

  requestOption: async (payload: {
    role_name?: string;
    industry_name?: string;
    skill_name?: string;
    context?: string;
    email?: string;
  }): Promise<{ success: boolean; message: string; item: any }> => {
    return api('/taxonomy/request', { method: 'POST', json: payload });
  },
};

// Export unified client object as default and named export
export const javiApi = {
  auth: authApi,
  profile: profileApi,
  taxonomy: taxonomyApi,
  jobs: jobsApi,
  applications: applicationsApi,
  tasks: tasksApi,
  notifications: notificationsApi,
  business: businessApi,
  analytics: analyticsApi,
  me: meApi,
  gmail: gmailApi,
  test: testApi,
};

export default api;
