import React, { memo, useMemo, useCallback } from 'react';
import { FlatList, View, StyleSheet, Dimensions } from 'react-native';
import type { FlatListProps, RefreshControlProps } from 'react-native';

// =============================================================================
// OPTIMIZED VIRTUAL LIST COMPONENT
// =============================================================================

interface VirtualListProps<T> {
  data: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  keyExtractor: (item: T, index: number) => string;
  itemHeight?: number;
  containerStyle?: any;
  contentContainerStyle?: any;
  onEndReached?: () => void;
  onEndReachedThreshold?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  ListHeaderComponent?: FlatListProps<T>['ListHeaderComponent'];
  ListFooterComponent?: FlatListProps<T>['ListFooterComponent'];
  ListEmptyComponent?: FlatListProps<T>['ListEmptyComponent'];
  horizontal?: boolean;
  numColumns?: number;
  initialNumToRender?: number;
  maxToRenderPerBatch?: number;
  windowSize?: number;
  removeClippedSubviews?: boolean;
  getItemLayout?: (data: ArrayLike<T> | null | undefined, index: number) => {
    length: number;
    offset: number;
    index: number;
  };
}

const { width: screenWidth } = Dimensions.get('window');

/**
 * Optimized Virtual List with performance enhancements
 */
function VirtualList<T>({
  data,
  renderItem,
  keyExtractor,
  itemHeight = 80,
  containerStyle,
  contentContainerStyle,
  onEndReached,
  onEndReachedThreshold = 0.5,
  refreshControl,
  ListHeaderComponent,
  ListFooterComponent,
  ListEmptyComponent,
  horizontal = false,
  numColumns = 1,
  initialNumToRender = 10,
  maxToRenderPerBatch = 5,
  windowSize = 10,
  removeClippedSubviews = true,
  getItemLayout,
}: VirtualListProps<T>) {
  
  // Memoized render item wrapper
  const renderItemMemo = useCallback(
    ({ item, index }: { item: T; index: number }) => {
      return renderItem(item, index);
    },
    [renderItem]
  );

  // Memoized key extractor
  const keyExtractorMemo = useCallback(
    (item: T, index: number) => keyExtractor(item, index),
    [keyExtractor]
  );

  // Auto-generated getItemLayout for fixed height items
  const getItemLayoutMemo = useMemo(() => {
    if (getItemLayout) return getItemLayout;
    
    if (typeof itemHeight === 'number') {
      return (data: ArrayLike<T> | null | undefined, index: number) => ({
        length: itemHeight,
        offset: itemHeight * index,
        index,
      });
    }
    
    return undefined;
  }, [getItemLayout, itemHeight]);

  // Optimized performance props
  const performanceProps = useMemo(() => ({
    initialNumToRender,
    maxToRenderPerBatch,
    windowSize,
    removeClippedSubviews,
    updateCellsBatchingPeriod: 50,
    getItemLayout: getItemLayoutMemo,
  }), [
    initialNumToRender,
    maxToRenderPerBatch,
    windowSize,
    removeClippedSubviews,
    getItemLayoutMemo
  ]);

  return (
    <FlatList
      data={data}
      renderItem={renderItemMemo}
      keyExtractor={keyExtractorMemo}
      style={[styles.container, containerStyle]}
      contentContainerStyle={contentContainerStyle}
      onEndReached={onEndReached}
      onEndReachedThreshold={onEndReachedThreshold}
      refreshControl={refreshControl}
      ListHeaderComponent={ListHeaderComponent}
      ListFooterComponent={ListFooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      horizontal={horizontal}
      numColumns={numColumns}
      showsVerticalScrollIndicator={!horizontal}
      showsHorizontalScrollIndicator={horizontal}
      {...performanceProps}
    />
  );
}

// =============================================================================
// SPECIALIZED LIST COMPONENTS
// =============================================================================

/**
 * Optimized Order List Component
 */
interface OrderListProps<T extends { id: string; status?: string }> {
  orders: T[];
  renderOrder: (order: T, index: number) => React.ReactElement;
  onLoadMore?: () => void;
  loading?: boolean;
  refreshControl?: React.ReactElement<RefreshControlProps>;
  ListEmptyComponent?: FlatListProps<T>['ListEmptyComponent'];
}

export const OrderList = memo(<T extends { id: string; status?: string }>({
  orders,
  renderOrder,
  onLoadMore,
  loading,
  refreshControl,
  ListEmptyComponent,
}: OrderListProps<T>) => {
  const keyExtractor = useCallback((item: T) => item.id, []);
  
  const FooterComponent = useMemo(() => {
    if (!loading) return null;
    return (
      <View style={styles.loadingFooter}>
        {/* Add loading indicator */}
      </View>
    );
  }, [loading]) as FlatListProps<T>['ListFooterComponent'];

  return (
    <VirtualList
      data={orders}
      renderItem={renderOrder}
      keyExtractor={keyExtractor}
      itemHeight={120} // Typical order item height
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.3}
      refreshControl={refreshControl}
      ListFooterComponent={FooterComponent}
      ListEmptyComponent={ListEmptyComponent}
      initialNumToRender={8}
      maxToRenderPerBatch={4}
      windowSize={8}
    />
  );
});

/**
 * Optimized Menu Items Grid
 */
interface MenuGridProps<T extends { id: string; name: string; price: number }> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactElement;
  numColumns?: number;
  refreshControl?: React.ReactElement<RefreshControlProps>;
}

export const MenuGrid = memo(<T extends { id: string; name: string; price: number }>({
  items,
  renderItem,
  numColumns = 2,
  refreshControl,
}: MenuGridProps<T>) => {
  const keyExtractor = useCallback((item: T) => item.id, []);
  
  // Calculate item height based on screen width and columns
  const itemWidth = screenWidth / numColumns;
  const itemHeight = itemWidth * 1.2; // Aspect ratio

  return (
    <VirtualList
      data={items}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      numColumns={numColumns}
      itemHeight={itemHeight}
      refreshControl={refreshControl}
      initialNumToRender={6}
      maxToRenderPerBatch={4}
      windowSize={6}
    />
  );
});

/**
 * Optimized Search Results List
 */
interface SearchListProps<T extends { id: string }> {
  results: T[];
  renderResult: (result: T, index: number) => React.ReactElement;
  query: string;
  onLoadMore?: () => void;
  loading?: boolean;
}

export const SearchList = memo(<T extends { id: string }>({
  results,
  renderResult,
  query,
  onLoadMore,
  loading,
}: SearchListProps<T>) => {
  const keyExtractor = useCallback(
    (item: T, index: number) => `${query}-${item.id}-${index}`,
    [query]
  );

  return (
    <VirtualList
      data={results}
      renderItem={renderResult}
      keyExtractor={keyExtractor}
      itemHeight={80}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.5}
      initialNumToRender={15}
      maxToRenderPerBatch={8}
      windowSize={12}
    />
  );
});

// =============================================================================
// STYLES
// =============================================================================

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingFooter: {
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
});

// =============================================================================
// EXPORTS
// =============================================================================

export default memo(VirtualList);
