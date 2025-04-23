import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Modal,
  TextInput,
  ScrollView,
  SafeAreaView,
  ActivityIndicator,
  Platform,
  RefreshControl
} from 'react-native';
import {
  Truck,
  Package,
  Filter,
  ChevronDown,
  User,
  MapPin,
  Clock,
  DollarSign,
  Check,
  Calendar,
  Search,
  Info,
  X,
  Edit,
  ChevronRight,
  ShoppingBag
} from 'lucide-react-native';
import { useSelector } from 'react-redux';
import { RootState } from '@/redux/store';
import { API_URL } from '@/config';

// Define proper types for your data
interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  menuItemId?: string;
  size?: string;
  foodType?: string;
  customizations?: any[];
}



interface Address {
  street: string;
  city: string;
  state: string;
  zipCode: string;
  landmark?: string;
}

interface Order {
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

// Update your DeliveryAgent interface to match backend data
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

const AdminOrders = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [detailsModalVisible, setDetailsModalVisible] = useState(false);
  const [updateStatusModalVisible, setUpdateStatusModalVisible] = useState(false);
  const [assignAgentModalVisible, setAssignAgentModalVisible] = useState(false);
  const [filterModalVisible, setFilterModalVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [filters, setFilters] = useState({
    date: '',
    status: '',
    deliveryAgent: ''
  });

  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isProcessing, setIsProcessing] = useState(false);

  // Get auth token from Redux store
  const { token } = useSelector((state: RootState) => state.auth);

  // In your AdminOrders component, replace the mock delivery agents with a state:
  const [deliveryAgents, setDeliveryAgents] = useState<DeliveryAgent[]>([]);

  // Define order status type for better type checking
  type OrderStatus = 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';
  const statusOptions: OrderStatus[] = ['Pending', 'Preparing', 'Out for delivery', 'Delivered', 'Cancelled'];

  // Function to fetch orders from the API
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
      // Build the API URL with any active filters
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


  // Add this function to fetch delivery agents from the backend
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

  // Update the assignDeliveryAgent function:

