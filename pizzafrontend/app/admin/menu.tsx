import React, { useState, useEffect } from 'react';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  Switch,
  FlatList,
  Alert,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import {
  Search,
  Plus,
  Edit,
  Trash2,
  X,
  ChevronDown,
  Upload,
  Save,
  Filter,
  Pizza,
  Donut,
  Sandwich,
  Coffee,
  Utensils,
  AlertCircle,
  RefreshCw,
  Star,
  Soup,
  Check,
  Layers,
  ChevronRight,
  Minus
} from 'lucide-react-native';
import { API_URL } from '@/config';
import * as ImagePicker from 'expo-image-picker';
import { CLOUDINARY_CONFIG } from '@/config';

// Define types
type Category = 'Pizza' | 'Burger' | 'Grilled Sandwich' | 'Special Combo' | 'Pasta' | 'Noodles' | 'Snacks' | 'Milkshake' | 'Cold Drink' | 'Rice Item' | 'Sweets' | 'Sides';
type FoodType = 'Veg' | 'Non-Veg' | 'Not Applicable';
type Size = 'Small' | 'Medium' | 'Large' | 'Not Applicable';

interface SizeVariation {
  size: Size;
  price: number;
  available: boolean;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  available: boolean;
  isDefault: boolean; // For options like "Without Onion" that don't add price
}

interface AddOnGroup {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number;
  required: boolean;
  addOns: AddOn[];
}

interface MenuItem {
  _id: string;
  name: string;
  description: string;
  price: number;
  category: Category;
  image: string;
  available: boolean;
  popular: boolean;
  foodType: FoodType;
  size: Size;
  sizeVariations: SizeVariation[];
  hasMultipleSizes: boolean;
  rating: number;
  ratingCount: number;
  hasAddOns: boolean;
  addOnGroups: AddOnGroup[];
}

