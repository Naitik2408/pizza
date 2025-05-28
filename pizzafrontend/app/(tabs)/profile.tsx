import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, TextInput, ActivityIndicator } from 'react-native';
import { LogOut, User, Check, X, Phone, Mail } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { logout, updateProfile } from '../../redux/slices/authSlice';
import { API_URL } from '@/config';
import { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Function to generate initials from name
const getInitials = (name: string): string => {
  if (!name) return 'GU'; // Guest User default

  const words = name.trim().split(' ');
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Function to generate a consistent color based on name
const generateColorFromName = (name: string): string => {
  if (!name) return '#FF6B00'; // Default color

  // Simple hash function for name to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate vibrant colors
  const colorPalette = [
    '#FF6B00', '#4F46E5', '#10B981', '#F59E0B', '#EC4899',
    '#8B5CF6', '#06B6D4', '#F43F5E', '#84CC16', '#6366F1'
  ];

  const index = Math.abs(hash % colorPalette.length);
  return colorPalette[index];
};

// First, add the updateProfile action to authSlice.ts
// filepath: /home/naitik2408/Contribution/pizza/pizzafrontend/redux/slices/authSlice.ts
// Add this to the reducers:
/*
updateProfile: (state, action: PayloadAction<{
  name?: string;
  email?: string;
  phone?: string;
}>) => {
  if (action.payload.name) state.name = action.payload.name;
  if (action.payload.email) state.email = action.payload.email;
  // We don't update phone here as it's not in the state
  // but it will be handled by the userProfile object
}
*/

export default function ProfileScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { name, email, token, isGuest } = useSelector((state: RootState) => state.auth);

  // Generate initials and background color based on name
  const initials = useMemo(() => getInitials(name || ''), [name]);
  const avatarColor = useMemo(() => generateColorFromName(name || ''), [name]);
  
  // State for profile editing
  const [isEditing, setIsEditing] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingProfile, setIsFetchingProfile] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: name || '',
    email: email || '',
    phone: '',
    _id: ''
  });

  // Fetch user profile from API when component mounts
  useEffect(() => {
    if (!isGuest && token) {
      fetchUserProfile();
    } else {
      // For guest users, just use the data from Redux
      setUserProfile({
        name: name || 'Guest User',
        email: email || 'guest@example.com',
        phone: '',
        _id: ''
      });
    }
  }, [token, isGuest]);

  // Function to fetch user profile from API
  const fetchUserProfile = async () => {
    if (!token) return;
    
    setIsFetchingProfile(true);
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setUserProfile({
          name: data.name || '',
          email: data.email || '',
          phone: data.phone || '',
          _id: data._id || ''
        });
      } else {
        console.error('Failed to fetch user profile');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
    } finally {
      setIsFetchingProfile(false);
    }
  };

  // Function to toggle edit mode
  const toggleEditMode = () => {
    if (isEditing) {
      // Reset form if cancelling
      setUserProfile({
        ...userProfile,
        name: name || '',
        email: email || ''
      });
    }
    setIsEditing(!isEditing);
  };

  // Function to handle input changes
  const handleInputChange = (field: string, value: string) => {
    setUserProfile(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Function to save profile changes
  const saveProfileChanges = async () => {
    if (!userProfile.name || !userProfile.email) {
      Alert.alert('Error', 'Name and email are required');
      return;
    }

    if (isGuest) {
      Alert.alert('Guest Mode', 'Profile updates are not available in guest mode. Please create an account to save your information.');
      setIsEditing(false);
      return;
    }

    setIsLoading(true);
    
    try {
      const response = await fetch(`${API_URL}/api/users/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: userProfile.name,
          email: userProfile.email,
          phone: userProfile.phone
        }),
      });

      if (response.ok) {
        const data = await response.json();
        
        // Update Redux state
        dispatch(updateProfile({
          name: userProfile.name,
          email: userProfile.email
        }));

        // Update AsyncStorage
        const authState = await AsyncStorage.getItem('authState');
        if (authState) {
          const parsedState = JSON.parse(authState);
          await AsyncStorage.setItem('authState', JSON.stringify({
            ...parsedState,
            name: userProfile.name,
            email: userProfile.email
          }));
        }

        Alert.alert('Success', 'Profile updated successfully');
        setIsEditing(false);
      } else {
        const errorData = await response.json();
        Alert.alert('Error', errorData.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      Alert.alert('Error', 'An error occurred while updating your profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      // For guest users, simply log out without API call
      if (isGuest) {
        await AsyncStorage.removeItem('authState');
        dispatch(logout());
        router.replace('/(auth)/login');
        return;
      }

      setIsLoading(true);
      const response = await fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      // Always clear local storage and Redux, even if the API call fails
      await AsyncStorage.removeItem('authState');
      dispatch(logout());
      
      if (response.ok) {
        console.log('Logout successful');
      } else {
        console.error('Logout failed on server');
      }
      
      // Navigate to login screen
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, attempt to clear the local state
      await AsyncStorage.removeItem('authState');
      dispatch(logout());
      router.replace('/(auth)/login');
    } finally {
      setIsLoading(false);
    }
  };

  // Individual field edit components
  const renderFieldEditor = (
    icon: React.ReactNode, 
    label: string, 
    field: keyof typeof userProfile, 
    value: string, 
    placeholder: string, 
    keyboardType: 'default' | 'email-address' | 'phone-pad' = 'default',
    isEditable: boolean = true
  ) => {
    // For fields that shouldn't be edited (like email for existing users)
    const isFieldEditing = isEditing && isEditable;
    
    return (
      <View style={styles.fieldContainer}>
        <View style={styles.fieldRow}>
          <View style={styles.infoIcon}>{icon}</View>
          <View style={styles.fieldContent}>
            <Text style={styles.fieldLabel}>{label}</Text>
            
            {isFieldEditing ? (
              <TextInput
                style={styles.input}
                value={value}
                onChangeText={(text) => handleInputChange(field, text)}
                placeholder={placeholder}
                keyboardType={keyboardType}
              />
            ) : (
              <Text style={styles.fieldValue}>{value || placeholder}</Text>
            )}
          </View>
        </View>
      </View>
    );
  };

  if (isFetchingProfile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#FF6B00" />
        <Text style={styles.loadingText}>Loading profile...</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.title}>Profile</Text>
        </View>
        
        <View style={styles.profile}>
          {/* Name-based avatar with initials */}
          <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>

          <View style={styles.profileInfo}>
            <Text style={styles.name}>{userProfile.name || 'Customer Name'}</Text>
            <Text style={styles.email}>{userProfile.email || 'customer@example.com'}</Text>
            {isGuest && <Text style={styles.guestBadge}>Guest User</Text>}
          </View>
          
          {/* {!isGuest && !isLoading && (
            <TouchableOpacity 
              style={styles.editButton} 
              onPress={toggleEditMode}
            >
              {isEditing ? (
                <>
                  <X size={16} color="#FF6B00" />
                  <Text style={styles.editButtonText}>Cancel</Text>
                </>
              ) : (
                <>
                  <Text style={styles.editButtonText}>Edit</Text>
                </>
              )}
            </TouchableOpacity>
          )} */}
        </View>
      </View>

      <View style={styles.content}>
        {/* Personal Details Section */}
        <View style={styles.detailsSection}>
          <Text style={styles.sectionTitle}>Personal Details</Text>
          
          <View style={styles.fieldsContainer}>
            {renderFieldEditor(
              <User size={20} color="#4F46E5" />,
              'Full Name',
              'name',
              userProfile.name,
              'Not provided'
            )}
            
            {renderFieldEditor(
              <Mail size={20} color="#10B981" />,
              'Email Address',
              'email',
              userProfile.email,
              'Not provided',
              'email-address',
              false // Email shouldn't be editable for existing users
            )}
            
            {/* {renderFieldEditor(
              <Phone size={20} color="#F59E0B" />,
              'Phone Number',
              'phone',
              userProfile.phone,
              'Add a phone number',
              'phone-pad'
            )} */}
          </View>
          
          {isEditing && (
            <TouchableOpacity 
              style={styles.saveButton} 
              onPress={saveProfileChanges}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <View style={styles.saveButtonContent}>
                  <Check size={18} color="#FFF" />
                  <Text style={styles.saveButtonText}>Save Changes</Text>
                </View>
              )}
            </TouchableOpacity>
          )}
        </View>

        <TouchableOpacity 
          style={styles.logoutButton} 
          onPress={handleLogout}
          disabled={isLoading}
        >
          {isLoading ? (
            <ActivityIndicator size="small" color="#FF4B4B" />
          ) : (
            <>
              <LogOut size={20} color="#FF4B4B" />
              <Text style={styles.logoutText}>Log Out</Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    marginBottom: 60,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 8,
    backgroundColor: '#FF6B0015',
  },
  editButtonText: {
    color: '#FF6B00',
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 4,
  },
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingBottom: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  avatarContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: 'white',
  },
  name: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: '#666',
  },
  guestBadge: {
    marginTop: 4,
    fontSize: 12,
    color: '#FF6B00',
    fontWeight: '500',
    backgroundColor: '#FFF0E6',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
  },
  detailsSection: {
    padding: 20,
    paddingTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
  },
  fieldsContainer: {
    marginBottom: 20,
  },
  fieldContainer: {
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  fieldRow: {
    flexDirection: 'row',
    padding: 16,
  },
  fieldContent: {
    flex: 1,
  },
  infoIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f9f9f9',
    marginRight: 16,
  },
  fieldLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  fieldValue: {
    fontSize: 16,
    color: '#333',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
    marginTop: 4,
  },
  saveButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
    marginTop: 10,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  saveButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    marginHorizontal: 20,
    marginTop: 30,
    marginBottom: 20,
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