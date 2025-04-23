import React, { useState, useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { addToCart, selectCartItemCount, selectCartItems } from '../../redux/slices/cartSlice';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  TextInput,
  Modal,
  ScrollView,
  ActivityIndicator,
  RefreshControl
} from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_URL } from '@/config';

interface CustomizationOption {
  name: string;
  price: number;
}

interface Customization {
  name: string;
  options: CustomizationOption[];
}

interface SizeVariation {
  size: string;
  price: number;
  available: boolean;
}

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
  customizations?: Customization[];
  size?: string;
  sizeVariations?: SizeVariation[];
  hasMultipleSizes?: boolean;
}

interface Category {
  id: number;
  name: string;
  icon: string;
}

const CATEGORIES = [
  { id: 1, name: 'All', icon: '🍽️' },
  { id: 2, name: 'Pizza', icon: '🍕' },
  { id: 3, name: 'Burger', icon: '🍔' },
  { id: 4, name: 'Grilled Sandwich', icon: '🥪' },
  { id: 5, name: 'Special Combo', icon: '🍱' },
  { id: 6, name: 'Pasta', icon: '🍝' },
  { id: 7, name: 'Noodles', icon: '🍜' },
  { id: 8, name: 'Snacks', icon: '🍟' },
  { id: 9, name: 'Milkshake', icon: '🥤' },
  { id: 10, name: 'Cold Drink', icon: '🧊' },
  { id: 11, name: 'Rice Item', icon: '🍚' },
  { id: 12, name: 'Sweets', icon: '🍰' },
  { id: 13, name: 'Sides', icon: '🥗' },
];

const SORT_OPTIONS = [
  { id: 1, name: 'Popular', value: 'popular' },
  { id: 2, name: 'Price: Low to High', value: 'priceAsc' },
  { id: 3, name: 'Price: High to Low', value: 'priceDesc' },
  { id: 4, name: 'Rating', value: 'rating' },
];

