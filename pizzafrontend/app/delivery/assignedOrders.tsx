import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  ScrollView,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Clipboard,
  Platform,
  PermissionsAndroid,
  Animated
} from 'react-native';
import {
  MapPin,
  Phone,
  MessageSquare,
  Clock,
  Check,
  Package,
  Truck,
  CreditCard,
  RefreshCw,
  Bell
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import store from '../../redux/store';
import { API_URL } from '@/config';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import { getSocket, initializeSocket, joinSocketRooms, onSocketEvent, offSocketEvent, isSocketConnected, ensureSocketConnection } from '@/src/utils/socket';
import { ZomatoLikePizzaAlarm } from '../../src/utils/nativeAlarmService';
import SystemLevelAlertService from '../../src/utils/systemLevelAlertService';
import * as Haptics from 'expo-haptics';
import { ErrorModal, SuccessModal, ConfirmationModal } from '../../src/components/modals';

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

// Define interfaces based on data received from orderController.js
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Customer {
  name: string;
  contact: string;
}

// Define the props interface for EmptyOrdersView
interface EmptyOrdersViewProps {
  onRefresh: () => void;
  lastRefresh: number;
  refreshing: boolean;
}

interface DeliveryAddress {
  street: string;
  city: string;
  country: string;
  notes?: string;
}

interface PickupLocation {
  name: string;
  address: string;
}

interface Order {
  id: string;
  _id: string; // MongoDB ID
  customer: Customer;
  items: OrderItem[];
  totalPrice: number;
  amount?: number; // Total amount field from backend
  subtotal?: number;
  subTotal?: number; // Handle both naming conventions
  tax?: number;
  deliveryFee?: number;
  deliveryAddress: DeliveryAddress;
  pickupLocation: PickupLocation;
  estimatedDeliveryTime: string;
  status: 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';
  paymentMethod: 'Cash on Delivery' | 'Online' | 'Card' | 'UPI';
  paymentStatus: 'Pending' | 'Completed' | 'Failed';
  distance: string;
  date: string;
}

// Improved skeleton loader component with animation
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
      <View style={styles.orderHeader}>
        <View>
          <View style={styles.skeletonText} />
          <View style={styles.skeletonBadge} />
        </View>
        <View style={styles.skeletonTime} />
      </View>
      <View style={styles.separator} />
      <View style={styles.customerSection}>
        <View style={styles.skeletonSectionTitle} />
        <View style={styles.skeletonName} />
        <View style={styles.contactButtons}>
          <View style={styles.skeletonButton} />
          <View style={[styles.skeletonButton, { marginLeft: 12 }]} />
        </View>
      </View>
      <View style={styles.locationInfo}>
        <View style={styles.skeletonMapIcon} />
        <View style={{ flex: 1, marginLeft: 12 }}>
          <View style={styles.skeletonAddressLabel} />
          <View style={styles.skeletonAddress} />
        </View>
      </View>
      <View style={styles.skeletonMap} />
      <View style={styles.orderDetails}>
        <View style={styles.skeletonSectionTitle} />
        <View style={styles.skeletonOrderItem} />
        <View style={styles.skeletonOrderItem} />
        <View style={styles.skeletonTotal} />
      </View>
      <View style={styles.skeletonActionButton} />
    </Animated.View>
  );
};

// Component for rendering the empty orders view
const EmptyOrdersView = ({ onRefresh, lastRefresh, refreshing }: EmptyOrdersViewProps) => {
  // Animation for the pulsing button
  const [pulseAnim] = useState(new Animated.Value(1));

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.1,
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
      <View style={styles.emptyImageContainer}>
        <Image
          source={{ uri: 'https://img.freepik.com/free-vector/way-concept-illustration_114360-1191.jpg?t=st=1748753832~exp=1748757432~hmac=3784bedcd9f3239dd53bbdd5ec8b26c59ce7194cbf147dec88e601d8ccb7318b&w=1380' }}
          style={styles.emptyImage}
        />
        {/* <View style={styles.emptyBadge}>
          <Clock size={18} color="#FF6B00" />
          <Text style={styles.emptyBadgeText}>Standby</Text>
        </View> */}
      </View>

      <View style={styles.emptyContentContainer}>
        {/* <Text style={styles.emptyTitle}>No Orders Yet</Text>
        <Text style={styles.emptyDescription}>
          You're all caught up! New delivery assignments will appear here when they're ready.
        </Text> */}

        <View style={styles.notificationContainer}>
          <Bell size={20} color="#FF6B00" />
          <Text style={styles.notificationText}>
            You'll receive notifications when new orders are assigned to you.
          </Text>
        </View>

        <View style={styles.emptyTipsContainer}>
          <Text style={styles.emptyTipsTitle}>While You Wait:</Text>
          <View style={styles.emptyTipGrid}>
            <View style={styles.emptyTipBox}>
              <View style={styles.tipIconCircle}>
                <Truck size={18} color="#FF6B00" />
              </View>
              <Text style={styles.emptyTipText}>Prepare your vehicle</Text>
            </View>

            <View style={styles.emptyTipBox}>
              <View style={styles.tipIconCircle}>
                <Phone size={18} color="#FF6B00" />
              </View>
              <Text style={styles.emptyTipText}>Ensure phone is charged</Text>
            </View>

            <View style={styles.emptyTipBox}>
              <View style={styles.tipIconCircle}>
                <MapPin size={18} color="#FF6B00" />
              </View>
              <Text style={styles.emptyTipText}>Stay in delivery zone</Text>
            </View>
          </View>
        </View>

        {/* <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
          <TouchableOpacity
            style={styles.pulsingRefreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <>
                <RefreshCw size={18} color="#FFFFFF" />
                <Text style={styles.refreshButtonText}>Check for New Orders</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View> */}

        <Text style={styles.lastRefreshText}>
          Last checked: {new Date(lastRefresh).toLocaleTimeString()}
        </Text>
      </View>
    </View>
  );
};

