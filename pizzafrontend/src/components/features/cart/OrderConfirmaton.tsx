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
  Ionicons
} from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../redux/store';
import { clearCart } from '../../../../redux/slices/cartSlice';

interface OrderConfirmationProps {
  onFinish: () => void;
  paymentMethod: 'razorpay' | 'cod';
  paymentDetails?: any;
  deliveryAddress: {
    street: string;
    city: string;
    state: string;
    postalCode: string;
    landmark?: string;
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
  const total = useSelector((state: RootState) => state.cart.total);

  // Generate a random order ID
  const orderId = `OD${Math.floor(100000 + Math.random() * 900000)}`;

  // Calculate estimated delivery time (30-45 mins from now)
  const now = new Date();
  const deliveryEnd = new Date(now.getTime() + 45 * 60000);

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleContinueOrdering = () => {
    // Clear the cart and finish the checkout process
    dispatch(clearCart());
    onFinish();
  };

  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={{ paddingBottom: 80 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Success Animation/Image */}
        <View style={styles.animationContainer}>
          <Image 
            source={{ uri: 'https://cdn-icons-png.flaticon.com/512/190/190411.png' }} 
            style={styles.successImage} 
            resizeMode="contain"
          />
        </View>

        {/* Order Success Message */}
        <View style={styles.successMessageContainer}>
          <Text style={styles.successTitle}>Order Placed Successfully!</Text>
          <Text style={styles.successMessage}>
            Your order has been confirmed and will be delivered by {formatTime(deliveryEnd)}
          </Text>
        </View>

        {/* Order Details Card - Simplified */}
        <View style={styles.orderCard}>
          <View style={styles.orderIdContainer}>
            <Text style={styles.orderIdLabel}>Order ID</Text>
            <Text style={styles.orderId}>{orderId}</Text>
          </View>

          <View style={styles.divider} />

          {/* Payment Method - Simplified */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <MaterialIcons name="payments" size={20} color="#FF6B00" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Payment</Text>
              <Text style={styles.detailValue}>
                {paymentMethod === 'razorpay' ? 'Paid Online' : 'Cash on Delivery'}
              </Text>
            </View>
          </View>

          {/* Order Summary - Simplified */}
          <View style={styles.detailRow}>
            <View style={styles.detailIconContainer}>
              <AntDesign name="shoppingcart" size={20} color="#FF6B00" />
            </View>
            <View style={styles.detailContent}>
              <Text style={styles.detailLabel}>Order</Text>
              <Text style={styles.detailValue}>{cartItems.length} items · ₹{total.toFixed(2)}</Text>
            </View>
          </View>
        </View>

        {/* Delivery Illustration */}
        <View style={styles.illustrationContainer}>
          <Image 
            source={{ uri: 'https://img.freepik.com/free-vector/food-delivery-illustration-concept_114360-120.jpg' }} 
            style={styles.deliveryIllustration}
            resizeMode="contain"
          />
        </View>

        {/* Tips for what's next */}
        <View style={styles.tipsCard}>
          <Text style={styles.tipsTitle}>What's next?</Text>
          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <Ionicons name="restaurant-outline" size={16} color="#FF6B00" />
            </View>
            <Text style={styles.tipText}>We're preparing your delicious food</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <Ionicons name="bicycle-outline" size={16} color="#FF6B00" />
            </View>
            <Text style={styles.tipText}>Our delivery partner will pick up your order soon</Text>
          </View>
          <View style={styles.tipItem}>
            <View style={styles.tipIcon}>
              <Ionicons name="call-outline" size={16} color="#FF6B00" />
            </View>
            <Text style={styles.tipText}>You'll get a call when they're on their way</Text>
          </View>
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinueOrdering}
        >
          <Text style={styles.continueText}>Continue Ordering</Text>
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
    marginTop: 30,
    marginBottom: 20,
  },
  successImage: {
    width: 100,
    height: 100,
  },
  successMessageContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  successMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 40,
    lineHeight: 22,
  },
  orderCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
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
    marginBottom: 16,
    alignItems: 'center',
  },
  detailIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#FFF4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  detailContent: {
    flex: 1,
  },
  detailLabel: {
    fontSize: 13,
    color: '#666',
    marginBottom: 4,
  },
  detailValue: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  illustrationContainer: {
    alignItems: 'center',
    marginVertical: 16,
  },
  deliveryIllustration: {
    width: '100%',
    height: 200,
    borderRadius: 12,
  },
  tipsCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 24,
  },
  tipsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  tipIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#FFF4E6',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  tipText: {
    fontSize: 15,
    color: '#555',
    flex: 1,
  },
  footer: {
    backgroundColor: 'white',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
});

export default OrderConfirmation;