import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const CustomerProfile = () => {
  const { user, checkAuth } = useAuth();
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Fetch current customer profile
  const fetchProfile = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await fetch('/api/profile/me', {
        method: 'GET',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok && data.success && data.profile) {
        setProfile({
          name: data.profile.name || user?.name || '',
          email: data.profile.email || user?.email || '',
          phone: data.profile.phone || user?.phone || '',
          address: data.profile.address || ''
        });
      } else {
        throw new Error(data.message || 'Failed to load profile');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const handleChange = (e) => {
    setProfile((prev) => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    if (!profile.name.trim()) {
      setErrorMessage('Full name is required.');
      return;
    }

    if (!profile.email.trim()) {
      setErrorMessage('Email address is required.');
      return;
    }

    try {
      setSaving(true);
      const res = await fetch('/api/profile/me', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(profile)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setSuccessMessage('Profile details updated successfully!');
      setProfile({
        name: data.profile.name,
        email: data.profile.email,
        phone: data.profile.phone || '',
        address: data.profile.address || ''
      });
      // Refresh Auth context user data
      if (checkAuth) checkAuth();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="card loading-card">
        <div className="spinner"></div>
        <p>Loading your profile details...</p>
      </div>
    );
  }

  return (
    <div className="card profile-card">
      <div className="card-header">
        <h2>My Customer Profile</h2>
        <p className="description">
          Manage your personal information and delivery address for your tailored garments.
        </p>
      </div>

      {successMessage && (
        <div className="alert alert-success">
          <span className="dot success-dot"></span>
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          <span className="dot error-dot"></span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        <div className="form-group">
          <label htmlFor="profile-name">Full Name *</label>
          <input
            id="profile-name"
            name="name"
            type="text"
            placeholder="e.g. Aanya Verma"
            value={profile.name}
            onChange={handleChange}
            disabled={saving}
            required
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="profile-email">Email Address *</label>
            <input
              id="profile-email"
              name="email"
              type="email"
              placeholder="e.g. aanya@example.com"
              value={profile.email}
              onChange={handleChange}
              disabled={saving}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="profile-phone">Phone Number</label>
            <input
              id="profile-phone"
              name="phone"
              type="tel"
              placeholder="e.g. +91 98765 43210"
              value={profile.phone}
              onChange={handleChange}
              disabled={saving}
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="profile-address">Delivery &amp; Boutique Address</label>
          <textarea
            id="profile-address"
            name="address"
            rows="3"
            className="form-textarea"
            placeholder="Enter your street, area, city, and pincode..."
            value={profile.address}
            onChange={handleChange}
            disabled={saving}
          ></textarea>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
};
