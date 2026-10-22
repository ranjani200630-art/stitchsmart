const express = require('express');
const router = express.Router();
const {
  getMyProfile,
  updateMyProfile,
  getCustomerProfileById
} = require('../controllers/profileController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Customer self-service profile endpoints
router.get('/me', protect, getMyProfile);
router.put('/me', protect, updateMyProfile);

// Admin/Tailor customer lookup endpoint
router.get('/customer/:customerId', protect, authorize('admin'), getCustomerProfileById);

module.exports = router;
