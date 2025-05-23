import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

// SizePricing interface for add-ons with size-specific pricing
interface SizePricing {
  size: string;
  price: number;
}

// Selected add-on interface
interface SelectedAddOn {
  id: string;
  name: string;
  price: number;
  hasSizeSpecificPricing?: boolean;
  sizePricing?: SizePricing[];
}

// Define types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  size: string;
  foodType: string;
  // Legacy customizations field
  customizations?: Record<string, { name: string; price: number }>;
  // New add-ons field
  addOns?: SelectedAddOn[];
}

interface Discount {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  amount: number;
  minOrderValue?: number; // Add minimum order value to discount
}

interface CartState {
  items: CartItem[];
  deliveryFee: number;
  taxRate: number;
  taxAmount: number; // Add explicit taxAmount field for dynamic tax calculation
  discount: Discount | null;
  discountAmount: number;
  total: number; // Add explicit total field for easy access
}

const initialState: CartState = {
  items: [],
  deliveryFee: 40, // Default delivery fee in INR
  taxRate: 0.05, // 5% tax
  taxAmount: 0,
  discount: null,
  discountAmount: 0,
  total: 0
};

// Function to calculate discount amount based on cart state
const calculateDiscountAmount = (state: CartState): number => {
  if (!state.discount) return 0;
  
  const subtotal = state.items.reduce((total, item) => {
    let itemTotal = item.price * item.quantity;
    
    // Include legacy customizations price
    if (item.customizations) {
      Object.values(item.customizations).forEach(option => {
        itemTotal += option.price * item.quantity;
      });
    }
    
    // Include new add-ons price
    if (item.addOns && item.addOns.length > 0) {
      item.addOns.forEach(addOn => {
        itemTotal += addOn.price * item.quantity;
      });
    }
    
    return total + itemTotal;
  }, 0);
  
  // Check if cart meets minimum order requirement
  if (state.discount.minOrderValue && subtotal < state.discount.minOrderValue) {
    return 0;
  }
  
  let discountAmount = 0;
  
  if (state.discount.type === 'percentage') {
    discountAmount = (subtotal * state.discount.value) / 100;
  } else {
    discountAmount = state.discount.value;
  }
  
  // Ensure discount isn't more than subtotal
  if (discountAmount > subtotal) {
    discountAmount = subtotal;
  }
  
  return Math.round(discountAmount * 100) / 100; // Round to 2 decimal places
};

// Function to calculate total for internal state updates
const calculateTotal = (state: CartState): number => {
  const subtotal = state.items.reduce((total, item) => {
    let itemTotal = item.price * item.quantity;
    
    // Include legacy customizations price
    if (item.customizations) {
      Object.values(item.customizations).forEach(option => {
        itemTotal += option.price * item.quantity;
      });
    }
    
    // Include new add-ons price
    if (item.addOns && item.addOns.length > 0) {
      item.addOns.forEach(addOn => {
        itemTotal += addOn.price * item.quantity;
      });
    }
    
    return total + itemTotal;
  }, 0);
  
  // Calculate tax amount using current tax rate
  const taxAmount = subtotal * state.taxRate;
  
  // Get current discount amount
  const discountAmount = state.discountAmount || 0;
  
  // Calculate total but prevent it from going negative
  const calculatedTotal = subtotal + state.deliveryFee + taxAmount - discountAmount;
  return Math.max(0, calculatedTotal); // Ensure total is never negative
};

