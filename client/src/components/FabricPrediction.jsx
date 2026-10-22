
import React, { useEffect, useState } from 'react';
import './FabricPrediction.css';

export function FabricPrediction() {
  const [predictions, setPredictions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchPredictions = async () => {
      try {
        setLoading(true);
        setError('');

        const response = await fetch('/api/fabric-predictions', {
          method: 'GET',
          credentials: 'include'
        });

        const data = await response.json();

        if (!response.ok || !data.success) {
          throw new Error(
            data.message || 'Unable to load fabric predictions.'
          );
        }

        setPredictions(data.predictions || []);
      } catch (err) {
        setError(err.message || 'Something went wrong.');
      } finally {
        setLoading(false);
      }
    };

    fetchPredictions();
  }, []);

  if (loading) {
    return (
      <div className="prediction-card">
        <p>Loading fabric demand predictions...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="prediction-card">
        <h2>Fabric Demand Prediction</h2>
        <p className="prediction-error">{error}</p>
        <button onClick={() => window.location.reload()}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <section className="prediction-page">
      <div className="prediction-heading">
        <div>
          <h2>Fabric Demand Prediction</h2>
          <p>
            Historical order-based estimates for the next 30 days.
          </p>
        </div>
        <span className="prediction-count">
          {predictions.length} Fabrics
        </span>
      </div>

      {predictions.length === 0 ? (
        <div className="prediction-card">
          No fabrics available. Add fabrics in Fabric Management first.
        </div>
      ) : (
        <div className="prediction-grid">
          {predictions.map((fabric) => (
            <article
              className="prediction-card"
              key={fabric.fabricId}
            >
              <div className="prediction-card-top">
                <div>
                  <h3>{fabric.fabricName}</h3>
                  <p>
                    {fabric.fabricType} · {fabric.color}
                  </p>
                </div>

                <span
                  className={`stock-badge ${
                    fabric.stockStatus === 'Low Stock'
                      ? 'stock-low'
                      : fabric.stockStatus === 'Restock Recommended'
                        ? 'stock-restock'
                        : 'stock-available'
                  }`}
                >
                  {fabric.stockStatus}
                </span>
              </div>

              <div className="prediction-stats">
                <div>
                  <span>Available Stock</span>
                  <strong>
                    {fabric.availableQuantity} {fabric.unit}
                  </strong>
                </div>

                <div>
                  <span>Orders (90 days)</span>
                  <strong>{fabric.ordersInLast90Days}</strong>
                </div>

                <div>
                  <span>Ordered Quantity (90 days)</span>
                  <strong>
                    {fabric.orderedQuantityInLast90Days} {fabric.unit}
                  </strong>
                </div>

                <div>
                  <span>Estimated Demand (30 days)</span>
                  <strong>
                    {fabric.estimatedDemandNext30Days} {fabric.unit}
                  </strong>
                </div>

                <div>
                  <span>Suggested Restock</span>
                  <strong>
                    {fabric.suggestedRestockQuantity} {fabric.unit}
                  </strong>
                </div>

                <div>
                  <span>Minimum Stock Level</span>
                  <strong>
                    {fabric.minimumStockLevel} {fabric.unit}
                  </strong>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      <p className="prediction-note">
        Note: These are estimates based on historical orders, not guaranteed
        future demand. Accuracy improves when relevant order data is available.
      </p>
    </section>
  );
}
