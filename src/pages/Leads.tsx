import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Lead } from '../api';
import { nextTenAmLocal, toLocalInput } from '../time';

const KIND_FILTERS = [
  { id: 'all', label: 'All types' },
  { id: 'recurring', label: 'Recurring' },
  { id: 'one_time', label: 'One-time' },
];

const STATUS_FILTERS = [
  { id: 'ACTIVE', label: 'Active' },
  { id: 'ALL', label: 'All' },
  { id: 'QUEUED', label: 'Queued' },
  { id: 'SENT', label: 'Sent' },
  { id: 'STOPPED', label: 'Stopped' },
  { id: 'FAILED', label: 'Failed' },
  { id: 'COMPLETED', label: 'Completed' },
  { id: 'NO_EMAIL', label: 'No email' },
];

export function Leads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [kind, setKind] = useState('all');
  const [status, setStatus] = useState('ACTIVE');
  const [error, setError] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [editing, setEditing] = useState<number | null>(null);
  const [when, setWhen] = useState(nextTenAmLocal());
  const [interval, setInterval] = useState('1');

  async function load() {
    try {
      const qs = new URLSearchParams({ kind, status });
      setLeads(await api<Lead[]>(`/leads?${qs}`));
      setError('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load leads');
    }
  }

  useEffect(() => {
    void load();
  }, [kind, status]);

  async function act(id: number, fn: () => Promise<unknown>) {
    setBusyId(id);
    setError('');
    try {
      await fn();
      await load();
      setEditing(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Action failed');
    } finally {
      setBusyId(null);
    }
  }

  function openSchedule(lead: Lead) {
    const schedule = lead.schedule || lead.schedules[0];
    setEditing(lead.id);
    setWhen(
      schedule?.nextRunAt ? toLocalInput(new Date(schedule.nextRunAt)) : nextTenAmLocal(lead.kind === 'recurring'),
    );
    setInterval(String(schedule?.intervalDays || (lead.kind === 'recurring' ? 1 : 0)));
  }

  return (
    <section className="wide">
      <header className="page-head">
        <div>
          <p className="eyebrow">Automation desk</p>
          <h1>Leads</h1>
        </div>
        <Link className="btn" to="/new">
          New batch
        </Link>
      </header>

      <div className="filters">
        <div className="filter-row">
          {KIND_FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`chip ${kind === item.id ? 'on' : ''}`}
              onClick={() => setKind(item.id)}
            >
              {item.label}
            </button>
          ))}
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

      {leads.length === 0 && !error && (
        <div className="panel empty">
          <h2>No leads in this view</h2>
          <p>Upload a hiring post or switch filters to see queued and recurring mail.</p>
        </div>
      )}

      {leads.length > 0 && (
        <div className="table-wrap panel">
          <table className="leads-table">
            <thead>
              <tr>
                <th>Lead</th>
                <th>Type</th>
                <th>Status</th>
                <th>Next send</th>
                <th>Sends</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((lead) => {
                const schedule = lead.schedule || lead.schedules[0];
                const recurring = lead.kind === 'recurring' || Boolean(schedule?.intervalDays);
                return (
                  <tr key={lead.id}>
                    <td data-label="Lead">
                      <strong>{lead.hrName || 'HR'}</strong>
                      <div>{lead.hrEmail || <em>no email</em>}</div>
                      <small className="muted">
                        {lead.role || 'Open role'}
                        {lead.company ? ` · ${lead.company}` : ''}
                        {lead.campaign ? (
                          <>
                            {' · '}
                            <Link to={`/campaigns/${lead.campaign.id}`}>batch #{lead.campaign.id}</Link>
                          </>
                        ) : null}
                      </small>
                    </td>
                    <td data-label="Type">{recurring ? `Every ${schedule?.intervalDays || 1}d` : 'One-time'}</td>
                    <td data-label="Status">
                      <span className={`pill ${lead.stopped ? 'stopped' : lead.status.toLowerCase()}`}>
                        {lead.stopped ? 'STOPPED' : lead.status}
                      </span>
                    </td>
                    <td data-label="Next send">
                      {schedule?.active && lead.status !== 'COMPLETED'
                        ? new Date(schedule.nextRunAt).toLocaleString()
                        : '—'}
                    </td>
                    <td data-label="Sends">{schedule ? `${schedule.sendCount}/${schedule.maxSends}` : '0/3'}</td>
                    <td data-label="Actions">
                      <div className="actions">
                        {lead.hrEmail && (
                          <button
                            type="button"
                            className="btn ghost"
                            disabled={busyId === lead.id}
                            onClick={() => act(lead.id, () => api(`/leads/${lead.id}/send-now`, { method: 'POST' }))}
                          >
                            Send now
                          </button>
                        )}
                        {lead.hrEmail && (
                          <button type="button" className="btn ghost" onClick={() => openSchedule(lead)}>
                            {schedule ? 'Reschedule' : 'Schedule'}
                          </button>
                        )}
                        {schedule?.active && recurring && !lead.stopped && lead.status !== 'COMPLETED' && (
                          <button
                            type="button"
                            className="btn ghost danger"
                            disabled={busyId === lead.id}
                            onClick={() => act(lead.id, () => api(`/leads/${lead.id}/pause`, { method: 'POST' }))}
                          >
                            Stop
                          </button>
                        )}
                        {(lead.stopped || (schedule && !schedule.active && lead.status !== 'COMPLETED')) && (
                          <button
                            type="button"
                            className="btn ghost"
                            disabled={busyId === lead.id}
                            onClick={() => act(lead.id, () => api(`/leads/${lead.id}/resume`, { method: 'POST' }))}
                          >
                            Resume
                          </button>
                        )}
                      </div>
                      {editing === lead.id && (
                        <form
                          className="inline-schedule"
                          onSubmit={(e) => {
                            e.preventDefault();
                            void act(lead.id, () =>
                              api(`/leads/${lead.id}/schedule`, {
                                method: 'PATCH',
                                body: JSON.stringify({
                                  nextRunAt: new Date(when).toISOString(),
                                  intervalDays: Number(interval) > 0 ? Number(interval) : null,
                                }),
                              }),
                            );
                          }}
                        >
                          <input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
                          <select value={interval} onChange={(e) => setInterval(e.target.value)}>
                            <option value="0">One-time</option>
                            <option value="1">Every weekday</option>
                            <option value="2">Every 2 days</option>
                            <option value="3">Every 3 days</option>
                            <option value="7">Every 7 days</option>
                          </select>
                          <button type="submit" disabled={busyId === lead.id}>
                            Save
                          </button>
                          <button type="button" className="btn ghost" onClick={() => setEditing(null)}>
                            Cancel
                          </button>
                        </form>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
