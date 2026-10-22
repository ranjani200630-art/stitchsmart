
const mongoose = require('mongoose');

const fabricSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Fabric name is required'],
      trim: true,
      maxlength: [100, 'Fabric name cannot exceed 100 characters']
    },
    fabricType: {
      type: String,
      required: [true, 'Fabric type is required'],
      trim: true,
      maxlength: [50, 'Fabric type cannot exceed 50 characters']
    },
    color: {
      type: String,
      required: [true, 'Fabric color is required'],
      trim: true,
      maxlength: [50, 'Color cannot exceed 50 characters']
    },
    availableQuantity: {
      type: Number,
      required: true,
      min: [0, 'Available quantity cannot be negative']
    },
    unit: {
      type: String,
      required: true,
      enum: ['metres', 'yards', 'pieces'],
      default: 'metres'
    },
    minimumStockLevel: {
      type: Number,
      required: true,
      min: [0, 'Minimum stock level cannot be negative'],
      default: 5
    },
    pricePerUnit: {
      type: Number,
      required: true,
      min: [0, 'Price cannot be negative']
    },
    supplierName: {
      type: String,
      trim: true,
      maxlength: [100, 'Supplier name cannot exceed 100 characters'],
      default: ''
    },
    supplierContact: {
      type: String,
      trim: true,
      maxlength: [30, 'Supplier contact cannot exceed 30 characters'],
      default: ''
    },
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: ''
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    }
  },
  { timestamps: true }
);

// Virtual field: automatically identifies low-stock fabrics.
fabricSchema.virtual('isLowStock').get(function () {
  return this.availableQuantity <= this.minimumStockLevel;
});

fabricSchema.set('toJSON', { virtuals: true });
fabricSchema.set('toObject', { virtuals: true });

module.exports = mongoose.model('Fabric', fabricSchema);
