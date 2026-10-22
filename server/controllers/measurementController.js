const mongoose = require('mongoose');
const Measurement = require('../models/Measurement');
const User = require('../models/User');

// Sensible tailoring limits (in centimetres)
const MEASUREMENT_LIMITS = {
  height: { min: 50, max: 250, label: 'Height' },
  shoulder: { min: 20, max: 80, label: 'Shoulder width' },
  chest: { min: 40, max: 180, label: 'Chest' },
  waist: { min: 40, max: 180, label: 'Waist' },
  hip: { min: 40, max: 200, label: 'Hip' },
  sleeve: { min: 10, max: 100, label: 'Sleeve length' },
  armhole: { min: 15, max: 80, label: 'Armhole' },
  neck: { min: 20, max: 65, label: 'Neck circumference' },
  length: { min: 20, max: 220, label: 'Garment length' }
};

/**
 * Validate and sanitize numeric measurement input
 */
const validateMeasurementFields = (body, isPartial = false) => {
  const fields = Object.keys(MEASUREMENT_LIMITS);
  const validated = {};
  const errors = [];

  for (const field of fields) {
    const val = body[field];
    const limits = MEASUREMENT_LIMITS[field];

    if (val === undefined || val === null || val === '') {
      if (!isPartial) {
        errors.push(`${limits.label} is required`);
      }
      continue;
    }

    const num = Number(val);
    if (isNaN(num)) {
      errors.push(`${limits.label} must be a valid number`);
      continue;
    }

    if (num < limits.min || num > limits.max) {
      errors.push(
        `${limits.label} must be between ${limits.min} cm and ${limits.max} cm`
      );
      continue;
    }

    validated[field] = Math.round(num * 10) / 10; // Round to 1 decimal place
  }

  return { validated, errors };
};

/**
 * @desc    Get authenticated customer's measurements
 * @route   GET /api/measurements/me
 * @access  Private (Authenticated User)
 */
const getMyMeasurements = async (req, res) => {
  try {
    const measurement = await Measurement.findOne({ customer: req.user._id });

    return res.status(200).json({
      success: true,
      measurement: measurement || null,
      unit: 'cm',
      message: measurement
        ? 'Measurements retrieved successfully'
        : 'No measurements found. Please record your measurements.'
    });
  } catch (error) {
    console.error(`[Get Measurements Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving measurements',
      error: error.message
    });
  }
};

/**
 * @desc    Create authenticated customer's initial measurement record
 * @route   POST /api/measurements/me
 * @access  Private (Authenticated User)
 */
const createMyMeasurements = async (req, res) => {
  try {
    // Check if measurement record already exists
    const existing = await Measurement.findOne({ customer: req.user._id });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'Measurements profile already exists. Use PUT /api/measurements/me to update your measurements.'
      });
    }

    const { validated, errors } = validateMeasurementFields(req.body, false);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const measurement = await Measurement.create({
      customer: req.user._id,
      ...validated
    });

    return res.status(201).json({
      success: true,
      message: 'Measurements saved successfully',
      unit: 'cm',
      measurement
    });
  } catch (error) {
    console.error(`[Create Measurements Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error saving measurements',
      error: error.message
    });
  }
};

/**
 * @desc    Update authenticated customer's measurements
 * @route   PUT /api/measurements/me
 * @access  Private (Authenticated User)
 */
const updateMyMeasurements = async (req, res) => {
  try {
    const { validated, errors } = validateMeasurementFields(req.body, false);

    if (errors.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Validation failed',
        errors
      });
    }

    const measurement = await Measurement.findOneAndUpdate(
      { customer: req.user._id },
      { $set: validated },
      { new: true, upsert: true, runValidators: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Measurements updated successfully',
      unit: 'cm',
      measurement
    });
  } catch (error) {
    console.error(`[Update Measurements Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error updating measurements',
      error: error.message
    });
  }
};

/**
 * @desc    Get customer measurements by customer ID (Admin / Tailor access)
 * @route   GET /api/measurements/customer/:customerId
 * @access  Private (Admin only)
 */
const getCustomerMeasurementsById = async (req, res) => {
  try {
    const { customerId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(customerId)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid customer ID format'
      });
    }

    const measurement = await Measurement.findOne({ customer: customerId });

    if (!measurement) {
      return res.status(404).json({
        success: false,
        message: 'No measurement record found for this customer'
      });
    }

    return res.status(200).json({
      success: true,
      unit: 'cm',
      measurement
    });
  } catch (error) {
    console.error(`[Admin Get Measurements Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving customer measurements',
      error: error.message
    });
  }
};

module.exports = {
  getMyMeasurements,
  createMyMeasurements,
  updateMyMeasurements,
  getCustomerMeasurementsById,
  MEASUREMENT_LIMITS
};
