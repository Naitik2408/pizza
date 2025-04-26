import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { RootState } from '../store';

// Define types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  size: string;
  foodType: string;
  customizations?: Record<string, { name: string; price: number }>;
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
  discount: Discount | null;
  discountAmount: number;
}

const initialState: CartState = {
  items: [],
  deliveryFee: 2.99,
  taxRate: 0.07, // 7% tax
  discount: null,
  discountAmount: 0
};

// Function to calculate discount amount based on cart state
const calculateDiscountAmount = (state: CartState): number => {
  if (!state.discount) return 0;
  
  const subtotal = state.items.reduce((total, item) => {
    let itemTotal = item.price * item.quantity;
    
    if (item.customizations) {
      Object.values(item.customizations).forEach(option => {
        itemTotal += option.price * item.quantity;
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

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart: (state, action: PayloadAction<CartItem>) => {
      const newItem = action.payload;
      
      // Check if the item already exists with the same customizations and size
      const existingItemIndex = state.items.findIndex(
        item => 
          item.id === newItem.id && 
          item.size === newItem.size && 
          JSON.stringify(item.customizations) === JSON.stringify(newItem.customizations)
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
    },
    
    clearCart: (state) => {
      state.items = [];
      state.discount = null;
      state.discountAmount = 0;
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
    },

    removeDiscount: (state) => {
      state.discount = null;
      state.discountAmount = 0;
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
  removeDiscount
} = cartSlice.actions;

// Export selectors
export const selectCartItems = (state: { cart: CartState }) => state.cart.items;
export const selectCartItemCount = (state: { cart: CartState }) => 
  state.cart.items.reduce((total, item) => total + item.quantity, 0);
export const selectSubtotal = (state: { cart: CartState }) => 
  state.cart.items.reduce((total, item) => {
    let itemTotal = item.price * item.quantity;
    
    // Add customization prices
    if (item.customizations) {
      Object.values(item.customizations).forEach(option => {
        itemTotal += option.price * item.quantity;
      });
    }
    
    return total + itemTotal;
  }, 0);
export const selectDeliveryFee = (state: { cart: CartState }) => 
  state.cart.items.length > 0 ? state.cart.deliveryFee : 0;
export const selectTaxAmount = (state: { cart: CartState }) => {
  const subtotal = selectSubtotal({ cart: state.cart });
  return subtotal * state.cart.taxRate;
};
export const selectTotal = (state: { cart: CartState }) => {
  const subtotal = selectSubtotal({ cart: state.cart });
  const deliveryFee = selectDeliveryFee({ cart: state.cart });
  const tax = selectTaxAmount({ cart: state.cart });
  const discountAmount = state.cart.discountAmount || 0;
  
  // Calculate total but prevent it from going negative
  const calculatedTotal = subtotal + deliveryFee + tax - discountAmount;
  return Math.max(0, calculatedTotal); // Ensure total is never negative
};

export default cartSlice.reducer;