import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  RefreshControl
} from 'react-native';
import { Filter, Search, X, ShoppingBag } from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { API_URL } from '@/config';

import OrderCard from '../component/admin/manageOrder/orderCard';
import OrderDetailsModal from '../component/admin/manageOrder/orderDetailsModal';
import UpdateStatusModal from '../component/admin/manageOrder/UpdateStatusModal';
import AssignAgentModal from '../component/admin/manageOrder/AssignAgentModal';
import FilterModal from '../component/admin/manageOrder/FilterModal';

// Define types (these should match the types in orderDetailsModal.tsx)
export interface AddOnOption {
  name: string;
  option?: string;
  price: number;
}

export interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  menuItemId?: string;
  size?: string;
  foodType?: string;
  basePrice?: number;
  totalItemPrice?: number;
  customizations?: AddOnOption[];
  addOns?: AddOnOption[];
  toppings?: AddOnOption[];
  specialInstructions?: string;
}

export interface Order {
  id: string;
  _id: string;
  customer: string;
  status: string;
  deliveryAgent: string;
  date: string;
  time: string;
  amount: number;
  items: OrderItem[];
  address: string;
  fullAddress?: string;
  notes: string;
  paymentMethod?: string;
  paymentStatus?: string;
  statusUpdates?: Array<{
    status: string;
    time: string;
    note: string;
  }>;
  customerPhone?: string;
}

interface DeliveryAgent {
  _id: string;
  name: string;
  email: string;
  role: string;
}

interface OrdersApiResponse {
  orders: Order[];
  page: number;
  pages: number;
  total: number;
}

