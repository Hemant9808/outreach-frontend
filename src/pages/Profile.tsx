import { FormEvent, useEffect, useState } from 'react';
import { api, type User } from '../api';
import { useAuth } from '../auth';

export function Profile() {
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    name: '',
    phone: '',
    title: '',
    skills: '',
    about: '',
    linkedin: '',
  });
  const [resumeName, setResumeName] = useState<string | null>(null);
  const [resumeUrl, setResumeUrl] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api<User>('/profile').then((user) => {
      setForm({
        name: user.name || '',
        phone: user.phone || '',
        title: user.title || '',
        skills: user.skills || '',
        about: user.about || '',
        linkedin: user.linkedin || '',
      });
      setResumeName(user.resumeFilename || null);
      setResumeUrl(user.resumeUrl || null);
    });
  }, []);

  function set<K extends keyof typeof form>(key: K, value: string) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function onSave(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    try {
      await api('/profile', { method: 'PATCH', body: JSON.stringify(form) });
      await refresh();
      setMessage('Profile saved. Gemini will use these details in drafts.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save');
    }
  }

  async function onResume(file: File | undefined) {
    if (!file) return;
    setError('');
    setMessage('');
    const body = new FormData();
    body.append('resume', file);
    try {
      const res = await api<{ resumeUrl: string; resumeFilename: string }>('/profile/resume', {
        method: 'POST',
        body,
      });
      setResumeName(res.resumeFilename);
      setResumeUrl(res.resumeUrl);
      setMessage('Resume uploaded. It will be attached to every cold email.');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Resume upload failed');
    }
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Used in every draft</p>
          <h1>Profile & resume</h1>
        </div>
      </header>
      <form className="panel form-grid" onSubmit={onSave}>
        {error && <p className="error">{error}</p>}
        {message && <p className="ok">{message}</p>}
        <label>
          Full name
          <input value={form.name} onChange={(e) => set('name', e.target.value)} required />
        </label>
        <label>
          Phone
          <input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </label>
        <label>
          Current title
          <input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="Frontend engineer" />
        </label>
        <label>
          Skills
          <textarea value={form.skills} onChange={(e) => set('skills', e.target.value)} rows={3} />
        </label>
        <label>
          About / experience
          <textarea value={form.about} onChange={(e) => set('about', e.target.value)} rows={5} />
        </label>
        <label>
          LinkedIn URL
          <input value={form.linkedin} onChange={(e) => set('linkedin', e.target.value)} />
        </label>
        <button type="submit">Save details</button>
      </form>

      <div className="panel form-grid" style={{ marginTop: 20 }}>
        <h2>Resume attachment</h2>
        <p className="muted">PDF or image. This file is attached to every outgoing cold email.</p>
        {resumeName && (
          <p>
            Current: {resumeUrl ? <a href={resumeUrl} target="_blank" rel="noreferrer">{resumeName}</a> : resumeName}
          </p>
        )}
        <label className="drop">
          <input type="file" accept=".pdf,application/pdf,image/*" onChange={(e) => void onResume(e.target.files?.[0])} />
          <strong>Upload resume</strong>
          <span>PDF preferred</span>
        </label>
      </div>
    </section>
  );
}