const MenuScreen = () => {
  const [activeCategory, setActiveCategory] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);
  const [sortBy, setSortBy] = useState('popular');
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<MenuItem[]>([]);
  const [showSortOptions, setShowSortOptions] = useState(false);
  const [selectedItemDetail, setSelectedItemDetail] = useState<MenuItem | null>(null);
  const [selectedSize, setSelectedSize] = useState<string>('Medium');
  const [quantity, setQuantity] = useState(1);
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, CustomizationOption>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const dispatch = useDispatch();
  const cartItemCount = useSelector(selectCartItemCount);
  const cartItems = useSelector(selectCartItems);
  const router = useRouter();

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_URL}/api/menu`);

      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }

      const data = await response.json();
      setMenuItems(data);
      setFilteredItems(data);
    } catch (error) {
      console.error('Error fetching menu items:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenuItems();
  };

  useEffect(() => {
    fetchMenuItems();
  }, []);

  useEffect(() => {
    let result = [...menuItems];

    if (searchQuery) {
      result = result.filter(item =>
        item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (activeCategory !== 1) {
      const categoryName = CATEGORIES.find(cat => cat.id === activeCategory)?.name;
      result = result.filter(item => item.category === categoryName);
    }

    if (vegOnly) {
      result = result.filter(item => item.foodType === 'Veg');
    }

    result = result.filter(item => item.available);

    switch (sortBy) {
      case 'priceAsc':
        result.sort((a, b) => a.price - b.price);
        break;
      case 'priceDesc':
        result.sort((a, b) => b.price - a.price);
        break;
      case 'rating':
        result.sort((a, b) => b.rating - a.rating);
        break;
      case 'popular':
      default:
        result.sort((a, b) => (b.popular ? 1 : 0) - (a.popular ? 1 : 0) || b.rating - a.rating);
        break;
    }

    setFilteredItems(result);
  }, [activeCategory, searchQuery, vegOnly, sortBy, menuItems]);

  // Then update openItemDetail to use the cartItems from the component scope
  const openItemDetail = (item: MenuItem) => {
    setSelectedItemDetail(item);

    // Set default size
    let initialSize = 'Medium';
    if (item.sizeVariations && item.sizeVariations.length > 0) {
      initialSize = item.sizeVariations.find(v => v.available)?.size || item.sizeVariations[0].size;
    } else {
      initialSize = item.size || 'Medium';
    }
    setSelectedSize(initialSize);

    // Setup initial customizations
    const initialCustomizations: Record<string, CustomizationOption> = {};
    if (item.customizations) {
      item.customizations.forEach(customization => {
        if (customization.options.length > 0) {
          initialCustomizations[customization.name] = customization.options[0];
        }
      });
    }
    setSelectedCustomizations(initialCustomizations);

    // Check if this exact item configuration is already in the cart
    const existingItem = cartItems.find(cartItem =>
      cartItem.id === item._id &&
      cartItem.size === initialSize &&
      // To avoid deep comparison issues, we'll just check ID and size
      cartItem.size === initialSize
    );

    // Set quantity to existing quantity or 1 if not in cart
    setQuantity(existingItem ? existingItem.quantity : 1);
  };

  const closeItemDetail = () => {
    setSelectedItemDetail(null);
  };
  

  const handleAddToCart = () => {
    if (!selectedItemDetail) return;

    let basePrice = selectedItemDetail.price;
    if (selectedItemDetail.sizeVariations && selectedItemDetail.sizeVariations.length > 0) {
      const selectedVariation = selectedItemDetail.sizeVariations.find(v => v.size === selectedSize);
      if (selectedVariation) {
        basePrice = selectedVariation.price;
      }
    }

    const cartItem = {
      id: selectedItemDetail._id,
      name: selectedItemDetail.name,
      price: basePrice,
      image: selectedItemDetail.image,
      quantity: quantity,
      size: selectedSize,
      foodType: selectedItemDetail.foodType,
      customizations: selectedCustomizations
    };

    dispatch(addToCart(cartItem));
    closeItemDetail();
  };

  const updateCustomization = (category: string, option: CustomizationOption) => {
    setSelectedCustomizations({
      ...selectedCustomizations,
      [category]: option
    });
  };

  const calculateTotalPrice = () => {
    if (!selectedItemDetail) return 0;

    let basePrice = selectedItemDetail.price;
    if (selectedItemDetail.sizeVariations && selectedItemDetail.sizeVariations.length > 0) {
      const selectedVariation = selectedItemDetail.sizeVariations.find(v => v.size === selectedSize);
      if (selectedVariation) {
        basePrice = selectedVariation.price;
      }
    }

    let totalPrice = basePrice;
    Object.values(selectedCustomizations).forEach(option => {
      totalPrice += option.price;
    });

    return totalPrice * quantity;
  };

  const renderSkeletonItem = () => (
    <View style={styles.skeletonItem}>
      <View style={styles.skeletonImage} />
      <View style={styles.skeletonContent}>
        <View style={styles.skeletonTitle} />
        <View style={styles.skeletonDescription} />
        <View style={styles.skeletonFooter} />
      </View>
    </View>
  );

  const renderMenuItem = ({ item }: { item: MenuItem }) => {
    if (loading && !refreshing) {
      return renderSkeletonItem();
    }

    return (
      <TouchableOpacity
        style={styles.menuItem}
        onPress={() => openItemDetail(item)}
        disabled={!item.available}
      >
        <Image source={{ uri: item.image }} style={styles.menuItemImage} />
        <View style={styles.menuItemContent}>
          <View style={styles.menuItemHeader}>
            <Text style={[styles.menuItemName, !item.available && styles.unavailableItem]}>
              {item.name}
              {!item.available && ' (Unavailable)'}
            </Text>
            {item.foodType !== 'Not Applicable' && (
              item.foodType === 'Veg' ? (
                <View style={styles.vegBadge}>
                  <Text style={styles.vegBadgeText}>VEG</Text>
                </View>
              ) : (
                <View style={styles.nonVegBadge}>
                  <Text style={styles.nonVegBadgeText}>NON-VEG</Text>
                </View>
              )
            )}
          </View>
          <Text style={styles.menuItemDescription} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.menuItemFooter}>
            <Text style={styles.menuItemPrice}>${item.price.toFixed(2)}</Text>
            <View style={styles.ratingContainer}>
              <AntDesign name="star" size={14} color="#FF6B00" />
              <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
            </View>
            <TouchableOpacity
              style={[styles.addButton, !item.available && styles.addButtonDisabled]}
              onPress={() => openItemDetail(item)}
              disabled={!item.available}
            >
              <Text style={styles.addButtonText}>Add</Text>
              <AntDesign name="plus" size={12} color="#FFF" />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity>
          <AntDesign name="arrowleft" size={24} color="#1F2937" />
        </TouchableOpacity>
        <Text style={styles.title}>Menu</Text>
        <TouchableOpacity
          onPress={() => router.push('/cart')}
          style={styles.cartIconContainer}
        >
          <AntDesign name="shoppingcart" size={24} color="#1F2937" />
          {cartItemCount > 0 && (
            <View style={styles.cartBadge}>
              <Text style={styles.cartBadgeText}>{cartItemCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <AntDesign name="search1" size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search for food..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setShowFilters(!showFilters)}
        >
          <AntDesign name="filter" size={20} color="#666" />
        </TouchableOpacity>
      </View>

      {showFilters && (
        <View style={styles.filterOptions}>
          <TouchableOpacity
            style={styles.vegFilter}
            onPress={() => setVegOnly(!vegOnly)}
          >
            <View style={[styles.checkbox, vegOnly && styles.checkboxChecked]}>
              {vegOnly && <AntDesign name="check" size={12} color="#FFF" />}
            </View>
            <Text style={styles.vegFilterText}>Vegetarian Only</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.sortButton}
            onPress={() => setShowSortOptions(!showSortOptions)}
          >
            <Text style={styles.sortButtonText}>
              Sort By: {SORT_OPTIONS.find(option => option.value === sortBy)?.name}
            </Text>
            <MaterialIcons
              name={showSortOptions ? "keyboard-arrow-up" : "keyboard-arrow-down"}
              size={20}
              color="#666"
            />
          </TouchableOpacity>

          {showSortOptions && (
            <View style={styles.sortOptionsContainer}>
              {SORT_OPTIONS.map(option => (
                <TouchableOpacity
                  key={option.id}
                  style={styles.sortOption}
                  onPress={() => {
                    setSortBy(option.value);
                    setShowSortOptions(false);
                  }}
                >
                  <Text style={[
                    styles.sortOptionText,
                    sortBy === option.value && styles.activeSortOption
                  ]}>
                    {option.name}
                  </Text>
                  {sortBy === option.value && (
                    <AntDesign name="check" size={16} color="#FF6B00" />
                  )}
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      )}

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoriesList}
        contentContainerStyle={styles.categoriesListContent}
      >
        {CATEGORIES.map(category => (
          <TouchableOpacity
            key={category.id}
            style={[
              styles.categoryItem,
              activeCategory === category.id && styles.activeCategoryItem
            ]}
            onPress={() => setActiveCategory(category.id)}
          >
            <Text style={styles.categoryIcon}>{category.icon}</Text>
            <Text
              style={[
                styles.categoryName,
                activeCategory === category.id && styles.activeCategoryText
              ]}
              numberOfLines={1}
            >
              {category.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {(vegOnly || activeCategory !== 1) && (
        <View style={styles.statusBar}>
          <Text style={styles.statusText}>
            {loading && !refreshing ? 'Loading...' : `${filteredItems.length} items`}
          </Text>

          {activeCategory !== 1 && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>
                {CATEGORIES.find(cat => cat.id === activeCategory)?.name}
              </Text>
              <TouchableOpacity onPress={() => setActiveCategory(1)}>
                <AntDesign name="close" size={12} color="#FF6B00" />
              </TouchableOpacity>
            </View>
          )}

          {vegOnly && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>Vegetarian</Text>
              <TouchableOpacity onPress={() => setVegOnly(false)}>
                <AntDesign name="close" size={12} color="#FF6B00" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}

      <FlatList
        data={loading && !refreshing ? Array(6).fill({}) : filteredItems}
        renderItem={renderMenuItem}
        keyExtractor={(item, index) => item._id || `skeleton-${index}`}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.menuList}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={['#FF6B00']}
            tintColor="#FF6B00"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyList}>
            <Text style={styles.emptyListText}>
              {menuItems.length === 0 ? 'Menu is empty' : 'No items match your filters'}
            </Text>
            {menuItems.length === 0 && (
              <TouchableOpacity onPress={fetchMenuItems} style={styles.retryButton}>
                <Text style={styles.retryButtonText}>Retry</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      />

      <Modal
        visible={selectedItemDetail !== null}
        transparent={true}
        animationType="slide"
        onRequestClose={closeItemDetail}
      >
        {selectedItemDetail && (
          <View style={styles.modalContainer}>
            <View style={styles.modalContent}>
              <TouchableOpacity style={styles.closeButton} onPress={closeItemDetail}>
                <AntDesign name="close" size={24} color="#333" />
              </TouchableOpacity>

              <ScrollView>
                <Image
                  source={{ uri: selectedItemDetail.image }}
                  style={styles.modalImage}
                />

                <View style={styles.modalHeader}>
                  <Text style={styles.modalItemName}>{selectedItemDetail.name}</Text>
                  {selectedItemDetail.foodType !== 'Not Applicable' && (
                    selectedItemDetail.foodType === 'Veg' ? (
                      <View style={styles.vegBadge}>
                        <Text style={styles.vegBadgeText}>VEG</Text>
                      </View>
                    ) : (
                      <View style={styles.nonVegBadge}>
                        <Text style={styles.nonVegBadgeText}>NON-VEG</Text>
                      </View>
                    )
                  )}
                </View>

                <View style={styles.ratingContainer}>
                  <AntDesign name="star" size={16} color="#FF6B00" />
                  <Text style={styles.rating}>{selectedItemDetail.rating.toFixed(1)}</Text>
                </View>

                <Text style={styles.modalItemDescription}>
                  {selectedItemDetail.description}
                </Text>

                {selectedItemDetail.sizeVariations && selectedItemDetail.sizeVariations.length > 0 && (
                  <View style={styles.sizeSection}>
                    <Text style={styles.sizeTitle}>Size</Text>
                    <View style={styles.sizeOptions}>
                      {selectedItemDetail.sizeVariations
                        .filter(variation => variation.available)
                        .map((variation, index) => (
                          <TouchableOpacity
                            key={index}
                            style={[
                              styles.sizeOption,
                              selectedSize === variation.size && styles.selectedSizeOption
                            ]}
                            onPress={() => setSelectedSize(variation.size)}
                          >
                            <Text
                              style={[
                                styles.sizeOptionText,
                                selectedSize === variation.size && styles.selectedSizeOptionText
                              ]}
                            >
                              {variation.size}
                            </Text>
                            <Text
                              style={[
                                styles.sizePriceText,
                                selectedSize === variation.size && styles.selectedSizePriceText
                              ]}
                            >
                              ${variation.price.toFixed(2)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                )}

                {selectedItemDetail.customizations?.map((customization, index) => (
                  <View key={index} style={styles.customizationSection}>
                    <Text style={styles.customizationTitle}>{customization.name}</Text>

                    <View style={styles.customizationOptions}>
                      {customization.options.map((option, optIndex) => (
                        <TouchableOpacity
                          key={optIndex}
                          style={[
                            styles.customizationOption,
                            selectedCustomizations[customization.name]?.name === option.name &&
                            styles.selectedCustomizationOption
                          ]}
                          onPress={() => updateCustomization(customization.name, option)}
                        >
                          <Text style={[
                            styles.customizationOptionText,
                            selectedCustomizations[customization.name]?.name === option.name &&
                            styles.selectedCustomizationOptionText
                          ]}>
                            {option.name}
                            {option.price > 0 && ` (+$${option.price.toFixed(2)})`}
                          </Text>
                          {selectedCustomizations[customization.name]?.name === option.name && (
                            <AntDesign name="check" size={16} color="#FF6B00" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                <View style={styles.modalDivider} />

                <View style={styles.quantitySection}>
                  <Text style={styles.quantityTitle}>Quantity</Text>
                  <View style={styles.quantitySelector}>
                    <TouchableOpacity
                      style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
                      disabled={quantity <= 1}
                      onPress={() => setQuantity(prev => Math.max(1, prev - 1))}
                    >
                      <AntDesign
                        name="minus"
                        size={16}
                        color={quantity <= 1 ? "#CCC" : "#333"}
                      />
                    </TouchableOpacity>

                    <Text style={styles.quantityText}>{quantity}</Text>

                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => setQuantity(prev => prev + 1)}
                    >
                      <AntDesign name="plus" size={16} color="#333" />
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>

              <TouchableOpacity
                style={styles.addToCartButton}
                onPress={handleAddToCart}
                disabled={!selectedItemDetail?.available}
              >
                <Text style={styles.addToCartText}>
                  {selectedItemDetail?.available
                    ? `Add to Cart - $${calculateTotalPrice().toFixed(2)}`
                    : 'Currently Unavailable'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
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
    paddingTop: 50,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 10,
    marginRight: 10,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
  },
  filterButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterOptions: {
    backgroundColor: '#FFF',
    paddingHorizontal: 20,
    paddingVertical: 15,
    paddingBottom: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  vegFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#DDD',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  checkboxChecked: {
    backgroundColor: '#4CAF50',
    borderColor: '#4CAF50',
  },
  vegFilterText: {
    fontSize: 14,
    color: '#666666',
  },
  sortButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
  },
  sortButtonText: {
    fontSize: 14,
    color: '#666666',
  },
  sortOptionsContainer: {
    marginTop: 8,
    backgroundColor: '#FFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEE',
    overflow: 'hidden',
  },
  sortOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
  },
  sortOptionText: {
    fontSize: 14,
    color: '#666666',
  },
  activeSortOption: {
    color: '#FF6B00',
    fontWeight: '500',
  },
  categoriesList: {
    height: 90,
    maxHeight: 90,
    minHeight: 90,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  categoriesListContent: {
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
    height: 70,
    alignItems: 'center',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  statusText: {
    color: '#666666',
    fontSize: 12,
  },
  activeFilter: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE0CC',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 16,
    marginLeft: 8,
  },
  activeFilterText: {
    color: '#FF6B00',
    fontSize: 12,
    marginRight: 5,
  },
  categoryItem: {
    width: 70,
    height: 70,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginHorizontal: 6,
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 12,
    backgroundColor: '#F5F5F5',
  },
  activeCategoryItem: {
    backgroundColor: '#FFE0CC',
  },
  categoryIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  categoryName: {
    fontSize: 12,
    color: '#666666',
    textAlign: 'center',
    width: '100%',
    overflow: 'hidden',
  },
  activeCategoryText: {
    color: '#FF6B00',
    fontWeight: '500',
  },
  menuList: {
    padding: 15,
  },
  menuItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  menuItemImage: {
    width: 100,
    height: 100,
    resizeMode: 'cover',
  },
  menuItemContent: {
    flex: 1,
    padding: 12,
  },
  menuItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    flex: 1,
  },
  unavailableItem: {
    color: '#999',
  },
  vegBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  vegBadgeText: {
    color: '#FFF',
    fontSize: 10,
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
    fontSize: 10,
    fontWeight: '600',
  },
  menuItemDescription: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
  },
  menuItemFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  menuItemPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF6B00',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 16,
  },
  rating: {
    marginLeft: 4,
    fontSize: 12,
    color: '#777',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  addButtonDisabled: {
    backgroundColor: '#CCC',
  },
  addButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 3,
  },
  skeletonItem: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  skeletonImage: {
    width: 100,
    height: 100,
    backgroundColor: '#F5F5F5',
  },
  skeletonContent: {
    flex: 1,
    padding: 12,
  },
  skeletonTitle: {
    height: 18,
    width: '60%',
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginBottom: 8,
  },
  skeletonDescription: {
    height: 14,
    width: '90%',
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    marginBottom: 12,
  },
  skeletonFooter: {
    height: 16,
    width: '80%',
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
  },
  emptyList: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 30,
  },
  emptyListText: {
    fontSize: 16,
    color: '#777',
    marginBottom: 10,
  },
  retryButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
    paddingBottom: 20,
  },
  closeButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
    backgroundColor: 'rgba(255,255,255,0.8)',
    borderRadius: 20,
    padding: 5,
  },
  modalImage: {
    width: '100%',
    height: 200,
    resizeMode: 'cover',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  modalItemName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  modalItemDescription: {
    fontSize: 14,
    color: '#666666',
    paddingHorizontal: 20,
    paddingVertical: 10,
    lineHeight: 20,
  },
  modalDivider: {
    height: 1,
    backgroundColor: '#EEE',
    marginVertical: 15,
    marginHorizontal: 20,
  },
  sizeSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
    marginTop: 10
  },
  sizeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  sizeOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  sizeOption: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    width: '30%',
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  selectedSizeOption: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFE0CC',
  },
  sizeOptionText: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
    marginBottom: 4,
  },
  selectedSizeOptionText: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  sizePriceText: {
    fontSize: 12,
    color: '#888888',
  },
  selectedSizePriceText: {
    color: '#FF6B00',
  },
  customizationSection: {
    paddingHorizontal: 20,
    marginBottom: 15,
  },
  customizationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  customizationOptions: {
    flexDirection: 'column',
  },
  customizationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    marginBottom: 8,
  },
  selectedCustomizationOption: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFE0CC',
  },
  customizationOptionText: {
    fontSize: 14,
    color: '#666666',
  },
  selectedCustomizationOptionText: {
    color: '#FF6B00',
    fontWeight: '500',
  },
  quantitySection: {
    paddingHorizontal: 20,
    marginBottom: 80,
  },
  quantityTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 10,
  },
  quantitySelector: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    borderColor: '#EEEEEE',
    backgroundColor: '#F5F5F5',
  },
  quantityText: {
    fontSize: 16,
    fontWeight: '600',
    marginHorizontal: 15,
    color: '#1F2937',
  },
  addToCartButton: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#FF6B00',
    paddingVertical: 15,
    borderRadius: 10,
    alignItems: 'center',
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  addToCartText: {
    color: '#FFF',
    fontSize: 16,
    fontWeight: '600',
  },
  cartIconContainer: {
    position: 'relative',
    padding: 5,
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
    color: '#FFFFFF',
    fontSize: 10,
    fontWeight: 'bold',
  }
});

export default MenuScreen;