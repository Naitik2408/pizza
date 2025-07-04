import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, FlatList, Image, Alert, Platform, TextInput, ActivityIndicator, Modal, ScrollView } from 'react-native';
import { AntDesign, MaterialIcons, Entypo } from '@expo/vector-icons';
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
  removeDiscount,
  CartItem,
  updateTaxAndDelivery
} from '../../../../redux/slices/cartSlice';
import { RootState } from '../../../../redux/store';
import { API_URL } from '@/config';
import { LinearGradient } from 'expo-linear-gradient';
import { getSocket, onSocketEvent, offSocketEvent } from '@/src/utils/socket';

// Import checkout flow components
import AddressSelection from './AddressSelection';
import PaymentMethod from './PaymentMethod';
import OrderConfirmation from './OrderConfirmaton';

// Import Address interface
import { Address } from '../../../types';

// Interface for business settings
interface BusinessSettings {
  taxSettings: {
    gstPercentage: number;
    applyGST: boolean;
  };
  deliveryCharges: {
    fixedCharge: number;
    freeDeliveryThreshold: number;
    applyToAllOrders: boolean;
  };
  minimumOrderValue: number; // Added minimum order value field
}

// Selected add-on interface
interface SelectedAddOn {
  id: string;
  name: string;
  price: number;
  hasSizeSpecificPricing?: boolean;
}

// Custom interface for formatted customizations
interface FormattedCustomization {
  name: string;
  option: string;
  price: number;
}

// Custom interface for formatted add-ons
interface FormattedAddOn {
  name: string;
  price: number;
}

// Define checkout steps
type CheckoutStep = 'cart' | 'address' | 'payment' | 'confirmation';

// Interface for prepared order items
interface PreparedOrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  price: number;
  size: string;
  foodType: string;
  customizations: FormattedCustomization[];
  addOns: FormattedAddOn[];
}

// Interface for Offer/Promo code
interface Offer {
  _id: string;
  title: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount: number | null;
  active: boolean;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  usageCount: number;
  createdAt: string;
}

