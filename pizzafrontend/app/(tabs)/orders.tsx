import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  ScrollView,
  Image,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Platform
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { AntDesign } from '@expo/vector-icons';
import { MapPin, Clock, ChevronDown, ArrowLeft, AlertCircle, LogIn, ShoppingBag } from 'lucide-react-native';
import { API_URL } from '@/config';
import { RootState } from '../../redux/store';
import { selectCartItemCount } from '../../redux/slices/cartSlice';
import { getSocket, onSocketEvent, offSocketEvent } from '@/src/utils/socket';

// Helper functions for avatar generation
const getInitials = (name: string): string => {
  if (!name) return 'DA'; // Delivery Agent default

  const words = name.trim().split(' ');
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

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

// Define interface for order item
interface OrderItem {
  menuItemId?: string;
  name: string;
  quantity: number;
  price: number;
  size?: string;
  foodType?: string;
  image?: string;
  basePrice?: number;
  totalItemPrice?: number;
  customizations?: Array<{
    name: string;
    option: string;
    price: number;
  }>;
  addOns?: Array<{
    name: string;
    option?: string;
    price: number;
  }>;
  toppings?: Array<{
    name: string;
    option?: string;
    price: number;
  }>;
  specialInstructions?: string;
  hasCustomizations?: boolean;
  totalPrice?: number;
}

// Define interface for status update
interface StatusUpdate {
  status: string;
  time: string;
  note?: string;
}

// Define interface for address
interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  landmark?: string;
}

// Define interface for order
interface Order {
  _id: string;
  id?: string;
  orderNumber: string;
  date: string;
  time: string;
  createdAt: string;
  status: string;
  items: OrderItem[];
  amount: number;
  customerName: string;
  customerPhone: string;
  address: Address;
  fullAddress: string;
  estimatedDeliveryTime?: string;
  deliveryAgent?: {
    _id: string;
    name: string;
    phone: string;
    photo?: string;
  } | null;
  paymentMethod: string;
  paymentStatus: string;
  statusUpdates: StatusUpdate[];
  notes?: string;
  subTotal?: number;
  tax?: number;
  deliveryFee?: number;
  discounts?: {
    code: string;
    amount: number;
    percentage?: number;
  };
}