type OrderStatus = 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const [filters, setFilters] = useState({
    date: '',
    status: '',
    deliveryAgent: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);

  const statusOptions: OrderStatus[] = ['Pending', 'Preparing', 'Out for delivery', 'Delivered', 'Cancelled'];

  const { token } = useSelector((state: RootState) => state.auth);

  // Function to fetch detailed order information
  const fetchOrderDetails = async (orderId: string) => {
    try {
      if (!token) return;

      const response = await fetch(`${API_URL}/api/orders/${orderId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch order details');
      }

      const data = await response.json();
      console.log("Raw API response:", JSON.stringify(data, null, 2));

      // Transform the data to match OrderDetailsModal's expected format
      const formattedOrder: Order = {
        id: data.orderNumber,
        _id: data._id,
        customer: data.customerName,
        status: data.status,
        deliveryAgent: data.deliveryAgentName,
        date: new Date(data.date).toISOString().split('T')[0],
        time: data.time,
        amount: data.amount,
        items: data.items.map((item: any): OrderItem => ({
          name: item.name || "Unknown Item", // Add fallback
          quantity: item.quantity || 1,
          price: item.price || 0,
          menuItemId: item.menuItemId || "",
          basePrice: item.basePrice || item.price || 0,
          size: item.size || "Regular",
          foodType: item.foodType || "Not Applicable",
          // Include all customization details
          customizations: Array.isArray(item.customizations) ? item.customizations : [],
          addOns: Array.isArray(item.addOns) ? item.addOns : [],
          toppings: Array.isArray(item.toppings) ? item.toppings : [],
          specialInstructions: item.specialInstructions || "",
          totalItemPrice: item.totalItemPrice || item.price || 0
        })),
        address: data.fullAddress,
        fullAddress: data.fullAddress,
        notes: data.notes || '',
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        customerPhone: data.customerPhone
      };

      console.log("Formatted order:", JSON.stringify(formattedOrder, null, 2));

      setSelectedOrder(formattedOrder);
      setDetailsModalVisible(true);
    } catch (err) {
      console.error('Error fetching order details:', err);
      alert('Failed to load order details. Please try again.');
    }
  };

  const fetchOrders = useCallback(async (page = 1, refresh = false) => {
    if (!token) {
      setError('Authentication required');
      setLoading(false);
      return;
    }

    if (refresh) {
      setRefreshing(true);
    } else if (page === 1) {
      setLoading(true);
    } else {
      setLoadingMore(true);
    }

    try {
      let url = `${API_URL}/api/orders?page=${page}`;

      if (filters.status || filters.date || filters.deliveryAgent) {
        url = `${API_URL}/api/orders/filter?page=${page}`;

        if (filters.status) {
          url += `&status=${filters.status}`;
        }

        if (filters.date) {
          url += `&date=${filters.date}`;
        }

        if (filters.deliveryAgent) {
          url += `&deliveryAgent=${filters.deliveryAgent}`;
        }
      }

      if (searchQuery) {
        url = `${API_URL}/api/orders/search?query=${searchQuery}`;
      }

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const data: OrdersApiResponse = await response.json();

      if (refresh || page === 1) {
        setOrders(data.orders);
      } else {
        setOrders(prev => [...prev, ...data.orders]);
      }

      setCurrentPage(data.page);
      setTotalPages(data.pages);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      setError('Failed to load orders. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
      setLoadingMore(false);
    }
  }, [token, filters, searchQuery]);

  const fetchDeliveryAgents = useCallback(async () => {
    if (!token) return;

    try {
      const response = await fetch(`${API_URL}/api/admin/delivery-agents`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch delivery agents');
      }

      const data = await response.json();
      setDeliveryAgents(data);
    } catch (err) {
      console.error('Error fetching delivery agents:', err);
    }
  }, [token]);

  const assignDeliveryAgent = async (agentId: string | null, agentName: string) => {
    if (!token || !selectedOrder) return;
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_URL}/api/orders/${selectedOrder._id}/delivery-agent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deliveryAgentId: agentId,
          deliveryAgentName: agentName
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to assign delivery agent');
      }

      const data = await response.json();

      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, deliveryAgent: agentName, deliveryAgentId: agentId };
        }
        return order;
      });

      setOrders(updatedOrders);
      setSelectedOrder(prevOrder => prevOrder ? {
        ...prevOrder,
        deliveryAgent: agentName
      } : null);

      setTimeout(() => {
        fetchOrders(currentPage);
      }, 1000);
    } catch (err) {
      console.error('Error assigning delivery agent:', err);
      alert('Failed to assign delivery agent. ' + (err instanceof Error ? err.message : 'Please try again.'));
    } finally {
      setIsProcessing(false);
    }
  };

  const updateOrderStatus = async (status: OrderStatus) => {
    if (!token || !selectedOrder) return;
    setIsProcessing(true);

    try {
      const response = await fetch(`${API_URL}/api/orders/${selectedOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          note: `Status updated to ${status}`
        })
      });

      if (!response.ok) {
        throw new Error('Failed to update order status');
      }

      const data = await response.json();

      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, status };
        }
        return order;
      });

      setOrders(updatedOrders);
      setSelectedOrder(prevOrder => prevOrder ? { ...prevOrder, status } : null);
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  const applyFilters = () => {
    setCurrentPage(1);
    fetchOrders(1);
  };

  const resetFilters = () => {
    setFilters({
      date: '',
      status: '',
      deliveryAgent: ''
    });
    setSearchQuery('');
    setCurrentPage(1);
    fetchOrders(1);
  };

  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrders(1);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending': return '#FFA500';
      case 'Preparing': return '#3498DB';
      case 'Out for delivery': return '#9B59B6';
      case 'Delivered': return '#2ECC71';
      case 'Cancelled': return '#E74C3C';
      default: return '#7F8C8D';
    }
  };

  const onRefresh = useCallback(() => {
    fetchOrders(1, true);
  }, [fetchOrders]);

  const handleLoadMore = useCallback(() => {
    if (currentPage < totalPages && !loadingMore && !loading) {
      fetchOrders(currentPage + 1);
    }
  }, [currentPage, totalPages, loadingMore, loading, fetchOrders]);

  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#FF6B00" />
        <Text style={styles.loadingMoreText}>Loading more orders...</Text>
      </View>
    );
  };

  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  useEffect(() => {
    fetchDeliveryAgents();
  }, [fetchDeliveryAgents]);

  // Modal state management
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [updateStatusModalVisible, setUpdateStatusModalVisible] = useState(false);
  const [assignAgentModalVisible, setAssignAgentModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Orders Management</Text>
      </View>

      {/* Search and Filter Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#888" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search orders..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            onSubmitEditing={handleSearch}
            returnKeyType="search"
          />
          {searchQuery ? (
            <TouchableOpacity onPress={() => {
              setSearchQuery('');
              fetchOrders(1);
            }}>
              <X size={18} color="#888" />
            </TouchableOpacity>
          ) : null}
        </View>

        <TouchableOpacity
          style={styles.filterButton}
          onPress={() => setFilterModalVisible(true)}
        >
          <Filter size={20} color="#FFF" />
          <Text style={styles.filterButtonText}>Filter</Text>
        </TouchableOpacity>
      </View>

      {/* Filter status bar */}
      {(filters.date || filters.status || filters.deliveryAgent) && (
        <View style={styles.activeFiltersBar}>
          <Text style={styles.activeFiltersText}>
            Filters:
            {filters.date ? ` Date: ${filters.date}` : ''}
            {filters.status ? ` Status: ${filters.status}` : ''}
            {filters.deliveryAgent ? ` Agent: ${filters.deliveryAgent}` : ''}
          </Text>
          <TouchableOpacity onPress={resetFilters} style={styles.clearFiltersButton}>
            <Text style={styles.clearFiltersText}>Clear All</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Error message */}
      {error && (
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchOrders(1)}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Orders list */}
      {loading && orders.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading orders...</Text>
        </View>
      ) : (
        <FlatList
          data={orders}
          renderItem={({ item }) => (
            <OrderCard
              order={item}
              onPress={() => {
                // Changed to use fetchOrderDetails instead of directly setting the order
                fetchOrderDetails(item._id);
              }}
              onUpdateStatus={() => {
                setSelectedOrder(item);
                setUpdateStatusModalVisible(true);
              }}
              onAssignAgent={() => {
                setSelectedOrder(item);
                setAssignAgentModalVisible(true);
              }}
              getStatusColor={getStatusColor}
            />
          )}
          keyExtractor={(item) => item._id}
          contentContainerStyle={styles.ordersList}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={["#FF6B00"]} />
          }
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          ListEmptyComponent={() => (
            <View style={styles.emptyListContainer}>
              <ShoppingBag size={60} color="#E0E0E0" />
              <Text style={styles.emptyListText}>No orders found</Text>
              <Text style={styles.emptyListSubtext}>
                {searchQuery || filters.date || filters.status || filters.deliveryAgent
                  ? "Try adjusting your filters"
                  : "Orders will appear here when customers place them"}
              </Text>
              {(searchQuery || filters.date || filters.status || filters.deliveryAgent) && (
                <TouchableOpacity style={styles.resetSearchButton} onPress={resetFilters}>
                  <Text style={styles.resetSearchButtonText}>Reset Filters</Text>
                </TouchableOpacity>
              )}
            </View>
          )}
        />
      )}

      {/* Modals */}
      <OrderDetailsModal
        visible={detailsModalVisible}
        order={selectedOrder}
        onClose={() => setDetailsModalVisible(false)}
        onUpdateStatus={() => {
          setDetailsModalVisible(false);
          setUpdateStatusModalVisible(true);
        }}
        onAssignAgent={() => {
          setDetailsModalVisible(false);
          setAssignAgentModalVisible(true);
        }}
        getStatusColor={getStatusColor}
      />

      <UpdateStatusModal
        visible={updateStatusModalVisible}
        order={selectedOrder}
        onClose={() => setUpdateStatusModalVisible(false)}
        onUpdateStatus={updateOrderStatus}
        getStatusColor={getStatusColor}
        isProcessing={isProcessing}
      />

      <AssignAgentModal
        visible={assignAgentModalVisible}
        order={selectedOrder}
        deliveryAgents={deliveryAgents}
        onClose={() => setAssignAgentModalVisible(false)}
        onAssignAgent={assignDeliveryAgent}
        isProcessing={isProcessing}
      />

      <FilterModal
        visible={filterModalVisible}
        filters={filters}
        deliveryAgents={deliveryAgents}
        statusOptions={statusOptions}
        onClose={() => setFilterModalVisible(false)}
        onApply={applyFilters}
        onReset={resetFilters}
        onFilterChange={(filterType, value) => setFilters({ ...filters, [filterType]: value })}
        getStatusColor={getStatusColor}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 50,
    paddingBottom: 15,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
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
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: '100%',
    fontSize: 15,
    color: '#333',
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 10,
    height: 44,
  },
  filterButtonText: {
    color: '#fff',
    marginLeft: 6,
    fontWeight: '600',
  },
  activeFiltersBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
    backgroundColor: '#FFE0CC',
  },
  activeFiltersText: {
    flex: 1,
    fontSize: 13,
    color: '#FF6B00',
  },
  clearFiltersButton: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  clearFiltersText: {
    fontSize: 13,
    color: '#FF6B00',
    fontWeight: '600',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    padding: 16,
    marginBottom: 10,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    color: '#D32F2F',
    fontSize: 14,
    flex: 1,
  },
  retryButton: {
    backgroundColor: '#C62828',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  retryButtonText: {
    color: '#FFF',
    fontSize: 12,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  ordersList: {
    padding: 16,
    paddingBottom: 20,
  },
  loadingMore: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  loadingMoreText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
  },
  emptyListContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
    paddingTop: 60,
  },
  emptyListText: {
    fontSize: 18,
    color: '#333',
    fontWeight: '600',
    marginTop: 16,
  },
  emptyListSubtext: {
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
  },
  resetSearchButton: {
    marginTop: 16,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
  },
  resetSearchButtonText: {
    color: '#666',
    fontWeight: '500',
  },
});

export default AdminOrders;