const Order = require('../models/Order');
const User = require('../models/User');
const asyncHandler = require('express-async-handler');

// @desc    Place a new order
// @route   POST /api/orders
// @access  Private
exports.placeOrder = asyncHandler(async (req, res) => {
  const {
    items,
    amount,
    address,
    paymentMethod,
    paymentDetails,
    notes
  } = req.body;

  if (!items || items.length === 0) {
    res.status(400);
    throw new Error('No order items');
  }

  // Get user details for customer info
  const user = await User.findById(req.user._id);
  
  const order = new Order({
    customer: req.user._id,
    customerName: user.name,
    items,
    amount,
    address,
    fullAddress: `${address.street}, ${address.city}, ${address.state} ${address.zipCode}`,
    paymentMethod,
    paymentDetails,
    customerPhone: user.phone || req.body.customerPhone,
    notes,
    deliveryAgentName: 'Unassigned'
  });

  const createdOrder = await order.save();
  res.status(201).json(createdOrder);
});

// @desc    Get logged in user's orders
// @route   GET /api/orders/my-orders
// @access  Private
exports.getMyOrders = asyncHandler(async (req, res) => {
  const orders = await Order.find({ customer: req.user._id })
    .sort({ createdAt: -1 });
  
  res.json(orders);
});

// @desc    Get order by ID for logged in user
// @route   GET /api/orders/my-orders/:id
// @access  Private
exports.getMyOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id);

  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Make sure the order belongs to the logged in user
  if (order.customer.toString() !== req.user._id.toString()) {
    res.status(401);
    throw new Error('Not authorized');
  }

  res.json(order);
});

// @desc    Get all orders (admin)
// @route   GET /api/orders
// @access  Private/Admin
exports.getOrders = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;
  
  const count = await Order.countDocuments({});
  const orders = await Order.find({})
    .sort({ createdAt: -1 })
    .skip(pageSize * (page - 1))
    .limit(pageSize);

  const formattedOrders = orders.map(order => {
    return {
      id: order.orderNumber,
      _id: order._id,
      customer: order.customerName,
      status: order.status,
      deliveryAgent: order.deliveryAgentName,
      date: order.getFormattedDate(),
      time: order.time,
      amount: order.amount,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      address: order.fullAddress,
      notes: order.notes || ''
    };
  });
  
  res.json({
    orders: formattedOrders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Get order by ID (admin)
// @route   GET /api/orders/:id
// @access  Private/Admin
exports.getOrderById = asyncHandler(async (req, res) => {
  const order = await Order.findById(req.params.id)
    .populate('customer', 'name email')
    .populate('deliveryAgent', 'name');
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  res.json(order);
});

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Admin
exports.updateOrderStatus = asyncHandler(async (req, res) => {
  const { status, note } = req.body;
  
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  // Update status and add to status history
  order.status = status;
  order.statusUpdates.push({
    status,
    time: Date.now(),
    note: note || `Status updated to ${status}`
  });
  
  const updatedOrder = await order.save();
  
  res.json({
    success: true,
    order: {
      id: updatedOrder.orderNumber,
      _id: updatedOrder._id,
      status: updatedOrder.status
    }
  });
});

// @desc    Assign delivery agent to order
// @route   PUT /api/orders/:id/delivery-agent
// @access  Private/Admin
exports.assignDeliveryAgent = asyncHandler(async (req, res) => {
  const { deliveryAgentId, deliveryAgentName } = req.body;
  
  const order = await Order.findById(req.params.id);
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }
  
  // If setting to unassigned
  if (deliveryAgentName === 'Unassigned') {
    order.deliveryAgent = null;
    order.deliveryAgentName = 'Unassigned';
    
    // Add note to status updates
    order.statusUpdates.push({
      status: order.status,
      time: Date.now(),
      note: 'Delivery agent unassigned'
    });
  } else {
    // Verify the delivery agent exists
    const agent = await User.findById(deliveryAgentId);
    
    if (!agent) {
      res.status(400);
      throw new Error('Delivery agent not found');
    }
    
    order.deliveryAgent = deliveryAgentId;
    order.deliveryAgentName = deliveryAgentName || agent.name;
    
    // Add note to status updates
    order.statusUpdates.push({
      status: order.status,
      time: Date.now(),
      note: `Assigned to ${order.deliveryAgentName}`
    });
  }
  
  const updatedOrder = await order.save();
  
  res.json({
    success: true,
    order: {
      id: updatedOrder.orderNumber,
      _id: updatedOrder._id,
      deliveryAgent: updatedOrder.deliveryAgentName
    }
  });
});

// @desc    Filter orders
// @route   GET /api/orders/filter
// @access  Private/Admin
exports.filterOrders = asyncHandler(async (req, res) => {
  const { status, date, deliveryAgent } = req.query;
  const filterOptions = {};
  
  if (status) {
    filterOptions.status = status;
  }
  
  if (date) {
    // Convert date string to Date object range for the whole day
    const startDate = new Date(date);
    startDate.setHours(0, 0, 0, 0);
    
    const endDate = new Date(date);
    endDate.setHours(23, 59, 59, 999);
    
    filterOptions.date = { $gte: startDate, $lte: endDate };
  }
  
  if (deliveryAgent) {
    if (deliveryAgent === 'Unassigned') {
      filterOptions.deliveryAgentName = 'Unassigned';
    } else {
      filterOptions.deliveryAgentName = deliveryAgent;
    }
  }
  
  const pageSize = 10;
  const page = Number(req.query.page) || 1;
  
  const count = await Order.countDocuments(filterOptions);
  const orders = await Order.find(filterOptions)
    .sort({ createdAt: -1 })
    .skip(pageSize * (page - 1))
    .limit(pageSize);
  
  const formattedOrders = orders.map(order => {
    return {
      id: order.orderNumber,
      _id: order._id,
      customer: order.customerName,
      status: order.status,
      deliveryAgent: order.deliveryAgentName,
      date: order.getFormattedDate(),
      time: order.time,
      amount: order.amount,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      address: order.fullAddress,
      notes: order.notes || ''
    };
  });
  
  res.json({
    orders: formattedOrders,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Search orders
// @route   GET /api/orders/search
// @access  Private/Admin
exports.searchOrders = asyncHandler(async (req, res) => {
  const { query } = req.query;
  
  if (!query) {
    return res.status(400).json({ message: 'Search query is required' });
  }
  
  // Search by order number, customer name, or item name
  const orders = await Order.find({
    $or: [
      { orderNumber: { $regex: query, $options: 'i' } },
      { customerName: { $regex: query, $options: 'i' } },
      { 'items.name': { $regex: query, $options: 'i' } }
    ]
  }).limit(20);
  
  const formattedOrders = orders.map(order => {
    return {
      id: order.orderNumber,
      _id: order._id,
      customer: order.customerName,
      status: order.status,
      deliveryAgent: order.deliveryAgentName,
      date: order.getFormattedDate(),
      time: order.time,
      amount: order.amount,
      items: order.items.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      address: order.fullAddress,
      notes: order.notes || ''
    };
  });
  
  res.json(formattedOrders);
});