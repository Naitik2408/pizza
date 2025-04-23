const express = require('express');
const { protect, admin } = require('../middleware/authMiddleware');
const {
  getMenuItems,
  addMenuItem,
  editMenuItem,
  deleteMenuItem,
  toggleAvailability,
  toggleSizeAvailability, // New function
  rateMenuItem,
} = require('../controllers/menuController');

const router = express.Router();

// Public routes
router.get('/', getMenuItems);

// Admin routes
router.post('/', protect, admin, addMenuItem);
router.put('/:id', protect, admin, editMenuItem);
router.delete('/:id', protect, admin, deleteMenuItem);
router.put('/:id/toggle-availability', protect, admin, toggleAvailability);
router.put('/:id/toggle-size-availability', protect, admin, toggleSizeAvailability); // New route

// User routes
router.post('/:id/rate', protect, rateMenuItem);

module.exports = router;