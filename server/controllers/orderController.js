const mongoose = require('mongoose');
const { Order, BASE_PRICES } = require('../models/Order');
const Measurement = require('../models/Measurement');
const {
  sendNotification,
  sendAdminAlert,
  checkAndNotifyDelayedOrders
} = require('../services/notificationService');

// Valid order status transitions state-machine
const VALID_TRANSITIONS = {
  Pending: ['Confirmed', 'Cancelled'],
  Confirmed: ['In Progress', 'Cancelled'],
  'In Progress': ['Ready for Pickup', 'Cancelled'],
  'Ready for Pickup': ['Completed'],
  Completed: [],
  Cancelled: []
};

// Generate unique order number (e.g. SS-20261018-8A3F)
const generateOrderNumber = () => {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const randomPart = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `SS-${dateStr}-${randomPart}`;
};

/**
 * Helper to compute isDelayed and ensure backward compatibility for history
 */
const enrichOrder = (orderDoc) => {
  if (!orderDoc) return null;
  const orderObj = orderDoc.toObject ? orderDoc.toObject() : { ...orderDoc };
  const now = new Date();
  const deliveryDate = new Date(orderObj.estimatedDeliveryDate);

  // Delayed: estimatedDeliveryDate is past, and status is neither Completed nor Cancelled
  orderObj.isDelayed =
    orderObj.status !== 'Completed' &&
    orderObj.status !== 'Cancelled' &&
    deliveryDate < now;

  // Backward compatibility: ensure statusHistory has at least the initial recorded status
  if (!orderObj.statusHistory || orderObj.statusHistory.length === 0) {
    orderObj.statusHistory = [
      {
        status: orderObj.status,
        changedAt: orderObj.createdAt || orderObj.orderDate || now,
        note: 'Initial recorded status'
      }
    ];
  }

  if (!orderObj.deliveryDateHistory) {
    orderObj.deliveryDateHistory = [];
  }

  return orderObj;
};

/**
 * @desc    Create a new tailoring order
 * @route   POST /api/orders
 * @access  Private (Customer)
 */
