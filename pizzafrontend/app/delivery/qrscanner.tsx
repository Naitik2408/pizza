import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  ActivityIndicator,
  Alert,
  Share,
  Dimensions,
  Linking,
  FlatList,
  Animated
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
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import { API_URL } from '@/config';

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
  deliveryCharges: {
    baseCharge: number;
    perKmCharge: number;
    freeDeliveryThreshold: number;
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

        <Animated.View style={{ transform: [{ scale: pulseAnim }] }}>
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
                <Text style={styles.refreshButtonText}>Check for Payments</Text>
              </>
            )}
          </TouchableOpacity>
        </Animated.View>
      </View>
    </View>
  );
};

const QRPaymentScreen = () => {
  const router = useRouter();
  const { token, name, email } = useSelector((state: RootState) => state.auth);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [pendingPaymentOrders, setPendingPaymentOrders] = useState<PendingPaymentOrder[]>([]);
  const [businessSettingsLoading, setBusinessSettingsLoading] = useState(true);

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
        merchantName: data.bankDetails.accountName,
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
      Alert.alert('Error', 'Failed to load orders. Please try again.');
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

  // Copy UPI ID to clipboard
  const copyUpiId = async () => {
    await Clipboard.setStringAsync(shopPaymentDetails.upiId);

    // Haptic feedback when copied
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Alert.alert('Copied', 'UPI ID copied to clipboard');
  };

  // Share payment details
  const sharePaymentDetails = async () => {
    try {
      await Share.share({
        message: `Payment for ${shopPaymentDetails.merchantName} 🍕\n\nAmount: ₹${paymentDetails.amount.toFixed(2)}\nUPI ID: ${shopPaymentDetails.upiId}\nReference: ${paymentDetails.orderId}\nPayment Link: ${shopPaymentDetails.paymentLink || ''}`,
        title: `${shopPaymentDetails.merchantName} Payment`
      });
    } catch (error) {
      Alert.alert('Error', 'Failed to share payment details');
    }
  };

  // Open UPI app directly (if supported by device)
  const openUpiApp = async () => {
    try {
      const upiUrl = `upi://pay?pa=${shopPaymentDetails.upiId}&pn=${encodeURIComponent(shopPaymentDetails.merchantName)}&am=${paymentDetails.amount.toFixed(2)}&cu=INR&tn=${paymentDetails.orderId}`;

      const canOpen = await Linking.canOpenURL(upiUrl);
      if (canOpen) {
        await Linking.openURL(upiUrl);
      } else {
        Alert.alert('Error', 'No UPI app found on device');
      }
    } catch (error) {
      Alert.alert('Error', 'Could not open UPI app');
    }
  };

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
      Alert.alert('Error', 'Invalid order selected');
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

      // Success feedback
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Show success and reset
      Alert.alert('Success', 'Payment confirmed and delivery completed!');

      // Reset active order and refresh list
      setActiveOrderId(null);
      fetchPendingPaymentOrders();

    } catch (error) {
      console.error('Error confirming payment:', error);
      Alert.alert('Error', 'Failed to confirm payment. Please try again.');
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
                  <QrCode size={20} color="#1c1917" />
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
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw size={16} color="#FFFFFF" />
                    <Text style={styles.refreshButtonText}>Refresh QR</Text>
                  </TouchableOpacity>

                  <View style={styles.lastUpdatedContainer}>
                    <Clock size={12} color="#95a5a6" />
                    <Text style={styles.lastRefreshText}>
                      Updated: {new Date(lastRefresh).toLocaleTimeString()}
                    </Text>
                  </View>
                </View>
              </View>

              <View style={styles.paymentDetailsContainer}>
                <View style={styles.paymentDetailHeader}>
                  <FileText size={18} color="#1c1917" />
                  <Text style={styles.paymentDetailHeaderText}>Payment Details</Text>
                </View>
                
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Shop Name</Text>
                  <Text style={styles.paymentDetailValue}>{shopPaymentDetails.merchantName}</Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>UPI ID</Text>
                  <View style={styles.paymentDetailValueContainer}>
                    <Text style={styles.paymentDetailValue}>{shopPaymentDetails.upiId}</Text>
                    <TouchableOpacity 
                      style={styles.copyButton} 
                      onPress={copyUpiId}
                    >
                      <Copy size={16} color="#FFFFFF" />
                      <Text style={styles.copyButtonText}>Copy</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Amount</Text>
                  <Text style={styles.paymentDetailValue}>₹{paymentDetails.amount.toFixed(2)}</Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Reference</Text>
                  <Text style={styles.paymentDetailValue}>{paymentDetails.orderId}</Text>
                </View>

                <TouchableOpacity
                  style={styles.upiAppButton}
                  onPress={openUpiApp}
                >
                  <ExternalLink size={18} color="#FFFFFF" />
                  <Text style={styles.upiAppButtonText}>Open in UPI App</Text>
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
                  style={[styles.actionButton, styles.shareButton]}
                  onPress={sharePaymentDetails}
                >
                  <Share2 size={20} color="#FFFFFF" />
                  <Text style={styles.actionButtonText}>Share Payment Details</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.actionButton, styles.confirmButton]}
                  onPress={() => {
                    Alert.alert(
                      'Confirm Payment',
                      'Has the customer completed the payment?',
                      [
                        {
                          text: 'Cancel',
                          style: 'cancel'
                        },
                        {
                          text: 'Confirm',
                          onPress: confirmPayment
                        }
                      ]
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
    backgroundColor: '#1c1917',
    borderRadius: 30,
    paddingVertical: 14,
    paddingHorizontal: 30,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  refreshButtonText: {
    marginLeft: 8,
    fontSize: 16,
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
    marginBottom: 16,
  },
  paymentDetailHeaderText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginLeft: 8,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
  },
  paymentDetailLabel: {
    fontSize: 14,
    color: '#636e72',
  },
  paymentDetailValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentDetailValue: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1c1917',
    marginRight: 12,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1c1917',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
  },
  copyButtonText: {
    fontSize: 12,
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 4,
  },
  upiAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#1c1917',
    borderRadius: 8,
    paddingVertical: 14,
    marginTop: 20,
  },
  upiAppButtonText: {
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
    backgroundColor: '#1c1917',
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
  shareButton: {
    backgroundColor: '#1c1917',
  },
  confirmButton: {
    backgroundColor: '#1c1917',
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