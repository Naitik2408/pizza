import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image } from 'react-native';
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

export default function AdminProfile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { name, email, token, role } = useSelector((state: RootState) => state.auth);

  const handleLogout = async () => {
    try {
      const response = await fetch(`${API_URL}/api/users/logout`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Clear AsyncStorage
        await AsyncStorage.removeItem('authState');

        // Clear Redux store
        dispatch(logout());

        // Redirect to login page
        router.replace('/(auth)/login');
      } else {
        console.error('Logout failed on the server');
      }
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Dashboard</Text>
        <View style={styles.profile}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&q=80' }}
            style={styles.avatar}
          />
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
            onPress={() => router.push('../BusinessSettings/BusinessSettings')}
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
        >
          <LogOut size={20} color="#FF4B4B" />
          <Text style={styles.logoutText}>Log Out</Text>
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