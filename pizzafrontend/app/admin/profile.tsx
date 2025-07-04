import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { 
  LogOut, 
  Users, 
  Tag,
  Settings,
  ChevronRight 
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { logout } from '../../redux/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_URL } from '@/config';
import { useMemo, useState } from 'react';

// Function to generate initials from name
const getInitials = (name: string): string => {
  if (!name) return 'AD'; // Admin Default

  const words = name.trim().split(' ');
  if (words.length === 1) return words[0].substring(0, 2).toUpperCase();

  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

// Function to generate a consistent color based on name
const generateColorFromName = (name: string): string => {
  if (!name) return '#4F46E5'; // Default admin color

  // Simple hash function for name to generate consistent colors
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }

  // Generate admin-themed colors
  const colorPalette = [
    '#4F46E5', '#10B981', '#8B5CF6', '#0EA5E9', '#6366F1',
    '#EC4899', '#F59E0B', '#06B6D4', '#84CC16', '#F43F5E'
  ];

  const index = Math.abs(hash % colorPalette.length);
  return colorPalette[index];
};

export default function AdminProfile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { name, email, token, role } = useSelector((state: RootState) => state.auth);
  const [isLoading, setIsLoading] = useState(false);
  
  // Generate initials and background color based on name
  const initials = useMemo(() => getInitials(name || ''), [name]);
  const avatarColor = useMemo(() => generateColorFromName(name || ''), [name]);

  const handleLogout = async () => {
    if (isLoading) return; // Prevent multiple clicks
    
    setIsLoading(true);
    try {
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

      } else {
        console.error('Logout failed on the server');
      }
      
      // Redirect to login page
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
      // Even if there's an error, attempt to clear the local state
      await AsyncStorage.removeItem('authState');
      dispatch(logout());
      router.replace('/(auth)/login');
    }
    // No need to reset isLoading as we'll navigate away
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={styles.profile}>
          {/* Name-based avatar with initials */}
          <View style={[styles.avatarContainer, { backgroundColor: avatarColor }]}>
            <Text style={styles.avatarText}>{initials}</Text>
          </View>
          <Text style={styles.name}>{name || 'Admin Name'}</Text>
          <Text style={styles.email}>{email || 'admin@example.com'}</Text>

          {/* Role Badge */}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{role || 'Admin'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          {/* Admin Controls Section */}
          <Text style={styles.sectionTitle}>Admin Controls</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/userPage')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#6366F120' }]}>
              <Users size={20} color="#6366F1" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>Manage Users</Text>
              <Text style={styles.menuItemDescription}>View and update user roles</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('/offerPage')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B20' }]}>
              <Tag size={20} color="#F59E0B" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>Manage Offers</Text>
              <Text style={styles.menuItemDescription}>Create and update discount offers</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>

          {/* Payment & Order Settings Section */}
          <Text style={styles.sectionTitle}>Business Settings</Text>

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => router.push('../BusinessSettings/RestaurantConfiguration')}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#0EA5E920' }]}>
              <Settings size={20} color="#0EA5E9" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={styles.menuItemText}>Business Configuration</Text>
              <Text style={styles.menuItemDescription}>Manage payments, delivery charges, and taxes</Text>
            </View>
            <ChevronRight size={20} color="#9CA3AF" />
          </TouchableOpacity>
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
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: 'transparent',
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
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  avatarText: {
    fontSize: 36,
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
    fontSize: 16,
    color: '#666',
    marginBottom: 8,
  },
  roleBadge: {
    backgroundColor: '#4F46E520',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: 8,
  },
  roleText: {
    color: '#4F46E5',
    fontWeight: '600',
    fontSize: 14,
  },
  content: {
    flex: 1,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 16,
    marginTop: 8,
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