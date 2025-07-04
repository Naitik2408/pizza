import React, { useRef, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert, Linking } from 'react-native';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Image,
  TouchableOpacity,
  Animated,
  Dimensions,
  ImageBackground,
  StatusBar,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { ShoppingBag, ChevronRight, Pizza, Flame, Trophy, Gift, Phone } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import store from '../../redux/store';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { API_URL } from '@/config';
import { addToCart } from '../../redux/slices/cartSlice';
import { getSocket, onSocketEvent, offSocketEvent } from '@/src/utils/socket';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.8;
const SPACING = 15;

// Interface for offers fetched from backend
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

// Modified HomeOfferItem interface to adapt backend data
interface HomeOfferItem {
  id: string;
  image: string;
  badge: string;
  title: string;
  subtitle: string;
  code?: string;
  bgColor: string;
  gradientColors: readonly [string, string]; // This ensures exactly 2 colors
}

// Business Profile interface
interface BusinessProfile {
  name: string;
  address: string;
  phone: string;
  email?: string;
  hours: {
    [key: string]: {
      open: string;
      close: string;
      isOpen: boolean;
    }
  };
  status: {
    isOpen: boolean;
    reason: string;
    manualOverride: boolean;
  };
}

// Size variation interface
interface SizeVariation {
  size: string;
  price: number;
  available: boolean;
}

// Menu Item interface to match backend schema
interface MenuItem {
  _id: string;
  name: string;
  description: string;
  category: string;
  price: number;
  image: string;
  foodType: string;
  isVeg: boolean;
  popular: boolean;
  rating: number;
  available: boolean;
  hasMultipleSizes?: boolean;
  sizeVariations?: SizeVariation[];
}

