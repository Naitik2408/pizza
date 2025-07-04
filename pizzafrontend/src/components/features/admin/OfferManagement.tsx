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
  Modal,
  TextInput,
  Platform,
  Switch,
  ScrollView,
  KeyboardAvoidingView
} from 'react-native';
import { SuccessModal, ErrorModal, ConfirmationModal, LoadingModal } from '../../modals';
import { useSelector } from 'react-redux';
import { RootState } from '../../../../redux/store';
import { API_URL } from '@/config';
import {
  ChevronLeft,
  Plus,
  Percent,
  Calendar,
  Tag,
  Check,
  Edit2,
  Trash2,
  XCircle,
  DollarSign
} from 'lucide-react-native';
import { useRouter } from 'expo-router';
import DateTimePicker from '@react-native-community/datetimepicker';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withSequence,
  withTiming,
  cancelAnimation,
  Easing
} from 'react-native-reanimated';

interface Offer {
  _id: string;
  title: string;
  code: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue: number;
  maxDiscountAmount: number | null;
  active: boolean;
  validFrom: string;
  validUntil: string;
  usageLimit: number | null;
  usageCount: number;
  createdAt: string;
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

// Skeleton for offer card
const OfferCardSkeleton = () => (
  <View style={styles.offerCard}>
    <View style={styles.offerHeader}>
      <View>
        <Skeleton width={150} height={20} style={{ marginBottom: 8 }} />
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Skeleton width={16} height={16} style={{ borderRadius: 8, marginRight: 4 }} />
          <Skeleton width={100} height={14} />
        </View>
      </View>
      <Skeleton width={70} height={24} style={{ borderRadius: 16 }} />
    </View>

    <Skeleton width="100%" height={40} style={{ marginVertical: 12 }} />

    <View style={styles.offerDetails}>
      <Skeleton width={80} height={20} style={{ borderRadius: 4, marginRight: 12 }} />
      <View style={{ flexDirection: 'row', alignItems: 'center' }}>
        <Skeleton width={16} height={16} style={{ borderRadius: 8, marginRight: 4 }} />
        <Skeleton width={120} height={14} />
      </View>
    </View>

    <Skeleton width={100} height={14} style={{ marginVertical: 8 }} />

    <View style={[styles.offerActions, { justifyContent: 'flex-end', marginTop: 8 }]}>
      <Skeleton width={70} height={32} style={{ borderRadius: 4, marginRight: 12 }} />
      <Skeleton width={70} height={32} style={{ borderRadius: 4 }} />
    </View>
  </View>
);

const OfferManagement = () => {
  const router = useRouter();
  const { token } = useSelector((state: RootState) => state.auth);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [currentOffer, setCurrentOffer] = useState<Offer | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showDatePicker, setShowDatePicker] = useState<'from' | 'until' | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    code: '',
    description: '',
    discountType: 'percentage' as 'percentage' | 'fixed',
    discountValue: '',
    minOrderValue: '',
    maxDiscountAmount: '',
    active: true,
    validFrom: new Date(),
    validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)),
    usageLimit: '',
  });

  // Modal states
  const [successModal, setSuccessModal] = useState({
    visible: false,
    title: '',
    message: ''
  });
  
  const [errorModal, setErrorModal] = useState({
    visible: false,
    title: '',
    message: ''
  });
  
  const [confirmationModal, setConfirmationModal] = useState({
    visible: false,
    title: '',
    message: '',
    onConfirm: () => {}
  });
  
  const [loadingModal, setLoadingModal] = useState({
    visible: false,
    message: ''
  });

  // Fetch all offers
  const fetchOffers = useCallback(async (showRefreshing = false) => {
    if (!token) return;

    try {
      if (showRefreshing) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      setError(null);

      const response = await fetch(`${API_URL}/api/admin/offers`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch offers');
      }

      const data = await response.json();
      setOffers(data);
    } catch (err) {
      console.error('Error fetching offers:', err);
      setError('Failed to load offers. Please try again.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [token]);

  // Create a new offer
  const createOffer = async () => {
    if (!token) return;

    // Validation
    if (!formData.title || !formData.code || !formData.description || !formData.discountValue) {
      setErrorModal({
        visible: true,
        title: 'Validation Error',
        message: 'Please fill all required fields'
      });
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
      };

      const response = await fetch(`${API_URL}/api/admin/offers`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to create offer');
      }

      // Refresh offers list
      fetchOffers();

      // Close modal and reset form
      setModalVisible(false);
      resetForm();

      setSuccessModal({
        visible: true,
        title: 'Success',
        message: 'Offer created successfully'
      });
    } catch (err: any) {
      console.error('Error creating offer:', err);
      setErrorModal({
        visible: true,
        title: 'Error',
        message: err.message || 'Failed to create offer'
      });
    } finally {
      setLoading(false);
    }
  };

  // Update an existing offer
  const updateOffer = async () => {
    if (!token || !currentOffer) return;

    // Validation
    if (!formData.title || !formData.code || !formData.description || !formData.discountValue) {
      setErrorModal({
        visible: true,
        title: 'Validation Error',
        message: 'Please fill all required fields'
      });
      return;
    }

    try {
      setLoading(true);

      const requestData = {
        ...formData,
        discountValue: parseFloat(formData.discountValue),
        minOrderValue: formData.minOrderValue ? parseFloat(formData.minOrderValue) : 0,
        maxDiscountAmount: formData.maxDiscountAmount ? parseFloat(formData.maxDiscountAmount) : null,
        usageLimit: formData.usageLimit ? parseInt(formData.usageLimit, 10) : null,
      };

      const response = await fetch(`${API_URL}/api/admin/offers/${currentOffer._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(requestData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        throw new Error(responseData.message || 'Failed to update offer');
      }

      // Refresh offers list
      fetchOffers();

      // Close modal and reset form
      setModalVisible(false);
      setCurrentOffer(null);
      setIsEditing(false);
      resetForm();

      setSuccessModal({
        visible: true,
        title: 'Success',
        message: 'Offer updated successfully'
      });
    } catch (err: any) {
      console.error('Error updating offer:', err);
      setErrorModal({
        visible: true,
        title: 'Error',
        message: err.message || 'Failed to update offer'
      });
    } finally {
      setLoading(false);
    }
  };

  // Delete an offer
  const deleteOffer = async (id: string) => {
    if (!token) return;

    setConfirmationModal({
      visible: true,
      title: 'Confirm Delete',
      message: 'Are you sure you want to delete this offer? This action cannot be undone.',
      onConfirm: async () => {
        try {
          setLoadingModal({
            visible: true,
            message: 'Deleting offer...'
          });

          const response = await fetch(`${API_URL}/api/admin/offers/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          });

          const responseData = await response.json();

          if (!response.ok) {
            throw new Error(responseData.message || 'Failed to delete offer');
          }

          // Remove from local state
          setOffers(offers.filter(offer => offer._id !== id));

          setLoadingModal({ visible: false, message: '' });
          setSuccessModal({
            visible: true,
            title: 'Success',
            message: 'Offer deleted successfully'
          });
        } catch (err: any) {
          console.error('Error deleting offer:', err);
          setLoadingModal({ visible: false, message: '' });
          setErrorModal({
            visible: true,
            title: 'Error',
            message: err.message || 'Failed to delete offer'
          });
        }
      }
    });
  }

  // Reset form state
  const resetForm = () => {
    setFormData({
      title: '',
      code: '',
      description: '',
      discountType: 'percentage',
      discountValue: '',
      minOrderValue: '',
      maxDiscountAmount: '',
      active: true,
      validFrom: new Date(),
      validUntil: new Date(new Date().setMonth(new Date().getMonth() + 1)),
      usageLimit: '',
    });
  };

  // Handle date change in picker
  const onDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(null);
    }

    if (selectedDate) {
      if (showDatePicker === 'from') {
        setFormData({ ...formData, validFrom: selectedDate });
      } else if (showDatePicker === 'until') {
        setFormData({ ...formData, validUntil: selectedDate });
      }
    }
  };

  // Open modal for editing an offer
  const handleEditOffer = (offer: Offer) => {
    setCurrentOffer(offer);
    setIsEditing(true);

    // Populate form with offer data
    setFormData({
      title: offer.title,
      code: offer.code,
      description: offer.description,
      discountType: offer.discountType,
      discountValue: offer.discountValue.toString(),
      minOrderValue: offer.minOrderValue.toString(),
      maxDiscountAmount: offer.maxDiscountAmount ? offer.maxDiscountAmount.toString() : '',
      active: offer.active,
      validFrom: new Date(offer.validFrom),
      validUntil: new Date(offer.validUntil),
      usageLimit: offer.usageLimit ? offer.usageLimit.toString() : '',
    });

    setModalVisible(true);
  };

  // Format date for display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  // Check if an offer is currently valid
  const isOfferValid = (offer: Offer) => {
    if (!offer.active) return false;

    const now = new Date();
    const validFrom = new Date(offer.validFrom);
    const validUntil = new Date(offer.validUntil);

    return now >= validFrom && now <= validUntil &&
      (offer.usageLimit === null || offer.usageCount < offer.usageLimit);
  };

  // Load offers on component mount
  useEffect(() => {
    fetchOffers();
  }, [fetchOffers]);

  // Pull to refresh handler
  const onRefresh = useCallback(() => {
    fetchOffers(true);
  }, [fetchOffers]);

  // Render status badge with appropriate color
  const renderStatusBadge = (offer: Offer) => {
    const isValid = isOfferValid(offer);
    const bgColor = isValid ? '#10B98120' : '#EF444420';
    const textColor = isValid ? '#10B981' : '#EF4444';
    const text = isValid ? 'Active' : 'Inactive';

    return (
      <View style={[styles.statusBadge, { backgroundColor: bgColor }]}>
        <Text style={[styles.statusText, { color: textColor }]}>{text}</Text>
      </View>
    );
  };

  // Render discount badge
  const renderDiscountBadge = (offer: Offer) => {
    return (
      <View style={styles.discountBadge}>
        <Text style={styles.discountText}>
          {offer.discountType === 'percentage'
            ? `${offer.discountValue}% off`
            : `₹${offer.discountValue} off`}
        </Text>
      </View>
    );
  };

  // Render offer item
  const renderOfferItem = ({ item }: { item: Offer }) => (
    <View style={styles.offerCard}>
      <View style={styles.offerHeader}>
        <View>
          <Text style={styles.offerTitle}>{item.title}</Text>
          <View style={styles.codeContainer}>
            <Tag size={14} color="#6366F1" style={styles.codeIcon} />
            <Text style={styles.offerCode}>{item.code}</Text>
          </View>
        </View>
        {renderStatusBadge(item)}
      </View>

      <Text style={styles.offerDescription}>{item.description}</Text>

      <View style={styles.offerDetails}>
        {renderDiscountBadge(item)}

        <View style={styles.validityContainer}>
          <Calendar size={14} color="#6B7280" style={styles.validityIcon} />
          <Text style={styles.validityText}>
            Valid until {formatDate(item.validUntil)}
          </Text>
        </View>
      </View>

      {item.minOrderValue > 0 && (
        <Text style={styles.minOrderText}>
          Min. order: ₹{item.minOrderValue}
        </Text>
      )}

      <View style={styles.offerActions}>
        <TouchableOpacity
          style={styles.editButton}
          onPress={() => handleEditOffer(item)}
        >
          <Edit2 size={16} color="#6366F1" />
          <Text style={styles.editButtonText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteOffer(item._id)}
        >
          <Trash2 size={16} color="#EF4444" />
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  // Render skeleton loading
  const renderSkeletonOffers = () => {
    return (
      <ScrollView 
        style={styles.contentContainer} 
        contentContainerStyle={styles.listContainer}
      >
        {[1, 2, 3, 4].map((item) => (
          <OfferCardSkeleton key={`skeleton-${item}`} />
        ))}
      </ScrollView>
    );
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar backgroundColor="#f5f5f5" barStyle="dark-content" />

      {/* Header - Always visible */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ChevronLeft size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Manage Offers</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => {
            resetForm();
            setIsEditing(false);
            setCurrentOffer(null);
            setModalVisible(true);
          }}
          disabled={loading && !refreshing}
        >
          <Plus size={24} color="#FF6B00" />
        </TouchableOpacity>
      </View>

      {/* Content area with appropriate state (loading, error, or data) */}
      {loading && !refreshing ? (
        renderSkeletonOffers()
      ) : error ? (
        <View style={[styles.contentContainer, styles.centerContent]}>
          <Text style={styles.errorText}>{error}</Text>
          <TouchableOpacity style={styles.retryButton} onPress={() => fetchOffers()}>
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <FlatList
          data={offers}
          renderItem={renderOfferItem}
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
              <Text style={styles.emptyText}>No offers found</Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => {
                  resetForm();
                  setIsEditing(false);
                  setCurrentOffer(null);
                  setModalVisible(true);
                }}
              >
                <Text style={styles.addFirstButtonText}>Add Your First Offer</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      )}

      {/* Add/Edit Offer Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => {
          setModalVisible(false);
          setIsEditing(false);
          setCurrentOffer(null);
          resetForm();
        }}
      >
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={{ flex: 1 }}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>
                  {isEditing ? 'Edit Offer' : 'Add New Offer'}
                </Text>
                <TouchableOpacity
                  onPress={() => {
                    setModalVisible(false);
                    setIsEditing(false);
                    setCurrentOffer(null);
                    resetForm();
                  }}
                >
                  <XCircle size={24} color="#6B7280" />
                </TouchableOpacity>
              </View>

              <ScrollView style={styles.formContainer}>
                {/* Title */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Offer Title *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.title}
                    onChangeText={(text) => setFormData({ ...formData, title: text })}
                    placeholder="Summer Sale"
                  />
                </View>

                {/* Code */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Offer Code *</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.code}
                    onChangeText={(text) => setFormData({ ...formData, code: text.toUpperCase() })}
                    placeholder="SUMMER20"
                    autoCapitalize="characters"
                  />
                </View>

                {/* Description */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Description *</Text>
                  <TextInput
                    style={[styles.formInput, styles.textArea]}
                    value={formData.description}
                    onChangeText={(text) => setFormData({ ...formData, description: text })}
                    placeholder="Get 20% off on your order"
                    multiline={true}
                    numberOfLines={3}
                  />
                </View>

                {/* Discount Type */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Discount Type *</Text>
                  <View style={styles.segmentedControl}>
                    <TouchableOpacity
                      style={[
                        styles.segmentedButton,
                        formData.discountType === 'percentage' && styles.segmentedButtonActive
                      ]}
                      onPress={() => setFormData({ ...formData, discountType: 'percentage' })}
                    >
                      <Percent size={16} color={formData.discountType === 'percentage' ? '#FF6B00' : '#6B7280'} />
                      <Text
                        style={[
                          styles.segmentedButtonText,
                          formData.discountType === 'percentage' && styles.segmentedButtonTextActive
                        ]}
                      >
                        Percentage
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.segmentedButton,
                        formData.discountType === 'fixed' && styles.segmentedButtonActive
                      ]}
                      onPress={() => setFormData({ ...formData, discountType: 'fixed' })}
                    >
                      <DollarSign size={16} color={formData.discountType === 'fixed' ? '#FF6B00' : '#6B7280'} />
                      <Text
                        style={[
                          styles.segmentedButtonText,
                          formData.discountType === 'fixed' && styles.segmentedButtonTextActive
                        ]}
                      >
                        Fixed Amount
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {/* Discount Value */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>
                    {formData.discountType === 'percentage' ? 'Discount Percentage *' : 'Discount Amount *'}
                  </Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.discountValue}
                    onChangeText={(text) => {
                      // Allow only numbers and decimal point
                      const filtered = text.replace(/[^0-9.]/g, '');
                      setFormData({ ...formData, discountValue: filtered });
                    }}
                    placeholder={formData.discountType === 'percentage' ? "20" : "100"}
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Min Order Value */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Minimum Order Value</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.minOrderValue}
                    onChangeText={(text) => {
                      // Allow only numbers and decimal point
                      const filtered = text.replace(/[^0-9.]/g, '');
                      setFormData({ ...formData, minOrderValue: filtered });
                    }}
                    placeholder="0"
                    keyboardType="decimal-pad"
                  />
                </View>

                {/* Max Discount Amount (for percentage discounts) */}
                {formData.discountType === 'percentage' && (
                  <View style={styles.formGroup}>
                    <Text style={styles.formLabel}>Maximum Discount Amount</Text>
                    <TextInput
                      style={styles.formInput}
                      value={formData.maxDiscountAmount}
                      onChangeText={(text) => {
                        // Allow only numbers and decimal point
                        const filtered = text.replace(/[^0-9.]/g, '');
                        setFormData({ ...formData, maxDiscountAmount: filtered });
                      }}
                      placeholder="No limit"
                      keyboardType="decimal-pad"
                    />
                  </View>
                )}

                {/* Valid From */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Valid From *</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker('from')}
                  >
                    <Text style={styles.dateText}>
                      {formData.validFrom.toLocaleDateString()}
                    </Text>
                    <Calendar size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Valid Until */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Valid Until *</Text>
                  <TouchableOpacity
                    style={styles.dateInput}
                    onPress={() => setShowDatePicker('until')}
                  >
                    <Text style={styles.dateText}>
                      {formData.validUntil.toLocaleDateString()}
                    </Text>
                    <Calendar size={20} color="#6B7280" />
                  </TouchableOpacity>
                </View>

                {/* Usage Limit */}
                <View style={styles.formGroup}>
                  <Text style={styles.formLabel}>Usage Limit</Text>
                  <TextInput
                    style={styles.formInput}
                    value={formData.usageLimit}
                    onChangeText={(text) => {
                      // Allow only numbers
                      const filtered = text.replace(/[^0-9]/g, '');
                      setFormData({ ...formData, usageLimit: filtered });
                    }}
                    placeholder="No limit"
                    keyboardType="number-pad"
                  />
                </View>

                {/* Active Status */}
                <View style={styles.formGroup}>
                  <View style={styles.switchContainer}>
                    <Text style={styles.formLabel}>Active</Text>
                    <Switch
                      value={formData.active}
                      onValueChange={(value) => setFormData({ ...formData, active: value })}
                      trackColor={{ false: '#E5E7EB', true: '#FF6B0080' }}
                      thumbColor={formData.active ? '#FF6B00' : '#f4f3f4'}
                    />
                  </View>
                </View>

                {/* Submit Button */}
                <TouchableOpacity
                  style={styles.submitButton}
                  onPress={isEditing ? updateOffer : createOffer}
                >
                  <Text style={styles.submitButtonText}>
                    {isEditing ? 'Update Offer' : 'Create Offer'}
                  </Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Date Picker (for iOS) */}
      {(Platform.OS === 'ios' && showDatePicker !== null) && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker !== null}
        >
          <View style={styles.datePickerContainer}>
            <View style={styles.datePickerContent}>
              <View style={styles.datePickerHeader}>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(null)}
                  style={styles.datePickerCancelButton}
                >
                  <Text style={styles.datePickerCancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.datePickerTitle}>
                  {showDatePicker === 'from' ? 'Select Start Date' : 'Select End Date'}
                </Text>
                <TouchableOpacity
                  onPress={() => setShowDatePicker(null)}
                  style={styles.datePickerDoneButton}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <DateTimePicker
                value={showDatePicker === 'from' ? formData.validFrom : formData.validUntil}
                mode="date"
                display="spinner"
                onChange={onDateChange}
              />
            </View>
          </View>
        </Modal>
      )}

      {/* Date Picker (for Android) */}
      {(Platform.OS === 'android' && showDatePicker !== null) && (
        <DateTimePicker
          value={showDatePicker === 'from' ? formData.validFrom : formData.validUntil}
          mode="date"
          display="default"
          onChange={onDateChange}
        />
      )}

      {/* Modal Components */}
      <SuccessModal
        visible={successModal.visible}
        onClose={() => setSuccessModal({ ...successModal, visible: false })}
        title={successModal.title}
        message={successModal.message}
      />

      <ErrorModal
        visible={errorModal.visible}
        onClose={() => setErrorModal({ ...errorModal, visible: false })}
        title={errorModal.title}
        message={errorModal.message}
      />

      <ConfirmationModal
        visible={confirmationModal.visible}
        onConfirm={() => {
          confirmationModal.onConfirm();
          setConfirmationModal({ ...confirmationModal, visible: false });
        }}
        onCancel={() => setConfirmationModal({ ...confirmationModal, visible: false })}
        title={confirmationModal.title}
        message={confirmationModal.message}
        confirmText="Delete"
        cancelText="Cancel"
      />

      <LoadingModal
        visible={loadingModal.visible}
        message={loadingModal.message}
      />
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
  addButton: {
    padding: 4,
  },
  listContainer: {
    padding: 16,
    paddingBottom: 80,
  },
  emptyContainer: {
    padding: 32,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#6B7280',
    textAlign: 'center',
    marginBottom: 16,
  },
  addFirstButton: {
    backgroundColor: '#FF6B00',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  offerCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  offerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginBottom: 4,
  },
  codeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  codeIcon: {
    marginRight: 4,
  },
  offerCode: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 16,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  offerDescription: {
    fontSize: 14,
    color: '#4B5563',
    marginBottom: 16,
  },
  offerDetails: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  discountBadge: {
    backgroundColor: '#FF6B0020',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
    marginRight: 12,
  },
  discountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF6B00',
  },
  validityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  validityIcon: {
    marginRight: 4,
  },
  validityText: {
    fontSize: 12,
    color: '#6B7280',
  },
  minOrderText: {
    fontSize: 12,
    color: '#6B7280',
    marginBottom: 16,
  },
  offerActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  editButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#6366F110',
    marginRight: 12,
  },
  editButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#6366F1',
  },
  deleteButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    borderRadius: 4,
    backgroundColor: '#EF444410',
  },
  deleteButtonText: {
    marginLeft: 4,
    fontSize: 14,
    fontWeight: '500',
    color: '#EF4444',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginHorizontal: 16,
    marginVertical: 32,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
    padding: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  formContainer: {
    padding: 16,
  },
  formGroup: {
    marginBottom: 16,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#4B5563',
    marginBottom: 6,
  },
  formInput: {
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    color: '#111827',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  segmentedControl: {
    flexDirection: 'row',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    overflow: 'hidden',
  },
  segmentedButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  segmentedButtonActive: {
    backgroundColor: '#FF6B0010',
  },
  segmentedButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#6B7280',
    marginLeft: 6,
  },
  segmentedButtonTextActive: {
    color: '#FF6B00',
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#F3F4F6',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  dateText: {
    fontSize: 16,
    color: '#111827',
  },
  switchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  submitButton: {
    backgroundColor: '#FF6B00',
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  datePickerContainer: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  datePickerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E5E7EB',
  },
  datePickerTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
  },
  datePickerCancelButton: {
    padding: 4,
  },
  datePickerCancelText: {
    fontSize: 16,
    color: '#6B7280',
  },
  datePickerDoneButton: {
    padding: 4,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#FF6B00',
  },
});

export default OfferManagement;