const Transaction = require('../models/Transaction');
const Order = require('../models/Order');
const asyncHandler = require('express-async-handler');

// @desc    Create a new transaction when payment is confirmed
// @route   POST /api/transactions
// @access  Private/Delivery
exports.createTransaction = asyncHandler(async (req, res) => {
  const { orderId, upiReference, notes } = req.body;

  // Find the order
  const order = await Order.findById(orderId);
  
  if (!order) {
    res.status(404);
    throw new Error('Order not found');
  }

  // Check if this is the assigned delivery agent
  if (order.deliveryAgent && order.deliveryAgent.toString() !== req.user._id.toString()) {
    res.status(403);
    throw new Error('You are not authorized to confirm this payment');
  }

  // Create transaction record
  const transaction = await Transaction.create({
    order: order._id,
    orderNumber: order.orderNumber,
    amount: order.amount,
    paymentMethod: order.paymentMethod,
    upiDetails: {
      upiId: req.body.upiId || 'naitikkumar2408-1@oksbi', // Shop owner's UPI ID
      merchantName: req.body.merchantName || 'Pizza Shop',
      merchantCode: req.body.merchantCode || 'PIZZASHP001',
      referenceNumber: upiReference || order.orderNumber,
    },
    confirmedBy: req.user._id,
    confirmedByName: req.user.name,
    customer: order.customer,
    customerName: order.customerName,
    notes: notes || 'Payment confirmed by delivery agent'
  });

  // Update order payment status
  order.paymentStatus = 'Completed';
  
  // Add status update
  order.statusUpdates.push({
    status: order.status,
    time: new Date(),
    note: 'Payment confirmed by delivery agent'
  });

  await order.save();

  res.status(201).json({
    success: true,
    transaction,
    order: {
      id: order.orderNumber,
      _id: order._id,
      paymentStatus: order.paymentStatus
    }
  });
});

// @desc    Get all transactions
// @route   GET /api/transactions
// @access  Private/Admin
exports.getTransactions = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;
  
  const count = await Transaction.countDocuments({});
  const transactions = await Transaction.find({})
    .sort({ createdAt: -1 })
    .skip(pageSize * (page - 1))
    .limit(pageSize);
  
  res.json({
    transactions,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Get transactions by delivery agent
// @route   GET /api/transactions/delivery
// @access  Private/Delivery
exports.getDeliveryTransactions = asyncHandler(async (req, res) => {
  const pageSize = 10;
  const page = Number(req.query.page) || 1;
  
  const count = await Transaction.countDocuments({ confirmedBy: req.user._id });
  const transactions = await Transaction.find({ confirmedBy: req.user._id })
    .sort({ createdAt: -1 })
    .skip(pageSize * (page - 1))
    .limit(pageSize);
  
  res.json({
    transactions,
    page,
    pages: Math.ceil(count / pageSize),
    total: count
  });
});

// @desc    Get transaction details
// @route   GET /api/transactions/:id
// @access  Private/Admin
exports.getTransactionById = asyncHandler(async (req, res) => {
  const transaction = await Transaction.findById(req.params.id)
    .populate('order', 'orderNumber status items amount')
    .populate('confirmedBy', 'name email')
    .populate('customer', 'name email');
  
  if (!transaction) {
    res.status(404);
    throw new Error('Transaction not found');
  }
  
  res.json(transaction);
});

// @desc    Get transactions by date range
// @route   GET /api/transactions/date-range
// @access  Private/Admin
exports.getTransactionsByDateRange = asyncHandler(async (req, res) => {
  const { startDate, endDate } = req.query;
  
  if (!startDate || !endDate) {
    res.status(400);
    throw new Error('Start date and end date are required');
  }
  
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(endDate);
  end.setHours(23, 59, 59, 999);
  
  const transactions = await Transaction.find({
    transactionDate: { $gte: start, $lte: end }
  }).sort({ transactionDate: 1 });
  
  // Calculate total amount
  const totalAmount = transactions.reduce((sum, transaction) => {
    return sum + transaction.amount;
  }, 0);
  
  res.json({
    transactions,
    totalAmount,
    count: transactions.length,
    dateRange: {
      from: start,
      to: end
    }
  });
});