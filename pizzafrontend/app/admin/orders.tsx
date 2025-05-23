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
  RefreshControl,
  Alert,
  Modal
} from 'react-native';
import { Filter, Search, X, ShoppingBag, AlertCircle } from 'lucide-react-native';
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
  hasCustomizations?: boolean;
  customizationCount?: number; // Added to match the 'admin' format
}

export interface Order {
  id: string;
  _id: string;
  customer: string;
  status: string;
  deliveryAgent: string;
  date: string;
  time: string;
  createdAt?: string; // Added to match baseFormat
  amount: number;
  items: OrderItem[];
  address: string;
  fullAddress?: string;
  customerPhone?: string;
  notes: string;
  paymentMethod?: string;
  paymentStatus?: string;
  statusUpdates?: Array<{
    status: string;
    time: string;
    note: string;
  }>;
  totalItemsCount?: number; // Added to match the 'admin' format
}

interface DeliveryAgent {
  _id: string;
  name: string;
  email: string;
  role: string;
  isOnline?: boolean;
  lastSeen?: string;
}

interface OrdersApiResponse {
  orders: Order[];
  page: number;
  pages: number;
  total: number;
}

// Define the type for the OrderDetailsModal props
interface OrderDetailsModalProps {
  visible: boolean;
  order: Order;
  onClose: () => void;
  onUpdateStatus: () => void;
  onAssignAgent: () => void;
  onUpdatePayment: () => void; // Add this prop to fix the type error
  getStatusColor: (status: string) => string;
  getPaymentStatusColor: (status: string) => string;
}

