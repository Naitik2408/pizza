const mongoose = require('mongoose');

// Define a schema for size variations
const sizeVariationSchema = new mongoose.Schema({
  size: {
    type: String,
    enum: ['Small', 'Medium', 'Large', 'Not Applicable'],
    required: true
  },
  price: {
    type: Number,
    required: true
  },
  available: {
    type: Boolean,
    default: true
  }
}, { _id: false });

const menuItemSchema = mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    // Base price (for backward compatibility)
    price: {
      type: Number,
      required: true,
    },
    category: {
      type: String,
      enum: [
        'Pizza', 
        'Burger', 
        'Grilled Sandwich', 
        'Special Combo', 
        'Pasta', 
        'Noodles', 
        'Snacks', 
        'Milkshake', 
        'Cold Drink', 
        'Rice Item', 
        'Sweets',
        'Sides'
      ],
      required: true,
    },
    image: {
      type: String,
      required: true,
    },
    available: {
      type: Boolean,
      default: true,
    },
    popular: {
      type: Boolean,
      default: false,
    },
    foodType: {
      type: String,
      enum: ['Veg', 'Non-Veg', 'Not Applicable'],
      default: 'Not Applicable',
      required: true,
    },
    isVeg: {
      type: Boolean,
      default: false,
    },
    rating: {
      type: Number,
      min: 0,
      max: 5,
      default: 0,
    },
    // Original size field (for backward compatibility)
    size: {
      type: String,
      enum: ['Small', 'Medium', 'Large', 'Not Applicable'],
      default: 'Medium',
    },
    // New field for multiple sizes with different prices
    sizeVariations: {
      type: [sizeVariationSchema],
      default: [],
    },
    ratingCount: {
      type: Number,
      default: 0,
    },
    // Flag to indicate if this item has multiple sizes
    hasMultipleSizes: {
      type: Boolean,
      default: false
    }
  },
  { timestamps: true }
);

// Pre-save hook to update hasMultipleSizes flag
menuItemSchema.pre('save', function(next) {
  // Set hasMultipleSizes based on whether sizeVariations array has items
  this.hasMultipleSizes = this.sizeVariations && this.sizeVariations.length > 0;
  
  // Keep isVeg in sync with foodType
  this.isVeg = this.foodType === 'Veg';
  
  next();
});

// Virtual getter for backward compatibility
menuItemSchema.virtual('isVegItem').get(function() {
  return this.foodType === 'Veg';
});

module.exports = mongoose.model('MenuItem', menuItemSchema);