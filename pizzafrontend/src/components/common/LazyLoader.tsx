import React, { Suspense, lazy, memo, useCallback } from 'react';
import { View, ActivityIndicator, Text, StyleSheet } from 'react-native';
import ErrorBoundary from './ErrorBoundary';
import LoadingScreen from './LoadingScreen';

// =============================================================================
// BUNDLE SPLITTING UTILITIES
// =============================================================================

/**
 * Enhanced lazy loading with error boundaries and loading states
 */
function createLazyComponent<P = {}>(
  importFunc: () => Promise<{ default: React.ComponentType<P> }>,
  fallback?: React.ComponentType<any>
) {
  const LazyComponent = lazy(importFunc);
  
  const WrappedComponent = (props: P) => (
    <ErrorBoundary>
      <Suspense fallback={fallback ? React.createElement(fallback) : <LoadingScreen />}>
        <LazyComponent {...(props as any)} />
      </Suspense>
    </ErrorBoundary>
  );
  
  WrappedComponent.displayName = `LazyComponent`;
  return memo(WrappedComponent);
}

/**
 * Feature-based bundle splitting loader
 */
const FeatureLoader = memo(({ 
  feature, 
  children, 
  fallback 
}: {
  feature: string;
  children: React.ReactNode;
  fallback?: React.ComponentType<any>;
}) => {
  const FallbackComponent = fallback || (() => (
    <View style={styles.featureLoading}>
      <ActivityIndicator size="large" color="#FF6B00" />
      <Text style={styles.loadingText}>Loading {feature}...</Text>
    </View>
  ));

  return (
    <ErrorBoundary>
      <Suspense fallback={<FallbackComponent />}>
        {children}
      </Suspense>
    </ErrorBoundary>
  );
});

// =============================================================================
// CONDITIONAL LOADING HOOKS
// =============================================================================

/**
 * Hook to conditionally load components based on user role
 */
const useRoleBasedLoader = (userRole: string | null) => {
  const loadAdminComponents = useCallback(() => {
    if (userRole === 'admin') {
      // Preload admin components will be handled by route-based code splitting
      console.log('Preloading admin components for better UX');
    }
  }, [userRole]);

  const loadDeliveryComponents = useCallback(() => {
    if (userRole === 'delivery') {
      // Preload delivery components will be handled by route-based code splitting
      console.log('Preloading delivery components for better UX');
    }
  }, [userRole]);

  const loadCustomerComponents = useCallback(() => {
    if (userRole === 'customer' || !userRole) {
      // Preload customer components will be handled by route-based code splitting
      console.log('Preloading customer components for better UX');
    }
  }, [userRole]);

  return {
    loadAdminComponents,
    loadDeliveryComponents,
    loadCustomerComponents,
  };
};

// =============================================================================
// PERFORMANCE OPTIMIZATION UTILITIES
// =============================================================================

/**
 * Preload component for better perceived performance
 */
const preloadComponent = (
  importFunc: () => Promise<{ default: React.ComponentType<any> }>
) => {
  return importFunc();
};

/**
 * Component cache for frequently used components
 */
const componentCache = new Map();

const getCachedComponent = (
  key: string,
  importFunc: () => Promise<{ default: React.ComponentType<any> }>
) => {
  if (componentCache.has(key)) {
    return componentCache.get(key);
  }
  
  const component = createLazyComponent(importFunc);
  componentCache.set(key, component);
  return component;
};

// =============================================================================
// ROUTE-BASED LAZY LOADING
// =============================================================================

const createRouteLoader = (routeName: string) => {
  return memo(({ children }: { children: React.ReactNode }) => (
    <FeatureLoader feature={routeName}>
      {children}
    </FeatureLoader>
  ));
};

// Route loaders for major sections
const AdminRouteLoader = createRouteLoader('Admin Panel');
const DeliveryRouteLoader = createRouteLoader('Delivery Dashboard');
const CustomerRouteLoader = createRouteLoader('Customer App');

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  featureLoading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export {
  createLazyComponent,
  FeatureLoader,
  useRoleBasedLoader,
  preloadComponent,
  getCachedComponent,
  createRouteLoader,
  AdminRouteLoader,
  DeliveryRouteLoader,
  CustomerRouteLoader,
};
