import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  RefreshControl,
  Modal,
  Animated as RNAnimated
} from 'react-native';
import { Filter, Search, X, ShoppingBag, AlertCircle, ChevronDown, Package, Bell } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { API_URL } from '@/config';
import { io } from 'socket.io-client';
import * as Haptics from 'expo-haptics';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  withDelay,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';
import orderAlertService from '../../src/utils/orderAlertService';
import SystemLevelAlertService from '../../src/utils/systemLevelAlertService';
import { ZomatoLikePizzaAlarm } from '../../src/utils/nativeAlarmService';

import {
  OrderCard,
  OrderDetailsModal,
  UpdateStatusModal,
  AssignAgentModal,
  FilterModal
} from '@/components/features/admin';
import { SuccessModal, ErrorModal, ConfirmationModal } from '../../src/components/modals';

// Define types (these should match the types in OrderDetailsModal.tsx)
export interface AddOnOption {
  name: string;
  option?: string;
  price: number;
}

interface NewOrderEventData {
  _id: string;
  orderNumber?: string;
  id?: string;
  customer?: string;
  customerName?: string;
  status?: string;
  deliveryAgent?: string;
  deliveryAgentName?: string;
  createdAt: string;
  date?: string;
  time?: string;
  amount: number;
  items?: any[];
  address?: string;
  deliveryAddress?: string;
  customerPhone?: string;
  notes?: string;
  paymentMethod?: string;
  paymentStatus?: string;
}

interface FilterModalProps {
  visible: boolean;
  filters: OrderFilters;
  deliveryAgents: DeliveryAgent[];
  statusOptions: OrderStatus[];
  onClose: () => void;
  onApply: (filters: OrderFilters) => void;
  onReset: () => void;
  onFilterChange: (filterType: string, value: string) => void;
  getStatusColor: (status: string) => string;
}

interface OrderUpdateEventData {
  _id: string;
  status?: string;
  paymentStatus?: string;
  deliveryAgentName?: string;
  statusUpdates?: Array<{
    status: string;
    time: string;
    note: string;
  }>;
}

interface OrderFilters {
  date: string;
  status: string;
  deliveryAgent: string;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  menuItemId?: string;
  size?: string;
  foodType?: string;
  basePrice?: number;
  totalItemPrice?: number;
  customizations?: AddOnOption[];
  addOns?: AddOnOption[];
  toppings?: AddOnOption[];
  specialInstructions?: string;
  hasCustomizations?: boolean;
  customizationCount?: number;
  image?: string;
}

export interface Order {
  id: string;
  _id: string;
  customer: string;
  status: string;
  deliveryAgent: string;
  date: string;
  time: string;
  createdAt?: string;
  amount: number;
  subTotal?: number;
  tax?: number;
  deliveryFee?: number;
  discounts?: number;
  items: OrderItem[];
  address: string;
  fullAddress?: string;
  customerPhone?: string;
  notes: string;
  paymentMethod?: string;
  paymentStatus?: string;
  statusUpdates?: Array<{
    status: string;
    time: string;
    note: string;
  }>;
  totalItemsCount?: number;
}

interface DeliveryAssignmentEventData {
  _id: string;
  deliveryAgentName?: string;
}

// Define a proper interface for the delivery status update data
interface DeliveryStatusUpdateData {
  _id: string;
  isOnline?: boolean;
  lastActiveTime?: string;
}

interface DeliveryAgent {
  _id: string;
  name: string;
  email: string;
  role: string;
  isOnline?: boolean;
  lastActiveTime?: string;
  deliveryDetails?: {
    vehicleType?: string;
    isVerified?: boolean;
    status?: string;
    isOnline?: boolean;
    lastActiveTime?: string;
  };
}

interface OrdersApiResponse {
  orders: Order[];
  page: number;
  pages: number;
  total: number;
}

// Define the type for the OrderDetailsModal props
interface OrderDetailsModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdateStatus: () => void;
  onAssignAgent: () => void;
  onUpdatePayment: () => void;
  getStatusColor: (status: string) => string;
  getPaymentStatusColor: (status: string) => string;
  isLoading?: boolean;
}

// Define the type for the UpdatePaymentStatusModal props
interface UpdatePaymentStatusModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdatePaymentStatus: (status: string) => Promise<void>;
  getPaymentStatusColor: (status: string) => string;
  isProcessing: boolean;
}

type OrderStatus = 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';

// Skeleton component for loading animation
const Skeleton = ({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number | string;
  style?: any;
}) => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.ease }),
        withTiming(0.5, { duration: 750, easing: Easing.ease })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#E0E0E0',
          borderRadius: 4,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

