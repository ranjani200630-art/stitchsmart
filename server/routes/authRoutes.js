const express = require('express');
const router = express.Router();
const {
  register,
  login,
  getMe,
  logout,
  adminCheck
} = require('../controllers/authController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Public routes
router.post('/register', register);
router.post('/login', login);
router.post('/logout', logout);

// Protected routes (Any authenticated user)
router.get('/me', protect, getMe);

// Protected routes (Admin only)
router.get('/admin-check', protect, authorize('admin'), adminCheck);

module.exports = router;
