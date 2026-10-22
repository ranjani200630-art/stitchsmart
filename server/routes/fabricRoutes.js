
const express = require('express');
const router = express.Router();

const {
  createFabric,
  getFabrics,
  getFabricById,
  updateFabric,
  deleteFabric,
  updateFabricStock
} = require('../controllers/fabricController');

const { protect } = require('../middleware/authMiddleware');

// All fabric routes require authentication.
// Staff-only authorization is checked in the controller.
router.route('/')
  .get(protect, getFabrics)
  .post(protect, createFabric);

router.route('/:id')
  .get(protect, getFabricById)
  .put(protect, updateFabric)
  .delete(protect, deleteFabric);

router.patch('/:id/stock', protect, updateFabricStock);

module.exports = router;
