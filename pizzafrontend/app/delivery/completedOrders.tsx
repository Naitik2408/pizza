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
  Alert,
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { 
  Star, 
  ChevronRight, 
  ArrowLeft, 
  Package, 
  Calendar, 
  Clock, 
  User, 
  RefreshCw,
  Award,
  TrendingUp
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { API_URL } from '@/config';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Function to generate initials from name
const getInitials = (name: string): string => {
  if (!name) return 'CU'; // Customer default

  const words = name.trim().split(' ');
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Function to generate a consistent color based on name
const generateColorFromName = (name: string): string => {
  if (!name) return '#FF6B00'; // Default color

  // Simple hash function for name to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate vibrant colors
  const colorPalette = [
    '#FF6B00', '#4F46E5', '#10B981', '#F59E0B', '#EC4899',
    '#8B5CF6', '#06B6D4', '#F43F5E', '#84CC16', '#6366F1'
  ];

  const index = Math.abs(hash % colorPalette.length);
  return colorPalette[index];
};

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
  subtotal: number;
  deliveryFee: number;
  tax: number;
  discount: number;
  total: number;
  commission: number;
  deliveryDuration: string;
  rating: number;
  feedback?: string;
  customerImage: string;
}

// Skeleton loading component with animation
const OrderSkeleton = () => {
  const [fadeAnim] = useState(new Animated.Value(0.3));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    ).start();
  }, [fadeAnim]);

  const skeletonStyle = {
    opacity: fadeAnim,
  };

  return (
    <Animated.View style={[styles.orderCard, skeletonStyle]}>
      <View style={styles.skeletonHeader} />
      <View style={styles.skeletonCustomer} />
      <View style={styles.skeletonRating} />
      <View style={styles.skeletonDivider} />
      <View style={styles.skeletonFooter} />
    </Animated.View>
  );
};

// Component for rendering the empty completed orders view
interface EmptyOrdersViewProps {
  onRefresh: () => void;
  refreshing: boolean;
}

