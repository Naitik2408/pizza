import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  Alert,
  Modal,
  TextInput,
  Platform,
  SectionList,
  ScrollView,
  Image,
  Linking
} from 'react-native';
import { useSelector } from 'react-redux';
import { RootState } from '../../../redux/store';
import { API_URL } from '@/config';
import {
  ChevronLeft,
  UserCircle,
  UserCog,
  Check,
  Search,
  ChevronDown,
  ChevronUp,
  User,
  Users,
  X,
  Car,
  FileText,
  ThumbsUp,
  ThumbsDown,
  Clock,
  ExternalLink
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';

interface DeliveryDetails {
  vehicleType: string;
  aadharCard: string;
  drivingLicense: string;
  isVerified: boolean;
  status: string;
  verificationNotes?: string;
  isOnline?: boolean;
  lastActiveTime?: string;
}

interface User {
  _id: string;
  name: string;
  email: string;
  role: string;
  createdAt: string;
  deliveryDetails?: DeliveryDetails;
}

interface Section {
  title: string;
  data: User[];
  icon: React.ReactNode;
  expanded: boolean;
}

const STATUSBAR_HEIGHT = Platform.OS === 'ios' ? 44 : StatusBar.currentHeight || 0;

// Skeleton component for loading animation
const Skeleton = ({
  width,
  height,
  style,
}: {
  width: number | string;
  height: number | string;
  style?: any;
}) => {
  const opacity = useSharedValue(0.5);

  useEffect(() => {
    opacity.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 750, easing: Easing.ease }),
        withTiming(0.5, { duration: 750, easing: Easing.ease })
      ),
      -1,
      true
    );

    return () => {
      cancelAnimation(opacity);
    };
  }, [opacity]);

  const animatedStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        {
          width,
          height,
          backgroundColor: '#E0E0E0',
          borderRadius: 4,
        },
        animatedStyle,
        style,
      ]}
    />
  );
};

// Skeleton for user card
const UserCardSkeleton = () => (
  <View style={styles.userCard}>
    <View style={styles.userCardContent}>
      <Skeleton width={50} height={50} style={{ borderRadius: 25 }} />
      <View style={{ marginLeft: 12, flex: 1 }}>
        <Skeleton width={150} height={16} style={{ marginBottom: 8 }} />
        <Skeleton width={180} height={14} style={{ marginBottom: 6 }} />
        <Skeleton width={100} height={12} />
      </View>
      <Skeleton width={70} height={24} style={{ borderRadius: 12 }} />
    </View>
  </View>
);

