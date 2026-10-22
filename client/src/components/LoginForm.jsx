import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const LoginForm = ({ onSwitchToRegister }) => {
  const { login, authError, clearError } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    if (!email.trim() || !password) {
      setLocalError('Please enter both email and password.');
      return;
    }

    setSubmitting(true);
    const result = await login(email.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="card auth-card">
      <div className="card-header">
        <h2>Customer &amp; Tailor Login</h2>
        <p className="description">
          Sign in to your StitchSmart account to track your orders, body measurements, and schedules.
        </p>
      </div>

      {(localError || authError) && (
        <div className="alert alert-error">
          <span className="dot error-dot"></span>
          <span>{localError || authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="login-email">Email Address</label>
          <input
            id="login-email"
            type="email"
            placeholder="e.g. tailor@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="login-password">Password</label>
          <input
            id="login-password"
            type="password"
            placeholder="Enter your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            disabled={submitting}
            required
          />
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Authenticating...' : 'Sign In'}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Don't have an account yet?{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              clearError();
              onSwitchToRegister();
            }}
          >
            Create Customer Account
          </button>
        </p>
      </div>
    </div>
  );
};