const EmptyCompletedOrdersView = ({ onRefresh, refreshing }: EmptyOrdersViewProps) => {
  const [pulseAnim] = useState(new Animated.Value(1));
  
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: true
        }),
        Animated.timing(pulseAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true
        })
      ])
    ).start();
  }, []);

  return (
    <View style={styles.emptyContainer}>
      <View style={styles.emptyImageWrapper}>
        <Image
          source={{ uri: 'https://img.freepik.com/free-vector/delivery-service-with-man-scooter-mask_23-2148496524.jpg?t=st=1748754922~exp=1748758522~hmac=116d975899ee795bba4775fb06daac7a35077de26e6dcd232a21880560c2f807&w=1380' }}
          style={styles.emptyImage}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.emptyContent}>
        <Text style={styles.emptyTitle}>No Completed Deliveries Yet</Text>
        {/* <Text style={styles.emptySubText}>
          Your delivery history will appear here after you complete your first delivery.
        </Text> */}
      
        <View style={styles.emptyInfoContainer}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Package size={20} color="#FF6B00" />
            </View>
            <Text style={styles.infoTitle}>Start Delivering</Text>
            <Text style={styles.infoText}>Accept orders from the assigned orders tab</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Award size={20} color="#FF6B00" />
            </View>
            <Text style={styles.infoTitle}>Earn Ratings</Text>
            <Text style={styles.infoText}>Deliver on time for better ratings</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <TrendingUp size={20} color="#FF6B00" />
            </View>
            <Text style={styles.infoTitle}>Track Progress</Text>
            <Text style={styles.infoText}>Monitor your earnings and performance</Text>
          </View>
        </View>

        {/* <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.refreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <RefreshCw size={18} color="#FFFFFF" />
                <Text style={styles.refreshButtonText}>Refresh</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View> */}
      </View>
    </View>
  );
};

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
          date: formattedDate || '', 
          time: formattedTime || '', 
          customerName: order.customerName || 'Unknown Customer',
          items: order.items || [],
          subtotal: order.subtotal || 0,
          deliveryFee: order.deliveryFee || 0,
          tax: order.tax || 0,
          discount: order.discount || 0,
          total: order.total || 0,
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
  const renderRatingStars = (rating: number) => {
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

  // Render order items
  const renderOrderItem = ({ item }: { item: CompletedOrder }) => {
    const isExpanded = expandedOrder === item.id;
    
    // Generate initials and avatar color for customer
    const customerInitials = getInitials(item.customerName);
    const avatarColor = generateColorFromName(item.customerName);

    return (
      <TouchableOpacity
        style={[styles.orderCard, isExpanded && styles.expandedCard]}
        onPress={() => toggleOrderDetails(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Package size={16} color="#1c1917" />
            <Text style={styles.orderId}>#{item.id}</Text>
          </View>
          <View style={styles.dateTimeContainer}>
            <Calendar size={14} color="#666" />
            <Text style={styles.orderDate}>{item.date}</Text>
            <Clock size={14} color="#666" style={{marginLeft: 8}} />
            <Text style={styles.orderDate}>{item.time}</Text>
          </View>
        </View>

        <View style={styles.customerSection}>
          <View style={[styles.customerAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.customerAvatarText}>{customerInitials}</Text>
          </View>
          <View style={styles.customerInfo}>
            <View style={styles.customerNameContainer}>
              <User size={14} color="#666" />
              <Text style={styles.customerName}>{item.customerName}</Text>
            </View>
          </View>
        </View>

        {isExpanded && (
          <View style={styles.orderDetails}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {item.items.map((orderItem, index) => (
              <View key={index} style={styles.orderItemRow}>
                <Text style={styles.itemQuantity}>{orderItem.quantity}×</Text>
                <Text style={styles.itemName}>{orderItem.name}</Text>
                <Text style={styles.itemPrice}>₹{orderItem.price.toFixed(2)}</Text>
              </View>
            ))}

            <View style={styles.divider} />

            <View style={styles.priceBreakdown}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal</Text>
                <Text style={styles.totalAmount}>₹{item.subtotal.toFixed(2)}</Text>
              </View>
              
              {item.deliveryFee > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Delivery Fee</Text>
                  <Text style={styles.totalAmount}>₹{item.deliveryFee.toFixed(2)}</Text>
                </View>
              )}
              
              {item.tax > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>GST & Taxes</Text>
                  <Text style={styles.totalAmount}>₹{item.tax.toFixed(2)}</Text>
                </View>
              )}
              
              {item.discount > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Discount</Text>
                  <Text style={styles.discountAmount}>-₹{item.discount.toFixed(2)}</Text>
                </View>
              )}
              
              <View style={styles.divider} />
              
              <View style={styles.totalRow}>
                <Text style={styles.grandTotalLabel}>Total Paid</Text>
                <Text style={styles.grandTotalAmount}>₹{item.total.toFixed(2)}</Text>
              </View>
            </View>
          </View>
        )}

        <View style={styles.cardFooter}>
          <Text style={styles.viewDetails}>
            {isExpanded ? 'Hide Details' : 'View Details'}
          </Text>
          <ChevronRight
            size={20}
            color="#1c1917"
            style={{
              transform: [{ rotate: isExpanded ? '90deg' : '0deg' }]
            }}
          />
        </View>
      </TouchableOpacity>
    );
  };

  // Render loading state with skeletons
  if (loading && !refreshing && completedOrders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#1c1917" />
          </TouchableOpacity>
          <Text style={styles.title}>Delivery History</Text>
        </View>
        
        <View style={styles.dateFilterContainer}>
          <FlatList
            horizontal
            data={filterOptions}
            renderItem={({ item }) => (
              <View style={styles.skeletonFilterOption} />
            )}
            keyExtractor={(item) => item}
            showsHorizontalScrollIndicator={false}
          />
        </View>

        <View style={styles.ordersList}>
          <OrderSkeleton />
          <OrderSkeleton />
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && !refreshing && completedOrders.length === 0) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#1c1917" />
          </TouchableOpacity>
          <Text style={styles.title}>Delivery History</Text>
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
          <ArrowLeft size={24} color="#1c1917" />
        </TouchableOpacity>
        <Text style={styles.title}>Delivery History</Text>
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

      {completedOrders.length === 0 && !loading ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B00']}
              tintColor="#FF6B00"
              title="Refreshing history..."
              titleColor="#666"
            />
          }
        >
          <EmptyCompletedOrdersView onRefresh={onRefresh} refreshing={refreshing} />
        </ScrollView>
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
              title="Refreshing history..."
              titleColor="#666"
            />
          }
        />
      )}
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  dateFilterContainer: {
    backgroundColor: '#FFFFFF',
    paddingVertical: 15,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    marginBottom: 10, // Added margin now that stats container is removed
  },
  dateFilterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 10,
    backgroundColor: '#F0F0F0',
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  selectedDateFilter: {
    backgroundColor: '#FF6B00',
    borderColor: '#FF6B00',
  },
  dateFilterText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  selectedDateFilterText: {
    color: '#FFFFFF',
  },
  ordersList: {
    padding: 15,
    paddingBottom: 100, // Extra padding for bottom navigation
  },
  orderCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 15,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  expandedCard: {
    shadowOpacity: 0.1,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  orderIdContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c1917',
    marginLeft: 6,
  },
  dateTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderDate: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
  },
  customerAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: 'white',
  },
  customerInfo: {
    flex: 1,
    marginLeft: 12,
  },
  customerNameContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  customerName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#1c1917',
    marginLeft: 6,
  },
  deliveryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 6,
    justifyContent: 'space-between',
  },
  deliveryTime: {
    fontSize: 13,
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
    color: '#1c1917',
    marginBottom: 10,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  itemQuantity: {
    width: 25,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },
  itemName: {
    flex: 1,
    fontSize: 14,
    color: '#1c1917',
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1c1917',
  },
  divider: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingHorizontal: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: '#666',
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1c1917',
  },
  priceBreakdown: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  discountAmount: {
    fontSize: 14,
    fontWeight: '500',
    color: '#2ECC71',
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  grandTotalAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  commissionAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2ECC71',
  },
  feedbackContainer: {
    marginTop: 16,
  },
  feedbackContent: {
    backgroundColor: '#FAFAFA',
    borderRadius: 8,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#FFB800',
  },
  feedbackText: {
    fontSize: 14,
    color: '#1c1917',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F5F5F5',
  },
  viewDetails: {
    fontSize: 14,
    color: '#1c1917',
    marginRight: 5,
    fontWeight: '500',
  },
  // Loading and error states
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
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
  // Empty state
  emptyContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  emptyImageWrapper: {
    width: '100%',
    height: 220,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 20,
  },
  emptyImage: {
    width: width * 0.8,
    height: 200,
  },
  emptyContent: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubText: {
    fontSize: 15,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  emptyInfoContainer: {
    width: '100%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  infoCard: {
    width: '30%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 15,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  infoIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  infoTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 5,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    lineHeight: 16,
  },
  refreshButton: {
    backgroundColor: '#1c1917',
    paddingVertical: 14,
    paddingHorizontal: 40,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
    marginTop: 10,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Skeleton UI styles
  skeletonFilterOption: {
    width: 80,
    height: 36,
    borderRadius: 20,
    backgroundColor: '#E0E0E0',
    marginRight: 10,
  },
  skeletonHeader: {
    height: 20,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 15,
    width: '90%',
  },
  skeletonCustomer: {
    height: 50,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 15,
  },
  skeletonRating: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 15,
    width: '60%',
    alignSelf: 'flex-end',
  },
  skeletonDivider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 10,
  },
  skeletonFooter: {
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    width: '40%',
    alignSelf: 'center',
    marginTop: 12,
  }
});

export default CompletedOrders;