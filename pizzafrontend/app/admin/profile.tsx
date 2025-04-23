import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Image, Switch } from 'react-native';
import { Settings, Bell, LogOut, Lock, Moon, UserCircle, Phone, ChevronRight } from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../../redux/store';
import { logout } from '../../redux/slices/authSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useState } from 'react';
import { API_URL } from '@/config';

export default function AdminProfile() {
  const router = useRouter();
  const dispatch = useDispatch();
  const { name, email, token, role } = useSelector((state: RootState) => state.auth);
  const [darkMode, setDarkMode] = useState(false);

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

  const handleChangePassword = () => {
    // router.push('/change-password');
  };

  const toggleTheme = () => {
    setDarkMode(!darkMode);
    // Here you would implement the theme switching logic
    // using a theme context or redux state
  };

  return (
    <ScrollView style={[styles.container, darkMode && styles.darkContainer]}>
      <View style={styles.header}>
        <Text style={[styles.title, darkMode && styles.darkText]}>Admin Profile</Text>
        <View style={styles.profile}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1633332755192-727a05c4013d?w=400&q=80' }}
            style={styles.avatar}
          />
          <Text style={[styles.name, darkMode && styles.darkText]}>{name || 'Admin Name'}</Text>
          <Text style={[styles.email, darkMode && styles.darkTextSecondary]}>{email || 'admin@example.com'}</Text>
          
          {/* Role Badge */}
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{role || 'Super Admin'}</Text>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.section}>
          {/* Account Information */}
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>Account Information</Text>
          
          <TouchableOpacity style={[styles.menuItem, darkMode && styles.darkMenuItem]}>
            <View style={[styles.iconContainer, { backgroundColor: '#4F46E520' }]}>
              <Phone size={20} color="#4F46E5" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, darkMode && styles.darkText]}>Phone Number</Text>
              <Text style={[styles.menuItemDescription, darkMode && styles.darkTextSecondary]}>+1 234 567 8900</Text>
            </View>
            <ChevronRight size={20} color={darkMode ? "#9CA3AF" : "#9CA3AF"} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, darkMode && styles.darkMenuItem]}>
            <View style={[styles.iconContainer, { backgroundColor: '#FB923C20' }]}>
              <UserCircle size={20} color="#FB923C" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, darkMode && styles.darkText]}>Admin Role</Text>
              <Text style={[styles.menuItemDescription, darkMode && styles.darkTextSecondary]}>{role || 'Super Admin'} - Full Access</Text>
            </View>
            <ChevronRight size={20} color={darkMode ? "#9CA3AF" : "#9CA3AF"} />
          </TouchableOpacity>

          {/* Settings */}
          <Text style={[styles.sectionTitle, darkMode && styles.darkText]}>Settings</Text>
          
          <TouchableOpacity 
            style={[styles.menuItem, darkMode && styles.darkMenuItem]}
            onPress={handleChangePassword}
          >
            <View style={[styles.iconContainer, { backgroundColor: '#6366F120' }]}>
              <Lock size={20} color="#6366F1" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, darkMode && styles.darkText]}>Change Password</Text>
              <Text style={[styles.menuItemDescription, darkMode && styles.darkTextSecondary]}>Update your security credentials</Text>
            </View>
            <ChevronRight size={20} color={darkMode ? "#9CA3AF" : "#9CA3AF"} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, darkMode && styles.darkMenuItem]}>
            <View style={[styles.iconContainer, { backgroundColor: '#FF6B0020' }]}>
              <Settings size={20} color="#FF6B00" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, darkMode && styles.darkText]}>Account Settings</Text>
              <Text style={[styles.menuItemDescription, darkMode && styles.darkTextSecondary]}>Privacy and security</Text>
            </View>
            <ChevronRight size={20} color={darkMode ? "#9CA3AF" : "#9CA3AF"} />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.menuItem, darkMode && styles.darkMenuItem]}>
            <View style={[styles.iconContainer, { backgroundColor: '#F59E0B20' }]}>
              <Bell size={20} color="#F59E0B" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, darkMode && styles.darkText]}>Notifications</Text>
              <Text style={[styles.menuItemDescription, darkMode && styles.darkTextSecondary]}>Customize alerts</Text>
            </View>
            <ChevronRight size={20} color={darkMode ? "#9CA3AF" : "#9CA3AF"} />
          </TouchableOpacity>

          {/* Theme Toggle */}
          <View style={[styles.menuItem, darkMode && styles.darkMenuItem]}>
            <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
              <Moon size={20} color="#8B5CF6" />
            </View>
            <View style={styles.menuItemContent}>
              <Text style={[styles.menuItemText, darkMode && styles.darkText]}>Dark Mode</Text>
              <Text style={[styles.menuItemDescription, darkMode && styles.darkTextSecondary]}>Toggle app theme</Text>
            </View>
            <Switch
              value={darkMode}
              onValueChange={toggleTheme}
              trackColor={{ false: '#E5E7EB', true: '#8B5CF680' }}
              thumbColor={darkMode ? '#8B5CF6' : '#f4f3f4'}
            />
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.logoutButton, darkMode && styles.darkLogoutButton]} 
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
  darkContainer: {
    backgroundColor: '#1F2937',
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
  darkText: {
    color: '#F3F4F6',
  },
  darkTextSecondary: {
    color: '#9CA3AF',
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
  darkMenuItem: {
    backgroundColor: '#374151',
    shadowColor: '#000',
    shadowOpacity: 0.2,
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
  darkLogoutButton: {
    backgroundColor: '#FF4B4B30',
  },
  logoutText: {
    marginLeft: 8,
    fontSize: 16,
    fontWeight: '600',
    color: '#FF4B4B',
  },
});