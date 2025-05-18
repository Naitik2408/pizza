import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Alert, ActivityIndicator, Switch, Platform } from 'react-native';
import { Settings, Bell, LogOut, Check, X, AlertTriangle, Truck, FileText, User as UserIcon, Wifi, WifiOff } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { logout } from '../../redux/slices/authSlice';
import { API_URL } from '@/config';

// Define the delivery partner details interface
interface DeliveryDetails {
  vehicleType: string;
  status: 'pending' | 'approved' | 'rejected';
  isVerified: boolean;
  verificationNotes?: string;
  isOnline?: boolean;
}

export default function DeliveryProfile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { name, email, token } = useSelector((state: RootState) => state.auth);

  // State for delivery partner details
  const [deliveryDetails, setDeliveryDetails] = useState<DeliveryDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOnline, setIsOnline] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  // Fetch delivery partner status on component mount
  useEffect(() => {
    const fetchDeliveryStatus = async () => {
      try {
        if (!token) {
          setError('Authentication required. Please log in again.');
          setLoading(false);
          return;
        }

        const response = await fetch(`${API_URL}/api/users/delivery/status`, {
          headers: {
            Authorization: `Bearer ${token}`
          }
        });

        if (!response.ok) {
          const errorData = await response.json();
          throw new Error(errorData.message || 'Failed to fetch delivery status');
        }

        const data = await response.json();
        setDeliveryDetails(data);

        // Set initial online status from the API
        if (data.isOnline !== undefined) {
          setIsOnline(data.isOnline);
        }
      } catch (err) {
        console.error('Error fetching delivery status:', err);
        setError(err instanceof Error ? err.message : 'An unknown error occurred');
      } finally {
        setLoading(false);
      }
    };

    fetchDeliveryStatus();
  }, [token]);

  const toggleOnlineStatus = async (newStatus: boolean) => {
    // Only allow status toggle if account is approved
    if (deliveryDetails?.status !== 'approved') {
      Alert.alert(
        'Action Not Available',
        'You can toggle online status only after your account is approved.'
      );
      return;
    }

    try {
      setUpdatingStatus(true);

      const response = await fetch(`${API_URL}/api/users/delivery/status/toggle`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ isOnline: newStatus })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update status');
      }

      // Update local state with new status
      setIsOnline(newStatus);

      // Update deliveryDetails object with new status
      if (deliveryDetails) {
        setDeliveryDetails({
          ...deliveryDetails,
          isOnline: newStatus
        });
      }

      // Show a toast or notification
      Alert.alert(
        'Status Updated',
        `You are now ${newStatus ? 'online' : 'offline'}.`,
        [{ text: 'OK' }],
        { cancelable: true }
      );
    } catch (err) {
      console.error('Error updating online status:', err);
      Alert.alert(
        'Update Failed',
        'Failed to update your status. Please try again.'
      );
      // Revert the switch back to original state
      setIsOnline(!newStatus);
    } finally {
      setUpdatingStatus(false);
    }
  };

  const handleLogout = async () => {
    try {
      // If user is online, set them to offline first
      if (isOnline) {
        setUpdatingStatus(true);
        try {
          // Call the toggle endpoint to set offline
          await fetch(`${API_URL}/api/users/delivery/status/toggle`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`
            },
            body: JSON.stringify({ isOnline: false })
          });

          // Update local state
          setIsOnline(false);

          console.log('Set offline before logout');
        } catch (err) {
          console.error('Failed to set offline before logout:', err);
          // Continue with logout even if setting offline fails
        } finally {
          setUpdatingStatus(false);
        }
      }

      // Now proceed with logout
      const response = await fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        console.log('Logout successful');
        dispatch(logout());
        router.replace('/(auth)/login');
      } else {
        console.error('Logout failed');
        Alert.alert('Logout Failed', 'Unable to log out. Please try again.');
      }
    } catch (error) {
      console.error('Logout error:', error);
      Alert.alert('Error', 'Connection error. Please check your internet connection.');
    }
  };

  // Helper to render verification status badge
  const renderStatusBadge = () => {
    if (!deliveryDetails) return null;

    let badgeColor, badgeText, badgeIcon;

    switch (deliveryDetails.status) {
      case 'approved':
        badgeColor = '#10B981';
        badgeText = 'Approved';
        badgeIcon = <Check size={18} color="white" />;
        break;
      case 'rejected':
        badgeColor = '#EF4444';
        badgeText = 'Rejected';
        badgeIcon = <X size={18} color="white" />;
        break;
      default:
        badgeColor = '#F59E0B';
        badgeText = 'Pending';
        badgeIcon = <AlertTriangle size={18} color="white" />;
    }

    return (
      <View style={[styles.statusBadge, { backgroundColor: badgeColor }]}>
        {badgeIcon}
        <Text style={styles.statusText}>{badgeText}</Text>
      </View>
    );
  };

  // Format vehicle type to display in a more user-friendly way
  const formatVehicleType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Delivery Profile</Text>
        <View style={styles.profile}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&q=80' }}
            style={styles.avatar}
          />
          <Text style={styles.name}>{name || 'Delivery Agent'}</Text>
          <Text style={styles.email}>{email || 'delivery@example.com'}</Text>

          {/* Status Badge */}
          {!loading && deliveryDetails && renderStatusBadge()}
        </View>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#FF6B00" />
          <Text style={styles.loadingText}>Loading your profile...</Text>
        </View>
      ) : error ? (
        <View style={styles.errorContainer}>
          <AlertTriangle size={40} color="#EF4444" />
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={() => router.replace('/(auth)/login')}
          >
            <Text style={styles.retryButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <View style={styles.content}>
          {/* Online/Offline Toggle Section */}
          {deliveryDetails && deliveryDetails.status === 'approved' && (
            <View style={styles.onlineStatusContainer}>
              <View style={styles.onlineStatusContent}>
                <View style={[styles.iconContainer, {
                  backgroundColor: isOnline ? '#10B98120' : '#6B728020'
                }]}>
                  {isOnline ? (
                    <Wifi size={24} color="#10B981" />
                  ) : (
                    <WifiOff size={24} color="#6B7280" />
                  )}
                </View>
                <View style={styles.onlineStatusTextContainer}>
                  <Text style={styles.onlineStatusTitle}>
                    {isOnline ? 'Online' : 'Offline'}
                  </Text>
                  <Text style={styles.onlineStatusDescription}>
                    {isOnline
                      ? 'You are available to receive delivery orders'
                      : 'You will not receive new delivery orders'}
                  </Text>
                </View>
                <Switch
                  value={isOnline}
                  onValueChange={toggleOnlineStatus}
                  disabled={updatingStatus || deliveryDetails.status !== 'approved'}
                  trackColor={{ false: '#D1D5DB', true: '#10B98150' }}
                  thumbColor={isOnline ? '#10B981' : '#9CA3AF'}
                  ios_backgroundColor="#D1D5DB"
                  style={Platform.OS === 'ios' ? styles.iosSwitch : {}}
                />
              </View>
            </View>
          )}

          {/* Delivery Details Section */}
          {deliveryDetails && (
            <View style={styles.detailsSection}>
              <Text style={styles.sectionTitle}>Delivery Details</Text>

              <View style={styles.detailCard}>
                <View style={styles.detailItem}>
                  <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
                    <Truck size={20} color="#3B82F6" />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Vehicle Type</Text>
                    <Text style={styles.detailValue}>
                      {formatVehicleType(deliveryDetails.vehicleType)}
                    </Text>
                  </View>
                </View>

                <View style={styles.detailItem}>
                  <View style={[styles.iconContainer, {
                    backgroundColor: deliveryDetails.isVerified ? '#10B98120' : '#F59E0B20'
                  }]}>
                    <FileText size={20} color={deliveryDetails.isVerified ? '#10B981' : '#F59E0B'} />
                  </View>
                  <View style={styles.detailContent}>
                    <Text style={styles.detailLabel}>Document Verification</Text>
                    <Text style={styles.detailValue}>
                      {deliveryDetails.isVerified ? 'Verified' : 'Pending Verification'}
                    </Text>
                  </View>
                </View>

                {deliveryDetails.status === 'rejected' && deliveryDetails.verificationNotes && (
                  <View style={styles.rejectionNotesContainer}>
                    <Text style={styles.rejectionNotesTitle}>Rejection Reason:</Text>
                    <Text style={styles.rejectionNotesText}>{deliveryDetails.verificationNotes}</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Account Settings Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Account</Text>

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.iconContainer, { backgroundColor: '#FF6B0020' }]}>
                <UserIcon size={20} color="#FF6B00" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Personal Information</Text>
                <Text style={styles.menuItemDescription}>Update your details</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.iconContainer, { backgroundColor: '#F59E0B20' }]}>
                <Bell size={20} color="#F59E0B" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Notifications</Text>
                <Text style={styles.menuItemDescription}>Customize alerts</Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.menuItem}>
              <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
                <Settings size={20} color="#3B82F6" />
              </View>
              <View style={styles.menuItemContent}>
                <Text style={styles.menuItemText}>Account Settings</Text>
                <Text style={styles.menuItemDescription}>Privacy and security</Text>
              </View>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <LogOut size={20} color="#FF4B4B" />
            <Text style={styles.logoutText}>Log Out</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginBottom: 60,
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  profile: {
    alignItems: 'center',
  },
  avatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    marginBottom: 16,
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 40,
    marginTop: 8,
  },
  statusText: {
    color: 'white',
    fontWeight: 'bold',
    marginLeft: 5,
  },
  content: {
    flex: 1,
  },
  onlineStatusContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  onlineStatusContent: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  onlineStatusTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  onlineStatusTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  onlineStatusDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  iosSwitch: {
    transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }],
  },
  loadingContainer: {
    paddingVertical: 50,
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  errorContainer: {
    padding: 30,
    alignItems: 'center',
  },
  errorText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  retryButton: {
    marginTop: 20,
    paddingVertical: 10,
    paddingHorizontal: 20,
    backgroundColor: '#3B82F6',
    borderRadius: 8,
  },
  retryButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  detailsSection: {
    padding: 20,
    paddingBottom: 0,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 16,
  },
  detailCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    marginBottom: 16,
  },
  detailItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  detailContent: {
    marginLeft: 12,
    flex: 1,
  },
  detailLabel: {
    fontSize: 14,
    color: '#666',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginTop: 2,
  },
  rejectionNotesContainer: {
    backgroundColor: '#FEF2F2',
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#EF4444',
  },
  rejectionNotesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#B91C1C',
    marginBottom: 4,
  },
  rejectionNotesText: {
    fontSize: 14,
    color: '#7F1D1D',
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuItemContent: {
    marginLeft: 12,
    flex: 1,
  },
  menuItemText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  menuItemDescription: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginBottom: 40,
    backgroundColor: '#FF4B4B20',
    borderRadius: 12,
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4B4B',
  },
});