// Skeleton for order card
const OrderCardSkeleton = () => (
  <View style={styles.orderCardSkeleton}>
    <View style={styles.orderCardHeader}>
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton width={24} height={24} style={{ borderRadius: 12, marginRight: 12 }} />
        <Skeleton width={120} height={20} />
      </View>
      <Skeleton width={80} height={24} style={{ borderRadius: 12 }} />
    </View>

    <View style={styles.orderCardBody}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Skeleton width={150} height={16} />
        <Skeleton width={80} height={16} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
        <Skeleton width={120} height={16} />
        <Skeleton width={60} height={16} />
      </View>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
        <Skeleton width={140} height={16} />
        <Skeleton width={70} height={16} />
      </View>
    </View>

    <View style={styles.orderCardFooter}>
      <Skeleton width={100} height={18} />
      <View style={{ flexDirection: 'row' }}>
        <Skeleton width={40} height={30} style={{ borderRadius: 4, marginRight: 8 }} />
        <Skeleton width={40} height={30} style={{ borderRadius: 4 }} />
      </View>
    </View>
  </View>
);

// Skeleton for header section
const HeaderSkeleton = () => (
  <>
    <View style={styles.header}>
      <Skeleton width={180} height={28} style={{ marginBottom: 0 }} />
    </View>

    <View style={styles.searchContainer}>
      <Skeleton width="75%" height={44} style={{ borderRadius: 10, marginRight: 12 }} />
      <Skeleton width={90} height={44} style={{ borderRadius: 10 }} />
    </View>
  </>
);

