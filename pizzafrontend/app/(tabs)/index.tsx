import React, { useRef, useState } from 'react';
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
  Platform
} from 'react-native';
import { Star, ShoppingBag, ChevronRight, Sparkles } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import data from '../../data.json'; // Import JSON data
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { LinearGradient } from 'expo-linear-gradient';

const { width, height } = Dimensions.get('window');
const ITEM_WIDTH = width * 0.85; // Make cards wider
const SPACING = 10;

export default function HomeScreen() {
  const router = useRouter();
  const scrollX = useRef(new Animated.Value(0)).current;
  const [activeOfferIndex, setActiveOfferIndex] = useState(0);

  // Get user info from redux state
  const { name, isGuest } = useSelector((state: RootState) => state.auth);
  const userName = name || 'Pizza Lover';

  // Simulate cart items
  const cartItems = useSelector((state: RootState) => state.cart.items);
  const cartItemCount = cartItems.length;

  const navigateToCart = () => {
    // Navigate to cart
    router.push('/cart');
  };

  const navigateToItem = (itemId: string) => {
    // Navigate to item detail
    router.push(`/menu/${itemId}`);
  };

  // Handle scroll events to determine active offer
  const handleOfferScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { x: scrollX } } }],
    {
      useNativeDriver: false,
      listener: event => {
        const scrollPosition = event.nativeEvent.contentOffset.x;
        const index = Math.round(scrollPosition / (ITEM_WIDTH + SPACING));
        setActiveOfferIndex(index);
      }
    }
  );

  // Manually create offer items for the hot offers section
  const hotOffers = [
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
  ];

  // Sample pizza data
  const featuredPizzas = [
    {
      id: 'pizza-1',
      image: 'https://images.unsplash.com/photo-1593560708920-61dd98c46a4e?w=800&auto=format',
      name: 'Pepperoni Classic',
      price: '₹349'
    },
    {
      id: 'pizza-2',
      image: 'https://images.unsplash.com/photo-1595854341625-f33e596b9a3c?w=800&auto=format',
      name: 'Margherita',
      price: '₹299'
    },
    {
      id: 'pizza-3',
      image: 'https://images.unsplash.com/photo-1604382355076-af4b0eb60143?w=800&auto=format',
      name: 'Veggie Supreme',
      price: '₹399'
    },
    {
      id: 'pizza-4',
      image: 'https://images.unsplash.com/photo-1590947132387-155cc02f3212?w=800&auto=format',
      name: 'BBQ Chicken',
      price: '₹449'
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />

      {/* Main ScrollView Container - Controls the entire page scroll */}
      <ScrollView
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.scrollContentContainer}
      >
        {/* Hero Section with Background Image - Much Larger Height */}
        <ImageBackground
          source={{ uri: 'https://img.freepik.com/free-photo/pepperoni-pizza-slice_23-2151950837.jpg?t=st=1745247934~exp=1745251534~hmac=0d5bc52d36045f7f6fe00fbfb3d0c44dac2db0bfded805ee882828a3e8426fab&w=1380' }}
          style={styles.heroBackground}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.2)', 'rgba(0,0,0,0.7)']}
            style={styles.heroGradient}
          >
            {/* App Bar */}
            <View style={styles.appBar}>
              <View>
                <Text style={styles.brandText}>PizzaBolt</Text>
              </View>

              <View style={styles.appBarRight}>
                <TouchableOpacity style={styles.cartButton} onPress={navigateToCart}>
                  <ShoppingBag size={22} color="#fff" />
                  {cartItemCount > 0 && (
                    <View style={styles.cartBadge}>
                      <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
                    </View>
                  )}
                </TouchableOpacity>
              </View>
            </View>

            {/* Greeting */}
            <View style={styles.greeting}>
              <Text style={styles.welcomeText}>
                {isGuest ? 'Hello, Guest!' : `Hello, ${userName.split(' ')[0]}!`} 👋
              </Text>
              <Text style={styles.tagline}>
                What delicious meal are you craving today?
              </Text>
            </View>
          </LinearGradient>
        </ImageBackground>

        {/* Main Content */}
        <View style={styles.mainContent}>
          {/* Hot Offers Carousel - Enhanced UI */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Sparkles size={20} color="#FF6B00" />
                <Text style={styles.sectionTitle}>Hot Offers</Text>
              </View>
              {/* Removed "See All" button */}
            </View>

            {/* Enhanced ScrollView with paging effect */}
            <Animated.ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.offersListEnhanced}
              decelerationRate="fast"
              snapToInterval={ITEM_WIDTH + SPACING}
              snapToAlignment="center"
              pagingEnabled
              onScroll={handleOfferScroll}
              scrollEventThrottle={16}
            >
              {hotOffers.map((item, index) => (
                <TouchableOpacity
                  key={item.id}
                  activeOpacity={0.9}
                  onPress={() => navigateToItem(item.id)}
                >
                  <View style={[styles.offerCardEnhanced, { width: ITEM_WIDTH, marginRight: SPACING }]}>
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
                        <Text style={styles.offerSubtitleEnhanced}>{item.subtitle}</Text>

                        {/* Added call-to-action button */}
                        <TouchableOpacity style={styles.offerActionButton}>
                          <Text style={styles.offerActionButtonText}>View Offer</Text>
                        </TouchableOpacity>
                      </View>
                    </LinearGradient>
                  </View>
                </TouchableOpacity>
              ))}
            </Animated.ScrollView>

            {/* Dot indicators */}
            <View style={styles.paginationDots}>
              {hotOffers.map((_, index) => (
                <View
                  key={index}
                  style={[
                    styles.paginationDot,
                    index === activeOfferIndex && styles.paginationDotActive
                  ]}
                />
              ))}
            </View>
          </View>

          {/* Featured Pizzas - Improved UI */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <Star size={20} color="#FF6B00" />
                <Text style={styles.sectionTitle}>Featured Pizzas</Text>
              </View>
            </View>

            <View style={styles.pizzaGridContainer}>
              {featuredPizzas.map((pizza, index) => (
                <TouchableOpacity
                  key={pizza.id}
                  style={styles.pizzaCardImproved}
                  onPress={() => navigateToItem(pizza.id)}
                  activeOpacity={0.9}
                >
                  <Image source={{ uri: pizza.image }} style={styles.pizzaImageImproved} />
                  <View style={styles.pizzaCardContentImproved}>
                    <Text style={styles.pizzaNameImproved}>{pizza.name}</Text>
                    <View style={styles.pizzaCardFooterImproved}>
                      <Text style={styles.pizzaPriceImproved}>{pizza.price}</Text>
                      <TouchableOpacity style={styles.addButtonImproved}>
                        <Text style={styles.addButtonTextImproved}>+</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Popular Deals */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleContainer}>
                <ShoppingBag size={18} color="#FF6B00" />
                <Text style={styles.sectionTitle}>Popular Deals</Text>
              </View>
              {/* Removed "See All" button */}
            </View>

            <View style={styles.dealsGridContainer}>
              <TouchableOpacity style={styles.dealCard} activeOpacity={0.9}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1513104890138-7c749659a591?w=400&q=80' }}
                  style={styles.dealImage}
                />
                <View style={styles.dealContent}>
                  <Text style={styles.dealTitle}>Family Combo</Text>
                  <Text style={styles.dealDescription}>2 Large Pizzas + 2 Sides</Text>
                  <View style={styles.dealFooter}>
                    <Text style={styles.dealPrice}>₹699</Text>
                    <TouchableOpacity style={styles.viewDealButton}>
                      <Text style={styles.viewDealText}>View</Text>
                      <ChevronRight size={16} color="#FF6B00" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>

              <TouchableOpacity style={styles.dealCard} activeOpacity={0.9}>
                <Image
                  source={{ uri: 'https://images.unsplash.com/photo-1571066811602-716837d681de?w=400&q=80' }}
                  style={styles.dealImage}
                />
                <View style={styles.dealContent}>
                  <Text style={styles.dealTitle}>Party Pack</Text>
                  <Text style={styles.dealDescription}>3 Medium Pizzas + Drinks</Text>
                  <View style={styles.dealFooter}>
                    <Text style={styles.dealPrice}>₹999</Text>
                    <TouchableOpacity style={styles.viewDealButton}>
                      <Text style={styles.viewDealText}>View</Text>
                      <ChevronRight size={16} color="#FF6B00" />
                    </TouchableOpacity>
                  </View>
                </View>
              </TouchableOpacity>
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
  // Significantly increased hero height for more impact
  heroBackground: {
    height: height * 0.45, // Increased to 45% of screen height
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
    fontSize: 22, // Increased size
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
    // Centered vertically in the larger hero section
    position: 'absolute',
    bottom: 80,
    left: 20,
    right: 20,
  },
  welcomeText: {
    color: '#fff',
    fontSize: 32, // Even larger font
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
    fontSize: 20, // Increased size
    fontWeight: 'bold',
    color: '#1c1917',
    marginLeft: 8,
  },
  sectionAction: {
    color: '#FF6B00',
    fontWeight: '600',
    fontSize: 14,
  },
  // Original (kept for reference)
  offersList: {
    paddingLeft: 20,
    paddingRight: 10,
  },
  offerCard: {
    height: 200, // Taller cards
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
    fontSize: 22, // Larger text
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

  // Enhanced Hot Offers styles
  offersListEnhanced: {
    paddingLeft: 20,
    paddingRight: 10,
    paddingVertical: 10, // Added vertical padding
  },
  offerCardEnhanced: {
    height: 220, // Taller cards
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
    padding: 0, // We'll use inner container padding instead
  },
  offerContent: {
    padding: 20,
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
    fontSize: 14, // Slightly larger
  },
  offerTitleEnhanced: {
    color: '#fff',
    fontSize: 24, // Larger text
    fontWeight: 'bold',
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.7)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 4,
  },
  offerSubtitleEnhanced: {
    color: '#fff',
    fontSize: 16, // Larger text
    marginBottom: 16,
    opacity: 0.95,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
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

  // Original styles
  // pizzaGridContainer: {
  //   flexDirection: 'row',
  //   flexWrap: 'wrap',
  //   paddingHorizontal: 15,
  //   justifyContent: 'space-between',
  // },
  pizzaCard: {
    width: width / 2 - 25,
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1, // Increased shadow
    shadowRadius: 6, // Increased shadow spread
    elevation: 4, // Increased elevation
  },
  pizzaImage: {
    width: '100%',
    height: 150, // Taller images
  },
  pizzaCardContent: {
    padding: 15, // More padding
  },
  pizzaName: {
    fontSize: 16, // Slightly larger
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
    fontSize: 17, // Larger price
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  addButton: {
    backgroundColor: '#1c1917',
    height: 30, // Larger button
    width: 30, // Larger button
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
    shadowOpacity: 0.12, // Increased shadow
    shadowRadius: 8, // Increased shadow spread
    elevation: 5, // Increased elevation
  },
  dealImage: {
    width: '100%',
    height: 160, // Taller images
  },
  dealContent: {
    padding: 18, // More padding
  },
  dealTitle: {
    fontSize: 18, // Larger text
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
    fontSize: 20, // Larger price
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
  // Improved Featured Pizzas styles
pizzaGridContainer: {
  flexDirection: 'row',
  flexWrap: 'wrap',
  paddingHorizontal: 20,
  justifyContent: 'space-between',
},
pizzaCardImproved: {
  width: width / 2 - 30, // Slightly wider but with more spacing
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
  height: 130, // Shorter, more balanced height
  resizeMode: 'cover',
},
pizzaCardContentImproved: {
  padding: 16,
},
pizzaNameImproved: {
  fontSize: 16,
  fontWeight: '700', // Bolder font
  color: '#1c1917',
  marginBottom: 8,
  letterSpacing: 0.2, // Slight letter spacing
},
pizzaCardFooterImproved: {
  flexDirection: 'row',
  justifyContent: 'space-between',
  alignItems: 'center',
  marginTop: 6,
},
pizzaPriceImproved: {
  fontSize: 18, // Larger price
  fontWeight: '800', // Extra bold
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
},
});