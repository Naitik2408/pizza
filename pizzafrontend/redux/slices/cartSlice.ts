import { createSlice, PayloadAction } from '@reduxjs/toolkit';

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

interface CartState {
  items: CartItem[];
  deliveryFee: number;
  taxRate: number;
}

const initialState: CartState = {
  items: [],
  deliveryFee: 2.99,
  taxRate: 0.07, // 7% tax
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
      }
    },
    
    removeFromCart: (state, action: PayloadAction<string>) => {
      const id = action.payload;
      state.items = state.items.filter(item => item.id !== id);
    },
    
    clearCart: (state) => {
      state.items = [];
    }
  }
});

// Export actions
export const { addToCart, updateQuantity, removeFromCart, clearCart } = cartSlice.actions;

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
  
  return subtotal + deliveryFee + tax;
};

export default cartSlice.reducer;