// Default business settings to use as fallback
const DEFAULT_BUSINESS_SETTINGS: BusinessSettings = {
  taxSettings: {
    gstPercentage: 5,
    applyGST: true
  },
  deliveryCharges: {
    fixedCharge: 40,
    freeDeliveryThreshold: 500,
    applyToAllOrders: false
  },
  minimumOrderValue: 200 // Default minimum order value
};

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
  
  // State for available promo codes
  const [availableOffers, setAvailableOffers] = useState<Offer[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(false);
  const [showPromoModal, setShowPromoModal] = useState(false);
  
  // State for business settings
  const [businessSettings, setBusinessSettings] = useState<BusinessSettings>(DEFAULT_BUSINESS_SETTINGS);
  const [isLoadingSettings, setIsLoadingSettings] = useState(true);
  const [settingsError, setSettingsError] = useState<string | null>(null);
  
  // State for business status
  const [businessStatus, setBusinessStatus] = useState<{
    isOpen: boolean;
    reason: string;
    manualOverride: boolean;
  } | null>(null);

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

  // Calculate whether delivery is free based on business settings and order subtotal
  const isFreeDelivery = !businessSettings.deliveryCharges.applyToAllOrders && 
    subtotal >= businessSettings.deliveryCharges.freeDeliveryThreshold;

  // Calculate whether minimum order requirement is met
  const isMinimumOrderMet = subtotal >= businessSettings.minimumOrderValue;

  // Calculate delivery charge based on business settings
  const calculateDeliveryCharge = () => {
    const { fixedCharge, freeDeliveryThreshold, applyToAllOrders } = businessSettings.deliveryCharges;
    
    // If delivery charge applies to all orders, return the fixed charge
    if (applyToAllOrders) {
      return fixedCharge;
    }
    
    // Otherwise, check if order exceeds the free delivery threshold
    return subtotal >= freeDeliveryThreshold ? 0 : fixedCharge;
  };

  // Calculate tax based on business settings
  const calculateTax = () => {
    const { gstPercentage, applyGST } = businessSettings.taxSettings;
    
    if (!applyGST) {
      return 0;
    }
    
    return (subtotal * gstPercentage) / 100;
  };

  // Colors for promo code cards
  const promoThemes = [
    { gradientColors: ['#FF9800', '#FF5722'] as const },
    { gradientColors: ['#03A9F4', '#1976D2'] as const },
    { gradientColors: ['#8BC34A', '#388E3C'] as const },
    { gradientColors: ['#BA68C8', '#7B1FA2'] as const },
    { gradientColors: ['#FF5252', '#D32F2F'] as const }
  ];

  // Fetch business status
  const fetchBusinessStatus = async () => {
    try {
      const response = await fetch(`${API_URL}/api/business/profile`);
      if (response.ok) {
        const data = await response.json();
        setBusinessStatus(data.status);
      }
    } catch (error) {
      console.error('Failed to fetch business status:', error);
    }
  };

  // Fetch business settings on component mount
  useEffect(() => {
    const fetchBusinessSettings = async () => {
      try {
        setIsLoadingSettings(true);
        
        // Try multiple endpoints in case one fails
        const possibleEndpoints = [
          `${API_URL}/api/settings`,
          `${API_URL}/api/business/settings`,
          `${API_URL}/api/admin/settings`
        ];
        
        let response = null;
        let succeeded = false;
        
        // Try each endpoint until one works
        for (const endpoint of possibleEndpoints) {
          try {

            const tempResponse = await fetch(endpoint, {
              method: 'GET',
              headers: {
                'Content-Type': 'application/json'
              }
            });
            
            if (tempResponse.ok) {
              response = tempResponse;
              succeeded = true;

              break;
            }
          } catch (endpointError) {

          }
        }
        
        if (!succeeded || !response) {
          throw new Error('Failed to fetch business settings from any endpoint');
        }
        
        const data = await response.json();

        
        // Set the business settings in state
        setBusinessSettings({
          ...data,
          minimumOrderValue: data.minimumOrderValue || DEFAULT_BUSINESS_SETTINGS.minimumOrderValue
        });
        
        // Calculate delivery charge based on settings and current subtotal
        const deliveryCharge = data.deliveryCharges.applyToAllOrders ? 
          data.deliveryCharges.fixedCharge : 
          (subtotal >= data.deliveryCharges.freeDeliveryThreshold ? 0 : data.deliveryCharges.fixedCharge);
          
        // Calculate tax based on settings
        const taxAmount = data.taxSettings.applyGST ? 
          (subtotal * data.taxSettings.gstPercentage) / 100 : 0;
        
        // Update the tax and delivery fee in Redux
        dispatch(updateTaxAndDelivery({
          taxPercentage: data.taxSettings.gstPercentage || 5,
          deliveryFee: deliveryCharge
        }));
        
        setSettingsError(null);
      } catch (error) {
        console.error('Error fetching business settings:', error);
        setSettingsError('Using default tax and delivery rates');
        
        // Use default settings
        const deliveryCharge = DEFAULT_BUSINESS_SETTINGS.deliveryCharges.applyToAllOrders ? 
          DEFAULT_BUSINESS_SETTINGS.deliveryCharges.fixedCharge : 
          (subtotal >= DEFAULT_BUSINESS_SETTINGS.deliveryCharges.freeDeliveryThreshold ? 0 : DEFAULT_BUSINESS_SETTINGS.deliveryCharges.fixedCharge);
        
        const taxAmount = DEFAULT_BUSINESS_SETTINGS.taxSettings.applyGST ? 
          (subtotal * DEFAULT_BUSINESS_SETTINGS.taxSettings.gstPercentage) / 100 : 0;
        
        // Update Redux with default values
        dispatch(updateTaxAndDelivery({
          taxPercentage: DEFAULT_BUSINESS_SETTINGS.taxSettings.gstPercentage,
          deliveryFee: deliveryCharge
        }));
      } finally {
        setIsLoadingSettings(false);
      }
    };
    
    fetchBusinessSettings();
    fetchBusinessStatus();
    fetchAvailableOffers();

    // Listen for live business status updates
    const socket = getSocket();
    if (socket) {
      const handleStatusChange = (status: { isOpen: boolean; reason: string; manualOverride: boolean }) => {
        setBusinessStatus(status);
      };

      onSocketEvent('businessStatusChanged', handleStatusChange);

      // Cleanup listener on unmount
      return () => {
        offSocketEvent('businessStatusChanged', handleStatusChange);
      };
    }
  }, [dispatch]);

  // Update delivery fee and tax whenever subtotal changes
  useEffect(() => {
    // Calculate delivery charge based on the current subtotal
    const deliveryCharge = calculateDeliveryCharge();
    
    // Calculate tax based on the current subtotal
    const taxAmount = calculateTax();
    
    // Update Redux with new values
    dispatch(updateTaxAndDelivery({
      taxPercentage: businessSettings.taxSettings.gstPercentage,
      deliveryFee: deliveryCharge
    }));
  }, [subtotal, businessSettings, dispatch]);

  // Fetch available offers when the component mounts
  const fetchAvailableOffers = async () => {
    try {
      setLoadingOffers(true);
      
      const response = await fetch(`${API_URL}/api/offers`);
      
      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }
      
      const data: Offer[] = await response.json();
      
      // Filter active offers
      const activeOffers = data.filter(offer => offer.active);
      
      setAvailableOffers(activeOffers);
    } catch (error) {
      console.error('Error fetching available offers:', error);
      // Fallback offers in case API fails
      setAvailableOffers([
        {
          _id: 'offer-1',
          title: 'Weekend Special',
          code: 'WEEKEND40',
          description: 'Get 40% off on all orders above ₹599',
          discountType: 'percentage',
          discountValue: 40,
          minOrderValue: 599,
          maxDiscountAmount: 200,
          active: true,
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
          usageLimit: null,
          usageCount: 0,
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'offer-2',
          title: 'New User',
          code: 'NEWUSER',
          description: 'Get ₹100 off on your first order above ₹300',
          discountType: 'fixed',
          discountValue: 100,
          minOrderValue: 300,
          maxDiscountAmount: null,
          active: true,
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          usageLimit: 1,
          usageCount: 0,
          createdAt: new Date().toISOString(),
        },
        {
          _id: 'offer-3',
          title: 'Family Feast',
          code: 'FAMILY999',
          description: '20% off on orders above ₹999',
          discountType: 'percentage',
          discountValue: 20,
          minOrderValue: 999,
          maxDiscountAmount: 300,
          active: true,
          validFrom: new Date().toISOString(),
          validUntil: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
          usageLimit: null,
          usageCount: 0,
          createdAt: new Date().toISOString(),
        }
      ]);
    } finally {
      setLoadingOffers(false);
    }
  };

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
    router.push('../(tabs)/menu');
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
      
      // Close promo modal if it was open
      setShowPromoModal(false);

    } catch (error) {
      // Better error handling that doesn't log to console in production
      if (__DEV__) {
        // Only log detailed errors in development mode

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

  // Function to properly format customizations for the API
  // Update the formatCustomizationsForAPI function
  const formatCustomizationsForAPI = (item: CartItem): FormattedCustomization[] => {
    let formattedCustomizations: FormattedCustomization[] = [];

    // Handle legacy customizations object format
    if (item.customizations && typeof item.customizations === 'object') {
      formattedCustomizations = Object.entries(item.customizations).map(([name, option]: [string, any]) => {
        // Handle both string options and {name, price} object options
        if (typeof option === 'string') {
          return {
            name,
            option,
            price: 0
          };
        } else {
          return {
            name,
            option: option.name || '',
            price: parseFloat(option.price?.toString() || '0')
          };
        }
      });
    }

    return formattedCustomizations;
  };

  // Update the formatAddOnsForAPI function
  const formatAddOnsForAPI = (item: CartItem): FormattedAddOn[] => {
    let formattedAddOns: FormattedAddOn[] = [];

    // Handle new add-ons array format
    if (item.addOns && Array.isArray(item.addOns) && item.addOns.length > 0) {
      formattedAddOns = item.addOns.map((addon: SelectedAddOn) => ({
        name: addon.name,
        price: parseFloat(addon.price?.toString() || '0')
      }));
    }

    return formattedAddOns;
  };


  // Function to prepare order items for the API
  const prepareOrderItems = (): PreparedOrderItem[] => {
    return cartItems.map(item => {
      // Format item with all properties properly structured for the API
      return {
        menuItemId: item.id,
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        size: item.size || 'Medium',
        foodType: item.foodType || 'Not Applicable',
        // Convert customizations to array of {name, option, price} objects
        customizations: formatCustomizationsForAPI(item),
        // Convert add-ons to array of {name, price} objects
        addOns: formatAddOnsForAPI(item)
      };
    });
  };

  // Function to handle proceeding to address selection
  const handleProceedToCheckout = () => {
    if (cartIsEmpty) {
      Alert.alert('Empty Cart', 'Your cart is empty. Add some items before checking out.');
      return;
    }

    // Check if business is open before allowing checkout
    if (businessStatus && !businessStatus.isOpen) {
      Alert.alert(
        'Restaurant Closed',
        `Sorry, we're currently closed. ${businessStatus.reason || 'Please check our operating hours.'}`,
        [{ text: 'OK', style: 'default' }]
      );
      return;
    }

    // Check if the order meets the minimum order value
    if (subtotal < businessSettings.minimumOrderValue) {
      const amountNeeded = (businessSettings.minimumOrderValue - subtotal).toFixed(2);
      Alert.alert(
        'Minimum Order Value',
        `Your order must be at least ₹${businessSettings.minimumOrderValue.toFixed(2)} to check out. You need to add ₹${amountNeeded} more to proceed.`,
        [
          { text: 'OK', style: 'cancel' },
          {
            text: 'Add More Items',
            onPress: navigateToMenu
          }
        ]
      );
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
    router.push('../(tabs)');
  };

  // Helper function to calculate the price of add-ons
  const calculateAddOnPrice = (item: CartItem): number => {
    if (!item.addOns || item.addOns.length === 0) return 0;
    return item.addOns.reduce((total: number, addOn: SelectedAddOn) => total + addOn.price, 0);
  };

  // Function to format discount description
  const formatDiscountDescription = (offer: Offer): string => {
    let description = '';
    
    if (offer.discountType === 'percentage') {
      description = `${offer.discountValue}% off`;
      if (offer.maxDiscountAmount) {
        description += ` up to ₹${offer.maxDiscountAmount}`;
      }
    } else {
      description = `₹${offer.discountValue} off`;
    }
    
    if (offer.minOrderValue > 0) {
      description += ` on orders above ₹${offer.minOrderValue}`;
    }
    
    return description;
  };

  // Function to handle promo code selection
  const handleSelectPromoCode = (code: string) => {
    setOfferCode(code);
    applyOfferCode(code);
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
        businessStatus={businessStatus}
        // @ts-ignore - orderItems might not be in the type but is needed by the component
        orderItems={prepareOrderItems()}
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
          landmark: selectedAddress.landmark || '' // This will now work with the updated interface
        }}
        // @ts-ignore - orderItems might not be in the type but is needed by the component
        orderItems={prepareOrderItems()}
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
            onPress={() => router.push('../(tabs)/menu')}
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

                  {/* Display legacy customizations */}
                  {item.customizations && Object.keys(item.customizations).length > 0 && (
                    <View>
                      <Text style={styles.itemCustomizationsTitle}>Customizations:</Text>
                      <Text style={styles.itemCustomizations}>
                        {Object.entries(item.customizations)
                          .map(([name, option]: [string, any]) =>
                            `${name}: ${option.name}${option.price > 0 ? ` (+₹${option.price})` : ''}`)
                          .join(', ')
                        }
                      </Text>
                    </View>
                  )}

                  {/* Display new add-ons format */}
                  {item.addOns && item.addOns.length > 0 && (
                    <View>
                      <Text style={styles.itemCustomizationsTitle}>Add-ons:</Text>
                      <Text style={styles.itemCustomizations}>
                        {item.addOns.map((addOn: SelectedAddOn) =>
                          `${addOn.name}${addOn.price > 0 ? ` (+₹${addOn.price})` : ''}`)
                          .join(', ')}
                      </Text>
                    </View>
                  )}

                  <View style={styles.itemFooter}>
                    <Text style={styles.itemPrice}>
                      ₹{((item.price + calculateAddOnPrice(item)) * item.quantity).toFixed(2)}
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

          {/* Offer Code Section - Enhanced with available promo codes */}
          <View style={styles.offerContainer}>
            <View style={styles.offerTitleRow}>
              <Text style={styles.offerTitle}>Have a promo code?</Text>
              <TouchableOpacity 
                onPress={() => setShowPromoModal(true)}
                style={styles.viewOffersButton}
              >
                <Text style={styles.viewOffersText}>View Available Offers</Text>
              </TouchableOpacity>
            </View>

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
                {minOrderRequirement && (
                  <TouchableOpacity
                    style={styles.addMoreItemsButton}
                    onPress={navigateToMenu}
                  >
                    <AntDesign name="plus" size={16} color="#FFF" />
                    <Text style={styles.addMoreItemsText}>Add More Items</Text>
                  </TouchableOpacity>
                )}
              </>
            )}

            {offerSuccess && (
              <Text style={styles.offerSuccessText}>{offerSuccess}</Text>
            )}
          </View>

          <View style={styles.orderSummary}>
            <Text style={styles.summaryTitle}>Order Summary</Text>

            {/* Minimum Order Value Indicator */}
            {!isLoadingSettings && (
              <View style={styles.minimumOrderContainer}>
                {!isMinimumOrderMet ? (
                  <>
                    <Text style={styles.minimumOrderText}>
                      Add ₹{(businessSettings.minimumOrderValue - subtotal).toFixed(2)} more to reach minimum order of ₹{businessSettings.minimumOrderValue}
                    </Text>
                    <View style={styles.progressBarContainer}>
                      <View 
                        style={[
                          styles.progressBar, 
                          { width: `${Math.min((subtotal / businessSettings.minimumOrderValue) * 100, 100)}%` }
                        ]} 
                      />
                    </View>
                  </>
                ) : (
                  <View style={styles.minimumOrderMetContainer}>
                    <Text style={styles.minimumOrderMetText}>
                      Minimum order value of ₹{businessSettings.minimumOrderValue} met
                    </Text>
                    <MaterialIcons name="check-circle" size={16} color="#4CAF50" />
                  </View>
                )}
              </View>
            )}

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

            {/* Dynamic Delivery Fee */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Delivery Fee</Text>
              {isLoadingSettings ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <>
                  <Text style={styles.summaryValue}>
                    {isFreeDelivery ? "Free" : `₹${deliveryFee.toFixed(2)}`}
                  </Text>
                  {isFreeDelivery && (
                    <View style={styles.freeDeliveryBadge}>
                      <Text style={styles.freeDeliveryText}>FREE</Text>
                    </View>
                  )}
                </>
              )}
            </View>

            {!isLoadingSettings && !businessSettings.deliveryCharges.applyToAllOrders && (
              <Text style={styles.freeDeliveryNote}>
                {isFreeDelivery 
                  ? `Free delivery on orders above ₹${businessSettings.deliveryCharges.freeDeliveryThreshold}`
                  : `Free delivery on orders above ₹${businessSettings.deliveryCharges.freeDeliveryThreshold} (you need ₹${(businessSettings.deliveryCharges.freeDeliveryThreshold - subtotal).toFixed(2)} more)`}
              </Text>
            )}

            {/* Dynamic Tax Rate */}
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>
                {isLoadingSettings 
                  ? 'Taxes' 
                  : businessSettings.taxSettings.applyGST 
                    ? `Taxes (${businessSettings.taxSettings.gstPercentage}% GST)` 
                    : 'Taxes'}
              </Text>
              {isLoadingSettings ? (
                <ActivityIndicator size="small" color="#666" />
              ) : (
                <Text style={styles.summaryValue}>₹{tax.toFixed(2)}</Text>
              )}
            </View>

            {/* Show error if settings failed to load */}
            {settingsError && (
              <Text style={styles.settingsNote}>{settingsError}</Text>
            )}

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
                style={[
                  styles.checkoutButton, 
                  (cartIsEmpty || !isMinimumOrderMet || (businessStatus && !businessStatus.isOpen)) && styles.checkoutButtonDisabled
                ]}
                onPress={handleProceedToCheckout}
                disabled={cartIsEmpty || !isMinimumOrderMet || !!(businessStatus && !businessStatus.isOpen)}
              >
                <Text style={styles.checkoutButtonText}>
                  {businessStatus && !businessStatus.isOpen ? 'Restaurant Closed' : 'Checkout'}
                </Text>
                {(!businessStatus || businessStatus.isOpen) && (
                  <AntDesign name="arrowright" size={18} color="#FFF" />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Promo Code Selection Modal */}
      <Modal
        visible={showPromoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPromoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Available Offers</Text>
              <TouchableOpacity
                onPress={() => setShowPromoModal(false)}
                style={styles.closeButton}
              >
                <AntDesign name="close" size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {loadingOffers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>Loading offers...</Text>
              </View>
            ) : availableOffers.length === 0 ? (
              <View style={styles.emptyOffersContainer}>
                <Entypo name="ticket" size={48} color="#DDD" />
                <Text style={styles.emptyOffersText}>No offers available at the moment</Text>
              </View>
            ) : (
              <ScrollView style={styles.offersScrollView} showsVerticalScrollIndicator={false}>
                {availableOffers.map((offer, index) => (
                  <View key={offer._id} style={styles.offerCard}>
                    <LinearGradient
                      colors={promoThemes[index % promoThemes.length].gradientColors}
                      start={{ x: 0.0, y: 0.0 }}
                      end={{ x: 1.0, y: 1.0 }}
                      style={styles.offerCardGradient}
                    >
                      <View style={styles.offerCardContent}>
                        <View style={styles.offerCardHeader}>
                          <Text style={styles.offerCardTitle}>{offer.title}</Text>
                          <View style={styles.offerCodeBadge}>
                            <Text style={styles.offerCodeText}>{offer.code}</Text>
                          </View>
                        </View>
                        
                        <Text style={styles.offerCardDescription}>
                          {formatDiscountDescription(offer)}
                        </Text>
                        
                        <TouchableOpacity 
                          style={styles.applyOfferButton}
                          onPress={() => handleSelectPromoCode(offer.code)}
                          disabled={subtotal < offer.minOrderValue || isApplyingOffer}
                        >
                          {isApplyingOffer && offerCode === offer.code ? (
                            <ActivityIndicator size="small" color="#FF6B00" />
                          ) : (
                            <Text style={styles.applyOfferButtonText}>
                              {subtotal < offer.minOrderValue 
                                ? `Add ₹${(offer.minOrderValue - subtotal).toFixed(2)} more to apply` 
                                : 'Apply'}
                            </Text>
                          )}
                        </TouchableOpacity>

                        {/* Decorative elements */}
                        <View style={styles.decorCircle}></View>
                      </View>
                    </LinearGradient>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    flex: 1,
    marginRight: 8,
  },
  itemSize: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  itemCustomizationsTitle: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontWeight: '500',
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
  offerTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  viewOffersButton: {
    paddingVertical: 4,
  },
  viewOffersText: {
    color: '#FF6B00',
    fontSize: 13,
    fontWeight: '500',
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
  settingsNote: {
    color: '#FF9800',
    fontSize: 12,
    marginTop: 4,
    fontStyle: 'italic',
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
  // "Add More Items" button for minimum order requirements
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
  // Minimum order value styles
  minimumOrderContainer: {
    marginBottom: 15,
  },
  minimumOrderText: {
    fontSize: 13,
    color: '#FF6B00',
    marginBottom: 5,
  },
  minimumOrderMetContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  minimumOrderMetText: {
    fontSize: 13,
    color: '#4CAF50',
    marginRight: 5,
  },
  progressBarContainer: {
    height: 6,
    backgroundColor: '#EDEDED',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressBar: {
    height: '100%',
    backgroundColor: '#FF6B00',
    borderRadius: 3,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#666',
  },
  summaryValue: {
    fontSize: 14,
    color: '#333',
  },
  freeDeliveryBadge: {
    backgroundColor: '#ECFDF5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
    marginLeft: 8,
    borderWidth: 1,
    borderColor: '#D1FAE5',
  },
  freeDeliveryText: {
    fontSize: 10,
    color: '#10B981',
    fontWeight: 'bold',
  },
  freeDeliveryNote: {
    fontSize: 12,
    color: '#10B981',
    marginTop: -4,
    marginBottom: 8,
    marginLeft: 4,
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
  // Order action styles for the two buttons
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
  },

  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingHorizontal: 15,
    paddingBottom: 30,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  closeButton: {
    padding: 5,
  },
  offersScrollView: {
    maxHeight: '70%',
  },
  offerCard: {
    marginBottom: 15,
    borderRadius: 12,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  offerCardGradient: {
    padding: 15,
    position: 'relative',
    overflow: 'hidden',
  },
  offerCardContent: {
    zIndex: 2,
  },
  offerCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  offerCardTitle: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: 'bold',
  },
  offerCodeBadge: {
    backgroundColor: 'rgba(255,255,255,0.25)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 4,
  },
  offerCodeText: {
    color: '#FFF',
    fontWeight: 'bold',
    fontSize: 12,
  },
  offerCardDescription: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 13,
    marginBottom: 15,
  },
  applyOfferButton: {
    backgroundColor: '#FFF',
    paddingVertical: 8,
    paddingHorizontal: 15,
    borderRadius: 20,
    alignSelf: 'flex-start',
  },
  applyOfferButtonText: {
    color: '#FF6B00',
    fontWeight: '600',
    fontSize: 12,
  },
  decorCircle: {
    position: 'absolute',
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255,255,255,0.1)',
    bottom: -50,
    right: -20,
    zIndex: -1,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  emptyOffersContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyOffersText: {
    fontSize: 14,
    color: '#666',
    marginTop: 15,
    textAlign: 'center',
  },
});

export default Cart;