const createOrder = async (req, res) => {
  try {
    const customerId = req.user._id;

    // 1. Enforce that customer must have saved measurements
    const savedMeasurement = await Measurement.findOne({ customer: customerId });
    if (!savedMeasurement) {
      return res.status(400).json({
        success: false,
        message:
          'You must save your tailoring measurements before placing an order. Please visit My Measurements to record your dimensions.'
      });
    }

    const {
      clothingType,
      designDetails,
      fabricDetails,
      quantity,
      specialInstructions,
      estimatedDeliveryDate
    } = req.body;

    // 2. Validate required fields
    if (!clothingType || !clothingType.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Clothing type is required'
      });
    }

    const normalizedClothingType = clothingType.toLowerCase().trim();
    if (!BASE_PRICES[normalizedClothingType]) {
      return res.status(400).json({
        success: false,
        message: `Invalid clothing type. Must be one of: ${Object.keys(BASE_PRICES).join(', ')}`
      });
    }

    if (!designDetails || !designDetails.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Design details description is required'
      });
    }

    if (
      !fabricDetails ||
      typeof fabricDetails !== 'object' ||
      !fabricDetails.fabricType ||
      !fabricDetails.fabricType.trim() ||
      !fabricDetails.color ||
      !fabricDetails.color.trim()
    ) {
      return res.status(400).json({
        success: false,
        message: 'Fabric details must include fabric type and colour'
      });
    }

    // Validate quantity
    const orderQty = quantity ? parseInt(quantity, 10) : 1;
    if (isNaN(orderQty) || orderQty < 1) {
      return res.status(400).json({
        success: false,
        message: 'Quantity must be a positive integer (minimum 1)'
      });
    }

    // Validate estimated delivery date
    if (!estimatedDeliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Estimated delivery date is required'
      });
    }

    const deliveryDateObj = new Date(estimatedDeliveryDate);
    if (isNaN(deliveryDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid estimated delivery date'
      });
    }

    // Must be in the future (at least tomorrow)
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (deliveryDateObj <= today) {
      return res.status(400).json({
        success: false,
        message: 'Estimated delivery date must be a future date'
      });
    }

    // 3. Calculate server-controlled base price in Indian Rupees (₹)
    const unitPrice = BASE_PRICES[normalizedClothingType] || 1000;
    const computedPrice = unitPrice * orderQty;

    // 4. Create snapshot of customer's measurements at order time
    const measurementSnapshot = {
      height: savedMeasurement.height,
      shoulder: savedMeasurement.shoulder,
      chest: savedMeasurement.chest,
      waist: savedMeasurement.waist,
      hip: savedMeasurement.hip,
      sleeve: savedMeasurement.sleeve,
      armhole: savedMeasurement.armhole,
      neck: savedMeasurement.neck,
      length: savedMeasurement.length
    };

    // 5. Generate order number
    let orderNumber = generateOrderNumber();
    const existingOrder = await Order.findOne({ orderNumber });
    if (existingOrder) {
      orderNumber = generateOrderNumber() + '-1';
    }

    const now = new Date();

    // 6. Create order in MongoDB with initial statusHistory and deliveryDateHistory
    const order = await Order.create({
      customer: customerId,
      orderNumber,
      clothingType: normalizedClothingType,
      designDetails: designDetails.trim(),
      fabricDetails: {
        fabricType: fabricDetails.fabricType.trim(),
        color: fabricDetails.color.trim(),
        notes: fabricDetails.notes ? fabricDetails.notes.trim() : ''
      },
      measurements: measurementSnapshot,
      quantity: orderQty,
      specialInstructions: specialInstructions ? specialInstructions.trim() : '',
      estimatedDeliveryDate: deliveryDateObj,
      price: computedPrice,
      status: 'Pending',
      statusHistory: [
        {
          status: 'Pending',
          changedAt: now,
          changedBy: customerId,
          note: 'Order placed by customer'
        }
      ],
      deliveryDateHistory: [
        {
          previousDate: deliveryDateObj,
          newDate: deliveryDateObj,
          changedAt: now,
          changedBy: customerId,
          reason: 'Initial target delivery date specified at order placement'
        }
      ]
    });

    // Send customer confirmation notification
    await sendNotification({
      recipient: customerId,
      order: order._id,
      type: 'order_created',
      title: 'Order Placed Successfully',
      message: `Your tailoring order #${orderNumber} for a ${normalizedClothingType} has been placed. Our boutique staff is reviewing your specifications.`,
      metadata: { orderNumber, clothingType: normalizedClothingType, price: computedPrice }
    });

    // Send admin staff alert for new incoming customer order
    const customerName = req.user.name || 'A customer';
    await sendAdminAlert({
      order: order._id,
      type: 'order_created',
      title: 'New Tailoring Order Received',
      message: `${customerName} placed a new order #${orderNumber} (${normalizedClothingType}, ₹${computedPrice}). Please review measurements & confirm.`,
      metadata: { orderNumber, customerId, clothingType: normalizedClothingType, price: computedPrice }
    });

    return res.status(201).json({
      success: true,
      message: 'Tailoring order placed successfully',
      order: enrichOrder(order)
    });
  } catch (error) {
    console.error(`[Create Order Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error creating order',
      error: error.message
    });
  }
};

/**
 * @desc    Get all orders for authenticated customer
 * @route   GET /api/orders/my
 * @access  Private (Customer)
 */
const getMyOrders = async (req, res) => {
  try {
    const rawOrders = await Order.find({ customer: req.user._id })
      .populate('statusHistory.changedBy', 'name role email')
      .populate('deliveryDateHistory.changedBy', 'name role email')
      .sort({ createdAt: -1 });

    const orders = rawOrders.map((o) => enrichOrder(o));

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error(`[Get My Orders Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving your orders',
      error: error.message
    });
  }
};

/**
 * @desc    Get single order details by ID
 * @route   GET /api/orders/:id
 * @access  Private (Customer owner or Admin/Tailor)
 */
