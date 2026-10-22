const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Recipient reference is required'],
      index: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      index: true
    },
    type: {
      type: String,
      required: [true, 'Notification type is required'],
      enum: {
        values: [
          'order_created',
          'order_confirmed',
          'order_in_progress',
          'order_ready_pickup',
          'order_completed',
          'order_cancelled',
          'delivery_date_updated',
          'order_delayed',
          'admin_alert',
          'general_alert'
        ],
        message: '{VALUE} is not a valid notification type'
      }
    },
    title: {
      type: String,
      required: [true, 'Notification title is required'],
      trim: true,
      maxlength: [150, 'Title cannot exceed 150 characters']
    },
    message: {
      type: String,
      required: [true, 'Notification message is required'],
      trim: true,
      maxlength: [500, 'Message cannot exceed 500 characters']
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true
    },
    readAt: {
      type: Date,
      default: null
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    createdAt: {
      type: Date,
      default: Date.now,
      index: true
    }
  },
  {
    timestamps: true
  }
);

// Compound indexes for optimized queries
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ order: 1, type: 1 });

// Clean JSON serialization
notificationSchema.methods.toJSON = function () {
  const notifObj = this.toObject();
  delete notifObj.__v;
  return notifObj;
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
