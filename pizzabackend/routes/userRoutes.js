const express = require('express');
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  logoutUser,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
  createGuestToken
} = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const router = express.Router();

// Auth routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.get('/profile', protect, getUserProfile);
router.post('/logout', protect, logoutUser);
router.post('/guest-token', createGuestToken); // Add this new route


// Address routes
router.get('/addresses', protect, getUserAddresses);
router.post('/addresses', protect, addUserAddress);
router.put('/addresses/:addressId', protect, updateUserAddress);
router.delete('/addresses/:addressId', protect, deleteUserAddress);
router.put('/addresses/:addressId/default', protect, setDefaultAddress);

module.exports = router;