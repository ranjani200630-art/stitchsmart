const express = require('express');
const router = express.Router();
const {
  getMyMeasurements,
  createMyMeasurements,
  updateMyMeasurements,
  getCustomerMeasurementsById
} = require('../controllers/measurementController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer self-service measurement endpoints
router.get('/me', protect, getMyMeasurements);
router.post('/me', protect, createMyMeasurements);
router.put('/me', protect, updateMyMeasurements);

// Admin/Tailor customer measurement lookup endpoint
router.get('/customer/:customerId', protect, authorize('admin'), getCustomerMeasurementsById);

module.exports = router;
