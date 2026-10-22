const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updateDeliveryDate,
  getOrderStats
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Admin / Tailor Dashboard Metrics (Must precede parameterized /:id route)
router.get('/stats/summary', protect, authorize('admin'), getOrderStats);

// Customer & Shared Routes
router.post('/', protect, createOrder);
router.get('/my', protect, getMyOrders);
router.get('/:id', protect, getOrderById);
router.put('/:id', protect, updateOrder);
router.patch('/:id/cancel', protect, cancelOrder);

// Admin / Tailor Staff Routes
router.get('/', protect, authorize('admin'), getAllOrders);
router.patch('/:id/status', protect, authorize('admin'), updateOrderStatus);
router.patch('/:id/delivery-date', protect, authorize('admin'), updateDeliveryDate);

module.exports = router;
