import { FormEvent, useEffect, useMemo, useState } from 'react';
import { api, type EmailSettings as Saved } from '../../api';

type Form = {
  host: string;
  port: string;
  secure: boolean;
  username: string;
  password: string;
  fromName: string;
  fromEmail: string;
  replyTo: string;
};

type Preset = { id: string; label: string; host: string; port: number; secure: boolean; help?: string };

const PRESETS: Preset[] = [
  {
    id: 'gmail',
    label: 'Gmail',
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    help: 'Use a Google App Password (Google Account → Security → App passwords). 2-Step Verification must be on.',
  },
  { id: 'outlook', label: 'Outlook / 365', host: 'smtp.office365.com', port: 587, secure: false },
  { id: 'zoho', label: 'Zoho', host: 'smtp.zoho.in', port: 465, secure: true },
  { id: 'custom', label: 'Custom', host: '', port: 587, secure: false },
];

const EMPTY: Form = {
  host: '',
  port: '587',
  secure: false,
  username: '',
  password: '',
  fromName: '',
  fromEmail: '',
  replyTo: '',
};

function toForm(s: Saved): Form {
  if (!s.configured) return EMPTY;
  return {
    host: s.host || '',
    port: String(s.port || 587),
    secure: Boolean(s.secure),
    username: s.username || '',
    password: '',
    fromName: s.fromName || '',
    fromEmail: s.fromEmail || '',
    replyTo: s.replyTo || '',
  };
}

function presetFor(host: string) {
  return PRESETS.find((p) => p.host && p.host === host)?.id || (host ? 'custom' : 'gmail');
}

