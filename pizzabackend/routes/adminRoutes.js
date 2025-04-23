const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getOrders,
  updateOrderStatus,
  assignDeliveryAgent,
  getDashboardStats,
  getDeliveryAgents
} = require('../controllers/adminController');

const router = express.Router();

// Fetch all orders
router.get('/orders', protect, admin, getOrders);

// Update order status
router.put('/orders/:id/status', protect, admin, updateOrderStatus);

// Assign delivery agent
router.put('/orders/:id/assign-agent', protect, admin, assignDeliveryAgent);

// Add this route to get all delivery agents
router.get('/delivery-agents', protect, admin, getDeliveryAgents);

// Fetch dashboard statistics
router.get('/stats', protect, admin, getDashboardStats);



module.exports = router;