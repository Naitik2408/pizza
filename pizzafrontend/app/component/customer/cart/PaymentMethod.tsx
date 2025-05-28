import React, { useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    Image,
    ScrollView,
    Alert,
    Platform,
    ActivityIndicator,
    TextInput
} from 'react-native';
import { AntDesign, FontAwesome, MaterialIcons, Ionicons } from '@expo/vector-icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../../../redux/store';
// @ts-ignore: Module has no type definitions
import RazorpayCheckout from 'react-native-razorpay';
import {
    clearCart,
    selectCartItems,
    selectSubtotal,
    selectDeliveryFee,
    selectTaxAmount,
    selectTotal
} from '../../../../redux/slices/cartSlice'; // Import the selectors
import { API_URL } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import uuid from 'react-native-uuid';

interface PaymentMethodProps {
    onBack: () => void;
    onPaymentComplete: (paymentDetails: {
        method: 'razorpay' | 'cod';
        details?: any;
        orderId?: string;
    }) => void;
    deliveryAddress: {
        street: string;
        city: string;
        state: string;
        postalCode: string;
        landmark?: string;
        phone?: string;
    };
}


// First, add these interfaces at the top of your file, below your existing interfaces
interface CustomizationItem {
    name: string;
    option: string;
    price: number;
}

interface AddOnItem {
    name: string;
    option: string;
    price: number;
}


