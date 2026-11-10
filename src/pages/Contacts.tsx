import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  api,
  CONTACT_STATUSES,
  RECRUITER_TYPES,
  type CompanySummary,
  type Contact,
  type ContactStatus,
} from '../api';

type View = 'company' | 'list';

type Form = {
  name: string;
  email: string;
  phone: string;
  company: string;
  position: string;
  seniority: string;
  recruiterType: string;
  hiringFor: string;
  location: string;
  linkedin: string;
  status: ContactStatus;
  notes: string;
};

const EMPTY: Form = {
  name: '',
  email: '',
  phone: '',
  company: '',
  position: '',
  seniority: '',
  recruiterType: 'UNKNOWN',
  hiringFor: '',
  location: '',
  linkedin: '',
  status: 'NEW',
  notes: '',
};

const STATUS_FILTERS: { id: string; label: string }[] = [
  { id: 'ALL', label: 'All' },
  { id: 'NEW', label: 'New' },
  { id: 'CONTACTED', label: 'Contacted' },
  { id: 'REPLIED', label: 'Replied' },
  { id: 'INTERVIEWING', label: 'Interviewing' },
  { id: 'OFFER', label: 'Offer' },
  { id: 'NOT_INTERESTED', label: 'Not interested' },
  { id: 'DO_NOT_CONTACT', label: 'Do not contact' },
];

const STATUS_PILL: Record<ContactStatus, string> = {
  NEW: 'queued',
  CONTACTED: 'sent',
  REPLIED: 'ready',
  INTERVIEWING: 'ready',
  OFFER: 'completed',
  NOT_INTERESTED: 'stopped',
  DO_NOT_CONTACT: 'failed',
};

function label(value: string) {
  return value.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());
}

function toForm(c: Contact): Form {
  return {
    name: c.name || '',
    email: c.email,
    phone: c.phone || '',
    company: c.company?.name || '',
    position: c.position || '',
    seniority: c.seniority ? String(c.seniority) : '',
    recruiterType: c.recruiterType,
    hiringFor: c.hiringFor.join(', '),
    location: c.location || '',
    linkedin: c.linkedin || '',
    status: c.status,
    notes: c.notes || '',
  };
}

