import { useState } from 'react';
import { api } from '../services/api';
import type { AuthUser } from '../types';
import './Auth.css';

interface RegisterPageProps {
  onSuccess: (user: AuthUser, token: string) => void;
  onNavigateLogin: () => void;
}

export default function RegisterPage({ onSuccess, onNavigateLogin }: RegisterPageProps) {
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setLoading(true);
    try {
      const response = await api.auth.register({ email, password, full_name: fullName });
      onSuccess(response.user, response.access_token);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Registration failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <h2 className="auth-title">Create account</h2>
        <p className="auth-subtitle">Start generating nutrition labels</p>

        {error && <div className="auth-error">{error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label htmlFor="reg-name" className="auth-label">Full name</label>
            <input
              id="reg-name"
              type="text"
              className="auth-input"
              placeholder="Jane Smith"
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-email" className="auth-label">Email</label>
            <input
              id="reg-email"
              type="email"
              className="auth-input"
              placeholder="you@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="reg-password" className="auth-label">Password</label>
            <input
              id="reg-password"
              type="password"
              className="auth-input"
              placeholder="Min. 8 characters"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
          </div>

          <button type="submit" className="auth-btn-primary" disabled={loading}>
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account?{' '}
          <button type="button" className="auth-link-btn" onClick={onNavigateLogin}>
            Sign in
          </button>
        </p>
      </div>
    </div>
  );
}
