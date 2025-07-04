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
  RefreshControl,
  Switch,
  Alert
} from 'react-native';
import { AntDesign, MaterialIcons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { API_URL } from '@/config';
import { getSocket, onSocketEvent, offSocketEvent } from '@/src/utils/socket';

// SizePricing interface for add-ons with size-specific pricing
interface SizePricing {
  size: string;
  price: number;
}

// AddOn interface to match our backend model
interface AddOn {
  id: string;
  name: string;
  price: number;
  available: boolean;
  isDefault: boolean;
  hasSizeSpecificPricing?: boolean;
  sizePricing?: SizePricing[];
}

// AddOnGroup interface to match our backend model
interface AddOnGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  required: boolean;
  addOns: AddOn[];
}

// Legacy support for existing CustomizationOption interface
interface CustomizationOption {
  name: string;
  price: number;
}

// Legacy support for existing Customization interface
interface Customization {
  name: string;
  options: CustomizationOption[];
}

interface SizeVariation {
  size: string;
  price: number;
  available: boolean;
}

// Updated MenuItem interface to support new customization model
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
  // Legacy customizations field
  customizations?: Customization[];
  // New customization fields
  hasAddOns?: boolean;
  addOnGroups?: AddOnGroup[];
  size?: string;
  sizeVariations?: SizeVariation[];
  hasMultipleSizes?: boolean;
}

interface Category {
  id: number;
  name: string;
  icon: string;
}

// Selected add-on tracking interface
interface SelectedAddOn {
  id: string;
  name: string;
  price: number;
  hasSizeSpecificPricing?: boolean;
  sizePricing?: SizePricing[];
}

// Interface to track selected add-ons by group
interface SelectedAddOnsByGroup {
  [groupId: string]: SelectedAddOn[];
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
  
  // Legacy customizations state
  const [selectedCustomizations, setSelectedCustomizations] = useState<Record<string, CustomizationOption>>({});
  
  // New add-on customizations state
  const [selectedAddOns, setSelectedAddOns] = useState<SelectedAddOnsByGroup>({});
  
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [validationErrors, setValidationErrors] = useState<{[groupId: string]: string}>({});
  
  // Business status state
  const [businessStatus, setBusinessStatus] = useState<{
    isOpen: boolean;
    reason: string;
    manualOverride: boolean;
  } | null>(null);

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

  const onRefresh = () => {
    setRefreshing(true);
    fetchMenuItems();
  };

