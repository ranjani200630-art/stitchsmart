
const express = require('express');
const router = express.Router();

const {
  getFabricDemandPrediction
} = require('../controllers/fabricPredictionController');

const { protect } = require('../middleware/authMiddleware');

router.get('/', protect, getFabricDemandPrediction);

module.exports = router;
