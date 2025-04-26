import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, Platform, TextInput, ActivityIndicator } from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  selectCartItems,
  updateQuantity,
  removeFromCart,
  clearCart,
  selectSubtotal,
  selectDeliveryFee,
  selectTaxAmount,
  selectTotal,
  applyDiscount,
  removeDiscount
} from '../../../../redux/slices/cartSlice';
import { RootState } from '../../../../redux/store';
import { API_URL } from '@/config';

// Import checkout flow components
import AddressSelection from './AddressSelection';
import PaymentMethod from './PaymentMethod';
import OrderConfirmation from './OrderConfirmaton';

// Import Address interface
import { Address } from '../../../Api/addressApi';

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
    orderId?: string;
  } | null>(null);

  // States for offer code functionality
  const [offerCode, setOfferCode] = useState('');
  const [isApplyingOffer, setIsApplyingOffer] = useState(false);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [offerSuccess, setOfferSuccess] = useState<string | null>(null);
  // State for minimum order requirement
  const [minOrderRequirement, setMinOrderRequirement] = useState<number | null>(null);

  // Get cart data from Redux store
  const cartItems = useSelector(selectCartItems);
  const subtotal = useSelector(selectSubtotal);
  const deliveryFee = useSelector(selectDeliveryFee);
  const tax = useSelector(selectTaxAmount);
  const total = useSelector(selectTotal);

  // Get discount info from Redux store
  const appliedDiscount = useSelector((state: RootState) => state.cart.discount);
  const discountAmount = useSelector((state: RootState) => state.cart.discountAmount || 0);

  const cartIsEmpty = cartItems.length === 0;

  // Check for pre-selected offers when the component mounts
  useEffect(() => {
    const checkForSavedOffers = async () => {
      try {
        const savedOfferCode = await AsyncStorage.getItem('selectedOfferCode');

        if (savedOfferCode && !appliedDiscount && cartItems.length > 0) {
          // Auto-populate the offer code field
          setOfferCode(savedOfferCode);

          // Optional: Automatically apply the offer
          // Uncomment this if you want it to auto-apply
          // setTimeout(() => applyOfferCode(savedOfferCode), 500);
        }
      } catch (error) {
        if (__DEV__) {
          console.error('Error retrieving saved offer code:', error);
        }
      }
    };

    checkForSavedOffers();
  }, [cartItems.length, appliedDiscount]);

  // Reset minimum order requirement when subtotal changes
  useEffect(() => {
    if (minOrderRequirement && subtotal >= minOrderRequirement) {
      setMinOrderRequirement(null);
    }
  }, [subtotal, minOrderRequirement]);

  useEffect(() => {
    // If there's no applied discount but we have a success message showing,
    // clear the success message
    if (!appliedDiscount && offerSuccess) {
      setOfferSuccess(null);
    }
  }, [appliedDiscount, offerSuccess]);

  // Function to navigate to menu
  const navigateToMenu = () => {
    router.push('/(tabs)/menu');
  };

  const applyOfferCode = async (codeToApply?: string) => {
    const codeToUse = codeToApply || offerCode.trim();

    if (!codeToUse) {
      setOfferError('Please enter an offer code');
      return;
    }

    if (isApplyingOffer) return;

    try {
      setIsApplyingOffer(true);
      setOfferError(null);
      setOfferSuccess(null);
      setMinOrderRequirement(null);

      // Call API to validate and calculate discount
      const response = await fetch(`${API_URL}/api/offers/code/${codeToUse.toUpperCase()}`);

      // Parse the response JSON first to get any error messages
      const data = await response.json();

      // Then check if the response was not ok
      if (!response.ok) {
        // Extract the error message from the response
        throw new Error(data.message || 'Invalid offer code');
      }

      // Check if minimum order value is met
      if (subtotal < data.minOrderValue) {
        // Store the minimum order requirement for the UI
        setMinOrderRequirement(data.minOrderValue);
        throw new Error(`Minimum order amount of ₹${data.minOrderValue} required`);
      }

      // Calculate discount amount
      let calculatedDiscount = 0;

      if (data.discountType === 'percentage') {
        calculatedDiscount = (subtotal * data.discountValue) / 100;

        // Apply maximum discount if specified
        if (data.maxDiscountAmount && calculatedDiscount > data.maxDiscountAmount) {
          calculatedDiscount = data.maxDiscountAmount;
        }
      } else {
        // Fixed discount
        calculatedDiscount = data.discountValue;
      }

      // Ensure discount isn't more than subtotal
      if (calculatedDiscount > subtotal) {
        calculatedDiscount = subtotal;
      }

      // Round to 2 decimal places
      calculatedDiscount = Math.round(calculatedDiscount * 100) / 100;

      // Apply discount to cart in Redux with minOrderValue
      dispatch(applyDiscount({
        code: data.code,
        type: data.discountType,
        value: data.discountValue,
        amount: calculatedDiscount,
        minOrderValue: data.minOrderValue // Include minimum order value
      }));

      // Success message
      setOfferSuccess(`${data.title} applied: ₹${calculatedDiscount.toFixed(2)} off`);

      // Clear saved offer code after successful application
      AsyncStorage.removeItem('selectedOfferCode');

      // Clear input
      setOfferCode('');

    } catch (error) {
      // Better error handling that doesn't log to console in production
      if (__DEV__) {
        // Only log detailed errors in development mode
        console.log('Offer application error (dev only):', error);
      }

      // Handle the error message for users
      if (error instanceof Error) {
        // Improve user-friendly messages for common errors
        if (error.message.includes('Minimum order amount')) {
          const minAmount = error.message.match(/₹(\d+)/)?.[1] || '0';
          const amountNeeded = (Number(minAmount) - subtotal).toFixed(2);
          setOfferError(`Minimum order of ₹${minAmount} required. Add ₹${amountNeeded} more to use this code.`);
          // Store minOrderRequirement if not already set
          if (!minOrderRequirement) {
            setMinOrderRequirement(Number(minAmount));
          }
        } else if (error.message.includes('expired')) {
          setOfferError('This offer has expired');
        } else if (error.message.includes('usage limit')) {
          setOfferError('This offer is no longer available');
        } else {
          setOfferError(error.message);
        }
      } else {
        setOfferError('Failed to apply offer');
      }
    } finally {
      setIsApplyingOffer(false);
    }
  };

  // Function to remove applied offer
  const removeOfferCode = () => {
    dispatch(removeDiscount());
    setOfferSuccess(null);
    setMinOrderRequirement(null);
  };

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
    orderId?: string;
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
          postalCode: selectedAddress.zipCode,
          landmark: selectedAddress.landmark || '', // Handle potentially undefined landmark
          phone: selectedAddress.phone || '' // Handle potentially undefined phone
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
          postalCode: selectedAddress.zipCode,
          landmark: selectedAddress.landmark || '' // Handle potentially undefined landmark
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

          {/* Offer Code Section */}
          <View style={styles.offerContainer}>
            <Text style={styles.offerTitle}>Have a promo code?</Text>

            {!appliedDiscount ? (
              // Offer code input when no discount is applied
              <View style={styles.offerInputContainer}>
                <TextInput
                  style={styles.offerInput}
                  placeholder="Enter promo code"
                  value={offerCode}
                  onChangeText={setOfferCode}
                  autoCapitalize="characters"
                />
                <TouchableOpacity
                  style={[
                    styles.applyButton,
                    (!offerCode.trim() || isApplyingOffer) && styles.disabledButton
                  ]}
                  onPress={() => applyOfferCode()}
                  disabled={!offerCode.trim() || isApplyingOffer}
                >
                  {isApplyingOffer ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.applyButtonText}>Apply</Text>
                  )}
                </TouchableOpacity>
              </View>
            ) : (
              // Display applied code info
              <View style={styles.appliedOfferContainer}>
                <View style={styles.appliedOfferInfo}>
                  <Text style={styles.appliedOfferCode}>{appliedDiscount.code}</Text>
                  <Text style={styles.appliedOfferAmount}>-₹{discountAmount.toFixed(2)}</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeOfferButton}
                  onPress={removeOfferCode}
                >
                  <AntDesign name="close" size={16} color="#FF6B00" />
                </TouchableOpacity>
              </View>
            )}

            {offerError && (
              <>
                <Text style={styles.offerErrorText}>{offerError}</Text>
              </>
            )}

            {offerSuccess && (
              <Text style={styles.offerSuccessText}>{offerSuccess}</Text>
            )}
          </View>

          <View style={styles.orderSummary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>₹{subtotal.toFixed(2)}</Text>
            </View>

            {/* Only show discount if applied */}
            {appliedDiscount && discountAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.discountLabel}>Discount ({appliedDiscount.code})</Text>
                <Text style={styles.discountValue}>-₹{discountAmount.toFixed(2)}</Text>
              </View>
            )}

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

            {/* Order actions */}
            <View style={styles.orderActions}>
              <TouchableOpacity
                style={styles.addMoreButton}
                onPress={navigateToMenu}
              >
                <MaterialIcons name="add" size={18} color="#FF6B00" />
                <Text style={styles.addMoreButtonText}>Add More</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.checkoutButton, cartIsEmpty && styles.checkoutButtonDisabled]}
                onPress={handleProceedToCheckout}
                disabled={cartIsEmpty}
              >
                <Text style={styles.checkoutButtonText}>
                  Checkout
                </Text>
                <AntDesign name="arrowright" size={18} color="#FFF" />
              </TouchableOpacity>
            </View>
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
  // Offer-related styles
  offerContainer: {
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
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  offerInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  offerInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    marginRight: 10,
  },
  applyButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
  },
  disabledButton: {
    backgroundColor: '#CCCCCC',
  },
  offerErrorText: {
    color: '#D32F2F',
    fontSize: 12,
    marginTop: 8,
  },
  offerSuccessText: {
    color: '#4CAF50',
    fontSize: 12,
    marginTop: 8,
  },
  appliedOfferContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#FFE0CC',
    borderRadius: 8,
    padding: 10,
    backgroundColor: '#FFF8F5',
  },
  appliedOfferInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  appliedOfferCode: {
    color: '#FF6B00',
    fontWeight: '600',
    fontSize: 14,
  },
  appliedOfferAmount: {
    color: '#FF6B00',
    fontWeight: '700',
    fontSize: 14,
  },
  removeOfferButton: {
    padding: 5,
    marginLeft: 10,
  },
  // New "Add More Items" button for minimum order requirements
  addMoreItemsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginTop: 12,
  },
  addMoreItemsText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 6,
  },
  discountLabel: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '500',
  },
  discountValue: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '600',
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
  // New order action styles for two buttons
  orderActions: {
    flexDirection: 'row',
    marginTop: 15,
    justifyContent: 'space-between',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FF6B00',
    flex: 0.47,
  },
  addMoreButtonText: {
    color: '#FF6B00',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  checkoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 0.47,
  },
  checkoutButtonText: {
    color: '#FFF',
    fontWeight: '600',
    fontSize: 14,
    marginRight: 4,
  },
  checkoutButtonDisabled: {
    backgroundColor: '#CCCCCC',
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
  }
});

export default Cart;