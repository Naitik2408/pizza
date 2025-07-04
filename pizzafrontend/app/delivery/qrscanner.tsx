import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Share,
  Dimensions,
  Linking,
  FlatList,
  Animated,
  RefreshControl
} from 'react-native';
import { 
  ArrowLeft, 
  Share2, 
  RefreshCw, 
  Clock, 
  Copy, 
  CheckCircle2, 
  ExternalLink, 
  QrCode,
  FileText,
  AlertCircle,
  DollarSign
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import store from '../../redux/store';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { API_URL } from '@/config';
import { getSocket, initializeSocket, joinSocketRooms, onSocketEvent, offSocketEvent, isSocketConnected, ensureSocketConnection } from '@/src/utils/socket';
import { ErrorModal, SuccessModal, ConfirmationModal } from '../../src/components/modals';

// Define shop owner payment details interface
interface PaymentDetails {
  upiId: string;
  paymentLink?: string;
  merchantName: string;
  merchantCode?: string;
}

// Define business settings interface
interface BusinessSettings {
  upiId: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  businessInfo: {
    name: string;
    phone: string;
    email: string;
    address: string;
  };
  deliveryCharges: {
    fixedCharge: number;
    freeDeliveryThreshold: number;
    applyToAllOrders: boolean;
  };
  taxSettings: {
    gstPercentage: number;
    applyGST: boolean;
  };
  minimumOrderValue: number;
}

// Define pending payment order interface
interface PendingPaymentOrder {
  id: string;
  _id: string;
  amount: number;
  customerName: string;
  customerPhone?: string;
  date?: string;
  time?: string;
}

// Component for rendering the empty payments view
interface EmptyPaymentsViewProps {
  onRefresh: () => void;
  refreshing: boolean;
}

const EmptyPaymentsView = ({ onRefresh, refreshing }: EmptyPaymentsViewProps) => {
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
          source={{ uri: 'https://img.freepik.com/free-vector/no-data-concept-illustration_114360-536.jpg?w=1380' }}
          style={styles.emptyImage}
          resizeMode="contain"
        />
      </View>
      
      <View style={styles.emptyContent}>
        <Text style={styles.emptyTitle}>No Pending Payments</Text>
        <Text style={styles.emptySubText}>
          There are currently no orders waiting for payment collection.
        </Text>
        
        <View style={styles.emptyInfoContainer}>
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <FileText size={20} color="#1c1917" />
            </View>
            <Text style={styles.infoTitle}>Check Orders</Text>
            <Text style={styles.infoText}>Go to assigned orders to see your deliveries</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <AlertCircle size={20} color="#1c1917" />
            </View>
            <Text style={styles.infoTitle}>COD Orders</Text>
            <Text style={styles.infoText}>Only cash on delivery orders appear here</Text>
          </View>
          
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <DollarSign size={20} color="#1c1917" />
            </View>
            <Text style={styles.infoTitle}>Payment</Text>
            <Text style={styles.infoText}>Collect payments via UPI QR code</Text>
          </View>
        </View>
      </View>
    </View>
  );
};