const ManageMenu = () => {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<'All' | Category>('All');
  const [onlyVeg, setOnlyVeg] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<MenuItem | null>(null);
  const [filterMenuOpen, setFilterMenuOpen] = useState(false);
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [foodTypeMenuOpen, setFoodTypeMenuOpen] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [sizeVariations, setSizeVariations] = useState<SizeVariation[]>([]);
  const [newSize, setNewSize] = useState<Size>('Small');
  const [newSizePrice, setNewSizePrice] = useState<string>('');
  const [addOnGroups, setAddOnGroups] = useState<AddOnGroup[]>([]);
  const [showAddOnGroupModal, setShowAddOnGroupModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [currentAddOnGroup, setCurrentAddOnGroup] = useState<AddOnGroup | null>(null);
  const [newAddOnGroup, setNewAddOnGroup] = useState({
    name: '',
    minSelection: 0,
    maxSelection: 1,
    required: false
  });
  const [newAddOn, setNewAddOn] = useState({
    name: '',
    price: '',
    available: true,
    isDefault: false
  });
  const token = useSelector((state: RootState) => state.auth.token);
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form state for add/edit
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Pizza' as Category,
    image: 'https://via.placeholder.com/100',
    available: true,
    popular: false,
    foodType: 'Veg' as FoodType,
    sizeType: 'single' as 'single' | 'multiple',
    size: 'Medium' as Size,
    sizeVariations: [] as SizeVariation[],
    hasMultipleSizes: false,
    hasAddOns: false,
    addOnGroups: [] as AddOnGroup[],
    rating: '',
    ratingCount: 0
  });

  const categories: ('All' | Category)[] = ['All', 'Pizza', 'Burger', 'Grilled Sandwich', 'Special Combo', 'Pasta', 'Noodles', 'Snacks', 'Milkshake', 'Cold Drink', 'Rice Item', 'Sweets', 'Sides'];
  const sizes: Size[] = ['Small', 'Medium', 'Large', 'Not Applicable'];

  const categoriesWithAddOns: Category[] = ['Pizza', 'Burger', 'Grilled Sandwich', 'Special Combo', 'Pasta'];

  // Helper functions for add-ons
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addAddOnGroup = () => {
    if (!newAddOnGroup.name) {
      Alert.alert('Error', 'Please enter a name for the add-on group');
      return;
    }

    const group: AddOnGroup = {
      id: generateId(),
      name: newAddOnGroup.name,
      minSelection: newAddOnGroup.minSelection,
      maxSelection: newAddOnGroup.maxSelection,
      required: newAddOnGroup.required,
      addOns: []
    };

    setAddOnGroups([...addOnGroups, group]);
    setNewAddOnGroup({
      name: '',
      minSelection: 0,
      maxSelection: 1,
      required: false
    });
    setShowAddOnGroupModal(false);
  };

  const removeAddOnGroup = (id: string) => {
    setAddOnGroups(addOnGroups.filter(group => group.id !== id));
  };

  const addAddOn = () => {
    if (!newAddOn.name) {
      Alert.alert('Error', 'Please enter a name for the add-on');
      return;
    }

    if (!newAddOn.isDefault && !newAddOn.price) {
      Alert.alert('Error', 'Please enter a price for the add-on');
      return;
    }

    const addOn: AddOn = {
      id: generateId(),
      name: newAddOn.name,
      price: newAddOn.isDefault ? 0 : parseFloat(newAddOn.price),
      available: newAddOn.available,
      isDefault: newAddOn.isDefault
    };

    if (currentAddOnGroup) {
      const updatedGroups = addOnGroups.map(group => {
        if (group.id === currentAddOnGroup.id) {
          return {
            ...group,
            addOns: [...group.addOns, addOn]
          };
        }
        return group;
      });
      setAddOnGroups(updatedGroups);
    }

    setNewAddOn({
      name: '',
      price: '',
      available: true,
      isDefault: false
    });
    setShowAddOnModal(false);
  };

  const removeAddOn = (groupId: string, addOnId: string) => {
    const updatedGroups = addOnGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          addOns: group.addOns.filter(addOn => addOn.id !== addOnId)
        };
      }
      return group;
    });
    setAddOnGroups(updatedGroups);
  };

  const toggleAddOnAvailability = (groupId: string, addOnId: string) => {
    const updatedGroups = addOnGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          addOns: group.addOns.map(addOn => {
            if (addOn.id === addOnId) {
              return {
                ...addOn,
                available: !addOn.available
              };
            }
            return addOn;
          })
        };
      }
      return group;
    });
    setAddOnGroups(updatedGroups);
  };

  const toggleAddOnGroupRequired = (groupId: string) => {
    const updatedGroups = addOnGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          required: !group.required
        };
      }
      return group;
    });
    setAddOnGroups(updatedGroups);
  };

  // Rest of your existing functions (apiRequest, fetchMenuItems, etc.) remain the same
  // Just make sure to include addOnGroups in your form data when saving

  const apiRequest = async (url: string, method: string, body?: any) => {
    const headers = {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    };

    const config = {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined,
    };

    try {
      const response = await fetch(`${API_URL}${url}`, config);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  };

  const fetchMenuItems = async () => {
    try {
      setLoading(true);
      let url = '/api/menu';
      const params = new URLSearchParams();

      if (selectedCategory !== 'All') {
        params.append('category', selectedCategory);
      }

      if (onlyVeg) {
        params.append('foodType', 'Veg');
      }

      if (params.toString()) {
        url += `?${params.toString()}`;
      }

      const data = await apiRequest(url, 'GET');

      if (Array.isArray(data)) {
        setMenuItems(data);
      } else {
        console.error('Received non-array data:', data);
        setMenuItems([]);
      }
    } catch (error) {
      console.error('Error fetching menu items:', error);
      Alert.alert('Error', 'Failed to fetch menu items. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMenuItems();
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'You need to grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await uploadImageToCloudinary({
          uri: selectedImage.uri,
          type: 'image/jpeg',
          fileName: selectedImage.uri.split('/').pop() || 'upload.jpg',
          width: selectedImage.width,
          height: selectedImage.height,
        });
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadImageToCloudinary = async (image: any) => {
    if (!image.uri) {
      Alert.alert('Error', 'No image found to upload');
      return;
    }

    setImageUploading(true);
    setUploadProgress(0);

    try {
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: image.fileName || 'upload.jpg',
      } as any);
      cloudinaryFormData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
      if (CLOUDINARY_CONFIG.folder) {
        cloudinaryFormData.append('folder', CLOUDINARY_CONFIG.folder);
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: cloudinaryFormData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary error response:', errorText);
        throw new Error(`Upload failed with status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();
      setFormData({
        ...formData,
        image: data.secure_url,
      });
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload image to Cloudinary. Please check your configuration and try again.');
    } finally {
      setImageUploading(false);
    }
  };

  useEffect(() => {
    fetchMenuItems();
  }, [selectedCategory, onlyVeg]);

  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case 'Pizza': return <Pizza size={16} color="#FF6B00" />;
      case 'Burger': return <Donut size={16} color="#FF6B00" />;
      case 'Grilled Sandwich': return <Sandwich size={16} color="#FF6B00" />;
      case 'Special Combo': return <Utensils size={16} color="#FF6B00" />;
      case 'Pasta':
      case 'Noodles': return <Soup size={16} color="#FF6B00" />;
      case 'Milkshake':
      case 'Cold Drink': return <Coffee size={16} color="#FF6B00" />;
      default: return <Utensils size={16} color="#FF6B00" />;
    }
  };

  const getFoodTypeColor = (foodType: FoodType) => {
    switch (foodType) {
      case 'Veg': return '#4CAF50';
      case 'Non-Veg': return '#F44336';
      default: return '#666666';
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      price: '',
      category: 'Pizza',
      image: 'https://via.placeholder.com/100',
      available: true,
      popular: false,
      foodType: 'Veg',
      sizeType: 'single',
      size: 'Medium',
      sizeVariations: [],
      hasMultipleSizes: false,
      hasAddOns: false,
      addOnGroups: [],
      rating: '',
      ratingCount: 0
    });
    setSizeVariations([]);
    setAddOnGroups([]);
  };

  const addSizeVariation = () => {
    if (!newSizePrice || isNaN(parseFloat(newSizePrice))) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const price = parseFloat(newSizePrice);
    if (price <= 0) {
      Alert.alert('Error', 'Price must be greater than 0');
      return;
    }

    const newVariation: SizeVariation = {
      size: newSize,
      price,
      available: true
    };

    setSizeVariations([...sizeVariations, newVariation]);
    setNewSize('Small');
    setNewSizePrice('');
  };

  const removeSizeVariation = (index: number) => {
    const updatedVariations = [...sizeVariations];
    updatedVariations.splice(index, 1);
    setSizeVariations(updatedVariations);
  };

  const handleAddItem = async () => {
    try {
      if (!formData.name || !formData.description || !formData.category) {
        Alert.alert('Validation Error', 'Please fill all required fields');
        return;
      }

      if (formData.sizeType === 'single' && !formData.price) {
        Alert.alert('Validation Error', 'Please enter a price for this item');
        return;
      }

      if (formData.sizeType === 'multiple' && sizeVariations.length === 0) {
        Alert.alert('Validation Error', 'Please add at least one size variation');
        return;
      }

      const newItem = {
        ...formData,
        price: formData.sizeType === 'single' ? parseFloat(formData.price) : 0, // Default price for single size items
        rating: formData.rating === '' ? 0 : parseFloat(formData.rating),
        sizeVariations: formData.sizeType === 'multiple' ? sizeVariations : [],
        hasMultipleSizes: formData.sizeType === 'multiple',
        size: formData.sizeType === 'single' ? formData.size : 'Not Applicable',
        sizeType: formData.sizeType, // Explicitly send sizeType
        hasAddOns: categoriesWithAddOns.includes(formData.category) && formData.hasAddOns,
        addOnGroups: categoriesWithAddOns.includes(formData.category) ? addOnGroups : []
      };

      const data = await apiRequest('/api/menu', 'POST', newItem);
      setMenuItems([...menuItems, data]);
      setShowAddModal(false);
      resetForm();
      Alert.alert('Success', 'Menu item added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add menu item');
      console.error('Error adding menu item:', error);
    }
  };

  const handleEditItem = async () => {
    if (!currentItem) return;

    try {
      const updatedItem = {
        ...formData,
        price: formData.sizeType === 'single' ? parseFloat(formData.price) : 0,
        rating: formData.rating === '' ? 0 : parseFloat(formData.rating),
        sizeVariations: formData.sizeType === 'multiple' ? sizeVariations : [],
        hasMultipleSizes: formData.sizeType === 'multiple',
        size: formData.sizeType === 'single' ? formData.size : 'Not Applicable',
        sizeType: formData.sizeType, // Explicitly send sizeType
        hasAddOns: categoriesWithAddOns.includes(formData.category) && formData.hasAddOns,
        addOnGroups: categoriesWithAddOns.includes(formData.category) ? addOnGroups : []
      };

      const data = await apiRequest(`/api/menu/${currentItem._id}`, 'PUT', updatedItem);
      setMenuItems(menuItems.map(item =>
        item._id === currentItem._id ? data : item
      ));
      setShowEditModal(false);
      resetForm();
      Alert.alert('Success', 'Menu item updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update menu item');
      console.error('Error updating menu item:', error);
    }
  };

  const handleDeleteItem = async () => {
    if (!currentItem) return;

    try {
      await apiRequest(`/api/menu/${currentItem._id}`, 'DELETE');
      setMenuItems(menuItems.filter(item => item._id !== currentItem._id));
      setShowDeleteModal(false);
      setCurrentItem(null);
    } catch (error) {
      Alert.alert('Error', 'Failed to delete menu item');
      console.error('Error deleting menu item:', error);
    }
  };

  const toggleAvailability = async (id: string) => {
    try {
      const item = menuItems.find(item => item._id === id);
      if (!item) return;

      const updatedItem = { ...item, available: !item.available };
      const data = await apiRequest(
        `/api/menu/${id}/toggle-availability`,
        'PUT',
        { available: updatedItem.available }
      );

      setMenuItems(menuItems.map(item =>
        item._id === id ? data : item
      ));
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle availability');
      console.error('Error toggling availability:', error);
    }
  };

  const toggleSizeAvailability = async (id: string, size: Size) => {
    try {
      const data = await apiRequest(
        `/api/menu/${id}/toggle-size-availability`,
        'PUT',
        { size }
      );

      setMenuItems(menuItems.map(item =>
        item._id === id ? data : item
      ));
    } catch (error) {
      Alert.alert('Error', 'Failed to toggle size availability');
      console.error('Error toggling size availability:', error);
    }
  };

  const openEditModal = (item: MenuItem) => {
    setCurrentItem(item);
    setFormData({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      category: item.category,
      image: item.image,
      available: item.available,
      popular: item.popular,
      foodType: item.foodType,
      sizeType: item.hasMultipleSizes ? 'multiple' : 'single',
      size: item.size,
      sizeVariations: item.sizeVariations,
      hasMultipleSizes: item.hasMultipleSizes,
      hasAddOns: item.hasAddOns,
      addOnGroups: item.addOnGroups,
      rating: item.rating.toString(),
      ratingCount: item.ratingCount
    });
    setSizeVariations(item.sizeVariations || []);
    setAddOnGroups(item.addOnGroups || []);
    setShowEditModal(true);
  };

  const openDeleteModal = (item: MenuItem) => {
    setCurrentItem(item);
    setShowDeleteModal(true);
  };

  const filteredItems = menuItems.filter(item => {
    const matchesSearch = searchQuery
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchesSearch;
  });


  const getPriceDisplay = (item: MenuItem) => {
    if (item.hasMultipleSizes && item.sizeVariations.length > 0) {
      const prices = item.sizeVariations.map(v => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      return `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`;
    }
    return `₹${item.price.toFixed(2)}`;
  };

  const renderAddOnGroup = (group: AddOnGroup) => (
    <View key={group.id} style={styles.addOnGroupContainer}>
      <View style={styles.addOnGroupHeader}>
        <Text style={styles.addOnGroupName}>{group.name}</Text>
        <View style={styles.addOnGroupActions}>
          <TouchableOpacity
            style={styles.addOnGroupActionButton}
            onPress={() => {
              setCurrentAddOnGroup(group);
              setShowAddOnModal(true);
            }}
          >
            <Plus size={16} color="#FF6B00" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addOnGroupActionButton}
            onPress={() => removeAddOnGroup(group.id)}
          >
            <Trash2 size={16} color="#F44336" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addOnGroupActionButton}
            onPress={() => toggleAddOnGroupRequired(group.id)}
          >
            <Text style={[styles.requiredText, group.required && styles.requiredTextActive]}>
              {group.required ? 'Required' : 'Optional'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.addOnGroupSelectionText}>
        Select {group.minSelection} to {group.maxSelection} options
      </Text>

      <View style={styles.addOnsList}>
        {group.addOns.map(addOn => (
          <View key={addOn.id} style={styles.addOnItem}>
            <View style={styles.addOnInfo}>
              <Switch
                trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                thumbColor={addOn.available ? "#FF6B00" : "#F4F4F4"}
                onValueChange={() => toggleAddOnAvailability(group.id, addOn.id)}
                value={addOn.available}
              />
              <Text style={styles.addOnName}>{addOn.name}</Text>
            </View>
            {!addOn.isDefault && (
              <Text style={styles.addOnPrice}>+${addOn.price.toFixed(2)}</Text>
            )}
            <TouchableOpacity
              style={styles.removeAddOnButton}
              onPress={() => removeAddOn(group.id, addOn.id)}
            >
              <X size={16} color="#F44336" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  const renderMenuItem = ({ item }: { item: MenuItem }) => (
    <View style={styles.menuItemCard}>
      <View style={styles.menuItemHeader}>
        <Image source={{ uri: item.image }} style={styles.menuItemImage} />
        <View style={styles.menuItemInfo}>
          <View style={styles.menuItemTitleRow}>
            <Text style={styles.menuItemTitle}>{item.name}</Text>
            {item.popular && (
              <View style={styles.popularBadge}>
                <Text style={styles.popularText}>Popular</Text>
              </View>
            )}
          </View>
          <Text style={styles.menuItemDescription} numberOfLines={2}>
            {item.description}
          </Text>

          <View style={styles.menuItemDetailsRow}>
            <View style={styles.detailBadge}>
              <Text style={[styles.foodTypeText, { color: getFoodTypeColor(item.foodType) }]}>
                {item.foodType}
              </Text>
            </View>
            {item.hasMultipleSizes ? (
              <View style={styles.detailBadge}>
                <Text style={styles.detailText}>Multiple Sizes</Text>
              </View>
            ) : (
              <View style={styles.detailBadge}>
                <Text style={styles.detailText}>{item.size}</Text>
              </View>
            )}
            {item.hasAddOns && (
              <View style={styles.detailBadge}>
                <Text style={styles.detailText}>Customizable</Text>
              </View>
            )}
            <View style={styles.ratingContainer}>
              <Star size={14} color="#FFC107" fill="#FFC107" />
              <Text style={styles.ratingText}>{item.rating.toFixed(1)} ({item.ratingCount})</Text>
            </View>
          </View>

          <View style={styles.menuItemCategoryRow}>
            <View style={styles.categoryBadge}>
              {getCategoryIcon(item.category)}
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
            <Text style={styles.menuItemPrice}>{getPriceDisplay(item)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.menuItemActions}>
        <View style={styles.availabilityContainer}>
          <Text
            style={[
              styles.availabilityText,
              !item.available && styles.unavailableText,
            ]}
          >
            {item.available ? 'Available' : 'Out of Stock'}
          </Text>
          <Switch
            trackColor={{ false: '#CCCCCC', true: '#FFD2B3' }}
            thumbColor={item.available ? '#FF6B00' : '#F4F4F4'}
            onValueChange={() => toggleAvailability(item._id)}
            value={item.available}
          />
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity
            style={styles.editButton}
            onPress={() => openEditModal(item)}
          >
            <Edit size={16} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={() => openDeleteModal(item)}
          >
            <Trash2 size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Menu</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setShowAddModal(true);
          }}
        >
          <Plus size={20} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add New Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#666" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search menu items..."
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterMenuOpen(!filterMenuOpen)}
        >
          <Filter size={18} color="#666" />
        </TouchableOpacity>
      </View>

      {filterMenuOpen && (
        <View>
          <ScrollView
            horizontal
            style={styles.categoryFilters}
            showsHorizontalScrollIndicator={false}
          >
            {categories.map((category) => (
              <TouchableOpacity
                key={category}
                style={[
                  styles.categoryFilterButton,
                  selectedCategory === category && styles.selectedCategoryFilter
                ]}
                onPress={() => setSelectedCategory(category)}
              >
                {category !== 'All' && getCategoryIcon(category)}
                <Text
                  style={[
                    styles.categoryFilterText,
                    selectedCategory === category && styles.selectedCategoryText
                  ]}
                >
                  {category}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          <View style={styles.vegFilterContainer}>
            <TouchableOpacity
              style={[
                styles.customCheckbox,
                onlyVeg && styles.customCheckboxChecked
              ]}
              onPress={() => setOnlyVeg(!onlyVeg)}
            >
              {onlyVeg && (
                <View style={styles.checkboxInner} />
              )}
            </TouchableOpacity>
            <Text style={styles.vegFilterText}>Only Veg</Text>
          </View>
        </View>
      )}

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>{filteredItems.length} items</Text>
        {(selectedCategory !== 'All' || onlyVeg) && (
          <View style={styles.activeFiltersContainer}>
            {selectedCategory !== 'All' && (
              <View style={styles.activeFilter}>
                <Text style={styles.activeFilterText}>{selectedCategory}</Text>
                <TouchableOpacity onPress={() => setSelectedCategory('All')}>
                  <X size={14} color="#FF6B00" />
                </TouchableOpacity>
              </View>
            )}
            {onlyVeg && (
              <View style={styles.activeFilter}>
                <Text style={[styles.activeFilterText, { color: '#4CAF50' }]}>
                  Only Veg
                </Text>
                <TouchableOpacity onPress={() => setOnlyVeg(false)}>
                  <X size={14} color="#FF6B00" />
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : menuItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No menu items found</Text>
          <TouchableOpacity style={styles.refreshButton} onPress={handleRefresh}>
            <RefreshCw size={20} color="#FF6B00" />
            <Text style={styles.refreshText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={filteredItems}
          renderItem={renderMenuItem}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.menuList}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={handleRefresh}
              colors={['#FF6B00']}
              tintColor="#FF6B00"
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No items match your filters</Text>
              <TouchableOpacity style={styles.refreshButton} onPress={() => {
                setSelectedCategory('All');
                setOnlyVeg(false);
                setSearchQuery('');
              }}>
                <RefreshCw size={20} color="#FF6B00" />
                <Text style={styles.refreshText}>Reset Filters</Text>
              </TouchableOpacity>
            </View>
          }
        />
      )}

      {/* Add New Item Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Menu Item</Text>
              <TouchableOpacity onPress={() => setShowAddModal(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Image</Text>
                <TouchableOpacity
                  style={styles.imageUploadContainer}
                  onPress={handleImagePick}
                  disabled={imageUploading}
                >
                  {formData.image && formData.image !== 'https://via.placeholder.com/100' ? (
                    <View style={styles.uploadedImageContainer}>
                      <Image source={{ uri: formData.image }} style={styles.uploadedImage} />
                      {imageUploading && (
                        <View style={styles.uploadProgressOverlay}>
                          <ActivityIndicator size="large" color="#FF6B00" />
                          <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <>
                      {imageUploading ? (
                        <View style={styles.uploadingContainer}>
                          <ActivityIndicator size="large" color="#FF6B00" />
                          <Text style={styles.uploadingText}>Uploading... {uploadProgress}%</Text>
                        </View>
                      ) : (
                        <>
                          <View style={styles.uploadIcon}>
                            <Upload size={24} color="#FF6B00" />
                          </View>
                          <Text style={styles.uploadText}>Tap to upload image</Text>
                        </>
                      )}
                    </>
                  )}
                </TouchableOpacity>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter item name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description *</Text>
                <TextInput
                  style={[styles.input, styles.textArea]}
                  value={formData.description}
                  onChangeText={(text) => setFormData({ ...formData, description: text })}
                  placeholder="Enter description"
                  multiline={true}
                  numberOfLines={3}
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Initial Rating</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.rating.toString()}
                    onChangeText={(text) => setFormData({ ...formData, rating: text })}
                    placeholder="0.0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Category *</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                  >
                    <Text>{formData.category}</Text>
                    <ChevronDown size={16} color="#666" />
                  </TouchableOpacity>

                  {categoryDropdownOpen && (
                    <View style={styles.dropdownMenuContainer}>
                      <ScrollView style={styles.dropdownMenu} nestedScrollEnabled={true}>
                        {(categories.slice(1) as Category[]).map((cat: Category) => (
                          <TouchableOpacity
                            key={cat}
                            style={styles.dropdownItem}
                            onPress={() => {
                              setFormData({
                                ...formData,
                                category: cat,
                                hasAddOns: categoriesWithAddOns.includes(cat) ? formData.hasAddOns : false
                              });
                              setCategoryDropdownOpen(false);
                            }}
                          >
                            <Text>{cat}</Text>
                          </TouchableOpacity>
                        ))}
                      </ScrollView>
                    </View>
                  )}
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Food Type *</Text>
                  <TouchableOpacity
                    style={styles.dropdownButton}
                    onPress={() => setFoodTypeMenuOpen(!foodTypeMenuOpen)}
                  >
                    <Text>{formData.foodType}</Text>
                    <ChevronDown size={16} color="#666" />
                  </TouchableOpacity>

                  {foodTypeMenuOpen && (
                    <View style={styles.dropdownMenu}>
                      {['Veg', 'Non-Veg', 'Not Applicable'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData({ ...formData, foodType: type as FoodType });
                            setFoodTypeMenuOpen(false);
                          }}
                        >
                          <Text>{type}</Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Pricing Type *</Text>
                <View style={styles.segmentedControl}>
                  <TouchableOpacity
                    style={[
                      styles.segmentedButton,
                      formData.sizeType === 'single' && styles.segmentedButtonActive
                    ]}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        sizeType: 'single',
                        hasMultipleSizes: false,
                        sizeVariations: []
                      });
                    }}
                  >
                    {formData.sizeType === 'single' && (
                      <Check size={16} color="#FF6B00" style={styles.segmentedCheckIcon} />
                    )}
                    <Text
                      style={[
                        styles.segmentedButtonText,
                        formData.sizeType === 'single' && styles.segmentedButtonTextActive
                      ]}
                    >
                      Single Price
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.segmentedButton,
                      formData.sizeType === 'multiple' && styles.segmentedButtonActive
                    ]}
                    onPress={() => {
                      setFormData({
                        ...formData,
                        sizeType: 'multiple',
                        hasMultipleSizes: true,
                        price: ''
                      });
                    }}
                  >
                    {formData.sizeType === 'multiple' && (
                      <Check size={16} color="#FF6B00" style={styles.segmentedCheckIcon} />
                    )}
                    <Text
                      style={[
                        styles.segmentedButtonText,
                        formData.sizeType === 'multiple' && styles.segmentedButtonTextActive
                      ]}
                    >
                      Multiple Sizes
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>

              {formData.sizeType === 'single' ? (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9.]/g, '');
                      setFormData({ ...formData, price: filtered });
                    }}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              ) : (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Size Variations *</Text>
                  {sizeVariations.length === 0 && (
                    <Text style={styles.warningText}>
                      Please add at least one size variation
                    </Text>
                  )}

                  <View style={styles.sizeVariationsContainer}>
                    {sizeVariations.map((variation, index) => (
                      <View key={index} style={styles.sizeVariationItem}>
                        <View style={styles.sizeVariationInfo}>
                          <Text style={styles.sizeVariationText}>
                            {variation.size} - ₹{variation.price.toFixed(2)}
                          </Text>
                          <Switch
                            trackColor={{ false: '#CCCCCC', true: '#FFD2B3' }}
                            thumbColor={variation.available ? '#FF6B00' : '#F4F4F4'}
                            onValueChange={() => {
                              const updatedVariations = [...sizeVariations];
                              updatedVariations[index].available = !updatedVariations[index].available;
                              setSizeVariations(updatedVariations);
                            }}
                            value={variation.available}
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.removeSizeButton}
                          onPress={() => removeSizeVariation(index)}
                        >
                          <Trash2 size={16} color="#F44336" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>

                  <View style={styles.addSizeContainer}>
                    <View style={styles.sizeInputContainer}>
                      <Text style={styles.sizeLabel}>Size:</Text>
                      <TouchableOpacity
                        style={styles.sizeDropdownButton}
                        onPress={() => setSizeMenuOpen(!sizeMenuOpen)}
                      >
                        <Text style={styles.sizeDropdownText}>{newSize}</Text>
                        <ChevronDown size={16} color="#666" />
                      </TouchableOpacity>

                      {sizeMenuOpen && (
                        <View style={styles.dropdownMenuContainer}>
                          <ScrollView style={styles.sizeDropdownMenu}>
                            {sizes.map((sizeOption) => (
                              <TouchableOpacity
                                key={sizeOption}
                                style={styles.sizeDropdownItem}
                                onPress={() => {
                                  setNewSize(sizeOption);
                                  setSizeMenuOpen(false);
                                }}
                              >
                                <Text style={styles.dropdownItemText}>{sizeOption}</Text>
                              </TouchableOpacity>
                            ))}
                          </ScrollView>
                        </View>
                      )}
                    </View>

                    <View style={styles.priceInputContainer}>
                      <Text style={styles.formLabel}>Price (₹) *</Text>
                      <TextInput
                        style={styles.sizePriceInput}
                        value={newSizePrice}
                        onChangeText={(text) => {
                          const filtered = text.replace(/[^0-9.]/g, '');
                          setNewSizePrice(filtered);
                        }}
                        placeholder="0.00"
                        keyboardType="decimal-pad"
                      />
                    </View>

                    <TouchableOpacity
                      style={styles.addSizeButton}
                      onPress={addSizeVariation}
                      disabled={!newSizePrice}
                    >
                      <Plus size={16} color="#FFFFFF" />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {categoriesWithAddOns.includes(formData.category) && (
                <View style={styles.formGroup}>
                  <View style={styles.addOnsHeader}>
                    <Text style={styles.formLabel}>Customization Options</Text>
                    <TouchableOpacity
                      style={styles.toggleSwitchContainer}
                      onPress={() => setFormData({ ...formData, hasAddOns: !formData.hasAddOns })}
                    >
                      <Text style={styles.toggleSwitchText}>
                        {formData.hasAddOns ? 'Enabled' : 'Disabled'}
                      </Text>
                      <Switch
                        trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                        thumbColor={formData.hasAddOns ? "#FF6B00" : "#F4F4F4"}
                        onValueChange={(value) => setFormData({ ...formData, hasAddOns: value })}
                        value={formData.hasAddOns}
                      />
                    </TouchableOpacity>
                  </View>

                  {formData.hasAddOns && (
                    <>
                      {addOnGroups.length === 0 && (
                        <Text style={styles.warningText}>
                          Add at least one customization group
                        </Text>
                      )}

                      {addOnGroups.map(renderAddOnGroup)}

                      <TouchableOpacity
                        style={styles.addAddOnGroupButton}
                        onPress={() => setShowAddOnGroupModal(true)}
                      >
                        <Plus size={16} color="#FF6B00" />
                        <Text style={styles.addAddOnGroupButtonText}>Add Customization Group</Text>
                      </TouchableOpacity>
                    </>
                  )}
                </View>
              )}

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Available</Text>
                  <Switch
                    trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                    thumbColor={formData.available ? "#FF6B00" : "#F4F4F4"}
                    onValueChange={(value) => setFormData({ ...formData, available: value })}
                    value={formData.available}
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Mark as Popular</Text>
                  <Switch
                    trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                    thumbColor={formData.popular ? "#FF6B00" : "#F4F4F4"}
                    onValueChange={(value) => setFormData({ ...formData, popular: value })}
                    value={formData.popular}
                  />
                </View>
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[
                styles.saveButton,
                (!formData.name || !formData.description ||
                  (formData.sizeType === 'single' && !formData.price) ||
                  (formData.sizeType === 'multiple' && sizeVariations.length === 0) ||
                  (formData.hasAddOns && addOnGroups.length === 0)) &&
                styles.saveButtonDisabled
              ]}
              onPress={handleAddItem}
              disabled={
                !formData.name || !formData.description ||
                (formData.sizeType === 'single' && !formData.price) ||
                (formData.sizeType === 'multiple' && sizeVariations.length === 0) ||
                (formData.hasAddOns && addOnGroups.length === 0)
              }
            >
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Add On Group Modal */}
      <Modal
        visible={showAddOnGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddOnGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.smallModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Customization Group</Text>
              <TouchableOpacity onPress={() => setShowAddOnGroupModal(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Group Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newAddOnGroup.name}
                  onChangeText={(text) => setNewAddOnGroup({ ...newAddOnGroup, name: text })}
                  placeholder="e.g., Cheese Options, Toppings"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Min Selections</Text>
                  <View style={styles.numberInputContainer}>
                    <TouchableOpacity
                      style={styles.numberInputButton}
                      onPress={() => {
                        if (newAddOnGroup.minSelection > 0) {
                          setNewAddOnGroup({ ...newAddOnGroup, minSelection: newAddOnGroup.minSelection - 1 });
                        }
                      }}
                    >
                      <Minus size={16} color="#666" />
                    </TouchableOpacity>
                    <Text style={styles.numberInputText}>{newAddOnGroup.minSelection}</Text>
                    <TouchableOpacity
                      style={styles.numberInputButton}
                      onPress={() => {
                        if (newAddOnGroup.minSelection < newAddOnGroup.maxSelection) {
                          setNewAddOnGroup({ ...newAddOnGroup, minSelection: newAddOnGroup.minSelection + 1 });
                        }
                      }}
                    >
                      <Plus size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Max Selections</Text>
                  <View style={styles.numberInputContainer}>
                    <TouchableOpacity
                      style={styles.numberInputButton}
                      onPress={() => {
                        if (newAddOnGroup.maxSelection > 1 && newAddOnGroup.maxSelection > newAddOnGroup.minSelection) {
                          setNewAddOnGroup({ ...newAddOnGroup, maxSelection: newAddOnGroup.maxSelection - 1 });
                        }
                      }}
                    >
                      <Minus size={16} color="#666" />
                    </TouchableOpacity>
                    <Text style={styles.numberInputText}>{newAddOnGroup.maxSelection}</Text>
                    <TouchableOpacity
                      style={styles.numberInputButton}
                      onPress={() => {
                        setNewAddOnGroup({ ...newAddOnGroup, maxSelection: newAddOnGroup.maxSelection + 1 });
                      }}
                    >
                      <Plus size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Required</Text>
                <Switch
                  trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                  thumbColor={newAddOnGroup.required ? "#FF6B00" : "#F4F4F4"}
                  onValueChange={(value) => setNewAddOnGroup({ ...newAddOnGroup, required: value })}
                  value={newAddOnGroup.required}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !newAddOnGroup.name && styles.saveButtonDisabled
                ]}
                onPress={addAddOnGroup}
                disabled={!newAddOnGroup.name}
              >
                <Text style={styles.saveButtonText}>Add Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Add On Modal */}
      <Modal
        visible={showAddOnModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddOnModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.smallModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Customization Option</Text>
              <TouchableOpacity onPress={() => setShowAddOnModal(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Option Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newAddOn.name}
                  onChangeText={(text) => setNewAddOn({ ...newAddOn, name: text })}
                  placeholder="e.g., Extra Cheese, Without Onion"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Default Option (No Extra Charge)</Text>
                <Switch
                  trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                  thumbColor={newAddOn.isDefault ? "#FF6B00" : "#F4F4F4"}
                  onValueChange={(value) => setNewAddOn({ ...newAddOn, isDefault: value, price: value ? '' : newAddOn.price })}
                  value={newAddOn.isDefault}
                />
              </View>

              {!newAddOn.isDefault && (
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Additional Price ($) *</Text>
                  <TextInput
                    style={styles.input}
                    value={newAddOn.price}
                    onChangeText={(text) => {
                      const filtered = text.replace(/[^0-9.]/g, '');
                      setNewAddOn({ ...newAddOn, price: filtered });
                    }}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>
              )}

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Available</Text>
                <Switch
                  trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                  thumbColor={newAddOn.available ? "#FF6B00" : "#F4F4F4"}
                  onValueChange={(value) => setNewAddOn({ ...newAddOn, available: value })}
                  value={newAddOn.available}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  (!newAddOn.name || (!newAddOn.isDefault && !newAddOn.price)) && styles.saveButtonDisabled
                ]}
                onPress={addAddOn}
                disabled={!newAddOn.name || (!newAddOn.isDefault && !newAddOn.price)}
              >
                <Text style={styles.saveButtonText}>Add Option</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal (similar to Add Modal but with existing data) */}
      {/* Delete Confirmation Modal */}
      {/* ... (keep your existing modals) ... */}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    marginTop: 40,
    marginBottom: 60
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#1F2937',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 5,
    paddingVertical: 4
  },
  searchFilterContainer: {
    flexDirection: 'row',
    padding: 15,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  searchContainer: {
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
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
  },
  categoryFilters: {
    paddingVertical: 10,
    paddingHorizontal: 15,
    backgroundColor: '#FFFFFF',
  },
  vegFilterContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#FFFFFF',
  },
  customCheckbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#4CAF50',
    marginRight: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  customCheckboxChecked: {
    backgroundColor: '#4CAF50',
  },
  checkboxInner: {
    width: 12,
    height: 12,
    backgroundColor: '#FFFFFF',
    borderRadius: 2,
  },
  vegFilterText: {
    color: '#4CAF50',
    fontWeight: 'bold',
  },
  categoryFilterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    marginRight: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  selectedCategoryFilter: {
    backgroundColor: '#FFE0CC',
  },
  categoryFilterText: {
    color: '#666666',
    marginLeft: 4,
  },
  selectedCategoryText: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  statusBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F8F9FA',
  },
  activeFiltersContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
  statusText: {
    color: '#666666',
    fontSize: 12,
  },
  menuList: {
    padding: 15,
  },
  menuItemCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  menuItemHeader: {
    flexDirection: 'row',
  },
  menuItemImage: {
    width: 80,
    height: 80,
    borderRadius: 8,
    marginRight: 15,
  },
  menuItemInfo: {
    flex: 1,
  },
  menuItemTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  menuItemTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#1F2937',
    flex: 1,
  },
  popularBadge: {
    backgroundColor: '#FFE0CC',
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 4,
  },
  popularText: {
    color: '#FF6B00',
    fontSize: 10,
    fontWeight: 'bold',
  },
  menuItemDescription: {
    color: '#666666',
    fontSize: 12,
    marginBottom: 8,
  },
  menuItemDetailsRow: {
    flexDirection: 'row',
    marginBottom: 8,
    flexWrap: 'wrap',
  },
  detailBadge: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginRight: 8,
    marginBottom: 4,
  },
  detailText: {
    color: '#666666',
    fontSize: 12,
  },
  foodTypeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
    marginRight: 8,
  },
  ratingText: {
    color: '#666666',
    fontSize: 12,
    marginLeft: 4,
  },
  menuItemCategoryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 4,
  },
  categoryText: {
    color: '#666666',
    fontSize: 12,
    marginLeft: 4,
  },
  menuItemPrice: {
    color: '#FF6B00',
    fontWeight: 'bold',
    fontSize: 16,
  },
  menuItemActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#EEEEEE',
  },
  availabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  availabilityText: {
    color: '#4CAF50',
    fontSize: 12,
    marginRight: 8,
  },
  unavailableText: {
    color: '#F44336',
  },
  actionButtons: {
    flexDirection: 'row',
  },
  editButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 18,
    marginRight: 8,
  },
  deleteButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFEBEE',
    borderRadius: 18,
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  smallModalContent: {
    width: '90%',
    maxHeight: '60%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  formContainer: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
  },
  dropdownMenuContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    maxHeight: 200,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  imageUploadContainer: {
    height: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE0CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadText: {
    color: '#666666',
  },
  currentImageContainer: {
    alignItems: 'center',
  },
  currentImage: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginBottom: 10,
  },
  changeImageButton: {
    backgroundColor: '#FFE0CC',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  changeImageText: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
  confirmModalContent: {
    width: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  deleteIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#FFEBEE',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  deleteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 10,
  },
  deleteMessage: {
    textAlign: 'center',
    color: '#666666',
    marginBottom: 20,
  },
  deleteActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    borderWidth: 1,
    borderColor: '#CCCCCC',
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666666',
    fontWeight: 'bold',
  },
  confirmDeleteButton: {
    flex: 1,
    backgroundColor: '#F44336',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    alignItems: 'center',
  },
  confirmDeleteButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFE0CC',
    padding: 10,
    borderRadius: 8,
  },
  refreshText: {
    color: '#FF6B00',
    marginLeft: 8,
  },
  sizeVariationsContainer: {
    marginBottom: 10,
  },
  sizeVariationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  sizeVariationInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sizeVariationText: {
    fontSize: 14,
  },
  removeSizeButton: {
    padding: 4,
  },
  addSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  sizeInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  sizeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sizeDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
  },
  sizeDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    maxHeight: 150,
  },
  sizeDropdownItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sizeDropdownText: {
    fontSize: 14,
  },
  priceInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  sizePriceInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
  },
  addSizeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    borderRadius: 18,
    marginTop: 16,
  },
  uploadedImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadProgressOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#666666',
    marginTop: 10,
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  segmentedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
  },
  segmentedButtonActive: {
    backgroundColor: '#FF6B0010',
  },
  segmentedButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  segmentedButtonTextActive: {
    color: '#FF6B00',
  },
  segmentedCheckIcon: {
    marginRight: 6,
  },
  warningText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333333',
    paddingVertical: 2
  },
  // Add-ons specific styles
  addOnsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleSwitchText: {
    marginRight: 8,
    fontSize: 14,
    color: '#666666',
  },
  addOnGroupContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  addOnGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addOnGroupName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addOnGroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addOnGroupActionButton: {
    marginLeft: 10,
  },
  requiredText: {
    fontSize: 12,
    color: '#666666',
  },
  requiredTextActive: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  addOnGroupSelectionText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  addOnsList: {
    marginTop: 8,
  },
  addOnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  addOnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addOnName: {
    marginLeft: 8,
    fontSize: 14,
  },
  addOnPrice: {
    fontSize: 14,
    color: '#FF6B00',
    marginRight: 8,
  },
  removeAddOnButton: {
    padding: 4,
  },
  addAddOnGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE0CC',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  addAddOnGroupButtonText: {
    color: '#FF6B00',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  numberInputButton: {
    padding: 8,
  },
  numberInputText: {
    fontSize: 14,
    marginHorizontal: 10,
  },
});

export default ManageMenu;