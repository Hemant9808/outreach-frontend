import { DragEvent, FormEvent, KeyboardEvent, useEffect, useMemo, useState } from 'react';
import { api, type User } from '../api';

type Form = {
  name: string;
  email: string;
  phone: string;
  title: string;
  skills: string;
  about: string;
  linkedin: string;
};

type Field = keyof Form;

const EMPTY: Form = { name: '', email: '', phone: '', title: '', skills: '', about: '', linkedin: '' };
const ABOUT_LIMIT = 1200;
const MAX_RESUME_BYTES = 12 * 1024 * 1024;

function toForm(user: User): Form {
  return {
    name: user.name || '',
    email: user.email || '',
    phone: user.phone || '',
    title: user.title || '',
    skills: user.skills || '',
    about: user.about || '',
    linkedin: user.linkedin || '',
  };
}

function splitSkills(value: string) {
  return value
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

export function Profile() {
  const [form, setForm] = useState<Form>(EMPTY);
  const [saved, setSaved] = useState<Form>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [aiFields, setAiFields] = useState<Set<Field>>(new Set());
  const [skillDraft, setSkillDraft] = useState('');
  const [toast, setToast] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [errors, setErrors] = useState<Partial<Record<Field, string>>>({});

  useEffect(() => {
    api<User>('/profile')
      .then((user) => {
        const next = toForm(user);
        setForm(next);
        setSaved(next);
        setResumeName(user.resumeFilename || null);
        setResumeUrl(user.resumeUrl || null);
      })
      .catch((err) => setToast({ kind: 'error', text: err instanceof Error ? err.message : 'Could not load profile' }))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const dirty = useMemo(() => (Object.keys(form) as Field[]).some((k) => form[k] !== saved[k]), [form, saved]);
  const skills = splitSkills(form.skills);

  function set(key: Field, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: undefined }));
    setAiFields((prev) => {
      if (!prev.has(key)) return prev;
      const next = new Set(prev);
      next.delete(key);
      return next;
    });
  }

  function addSkill(raw: string) {
    const parts = splitSkills(raw);
    if (!parts.length) return;
    const existing = new Set(skills.map((s) => s.toLowerCase()));
    const merged = [...skills, ...parts.filter((p) => !existing.has(p.toLowerCase()))];
    set('skills', merged.join(', '));
    setSkillDraft('');
  }

  function removeSkill(index: number) {
    set('skills', skills.filter((_, i) => i !== index).join(', '));
  }

  function onSkillKey(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addSkill(skillDraft);
    } else if (e.key === 'Backspace' && !skillDraft && skills.length) {
      removeSkill(skills.length - 1);
    }
  }

  function validate(): boolean {
    const next: Partial<Record<Field, string>> = {};
    if (!form.name.trim()) next.name = 'Full name is required';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) next.email = 'Enter a valid email';
    if (form.linkedin && !/^https?:\/\/(www\.)?linkedin\.com\//i.test(form.linkedin.trim())) {
      next.linkedin = 'Use a full linkedin.com URL';
    }
    if (form.about.length > ABOUT_LIMIT) next.about = `Keep it under ${ABOUT_LIMIT} characters`;
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function onSave(e?: FormEvent) {
    e?.preventDefault();
    if (skillDraft.trim()) addSkill(skillDraft);
    if (!validate()) return;
    setSaving(true);
    try {
      const user = await api<User>('/profile', { method: 'PATCH', body: JSON.stringify(form) });
      const next = toForm(user);
      setForm(next);
      setSaved(next);
      setAiFields(new Set());
      setToast({ kind: 'ok', text: 'Profile saved. Gemini will use these details in drafts.' });
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : 'Could not save' });
    } finally {
      setSaving(false);
    }
  }

  async function onResume(file: File | undefined) {
    if (!file) return;
    if (file.size > MAX_RESUME_BYTES) {
      setToast({ kind: 'error', text: 'Resume must be under 12 MB' });
      return;
    }
    if (dirty && !window.confirm('Uploading a resume will overwrite unsaved edits with details from the resume. Continue?')) {
      return;
    }
    const body = new FormData();
    body.append('resume', file);
    setUploading(true);
    try {
      const res = await api<{ profile: User; parsed: boolean; updatedFields: Field[] }>('/profile/resume', {
        method: 'POST',
        body,
      });
      const next = toForm(res.profile);
      setForm(next);
      setSaved(next);
      setResumeName(res.profile.resumeFilename || file.name);
      setResumeUrl(res.profile.resumeUrl || null);
      setAiFields(new Set(res.updatedFields));
      setToast(
        res.parsed
          ? {
              kind: 'ok',
              text: res.updatedFields.length
                ? `Resume uploaded. ${res.updatedFields.length} field${res.updatedFields.length > 1 ? 's' : ''} filled from it — review below.`
                : 'Resume uploaded. Nothing new was found to fill in.',
            }
          : { kind: 'error', text: 'Resume uploaded, but it could not be read. Fill in your details manually.' },
      );
    } catch (err) {
      setToast({ kind: 'error', text: err instanceof Error ? err.message : 'Resume upload failed' });
    } finally {
      setUploading(false);
    }
  }

  function onDrop(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setDragging(false);
    if (!uploading) void onResume(e.dataTransfer.files?.[0]);
  }

  function fieldProps(key: Field) {
    return {
      id: `pf-${key}`,
      value: form[key],
      onChange: (e: { target: { value: string } }) => set(key, e.target.value),
      'aria-invalid': errors[key] ? true : undefined,
      className: aiFields.has(key) ? 'ai-filled' : undefined,
    };
  }

  function FieldLabel({ field, children, hint }: { field: Field; children: string; hint?: string }) {
    return (
      <span className="field-label">
        <label htmlFor={`pf-${field}`}>{children}</label>
        {aiFields.has(field) && <span className="ai-badge">From resume</span>}
        {hint && <span className="field-hint">{hint}</span>}
      </span>
    );
  }

  if (loading) {
    return (
      <section>
        <div className="panel skeleton" style={{ height: 180 }} />
        <div className="panel skeleton" style={{ height: 420, marginTop: 20 }} />
      </section>
    );
  }

  return (
    <section className="profile-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Used in every draft</p>
          <h1>Profile & resume</h1>
          <p className="muted page-sub">Upload your resume and we'll fill in your profile automatically. You can edit anything afterwards.</p>
        </div>
      </header>

      {toast && (
        <div className={`toast ${toast.kind}`} role="status">
          {toast.text}
          <button type="button" className="toast-close" aria-label="Dismiss" onClick={() => setToast(null)}>
            ×
          </button>
        </div>
      )}

      <div className="panel resume-card">
        <div className="section-head">
          <div>
            <h2>Resume</h2>
            <p className="muted">Attached to every outgoing email and used to auto-fill your profile.</p>
          </div>
          {resumeName && (
            <a className="file-chip" href={resumeUrl || undefined} target="_blank" rel="noreferrer">
              <span className="file-icon">PDF</span>
              <span className="file-name">{resumeName}</span>
            </a>
          )}
        </div>
        <label
          className={`drop resume-drop ${dragging ? 'dragging' : ''} ${uploading ? 'busy' : ''}`}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
        >
          <input
            type="file"
            accept=".pdf,application/pdf,image/png,image/jpeg,image/webp"
            disabled={uploading}
            onChange={(e) => {
              void onResume(e.target.files?.[0]);
              e.target.value = '';
            }}
          />
          {uploading ? (
            <>
              <span className="spinner" aria-hidden />
              <strong>Reading your resume…</strong>
              <span>Uploading and extracting your details with AI. This takes a few seconds.</span>
            </>
          ) : (
            <>
              <strong>{resumeName ? 'Replace resume' : 'Upload your resume'}</strong>
              <span>Drag & drop or click to browse · PDF, PNG, JPG up to 12 MB</span>
            </>
          )}
        </label>
      </div>

      <form className="panel profile-form" onSubmit={onSave} noValidate>
        <div className="form-section">
          <div className="section-intro">
            <h2>Personal details</h2>
            <p className="muted">How you introduce and sign off in each email.</p>
          </div>
          <div className="field-grid">
            <div className="field">
              <FieldLabel field="name">Full name *</FieldLabel>
              <input {...fieldProps('name')} autoComplete="name" placeholder="Jane Doe" />
              {errors.name && <p className="field-error">{errors.name}</p>}
            </div>
            <div className="field">
              <FieldLabel field="title">Current title</FieldLabel>
              <input {...fieldProps('title')} placeholder="Full Stack Developer" />
            </div>
            <div className="field">
              <FieldLabel field="email">Email</FieldLabel>
              <input {...fieldProps('email')} type="email" autoComplete="email" placeholder="jane@example.com" />
              {errors.email && <p className="field-error">{errors.email}</p>}
            </div>
            <div className="field">
              <FieldLabel field="phone">Phone</FieldLabel>
              <input {...fieldProps('phone')} type="tel" autoComplete="tel" placeholder="+91 98765 43210" />
            </div>
            <div className="field span-2">
              <FieldLabel field="linkedin">LinkedIn URL</FieldLabel>
              <input {...fieldProps('linkedin')} type="url" placeholder="https://www.linkedin.com/in/your-handle" />
              {errors.linkedin && <p className="field-error">{errors.linkedin}</p>}
            </div>
          </div>
        </div>

        <div className="form-section">
          <div className="section-intro">
            <h2>Experience</h2>
            <p className="muted">Gemini picks the most relevant points for each job post.</p>
          </div>
          <div className="field-grid">
            <div className="field span-2">
              <FieldLabel field="skills" hint="Press Enter or comma to add">
                Skills
              </FieldLabel>
              <div className={`tag-input ${aiFields.has('skills') ? 'ai-filled' : ''}`}>
                {skills.map((skill, i) => (
                  <span className="tag" key={`${skill}-${i}`}>
                    {skill}
                    <button type="button" aria-label={`Remove ${skill}`} onClick={() => removeSkill(i)}>
                      ×
                    </button>
                  </span>
                ))}
                <input
                  id="pf-skills"
                  value={skillDraft}
                  onChange={(e) => setSkillDraft(e.target.value)}
                  onKeyDown={onSkillKey}
                  onBlur={() => addSkill(skillDraft)}
                  placeholder={skills.length ? 'Add skill' : 'React, Node.js, AWS…'}
                />
              </div>
            </div>
            <div className="field span-2">
              <FieldLabel field="about">About / experience</FieldLabel>
              <textarea
                {...fieldProps('about')}
                rows={6}
                placeholder="A short summary of your experience, notable projects and impact."
              />
              <div className="field-foot">
                {errors.about ? <p className="field-error">{errors.about}</p> : <span />}
                <span className={`counter ${form.about.length > ABOUT_LIMIT ? 'over' : ''}`}>
                  {form.about.length}/{ABOUT_LIMIT}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={`save-bar ${dirty ? 'visible' : ''}`}>
          <span className="muted">{dirty ? 'You have unsaved changes' : 'All changes saved'}</span>
          <div className="save-actions">
            <button
              type="button"
              className="ghost"
              disabled={!dirty || saving}
              onClick={() => {
                setForm(saved);
                setErrors({});
                setSkillDraft('');
              }}
            >
              Discard
            </button>
            <button type="submit" disabled={!dirty || saving}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          </div>
        </div>
      </form>
    </section>
  );
}
