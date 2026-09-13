import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';

export function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <div className={`shell ${open ? 'nav-open' : ''}`}>
      <header className="topbar">
        <div className="brand">
          <span className="mark">OD</span>
          <strong>Outreach Desk</strong>
        </div>
        <button
          type="button"
          className="menu-btn"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          onClick={() => setOpen((value) => !value)}
        >
          <span />
          <span />
          <span />
        </button>
      </header>

      {open && <button type="button" className="nav-backdrop" aria-label="Close menu" onClick={() => setOpen(false)} />}

      <aside className="sidebar">
        <div className="brand desktop-brand">
          <span className="mark">OD</span>
          <div>
            <strong>Outreach Desk</strong>
            <small>Cold mail from hiring posts</small>
          </div>
        </div>
        <nav>
          <NavLink to="/" end>
            Leads
          </NavLink>
          <NavLink to="/campaigns">Campaigns</NavLink>
          <NavLink to="/new">New batch</NavLink>
          <NavLink to="/profile">Profile & resume</NavLink>
        </nav>
        <div className="sidebar-foot">
          <p>{user?.name}</p>
          <button type="button" className="linkish" onClick={logout}>
            Sign out
          </button>
        </div>
      </aside>
      <main className="main">
        <Outlet />
      </main>
    </div>
  );
}
