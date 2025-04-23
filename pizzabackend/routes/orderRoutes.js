const express = require('express');
const router = express.Router();
const orderController = require('../controllers/orderController');
const { protect, admin } = require('../middleware/authMiddleware');

// Customer routes
router.post('/', protect, orderController.placeOrder);
router.get('/my-orders', protect, orderController.getMyOrders);
router.get('/my-orders/:id', protect, orderController.getMyOrderById);

// Admin routes
router.get('/', protect, admin, orderController.getOrders);
router.get('/:id', protect, admin, orderController.getOrderById);
router.put('/:id/status', protect, admin, orderController.updateOrderStatus);
router.put('/:id/delivery-agent', protect, admin, orderController.assignDeliveryAgent);
router.get('/filter', protect, admin, orderController.filterOrders);
router.get('/search', protect, admin, orderController.searchOrders);

module.exports = router;