// Helper function to check if two arrays of add-ons are the same
const areAddOnsEqual = (addOns1?: SelectedAddOn[], addOns2?: SelectedAddOn[]): boolean => {
  // If both are undefined or empty, they're equal
  if ((!addOns1 || addOns1.length === 0) && (!addOns2 || addOns2.length === 0)) {
    return true;
  }
  
  // If one is defined but the other isn't, or they have different lengths, they're not equal
  if ((!addOns1 && addOns2) || (addOns1 && !addOns2) || (addOns1?.length !== addOns2?.length)) {
    return false;
  }
  
  // At this point, both are defined and have the same length
  // Sort both arrays by ID to ensure consistent comparison
  const sorted1 = [...(addOns1 || [])].sort((a, b) => a.id.localeCompare(b.id));
  const sorted2 = [...(addOns2 || [])].sort((a, b) => a.id.localeCompare(b.id));
  
  // Compare each add-on
  return sorted1.every((addOn, index) => {
    const otherAddOn = sorted2[index];
    return addOn.id === otherAddOn.id && addOn.price === otherAddOn.price;
  });
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const newItem = action.payload;
      
      // Check if the item already exists with the same customizations, add-ons, and size
      const existingItemIndex = state.items.findIndex(
        item => 
          item.id === newItem.id && 
          item.size === newItem.size && 
          JSON.stringify(item.customizations) === JSON.stringify(newItem.customizations) &&
          areAddOnsEqual(item.addOns, newItem.addOns)
      );

      if (existingItemIndex >= 0) {
        // If item exists, update quantity
        state.items[existingItemIndex].quantity += newItem.quantity;
      } else {
        // Otherwise add new item
        state.items.push(newItem);
      }
      
      // Recalculate discount amount whenever the cart changes
      if (state.discount) {
        state.discountAmount = calculateDiscountAmount(state);
      }
      
      // Update tax amount based on current subtotal
      const subtotal = selectSubtotal({ cart: state });
      state.taxAmount = subtotal * state.taxRate;
      
      // Update total
      state.total = calculateTotal(state);
    },
    
    updateQuantity: (state, action: PayloadAction<{ id: string; quantity: number }>) => {
      const { id, quantity } = action.payload;
      const itemIndex = state.items.findIndex(item => item.id === id);
      
      if (itemIndex >= 0) {
        if (quantity <= 0) {
          // Remove item if quantity is 0 or less
          state.items.splice(itemIndex, 1);
        } else {
          // Update quantity
          state.items[itemIndex].quantity = quantity;
        }
        
        // Recalculate discount amount whenever the cart changes
        if (state.discount) {
          state.discountAmount = calculateDiscountAmount(state);
          
          // If cart no longer meets minimum order requirement, remove discount
          if (state.discountAmount === 0 && state.discount.minOrderValue) {
            state.discount = null;
          }
        }
        
        // Update tax amount based on current subtotal
        const subtotal = selectSubtotal({ cart: state });
        state.taxAmount = subtotal * state.taxRate;
        
        // Update total
        state.total = calculateTotal(state);
      }
    },
    
    removeFromCart: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.items = state.items.filter(item => item.id !== id);
      
      // Recalculate discount amount whenever the cart changes
      if (state.discount) {
        state.discountAmount = calculateDiscountAmount(state);
        
        // If cart no longer meets minimum order requirement, remove discount
        if (state.discountAmount === 0 && state.discount.minOrderValue) {
          state.discount = null;
        }
      }
      
      // Update tax amount based on current subtotal
      const subtotal = selectSubtotal({ cart: state });
      state.taxAmount = subtotal * state.taxRate;
      
      // Update total
      state.total = calculateTotal(state);
    },
    
    clearCart: (state) => {
      state.items = [];
      state.discount = null;
      state.discountAmount = 0;
      state.taxAmount = 0;
      state.total = 0;
    },
    
    // New discount actions
    applyDiscount: (state, action: PayloadAction<Discount>) => {
      state.discount = action.payload;
      
      // Save minimum order value with the discount
      if (action.payload.amount > 0) {
        state.discountAmount = action.payload.amount;
      } else {
        // Calculate discount if amount is not provided
        state.discountAmount = calculateDiscountAmount(state);
      }
      
      // Update total
      state.total = calculateTotal(state);
    },

    removeDiscount: (state) => {
      state.discount = null;
      state.discountAmount = 0;
      
      // Update total
      state.total = calculateTotal(state);
    },
    
    // Add the missing updateTaxAndDelivery action
    updateTaxAndDelivery: (state, action: PayloadAction<{ taxPercentage: number, deliveryFee: number }>) => {
      const { taxPercentage, deliveryFee } = action.payload;
      
      // Update tax rate (convert percentage to decimal)
      state.taxRate = taxPercentage / 100;
      
      // Update delivery fee
      state.deliveryFee = deliveryFee;
      
      // Recalculate tax amount with new rate
      const subtotal = selectSubtotal({ cart: state });
      state.taxAmount = subtotal * state.taxRate;
      
      // Update total with new tax and delivery values
      state.total = calculateTotal(state);
    }
  }
});

// Export actions
export const { 
  addToCart, 
  updateQuantity, 
  removeFromCart, 
  clearCart,
  applyDiscount,
  removeDiscount,
  updateTaxAndDelivery // Export the new action
} = cartSlice.actions;

// Export selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartItemCount = (state: { cart: CartState }) => 
  state.cart.items.reduce((total, item) => total + item.quantity, 0);
export const selectSubtotal = (state: { cart: CartState }) => 
  state.cart.items.reduce((total, item) => {
    let itemTotal = item.price * item.quantity;
    
    // Add legacy customization prices
    if (item.customizations) {
      Object.values(item.customizations).forEach(option => {
        itemTotal += option.price * item.quantity;
      });
    }
    
    // Add new add-on prices
    if (item.addOns && item.addOns.length > 0) {
      item.addOns.forEach(addOn => {
        itemTotal += addOn.price * item.quantity;
      });
    }
    
    return total + itemTotal;
  }, 0);
export const selectDeliveryFee = (state: { cart: CartState }) => 
  state.cart.items.length > 0 ? state.cart.deliveryFee : 0;
export const selectTaxAmount = (state: { cart: CartState }) => {
  // Use the stored tax amount if available, otherwise calculate it
  if (state.cart.items.length > 0) {
    return state.cart.taxAmount || (selectSubtotal({ cart: state.cart }) * state.cart.taxRate);
  }
  return 0;
};
export const selectTotal = (state: { cart: CartState }) => {
  // Use the stored total if available, otherwise calculate it
  if (state.cart.items.length > 0) {
    return state.cart.total || calculateTotal(state.cart);
  }
  return 0;
};

export default cartSlice.reducer;