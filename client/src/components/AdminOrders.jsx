import React, { useState, useEffect } from 'react';

const VALID_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['In Progress', 'Cancelled'],
  'In Progress': ['Ready for Pickup', 'Cancelled'],
  'Ready for Pickup': ['Completed'],
  Completed: [],
  Cancelled: []
};

const STATUS_COLORS = {
  Pending: 'status-pending',
  Confirmed: 'status-confirmed',
  'In Progress': 'status-progress',
  'Ready for Pickup': 'status-ready',
  Completed: 'status-completed',
  Cancelled: 'status-cancelled'
};

export const AdminOrders = ({ onSelectOrder }) => {
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    readyForPickup: 0,
    completed: 0,
    cancelled: 0,
    delayed: 0
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState('All');
  const [actionLoading, setActionLoading] = useState(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  // Editing state for price / delivery date
  const [editingOrder, setEditingOrder] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [editDeliveryDate, setEditDeliveryDate] = useState('');
  const [editReason, setEditReason] = useState('');

  // Load summary stats from /api/orders/stats/summary
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/orders/stats/summary', {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success && data.stats) {
        setStats(data.stats);
      }
    } catch (err) {
      console.warn('Failed to load stats:', err.message);
    }
  };

  const fetchOrders = async (status = filterStatus) => {
    try {
      setLoading(true);
      setErrorMessage('');
      const query = status && status !== 'All' ? `?status=${encodeURIComponent(status)}` : '';
      const res = await fetch(`/api/orders${query}`, {
        credentials: 'include'
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setOrders(data.orders || []);
      } else {
        throw new Error(data.message || 'Failed to load orders');
      }
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders(filterStatus);
    fetchStats();
  }, [filterStatus]);

  // Handle status transition
  const handleStatusChange = async (orderId, newStatus) => {
    try {
      setActionLoading(orderId);
      setSuccessMessage('');
      setErrorMessage('');

      const res = await fetch(`/api/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          status: newStatus,
          note: `Status updated to '${newStatus}' by tailor management`
        })
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Status update failed');
      }

      setSuccessMessage(`Order ${data.order.orderNumber} updated to '${newStatus}'`);
      fetchOrders(filterStatus);
      fetchStats();
    } catch (err) {
      setErrorMessage(err.message);
    } finally {
      setActionLoading(null);
    }
  };

  // Open edit modal for price and delivery date
  const openEditModal = (order) => {
    setEditingOrder(order);
    setEditPrice(order.price);
    const dateStr = order.estimatedDeliveryDate
      ? new Date(order.estimatedDeliveryDate).toISOString().split('T')[0]
      : '';
    setEditDeliveryDate(dateStr);
    setEditReason('Target delivery date rescheduled to accommodate boutique production');
  };

  // Submit price/delivery date update
  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingOrder) return;

    try {
      setActionLoading('modal');
      const res = await fetch(`/api/orders/${editingOrder._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify({
          price: Number(editPrice),
          estimatedDeliveryDate: editDeliveryDate,
          reason: editReason
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || 'Update failed');
      }

      setSuccessMessage(`Order ${editingOrder.orderNumber} schedule and price updated successfully.`);
      setEditingOrder(null);
      fetchOrders(filterStatus);
      fetchStats();
    } catch (err) {
      alert(`Update failed: ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="orders-container">
      <div className="orders-header-row">
        <div>
          <h2>Tailor Boutique Order Management</h2>
          <p className="description">
            Small tailoring shop dashboard to oversee production, reschedule delivery dates, and track overdue orders.
          </p>
        </div>

        {/* Status Filter */}
        <div className="status-filter-wrapper">
          <label htmlFor="filter-status">Filter by Status:</label>
          <select
            id="filter-status"
            className="form-select filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="All">All Orders</option>
            <option value="Pending">Pending</option>
            <option value="Confirmed">Confirmed</option>
            <option value="In Progress">In Progress</option>
            <option value="Ready for Pickup">Ready for Pickup</option>
            <option value="Completed">Completed</option>
            <option value="Cancelled">Cancelled</option>
            <option value="Delayed">&#9888; Delayed Orders Only</option>
          </select>
        </div>
      </div>

      {/* Phase 6 Small Shop Summary Cards */}
      <div className="admin-summary-grid">
        <div
          className={`admin-stat-card ${filterStatus === 'Pending' ? 'active-stat' : ''}`}
          onClick={() => setFilterStatus('Pending')}
          title="Click to filter Pending orders"
        >
          <div className="stat-card-header">
            <span className="stat-card-title">Pending Orders</span>
            <span className="stat-card-icon">&#9203;</span>
          </div>
          <strong className="stat-card-number">{stats.pending}</strong>
          <span className="stat-card-caption">Awaiting initial tailor review</span>
        </div>

        <div
          className={`admin-stat-card ${filterStatus === 'In Progress' ? 'active-stat' : ''}`}
          onClick={() => setFilterStatus('In Progress')}
          title="Click to filter In Progress orders"
        >
          <div className="stat-card-header">
            <span className="stat-card-title">In Progress</span>
            <span className="stat-card-icon">&#9986;&#65039;</span>
          </div>
          <strong className="stat-card-number accent-number">{stats.inProgress}</strong>
          <span className="stat-card-caption">Cutting &amp; stitching in shop</span>
        </div>

        <div
          className={`admin-stat-card ${filterStatus === 'Ready for Pickup' ? 'active-stat' : ''}`}
          onClick={() => setFilterStatus('Ready for Pickup')}
          title="Click to filter Ready for Pickup orders"
        >
          <div className="stat-card-header">
            <span className="stat-card-title">Ready for Pickup</span>
            <span className="stat-card-icon">&#128087;</span>
          </div>
          <strong className="stat-card-number status-ready-number">{stats.readyForPickup}</strong>
          <span className="stat-card-caption">Ready for customer collection</span>
        </div>

        <div
          className={`admin-stat-card ${filterStatus === 'Completed' ? 'active-stat' : ''}`}
          onClick={() => setFilterStatus('Completed')}
          title="Click to filter Completed orders"
        >
          <div className="stat-card-header">
            <span className="stat-card-title">Completed Orders</span>
            <span className="stat-card-icon">&#9989;</span>
          </div>
          <strong className="stat-card-number status-ok-number">{stats.completed}</strong>
          <span className="stat-card-caption">Delivered &amp; completed</span>
        </div>

        <div
          className={`admin-stat-card stat-card-delayed ${
            filterStatus === 'Delayed' ? 'active-stat' : ''
          }`}
          onClick={() => setFilterStatus('Delayed')}
          title="Click to filter Delayed/Overdue orders"
        >
          <div className="stat-card-header">
            <span className="stat-card-title">Delayed Orders</span>
            <span className="stat-card-icon">&#9888;&#65039;</span>
          </div>
          <strong className="stat-card-number text-danger">{stats.delayed}</strong>
          <span className="stat-card-caption">Past delivery date &amp; active</span>
        </div>
      </div>

      {filterStatus !== 'All' && (
        <div className="filter-active-bar">
          <span>
            Filtering by: <strong>{filterStatus === 'Delayed' ? 'Delayed Orders' : filterStatus}</strong>
          </span>
          <button className="btn-link" onClick={() => setFilterStatus('All')}>
            Clear Filter (Show All)
          </button>
        </div>
      )}

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

      {loading ? (
        <div className="card loading-card">
          <div className="spinner"></div>
          <p>Loading orders...</p>
        </div>
      ) : orders.length === 0 ? (
        <div className="card empty-orders-card">
          <span className="empty-icon">&#128221;</span>
          <h3>No Orders Found</h3>
          <p className="description">
            No orders match the current filter: <strong>{filterStatus}</strong>.
          </p>
        </div>
      ) : (
        <div className="orders-table-wrapper card">
          <table className="admin-orders-table">
            <thead>
              <tr>
                <th>Order #</th>
                <th>Customer</th>
                <th>Garment</th>
                <th>Price (INR)</th>
                <th>Target Delivery</th>
                <th>Status</th>
                <th>Staff Actions</th>
              </tr>
            </thead>
            <tbody>
              {orders.map((order) => {
                const nextOptions = VALID_TRANSITIONS[order.status] || [];
                const statusClass = STATUS_COLORS[order.status] || 'status-pending';

                return (
                  <tr key={order._id} className={order.isDelayed ? 'row-delayed' : ''}>
                    <td>
                      <strong className="order-number-title">{order.orderNumber}</strong>
                    </td>
                    <td>
                      <div>{order.customer?.name || 'Customer'}</div>
                      <small className="table-subtext">{order.customer?.phone || order.customer?.email}</small>
                    </td>
                    <td>
                      <span className="capitalize">{order.clothingType}</span> ({order.quantity}x)
                    </td>
                    <td>
                      <strong className="price-text">₹{order.price}</strong>
                    </td>
                    <td>
                      <div className="delivery-date-cell">
                        <span>{new Date(order.estimatedDeliveryDate).toLocaleDateString()}</span>
                        {order.isDelayed && (
                          <span className="delayed-badge" title="Delivery date has elapsed">
                            &#9888; OVERDUE
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className={`status-pill ${statusClass}`}>{order.status}</span>
                    </td>
                    <td>
                      <div className="admin-actions-cell">
                        {/* Status Transition dropdown if transitions exist */}
                        {nextOptions.length > 0 ? (
                          <select
                            className="form-select status-change-select"
                            defaultValue=""
                            disabled={actionLoading === order._id}
                            onChange={(e) => {
                              if (e.target.value) {
                                handleStatusChange(order._id, e.target.value);
                                e.target.value = '';
                              }
                            }}
                          >
                            <option value="" disabled>
                              Advance Status...
                            </option>
                            {nextOptions.map((opt) => (
                              <option key={opt} value={opt}>
                                &rarr; {opt}
                              </option>
                            ))}
                          </select>
                        ) : (
                          <span className="terminal-state-text">Terminal State</span>
                        )}

                        <button
                          className="btn btn-outline btn-tiny"
                          onClick={() => openEditModal(order)}
                          title="Reschedule Delivery Date & Adjust Price"
                        >
                          Reschedule
                        </button>

                        <button
                          className="btn btn-secondary btn-tiny"
                          onClick={() => onSelectOrder && onSelectOrder(order)}
                          title="View Live Tracker & History Specs"
                        >
                          Tracking
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Admin Price & Reschedule Delivery Date Modal */}
      {editingOrder && (
        <div className="modal-backdrop" onClick={() => setEditingOrder(null)}>
          <div className="modal-content modal-small" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reschedule Order #{editingOrder.orderNumber}</h3>
              <button className="modal-close-btn" onClick={() => setEditingOrder(null)}>
                &times;
              </button>
            </div>
            <form onSubmit={handleSaveEdit}>
              <div className="modal-body">
                <div className="form-group">
                  <label htmlFor="edit-order-date">
                    New Estimated Delivery Date <span className="required-star">*</span>
                  </label>
                  <input
                    id="edit-order-date"
                    type="date"
                    value={editDeliveryDate}
                    onChange={(e) => setEditDeliveryDate(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-order-reason">Reason for Schedule Revision</label>
                  <input
                    id="edit-order-reason"
                    type="text"
                    placeholder="e.g. Fabric dyeing delay or priority adjustment"
                    value={editReason}
                    onChange={(e) => setEditReason(e.target.value)}
                  />
                </div>
                <div className="form-group">
                  <label htmlFor="edit-order-price">Tailoring Price (₹ INR)</label>
                  <input
                    id="edit-order-price"
                    type="number"
                    min="0"
                    step="10"
                    value={editPrice}
                    onChange={(e) => setEditPrice(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setEditingOrder(null)}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={actionLoading === 'modal'}
                >
                  Save Schedule &amp; Price
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
