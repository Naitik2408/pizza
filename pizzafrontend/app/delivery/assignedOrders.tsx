import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  FlatList,
  Alert,
  ActivityIndicator,
  Linking,
  RefreshControl,
  Clipboard,
  Platform,
  PermissionsAndroid
} from 'react-native';
import { MapPin, Phone, MessageSquare, Navigation, Clock, Check, Package, Truck, ArrowLeft, CreditCard } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { API_URL } from '@/config';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

// Define interfaces based on data received from deliveryController.js
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
}

interface Customer {
  name: string;
  contact: string;
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
  deliveryAddress: DeliveryAddress;
  pickupLocation: PickupLocation;
  estimatedDeliveryTime: string;
  status: 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';
  paymentMethod: 'Cash on Delivery' | 'Online' | 'Card' | 'UPI';
  paymentStatus: 'Pending' | 'Completed' | 'Failed';
  distance: string;
  date: string;
}

const AssignedOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { token, name, email, role } = useSelector((state: RootState) => state.auth);
  const router = useRouter();
  const [lastRefresh, setLastRefresh] = useState(Date.now());
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to fetch orders');
      }

      const data = await response.json();
      console.log(`Fetched ${data.length} assigned orders`);

      // Log the data structure to help debug
      if (data.length > 0) {
        console.log('Sample order structure:', data[0]);
      }

      setOrders(data);

      // Update last refresh time
      setLastRefresh(Date.now());
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
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
        Alert.alert(
          'Payment Required',
          'This order requires cash on delivery payment. Please collect payment before completing delivery.',
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Collect Payment', 
              onPress: () => {
                // Navigate to QR scanner with the selected order
                router.push({
                  pathname: '/delivery/qrscanner',
                  params: { orderId: orderToUpdate._id }
                });
              }
            }
          ]
        );
        return;
      }

      // Use the MongoDB _id for the API call
      const mongoId = orderToUpdate._id;
      console.log(`Updating order ${orderId} (MongoDB ID: ${mongoId}) status to ${newStatus}`);

      const response = await fetch(`${API_URL}/api/delivery/orders/${mongoId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status: newStatus,
          note: `Status updated to ${newStatus} by delivery agent`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to update order status');
      }

      // Update local state
      setOrders(orders.map(order => {
        if (order.id === orderId) {
          return { ...order, status: newStatus };
        }
        return order;
      }));

      // Show success message
      Alert.alert('Success', `Order status updated to ${newStatus}`);

      // If delivered, refresh the list to remove the order after a short delay
      if (newStatus === 'Delivered') {
        setTimeout(() => fetchOrders(), 1000);
      }
    } catch (err: any) {
      console.error('Error updating order status:', err);
      Alert.alert('Error', err.message || 'Failed to update order status. Please try again.');
    }
  };

  // Handle pull-to-refresh
  const onRefresh = useCallback(() => {
    setRefreshing(true);
    fetchOrders();
  }, [fetchOrders]);

  const callCustomer = async (phoneNumber: string) => {
    console.log(`Attempting to call customer at: ${phoneNumber}`);

    // Check if phone number is valid
    if (!phoneNumber || phoneNumber.trim() === '') {
      console.error('Invalid phone number');
      Alert.alert("Error", "Invalid phone number");
      return;
    }

    const phoneUrl = `tel:${phoneNumber.trim()}`;

    try {
      // On Android, we need to request the CALL_PHONE permission
      if (Platform.OS === 'android') {
        try {
          const granted = await PermissionsAndroid.request(
            PermissionsAndroid.PERMISSIONS.CALL_PHONE,
            {
              title: "Phone Call Permission",
              message: "App needs access to make phone calls",
              buttonNeutral: "Ask Me Later",
              buttonNegative: "Cancel",
              buttonPositive: "OK"
            }
          );

          if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
            console.log('Phone call permission denied');
            // Still proceed to try, but it may fail
          }
        } catch (err) {
          console.warn('Error requesting call permission:', err);
        }
      }

      const supported = await Linking.canOpenURL(phoneUrl);

      if (supported) {
        console.log(`Opening phone app with number: ${phoneNumber}`);
        await Linking.openURL(phoneUrl);
      } else {
        console.log('Phone calls not supported on this device - showing alternative');

        Alert.alert(
          "Call Customer",
          `The number is: ${phoneNumber}`,
          [
            { text: "Cancel", style: "cancel" },
            {
              text: "Copy Number",
              onPress: () => {
                Clipboard.setString(phoneNumber);
                Alert.alert("Success", "Phone number copied to clipboard");
              }
            },
            {
              text: "Try Direct Call",
              onPress: () => {
                Linking.openURL(phoneUrl).catch(err => {
                  console.error('Final attempt to call failed:', err);
                  Alert.alert("Error", "Unable to initiate call. The device may not support calling.");
                });
              }
            }
          ]
        );
      }
    } catch (error) {
      console.error('Error with phone call:', error);

      Alert.alert(
        "Contact Information",
        `Customer phone: ${phoneNumber}`,
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Copy Number",
            onPress: () => {
              Clipboard.setString(phoneNumber);
              Alert.alert("Success", "Phone number copied to clipboard");
            }
          }
        ]
      );
    }
  };

  // Message customer functionality
  const messageCustomer = (phoneNumber: string) => {
    console.log(`Attempting to message customer at: ${phoneNumber}`);

    // Check if phone number is valid
    if (!phoneNumber || phoneNumber.trim() === '') {
      console.error('Invalid phone number');
      Alert.alert("Error", "Invalid phone number");
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
          Alert.alert("Error", "SMS is not supported on this device");
        }
      })
      .catch(err => {
        console.error('Error initiating SMS:', err);
        Alert.alert("Error", "Could not open messaging app. Please try again.");
      });
  };

  // Open navigation functionality
  const openNavigation = (fullAddress: string) => {
    const destination = encodeURIComponent(fullAddress);
    const url = `https://www.google.com/maps/dir/?api=1&destination=${destination}&travelmode=driving`;

    Linking.canOpenURL(url).then(supported => {
      if (supported) {
        Linking.openURL(url);
      } else {
        Alert.alert("Error", "Navigation is not supported on this device");
      }
    }).catch(err => {
      console.error('Error opening navigation:', err);
    });
  };

  // Navigate to QR payment screen with specific order
  const navigateToPaymentScreen = (order: Order) => {
    router.push({
      pathname: '/delivery/qrscanner',
      params: { orderId: order._id }
    });
  };

  // Get next status in the flow - matches backend order statuses
  const getNextStatus = (currentStatus: Order['status']): Order['status'] => {
    switch (currentStatus) {
      case 'Pending': return 'Preparing';
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

  // Set up periodic refresh (every 30 seconds) for automatic updates
  useEffect(() => {
    const intervalId = setInterval(() => {
      if (!refreshing && (Date.now() - lastRefresh) > 30000) {
        fetchOrders();
      }
    }, 30000);

    return () => clearInterval(intervalId);
  }, [fetchOrders, refreshing, lastRefresh]);

  // Load orders on component mount
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Handle go back 
  const handleGoBack = () => {
    router.back();
  };

  // Show only active orders (not Delivered or Cancelled)
  const activeOrders = orders.filter(order =>
    order.status !== 'Delivered' && order.status !== 'Cancelled'
  );

  // Render loading state
  if (loading && !refreshing && orders.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#2d3436" />
          </TouchableOpacity>
          <Text style={styles.title}>Assigned Orders</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#3498db" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && !refreshing && orders.length === 0) {
    return (
      <SafeAreaView style={[styles.container, styles.centerContent]} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
            <ArrowLeft size={24} color="#2d3436" />
          </TouchableOpacity>
          <Text style={styles.title}>Assigned Orders</Text>
        </View>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={fetchOrders}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const renderOrderItem = ({ item }: { item: Order }) => {
    // Check if this order needs payment collection
    const needsPaymentCollection = 
      item.status === 'Out for delivery' && 
      item.paymentMethod === 'Cash on Delivery' && 
      item.paymentStatus === 'Pending';

    return (
      <View style={styles.orderCard}>
        <View style={styles.orderHeader}>
          <View>
            <Text style={styles.orderId}>Order #{item.id}</Text>
            <View style={styles.statusBadge}>
              {getStatusIcon(item.status)}
              <Text style={[styles.statusText, { color: getStatusColor(item.status) }]}>
                {item.status}
              </Text>
            </View>
          </View>
          <View style={styles.timeContainer}>
            <Clock size={16} color="#666" />
            <Text style={styles.deliveryTime}>{item.estimatedDeliveryTime}</Text>
          </View>
        </View>

        {/* Payment Badge for COD orders */}
        {item.paymentMethod === 'Cash on Delivery' && (
          <View style={styles.paymentBadge}>
            <CreditCard size={14} color={item.paymentStatus === 'Pending' ? '#FF6B00' : '#2ECC71'} />
            <Text style={[styles.paymentBadgeText, { 
              color: item.paymentStatus === 'Pending' ? '#FF6B00' : '#2ECC71' 
            }]}>
              {item.paymentStatus === 'Pending' ? 'Payment Pending' : 'Payment Completed'}
            </Text>
          </View>
        )}

        <View style={styles.separator} />

        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Customer</Text>
          <Text style={styles.customerName}>{item.customer.name}</Text>

          <View style={styles.contactButtons}>
            <TouchableOpacity
              style={styles.contactButton}
              onPress={() => callCustomer(item.customer.contact)}
            >
              <Phone size={16} color="#fff" />
              <Text style={styles.contactButtonText}>Call</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: '#27ae60' }]}
              onPress={() => {
                Alert.alert(
                  "Customer Contact",
                  `Phone: ${item.customer.contact}`,
                  [
                    { text: "Cancel", style: "cancel" },
                    {
                      text: "Copy Number",
                      onPress: () => {
                        Clipboard.setString(item.customer.contact);
                        Alert.alert("Success", "Phone number copied to clipboard");
                      }
                    }
                  ]
                );
              }}
            >
              <Phone size={16} color="#fff" />
              <Text style={styles.contactButtonText}>Show #</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.contactButton, { backgroundColor: '#9b59b6' }]}
              onPress={() => messageCustomer(item.customer.contact)}
            >
              <MessageSquare size={16} color="#fff" />
              <Text style={styles.contactButtonText}>Message</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.infoSection}>
          <View style={styles.locationInfo}>
            <MapPin size={16} color="#ff4757" />
            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>Pickup</Text>
              <Text style={styles.addressText}>{item.pickupLocation.name}</Text>
              <Text style={styles.addressSubText}>{item.pickupLocation.address}</Text>
            </View>
          </View>

          <View style={styles.locationInfo}>
            <MapPin size={16} color="#2ed573" />
            <View style={styles.addressContainer}>
              <Text style={styles.addressLabel}>Delivery</Text>
              <Text style={styles.addressText}>{item.deliveryAddress.street}</Text>
              <Text style={styles.addressSubText}>
                {item.deliveryAddress.city}, {item.deliveryAddress.country}
              </Text>
              {item.deliveryAddress.notes && (
                <Text style={styles.addressNotes}>{item.deliveryAddress.notes}</Text>
              )}
            </View>
          </View>
        </View>

        <View style={styles.mapSection}>
          <View style={styles.mapImage}>
            <Image
              source={{
                uri: 'https://images.unsplash.com/photo-1569336415962-a4bd9f69c07b?q=80&w=800&auto=format&fit=crop'
              }}
              style={styles.mapImageContent}
            />
          </View>
          <TouchableOpacity
            style={styles.navigateButton}
            onPress={() => openNavigation(`${item.deliveryAddress.street}, ${item.deliveryAddress.city}, ${item.deliveryAddress.country}`)}
          >
            <Navigation size={16} color="#fff" />
            <Text style={styles.navigateButtonText}>Navigate • {item.distance}</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.orderDetails}>
          <Text style={styles.sectionTitle}>Order Details</Text>
          {item.items && item.items.map((orderItem, index) => (
            <View key={`${item.id}-item-${index}`} style={styles.orderItemRow}>
              <Text style={styles.itemName}>{orderItem.quantity}x {orderItem.name}</Text>
              <Text style={styles.itemPrice}>
                ₹{typeof orderItem.price === 'number' ? orderItem.price.toFixed(2) : '0.00'}
              </Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.totalPrice}>
              ₹{typeof item.totalPrice === 'number' ? item.totalPrice.toFixed(2) : '0.00'}
            </Text>
          </View>
        </View>

        {item.status !== 'Delivered' && item.status !== 'Cancelled' && (
          <View>
            {needsPaymentCollection ? (
              // If order needs payment collection, show collect payment button
              <TouchableOpacity
                style={styles.collectPaymentButton}
                onPress={() => navigateToPaymentScreen(item)}
              >
                <CreditCard size={18} color="#FFFFFF" />
                <Text style={styles.updateStatusText}>Collect Payment</Text>
              </TouchableOpacity>
            ) : (
              // Regular update status button
              <TouchableOpacity
                style={[styles.updateStatusButton, { backgroundColor: getStatusColor(getNextStatus(item.status)) }]}
                onPress={() => {
                  setSelectedOrder(item);
                  
                  // If next status would be 'Delivered' but payment is pending for COD, don't allow
                  if (getNextStatus(item.status) === 'Delivered' && 
                      item.paymentMethod === 'Cash on Delivery' && 
                      item.paymentStatus === 'Pending') {
                    Alert.alert(
                      'Payment Required',
                      'Please collect payment before completing the delivery.',
                      [
                        { text: 'Cancel', style: 'cancel' },
                        { 
                          text: 'Collect Payment', 
                          onPress: () => navigateToPaymentScreen(item)
                        }
                      ]
                    );
                    return;
                  }
                  
                  updateOrderStatus(item.id, getNextStatus(item.status));
                }}
              >
                <Text style={styles.updateStatusText}>
                  {item.status === 'Pending' ? 'Start Preparing' :
                    item.status === 'Preparing' ? 'Start Delivery' :
                      'Complete Delivery'}
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
        <TouchableOpacity onPress={handleGoBack} style={styles.backButton}>
          <ArrowLeft size={24} color="#2d3436" />
        </TouchableOpacity>
        <View>
          <Text style={styles.title}>Assigned Orders</Text>
          <Text style={styles.subtitle}>
            {activeOrders.length} active {activeOrders.length === 1 ? 'delivery' : 'deliveries'}
            {refreshing ? ' • Refreshing...' : ''}
          </Text>
        </View>
      </View>

      {activeOrders.length === 0 && !loading ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyImageContainer}>
            <Image
              source={{ uri: 'https://img.freepik.com/premium-vector/food-delivery-boy-riding-scooter-fast-delivery-concept_138676-605.png' }}
              style={styles.emptyImage}
            />
            <View style={styles.emptyBadge}>
              <Clock size={18} color="#FF6B00" />
              <Text style={styles.emptyBadgeText}>Standby</Text>
            </View>
          </View>

          <Text style={styles.emptyTitle}>No Active Deliveries</Text>
          <Text style={styles.emptyDescription}>
            You're all caught up! New delivery assignments will appear here when they're ready.
          </Text>

          <View style={styles.emptyTipsContainer}>
            <Text style={styles.emptyTipsTitle}>While You Wait:</Text>
            <View style={styles.emptyTip}>
              <Check size={16} color="#2ECC71" />
              <Text style={styles.emptyTipText}>Make sure your vehicle is ready</Text>
            </View>
            <View style={styles.emptyTip}>
              <Check size={16} color="#2ECC71" />
              <Text style={styles.emptyTipText}>Check that your phone is charged</Text>
            </View>
            <View style={styles.emptyTip}>
              <Check size={16} color="#2ECC71" />
              <Text style={styles.emptyTipText}>Stay in the delivery zone area</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.pulsingRefreshButton}
            onPress={onRefresh}
            disabled={refreshing}
          >
            {refreshing ? (
              <ActivityIndicator color="#FFFFFF" size="small" />
            ) : (
              <Text style={styles.refreshButtonText}>Check for New Orders</Text>
            )}
          </TouchableOpacity>

          <Text style={styles.lastRefreshText}>
            Last checked: {new Date(lastRefresh).toLocaleTimeString()}
          </Text>
        </View>
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
              colors={['#3498db', '#2ecc71']}
              tintColor="#3498db"
              title="Checking for new orders..."
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
    backgroundColor: '#f5f6fa',
  },
  centerContent: {
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
  ordersList: {
    padding: 16,
    paddingBottom: 120, // Extra padding to prevent bottom tab overlap
  },
  orderCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8f9fa',
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  paymentBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  orderId: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 4,
  },
  timeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deliveryTime: {
    marginLeft: 4,
    fontSize: 14,
    color: '#636e72',
    fontWeight: '500',
  },
  separator: {
    height: 1,
    backgroundColor: '#eaeaea',
    marginVertical: 12,
  },
  customerSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: '#636e72',
    marginBottom: 8,
  },
  customerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 8,
  },
  contactButtons: {
    flexDirection: 'row',
  },
  contactButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3498db',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginRight: 12,
  },
  contactButtonText: {
    color: '#fff',
    fontWeight: '500',
    marginLeft: 6,
  },
  infoSection: {
    marginBottom: 16,
  },
  locationInfo: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  addressContainer: {
    marginLeft: 12,
    flex: 1,
  },
  addressLabel: {
    fontSize: 12,
    color: '#636e72',
    marginBottom: 2,
  },
  addressText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#2d3436',
  },
  addressSubText: {
    fontSize: 14,
    color: '#636e72',
  },
  addressNotes: {
    fontSize: 13,
    color: '#e17055',
    fontStyle: 'italic',
    marginTop: 2,
  },
  mapSection: {
    marginBottom: 16,
    position: 'relative',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapImage: {
    height: 150,
    width: '100%',
    backgroundColor: '#e0e0e0',
    borderRadius: 12,
    overflow: 'hidden',
  },
  mapImageContent: {
    width: '100%',
    height: '100%',
  },
  mapOverlay: {
    opacity: 0.7,
    position: 'absolute',
  },
  navigateButton: {
    position: 'absolute',
    bottom: 12,
    right: 12,
    backgroundColor: '#2d3436',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  navigateButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '500',
  },
  orderDetails: {
    marginBottom: 16,
  },
  orderItemRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 14,
    color: '#2d3436',
  },
  itemPrice: {
    fontSize: 14,
    color: '#2d3436',
    fontWeight: '500',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#eaeaea',
  },
  totalLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#2d3436',
  },
  totalPrice: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#2d3436',
  },
  updateStatusButton: {
    backgroundColor: '#3498db',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  collectPaymentButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  updateStatusText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
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
    backgroundColor: '#3498db',
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
  emptyImageContainer: {
    position: 'relative',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.1,
    shadowRadius: 15,
    elevation: 10,
  },
  emptyImage: {
    width: 200, 
    height: 200,
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
  },
  emptyTipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#2d3436',
    marginBottom: 12,
  },
  emptyTip: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  emptyTipText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#636e72',
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
  }
});

export default AssignedOrders;