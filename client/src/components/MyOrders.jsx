import React, { useState, useEffect } from 'react';

const STATUS_COLORS = {
  Pending: 'status-pending',
  Confirmed: 'status-confirmed',
  'In Progress': 'status-progress',
  'Ready for Pickup': 'status-ready',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled'
};

export const MyOrders = ({ setCurrentTab, onSelectOrder }) => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [actionMessage, setActionMessage] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const fetchMyOrders = async () => {
    try {
      setLoading(true);
      setErrorMessage('');
      const res = await fetch('/api/orders/my', {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders || []);
      } else {
        throw new Error(data.message || 'Failed to load your orders');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyOrders();
  }, []);

  // Customer cancellation
  const handleCancelOrder = async (orderId, orderNumber) => {
    const confirmed = window.confirm(
      `Are you sure you want to cancel Order ${orderNumber}? This action cannot be reversed.`
    );
    if (!confirmed) return;

    try {
      setActionLoading(orderId);
      setActionMessage('');
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setActionMessage(`Order ${orderNumber} cancelled successfully.`);
        // Refresh orders list
        fetchMyOrders();
      } else {
        throw new Error(data.message || 'Failed to cancel order');
      }
    } catch (err) {
      alert(`Cancellation failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="card loading-card">
        <div className="spinner"></div>
        <p>Loading your tailoring orders...</p>
      </div>
    );
  }

  return (
    <div className="orders-container">
      <div className="orders-header-row">
        <div>
          <h2>My Tailoring Orders</h2>
          <p className="description">
            Track your custom stitching requests from initial review to completion and pickup.
          </p>
        </div>
        <button
          className="btn btn-primary"
          onClick={() => setCurrentTab('new-order')}
        >
          + Place New Order
        </button>
      </div>

      {actionMessage && (
        <div className="alert alert-success">
          <span className="dot success-dot"></span>
          <span>{actionMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="alert alert-error">
          <span className="dot error-dot"></span>
          <span>{errorMessage}</span>
        </div>
      )}

      {orders.length === 0 ? (
        <div className="card empty-orders-card">
          <span className="empty-icon">&#129697;</span>
          <h3>No Orders Placed Yet</h3>
          <p className="description">
            You haven't placed any tailoring orders yet. Design your custom blouse, kurti, suit, or dress today!
          </p>
          <button
            className="btn btn-primary"
            onClick={() => setCurrentTab('new-order')}
          >
            Order Your First Garment
          </button>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => {
            const canCancel =
              order.status === 'Pending' || order.status === 'Confirmed';
            const canEdit = order.status === 'Pending';
            const statusClass = STATUS_COLORS[order.status] || 'status-pending';

            return (
              <div key={order._id} className="card order-item-card">
                <div className="order-item-header">
                  <div>
                    <span className="order-number-title">{order.orderNumber}</span>
                    <span className="order-item-date">
                      Placed on {new Date(order.orderDate || order.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <span className={`status-pill ${statusClass}`}>{order.status}</span>
                </div>

                <div className="order-item-body">
                  <div className="order-spec-grid">
                    <div>
                      <span className="spec-label">Garment Type</span>
                      <strong className="spec-value capitalize">{order.clothingType}</strong>
                    </div>
                    <div>
                      <span className="spec-label">Quantity</span>
                      <strong className="spec-value">{order.quantity} item(s)</strong>
                    </div>
                    <div>
                      <span className="spec-label">Total Amount</span>
                      <strong className="spec-value price-text">₹{order.price}</strong>
                    </div>
                    <div>
                      <span className="spec-label">Expected Delivery</span>
                      <strong className={`spec-value ${order.isDelayed ? 'text-danger' : ''}`}>
                        {new Date(order.estimatedDeliveryDate).toLocaleDateString()}
                        {order.isDelayed && ' ⚠️ Delayed'}
                      </strong>
                    </div>
                  </div>

                  <div className="order-item-fabric">
                    <span>
                      Fabric: <strong>{order.fabricDetails?.fabricType}</strong> ({order.fabricDetails?.color})
                    </span>
                  </div>
                </div>

                <div className="order-item-footer">
                  <button
                    className="btn btn-outline btn-small"
                    onClick={() => onSelectOrder && onSelectOrder(order)}
                  >
                    Track Order &amp; View Specs
                  </button>

                  <div className="item-actions-right">
                    {canCancel && (
                      <button
                        className="btn btn-secondary btn-small cancel-btn"
                        onClick={() => handleCancelOrder(order._id, order.orderNumber)}
                        disabled={actionLoading === order._id}
                      >
                        {actionLoading === order._id ? 'Cancelling...' : 'Cancel Order'}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