const PaymentMethod = ({ onBack, onPaymentComplete, deliveryAddress }: PaymentMethodProps) => {
    const [selectedMethod, setSelectedMethod] = useState<'razorpay' | 'cod'>('razorpay');
    const [isProcessingPayment, setIsProcessingPayment] = useState(false);
    const [apiError, setApiError] = useState<string | null>(null);

    // For guest users who want to provide minimal contact info
    const [guestName, setGuestName] = useState<string>('');
    const [guestPhone, setGuestPhone] = useState<string>(deliveryAddress.phone || '');
    const [guestPhoneError, setGuestPhoneError] = useState<string | null>(null);
    const [showGuestInfoForm, setShowGuestInfoForm] = useState<boolean>(false);

    const dispatch = useDispatch();

    // Access auth state directly matching the actual slice structure
    const auth = useSelector((state: RootState) => state.auth);
    const { token, name, email, isGuest } = auth;

    // Use safe default values
    const userName = name || 'Guest';
    const userEmail = email || 'guest@example.com';

    // Get phone from deliveryAddress or use a default
    const phone = deliveryAddress.phone || guestPhone || '9999999999';

    // Access cart state using selectors
    const cartItems = useSelector(selectCartItems);
    const subtotal = useSelector(selectSubtotal);
    const deliveryFee = useSelector(selectDeliveryFee);
    const tax = useSelector(selectTaxAmount);
    const total = useSelector(selectTotal);

    // Get discount information
    const appliedDiscount = useSelector((state: RootState) => state.cart.discount);
    const discountAmount = useSelector((state: RootState) => state.cart.discountAmount || 0);

    // Helper function to store guest orders in AsyncStorage
    const storeGuestOrder = async (orderData: any) => {
        try {
            // Get existing guest orders
            const existingOrdersJson = await AsyncStorage.getItem('guestOrders');
            const existingOrders = existingOrdersJson ? JSON.parse(existingOrdersJson) : [];

            // Add new order with a unique ID and timestamp
            const newOrder = {
                ...orderData,
                _id: uuid.v4(), // Generate a unique ID
                orderNumber: `GO-${Date.now().toString().slice(-6)}`, // Guest Order number
                status: 'Pending',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const updatedOrders = [...existingOrders, newOrder];

            // Store updated orders
            await AsyncStorage.setItem('guestOrders', JSON.stringify(updatedOrders));

            return newOrder;
        } catch (error) {
            console.error('Error storing guest order:', error);
            throw new Error('Failed to save your order. Please try again.');
        }
    };

    const validateGuestInfo = () => {
        let isValid = true;

        // Validate phone number
        if (!guestPhone || guestPhone.length !== 10 || !/^\d{10}$/.test(guestPhone)) {
            setGuestPhoneError('Please enter a valid 10-digit phone number');
            isValid = false;
        } else {
            setGuestPhoneError(null);
        }

        return isValid;
    };

    // Inside the createOrder function, update the formattedItems section:
    const createOrder = async (paymentMethod: 'Online' | 'Cash on Delivery', paymentDetails?: any) => {
        setIsProcessingPayment(true);
        setApiError(null);

        try {
            // If guest user and guest info is not collected yet
            if (isGuest && !showGuestInfoForm) {
                setShowGuestInfoForm(true);
                setIsProcessingPayment(false);
                return;
            }

            // If guest user and form is shown, validate info
            if (isGuest && showGuestInfoForm) {
                if (!validateGuestInfo()) {
                    setIsProcessingPayment(false);
                    return;
                }
            }

            // Format the items for the API - THIS IS THE KEY SECTION TO FIX
            // First, add these interfaces at the top of your file, below your existing interfaces
            interface CustomizationItem {
                name: string;
                option: string;
                price: number;
            }

            interface AddOnItem {
                name: string;
                option: string;
                price: number;
            }

            // Then in your createOrder function, update the arrays with explicit types:
            const formattedItems = cartItems.map(item => {
                // Create proper arrays for customizations with explicit type
                let customizationsArray: CustomizationItem[] = [];
                if (item.customizations) {
                    // Convert object format to array format
                    customizationsArray = Object.entries(item.customizations).map(([name, option]) => ({
                        name,
                        option: typeof option === 'string' ? option : option.name,
                        price: typeof option === 'string' ? 0 : (option.price || 0)
                    }));
                }

                // Create proper array for add-ons with explicit type
                let addOnsArray: AddOnItem[] = [];
                if (item.addOns && Array.isArray(item.addOns) && item.addOns.length > 0) {
                    addOnsArray = item.addOns.map(addon => ({
                        name: addon.name,
                        option: addon.name, // Use name as option if not provided
                        price: addon.price || 0
                    }));
                }

                // Log the processed data for debugging
                console.log(`Processing item ${item.name}:`, {
                    customizations: customizationsArray,
                    addOns: addOnsArray
                });

                return {
                    menuItemId: item.id,
                    name: item.name,
                    quantity: item.quantity,
                    price: item.price,
                    size: item.size || 'Not Applicable',
                    foodType: item.foodType || 'Not Applicable',
                    customizations: customizationsArray,
                    addOns: addOnsArray
                };
            });

            // Prepare the order data
            const orderData = {
                items: formattedItems,
                amount: total,
                subtotal: subtotal,
                discount: discountAmount,
                discountCode: appliedDiscount ? appliedDiscount.code : '',
                deliveryFee: deliveryFee,
                tax: tax,
                address: {
                    street: deliveryAddress.street,
                    city: deliveryAddress.city,
                    state: deliveryAddress.state,
                    zipCode: deliveryAddress.postalCode,
                    landmark: deliveryAddress.landmark || ''
                },
                paymentMethod: paymentMethod,
                paymentDetails: paymentDetails || {},
                customerName: isGuest ? (guestName || 'Guest User') : userName,
                customerPhone: isGuest ? guestPhone : phone,
                customerEmail: isGuest ? 'guest@example.com' : userEmail,
                notes: ''
            };

            // Log the full order data for debugging
            console.log('Sending order data to API:', JSON.stringify(orderData, null, 2));

            // For guest users, store locally and don't send to server
            if (isGuest) {
                try {
                    const savedOrder = await storeGuestOrder(orderData);

                    // Clear the cart
                    dispatch(clearCart());

                    // Complete the order process
                    onPaymentComplete({
                        method: paymentMethod === 'Online' ? 'razorpay' : 'cod',
                        details: paymentDetails,
                        orderId: savedOrder.orderNumber
                    });

                    return;
                } catch (error) {
                    throw new Error('Failed to save your order. Please try again.');
                }
            }

            // For logged-in users, send to server
            if (!token) {
                throw new Error('You must be logged in to place an order');
            }

            // Make the API call to create the order using fetch
            const response = await fetch(`${API_URL}/api/orders`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(orderData)
            });

            // Check if the response is successful
            if (!response.ok) {
                const errorData = await response.json();
                throw new Error(errorData.message || 'Failed to create order');
            }

            // Parse the response data
            const data = await response.json();

            // Clear the cart after successful order creation
            dispatch(clearCart());

            // Pass the response to the onPaymentComplete callback
            onPaymentComplete({
                method: paymentMethod === 'Online' ? 'razorpay' : 'cod',
                details: paymentDetails,
                orderId: data.orderNumber || data._id
            });

        } catch (error) {
            console.error('Create order error:', error);

            let errorMessage = 'Failed to create order. Please try again.';
            if (error instanceof Error) {
                errorMessage = error.message;
            }

            setApiError(errorMessage);
            Alert.alert('Order Error', errorMessage);
        } finally {
            setIsProcessingPayment(false);
        }
    };

    const handleRazorpayPayment = async () => {
        if (isProcessingPayment) return;

        setIsProcessingPayment(true);

        try {
            // If guest user and guest info is not collected yet
            if (isGuest && !showGuestInfoForm) {
                setShowGuestInfoForm(true);
                setIsProcessingPayment(false);
                return;
            }

            // If guest user and form is shown, validate info
            if (isGuest && showGuestInfoForm) {
                if (!validateGuestInfo()) {
                    setIsProcessingPayment(false);
                    return;
                }
            }

            // In a real app, you would get an order ID from your backend
            const orderAmount = Math.round(total * 100); // Convert to paise, using discounted total
            const orderId = `order_${Date.now()}`;

            const options = {
                description: 'Payment for food order',
                image: 'https://i.imgur.com/3g7nmJC.png', // Your restaurant logo
                currency: 'INR',
                key: 'rzp_test_key', // Replace with your actual key
                amount: orderAmount,
                name: 'PizzaBolt',
                order_id: orderId,
                prefill: {
                    email: isGuest ? 'guest@example.com' : userEmail,
                    contact: isGuest ? guestPhone : phone,
                    name: isGuest ? (guestName || 'Guest') : userName,
                },
                theme: { color: '#FF6B00' }
            };

            // Mock successful payment for demo purposes
            // In a real app, you would use actual Razorpay checkout
            setTimeout(() => {
                const successResponse = {
                    razorpay_payment_id: `pay_${Date.now()}`,
                    razorpay_order_id: orderId,
                    razorpay_signature: 'mock_signature',
                };

                // Create order with the payment details
                createOrder('Online', successResponse);
            }, 2000);

            // Uncomment this for actual Razorpay integration
            /*
            RazorpayCheckout.open(options).then((data) => {
              // Handle success
              createOrder('Online', data);
            }).catch((error) => {
              // Handle failure
              Alert.alert('Payment Failed', error.description || 'Something went wrong');
              setIsProcessingPayment(false);
            });
            */
        } catch (error) {
            console.error('Razorpay error:', error);
            Alert.alert('Payment Error', 'An error occurred while processing your payment');
            setIsProcessingPayment(false);
        }
    };

    const handleCODPayment = () => {
        // Process cash on delivery by creating an order
        createOrder('Cash on Delivery');
    };

    const handlePayment = () => {
        if (selectedMethod === 'razorpay') {
            handleRazorpayPayment();
        } else {
            handleCODPayment();
        }
    };

    // Guest form cancel handler
    const handleGuestFormCancel = () => {
        setShowGuestInfoForm(false);
        setIsProcessingPayment(false);
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={onBack} style={styles.backButton}>
                    <AntDesign name="arrowleft" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Payment Method</Text>
                <View style={{ width: 24 }} />
            </View>

            {/* Guest mode banner */}
            {isGuest && (
                <View style={styles.guestBanner}>
                    <Ionicons name="information-circle-outline" size={20} color="#FF6B00" />
                    <Text style={styles.guestBannerText}>
                        You're ordering as a guest. Your order data will be stored only on this device.
                    </Text>
                </View>
            )}

            {/* If guest user and we need to collect info */}
            {isGuest && showGuestInfoForm ? (
                <ScrollView 
                    style={styles.content}
                    contentContainerStyle={{ paddingBottom: 100 }}
                >
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Contact Information</Text>
                        <Text style={styles.guestFormSubtitle}>
                            We need minimal information to process your order. This information will not be stored on our servers.
                        </Text>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Your Name (Optional)</Text>
                            <TextInput
                                style={styles.input}
                                placeholder="Name for delivery"
                                value={guestName}
                                onChangeText={setGuestName}
                            />
                        </View>

                        <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Phone Number*</Text>
                            <TextInput
                                style={[
                                    styles.input,
                                    guestPhoneError && styles.inputError
                                ]}
                                placeholder="10-digit phone number"
                                keyboardType="phone-pad"
                                maxLength={10}
                                value={guestPhone}
                                onChangeText={(text) => {
                                    setGuestPhone(text);
                                    if (text.length === 10 && /^\d{10}$/.test(text)) {
                                        setGuestPhoneError(null);
                                    }
                                }}
                            />
                            {guestPhoneError && (
                                <Text style={styles.errorText}>{guestPhoneError}</Text>
                            )}
                            <Text style={styles.helperText}>
                                Required for delivery communication only
                            </Text>
                        </View>

                        <View style={styles.guestPrivacyNote}>
                            <MaterialIcons name="security" size={18} color="#666" />
                            <Text style={styles.privacyText}>
                                Your information is stored only on this device and used only for this order.
                            </Text>
                        </View>

                        <View style={styles.guestFormButtons}>
                            <TouchableOpacity
                                style={styles.guestCancelButton}
                                onPress={handleGuestFormCancel}
                            >
                                <Text style={styles.guestCancelButtonText}>Cancel</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={[
                                    styles.guestContinueButton,
                                    (!guestPhone || guestPhone.length !== 10) && styles.disabledButton
                                ]}
                                onPress={handlePayment}
                                disabled={!guestPhone || guestPhone.length !== 10}
                            >
                                <Text style={styles.guestContinueButtonText}>Continue</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </ScrollView>
            ) : (
                // Regular payment flow
                <ScrollView 
                    style={styles.content}
                    contentContainerStyle={{ paddingBottom: 100 }} // Added padding bottom of 100px
                >
                    {/* Delivery Address Summary */}
                    <View style={styles.section}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Delivery Address</Text>
                        </View>
                        <View style={styles.addressContainer}>
                            <Ionicons name="location-outline" size={24} color="#FF6B00" />
                            <View style={styles.addressDetails}>
                                <Text style={styles.addressText}>{deliveryAddress.street}</Text>
                                <Text style={styles.addressCity}>
                                    {deliveryAddress.city}, {deliveryAddress.state} {deliveryAddress.postalCode}
                                </Text>
                                {deliveryAddress.landmark && (
                                    <Text style={styles.addressLandmark}>Landmark: {deliveryAddress.landmark}</Text>
                                )}
                                <Text style={styles.addressPhone}>Phone: {phone}</Text>
                            </View>
                        </View>
                    </View>

                    {/* Payment Methods */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Select Payment Method</Text>

                        {/* Razorpay Option */}
                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                selectedMethod === 'razorpay' && styles.selectedPaymentOption
                            ]}
                            onPress={() => setSelectedMethod('razorpay')}
                        >
                            <View style={styles.paymentOptionLeft}>
                                <Image
                                    source={{ uri: 'https://i.imgur.com/3g7nmJC.png' }} // Replace with Razorpay logo
                                    style={styles.paymentLogo}
                                />
                                <View>
                                    <Text style={styles.paymentName}>Pay Online</Text>
                                    <Text style={styles.paymentDesc}>Credit/Debit Card, UPI, Netbanking</Text>
                                </View>
                            </View>
                            <View style={styles.radioButton}>
                                {selectedMethod === 'razorpay' && (
                                    <View style={styles.radioButtonInner} />
                                )}
                            </View>
                        </TouchableOpacity>

                        {/* Cash on Delivery Option */}
                        <TouchableOpacity
                            style={[
                                styles.paymentOption,
                                selectedMethod === 'cod' && styles.selectedPaymentOption
                            ]}
                            onPress={() => setSelectedMethod('cod')}
                        >
                            <View style={styles.paymentOptionLeft}>
                                <View style={styles.cashIcon}>
                                    <FontAwesome name="money" size={20} color="#4CAF50" />
                                </View>
                                <View>
                                    <Text style={styles.paymentName}>Cash on Delivery</Text>
                                    <Text style={styles.paymentDesc}>Pay when your order arrives</Text>
                                </View>
                            </View>
                            <View style={styles.radioButton}>
                                {selectedMethod === 'cod' && (
                                    <View style={styles.radioButtonInner} />
                                )}
                            </View>
                        </TouchableOpacity>
                    </View>

                    {/* Order Summary */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Order Summary</Text>

                        {/* Items Summary - Just showing count, not details */}
                        <View style={styles.orderInfo}>
                            <Text style={styles.infoLabel}>Items ({cartItems.length})</Text>
                            <Text style={styles.infoValue}>₹{subtotal.toFixed(2)}</Text>
                        </View>

                        {/* Show discount if applied */}
                        {appliedDiscount && discountAmount > 0 && (
                            <View style={styles.orderInfo}>
                                <Text style={[styles.infoLabel, styles.discountLabel]}>
                                    Discount ({appliedDiscount.code})
                                </Text>
                                <Text style={styles.discountValue}>-₹{discountAmount.toFixed(2)}</Text>
                            </View>
                        )}

                        <View style={styles.orderInfo}>
                            <Text style={styles.infoLabel}>Delivery Fee</Text>
                            <Text style={styles.infoValue}>₹{deliveryFee.toFixed(2)}</Text>
                        </View>

                        <View style={styles.orderInfo}>
                            <Text style={styles.infoLabel}>Tax</Text>
                            <Text style={styles.infoValue}>₹{tax.toFixed(2)}</Text>
                        </View>

                        <View style={styles.divider}></View>

                        <View style={styles.orderTotal}>
                            <Text style={styles.totalLabel}>Total</Text>
                            <Text style={styles.totalValue}>₹{total.toFixed(2)}</Text>
                        </View>
                    </View>

                    {/* Error Message */}
                    {apiError && (
                        <View style={styles.errorContainer}>
                            <Text style={styles.errorText}>{apiError}</Text>
                        </View>
                    )}

                    {/* Guest info notification */}
                    {isGuest && (
                        <View style={styles.guestInfoNote}>
                            <MaterialIcons name="info-outline" size={18} color="#666" />
                            <Text style={styles.guestInfoText}>
                                As a guest user, you'll be asked for minimal contact information when you proceed.
                            </Text>
                        </View>
                    )}
                </ScrollView>
            )}

            {/* Payment button footer (only show when not on guest form) */}
            {(!isGuest || !showGuestInfoForm) && (
                <View style={styles.footer}>
                    <TouchableOpacity
                        style={styles.payButton}
                        onPress={handlePayment}
                        disabled={isProcessingPayment}
                    >
                        {isProcessingPayment ? (
                            <View style={styles.processingContainer}>
                                <ActivityIndicator size="small" color="#FFF" />
                                <Text style={styles.payButtonText}>Processing...</Text>
                            </View>
                        ) : (
                            <>
                                <Text style={styles.payButtonText}>
                                    {selectedMethod === 'razorpay' ? 'Pay Now' : 'Place Order'} - ₹{total.toFixed(2)}
                                </Text>
                                <MaterialIcons name="payments" size={20} color="#FFF" />
                            </>
                        )}
                    </TouchableOpacity>
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
        paddingHorizontal: 16,
        paddingTop: Platform.OS === 'ios' ? 60 : 50,
        paddingBottom: 16,
        backgroundColor: 'white',
        borderBottomWidth: 1,
        borderBottomColor: '#EEEEEE',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#333',
    },
    // Guest user banner
    guestBanner: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF0E6',
        paddingVertical: 10,
        paddingHorizontal: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#FFE0CC',
    },
    guestBannerText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        color: '#FF6B00',
    },
    content: {
        flex: 1,
        padding: 16,
    },
    section: {
        marginBottom: 16,
        backgroundColor: 'white',
        borderRadius: 12,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3.84,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 12,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
        marginBottom: 12,
    },
    addressContainer: {
        flexDirection: 'row',
        alignItems: 'flex-start',
    },
    addressDetails: {
        marginLeft: 12,
        flex: 1,
    },
    addressText: {
        fontSize: 14,
        color: '#333',
        marginBottom: 4,
    },
    addressCity: {
        fontSize: 14,
        color: '#666',
        marginBottom: 4,
    },
    addressLandmark: {
        fontSize: 14,
        color: '#666',
        fontStyle: 'italic',
        marginBottom: 4,
    },
    addressPhone: {
        fontSize: 14,
        color: '#666',
        marginTop: 4,
    },
    paymentOption: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderWidth: 1,
        borderColor: '#EEEEEE',
        borderRadius: 8,
        marginBottom: 12,
    },
    selectedPaymentOption: {
        borderColor: '#FF6B00',
        backgroundColor: '#FFF8F5',
    },
    paymentOptionLeft: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    paymentLogo: {
        width: 40,
        height: 40,
        marginRight: 12,
    },
    cashIcon: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    paymentName: {
        fontSize: 15,
        fontWeight: '500',
        color: '#333',
    },
    paymentDesc: {
        fontSize: 12,
        color: '#666',
        marginTop: 2,
    },
    radioButton: {
        width: 20,
        height: 20,
        borderRadius: 10,
        borderWidth: 2,
        borderColor: '#FF6B00',
        alignItems: 'center',
        justifyContent: 'center',
    },
    radioButtonInner: {
        width: 10,
        height: 10,
        borderRadius: 5,
        backgroundColor: '#FF6B00',
    },
    orderInfo: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    infoLabel: {
        fontSize: 14,
        color: '#666',
    },
    infoValue: {
        fontSize: 14,
        color: '#333',
        fontWeight: '500',
    },
    discountLabel: {
        color: '#FF6B00',
        fontWeight: '500',
    },
    discountValue: {
        fontSize: 14,
        color: '#FF6B00',
        fontWeight: '600',
    },
    divider: {
        height: 1,
        backgroundColor: '#EEEEEE',
        marginVertical: 12,
    },
    orderTotal: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    totalLabel: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
    totalValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#FF6B00',
    },
    footer: {
        backgroundColor: 'white',
        padding: 16,
        borderTopWidth: 1,
        borderTopColor: '#EEEEEE',
    },
    payButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#FF6B00',
        padding: 16,
        borderRadius: 12,
    },
    payButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
        marginRight: 8,
    },
    processingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    errorContainer: {
        backgroundColor: '#FFEBEE',
        padding: 12,
        borderRadius: 8,
        marginBottom: 16,
        borderLeftWidth: 4,
        borderLeftColor: '#D32F2F',
    },
    errorText: {
        color: '#D32F2F',
        fontSize: 14,
    },

    // New guest-specific styles
    guestInfoNote: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        marginTop: 4,
        marginBottom: 20,
    },
    guestInfoText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        color: '#666',
    },
    guestFormSubtitle: {
        fontSize: 14,
        color: '#666',
        marginBottom: 20,
        lineHeight: 20,
    },
    inputGroup: {
        marginBottom: 16,
    },
    inputLabel: {
        fontSize: 14,
        color: '#555',
        marginBottom: 8,
    },
    input: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        padding: 12,
        fontSize: 14,
    },
    inputError: {
        borderColor: '#D32F2F',
        backgroundColor: '#FFEBEE',
    },
    helperText: {
        fontSize: 12,
        color: '#666',
        marginTop: 4,
    },
    guestPrivacyNote: {
        flexDirection: 'row',
        backgroundColor: '#F5F5F5',
        padding: 12,
        borderRadius: 8,
        marginTop: 8,
        marginBottom: 16,
    },
    privacyText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 13,
        color: '#666',
        lineHeight: 18,
    },
    guestFormButtons: {
        flexDirection: 'row',
        marginTop: 8,
    },
    guestCancelButton: {
        flex: 1,
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginRight: 8,
    },
    guestCancelButtonText: {
        color: '#333',
        fontWeight: '500',
    },
    guestContinueButton: {
        flex: 1,
        backgroundColor: '#FF6B00',
        borderRadius: 8,
        padding: 12,
        alignItems: 'center',
        marginLeft: 8,
    },
    guestContinueButtonText: {
        color: '#FFF',
        fontWeight: '500',
    },
    disabledButton: {
        backgroundColor: '#CCCCCC',
    },
});

export default PaymentMethod;