const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const { checkAndNotifyDelayedOrders } = require('../services/notificationService');

/**
 * @desc    Get authenticated user's notifications (newest first)
 * @route   GET /api/notifications
 * @access  Private
 */
const getMyNotifications = async (req, res) => {
  try {
    const page = parseInt(req.query.page, 10) || 1;
    const limit = parseInt(req.query.limit, 10) || 30;
    const skip = (page - 1) * limit;

    const query = { recipient: req.user._id };

    if (req.query.unreadOnly === 'true') {
      query.isRead = false;
    }

    if (req.query.type) {
      query.type = req.query.type;
    }

    const [notifications, total, unreadCount] = await Promise.all([
      Notification.find(query)
        .populate('order', 'orderNumber clothingType status price estimatedDeliveryDate')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      Notification.countDocuments(query),
      Notification.countDocuments({ recipient: req.user._id, isRead: false })
    ]);

    return res.status(200).json({
      success: true,
      count: notifications.length,
      total,
      page,
      pages: Math.ceil(total / limit) || 1,
      unreadCount,
      notifications
    });
  } catch (error) {
    console.error(`[Get Notifications Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving notifications',
      error: error.message
    });
  }
};

/**
 * @desc    Get count of unread notifications for authenticated user
 * @route   GET /api/notifications/unread-count
 * @access  Private
 */
const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false
    });

    return res.status(200).json({
      success: true,
      unreadCount
    });
  } catch (error) {
    console.error(`[Get Unread Count Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error counting unread notifications',
      error: error.message
    });
  }
};

/**
 * @desc    Mark a single notification as read
 * @route   PATCH /api/notifications/:id/read
 * @access  Private
 */
const markAsRead = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format'
      });
    }

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Strict ownership enforcement: recipient must match authenticated user
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to access this notification'
      });
    }

    if (!notification.isRead) {
      notification.isRead = true;
      notification.readAt = new Date();
      await notification.save();
    }

    return res.status(200).json({
      success: true,
      message: 'Notification marked as read',
      notification
    });
  } catch (error) {
    console.error(`[Mark Read Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error updating notification',
      error: error.message
    });
  }
};

/**
 * @desc    Mark all unread notifications belonging to authenticated user as read
 * @route   PATCH /api/notifications/read-all
 * @access  Private
 */
const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { $set: { isRead: true, readAt: new Date() } }
    );

    return res.status(200).json({
      success: true,
      message: 'All notifications marked as read',
      modifiedCount: result.modifiedCount
    });
  } catch (error) {
    console.error(`[Mark All Read Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error updating notifications',
      error: error.message
    });
  }
};

/**
 * @desc    Delete a notification (recipient ownership enforced)
 * @route   DELETE /api/notifications/:id
 * @access  Private
 */
const deleteNotification = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid notification ID format'
      });
    }

    const notification = await Notification.findById(id);

    if (!notification) {
      return res.status(404).json({
        success: false,
        message: 'Notification not found'
      });
    }

    // Strict recipient ownership
    if (notification.recipient.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to delete this notification'
      });
    }

    await notification.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Notification deleted successfully'
    });
  } catch (error) {
    console.error(`[Delete Notification Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error deleting notification',
      error: error.message
    });
  }
};

/**
 * @desc    Trigger checking and notification of delayed orders (Idempotent)
 * @route   POST /api/notifications/check-delayed
 * @access  Private
 */
const triggerCheckDelayed = async (req, res) => {
  try {
    const result = await checkAndNotifyDelayedOrders();
    return res.status(200).json({
      success: true,
      message: 'Delayed order notifications checked',
      result
    });
  } catch (error) {
    console.error(`[Trigger Check Delayed Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error checking delayed orders',
      error: error.message
    });
  }
};

module.exports = {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  triggerCheckDelayed
};
