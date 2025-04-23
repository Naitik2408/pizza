import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, Platform } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import {
  selectCartItems,
  updateQuantity,
  removeFromCart,
  clearCart,
  selectSubtotal,
  selectDeliveryFee,
  selectTaxAmount,
  selectTotal
} from '../../../../redux/slices/cartSlice';

// Import checkout flow components
import AddressSelection from './AddressSelection';
import PaymentMethod from './PaymentMethod';
import OrderConfirmation from './OrderConfirmaton';

// Replace your current Address interface with this:
import { Address } from '../../../Api/addressApi';

// The rest of your code remains the same

// Define the types for address
// interface Address {
//   id: string;
//   name: string;
//   phone: string;
//   addressLine1: string;
//   addressLine2: string;
//   city: string;
//   state: string;
//   zipCode: string;
//   isDefault: boolean;
// }

// Define checkout steps
type CheckoutStep = 'cart' | 'address' | 'payment' | 'confirmation';

const Cart = () => {
  const router = useRouter();
  const dispatch = useDispatch();

  // State for checkout flow
  const [checkoutStep, setCheckoutStep] = useState<CheckoutStep>('cart');
  const [selectedAddress, setSelectedAddress] = useState<Address | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    method: 'razorpay' | 'cod';
    details?: any;
  } | null>(null);

  // Get cart data from Redux store
  const cartItems = useSelector(selectCartItems);
  const subtotal = useSelector(selectSubtotal);
  const deliveryFee = useSelector(selectDeliveryFee);
  const tax = useSelector(selectTaxAmount);
  const total = useSelector(selectTotal);

  const cartIsEmpty = cartItems.length === 0;

  // Function to handle proceeding to address selection
  const handleProceedToCheckout = () => {
    if (cartIsEmpty) {
      Alert.alert('Empty Cart', 'Your cart is empty. Add some items before checking out.');
      return;
    }

    setCheckoutStep('address');
  };

  // Function to handle address selection
  const handleAddressSelected = (address: Address) => {
    setSelectedAddress(address);
    setCheckoutStep('payment');
  };

  // Function to handle payment completion
  const handlePaymentComplete = (paymentDetails: {
    method: 'razorpay' | 'cod';
    details?: any;
  }) => {
    setPaymentInfo(paymentDetails);
    setCheckoutStep('confirmation');
  };

  // Function to handle completing the order
  const handleOrderComplete = () => {
    dispatch(clearCart());
    setCheckoutStep('cart');
    router.push('/(tabs)');
  };

  // Render different components based on checkout step
  if (checkoutStep === 'address') {
    return (
      <AddressSelection
        onProceedToPayment={handleAddressSelected}
        onBack={() => setCheckoutStep('cart')}
      />
    );
  }

  if (checkoutStep === 'payment' && selectedAddress) {
    return (
      <PaymentMethod
        onBack={() => setCheckoutStep('address')}
        onPaymentComplete={handlePaymentComplete}
        deliveryAddress={{
          street: selectedAddress.addressLine1,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postalCode: selectedAddress.zipCode
        }}
      />
    );
  }

  if (checkoutStep === 'confirmation' && selectedAddress && paymentInfo) {
    return (
      <OrderConfirmation
        onFinish={handleOrderComplete}
        paymentMethod={paymentInfo.method}
        paymentDetails={paymentInfo.details}
        deliveryAddress={{
          street: selectedAddress.addressLine1,
          city: selectedAddress.city,
          state: selectedAddress.state,
          postalCode: selectedAddress.zipCode
        }}
      />
    );
  }

  // Cart view (default step)
  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <AntDesign name="arrowleft" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Your Cart</Text>
        {!cartIsEmpty && (
          <TouchableOpacity onPress={() => dispatch(clearCart())}>
            <AntDesign name="delete" size={24} color="#666" />
          </TouchableOpacity>
        )}
        {cartIsEmpty && <View style={{ width: 24 }} />}
      </View>

      {cartIsEmpty ? (
        // Empty Cart State
        <View style={styles.emptyCartContainer}>
          <AntDesign name="shoppingcart" size={80} color="#DDD" />
          <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
          <Text style={styles.emptyCartText}>
            Looks like you haven't added any items to your cart yet.
          </Text>
          <TouchableOpacity
            style={styles.browseButton}
            onPress={() => router.push('/(tabs)/menu')}
          >
            <Text style={styles.browseButtonText}>Browse Menu</Text>
          </TouchableOpacity>
        </View>
      ) : (
        // Cart Items
        <View style={{ flex: 1 }}>
          <FlatList
            data={cartItems}
            keyExtractor={(item, index) => `${item.id}-${index}`}
            renderItem={({ item }) => (
              <View style={styles.cartItem}>
                <Image source={{ uri: item.image }} style={styles.itemImage} />
                <View style={styles.itemDetails}>
                  <View style={styles.itemHeader}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    {item.foodType === 'Veg' ? (
                      <View style={styles.vegBadge}>
                        <Text style={styles.vegBadgeText}>VEG</Text>
                      </View>
                    ) : item.foodType === 'Non-Veg' ? (
                      <View style={styles.nonVegBadge}>
                        <Text style={styles.nonVegBadgeText}>NON-VEG</Text>
                      </View>
                    ) : null}
                  </View>

                  <Text style={styles.itemSize}>{item.size}</Text>

                  {/* Show customizations if any */}
                  {item.customizations && Object.keys(item.customizations).length > 0 && (
                    <Text style={styles.itemCustomizations}>
                      {Object.values(item.customizations)
                        .map(option => option.name)
                        .join(', ')
                      }
                    </Text>
                  )}

                  <View style={styles.itemFooter}>
                    <Text style={styles.itemPrice}>
                      ₹{(item.price * item.quantity).toFixed(2)}
                    </Text>
                    <View style={styles.quantityControl}>
                      <TouchableOpacity
                        onPress={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity - 1 }))}
                        style={[
                          styles.quantityButton,
                          item.quantity <= 1 && styles.quantityButtonDisabled
                        ]}
                      >
                        <AntDesign name="minus" size={16} color={item.quantity <= 1 ? "#CCC" : "#666"} />
                      </TouchableOpacity>
                      <Text style={styles.quantityText}>{item.quantity}</Text>
                      <TouchableOpacity
                        onPress={() => dispatch(updateQuantity({ id: item.id, quantity: item.quantity + 1 }))}
                        style={styles.quantityButton}
                      >
                        <AntDesign name="plus" size={16} color="#666" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.removeButton}
                  onPress={() => dispatch(removeFromCart(item.id))}
                >
                  <AntDesign name="close" size={20} color="#999" />
                </TouchableOpacity>
              </View>
            )}
            contentContainerStyle={{ paddingBottom: 20 }}
            showsVerticalScrollIndicator={false}
          />

          <View style={styles.orderSummary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              <Text style={styles.summaryValue}>₹{deliveryFee.toFixed(2)}</Text>
            </View>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Taxes</Text>
              <Text style={styles.summaryValue}>₹{tax.toFixed(2)}</Text>
            </View>

            <View style={styles.divider} />

            <View style={styles.summaryRow}>
              <Text style={styles.totalLabel}>Total</Text>
              <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
            </View>

            <TouchableOpacity
              style={styles.checkoutButton}
              onPress={handleProceedToCheckout}
              disabled={cartIsEmpty}
            >
              <Text style={styles.checkoutButtonText}>
                Proceed to Checkout
              </Text>
              <AntDesign name="arrowright" size={18} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50, 
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
    textAlign: 'center',
  },
  emptyCartContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
  },
  browseButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  browseButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cartItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 15,
    marginHorizontal: 15,
    marginTop: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  itemImage: {
    width: 70,
    height: 70,
    borderRadius: 8,
    marginRight: 10,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  itemDetails: {
    flex: 1,
    justifyContent: 'space-between',
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  itemSize: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemCustomizations: {
    fontSize: 12,
    color: '#888',
    fontStyle: 'italic',
    marginTop: 2,
  },
  itemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  itemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  quantityControl: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EEE',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 10,
  },
  removeButton: {
    padding: 5,
  },
  orderSummary: {
    backgroundColor: '#FFF',
    padding: 20,
    margin: 15,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 15,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  divider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 10,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  checkoutButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 15,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  checkoutButtonText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 8,
  },
  vegBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vegBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '600',
  },
  nonVegBadge: {
    backgroundColor: '#F44336',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  nonVegBadgeText: {
    color: '#FFF',
    fontSize: 9,
    fontWeight: '600',
  },
  checkoutButtonDisabled: {
    backgroundColor: '#CCCCCC',
  }
});

export default Cart;