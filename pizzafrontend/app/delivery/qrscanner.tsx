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
  FlatList
} from 'react-native';
import { ArrowLeft, Share2, RefreshCw, Clock, Copy, CheckCircle2, ExternalLink } from 'lucide-react-native';
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
      <View>
        <Text style={styles.orderIdText}>#{item.id}</Text>
        <Text style={styles.customerNameText}>{item.customerName}</Text>
      </View>
      <View style={styles.orderAmountContainer}>
        <Text style={styles.orderAmountText}>₹{item.amount.toFixed(2)}</Text>
        <Text style={styles.pendingText}>PENDING</Text>
      </View>
    </TouchableOpacity>
  );

  // Show loading state while fetching business settings
  if (businessSettingsLoading) {
    return (
      <SafeAreaView style={[styles.container, styles.centered]} edges={['top', 'left', 'right']}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading payment details...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#2d3436" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Payment QR</Text>
          <Text style={styles.subtitle}>
            Scan to collect cash on delivery payments
          </Text>
        </View>
      </View>

      {loading && !refreshing && !activeOrderId ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <ScrollView
          contentContainerStyle={styles.contentContainer}
          showsVerticalScrollIndicator={false}
        >
          {!activeOrderId ? (
            <View style={styles.selectOrderContainer}>
              <View style={styles.sectionHeaderRow}>
                <View>
                  <Text style={styles.sectionTitle}>Pending Payments</Text>
                  <Text style={styles.sectionDescription}>
                    Select an order to generate payment QR
                  </Text>
                </View>

                <TouchableOpacity
                  style={styles.refreshOrdersButton}
                  onPress={handleOrdersRefresh}
                  disabled={refreshing}
                >
                  {refreshing ? (
                    <ActivityIndicator size="small" color="#FF6B00" />
                  ) : (
                    <RefreshCw size={18} color="#FF6B00" />
                  )}
                </TouchableOpacity>
              </View>

              {pendingPaymentOrders.length === 0 ? (
                <View style={styles.noOrdersContainer}>
                  <Text style={styles.noOrdersText}>No pending payments found</Text>
                  <TouchableOpacity
                    style={styles.refreshOrdersButtonLarge}
                    onPress={handleOrdersRefresh}
                    disabled={refreshing}
                  >
                    {refreshing ? (
                      <ActivityIndicator size="small" color="#FFFFFF" />
                    ) : (
                      <>
                        <RefreshCw size={16} color="#FFFFFF" />
                        <Text style={styles.refreshOrdersButtonText}>Refresh</Text>
                      </>
                    )}
                  </TouchableOpacity>
                </View>
              ) : (
                <FlatList
                  data={pendingPaymentOrders}
                  renderItem={renderOrderItem}
                  keyExtractor={(item) => item._id}
                  scrollEnabled={false}
                  style={styles.ordersList}
                />
              )}
            </View>
          ) : (
            <>
              <View style={styles.orderInfoContainer}>
                <Text style={styles.customerNameLarge}>{paymentDetails.customerName}</Text>
                <View style={styles.orderDetailRow}>
                  <Text style={styles.orderIdLarge}>#{paymentDetails.orderId}</Text>
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
                {refreshing ? (
                  <View style={styles.refreshingContainer}>
                    <ActivityIndicator size="large" color="#FF6B00" />
                    <Text style={styles.refreshingText}>Refreshing QR Code...</Text>
                  </View>
                ) : (
                  <>
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
                  </>
                )}

                <View style={styles.refreshSection}>
                  <TouchableOpacity
                    style={styles.refreshButton}
                    onPress={handleRefresh}
                    disabled={refreshing}
                  >
                    <RefreshCw size={16} color="#FF6B00" />
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
                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>Shop Name</Text>
                  <Text style={styles.paymentDetailValue}>{shopPaymentDetails.merchantName}</Text>
                </View>

                <View style={styles.paymentDetailRow}>
                  <Text style={styles.paymentDetailLabel}>UPI ID</Text>
                  <View style={styles.paymentDetailValueContainer}>
                    <Text style={styles.paymentDetailValue}>{shopPaymentDetails.upiId}</Text>
                    <TouchableOpacity onPress={copyUpiId}>
                      <Copy size={16} color="#FF6B00" />
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
                  <ExternalLink size={16} color="#FFFFFF" />
                  <Text style={styles.upiAppButtonText}>Open in UPI App</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.instructionsContainer}>
                <Text style={styles.instructionsTitle}>Payment Instructions</Text>
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
                  <Text style={styles.actionButtonText}>Share Payment</Text>
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
    backgroundColor: '#f5f6fa',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eaeaea',
  },
  backButton: {
    marginRight: 16,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#2d3436',
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
  selectOrderContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
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
    color: '#2d3436',
  },
  sectionDescription: {
    fontSize: 14,
    color: '#636e72',
    marginTop: 4,
  },
  refreshOrdersButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#f1f2f6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  refreshOrdersButtonLarge: {
    flexDirection: 'row',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 12,
  },
  refreshOrdersButtonText: {
    color: 'white',
    marginLeft: 8,
    fontWeight: '600',
  },
  ordersList: {
    marginTop: 8,
  },
  orderItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  orderIdText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
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
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  pendingText: {
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: '600',
    marginTop: 4,
  },
  orderInfoContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  customerNameLarge: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 8,
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
    fontSize: 22,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  changeOrderButton: {
    marginTop: 16,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
    alignItems: 'center',
  },
  changeOrderText: {
    fontSize: 14,
    color: '#3498db',
    fontWeight: '600',
  },
  qrContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  refreshingContainer: {
    width: width * 0.7,
    height: width * 0.7,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderStyle: 'dashed',
  },
  refreshingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#636e72',
  },
  qrImage: {
    width: width * 0.7,
    height: width * 0.7,
    marginVertical: 20,
  },
  qrOverlay: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: 60,
    height: 60,
    marginLeft: -30,
    marginTop: -10,
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
    marginTop: 10,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
  },
  refreshButtonText: {
    marginLeft: 6,
    fontSize: 14,
    color: '#FF6B00',
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
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  paymentDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
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
    color: '#2d3436',
    marginRight: 10,
  },
  upiAppButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    paddingVertical: 12,
    marginTop: 16,
  },
  upiAppButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    marginLeft: 8,
    fontSize: 14,
  },
  instructionsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 20,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 16,
  },
  instructionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  instructionNumber: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#FF6B00',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  instructionNumberText: {
    color: '#fff',
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
    backgroundColor: '#3498db',
  },
  confirmButton: {
    backgroundColor: '#27ae60',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
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
  noOrdersContainer: {
    alignItems: 'center',
    padding: 24,
  },
  noOrdersText: {
    fontSize: 16,
    color: '#636e72',
    marginBottom: 16,
  },
});

export default QRPaymentScreen;