  useEffect(() => {
    fetchMenuItems();
    fetchBusinessStatus();

    // Listen for live business status updates
    const socket = getSocket();
    if (socket) {
      const handleStatusChange = (status: { isOpen: boolean; reason: string; manualOverride: boolean }) => {
        setBusinessStatus(status);
      };

      const handleMenuItemUpdate = (updateData: {
        itemId: string;
        available?: boolean;
        sizeVariations?: any[];
        addOnGroups?: any[];
        type: 'item' | 'size' | 'addon';
      }) => {
        console.log('✅ Menu item updated received:', updateData);
        setMenuItems(prevItems => 
          prevItems.map(item => {
            if (item._id === updateData.itemId) {
              const updatedItem = { ...item };
              
              // Update based on the type of change
              if (updateData.type === 'item' && updateData.available !== undefined) {
                updatedItem.available = updateData.available;
              } else if (updateData.type === 'size' && updateData.sizeVariations) {
                updatedItem.sizeVariations = updateData.sizeVariations;
              } else if (updateData.type === 'addon' && updateData.addOnGroups) {
                updatedItem.addOnGroups = updateData.addOnGroups;
              }
              
              return updatedItem;
            }
            return item;
          })
        );
      };

      onSocketEvent('businessStatusChanged', handleStatusChange);
      onSocketEvent('menuItemUpdated', handleMenuItemUpdate);

      // Cleanup listeners on unmount
      return () => {
        offSocketEvent('businessStatusChanged', handleStatusChange);
        offSocketEvent('menuItemUpdated', handleMenuItemUpdate);
      };
    }
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

    // Remove this line to show unavailable items too
    // result = result.filter(item => item.available);

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

  // Initialize add-ons when opening item detail modal
  const openItemDetail = (item: MenuItem) => {
    setSelectedItemDetail(item);
    setValidationErrors({});

    // Check if this item is already in the cart
    const cartItemsForThisProduct = cartItems.filter(cartItem => cartItem.id === item._id);
    
    // If we have at least one of this item in the cart, use the most recent configuration
    if (cartItemsForThisProduct.length > 0) {
      // Sort by most recently added (assuming cartItems are ordered by addition time)
      // If you don't have a timestamp, this will just use the last one in the array
      const mostRecentCartItem = cartItemsForThisProduct[cartItemsForThisProduct.length - 1];
      
      // Set size from cart item
      setSelectedSize(mostRecentCartItem.size || 'Medium');
      
      // Set quantity from cart item
      setQuantity(mostRecentCartItem.quantity);
      
      // Set legacy customizations from cart item
      if (mostRecentCartItem.customizations) {
        setSelectedCustomizations(mostRecentCartItem.customizations);
      } else {
        // Initialize with default customizations if not in cart
        const initialCustomizations: Record<string, CustomizationOption> = {};
        if (item.customizations) {
          item.customizations.forEach(customization => {
            if (customization.options.length > 0) {
              initialCustomizations[customization.name] = customization.options[0];
            }
          });
        }
        setSelectedCustomizations(initialCustomizations);
      }
      
      // Set add-ons from cart item
      if (mostRecentCartItem.addOns && mostRecentCartItem.addOns.length > 0) {
        // Convert the flat list of add-ons back to grouped structure
        const groupedAddOns: SelectedAddOnsByGroup = {};
        
        if (item.addOnGroups) {
          // Initialize empty groups
          item.addOnGroups.forEach(group => {
            groupedAddOns[group.id] = [];
          });
          
          // Populate groups with add-ons from cart
          mostRecentCartItem.addOns.forEach(cartAddOn => {
            // Find which group this add-on belongs to
            item.addOnGroups?.forEach(group => {
              const addOnExistsInGroup = group.addOns.some(groupAddOn => 
                groupAddOn.id === cartAddOn.id
              );
              
              if (addOnExistsInGroup) {
                if (!groupedAddOns[group.id]) {
                  groupedAddOns[group.id] = [];
                }
                groupedAddOns[group.id].push(cartAddOn);
              }
            });
          });
        }
        
        setSelectedAddOns(groupedAddOns);
      } else {
        // Initialize with default add-ons if not in cart
        const initialSelectedAddOns: SelectedAddOnsByGroup = {};
        
        if (item.hasAddOns && item.addOnGroups) {
          item.addOnGroups.forEach(group => {
            // For each group, select default options or required minimums
            const defaultAddOns = group.addOns
              .filter(addOn => addOn.isDefault && addOn.available)
              .map(addOn => ({
                id: addOn.id,
                name: addOn.name,
                price: getAddOnPrice(addOn, mostRecentCartItem.size || 'Medium'),
                hasSizeSpecificPricing: addOn.hasSizeSpecificPricing,
                sizePricing: addOn.sizePricing
              }));
              
            if (defaultAddOns.length > 0) {
              initialSelectedAddOns[group.id] = defaultAddOns;
            } else if (group.required && group.minSelection > 0) {
              // If required with min selection, select the first available option
              const availableAddOns = group.addOns.filter(addOn => addOn.available);
              if (availableAddOns.length > 0) {
                initialSelectedAddOns[group.id] = [{
                  id: availableAddOns[0].id,
                  name: availableAddOns[0].name,
                  price: getAddOnPrice(availableAddOns[0], mostRecentCartItem.size || 'Medium'),
                  hasSizeSpecificPricing: availableAddOns[0].hasSizeSpecificPricing,
                  sizePricing: availableAddOns[0].sizePricing
                }];
              }
            } else {
              initialSelectedAddOns[group.id] = [];
            }
          });
        }
        
        setSelectedAddOns(initialSelectedAddOns);
      }
    } else {
      // If item is not in cart, initialize with defaults
      
      // Set default size
      let initialSize = 'Medium';
      if (item.sizeVariations && item.sizeVariations.length > 0) {
        initialSize = item.sizeVariations.find(v => v.available)?.size || item.sizeVariations[0].size;
      } else {
        initialSize = item.size || 'Medium';
      }
      setSelectedSize(initialSize);
      
      // Reset quantity
      setQuantity(1);
      
      // Setup initial customizations (legacy support)
      const initialCustomizations: Record<string, CustomizationOption> = {};
      if (item.customizations) {
        item.customizations.forEach(customization => {
          if (customization.options.length > 0) {
            initialCustomizations[customization.name] = customization.options[0];
          }
        });
      }
      setSelectedCustomizations(initialCustomizations);
      
      // Initialize selected add-ons with default selections
      const initialSelectedAddOns: SelectedAddOnsByGroup = {};
      
      if (item.hasAddOns && item.addOnGroups) {
        item.addOnGroups.forEach(group => {
          // For each group, select default options or required minimums
          const defaultAddOns = group.addOns
            .filter(addOn => addOn.isDefault && addOn.available)
            .map(addOn => ({
              id: addOn.id,
              name: addOn.name,
              price: getAddOnPrice(addOn, initialSize),
              hasSizeSpecificPricing: addOn.hasSizeSpecificPricing,
              sizePricing: addOn.sizePricing
            }));
            
          if (defaultAddOns.length > 0) {
            initialSelectedAddOns[group.id] = defaultAddOns;
          } else if (group.required && group.minSelection > 0) {
            // If required with min selection, select the first available option
            const availableAddOns = group.addOns.filter(addOn => addOn.available);
            if (availableAddOns.length > 0) {
              initialSelectedAddOns[group.id] = [{
                id: availableAddOns[0].id,
                name: availableAddOns[0].name,
                price: getAddOnPrice(availableAddOns[0], initialSize),
                hasSizeSpecificPricing: availableAddOns[0].hasSizeSpecificPricing,
                sizePricing: availableAddOns[0].sizePricing
              }];
            }
          } else {
            initialSelectedAddOns[group.id] = [];
          }
        });
      }
      
      setSelectedAddOns(initialSelectedAddOns);
    }
  };

  const closeItemDetail = () => {
    setSelectedItemDetail(null);
    setSelectedAddOns({});
    setValidationErrors({});
  };
  
  // Helper to get the correct price for an add-on based on size
  const getAddOnPrice = (addOn: AddOn, size: string): number => {
    if (addOn.hasSizeSpecificPricing && addOn.sizePricing && addOn.sizePricing.length > 0) {
      const sizePrice = addOn.sizePricing.find(sp => sp.size === size);
      if (sizePrice) {
        return sizePrice.price;
      }
    }
    return addOn.price;
  };

  // Toggle selection for an add-on in a group
  const toggleAddOn = (groupId: string, addOn: AddOn) => {
    const group = selectedItemDetail?.addOnGroups?.find(g => g.id === groupId);
    if (!group) return;

    setSelectedAddOns(prevSelected => {
      // Get currently selected add-ons for this group
      const currentSelections = prevSelected[groupId] || [];
      
      // Check if this add-on is already selected
      const isSelected = currentSelections.some(item => item.id === addOn.id);
      
      let updatedSelections;
      
      if (isSelected) {
        // If it's already selected, remove it (unless it would violate min selection)
        if (group.required && currentSelections.length <= group.minSelection) {
          // Don't remove if it would violate the min selection requirement
          setValidationErrors(prev => ({
            ...prev,
            [groupId]: `You must select at least ${group.minSelection} option(s)`
          }));
          return prevSelected;
        }
        
        // Remove the add-on
        updatedSelections = currentSelections.filter(item => item.id !== addOn.id);
        
        // Clear any validation error for this group
        setValidationErrors(prev => {
          const newErrors = {...prev};
          delete newErrors[groupId];
          return newErrors;
        });
      } else {
        // If not selected, add it (unless it would exceed max selection)
        if (currentSelections.length >= group.maxSelection) {
          // Multiple selection groups: replace or show error
          if (group.maxSelection === 1) {
            // For single-selection groups, replace the current selection
            updatedSelections = [{
              id: addOn.id,
              name: addOn.name,
              price: getAddOnPrice(addOn, selectedSize),
              hasSizeSpecificPricing: addOn.hasSizeSpecificPricing,
              sizePricing: addOn.sizePricing
            }];
          } else {
            // For multiple selection groups, show an error
            setValidationErrors(prev => ({
              ...prev,
              [groupId]: `You can only select up to ${group.maxSelection} option(s)`
            }));
            return prevSelected;
          }
        } else {
          // Add the new selection
          updatedSelections = [
            ...currentSelections,
            {
              id: addOn.id,
              name: addOn.name,
              price: getAddOnPrice(addOn, selectedSize),
              hasSizeSpecificPricing: addOn.hasSizeSpecificPricing,
              sizePricing: addOn.sizePricing
            }
          ];
        }
        
        // Clear any validation error for this group
        setValidationErrors(prev => {
          const newErrors = {...prev};
          delete newErrors[groupId];
          return newErrors;
        });
      }
      
      return {
        ...prevSelected,
        [groupId]: updatedSelections
      };
    });
  };

  // Update add-on prices when size changes
  useEffect(() => {
    if (!selectedItemDetail?.addOnGroups || !selectedSize) return;
    
    setSelectedAddOns(prevSelected => {
      const updatedSelections: SelectedAddOnsByGroup = {};
      
      // For each group
      Object.keys(prevSelected).forEach(groupId => {
        const group = selectedItemDetail.addOnGroups?.find(g => g.id === groupId);
        if (!group) return;
        
        // For each selected add-on in the group
        updatedSelections[groupId] = prevSelected[groupId].map(selectedAddOn => {
          // Find the original add-on to get access to its pricing data
          const originalAddOn = group.addOns.find(addOn => addOn.id === selectedAddOn.id);
          
          if (originalAddOn) {
            return {
              ...selectedAddOn,
              price: getAddOnPrice(originalAddOn, selectedSize)
            };
          }
          return selectedAddOn;
        });
      });
      
      return updatedSelections;
    });
  }, [selectedSize, selectedItemDetail]);

  // Validate selections before adding to cart
  const validateSelections = (): boolean => {
    if (!selectedItemDetail?.addOnGroups) return true;
    
    let isValid = true;
    const errors: {[groupId: string]: string} = {};
    
    selectedItemDetail.addOnGroups.forEach(group => {
      const selected = selectedAddOns[group.id] || [];
      
      if (group.required && selected.length < group.minSelection) {
        errors[group.id] = `Please select at least ${group.minSelection} option(s)`;
        isValid = false;
      }
    });
    
    setValidationErrors(errors);
    return isValid;
  };

  const handleAddToCart = () => {
    if (!selectedItemDetail) return;
    
    // Check if business is open before allowing order
    if (businessStatus && !businessStatus.isOpen) {
      Alert.alert(
        "Restaurant Closed",
        `Sorry, we're currently closed. ${businessStatus.reason || 'Please check our operating hours.'}`,
        [{ text: "OK", style: "default" }]
      );
      return;
    }
    
    // Validate customization selections
    if (!validateSelections()) {
      return;
    }

    let basePrice = selectedItemDetail.price;
    if (selectedItemDetail.sizeVariations && selectedItemDetail.sizeVariations.length > 0) {
      const selectedVariation = selectedItemDetail.sizeVariations.find(v => v.size === selectedSize);
      if (selectedVariation) {
        basePrice = selectedVariation.price;
      }
    }

    // Build add-ons array with selected options
    const selectedAddOnsArray = Object.values(selectedAddOns).flat();

    const cartItem = {
      id: selectedItemDetail._id,
      name: selectedItemDetail.name,
      price: basePrice,
      image: selectedItemDetail.image,
      quantity: quantity,
      size: selectedSize,
      foodType: selectedItemDetail.foodType,
      // Include both legacy customizations and new add-ons
      customizations: selectedCustomizations,
      addOns: selectedAddOnsArray
    };

    dispatch(addToCart(cartItem));
    closeItemDetail();
  };

  // Legacy support for old customization system
  const updateCustomization = (category: string, option: CustomizationOption) => {
    setSelectedCustomizations({
      ...selectedCustomizations,
      [category]: option
    });
  };

  const calculateTotalPrice = () => {
    if (!selectedItemDetail) return 0;

    // Base price based on size
    let basePrice = selectedItemDetail.price;
    if (selectedItemDetail.sizeVariations && selectedItemDetail.sizeVariations.length > 0) {
      const selectedVariation = selectedItemDetail.sizeVariations.find(v => v.size === selectedSize);
      if (selectedVariation) {
        basePrice = selectedVariation.price;
      }
    }

    let totalPrice = basePrice;
    
    // Add legacy customization prices
    Object.values(selectedCustomizations).forEach(option => {
      totalPrice += option.price;
    });
    
    // Add new add-on prices
    Object.values(selectedAddOns).forEach(groupAddOns => {
      groupAddOns.forEach(addOn => {
        totalPrice += addOn.price;
      });
    });

    return totalPrice * quantity;
  };

  // Helper function to get the correct display price for menu items
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
        style={[styles.menuItem, !item.available && styles.unavailableMenuItem]}
        onPress={() => item.available ? openItemDetail(item) : null}
        disabled={!item.available}
      >
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.image }} style={[styles.menuItemImage, !item.available && styles.unavailableImage]} />
          {!item.available && (
            <View style={styles.outOfStockOverlay}>
              <Text style={styles.outOfStockText}>OUT OF STOCK</Text>
            </View>
          )}
        </View>
        <View style={styles.menuItemContent}>
          <View style={styles.menuItemHeader}>
            <Text style={[styles.menuItemName, !item.available && styles.unavailableItem]}>
              {item.name}
            </Text>
            {item.foodType !== 'Not Applicable' && (
              item.foodType === 'Veg' ? (
                <View style={[styles.vegBadge, !item.available && styles.disabledBadge]}>
                  <Text style={[styles.vegBadgeText, !item.available && styles.disabledBadgeText]}>VEG</Text>
                </View>
              ) : (
                <View style={[styles.nonVegBadge, !item.available && styles.disabledBadge]}>
                  <Text style={[styles.nonVegBadgeText, !item.available && styles.disabledBadgeText]}>NON-VEG</Text>
                </View>
              )
            )}
          </View>
          <Text style={[styles.menuItemDescription, !item.available && styles.unavailableText]} numberOfLines={2}>
            {item.description}
          </Text>
          <View style={styles.menuItemFooter}>
            <Text style={[styles.menuItemPrice, !item.available && styles.unavailablePrice]}>
              ₹{getDisplayPrice(item).toFixed(2)}
            </Text>
            {item.available ? (
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => openItemDetail(item)}
              >
                <Text style={styles.addButtonText}>Add</Text>
                <AntDesign name="plus" size={12} color="#FFF" />
              </TouchableOpacity>
            ) : (
              <View style={styles.unavailableButton}>
                <Text style={styles.unavailableButtonText}>Not Available</Text>
              </View>
            )}
          </View>
        </View>
      </TouchableOpacity>
    );
  };
  
  // Render an add-on group in the modal
  const renderAddOnGroup = (group: AddOnGroup) => {
    const selectedInGroup = selectedAddOns[group.id] || [];
    const hasError = validationErrors[group.id];
    
    return (
      <View key={group.id} style={styles.customizationSection}>
        <View style={styles.customizationHeader}>
          <Text style={styles.customizationTitle}>{group.name}</Text>
          <Text style={styles.customizationLimits}>
            {group.required ? 'Required' : 'Optional'} • 
            {group.minSelection === group.maxSelection 
              ? ` Select ${group.minSelection}` 
              : ` Select ${group.minSelection}-${group.maxSelection}`}
          </Text>
        </View>
        
        {hasError && (
          <Text style={styles.errorText}>{hasError}</Text>
        )}

        <View style={styles.customizationOptions}>
          {group.addOns.filter(addOn => addOn.available).map((addOn) => {
            const isSelected = selectedInGroup.some(item => item.id === addOn.id);
            const addOnPrice = getAddOnPrice(addOn, selectedSize);
            
            return (
              <TouchableOpacity
                key={addOn.id}
                style={[
                  styles.customizationOption,
                  isSelected && styles.selectedCustomizationOption
                ]}
                onPress={() => toggleAddOn(group.id, addOn)}
              >
                <View style={styles.customizationOptionContent}>
                  <Text style={[
                    styles.customizationOptionText,
                    isSelected && styles.selectedCustomizationOptionText
                  ]}>
                    {addOn.name}
                  </Text>
                  
                  {addOn.hasSizeSpecificPricing && addOn.sizePricing ? (
                    <Text style={styles.customizationPrice}>
                      {addOnPrice > 0 ? `+₹${addOnPrice.toFixed(2)}` : 'Included'}
                    </Text>
                  ) : (
                    <Text style={styles.customizationPrice}>
                      {addOnPrice > 0 ? `+₹${addOnPrice.toFixed(2)}` : 'Included'}
                    </Text>
                  )}
                </View>
                
                {group.maxSelection === 1 ? (
                  <View style={[styles.radioButton, isSelected && styles.radioButtonSelected]}>
                    {isSelected && <View style={styles.radioButtonInner} />}
                  </View>
                ) : (
                  <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                    {isSelected && <AntDesign name="check" size={12} color="#FFF" />}
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
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
          onPress={() => router.push('../cart')}
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
                              ₹{variation.price.toFixed(2)}
                            </Text>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                )}

                {/* Legacy Customizations (if any) */}
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
                            {option.price > 0 && ` (+₹${option.price.toFixed(2)})`}
                          </Text>
                          {selectedCustomizations[customization.name]?.name === option.name && (
                            <AntDesign name="check" size={16} color="#FF6B00" />
                          )}
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                ))}

                {/* New Add-on Customizations */}
                {selectedItemDetail.hasAddOns && selectedItemDetail.addOnGroups && 
                  selectedItemDetail.addOnGroups.length > 0 && (
                    <>
                      <View style={styles.modalDivider} />
                      <Text style={styles.customizationSectionTitle}>Customizations</Text>
                      {selectedItemDetail.addOnGroups.map(group => renderAddOnGroup(group))}
                    </>
                )}

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
                style={[
                  styles.addToCartButton,
                  (!selectedItemDetail?.available || (businessStatus && !businessStatus.isOpen)) && styles.addToCartButtonDisabled
                ]}
                onPress={handleAddToCart}
                disabled={!selectedItemDetail?.available || !!(businessStatus && !businessStatus.isOpen)}
              >
                <Text style={styles.addToCartText}>
                  {businessStatus && !businessStatus.isOpen
                    ? 'Restaurant Closed'
                    : selectedItemDetail?.available
                    ? `Add to Cart - ₹${calculateTotalPrice().toFixed(2)}`
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
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#DDD',
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioButtonSelected: {
    borderColor: '#FF6B00',
  },
  radioButtonInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#FF6B00',
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
  unavailableMenuItem: {
    opacity: 0.6,
  },
  imageContainer: {
    position: 'relative',
  },
  unavailableImage: {
    opacity: 0.5,
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  outOfStockText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  disabledBadge: {
    backgroundColor: '#999',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  disabledBadgeText: {
    color: '#FFF',
    fontSize: 10,
    fontWeight: '600',
  },
  unavailableText: {
    color: '#999',
  },
  unavailablePrice: {
    color: '#999',
  },
  unavailableButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#CCC',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 6,
  },
  unavailableButtonText: {
    color: '#666',
    fontSize: 12,
    fontWeight: '600',
    marginRight: 3,
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
    marginBottom: 20,
  },
  customizationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 5,
  },
  customizationSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginLeft: 20,
    marginBottom: 10,
  },
  customizationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  customizationLimits: {
    fontSize: 12,
    color: '#666666',
    fontStyle: 'italic',
  },
  errorText: {
    fontSize: 12,
    color: '#F44336',
    marginBottom: 8,
  },
  customizationOptions: {
    flexDirection: 'column',
    marginTop: 8,
  },
  customizationOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderWidth: 1,
    borderColor: '#EEE',
    borderRadius: 8,
    marginBottom: 8,
  },
  customizationOptionContent: {
    flex: 1,
    flexDirection: 'column',
  },
  selectedCustomizationOption: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFE0CC',
  },
  customizationOptionText: {
    fontSize: 14,
    color: '#333333', 
    marginBottom: 2,
  },
  customizationPrice: {
    fontSize: 12,
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
  addToCartButtonDisabled: {
    backgroundColor: '#CCCCCC',
    elevation: 0,
    shadowOpacity: 0,
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