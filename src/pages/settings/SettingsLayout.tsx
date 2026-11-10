import { NavLink, Outlet } from 'react-router-dom';

const TABS = [
  { to: '/settings/email', label: 'Email', description: 'SMTP account used to send' },
  { to: '/settings/mcp', label: 'MCP', description: 'Use Outreach Desk from Claude' },
];

export function SettingsLayout() {
  return (
    <section className="settings-page">
      <header className="page-head">
        <div>
          <p className="eyebrow">Workspace</p>
          <h1>Settings</h1>
        </div>
      </header>
      <div className="settings-shell">
        <nav className="settings-tabs" aria-label="Settings sections">
          {TABS.map((tab) => (
            <NavLink key={tab.to} to={tab.to} className="settings-tab">
              <strong>{tab.label}</strong>
              <span>{tab.description}</span>
            </NavLink>
          ))}
        </nav>
        <div className="settings-content">
          <Outlet />
        </div>
      </div>
    </section>
  );
}
