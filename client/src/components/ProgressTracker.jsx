import React from 'react';

const STAGES = [
  { key: 'Pending', label: 'Order Placed', step: 1 },
  { key: 'Confirmed', label: 'Confirmed', step: 2 },
  { key: 'In Progress', label: 'In Progress', step: 3 },
  { key: 'Ready for Pickup', label: 'Ready for Pickup', step: 4 },
  { key: 'Completed', label: 'Completed', step: 5 }
];

export const ProgressTracker = ({ status, statusHistory = [] }) => {
  const isCancelled = status === 'Cancelled';

  // Find current stage index (0 to 4)
  const currentStageIndex = STAGES.findIndex((s) => s.key === status);

  // If order is cancelled, locate the last non-cancelled status reached before cancellation
  let lastActiveIndex = -1;
  if (isCancelled && statusHistory && statusHistory.length > 0) {
    // Reverse find the last status that wasn't Cancelled
    for (let i = statusHistory.length - 1; i >= 0; i--) {
      const histStatus = statusHistory[i].status;
      if (histStatus !== 'Cancelled') {
        lastActiveIndex = STAGES.findIndex((s) => s.key === histStatus);
        break;
      }
    }
    if (lastActiveIndex === -1) lastActiveIndex = 0; // Default to initial step
  }

  return (
    <div className="progress-tracker-container">
      {isCancelled ? (
        <div className="tracker-cancelled-banner">
          <span className="cancelled-badge-icon">&#10060;</span>
          <div>
            <strong>Order Cancelled</strong>
            <p>
              This order was cancelled. Subsequent production and delivery stages were not completed.
            </p>
          </div>
        </div>
      ) : (
        <div className="tracker-stage-summary">
          <span className="tracker-summary-label">Current Progress:</span>
          <strong className="tracker-summary-value">
            {STAGES[currentStageIndex]?.label || status}
          </strong>
          <span className="tracker-step-count">
            (Stage {currentStageIndex + 1} of {STAGES.length})
          </span>
        </div>
      )}

      <div className="tracker-steps-bar">
        {STAGES.map((stage, idx) => {
          let stepStatusClass = 'step-upcoming';
          let iconContent = stage.step;

          if (isCancelled) {
            if (idx < lastActiveIndex) {
              stepStatusClass = 'step-completed';
              iconContent = '✓';
            } else if (idx === lastActiveIndex) {
              stepStatusClass = 'step-cancelled-halt';
              iconContent = '✕';
            } else {
              stepStatusClass = 'step-upcoming';
              iconContent = stage.step;
            }
          } else {
            if (idx < currentStageIndex) {
              stepStatusClass = 'step-completed';
              iconContent = '✓';
            } else if (idx === currentStageIndex) {
              stepStatusClass = 'step-current';
              iconContent = stage.step;
            } else {
              stepStatusClass = 'step-upcoming';
              iconContent = stage.step;
            }
          }

          const isConnectorActive = isCancelled
            ? idx < lastActiveIndex
            : idx < currentStageIndex;

          return (
            <React.Fragment key={stage.key}>
              <div className={`tracker-step-node ${stepStatusClass}`}>
                <div className="step-circle" title={`${stage.label} (${stepStatusClass})`}>
                  {iconContent}
                </div>
                <span className="step-label">{stage.label}</span>
                {idx === currentStageIndex && !isCancelled && (
                  <span className="step-active-tag">Active</span>
                )}
              </div>

              {idx < STAGES.length - 1 && (
                <div
                  className={`tracker-connector ${
                    isConnectorActive ? 'connector-active' : ''
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