const getOrderById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(id)
      .populate('customer', 'name email phone')
      .populate('statusHistory.changedBy', 'name role email')
      .populate('deliveryDateHistory.changedBy', 'name role email');

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Access check: only the owner customer or an admin/tailor can view
    const isOwner =
      order.customer && order.customer._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to view this order'
      });
    }

    return res.status(200).json({
      success: true,
      order: enrichOrder(order)
    });
  } catch (error) {
    console.error(`[Get Order Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving order',
      error: error.message
    });
  }
};

/**
 * @desc    Update order details (Customer if Pending, or Admin for details/price/date)
 * @route   PUT /api/orders/:id
 * @access  Private
 */
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const isOwner = order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to modify this order'
      });
    }

    // Customer rules: can only edit if status is Pending!
    if (!isAdmin && order.status !== 'Pending') {
      return res.status(400).json({
        success: false,
        message: `Only Pending orders can be edited by the customer. Current status is '${order.status}'. Please contact the tailor for modifications.`
      });
    }

    const {
      clothingType,
      designDetails,
      fabricDetails,
      quantity,
      specialInstructions,
      estimatedDeliveryDate,
      price
    } = req.body;

    // Security: customers cannot change estimatedDeliveryDate after creation
    if (!isAdmin && estimatedDeliveryDate !== undefined) {
      return res.status(403).json({
        success: false,
        message: 'Customers cannot modify estimated delivery date once order is placed. Please contact the tailor boutique.'
      });
    }

    // Apply allowed customer updates
    if (clothingType !== undefined) {
      const normalizedClothingType = clothingType.toLowerCase().trim();
      if (!BASE_PRICES[normalizedClothingType]) {
        return res.status(400).json({
          success: false,
          message: `Invalid clothing type. Must be one of: ${Object.keys(BASE_PRICES).join(', ')}`
        });
      }
      order.clothingType = normalizedClothingType;
    }

    if (designDetails !== undefined && designDetails.trim()) {
      order.designDetails = designDetails.trim();
    }

    if (fabricDetails && typeof fabricDetails === 'object') {
      if (fabricDetails.fabricType && fabricDetails.fabricType.trim()) {
        order.fabricDetails.fabricType = fabricDetails.fabricType.trim();
      }
      if (fabricDetails.color && fabricDetails.color.trim()) {
        order.fabricDetails.color = fabricDetails.color.trim();
      }
      if (fabricDetails.notes !== undefined) {
        order.fabricDetails.notes = fabricDetails.notes.trim();
      }
    }

    if (quantity !== undefined) {
      const qtyNum = parseInt(quantity, 10);
      if (isNaN(qtyNum) || qtyNum < 1) {
        return res.status(400).json({
          success: false,
          message: 'Quantity must be a positive integer (minimum 1)'
        });
      }
      order.quantity = qtyNum;
    }

    if (specialInstructions !== undefined) {
      order.specialInstructions = specialInstructions.trim();
    }

    // Customer price recalculation (if customer changed quantity or clothingType)
    if (!isAdmin && (clothingType !== undefined || quantity !== undefined)) {
      const unitPrice = BASE_PRICES[order.clothingType] || 1000;
      order.price = unitPrice * order.quantity;
    }

    // Staff/Admin price override
    if (isAdmin && price !== undefined) {
      const priceNum = Number(price);
      if (isNaN(priceNum) || priceNum < 0) {
        return res.status(400).json({
          success: false,
          message: 'Price must be a non-negative number'
        });
      }
      order.price = priceNum;
    }

    // Staff/Admin estimated delivery date update
    if (isAdmin && estimatedDeliveryDate !== undefined) {
      const dateObj = new Date(estimatedDeliveryDate);
      if (isNaN(dateObj.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Please provide a valid estimated delivery date'
        });
      }

      const prevDate = order.estimatedDeliveryDate;
      if (prevDate.getTime() !== dateObj.getTime()) {
        if (!order.deliveryDateHistory) {
          order.deliveryDateHistory = [];
        }
        order.deliveryDateHistory.push({
          previousDate: prevDate,
          newDate: dateObj,
          changedAt: new Date(),
          changedBy: req.user._id,
          reason: req.body.reason ? req.body.reason.trim() : 'Updated by tailor staff'
        });
        order.estimatedDeliveryDate = dateObj;

        // Notify customer
        await sendNotification({
          recipient: order.customer,
          order: order._id,
          type: 'delivery_date_updated',
          title: 'Delivery Schedule Revised',
          message: `The estimated delivery date for Order #${order.orderNumber} has been updated to ${dateObj.toLocaleDateString()}.${req.body.reason ? ' Note: ' + req.body.reason.trim() : ''}`,
          metadata: { orderNumber: order.orderNumber, previousDate: prevDate, newDate: dateObj }
        });
      }
    }

    await order.save();

    return res.status(200).json({
      success: true,
      message: 'Order updated successfully',
      order: enrichOrder(order)
    });
  } catch (error) {
    console.error(`[Update Order Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error updating order',
      error: error.message
    });
  }
};

/**
 * @desc    Cancel order (Customer if Pending/Confirmed, or Admin)
 * @route   PATCH /api/orders/:id/cancel
 * @access  Private
 */
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const isOwner = order.customer.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isOwner && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Forbidden: You are not authorized to cancel this order'
      });
    }

    // Check cancellation eligibility
    if (order.status === 'Cancelled') {
      return res.status(400).json({
        success: false,
        message: 'Order is already cancelled'
      });
    }

    if (order.status === 'Completed') {
      return res.status(400).json({
        success: false,
        message: 'Completed orders cannot be cancelled'
      });
    }

    // For customer: only allow cancellation if Pending or Confirmed
    if (!isAdmin && order.status !== 'Pending' && order.status !== 'Confirmed') {
      return res.status(400).json({
        success: false,
        message: `Orders currently '${order.status}' cannot be cancelled online. Please contact the tailoring boutique.`
      });
    }

    order.status = 'Cancelled';
    if (!order.statusHistory) {
      order.statusHistory = [];
    }
    order.statusHistory.push({
      status: 'Cancelled',
      changedAt: new Date(),
      changedBy: req.user._id,
      note: req.body.reason
        ? req.body.reason.trim()
        : isAdmin
        ? 'Cancelled by tailor staff'
        : 'Cancelled by customer'
    });

    await order.save();

    if (isAdmin) {
      await sendNotification({
        recipient: order.customer,
        order: order._id,
        type: 'order_cancelled',
        title: 'Order Cancelled by Shop',
        message: `Your tailoring order #${order.orderNumber} was cancelled by our boutique staff.${req.body.reason ? ' Reason: ' + req.body.reason.trim() : ''}`,
        metadata: { orderNumber: order.orderNumber, status: 'Cancelled' }
      });
    } else {
      await sendAdminAlert({
        order: order._id,
        type: 'order_cancelled',
        title: 'Customer Cancelled Order',
        message: `Customer cancelled order #${order.orderNumber} (${order.clothingType}). Work on this garment has been cancelled.`,
        metadata: { orderNumber: order.orderNumber, status: 'Cancelled' }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Order ${order.orderNumber} has been successfully cancelled`,
      order: enrichOrder(order)
    });
  } catch (error) {
    console.error(`[Cancel Order Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error cancelling order',
      error: error.message
    });
  }
};

