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
  Soup
} from 'lucide-react-native';
import { API_URL } from '@/config';
// Add these imports at the top of your file
import * as ImagePicker from 'expo-image-picker';
import { launchImageLibrary } from 'react-native-image-picker'; // Change this import
import { Asset, ImageLibraryOptions, MediaType } from 'react-native-image-picker';
import { CLOUDINARY_CONFIG } from '@/config';

// Define types
type Category = 'Pizza' | 'Burger' | 'Grilled Sandwich' | 'Special Combo' | 'Pasta' | 'Noodles' | 'Snacks' | 'Milkshake' | 'Cold Drink' | 'Rice Item' | 'Sweets' | 'Sides';
type FoodType = 'Veg' | 'Non-Veg' | 'Not Applicable';
type Size = 'Small' | 'Medium' | 'Large' | 'Not Applicable';
type ImagePickerAsset = {
  uri: string;
  width?: number;
  height?: number;
  type?: string;
  fileName?: string;
  fileSize?: number;
};

interface SizeVariation {
  size: Size;
  price: number;
  available: boolean;
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
  const token = useSelector((state: RootState) => state.auth.token);

  // Add this right after your existing state declarations
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
    size: 'Medium' as Size,
    sizeVariations: [] as SizeVariation[],
    hasMultipleSizes: false,
    rating: '', // Changed from 0 to empty string
    ratingCount: 0
  });

  const categories: ('All' | Category)[] = ['All', 'Pizza', 'Burger', 'Grilled Sandwich', 'Special Combo', 'Pasta', 'Noodles', 'Snacks', 'Milkshake', 'Cold Drink', 'Rice Item', 'Sweets', 'Sides'];
  const sizes: Size[] = ['Small', 'Medium', 'Large', 'Not Applicable'];

  // Helper function for API calls
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

  // Fetch menu items from backend with filtering
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

  // Refresh data
  const handleRefresh = () => {
    setRefreshing(true);
    fetchMenuItems();
  };




  const handleImagePick = async () => {
    try {
      // Request permission first
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'You need to grant camera roll permissions to upload images.');
        return;
      }

      // Launch image picker
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      console.log('Image picker result:', result);

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];

        // Convert to format needed for cloudinary upload
        const assetForUpload: ImagePickerAsset = {
          uri: selectedImage.uri,
          type: 'image/jpeg', // Expo doesn't provide type, so we assume jpeg
          fileName: selectedImage.uri.split('/').pop() || 'upload.jpg',
          width: selectedImage.width,
          height: selectedImage.height,
        };

        await uploadImageToCloudinary(assetForUpload);
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  // Update the uploadImageToCloudinary function with better error handling

  const uploadImageToCloudinary = async (image: ImagePickerAsset) => {
    if (!image.uri) {
      Alert.alert('Error', 'No image found to upload');
      return;
    }

    setImageUploading(true);
    setUploadProgress(0);

    try {
      console.log('Starting upload to Cloudinary with config:', {
        cloudName: CLOUDINARY_CONFIG.cloudName,
        uploadPreset: CLOUDINARY_CONFIG.uploadPreset,
        folder: CLOUDINARY_CONFIG.folder
      });

      // Create form data for upload
      const cloudinaryFormData = new FormData();

      // Add the image file
      cloudinaryFormData.append('file', {
        uri: image.uri,
        type: image.type || 'image/jpeg', // Changed from mimeType to type to match your type definition
        name: image.fileName || 'upload.jpg',
      } as any);

      // Add upload parameters
      cloudinaryFormData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);

      // Only add folder if it exists in config
      if (CLOUDINARY_CONFIG.folder) {
        cloudinaryFormData.append('folder', CLOUDINARY_CONFIG.folder);
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
      console.log('Uploading to URL:', uploadUrl);

      // Upload to Cloudinary
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: cloudinaryFormData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadProgress(100);

      // Get detailed error message
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary error response:', errorText);
        throw new Error(`Upload failed with status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();
      console.log('Upload success, received URL:', data.secure_url);

      // Update form with the Cloudinary URL
      setFormData({
        ...formData,
        image: data.secure_url,
      });

      Alert.alert('Success', 'Image uploaded successfully');
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload image to Cloudinary. Please check your configuration and try again.');
    } finally {
      setImageUploading(false);
    }
  };

  // Initial data fetch
  useEffect(() => {
    fetchMenuItems();
  }, [selectedCategory, onlyVeg]);

  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case 'Pizza':
        return <Pizza size={16} color="#FF6B00" />;
      case 'Burger':
        return <Donut size={16} color="#FF6B00" />;
      case 'Grilled Sandwich':
        return <Sandwich size={16} color="#FF6B00" />;
      case 'Special Combo':
        return <Utensils size={16} color="#FF6B00" />;
      case 'Pasta':
      case 'Noodles':
        return <Soup size={16} color="#FF6B00" />;
      case 'Milkshake':
      case 'Cold Drink':
        return <Coffee size={16} color="#FF6B00" />;
      default:
        return <Utensils size={16} color="#FF6B00" />;
    }
  };

  const getFoodTypeColor = (foodType: FoodType) => {
    switch (foodType) {
      case 'Veg':
        return '#4CAF50';
      case 'Non-Veg':
        return '#F44336';
      default:
        return '#666666';
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
      size: 'Medium',
      sizeVariations: [],
      hasMultipleSizes: false,
      rating: '',
      ratingCount: 0
    });
    setSizeVariations([]);
  };

  const addSizeVariation = () => {
    if (!newSizePrice || isNaN(parseFloat(newSizePrice))) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const newVariation: SizeVariation = {
      size: newSize,
      price: parseFloat(newSizePrice),
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

  // Change 6: Update the handleAddItem function to handle empty rating
  const handleAddItem = async () => {
    try {
      const newItem = {
        ...formData,
        price: parseFloat(formData.price),
        rating: formData.rating === '' ? 0 : parseFloat(formData.rating), // Handle empty rating
        sizeVariations: sizeVariations.length > 0 ? sizeVariations : [],
        hasMultipleSizes: sizeVariations.length > 0
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

  // Edit menu item
  const handleEditItem = async () => {
    if (!currentItem) return;

    try {
      const updatedItem = {
        ...formData,
        price: parseFloat(formData.price),
        rating: formData.rating === '' ? 0 : parseFloat(formData.rating), // Handle empty rating
        sizeVariations: sizeVariations.length > 0 ? sizeVariations : [],
        hasMultipleSizes: sizeVariations.length > 0
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

  // Delete menu item
  const handleDeleteItem = async () => {
    if (!currentItem) return;

    try {
      await apiRequest(`/api/menu/${currentItem._id}`, 'DELETE');
      setMenuItems(menuItems.filter(item => item._id !== currentItem._id));
      setShowDeleteModal(false);
      setCurrentItem(null);
      // Alert.alert('Success', 'Menu item deleted successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to delete menu item');
      console.error('Error deleting menu item:', error);
    }
  };

  // Toggle availability
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

  // Toggle size availability
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

  // Rate menu item
  const rateMenuItem = async (id: string, rating: number) => {
    try {
      const data = await apiRequest(
        `/api/menu/${id}/rate`,
        'POST',
        { rating }
      );

      setMenuItems(menuItems.map(item =>
        item._id === id ? data : item
      ));
    } catch (error) {
      Alert.alert('Error', 'Failed to rate menu item');
      console.error('Error rating menu item:', error);
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
      size: item.size,
      sizeVariations: item.sizeVariations,
      hasMultipleSizes: item.hasMultipleSizes,
      rating: item.rating.toString(),
      ratingCount: item.ratingCount
    });
    setSizeVariations(item.sizeVariations || []);
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
      return `$${minPrice.toFixed(2)} - $${maxPrice.toFixed(2)}`;
    }
    return `$${item.price.toFixed(2)}`;
  };

  // Render menu item card
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
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter item name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
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
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Base Price ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Initial Rating</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.rating.toString()}
                    onChangeText={(text) => setFormData({ ...formData, rating: text })} // Changed to store as string
                    placeholder="0.0"
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Category</Text>
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
                              setFormData({ ...formData, category: cat });
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
                  <Text style={styles.formLabel}>Food Type</Text>
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
                <Text style={styles.formLabel}>Size Variations</Text>
                <View style={styles.sizeVariationsContainer}>
                  {sizeVariations.map((variation, index) => (
                    <View key={index} style={styles.sizeVariationItem}>
                      <Text style={styles.sizeVariationText}>
                        {variation.size}: ${variation.price.toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeSizeVariation(index)}
                        style={styles.removeSizeButton}
                      >
                        <X size={16} color="#F44336" />
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
                      <Text>{newSize}</Text>
                      <ChevronDown size={16} color="#666" />
                    </TouchableOpacity>

                    {sizeMenuOpen && (
                      <View style={styles.dropdownMenuContainer}>
                        <ScrollView style={styles.sizeDropdownMenu} nestedScrollEnabled={true}>
                          {sizes.map((size) => (
                            <TouchableOpacity
                              key={size}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setNewSize(size);
                                setSizeMenuOpen(false);
                              }}
                            >
                              <Text>{size}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceInputContainer}>
                    <Text style={styles.sizeLabel}>Price:</Text>
                    <TextInput
                      style={styles.sizePriceInput}
                      value={newSizePrice}
                      onChangeText={setNewSizePrice}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.addSizeButton}
                    onPress={addSizeVariation}
                  >
                    <Plus size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

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

            <TouchableOpacity style={styles.saveButton} onPress={handleAddItem}>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Add Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Item Modal */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Menu Item</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Current Image</Text>
                <View style={styles.currentImageContainer}>
                  <Image source={{ uri: formData.image }} style={styles.currentImage} />
                  <TouchableOpacity
                    style={styles.changeImageButton}
                    onPress={handleImagePick}
                    disabled={imageUploading}
                  >
                    {imageUploading ? (
                      <ActivityIndicator size="small" color="#FF6B00" />
                    ) : (
                      <Text style={styles.changeImageText}>Change Image</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Name</Text>
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => setFormData({ ...formData, name: text })}
                  placeholder="Enter item name"
                />
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Description</Text>
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
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Base Price ($)</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.price}
                    onChangeText={(text) => setFormData({ ...formData, price: text })}
                    placeholder="0.00"
                    keyboardType="decimal-pad"
                  />
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Rating</Text>
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
                  <Text style={styles.formLabel}>Category</Text>
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
                              setFormData({ ...formData, category: cat });
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
                  <Text style={styles.formLabel}>Food Type</Text>
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
                <Text style={styles.formLabel}>Size Variations</Text>
                <View style={styles.sizeVariationsContainer}>
                  {sizeVariations.map((variation, index) => (
                    <View key={index} style={styles.sizeVariationItem}>
                      <Text style={styles.sizeVariationText}>
                        {variation.size}: ${variation.price.toFixed(2)}
                      </Text>
                      <TouchableOpacity
                        onPress={() => removeSizeVariation(index)}
                        style={styles.removeSizeButton}
                      >
                        <X size={16} color="#F44336" />
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
                      <Text>{newSize}</Text>
                      <ChevronDown size={16} color="#666" />
                    </TouchableOpacity>

                    {sizeMenuOpen && (
                      <View style={styles.dropdownMenuContainer}>
                        <ScrollView style={styles.sizeDropdownMenu} nestedScrollEnabled={true}>
                          {sizes.map((size) => (
                            <TouchableOpacity
                              key={size}
                              style={styles.dropdownItem}
                              onPress={() => {
                                setNewSize(size);
                                setSizeMenuOpen(false);
                              }}
                            >
                              <Text>{size}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceInputContainer}>
                    <Text style={styles.sizeLabel}>Price:</Text>
                    <TextInput
                      style={styles.sizePriceInput}
                      value={newSizePrice}
                      onChangeText={setNewSizePrice}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.addSizeButton}
                    onPress={addSizeVariation}
                  >
                    <Plus size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>

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

            <TouchableOpacity style={styles.saveButton} onPress={handleEditItem}>
              <Save size={20} color="#FFFFFF" />
              <Text style={styles.saveButtonText}>Update Item</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmModalContent}>
            <View style={styles.deleteIconContainer}>
              <AlertCircle size={40} color="#F44336" />
            </View>
            <Text style={styles.deleteTitle}>Delete Item</Text>
            <Text style={styles.deleteMessage}>
              Are you sure you want to delete "{currentItem?.name}"? This action cannot be undone.
            </Text>
            <View style={styles.deleteActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowDeleteModal(false)}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.confirmDeleteButton}
                onPress={handleDeleteItem}
              >
                <Text style={styles.confirmDeleteButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
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
  // dropdownMenu: {
  //   position: 'absolute',
  //   top: 75,
  //   left: 0,
  //   right: 0,
  //   backgroundColor: '#FFFFFF',
  //   borderRadius: 8,
  //   borderWidth: 1,
  //   borderColor: '#EEEEEE',
  //   zIndex: 1000,
  //   elevation: 5,
  // },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  dropdownMenuContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    maxHeight: 200, // Set a specific maximum height
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    maxHeight: 200,
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
  // New styles for size variations
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
  // With this:
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
  // Add these to your StyleSheet
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
});

export default ManageMenu;