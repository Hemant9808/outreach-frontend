import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth';

export function Login() {
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [canRegister, setCanRegister] = useState(false);

  useEffect(() => {
    const timer = window.setTimeout(() => setCanRegister(true), 2000);
    api<{ hasUser: boolean }>('/auth/status')
      .then((s) => {
        window.clearTimeout(timer);
        setCanRegister(!s.hasUser);
      })
      .catch(() => {
        window.clearTimeout(timer);
        setCanRegister(true);
      });
    return () => window.clearTimeout(timer);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not sign in');
    }
  }

  return (
    <div className="auth-page">
      <form className="panel auth-card" onSubmit={onSubmit}>
        <p className="eyebrow">Outreach Desk</p>
        <h1>Sign in</h1>
        <p className="muted">Single-user workspace for hiring-post outreach.</p>
        {error && <p className="error">{error}</p>}
        <label>
          Email
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        </label>
        <label>
          Password
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        </label>
        <button type="submit">Enter desk</button>
        {canRegister && (
          <p className="muted">
            First time? <Link to="/register">Create the account</Link>
          </p>
        )}
      </form>
    </div>
  );
}
