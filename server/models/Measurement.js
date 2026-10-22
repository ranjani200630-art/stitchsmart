const mongoose = require('mongoose');

const measurementSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true // One current measurement record per customer
    },
    height: {
      type: Number,
      required: [true, 'Height is required'],
      min: [50, 'Height must be at least 50 cm'],
      max: [250, 'Height cannot exceed 250 cm']
    },
    shoulder: {
      type: Number,
      required: [true, 'Shoulder width is required'],
      min: [20, 'Shoulder must be at least 20 cm'],
      max: [80, 'Shoulder cannot exceed 80 cm']
    },
    chest: {
      type: Number,
      required: [true, 'Chest measurement is required'],
      min: [40, 'Chest must be at least 40 cm'],
      max: [180, 'Chest cannot exceed 180 cm']
    },
    waist: {
      type: Number,
      required: [true, 'Waist measurement is required'],
      min: [40, 'Waist must be at least 40 cm'],
      max: [180, 'Waist cannot exceed 180 cm']
    },
    hip: {
      type: Number,
      required: [true, 'Hip measurement is required'],
      min: [40, 'Hip must be at least 40 cm'],
      max: [200, 'Hip cannot exceed 200 cm']
    },
    sleeve: {
      type: Number,
      required: [true, 'Sleeve length is required'],
      min: [10, 'Sleeve must be at least 10 cm'],
      max: [100, 'Sleeve cannot exceed 100 cm']
    },
    armhole: {
      type: Number,
      required: [true, 'Armhole measurement is required'],
      min: [15, 'Armhole must be at least 15 cm'],
      max: [80, 'Armhole cannot exceed 80 cm']
    },
    neck: {
      type: Number,
      required: [true, 'Neck measurement is required'],
      min: [20, 'Neck must be at least 20 cm'],
      max: [65, 'Neck cannot exceed 65 cm']
    },
    length: {
      type: Number,
      required: [true, 'Garment length is required'],
      min: [20, 'Length must be at least 20 cm'],
      max: [220, 'Length cannot exceed 220 cm']
    }
  },
  {
    timestamps: true
  }
);

measurementSchema.methods.toJSON = function () {
  const measurementObj = this.toObject();
  delete measurementObj.__v;
  return measurementObj;
};

const Measurement = mongoose.model('Measurement', measurementSchema);

module.exports = Measurement;
