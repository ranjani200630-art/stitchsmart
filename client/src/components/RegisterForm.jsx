import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export const RegisterForm = ({ onSwitchToLogin }) => {
  const { register, authError, clearError } = useAuth();
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = (e) => {
    setFormData((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    clearError();

    const { name, email, phone, password, confirmPassword } = formData;

    // Field validations
    if (!name.trim()) {
      setLocalError('Please enter your full name.');
      return;
    }

    if (!email.trim()) {
      setLocalError('Please enter a valid email address.');
      return;
    }

    if (!password) {
      setLocalError('Please enter a password.');
      return;
    }

    if (password.length < 6) {
      setLocalError('Password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    const result = await register(name.trim(), email.trim(), phone.trim(), password);
    setSubmitting(false);

    if (!result.success) {
      setLocalError(result.error);
    }
  };

  return (
    <div className="card auth-card">
      <div className="card-header">
        <h2>Customer Registration</h2>
        <p className="description">
          Create your StitchSmart customer profile to store digital body measurements and book tailored orders.
        </p>
      </div>

      <div className="security-notice">
        <span className="notice-icon">&#128274;</span>
        <span>
          <strong>Security Note:</strong> Public registration creates verified Customer accounts. Admin access requires trusted server-level configuration.
        </span>
      </div>

      {(localError || authError) && (
        <div className="alert alert-error">
          <span className="dot error-dot"></span>
          <span>{localError || authError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="reg-name">Full Name *</label>
          <input
            id="reg-name"
            name="name"
            type="text"
            placeholder="e.g. Priya Sharma"
            value={formData.name}
            onChange={handleChange}
            disabled={submitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-email">Email Address *</label>
          <input
            id="reg-email"
            name="email"
            type="email"
            placeholder="e.g. priya@example.com"
            value={formData.email}
            onChange={handleChange}
            disabled={submitting}
            required
          />
        </div>

        <div className="form-group">
          <label htmlFor="reg-phone">Phone Number (Optional)</label>
          <input
            id="reg-phone"
            name="phone"
            type="tel"
            placeholder="e.g. +91 98765 43210"
            value={formData.phone}
            onChange={handleChange}
            disabled={submitting}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="reg-password">Password (min 6 characters) *</label>
            <input
              id="reg-password"
              name="password"
              type="password"
              placeholder="••••••••"
              value={formData.password}
              onChange={handleChange}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="reg-confirm-password">Confirm Password *</label>
            <input
              id="reg-confirm-password"
              name="confirmPassword"
              type="password"
              placeholder="••••••••"
              value={formData.confirmPassword}
              onChange={handleChange}
              disabled={submitting}
              required
            />
          </div>
        </div>

        <button type="submit" className="btn btn-primary" disabled={submitting}>
          {submitting ? 'Creating Customer Profile...' : 'Register as Customer'}
        </button>
      </form>

      <div className="auth-footer">
        <p>
          Already have an account?{' '}
          <button
            type="button"
            className="link-btn"
            onClick={() => {
              clearError();
              onSwitchToLogin();
            }}
          >
            Sign In Here
          </button>
        </p>
      </div>
    </div>
  );
};
