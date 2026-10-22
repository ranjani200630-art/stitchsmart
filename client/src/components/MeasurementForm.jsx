import React, { useState, useEffect } from 'react';

const MEASUREMENT_CONFIG = [
  { name: 'height', label: 'Body Height', min: 50, max: 250, desc: 'Total vertical height' },
  { name: 'shoulder', label: 'Shoulder Width', min: 20, max: 80, desc: 'Tip of shoulder to tip' },
  { name: 'chest', label: 'Chest / Bust', min: 40, max: 180, desc: 'Fullest part of chest' },
  { name: 'waist', label: 'Natural Waist', min: 40, max: 180, desc: 'Around natural waistline' },
  { name: 'hip', label: 'Hip Circumference', min: 40, max: 200, desc: 'Fullest part of hips' },
  { name: 'sleeve', label: 'Sleeve Length', min: 10, max: 100, desc: 'Shoulder point to wrist' },
  { name: 'armhole', label: 'Armhole', min: 15, max: 80, desc: 'Armhole circumference' },
  { name: 'neck', label: 'Neck Circumference', min: 20, max: 65, desc: 'Base of the neck' },
  { name: 'length', label: 'Garment Length', min: 20, max: 220, desc: 'Shoulder to desired hem' }
];

export const MeasurementForm = () => {
  const [measurements, setMeasurements] = useState({
    height: '',
    shoulder: '',
    chest: '',
    waist: '',
    hip: '',
    sleeve: '',
    armhole: '',
    neck: '',
    length: ''
  });

  const [hasExisting, setHasExisting] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load existing saved measurements
  const fetchMeasurements = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await fetch('/api/measurements/me', {
        method: 'GET',
        credentials: 'include'
      });

      const data = await res.json();
      if (res.ok && data.success && data.measurement) {
        const m = data.measurement;
        setMeasurements({
          height: m.height ?? '',
          shoulder: m.shoulder ?? '',
          chest: m.chest ?? '',
          waist: m.waist ?? '',
          hip: m.hip ?? '',
          sleeve: m.sleeve ?? '',
          armhole: m.armhole ?? '',
          neck: m.neck ?? '',
          length: m.length ?? ''
        });
        setHasExisting(true);
        setLastUpdated(m.updatedAt || m.createdAt);
      } else {
        setHasExisting(false);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeasurements();
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setMeasurements((prev) => ({
      ...prev,
      [name]: value
    }));
    setSuccessMessage('');
    setErrorMessage('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSuccessMessage('');
    setErrorMessage('');

    // Front-end client-side validation
    for (const config of MEASUREMENT_CONFIG) {
      const val = measurements[config.name];
      if (val === '' || val === null || val === undefined) {
        setErrorMessage(`Please enter a value for ${config.label}.`);
        return;
      }
      const num = Number(val);
      if (isNaN(num)) {
        setErrorMessage(`${config.label} must be a valid number.`);
        return;
      }
      if (num < config.min || num > config.max) {
        setErrorMessage(
          `${config.label} must be between ${config.min} cm and ${config.max} cm.`
        );
        return;
      }
    }

    try {
      setSaving(true);
      const method = hasExisting ? 'PUT' : 'POST';
      const res = await fetch('/api/measurements/me', {
        method,
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(measurements)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        const detailError =
          data.errors && data.errors.length > 0
            ? data.errors.join('; ')
            : data.message || 'Failed to save measurements';
        throw new Error(detailError);
      }

      setHasExisting(true);
      setSuccessMessage(
        hasExisting
          ? 'Measurements updated successfully!'
          : 'Measurements saved successfully!'
      );
      if (data.measurement && (data.measurement.updatedAt || data.measurement.createdAt)) {
        setLastUpdated(data.measurement.updatedAt || data.measurement.createdAt);
      }
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
        <p>Loading your saved measurements...</p>
      </div>
    );
  }

  return (
    <div className="card measurement-card">
      <div className="card-header">
        <div className="header-badge-row">
          <h2>My Tailoring Measurements</h2>
          <span className="unit-badge">Unit: Centimetres (cm)</span>
        </div>
        <p className="description">
          Enter your exact body dimensions in centimetres. These measurements will be directly used for precision custom tailoring.
        </p>
        {lastUpdated && (
          <p className="last-saved-note">
            <span className="dot success-dot"></span>
            Last saved: {new Date(lastUpdated).toLocaleString()}
          </p>
        )}
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

      <form onSubmit={handleSubmit} className="measurement-form">
        <div className="measurement-grid">
          {MEASUREMENT_CONFIG.map((field) => (
            <div key={field.name} className="measurement-item">
              <label htmlFor={`m-${field.name}`}>
                <span className="field-title">{field.label} *</span>
                <span className="field-range">
                  ({field.min} - {field.max} cm)
                </span>
              </label>

              <div className="input-with-unit">
                <input
                  id={`m-${field.name}`}
                  name={field.name}
                  type="number"
                  step="0.5"
                  min={field.min}
                  max={field.max}
                  placeholder={`e.g. ${Math.round((field.min + field.max) / 2)}`}
                  value={measurements[field.name]}
                  onChange={handleChange}
                  disabled={saving}
                  required
                />
                <span className="unit-suffix">cm</span>
              </div>
              <span className="field-hint">{field.desc}</span>
            </div>
          ))}
        </div>

        <div className="form-actions measurement-actions">
          <button type="submit" className="btn btn-primary btn-large" disabled={saving}>
            {saving
              ? 'Saving Measurements...'
              : hasExisting
              ? 'Update Measurements (cm)'
              : 'Save My Measurements (cm)'}
          </button>
        </div>
      </form>
    </div>
  );
};