const QRPaymentScreen = () => {
  const router = useRouter();
  const { token, name, email, role, userId } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [pendingPaymentOrders, setPendingPaymentOrders] = useState<PendingPaymentOrder[]>([]);
  const [businessSettingsLoading, setBusinessSettingsLoading] = useState(true);

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

  // Business settings state
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings | null>(null);

  // Shop payment details derived from business settings
  const [shopPaymentDetails, setShopPaymentDetails] = useState<PaymentDetails>({
    upiId: 'default@upi',
    merchantName: 'Pizza Shop',
    merchantCode: 'PIZZASHP001',
    paymentLink: 'https://pay.pizzashop.com/pay'
  });

  // Payment details state for current order
  const [paymentDetails, setPaymentDetails] = useState({
    amount: 0,
    orderId: '',
    _id: '', // MongoDB ID for API calls
    customerName: '',
  });

  // Fetch business settings from API
  const fetchBusinessSettings = useCallback(async () => {
    if (!token) return;

    try {
      setBusinessSettingsLoading(true);

      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch business settings');
      }

      const data = await response.json();
      setBusinessSettings(data);
      
      // Update shop payment details based on fetched settings
      setShopPaymentDetails({
        upiId: data.upiId,
        merchantName: data.businessInfo?.name || data.bankDetails.accountName,
        merchantCode: 'PIZZASHP001', // You might want to store this in the business settings too
        paymentLink: 'https://pay.pizzashop.com/pay' // This could also be stored in business settings
      });

    } catch (error) {
      console.error('Error fetching business settings:', error);
      // Keep using default values if fetch fails
    } finally {
      setBusinessSettingsLoading(false);
    }
  }, [token]);

  // Generate UPI QR code URL based on order details
  const getQRCodeUrl = useCallback(() => {
    // Create UPI deep link with payment details using shop owner's UPI
    const upiLink = `upi://pay?pa=${shopPaymentDetails.upiId}&pn=${encodeURIComponent(shopPaymentDetails.merchantName)}&am=${paymentDetails.amount.toFixed(2)}&cu=INR&tn=${paymentDetails.orderId}&mc=${shopPaymentDetails.merchantCode || 'PIZZASHP001'}`;

    // Use QR code generator API with timestamp to ensure fresh QR on each refresh
    return `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(upiLink)}&t=${lastRefresh}`;
  }, [paymentDetails, lastRefresh, shopPaymentDetails]);

  // Fetch pending payment orders from API
  const fetchPendingPaymentOrders = useCallback(async () => {
    if (!token) {
      router.replace('/(auth)/login');
      return;
    }

    try {
      setLoading(true);

      const response = await fetch(`${API_URL}/api/delivery/orders/pending-payments`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error fetching pending payments:', errorData);
        throw new Error(errorData.message || 'Failed to fetch pending payment orders');
      }

      const data = await response.json();
      console.log('Pending payment orders:', data);

      if (!Array.isArray(data)) {
        console.error('Expected array of orders but got:', data);
        setPendingPaymentOrders([]);
      } else {
        setPendingPaymentOrders(data);
      }

    } catch (error) {
      console.error('Error fetching pending payment orders:', error);
      showErrorModal('Error', 'Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, router]);

  // Handle order refresh
  const handleOrdersRefresh = () => {
    setRefreshing(true);
    fetchPendingPaymentOrders();
  };

  // Handle refresh QR code 
  const handleRefresh = () => {
    setRefreshing(true);

    // Haptic feedback 
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Update timestamp to force QR refresh
    setTimeout(() => {
      setLastRefresh(Date.now());
      setRefreshing(false);

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    }, 1000);
  };

  // Copy all payment details to clipboard
  const copyAllPaymentDetails = async () => {
    if (!businessSettings) return;

    const shopName = businessSettings.businessInfo?.name || businessSettings.bankDetails.accountName;
    const paymentDetailsText = `🍕 ${shopName}

💰 Amount: ₹${paymentDetails.amount.toFixed(2)}
🔢 Order ID: ${paymentDetails.orderId}

📱 UPI ID: ${businessSettings.upiId}

🏦 Bank Details:
Account Name: ${businessSettings.bankDetails.accountName}
Account Number: ${businessSettings.bankDetails.accountNumber}
IFSC Code: ${businessSettings.bankDetails.ifscCode}
Bank Name: ${businessSettings.bankDetails.bankName}`;

    await Clipboard.setStringAsync(paymentDetailsText);

    // Haptic feedback when copied
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    showSuccessModal('Copied', 'All payment details copied to clipboard');
  };

  // Share payment details via WhatsApp
  const sharePaymentDetailsViaWhatsApp = async () => {
    if (!businessSettings) return;

    const currentOrder = pendingPaymentOrders.find(order => order._id === paymentDetails._id);
    const customerPhone = currentOrder?.customerPhone || businessSettings.businessInfo.phone;

    if (!customerPhone) {
      showErrorModal('Error', 'Customer phone number not available');
      return;
    }

    const paymentDetailsText = `🍕 Payment Details for ${businessSettings.businessInfo.name || businessSettings.bankDetails.accountName}

Dear ${paymentDetails.customerName},

Your order total: ₹${paymentDetails.amount.toFixed(2)}
Order ID: ${paymentDetails.orderId}

💳 Payment Options:

📱 UPI ID: ${businessSettings.upiId}

🏦 Bank Transfer:
Account Name: ${businessSettings.bankDetails.accountName}
Account Number: ${businessSettings.bankDetails.accountNumber}
IFSC Code: ${businessSettings.bankDetails.ifscCode}
Bank Name: ${businessSettings.bankDetails.bankName}

Please complete the payment and share the transaction screenshot with us.

Thank you for your order! 🍕`;

    const whatsappUrl = `whatsapp://send?phone=${customerPhone.replace(/\s/g, '')}&text=${encodeURIComponent(paymentDetailsText)}`;

    try {
      const canOpen = await Linking.canOpenURL(whatsappUrl);
      if (canOpen) {
        await Linking.openURL(whatsappUrl);
      } else {
        showErrorModal('Error', 'WhatsApp not installed on device');
      }
    } catch (error) {
      console.error('Error opening WhatsApp:', error);
      showErrorModal('Error', 'Could not open WhatsApp');
    }
  };

  // Share payment details
  // Handle order selection from current orders
  const selectOrder = (orderId: string, mongoId: string, amount: number, customerName: string) => {
    setActiveOrderId(orderId);
    setPaymentDetails({
      amount,
      orderId,
      _id: mongoId,
      customerName
    });

    // Haptic feedback when order selected
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  // Confirm payment
  const confirmPayment = async () => {
    if (!paymentDetails._id) {
      showErrorModal('Error', 'Invalid order selected');
      return;
    }

    try {
      setLoading(true);

      // First update the order payment status AND set status to Delivered
      const response = await fetch(`${API_URL}/api/delivery/orders/${paymentDetails._id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus: 'Completed',
          status: 'Delivered', // Also update order status to Delivered
          note: 'Payment received and delivery completed'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error confirming payment:', errorData);
        throw new Error(errorData.message || 'Failed to update payment status');
      }

      // Then create a transaction record with the actual business UPI ID
      const transactionResponse = await fetch(`${API_URL}/api/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          orderId: paymentDetails._id,
          upiId: shopPaymentDetails.upiId,
          merchantName: shopPaymentDetails.merchantName,
          merchantCode: shopPaymentDetails.merchantCode || 'PIZZASHP001',
          upiReference: paymentDetails.orderId, // Using order ID as reference
          notes: `Payment confirmed and delivery completed for order #${paymentDetails.orderId}`
        })
      });

      if (!transactionResponse.ok) {
        const errorData = await transactionResponse.json().catch(() => ({}));
        console.error('Error creating transaction:', errorData);
        // Don't throw error here, as the payment was already confirmed
        console.warn('Payment confirmed but transaction record failed to create');
      }

      // Emit socket event for real-time updates
      const socket = getSocket();
      if (socket) {
        socket.emit('orderStatusUpdated', {
          orderId: paymentDetails._id,
          status: 'Delivered',
          paymentStatus: 'Completed',
          updatedBy: 'delivery',
          deliveryAgent: name,
          timestamp: new Date().toISOString()
        });
        console.log('📡 Emitted orderStatusUpdated event for payment completion');
      }

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show success and reset
      showSuccessModal('Success', 'Payment confirmed and delivery completed!');

      // Reset active order and refresh list
      setActiveOrderId(null);
      fetchPendingPaymentOrders();

    } catch (error) {
      console.error('Error confirming payment:', error);
      showErrorModal('Error', 'Failed to confirm payment. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Load business settings and orders on component mount
  useEffect(() => {
    const loadInitialData = async () => {
      await fetchBusinessSettings();
      await fetchPendingPaymentOrders();
    };
    
    loadInitialData();
  }, [fetchBusinessSettings, fetchPendingPaymentOrders]);

  // Socket integration for real-time updates
  useEffect(() => {
    const setupSocketListener = async () => {
      let socket = getSocket();
      
      // Get current auth state
      const currentUserId = userId || store.getState().auth.userId;
      const currentToken = token || store.getState().auth.token;
      const currentRole = role || store.getState().auth.role;
      
      console.log('🔌 Setting up socket for QR payment screen:', { 
        userId: currentUserId, 
        role: currentRole,
        hasToken: !!currentToken,
        socketExists: !!socket,
        socketConnected: socket?.connected
      });
      
      // If we don't have userId, we can't proceed
      if (!currentUserId) {
        console.error('❌ No userId available for socket setup in QR screen');
        return;
      }
      
      // Initialize or ensure socket connection
      if (!socket) {
        console.log('Socket not found, attempting to initialize...');
        if (currentToken && currentUserId) {
          socket = initializeSocket(currentToken);
          if (socket) {
            await joinSocketRooms(currentUserId, currentRole);
          }
        }
      } else if (!socket.connected) {
        console.log('Socket exists but not connected, reconnecting...');
        socket = ensureSocketConnection(currentToken);
        if (socket && currentUserId) {
          await joinSocketRooms(currentUserId, currentRole);
        }
      } else {
        console.log('Socket already connected, ensuring rooms are joined...');
        if (currentUserId && currentRole) {
          await joinSocketRooms(currentUserId, currentRole);
        }
      }

      // Handler for new pending payment orders
      const handleNewPendingPayment = (orderData: any) => {
        console.log('💰 New pending payment order received:', orderData);
        
        // Check if this order is assigned to current delivery agent
        if (orderData.deliveryAgent && orderData.deliveryAgent.toString() === currentUserId) {
          console.log('🎯 New pending payment is for current delivery agent');
          
          // Add to pending payments list if it's not already there
          setPendingPaymentOrders(prevOrders => {
            const exists = prevOrders.find(order => order._id === orderData._id);
            if (!exists && orderData.paymentMethod === 'Cash on Delivery' && orderData.paymentStatus === 'Pending') {
              const newOrder: PendingPaymentOrder = {
                id: orderData.id || orderData._id,
                _id: orderData._id,
                amount: orderData.amount || orderData.totalPrice || 0,
                customerName: orderData.customerName || orderData.customer?.name || 'Customer'
              };
              return [...prevOrders, newOrder];
            }
            return prevOrders;
          });
          
          // Show notification
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          showSuccessModal(
            '💰 New Payment Pending',
            `Order ${orderData.orderNumber || orderData.id} requires payment collection.`
          );
        }
      };

      // Handler for payment completion (removes from pending list)
      const handlePaymentCompleted = (orderData: any) => {
        console.log('✅ Payment completed:', orderData);
        
        // Remove from pending payments list
        setPendingPaymentOrders(prevOrders => 
          prevOrders.filter(order => 
            order.id !== orderData.orderNumber && 
            order._id !== orderData._id &&
            order._id !== orderData.orderId
          )
        );
        
        // Reset active order if it was the one that got completed
        if (paymentDetails._id === orderData._id || 
            paymentDetails._id === orderData.orderId ||
            paymentDetails.orderId === orderData.orderNumber) {
          setActiveOrderId(null);
        }
      };

      // Handler for order status updates
      const handleOrderStatusUpdate = (updateData: any) => {
        console.log('📦 Order status updated in QR screen:', updateData);
        
        // If order status becomes 'Delivered' or 'Cancelled', remove from pending payments
        if (updateData.status === 'Delivered' || updateData.status === 'Cancelled') {
          setPendingPaymentOrders(prevOrders => 
            prevOrders.filter(order => 
              order.id !== updateData.orderNumber && 
              order._id !== updateData._id &&
              order._id !== updateData.orderId
            )
          );
          
          // Reset active order if it matches
          if (paymentDetails._id === updateData._id || 
              paymentDetails._id === updateData.orderId ||
              paymentDetails.orderId === updateData.orderNumber) {
            setActiveOrderId(null);
          }
        }
      };

      // Set up socket event listeners
      if (socket) {
        console.log('Setting up QR payment screen socket listeners');
        
        // Listen for new pending payments
        onSocketEvent('new_pending_payment', handleNewPendingPayment);
        onSocketEvent('new_order_assigned', handleNewPendingPayment); // Also listen to new assignments
        
        // Listen for payment completions
        onSocketEvent('payment_completed', handlePaymentCompleted);
        onSocketEvent('orderStatusUpdated', handleOrderStatusUpdate);
        onSocketEvent('assigned_order_update', handleOrderStatusUpdate);
        
        // Handle socket connection events
        socket.on('connect', () => {
          console.log('✅ Socket connected in QR payment screen');
          const currentUserId = userId || store.getState().auth.userId;
          const currentRole = role || store.getState().auth.role;
          if (currentUserId) {
            joinSocketRooms(currentUserId, currentRole);
          }
        });
        
        socket.on('disconnect', () => {
          console.log('❌ Socket disconnected in QR payment screen');
        });

        socket.on('reconnect', () => {
          console.log('🔄 Socket reconnected in QR payment screen');
          const currentUserId = userId || store.getState().auth.userId;
          const currentRole = role || store.getState().auth.role;
          if (currentUserId) {
            joinSocketRooms(currentUserId, currentRole);
          }
        });
      } else {
        console.log('⚠️ Socket not available for QR payment screen');
      }

      // Return cleanup function
      return () => {
        console.log('Cleaning up QR payment screen socket listeners');
        offSocketEvent('new_pending_payment', handleNewPendingPayment);
        offSocketEvent('new_order_assigned', handleNewPendingPayment);
        offSocketEvent('payment_completed', handlePaymentCompleted);
        offSocketEvent('orderStatusUpdated', handleOrderStatusUpdate);
        offSocketEvent('assigned_order_update', handleOrderStatusUpdate);
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
  }, [userId, token, role, paymentDetails._id, paymentDetails.orderId]);

  // Handle go back
  const handleGoBack = () => {
    router.back();
  };

  // Render a pending order item
  const renderOrderItem = ({ item }: { item: PendingPaymentOrder }) => (
    <TouchableOpacity
      key={item.id}
      style={styles.orderItem}
      onPress={() => selectOrder(item.id, item._id, item.amount, item.customerName)}
    >
      <View style={styles.orderItemLeft}>
        <Text style={styles.orderIdText}>Order #{item.id}</Text>
        <Text style={styles.customerNameText}>{item.customerName}</Text>
      </View>
      <View style={styles.orderAmountContainer}>
        <Text style={styles.orderAmountText}>₹{item.amount.toFixed(2)}</Text>
        <View style={styles.orderStatusBadge}>
          <Text style={styles.orderStatusText}>PENDING</Text>
        </View>
      </View>
    </TouchableOpacity>
  );

  // Show loading state while fetching business settings
  if (businessSettingsLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="#1c1917" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#1c1917" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Payment Collection</Text>
          <Text style={styles.subtitle}>
            Scan QR to collect cash on delivery payments
          </Text>
        </View>
      </View>

      {loading && !refreshing && !activeOrderId ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#1c1917" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleOrdersRefresh}
              colors={['#1c1917']}
              tintColor="#1c1917"
            />
          }
        >
          {!activeOrderId ? (
            <>
              {/* <View style={styles.pageHeaderContainer}>
                <View>
                  <Text style={styles.sectionTitle}>Pending Payments</Text>
                  <Text style={styles.sectionDescription}>
                    Select an order to generate payment QR
                  </Text>
                </View>
              </View> */}
              
              {pendingPaymentOrders.length === 0 ? (
                <EmptyPaymentsView onRefresh={handleOrdersRefresh} refreshing={refreshing} />
              ) : (
                <View style={styles.selectOrderContainer}>
                  <FlatList
                    data={pendingPaymentOrders}
                    renderItem={renderOrderItem}
                    keyExtractor={(item) => item._id}
                    scrollEnabled={false}
                    style={styles.ordersList}
                  />
                </View>
              )}
            </>
          ) : (
            <>
              <View style={styles.orderInfoContainer}>
                <Text style={styles.customerNameLarge}>{paymentDetails.customerName}</Text>
                <View style={styles.orderDetailRow}>
                  <Text style={styles.orderIdLarge}>Order #{paymentDetails.orderId}</Text>
                  <Text style={styles.orderAmountLarge}>₹{paymentDetails.amount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.changeOrderButton}
                  onPress={() => setActiveOrderId(null)}
                >
                  <Text style={styles.changeOrderText}>Change Order</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.qrContainer}>
                <View style={styles.qrHeaderRow}>
                  <QrCode size={20} color="#FF6B00" />
                  <Text style={styles.qrTitle}>Payment QR Code</Text>
                </View>
                
                {refreshing ? (
                  <View style={styles.refreshingContainer}>
                    <ActivityIndicator size="large" color="#1c1917" />
                    <Text style={styles.refreshingText}>Refreshing QR Code...</Text>
                  </View>
                ) : (
                  <>
                    <View style={styles.qrImageContainer}>
                      <Image
                        source={{ uri: getQRCodeUrl() }}
                        style={styles.qrImage}
                        resizeMode="contain"
                      />
                      <View style={styles.qrOverlay}>
                        <Image
                          source={{ uri: 'https://i.imgur.com/8YsYwKL.png' }}
                          style={styles.logoOverlay}
                        />
                      </View>
                    </View>
                  </>
                )}

                <View style={styles.refreshSection}>
                  <View style={styles.lastUpdatedContainer}>
                    <Clock size={12} color="#95a5a6" />
                    <Text style={styles.lastRefreshText}>
                      Updated: {new Date(lastRefresh).toLocaleTimeString()}
                    </Text>
                  </View>
                  
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw size={14} color="#FFFFFF" />
                    <Text style={styles.refreshButtonText}>Refresh</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.paymentDetailsContainer}>
                <View style={styles.paymentDetailHeader}>
                  <FileText size={18} color="#1c1917" />
                  <Text style={styles.paymentDetailHeaderText}>Payment Details</Text>
                  <TouchableOpacity 
                    style={styles.copyAllButton} 
                    onPress={copyAllPaymentDetails}
                  >
                    <Copy size={14} color="#FFFFFF" />
                    <Text style={styles.copyAllButtonText}>Copy All</Text>
                  </TouchableOpacity>
                </View>
                
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Shop Name</Text>
                  <Text style={styles.paymentDetailValue}>{businessSettings?.businessInfo?.name || businessSettings?.bankDetails.accountName || 'N/A'}</Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Amount</Text>
                  <Text style={styles.paymentDetailValue}>₹{paymentDetails.amount.toFixed(2)}</Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Order ID</Text>
                  <Text style={styles.paymentDetailValue}>{paymentDetails.orderId}</Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>UPI ID</Text>
                  <Text style={styles.paymentDetailValue} numberOfLines={1} ellipsizeMode="middle">
                    {businessSettings?.upiId || 'N/A'}
                  </Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Account Name</Text>
                  <Text style={styles.paymentDetailValue}>{businessSettings?.bankDetails.accountName || 'N/A'}</Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Account Number</Text>
                  <Text style={styles.paymentDetailValue}>{businessSettings?.bankDetails.accountNumber || 'N/A'}</Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>IFSC Code</Text>
                  <Text style={styles.paymentDetailValue}>{businessSettings?.bankDetails.ifscCode || 'N/A'}</Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Bank Name</Text>
                  <Text style={styles.paymentDetailValue}>{businessSettings?.bankDetails.bankName || 'N/A'}</Text>
                </View>

                <TouchableOpacity
                  style={styles.whatsappShareButton}
                  onPress={sharePaymentDetailsViaWhatsApp}
                >
                  <Share2 size={18} color="#FFFFFF" />
                  <Text style={styles.whatsappShareButtonText}>Share via WhatsApp</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.instructionsContainer}>
                <View style={styles.instructionsHeader}>
                  <AlertCircle size={18} color="#1c1917" />
                  <Text style={styles.instructionsTitle}>Payment Instructions</Text>
                </View>
                
                <View style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <Text style={styles.instructionNumberText}>1</Text>
                  </View>
                  <Text style={styles.instructionText}>Ask customer to open any UPI app</Text>
                </View>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <Text style={styles.instructionNumberText}>2</Text>
                  </View>
                  <Text style={styles.instructionText}>Scan this QR code to make payment</Text>
                </View>
                <View style={styles.instructionItem}>
                  <View style={styles.instructionNumber}>
                    <Text style={styles.instructionNumberText}>3</Text>
                  </View>
                  <Text style={styles.instructionText}>Verify payment confirmation and press confirm</Text>
                </View>
              </View>

              <View style={styles.actionButtonsContainer}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={() => {
                    showConfirmationModal(
                      'Confirm Payment',
                      'Has the customer completed the payment?',
                      () => {
                        closeConfirmationModal();
                        confirmPayment();
                      },
                      'Confirm',
                      '#2ECC71'
                    );
                  }}
                  disabled={loading}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color="#FFFFFF" />
                  ) : (
                    <>
                      <CheckCircle2 size={20} color="#FFFFFF" />
                      <Text style={styles.actionButtonText}>Confirm Payment</Text>
                    </>
                  )}
                </TouchableOpacity>
              </View>
            </>
          )}
        </ScrollView>
      )}

      <View style={styles.footer}>
        <Text style={styles.footerText}>
          Ask customers to scan this QR code with any UPI app
        </Text>
      </View>

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
        onConfirm={async () => {
          closeConfirmationModal();
          await confirmationModal.onConfirm();
        }}
        confirmText={confirmationModal.confirmText}
        confirmColor={confirmationModal.confirmColor}
        onCancel={closeConfirmationModal}
      />
    </SafeAreaView>
  );
};

