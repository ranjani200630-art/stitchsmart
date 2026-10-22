import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

export const CustomerDashboard = ({ setCurrentTab }) => {
  const { user, logout } = useAuth();
  const [profileData, setProfileData] = useState(null);
  const [measurementData, setMeasurementData] = useState(null);
  const [orderCount, setOrderCount] = useState(0);
  const [activeOrderCount, setActiveOrderCount] = useState(0);
  const [loadingSummary, setLoadingSummary] = useState(true);
  const [adminTestResult, setAdminTestResult] = useState(null);
  const [testingAdmin, setTestingAdmin] = useState(false);

  useEffect(() => {
    const loadSummaries = async () => {
      try {
        setLoadingSummary(true);
        const [profRes, measRes, ordersRes] = await Promise.all([
          fetch('/api/profile/me', { credentials: 'include' }),
          fetch('/api/measurements/me', { credentials: 'include' }),
          fetch(user?.role === 'admin' ? '/api/orders' : '/api/orders/my', { credentials: 'include' })
        ]);

        if (profRes.ok) {
          const pJson = await profRes.json();
          if (pJson.success) setProfileData(pJson.profile);
        }

        if (measRes.ok) {
          const mJson = await measRes.json();
          if (mJson.success) setMeasurementData(mJson.measurement);
        }

        if (ordersRes.ok) {
          const oJson = await ordersRes.json();
          if (oJson.success && oJson.orders) {
            setOrderCount(oJson.orders.length);
            const active = oJson.orders.filter(
              (o) => !['Completed', 'Cancelled'].includes(o.status)
            ).length;
            setActiveOrderCount(active);
          }
        }
      } catch (err) {
        console.warn('Summary load notice:', err.message);
      } finally {
        setLoadingSummary(false);
      }
    };

    loadSummaries();
  }, [user]);

  const testAdminAccess = async () => {
    setTestingAdmin(true);
    setAdminTestResult(null);
    try {
      const res = await fetch('/api/auth/admin-check', {
        method: 'GET',
        credentials: 'include'
      });
      const data = await res.json();
      setAdminTestResult({
        status: res.status,
        ok: res.ok,
        data
      });
    } catch (err) {
      setAdminTestResult({
        status: 'Network Error',
        ok: false,
        data: { message: err.message }
      });
    } finally {
      setTestingAdmin(false);
    }
  };

  if (!user) return null;

  const roleFormatted = user.role ? user.role.toUpperCase() : 'CUSTOMER';
  const isAdmin = user.role === 'admin';

  return (
    <div className="dashboard-container">
      {/* Header Profile */}
      <div className="card user-profile-card">
        <div className="profile-header">
          <div className="avatar-circle">
            {user.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </div>
          <div>
            <h2>Welcome, {user.name}!</h2>
            <div className="badge-row">
              <span className={`role-badge ${isAdmin ? 'admin-badge' : 'customer-badge'}`}>
                {roleFormatted}
              </span>
              <span className="session-badge">
                <span className="dot success-dot"></span> Session Active (HttpOnly Cookie)
              </span>
            </div>
          </div>
          <button className="btn btn-secondary logout-btn" onClick={logout}>
            Sign Out
          </button>
        </div>

        <div className="user-details-grid">
          <div className="detail-item">
            <span className="detail-label">Full Name</span>
            <strong>{profileData?.name || user.name}</strong>
          </div>
          <div className="detail-item">
            <span className="detail-label">Email Address</span>
            <strong>{profileData?.email || user.email}</strong>
          </div>
          <div className="detail-item">
            <span className="detail-label">Phone Number</span>
            <strong>{profileData?.phone || user.phone || 'Not provided'}</strong>
          </div>
          <div className="detail-item">
            <span className="detail-label">Delivery Address</span>
            <strong>{profileData?.address || 'No address saved yet'}</strong>
          </div>
        </div>
      </div>

      {/* Phase 5 Online Order Quick Action Cards */}
      <div className="dashboard-stats-row">
        <div className="card stat-card">
          <span className="stat-label">Total Orders</span>
          <strong className="stat-number">{orderCount}</strong>
          <span className="stat-desc">
            {isAdmin ? 'Total boutique tailoring orders' : 'Orders placed by your profile'}
          </span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Active Workload</span>
          <strong className="stat-number accent-number">{activeOrderCount}</strong>
          <span className="stat-desc">In-production / Awaiting pickup</span>
        </div>
        <div className="card stat-card">
          <span className="stat-label">Measurement Status</span>
          <strong className="stat-number status-ok-number">
            {measurementData ? 'Saved' : 'Missing'}
          </strong>
          <span className="stat-desc">
            {measurementData ? '9 dimensions ready in cm' : 'Please record dimensions'}
          </span>
        </div>
      </div>

      <div className="phase4-actions-grid">
        {/* Orders Card */}
        <div className="card action-summary-card">
          <div className="action-header">
            <span className="action-icon">&#128087;</span>
            <div>
              <h3>
                {isAdmin ? 'Boutique Orders Dashboard' : 'Online Tailoring Orders'}
              </h3>
              <p className="description">
                {isAdmin
                  ? 'Manage incoming orders, advance production, and update delivery dates'
                  : 'Place custom dress orders without store visits & track progress live'}
              </p>
            </div>
          </div>
          <div className="action-body">
            <p className="summary-status">
              Current Active Orders: <strong>{activeOrderCount} in progress</strong>
            </p>
          </div>
          <div className="action-buttons-row">
            {isAdmin ? (
              <button
                className="btn btn-primary"
                onClick={() => setCurrentTab('admin-orders')}
              >
                Manage Boutique Orders &rarr;
              </button>
            ) : (
              <>
                <button
                  className="btn btn-primary"
                  onClick={() => setCurrentTab('new-order')}
                >
                  + Place New Order
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setCurrentTab('orders')}
                >
                  View My Orders ({orderCount})
                </button>
              </>
            )}
          </div>
        </div>

        {/* Measurements Card */}
        <div className="card action-summary-card">
          <div className="action-header">
            <span className="action-icon">&#128207;</span>
            <div>
              <h3>Body Measurements (cm)</h3>
              <p className="description">Digital tailoring dimensions used for order cutting &amp; stitching</p>
            </div>
          </div>
          <div className="action-body">
            {measurementData ? (
              <div className="measurement-chips">
                <span className="m-chip">Chest: {measurementData.chest} cm</span>
                <span className="m-chip">Waist: {measurementData.waist} cm</span>
                <span className="m-chip">Hip: {measurementData.hip} cm</span>
                <span className="m-chip">Height: {measurementData.height} cm</span>
              </div>
            ) : (
              <p className="summary-status pending-status">
                <span className="dot error-dot"></span> No measurements saved yet
              </p>
            )}
          </div>
          <button
            className="btn btn-outline"
            onClick={() => setCurrentTab('measurements')}
          >
            {measurementData ? 'Update Measurements (cm)' : 'Record Measurements (cm)'}
          </button>
        </div>
      </div>

      {/* RBAC Verification */}
      <div className="card test-card">
        <h3>Role-Based Access Control (RBAC) Verification</h3>
        <p className="description">
          Test server-side role authorization middleware. Customer accounts are strictly denied access to Admin endpoints.
        </p>

        <button
          className="btn btn-outline"
          onClick={testAdminAccess}
          disabled={testingAdmin}
        >
          {testingAdmin ? 'Testing Access...' : 'Test Admin-Only Route (GET /api/auth/admin-check)'}
        </button>

        {adminTestResult && (
          <div
            className={`test-result-box ${
              adminTestResult.ok ? 'result-success' : 'result-denied'
            }`}
          >
            <div className="result-header">
              <strong>HTTP Status: {adminTestResult.status}</strong>
              <span className="result-type">
                {adminTestResult.ok ? 'ACCESS GRANTED' : 'ACCESS FORBIDDEN (Expected for Customer)'}
              </span>
            </div>
            <pre className="json-output">
              {JSON.stringify(adminTestResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
