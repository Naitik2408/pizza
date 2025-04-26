import React, { useRef, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';
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
  ActivityIndicator
} from 'react-native';
import { Star, ShoppingBag, ChevronRight, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import data from '../../data.json'; // Import JSON data
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { LinearGradient } from 'expo-linear-gradient';
import { NativeSyntheticEvent, NativeScrollEvent } from 'react-native';
import { API_URL } from '@/config';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.85; // Make cards wider
const SPACING = 10;

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
  code?: string; // Added code
}

function HomeScreen() {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);
  const [offers, setOffers] = useState<HomeOfferItem[]>([]);
  const [loadingOffers, setLoadingOffers] = useState(true);
  const [offerError, setOfferError] = useState<string | null>(null);

  // Get user info from redux state
  const { name, isGuest, token } = useSelector((state: RootState) => state.auth);
  const userName = name || 'Pizza Lover';

  // Simulate cart items
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartItemCount = cartItems.length;

  useEffect(() => {
    const fetchOffers = async () => {
      try {
        setLoadingOffers(true);
        setOfferError(null);

        // Use the public endpoint instead of the admin-only endpoint
        const response = await fetch(`${API_URL}/api/offers`);

        if (!response.ok) {
          throw new Error('Failed to fetch offers');
        }

        const data: Offer[] = await response.json();

        // Transform backend offers to home screen offer format
        const transformedOffers: HomeOfferItem[] = data.map(offer => {
          // Generate badge text based on discount type and value
          let badgeText = '';
          if (offer.discountType === 'percentage') {
            badgeText = `${offer.discountValue}% OFF`;
          } else {
            badgeText = `₹${offer.discountValue} OFF`;
          }

          // Sample offer images - in a real app you'd store image URLs with offers
          const sampleImages = [
            'https://img.freepik.com/free-photo/photo-happy-joyful-man-wearing-burgundy-casual-t-shirt-looking-smiling-camera-holding-pizza-boxes_176532-9612.jpg?t=st=1745249055~exp=1745252655~hmac=52d7ce90a296baee9572fc3d5475ba8e75d7a03eb85ecb1db940e5630505b537&w=1380',
            'https://img.freepik.com/free-photo/young-delivery-man-red-polo-shirt-cap-standing-with-box-fresh-pizza-pointing-it-with-finger-looking-camera-convinced-confident-isolated-pink-background_141793-19548.jpg?t=st=1745249128~exp=1745252728~hmac=c4c2b41db080ea544c7de06e1a590272b3a14e6473aeb6bf903d8ec895cd085f&w=1380',
            'https://img.freepik.com/free-photo/young-delivery-man-red-uniform-cap-holding-paper-package-stack-pizza-boxes-pointing-something-with-skeptic-expression_141793-46341.jpg?t=st=1745249173~exp=1745252773~hmac=cecf90be9f1c55f57355827f0daa191696786cc6940291b0684220df73694671&w=1380'
          ];

          // Choose an image based on the offer ID (consistent but pseudo-random)
          const imageIndex = offer._id.charCodeAt(0) % sampleImages.length;

          // Generate subtitle based on offer details
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
            code: offer.code
          };
        });

        setOffers(transformedOffers);
      } catch (error) {
        console.error('Error fetching offers:', error);
        setOfferError('Could not load offers');

        // Fallback to default offers if backend fetch fails
        setOffers([
          {
            id: 'offer-1',
            image: 'https://img.freepik.com/free-photo/photo-happy-joyful-man-wearing-burgundy-casual-t-shirt-looking-smiling-camera-holding-pizza-boxes_176532-9612.jpg?t=st=1745249055~exp=1745252655~hmac=52d7ce90a296baee9572fc3d5475ba8e75d7a03eb85ecb1db940e5630505b537&w=1380',
            badge: '40% OFF',
            title: 'Friday Special',
            subtitle: 'Get 40% off on all orders above ₹599'
          },
          {
            id: 'offer-2',
            image: 'https://img.freepik.com/free-photo/young-delivery-man-red-polo-shirt-cap-standing-with-box-fresh-pizza-pointing-it-with-finger-looking-camera-convinced-confident-isolated-pink-background_141793-19548.jpg?t=st=1745249128~exp=1745252728~hmac=c4c2b41db080ea544c7de06e1a590272b3a14e6473aeb6bf903d8ec895cd085f&w=1380',
            badge: 'NEW',
            title: 'Cheese Explosion',
            subtitle: 'Try our new 4-cheese pizza today'
          },
          {
            id: 'offer-3',
            image: 'https://img.freepik.com/free-photo/young-delivery-man-red-uniform-cap-holding-paper-package-stack-pizza-boxes-pointing-something-with-skeptic-expression_141793-46341.jpg?t=st=1745249173~exp=1745252773~hmac=cecf90be9f1c55f57355827f0daa191696786cc6940291b0684220df73694671&w=1380',
            badge: 'COMBO',
            title: 'Family Bundle',
            subtitle: '2 Pizzas + Sides + Drinks at ₹799'
          }
        ]);
      } finally {
        setLoadingOffers(false);
      }
    };

    fetchOffers();
  }, []);

  const navigateToCart = () => {
    // Navigate to cart
    router.push('/cart');
  };

  const navigateToItem = (itemId: string) => {
    // Navigate to item detail
    // router.push(`/menu/${itemId}`);
  };

  const handleUseOffer = (code: string) => {
    if (!code) return;

    // Store the offer code in AsyncStorage for later use in the cart
    AsyncStorage.setItem('selectedOfferCode', code)
      .then(() => {
        console.log(`Offer code ${code} saved to be applied at checkout`);
        Alert.alert(
          "Offer Selected",
          `You've selected the offer code: ${code}. It will be automatically applied at checkout.`,
          [
            { text: "Continue Shopping", style: "cancel" },
            {
              text: "Go to Cart",
              onPress: () => router.push('/cart')
            }
          ]
        );
      })
      .catch(err => {
        console.error("Failed to save offer code:", err);
      });
  };
  
  // Define the scroll handler
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

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <ScrollView
        style={styles.scrollContainer}
        contentContainerStyle={styles.scrollContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <ImageBackground
          source={{ uri: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=1000&q=80' }}
          style={styles.heroBackground}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.7)', 'rgba(0,0,0,0.5)', 'rgba(0,0,0,0.3)']}
            style={styles.heroGradient}
          >
            <View style={styles.appBar}>
              <Text style={styles.brandText}>Pizza Bytes</Text>
              <View style={styles.appBarRight}>
                <TouchableOpacity style={styles.cartButton} onPress={navigateToCart}>
                  <ShoppingBag size={20} color="#fff" />
                  {cartItemCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            <View style={styles.greeting}>
              <Text style={styles.welcomeText}>Hi {userName}!</Text>
              <Text style={styles.tagline}>What would you like to taste today?</Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        <View style={styles.mainContent}>
          {/* Hot Offers Carousel - Enhanced UI */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Sparkles size={20} color="#FF6B00" />
                <Text style={styles.sectionTitle}>Hot Offers</Text>
              </View>
            </View>

            {loadingOffers ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>Loading offers...</Text>
              </View>
            ) : offerError ? (
              <View style={styles.errorContainer}>
                <Text style={styles.errorText}>{offerError}</Text>
              </View>
            ) : offers.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No offers available at the moment</Text>
              </View>
            ) : (
              <>
                <Animated.FlatList
                  data={offers}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={{ paddingLeft: 20 }}
                  snapToInterval={ITEM_WIDTH + SPACING}
                  snapToAlignment="start"
                  decelerationRate="fast"
                  onScroll={handleOfferScroll}
                  renderItem={({ item }) => (
                    <View style={{ width: ITEM_WIDTH, marginRight: SPACING }}>
                      <View style={styles.offerCardEnhanced}>
                        <Image source={{ uri: item.image }} style={styles.offerImageEnhanced} />
                        <LinearGradient
                          colors={['transparent', 'rgba(0,0,0,0.8)']}
                          style={styles.offerGradientEnhanced}
                        >
                          <View style={styles.offerContent}>
                            <View style={styles.offerBadgeEnhanced}>
                              <Text style={styles.offerBadgeTextEnhanced}>{item.badge}</Text>
                            </View>

                            <Text style={styles.offerTitleEnhanced}>{item.title}</Text>
                            <Text style={styles.offerSubtitleEnhanced}>
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
                        </LinearGradient>
                      </View>
                    </View>
                  )}
                />

                {/* Pagination dots */}
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
              </>
            )}
          </View>

          {/* Popular Pizzas */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Star size={20} color="#FF6B00" />
                <Text style={styles.sectionTitle}>Popular Pizzas</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.sectionAction}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.pizzaGridContainer}>
              {data.featuredPizzas.slice(0, 4).map((item: any) => (
                <TouchableOpacity
                  key={item.id || `pizza-${item.name}`}
                  style={styles.pizzaCardImproved}
                  onPress={() => navigateToItem(item.id || `pizza-${item.name}`)}
                >
                  <Image source={{ uri: item.image }} style={styles.pizzaImageImproved} />
                  <View style={styles.pizzaCardContentImproved}>
                    <Text style={styles.pizzaNameImproved}>
                      {item.name}
                    </Text>
                    <View style={styles.pizzaCardFooterImproved}>
                      <Text style={styles.pizzaPriceImproved}>
                        ₹{item.price}
                      </Text>
                      <TouchableOpacity
                        style={styles.addButtonImproved}
                        // In a real app, add this item to cart
                      >
                        <Text style={styles.addButtonTextImproved}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Deals of the Day */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Sparkles size={20} color="#FF6B00" />
                <Text style={styles.sectionTitle}>Deals of the Day</Text>
              </View>
              <TouchableOpacity>
                <Text style={styles.sectionAction}>View All</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.dealsGridContainer}>
              {data.menuItems.slice(0, 2).map((deal: any) => (
                <View key={deal.id || `deal-${deal.name}`} style={styles.dealCard}>
                  <Image source={{ uri: deal.image }} style={styles.dealImage} />
                  <View style={styles.dealContent}>
                    <Text style={styles.dealTitle}>{deal.name}</Text>
                    <Text style={styles.dealDescription}>
                      {deal.description}
                    </Text>
                    <View style={styles.dealFooter}>
                      <Text style={styles.dealPrice}>₹{deal.price}</Text>
                      <TouchableOpacity
                        style={styles.viewDealButton}
                        // Add navigation to deal details
                      >
                        <Text style={styles.viewDealText}>View Deal</Text>
                        <ChevronRight size={16} color="#FF6B00" />
                      </TouchableOpacity>
                    </View>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8f9fa',
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContentContainer: {
    flexGrow: 1,
    paddingBottom: 30,
  },
  heroBackground: {
    height: height * 0.45,
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
  brandText: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: '#FF6B00',
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cartBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  greeting: {
    position: 'absolute',
    bottom: 80,
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
  },
  tagline: {
    color: '#fff',
    fontSize: 18,
    marginTop: 10,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  mainContent: {
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingTop: 20,
  },
  section: {
    marginBottom: 25,
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
    color: '#1c1917',
    marginLeft: 8,
  },
  sectionAction: {
    color: '#FF6B00',
    fontWeight: '600',
    fontSize: 14,
  },
  offersList: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  offerCard: {
    height: 200,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  offerImage: {
    width: '100%',
    height: '100%',
    position: 'absolute',
  },
  offerGradient: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 16,
  },
  offerBadge: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 8,
  },
  offerBadgeText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  offerTitle: {
    color: '#fff',
    fontSize: 22,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  offerSubtitle: {
    color: '#fff',
    fontSize: 14,
    opacity: 0.9,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  offersListEnhanced: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingVertical: 10,
  },
  offerCardEnhanced: {
    minHeight: 250,
    maxHeight: 350,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
  },
  offerImageEnhanced: {
    width: '100%',
    height: '100%',
    position: 'absolute',
    resizeMode: 'cover',
  },
  offerGradientEnhanced: {
    flex: 1,
    justifyContent: 'flex-end',
    padding: 0,
  },
  offerContent: {
    padding: 20,
    flexShrink: 1,
  },
  offerBadgeEnhanced: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    alignSelf: 'flex-start',
    marginBottom: 12,
  },
  offerBadgeTextEnhanced: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
  offerTitleEnhanced: {
    color: '#fff',
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  offerSubtitleEnhanced: {
    color: '#fff',
    fontSize: 16,
    marginBottom: 16,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
    flexWrap: 'wrap',
  },
  offerCodeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    alignSelf: 'flex-start',
  },
  offerCodeLabel: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '500',
    marginRight: 6,
  },
  offerCode: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 1,
  },
  offerActionButton: {
    backgroundColor: '#FF6B00',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 30,
    alignSelf: 'flex-start',
    marginTop: 5,
  },
  offerActionButtonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 14,
  },
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
    backgroundColor: '#D0D0D0',
    marginHorizontal: 4,
  },
  paginationDotActive: {
    width: 20,
    height: 8,
    backgroundColor: '#FF6B00',
  },
  loadingContainer: {
    height: 250,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#EF4444',
    textAlign: 'center',
  },
  emptyContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  pizzaCard: {
    width: width / 2 - 25,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  pizzaImage: {
    width: '100%',
    height: 150,
  },
  pizzaCardContent: {
    padding: 15,
  },
  pizzaName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1c1917',
    marginBottom: 8,
  },
  pizzaCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 5,
  },
  pizzaPrice: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  addButton: {
    backgroundColor: '#1c1917',
    height: 30,
    width: 30,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  dealsGridContainer: {
    paddingHorizontal: 20,
  },
  dealCard: {
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
  },
  dealImage: {
    width: '100%',
    height: 160,
  },
  dealContent: {
    padding: 18,
  },
  dealTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1c1917',
  },
  dealDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 6,
    marginBottom: 14,
  },
  dealFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  dealPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  viewDealButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDealText: {
    color: '#FF6B00',
    fontWeight: '600',
    marginRight: 4,
  },
  pizzaGridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 20,
    justifyContent: 'space-between',
  },
  pizzaCardImproved: {
    width: width / 2 - 30,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.03)',
  },
  pizzaImageImproved: {
    width: '100%',
    height: 130,
    resizeMode: 'cover',
  },
  pizzaCardContentImproved: {
    padding: 16,
  },
  pizzaNameImproved: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1c1917',
    marginBottom: 8,
    letterSpacing: 0.2,
  },
  pizzaCardFooterImproved: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 6,
  },
  pizzaPriceImproved: {
    fontSize: 18,
    fontWeight: '800',
    color: '#FF6B00',
    letterSpacing: 0.3,
  },
  addButtonImproved: {
    backgroundColor: '#1c1917',
    height: 32,
    width: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 2,
  },
  addButtonTextImproved: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
  }
});

export default HomeScreen;