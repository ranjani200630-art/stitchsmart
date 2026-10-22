import React, { useState, useEffect } from 'react';

export const HealthCard = () => {
  const [healthData, setHealthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const checkHealth = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/health');
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      const data = await response.json();
      setHealthData(data);
    } catch (err) {
      setError(err.message || 'Failed to connect to backend');
      setHealthData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    checkHealth();
  }, []);

  const dbStatus = healthData?.database?.status || 'disconnected';
  const isDbConnected = dbStatus === 'connected';

  return (
    <div className="card health-card">
      <h2>Backend &amp; Database Health Status</h2>
      <p className="description">
        Live status from Express backend and MongoDB via <code>GET /api/health</code>
      </p>

      <div className="status-box">
        {loading && <div className="status loading">Checking backend and database status...</div>}
        {error && (
          <div className="status error">
            <span className="dot error-dot"></span>
            <strong>Disconnected:</strong> {error}
            <p className="hint">Ensure the backend server is running on port 5000.</p>
          </div>
        )}
        {healthData && (
          <div className="status success">
            <div className="status-header">
              <span className="dot success-dot"></span>
              <strong>API Server: {healthData.status?.toUpperCase()}</strong>
              <span style={{ marginLeft: 'auto' }}>
                <span className={`dot ${isDbConnected ? 'success-dot' : 'error-dot'}`}></span>
                {' '}MongoDB: <strong>{dbStatus.toUpperCase()}</strong>
              </span>
            </div>
            <pre className="json-output">
              {JSON.stringify(healthData, null, 2)}
            </pre>
          </div>
        )}
      </div>

      <button className="btn btn-outline" onClick={checkHealth} disabled={loading}>
        {loading ? 'Testing...' : 'Re-test Health Check'}
      </button>
    </div>
  );
};