export default function OrdersScreen() {
  const router = useRouter();
  const { token, isGuest } = useSelector((state: RootState) => state.auth);
  const cartItemCount = useSelector(selectCartItemCount);

  const [activeTab, setActiveTab] = useState('current');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [currentOrders, setCurrentOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type OrderStatus = 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';

  // Set up socket listeners for real-time order updates
  useEffect(() => {
    if (isGuest || !token) return;

    const socket = getSocket();
    if (socket) {
      // Handler for order status updates
      const handleOrderStatusUpdate = (data: {
        _id: string;
        orderNumber: string;
        status: string;
        statusUpdates: StatusUpdate[];
        estimatedDeliveryTime?: string;
        deliveryAgent?: any;
        updatedAt: string;
      }) => {

        
        // Update current orders
        setCurrentOrders(prevOrders => 
          prevOrders.map(order => {
            if (order._id === data._id) {
              const updatedOrder = {
                ...order,
                status: data.status,
                statusUpdates: data.statusUpdates || order.statusUpdates,
                estimatedDeliveryTime: data.estimatedDeliveryTime || order.estimatedDeliveryTime,
                deliveryAgent: data.deliveryAgent || order.deliveryAgent
              };

              // If order is completed or cancelled, move to past orders
              if (data.status === 'Delivered' || data.status === 'Cancelled') {
                setPastOrders(prevPastOrders => [updatedOrder, ...prevPastOrders]);
                return null; // Will be filtered out
              }

              return updatedOrder;
            }
            return order;
          }).filter(Boolean) as Order[]
        );

        // Update past orders if the order is already there
        setPastOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === data._id
              ? {
                  ...order,
                  status: data.status,
                  statusUpdates: data.statusUpdates || order.statusUpdates,
                  estimatedDeliveryTime: data.estimatedDeliveryTime || order.estimatedDeliveryTime,
                  deliveryAgent: data.deliveryAgent || order.deliveryAgent
                }
              : order
          )
        );
      };

      // Handler for delivery agent assignment
      const handleDeliveryAgentAssigned = (data: {
        _id: string;
        deliveryAgent: any;
      }) => {

        
        setCurrentOrders(prevOrders =>
          prevOrders.map(order =>
            order._id === data._id
              ? { ...order, deliveryAgent: data.deliveryAgent }
              : order
          )
        );
      };

      // Set up event listeners
      onSocketEvent('my_order_update', handleOrderStatusUpdate);
      onSocketEvent('assigned_order_update', handleDeliveryAgentAssigned);

      // Cleanup listeners on unmount
      return () => {
        offSocketEvent('my_order_update', handleOrderStatusUpdate);
        offSocketEvent('assigned_order_update', handleDeliveryAgentAssigned);
      };
    }
  }, [token, isGuest]);

  const renderGuestView = () => {
    return (
      <View style={styles.guestContainer}>
        <Image
          source={{ uri: 'https://images.unsplash.com/photo-1571997478779-2adcbbe9ab2f?w=400&auto=format&fit=crop&q=80' }}
          style={styles.guestImage}
        />
        <Text style={styles.guestTitle}>Create an Account to Track Orders</Text>
        <Text style={styles.guestText}>
          Sign in or create an account to keep track of your order history, reorder favorites, and access exclusive deals.
        </Text>

        <View style={styles.guestButtonContainer}>
          <TouchableOpacity
            style={styles.guestLoginButton}
            onPress={() => router.push('/(auth)/login')}
          >
            <LogIn size={18} color="#fff" />
            <Text style={styles.guestLoginButtonText}>Sign In</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.guestSignupButton}
            onPress={() => router.push('/(auth)/signup')}
          >
            <Text style={styles.guestSignupButtonText}>Create Account</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.browseMenuButton}
          onPress={() => router.push('/(tabs)/menu')}
        >
          <ShoppingBag size={18} color="#F97316" />
          <Text style={styles.browseMenuButtonText}>Browse Menu</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Function to fetch user orders with improved error handling
  const fetchUserOrders = useCallback(async () => {
    // Don't fetch orders if user is a guest or no token is available
    if (isGuest || !token) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      setError(null);
      if (!refreshing) setLoading(true);


      const response = await fetch(`${API_URL}/api/orders/my-orders`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Handle 204 No Content response (no orders found)
      if (response.status === 204) {

        setCurrentOrders([]);
        setPastOrders([]);
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Handle authentication errors specifically
      if (response.status === 401) {

        // You might want to dispatch logout action here if using Redux
        // dispatch(logout());
        throw new Error('Your session has expired. Please log in again.');
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch orders');
      }

      const data = await response.json();

      // Handle case where data might be empty object or null
      if (!data || (typeof data === 'object' && !Array.isArray(data) && Object.keys(data).length === 0)) {

        setCurrentOrders([]);
        setPastOrders([]);
        return;
      }



      // Ensure we're handling both array and paginated response formats
      // Also handle the case where backend returns {orders: []} format on error
      const ordersArray = Array.isArray(data) ? data : (data.orders || []);

      // Filter orders into current and past orders
      const currentOrdersData = ordersArray.filter((order: Order) =>
        order && order.status !== 'Delivered' && order.status !== 'Cancelled'
      );

      const pastOrdersData = ordersArray.filter((order: Order) =>
        order && (order.status === 'Delivered' || order.status === 'Cancelled')
      );

      // Process orders to ensure all fields are present
      const processOrders = (orders: Order[]) => orders.map((order: Order) => ({
        ...order,
        // Make sure any nested arrays exist
        items: (order.items || []).map((item: OrderItem) => ({
          ...item,
          customizations: Array.isArray(item.customizations) ? item.customizations : [],
          addOns: Array.isArray(item.addOns) ? item.addOns : [],
          toppings: Array.isArray(item.toppings) ? item.toppings : [],
          // Calculate total price if not provided
          totalPrice: item.totalPrice || (item.totalItemPrice || item.price) * item.quantity,
          // Make sure hasCustomizations is set
          hasCustomizations: item.hasCustomizations || !!(
            (item.customizations && item.customizations.length) ||
            (item.addOns && item.addOns.length) ||
            (item.toppings && item.toppings.length) ||
            item.specialInstructions
          )
        })),
        // Make sure statusUpdates is an array
        statusUpdates: Array.isArray(order.statusUpdates) ? order.statusUpdates : [],
        // Handle id vs orderNumber difference
        orderNumber: order.orderNumber || order.id || 'N/A'
      }));

      // Update state with the processed orders
      setCurrentOrders(processOrders(currentOrdersData));
      setPastOrders(processOrders(pastOrdersData));

    } catch (err) {
      console.error('Error fetching orders:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';

      // Show more user-friendly errors for auth issues
      if (errorMessage.includes('session has expired') ||
        errorMessage.includes('token expired') ||
        errorMessage.includes('invalid token') ||
        errorMessage.includes('Not authorized')) {
        setError('Your login session has expired. Please sign in again.');
      } else {
        setError(`Failed to load your orders: ${errorMessage}`);
      }

      // Set empty arrays to ensure UI doesn't crash
      setCurrentOrders([]);
      setPastOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, refreshing, isGuest]);

  // Function to refresh orders
  const onRefresh = useCallback(() => {
    if (isGuest) return; // Don't refresh for guest users

    setRefreshing(true);
    fetchUserOrders();
  }, [fetchUserOrders, isGuest]);

  // Fetch orders on component mount
  useEffect(() => {
    if (!isGuest) {
      fetchUserOrders();
    }
  }, [fetchUserOrders, isGuest]);

  // Get color for order status
  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Pending':
        return '#FF9800';
      case 'Preparing':
        return '#FFA500';
      case 'Out for delivery':
        return '#2196F3';
      case 'Delivered':
        return '#4CAF50';
      case 'Cancelled':
        return '#F44336';
      default:
        return '#FFA500';
    }
  };

  // Get color for payment status
  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed':
        return '#4CAF50';
      case 'Failed':
        return '#F44336';
      case 'Pending':
        return '#FFA500';
      case 'Refunded':
        return '#2196F3';
      default:
        return '#FFA500';
    }
  };

  // Toggle order details
  const toggleOrderDetails = (orderId: string): void => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    if (!dateString) return 'Unknown date';

    try {
      const date = new Date(dateString);
      const today = new Date();

      if (
        date.getDate() === today.getDate() &&
        date.getMonth() === today.getMonth() &&
        date.getFullYear() === today.getFullYear()
      ) {
        // Format as "Today, HH:MM AM/PM"
        return `Today, ${date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: 'numeric',
          hour12: true
        })}`;
      } else {
        // Format as "MMM DD, YYYY"
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        });
      }
    } catch (e) {
      console.error('Error formatting date:', e);
      return 'Invalid date';
    }
  };



  // Render order items (without images)
  const renderOrderItems = (items: OrderItem[]): React.ReactNode[] => {
    return items.map((item, index) => {
      return (
        <View key={index} style={styles.orderItem}>
          <View style={styles.itemDetails}>
            <Text style={styles.itemName}>{item.name}</Text>
            <Text style={styles.itemQuantity}>
              x{item.quantity} {item.size && `• ${item.size}`}
            </Text>

            {/* Display base customizations if available */}
            {item.customizations && item.customizations.length > 0 && (
              <Text style={styles.itemCustomizations}>
                Customizations: {item.customizations.map(c => `${c.name}: ${c.option}`).join(', ')}
              </Text>
            )}

            {/* Display add-ons if available */}
            {item.addOns && item.addOns.length > 0 && (
              <Text style={styles.itemCustomizations}>
                Add-ons: {item.addOns.map(addon => addon.name).join(', ')}
              </Text>
            )}

            {/* Display toppings if available */}
            {item.toppings && item.toppings.length > 0 && (
              <Text style={styles.itemCustomizations}>
                Toppings: {item.toppings.map(topping => topping.name).join(', ')}
              </Text>
            )}

            {/* Display special instructions if available */}
            {item.specialInstructions && (
              <Text style={styles.itemCustomizations}>
                Instructions: {item.specialInstructions}
              </Text>
            )}
          </View>
          <Text style={styles.itemPrice}>₹{(item.totalPrice || (item.price * item.quantity)).toFixed(2)}</Text>
        </View>
      );
    });
  };

  // Render invoice details
  const renderInvoice = (order: Order): React.ReactNode => {
    // Use order's specific breakdown if available, otherwise estimate
    const subtotal = order.subTotal || order.items.reduce((sum, item) =>
      sum + ((item.totalItemPrice || item.price) * item.quantity), 0);

    const tax = order.tax || (order.amount * 0.05); // Use provided tax or estimate at 5%
    const deliveryFee = order.deliveryFee || (order.amount - subtotal - tax);
    const discount = order.discounts?.amount || 0;

    return (
      <View style={styles.invoiceContainer}>
        <Text style={styles.invoiceTitle}>Invoice Details</Text>

        <View style={styles.invoiceRow}>
          <Text>Subtotal</Text>
          <Text>₹{subtotal.toFixed(2)}</Text>
        </View>

        <View style={styles.invoiceRow}>
          <Text>Tax</Text>
          <Text>₹{tax.toFixed(2)}</Text>
        </View>

        <View style={styles.invoiceRow}>
          <Text>Delivery Fee</Text>
          <Text>₹{deliveryFee >= 0 ? deliveryFee.toFixed(2) : '0.00'}</Text>
        </View>

        {discount > 0 && (
          <View style={styles.invoiceRow}>
            <Text style={{ color: '#F97316' }}>Discount{order.discounts?.code ? ` (${order.discounts.code})` : ''}</Text>
            <Text style={{ color: '#F97316' }}>-₹{discount.toFixed(2)}</Text>
          </View>
        )}

        <View style={[styles.invoiceRow, styles.totalRow]}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalPrice}>₹{order.amount.toFixed(2)}</Text>
        </View>

        <View style={styles.paymentMethod}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          <View style={styles.paymentRow}>
            <Text>{order.paymentMethod}</Text>
            <Text style={[
              styles.paymentStatus,
              { color: getPaymentStatusColor(order.paymentStatus) }
            ]}>
              {order.paymentStatus}
            </Text>
          </View>
        </View>
      </View>
    );
  };

  // Render delivery agent information
  const renderDeliveryAgentInfo = (agent: {
    _id: string;
    name: string;
    phone: string;
    photo?: string;
  } | null | undefined): React.ReactNode | null => {
    if (!agent) return null;

    const initials = getInitials(agent.name || '');
    const avatarColor = generateColorFromName(agent.name || '');

    return (
      <View style={styles.deliveryAgentContainer}>
        <Text style={styles.sectionTitle}>Delivery Agent</Text>
        <View style={styles.agentInfoContainer}>
          {/* Use initials-based avatar instead of photo */}
          <View style={[styles.agentAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.agentAvatarText}>{initials}</Text>
          </View>
          <View style={styles.agentDetails}>
            <Text style={styles.agentName}>{agent.name || 'Delivery Agent'}</Text>
            <Text style={styles.agentPhone}>{agent.phone || 'Contact not available'}</Text>
          </View>
          <TouchableOpacity
            style={styles.callButton}
            onPress={() => {
              // Handle calling the delivery agent
              if (agent.phone) {
                // Use linking to open phone app
                // Linking.openURL(`tel:${agent.phone}`);
                Alert.alert('Call Agent', `Call ${agent.name} at ${agent.phone}?`, [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Call', onPress: () => { } }
                ]);
              } else {
                Alert.alert('Contact Unavailable', 'Delivery agent contact information is not available.');
              }
            }}
          >
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render status timeline
  const renderStatusTimeline = (statusUpdates: StatusUpdate[]): React.ReactNode => {
    if (!statusUpdates || statusUpdates.length === 0) {
      return <View />;
    }

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.sectionTitle}>Order Status</Text>
        {statusUpdates.map((update, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={[
              styles.timelineDot,
              { backgroundColor: getStatusColor(update.status) }
            ]} />
            {index !== statusUpdates.length - 1 && <View style={styles.timelineLine} />}
            <View style={styles.timelineContent}>
              <Text style={styles.timelineStatus}>{update.status}</Text>
              <Text style={styles.timelineTime}>
                {new Date(update.time).toLocaleString('en-US', {
                  month: 'short',
                  day: 'numeric',
                  hour: 'numeric',
                  minute: 'numeric',
                  hour12: true
                })}
              </Text>
              {update.note && <Text style={styles.timelineNote}>{update.note}</Text>}
            </View>
          </View>
        ))}
      </View>
    );
  };

  // Skeleton Loading Components
  const SkeletonOrderCard = () => (
    <View style={styles.orderCard}>
      <View style={styles.orderHeader}>
        <View>
          <View style={[styles.skeletonBox, { width: 120, height: 16, marginBottom: 8 }]} />
          <View style={[styles.skeletonBox, { width: 80, height: 12 }]} />
        </View>
        <View style={[styles.skeletonBox, { width: 60, height: 14 }]} />
      </View>

      <View style={styles.deliveryTimeContainer}>
        <View style={[styles.skeletonBox, { width: 150, height: 14 }]} />
      </View>

      <View style={styles.orderSummary}>
        <View style={[styles.skeletonBox, { width: 40, height: 40, borderRadius: 8 }]} />
        <View style={[styles.skeletonBox, { width: 120, height: 14, marginLeft: 10 }]} />
        <View style={[styles.skeletonBox, { width: 60, height: 16 }]} />
      </View>
    </View>
  );

  const SkeletonOrderItem = () => (
    <View style={styles.orderItem}>
      <View style={styles.itemDetails}>
        <View style={[styles.skeletonBox, { width: 150, height: 16, marginBottom: 4 }]} />
        <View style={[styles.skeletonBox, { width: 80, height: 12, marginBottom: 4 }]} />
        <View style={[styles.skeletonBox, { width: 200, height: 12 }]} />
      </View>
      <View style={[styles.skeletonBox, { width: 50, height: 16 }]} />
    </View>
  );

  // Render current orders
  const renderCurrentOrders = () => {
    if (loading && !refreshing && currentOrders.length === 0) {
      return (
        <View>
          {[...Array(3)].map((_, index) => (
            <SkeletonOrderCard key={index} />
          ))}
        </View>
      );
    }

    if (error && currentOrders.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={50} color="#F97316" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserOrders}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (currentOrders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1586769852836-bc069f19e1be?w=200&auto=format&fit=crop' }}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyTitle}>No active orders</Text>
          <Text style={styles.emptyText}>Browse our menu and place an order</Text>
          <TouchableOpacity
            style={styles.orderNowButton}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <Text style={styles.orderNowButtonText}>Order Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return currentOrders.map((order) => (
      <View key={order._id} style={styles.orderCard}>
        <TouchableOpacity
          style={styles.orderHeader}
          onPress={() => toggleOrderDetails(order._id)}
        >
          <View>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>

          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {order.status}
            </Text>
          </View>
        </TouchableOpacity>

        <View style={styles.deliveryTimeContainer}>
          <Clock size={16} color="#666" />
          <Text style={styles.deliveryTimeText}>
            {order.estimatedDeliveryTime
              ? `Estimated delivery: ${formatDate(order.estimatedDeliveryTime)}`
              : 'Processing your order...'}
          </Text>
        </View>

        {expandedOrder === order._id && (
          <View style={styles.orderDetails}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {renderOrderItems(order.items)}

            {renderStatusTimeline(order.statusUpdates)}

            {renderDeliveryAgentInfo(order.deliveryAgent)}

            <View style={styles.addressContainer}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <View style={styles.addressContent}>
                <MapPin size={16} color="#666" style={styles.addressIcon} />
                <Text style={styles.addressText}>{order.fullAddress}</Text>
              </View>
            </View>

            {renderInvoice(order)}
          </View>
        )}

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => toggleOrderDetails(order._id)}
        >
          <Text style={styles.viewDetailsText}>
            {expandedOrder === order._id ? 'Hide Details' : 'View Details'}
          </Text>
          <ChevronDown
            size={16}
            color="#F97316"
            style={{ transform: [{ rotate: expandedOrder === order._id ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>
    ));
  };

  // Render past orders
  const renderPastOrders = () => {
    if (loading && !refreshing && pastOrders.length === 0) {
      return (
        <View>
          {[...Array(3)].map((_, index) => (
            <SkeletonOrderCard key={index} />
          ))}
        </View>
      );
    }

    if (error && pastOrders.length === 0) {
      return (
        <View style={styles.errorContainer}>
          <AlertCircle size={50} color="#F97316" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchUserOrders}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      );
    }

    if (pastOrders.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1529079091004-2b0ed179f9f2?w=200&auto=format&fit=crop' }}
            style={styles.emptyImage}
          />
          <Text style={styles.emptyTitle}>No order history</Text>
          <Text style={styles.emptyText}>You haven't placed any orders yet</Text>
          <TouchableOpacity
            style={styles.orderNowButton}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <Text style={styles.orderNowButtonText}>Order Now</Text>
          </TouchableOpacity>
        </View>
      );
    }

    return pastOrders.map((order) => (
      <View key={order._id} style={styles.orderCard}>
        <TouchableOpacity
          style={styles.orderHeader}
          onPress={() => toggleOrderDetails(order._id)}
        >
          <View>
            <Text style={styles.orderNumber}>{order.orderNumber}</Text>
            <Text style={styles.orderDate}>{formatDate(order.createdAt)}</Text>
          </View>

          <View style={styles.statusContainer}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor(order.status) }]} />
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {order.status}
            </Text>
          </View>
        </TouchableOpacity>

        {order.items.length > 0 && (
          <View style={styles.orderSummary}>
            <View style={styles.summaryTextContainer}>
              <Text style={styles.summaryText}>
                {order.items[0].name} {order.items.length > 1 ? `+ ${order.items.length - 1} more` : ''}
              </Text>
              <Text style={styles.summaryTotal}>₹{order.amount.toFixed(2)}</Text>
            </View>
          </View>
        )}

        {expandedOrder === order._id && (
          <View style={styles.orderDetails}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {renderOrderItems(order.items)}

            {renderStatusTimeline(order.statusUpdates)}

            <View style={styles.addressContainer}>
              <Text style={styles.sectionTitle}>Delivery Address</Text>
              <View style={styles.addressContent}>
                <MapPin size={16} color="#666" style={styles.addressIcon} />
                <Text style={styles.addressText}>{order.fullAddress}</Text>
              </View>
            </View>

            {renderInvoice(order)}
          </View>
        )}

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={() => toggleOrderDetails(order._id)}
        >
          <Text style={styles.viewDetailsText}>
            {expandedOrder === order._id ? 'Hide Details' : 'View Details'}
          </Text>
          <ChevronDown
            size={16}
            color="#F97316"
            style={{ transform: [{ rotate: expandedOrder === order._id ? '180deg' : '0deg' }] }}
          />
        </TouchableOpacity>
      </View>
    ));
  };

  // Main render
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft} />
        <Text style={styles.title}>My Orders</Text>
        <TouchableOpacity
          onPress={() => router.push('../cart')}
          style={styles.cartIconContainer}
        >
          <AntDesign name="shoppingcart" size={24} color="#1F2937" />
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {isGuest ? (
        // Show the guest view if user is a guest
        renderGuestView()
      ) : (
        // Show the normal orders view for logged in users
        <>
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'current' && styles.activeTab]}
              onPress={() => setActiveTab('current')}
            >
              <Text style={[styles.tabText, activeTab === 'current' && styles.activeTabText]}>
                Current {currentOrders.length > 0 && `(${currentOrders.length})`}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.tab, activeTab === 'past' && styles.activeTab]}
              onPress={() => setActiveTab('past')}
            >
              <Text style={[styles.tabText, activeTab === 'past' && styles.activeTabText]}>
                Past {pastOrders.length > 0 && `(${pastOrders.length})`}
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.ordersContainer}
            contentContainerStyle={{ paddingBottom: 100 }}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#F97316']}
                tintColor="#F97316"
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'current' ? renderCurrentOrders() : renderPastOrders()}
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F8',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 45,
    paddingBottom: 10,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  headerLeft: {
    width: 24,
    height: 24,
  },
  headerRight: {
    width: 24,
    height: 24,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 15,
  },
  tab: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginRight: 10,
    borderRadius: 20,
    backgroundColor: '#F5F5F8',
  },
  activeTab: {
    backgroundColor: '#F97316',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  activeTabText: {
    color: '#fff',
  },
  ordersContainer: {
    flex: 1,
    padding: 20,
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  orderNumber: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000',
  },
  orderDate: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
  },
  deliveryTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  deliveryTimeText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#666',
  },
  orderSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  summaryTextContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  summaryText: {
    fontSize: 14,
    color: '#333',
    flex: 1,
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  orderDetails: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
    color: '#333',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemImage: {
    width: 48,
    height: 48,
    borderRadius: 8,
  },
  itemDetails: {
    flex: 1,
    marginLeft: 12,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  itemQuantity: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  itemCustomizations: {
    fontSize: 11,
    fontStyle: 'italic',
    color: '#888',
    marginTop: 2,
  },
  itemPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: '#000',
  },
  deliveryAgentContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  agentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
  },
  agentAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  agentAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: 'white',
  },
  agentPhoto: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  agentDetails: {
    flex: 1,
    marginLeft: 12,
  },
  agentName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  agentPhone: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  callButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  callButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  addressContainer: {
    marginVertical: 12,
  },
  addressContent: {
    flexDirection: 'row',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
  },
  addressIcon: {
    marginRight: 10,
    marginTop: 2,
  },
  addressText: {
    flex: 1,
    fontSize: 14,
    color: '#333',
    lineHeight: 20,
  },
  timelineContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  timelineItem: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  timelineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F97316',
    marginRight: 15,
    marginTop: 4,
  },
  timelineLine: {
    width: 2,
    height: 30,
    backgroundColor: '#E0E0E0',
    position: 'absolute',
    left: 5,
    top: 16,
  },
  timelineContent: {
    flex: 1,
  },
  timelineStatus: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  timelineTime: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  timelineNote: {
    fontSize: 12,
    color: '#888',
    marginTop: 2,
    fontStyle: 'italic',
  },
  invoiceContainer: {
    marginTop: 12,
    marginBottom: 12,
  },
  invoiceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 8,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    paddingTop: 12,
    marginTop: 4,
  },
  totalText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#F97316',
  },
  paymentMethod: {
    marginTop: 16,
  },
  paymentRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  paymentTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  paymentStatus: {
    fontSize: 13,
    fontWeight: '500',
  },

  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 12,
    marginBottom: 4,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: '#FFF8F1',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FFE7D3',
  },
  viewDetailsText: {
    color: '#F97316',
    fontSize: 13,
    fontWeight: '600',
    marginRight: 4,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    marginBottom: 20,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  orderNowButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  orderNowButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  guestContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  guestImage: {
    width: 200,
    height: 200,
    borderRadius: 16,
    marginBottom: 24,
  },
  guestTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c1917',
    textAlign: 'center',
    marginBottom: 16,
  },
  guestText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  guestButtonContainer: {
    flexDirection: 'row',
    marginBottom: 20,
    width: '100%',
  },
  guestLoginButton: {
    flex: 1,
    flexDirection: 'row',
    backgroundColor: '#1c1917',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3,
    elevation: 2,
  },
  guestLoginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  guestSignupButton: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1.5,
    borderColor: '#ddd',
    paddingVertical: 16,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  guestSignupButtonText: {
    color: '#1c1917',
    fontSize: 16,
    fontWeight: '600',
  },
  browseMenuButton: {
    flexDirection: 'row',
    backgroundColor: '#FEF3E7',
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  browseMenuButtonText: {
    color: '#F97316',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  skeletonBox: {
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
    marginBottom: 8,
    opacity: 0.7,
  },
  cartIconContainer: {
    position: 'relative',
    padding: 5,
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B00',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  },
});