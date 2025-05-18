import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  Image,
  Alert,
  ActivityIndicator,
  ScrollView,
  Modal,
  Switch,
  RefreshControl
} from 'react-native';
import {
  X,
  Plus,
  Search,
  Filter,
  Utensils,
  Star,
  CheckCircle,
  Circle,
  Edit,
  Trash,
  RefreshCw
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { API_URL } from '../../config';
import AddMenuItem from '../component/admin/manageMenu/AddMenuItem';
import EditMenuItem from '../component/admin/manageMenu/EditMenuItem';

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
  
  const token = useSelector((state: RootState) => state.auth.token);

  // Define category and size options
  const categories: ('All' | Category)[] = ['All', 'Pizza', 'Burger', 'Grilled Sandwich', 'Special Combo', 'Pasta', 'Noodles', 'Snacks', 'Milkshake', 'Cold Drink', 'Rice Item', 'Sweets', 'Sides'];
  const sizes: Size[] = ['Small', 'Medium', 'Large', 'Not Applicable'];
  const categoriesWithAddOns: Category[] = ['Pizza', 'Burger', 'Grilled Sandwich', 'Special Combo', 'Pasta'];

  // API request helper function
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

  // Fetch menu items from API
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
        console.error('Expected array but got:', data);
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

  useEffect(() => {
    fetchMenuItems();
  }, [selectedCategory, onlyVeg]);

  const handleRefresh = () => {
    setRefreshing(true);
    fetchMenuItems();
  };

  // Handle adding a new menu item
  const handleAddItem = async (newItem: any) => {
    try {
      const data = await apiRequest('/api/menu', 'POST', newItem);
      setMenuItems([...menuItems, data]);
      setShowAddModal(false);
      Alert.alert('Success', 'Menu item added successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to add menu item');
      console.error('Error adding menu item:', error);
      throw error;
    }
  };

  // Handle editing a menu item
  const handleEditItem = async (updatedItem: any) => {
    if (!currentItem) return;

    try {
      const data = await apiRequest(`/api/menu/${currentItem._id}`, 'PUT', updatedItem);
      setMenuItems(menuItems.map(item =>
        item._id === currentItem._id ? data : item
      ));
      setShowEditModal(false);
      Alert.alert('Success', 'Menu item updated successfully');
    } catch (error) {
      Alert.alert('Error', 'Failed to update menu item');
      console.error('Error updating menu item:', error);
      throw error;
    }
  };

  // Handle deleting a menu item
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

  // Toggle item availability
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

  // Open edit modal with current item data
  const openEditModal = (item: MenuItem) => {
    setCurrentItem(item);
    setShowEditModal(true);
  };

  // Open delete confirmation modal
  const openDeleteModal = (item: MenuItem) => {
    setCurrentItem(item);
    setShowDeleteModal(true);
  };

  // Filter menu items by search query
  const filteredItems = menuItems.filter(item => {
    const matchesSearch = searchQuery
      ? item.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      : true;

    return matchesSearch;
  });

  // Helper functions for UI
  const getCategoryIcon = (category: Category) => {
    switch (category) {
      case 'Pizza':
        return <Utensils size={16} color="#FF6B00" />;
      case 'Burger':
        return <Utensils size={16} color="#FF6B00" />;
      case 'Grilled Sandwich':
        return <Utensils size={16} color="#FF6B00" />;
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

  // Format price display for items with multiple sizes
  const getPriceDisplay = (item: MenuItem) => {
    if (item.hasMultipleSizes && item.sizeVariations.length > 0) {
      const prices = item.sizeVariations.map(v => v.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      return `₹${minPrice.toFixed(2)} - ₹${maxPrice.toFixed(2)}`;
    }
    return `₹${item.price.toFixed(2)}`;
  };

  // Render a menu item card
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
          <Text style={[styles.availabilityText, !item.available && styles.unavailableText]}>
            {item.available ? 'Available' : 'Unavailable'}
          </Text>
          <Switch
            trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
            thumbColor={item.available ? "#FF6B00" : "#F4F4F4"}
            onValueChange={() => toggleAvailability(item._id)}
            value={item.available}
          />
        </View>
        <View style={styles.actionButtons}>
          <TouchableOpacity style={styles.editButton} onPress={() => openEditModal(item)}>
            <Edit size={16} color="#1F2937" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.deleteButton} onPress={() => openDeleteModal(item)}>
            <Trash size={16} color="#F44336" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Manage Menu</Text>
        <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
          <Plus size={18} color="#FFFFFF" />
          <Text style={styles.addButtonText}>Add Item</Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchFilterContainer}>
        <View style={styles.searchContainer}>
          <Search size={18} color="#888" style={styles.searchIcon} />
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
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categoryFilters}
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
                {category !== 'All' && getCategoryIcon(category as Category)}
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
              style={[styles.customCheckbox, onlyVeg && styles.customCheckboxChecked]}
              onPress={() => setOnlyVeg(!onlyVeg)}
            >
              {onlyVeg && <View style={styles.checkboxInner} />}
            </TouchableOpacity>
            <Text style={styles.vegFilterText}>Vegetarian Only</Text>
          </View>
        </View>
      )}

      <View style={styles.statusBar}>
        <Text style={styles.statusText}>
          {filteredItems.length} {filteredItems.length === 1 ? 'item' : 'items'} found
        </Text>
        <View style={styles.activeFiltersContainer}>
          {selectedCategory !== 'All' && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>{selectedCategory}</Text>
              <TouchableOpacity onPress={() => setSelectedCategory('All')}>
                <X size={12} color="#FF6B00" />
              </TouchableOpacity>
            </View>
          )}
          {onlyVeg && (
            <View style={styles.activeFilter}>
              <Text style={styles.activeFilterText}>Vegetarian</Text>
              <TouchableOpacity onPress={() => setOnlyVeg(false)}>
                <X size={12} color="#FF6B00" />
              </TouchableOpacity>
            </View>
          )}
        </View>
      </View>

      {loading && !refreshing ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
        </View>
      ) : menuItems.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No menu items found. Add your first item to get started!</Text>
          <TouchableOpacity style={styles.addButton} onPress={() => setShowAddModal(true)}>
            <Plus size={18} color="#FFFFFF" />
            <Text style={styles.addButtonText}>Add Item</Text>
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

      {/* Add Menu Item Modal */}
      <AddMenuItem 
        visible={showAddModal}
        onClose={() => setShowAddModal(false)}
        onAddItem={handleAddItem}
        categoriesWithAddOns={categoriesWithAddOns}
        categories={categories.slice(1) as Category[]}
        sizes={sizes}
      />

      {/* Edit Menu Item Modal */}
      <EditMenuItem
        visible={showEditModal}
        onClose={() => setShowEditModal(false)}
        onUpdateItem={handleEditItem}
        currentItem={currentItem}
        categoriesWithAddOns={categoriesWithAddOns}
        categories={categories.slice(1) as Category[]}
        sizes={sizes}
      />

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
              <Trash size={32} color="#F44336" />
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
  }
});

export default ManageMenu;