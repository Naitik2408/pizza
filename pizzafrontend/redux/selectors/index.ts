import { createSelector } from '@reduxjs/toolkit';
import { RootState } from '../store';

// =============================================================================
// AUTH SELECTORS - Memoized for performance
// =============================================================================

export const selectAuth = (state: RootState) => state.auth;

export const selectAuthToken = createSelector(
  [selectAuth],
  (auth) => auth.token
);

export const selectUserRole = createSelector(
  [selectAuth],
  (auth) => auth.role
);

export const selectUserName = createSelector(
  [selectAuth],
  (auth) => auth.name
);

export const selectUserEmail = createSelector(
  [selectAuth],
  (auth) => auth.email
);

export const selectIsAuthenticated = createSelector(
  [selectAuth],
  (auth) => !!auth.token
);

export const selectIsGuest = createSelector(
  [selectAuth],
  (auth) => auth.isGuest
);

export const selectUserId = createSelector(
  [selectAuth],
  (auth) => auth.userId
);

// Combined selectors for common use cases
export const selectUserInfo = createSelector(
  [selectUserName, selectUserEmail, selectUserRole],
  (name, email, role) => ({ name, email, role })
);

export const selectAuthState = createSelector(
  [selectAuthToken, selectUserRole, selectIsAuthenticated, selectIsGuest],
  (token, role, isAuthenticated, isGuest) => ({
    token,
    role,
    isAuthenticated,
    isGuest
  })
);

// =============================================================================
// CART SELECTORS - Optimized for frequent updates
// =============================================================================

export const selectCart = (state: RootState) => state.cart;

export const selectCartItems = createSelector(
  [selectCart],
  (cart) => cart.items
);

export const selectCartItemCount = createSelector(
  [selectCartItems],
  (items) => items.reduce((total, item) => total + item.quantity, 0)
);

export const selectCartIsEmpty = createSelector(
  [selectCartItems],
  (items) => items.length === 0
);

export const selectCartSubtotal = createSelector(
  [selectCartItems],
  (items) => {
    return items.reduce((total, item) => {
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
  }
);

export const selectCartDeliveryFee = createSelector(
  [selectCart, selectCartIsEmpty],
  (cart, isEmpty) => isEmpty ? 0 : cart.deliveryFee
);

export const selectCartTaxAmount = createSelector(
  [selectCart, selectCartSubtotal, selectCartIsEmpty],
  (cart, subtotal, isEmpty) => {
    if (isEmpty) return 0;
    return cart.taxAmount || (subtotal * cart.taxRate);
  }
);

export const selectCartDiscount = createSelector(
  [selectCart],
  (cart) => ({
    discount: cart.discount,
    discountAmount: cart.discountAmount
  })
);

export const selectCartTotal = createSelector(
  [selectCartSubtotal, selectCartDeliveryFee, selectCartTaxAmount, selectCart],
  (subtotal, deliveryFee, taxAmount, cart) => {
    if (cart.items.length === 0) return 0;
    return cart.total || (subtotal + deliveryFee + taxAmount - cart.discountAmount);
  }
);

// Cart summary selector for checkout components
export const selectCartSummary = createSelector(
  [
    selectCartSubtotal,
    selectCartDeliveryFee,
    selectCartTaxAmount,
    selectCartTotal,
    selectCartDiscount,
    selectCartItemCount
  ],
  (subtotal, deliveryFee, taxAmount, total, discount, itemCount) => ({
    subtotal,
    deliveryFee,
    taxAmount,
    total,
    discount: discount.discount,
    discountAmount: discount.discountAmount,
    itemCount
  })
);

// =============================================================================
// PERFORMANCE SELECTORS - For expensive operations
// =============================================================================

// Memoized selector for cart items by category
export const selectCartItemsByCategory = createSelector(
  [selectCartItems],
  (items) => {
    return items.reduce((acc, item) => {
      const category = item.foodType || 'Other'; // Use foodType as category
      if (!acc[category]) {
        acc[category] = [];
      }
      acc[category].push(item);
      return acc;
    }, {} as Record<string, typeof items>);
  }
);

// Memoized selector for unique item IDs in cart
export const selectCartItemIds = createSelector(
  [selectCartItems],
  (items) => new Set(items.map(item => item.id))
);

// Helper to check if specific item is in cart
export const makeSelectIsItemInCart = () =>
  createSelector(
    [selectCartItemIds, (_: RootState, itemId: string) => itemId],
    (itemIds, itemId) => itemIds.has(itemId)
  );

// =============================================================================
// ROLE-BASED SELECTORS
// =============================================================================

export const selectIsAdmin = createSelector(
  [selectUserRole],
  (role) => role === 'admin'
);

export const selectIsDelivery = createSelector(
  [selectUserRole],
  (role) => role === 'delivery'
);

export const selectIsCustomer = createSelector(
  [selectUserRole],
  (role) => role === 'customer' || role === null
);

// =============================================================================
// EXPORT ALL SELECTORS
// =============================================================================

// Note: selectAuth and selectCart are defined above, not imported from cartSlice