function HomeScreen() {
  // All hooks at the top, declared only once
  const router = useRouter();
  const dispatch = useDispatch();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [offers, setOffers] = useState<HomeOfferItem[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offerError, setOfferError] = useState<string | null>(null);
  const [popularItems, setPopularItems] = useState<MenuItem[]>([]);
  const [loadingPopularItems, setLoadingPopularItems] = useState(true);
  const [popularItemsError, setPopularItemsError] = useState<string | null>(null);
  const [businessProfile, setBusinessProfile] = useState<BusinessProfile | null>(null);
  const [businessProfileLoading, setBusinessProfileLoading] = useState(true);
  const [businessProfileError, setBusinessProfileError] = useState<string | null>(null);
  const [liveStatus, setLiveStatus] = useState<{ isOpen: boolean; reason: string; manualOverride: boolean } | null>(null);
  // Get user info from redux state
  const { name, isGuest } = useSelector((state: RootState) => state.auth);
  const userName = name || 'Pizza Lover';
  // Get cart items
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartItemCount = cartItems ? cartItems.length : 0;


  const offerThemes = [
    {
      bgColor: '#FF5722',
      gradientColors: ['#FF9800', '#FF5722'] as const // Using 'as const' to make it a readonly tuple
    },
    {
      bgColor: '#2196F3',
      gradientColors: ['#03A9F4', '#1976D2'] as const
    },
    {
      bgColor: '#4CAF50',
      gradientColors: ['#8BC34A', '#388E3C'] as const
    },
    {
      bgColor: '#9C27B0',
      gradientColors: ['#BA68C8', '#7B1FA2'] as const
    },
    {
      bgColor: '#F44336',
      gradientColors: ['#FF5252', '#D32F2F'] as const
    }
  ];

  // Fetch business profile - runs once on mount
  useEffect(() => {
    const fetchBusinessProfile = async () => {
      try {
        setBusinessProfileLoading(true);
        setBusinessProfileError(null);
        const response = await fetch(`${API_URL}/api/business/profile`);
        if (!response.ok) throw new Error('Failed to fetch business profile');
        const data = await response.json();
        setBusinessProfile(data);
        setLiveStatus(data.status);
      } catch (err) {
        setBusinessProfileError('Could not load business info');
      } finally {
        setBusinessProfileLoading(false);
      }
    };

    fetchBusinessProfile();
  }, []); // Only run once on mount

  // Fetch offers - runs once on mount
  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoadingOffers(true);
        setOfferError(null);

        const response = await fetch(`${API_URL}/api/offers`);

        if (!response.ok) {
          throw new Error('Failed to fetch offers');
        }

        const data: Offer[] = await response.json();

        const transformedOffers: HomeOfferItem[] = data.map((offer, index) => {
          let badgeText = '';
          if (offer.discountType === 'percentage') {
            badgeText = `${offer.discountValue}% OFF`;
          } else {
            badgeText = `₹${offer.discountValue} OFF`;
          }

          const sampleImages = [
            'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1581&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1470&auto=format&fit=crop',
            'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?q=80&w=1160&auto=format&fit=crop'
          ];

          const imageIndex = offer._id.charCodeAt(0) % sampleImages.length;
          const themeIndex = index % offerThemes.length;

          let subtitle = offer.description;
          if (offer.minOrderValue > 0) {
            subtitle += ` Min order: ₹${offer.minOrderValue}`;
          }

          return {
            id: offer._id,
            image: sampleImages[imageIndex],
            badge: badgeText,
            title: offer.title,
            subtitle: subtitle,
            code: offer.code,
            bgColor: offerThemes[themeIndex].bgColor,
            gradientColors: offerThemes[themeIndex].gradientColors
          };
        });

        setOffers(transformedOffers);
      } catch (error) {
        console.error('Error fetching offers:', error);
        setOfferError('Could not load offers');

        // Fallback offers
        setOffers([
          {
            id: 'offer-1',
            image: 'https://images.unsplash.com/photo-1565299624946-b28f40a0ae38?q=80&w=1581&auto=format&fit=crop',
            badge: '40% OFF',
            title: 'Weekend Special',
            subtitle: 'Get 40% off on all orders above ₹599',
            bgColor: offerThemes[0].bgColor,
            gradientColors: offerThemes[0].gradientColors
          },
          {
            id: 'offer-2',
            image: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1470&auto=format&fit=crop',
            badge: 'NEW',
            title: 'Cheese Overload',
            subtitle: 'Try our new 4-cheese pizza today',
            bgColor: offerThemes[1].bgColor,
            gradientColors: offerThemes[1].gradientColors
          },
          {
            id: 'offer-3',
            image: 'https://images.unsplash.com/photo-1571407970349-bc81e7e96d47?q=80&w=1160&auto=format&fit=crop',
            badge: 'COMBO',
            title: 'Family Feast',
            subtitle: '2 Large Pizzas + Sides + Drinks at ₹999',
            bgColor: offerThemes[2].bgColor,
            gradientColors: offerThemes[2].gradientColors
          }
        ]);
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, []); // Only run once on mount

  // Fetch popular items - runs once on mount
  useEffect(() => {
    const fetchPopularItems = async () => {
      try {
        setLoadingPopularItems(true);
        setPopularItemsError(null);

        const response = await fetch(`${API_URL}/api/menu?popular=true`);

        if (!response.ok) {
          throw new Error('Failed to fetch popular items');
        }

        const data: MenuItem[] = await response.json();

        // Filter items that are both popular and available
        const filteredItems = data.filter(item => item.popular && item.available);

        // Limit to 6 items for the home screen preview
        setPopularItems(filteredItems.slice(0, 6));
      } catch (error) {
        console.error('Error fetching popular items:', error);
        setPopularItemsError('Could not load popular items');
      } finally {
        setLoadingPopularItems(false);
      }
    };

    fetchPopularItems();
  }, []); // Only run once on mount

  // Set up socket listener for business status updates - runs once on mount
  useEffect(() => {
    const setupSocketListener = async () => {
      let socket = getSocket();
      
      // If socket is not available, try to initialize it
      if (!socket) {

        const { initializeSocket, joinSocketRooms } = await import('@/src/utils/socket');
        
        // Get auth data from redux state
        const state = store.getState();
        const { token, userId, role } = state.auth;
        
        if (token && userId) {
          socket = initializeSocket(token);
          if (socket) {
            // Join socket rooms for the user
            joinSocketRooms(userId, role || 'customer');

          }
        }
      }

      const handleStatusChange = (status: { isOpen: boolean; reason: string; manualOverride: boolean }) => {

        setLiveStatus(status);
        // Update business profile status using functional update to avoid dependency
        setBusinessProfile(prev => prev ? {
          ...prev,
          status: status
        } : null);
      };

      // Set up the listener
      if (socket) {

        const { onSocketEvent } = await import('@/src/utils/socket');
        onSocketEvent('businessStatusChanged', handleStatusChange);
        
        // Also listen for socket connection events
        socket.on('connect', () => {
          // Re-join rooms on reconnection
          const state = store.getState();
          const { userId, role } = state.auth;
          if (userId) {
            socket.emit('join', { userId, role: role || 'customer' });
          }
        });
        
        socket.on('disconnect', () => {
          // Socket disconnected
        });

        // Listen for reconnection events
        socket.on('reconnect', () => {
          // Socket reconnected
          const state = store.getState();
          const { userId, role } = state.auth;
          if (userId) {
            socket.emit('join', { userId, role: role || 'customer' });
          }
        });
      } else {
        // Socket not available for business status listener
      }

      // Return cleanup function
      return async () => {
        // Cleaning up businessStatusChanged listener
        const { offSocketEvent } = await import('@/src/utils/socket');
        offSocketEvent('businessStatusChanged', handleStatusChange);
      };
    };

    // Set up socket and store cleanup function
    let cleanup: (() => Promise<void>) | null = null;
    setupSocketListener().then(cleanupFn => {
      cleanup = cleanupFn;
    });

    // Cleanup on unmount
    return () => {
      if (cleanup) {
        cleanup();
      }
    };
  }, []); // Only run once on mount

  // Optimized socket connection check - runs every 60 seconds (reduced frequency)
  useEffect(() => {
    const connectionCheckInterval = setInterval(async () => {
      const { isSocketConnected, ensureSocketConnection, joinSocketRooms } = await import('@/src/utils/socket');
      
      // Only check connection if we're supposed to be connected
      if (!isSocketConnected()) {
        const state = store.getState();
        const { token, userId, role } = state.auth;
        
        // Only attempt reconnection if we have valid auth
        if (token && userId) {
          const socket = ensureSocketConnection(token);
          if (socket) {
            joinSocketRooms(userId, role || 'customer');
          }
        }
      }
    }, 60000); // Increased to 60 seconds for better performance

    return () => {
      clearInterval(connectionCheckInterval);
    };
  }, []);

  const navigateToCart = () => {
    router.push('/cart');
  };

  const navigateToItem = (itemId: string) => {
    // Uncomment and implement if you have a menu item page
    // router.push(`/menu/${itemId}`);
  };

  const navigateToMenu = () => {
    // Check if business is open before allowing navigation to menu
    if (liveStatus && !liveStatus.isOpen) {
      Alert.alert(
        "Restaurant Closed",
        `Sorry, we're currently closed. ${liveStatus.reason || 'Please check our operating hours.'}`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    router.push('/(tabs)/menu');
  };

  const handleAddToCart = (item: MenuItem) => {
    // Check if business is open before allowing order
    if (liveStatus && !liveStatus.isOpen) {
      Alert.alert(
        "Restaurant Closed",
        `Sorry, we're currently closed. ${liveStatus.reason || 'Please check our operating hours.'}`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }

    dispatch(addToCart({
      id: item._id,
      name: item.name,
      price: item.price,
      image: item.image,
      quantity: 1,
      size: 'Medium', // Default size
      foodType: item.foodType,
    }));

    // Show a brief success message
    Alert.alert(
      "Added to Cart",
      `${item.name} added to your cart.`,
      [
        { text: "Continue Shopping", style: "default" },
        {
          text: "View Cart",
          onPress: () => router.push('/cart')
        }
      ],
      { cancelable: true }
    );
  };

  const handleUseOffer = (code: string) => {
    if (!code) return;

    AsyncStorage.setItem('selectedOfferCode', code)
      .then(() => {

        Alert.alert(
          "Offer Selected",
          `You've selected the offer code: ${code}. It will be automatically applied at checkout.`,
          [
            { text: "Continue Browsing", style: "cancel" },
            {
              text: "View Cart",
              onPress: () => router.push('/cart')
            }
          ]
        );
      })
      .catch(err => {
        console.error("Failed to save offer code:", err);
      });
  };

  const handleOfferScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: (event: NativeSyntheticEvent<NativeScrollEvent>) => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / (ITEM_WIDTH + SPACING));
        setActiveOfferIndex(index);
      }
    }
  );

  // Helper function to get the correct display price for menu items (same as menu.tsx)
  const getDisplayPrice = (item: MenuItem): number => {
    // If item has multiple sizes (sizeVariations), show the lowest price
    if (item.hasMultipleSizes && item.sizeVariations && item.sizeVariations.length > 0) {
      const availableVariations = item.sizeVariations.filter(variation => variation.available);
      if (availableVariations.length > 0) {
        // Return the minimum price from available variations
        return Math.min(...availableVariations.map(variation => variation.price));
      }
      // Fallback to first variation if none are available (shouldn't happen)
      return item.sizeVariations[0].price;
    }
    // For fixed-price items, return the base price
    return item.price;
  };

  // Render a skeleton placeholder for popular items while loading
  const renderPopularItemSkeleton = () => (
    <View style={styles.popularItemSkeletonCard}>
      <View style={styles.popularItemSkeletonImage} />
      <View style={styles.popularItemSkeletonContent}>
        <View style={styles.popularItemSkeletonTitle} />
        <View style={styles.popularItemSkeletonPrice} />
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section with Modern Design */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?q=80&w=1470&auto=format&fit=crop' }}
          style={styles.heroBackground}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.8)', 'rgba(0,0,0,0.6)', 'rgba(0,0,0,0.4)']}
            style={styles.heroGradient}
          >
            <View style={styles.appBar}>
              <View style={styles.logoContainer}>
                <Pizza size={28} color="#FF9800" />
                <Text style={styles.brandText}>Friends Pizza Hut</Text>
              </View>
              <TouchableOpacity
                style={styles.cartButton}
                onPress={navigateToCart}
              >
                <ShoppingBag size={20} color="#fff" />
                {cartItemCount > 0 ? (
                  <View style={styles.cartBadge}>
                    <Text style={styles.cartBadgeText}>{cartItemCount.toString()}</Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            <View style={styles.greeting}>
              <Text style={styles.welcomeText}>Hi {userName}!</Text>
              <Text style={styles.tagline}>Craving a delicious pizza today?</Text>

              <TouchableOpacity
                style={styles.exploreButton}
                onPress={navigateToMenu}
              >
                <Text style={styles.exploreButtonText}>Explore Menu</Text>
                <ChevronRight size={18} color="#fff" />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.mainContent}>
          {/* Hot Offers Carousel - Only shown when offers are available */}
          {loadingOffers ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Gift size={20} color="#FF9800" />
                  <Text style={styles.sectionTitle}>Hot Offers</Text>
                </View>
              </View>
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF9800" />
                <Text style={styles.loadingText}>Loading offers...</Text>
              </View>
            </View>
          ) : offerError ? null : offers.length > 0 ? (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionTitleContainer}>
                  <Gift size={20} color="#FF9800" />
                  <Text style={styles.sectionTitle}>Hot Offers</Text>
                </View>
              </View>
              <Animated.FlatList
                data={offers}
                keyExtractor={(item) => item.id}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingLeft: 20, paddingBottom: 10, paddingTop: 5 }}
                snapToInterval={ITEM_WIDTH + SPACING}
                snapToAlignment="start"
                decelerationRate="fast"
                onScroll={handleOfferScroll}
                renderItem={({ item }) => (
                  <View style={{ width: ITEM_WIDTH, marginRight: SPACING }}>
                    <View style={styles.offerCard}>
                      <LinearGradient
                        colors={item.gradientColors}
                        start={{ x: 0.0, y: 0.0 }}
                        end={{ x: 1.0, y: 1.0 }}
                        style={styles.offerCardGradient}
                      >
                        <View style={styles.offerBadgeContainer}>
                          <View style={styles.offerBadge}>
                            <Text style={styles.offerBadgeText}>{item.badge}</Text>
                          </View>
                        </View>

                        <View style={styles.offerCardContent}>
                          <Text style={styles.offerTitle} numberOfLines={1}>
                            {item.title}
                          </Text>
                          <Text style={styles.offerSubtitle} numberOfLines={2}>
                            {item.subtitle}
                          </Text>

                          {item.code && (
                            <View style={styles.offerCodeContainer}>
                              <Text style={styles.offerCodeLabel}>Use code</Text>
                              <Text style={styles.offerCode}>{item.code}</Text>
                            </View>
                          )}

                          <TouchableOpacity
                            style={styles.offerActionButton}
                            onPress={() => handleUseOffer(item.code || '')}
                          >
                            <Text style={styles.offerActionButtonText}>
                              {item.code ? 'Apply Offer' : 'View Details'}
                            </Text>
                          </TouchableOpacity>
                        </View>

                        {/* Decorative elements */}
                        <View style={styles.decorCircle1}></View>
                        <View style={styles.decorCircle2}></View>
                        <View style={styles.decorCircle3}></View>
                      </LinearGradient>
                    </View>
                  </View>
                )}
              />

              {/* Modern Pagination dots */}
              <View style={styles.paginationDots}>
                {offers.map((_, index) => (
                  <View
                    key={index}
                    style={[
                      styles.paginationDot,
                      index === activeOfferIndex && styles.paginationDotActive,
                    ]}
                  />
                ))}
              </View>
            </View>
          ) : null} {/* Complete section is hidden when no offers available */}

          {/* Popular Items Section - Enhanced Design */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Flame size={20} color="#FF9800" />
                <Text style={styles.sectionTitle}>Popular Items</Text>
              </View>
              <TouchableOpacity
                style={styles.viewAllButton}
                onPress={navigateToMenu}
              >
                <Text style={styles.viewAllText}>View All</Text>
                <ChevronRight size={16} color="#FF9800" />
              </TouchableOpacity>
            </View>

            {loadingPopularItems ? (
              <View style={styles.popularItemsGrid}>
                {[1, 2, 3, 4].map((_, index) => (
                  <View key={index} style={styles.popularItemWrapper}>
                    {renderPopularItemSkeleton()}
                  </View>
                ))}
              </View>
            ) : popularItemsError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{popularItemsError}</Text>
              </View>
            ) : popularItems.length === 0 ? (
              <View style={styles.emptyPopularItemsContainer}>
                <Image
                  source={require('../../assets/images/empty-plate.png')}
                  style={styles.emptyStateImage}
                  defaultSource={require('../../assets/images/empty-plate.png')}
                />
                <Text style={styles.emptyStateTitleText}>Fresh Menu Coming Soon!</Text>
                <Text style={styles.emptyStateText}>
                  Our chefs are preparing something delicious. Check back later for our most popular dishes!
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={navigateToMenu}
                >
                  <Text style={styles.emptyStateButtonText}>Browse Full Menu</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <View style={styles.popularItemsGrid}>
                {popularItems.map((item) => (
                  <View key={item._id} style={styles.popularItemWrapper}>
                    <TouchableOpacity
                      style={styles.popularItemCard}
                      onPress={() => navigateToItem(item._id)}
                    >
                      <View style={styles.popularItemImageWrapper}>
                        <Image
                          source={{ uri: item.image }}
                          style={styles.popularItemImage}
                        />

                        {/* Food type indicator */}
                        <View
                          style={[
                            styles.foodTypeIndicator,
                            item.isVeg ? styles.vegIndicator : styles.nonVegIndicator
                          ]}
                        >
                          <View
                            style={[
                              styles.foodTypeDot,
                              item.isVeg ? styles.vegDot : styles.nonVegDot
                            ]}
                          />
                        </View>
                      </View>

                      <View style={styles.popularItemContent}>
                        <Text style={styles.popularItemName} numberOfLines={1}>
                          {item.name}
                        </Text>

                        <Text style={styles.popularItemDescription} numberOfLines={2}>
                          {item.description}
                        </Text>

                        <View style={styles.popularItemFooter}>
                          <View style={styles.priceContainer}>
                            <Text style={styles.popularItemPrice}>₹{getDisplayPrice(item).toFixed(0)}</Text>
                          </View>
                          
                          {liveStatus && !liveStatus.isOpen ? (
                            <View style={styles.closedButtonContainer}>
                              <Text style={styles.closedButtonText}>Closed</Text>
                            </View>
                          ) : (
                            <TouchableOpacity
                              style={styles.addToCartButton}
                              onPress={() => handleAddToCart(item)}
                              activeOpacity={0.8}
                            >
                              <Text style={styles.addToCartText}>ADD</Text>
                            </TouchableOpacity>
                          )}
                        </View>
                      </View>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Store Info - Dynamic Business Profile */}
          <View style={styles.storeInfoSection}>
            {businessProfileLoading ? (
              <View style={styles.storeInfoContent}>
                <ActivityIndicator size="small" color="#FF9800" />
                <Text style={{ color: '#888', marginTop: 8 }}>Loading business info...</Text>
              </View>
            ) : businessProfileError ? (
              <View style={styles.storeInfoContent}>
                <Text style={{ color: 'red' }}>{businessProfileError}</Text>
              </View>
            ) : businessProfile ? (
              <>
                <View style={styles.storeInfoHeader}>
                  <Text style={styles.storeInfoTitle}>{businessProfile.name}</Text>
                  <View style={[styles.storeInfoBadge, liveStatus?.isOpen ? null : { backgroundColor: '#F44336' }]}> 
                    <Text style={styles.storeInfoBadgeText}>
                      {liveStatus?.isOpen ? 'OPEN NOW' : 'CLOSED'}
                    </Text>
                  </View>
                </View>
                <View style={styles.storeInfoContent}>
                  <Text style={styles.storeInfoAddress}>{businessProfile.address}</Text>
                  <View style={styles.contactContainer}>
                    <TouchableOpacity 
                      style={styles.callButton}
                      onPress={() => {
                        const phoneNumber = businessProfile.phone.replace(/[^0-9+]/g, '');
                        const url = `tel:${phoneNumber}`;
                        Linking.openURL(url).catch(err => {
                          Alert.alert('Error', 'Unable to make phone call');
                          console.error('Phone call error:', err);
                        });
                      }}
                    >
                      <Phone size={16} color="#FF9800" />
                      <Text style={styles.callButtonText}>{businessProfile.phone}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            ) : null}
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  heroBackground: {
    height: height * 0.38,
    width: '100%',
  },
  heroGradient: {
    flex: 1,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingHorizontal: 20,
  },
  appBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  logoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  brandText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    marginLeft: 10,
    textShadowColor: 'rgba(0,0,0,0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  cartButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.15)',
    justifyContent: 'center',
    alignItems: 'center',
    backdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.2)',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF9800',
    borderRadius: 12,
    minWidth: 22,
    height: 22,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 6,
    borderWidth: 1.5,
    borderColor: '#FFF',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  greeting: {
    position: 'absolute',
    bottom: 60,
    left: 20,
    right: 20,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 32,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    marginBottom: 4,
  },
  tagline: {
    color: '#fff',
    fontSize: 16,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
    marginBottom: 20,
  },
  exploreButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  exploreButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginRight: 5,
  },
  mainContent: {
    backgroundColor: '#F5F7FA',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 30,
  },
  section: {
    marginBottom: 35,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  sectionTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  viewAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewAllText: {
    color: '#FF9800',
    fontWeight: '600',
    fontSize: 14,
  },

  // Enhanced Offer Cards - Compact Domino's Style
  offerCard: {
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 6,
  },
  offerCardGradient: {
    padding: 12,
    position: 'relative',
    minHeight: 120,
  },
  offerBadgeContainer: {
    alignItems: 'flex-start',
  },
  offerBadge: {
    backgroundColor: 'rgba(255,255,255,0.3)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginBottom: 6,
  },
  offerBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 10,
  },
  offerCardContent: {
    zIndex: 2,
    flex: 1,
    justifyContent: 'space-between',
  },
  offerTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 3,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  offerSubtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 11,
    marginBottom: 8,
    lineHeight: 14,
  },
  offerCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
    alignSelf: 'flex-start',
  },
  offerCodeLabel: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '500',
    marginRight: 4,
  },
  offerCode: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  offerActionButton: {
    backgroundColor: '#fff',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 16,
    alignSelf: 'flex-start',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  offerActionButtonText: {
    fontWeight: 'bold',
    fontSize: 10,
    color: '#333',
  },
  // Decorative elements - Smaller for compact design
  decorCircle1: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'rgba(255,255,255,0.08)',
    bottom: -20,
    right: -20,
    zIndex: 1,
  },
  decorCircle2: {
    position: 'absolute',
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.12)',
    top: -10,
    right: 20,
    zIndex: 1,
  },
  decorCircle3: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255,255,255,0.15)',
    top: 15,
    right: 50,
    zIndex: 1,
  },
  // Modern pagination
  paginationDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 15,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#E0E0E0',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 24,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FF9800',
  },

  // Loading states - Updated for compact design
  loadingContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 16,
    marginHorizontal: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 3,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    height: 140,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF5350',
    textAlign: 'center',
  },
  emptyContainer: {
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#757575',
    textAlign: 'center',
  },

  // New empty state for popular items
  emptyPopularItemsContainer: {
    alignItems: 'center',
    padding: 30,
    backgroundColor: 'white',
    marginHorizontal: 20,
    borderRadius: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
  },
  emptyStateImage: {
    width: 120,
    height: 120,
    marginBottom: 15,
    opacity: 0.7,
  },
  emptyStateTitleText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyStateButton: {
    backgroundColor: '#FF9800',
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 30,
    alignSelf: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  emptyStateButtonText: {
    color: 'white',
    fontWeight: '600',
    fontSize: 14,
  },

  // Enhanced Popular Items Grid Layout
  popularItemsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 15,
  },
  popularItemWrapper: {
    width: '50%',
    paddingHorizontal: 5,
    marginBottom: 15,
  },
  popularItemCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 5,
  },
  popularItemImageWrapper: {
    position: 'relative',
  },
  popularItemImage: {
    width: '100%',
    height: 120,
    resizeMode: 'cover',
  },
  foodTypeIndicator: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 18,
    height: 18,
    borderRadius: 4,
    backgroundColor: 'white',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1,
    elevation: 2,
  },
  vegIndicator: {},
  nonVegIndicator: {},
  foodTypeDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  vegDot: {
    backgroundColor: '#4CAF50',
  },
  nonVegDot: {
    backgroundColor: '#FF5252',
  },
  popularItemContent: {
    padding: 14,
  },
  popularItemName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#333',
    marginBottom: 4,
  },
  popularItemDescription: {
    fontSize: 12,
    color: '#666',
    marginBottom: 8,
    lineHeight: 16,
  },
  popularItemFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 4,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  popularItemPrice: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  addToCartButton: {
    backgroundColor: '#FF9800',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
    shadowColor: '#FF9800',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  addToCartText: {
    fontSize: 12,
    color: 'white',
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  closedButtonContainer: {
    backgroundColor: '#E0E0E0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 50,
    alignItems: 'center',
  },
  closedButtonText: {
    fontSize: 12,
    color: '#999',
    fontWeight: '600',
    letterSpacing: 0.5,
  },

  // Skeleton loading for popular items
  popularItemSkeletonCard: {
    backgroundColor: 'white',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    height: 210,
  },
  popularItemSkeletonImage: {
    width: '100%',
    height: 120,
    backgroundColor: '#F0F0F0',
  },
  popularItemSkeletonContent: {
    padding: 14,
  },
  popularItemSkeletonTitle: {
    width: '80%',
    height: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginBottom: 8,
  },
  popularItemSkeletonPrice: {
    width: '40%',
    height: 16,
    backgroundColor: '#F0F0F0',
    borderRadius: 4,
    marginTop: 12,
  },

  // Enhanced Store Info Section
  storeInfoSection: {
    backgroundColor: '#FFFFFF',
    marginHorizontal: 20,
    marginBottom: 40,
    marginTop: 10,
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.05)',
  },
  storeInfoHeader: {
    backgroundColor: '#FFF8E1',
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(0,0,0,0.05)',
  },
  storeInfoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  storeInfoBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
  },
  storeInfoBadgeText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  storeInfoContent: {
    padding: 16,
  },
  storeInfoAddress: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  contactContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#FF9800',
  },
  callButtonText: {
    fontSize: 14,
    color: '#FF9800',
    fontWeight: '600',
    marginLeft: 6,
  },
  storeInfoHours: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  storeInfoActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  storeInfoButton: {
    flex: 1,
    backgroundColor: '#FF9800',
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginRight: 8,
  },
  storeInfoButtonSecondary: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#FF9800',
    marginRight: 0,
    marginLeft: 8,
  },
  storeInfoButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  storeInfoButtonTextSecondary: {
    color: '#FF9800',
    fontWeight: '600',
    fontSize: 14,
  },
});

export default HomeScreen;