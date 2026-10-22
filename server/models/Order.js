const mongoose = require('mongoose');

// Base pricing standard in Indian Rupees (₹)
const BASE_PRICES = {
  blouse: 800,
  chudi: 900,
  kurti: 700,
  shirt: 650,
  dress: 1200,
  other: 1000
};

const orderSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Customer reference is required']
    },
    orderNumber: {
      type: String,
      required: [true, 'Order number is required'],
      unique: true,
      uppercase: true,
      trim: true
    },
    clothingType: {
      type: String,
      required: [true, 'Clothing type is required'],
      enum: {
        values: ['blouse', 'chudi', 'kurti', 'shirt', 'dress', 'other'],
        message: '{VALUE} is not a supported clothing type'
      },
      lowercase: true,
      trim: true
    },
    designDetails: {
      type: String,
      required: [true, 'Design details are required'],
      trim: true,
      maxlength: [1000, 'Design details cannot exceed 1000 characters']
    },
    fabricDetails: {
      fabricType: {
        type: String,
        required: [true, 'Fabric type is required'],
        trim: true,
        maxlength: [100, 'Fabric type cannot exceed 100 characters']
      },
      color: {
        type: String,
        required: [true, 'Fabric colour is required'],
        trim: true,
        maxlength: [50, 'Colour cannot exceed 50 characters']
      },
      notes: {
        type: String,
        trim: true,
        maxlength: [500, 'Fabric notes cannot exceed 500 characters'],
        default: ''
      }
    },
    // Snapshot of customer measurements at order placement
    measurements: {
      height: { type: Number, required: true },
      shoulder: { type: Number, required: true },
      chest: { type: Number, required: true },
      waist: { type: Number, required: true },
      hip: { type: Number, required: true },
      sleeve: { type: Number, required: true },
      armhole: { type: Number, required: true },
      neck: { type: Number, required: true },
      length: { type: Number, required: true }
    },
    quantity: {
      type: Number,
      required: [true, 'Quantity is required'],
      min: [1, 'Quantity must be at least 1'],
      validate: {
        validator: Number.isInteger,
        message: 'Quantity must be an integer'
      },
      default: 1
    },
    specialInstructions: {
      type: String,
      trim: true,
      maxlength: [1000, 'Special instructions cannot exceed 1000 characters'],
      default: ''
    },
    orderDate: {
      type: Date,
      default: Date.now
    },
    estimatedDeliveryDate: {
      type: Date,
      required: [true, 'Estimated delivery date is required']
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative']
    },
    status: {
      type: String,
      enum: {
        values: [
          'Pending',
          'Confirmed',
          'In Progress',
          'Ready for Pickup',
          'Completed',
          'Cancelled'
        ],
        message: '{VALUE} is not a valid order status'
      },
      default: 'Pending'
    },
    statusHistory: [
      {
        status: {
          type: String,
          required: true,
          enum: [
            'Pending',
            'Confirmed',
            'In Progress',
            'Ready for Pickup',
            'Completed',
            'Cancelled'
          ]
        },
        changedAt: {
          type: Date,
          default: Date.now
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        note: {
          type: String,
          trim: true,
          default: ''
        }
      }
    ],
    deliveryDateHistory: [
      {
        previousDate: {
          type: Date,
          required: true
        },
        newDate: {
          type: Date,
          required: true
        },
        changedAt: {
          type: Date,
          default: Date.now
        },
        changedBy: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'User'
        },
        reason: {
          type: String,
          trim: true,
          default: 'Delivery date updated by tailor'
        }
      }
    ]
  },
  {
    timestamps: true
  }
);

// Strip internal properties on JSON output
orderSchema.methods.toJSON = function () {
  const orderObj = this.toObject();
  delete orderObj.__v;
  return orderObj;
};

const Order = mongoose.model('Order', orderSchema);

module.exports = {
  Order,
  BASE_PRICES
};
