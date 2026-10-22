const mongoose = require('mongoose');

/**
 * Health check controller
 * Confirms that the StitchSmart API server is running and responsive,
 * and reports the MongoDB connection status.
 */
const getHealthStatus = (req, res) => {
  const dbStateMap = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting'
  };

  const dbState = mongoose.connection.readyState;
  const dbStatus = dbStateMap[dbState] || 'unknown';

  res.status(200).json({
    status: 'ok',
    message: 'StitchSmart API is running',
    database: {
      status: dbStatus,
      readyState: dbState,
      name: mongoose.connection.name || null
    },
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime()),
    service: 'StitchSmart Backend Service'
  });
};

module.exports = {
  getHealthStatus
};