export function Contacts() {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [companies, setCompanies] = useState<CompanySummary[]>([]);
  const [view, setView] = useState<View>('company');
  const [status, setStatus] = useState('ALL');
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<number | 'new' | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setQuery(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  async function load() {
    try {
      const qs = new URLSearchParams({ status, sort: view === 'list' ? 'recent' : 'company' });
      if (query) qs.set('search', query);
      const [list, companyList] = await Promise.all([
        api<{ contacts: Contact[] }>(`/contacts?${qs}`),
        api<{ companies: CompanySummary[] }>('/companies'),
      ]);
      setContacts(list.contacts);
      setCompanies(companyList.companies);
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load contacts');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, [status, query, view]);

  const groups = useMemo(() => {
    const byCompany = new Map<string, { key: string; company: CompanySummary | null; contacts: Contact[] }>();
    for (const contact of contacts) {
      const key = contact.company ? String(contact.company.id) : 'none';
      if (!byCompany.has(key)) {
        byCompany.set(key, {
          key,
          company: companies.find((c) => c.id === contact.company?.id) || null,
          contacts: [],
        });
      }
      byCompany.get(key)!.contacts.push(contact);
    }
    return [...byCompany.values()].sort((a, b) =>
      a.key === 'none' ? 1 : b.key === 'none' ? -1 : (a.company?.name || '').localeCompare(b.company?.name || ''),
    );
  }, [contacts, companies]);

  function openNew() {
    setForm(EMPTY);
    setEditing('new');
  }

  function openEdit(contact: Contact) {
    setForm(toForm(contact));
    setEditing(contact.id);
  }

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    const payload = {
      name: form.name || null,
      email: form.email,
      phone: form.phone || null,
      company: form.company || null,
      position: form.position || null,
      seniority: form.seniority ? Number(form.seniority) : null,
      recruiterType: form.recruiterType,
      hiringFor: form.hiringFor
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      location: form.location || null,
      linkedin: form.linkedin || null,
      status: form.status,
      notes: form.notes || null,
      source: editing === 'new' ? 'manual' : undefined,
    };
    try {
      if (editing === 'new') {
        const res = await api<{ failed: { error: string }[] }>('/contacts', {
          method: 'POST',
          body: JSON.stringify({ contacts: [payload] }),
        });
        if (res.failed.length) throw new Error(res.failed[0].error);
      } else {
        await api(`/contacts/${editing}`, { method: 'PATCH', body: JSON.stringify(payload) });
      }
      setEditing(null);
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save contact');
    } finally {
      setSaving(false);
    }
  }

  async function changeStatus(contact: Contact, next: ContactStatus) {
    setBusyId(contact.id);
    try {
      await api(`/contacts/${contact.id}`, { method: 'PATCH', body: JSON.stringify({ status: next }) });
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update status');
    } finally {
      setBusyId(null);
    }
  }

  async function remove(contact: Contact) {
    if (!window.confirm(`Delete ${contact.name || contact.email}? Their past emails stay in Leads.`)) return;
    setBusyId(contact.id);
    try {
      await api(`/contacts/${contact.id}`, { method: 'DELETE' });
      await load();
    } finally {
      setBusyId(null);
    }
  }

  function rows(list: Contact[], showCompany: boolean) {
    return list.map((c) => (
      <tr key={c.id}>
        <td data-label="Contact">
          <strong>{c.name || c.email.split('@')[0]}</strong>
          <small className="muted">
            {c.position || 'Position unknown'}
            {showCompany && c.company ? ` · ${c.company.name}` : ''}
          </small>
          {c.recruiterType !== 'UNKNOWN' && <div><span className="pill">{label(c.recruiterType)}</span></div>}
        </td>
        <td data-label="Reach">
          <a href={`mailto:${c.email}`}>{c.email}</a>
          {c.phone && <div><a href={`tel:${c.phone.replace(/\s+/g, '')}`}>{c.phone}</a></div>}
          {c.linkedin && (
            <div>
              <a href={c.linkedin} target="_blank" rel="noreferrer">
                LinkedIn
              </a>
            </div>
          )}
        </td>
        <td data-label="Seniority">
          {c.seniority ? <span className="seniority" title="Seniority 1-10">{c.seniority}/10</span> : <span className="muted">—</span>}
        </td>
        <td data-label="Hires for">
          <div className="tag-list">
            {c.hiringFor.length ? c.hiringFor.map((role) => <span key={role} className="tag">{role}</span>) : <span className="muted">—</span>}
          </div>
        </td>
        <td data-label="Status">
          <select
            className={`status-select ${STATUS_PILL[c.status]}`}
            value={c.status}
            disabled={busyId === c.id}
            onChange={(e) => void changeStatus(c, e.target.value as ContactStatus)}
          >
            {CONTACT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {label(s)}
              </option>
            ))}
          </select>
          <small className="muted">
            {c.contactCount
              ? `${c.contactCount} email${c.contactCount > 1 ? 's' : ''}, last ${new Date(c.lastContactedAt!).toLocaleDateString()}`
              : 'Never emailed'}
          </small>
        </td>
        <td data-label="Actions">
          <div className="actions">
            <button type="button" className="btn ghost" onClick={() => openEdit(c)}>
              Edit
            </button>
            <button type="button" className="btn ghost danger" disabled={busyId === c.id} onClick={() => void remove(c)}>
              Delete
            </button>
          </div>
        </td>
      </tr>
    ));
  }

  function table(list: Contact[], showCompany: boolean) {
    return (
      <table className="leads-table contacts-table">
        <thead>
          <tr>
            <th>Contact</th>
            <th>Reach</th>
            <th>Seniority</th>
            <th>Hires for</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>{rows(list, showCompany)}</tbody>
      </table>
    );
  }

  return (
    <section className="wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">Directory</p>
          <h1>Contacts</h1>
          <p className="muted">
            {contacts.length} contacts · {companies.length} companies. Every HR email from a batch lands here.
          </p>
        </div>
        <button type="button" className="btn" onClick={openNew}>
          Add contact
        </button>
      </header>

      <div className="filters">
        <div className="filter-row">
          <input
            className="contact-search"
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search name, email, company, position…"
            aria-label="Search contacts"
          />
          <div className="segmented" role="radiogroup" aria-label="View">
            {(['company', 'list'] as View[]).map((v) => (
              <button
                key={v}
                type="button"
                role="radio"
                aria-checked={view === v}
                className={view === v ? 'on' : ''}
                onClick={() => setView(v)}
              >
                {v === 'company' ? 'By company' : 'All contacts'}
              </button>
            ))}
          </div>
        </div>
        <div className="filter-row">
          {STATUS_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${status === item.id ? 'on' : ''}`}
              onClick={() => setStatus(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {error && <p className="error">{error}</p>}

      {editing !== null && (
        <form className="panel contact-form" onSubmit={onSave}>
          <h2>{editing === 'new' ? 'Add contact' : 'Edit contact'}</h2>
          <div className="field-grid three">
            <div className="field">
              <label htmlFor="c-name">Name</label>
              <input id="c-name" value={form.name} onChange={(e) => set('name', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="c-email">Email *</label>
              <input id="c-email" type="email" required value={form.email} onChange={(e) => set('email', e.target.value)} />
            </div>
            <div className="field">
              <label htmlFor="c-phone">Phone</label>
              <input id="c-phone" value={form.phone} onChange={(e) => set('phone', e.target.value)} placeholder="+91 …" />
            </div>
            <div className="field">
              <label htmlFor="c-company">Company</label>
              <input
                id="c-company"
                list="company-options"
                value={form.company}
                onChange={(e) => set('company', e.target.value)}
                placeholder="Official name, e.g. Talent Socio"
              />
              <datalist id="company-options">
                {companies.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>
            <div className="field">
              <label htmlFor="c-position">Position</label>
              <input id="c-position" value={form.position} onChange={(e) => set('position', e.target.value)} placeholder="Talent Acquisition Lead" />
            </div>
            <div className="field">
              <label htmlFor="c-seniority">Seniority (1-10)</label>
              <select id="c-seniority" value={form.seniority} onChange={(e) => set('seniority', e.target.value)}>
                <option value="">Unknown</option>
                {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-type">Recruiter type</label>
              <select id="c-type" value={form.recruiterType} onChange={(e) => set('recruiterType', e.target.value)}>
                {RECRUITER_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {label(t)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-status">Status</label>
              <select id="c-status" value={form.status} onChange={(e) => set('status', e.target.value as ContactStatus)}>
                {CONTACT_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {label(s)}
                  </option>
                ))}
              </select>
            </div>
            <div className="field">
              <label htmlFor="c-location">Location</label>
              <input id="c-location" value={form.location} onChange={(e) => set('location', e.target.value)} />
            </div>
            <div className="field span-2">
              <label htmlFor="c-hiring">Hires for (comma separated)</label>
              <input
                id="c-hiring"
                value={form.hiringFor}
                onChange={(e) => set('hiringFor', e.target.value)}
                placeholder="Backend Engineer, SDE 2, DevOps"
              />
            </div>
            <div className="field">
              <label htmlFor="c-linkedin">LinkedIn</label>
              <input id="c-linkedin" value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} />
            </div>
            <div className="field span-3">
              <label htmlFor="c-notes">Notes</label>
              <textarea id="c-notes" rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
            </div>
          </div>
          <div className="actions">
            <button type="submit" disabled={saving || !form.email}>
              {saving ? 'Saving…' : 'Save contact'}
            </button>
            <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
              Cancel
            </button>
          </div>
        </form>
      )}

      {loading && <div className="panel skeleton" style={{ height: 320 }} />}

      {!loading && contacts.length === 0 && !error && (
        <div className="panel empty">
          <h2>No contacts here</h2>
          <p>Contacts are saved automatically from every batch, or ask Claude to “save these HR contacts”.</p>
        </div>
      )}

      {!loading && contacts.length > 0 && view === 'list' && <div className="table-wrap panel">{table(contacts, true)}</div>}

      {!loading &&
        contacts.length > 0 &&
        view === 'company' &&
        groups.map((group) => (
          <div key={group.key} className="panel company-group">
            <div className="company-head">
              <div>
                <h2>{group.company?.name || 'No company'}</h2>
                <small className="muted">
                  {[group.company?.domain, group.company?.industry, group.company?.location].filter(Boolean).join(' · ')}
                </small>
              </div>
              {group.company && (
                <div className="company-stats">
                  <span>
                    <strong>{group.company.contactCount}</strong> HR
                  </span>
                  <span>
                    <strong>{group.company.contactedCount}</strong> emailed
                  </span>
                  <span>
                    <strong>{group.company.repliedCount}</strong> replied
                  </span>
                </div>
              )}
            </div>
            <div className="table-wrap">{table(group.contacts, false)}</div>
          </div>
        ))}
    </section>
  );
}
