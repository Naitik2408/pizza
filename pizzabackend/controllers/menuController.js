const MenuItem = require('../models/MenuItem');

// Fetch all menu items
const getMenuItems = async (req, res) => {
  try {
    const { category, foodType, size } = req.query; // Added size filtering
    
    // Build the query object
    const query = {};
    
    if (category && category !== 'All') {
      query.category = category;
    }
    
    if (foodType && foodType !== 'All') {
      query.foodType = foodType;
    }
    
    // Filter by size if specified
    if (size && size !== 'All') {
      query.$or = [
        // Match items with this size in size variations
        { 'sizeVariations.size': size },
        // Or match single-size items with this size
        { size: size, hasMultipleSizes: false }
      ];
    }
    
    const menuItems = await MenuItem.find(query);
    res.json(menuItems);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a new menu item
const addMenuItem = async (req, res) => {
  const { 
    name, description, price, category, image,
    available, popular, foodType, size, 
    sizeVariations, rating 
  } = req.body;

  try {
    const newMenuItem = new MenuItem({
      name,
      description,
      price, // Base price
      category,
      image,
      available,
      popular,
      foodType,
      size: size || 'Medium', // Default size
      rating: rating || 0,
      // Add size variations if provided
      sizeVariations: sizeVariations || []
    });

    const savedMenuItem = await newMenuItem.save();
    res.status(201).json(savedMenuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Edit a menu item
const editMenuItem = async (req, res) => {
  const { id } = req.params;
  const { 
    name, description, price, category, image,
    available, popular, foodType, size,
    sizeVariations, rating 
  } = req.body;

  try {
    // Prepare update object
    const updateData = {
      name, description, price, category, image,
      available, popular, foodType, size, rating
    };
    
    // Add size variations if provided
    if (sizeVariations) {
      updateData.sizeVariations = sizeVariations;
    }
    
    const updatedMenuItem = await MenuItem.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );

    if (!updatedMenuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json(updatedMenuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Delete a menu item
const deleteMenuItem = async (req, res) => {
  const { id } = req.params;

  try {
    const deletedMenuItem = await MenuItem.findByIdAndDelete(id);

    if (!deletedMenuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    res.json({ message: 'Menu item deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Toggle availability for the entire item
const toggleAvailability = async (req, res) => {
  const { id } = req.params;

  try {
    const menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    menuItem.available = !menuItem.available;
    await menuItem.save();

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// NEW: Toggle availability for a specific size
const toggleSizeAvailability = async (req, res) => {
  const { id } = req.params;
  const { size } = req.body;

  try {
    const menuItem = await MenuItem.findById(id);

    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }

    if (!size) {
      return res.status(400).json({ message: 'Size is required' });
    }

    if (!menuItem.hasMultipleSizes) {
      return res.status(400).json({ message: 'This item does not have multiple sizes' });
    }

    // Find the size variation
    const sizeIndex = menuItem.sizeVariations.findIndex(
      variation => variation.size === size
    );

    if (sizeIndex === -1) {
      return res.status(404).json({ message: 'Size not found for this item' });
    }

    // Toggle the availability
    menuItem.sizeVariations[sizeIndex].available = !menuItem.sizeVariations[sizeIndex].available;
    await menuItem.save();

    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Rate a menu item
const rateMenuItem = async (req, res) => {
  const { id } = req.params;
  const { rating } = req.body;

  try {
    const menuItem = await MenuItem.findById(id);
    
    if (!menuItem) {
      return res.status(404).json({ message: 'Menu item not found' });
    }
    
    // Calculate new average rating
    const newRatingCount = menuItem.ratingCount + 1;
    const newRating = ((menuItem.rating * menuItem.ratingCount) + rating) / newRatingCount;
    
    // Update with new rating
    menuItem.rating = parseFloat(newRating.toFixed(1)); // Round to 1 decimal place
    menuItem.ratingCount = newRatingCount;
    
    await menuItem.save();
    
    res.json(menuItem);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getMenuItems,
  addMenuItem,
  editMenuItem,
  deleteMenuItem,
  toggleAvailability,
  toggleSizeAvailability, // New function
  rateMenuItem,
};