import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator,
  Alert
} from 'react-native';
import {
  ChevronLeft,
  Save,
  CreditCard,
  Landmark,
  Truck,
  Percent,
  IndianRupee
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { API_URL } from '@/config';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';

interface BusinessSettings {
  upiId: string;
  bankDetails: {
    accountName: string;
    accountNumber: string;
    ifscCode: string;
    bankName: string;
  };
  deliveryCharges: {
    fixedCharge: number;
    freeDeliveryThreshold: number;
    applyToAllOrders: boolean;
  };
  taxSettings: {
    gstPercentage: number;
    applyGST: boolean;
  };
  minimumOrderValue: number;
}

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

// Section skeleton
const SectionSkeleton = ({ iconColor }: { iconColor: string }) => (
  <View style={styles.section}>
    <View style={styles.sectionHeader}>
      <View 
        style={[
          styles.iconContainer, 
          { backgroundColor: '#F3F4F6' }
        ]}
      >
        <Skeleton width={20} height={20} style={{ borderRadius: 10 }} />
      </View>
      <Skeleton width={180} height={18} style={{ marginLeft: 12 }} />
    </View>
    
    <View style={styles.formGroup}>
      <Skeleton width={120} height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={48} style={{ borderRadius: 8 }} />
      <Skeleton width={150} height={12} style={{ marginTop: 4 }} />
    </View>
    
    <View style={styles.formGroup}>
      <Skeleton width={140} height={16} style={{ marginBottom: 8 }} />
      <Skeleton width="100%" height={48} style={{ borderRadius: 8 }} />
    </View>
  </View>
);

export default function BusinessSettings() {
  const router = useRouter();
  const { token } = useSelector((state: RootState) => state.auth);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Initial state with default values
  const [settings, setSettings] = useState<BusinessSettings>({
    upiId: 'pizzashop@okaxis',
    bankDetails: {
      accountName: 'Pizza Shop',
      accountNumber: '1234567890',
      ifscCode: 'SBIN0001234',
      bankName: 'State Bank of India'
    },
    deliveryCharges: {
      fixedCharge: 40,
      freeDeliveryThreshold: 500,
      applyToAllOrders: false
    },
    taxSettings: {
      gstPercentage: 5,
      applyGST: true
    },
    minimumOrderValue: 200
  });

  // Fetch settings on component mount
  useEffect(() => {
    const fetchSettings = async () => {
      if (!token) return;

      try {
        setIsLoading(true);
        const response = await fetch(`${API_URL}/api/settings`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
          throw new Error('Failed to fetch settings');
        }

        const data = await response.json();
        
        // Handle backward compatibility with old format
        if (data.deliveryCharges && !data.deliveryCharges.hasOwnProperty('applyToAllOrders')) {
          data.deliveryCharges = {
            fixedCharge: data.deliveryCharges.baseCharge || 40,
            freeDeliveryThreshold: data.deliveryCharges.freeDeliveryThreshold || 500,
            applyToAllOrders: false
          };
        }
        
        setSettings(data);
      } catch (error) {
        console.error('Error fetching settings:', error);
        Alert.alert('Error', 'Failed to load settings. Using default values.');
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [token]);

  // Handle input changes for text fields
  const handleTextChange = (path: string, value: string) => {
    const keys = path.split('.');

    if (keys.length === 1) {
      setSettings({
        ...settings,
        [keys[0]]: value
      });
    } else if (keys.length === 2) {
      const section = keys[0] as keyof BusinessSettings;
      const field = keys[1];

      // Make sure we're working with an object before spreading
      if (typeof settings[section] === 'object' && settings[section] !== null) {
        setSettings({
          ...settings,
          [section]: {
            ...(settings[section] as object),
            [field]: value
          }
        });
      }
    }
  };

  // Handle input changes for number fields
  const handleNumberChange = (path: string, value: string) => {
    const numValue = value === '' ? 0 : parseFloat(value);
    if (isNaN(numValue)) return;

    const keys = path.split('.');

    if (keys.length === 1) {
      setSettings({
        ...settings,
        [keys[0]]: numValue
      });
    } else if (keys.length === 2) {
      const section = keys[0] as keyof BusinessSettings;
      const field = keys[1];

      // Make sure we're working with an object before spreading
      if (typeof settings[section] === 'object' && settings[section] !== null) {
        setSettings({
          ...settings,
          [section]: {
            ...(settings[section] as object),
            [field]: numValue
          }
        });
      }
    }
  };

  // Handle toggle changes
  const handleToggleChange = (path: string, value: boolean) => {
    const keys = path.split('.');

    if (keys.length === 2) {
      const section = keys[0] as keyof BusinessSettings;
      const field = keys[1];

      // Make sure we're working with an object before spreading
      if (typeof settings[section] === 'object' && settings[section] !== null) {
        setSettings({
          ...settings,
          [section]: {
            ...(settings[section] as object),
            [field]: value
          }
        });
      }
    }
  };

  // Save settings - connected to your backend
  const saveSettings = async () => {
    if (!token) return;

    try {
      setIsSaving(true);

      const response = await fetch(`${API_URL}/api/settings`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(settings)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to save settings');
      }

      const updatedSettings = await response.json();
      setSettings(updatedSettings);
      Alert.alert('Success', 'Settings saved successfully');
    } catch (error) {
      console.error('Error saving settings:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  // Render skeleton loading
  const renderSkeletonContent = () => (
    <ScrollView style={styles.content}>
      <SectionSkeleton iconColor="#10B981" />
      <SectionSkeleton iconColor="#3B82F6" />
      <SectionSkeleton iconColor="#F43F5E" />
      <SectionSkeleton iconColor="#8B5CF6" />
      <SectionSkeleton iconColor="#EC4A0A" />
    </ScrollView>
  );

  // Render actual content
  const renderContent = () => (
    <ScrollView style={styles.content}>
      {/* UPI Payment Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#10B98120' }]}>
            <CreditCard size={20} color="#10B981" />
          </View>
          <Text style={styles.sectionTitle}>UPI Payment Settings</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>UPI ID</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter UPI ID"
            value={settings.upiId}
            onChangeText={(value) => handleTextChange('upiId', value)}
          />
          <Text style={styles.helperText}>Example: username@upi</Text>
        </View>
      </View>

      {/* Bank Account Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#3B82F620' }]}>
            <Landmark size={20} color="#3B82F6" />
          </View>
          <Text style={styles.sectionTitle}>Bank Account Settings</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Account Holder Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter account holder name"
            value={settings.bankDetails.accountName}
            onChangeText={(value) => handleTextChange('bankDetails.accountName', value)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Account Number</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter account number"
            keyboardType="numeric"
            value={settings.bankDetails.accountNumber}
            onChangeText={(value) => handleTextChange('bankDetails.accountNumber', value)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>IFSC Code</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter IFSC code"
            autoCapitalize="characters"
            value={settings.bankDetails.ifscCode}
            onChangeText={(value) => handleTextChange('bankDetails.ifscCode', value)}
          />
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Bank Name</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter bank name"
            value={settings.bankDetails.bankName}
            onChangeText={(value) => handleTextChange('bankDetails.bankName', value)}
          />
        </View>
      </View>

      {/* Delivery Charge Settings - UPDATED */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#F43F5E20' }]}>
            <Truck size={20} color="#F43F5E" />
          </View>
          <Text style={styles.sectionTitle}>Delivery Charge Settings</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Fixed Delivery Charge (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter fixed delivery charge"
            keyboardType="numeric"
            value={settings.deliveryCharges.fixedCharge.toString()}
            onChangeText={(value) => handleNumberChange('deliveryCharges.fixedCharge', value)}
          />
          <Text style={styles.helperText}>Fixed charge applied to orders</Text>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Apply delivery charge to all orders</Text>
            <Switch
              trackColor={{ false: "#E5E7EB", true: "#F43F5E50" }}
              thumbColor={settings.deliveryCharges.applyToAllOrders ? "#F43F5E" : "#9CA3AF"}
              ios_backgroundColor="#E5E7EB"
              onValueChange={(value) => handleToggleChange('deliveryCharges.applyToAllOrders', value)}
              value={settings.deliveryCharges.applyToAllOrders}
            />
          </View>
          <Text style={styles.helperText}>
            {settings.deliveryCharges.applyToAllOrders
              ? "Delivery charge will be applied to ALL orders"
              : "Delivery charge will be applied only to orders below the free delivery threshold"}
          </Text>
        </View>

        {!settings.deliveryCharges.applyToAllOrders && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>Free Delivery Threshold (₹)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter threshold amount"
              keyboardType="numeric"
              value={settings.deliveryCharges.freeDeliveryThreshold.toString()}
              onChangeText={(value) => handleNumberChange('deliveryCharges.freeDeliveryThreshold', value)}
            />
            <Text style={styles.helperText}>Orders above this amount will have free delivery</Text>
          </View>
        )}
      </View>

      {/* Tax Settings */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#8B5CF620' }]}>
            <Percent size={20} color="#8B5CF6" />
          </View>
          <Text style={styles.sectionTitle}>Tax Settings</Text>
        </View>

        <View style={styles.formGroup}>
          <View style={styles.switchContainer}>
            <Text style={styles.label}>Apply GST</Text>
            <Switch
              trackColor={{ false: "#E5E7EB", true: "#10B98150" }}
              thumbColor={settings.taxSettings.applyGST ? "#10B981" : "#9CA3AF"}
              ios_backgroundColor="#E5E7EB"
              onValueChange={(value) => handleToggleChange('taxSettings.applyGST', value)}
              value={settings.taxSettings.applyGST}
            />
          </View>
          <Text style={styles.helperText}>Enable/disable GST calculation on orders</Text>
        </View>

        {settings.taxSettings.applyGST && (
          <View style={styles.formGroup}>
            <Text style={styles.label}>GST Percentage (%)</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter GST percentage"
              keyboardType="numeric"
              value={settings.taxSettings.gstPercentage.toString()}
              onChangeText={(value) => handleNumberChange('taxSettings.gstPercentage', value)}
            />
            <Text style={styles.helperText}>Percentage of GST to apply on order subtotal</Text>
          </View>
        )}
      </View>

      {/* Minimum Order Value */}
      <View style={styles.section}>
        <View style={styles.sectionHeader}>
          <View style={[styles.iconContainer, { backgroundColor: '#EC4A0A20' }]}>
            <IndianRupee size={20} color="#EC4A0A" />
          </View>
          <Text style={styles.sectionTitle}>Minimum Order Value</Text>
        </View>

        <View style={styles.formGroup}>
          <Text style={styles.label}>Minimum Order Amount (₹)</Text>
          <TextInput
            style={styles.input}
            placeholder="Enter minimum order amount"
            keyboardType="numeric"
            value={settings.minimumOrderValue.toString()}
            onChangeText={(value) => handleNumberChange('minimumOrderValue', value)}
          />
          <Text style={styles.helperText}>Customers cannot place orders below this amount</Text>
        </View>
      </View>
    </ScrollView>
  );

  return (
    <View style={styles.container}>
      {/* Header - Always visible */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Business Settings</Text>
        
        {/* Save button only appears when data is loaded */}
        {!isLoading ? (
          <TouchableOpacity
            style={[styles.saveButton, isSaving && styles.disabledButton]}
            onPress={saveSettings}
            disabled={isSaving}
          >
            {isSaving ? (
              <ActivityIndicator size="small" color="white" />
            ) : (
              <>
                <Save size={20} color="white" />
                <Text style={styles.saveButtonText}>Save</Text>
              </>
            )}
          </TouchableOpacity>
        ) : (
          <View style={styles.saveButtonPlaceholder} />
        )}
      </View>

      {/* Content area with loading state */}
      {isLoading ? renderSkeletonContent() : renderContent()}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8F9FA',
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#10B981',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  saveButtonPlaceholder: {
    width: 80,  // Approximate width of the Save button
    height: 40, // Approximate height of the Save button
  },
  disabledButton: {
    backgroundColor: '#9CA3AF',
  },
  saveButtonText: {
    color: 'white',
    fontWeight: '600',
    marginLeft: 4,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  section: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1F2937',
    marginLeft: 12,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  formGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#F9FAFB',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: '#1F2937',
  },
  helperText: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
});