/**
 * @desc    Admin: List all orders with optional status or delayed filter
 * @route   GET /api/orders
 * @access  Private (Admin/Tailor Only)
 */
const getAllOrders = async (req, res) => {
  try {
    const filter = {};
    const now = new Date();

    if (req.query.status) {
      if (req.query.status === 'Delayed') {
        filter.status = { $nin: ['Completed', 'Cancelled'] };
        filter.estimatedDeliveryDate = { $lt: now };
      } else {
        filter.status = req.query.status;
      }
    }

    const rawOrders = await Order.find(filter)
      .populate('customer', 'name email phone')
      .populate('statusHistory.changedBy', 'name role email')
      .populate('deliveryDateHistory.changedBy', 'name role email')
      .sort({ createdAt: -1 });

    const orders = rawOrders.map((o) => enrichOrder(o));

    return res.status(200).json({
      success: true,
      count: orders.length,
      orders
    });
  } catch (error) {
    console.error(`[Get All Orders Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving orders',
      error: error.message
    });
  }
};

/**
 * @desc    Admin: Update order status with transition rules validation and history
 * @route   PATCH /api/orders/:id/status
 * @access  Private (Admin/Tailor Only)
 */
const updateOrderStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status, note } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    if (!status) {
      return res.status(400).json({
        success: false,
        message: 'New status is required'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    // Rule: Updating to the same status does not create duplicate history and is rejected
    if (order.status === status) {
      return res.status(400).json({
        success: false,
        message: `Order is already in '${status}' status. No duplicate status history recorded.`
      });
    }

    const allowedTransitions = VALID_TRANSITIONS[order.status] || [];

    if (!allowedTransitions.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status transition: Cannot change status from '${order.status}' to '${status}'. Allowed next statuses: [${allowedTransitions.join(', ') || 'None (Terminal state)'}]`
      });
    }

    order.status = status;
    if (!order.statusHistory) {
      order.statusHistory = [];
    }

    order.statusHistory.push({
      status,
      changedAt: new Date(),
      changedBy: req.user._id,
      note: note ? note.trim() : `Status advanced to '${status}' by tailor staff`
    });

    await order.save();

    // Send customer notification according to status transition
    const notifMap = {
      Confirmed: {
        type: 'order_confirmed',
        title: 'Order Confirmed',
        message: `Your tailoring order #${order.orderNumber} (${order.clothingType}) has been verified and confirmed by our boutique.`
      },
      'In Progress': {
        type: 'order_in_progress',
        title: 'Tailoring in Progress',
        message: `Cutting and stitching has started for your ${order.clothingType} (Order #${order.orderNumber}). Our master tailors are working on your garment.`
      },
      'Ready for Pickup': {
        type: 'order_ready_pickup',
        title: 'Ready for Boutique Pickup! 👗',
        message: `Your custom ${order.clothingType} (Order #${order.orderNumber}) is finished, pressed, and ready for pickup at our tailoring boutique!`
      },
      Completed: {
        type: 'order_completed',
        title: 'Order Completed',
        message: `Thank you for choosing StitchSmart! Your order #${order.orderNumber} is marked completed. We hope you love the fit!`
      },
      Cancelled: {
        type: 'order_cancelled',
        title: 'Order Cancelled',
        message: `Your order #${order.orderNumber} has been cancelled by boutique staff.${note ? ' Note: ' + note : ''}`
      }
    };

    const statusNotif = notifMap[status];
    if (statusNotif) {
      await sendNotification({
        recipient: order.customer,
        order: order._id,
        type: statusNotif.type,
        title: statusNotif.title,
        message: statusNotif.message,
        metadata: {
          orderNumber: order.orderNumber,
          clothingType: order.clothingType,
          status,
          note: note || ''
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: `Order status successfully updated to '${status}'`,
      order: enrichOrder(order)
    });
  } catch (error) {
    console.error(`[Update Order Status Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error updating order status',
      error: error.message
    });
  }
};

/**
 * @desc    Admin: Update estimated delivery date with audit history
 * @route   PATCH /api/orders/:id/delivery-date
 * @access  Private (Admin/Tailor Only)
 */
const updateDeliveryDate = async (req, res) => {
  try {
    const { id } = req.params;
    const { estimatedDeliveryDate, reason } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid order ID format'
      });
    }

    if (!estimatedDeliveryDate) {
      return res.status(400).json({
        success: false,
        message: 'Estimated delivery date is required'
      });
    }

    const newDateObj = new Date(estimatedDeliveryDate);
    if (isNaN(newDateObj.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a valid estimated delivery date'
      });
    }

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({
        success: false,
        message: 'Order not found'
      });
    }

    const previousDate = order.estimatedDeliveryDate;
    order.estimatedDeliveryDate = newDateObj;

    if (!order.deliveryDateHistory) {
      order.deliveryDateHistory = [];
    }

    order.deliveryDateHistory.push({
      previousDate,
      newDate: newDateObj,
      changedAt: new Date(),
      changedBy: req.user._id,
      reason: reason ? reason.trim() : 'Estimated delivery date rescheduled by tailor'
    });

    await order.save();

    // Notify customer
    const formattedNewDate = newDateObj.toLocaleDateString();
    await sendNotification({
      recipient: order.customer,
      order: order._id,
      type: 'delivery_date_updated',
      title: 'Delivery Schedule Revised',
      message: `The estimated delivery date for Order #${order.orderNumber} has been rescheduled to ${formattedNewDate}.${reason ? ' Reason: ' + reason.trim() : ''}`,
      metadata: { orderNumber: order.orderNumber, previousDate, newDate: newDateObj, reason: reason || '' }
    });

    return res.status(200).json({
      success: true,
      message: 'Estimated delivery date updated successfully',
      order: enrichOrder(order)
    });
  } catch (error) {
    console.error(`[Update Delivery Date Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error updating delivery date',
      error: error.message
    });
  }
};

/**
 * @desc    Admin: Get dashboard summary counts directly from MongoDB
 * @route   GET /api/orders/stats/summary
 * @access  Private (Admin/Tailor Only)
 */
const getOrderStats = async (req, res) => {
  try {
    const now = new Date();

    const [
      total,
      pending,
      inProgress,
      readyForPickup,
      completed,
      cancelled,
      delayed
    ] = await Promise.all([
      Order.countDocuments({}),
      Order.countDocuments({ status: 'Pending' }),
      Order.countDocuments({ status: 'In Progress' }),
      Order.countDocuments({ status: 'Ready for Pickup' }),
      Order.countDocuments({ status: 'Completed' }),
      Order.countDocuments({ status: 'Cancelled' }),
      Order.countDocuments({
        status: { $nin: ['Completed', 'Cancelled'] },
        estimatedDeliveryDate: { $lt: now }
      })
    ]);

    // Check and create notifications for delayed orders idempotently
    await checkAndNotifyDelayedOrders();

    return res.status(200).json({
      success: true,
      stats: {
        total,
        pending,
        inProgress,
        readyForPickup,
        completed,
        cancelled,
        delayed
      }
    });
  } catch (error) {
    console.error(`[Get Order Stats Error] ${error.message}`);
    return res.status(500).json({
      success: false,
      message: 'Server error retrieving order metrics',
      error: error.message
    });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrder,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
  updateDeliveryDate,
  getOrderStats,
  VALID_TRANSITIONS
};
