import { useEffect, useState } from 'react';
import { API_URL, api, type McpSettings as Saved } from '../../api';

type Client = 'connector' | 'desktop' | 'code';

const CLIENTS: { id: Client; label: string }[] = [
  { id: 'connector', label: 'Claude.ai / Desktop connector' },
  { id: 'desktop', label: 'Claude Desktop (local)' },
  { id: 'code', label: 'Claude Code' },
];

function endpoint(base: string, key: string | null) {
  return `${base.replace(/\/+$/, '')}/mcp${key ? `/${key}` : ''}`;
}

function CopyBlock({ value, multiline = false }: { value: string; multiline?: boolean }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    await navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className={`copy-block ${multiline ? 'multiline' : ''}`}>
      <code>{value}</code>
      <button type="button" className="affix-btn" onClick={() => void copy()}>
        {copied ? 'Copied' : 'Copy'}
      </button>
    </div>
  );
}

export function McpSettings() {
  const [saved, setSaved] = useState<Saved | null>(null);
  const [tools, setTools] = useState<NonNullable<Saved['tools']>>([]);
  const [publicUrl, setPublicUrl] = useState('');
  const [client, setClient] = useState<Client>('connector');
  const [showKey, setShowKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api<Saved>('/settings/mcp')
      .then((s) => {
        setSaved(s);
        setTools(s.tools || []);
        setPublicUrl(s.publicUrl || '');
      })
      .catch((err) => setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Could not load settings' }))
      .finally(() => setLoading(false));
  }, []);

  async function run(action: () => Promise<Saved>, success?: string) {
    setNotice(null);
    setBusy(true);
    try {
      const s = await action();
      setSaved(s);
      setPublicUrl(s.publicUrl || '');
      if (success) setNotice({ kind: 'ok', text: success });
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Request failed' });
    } finally {
      setBusy(false);
    }
  }

  function rotateKey() {
    if (saved?.key && !window.confirm('Generate a new key? Claude stops working until you update the connector URL.')) return;
    void run(() => api<Saved>('/settings/mcp/key', { method: 'POST' }), 'New key generated. Update the URL in Claude.');
  }

  function removeKey() {
    if (!window.confirm('Remove the key? Anyone who can reach the API could then use the connector.')) return;
    void run(() => api<Saved>('/settings/mcp/key', { method: 'DELETE' }), 'Key removed.');
  }

  function toggle(enabled: boolean) {
    void run(
      () => api<Saved>('/settings/mcp', { method: 'PUT', body: JSON.stringify({ enabled }) }),
      enabled ? 'Connector turned on.' : 'Connector turned off. Claude can no longer reach your data.',
    );
  }

  function savePublicUrl() {
    void run(
      () => api<Saved>('/settings/mcp', { method: 'PUT', body: JSON.stringify({ publicUrl: publicUrl || null }) }),
      'Public URL saved.',
    );
  }

  async function testPublicUrl() {
    setNotice(null);
    setBusy(true);
    try {
      const res = await api<{ ok: boolean; tools?: number; error?: string }>('/settings/mcp/test', { method: 'POST' });
      setNotice(
        res.ok
          ? { kind: 'ok', text: `Reachable from the internet. Claude will see ${res.tools} tools.` }
          : { kind: 'error', text: res.error || 'Test failed' },
      );
    } catch (err) {
      setNotice({ kind: 'error', text: err instanceof Error ? err.message : 'Test failed' });
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <div className="panel skeleton" style={{ height: 480 }} />;
  if (!saved) {
    return <div className="panel"><p className="error" style={{ padding: 24 }}>{notice?.text}</p></div>;
  }

  const key = saved.key;
  const localUrl = endpoint(API_URL, key);
  const publicEndpoint = saved.publicUrl ? endpoint(saved.publicUrl, key) : null;
  const shownKey = key ? (showKey ? key : `${key.slice(0, 4)}${'•'.repeat(16)}`) : '';
  const urlDirty = (publicUrl || '') !== (saved.publicUrl || '');

  const status = !saved.enabled
    ? { cls: 'off', text: 'Off' }
    : !key
      ? { cls: 'warn', text: 'On — no key' }
      : saved.lastUsedAt
        ? { cls: 'on', text: `Last used ${new Date(saved.lastUsedAt).toLocaleString()}` }
        : { cls: 'on', text: 'On — not used yet' };

  return (
    <div className="panel profile-form">
      <div className="settings-head">
        <div>
          <h2>Claude connector (MCP)</h2>
          <p className="muted">
            Let Claude create batches, send, schedule and manage leads for you — without opening this site.
          </p>
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
          <h2>Access</h2>
          <p className="muted">The key is part of the connector URL. Treat it like a password.</p>
        </div>
        <div className="field-grid">
          <div className="field span-2">
            <label className="switch">
              <input type="checkbox" checked={saved.enabled} disabled={busy} onChange={(e) => toggle(e.target.checked)} />
              <span className="switch-track" aria-hidden />
              <span>
                Allow Claude to connect
                <small className="muted"> — turn off to block every MCP request instantly.</small>
              </span>
            </label>
          </div>
          <div className="field span-2">
            <label htmlFor="mcp-key">Access key</label>
            {key ? (
              <div className="key-row">
                <div className="input-affix">
                  <input id="mcp-key" readOnly value={shownKey} />
                  <button type="button" className="affix-btn" onClick={() => setShowKey((v) => !v)}>
                    {showKey ? 'Hide' : 'Show'}
                  </button>
                </div>
                <button type="button" className="ghost" disabled={busy} onClick={rotateKey}>
                  Rotate
                </button>
              </div>
            ) : (
              <div className="key-row">
                <p className="callout">
                  No key set. Fine on this computer only — generate one before exposing the API through a tunnel.
                </p>
                <button type="button" disabled={busy} onClick={rotateKey}>
                  Generate key
                </button>
              </div>
            )}
            {saved.keySource === 'env' && (
              <p className="muted small">This key comes from MCP_KEY in api/.env. Rotating saves a new one here instead.</p>
            )}
            {saved.keySource === 'settings' && (
              <button type="button" className="linkish danger-link" disabled={busy} onClick={removeKey}>
                Remove key
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="section-intro">
          <h2>Connect Claude</h2>
          <p className="muted">Pick where you use Claude and copy the setup.</p>
        </div>
        <div className="field-grid">
          <div className="field span-2">
            <div className="segmented" role="radiogroup" aria-label="Claude client">
              {CLIENTS.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  role="radio"
                  aria-checked={client === c.id}
                  className={client === c.id ? 'on' : ''}
                  onClick={() => setClient(c.id)}
                >
                  {c.label}
                </button>
              ))}
            </div>
          </div>

          {client === 'connector' && (
            <>
              <div className="field span-2">
                <p className="callout">
                  Claude.ai connectors run in the cloud, so they need a public HTTPS address for this API. Start a tunnel
                  in a terminal, then paste the https address it prints below.
                </p>
                <CopyBlock value={`ngrok http ${new URL(API_URL).port || 80}`} />
                <CopyBlock value={`cloudflared tunnel --url ${API_URL}`} />
              </div>
              <div className="field span-2">
                <label htmlFor="mcp-public">Public URL</label>
                <div className="test-row">
                  <input
                    id="mcp-public"
                    value={publicUrl}
                    onChange={(e) => setPublicUrl(e.target.value)}
                    placeholder="https://something.trycloudflare.com"
                    autoComplete="off"
                  />
                  {urlDirty ? (
                    <button type="button" disabled={busy} onClick={savePublicUrl}>
                      Save
                    </button>
                  ) : (
                    <button type="button" className="ghost" disabled={busy || !saved.publicUrl} onClick={() => void testPublicUrl()}>
                      Test
                    </button>
                  )}
                </div>
              </div>
              <div className="field span-2">
                <label>Connector URL</label>
                {publicEndpoint ? (
                  <CopyBlock value={publicEndpoint} />
                ) : (
                  <p className="muted small">Save your public URL to get the connector URL.</p>
                )}
                {publicEndpoint && !key && (
                  <p className="error small">Generate a key first — this URL is public.</p>
                )}
                <ol className="steps">
                  <li>In Claude, open Settings → Connectors → Add custom connector.</li>
                  <li>Name it “Outreach Desk” and paste the connector URL. Leave OAuth fields empty.</li>
                  <li>Enable it in a chat from the tools menu, then ask e.g. “show my overview”.</li>
                </ol>
              </div>
            </>
          )}

          {client === 'desktop' && (
            <div className="field span-2">
              <p className="muted small">
                Claude Desktop → Settings → Developer → Edit Config, add this to claude_desktop_config.json, then restart
                Claude. Needs Node.js; no tunnel required.
              </p>
              <CopyBlock
                multiline
                value={JSON.stringify(
                  { mcpServers: { 'outreach-desk': { command: 'npx', args: ['-y', 'mcp-remote', localUrl] } } },
                  null,
                  2,
                )}
              />
            </div>
          )}

          {client === 'code' && (
            <div className="field span-2">
              <p className="muted small">Run once in a terminal:</p>
              <CopyBlock value={`claude mcp add --transport http outreach-desk ${localUrl}`} />
            </div>
          )}

          {client !== 'connector' && (
            <div className="field span-2">
              <label>Local MCP URL</label>
              <CopyBlock value={localUrl} />
            </div>
          )}
        </div>
      </div>

      <div className="form-section">
        <div className="section-intro">
          <h2>Tools</h2>
          <p className="muted">{tools.length} actions Claude can take. It asks before sending or deleting.</p>
        </div>
        <ul className="tool-list">
          {tools.map((t) => (
            <li key={t.name}>
              <div>
                <code>{t.name}</code>
                {t.readOnly && <span className="pill">read</span>}
                {t.destructive && <span className="pill failed">destructive</span>}
              </div>
              <p className="muted">{t.description}</p>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
