import React, { useRef, useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';

// =============================================================================
// PERFORMANCE MONITORING HOOKS
// =============================================================================

/**
 * Hook to monitor component re-renders in development
 * Helps identify performance bottlenecks
 */
export const useRenderCounter = (componentName: string) => {
  const renderCount = useRef(0);
  
  useEffect(() => {
    renderCount.current += 1;
    if (__DEV__) {
      console.log(`🔄 ${componentName} rendered ${renderCount.current} times`);
    }
  });
  
  return renderCount.current;
};

/**
 * Hook to track prop changes that cause re-renders
 */
export const useWhyDidYouUpdate = (name: string, props: Record<string, any>) => {
  const previousProps = useRef<Record<string, any> | undefined>(undefined);
  
  useEffect(() => {
    if (previousProps.current && __DEV__) {
      const allKeys = Object.keys({ ...previousProps.current, ...props });
      const changedProps: Record<string, { from: any; to: any }> = {};
      
      allKeys.forEach((key) => {
        if (previousProps.current![key] !== props[key]) {
          changedProps[key] = {
            from: previousProps.current![key],
            to: props[key],
          };
        }
      });
      
      if (Object.keys(changedProps).length) {
        console.log('🔍 Props changed for', name, changedProps);
      }
    }
    
    previousProps.current = props;
  });
};

// =============================================================================
// OPTIMIZED REDUX HOOKS
// =============================================================================

/**
 * Optimized auth selector hook that prevents unnecessary re-renders
 * Only re-renders when specific auth fields change
 */
export const useAuthUser = () => {
  return useSelector((state: RootState) => ({
    name: state.auth.name,
    email: state.auth.email,
    role: state.auth.role,
    isGuest: state.auth.isGuest,
  }), (left, right) => 
    left.name === right.name &&
    left.email === right.email &&
    left.role === right.role &&
    left.isGuest === right.isGuest
  );
};

/**
 * Optimized cart summary hook for checkout components
 */
export const useCartSummary = () => {
  return useSelector((state: RootState) => {
    const items = state.cart.items;
    const itemCount = items.reduce((total, item) => total + item.quantity, 0);
    
    if (itemCount === 0) {
      return {
        subtotal: 0,
        deliveryFee: 0,
        taxAmount: 0,
        total: 0,
        itemCount: 0,
        discountAmount: 0,
        isEmpty: true
      };
    }
    
    return {
      subtotal: state.cart.total || 0, // Use pre-computed total from store
      deliveryFee: state.cart.deliveryFee,
      taxAmount: state.cart.taxAmount,
      total: state.cart.total,
      itemCount,
      discountAmount: state.cart.discountAmount,
      isEmpty: false
    };
  }, (left, right) =>
    left.subtotal === right.subtotal &&
    left.deliveryFee === right.deliveryFee &&
    left.taxAmount === right.taxAmount &&
    left.total === right.total &&
    left.itemCount === right.itemCount &&
    left.discountAmount === right.discountAmount &&
    left.isEmpty === right.isEmpty
  );
};

/**
 * Lightweight cart status hook that only tracks essential cart state
 */
export const useCartStatus = () => {
  return useSelector((state: RootState) => ({
    itemCount: state.cart.items.reduce((total, item) => total + item.quantity, 0),
    isEmpty: state.cart.items.length === 0,
    hasDiscount: !!state.cart.discount,
  }), (left, right) =>
    left.itemCount === right.itemCount &&
    left.isEmpty === right.isEmpty &&
    left.hasDiscount === right.hasDiscount
  );
};

/**
 * Auth status hook that only tracks authentication state
 */
export const useAuthStatus = () => {
  return useSelector((state: RootState) => ({
    isAuthenticated: !!state.auth.token,
    role: state.auth.role,
    isGuest: state.auth.isGuest,
  }), (left, right) =>
    left.isAuthenticated === right.isAuthenticated &&
    left.role === right.role &&
    left.isGuest === right.isGuest
  );
};

// =============================================================================
// MEMOIZATION HELPERS
// =============================================================================

/**
 * Creates a stable reference for callback functions to prevent re-renders
 */
export const useStableCallback = <T extends (...args: any[]) => any>(
  callback: T,
  deps: React.DependencyList
): T => {
  const callbackRef = useRef<T>(callback);
  const stableCallback = useRef<T | undefined>(undefined);
  
  useEffect(() => {
    callbackRef.current = callback;
  }, deps);
  
  if (!stableCallback.current) {
    stableCallback.current = ((...args: any[]) => 
      callbackRef.current(...args)
    ) as T;
  }
  
  return stableCallback.current;
};

/**
 * Debounced selector hook to prevent excessive re-renders
 */
export const useDebouncedSelector = <T>(
  selector: (state: RootState) => T,
  delay: number = 100
): T => {
  const [debouncedValue, setDebouncedValue] = useState<T>();
  const currentValue = useSelector(selector);
  
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedValue(currentValue);
    }, delay);
    
    return () => clearTimeout(timer);
  }, [currentValue, delay]);
  
  return debouncedValue ?? currentValue;
};

// =============================================================================
// PERFORMANCE OPTIMIZATION HOOKS
// =============================================================================

/**
 * Hook to check if component should skip render based on props
 */
export const useShouldSkipRender = (
  currentProps: Record<string, any>,
  skipKeys: string[] = []
) => {
  const previousProps = useRef(currentProps);
  
  const shouldSkip = Object.keys(currentProps).every(key => {
    if (skipKeys.includes(key)) return true;
    return previousProps.current[key] === currentProps[key];
  });
  
  previousProps.current = currentProps;
  return shouldSkip;
};

// =============================================================================
// IMPORTS FOR HOOKS THAT NEED THEM
// =============================================================================
