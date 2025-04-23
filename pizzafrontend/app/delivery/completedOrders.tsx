import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  RefreshControl,
  Alert
} from 'react-native';
import { Star, ChevronRight, ArrowLeft } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { API_URL } from '@/config';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface CompletedOrder {
  id: string;
  date: string;
  time: string;
  customerName: string;
  items: OrderItem[];
  total: number;
  commission: number;
  deliveryDuration: string;
  rating: number;
  feedback?: string;
  customerImage: string;
}

const CompletedOrders = () => {
  const [selectedFilter, setSelectedFilter] = useState('All');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [completedOrders, setCompletedOrders] = useState<CompletedOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, name, email } = useSelector((state: RootState) => state.auth);
  const router = useRouter();

  const filterOptions = ['All', 'Today', 'This Week', 'This Month'];

  const fetchCompletedOrders = useCallback(async (period: string = 'All') => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }

    if (!refreshing) setLoading(true);
    setError(null);

    try {
      console.log(`Fetching completed orders for delivery agent: ${name} (${email})`);
      let url = `${API_URL}/api/delivery/orders/completed`;

      if (period !== 'All') {
        const now = new Date();
        let startDate = new Date();

        if (period === 'Today') {
          startDate.setHours(0, 0, 0, 0);
        } else if (period === 'This Week') {
          startDate.setDate(now.getDate() - 7);
        } else if (period === 'This Month') {
          startDate.setMonth(now.getMonth() - 1);
        }

        url += `?startDate=${startDate.toISOString()}&endDate=${now.toISOString()}`;
      }

      console.log(`Using filter: ${period}, Requesting URL: ${url}`);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch completed orders');
      }

      const data = await response.json();
      console.log('Response data completed order:', data);
      console.log(`Fetched ${data.length} completed orders`);

      // Transform backend data to match our frontend format
      const formattedOrders = data.map((order: any) => {
        // Extract time part from ISO date
        const orderDate = new Date(order.date);
        const formattedDate = orderDate.toLocaleDateString('en-US', {
          day: 'numeric',
          month: 'short',
          year: 'numeric'
        });
        const formattedTime = orderDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });

        return {
          id: order.id || order._id,
          date: order.date || '', // Use the date directly from backend
          time: order.time || '', // Use the time directly from backend
          customerName: order.customerName || 'Unknown Customer',
          items: order.items || [],
          total: order.total || 0, // Make sure we use the right property name
          commission: order.commission || 0,
          deliveryDuration: order.deliveryDuration || '30 min',
          rating: order.rating || 0,
          feedback: order.feedback || '',
          customerImage: order.customerImage || 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?q=80&w=100'
        };
      });

      setCompletedOrders(formattedOrders);
    } catch (err) {
      console.error('Error fetching completed orders:', err);
      setError('Failed to load completed orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, router, refreshing, name, email]);

  // Handle filter selection
  const handleFilterChange = (filter: string) => {
    setSelectedFilter(filter);
    fetchCompletedOrders(filter);
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchCompletedOrders(selectedFilter);
  }, [fetchCompletedOrders, selectedFilter]);

  // Toggle order details expansion
  const toggleOrderDetails = (orderId: string): void => {
    if (expandedOrder === orderId) {
      setExpandedOrder(null);
    } else {
      setExpandedOrder(orderId);
    }
  };

  // Load completed orders on component mount
  useEffect(() => {
    fetchCompletedOrders();
  }, [fetchCompletedOrders]);

  // Function to handle going back
  const handleGoBack = () => {
    router.back();
  };

  // Render star ratings
  const renderRatingStars = (rating: number): JSX.Element => {
    return (
      <View style={styles.ratingContainer}>
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            size={16}
            color={star <= rating ? '#FFB800' : '#D1D1D1'}
            fill={star <= rating ? '#FFB800' : 'none'}
          />
        ))}
      </View>
    );
  };

  // Calculate statistics
  const calculateStats = useCallback(() => {
    return {
      deliveries: completedOrders.length || 0,
    };
  }, [completedOrders]);

  const stats = calculateStats();

  // Render order items
  const renderOrderItem = ({ item }: { item: CompletedOrder }): JSX.Element => {
    const isExpanded = expandedOrder === item.id;

    return (
      <TouchableOpacity
        style={[styles.orderCard, isExpanded && styles.expandedCard]}
        onPress={() => toggleOrderDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderBasicInfo}>
            <Text style={styles.orderId}>#{item.id}</Text>
            <View style={styles.timeContainer}>
              <Text style={styles.orderDate}>{item.date} • {item.time}</Text>
            </View>
          </View>
        </View>

        <View style={styles.customerSection}>
          <Image
            source={{ uri: item.customerImage }}
            style={styles.customerImage}
          />
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.customerName}</Text>
            <View style={styles.deliveryInfo}>
              <Text style={styles.deliveryTime}>Delivered in {item.deliveryDuration}</Text>
              {renderRatingStars(item.rating)}
            </View>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.orderDetails}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {item.items.map((orderItem, index) => (
              <View key={index} style={styles.orderItemRow}>
                <Text style={styles.itemQuantity}>{orderItem.quantity}x</Text>
                <Text style={styles.itemName}>{orderItem.name}</Text>
                <Text style={styles.itemPrice}>₹{orderItem.price.toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.totalRow}>
              <Text style={styles.totalLabel}>Total Order Value</Text>
              <Text style={styles.totalAmount}>₹{item.total.toFixed(2)}</Text>
            </View>

            {item.feedback && (
              <View style={styles.feedbackContainer}>
                <Text style={styles.sectionTitle}>Customer Feedback</Text>
                <View style={styles.feedbackContent}>
                  <Text style={styles.feedbackText}>"{item.feedback}"</Text>
                </View>
              </View>
            )}
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetails}>
            {isExpanded ? 'Hide Details' : 'View Details'}
          </Text>
          <ChevronRight
            size={20}
            color="#FF6B00"
            style={{
              transform: [{ rotate: isExpanded ? '90deg' : '0deg' }]
            }}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Render loading state
  if (loading && !refreshing && completedOrders.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#2d3436" />
          </TouchableOpacity>
          <Text style={styles.title}>Completed Orders</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && !refreshing && completedOrders.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#2d3436" />
          </TouchableOpacity>
          <Text style={styles.title}>Completed Orders</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchCompletedOrders()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#222" />
        </TouchableOpacity>
        <Text style={styles.title}>Completed Orders</Text>
      </View>

      <View style={styles.dateFilterContainer}>
        <FlatList
          horizontal
          data={filterOptions}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[
                styles.dateFilterOption,
                selectedFilter === item && styles.selectedDateFilter
              ]}
              onPress={() => handleFilterChange(item)}
            >
              <Text style={[
                styles.dateFilterText,
                selectedFilter === item && styles.selectedDateFilterText
              ]}>
                {item}
              </Text>
            </TouchableOpacity>
          )}
          keyExtractor={(item) => item}
          showsHorizontalScrollIndicator={false}
        />
      </View>

      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statValue}>{stats.deliveries}</Text>
          <Text style={styles.statLabel}>Total Deliveries</Text>
        </View>
      </View>

      {completedOrders.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1586769852836-bc069f19e1be?w=200&auto=format&fit=crop' }}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyText}>No completed orders</Text>
          <Text style={styles.emptySubText}>You haven't completed any deliveries yet</Text>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            <Text style={styles.refreshButtonText}>
              {refreshing ? 'Refreshing...' : 'Refresh'}
            </Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={completedOrders}
          renderItem={renderOrderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B00']}
              tintColor="#FF6B00"
              title="Refreshing orders..."
              titleColor="#636e72"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F6F6F6',
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#222',
  },
  dateFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 15,
    paddingVertical: 15,
  },
  dateFilterOption: {
    paddingHorizontal: 15,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#F6F6F6',
  },
  selectedDateFilter: {
    backgroundColor: '#FF6B00',
  },
  dateFilterText: {
    fontSize: 14,
    color: '#666',
  },
  selectedDateFilterText: {
    color: '#FFFFFF',
  },
  statsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 20,
    marginBottom: 15,
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  statLabel: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ordersList: {
    padding: 15,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    padding: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  expandedCard: {
    backgroundColor: '#FFFFFF',
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  orderBasicInfo: {
    flex: 1,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  orderDate: {
    fontSize: 14,
    color: '#666',
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  customerImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
    justifyContent: 'space-between',
  },
  deliveryTime: {
    fontSize: 14,
    color: '#666',
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  orderDetails: {
    marginTop: 10,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemQuantity: {
    width: 30,
    fontSize: 14,
    color: '#666',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#333',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#FF6B00',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  feedbackContainer: {
    marginTop: 10,
  },
  feedbackContent: {
    backgroundColor: '#F9F9F9',
    borderRadius: 8,
    padding: 12,
  },
  feedbackText: {
    fontSize: 14,
    color: '#555',
    fontStyle: 'italic',
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  viewDetails: {
    fontSize: 14,
    color: '#FF6B00',
    marginRight: 5,
    fontWeight: '500',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#636e72',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  errorText: {
    fontSize: 16,
    color: '#e74c3c',
    textAlign: 'center',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    paddingBottom: 120, // Extra padding for bottom navigation
  },
  emptyImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2d3436',
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#636e72',
    textAlign: 'center',
    marginBottom: 24,
  },
  refreshButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default CompletedOrders;