import { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Switch,
  ActivityIndicator
} from 'react-native';
import {
  ChevronLeft,
  Save,
  CreditCard,
  Landmark,
  Truck,
  Percent,
  IndianRupee,
  Building2,
  Phone,
  Mail,
  Clock4,
  ToggleLeft,
  ToggleRight
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { API_URL } from '@/config';
import { SuccessModal, ErrorModal, ConfirmationModal } from '../../src/components/modals';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';

// --- Business Info Types ---
interface BusinessInfo {
  name: string;
  address: string;
  phone: string;
  email?: string;
  isCurrentlyOpen: boolean;
  manualOverride: {
    isActive: boolean;
    status: boolean;
    reason?: string;
  };
}

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
  const [savingBusinessInfo, setSavingBusinessInfo] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // --- Business Info State and Logic ---
  const [businessInfo, setBusinessInfo] = useState<BusinessInfo | null>(null);
  const [businessInfoLoading, setBusinessInfoLoading] = useState(true);
  const [businessInfoError, setBusinessInfoError] = useState<string | null>(null);
  
  // Track original data for change detection
  const [originalBusinessInfo, setOriginalBusinessInfo] = useState<BusinessInfo | null>(null);
  const [originalSettings, setOriginalSettings] = useState<BusinessSettings | null>(null);

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
  
  // Check if there are changes
  const hasChanges = useMemo(() => {
    if (!businessInfo || !originalBusinessInfo || !originalSettings) return false;
    
    // Check business info changes
    const businessInfoChanged = JSON.stringify(businessInfo) !== JSON.stringify(originalBusinessInfo);
    
    // Check settings changes
    const settingsChanged = JSON.stringify(settings) !== JSON.stringify(originalSettings);
    
    return businessInfoChanged || settingsChanged;
  }, [businessInfo, originalBusinessInfo, settings, originalSettings]);

  // Modal states
  const [successModal, setSuccessModal] = useState<{visible: boolean, title: string, message: string}>({
    visible: false,
    title: '',
    message: ''
  });
  const [errorModal, setErrorModal] = useState<{visible: boolean, title: string, message: string}>({
    visible: false,
    title: '',
    message: ''
  });
  const [confirmationModal, setConfirmationModal] = useState<{
    visible: boolean,
    title: string,
    message: string,
    onConfirm: () => void
  }>({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });

  // Fetch business info on mount
  useEffect(() => {
    const fetchBusinessInfo = async () => {
      try {
        setBusinessInfoLoading(true);
        setBusinessInfoError(null);
        const response = await fetch(`${API_URL}/api/business/profile`);
        if (!response.ok) throw new Error('Failed to fetch business info');
        const data = await response.json();
        
        console.log('🏪 Business Profile Data:', data);
        
        setBusinessInfo({
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          isCurrentlyOpen: data.isCurrentlyOpen ?? true, // Default to open
          manualOverride: data.manualOverride ?? { isActive: false, status: true, reason: '' },
        });
        
        // Store original data for change tracking
        setOriginalBusinessInfo({
          name: data.name,
          address: data.address,
          phone: data.phone,
          email: data.email,
          isCurrentlyOpen: data.isCurrentlyOpen ?? true, // Default to open
          manualOverride: data.manualOverride ?? { isActive: false, status: true, reason: '' },
        });
        
        console.log('✅ Business Info State Updated:', {
          isCurrentlyOpen: data.isCurrentlyOpen,
          manualOverride: data.manualOverride
        });
      } catch (err) {
        console.error('❌ Error fetching business info:', err);
        setBusinessInfoError('Could not load business info');
      } finally {
        setBusinessInfoLoading(false);
      }
    };
    fetchBusinessInfo();
  }, []);

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
        
        // Store original data for change tracking
        setOriginalSettings(JSON.parse(JSON.stringify(data)));
      } catch (error) {
        console.error('Error fetching settings:', error);
        setErrorModal({
          visible: true,
          title: 'Error',
          message: 'Failed to load settings. Using default values.'
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, [token]);

  // Handle business info field changes
  const handleBusinessInfoChange = (field: keyof BusinessInfo, value: any) => {
    setBusinessInfo(prev => prev ? { ...prev, [field]: value } : prev);
  };

  // Handle shop open/close status change with immediate save
  const handleShopStatusChange = async (isOpen: boolean) => {
    if (!token || !businessInfo) return;
    
    console.log('🔄 Shop status change requested:', { isOpen, currentStatus: businessInfo.isCurrentlyOpen });
    
    try {
      // Update local state immediately for UI responsiveness
      setBusinessInfo(prev => prev ? { ...prev, isCurrentlyOpen: isOpen } : prev);
      
      console.log('📡 Sending business status update to backend...');
      
      // Save to backend immediately
      const response = await fetch(`${API_URL}/api/settings/business-status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          isOpen, 
          reason: isOpen ? 'Manually opened from settings' : 'Manually closed from settings'
        })
      });
      
      if (!response.ok) {
        console.error('❌ Failed to update business status:', response.status, response.statusText);
        // Revert local state if save failed
        setBusinessInfo(prev => prev ? { ...prev, isCurrentlyOpen: !isOpen } : prev);
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update shop status');
      }
      
      const responseData = await response.json();
      console.log('✅ Business status updated successfully:', responseData);
      
      // Update original data to reflect the saved state
      setOriginalBusinessInfo(prev => prev ? { ...prev, isCurrentlyOpen: isOpen } : prev);
      
      setSuccessModal({
        visible: true,
        title: 'Status Updated',
        message: `Shop is now ${isOpen ? 'OPEN' : 'CLOSED'}`
      });
    } catch (error) {
      console.error('❌ Error updating shop status:', error);
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to update shop status'
      });
    }
  };

  // No business hours editing needed

  // Handle manual override toggle
  const handleManualOverrideToggle = (isActive: boolean) => {
    setBusinessInfo(prev => prev ? {
      ...prev,
      manualOverride: {
        ...prev.manualOverride,
        isActive
      }
    } : prev);
  };
  const handleManualOverrideStatus = (status: boolean) => {
    setBusinessInfo(prev => prev ? {
      ...prev,
      manualOverride: {
        ...prev.manualOverride,
        status
      }
    } : prev);
  };

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

  // Save all business info and settings together
  const saveAllBusinessData = async () => {
    if (!token || !businessInfo) return;
    try {
      setSavingBusinessInfo(true);
      const payload = {
        businessInfo,
        settings
      };
      
      console.log('💾 Saving all business data:', {
        businessInfo: {
          ...businessInfo,
          isCurrentlyOpen: businessInfo.isCurrentlyOpen
        },
        settings: settings
      });
      
      const response = await fetch(`${API_URL}/api/business/full`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch (e) {
          errorData = { message: 'Failed to save business info' };
        }
        throw new Error(errorData.message || 'Failed to save business info');
      }
      
      const responseData = await response.json();
      console.log('✅ All business data saved successfully:', responseData);
      
      // Update original data after successful save
      setOriginalBusinessInfo(JSON.parse(JSON.stringify(businessInfo)));
      setOriginalSettings(JSON.parse(JSON.stringify(settings)));
      
      setSuccessModal({
        visible: true,
        title: 'Success',
        message: 'Business info and settings updated successfully'
      });
    } catch (error) {
      console.error('❌ Error saving all business data:', error);
      setErrorModal({
        visible: true,
        title: 'Error',
        message: error instanceof Error ? error.message : 'Failed to save business info'
      });
    } finally {
      setSavingBusinessInfo(false);
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

  // Render business info section (no hours, just open/close status and manual override)
  const renderBusinessInfoSection = () => (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <View style={[styles.iconContainer, { backgroundColor: '#F59E420F' }]}> <Building2 size={20} color="#F59E42" /> </View>
        <Text style={styles.sectionTitle}>Business Info</Text>
      </View>
      {businessInfoLoading ? (
        <ActivityIndicator size="small" color="#F59E42" />
      ) : businessInfoError ? (
        <Text style={{ color: 'red' }}>{businessInfoError}</Text>
      ) : businessInfo ? (
        <>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Name</Text>
            <TextInput style={styles.input} value={businessInfo.name} onChangeText={v => handleBusinessInfoChange('name', v)} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Address</Text>
            <TextInput style={styles.input} value={businessInfo.address} onChangeText={v => handleBusinessInfoChange('address', v)} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Phone</Text>
            <TextInput style={styles.input} value={businessInfo.phone} keyboardType="phone-pad" onChangeText={v => handleBusinessInfoChange('phone', v)} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Email</Text>
            <TextInput style={styles.input} value={businessInfo.email || ''} onChangeText={v => handleBusinessInfoChange('email', v)} />
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Current Status</Text>
            <Text style={{ fontSize: 16, color: businessInfo.isCurrentlyOpen ? '#10B981' : '#F43F5E', fontWeight: 'bold' }}>
              {businessInfo.isCurrentlyOpen ? 'Open' : 'Closed'}
            </Text>
          </View>
          <View style={styles.formGroup}>
            <Text style={styles.label}>Shop Open/Close</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              <Switch
                value={businessInfo.isCurrentlyOpen}
                onValueChange={handleShopStatusChange}
                trackColor={{ false: '#F43F5E', true: '#10B981' }}
                thumbColor={businessInfo.isCurrentlyOpen ? '#10B981' : '#F43F5E'}
              />
              <Text style={{ marginLeft: 10 }}>
                {businessInfo.isCurrentlyOpen ? 'Open' : 'Closed'}
              </Text>
            </View>
            <Text style={styles.helperText}>
              Changes to shop status are saved immediately
            </Text>
          </View>
        </>
      ) : null}
    </View>
  );

  // Render actual content
  const renderContent = () => (
    <ScrollView style={styles.content}>
      {renderBusinessInfoSection()}
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
            style={[styles.saveButton, (savingBusinessInfo || !hasChanges) && styles.disabledButton]}
            onPress={saveAllBusinessData}
            disabled={savingBusinessInfo || !hasChanges}
          >
            {savingBusinessInfo ? (
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

      {/* Success Modal */}
      <SuccessModal
        visible={successModal.visible}
        onClose={() => setSuccessModal({ ...successModal, visible: false })}
        title={successModal.title}
        message={successModal.message}
      />

      {/* Error Modal */}
      <ErrorModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
        title={errorModal.title}
        message={errorModal.message}
      />

      {/* Confirmation Modal */}
      <ConfirmationModal
        visible={confirmationModal.visible}
        onConfirm={() => {
          confirmationModal.onConfirm();
          setConfirmationModal({ ...confirmationModal, visible: false });
        }}
        onCancel={() => setConfirmationModal({ ...confirmationModal, visible: false })}
        title={confirmationModal.title}
        message={confirmationModal.message}
      />
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