  const assignDeliveryAgent = async (agentId: string | null, agentName: string) => {
    if (!token || !selectedOrder) return;
    setIsProcessing(true);

    try {
      console.log(`Assigning agent: ${agentName} (ID: ${agentId || 'null'}) to order: ${selectedOrder._id}`);

      const response = await fetch(`${API_URL}/api/admin/orders/${selectedOrder._id}/assign-agent`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          deliveryAgent: agentId,     // ID field - for database references
          deliveryAgentName: agentName // Name field - for display purposes
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Error response:', errorData);
        throw new Error(errorData.message || 'Failed to assign delivery agent');
      }

      const data = await response.json();
      console.log('Assign agent response:', data);

      // Update orders state with new delivery agent
      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, deliveryAgent: agentName, deliveryAgentId: agentId };
        }
        return order;
      });

      setOrders(updatedOrders);
      setAssignAgentModalVisible(false);

      // Update the selected order if details modal is still open
      setSelectedOrder(prevOrder => prevOrder ? {
        ...prevOrder,
        deliveryAgent: agentName,
        deliveryAgentId: agentId
      } : null);

      // Show success message
      // Alert.alert('Success', `Order assigned to ${agentName}`);

      // Refresh orders to get latest data from the server
      setTimeout(() => {
        fetchOrders(currentPage);
      }, 1000);
    } catch (err) {
      console.error('Error assigning delivery agent:', err);
      // Alert.alert('Error', 'Failed to assign delivery agent. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };


  // Fetch orders on component mount and when dependencies change
  useEffect(() => {
    fetchOrders(1);
  }, [fetchOrders]);

  // Add a useEffect to fetch delivery agents when the component mounts
  useEffect(() => {
    fetchDeliveryAgents();
  }, [fetchDeliveryAgents]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    fetchOrders(1, true);
  }, [fetchOrders]);

  // Load more orders when reaching the end of the list
  const handleLoadMore = useCallback(() => {
    if (currentPage < totalPages && !loadingMore && !loading) {
      fetchOrders(currentPage + 1);
    }
  }, [currentPage, totalPages, loadingMore, loading, fetchOrders]);

  // Update order status
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

      // Update orders state with new status
      const updatedOrders = orders.map(order => {
        if (order._id === selectedOrder._id) {
          return { ...order, status };
        }
        return order;
      });

      setOrders(updatedOrders);
      setUpdateStatusModalVisible(false);
      // Update the selected order if details modal is still open
      setSelectedOrder(prevOrder => prevOrder ? { ...prevOrder, status } : null);
    } catch (err) {
      console.error('Error updating order status:', err);
      alert('Failed to update order status. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };

  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1);
    setFilterModalVisible(false);
    fetchOrders(1);
  };

  // Reset filters
  const resetFilters = () => {
    setFilters({
      date: '',
      status: '',
      deliveryAgent: ''
    });
    setSearchQuery('');
    setCurrentPage(1);
    setFilterModalVisible(false);
    fetchOrders(1);
  };

  // Handle search
  const handleSearch = () => {
    setCurrentPage(1);
    fetchOrders(1);
  }

  // Get status color
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'Pending':
        return '#FFA500';
      case 'Preparing':
        return '#3498DB';
      case 'Out for delivery':
        return '#9B59B6';
      case 'Delivered':
        return '#2ECC71';
      case 'Cancelled':
        return '#E74C3C';
      default:
        return '#7F8C8D';
    }
  };

  // Render order item
  const renderOrderItem = ({ item }: { item: Order }) => (
    <TouchableOpacity
      style={styles.orderCard}
      onPress={() => {
        setSelectedOrder(item);
        setDetailsModalVisible(true);
      }}
      activeOpacity={0.7}
    >
      <View style={styles.orderHeader}>
        <View style={styles.orderHeaderLeft}>
          <ShoppingBag size={20} color="#FF6B00" style={styles.orderIcon} />
          <View>
            <Text style={styles.orderCustomerName}>{item.customer}</Text>
            <Text style={styles.orderIdText}>Order #{item.id}</Text>
          </View>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
          <Text style={styles.statusText}>{item.status}</Text>
        </View>
      </View>

      <View style={styles.orderDetails}>
        <View style={styles.detailRow}>
          <Calendar size={16} color="#666" />
          <Text style={styles.detailText}>
            {item.date} • {item.time}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <User size={16} color="#666" />
          <Text style={styles.detailText}>
            Agent: <Text style={styles.detailValue}>{item.deliveryAgent}</Text>
          </Text>
        </View>

        <View style={styles.detailRow}>
          <MapPin size={16} color="#666" />
          <Text style={styles.detailText} numberOfLines={1}>
            {item.address || item.fullAddress}
          </Text>
        </View>

        <View style={styles.detailRow}>
          <DollarSign size={16} color="#666" />
          <Text style={styles.detailText}>
            Total: <Text style={styles.totalAmount}>₹{item.amount.toFixed(2)}</Text>
          </Text>
        </View>

        <View style={styles.orderItems}>
          <Text style={styles.itemsText}>Items: </Text>
          <Text style={styles.itemsValue} numberOfLines={1}>
            {item.items.map((i, index) =>
              `${i.quantity}x ${i.name}${index < item.items.length - 1 ? ", " : ""}`
            )}
          </Text>
        </View>
      </View>

      <View style={styles.orderActions}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            setSelectedOrder(item);
            setUpdateStatusModalVisible(true);
          }}
        >
          <Edit size={16} color="#FF6B00" />
          <Text style={styles.actionButtonText}>Update Status</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.actionButton}
          onPress={(e) => {
            e.stopPropagation();
            setSelectedOrder(item);
            setAssignAgentModalVisible(true);
          }}
        >
          <Truck size={16} color="#FF6B00" />
          <Text style={styles.actionButtonText}>Assign Agent</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.viewDetailsButton}
          onPress={(e) => {
            e.stopPropagation();
            setSelectedOrder(item);
            setDetailsModalVisible(true);
          }}
        >
          <Info size={16} color="#FF6B00" />
          <Text style={styles.actionButtonText}>Details</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  // Render footer component for FlatList (loading indicator)
  const renderFooter = () => {
    if (!loadingMore) return null;

    return (
      <View style={styles.loadingMore}>
        <ActivityIndicator size="small" color="#FF6B00" />
        <Text style={styles.loadingMoreText}>Loading more orders...</Text>
      </View>
    );
  };

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
              // Reset search and fetch all orders
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
          renderItem={renderOrderItem}
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
              <Package size={60} color="#E0E0E0" />
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
      <Modal
        visible={detailsModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setDetailsModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Order Details</Text>
              <TouchableOpacity
                onPress={() => setDetailsModalVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <X size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalBody} showsVerticalScrollIndicator={false}>
                <View style={styles.orderDetailSection}>
                  <Text style={styles.sectionTitle}>Order Information</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Order ID:</Text>
                    <Text style={styles.detailValue}>#{selectedOrder.id}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Date & Time:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.date} at {selectedOrder.time}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Status:</Text>
                    <View style={[styles.statusBadge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                      <Text style={styles.statusText}>{selectedOrder.status}</Text>
                    </View>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Payment Method:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.paymentMethod || 'Not available'}</Text>
                  </View>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Payment Status:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.paymentStatus || 'Not available'}</Text>
                  </View>
                </View>

                <View style={styles.orderDetailDivider} />

                <View style={styles.orderDetailSection}>
                  <Text style={styles.sectionTitle}>Customer Information</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Name:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.customer}</Text>
                  </View>
                  {selectedOrder.customerPhone && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Phone:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.customerPhone}</Text>
                    </View>
                  )}
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Delivery Address:</Text>
                    <Text style={styles.detailValue}>{selectedOrder.address || selectedOrder.fullAddress}</Text>
                  </View>
                  {selectedOrder.notes && (
                    <View style={styles.detailItem}>
                      <Text style={styles.detailLabel}>Delivery Notes:</Text>
                      <Text style={styles.detailValue}>{selectedOrder.notes}</Text>
                    </View>
                  )}
                </View>

                <View style={styles.orderDetailDivider} />

                <View style={styles.orderDetailSection}>
                  <Text style={styles.sectionTitle}>Delivery Information</Text>
                  <View style={styles.detailItem}>
                    <Text style={styles.detailLabel}>Delivery Agent:</Text>
                    <View style={styles.agentBadge}>
                      <User size={14} color="#666" />
                      <Text style={styles.agentBadgeText}>{selectedOrder.deliveryAgent}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.orderDetailDivider} />

                <View style={styles.orderDetailSection}>
                  <Text style={styles.sectionTitle}>Order Items</Text>
                  {selectedOrder.items.map((item, index) => (
                    <View key={index} style={styles.orderItem}>
                      <View style={styles.orderItemHeader}>
                        <Text style={styles.itemName}>{item.name}</Text>
                        <Text style={styles.itemQuantity}>x{item.quantity}</Text>
                      </View>
                      {item.size && item.size !== 'Not Applicable' && (
                        <Text style={styles.itemDetail}>Size: {item.size}</Text>
                      )}
                      {item.foodType && item.foodType !== 'Not Applicable' && (
                        <Text style={styles.itemDetail}>Type: {item.foodType}</Text>
                      )}
                      {item.customizations && item.customizations.length > 0 && (
                        <View style={styles.customizations}>
                          <Text style={styles.customizationsTitle}>Customizations:</Text>
                          {item.customizations.map((custom, idx) => (
                            <Text key={idx} style={styles.customizationItem}>
                              • {custom.name}: {custom.option} (+₹{custom.price})
                            </Text>
                          ))}
                        </View>
                      )}
                      <Text style={styles.itemPrice}>₹{item.price.toFixed(2)}</Text>
                    </View>
                  ))}
                  <View style={styles.orderTotal}>
                    <Text style={styles.orderTotalLabel}>Total Amount:</Text>
                    <Text style={styles.orderTotalValue}>₹{selectedOrder.amount.toFixed(2)}</Text>
                  </View>
                </View>

                <View style={styles.detailsActionButtons}>
                  <TouchableOpacity
                    style={styles.detailsActionButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      setUpdateStatusModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Edit size={16} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.detailsActionButtonText}>Update Status</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={styles.detailsActionButton}
                    onPress={() => {
                      setDetailsModalVisible(false);
                      setAssignAgentModalVisible(true);
                    }}
                    activeOpacity={0.8}
                  >
                    <Truck size={16} color="#FFF" style={{ marginRight: 8 }} />
                    <Text style={styles.detailsActionButtonText}>Assign Agent</Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Update Status Modal */}
      <Modal
        visible={updateStatusModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setUpdateStatusModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.smallerModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Update Order Status</Text>
              <TouchableOpacity
                onPress={() => setUpdateStatusModalVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <X size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <View style={styles.orderSummary}>
                  <ShoppingBag size={24} color="#FF6B00" />
                  <View style={styles.orderSummaryText}>
                    <Text style={styles.orderSummaryId}>Order #{selectedOrder.id}</Text>
                    <Text style={styles.orderSummaryCustomer}>{selectedOrder.customer}</Text>
                  </View>
                </View>

                <View style={styles.currentStatusContainer}>
                  <Text style={styles.currentStatusLabel}>Current Status:</Text>
                  <View style={[styles.statusBadgeLarge, { backgroundColor: getStatusColor(selectedOrder.status) }]}>
                    <Text style={styles.statusTextLarge}>{selectedOrder.status}</Text>
                  </View>
                </View>

                <Text style={styles.statusSelectionLabel}>Select New Status:</Text>

                <View style={styles.statusOptions}>
                  {statusOptions.map((status, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.statusOption,
                        {
                          backgroundColor: selectedOrder.status === status
                            ? '#F5F5F5'
                            : getStatusColor(status),
                          opacity: selectedOrder.status === status ? 0.5 : 1
                        }
                      ]}
                      onPress={() => updateOrderStatus(status)}
                      disabled={selectedOrder.status === status || isProcessing}
                      activeOpacity={0.8}
                    >
                      <Text style={[
                        styles.statusOptionText,
                        selectedOrder.status === status && { color: '#666' }
                      ]}>
                        {status}
                      </Text>
                      {selectedOrder.status === status && (
                        <Check size={18} color="#666" />
                      )}
                    </TouchableOpacity>
                  ))}
                </View>

                <View style={styles.statusActionButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setUpdateStatusModalVisible(false)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {isProcessing && (
                  <View style={styles.loadingOverlay}>
                    <View style={styles.loaderContainer}>
                      <ActivityIndicator size="large" color="#FF6B00" />
                      <Text style={styles.loaderText}>Updating...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Assign Agent Modal */}
      <Modal
        visible={assignAgentModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setAssignAgentModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.smallerModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Assign Delivery Agent</Text>
              <TouchableOpacity
                onPress={() => setAssignAgentModalVisible(false)}
                style={styles.closeButton}
                activeOpacity={0.7}
              >
                <X size={22} color="#333" />
              </TouchableOpacity>
            </View>

            {selectedOrder && (
              <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
                <View style={styles.orderSummary}>
                  <ShoppingBag size={24} color="#FF6B00" />
                  <View style={styles.orderSummaryText}>
                    <Text style={styles.orderSummaryId}>Order #{selectedOrder.id}</Text>
                    <Text style={styles.orderSummaryCustomer}>{selectedOrder.customer}</Text>
                  </View>
                </View>

                <View style={styles.currentAgentContainer}>
                  <Text style={styles.currentAgentLabel}>Current Agent:</Text>
                  <View style={styles.currentAgentValue}>
                    <User size={16} color="#666" style={{ marginRight: 8 }} />
                    <Text style={styles.currentAgentText} numberOfLines={1}>{selectedOrder.deliveryAgent}</Text>
                  </View>
                </View>

                <Text style={styles.agentSelectionLabel}>Select Delivery Agent:</Text>

                {/* Inside your Assign Agent Modal */}
                <View style={styles.agentOptions}>
                  {deliveryAgents.map((agent, index) => (
                    <TouchableOpacity
                      key={agent._id}
                      style={[
                        styles.agentOption,
                        selectedOrder.deliveryAgent === agent.name && styles.agentOptionSelected
                      ]}
                      onPress={() => assignDeliveryAgent(agent._id, agent.name)}
                      disabled={selectedOrder.deliveryAgent === agent.name || isProcessing}
                      activeOpacity={0.8}
                    >
                      <View style={styles.agentOptionLeft}>
                        <User size={18} color={selectedOrder.deliveryAgent === agent.name ? "#FF6B00" : "#666"} />
                        <Text style={[
                          styles.agentOptionText,
                          selectedOrder.deliveryAgent === agent.name && styles.agentOptionTextSelected
                        ]} numberOfLines={1}>
                          {agent.name}
                        </Text>
                      </View>
                      {selectedOrder.deliveryAgent === agent.name && (
                        <Check size={18} color="#FF6B00" />
                      )}
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[
                      styles.agentOption,
                      selectedOrder.deliveryAgent === "Unassigned" && styles.agentOptionSelected
                    ]}
                    onPress={() => assignDeliveryAgent(null, "Unassigned")} // Use null instead of empty string
                    disabled={selectedOrder.deliveryAgent === "Unassigned" || isProcessing}
                    activeOpacity={0.8}
                  >
                    <View style={styles.agentOptionLeft}>
                      <User size={18} color={selectedOrder.deliveryAgent === "Unassigned" ? "#FF6B00" : "#666"} />
                      <Text style={[
                        styles.agentOptionText,
                        selectedOrder.deliveryAgent === "Unassigned" && styles.agentOptionTextSelected
                      ]}>
                        Unassigned
                      </Text>
                    </View>
                    {selectedOrder.deliveryAgent === "Unassigned" && (
                      <Check size={18} color="#FF6B00" />
                    )}
                  </TouchableOpacity>
                </View>

                <View style={styles.agentActionButtons}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setAssignAgentModalVisible(false)}
                    disabled={isProcessing}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                </View>

                {isProcessing && (
                  <View style={styles.loadingOverlay}>
                    <View style={styles.loaderContainer}>
                      <ActivityIndicator size="large" color="#FF6B00" />
                      <Text style={styles.loaderText}>Assigning agent...</Text>
                    </View>
                  </View>
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal
        visible={filterModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setFilterModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={[styles.modalContent, styles.smallerModal]}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Orders</Text>
              <TouchableOpacity onPress={() => setFilterModalVisible(false)}>
                <X size={20} color="#000" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody} contentContainerStyle={styles.modalBodyContent}>
              <View style={styles.filterOption}>
                <Text style={styles.filterLabel}>Status:</Text>
                <View style={styles.statusFilterOptions}>
                  {statusOptions.map((status, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.statusFilterOption,
                        filters.status === status && {
                          backgroundColor: getStatusColor(status),
                          borderColor: getStatusColor(status)
                        }
                      ]}
                      onPress={() => setFilters({
                        ...filters,
                        status: filters.status === status ? '' : status
                      })}
                    >
                      <Text style={[
                        styles.statusFilterText,
                        filters.status === status && { color: '#FFF' }
                      ]}>
                        {status}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              <View style={styles.filterOption}>
                <Text style={styles.filterLabel}>Delivery Agent:</Text>
                <ScrollView
                  style={styles.agentFilterScrollContainer}
                  nestedScrollEnabled={true}
                  showsVerticalScrollIndicator={true}
                >
                  {deliveryAgents.map((agent, index) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.agentFilterOption,
                        filters.deliveryAgent === agent.name && styles.agentFilterOptionSelected
                      ]}
                      onPress={() => setFilters({
                        ...filters,
                        deliveryAgent: filters.deliveryAgent === agent.name ? '' : agent.name
                      })}
                    >
                      <User size={14} color={filters.deliveryAgent === agent.name ? "#FF6B00" : "#666"} />
                      <Text
                        style={[
                          styles.agentFilterText,
                          filters.deliveryAgent === agent.name && { color: '#FF6B00' }
                        ]}
                        numberOfLines={1}
                      >
                        {agent.name}
                      </Text>
                    </TouchableOpacity>
                  ))}

                  <TouchableOpacity
                    style={[
                      styles.agentFilterOption,
                      filters.deliveryAgent === "Unassigned" && styles.agentFilterOptionSelected
                    ]}
                    onPress={() => setFilters({
                      ...filters,
                      deliveryAgent: filters.deliveryAgent === "Unassigned" ? '' : "Unassigned"
                    })}
                  >
                    <User size={14} color={filters.deliveryAgent === "Unassigned" ? "#FF6B00" : "#666"} />
                    <Text
                      style={[
                        styles.agentFilterText,
                        filters.deliveryAgent === "Unassigned" && { color: '#FF6B00' }
                      ]}
                      numberOfLines={1}
                    >
                      Unassigned
                    </Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>

              <View style={styles.filterActions}>
                <TouchableOpacity
                  style={[styles.filterActionButton, styles.resetButton]}
                  onPress={resetFilters}
                >
                  <Text style={styles.filterActionButtonText}>Reset</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.filterActionButton, styles.applyButton]}
                  onPress={applyFilters}
                >
                  <Text style={[styles.filterActionButtonText, styles.applyButtonText]}>Apply</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  // Base styles
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

  // Search and filter styles
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

  // Order card styles
  ordersList: {
    padding: 16,
    paddingBottom: 20,
  },
  orderCard: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  orderIcon: {
    marginRight: 10,
  },
  orderCustomerName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderIdText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 50,
  },
  statusText: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 12,
  },
  orderDetails: {
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  detailText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#666',
    flex: 1,
  },
  detailValue: {
    color: '#1F2937',
    fontWeight: '500',
  },
  totalAmount: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  orderItems: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  itemsText: {
    fontSize: 14,
    color: '#666',
  },
  itemsValue: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  orderActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: '#F2F2F2',
    paddingTop: 12,
    marginTop: 4,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButtonText: {
    marginLeft: 4,
    fontSize: 13,
    color: '#FF6B00',
    fontWeight: '500',
  },

  // Empty list styles
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

  // Error container
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

  // Loading
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

  // Modal styles - consolidated
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingTop: Platform.OS === 'ios' ? 40 : 20,
  },
  modalContent: {
    backgroundColor: '#fff',
    margin: 20,
    borderRadius: 10,
    width: '90%',
    alignSelf: 'center',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  smallerModal: {
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 16,
  },
  modalBodyContent: {
    paddingBottom: 20,
  },

  // Order detail styles
  orderDetailSection: {
    marginBottom: 20,
  },
  orderDetailDivider: {
    height: 8,
    backgroundColor: '#F5F5F5',
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailItem: {
    marginBottom: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  orderItem: {
    borderBottomWidth: 1,
    borderBottomColor: '#F2F2F2',
    paddingVertical: 12,
  },
  orderItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  itemName: {
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
  },
  itemDetail: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  customizations: {
    marginTop: 4,
    paddingLeft: 2,
  },
  customizationsTitle: {
    fontSize: 13,
    color: '#666',
    marginBottom: 2,
  },
  customizationItem: {
    fontSize: 12,
    color: '#666',
    marginLeft: 8,
  },
  itemQuantity: {
    fontSize: 14,
    color: '#666',
    marginLeft: 10,
  },
  itemPrice: {
    fontSize: 14,
    color: '#FF6B00',
    fontWeight: '500',
    marginTop: 4,
  },
  orderTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#EEE',
  },
  orderTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
  },
  orderTotalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#FF6B00',
  },
  detailsActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
    marginBottom: 24,
  },
  detailsActionButton: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 14,
    borderRadius: 10,
    marginHorizontal: 6,
  },
  detailsActionButtonText: {
    color: '#FFF',
    fontWeight: '600',
  },

  // Status modal styles
  statusModalContent: {
    paddingBottom: 20,
  },
  currentStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  currentStatusLabel: {
    fontSize: 15,
    color: '#666',
    marginRight: 10,
  },
  statusBadgeLarge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 50,
  },
  statusTextLarge: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 14,
  },
  statusSelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  statusOptions: {
    marginBottom: 20,
  },
  statusOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginBottom: 10,
  },
  statusOptionText: {
    color: '#FFF',
    fontWeight: '500',
    fontSize: 15,
  },

  // Agent modal styles
  agentModalContent: {
    paddingBottom: 20,
  },
  currentAgentContainer: {
    marginBottom: 24,
  },
  currentAgentLabel: {
    fontSize: 15,
    color: '#666',
    marginBottom: 8,
  },
  currentAgentValue: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    width: '100%',
  },
  currentAgentText: {
    fontSize: 15,
    color: '#1F2937',
    fontWeight: '500',
    flex: 1,
    flexShrink: 1,
  },
  agentSelectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  agentOptions: {
    marginBottom: 20,
  },
  agentOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#F5F5F5',
    marginBottom: 10,
    width: '100%',
  },
  agentOptionSelected: {
    backgroundColor: '#FFE0CC',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  agentOptionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    flexShrink: 1,
  },
  agentOptionText: {
    marginLeft: 10,
    fontSize: 15,
    color: '#1F2937',
    flex: 1,
    flexShrink: 1,
  },
  agentOptionTextSelected: {
    color: '#FF6B00',
    fontWeight: '500',
  },

  // Filter modal styles
  filterOption: {
    marginBottom: 16,
  },
  filterLabel: {
    fontSize: 14,
    color: '#555',
    marginBottom: 4,
  },
  statusFilterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginHorizontal: -4,
    marginTop: 8,
  },
  statusFilterOption: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 50,
    borderWidth: 1,
    borderColor: '#E5E5E5',
    marginHorizontal: 4,
    marginBottom: 8,
  },
  statusFilterText: {
    fontSize: 14,
    color: '#666',
  },
  agentFilterScrollContainer: {
    maxHeight: 200,
    width: '100%',
  },
  agentFilterOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#F8F9FA',
    borderRadius: 8,
    marginBottom: 8,
    width: '100%',
  },
  agentFilterOptionSelected: {
    backgroundColor: '#FFE0CC',
    borderWidth: 1,
    borderColor: '#FF6B00',
  },
  agentFilterText: {
    marginLeft: 10,
    fontSize: 14,
    color: '#1F2937',
    flex: 1,
    flexShrink: 1,
  },
  filterActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
  },
  filterActionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  resetButton: {
    backgroundColor: '#f0f0f0',
    marginRight: 8,
  },
  applyButton: {
    backgroundColor: '#FF6B00',
  },
  applyButtonText: {
    color: '#fff',
  },
  filterActionButtonText: {
    fontWeight: '500',
  },

  // Action buttons and common elements
  statusActionButtons: {
    marginTop: 20,
  },
  agentActionButtons: {
    marginTop: 20,
  },
  cancelButton: {
    backgroundColor: '#F5F5F5',
    paddingVertical: 12,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 15,
  },

  // Loading indicator
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  loaderContainer: {
    backgroundColor: '#FFF',
    padding: 20,
    borderRadius: 10,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  loaderText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    fontWeight: '500',
  },

  // Order summary
  orderSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F8F9FA',
    padding: 16,
    borderRadius: 10,
    marginBottom: 16,
  },
  orderSummaryText: {
    marginLeft: 12,
  },
  orderSummaryId: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  orderSummaryCustomer: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginTop: 4,
  },
  agentBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  agentBadgeText: {
    marginLeft: 6,
    color: '#1F2937',
    fontWeight: '500',
  },
});

export default AdminOrders;