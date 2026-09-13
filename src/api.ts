const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export function getToken() {
  return localStorage.getItem('token');
}

export function setToken(token: string | null) {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
}

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  const token = getToken();
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message = data.message || data.error || 'Request failed';
    throw new Error(Array.isArray(message) ? message.join(', ') : message);
  }
  return data as T;
}

export type User = {
  id: number;
  email: string;
  name: string;
  phone?: string | null;
  title?: string | null;
  skills?: string | null;
  about?: string | null;
  linkedin?: string | null;
  resumeUrl?: string | null;
  resumeFilename?: string | null;
  timezone?: string;
};

export type CampaignListItem = {
  id: number;
  status: string;
  sendMode: string;
  scheduledAt: string | null;
  recurrenceIntervalDays: number | null;
  maxSends: number;
  error: string | null;
  createdAt: string;
  uploadCount: number;
  leadCount: number;
  emailCount: number;
  sentCount: number;
};

export type Schedule = {
  id: number;
  nextRunAt: string;
  sendCount: number;
  maxSends: number;
  active: boolean;
  intervalDays: number | null;
};

export type Lead = {
  id: number;
  hrName: string | null;
  hrEmail: string | null;
  company: string | null;
  role: string | null;
  jdSummary: string | null;
  subject: string | null;
  body: string | null;
  status: string;
  kind?: 'recurring' | 'one_time';
  stopped?: boolean;
  schedule?: Schedule | null;
  campaign?: { id: number; sendMode: string };
  schedules: Schedule[];
  logs: { id: number; sentAt: string; status: string; error: string | null }[];
};

export type CampaignDetail = {
  id: number;
  status: string;
  sendMode: string;
  scheduledAt: string | null;
  recurrenceIntervalDays: number | null;
  maxSends: number;
  error: string | null;
  createdAt: string;
  uploads: { id: number; url: string; originalName: string; mimeType: string }[];
  leads: Lead[];
};