export function EmailSettings() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [form, setForm] = useState<Form>(EMPTY);
  const [preset, setPreset] = useState('gmail');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testTo, setTestTo] = useState('');
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api<Saved>('/settings/email')
      .then((s) => {
        setSaved(s);
        const next = toForm(s);
        setForm(next.host ? next : { ...EMPTY, host: PRESETS[0].host });
        setPreset(presetFor(next.host || PRESETS[0].host));
      })
      .catch((err) => setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not load settings' }))
      .finally(() => setLoading(false));
  }, []);

  const savedForm = useMemo(() => (saved ? toForm(saved) : EMPTY), [saved]);
  const dirty = (Object.keys(form) as (keyof Form)[]).some((k) => form[k] !== savedForm[k]);
  const activePreset = PRESETS.find((p) => p.id === preset);

  function set<K extends keyof Form>(key: K, value: Form[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function choosePreset(p: Preset) {
    setPreset(p.id);
    if (p.id === 'custom') return;
    setForm((prev) => ({ ...prev, host: p.host, port: String(p.port), secure: p.secure }));
  }

  function payload() {
    return { ...form, port: Number(form.port), password: form.password || undefined };
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setNotice(null);
    setSaving(true);
    try {
      const s = await api<Saved>('/settings/email', { method: 'PUT', body: JSON.stringify(payload()) });
      setSaved(s);
      setForm(toForm(s));
      setNotice({ kind: 'ok', text: 'Email settings saved. Send a test email to confirm they work.' });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save' });
    } finally {
      setSaving(false);
    }
  }

  async function onTest() {
    setNotice(null);
    setTesting(true);
    try {
      const body = dirty ? { ...payload(), sendTo: testTo } : { sendTo: testTo };
      const res = await api<{ ok: boolean; sentTo?: string; error?: string; stage?: string }>('/settings/email/test', {
        method: 'POST',
        body: JSON.stringify(body),
      });
      if (res.ok) {
        setNotice({ kind: 'ok', text: `Test email sent to ${res.sentTo}. Check the inbox (and spam).` });
        if (!dirty) setSaved(await api<Saved>('/settings/email'));
      } else {
        setNotice({
          kind: 'error',
          text: `${res.stage === 'send' ? 'Connected, but sending failed' : 'Connection failed'}: ${res.error}`,
        });
      }
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setTesting(false);
    }
  }

  async function onRemove() {
    if (!window.confirm('Remove saved email credentials? Sending will stop until you add new ones.')) return;
    const s = await api<Saved>('/settings/email', { method: 'DELETE' });
    setSaved(s);
    setForm({ ...EMPTY, host: PRESETS[0].host });
    setPreset('gmail');
    setNotice({ kind: 'ok', text: 'Email credentials removed.' });
  }

  if (loading) return <div className="panel skeleton" style={{ height: 480 }} />;

  const status = !saved?.configured
    ? { cls: 'off', text: 'Not configured' }
    : saved.verifiedAt
      ? { cls: 'on', text: `Verified ${new Date(saved.verifiedAt).toLocaleDateString()}` }
      : { cls: 'warn', text: 'Saved, not tested' };

  return (
    <form className="panel profile-form" onSubmit={onSave} noValidate>
      <div className="settings-head">
        <div>
          <h2>Email sending</h2>
          <p className="muted">The SMTP account your cold emails are sent from. The password is stored encrypted.</p>
        </div>
        <span className={`status-dot ${status.cls}`}>{status.text}</span>
      </div>

      {notice && (
        <div className={`toast ${notice.kind} inset`} role="status">
          {notice.text}
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => setNotice(null)}>
            ×
          </button>
        </div>
      )}

      <div className="form-section">
        <div className="section-intro">
          <h2>Provider</h2>
          <p className="muted">Pick a preset or enter your own server.</p>
        </div>
        <div className="field-grid">
          <div className="field span-2">
            <div className="segmented" role="radiogroup" aria-label="Email provider">
              {PRESETS.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={preset === p.id}
                  className={preset === p.id ? 'on' : ''}
                  onClick={() => choosePreset(p)}
                >
                  {p.label}
                </button>
              ))}
            </div>
            {activePreset?.help && <p className="callout">{activePreset.help}</p>}
          </div>
          <div className="field">
            <label htmlFor="es-host">SMTP host *</label>
            <input
              id="es-host"
              value={form.host}
              onChange={(e) => {
                set('host', e.target.value);
                setPreset('custom');
              }}
              placeholder="smtp.example.com"
              autoComplete="off"
            />
          </div>
          <div className="field">
            <label htmlFor="es-port">Port *</label>
            <input
              id="es-port"
              inputMode="numeric"
              value={form.port}
              onChange={(e) => {
                const port = e.target.value.replace(/\D/g, '').slice(0, 5);
                set('port', port);
                if (port === '465') set('secure', true);
                if (port === '587' || port === '25') set('secure', false);
              }}
            />
          </div>
          <div className="field span-2">
            <label className="switch">
              <input type="checkbox" checked={form.secure} onChange={(e) => set('secure', e.target.checked)} />
              <span className="switch-track" aria-hidden />
              <span>
                Use SSL/TLS
                <small className="muted"> — on for port 465. Port 587 uses STARTTLS automatically.</small>
              </span>
            </label>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="section-intro">
          <h2>Credentials</h2>
          <p className="muted">Usually your full email address and an app password.</p>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="es-user">Username *</label>
            <input
              id="es-user"
              value={form.username}
              onChange={(e) => set('username', e.target.value)}
              placeholder="you@gmail.com"
              autoComplete="username"
            />
          </div>
          <div className="field">
            <label htmlFor="es-pass">Password {saved?.hasPassword ? '' : '*'}</label>
            <div className="input-affix">
              <input
                id="es-pass"
                type={showPassword ? 'text' : 'password'}
                value={form.password}
                onChange={(e) => set('password', e.target.value)}
                placeholder={saved?.hasPassword ? '•••••••• (saved — leave blank to keep)' : 'App password'}
                autoComplete="new-password"
              />
              <button type="button" className="affix-btn" onClick={() => setShowPassword((v) => !v)}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="section-intro">
          <h2>Sender</h2>
          <p className="muted">What recipients see in their inbox.</p>
        </div>
        <div className="field-grid">
          <div className="field">
            <label htmlFor="es-from-name">From name</label>
            <input id="es-from-name" value={form.fromName} onChange={(e) => set('fromName', e.target.value)} placeholder="Hemant Kumar" />
          </div>
          <div className="field">
            <label htmlFor="es-from-email">From email</label>
            <input
              id="es-from-email"
              type="email"
              value={form.fromEmail}
              onChange={(e) => set('fromEmail', e.target.value)}
              placeholder="Defaults to username"
            />
          </div>
          <div className="field span-2">
            <label htmlFor="es-reply">Reply-to</label>
            <input
              id="es-reply"
              type="email"
              value={form.replyTo}
              onChange={(e) => set('replyTo', e.target.value)}
              placeholder="Optional — where replies should go"
            />
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="section-intro">
          <h2>Test</h2>
          <p className="muted">Checks the connection and sends a short test email.</p>
        </div>
        <div className="test-row">
          <input
            type="email"
            value={testTo}
            onChange={(e) => setTestTo(e.target.value)}
            placeholder={`Send to ${form.fromEmail || form.username || 'your address'}`}
            aria-label="Test recipient"
          />
          <button type="button" className="ghost" onClick={() => void onTest()} disabled={testing || !form.host || !form.username}>
            {testing ? 'Testing…' : 'Send test email'}
          </button>
        </div>
      </div>

      <div className={`save-bar ${dirty ? 'visible' : ''}`}>
        {saved?.configured ? (
          <button type="button" className="linkish danger-link" onClick={() => void onRemove()}>
            Remove credentials
          </button>
        ) : (
          <span className="muted">{dirty ? 'You have unsaved changes' : 'Not configured yet'}</span>
        )}
        <div className="save-actions">
          <button type="button" className="ghost" disabled={!dirty || saving} onClick={() => setForm(savedForm)}>
            Discard
          </button>
          <button type="submit" disabled={!dirty || saving}>
            {saving ? 'Saving…' : 'Save settings'}
          </button>
        </div>
      </div>
    </form>
  );
}