// Define the type for the UpdatePaymentStatusModal props
interface UpdatePaymentStatusModalProps {
  visible: boolean;
  order: Order | null;
  onClose: () => void;
  onUpdatePaymentStatus: (status: string) => Promise<void>;
  getPaymentStatusColor: (status: string) => string;
  isProcessing: boolean;
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch order details');
      }

      const data = await response.json();

      // The response is now formatted by the backend's adminDetail formatter
      const formattedOrder: Order = {
        id: data.orderNumber || data.id,
        _id: data._id,
        customer: data.customerName,
        status: data.status,
        deliveryAgent: data.deliveryAgentName,
        date: data.date,
        time: data.time,
        createdAt: data.createdAt,
        amount: data.amount,
        items: data.items.map((item: any): OrderItem => ({
          name: item.name || "Unknown Item",
          quantity: item.quantity || 1,
          price: item.price || 0,
          menuItemId: item.menuItemId || "",
          basePrice: item.basePrice || item.price || 0,
          size: item.size || "Regular",
          foodType: item.foodType || "Not Applicable",
          customizations: Array.isArray(item.customizations) ? item.customizations : [],
          addOns: Array.isArray(item.addOns) ? item.addOns : [],
          toppings: Array.isArray(item.toppings) ? item.toppings : [],
          specialInstructions: item.specialInstructions || "",
          totalItemPrice: item.totalItemPrice || item.price || 0,
          hasCustomizations: item.hasCustomizations || false,
          customizationCount: item.customizationCount || 0
        })),
        address: data.fullAddress,
        fullAddress: data.fullAddress,
        notes: data.notes || '',
        paymentMethod: data.paymentMethod,
        paymentStatus: data.paymentStatus,
        customerPhone: data.customerPhone,
        statusUpdates: data.statusUpdates || [],
        totalItemsCount: data.totalItemsCount
      };

      setSelectedOrder(formattedOrder);
      setDetailsModalVisible(true);
    } catch (err) {
      console.error('Error fetching order details:', err);
      const errorMessage = err instanceof Error ? err.message : 'Failed to load order details';
      Alert.alert('Error', `${errorMessage}. Please try again.`);
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

      console.log('Fetching orders from:', url);

      const response = await fetch(url, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch orders');
      }

      const data: OrdersApiResponse = await response.json();
      console.log(`Received ${data.orders?.length || 0} orders from API`);

      // Process orders to ensure they have all required fields
      const processedOrders = data.orders.map(order => ({
        ...order,
        // Ensure these fields exist
        items: Array.isArray(order.items) ? order.items : [],
        status: order.status || 'Unknown',
        customerPhone: order.customerPhone || 'N/A',
        totalItemsCount: order.totalItemsCount || (order.items?.length || 0)
      }));

      if (refresh || page === 1) {
        setOrders(processedOrders);
      } else {
        setOrders(prev => [...prev, ...processedOrders]);
      }

      setCurrentPage(data.page);
      setTotalPages(data.pages);
      setError(null);
    } catch (err) {
      console.error('Error fetching orders:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(`Failed to load orders: ${errorMessage}`);
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
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch delivery agents');
      }

      const data = await response.json();

      // Process agents to ensure they have all required fields
      const agentsWithOnlineStatus = data.map((agent: DeliveryAgent) => ({
        ...agent,
        isOnline: agent.isOnline !== undefined ? agent.isOnline : Math.random() > 0.5, // Fallback for demo
        lastSeen: agent.lastSeen || new Date(Date.now() - Math.random() * 86400000 * 3).toISOString() // Fallback for demo
      }));

      setDeliveryAgents(agentsWithOnlineStatus);
    } catch (err) {
      console.error('Error fetching delivery agents:', err);
      // We don't set a global error here to avoid blocking the main UI
    }
  }, [token]);

  // Updated to use the unified order endpoint
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

      // Update both the order list and selected order with the new delivery agent info
      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, deliveryAgent: agentName };
        }
        return order;
      });

      setOrders(updatedOrders);
      setSelectedOrder(prevOrder => prevOrder ? {
        ...prevOrder,
        deliveryAgent: agentName
      } : null);

      // Show success message
      Alert.alert(
        'Success',
        `Order has been ${agentId ? 'assigned to' : 'unassigned from'} ${agentName}`,
        [{ text: 'OK' }]
      );

      // Fetch orders again to ensure consistency with backend
      setTimeout(() => {
        fetchOrders(currentPage);
      }, 1000);
    } catch (err) {
      console.error('Error assigning delivery agent:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', `Failed to assign delivery agent: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // Updated to use the unified status update endpoint
  const updateOrderStatus = async (status: OrderStatus) => {
    if (!token || !selectedOrder) return;
    setIsProcessing(true);

    try {
      // Using the unified status update endpoint
      const response = await fetch(`${API_URL}/api/orders/${selectedOrder._id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          note: `Status updated to ${status} by admin`
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle specific error responses
        if (response.status === 400) {
          throw new Error(errorData.message || `Cannot update order to ${status} status`);
        } else if (response.status === 403) {
          throw new Error('You do not have permission to update this order');
        } else {
          throw new Error(errorData.message || 'Failed to update order status');
        }
      }

      const data = await response.json();

      // Update the local state
      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, status };
        }
        return order;
      });

      setOrders(updatedOrders);
      setSelectedOrder(prevOrder => prevOrder ? { 
        ...prevOrder, 
        status,
        statusUpdates: prevOrder.statusUpdates ? [
          ...prevOrder.statusUpdates,
          {
            status,
            time: new Date().toISOString(),
            note: `Status updated to ${status} by admin`
          }
        ] : []
      } : null);
      
      // Show success message
      Alert.alert('Success', `Order status updated to ${status}`, [{ text: 'OK' }]);
      
    } catch (err) {
      console.error('Error updating order status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', `Failed to update order status: ${errorMessage}`);
    } finally {
      setIsProcessing(false);
    }
  };

  // New function to update payment status
  const updatePaymentStatus = async (paymentStatus: string) => {
    if (!token || !selectedOrder) return;
    setIsProcessing(true);

    try {
      // Using the new payment status update endpoint
      const response = await fetch(`${API_URL}/api/orders/${selectedOrder._id}/payment`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          paymentStatus,
          paymentDetails: {
            updatedBy: 'admin',
            updatedAt: new Date().toISOString()
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update payment status');
      }

      const data = await response.json();

      // Update the local state
      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, paymentStatus };
        }
        return order;
      });

      setOrders(updatedOrders);
      setSelectedOrder(prevOrder => prevOrder ? { 
        ...prevOrder, 
        paymentStatus,
        statusUpdates: prevOrder.statusUpdates ? [
          ...prevOrder.statusUpdates,
          {
            status: prevOrder.status,
            time: new Date().toISOString(),
            note: `Payment status updated to ${paymentStatus} by admin`
          }
        ] : []
      } : null);
      
      // Show success message
      Alert.alert('Success', `Payment status updated to ${paymentStatus}`, [{ text: 'OK' }]);
      
    } catch (err) {
      console.error('Error updating payment status:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      Alert.alert('Error', `Failed to update payment status: ${errorMessage}`);
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

  const getStatusColor = (status: string): string => {
    switch (status) {
      case 'Pending': return '#FFA500';
      case 'Preparing': return '#3498DB';
      case 'Out for delivery': return '#9B59B6';
      case 'Delivered': return '#2ECC71';
      case 'Cancelled': return '#E74C3C';
      default: return '#7F8C8D';
    }
  };

  const getPaymentStatusColor = (status: string): string => {
    switch (status) {
      case 'Completed': return '#2ECC71';
      case 'Failed': return '#E74C3C';
      case 'Pending': return '#FFA500';
      case 'Refunded': return '#3498DB';
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
  const [updatePaymentModalVisible, setUpdatePaymentModalVisible] = useState(false);

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
                // Use fetchOrderDetails to get detailed order info
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

      {/* Order Details Modal */}
      {selectedOrder && (
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
          onUpdatePayment={() => {
            setDetailsModalVisible(false);
            setUpdatePaymentModalVisible(true);
          }}
          getStatusColor={getStatusColor}
          getPaymentStatusColor={getPaymentStatusColor}
        />
      )}

      {/* Update Status Modal */}
      {selectedOrder && (
        <UpdateStatusModal
          visible={updateStatusModalVisible}
          order={selectedOrder}
          onClose={() => setUpdateStatusModalVisible(false)}
          onUpdateStatus={updateOrderStatus}
          getStatusColor={getStatusColor}
          isProcessing={isProcessing}
        />
      )}

      {/* Assign Agent Modal */}
      {selectedOrder && (
        <AssignAgentModal
          visible={assignAgentModalVisible}
          order={selectedOrder}
          deliveryAgents={deliveryAgents}
          onClose={() => setAssignAgentModalVisible(false)}
          onAssignAgent={assignDeliveryAgent}
          isProcessing={isProcessing}
        />
      )}

      {/* Filter Modal */}
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

      {/* Payment Status Modal */}
      {selectedOrder && (
        <UpdatePaymentStatusModal
          visible={updatePaymentModalVisible}
          order={selectedOrder}
          onClose={() => setUpdatePaymentModalVisible(false)}
          onUpdatePaymentStatus={updatePaymentStatus}
          getPaymentStatusColor={getPaymentStatusColor}
          isProcessing={isProcessing}
        />
      )}
    </SafeAreaView>
  );
};

// Create a new component for updating payment status with proper types
const UpdatePaymentStatusModal = ({ 
  visible, 
  order, 
  onClose, 
  onUpdatePaymentStatus, 
  getPaymentStatusColor,
  isProcessing 
}: UpdatePaymentStatusModalProps) => {
  const paymentStatusOptions = ['Pending', 'Completed', 'Failed', 'Refunded'];
  
  return (
    <Modal
      animationType="slide"
      transparent={true}
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={modalStyles.centeredView}>
        <View style={modalStyles.modalView}>
          <View style={modalStyles.modalHeader}>
            <Text style={modalStyles.modalTitle}>Update Payment Status</Text>
            <TouchableOpacity onPress={onClose} disabled={isProcessing}>
              <X size={24} color="#333" />
            </TouchableOpacity>
          </View>
          
          <Text style={modalStyles.orderInfo}>
            Order #{order?.id}
            {order?.paymentMethod ? ` • ${order.paymentMethod}` : ''}
          </Text>

          <Text style={modalStyles.currentStatus}>
            Current payment status: 
            <Text style={{ 
              color: getPaymentStatusColor(order?.paymentStatus || 'Pending'),
              fontWeight: 'bold'
            }}>
              {' '}{order?.paymentStatus || 'Pending'}
            </Text>
          </Text>
          
          <View style={modalStyles.divider} />
          
          <Text style={modalStyles.sectionTitle}>Select new payment status</Text>
          
          {isProcessing ? (
            <View style={modalStyles.loadingContainer}>
              <ActivityIndicator size="large" color="#FF6B00" />
              <Text style={modalStyles.loadingText}>Updating payment status...</Text>
            </View>
          ) : (
            <>
              <ScrollView style={modalStyles.optionsContainer}>
                {paymentStatusOptions.map((status) => (
                  <TouchableOpacity
                    key={status}
                    style={[
                      modalStyles.statusOption,
                      { borderColor: getPaymentStatusColor(status) }
                    ]}
                    onPress={() => onUpdatePaymentStatus(status)}
                    disabled={status === order?.paymentStatus}
                  >
                    <View style={[
                      modalStyles.statusDot,
                      { backgroundColor: getPaymentStatusColor(status) }
                    ]} />
                    <Text style={modalStyles.statusText}>{status}</Text>
                    {status === order?.paymentStatus && (
                      <Text style={modalStyles.currentText}>(Current)</Text>
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              
              <TouchableOpacity
                style={modalStyles.closeButton}
                onPress={onClose}
              >
                <Text style={modalStyles.closeButtonText}>Cancel</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    </Modal>
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

const modalStyles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalView: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: 'white',
    borderRadius: 20,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  orderInfo: {
    fontSize: 16,
    color: '#555',
    marginBottom: 8,
  },
  currentStatus: {
    fontSize: 16,
    color: '#555',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E0E0E0',
    marginVertical: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 12,
  },
  optionsContainer: {
    maxHeight: 280,
    marginBottom: 16,
  },
  statusOption: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderWidth: 1,
    borderRadius: 10,
    marginBottom: 10,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  statusText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  currentText: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  closeButton: {
    backgroundColor: '#F0F0F0',
    padding: 14,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 8,
  },
  closeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#333',
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});

export default AdminOrders;