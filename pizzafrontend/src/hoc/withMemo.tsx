import React, { ComponentType, memo, forwardRef } from 'react';

// =============================================================================
// HIGHER-ORDER COMPONENTS FOR PERFORMANCE
// =============================================================================

/**
 * Generic memoization HOC with custom comparison
 */
export function withMemo<P extends object>(
  Component: ComponentType<P>,
  propsAreEqual?: (prevProps: P, nextProps: P) => boolean
) {
  const MemoizedComponent = memo(Component, propsAreEqual);
  MemoizedComponent.displayName = `withMemo(${Component.displayName || Component.name})`;
  return MemoizedComponent;
}

/**
 * Deep memoization for complex props
 */
export function withDeepMemo<P extends object>(
  Component: ComponentType<P>
) {
  const deepEqual = (prevProps: P, nextProps: P): boolean => {
    return JSON.stringify(prevProps) === JSON.stringify(nextProps);
  };
  
  return withMemo(Component, deepEqual);
}

/**
 * Shallow comparison memoization (default memo behavior but explicit)
 */
export function withShallowMemo<P extends object>(
  Component: ComponentType<P>
) {
  const shallowEqual = (prevProps: P, nextProps: P): boolean => {
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    return prevKeys.every(key => 
      (prevProps as any)[key] === (nextProps as any)[key]
    );
  };
  
  return withMemo(Component, shallowEqual);
}

/**
 * Memoization for components that only care about specific props
 */
export function withSelectiveMemo<P extends object>(
  Component: ComponentType<P>,
  watchedProps: (keyof P)[]
) {
  const selectiveEqual = (prevProps: P, nextProps: P): boolean => {
    return watchedProps.every(prop => 
      prevProps[prop] === nextProps[prop]
    );
  };
  
  return withMemo(Component, selectiveEqual);
}

/**
 * Memoization for list item components
 */
export function withListItemMemo<P extends { id: string | number }>(
  Component: ComponentType<P>
) {
  const listItemEqual = (prevProps: P, nextProps: P): boolean => {
    // First check if it's the same item
    if (prevProps.id !== nextProps.id) {
      return false;
    }
    
    // Then do shallow comparison of other props
    const prevKeys = Object.keys(prevProps);
    const nextKeys = Object.keys(nextProps);
    
    if (prevKeys.length !== nextKeys.length) {
      return false;
    }
    
    return prevKeys.every(key => 
      (prevProps as any)[key] === (nextProps as any)[key]
    );
  };
  
  return withMemo(Component, listItemEqual);
}

/**
 * Performance monitoring HOC
 */
export function withPerformanceMonitoring<P extends object>(
  Component: ComponentType<P>,
  componentName?: string
) {
  const PerformanceMonitoredComponent = (props: P) => {
    const name = componentName || Component.displayName || Component.name;
    
    if (__DEV__) {
      const renderStartTime = performance.now();
      
      React.useEffect(() => {
        const renderEndTime = performance.now();
        const renderTime = renderEndTime - renderStartTime;
        
        if (renderTime > 16) { // Warn if render takes longer than one frame (16ms)
          console.warn(`⚡ Slow render detected in ${name}: ${renderTime.toFixed(2)}ms`);
        }
      });
    }
    
    return React.createElement(Component, props);
  };
  
  PerformanceMonitoredComponent.displayName = `withPerformanceMonitoring(${Component.displayName || Component.name})`;
  return PerformanceMonitoredComponent;
}

/**
 * HOC for components that should only render when visible
 */
export function withVisibilityOptimization<P extends object>(
  Component: ComponentType<P>
) {
  const VisibilityOptimizedComponent = (props: P) => {
    const [isVisible, setIsVisible] = React.useState(false);
    const elementRef = React.useRef<HTMLDivElement>(null);
    
    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          setIsVisible(entry.isIntersecting);
        },
        { threshold: 0.1 }
      );
      
      if (elementRef.current) {
        observer.observe(elementRef.current);
      }
      
      return () => observer.disconnect();
    }, []);
    
    if (!isVisible) {
      return React.createElement('div', { 
        ref: elementRef,
        style: { minHeight: '50px' } // Placeholder height
      });
    }
    
    return React.createElement('div', { ref: elementRef }, 
      React.createElement(Component, props)
    );
  };
  
  VisibilityOptimizedComponent.displayName = `withVisibilityOptimization(${Component.displayName || Component.name})`;
  return VisibilityOptimizedComponent;
}

// =============================================================================
// SPECIALIZED MEMOS FOR COMMON PATTERNS
// =============================================================================

/**
 * Memo for order/list item components
 */
export const OrderItemMemo = <P extends { id: string; status?: string }>(
  Component: ComponentType<P>
) => {
  return withMemo(Component, (prevProps, nextProps) => {
    // Re-render if ID or status changes
    if (prevProps.id !== nextProps.id || prevProps.status !== nextProps.status) {
      return false;
    }
    
    // Otherwise shallow compare
    return Object.keys(prevProps).every(key => 
      (prevProps as any)[key] === (nextProps as any)[key]
    );
  });
};

/**
 * Memo for menu item components
 */
export const MenuItemMemo = <P extends { id: string; price?: number; availability?: boolean }>(
  Component: ComponentType<P>
) => {
  return withMemo(Component, (prevProps, nextProps) => {
    // Re-render if price or availability changes
    if (
      prevProps.id !== nextProps.id ||
      prevProps.price !== nextProps.price ||
      prevProps.availability !== nextProps.availability
    ) {
      return false;
    }
    
    return Object.keys(prevProps).every(key => 
      (prevProps as any)[key] === (nextProps as any)[key]
    );
  });
};

/**
 * Memo for skeleton loading components (rarely need to re-render)
 */
export const SkeletonMemo = <P extends object>(Component: ComponentType<P>) => {
  return withMemo(Component, () => true); // Never re-render skeletons
};

// =============================================================================
// EXPORT ALL HOCS
// =============================================================================

export default {
  withMemo,
  withDeepMemo,
  withShallowMemo,
  withSelectiveMemo,
  withListItemMemo,
  withPerformanceMonitoring,
  withVisibilityOptimization,
  OrderItemMemo,
  MenuItemMemo,
  SkeletonMemo,
};
