import React from 'react';
import { ProgressTracker } from './ProgressTracker';

const STATUS_COLORS = {
  Pending: 'status-pending',
  Confirmed: 'status-confirmed',
  'In Progress': 'status-progress',
  'Ready for Pickup': 'status-ready',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled'
};

const formatDateTime = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
};

const formatDateOnly = (dateString) => {
  if (!dateString) return 'N/A';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return 'N/A';
  return d.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
};

export const OrderDetailsModal = ({ order, onClose }) => {
  if (!order) return null;

  const m = order.measurements || {};
  const statusClass = STATUS_COLORS[order.status] || 'status-pending';
  const statusHistory = order.statusHistory || [];
  const deliveryDateHistory = order.deliveryDateHistory || [];

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content modal-large" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <div className="modal-title-row">
              <span className="order-number-title">{order.orderNumber}</span>
              <span className={`status-pill ${statusClass}`}>{order.status}</span>
              {order.isDelayed && (
                <span className="status-pill status-delayed" title="Delivery date has passed">
                  &#9888; Delayed / Overdue
                </span>
              )}
            </div>
            <p className="modal-subtitle">
              Garment: <strong className="capitalize">{order.clothingType}</strong> • Placed on{' '}
              {formatDateOnly(order.orderDate || order.createdAt)}
            </p>
          </div>
          <button className="modal-close-btn" onClick={onClose}>
            &times;
          </button>
        </div>

        <div className="modal-body">
          {/* Visual Order Progress Tracker */}
          <div className="modal-section-card">
            <h4>Live Order Progress Tracker</h4>
            <ProgressTracker status={order.status} statusHistory={statusHistory} />
          </div>

          {/* Key Order Specs Grid */}
          <div className="modal-section-grid">
            <div>
              <span className="spec-label">Garment Type</span>
              <strong className="spec-value capitalize">{order.clothingType}</strong>
            </div>
            <div>
              <span className="spec-label">Quantity</span>
              <strong className="spec-value">{order.quantity} item(s)</strong>
            </div>
            <div>
              <span className="spec-label">Tailoring Price</span>
              <strong className="spec-value price-text">₹{order.price}</strong>
            </div>
            <div>
              <span className="spec-label">Estimated Delivery</span>
              <strong className={`spec-value ${order.isDelayed ? 'text-danger' : ''}`}>
                {formatDateOnly(order.estimatedDeliveryDate)}
                {order.isDelayed && ' (Overdue)'}
              </strong>
            </div>
          </div>

          {/* Status Timeline History */}
          <div className="modal-section-card">
            <div className="header-badge-row">
              <h4>Order Status History</h4>
              <span className="unit-badge">{statusHistory.length} Event(s) Recorded</span>
            </div>

            {statusHistory.length === 0 ? (
              <p className="detail-notes">No prior status updates recorded.</p>
            ) : (
              <div className="timeline-container">
                {statusHistory.map((entry, idx) => {
                  const entryStatusClass = STATUS_COLORS[entry.status] || 'status-pending';
                  const changedByName = entry.changedBy?.name
                    ? `${entry.changedBy.name} (${entry.changedBy.role || 'Staff'})`
                    : 'System / Tailor Staff';

                  return (
                    <div className="timeline-item" key={entry._id || idx}>
                      <div className="timeline-marker">
                        <span className={`timeline-dot ${entryStatusClass}`}></span>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <span className={`status-pill status-pill-sm ${entryStatusClass}`}>
                            {entry.status}
                          </span>
                          <span className="timeline-time">{formatDateTime(entry.changedAt)}</span>
                        </div>
                        {entry.note && <p className="timeline-note">{entry.note}</p>}
                        <span className="timeline-author">Updated by: {changedByName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Delivery Date Audit History (if available) */}
          {deliveryDateHistory.length > 0 && (
            <div className="modal-section-card">
              <div className="header-badge-row">
                <h4>Delivery Date Schedule Updates</h4>
                <span className="unit-badge">{deliveryDateHistory.length} Schedule Revision(s)</span>
              </div>
              <div className="timeline-container">
                {deliveryDateHistory.map((dh, idx) => {
                  const changedByName = dh.changedBy?.name
                    ? `${dh.changedBy.name} (${dh.changedBy.role || 'Staff'})`
                    : 'Tailor Staff';
                  return (
                    <div className="timeline-item" key={dh._id || idx}>
                      <div className="timeline-marker">
                        <span className="timeline-dot status-confirmed"></span>
                      </div>
                      <div className="timeline-content">
                        <div className="timeline-header">
                          <strong className="timeline-schedule-shift">
                            {formatDateOnly(dh.previousDate)} &rarr; {formatDateOnly(dh.newDate)}
                          </strong>
                          <span className="timeline-time">{formatDateTime(dh.changedAt)}</span>
                        </div>
                        {dh.reason && <p className="timeline-note">{dh.reason}</p>}
                        <span className="timeline-author">Adjusted by: {changedByName}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Fabric & Design Details */}
          <div className="modal-detail-block">
            <h4>Fabric Specifications</h4>
            <p>
              Material: <strong>{order.fabricDetails?.fabricType}</strong> | Colour:{' '}
              <strong>{order.fabricDetails?.color}</strong>
            </p>
            {order.fabricDetails?.notes && (
              <p className="detail-notes">Notes: {order.fabricDetails.notes}</p>
            )}
          </div>

          <div className="modal-detail-block">
            <h4>Design &amp; Styling Instructions</h4>
            <p className="detail-text">{order.designDetails}</p>
          </div>

          {order.specialInstructions && (
            <div className="modal-detail-block">
              <h4>Special Instructions</h4>
              <p className="detail-text">{order.specialInstructions}</p>
            </div>
          )}

          {/* Measurement Snapshot in CM */}
          <div className="modal-detail-block">
            <div className="header-badge-row">
              <h4>Measurement Dimensions (cm)</h4>
              <span className="unit-badge">Snapshot at Order Placement</span>
            </div>
            <div className="snapshot-grid">
              <span>Chest: <strong>{m.chest} cm</strong></span>
              <span>Waist: <strong>{m.waist} cm</strong></span>
              <span>Hip: <strong>{m.hip} cm</strong></span>
              <span>Height: <strong>{m.height} cm</strong></span>
              <span>Shoulder: <strong>{m.shoulder} cm</strong></span>
              <span>Sleeve: <strong>{m.sleeve} cm</strong></span>
              <span>Armhole: <strong>{m.armhole} cm</strong></span>
              <span>Neck: <strong>{m.neck} cm</strong></span>
              <span>Length: <strong>{m.length} cm</strong></span>
            </div>
          </div>
        </div>

        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