// Skeleton for section header
const SectionHeaderSkeleton = () => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionHeaderLeft}>
      <Skeleton width={20} height={20} style={{ borderRadius: 10, marginRight: 8 }} />
      <Skeleton width={100} height={16} />
      <View style={{ marginLeft: 8 }}>
        <Skeleton width={24} height={16} style={{ borderRadius: 8 }} />
      </View>
    </View>
    <Skeleton width={20} height={20} />
  </View>
);

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
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  // New states for delivery agent details
  const [deliveryDetailsVisible, setDeliveryDetailsVisible] = useState(false);
  const [deliveryUser, setDeliveryUser] = useState<User | null>(null);
  const [verificationNote, setVerificationNote] = useState('');
  const [isApproving, setIsApproving] = useState(false);

  // Document viewer states
  const [documentViewerVisible, setDocumentViewerVisible] = useState(false);
  const [currentDocument, setCurrentDocument] = useState<string | null>(null);
  const [documentTitle, setDocumentTitle] = useState<string>('');

  const [sections, setSections] = useState<Section[]>([
    {
      title: 'Customers',
      data: [],
      icon: <UserCircle size={20} color="#10B981" />,
      expanded: true
    },
    {
      title: 'Delivery Agents',
      data: [],
      icon: <User size={20} color="#F59E0B" />,
      expanded: true
    },
    {
      title: 'Administrators',
      data: [],
      icon: <UserCog size={20} color="#4F46E5" />,
      expanded: true
    }
  ]);

  // Open document in external viewer or browser
  const openDocumentInBrowser = (url: string) => {
    if (url) {
      Linking.canOpenURL(url).then(supported => {
        if (supported) {
          Linking.openURL(url);
        } else {
          Alert.alert("Error", "Unable to open this document");
        }
      });
    }
  };

  // Show document in modal
  const viewDocument = (url: string | undefined, title: string) => {
    if (!url) {
      Alert.alert("Error", "Document URL is not available");
      return;
    }

    setCurrentDocument(url);
    setDocumentTitle(title);
    setDocumentViewerVisible(true);
  };

  // Organize users into sections
  const organizeUsersByRole = useCallback((userList: User[]) => {
    const customers = userList.filter(user => user.role === 'customer');
    const delivery = userList.filter(user => user.role === 'delivery');
    const admins = userList.filter(user => user.role === 'admin');

    // Preserve the expanded state when updating data
    setSections(prevSections => [
      { ...prevSections[0], data: customers },
      { ...prevSections[1], data: delivery },
      { ...prevSections[2], data: admins }
    ]);
  }, []);

  // Toggle section expansion
  const toggleSection = (sectionIndex: number) => {
    setSections(prevSections =>
      prevSections.map((section, idx) =>
        idx === sectionIndex
          ? { ...section, expanded: !section.expanded }
          : section
      )
    );
  };

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

      // If there's a search, apply it
      if (searchQuery) {
        applySearch(data, searchQuery);
      } else {
        // Otherwise, organize by role
        setFilteredUsers(data);
        organizeUsersByRole(data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token, searchQuery, organizeUsersByRole]);

  // Apply search to users
  const applySearch = (data: User[], query: string) => {
    let result = [...data];

    // Apply search query filter
    if (query.trim()) {
      const lowerQuery = query.toLowerCase();
      result = result.filter(user =>
        user.name.toLowerCase().includes(lowerQuery) ||
        user.email.toLowerCase().includes(lowerQuery)
      );
    }

    setFilteredUsers(result);
    organizeUsersByRole(result);
  };

  // Handle search
  const handleSearch = (text: string) => {
    setSearchQuery(text);
    applySearch(users, text);
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

      // If there's a search, apply it
      if (searchQuery) {
        applySearch(updatedUsers, searchQuery);
      } else {
        // Otherwise just update the sections
        organizeUsersByRole(updatedUsers);
      }

      Alert.alert('Success', `User role updated to ${newRole}`);
    } catch (err: any) {
      console.error('Error updating user role:', err);
      Alert.alert('Error', err.message || 'Failed to update user role');
    } finally {
      setUpdatingUserId(null);
      setModalVisible(false);
    }
  };

  // Fetch detailed user information for delivery agent
  const fetchDeliveryAgentDetails = async (userId: string) => {
    if (!token) return;

    try {
      setIsApproving(true);

      // Make the request to the new endpoint
      const response = await fetch(`${API_URL}/api/admin/users/${userId}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to fetch delivery agent details');
      }

      const data = await response.json();
      setDeliveryUser(data);
      setDeliveryDetailsVisible(true);
    } catch (err: any) {
      console.error('Error fetching delivery agent details:', err);
      Alert.alert('Error', err.message || 'Failed to load delivery agent details');
    } finally {
      setIsApproving(false);
    }
  };

  // Handle approval/rejection of delivery agent
  const handleVerificationUpdate = async (userId: string, status: 'approved' | 'rejected') => {
    if (!token) return;

    try {
      setIsApproving(true);

      // Make the request to the new endpoint
      const response = await fetch(`${API_URL}/api/admin/users/${userId}/verification`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          status,
          verificationNotes: verificationNote
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || 'Failed to update verification status');
      }

      const updatedUser = await response.json();

      // Update local state with the updated user
      const updatedUsers = users.map(user =>
        user._id === userId ? updatedUser : user
      );

      setUsers(updatedUsers);
      organizeUsersByRole(updatedUsers);

      Alert.alert(
        'Success',
        `Delivery agent ${status === 'approved' ? 'approved' : 'rejected'} successfully`
      );

      // Close the modal
      setDeliveryDetailsVisible(false);
      setDeliveryUser(null);
      setVerificationNote('');

      // Refresh the users list to ensure we have the latest data
      fetchUsers();
    } catch (err: any) {
      console.error(`Error ${status}ing delivery agent:`, err);
      Alert.alert('Error', err.message || `Failed to ${status} delivery agent`);
    } finally {
      setIsApproving(false);
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

  // Render delivery status badge
  const renderDeliveryStatusBadge = (status: string) => {
    let bgColor;
    let textColor;
    let icon;

    switch (status) {
      case 'approved':
        bgColor = '#10B98120';
        textColor = '#10B981';
        icon = <Check size={14} color="#10B981" style={{ marginRight: 5 }} />;
        break;
      case 'rejected':
        bgColor = '#EF444420';
        textColor = '#EF4444';
        icon = <X size={14} color="#EF4444" style={{ marginRight: 5 }} />;
        break;
      case 'pending':
      default:
        bgColor = '#F59E0B20';
        textColor = '#F59E0B';
        icon = <Clock size={14} color="#F59E0B" style={{ marginRight: 5 }} />;
    }

    return (
      <View style={[styles.deliveryStatusBadge, { backgroundColor: bgColor }]}>
        {icon}
        <Text style={[styles.deliveryStatusText, { color: textColor }]}>
          {status.charAt(0).toUpperCase() + status.slice(1)}
        </Text>
      </View>
    );
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Render user item with special handling for delivery agents
  const renderUserItem = ({ item }: { item: User }) => (
    <TouchableOpacity
      style={styles.userCard}
      onPress={() => {
        if (item.role === 'delivery') {
          fetchDeliveryAgentDetails(item._id);
        } else {
          setSelectedUser(item);
          setModalVisible(true);
        }
      }}
    >
      <View style={styles.userCardContent}>
        <View style={[
          styles.userIcon,
          item.role === 'delivery' &&
          { backgroundColor: item.deliveryDetails?.status === 'pending' ? '#FEF3C7' : '#F3F4F6' }
        ]}>
          {item.role === 'delivery' ? (
            <User size={30} color={item.deliveryDetails?.status === 'pending' ? '#F59E0B' : '#4B5563'} />
          ) : (
            <UserCircle size={30} color="#4B5563" />
          )}
        </View>
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
          {item.createdAt && (
            <Text style={styles.userDate}>Joined: {formatDate(item.createdAt)}</Text>
          )}
        </View>
        <View style={styles.userActions}>
          {item.role === 'delivery' && item.deliveryDetails && (
            renderDeliveryStatusBadge(item.deliveryDetails.status)
          )}
        </View>
      </View>
    </TouchableOpacity>
  );

  // Render section header
  const renderSectionHeader = ({ section }: { section: Section }) => {
    // Find the index of the section in the sections array
    const index = sections.findIndex(s => s.title === section.title);

    // Get the actual data length from the original sections array
    const dataCount = index !== -1 ? sections[index].data.length : 0;

    return (
      <TouchableOpacity
        style={styles.sectionHeader}
        onPress={() => {
          if (index !== -1) {
            toggleSection(index);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.sectionHeaderLeft}>
          {section.icon}
          <Text style={styles.sectionTitle}>{section.title}</Text>
          <View style={styles.userCountBadge}>
            <Text style={styles.userCountText}>{dataCount}</Text>
          </View>
        </View>
        {sections[index].expanded ? (
          <ChevronUp size={20} color="#666" />
        ) : (
          <ChevronDown size={20} color="#666" />
        )}
      </TouchableOpacity>
    );
  };

  // Helper function to capitalize first letter
  const capitalizeFirstLetter = (string: string) => {
    if (!string) return '';
    return string.charAt(0).toUpperCase() + string.slice(1);
  };

  // Render skeleton loading
  const renderSkeletonLoading = () => (
    <>
      {[0, 1, 2].map((sectionIndex) => (
        <React.Fragment key={`section-skeleton-${sectionIndex}`}>
          <SectionHeaderSkeleton />
          {[1, 2, 3].map((itemIndex) => (
            <UserCardSkeleton key={`user-skeleton-${sectionIndex}-${itemIndex}`} />
          ))}
        </React.Fragment>
      ))}
    </>
  );

  // Create sections with collapse functionality
  const renderableSections = sections.map(section => ({
    ...section,
    // If section is not expanded, return empty array instead of the data
    data: section.expanded ? section.data : []
  }));

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />

      {/* Header - Always visible */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Users</Text>
        <View style={{ width: 24 }} />
      </View>

      {/* Search */}
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
      </View>

      {/* Content area with loading state */}
      {loading && !refreshing ? (
        <ScrollView style={styles.contentContainer}>
          {renderSkeletonLoading()}
        </ScrollView>
      ) : error && !refreshing ? (
        <View style={[styles.contentContainer, styles.centerContent]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchUsers()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <SectionList
          sections={renderableSections}
          keyExtractor={(item) => item._id}
          renderItem={renderUserItem}
          renderSectionHeader={renderSectionHeader}
          contentContainerStyle={styles.listContainer}
          stickySectionHeadersEnabled={true}
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
              <Users size={50} color="#D1D5DB" />
              <Text style={styles.emptyText}>
                {searchQuery
                  ? 'No users match your search'
                  : 'No users found'}
              </Text>
            </View>
          )}
          renderSectionFooter={({ section }) => (
            section.data.length === 0 && section.expanded ? (
              <View style={styles.emptySectionContainer}>
                <Text style={styles.emptySectionText}>No {section.title.toLowerCase()} found</Text>
              </View>
            ) : null
          )}
        />
      )}

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

      {/* Document Viewer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={documentViewerVisible}
        onRequestClose={() => setDocumentViewerVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.documentViewerContent}>
            <View style={styles.documentViewerHeader}>
              <Text style={styles.documentViewerTitle}>{documentTitle}</Text>
              <TouchableOpacity
                onPress={() => setDocumentViewerVisible(false)}
                style={styles.closeButton}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            <View style={styles.documentContainer}>
              {currentDocument ? (
                <>
                  <Image
                    source={{ uri: currentDocument }}
                    style={styles.documentImage}
                    resizeMode="contain"
                  />
                  <TouchableOpacity
                    style={styles.openExternalButton}
                    onPress={() => currentDocument && openDocumentInBrowser(currentDocument)}
                  >
                    <ExternalLink size={16} color="#fff" style={{ marginRight: 8 }} />
                    <Text style={styles.openExternalText}>Open in Browser</Text>
                  </TouchableOpacity>
                </>
              ) : (
                <View style={styles.emptyContainer}>
                  <Text style={styles.emptyText}>Document not available</Text>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Delivery Agent Details Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={deliveryDetailsVisible}
        onRequestClose={() => {
          setDeliveryDetailsVisible(false);
          setDeliveryUser(null);
          setVerificationNote('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deliveryDetailsContent}>
            <View style={styles.deliveryDetailsHeader}>
              <Text style={styles.deliveryDetailsTitle}>Delivery Agent Details</Text>
              <TouchableOpacity
                onPress={() => {
                  setDeliveryDetailsVisible(false);
                  setDeliveryUser(null);
                  setVerificationNote('');
                }}
                style={styles.closeButton}
              >
                <X size={24} color="#333" />
              </TouchableOpacity>
            </View>

            {isApproving && !deliveryUser ? (
              <View style={styles.loadingContainer}>
                <ActivityIndicator size="large" color="#FF6B00" />
                <Text style={styles.loadingText}>Loading delivery agent details...</Text>
              </View>
            ) : deliveryUser ? (
              <ScrollView style={styles.deliveryDetailsScroll}>
                {/* Basic Info */}
                <View style={styles.deliveryInfoSection}>
                  <View style={styles.deliveryAgentIconContainer}>
                    <User size={40} color="#4B5563" />
                  </View>
                  <View style={styles.deliveryBasicInfo}>
                    <Text style={styles.deliveryAgentName}>{deliveryUser.name}</Text>
                    <Text style={styles.deliveryAgentEmail}>{deliveryUser.email}</Text>
                    <View style={styles.statusRow}>
                      {renderDeliveryStatusBadge(deliveryUser.deliveryDetails?.status || 'pending')}
                      {deliveryUser.deliveryDetails?.isOnline && (
                        <View style={styles.onlineStatusBadge}>
                          <View style={styles.onlineIndicator} />
                          <Text style={styles.onlineStatusText}>Online</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {/* Registration Details */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Registration Details</Text>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Joined on:</Text>
                    <Text style={styles.detailValue}>{formatDate(deliveryUser.createdAt)}</Text>
                  </View>
                  <View style={styles.detailRow}>
                    <Text style={styles.detailLabel}>Last active:</Text>
                    <Text style={styles.detailValue}>
                      {deliveryUser.deliveryDetails?.lastActiveTime
                        ? formatDate(deliveryUser.deliveryDetails.lastActiveTime)
                        : 'Never active'}
                    </Text>
                  </View>
                </View>

                {/* Vehicle Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Vehicle Information</Text>
                  <View style={styles.vehicleTypeContainer}>
                    <Car size={24} color="#4B5563" style={styles.vehicleIcon} />
                    <Text style={styles.vehicleType}>
                      {capitalizeFirstLetter(deliveryUser.deliveryDetails?.vehicleType || 'Not specified')}
                    </Text>
                  </View>
                </View>

                {/* Document Information */}
                <View style={styles.detailSection}>
                  <Text style={styles.detailSectionTitle}>Submitted Documents</Text>
                  {deliveryUser.deliveryDetails?.aadharCard && (
                    <View style={styles.documentRow}>
                      <View style={styles.documentIcon}>
                        <FileText size={20} color="#4B5563" />
                      </View>
                      <Text style={styles.documentText}>Aadhar Card</Text>
                      <TouchableOpacity
                        style={styles.viewDocButton}
                        onPress={() => viewDocument(deliveryUser.deliveryDetails?.aadharCard, 'Aadhar Card')}
                      >
                        <Text style={styles.viewDocText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                  {deliveryUser.deliveryDetails?.drivingLicense && (
                    <View style={styles.documentRow}>
                      <View style={styles.documentIcon}>
                        <FileText size={20} color="#4B5563" />
                      </View>
                      <Text style={styles.documentText}>Driving License</Text>
                      <TouchableOpacity
                        style={styles.viewDocButton}
                        onPress={() => viewDocument(deliveryUser.deliveryDetails?.drivingLicense, 'Driving License')}
                      >
                        <Text style={styles.viewDocText}>View</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>

                {/* Verification Notes (if rejected or previously commented) */}
                {deliveryUser.deliveryDetails?.verificationNotes && (
                  <View style={styles.detailSection}>
                    <Text style={styles.detailSectionTitle}>Previous Verification Notes</Text>
                    <View style={styles.previousNotesContainer}>
                      <Text style={styles.previousNotesText}>
                        {deliveryUser.deliveryDetails.verificationNotes}
                      </Text>
                    </View>
                  </View>
                )}

                {/* Verification Actions - Only show if not approved */}
                {deliveryUser.deliveryDetails?.status !== 'approved' && (
                  <View style={styles.verificationSection}>
                    <Text style={styles.verificationTitle}>
                      {deliveryUser.deliveryDetails?.status === 'pending'
                        ? 'Verify Delivery Agent'
                        : 'Update Verification Status'}
                    </Text>

                    {/* Notes Input */}
                    <TextInput
                      style={styles.notesInput}
                      placeholder="Add verification notes or feedback..."
                      placeholderTextColor="#9CA3AF"
                      multiline
                      numberOfLines={3}
                      value={verificationNote}
                      onChangeText={setVerificationNote}
                    />

                    {/* Action Buttons */}
                    <View style={styles.verificationActions}>
                      {isApproving ? (
                        <ActivityIndicator size="small" color="#FF6B00" />
                      ) : (
                        <>
                          <TouchableOpacity
                            style={styles.rejectButton}
                            onPress={() => {
                              Alert.alert(
                                'Reject Delivery Agent',
                                'Are you sure you want to reject this delivery agent?',
                                [
                                  {
                                    text: 'Cancel',
                                    style: 'cancel'
                                  },
                                  {
                                    text: 'Reject',
                                    onPress: () => handleVerificationUpdate(deliveryUser._id, 'rejected')
                                  }
                                ]
                              );
                            }}
                            disabled={isApproving}
                          >
                            <ThumbsDown size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.rejectButtonText}>Reject</Text>
                          </TouchableOpacity>

                          <TouchableOpacity
                            style={styles.approveButton}
                            onPress={() => {
                              Alert.alert(
                                'Approve Delivery Agent',
                                'Are you sure you want to approve this delivery agent?',
                                [
                                  {
                                    text: 'Cancel',
                                    style: 'cancel'
                                  },
                                  {
                                    text: 'Approve',
                                    onPress: () => handleVerificationUpdate(deliveryUser._id, 'approved')
                                  }
                                ]
                              );
                            }}
                            disabled={isApproving}
                          >
                            <ThumbsUp size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                            <Text style={styles.approveButtonText}>Approve</Text>
                          </TouchableOpacity>
                        </>
                      )}
                    </View>
                  </View>
                )}

                {/* Status message for approved agents */}
                {deliveryUser.deliveryDetails?.status === 'approved' && (
                  <View style={styles.approvedStatusContainer}>
                    <View style={styles.approvedIconContainer}>
                      <Check size={30} color="#10B981" />
                    </View>
                    <Text style={styles.approvedStatusText}>
                      This delivery agent has been approved and can accept orders.
                    </Text>
                  </View>
                )}
              </ScrollView>
            ) : (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>User details not available</Text>
              </View>
            )}
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
  contentContainer: {
    flex: 1,
    paddingHorizontal: 16,
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    paddingHorizontal: 12,
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
  listContainer: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  // Section header styles
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 8,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 8,
  },
  userCountBadge: {
    backgroundColor: '#F3F4F6',
    borderRadius: 20,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  userCountText: {
    fontSize: 12,
    color: '#4B5563',
    fontWeight: '600',
  },
  userCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 8,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
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
  userActions: {
    alignItems: 'flex-end',
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
  deliveryStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  deliveryStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  emptyContainer: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 16,
  },
  emptySectionContainer: {
    padding: 16,
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
    borderRadius: 8,
    marginBottom: 8,
  },
  emptySectionText: {
    fontSize: 14,
    color: '#6B7280',
    fontStyle: 'italic',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Modal styles
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
  // Delivery agent details modal
  deliveryDetailsContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '90%',
  },
  deliveryDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  deliveryDetailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  closeButton: {
    padding: 5,
  },
  deliveryDetailsScroll: {
    padding: 20,
  },
  deliveryInfoSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 20,
    backgroundColor: '#F9FAFB',
    padding: 16,
    borderRadius: 12,
  },
  deliveryAgentIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  deliveryBasicInfo: {
    flex: 1,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  deliveryAgentName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  deliveryAgentEmail: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 4,
  },
  onlineStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 8,
  },
  onlineIndicator: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#10B981',
    marginRight: 4,
  },
  onlineStatusText: {
    color: '#10B981',
    fontSize: 12,
    fontWeight: '600',
  },
  detailSection: {
    marginBottom: 20,
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  detailSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: '#6B7280',
  },
  detailValue: {
    fontSize: 14,
    color: '#1F2937',
    fontWeight: '500',
  },
  vehicleTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  vehicleIcon: {
    marginRight: 10,
  },
  vehicleType: {
    fontSize: 16,
    color: '#1F2937',
    fontWeight: '500',
  },
  documentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  documentIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  documentText: {
    flex: 1,
    fontSize: 14,
    color: '#1F2937',
  },
  viewDocButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#EFF6FF',
    borderRadius: 8,
  },
  viewDocText: {
    color: '#3B82F6',
    fontSize: 12,
    fontWeight: '600',
  },
  previousNotesContainer: {
    padding: 12,
    backgroundColor: '#FEF3C7',
    borderRadius: 8,
  },
  previousNotesText: {
    fontSize: 14,
    color: '#92400E',
    fontStyle: 'italic',
  },
  verificationSection: {
    padding: 16,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#F3F4F6',
  },
  verificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 12,
  },
  notesInput: {
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    color: '#1F2937',
    backgroundColor: '#F9FAFB',
    minHeight: 80,
    textAlignVertical: 'top',
    marginBottom: 16,
  },
  verificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  rejectButton: {
    flex: 1,
    backgroundColor: '#EF4444',
    paddingVertical: 12,
    borderRadius: 8,
    marginRight: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  rejectButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  approveButton: {
    flex: 1,
    backgroundColor: '#10B981',
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  approveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Document viewer modal
  documentViewerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    height: '90%',
  },
  documentViewerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  documentViewerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#111827',
  },
  documentContainer: {
    flex: 1,
    padding: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  documentImage: {
    width: '100%',
    height: '80%',
    borderRadius: 8,
  },
  openExternalButton: {
    marginTop: 20,
    backgroundColor: '#3B82F6',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  openExternalText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  // Approved status container
  approvedStatusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#DCFCE7',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
  },
  approvedIconContainer: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#10B98120',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  approvedStatusText: {
    flex: 1,
    fontSize: 14,
    color: '#10B981',
    fontWeight: '500',
  }
});

export default UserManagement;