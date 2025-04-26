import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import { API_URL } from '@/config';
import { ChevronLeft, UserCircle, UserCog, Check, Filter, Search } from 'lucide-react-native';
import { useRouter } from 'expo-router';

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
}

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

const UserManagement = () => {
  const router = useRouter();
  const { token } = useSelector((state: RootState) => state.auth);
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [filterRole, setFilterRole] = useState<string | null>(null);
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // Fetch all users
  const fetchUsers = useCallback(async (showRefreshing = false) => {
    if (!token) return;

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`${API_URL}/api/admin/users`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch users');
      }

      const data = await response.json();
      setUsers(data);
      applyFilters(data, searchQuery, filterRole);
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, searchQuery, filterRole]);

  // Apply filters to users
  const applyFilters = (data: User[], query: string, role: string | null) => {
    let result = [...data];
    
    // Apply search query filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(user => 
        user.name.toLowerCase().includes(lowerQuery) || 
        user.email.toLowerCase().includes(lowerQuery)
      );
    }
    
    // Apply role filter
    if (role) {
      result = result.filter(user => user.role === role);
    }
    
    setFilteredUsers(result);
  };

  // Handle search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applyFilters(users, text, filterRole);
  };

  // Handle role filter
  const handleFilterByRole = (role: string | null) => {
    setFilterRole(role);
    applyFilters(users, searchQuery, role);
  };

  // Update user role
  const updateUserRole = async (userId: string, newRole: string) => {
    if (!token) return;

    try {
      setUpdatingUserId(userId);

      const response = await fetch(`${API_URL}/api/admin/users/${userId}/role`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ role: newRole })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update user role');
      }

      const updatedUser = await response.json();
      
      // Update local state with the updated user
      const updatedUsers = users.map(user => 
        user._id === userId ? updatedUser : user
      );
      
      setUsers(updatedUsers);
      applyFilters(updatedUsers, searchQuery, filterRole);
      
      Alert.alert('Success', `User role updated to ${newRole}`);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      Alert.alert('Error', err.message || 'Failed to update user role');
    } finally {
      setUpdatingUserId(null);
      setModalVisible(false);
    }
  };

  // Load users on component mount
  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    fetchUsers(true);
  }, [fetchUsers]);

  // Render role badge with appropriate color
  const renderRoleBadge = (role: string) => {
    let bgColor;
    let textColor;

    switch (role) {
      case 'admin':
        bgColor = '#4F46E520';
        textColor = '#4F46E5';
        break;
      case 'delivery':
        bgColor = '#F59E0B20';
        textColor = '#F59E0B';
        break;
      default:
        bgColor = '#10B98120';
        textColor = '#10B981';
    }

    return (
      <View style={[styles.roleBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.roleText, { color: textColor }]}>{role}</Text>
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render user item
  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity 
      style={styles.userCard}
      onPress={() => {
        setSelectedUser(item);
        setModalVisible(true);
      }}
    >
      <View style={styles.userCardContent}>
        <View style={styles.userIcon}>
          <UserCircle size={30} color="#4B5563" />
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.createdAt && (
            <Text style={styles.userDate}>Joined: {formatDate(item.createdAt)}</Text>
          )}
        </View>
        {renderRoleBadge(item.role)}
      </View>
    </TouchableOpacity>
  );

  // Render loading state
  if (loading && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading users...</Text>
      </SafeAreaView>
    );
  }

  // Render error state
  if (error && !refreshing) {
    return (
      <SafeAreaView style={[styles.safeArea, styles.centerContent]}>
        <Text style={styles.errorText}>{error}</Text>
        <TouchableOpacity style={styles.retryButton} onPress={() => fetchUsers()}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <View style={{ width: 24 }} />
      </View>
      
      {/* Search and Filter */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Search size={20} color="#9CA3AF" style={styles.searchIcon} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search users..."
            value={searchQuery}
            onChangeText={handleSearch}
            placeholderTextColor="#9CA3AF"
          />
        </View>
        
        <TouchableOpacity 
          style={styles.filterButton}
          onPress={() => {
            Alert.alert(
              'Filter by Role',
              'Select role to filter by:',
              [
                { text: 'Show All', onPress: () => handleFilterByRole(null) },
                { text: 'Admin', onPress: () => handleFilterByRole('admin') },
                { text: 'Delivery', onPress: () => handleFilterByRole('delivery') },
                { text: 'Customer', onPress: () => handleFilterByRole('customer') },
                { text: 'Cancel', style: 'cancel' }
              ]
            );
          }}
        >
          <Filter size={20} color="#333" />
        </TouchableOpacity>
      </View>
      
      {/* Filter badge */}
      {filterRole && (
        <View style={styles.filterBadgeContainer}>
          <View style={styles.filterBadge}>
            <Text style={styles.filterBadgeText}>Role: {filterRole}</Text>
            <TouchableOpacity onPress={() => handleFilterByRole(null)}>
              <Text style={styles.filterClearText}>×</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* User list */}
      <FlatList
        data={filteredUsers}
        renderItem={renderUserItem}
        keyExtractor={(item) => item._id}
        contentContainerStyle={styles.listContainer}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={["#FF6B00"]}
            tintColor="#FF6B00"
          />
        }
        ListEmptyComponent={() => (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              {searchQuery || filterRole 
                ? 'No users match the current filters' 
                : 'No users found'}
            </Text>
          </View>
        )}
      />

      {/* Role Update Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Update User Role</Text>
            
            {selectedUser && (
              <View style={styles.userDetails}>
                <UserCircle size={40} color="#4B5563" />
                <View style={styles.userDetailsText}>
                  <Text style={styles.userDetailsName}>{selectedUser.name}</Text>
                  <Text style={styles.userDetailsEmail}>{selectedUser.email}</Text>
                  {renderRoleBadge(selectedUser.role)}
                </View>
              </View>
            )}
            
            <Text style={styles.modalSubtitle}>Select new role:</Text>
            
            <View style={styles.roleOptions}>
              <TouchableOpacity 
                style={[
                  styles.roleOption, 
                  selectedUser?.role === 'customer' && styles.activeRoleOption
                ]}
                onPress={() => {
                  if (selectedUser && selectedUser.role !== 'customer') {
                    updateUserRole(selectedUser._id, 'customer');
                  } else {
                    setModalVisible(false);
                  }
                }}
                disabled={updatingUserId !== null}
              >
                <View style={styles.roleOptionContent}>
                  <UserCircle size={20} color="#10B981" />
                  <Text style={styles.roleOptionText}>Customer</Text>
                </View>
                {selectedUser?.role === 'customer' && (
                  <Check size={20} color="#10B981" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.roleOption, 
                  selectedUser?.role === 'delivery' && styles.activeRoleOption
                ]}
                onPress={() => {
                  if (selectedUser && selectedUser.role !== 'delivery') {
                    updateUserRole(selectedUser._id, 'delivery');
                  } else {
                    setModalVisible(false);
                  }
                }}
                disabled={updatingUserId !== null}
              >
                <View style={styles.roleOptionContent}>
                  <UserCircle size={20} color="#F59E0B" />
                  <Text style={styles.roleOptionText}>Delivery Agent</Text>
                </View>
                {selectedUser?.role === 'delivery' && (
                  <Check size={20} color="#F59E0B" />
                )}
              </TouchableOpacity>
              
              <TouchableOpacity 
                style={[
                  styles.roleOption, 
                  selectedUser?.role === 'admin' && styles.activeRoleOption
                ]}
                onPress={() => {
                  if (selectedUser && selectedUser.role !== 'admin') {
                    updateUserRole(selectedUser._id, 'admin');
                  } else {
                    setModalVisible(false);
                  }
                }}
                disabled={updatingUserId !== null}
              >
                <View style={styles.roleOptionContent}>
                  <UserCog size={20} color="#4F46E5" />
                  <Text style={styles.roleOptionText}>Admin</Text>
                </View>
                {selectedUser?.role === 'admin' && (
                  <Check size={20} color="#4F46E5" />
                )}
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalButtons}>
              {updatingUserId ? (
                <ActivityIndicator size="small" color="#FF6B00" />
              ) : (
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8F9FA',
    paddingTop: STATUSBAR_HEIGHT,
  },
  centerContent: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorText: {
    marginTop: 10,
    marginBottom: 20,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 30,
  },
  retryButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 4,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  searchContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
    marginRight: 12,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    height: 40,
    color: '#111827',
    fontSize: 16,
  },
  filterButton: {
    width: 40,
    height: 40,
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterBadgeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#fff',
  },
  filterBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterBadgeText: {
    color: '#3B82F6',
    fontSize: 14,
    fontWeight: '500',
  },
  filterClearText: {
    color: '#3B82F6',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  listContainer: {
    padding: 16,
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  userCardContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  userIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  userInfo: {
    flex: 1,
    marginLeft: 12,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
  },
  userDate: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  roleBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  roleText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 16,
  },
  userDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
    padding: 16,
    backgroundColor: '#F9FAFB',
    borderRadius: 12,
  },
  userDetailsText: {
    marginLeft: 12,
  },
  userDetailsName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  userDetailsEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 2,
    marginBottom: 6,
  },
  modalSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#4B5563',
    marginBottom: 12,
  },
  roleOptions: {
    marginBottom: 20,
  },
  roleOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderRadius: 12,
    backgroundColor: '#F9FAFB',
    marginBottom: 8,
  },
  activeRoleOption: {
    backgroundColor: '#F3F4F6',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  roleOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  roleOptionText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#111827',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#4B5563',
  },
});

export default UserManagement;