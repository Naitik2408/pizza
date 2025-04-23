const User = require('../models/User');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

// Generate JWT
const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

// Register user
const registerUser = async (req, res) => {
  const { name, email, password, role } = req.body;

  try {
    const userExists = await User.findOne({ email });
    if (userExists) return res.status(400).json({ message: 'User already exists' });

    const user = await User.create({ name, email, password, role });
    if (user) {
      res.status(201).json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(400).json({ message: 'Invalid user data' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Login user
const loginUser = async (req, res) => {
  const { email, password } = req.body;

  
  try {
    const user = await User.findOne({ email });
    if (user && (await user.matchPassword(password))) {
      res.json({
        _id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        token: generateToken(user.id),
      });
    } else {
      res.status(401).json({ message: 'Invalid email or password' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Logout user
const logoutUser = async (req, res) => {
  try {
    // Invalidate the token (optional: implement token blacklist logic here)
    res.status(200).json({ message: 'User logged out successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get user profile
const getUserProfile = async (req, res) => {
  const user = await User.findById(req.user.id);
  if (user) {
    res.json({
      _id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  } else {
    res.status(404).json({ message: 'User not found' });
  }
};


// Get all addresses for a user
const getUserAddresses = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a new address
const addUserAddress = async (req, res) => {
  const { name, phone, addressLine1, addressLine2, city, state, zipCode, isDefault } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // If the new address is default, unset any existing default
    if (isDefault) {
      user.addresses.forEach(address => {
        address.isDefault = false;
      });
    }
    
    // If this is the first address, make it default regardless
    const setDefault = isDefault || user.addresses.length === 0;
    
    // Create new address
    const newAddress = {
      name,
      phone,
      addressLine1,
      addressLine2: addressLine2 || '',
      city,
      state,
      zipCode,
      isDefault: setDefault
    };
    
    user.addresses.push(newAddress);
    await user.save();
    
    res.status(201).json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Update an address
const updateUserAddress = async (req, res) => {
  const { addressId } = req.params;
  const { name, phone, addressLine1, addressLine2, city, state, zipCode, isDefault } = req.body;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the address to update
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // If making this address default, update others
    if (isDefault && !address.isDefault) {
      user.addresses.forEach(addr => {
        addr.isDefault = false;
      });
    }
    
    // Update address fields
    address.name = name;
    address.phone = phone;
    address.addressLine1 = addressLine1;
    address.addressLine2 = addressLine2 || '';
    address.city = city;
    address.state = state;
    address.zipCode = zipCode;
    address.isDefault = isDefault;
    
    await user.save();
    
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete an address
const deleteUserAddress = async (req, res) => {
  const { addressId } = req.params;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the address to remove
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Check if we're removing a default address
    const wasDefault = address.isDefault;
    
    // Remove the address
    address.remove();
    
    // If we removed the default address and there are other addresses, make one default
    if (wasDefault && user.addresses.length > 0) {
      user.addresses[0].isDefault = true;
    }
    
    await user.save();
    
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Set an address as default
const setDefaultAddress = async (req, res) => {
  const { addressId } = req.params;
  
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }
    
    // Find the address to set as default
    const address = user.addresses.id(addressId);
    if (!address) {
      return res.status(404).json({ message: 'Address not found' });
    }
    
    // Update all addresses to not be default
    user.addresses.forEach(addr => {
      addr.isDefault = false;
    });
    
    // Set the specified address as default
    address.isDefault = true;
    
    await user.save();
    
    res.json(user.addresses);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createGuestToken = async (req, res) => {
  try {
    // Generate a unique guest ID
    const guestId = `guest-${Date.now()}-${crypto.randomBytes(8).toString('hex')}`;
    
    // Create a JWT token with minimal information and appropriate expiration
    const token = jwt.sign(
      { 
        id: guestId,
        role: 'customer',
        isGuest: true 
      }, 
      process.env.JWT_SECRET, 
      { expiresIn: '48h' }
    );
    
    // Optional: Log basic analytics without storing user data
    console.log(`Guest token generated: ${guestId} from IP: ${req.ip}`);
    
    // Return minimal info needed for guest experience
    return res.status(200).json({
      token,
      role: 'customer',
      name: 'Guest User',
      email: 'guest@example.com',
    });
  } catch (error) {
    console.error('Guest token error:', error);
    return res.status(500).json({ message: 'Failed to generate guest token' });
  }
};

// Add these to the exports
module.exports = { 
  registerUser, 
  loginUser, 
  logoutUser, 
  getUserProfile,
  getUserAddresses,
  addUserAddress,
  updateUserAddress,
  deleteUserAddress,
  setDefaultAddress,
  createGuestToken
};
