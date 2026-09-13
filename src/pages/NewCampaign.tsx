import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, type CampaignDetail } from '../api';
import { nextTenAmLocal } from '../time';

export function NewCampaign() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [sendMode, setSendMode] = useState('IMMEDIATE');
  const [scheduledAt, setScheduledAt] = useState(nextTenAmLocal(false));
  const [intervalDays, setIntervalDays] = useState('1');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  function chooseMode(mode: string) {
    setSendMode(mode);
    if (mode === 'SCHEDULED') setScheduledAt(nextTenAmLocal(false));
    if (mode === 'RECURRING') {
      setScheduledAt(nextTenAmLocal(true));
      setIntervalDays('1');
    }
  }

  function addFiles(list: FileList | null) {
    if (!list) return;
    setFiles((prev) => [...prev, ...Array.from(list)]);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (!files.length) {
      setError('Add at least one screenshot or PDF');
      return;
    }

    const body = new FormData();
    files.forEach((file) => body.append('files', file));
    body.append('sendMode', sendMode);
    if (sendMode !== 'IMMEDIATE') {
      body.append('scheduledAt', new Date(scheduledAt).toISOString());
    }
    if (sendMode === 'RECURRING') body.append('intervalDays', intervalDays);

    setBusy(true);
    try {
      const campaign = await api<CampaignDetail>('/campaigns', { method: 'POST', body });
      navigate(`/campaigns/${campaign.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setBusy(false);
    }
  }

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">From a hiring post</p>
          <h1>New batch</h1>
        </div>
      </header>
      <form className="panel form-grid" onSubmit={onSubmit}>
        {error && <p className="error">{error}</p>}
        <label className="drop">
          <input
            type="file"
            multiple
            accept="image/*,.pdf,application/pdf"
            onChange={(e) => addFiles(e.target.files)}
          />
          <strong>Drop images or PDFs</strong>
          <span>You can select several files at once.</span>
        </label>
        {files.length > 0 && (
          <ul className="file-list">
            {files.map((file, i) => (
              <li key={`${file.name}-${i}`}>
                {file.name}
                <button type="button" onClick={() => setFiles(files.filter((_, idx) => idx !== i))}>
                  remove
                </button>
              </li>
            ))}
          </ul>
        )}

        <fieldset>
          <legend>When to send</legend>
          <label className="choice">
            <input type="radio" name="mode" checked={sendMode === 'IMMEDIATE'} onChange={() => chooseMode('IMMEDIATE')} />
            Send as soon as extraction finishes (weekdays)
          </label>
          <label className="choice">
            <input type="radio" name="mode" checked={sendMode === 'SCHEDULED'} onChange={() => chooseMode('SCHEDULED')} />
            Send once at a set time
          </label>
          <label className="choice">
            <input type="radio" name="mode" checked={sendMode === 'RECURRING'} onChange={() => chooseMode('RECURRING')} />
            Recurring — same email, max 3 sends, weekdays only
          </label>
        </fieldset>

        {sendMode !== 'IMMEDIATE' && (
          <label>
            First send
            <input type="datetime-local" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
            <span className="muted" style={{ fontWeight: 400 }}>
              Defaults to 10:00 AM today if that time is still ahead, otherwise tomorrow 10:00 AM
              {sendMode === 'RECURRING' ? ' (next weekday). Repeat every weekday, max 3.' : '.'}
            </span>
          </label>
        )}

        {sendMode === 'RECURRING' && (
          <label>
            Repeat every
            <select value={intervalDays} onChange={(e) => setIntervalDays(e.target.value)}>
              <option value="1">Every weekday</option>
              <option value="2">Every 2 days (skip weekends)</option>
              <option value="3">Every 3 days (skip weekends)</option>
              <option value="7">Every 7 days</option>
            </select>
          </label>
        )}

        <button type="submit" disabled={busy}>
          {busy ? 'Uploading…' : 'Extract and queue'}
        </button>
      </form>
    </section>
  );
}
