import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Image,
  ScrollView,
  Platform
} from 'react-native';
import {
  AntDesign,
  MaterialIcons,
  FontAwesome5,
  Ionicons
} from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../redux/store';
import { clearCart } from '../../../../redux/slices/cartSlice';
// import LottieView from 'lottie-react-native';

interface OrderConfirmationProps {
  onFinish: () => void;
  paymentMethod: 'razorpay' | 'cod';
  paymentDetails?: any;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
  };
}

const OrderConfirmation = ({
  onFinish,
  paymentMethod,
  paymentDetails,
  deliveryAddress
}: OrderConfirmationProps) => {
  const dispatch = useDispatch();

  // Get cart items and discount from Redux
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const discount = useSelector((state: RootState) => state.cart.discount);
  
  // Calculate total with tax, delivery fee and discount
  const total = useSelector((state: RootState) =>
    state.cart.items.reduce((sum, item) => {
      let itemTotal = item.price * item.quantity;
      // Add customization prices if any
      if (item.customizations) {
        Object.values(item.customizations).forEach(option => {
          itemTotal += option.price * item.quantity;
        });
      }
      return sum + itemTotal;
    }, 0) +
    // Add delivery fee and tax
    (state.cart.items.length > 0 ? state.cart.deliveryFee : 0) +
    (state.cart.items.reduce((sum, item) => {
      let itemTotal = item.price * item.quantity;
      if (item.customizations) {
        Object.values(item.customizations).forEach(option => {
          itemTotal += option.price * item.quantity;
        });
      }
      return sum + itemTotal;
    }, 0) * state.cart.taxRate)
  );

  // Generate a random order ID
  const orderId = `OD${Math.floor(100000 + Math.random() * 900000)}`;

  // Calculate estimated delivery time (30-45 mins from now)
  const now = new Date();
  const deliveryStart = new Date(now.getTime() + 30 * 60000);
  const deliveryEnd = new Date(now.getTime() + 45 * 60000);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTrackOrder = () => {
    // Navigate to order tracking screen (to be implemented)
    alert('Track Order functionality will be implemented soon');
  };

  const handleContinueShopping = () => {
    // Clear the cart and finish the checkout process
    dispatch(clearCart());
    onFinish();
  };

  return (
    <View style={styles.container}>
      <ScrollView style={styles.content}>
        {/* Success Animation */}
        <View style={styles.animationContainer}>
          {/* Replace with actual Lottie animation */}
          <View style={styles.successCircle}>
            <AntDesign name="checkcircle" size={60} color="#4CAF50" />
          </View>
        </View>

        {/* Order Success Message */}
        <View style={styles.successMessageContainer}>
          <Text style={styles.successTitle}>Order Placed Successfully!</Text>
          <Text style={styles.successMessage}>
            Your order has been placed and will be on its way soon.
          </Text>
        </View>

        {/* Order Details Card */}
        <View style={styles.orderCard}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>Order ID</Text>
            <Text style={styles.orderId}>{orderId}</Text>
          </View>

          <View style={styles.divider} />

          {/* Payment Info */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <MaterialIcons name="payments" size={20} color="#FF6B00" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Payment Method</Text>
              <Text style={styles.detailValue}>
                {paymentMethod === 'razorpay' ? 'Paid Online' : 'Cash on Delivery'}
              </Text>
              {paymentMethod === 'razorpay' && paymentDetails?.razorpay_payment_id && (
                <Text style={styles.paymentId}>
                  Transaction ID: {paymentDetails.razorpay_payment_id}
                </Text>
              )}
            </View>
          </View>

          {/* Delivery Address */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <Ionicons name="location-outline" size={20} color="#FF6B00" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Delivery Address</Text>
              <Text style={styles.detailValue}>{deliveryAddress.street}</Text>
              <Text style={styles.detailSubvalue}>
                {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postalCode}
              </Text>
            </View>
          </View>

          {/* Delivery Time */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <AntDesign name="clockcircleo" size={20} color="#FF6B00" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Estimated Delivery</Text>
              <Text style={styles.detailValue}>
                {formatTime(deliveryStart)} - {formatTime(deliveryEnd)}
              </Text>
              <View style={styles.etaContainer}>
                <View style={styles.etaProgress}>
                  <View style={styles.etaProgressFilled} />
                </View>
                <View style={styles.etaSteps}>
                  <View style={[styles.etaStep, styles.etaStepActive]}>
                    <FontAwesome5 name="receipt" size={12} color="#FFF" />
                  </View>
                  <View style={styles.etaStep}>
                    <FontAwesome5 name="utensils" size={12} color="#999" />
                  </View>
                  <View style={styles.etaStep}>
                    <FontAwesome5 name="motorcycle" size={12} color="#999" />
                  </View>
                  <View style={styles.etaStep}>
                    <FontAwesome5 name="home" size={12} color="#999" />
                  </View>
                </View>
              </View>
            </View>
          </View>

          {/* Order Summary */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <AntDesign name="filetext1" size={20} color="#FF6B00" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Order Summary</Text>
              <Text style={styles.detailValue}>{cartItems.length} items</Text>

              {/* Show discount if applied */}
              {discount && (
                <Text style={styles.discountApplied}>
                  Code: {discount.code} ({discount.type === 'percentage'
                    ? `${discount.value}%`
                    : `₹${discount.value}`} OFF)
                </Text>
              )}

              <Text style={styles.orderAmount}>₹{total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Tips for Delivery */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>While You Wait</Text>
          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <Ionicons name="bookmark-outline" size={16} color="#FF6B00" />
            </View>
            <Text style={styles.tipText}>Track your order status in real-time</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <Ionicons name="call-outline" size={16} color="#FF6B00" />
            </View>
            <Text style={styles.tipText}>Our delivery agent will call you on arrival</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.trackOrderButton}
          onPress={handleTrackOrder}
        >
          <Text style={styles.trackOrderText}>Track Order</Text>
          <MaterialIcons name="delivery-dining" size={20} color="#FF6B00" />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinueShopping}
        >
          <Text style={styles.continueText}>Continue Shopping</Text>
          <AntDesign name="arrowright" size={18} color="#FFF" />
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  animationContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 20,
  },
  successCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#E8F5E9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  successMessageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  successMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
    marginBottom: 16,
  },
  orderIdContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderIdLabel: {
    fontSize: 14,
    color: '#666',
  },
  orderId: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEEEEE',
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 20,
  },
  detailIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#FFF4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  detailSubvalue: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  paymentId: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  etaContainer: {
    marginTop: 8,
  },
  etaProgress: {
    height: 4,
    backgroundColor: '#EEEEEE',
    borderRadius: 2,
    marginBottom: 4,
  },
  etaProgressFilled: {
    width: '25%',
    height: 4,
    backgroundColor: '#FF6B00',
    borderRadius: 2,
  },
  etaSteps: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  etaStep: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  etaStepActive: {
    backgroundColor: '#FF6B00',
  },
  orderAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
    marginTop: 4,
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  tipIcon: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#FFF4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipText: {
    fontSize: 14,
    color: '#666',
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  trackOrderButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#FF6B00',
    borderRadius: 12,
    marginBottom: 12,
  },
  trackOrderText: {
    color: '#FF6B00',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    padding: 16,
    borderRadius: 12,
  },
  continueText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginRight: 8,
  },
  discountApplied: {
    fontSize: 13,
    color: '#FF6B00',
    marginTop: 2,
  },
});

export default OrderConfirmation;