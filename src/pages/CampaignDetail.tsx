import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, type CampaignDetail as Campaign } from '../api';

export function CampaignDetail() {
  const { id } = useParams();
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let timer: number | undefined;
    async function load() {
      try {
        const data = await api<Campaign>(`/campaigns/${id}`);
        setCampaign(data);
        if (data.status === 'UPLOADED' || data.status === 'EXTRACTING') {
          timer = window.setTimeout(load, 2500);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Could not load campaign');
      }
    }
    void load();
    return () => {
      if (timer) window.clearTimeout(timer);
    };
  }, [id]);

  if (error) return <p className="error">{error}</p>;
  if (!campaign) return <p>Loading campaign…</p>;

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">
            <Link to="/campaigns">Campaigns</Link> / batch #{campaign.id}
          </p>
          <h1>Extracted leads</h1>
        </div>
        <span className={`pill ${campaign.status.toLowerCase()}`}>{campaign.status}</span>
      </header>

      {campaign.error && <p className="error">{campaign.error}</p>}
      {(campaign.status === 'UPLOADED' || campaign.status === 'EXTRACTING') && (
        <p className="panel">Gemini is reading the posts. This page will refresh on its own.</p>
      )}

      <div className="meta-row">
        <span>Mode: {campaign.sendMode.toLowerCase()}</span>
        {campaign.scheduledAt && <span>First send: {new Date(campaign.scheduledAt).toLocaleString()}</span>}
        {campaign.recurrenceIntervalDays && (
          <span>Every {campaign.recurrenceIntervalDays} day(s), max {campaign.maxSends}, weekdays</span>
        )}
      </div>

      <div className="uploads">
        {campaign.uploads.map((file) => (
          <a key={file.id} href={file.url} target="_blank" rel="noreferrer">
            {file.originalName}
          </a>
        ))}
      </div>

      {campaign.leads.length === 0 && campaign.status === 'READY' && (
        <div className="panel empty">
          <h2>No leads found</h2>
          <p>Gemini did not find a job post in these files. Try a clearer screenshot.</p>
        </div>
      )}

      <div className="lead-list">
        {campaign.leads.map((lead) => (
          <article key={lead.id} className="panel lead">
            <div className="row">
              <h2>{lead.role || 'Open role'} {lead.company ? `· ${lead.company}` : ''}</h2>
              <span className={`pill ${lead.status.toLowerCase()}`}>{lead.status}</span>
            </div>
            <p>
              <strong>{lead.hrName || 'HR'}</strong>{' '}
              {lead.hrEmail ? <a href={`mailto:${lead.hrEmail}`}>{lead.hrEmail}</a> : <em>no email in post</em>}
            </p>
            {lead.jdSummary && <p className="muted">{lead.jdSummary}</p>}
            {lead.subject && (
              <div className="draft">
                <strong>{lead.subject}</strong>
                <pre>{lead.body}</pre>
              </div>
            )}
            {lead.schedules[0] && (
              <small>
                Sends {lead.schedules[0].sendCount}/{lead.schedules[0].maxSends}
                {lead.schedules[0].active
                  ? ` · next ${new Date(lead.schedules[0].nextRunAt).toLocaleString()}`
                  : ' · finished'}
              </small>
            )}
            {lead.logs.length > 0 && (
              <ul className="logs">
                {lead.logs.map((log) => (
                  <li key={log.id}>
                    {new Date(log.sentAt).toLocaleString()} — {log.status}
                    {log.error ? `: ${log.error}` : ''}
                  </li>
                ))}
              </ul>
            )}
          </article>
        ))}
      </div>
    </section>
  );
}
