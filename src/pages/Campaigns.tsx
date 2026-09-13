import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type CampaignListItem } from '../api';

export function Campaigns() {
  const [items, setItems] = useState<CampaignListItem[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    api<CampaignListItem[]>('/campaigns')
      .then(setItems)
      .catch((err) => setError(err.message));
  }, []);

  return (
    <section>
      <header className="page-head">
        <div>
          <p className="eyebrow">Inbox of batches</p>
          <h1>Campaigns</h1>
        </div>
        <Link className="btn" to="/new">
          New batch
        </Link>
      </header>
      {error && <p className="error">{error}</p>}
      {items.length === 0 && !error && (
        <div className="panel empty">
          <h2>No campaigns yet</h2>
          <p>Upload hiring-post screenshots or PDFs and the desk will extract emails and send cold mail.</p>
          <Link className="btn" to="/new">
            Upload posts
          </Link>
        </div>
      )}
      <div className="cards">
        {items.map((item) => (
          <Link key={item.id} to={`/campaigns/${item.id}`} className="panel campaign-card">
            <div className="row">
              <span className={`pill ${item.status.toLowerCase()}`}>{item.status}</span>
              <span className="muted">{item.sendMode.toLowerCase()}</span>
            </div>
            <h2>Batch #{item.id}</h2>
            <p>
              {item.uploadCount} files · {item.emailCount}/{item.leadCount} emails · {item.sentCount} sent
            </p>
            <small>{new Date(item.createdAt).toLocaleString()}</small>
          </Link>
        ))}
      </div>
    </section>
  );
}