const { width } = Dimensions.get('window');
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9F9F9',
  },
  centered: {
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
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  subtitle: {
    fontSize: 14,
    color: '#636e72',
    marginTop: 4,
  },
  contentContainer: {
    padding: 20,
    paddingBottom: 100,
  },
  pageHeaderContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  selectOrderContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#636e72',
    marginTop: 4,
  },
  refreshOrdersButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  ordersList: {
    marginTop: 8,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderItemLeft: {
    flex: 1,
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  customerNameText: {
    fontSize: 14,
    color: '#636e72',
    marginTop: 4,
  },
  orderAmountContainer: {
    alignItems: 'flex-end',
  },
  orderAmountText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  orderStatusBadge: {
    marginTop: 6,
    backgroundColor: '#FFF0E6',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  orderStatusText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#FF6B00',
  },
  orderInfoContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  customerNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1c1917',
    marginBottom: 12,
  },
  orderDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderIdLarge: {
    fontSize: 16,
    color: '#636e72',
  },
  orderAmountLarge: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1917',
  },
  changeOrderButton: {
    marginTop: 20,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  changeOrderText: {
    fontSize: 14,
    color: '#1c1917',
    fontWeight: '600',
  },
  qrContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  qrHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    marginBottom: 16,
  },
  qrTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginLeft: 8,
  },
  qrImageContainer: {
    padding: 20,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
    position: 'relative',
  },
  refreshingContainer: {
    width: width * 0.7,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  refreshingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#636e72',
  },
  qrImage: {
    width: width * 0.7,
    height: width * 0.7,
  },
  qrOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoOverlay: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#fff',
  },
  refreshSection: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  refreshButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#FFFFFF',
    fontWeight: '600',
  },
  lastUpdatedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  lastRefreshText: {
    fontSize: 12,
    color: '#95a5a6',
    marginLeft: 4,
  },
  paymentDetailsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  paymentDetailHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  paymentDetailHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginLeft: 8,
    flex: 1,
  },
  copyAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1917',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  copyAllButtonText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    minHeight: 48,
  },
  paymentDetailLabel: {
    fontSize: 14,
    color: '#636e72',
  },

  paymentDetailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1917',
    marginRight: 8,
    flex: 1,
  },

  whatsappShareButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#25D366',
    borderRadius: 12,
    paddingVertical: 16,
    marginTop: 20,
  },
  whatsappShareButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 10,
    fontSize: 16,
  },
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 2,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F0F0F0',
  },
  instructionsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginLeft: 8,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  instructionNumber: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  instructionNumberText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: 'bold',
  },
  instructionText: {
    fontSize: 14,
    color: '#636e72',
    flex: 1,
  },
  actionButtonsContainer: {
    marginBottom: 30,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 12,
  },

  confirmButton: {
    backgroundColor: '#2ECC71',
  },
  actionButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 10,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#F0F0F0',
    alignItems: 'center',
  },
  footerText: {
    fontSize: 14,
    color: '#636e72',
    textAlign: 'center',
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
  
  // Empty state styles
  emptyContainer: {
    flex: 1,
    backgroundColor: '#F9F9F9',
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyImageWrapper: {
    width: '100%',
    height: 200,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyImage: {
    width: width * 0.7,
    height: 180,
  },
  emptyContent: {
    alignItems: 'center',
    // paddingHorizontal: 16,
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
    marginBottom: 24,
  },
  emptyInfoContainer: {
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 24,
  },
  infoCard: {
    width: '31%',
    backgroundColor: '#FAFAFA',
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F0F0F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 4,
    textAlign: 'center',
  },
  infoText: {
    fontSize: 10,
    color: '#636e72',
    textAlign: 'center',
    lineHeight: 14,
  },
  refreshOrdersButtonLarge: {
    backgroundColor: '#1c1917',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  }
});

export default QRPaymentScreen;