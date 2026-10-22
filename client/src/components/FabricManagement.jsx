
import React, { useEffect, useState } from 'react';
import './FabricManagement.css';

const API_URL = '/api/fabrics';

const emptyForm = {
  name: '',
  fabricType: 'Cotton',
  color: '',
  availableQuantity: '',
  unit: 'metres',
  minimumStockLevel: '5',
  pricePerUnit: '',
  supplierName: ''
};

export const FabricManagement = () => {
  const [fabrics, setFabrics] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [editingId, setEditingId] = useState(null);

  const request = async (url, options = {}) => {
    const response = await fetch(url, {
      ...options,
      credentials: 'include',
      headers: {
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
        ...options.headers
      }
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.message || data.error || `Request failed (${response.status})`);
    }

    return data;
  };

  const loadFabrics = async () => {
    setLoading(true);
    setError('');

    try {
      const data = await request(API_URL);
      setFabrics(
        Array.isArray(data) ? data : data.fabrics || data.data || []
      );
    } catch (err) {
      setError(`Could not load fabrics: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFabrics();
  }, []);

  const handleChange = (event) => {
    setForm((previous) => ({
      ...previous,
      [event.target.name]: event.target.value
    }));
  };

  const resetForm = () => {
    setForm({ ...emptyForm });
    setEditingId(null);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setSaving(true);

    const payload = {
      ...form,
      availableQuantity: Number(form.availableQuantity),
      minimumStockLevel: Number(form.minimumStockLevel),
      pricePerUnit: Number(form.pricePerUnit)
    };

    try {
      if (editingId) {
        await request(`${API_URL}/${editingId}`, {
          method: 'PUT',
          body: JSON.stringify(payload)
        });
        setMessage('Fabric updated successfully.');
      } else {
        await request(API_URL, {
          method: 'POST',
          body: JSON.stringify(payload)
        });
        setMessage('Fabric added successfully.');
      }

      resetForm();
      await loadFabrics();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const startEditing = (fabric) => {
    setEditingId(fabric._id || fabric.id);
    setForm({
      name: fabric.name || '',
      fabricType: fabric.fabricType || 'Cotton',
      color: fabric.color || '',
      availableQuantity: String(fabric.availableQuantity ?? 0),
      unit: fabric.unit || 'metres',
      minimumStockLevel: String(fabric.minimumStockLevel ?? 5),
      pricePerUnit: String(fabric.pricePerUnit ?? 0),
      supplierName: fabric.supplierName || ''
    });

    setError('');
    setMessage('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (fabric) => {
    const id = fabric._id || fabric.id;
    if (!window.confirm(`Delete ${fabric.name}? This cannot be undone.`)) return;

    setError('');
    setMessage('');

    try {
      await request(`${API_URL}/${id}`, { method: 'DELETE' });
      if (editingId === id) resetForm();
      setMessage(`${fabric.name} deleted successfully.`);
      await loadFabrics();
    } catch (err) {
      setError(err.message);
    }
  };

  const filteredFabrics = fabrics.filter((fabric) =>
    `${fabric.name} ${fabric.fabricType} ${fabric.color} ${fabric.supplierName || ''}`
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const lowStockCount = fabrics.filter(
    (fabric) =>
      Number(fabric.availableQuantity) <= Number(fabric.minimumStockLevel)
  ).length;

  return (
    <section className="fabric-page">
      <div className="fabric-heading">
        <div>
          <span className="fabric-eyebrow">INVENTORY CONTROL</span>
          <h2>Fabric Management</h2>
          <p>Manage fabric stock, suppliers and low-stock alerts.</p>
        </div>
        <div className="fabric-heading-icon" aria-hidden="true">🧵</div>
      </div>

      {error && <div className="fabric-alert fabric-error" role="alert">{error}</div>}
      {message && <div className="fabric-alert fabric-success" role="status">{message}</div>}

      <div className="fabric-stats">
        <div className="fabric-stat">
          <span>Total Fabric Types</span>
          <strong>{fabrics.length}</strong>
        </div>
        <div className="fabric-stat">
          <span>Low Stock Items</span>
          <strong className={lowStockCount ? 'stock-warning' : ''}>{lowStockCount}</strong>
        </div>
        <div className="fabric-stat">
          <span>Stock Status</span>
          <strong>{lowStockCount ? 'Needs Attention' : 'All Good'}</strong>
        </div>
      </div>

      <div className="fabric-panel">
        <h3>{editingId ? 'Edit Fabric Details' : 'Add New Fabric'}</h3>

        <form className="fabric-form" onSubmit={handleSubmit}>
          <label>
            Fabric Name *
            <input name="name" value={form.name} onChange={handleChange}
              placeholder="e.g. Premium Cotton" required />
          </label>

          <label>
            Fabric Type *
            <select name="fabricType" value={form.fabricType} onChange={handleChange}>
              <option value="Cotton">Cotton</option>
              <option value="Silk">Silk</option>
              <option value="Satin">Satin</option>
              <option value="Linen">Linen</option>
              <option value="Denim">Denim</option>
              <option value="Georgette">Georgette</option>
              <option value="Other">Other</option>
            </select>
          </label>

          <label>
            Color *
            <input name="color" value={form.color} onChange={handleChange}
              placeholder="e.g. Black" required />
          </label>

          <label>
            Available Quantity *
            <input name="availableQuantity" type="number" min="0" step="0.01"
              value={form.availableQuantity} onChange={handleChange} required />
          </label>

          <label>
            Unit
            <select name="unit" value={form.unit} onChange={handleChange}>
              <option value="metres">Metres</option>
              <option value="yards">Yards</option>
              <option value="pieces">Pieces</option>
            </select>
          </label>

          <label>
            Minimum Stock Level *
            <input name="minimumStockLevel" type="number" min="0" step="0.01"
              value={form.minimumStockLevel} onChange={handleChange} required />
          </label>

          <label>
            Price Per Unit (₹) *
            <input name="pricePerUnit" type="number" min="0" step="0.01"
              value={form.pricePerUnit} onChange={handleChange} required />
          </label>

          <label>
            Supplier Name
            <input name="supplierName" value={form.supplierName} onChange={handleChange}
              placeholder="Supplier name" />
          </label>

          <div className="fabric-form-actions">
            <button className="fabric-primary-btn" type="submit" disabled={saving}>
              {saving ? 'Saving...' : editingId ? 'Save Changes' : '+ Add Fabric'}
            </button>
            {editingId && (
              <button className="fabric-secondary-btn" type="button" onClick={resetForm}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      <div className="fabric-panel">
        <div className="fabric-inventory-heading">
          <div>
            <h3>Fabric Inventory</h3>
            <p>{filteredFabrics.length} fabric type(s) found</p>
          </div>
          <button className="fabric-secondary-btn" type="button" onClick={loadFabrics}>
            ↻ Refresh
          </button>
        </div>

        <input
          className="fabric-search"
          placeholder="Search fabric, type, color or supplier..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />

        {loading ? (
          <p className="fabric-empty">Loading inventory...</p>
        ) : filteredFabrics.length === 0 ? (
          <p className="fabric-empty">No fabrics found. Add a fabric using the form above.</p>
        ) : (
          <div className="fabric-table-wrap">
            <table className="fabric-table">
              <thead>
                <tr>
                  <th>Fabric</th>
                  <th>Color</th>
                  <th>Available Stock</th>
                  <th>Price / Unit</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredFabrics.map((fabric) => {
                  const id = fabric._id || fabric.id;
                  const lowStock =
                    Number(fabric.availableQuantity) <= Number(fabric.minimumStockLevel);

                  return (
                    <tr key={id}>
                      <td>
                        <strong>{fabric.name}</strong>
                        <small>{fabric.fabricType}</small>
                      </td>
                      <td>{fabric.color}</td>
                      <td>
                        <strong>{fabric.availableQuantity} {fabric.unit}</strong>
                        <small>Minimum: {fabric.minimumStockLevel} {fabric.unit}</small>
                      </td>
                      <td>₹{Number(fabric.pricePerUnit || 0).toFixed(2)}</td>
                      <td>
                        <span className={`fabric-status ${lowStock ? 'low' : 'good'}`}>
                          {lowStock ? '⚠ Low Stock' : '✓ In Stock'}
                        </span>
                      </td>
                      <td>
                        <div className="fabric-row-actions">
                          <button type="button" className="fabric-edit-btn"
                            onClick={() => startEditing(fabric)}>
                            Edit
                          </button>
                          <button type="button" className="fabric-delete-btn"
                            onClick={() => handleDelete(fabric)}>
                            Delete
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
      </div>
    </section>
  );
};

export default FabricManagement;

