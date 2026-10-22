const Notification = require('../models/Notification');
const User = require('../models/User');
const { Order } = require('../models/Order');

/**
 * Safely create a notification for a single recipient.
 * Catches errors internally so notification failures never crash business workflows.
 */
const sendNotification = async ({ recipient, order, type, title, message, metadata = {} }) => {
  try {
    if (!recipient) {
      console.warn('[Notification Service] Cannot send notification: recipient is missing');
      return null;
    }

    const notif = await Notification.create({
      recipient,
      order: order || null,
      type,
      title: title.trim(),
      message: message.trim(),
      metadata,
      isRead: false
    });

    return notif;
  } catch (error) {
    console.error(`[Notification Service Error] Failed to send notification: ${error.message}`);
    return null;
  }
};

/**
 * Safely broadcast an alert to all authorized Admin/Tailor staff accounts.
 */
const sendAdminAlert = async ({ order, type = 'admin_alert', title, message, metadata = {} }) => {
  try {
    const adminUsers = await User.find({ role: 'admin' }).select('_id');
    if (!adminUsers || adminUsers.length === 0) {
      return [];
    }

    const createdNotifications = await Promise.all(
      adminUsers.map((admin) =>
        Notification.create({
          recipient: admin._id,
          order: order || null,
          type,
          title: title.trim(),
          message: message.trim(),
          metadata,
          isRead: false
        })
      )
    );

    return createdNotifications;
  } catch (error) {
    console.error(`[Notification Service Error] Failed to broadcast admin alert: ${error.message}`);
    return [];
  }
};

/**
 * Check for overdue orders and generate notifications without duplicates.
 * Idempotency rule: Checks if an 'order_delayed' notification already exists for the order.
 */
const checkAndNotifyDelayedOrders = async () => {
  try {
    const now = new Date();
    // Find active orders whose estimated delivery date is in the past
    const delayedOrders = await Order.find({
      status: { $nin: ['Completed', 'Cancelled'] },
      estimatedDeliveryDate: { $lt: now }
    }).populate('customer', 'name email phone');

    let newAlertsCount = 0;

    for (const order of delayedOrders) {
      // Deduplication check: Has a customer delayed notification already been sent for this order?
      const alreadyNotifiedCustomer = await Notification.findOne({
        order: order._id,
        recipient: order.customer._id || order.customer,
        type: 'order_delayed'
      });

      if (!alreadyNotifiedCustomer) {
        // Send customer notification
        const targetDateStr = new Date(order.estimatedDeliveryDate).toLocaleDateString();
        await sendNotification({
          recipient: order.customer._id || order.customer,
          order: order._id,
          type: 'order_delayed',
          title: 'Delivery Schedule Notice',
          message: `Your tailoring order #${order.orderNumber} (${order.clothingType}) is taking slightly longer than estimated (Target: ${targetDateStr}). Our master tailors are expediting production.`,
          metadata: {
            orderNumber: order.orderNumber,
            clothingType: order.clothingType,
            estimatedDeliveryDate: order.estimatedDeliveryDate
          }
        });

        // Send admin staff alert
        const customerName = order.customer?.name || 'Customer';
        await sendAdminAlert({
          order: order._id,
          type: 'admin_alert',
          title: 'Overdue Garment Alert',
          message: `Order #${order.orderNumber} for ${customerName} is past its estimated delivery date (${targetDateStr}). Current status: ${order.status}.`,
          metadata: {
            orderNumber: order.orderNumber,
            customerName,
            status: order.status,
            estimatedDeliveryDate: order.estimatedDeliveryDate
          }
        });

        newAlertsCount++;
      }
    }

    return { success: true, delayedOrdersFound: delayedOrders.length, newAlertsCreated: newAlertsCount };
  } catch (error) {
    console.error(`[Notification Service Error] checkAndNotifyDelayedOrders failed: ${error.message}`);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendNotification,
  sendAdminAlert,
  checkAndNotifyDelayedOrders
};
