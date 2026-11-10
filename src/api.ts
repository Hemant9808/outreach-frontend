export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

export async function api<T>(path: string, options: RequestInit = {}): Promise<T> {
  const headers = new Headers(options.headers);
  if (!(options.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

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

export type EmailSettings = {
  configured: boolean;
  hasPassword: boolean;
  host?: string;
  port?: number;
  secure?: boolean;
  username?: string;
  fromName?: string | null;
  fromEmail?: string | null;
  replyTo?: string | null;
  verifiedAt?: string | null;
  updatedAt?: string;
};

export const CONTACT_STATUSES = [
  'NEW',
  'CONTACTED',
  'REPLIED',
  'INTERVIEWING',
  'OFFER',
  'NOT_INTERESTED',
  'DO_NOT_CONTACT',
] as const;
export type ContactStatus = (typeof CONTACT_STATUSES)[number];

export const RECRUITER_TYPES = ['IN_HOUSE', 'AGENCY', 'FREELANCE', 'HIRING_MANAGER', 'UNKNOWN'] as const;
export type RecruiterType = (typeof RECRUITER_TYPES)[number];

export type Contact = {
  id: number;
  companyId: number | null;
  company: { id: number; name: string; domain: string | null } | null;
  name: string | null;
  email: string;
  phone: string | null;
  position: string | null;
  seniority: number | null;
  department: string | null;
  recruiterType: RecruiterType;
  hiringFor: string[];
  hiresForCompanies: string[];
  location: string | null;
  linkedin: string | null;
  tags: string[];
  notes: string | null;
  source: string | null;
  status: ContactStatus;
  contactCount: number;
  lastContactedAt: string | null;
  createdAt: string;
};

export type CompanySummary = {
  id: number;
  name: string;
  domain: string | null;
  industry: string | null;
  location: string | null;
  contactCount: number;
  contactedCount: number;
  repliedCount: number;
  lastContactedAt: string | null;
  hiringFor: string[];
};

export type McpSettings = {
  enabled: boolean;
  key: string | null;
  keySource: 'settings' | 'env' | null;
  publicUrl: string | null;
  lastUsedAt: string | null;
  tools?: { name: string; description: string; readOnly: boolean; destructive: boolean }[];
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
