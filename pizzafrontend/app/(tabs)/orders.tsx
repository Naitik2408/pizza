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
import { MapPin, Clock, Star, ChevronDown, ArrowLeft, X, AlertCircle, LogIn, ShoppingBag } from 'lucide-react-native';
import { API_URL } from '@/config';
import { RootState } from '../../redux/store';

// Define interface for order item
interface OrderItem {
  menuItemId?: string;
  name: string;
  quantity: number;
  price: number;
  size?: string;
  foodType?: string;
  image?: string;
  customizations?: Array<{
    name: string;
    option: string;
    price: number;
  }>;
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
  orderNumber: string;
  date: string;
  time: string;
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
  createdAt: string;
  notes?: string;
}

export default function OrdersScreen() {
  const router = useRouter();
  const { token, isGuest } = useSelector((state: RootState) => state.auth);

  const [activeTab, setActiveTab] = useState('current');
  const [expandedOrder, setExpandedOrder] = useState<string | null>(null);
  const [currentOrders, setCurrentOrders] = useState<Order[]>([]);
  const [pastOrders, setPastOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  type OrderStatus = 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';

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

  // Function to fetch user orders
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

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data = await response.json();

      // Filter orders into current and past orders
      const currentOrdersData = data.filter((order: Order) =>
        order.status !== 'Delivered' && order.status !== 'Cancelled'
      );

      const pastOrdersData = data.filter((order: Order) =>
        order.status === 'Delivered' || order.status === 'Cancelled'
      );

      // Update state with the fetched orders
      setCurrentOrders(currentOrdersData);
      setPastOrders(pastOrdersData);

    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load your orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, router, refreshing, isGuest]);


  // Add this function to your component
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

  // Toggle order details
  const toggleOrderDetails = (orderId: string): void => {
    setExpandedOrder(expandedOrder === orderId ? null : orderId);
  };

  // Format date for display
  const formatDate = (dateString: string): string => {
    const date = new Date(dateString);
    const today = new Date();

    if (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    ) {
      // Format as "Today, HH:MM AM/PM"
      return `Today, ${new Date(dateString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: 'numeric',
        hour12: true
      })}`;
    } else {
      // Format as "MMM DD, YYYY"
      return new Date(dateString).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      });
    }
  };

  // Cancel an order
  const handleCancelOrder = async (orderId: string) => {
    Alert.alert(
      'Cancel Order',
      'Are you sure you want to cancel this order?',
      [
        {
          text: 'No',
          style: 'cancel'
        },
        {
          text: 'Yes, Cancel',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_URL}/api/orders/my-orders/${orderId}/cancel`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                }
              });

              if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to cancel order');
              }

              // Show success message
              Alert.alert('Success', 'Your order has been cancelled successfully');

              // Refresh orders
              fetchUserOrders();
            } catch (err: any) {
              console.error('Error cancelling order:', err);
              Alert.alert('Error', err.message || 'Failed to cancel order. Please try again.');
            }
          }
        }
      ]
    );
  };

  // Submit a rating for an order
  const handleRateOrder = (orderId: string) => {
    Alert.alert(
      'Rate Your Order',
      'How would you rate your experience?',
      [
        { text: '1 ⭐', onPress: () => submitRating(orderId, 1) },
        { text: '2 ⭐⭐', onPress: () => submitRating(orderId, 2) },
        { text: '3 ⭐⭐⭐', onPress: () => submitRating(orderId, 3) },
        { text: '4 ⭐⭐⭐⭐', onPress: () => submitRating(orderId, 4) },
        { text: '5 ⭐⭐⭐⭐⭐', onPress: () => submitRating(orderId, 5) },
        { text: 'Cancel', style: 'cancel' }
      ]
    );
  };

  // Submit the rating to the API
  const submitRating = async (orderId: string, rating: number) => {
    try {
      const response = await fetch(`${API_URL}/api/orders/my-orders/${orderId}/rate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ rating })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to submit rating');
      }

      Alert.alert('Thank You!', 'Your rating has been submitted.');

      // Refresh orders to update UI
      fetchUserOrders();
    } catch (err: any) {
      console.error('Error submitting rating:', err);
      Alert.alert('Error', err.message || 'Failed to submit rating. Please try again.');
    }
  };

  // Reorder a past order
  const handleReorder = async (orderId: string) => {
    try {
      // Find the order in past orders
      const order = pastOrders.find(o => o._id === orderId);

      if (!order) {
        throw new Error('Order not found');
      }

      // Navigate to cart with these items
      router.push({
        pathname: '/cart',
        params: { reorder: orderId }
      });
    } catch (err: any) {
      console.error('Error reordering:', err);
      Alert.alert('Error', err.message || 'Failed to reorder. Please try again.');
    }
  };

  // Render order items
  const renderOrderItems = (items: OrderItem[]): JSX.Element[] => {
    return items.map((item, index) => (
      <View key={index} style={styles.orderItem}>
        <Image
          source={{
            uri: item.image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80'
          }}
          style={styles.itemImage}
        />
        <View style={styles.itemDetails}>
          <Text style={styles.itemName}>{item.name}</Text>
          <Text style={styles.itemQuantity}>
            x{item.quantity} {item.size && `• ${item.size}`}
          </Text>
          {item.customizations && item.customizations.length > 0 && (
            <Text style={styles.itemCustomizations}>
              {item.customizations.map(c => `${c.name}: ${c.option}`).join(', ')}
            </Text>
          )}
        </View>
        <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
      </View>
    ));
  };

  // Render invoice details
  const renderInvoice = (order: Order): JSX.Element => {
    // Calculate subtotal from items
    const subtotal = order.items.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    // Estimate tax and delivery fee
    const tax = order.amount * 0.05; // Assume 5% tax
    const deliveryFee = order.amount - subtotal - tax;

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

        <View style={[styles.invoiceRow, styles.totalRow]}>
          <Text style={styles.totalText}>Total</Text>
          <Text style={styles.totalPrice}>₹{order.amount.toFixed(2)}</Text>
        </View>

        <View style={styles.paymentMethod}>
          <Text style={styles.paymentTitle}>Payment Method</Text>
          <Text>{order.paymentMethod}</Text>
          <Text style={[
            styles.paymentStatus,
            { color: order.paymentStatus === 'Completed' ? '#4CAF50' : '#FFA500' }
          ]}>
            {order.paymentStatus}
          </Text>
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
  } | null | undefined): JSX.Element | null => {
    if (!agent) return null;

    return (
      <View style={styles.deliveryAgentContainer}>
        <Text style={styles.sectionTitle}>Delivery Agent</Text>
        <View style={styles.agentInfoContainer}>
          <Image
            source={{
              uri: agent.photo || 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=300&auto=format&fit=crop&q=80'
            }}
            style={styles.agentPhoto}
          />
          <View style={styles.agentDetails}>
            <Text style={styles.agentName}>{agent.name || 'Delivery Agent'}</Text>
            <Text style={styles.agentPhone}>{agent.phone || 'Contact not available'}</Text>
          </View>
          <TouchableOpacity style={styles.callButton}>
            <Text style={styles.callButtonText}>Call</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Render status timeline
  const renderStatusTimeline = (statusUpdates: StatusUpdate[]): JSX.Element => {
    if (!statusUpdates || statusUpdates.length === 0) {
      return <View />;
    }

    return (
      <View style={styles.timelineContainer}>
        <Text style={styles.sectionTitle}>Order Status</Text>
        {statusUpdates.map((update, index) => (
          <View key={index} style={styles.timelineItem}>
            <View style={styles.timelineDot} />
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

  // Render current orders
  const renderCurrentOrders = () => {
    if (loading && !refreshing && currentOrders.length === 0) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading your orders...</Text>
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
              ? `Estimated delivery: ${order.estimatedDeliveryTime}`
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

            {/* {(order.status === 'Pending' || order.status === 'Preparing') && (
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => handleCancelOrder(order._id)}
              >
                <X size={16} color="#fff" />
                <Text style={styles.cancelButtonText}>Cancel Order</Text>
              </TouchableOpacity>
            )} */}
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
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#F97316" />
          <Text style={styles.loadingText}>Loading your order history...</Text>
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
            <Image
              source={{
                uri: order.items[0].image || 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=300&auto=format&fit=crop&q=80'
              }}
              style={styles.summaryImage}
            />
            <Text style={styles.summaryText}>
              {order.items[0].name} {order.items.length > 1 ? `+ ${order.items.length - 1} more` : ''}
            </Text>
            <Text style={styles.summaryTotal}>₹{order.amount.toFixed(2)}</Text>
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

        <View style={styles.pastOrderActions}>
          <TouchableOpacity
            style={styles.reorderButton}
            onPress={() => handleReorder(order._id)}
          >
            <Text style={styles.reorderButtonText}>Reorder</Text>
          </TouchableOpacity>

          {order.status === 'Delivered' && !order.statusUpdates.some(update => update.note?.includes('rated')) && (
            <TouchableOpacity
              style={styles.rateButton}
              onPress={() => handleRateOrder(order._id)}
            >
              <Star size={16} color="#F97316" />
              <Text style={styles.rateButtonText}>Rate Order</Text>
            </TouchableOpacity>
          )}
        </View>

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
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <ArrowLeft size={24} color="#000" />
        </TouchableOpacity>
        <Text style={styles.title}>My Orders</Text>
        <View style={{ width: 24 }} />
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
            contentContainerStyle={{ paddingBottom: 100 }} // Add this line with bottom padding
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
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 20,
    backgroundColor: '#fff',
  },
  backButton: {
    padding: 8,
  },
  title: {
    fontSize: 20,
    fontWeight: '700',
    color: '#000',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
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
    padding: 16,
    marginBottom: 20,
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
    marginBottom: 10,
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
    marginBottom: 15,
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
  summaryImage: {
    width: 40,
    height: 40,
    borderRadius: 8,
  },
  summaryText: {
    flex: 1,
    marginLeft: 10,
    fontSize: 14,
    color: '#333',
  },
  summaryTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: '#000',
  },
  orderDetails: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 12,
    color: '#333',
  },
  orderItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
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
    marginTop: 20,
    marginBottom: 20,
  },
  agentInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F8F8',
    borderRadius: 12,
    padding: 12,
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
    marginVertical: 20,
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
    marginTop: 20,
    marginBottom: 20,
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
    marginTop: 20,
    marginBottom: 20,
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
  paymentTitle: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
    color: '#333',
  },
  paymentStatus: {
    fontSize: 13,
    marginTop: 4,
    fontWeight: '500',
  },
  pastOrderActions: {
    flexDirection: 'row',
    marginTop: 15,
    marginBottom: 10,
  },
  reorderButton: {
    backgroundColor: '#F97316',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
    marginRight: 12,
  },
  reorderButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
  },
  rateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0E6',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 20,
  },
  rateButtonText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 6,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 10,
  },
  viewDetailsText: {
    color: '#F97316',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 4,
  },
  cancelButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF3B30',
    paddingVertical: 12,
    borderRadius: 25,
    marginTop: 15,
  },
  cancelButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
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
});