// Load more skeleton component
const LoadMoreSkeleton = () => (
  <View style={styles.loadMoreSkeleton}>
    {[1, 2].map((_, index) => (
      <OrderCardSkeleton key={index} />
    ))}
  </View>
);

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [loadingOrderDetails, setLoadingOrderDetails] = useState(false);

  // Socket.io state
  const [socket, setSocket] = useState<any>(null);
  // Removed notification overlay state - using system notifications only

  const [filters, setFilters] = useState<OrderFilters>({
    date: '',
    status: '',
    deliveryAgent: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalOrders, setTotalOrders] = useState(0);
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);

  const statusOptions: OrderStatus[] = ['Pending', 'Preparing', 'Out for delivery', 'Delivered', 'Cancelled'];

  const { token, role } = useSelector((state: RootState) => state.auth);

  // Modal states
  const [successModal, setSuccessModal] = useState<{visible: boolean, title: string, message: string}>({
    visible: false,
    title: '',
    message: ''
  });
  const [errorModal, setErrorModal] = useState<{visible: boolean, title: string, message: string}>({
    visible: false,
    title: '',
    message: ''
  });
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean,
    title: string,
    message: string,
    onConfirm: () => void
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Animation refs
  const [notificationAnim] = useState(() => new RNAnimated.Value(-100));
  const [pulseAnim] = useState(() => new RNAnimated.Value(1));
  const notificationTimeoutRef = useRef<number | null>(null);

  // Socket setup for real-time updates
  useEffect(() => {
    if (!token) return;

    // Create socket connection
    const newSocket = io(API_URL, {
      transports: ['websocket'],
      auth: { token },
      reconnectionAttempts: 5,
      reconnectionDelay: 1000
    });

    setSocket(newSocket);

    // Socket connection events
    newSocket.on('connect', () => {
      console.log('Orders page socket connected with ID:', newSocket.id);

      // Join admin room for broadcasts
      newSocket.emit('join', {
        userId: 'admin',
        role: 'admin'
      });
    });

    newSocket.on('connect_error', (error) => {
      console.error('Socket connection error:', error);
    });

    // Clean up on unmount
    return () => {
      if (newSocket) {
        console.log('Disconnecting orders page socket');
        newSocket.disconnect();
      }

      // Clear any pending notification timeouts
      if (notificationTimeoutRef.current) {
        clearTimeout(notificationTimeoutRef.current);
      }
    };
  }, [token]);

  // Handle real-time socket events
  useEffect(() => {
    if (!socket) return;

    // Handle new order event
    const handleNewOrder = async (data: NewOrderEventData) => {
      console.log("New order received in admin orders page:", data);

      // Trigger haptic feedback for new order
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Format the incoming order to match our Order interface
      const newOrder: Order = {
        id: data.orderNumber || data.id || String(data._id).slice(-6),
        _id: data._id,
        customer: data.customerName || data.customer || 'New customer',
        status: data.status || 'Pending',
        deliveryAgent: data.deliveryAgentName || data.deliveryAgent || 'Unassigned',
        date: data.date || new Date(data.createdAt).toLocaleDateString(),
        time: data.time || new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        amount: data.amount || 0,
        items: Array.isArray(data.items) ? data.items : [],
        address: data.address || data.deliveryAddress || '',
        customerPhone: data.customerPhone || '',
        notes: data.notes || '',
        paymentMethod: data.paymentMethod || 'Online',
        paymentStatus: data.paymentStatus || 'Pending'
      };

      // Add the new order to the state (at the beginning)
      setOrders(prevOrders => {
        // Check if order already exists to prevent duplicates
        const exists = prevOrders.some(order => order._id === newOrder._id);
        if (exists) return prevOrders;

        // Add new order at the top
        return [newOrder, ...prevOrders];
      });

      // Update total count
      setTotalOrders(prevTotal => prevTotal + 1);

      // DON'T show orange notification overlay - native alarm is better
      console.log('📱 Skipping in-app notification overlay');

      // 🚨 NATIVE ZOMATO-LIKE ALARM SYSTEM
      console.log('🚨 Triggering NATIVE Zomato-like alarm system...');
      try {
        await ZomatoLikePizzaAlarm.setUrgentOrderAlarm({
          orderId: data._id,
          orderNumber: data.orderNumber || `#${data._id.slice(-6)}`,
          customerName: data.customerName || data.customer || 'New customer',
          amount: data.amount || 0
        });
        
        console.log('✅ NATIVE Zomato-like alarm activated successfully');
        console.log('   🔥 This will work even when app is CLOSED!');
      } catch (alarmError) {
        console.error('❌ Native alarm failed, falling back to system notification:', alarmError);
        
        // Fallback to previous system notification
        try {

          await SystemLevelAlertService.sendEnhancedSystemAlert({
            orderId: data._id,
            orderNumber: data.orderNumber || `#${data._id.slice(-6)}`,
            customerName: data.customerName || data.customer || 'New customer',
            amount: data.amount || 0
          });
          console.log('✅ Fallback system alert sent');
        } catch (fallbackError) {
          console.error('❌ All alert systems failed:', fallbackError);
          // Final fallback to basic in-app alert
          try {
            orderAlertService.playOrderAlert({
              orderId: data._id,
              orderNumber: data.orderNumber || `#${data._id.slice(-6)}`,
              customerName: data.customerName || data.customer || 'New customer',
              amount: data.amount || 0
            });
          } catch (finalError) {
            console.error('❌ Even basic alert failed:', finalError);
          }
        }
      }
      // Pulse animation for visual feedback
      animatePulse();
    };

    // Handle order update events (status changes, etc.)
    const handleOrderUpdate = (data: OrderUpdateEventData) => {
      console.log("Order update received:", data);

      // Update the specific order in our state
      setOrders(prevOrders => prevOrders.map(order => {
        if (order._id === data._id) {
          return {
            ...order,
            status: data.status || order.status,
            paymentStatus: data.paymentStatus || order.paymentStatus,
            deliveryAgent: data.deliveryAgentName || order.deliveryAgent
          };
        }
        return order;
      }));

      // If the currently selected order is being updated, also update it
      if (selectedOrder && selectedOrder._id === data._id) {
        setSelectedOrder(prevOrder => {
          if (!prevOrder) return null;

          return {
            ...prevOrder,
            status: data.status || prevOrder.status,
            paymentStatus: data.paymentStatus || prevOrder.paymentStatus,
            deliveryAgent: data.deliveryAgentName || prevOrder.deliveryAgent,
            statusUpdates: data.statusUpdates || prevOrder.statusUpdates
          };
        });
      }
    };

    // Handle delivery agent assignment
    const handleDeliveryAssignment = (data: DeliveryAssignmentEventData) => {
      console.log("Delivery assignment update received:", data);

      // Update the specific order with new delivery agent info
      setOrders(prevOrders => prevOrders.map(order => {
        if (order._id === data._id) {
          return {
            ...order,
            deliveryAgent: data.deliveryAgentName || 'Unassigned'
          };
        }
        return order;
      }));
    };

    const handleDeliveryStatusUpdate = (data: DeliveryStatusUpdateData) => {
      console.log('Delivery agent status update received:', data);

      // Update the specific agent's online status in our state
      setDeliveryAgents(prevAgents => {
        return prevAgents.map(agent => {
          if (agent._id === data._id) {
            return {
              ...agent,
              deliveryDetails: {
                ...agent.deliveryDetails,
                isOnline: data.isOnline,
                lastActiveTime: data.lastActiveTime || agent.deliveryDetails?.lastActiveTime
              }
            };
          }
          return agent;
        });
      });
    };

    // Register event handlers
    socket.on('new_order_placed', handleNewOrder);
    socket.on('order_update', handleOrderUpdate);
    socket.on('delivery_assignment_update', handleDeliveryAssignment);

    socket.on('delivery_status_update', handleDeliveryStatusUpdate);
    socket.on('delivery_status_change', handleDeliveryStatusUpdate);


    // Debug listener
    socket.onAny((event: string, ...args: any[]) => {
      console.log(`Socket event received in orders page: ${event}`, args);
    });

    // Clean up listeners on unmount
    return () => {
      socket.off('new_order_placed', handleNewOrder);
      socket.off('order_update', handleOrderUpdate);
      socket.off('delivery_assignment_update', handleDeliveryAssignment);
      socket.off('delivery_status_update', handleDeliveryStatusUpdate);
      socket.off('delivery_status_change', handleDeliveryStatusUpdate);
      socket.offAny();
    };
  }, [socket, selectedOrder]);

  // Function to show notification - REMOVED: Using system notifications only
  // const showNotification = () => { ... }

  // Function to animate pulse effect
  const animatePulse = () => {
    // Reset animation value
    pulseAnim.setValue(1);

    RNAnimated.sequence([
      RNAnimated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 300,
        useNativeDriver: true
      }),
      RNAnimated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      }),
      RNAnimated.timing(pulseAnim, {
        toValue: 1.1,
        duration: 300,
        useNativeDriver: true
      }),
      RNAnimated.timing(pulseAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true
      })
    ]).start();
  };

  // Function to fetch detailed order information
  const fetchOrderDetails = async (orderId: string) => {
    try {
      if (!token) return;

      setLoadingOrderDetails(true);
      setSelectedOrder(null);

      const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch order details');
      }

      const data = await response.json();
      
      console.log('📦 Order details received from backend:', JSON.stringify(data, null, 2));

      // Validate that we have required data
      if (!data._id) {
        throw new Error('Invalid order data: missing order ID');
      }

      // Format the order for display
      const formattedOrder: Order = {
        id: data.orderNumber || data.id,
        _id: data._id,
        customer: data.customerName,
        status: data.status,
        deliveryAgent: data.deliveryAgentName || 'Unassigned',
        date: new Date(data.createdAt).toLocaleDateString(),
        time: new Date(data.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        createdAt: data.createdAt,
        amount: data.amount,
        subTotal: data.subTotal,
        tax: data.tax,
        deliveryFee: data.deliveryFee,
        discounts: data.discounts,
        items: Array.isArray(data.items) ? data.items.map((item: any): OrderItem => ({
          name: item.name || "Unknown Item",
          quantity: item.quantity || 1,
          price: item.price || 0,
          menuItemId: item.menuItemId || "",
          basePrice: item.basePrice || item.price || 0,
          size: item.size || "Regular",
          foodType: item.foodType || "Not Applicable",
          customizations: Array.isArray(item.customizations) ? item.customizations : [],
          addOns: Array.isArray(item.addOns) ? item.addOns : [],
          toppings: Array.isArray(item.toppings) ? item.toppings : [],
          specialInstructions: item.specialInstructions || "",
          totalItemPrice: item.totalItemPrice || item.price || 0,
          hasCustomizations: item.hasCustomizations || false,
          customizationCount: item.customizationCount || 0,
          image: item.image || null
        })) : [], // Provide empty array if data.items is not an array
        address: data.fullAddress || data.address?.street || '',
        fullAddress: data.fullAddress || (data.address ? `${data.address.street}, ${data.address.city}` : ''),
        notes: data.notes || '',
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus || 'Pending',
        customerPhone: data.customerPhone,
        statusUpdates: Array.isArray(data.statusUpdates) ? data.statusUpdates : [],
        totalItemsCount: data.totalItemsCount || (Array.isArray(data.items) ? data.items.length : 0)
      };

      setSelectedOrder(formattedOrder);
      setDetailsModalVisible(true);
      setLoadingOrderDetails(false);
    } catch (err) {
      console.error('❌ Error fetching order details:', err);
      console.error('❌ Error details:', {
        message: err instanceof Error ? err.message : 'Unknown error',
        stack: err instanceof Error ? err.stack : undefined,
        orderId
      });
      
      const errorMessage = err instanceof Error ? err.message : 'Failed to load order details';
      setErrorModal({
        visible: true,
        title: 'Error',
        message: `${errorMessage}. Please try again.`
      });
      setLoadingOrderDetails(false);
    }
  };

  const fetchOrders = useCallback(async (page = 1, refresh = false) => {
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let url = `${API_URL}/api/orders?page=${page}`;

      if (filters.status || filters.date || filters.deliveryAgent) {
        url = `${API_URL}/api/orders/filter?page=${page}`;

        if (filters.status) {
          url += `&status=${filters.status}`;
        }

        if (filters.date) {
          url += `&date=${filters.date}`;
        }

        if (filters.deliveryAgent) {
          url += `&deliveryAgent=${filters.deliveryAgent}`;
        }
      }

      if (searchQuery) {
        url = `${API_URL}/api/orders/search?query=${searchQuery}&page=${page}`;
      }

      console.log('Fetching orders from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch orders');
      }

      const data: OrdersApiResponse = await response.json();
      console.log(`Received ${data.orders?.length || 0} orders from API, page ${data.page} of ${data.pages}`);

      // Process orders to ensure they have all required fields
      const processedOrders = data.orders.map(order => ({
        ...order,
        // Format dates nicely
        date: new Date(order.createdAt || Date.now()).toLocaleDateString(),
        time: new Date(order.createdAt || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        // Ensure these fields exist
        items: Array.isArray(order.items) ? order.items : [],
        status: order.status || 'Pending',
        customerPhone: order.customerPhone || 'N/A',
        totalItemsCount: order.totalItemsCount || (order.items?.length || 0),
        paymentStatus: order.paymentStatus || 'Pending',
        deliveryAgent: order.deliveryAgent || 'Unassigned'
      }));

      if (refresh || page === 1) {
        setOrders(processedOrders);
      } else {
        setOrders(prev => [...prev, ...processedOrders]);
      }

      setCurrentPage(data.page);
      setTotalPages(data.pages);
      setTotalOrders(data.total);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load orders: ${errorMessage}`);
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [token, filters, searchQuery]);

  const fetchDeliveryAgents = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/delivery-agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch delivery agents');
      }

      const data = await response.json();

      // Process agents and ensure they have all required fields
      const processedAgents = data.map((agent: DeliveryAgent) => ({
        ...agent,
        isOnline: agent.deliveryDetails?.isOnline || false,
        lastActiveTime: agent.deliveryDetails?.lastActiveTime || new Date().toISOString()
      }));

      setDeliveryAgents(processedAgents);
    } catch (err) {
      console.error('Error fetching delivery agents:', err);
      // We don't set a global error here to avoid blocking the main UI
    }
  }, [token]);

  // Updated to use the unified order endpoint
  const assignDeliveryAgent = async (agentId: string | null, agentName: string) => {
    if (!token || !selectedOrder) return;
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_URL}/api/orders/${selectedOrder._id}/delivery-agent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deliveryAgentId: agentId,
          deliveryAgentName: agentName
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to assign delivery agent');
      }

      const data = await response.json();

      // Update both the order list and selected order with the new delivery agent info
      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, deliveryAgent: agentName };
        }
        return order;
      });

      setOrders(updatedOrders);
      setSelectedOrder(prevOrder => prevOrder ? {
        ...prevOrder,
        deliveryAgent: agentName
      } : null);

      // Show success message
      setSuccessModal({
        visible: true,
        title: 'Success',
        message: `Order has been ${agentId ? 'assigned to' : 'unassigned from'} ${agentName}`
      });

      // Close modal after assignment
      setAssignAgentModalVisible(false);
    } catch (err) {
      console.error('Error assigning delivery agent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setErrorModal({
        visible: true,
        title: 'Error',
        message: `Failed to assign delivery agent: ${errorMessage}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Updated to use the unified status update endpoint
  const updateOrderStatus = async (status: OrderStatus) => {
    if (!token || !selectedOrder) return;
    setIsProcessing(true);

    try {
      // Using the unified status update endpoint
      const response = await fetch(`${API_URL}/api/orders/${selectedOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          note: `Status updated to ${status} by admin`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));

        // Handle specific error responses
        if (response.status === 400) {
          throw new Error(errorData.message || `Cannot update order to ${status} status`);
        } else if (response.status === 403) {
          throw new Error('You do not have permission to update this order');
        } else {
          throw new Error(errorData.message || 'Failed to update order status');
        }
      }

      const data = await response.json();

      // Update the local state
      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, status };
        }
        return order;
      });

      setOrders(updatedOrders);
      setSelectedOrder(prevOrder => prevOrder ? {
        ...prevOrder,
        status,
        statusUpdates: prevOrder.statusUpdates ? [
          ...prevOrder.statusUpdates,
          {
            status,
            time: new Date().toISOString(),
            note: `Status updated to ${status} by admin`
          }
        ] : []
      } : null);

      // Close modal after status update
      setUpdateStatusModalVisible(false);

      // Show success message
      setSuccessModal({
        visible: true,
        title: 'Success',
        message: `Order status updated to ${status}`
      });

    } catch (err) {
      console.error('Error updating order status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setErrorModal({
        visible: true,
        title: 'Error',
        message: `Failed to update order status: ${errorMessage}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  // Function to update payment status
  const updatePaymentStatus = async (paymentStatus: string) => {
    if (!token || !selectedOrder) return;
    setIsProcessing(true);

    try {
      // Using the payment status update endpoint
      const response = await fetch(`${API_URL}/api/orders/${selectedOrder._id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus,
          paymentDetails: {
            updatedBy: 'admin',
            updatedAt: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update payment status');
      }

      const data = await response.json();

      // Update the local state
      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, paymentStatus };
        }
        return order;
      });

      setOrders(updatedOrders);
      setSelectedOrder(prevOrder => prevOrder ? {
        ...prevOrder,
        paymentStatus,
        statusUpdates: prevOrder.statusUpdates ? [
          ...prevOrder.statusUpdates,
          {
            status: prevOrder.status,
            time: new Date().toISOString(),
            note: `Payment status updated to ${paymentStatus} by admin`
          }
        ] : []
      } : null);

      // Close modal after payment status update
      setUpdatePaymentModalVisible(false);

      // Show success message
      setSuccessModal({
        visible: true,
        title: 'Success',
        message: `Payment status updated to ${paymentStatus}`
      });

    } catch (err) {
      console.error('Error updating payment status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setErrorModal({
        visible: true,
        title: 'Error',
        message: `Failed to update payment status: ${errorMessage}`
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const applyFilters = (newFilters: OrderFilters) => {
    setFilters(newFilters);
    setCurrentPage(1);
    fetchOrders(1);
    setFilterModalVisible(false);
  };

  const resetFilters = () => {
    setFilters({
      date: '',
      status: '',
      deliveryAgent: ''
    });
    setSearchQuery('');
    setCurrentPage(1);
    fetchOrders(1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrders(1);
  };

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Pending': return '#FFA500';
      case 'Preparing': return '#3498DB';
      case 'Out for delivery': return '#9B59B6';
      case 'Delivered': return '#2ECC71';
      case 'Cancelled': return '#E74C3C';
      default: return '#7F8C8D';
    }
  };

  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed': return '#2ECC71';
      case 'Failed': return '#E74C3C';
      case 'Pending': return '#FFA500';
      case 'Refunded': return '#3498DB';
      default: return '#7F8C8D';
    }
  };

  const onRefresh = useCallback(() => {
    fetchOrders(1, true);
    fetchDeliveryAgents();
  }, [fetchOrders, fetchDeliveryAgents]);

  const handleLoadMore = useCallback(() => {
    if (currentPage < totalPages && !loadingMore && !loading) {
      fetchOrders(currentPage + 1);
    }
  }, [currentPage, totalPages, loadingMore, loading, fetchOrders]);

  // Render footer with skeleton for loading more
  const renderFooter = () => {
    if (!loadingMore) return null;
    return <LoadMoreSkeleton />;
  };

  // Render skeleton loading for orders list
  const renderSkeletonLoading = () => (
    <View style={styles.ordersList}>
      {Array(6).fill(0).map((_, index) => (
        <OrderCardSkeleton key={index} />
      ))}
    </View>
  );

  // Function to handle clicking on notification - REMOVED: Using system notifications only
  // const handleNotificationPress = () => { ... }

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  useEffect(() => {
    fetchDeliveryAgents();
  }, [fetchDeliveryAgents]);

  // Modal state management
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [updateStatusModalVisible, setUpdateStatusModalVisible] = useState(false);
  const [assignAgentModalVisible, setAssignAgentModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [updatePaymentModalVisible, setUpdatePaymentModalVisible] = useState(false);

  // Format currency helper
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Orange notification overlay removed - using system notifications only */}

      {loading && !refreshing ? (
        <>
          <HeaderSkeleton />
          {renderSkeletonLoading()}
        </>
      ) : (
        <>
          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.title}>Orders Management</Text>
            {totalOrders > 0 && (
              <Text style={styles.ordersCount}>{totalOrders} total orders</Text>
            )}
          </View>

          {/* Search and Filter Bar */}
          <View style={styles.searchContainer}>
            <View style={styles.searchInputContainer}>
              <Search size={20} color="#888" style={styles.searchIcon} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search orders by ID, customer or phone..."
                value={searchQuery}
                onChangeText={setSearchQuery}
                onSubmitEditing={handleSearch}
                returnKeyType="search"
              />
              {searchQuery ? (
                <TouchableOpacity onPress={() => {
                  setSearchQuery('');
                  fetchOrders(1);
                }}>
                  <X size={18} color="#888" />
                </TouchableOpacity>
              ) : null}
            </View>

            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setFilterModalVisible(true)}
            >
              <Filter size={20} color="#FFF" />
              <Text style={styles.filterButtonText}>Filter</Text>
            </TouchableOpacity>
          </View>

          {/* Filter status bar */}
          {(filters.date || filters.status || filters.deliveryAgent) && (
            <View style={styles.activeFiltersBar}>
              <Text style={styles.activeFiltersText}>
                Filters:
                {filters.date ? ` Date: ${filters.date}` : ''}
                {filters.status ? ` Status: ${filters.status}` : ''}
                {filters.deliveryAgent ? ` Agent: ${filters.deliveryAgent}` : ''}
              </Text>
              <TouchableOpacity onPress={resetFilters} style={styles.clearFiltersButton}>
                <Text style={styles.clearFiltersText}>Clear All</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Error message */}
          {error && (
            <View style={styles.errorContainer}>
              <Text style={styles.errorText}>{error}</Text>
              <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrders(1)}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Orders list with infinite scroll */}
          <FlatList
            data={orders}
            renderItem={({ item, index }) => (
              <RNAnimated.View // Changed from Animated.View to RNAnimated.View
                style={[
                  { transform: [{ scale: 1 }] } // Removed notificationVisible condition since using system notifications only
                ]}
              >
                <OrderCard
                  order={item}
                  onPress={() => {
                    // Use fetchOrderDetails to get detailed order info
                    fetchOrderDetails(item._id);
                  }}
                  onUpdateStatus={() => {
                    setSelectedOrder(item);
                    setUpdateStatusModalVisible(true);
                  }}
                  onAssignAgent={() => {
                    setSelectedOrder(item);
                    setAssignAgentModalVisible(true);
                  }}
                  getStatusColor={getStatusColor}
                />
              </RNAnimated.View>
            )}
            keyExtractor={(item) => item._id}
            contentContainerStyle={styles.ordersList}
            refreshControl={
              <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} />
            }
            onEndReached={handleLoadMore}
            onEndReachedThreshold={0.3}
            ListFooterComponent={renderFooter}
            ListEmptyComponent={() => (
              <View style={styles.emptyListContainer}>
                <ShoppingBag size={60} color="#E0E0E0" />
                <Text style={styles.emptyListText}>No orders found</Text>
                <Text style={styles.emptyListSubtext}>
                  {searchQuery || filters.date || filters.status || filters.deliveryAgent
                    ? "Try adjusting your filters"
                    : "Orders will appear here when customers place them"}
                </Text>
                {(searchQuery || filters.date || filters.status || filters.deliveryAgent) && (
                  <TouchableOpacity style={styles.resetSearchButton} onPress={resetFilters}>
                    <Text style={styles.resetSearchButtonText}>Reset Filters</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          />

          {/* Pagination info */}
          {totalPages > 1 && (
            <View style={styles.paginationInfo}>
              <Text style={styles.paginationText}>Page {currentPage} of {totalPages}</Text>
            </View>
          )}
        </>
      )}

      {/* Order Details Modal */}
      {selectedOrder && (
        <OrderDetailsModal
          visible={detailsModalVisible}
          order={selectedOrder}
          onClose={() => setDetailsModalVisible(false)}
          onUpdateStatus={() => {
            setDetailsModalVisible(false);
            setUpdateStatusModalVisible(true);
          }}
          onAssignAgent={() => {
            setDetailsModalVisible(false);
            setAssignAgentModalVisible(true);
          }}
          onUpdatePayment={() => {
            setDetailsModalVisible(false);
            setUpdatePaymentModalVisible(true);
          }}
          getStatusColor={getStatusColor}
          getPaymentStatusColor={getPaymentStatusColor}
          isLoading={loadingOrderDetails}
        />
      )}

      {/* Update Status Modal */}
      {selectedOrder && (
        <UpdateStatusModal
          visible={updateStatusModalVisible}
          order={selectedOrder}
          onClose={() => setUpdateStatusModalVisible(false)}
          onUpdateStatus={updateOrderStatus}
          getStatusColor={getStatusColor}
          isProcessing={isProcessing}
        />
      )}

      {/* Assign Agent Modal */}
      {selectedOrder && (
        <AssignAgentModal
          visible={assignAgentModalVisible}
          order={selectedOrder}
          deliveryAgents={deliveryAgents}
          onClose={() => setAssignAgentModalVisible(false)}
          onAssignAgent={assignDeliveryAgent}
          isProcessing={isProcessing}
          onRefreshAgents={fetchDeliveryAgents}
        />
      )}

      {/* Filter Modal */}
      <FilterModal
        visible={filterModalVisible}
        filters={filters}
        deliveryAgents={deliveryAgents}
        statusOptions={statusOptions}
        onClose={() => setFilterModalVisible(false)}
        onApply={() => applyFilters(filters)}
        onReset={resetFilters}
        onFilterChange={(filterType, value) => setFilters(prev => ({ ...prev, [filterType]: value }))}
        getStatusColor={getStatusColor}
      />

      {/* Payment Status Modal */}
      {selectedOrder && (
        <UpdatePaymentStatusModal
          visible={updatePaymentModalVisible}
          order={selectedOrder}
          onClose={() => setUpdatePaymentModalVisible(false)}
          onUpdatePaymentStatus={updatePaymentStatus}
          getPaymentStatusColor={getPaymentStatusColor}
          isProcessing={isProcessing}
        />
      )}

      {/* Success Modal */}
      <SuccessModal
        visible={successModal.visible}
        onClose={() => setSuccessModal({ ...successModal, visible: false })}
        title={successModal.title}
        message={successModal.message}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
        title={errorModal.title}
        message={errorModal.message}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmationModal.visible}
        onConfirm={() => {
          confirmationModal.onConfirm();
          setConfirmationModal({ ...confirmationModal, visible: false });
        }}
        onCancel={() => setConfirmationModal({ ...confirmationModal, visible: false })}
        title={confirmationModal.title}
        message={confirmationModal.message}
      />
    </SafeAreaView>
  );
};

// Create a new component for updating payment status with proper types
const UpdatePaymentStatusModal = ({
  visible,
  order,
  onClose,
  onUpdatePaymentStatus,
  getPaymentStatusColor,
  isProcessing
}: UpdatePaymentStatusModalProps) => {
  const paymentStatusOptions = ['Pending', 'Completed', 'Failed', 'Refunded'];

  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>Update Payment Status</Text>
            <TouchableOpacity onPress={onClose} disabled={isProcessing}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>

          <Text style={modalStyles.orderInfo}>
            Order #{order?.id}
            {order?.paymentMethod ? ` • ${order.paymentMethod}` : ''}
          </Text>

          <Text style={modalStyles.currentStatus}>
            Current payment status:
            <Text style={{
              color: getPaymentStatusColor(order?.paymentStatus || 'Pending'),
              fontWeight: 'bold'
            }}>
              {' '}{order?.paymentStatus || 'Pending'}
            </Text>
          </Text>

          <View style={modalStyles.divider} />

          <Text style={modalStyles.sectionTitle}>Select new payment status</Text>

          {isProcessing ? (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B00" />
              <Text style={modalStyles.loadingText}>Updating payment status...</Text>
            </View>
          ) : (
            <>
              <ScrollView style={modalStyles.optionsContainer}>
                {paymentStatusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      modalStyles.statusOption,
                      { borderColor: getPaymentStatusColor(status) }
                    ]}
                    onPress={() => onUpdatePaymentStatus(status)}
                    disabled={status === order?.paymentStatus}
                  >
                    <View style={[
                      modalStyles.statusDot,
                      { backgroundColor: getPaymentStatusColor(status) }
                    ]} />
                    <Text style={modalStyles.statusText}>{status}</Text>
                    {status === order?.paymentStatus && (
                      <Text style={modalStyles.currentText}>(Current)</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>

              <TouchableOpacity
                style={modalStyles.closeButton}
                onPress={onClose}
              >
                <Text style={modalStyles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  ordersCount: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    height: 44,
  },
  filterButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFE0CC',
  },
  activeFiltersText: {
    flex: 1,
    fontSize: 13,
    color: '#FF6B00',
  },
  clearFiltersButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#FF6B00',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#C62828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  ordersList: {
    padding: 16,
    paddingBottom: 100,
  },
  loadMoreSkeleton: {
    paddingVertical: 8,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyListContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    paddingTop: 60,
  },
  emptyListText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginTop: 16,
  },
  emptyListSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  resetSearchButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  resetSearchButtonText: {
    color: '#666',
    fontWeight: '500',
  },
  paginationInfo: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    alignItems: 'center',
  },
  paginationText: {
    fontSize: 14,
    color: '#666',
  },
  // Skeleton styles
  orderCardSkeleton: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  orderCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderCardBody: {
    marginBottom: 12,
  },
  orderCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  // New notification styles
  notificationContainer: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 10,
    left: 16,
    right: 16,
    backgroundColor: '#FF6B00',
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 10,
    zIndex: 1000,
  },
  notificationContent: {
    flex: 1,
    flexDirection: 'row',
    padding: 16,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationTitle: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 16,
    marginBottom: 2,
  },
  notificationDescription: {
    color: '#FFFFFF',
    fontSize: 14,
    opacity: 0.9,
    marginBottom: 2,
  },
  notificationAmount: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  notificationClose: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  }
});

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  orderInfo: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  currentStatus: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsContainer: {
    maxHeight: 280,
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  currentText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#F0F0F0',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default AdminOrders;