// Function to calculate subtotal from items
const calculateSubtotal = (items: OrderItem[] = []) => {
  return items.reduce((total, item) => total + (item.price * item.quantity), 0);
};

const AssignedOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, name, email, role, userId } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  // Modal states
  const [errorModal, setErrorModal] = useState({ visible: false, title: '', message: '' });
  const [successModal, setSuccessModal] = useState({ visible: false, title: '', message: '' });
  const [confirmationModal, setConfirmationModal] = useState({ 
    visible: false, 
    title: '', 
    message: '', 
    onConfirm: () => {},
    confirmText: 'Confirm',
    confirmColor: '#F44336'
  });

  // Modal helper functions
  const showErrorModal = (title: string, message: string) => {
    setErrorModal({ visible: true, title, message });
  };

  const showSuccessModal = (title: string, message: string) => {
    setSuccessModal({ visible: true, title, message });
  };

  const showConfirmationModal = (
    title: string, 
    message: string, 
    onConfirm: () => void, 
    confirmText = 'Confirm',
    confirmColor = '#F44336'
  ) => {
    setConfirmationModal({ 
      visible: true, 
      title, 
      message, 
      onConfirm, 
      confirmText,
      confirmColor 
    });
  };

  const closeErrorModal = () => {
    setErrorModal({ visible: false, title: '', message: '' });
  };

  const closeSuccessModal = () => {
    setSuccessModal({ visible: false, title: '', message: '' });
  };

  const closeConfirmationModal = () => {
    setConfirmationModal({ 
      visible: false, 
      title: '', 
      message: '', 
      onConfirm: () => {},
      confirmText: 'Confirm',
      confirmColor: '#F44336'
    });
  };

  const fetchOrders = useCallback(async () => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }

    if (!refreshing) setLoading(true);
    setError(null);

    try {
      console.log('Fetching assigned orders for delivery agent...');
      console.log(`Current delivery agent: ${name} (${email})`);

      const response = await fetch(`${API_URL}/api/delivery/orders/assigned`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      // Check if response has no content
      if (response.status === 204) {
        console.log('No orders found');
        setOrders([]);
        setLastRefresh(Date.now());
        setLoading(false);
        setRefreshing(false);
        return;
      }

      // Check for other error responses
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch orders');
      }

      // Try to parse the response and handle unexpected data formats
      const data = await response.json().catch(err => {
        console.error('Error parsing JSON response:', err);
        throw new Error('Invalid server response');
      });

      // Handle different response formats (array or object with orders property)
      const ordersArray = Array.isArray(data) ? data : data.orders || [];
      console.log(`Fetched ${ordersArray.length} assigned orders`);

      // Validate order data before setting state
      const validOrders = ordersArray
        .filter((order: any) => order && order._id)
        .map((order: any) => ({
          ...order,
          // Ensure required fields have default values
          id: order.id || order._id || `temp-${Date.now()}`,
          _id: order._id || `temp-${Date.now()}`,
          customer: order.customer || { name: 'Customer', contact: 'N/A' },
          items: Array.isArray(order.items) ? order.items : [],
          totalPrice: order.totalPrice || order.amount || 0,
          subtotal: order.subtotal || order.subTotal || 0,
          tax: typeof order.tax === 'number' ? order.tax : 0,
          deliveryFee: typeof order.deliveryFee === 'number' ? order.deliveryFee : 0,
          deliveryAddress: order.deliveryAddress || { street: 'N/A', city: 'N/A', country: 'N/A' },
          pickupLocation: order.pickupLocation || { name: 'Restaurant', address: 'Restaurant Address' },
          status: order.status || 'Pending',
          paymentMethod: order.paymentMethod || 'N/A',
          paymentStatus: order.paymentStatus || 'N/A',
          estimatedDeliveryTime: order.estimatedDeliveryTime || 'Processing'
        }));

      setOrders(validOrders);
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
      // Don't crash the app, set empty orders array as fallback
      setOrders([]);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, router, refreshing, name, email]);

  const updateOrderStatus = async (orderId: string, newStatus: Order['status']) => {
    if (!token) return;

    try {
      // Find the order in our orders array
      const orderToUpdate = orders.find(order => order.id === orderId);

      if (!orderToUpdate) {
        console.error(`Order with ID ${orderId} not found in local state`);
        return;
      }

      // Check if this is a cash on delivery order and is being marked as delivered
      if (
        orderToUpdate.paymentMethod === 'Cash on Delivery' &&
        orderToUpdate.paymentStatus === 'Pending' &&
        newStatus === 'Delivered'
      ) {
        // Show alert to collect payment first
        showConfirmationModal(
          'Payment Required',
          'This order requires cash on delivery payment. Please collect payment before completing delivery.',
          () => {
            closeConfirmationModal();
            // Navigate to QR scanner with the selected order
            router.push({
              pathname: '/delivery/qrscanner',
              params: { orderId: orderToUpdate._id }
            });
          },
          'Collect Payment',
          '#FF6B00'
        );
        return;
      }

      // Use the MongoDB _id for the API call
      const mongoId = orderToUpdate._id;
      console.log(`Updating order ${orderId} (MongoDB ID: ${mongoId}) status to ${newStatus}`);

      const response = await fetch(`${API_URL}/api/orders/${mongoId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          note: `Status updated to ${newStatus} by delivery agent`,
          updatedBy: 'delivery'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to update order status');
      }

      const updatedOrder = await response.json();

      // Update local state with the response data
      setOrders(orders.map(order => {
        if (order.id === orderId) {
          return { ...order, status: newStatus, ...updatedOrder };
        }
        return order;
      }));

      // Trigger haptic feedback for successful update
      try {
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } catch (hapticError) {
        console.log('Haptic feedback not available:', hapticError);
      }

      // Emit socket event for real-time updates to admin and other systems
      const socket = getSocket();
      if (socket) {
        socket.emit('orderStatusUpdated', {
          orderId: mongoId,
          status: newStatus,
          updatedBy: 'delivery',
          deliveryAgent: name,
          timestamp: new Date().toISOString()
        });
      }

      // Show success message
      showSuccessModal('Success', `Order status updated to ${newStatus}`);

      // If delivered, refresh the list to remove the order after a short delay
      if (newStatus === 'Delivered') {
        setTimeout(() => fetchOrders(), 1000);
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
      showErrorModal('Error', err.message || 'Failed to update order status. Please try again.');
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const callCustomer = async (phoneNumber: string) => {
    try {
      if (!phoneNumber) {
        showErrorModal("Error", "No phone number available");
        return;
      }

      // Format phone number (remove spaces, etc.)
      const formattedNumber = phoneNumber.replace(/\s/g, '');

      // Create the phone URL
      const phoneUrl = `tel:${formattedNumber}`;

      // Check if device supports phone calls
      const supported = await Linking.canOpenURL(phoneUrl);

      if (supported) {
        await Linking.openURL(phoneUrl);
      } else {
        showConfirmationModal(
          "Device Limitation",
          "Your device doesn't support making calls. Would you like to copy the number?",
          () => {
            closeConfirmationModal();
            Clipboard.setString(phoneNumber);
            showSuccessModal("Success", "Phone number copied to clipboard");
          },
          "Copy Number",
          "#FF6B00"
        );
      }
    } catch (error) {
      console.error('Error making phone call:', error);
      showErrorModal("Error", "Failed to make call. Please try again.");
    }
  };

  // Message customer functionality
  const messageCustomer = (phoneNumber: string) => {
    console.log(`Attempting to message customer at: ${phoneNumber}`);

    // Check if phone number is valid
    if (!phoneNumber || phoneNumber.trim() === '') {
      console.error('Invalid phone number');
      showErrorModal("Error", "Invalid phone number");
      return;
    }

    const smsUrl = `sms:${phoneNumber.trim()}`;

    Linking.canOpenURL(smsUrl)
      .then(supported => {
        if (supported) {
          console.log(`Opening messaging app with number: ${phoneNumber}`);
          return Linking.openURL(smsUrl);
        } else {
          console.error('SMS not supported on this device');
          showErrorModal("Error", "SMS is not supported on this device");
        }
      })
      .catch(err => {
        console.error('Error initiating SMS:', err);
        showErrorModal("Error", "Could not open messaging app. Please try again.");
      });
  };

  // Navigate to QR payment screen with specific order
  const navigateToPaymentScreen = (order: Order) => {
    router.push({
      pathname: '/delivery/qrscanner',
      params: { orderId: order._id }
    });
  };

  // Get next status in the flow - matches backend order statuses for delivery agents
  const getNextStatus = (currentStatus: Order['status']): Order['status'] => {
    switch (currentStatus) {
      case 'Preparing': return 'Out for delivery';
      case 'Out for delivery': return 'Delivered';
      default: return currentStatus;
    }
  };

  // Color coding for different statuses
  const getStatusColor = (status: Order['status']): string => {
    switch (status) {
      case 'Pending': return '#FFA500';      // Orange
      case 'Preparing': return '#3498DB';    // Blue
      case 'Out for delivery': return '#9B59B6'; // Purple
      case 'Delivered': return '#2ECC71';    // Green
      case 'Cancelled': return '#E74C3C';    // Red
      default: return '#7F8C8D';             // Gray
    }
  };

  // Icon selection for different statuses
  const getStatusIcon = (status: Order['status']) => {
    switch (status) {
      case 'Pending': return <Package size={18} color="#FFA500" />;
      case 'Preparing': return <Package size={18} color="#3498DB" />;
      case 'Out for delivery': return <Truck size={18} color="#9B59B6" />;
      case 'Delivered': return <Check size={18} color="#2ECC71" />;
      case 'Cancelled': return <Package size={18} color="#E74C3C" />;
      default: return null;
    }
  };

  // REMOVED: Periodic refresh since we're using real-time socket updates
  // useEffect(() => {
  //   const intervalId = setInterval(() => {
  //     if (!refreshing && (Date.now() - lastRefresh) > 30000) {
  //       fetchOrders();
  //     }
  //   }, 30000);

  //   return () => clearInterval(intervalId);
  // }, [fetchOrders, refreshing, lastRefresh]);

  // Load orders on component mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Socket integration for real-time updates
  useEffect(() => {
    const setupSocketListener = async () => {
      let socket = getSocket();
      
      // Get current auth state - use the component's state first, then fallback to store
      const currentUserId = userId || store.getState().auth.userId;
      const currentToken = token || store.getState().auth.token;
      const currentRole = role || store.getState().auth.role;
      
      console.log('🔌 Setting up socket for delivery agent:', { 
        userId: currentUserId, 
        role: currentRole,
        hasToken: !!currentToken,
        socketExists: !!socket,
        socketConnected: socket?.connected,
        userEmail: email,
        userName: name
      });
      
      // If we don't have userId, we can't proceed
      if (!currentUserId) {
        console.error('❌ No userId available for socket setup');
        return;
      }
      
      // If socket is not available, try to initialize it
      if (!socket) {
        console.log('Socket not found, attempting to initialize...');
        
        if (currentToken && currentUserId) {
          socket = initializeSocket(currentToken);
          if (socket) {
            console.log('🏠 Joining socket rooms for user:', currentUserId, 'role:', currentRole);
            await joinSocketRooms(currentUserId, currentRole);
          }
        }
      } else if (!socket.connected) {
        console.log('Socket exists but not connected, reconnecting...');
        socket = ensureSocketConnection(currentToken);
        if (socket && currentUserId) {
          console.log('🏠 Joining socket rooms after reconnect:', currentUserId, 'role:', currentRole);
          await joinSocketRooms(currentUserId, currentRole);
        }
      } else {
        console.log('Socket already connected, ensuring rooms are joined...');
        if (currentUserId && currentRole) {
          console.log('🏠 Re-joining socket rooms:', currentUserId, 'role:', currentRole);
          await joinSocketRooms(currentUserId, currentRole);
        }
      }

      // Handler for new orders assigned to this delivery agent
      const handleNewOrderAssigned = async (orderData: any) => {
        console.log('✅ New order assigned to delivery agent:', orderData);
        
        try {
          // Trigger haptic feedback
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          
          // Play system-level alarm for new assignment
          console.log('🔊 Triggering system-level alert...');
          try {
            await SystemLevelAlertService.sendSystemLevelAlert({
              orderId: orderData._id || orderData.orderNumber,
              orderNumber: orderData.orderNumber || `#${orderData._id}`,
              customerName: orderData.customerName || 'Customer',
              amount: orderData.amount || 0
            });
            console.log('✅ System-level alert triggered');
          } catch (alertError) {
            console.warn('⚠️ System alert failed:', alertError);
            // Continue - we'll still show the popup alert
          }
          
          // Set urgent alarm for new order assignment
          console.log('📢 Setting urgent alarm...');
          try {
            await ZomatoLikePizzaAlarm.setUrgentOrderAlarm({
              orderId: orderData._id || orderData.orderNumber,
              orderNumber: orderData.orderNumber || `#${orderData._id}`,
              customerName: orderData.customerName || 'Customer',
              amount: orderData.amount || 0
            });
            console.log('✅ Urgent alarm set');
          } catch (alarmError) {
            console.warn('⚠️ Native alarm not available:', alarmError);
            // Continue without alarm - notification will still work
          }
          
          // Show alert to user
          showConfirmationModal(
            '🍕 New Delivery Assignment!',
            `Order ${orderData.orderNumber || orderData._id} has been assigned to you. Customer: ${orderData.customerName || 'N/A'}`,
            () => {
              closeConfirmationModal();
              // Refresh orders to show the new assignment
              fetchOrders();
            },
            'View Order',
            '#FF6B00'
          );
          
          // Refresh orders to show the new assignment
          fetchOrders();
          
        } catch (error) {
          console.error('Error handling new order assignment:', error);
          // Still show the alert even if alarm fails
          showConfirmationModal(
            '🍕 New Delivery Assignment!',
            `Order ${orderData.orderNumber || orderData._id} has been assigned to you. Customer: ${orderData.customerName || 'N/A'}`,
            () => {
              closeConfirmationModal();
              // Refresh orders to show the new assignment
              fetchOrders();
            },
            'View Order',
            '#FF6B00'
          );
          fetchOrders();
        }
      };

      // Handler for order status updates
      const handleOrderStatusUpdate = (updateData: any) => {
        console.log('✅ Order status updated:', updateData);
        
        // Update the specific order in local state
        setOrders(prevOrders => 
          prevOrders.map(order => 
            (order.id === updateData.orderNumber || order._id === updateData._id || order._id === updateData.orderId)
              ? { 
                  ...order, 
                  status: updateData.status || order.status,
                  paymentStatus: updateData.paymentStatus || order.paymentStatus
                }
              : order
          )
        );
        
        // If order was delivered or cancelled, remove it from the list after a short delay
        if (updateData.status === 'Delivered' || updateData.status === 'Cancelled') {
          setTimeout(() => {
            setOrders(prevOrders => 
              prevOrders.filter(order => 
                order.id !== updateData.orderNumber && 
                order._id !== updateData._id &&
                order._id !== updateData.orderId
              )
            );
          }, 2000);
        }
      };

      // Handler for order cancellations/unassignments
      const handleOrderCancelled = async (orderData: any) => {
        console.log('⚠️ Order unassigned/cancelled:', orderData);
        
        try {
          // Trigger haptic feedback for cancellation
          await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
          
          // Show cancellation alert
          showErrorModal(
            '⚠️ Order Unassigned',
            `Order ${orderData.orderNumber || orderData._id} has been unassigned or cancelled.`
          );
          
          // Remove the cancelled order from local state
          setOrders(prevOrders => 
            prevOrders.filter(order => 
              order.id !== orderData.orderNumber && 
              order._id !== orderData._id
            )
          );
          
        } catch (error) {
          console.error('Error handling order cancellation:', error);
        }
      };

      // Set up socket event listeners
      if (socket) {
        console.log('Setting up delivery agent socket listeners');
        
        // Listen for new order assignments specifically for this delivery agent
        onSocketEvent('new_order_assigned', handleNewOrderAssigned);
        
        // Listen for order status updates (assigned_order_update from backend)
        onSocketEvent('assigned_order_update', handleOrderStatusUpdate);
        
        // Listen for order status updates from other screens (like QR payment screen)
        onSocketEvent('orderStatusUpdated', handleOrderStatusUpdate);
        
        // Listen for order cancellations
        onSocketEvent('order_unassigned', handleOrderCancelled);
        
        // Handle socket connection events
        socket.on('connect', () => {
          console.log('✅ Socket connected in delivery orders screen');
          console.log('🔗 Socket ID:', socket.id);
          // Re-join rooms on reconnection
          const currentUserId = userId || store.getState().auth.userId;
          const currentRole = role || store.getState().auth.role;
          console.log('👤 Rejoining rooms with:', { userId: currentUserId, role: currentRole });
          if (currentUserId) {
            console.log('🏠 Joining rooms: user:' + currentUserId + ' and role:' + currentRole);
            joinSocketRooms(currentUserId, currentRole);
          }
        });
        
        socket.on('disconnect', () => {
          console.log('❌ Socket disconnected in delivery orders screen');
        });

        socket.on('reconnect', () => {
          console.log('🔄 Socket reconnected in delivery orders screen');
          const currentUserId = userId || store.getState().auth.userId;
          const currentRole = role || store.getState().auth.role;
          console.log('👤 Rejoining rooms after reconnect:', { userId: currentUserId, role: currentRole });
          if (currentUserId) {
            console.log('🏠 Joining rooms after reconnect: user:' + currentUserId + ' and role:' + currentRole);
            joinSocketRooms(currentUserId, currentRole);
          }
        });

        // Add general socket event listener for debugging
        socket.onAny((event, ...args) => {
          console.log(`🔔 Socket event received: ${event}`, args);
          
          // Special debug for delivery-related events
          if (event.includes('order') || event.includes('delivery') || event.includes('assigned')) {
            console.log(`🎯 DELIVERY-RELATED EVENT: ${event}`, JSON.stringify(args, null, 2));
          }
        });

        // Listen for specific events that might be coming with different names
        socket.on('delivery_assignment_update', (data) => {
          console.log('📦 Received delivery_assignment_update:', data);
          // This might be the event we're actually receiving
          if (data.deliveryAgent && data.deliveryAgent.toString() === currentUserId) {
            console.log('🎯 This assignment is for current user!');
            handleNewOrderAssigned(data);
          }
        });

        socket.on('order_update', (data) => {
          console.log('📦 Received order_update:', data);
          if (data.triggerType === 'delivery_assignment' && data.deliveryAgent && data.deliveryAgent.toString() === currentUserId) {
            console.log('🎯 Order update is for current user (delivery assignment)!');
            handleNewOrderAssigned(data);
          }
        });
      } else {
        console.log('⚠️ Socket not available for delivery orders listener');
      }

      // Return cleanup function
      return () => {
        console.log('Cleaning up delivery orders socket listeners');
        offSocketEvent('new_order_assigned', handleNewOrderAssigned);
        offSocketEvent('assigned_order_update', handleOrderStatusUpdate);
        offSocketEvent('orderStatusUpdated', handleOrderStatusUpdate);
        offSocketEvent('order_unassigned', handleOrderCancelled);
      };
    };

    // Set up socket and store cleanup function
    let cleanup: (() => void) | null = null;
    setupSocketListener().then(cleanupFn => {
      cleanup = cleanupFn || null;
    });

    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, [fetchOrders]); // Dependency on fetchOrders to ensure we have the latest function

  // Periodic socket connection check - runs every 30 seconds
  useEffect(() => {
    const connectionCheckInterval = setInterval(async () => {
      if (!isSocketConnected()) {
        console.log('Socket connection lost in delivery orders, attempting to reconnect...');
        const currentUserId = userId || store.getState().auth.userId;
        const currentToken = token || store.getState().auth.token;
        const currentRole = role || store.getState().auth.role;
        
        if (currentToken && currentUserId) {
          const socket = await ensureSocketConnection(currentToken);
          if (socket) {
            console.log('🏠 Rejoining rooms after connection check:', currentUserId, 'role:', currentRole);
            await joinSocketRooms(currentUserId, currentRole);
          }
        }
      }
    }, 30000); // Check every 30 seconds

    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, [userId, token, role]); // Add dependencies to ensure we have latest values

  // Show only active orders (not Delivered or Cancelled)
  const activeOrders = orders.filter(order =>
    order.status !== 'Delivered' && order.status !== 'Cancelled'
  );

  // Render loading state with skeleton
  const renderLoadingSkeletons = () => (
    <>
      <OrderSkeleton />
      <OrderSkeleton />
    </>
  );

  const renderOrderItem = ({ item }: { item: Order }) => {
    // Check if this order needs payment collection
    const needsPaymentCollection =
      item.status === 'Out for delivery' &&
      item.paymentMethod === 'Cash on Delivery' &&
      item.paymentStatus === 'Pending';

    // Calculate/retrieve financial details with fallbacks
    const subtotal = item.subtotal || item.subTotal || calculateSubtotal(item.items);
    const tax = typeof item.tax === 'number' ? item.tax : 0;
    const deliveryFee = typeof item.deliveryFee === 'number' ? item.deliveryFee : 0;
    const totalAmount = item.totalPrice || item.amount || (subtotal + tax + deliveryFee);

    // Generate customer avatar
    const customerInitials = getInitials(item.customer.name);
    const avatarColor = generateColorFromName(item.customer.name);

    return (
      <View style={styles.orderCard}>
        {/* Modern Order Header with improved layout */}
        <View style={styles.orderHeader}>
          <View style={styles.orderIdContainer}>
            <Package size={16} color="#1c1917" />
            <Text style={styles.orderId}>#{item.id}</Text>
          </View>
          <View style={styles.statusContainer}>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) + '20' }]}>
              {getStatusIcon(item.status)}
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>
        </View>

        {/* Time and Payment Info Row */}
        <View style={styles.infoRow}>
          <View style={styles.timeContainer}>
            <Clock size={14} color="#666" />
            <Text style={styles.deliveryTime}>{item.estimatedDeliveryTime}</Text>
          </View>
          {item.paymentMethod === 'Cash on Delivery' && (
            <View style={[styles.paymentBadge, {
              backgroundColor: item.paymentStatus === 'Pending' ? '#FF6B0015' : '#2ECC7115'
            }]}>
              <CreditCard size={12} color={item.paymentStatus === 'Pending' ? '#FF6B00' : '#2ECC71'} />
              <Text style={[styles.paymentBadgeText, {
                color: item.paymentStatus === 'Pending' ? '#FF6B00' : '#2ECC71'
              }]}>
                {item.paymentStatus === 'Pending' ? 'COD Pending' : 'COD Paid'}
              </Text>
            </View>
          )}
        </View>

        {/* Enhanced Customer Section with Avatar */}
        <View style={styles.customerSection}>
          <View style={[styles.customerAvatar, { backgroundColor: avatarColor }]}>
            <Text style={styles.customerAvatarText}>{customerInitials}</Text>
          </View>
          <View style={styles.customerInfo}>
            <Text style={styles.customerName}>{item.customer.name}</Text>
            <View style={styles.contactButtons}>
              <TouchableOpacity
                style={styles.contactButton}
                onPress={() => callCustomer(item.customer.contact)}
              >
                <Phone size={14} color="#fff" />
                <Text style={styles.contactButtonText}>Call</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.contactButton, styles.messageButton]}
                onPress={() => messageCustomer(item.customer.contact)}
              >
                <MessageSquare size={14} color="#fff" />
                <Text style={styles.contactButtonText}>SMS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Enhanced Address Section */}
        <View style={styles.addressSection}>
          <View style={styles.addressHeader}>
            <MapPin size={16} color="#FF6B00" />
            <Text style={styles.addressLabel}>Delivery Address</Text>
          </View>
          <Text style={styles.addressText}>{item.deliveryAddress.street}</Text>
          <Text style={styles.addressSubText}>
            {item.deliveryAddress.city}, {item.deliveryAddress.country}
          </Text>
          {item.deliveryAddress.notes && (
            <Text style={styles.addressNotes}>Note: {item.deliveryAddress.notes}</Text>
          )}
        </View>

        {/* Improved Order Summary */}
        <View style={styles.orderSummary}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.itemsContainer}>
            {item.items && item.items.slice(0, 2).map((orderItem, index) => (
              <View key={`${item.id}-item-${index}`} style={styles.orderItemRow}>
                <Text style={styles.itemQuantity}>{orderItem.quantity}×</Text>
                <Text style={styles.itemName}>{orderItem.name}</Text>
                <Text style={styles.itemPrice}>₹{(orderItem.price * orderItem.quantity).toFixed(2)}</Text>
              </View>
            ))}
            {item.items && item.items.length > 2 && (
              <Text style={styles.moreItems}>+{item.items.length - 2} more items</Text>
            )}
          </View>

          {/* Enhanced Price Breakdown */}
          <View style={styles.priceBreakdown}>
            <View style={styles.priceRow}>
              <Text style={styles.priceLabel}>Subtotal</Text>
              <Text style={styles.priceValue}>₹{subtotal.toFixed(2)}</Text>
            </View>
            {tax > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Tax</Text>
                <Text style={styles.priceValue}>₹{tax.toFixed(2)}</Text>
              </View>
            )}
            {deliveryFee > 0 && (
              <View style={styles.priceRow}>
                <Text style={styles.priceLabel}>Delivery Fee</Text>
                <Text style={styles.priceValue}>₹{deliveryFee.toFixed(2)}</Text>
              </View>
            )}
            <View style={styles.divider} />
            <View style={styles.priceRow}>
              <Text style={styles.totalLabel}>Total Amount</Text>
              <Text style={styles.totalPrice}>₹{totalAmount.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Enhanced Action Button */}
        {item.status !== 'Delivered' && item.status !== 'Cancelled' && (
          <View style={styles.actionContainer}>
            {needsPaymentCollection ? (
              <TouchableOpacity
                style={styles.collectPaymentButton}
                onPress={() => navigateToPaymentScreen(item)}
              >
                <CreditCard size={18} color="#FFFFFF" />
                <Text style={styles.actionButtonText}>Collect Payment</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.updateStatusButton, { backgroundColor: getStatusColor(getNextStatus(item.status)) }]}
                onPress={() => {
                  setSelectedOrder(item);

                  if (getNextStatus(item.status) === 'Delivered' &&
                    item.paymentMethod === 'Cash on Delivery' &&
                    item.paymentStatus === 'Pending') {
                    showConfirmationModal(
                      'Payment Required',
                      'Please collect payment before completing the delivery.',
                      () => {
                        closeConfirmationModal();
                        navigateToPaymentScreen(item);
                      },
                      'Collect Payment',
                      '#FF6B00'
                    );
                    return;
                  }

                  updateOrderStatus(item.id, getNextStatus(item.status));
                }}
              >
                <Text style={styles.actionButtonText}>
                  {item.status === 'Preparing' ? 'Start Delivery' : 'Complete Delivery'}
                </Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Assigned Orders</Text>
          <Text style={styles.subtitle}>
            {activeOrders.length} active {activeOrders.length === 1 ? 'delivery' : 'deliveries'}
            {refreshing ? ' • Refreshing...' : ''}
          </Text>
        </View>
      </View>

      {loading && !refreshing && orders.length === 0 ? (
        <View style={styles.ordersList}>
          {renderLoadingSkeletons()}
        </View>
      ) : activeOrders.length === 0 && !loading ? (
        <ScrollView
          contentContainerStyle={{ flex: 1 }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B00', '#2ecc71']}
              tintColor="#FF6B00"
              title="Checking for new orders..."
              titleColor="#636e72"
            />
          }
        >
          <EmptyOrdersView
            onRefresh={onRefresh}
            lastRefresh={lastRefresh}
            refreshing={refreshing}
          />
        </ScrollView>
      ) : (
        <FlatList
          data={activeOrders}
          renderItem={renderOrderItem}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.ordersList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FF6B00', '#2ecc71']}
              tintColor="#FF6B00"
              title="Checking for new orders..."
              titleColor="#636e72"
            />
          }
        />
      )}

      {error && !refreshing && !loading && (
        <View style={styles.errorOverlay}>
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        title={errorModal.title}
        message={errorModal.message}
        onClose={closeErrorModal}
      />

      {/* Success Modal */}
      <SuccessModal
        visible={successModal.visible}
        title={successModal.title}
        message={successModal.message}
        onClose={closeSuccessModal}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmationModal.visible}
        title={confirmationModal.title}
        message={confirmationModal.message}
        onConfirm={confirmationModal.onConfirm}
        confirmText={confirmationModal.confirmText}
        confirmColor={confirmationModal.confirmColor}
        onCancel={closeConfirmationModal}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
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
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    zIndex: 10,
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  ordersList: {
    padding: 15,
    paddingBottom: 120,
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
  statusContainer: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryTime: {
    fontSize: 13,
    color: '#666',
    marginLeft: 4,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
  },
  paymentBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    marginLeft: 4,
  },
  customerSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 10,
    padding: 12,
    marginBottom: 15,
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
  customerName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 8,
  },
  contactButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  messageButton: {
    backgroundColor: '#8B5CF6',
  },
  contactButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  addressSection: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  addressLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1c1917',
    marginLeft: 6,
  },
  addressText: {
    fontSize: 14,
    color: '#1c1917',
    marginBottom: 4,
  },
  addressSubText: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  addressNotes: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
  },
  orderSummary: {
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 10,
  },
  itemsContainer: {
    marginBottom: 12,
  },
  orderItemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
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
  moreItems: {
    fontSize: 12,
    color: '#8B5CF6',
    fontStyle: 'italic',
    marginTop: 4,
    paddingLeft: 29,
  },
  priceBreakdown: {
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    padding: 12,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  priceLabel: {
    fontSize: 13,
    color: '#666',
  },
  priceValue: {
    fontSize: 13,
    fontWeight: '500',
    color: '#1c1917',
  },
  divider: {
    height: 1,
    backgroundColor: '#E5E7EB',
    marginVertical: 8,
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  actionContainer: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
  },
  collectPaymentButton: {
    backgroundColor: '#FF6B00',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  updateStatusButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
  errorOverlay: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    alignItems: 'center',
  },
  errorContainer: {
    backgroundColor: 'rgba(231, 76, 60, 0.9)',
    borderRadius: 10,
    padding: 16,
    width: '100%',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 5,
  },
  errorText: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 12,
    textAlign: 'center',
  },
  retryButton: {
    backgroundColor: '#fff',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#e74c3c',
    fontSize: 14,
    fontWeight: '600',
  },
  // Improved empty state styles
  emptyContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  emptyContentContainer: {
    alignItems: 'center',
    padding: 24,
    paddingTop: 0,
    paddingBottom: 60,
    width: '100%',
  },
  emptyImageContainer: {
    position: 'relative',
    marginBottom: 20,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  emptyImage: {
    width: 220,
    height: 220,
    resizeMode: 'contain',
  },
  emptyBadge: {
    position: 'absolute',
    bottom: -10,
    right: -10,
    backgroundColor: '#FFF',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyBadgeText: {
    color: '#FF6B00',
    fontWeight: 'bold',
    marginLeft: 5,
    fontSize: 14,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 12,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 16,
    color: '#636e72',
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 22,
    paddingHorizontal: 20,
  },
  notificationContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF0E6',
    padding: 16,
    borderRadius: 12,
    marginBottom: 24,
    width: '100%',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  notificationText: {
    color: '#333',
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
  },
  emptyTipsContainer: {
    width: '100%',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    borderWidth: 1,
    borderColor: '#f0f0f0',
  },
  emptyTipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 16,
  },
  emptyTipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  emptyTipBox: {
    width: '31%',
    backgroundColor: '#f8f9fa',
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tipIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF0E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  emptyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTipText: {
    marginTop: 4,
    fontSize: 12,
    color: '#636e72',
    textAlign: 'center',
  },
  pulsingRefreshButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 30,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#FF6B00',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    minWidth: 220,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  lastRefreshText: {
    fontSize: 12,
    color: '#95a5a6',
    marginTop: 12,
  },
  // Skeleton styles with better spacing and more realistic proportions
  skeletonText: {
    width: 80,
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonBadge: {
    width: 100,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonTime: {
    width: 80,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonSectionTitle: {
    width: 80,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonName: {
    width: 150,
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonButton: {
    width: 80,
    height: 36,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  skeletonMapIcon: {
    width: 16,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 8,
  },
  skeletonAddressLabel: {
    width: 60,
    height: 12,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
    marginBottom: 4,
  },
  skeletonAddress: {
    width: '80%',
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonMap: {
    width: '100%',
    height: 150,
    backgroundColor: '#E0E0E0',
    borderRadius: 12,
    marginVertical: 16,
  },
  skeletonOrderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    height: 16,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    height: 18,
    backgroundColor: '#E0E0E0',
    borderRadius: 4,
  },
  skeletonActionButton: {
    width: '100%',
    height: 46,
    backgroundColor: '#E0E0E0',
    borderRadius: 10,
    marginTop: 16,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginVertical: 12,
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  orderDetails: {
    marginBottom: 16,
  },
});

export default AssignedOrders;