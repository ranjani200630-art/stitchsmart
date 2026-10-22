import React, { useState, useEffect } from 'react';

const BASE_PRICES = {
  blouse: 800,
  chudi: 900,
  kurti: 700,
  shirt: 650,
  dress: 1200,
  other: 1000
};

export const NewOrder = ({ setCurrentTab, onOrderCreated }) => {
  const [measurements, setMeasurements] = useState(null);
  const [loadingMeasurements, setLoadingMeasurements] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  // Form fields
  const [clothingType, setClothingType] = useState('blouse');
  const [quantity, setQuantity] = useState(1);
  const [fabricType, setFabricType] = useState('');
  const [fabricColor, setFabricColor] = useState('');
  const [fabricNotes, setFabricNotes] = useState('');
  const [designDetails, setDesignDetails] = useState('');
  const [specialInstructions, setSpecialInstructions] = useState('');
  const [estimatedDeliveryDate, setEstimatedDeliveryDate] = useState('');

  // Tomorrow's date string for min date picker
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const minDateStr = tomorrow.toISOString().split('T')[0];

  // Fetch saved measurements to verify and preview
  useEffect(() => {
    const fetchMeasurements = async () => {
      try {
        setLoadingMeasurements(true);
        const res = await fetch('/api/measurements/me', {
          credentials: 'include'
        });
        const data = await res.json();
        if (res.ok && data.success && data.measurement) {
          setMeasurements(data.measurement);
        } else {
          setMeasurements(null);
        }
      } catch (err) {
        console.warn('Measurement check error:', err.message);
      } finally {
        setLoadingMeasurements(false);
      }
    };

    fetchMeasurements();
  }, []);

  const calculatedPrice = (BASE_PRICES[clothingType] || 1000) * (parseInt(quantity, 10) || 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessOrder(null);

    if (!measurements) {
      setErrorMessage(
        'You must save your tailoring measurements before placing an order. Please visit My Measurements.'
      );
      return;
    }

    if (!designDetails.trim()) {
      setErrorMessage('Please describe the design details for your garment.');
      return;
    }

    if (!fabricType.trim() || !fabricColor.trim()) {
      setErrorMessage('Please provide both the fabric type and colour.');
      return;
    }

    if (!estimatedDeliveryDate) {
      setErrorMessage('Please choose your expected delivery date.');
      return;
    }

    const payload = {
      clothingType,
      quantity: parseInt(quantity, 10) || 1,
      designDetails: designDetails.trim(),
      fabricDetails: {
        fabricType: fabricType.trim(),
        color: fabricColor.trim(),
        notes: fabricNotes.trim()
      },
      specialInstructions: specialInstructions.trim(),
      estimatedDeliveryDate
    };

    try {
      setSubmitting(true);
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Failed to place order');
      }

      setSuccessOrder(data.order);
      if (onOrderCreated) {
        onOrderCreated(data.order);
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingMeasurements) {
    return (
      <div className="card loading-card">
        <div className="spinner"></div>
        <p>Verifying saved measurements profile...</p>
      </div>
    );
  }

  // If customer has no measurements, guide them
  if (!measurements) {
    return (
      <div className="card alert-card">
        <div className="warning-banner">
          <span className="warning-icon">&#9888;</span>
          <div>
            <h3>Measurements Required Before Ordering</h3>
            <p className="description">
              To guarantee perfect fitting garments, StitchSmart requires your body measurements in centimetres (cm) before placing any tailor order.
            </p>
          </div>
        </div>
        <div className="form-actions" style={{ justifyContent: 'center', marginTop: '1.5rem' }}>
          <button
            className="btn btn-primary btn-large"
            onClick={() => setCurrentTab('measurements')}
          >
            Record My Measurements Now (cm)
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card order-card">
      <div className="card-header">
        <div className="header-badge-row">
          <h2>Place New Tailoring Order</h2>
          <span className="unit-badge">INR Standard Pricing</span>
        </div>
        <p className="description">
          Order custom-stitched garments online without store visits. Your saved body measurements will be automatically linked.
        </p>
      </div>

      {successOrder && (
        <div className="alert alert-success order-success-banner">
          <span className="dot success-dot"></span>
          <div>
            <strong>Order Placed Successfully!</strong>
            <p>
              Order Number: <strong>{successOrder.orderNumber}</strong> | Base Price: <strong>₹{successOrder.price}</strong> | Status: <strong>{successOrder.status}</strong>
            </p>
            <div style={{ marginTop: '0.6rem' }}>
              <button
                className="btn btn-secondary btn-small"
                onClick={() => setCurrentTab('orders')}
              >
                View in My Orders &rarr;
              </button>
            </div>
          </div>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          <span className="dot error-dot"></span>
          <span>{errorMessage}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form">
        {/* Clothing Type & Quantity */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="order-clothing-type">Garment / Clothing Type *</label>
            <select
              id="order-clothing-type"
              className="form-select"
              value={clothingType}
              onChange={(e) => setClothingType(e.target.value)}
              disabled={submitting}
              required
            >
              <option value="blouse">Saree Blouse (Base ₹800)</option>
              <option value="chudi">Chudidar / Salwar Suit (Base ₹900)</option>
              <option value="kurti">Kurti / Tunic (Base ₹700)</option>
              <option value="shirt">Tailored Shirt (Base ₹650)</option>
              <option value="dress">Dress / Gown / Anarkali (Base ₹1200)</option>
              <option value="other">Other / Custom Outfit (Base ₹1000)</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="order-quantity">Quantity *</label>
            <input
              id="order-quantity"
              type="number"
              min="1"
              max="20"
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
              disabled={submitting}
              required
            />
          </div>
        </div>

        {/* Live Price Estimation Box */}
        <div className="price-estimation-box">
          <span className="price-label">Estimated Price in Indian Rupees (₹):</span>
          <span className="price-amount">₹{calculatedPrice}</span>
          <span className="price-subtext">
            (Unit price ₹{BASE_PRICES[clothingType] || 1000} &times; {quantity} item{quantity > 1 ? 's' : ''})
          </span>
        </div>

        {/* Fabric Details */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="order-fabric-type">Fabric Material / Type *</label>
            <input
              id="order-fabric-type"
              type="text"
              placeholder="e.g. Cotton, Pure Silk, Georgette, Chiffon"
              value={fabricType}
              onChange={(e) => setFabricType(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="order-fabric-color">Fabric Colour *</label>
            <input
              id="order-fabric-color"
              type="text"
              placeholder="e.g. Royal Blue with Golden Zari"
              value={fabricColor}
              onChange={(e) => setFabricColor(e.target.value)}
              disabled={submitting}
              required
            />
          </div>
        </div>

        <div className="form-group">
          <label htmlFor="order-fabric-notes">Fabric Source / Extra Notes (Optional)</label>
          <input
            id="order-fabric-notes"
            type="text"
            placeholder="e.g. Customer provided fabric / Tailor shop material"
            value={fabricNotes}
            onChange={(e) => setFabricNotes(e.target.value)}
            disabled={submitting}
          />
        </div>

        {/* Design Details */}
        <div className="form-group">
          <label htmlFor="order-design-details">Design &amp; Styling Specifications *</label>
          <textarea
            id="order-design-details"
            rows="3"
            className="form-textarea"
            placeholder="Specify neckline style (Round, V-neck, Boat neck), sleeve design (Full, 3/4th, Sleeveless), back opening hooks/zipper, borders, and lining instructions..."
            value={designDetails}
            onChange={(e) => setDesignDetails(e.target.value)}
            disabled={submitting}
            required
          ></textarea>
        </div>

        {/* Delivery Date */}
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="order-delivery-date">Requested Delivery Date *</label>
            <input
              id="order-delivery-date"
              type="date"
              min={minDateStr}
              value={estimatedDeliveryDate}
              onChange={(e) => setEstimatedDeliveryDate(e.target.value)}
              disabled={submitting}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="order-special-instructions">Special Instructions (Optional)</label>
            <input
              id="order-special-instructions"
              type="text"
              placeholder="e.g. Urgently needed for wedding on weekend"
              value={specialInstructions}
              onChange={(e) => setSpecialInstructions(e.target.value)}
              disabled={submitting}
            />
          </div>
        </div>

        {/* Attached Measurement Snapshot Preview */}
        <div className="measurement-snapshot-preview">
          <h4>
            <span>&#128207; Attached Measurement Dimensions (cm)</span>
            <button
              type="button"
              className="link-btn"
              onClick={() => setCurrentTab('measurements')}
              style={{ fontSize: '0.82rem' }}
            >
              Edit in My Measurements
            </button>
          </h4>
          <div className="snapshot-grid">
            <span>Chest: <strong>{measurements.chest} cm</strong></span>
            <span>Waist: <strong>{measurements.waist} cm</strong></span>
            <span>Hip: <strong>{measurements.hip} cm</strong></span>
            <span>Height: <strong>{measurements.height} cm</strong></span>
            <span>Shoulder: <strong>{measurements.shoulder} cm</strong></span>
            <span>Sleeve: <strong>{measurements.sleeve} cm</strong></span>
            <span>Armhole: <strong>{measurements.armhole} cm</strong></span>
            <span>Neck: <strong>{measurements.neck} cm</strong></span>
            <span>Length: <strong>{measurements.length} cm</strong></span>
          </div>
          <p className="snapshot-notice">
            A frozen snapshot of these measurements will be permanently linked to this order.
          </p>
        </div>

        <div className="form-actions">
          <button type="submit" className="btn btn-primary btn-large" disabled={submitting}>
            {submitting ? 'Placing Order...' : `Confirm & Place Order (₹${calculatedPrice})`}
          </button>
        </div>
      </form>
    </div>
  );
};
