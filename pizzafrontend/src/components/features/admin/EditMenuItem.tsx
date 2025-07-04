import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Image,
  Modal,
  Switch,
  Alert,
  ActivityIndicator,
} from 'react-native';
import {
  X,
  ChevronDown,
  Upload,
  Save,
  Plus,
  Trash2,
  Check,
  Minus
} from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import { CLOUDINARY_CONFIG } from '@/config';

// Import the types from a separate file
import { Category, FoodType, Size, SizeVariation, AddOnGroup, MenuItem } from '@/types/adminMenu';
import CustomizationModal from './CustomizationModal';

// Define additional types for size-specific pricing
interface SizePricing {
  size: Size;
  price: number;
}

interface AddOn {
  id: string;
  name: string;
  price: number;
  available: boolean;
  isDefault: boolean;
  hasSizeSpecificPricing?: boolean;
  sizePricing?: SizePricing[];
}

interface EditMenuItemProps {
  visible: boolean;
  onClose: () => void;
  onUpdateItem: (updatedItem: any) => Promise<void>;
  categoriesWithAddOns: Category[];
  categories: Category[];
  sizes: Size[];
  currentItem: MenuItem | null;
}

const EditMenuItem = ({
  visible,
  onClose,
  onUpdateItem,
  categoriesWithAddOns,
  categories,
  sizes,
  currentItem,
}: EditMenuItemProps) => {
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    price: '',
    category: 'Pizza' as Category,
    image: 'https://via.placeholder.com/100',
    available: true,
    popular: false,
    foodType: 'Veg' as FoodType,
    sizeType: 'single' as 'single' | 'multiple',
    size: 'Medium' as Size,
    sizeVariations: [] as SizeVariation[],
    hasMultipleSizes: false,
    hasAddOns: false,
    addOnGroups: [] as AddOnGroup[],
    rating: '',
    ratingCount: 0
  });

  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [foodTypeMenuOpen, setFoodTypeMenuOpen] = useState(false);
  const [sizeMenuOpen, setSizeMenuOpen] = useState(false);
  const [sizeVariations, setSizeVariations] = useState<SizeVariation[]>([]);
  const [newSize, setNewSize] = useState<Size>('Small');
  const [newSizePrice, setNewSizePrice] = useState<string>('');
  const [addOnGroups, setAddOnGroups] = useState<AddOnGroup[]>([]);
  const [showAddOnGroupModal, setShowAddOnGroupModal] = useState(false);
  const [showAddOnModal, setShowAddOnModal] = useState(false);
  const [currentAddOnGroup, setCurrentAddOnGroup] = useState<AddOnGroup | null>(null);
  const [newAddOnGroup, setNewAddOnGroup] = useState({
    name: '',
    minSelection: 0,
    maxSelection: 1,
    required: false
  });
  const [imageUploading, setImageUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Initialize form data when currentItem changes
  useEffect(() => {
    if (currentItem) {
      setFormData({
        name: currentItem.name,
        description: currentItem.description,
        price: currentItem.price.toString(),
        category: currentItem.category,
        image: currentItem.image,
        available: currentItem.available,
        popular: currentItem.popular,
        foodType: currentItem.foodType,
        sizeType: currentItem.hasMultipleSizes ? 'multiple' : 'single',
        size: currentItem.size,
        sizeVariations: [],
        hasMultipleSizes: currentItem.hasMultipleSizes,
        hasAddOns: currentItem.hasAddOns,
        addOnGroups: [],
        rating: currentItem.rating.toString(),
        ratingCount: currentItem.ratingCount
      });
      setSizeVariations(currentItem.sizeVariations || []);
      setAddOnGroups(currentItem.addOnGroups || []);
    }
  }, [currentItem]);

  // Helper functions
  const generateId = () => Math.random().toString(36).substr(2, 9);

  const addSizeVariation = () => {
    if (!newSizePrice || isNaN(parseFloat(newSizePrice))) {
      Alert.alert('Error', 'Please enter a valid price');
      return;
    }

    const price = parseFloat(newSizePrice);
    if (price <= 0) {
      Alert.alert('Error', 'Price must be greater than 0');
      return;
    }

    const newVariation: SizeVariation = {
      size: newSize,
      price,
      available: true
    };

    setSizeVariations([...sizeVariations, newVariation]);
    setNewSize('Small');
    setNewSizePrice('');
  };

  const removeSizeVariation = (index: number) => {
    const updatedVariations = [...sizeVariations];
    updatedVariations.splice(index, 1);
    setSizeVariations(updatedVariations);
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'You need to grant camera roll permissions to upload images.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];
        await uploadImageToCloudinary({
          uri: selectedImage.uri,
          type: 'image/jpeg',
          fileName: selectedImage.uri.split('/').pop() || 'upload.jpg',
          width: selectedImage.width,
          height: selectedImage.height,
        });
      }
    } catch (error) {
      console.error('Image selection error:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const uploadImageToCloudinary = async (image: any) => {
    if (!image.uri) {
      Alert.alert('Error', 'No image found to upload');
      return;
    }

    setImageUploading(true);
    setUploadProgress(0);

    try {
      const cloudinaryFormData = new FormData();
      cloudinaryFormData.append('file', {
        uri: image.uri,
        type: image.type || 'image/jpeg',
        name: image.fileName || 'upload.jpg',
      } as any);
      cloudinaryFormData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
      if (CLOUDINARY_CONFIG.folder) {
        cloudinaryFormData.append('folder', CLOUDINARY_CONFIG.folder);
      }

      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: cloudinaryFormData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      setUploadProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary error response:', errorText);
        throw new Error(`Upload failed with status: ${response.status}, details: ${errorText}`);
      }

      const data = await response.json();
      setFormData({
        ...formData,
        image: data.secure_url,
      });
    } catch (error) {
      console.error('Upload error:', error);
      Alert.alert('Upload Failed', 'Failed to upload image to Cloudinary. Please check your configuration and try again.');
    } finally {
      setImageUploading(false);
    }
  };

  const addAddOnGroup = () => {
    if (!newAddOnGroup.name) {
      Alert.alert('Error', 'Please enter a name for the add-on group');
      return;
    }

    const group: AddOnGroup = {
      id: generateId(),
      name: newAddOnGroup.name,
      minSelection: newAddOnGroup.minSelection,
      maxSelection: newAddOnGroup.maxSelection,
      required: newAddOnGroup.required,
      addOns: []
    };

    setAddOnGroups([...addOnGroups, group]);
    setNewAddOnGroup({
      name: '',
      minSelection: 0,
      maxSelection: 1,
      required: false
    });
    setShowAddOnGroupModal(false);
  };

  const removeAddOnGroup = (id: string) => {
    setAddOnGroups(addOnGroups.filter(group => group.id !== id));
  };

  // Update the handleAddCustomization function for size-based pricing
  const handleAddCustomization = (customization: {
    name: string,
    available: boolean,
    sizePricing: { size: Size, price: string }[] // Changed price to string type
  }) => {
    // Convert string prices to numbers for internal storage
    const sizePricingArray = customization.sizePricing.map(sp => ({
      size: sp.size,
      price: parseFloat(sp.price || '0')
    }));

    const addOn: AddOn = {
      id: generateId(),
      name: customization.name,
      price: 0, // Default base price
      available: customization.available,
      isDefault: false,
      hasSizeSpecificPricing: true,
      sizePricing: sizePricingArray
    };

    if (currentAddOnGroup) {
      const updatedGroups = addOnGroups.map(group => {
        if (group.id === currentAddOnGroup.id) {
          return {
            ...group,
            addOns: [...group.addOns, addOn]
          };
        }
        return group;
      });
      setAddOnGroups(updatedGroups);
    }

    setShowAddOnModal(false);
  };

  const removeAddOn = (groupId: string, addOnId: string) => {
    const updatedGroups = addOnGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          addOns: group.addOns.filter(addOn => addOn.id !== addOnId)
        };
      }
      return group;
    });
    setAddOnGroups(updatedGroups);
  };

  const toggleAddOnAvailability = (groupId: string, addOnId: string) => {
    const updatedGroups = addOnGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          addOns: group.addOns.map(addOn => {
            if (addOn.id === addOnId) {
              return {
                ...addOn,
                available: !addOn.available
              };
            }
            return addOn;
          })
        };
      }
      return group;
    });
    setAddOnGroups(updatedGroups);
  };

  const toggleAddOnGroupRequired = (groupId: string) => {
    const updatedGroups = addOnGroups.map(group => {
      if (group.id === groupId) {
        return {
          ...group,
          required: !group.required
        };
      }
      return group;
    });
    setAddOnGroups(updatedGroups);
  };

  const handleSubmit = async () => {
    try {
      if (!formData.name || !formData.description || !formData.category) {
        Alert.alert('Validation Error', 'Please fill all required fields');
        return;
      }

      if (formData.sizeType === 'single' && !formData.price) {
        Alert.alert('Validation Error', 'Please enter a price for this item');
        return;
      }

      if (formData.sizeType === 'multiple' && sizeVariations.length === 0) {
        Alert.alert('Validation Error', 'Please add at least one size variation');
        return;
      }

      const updatedItem = {
        ...formData,
        price: formData.sizeType === 'single' ? parseFloat(formData.price) : 0,
        rating: formData.rating === '' ? 0 : parseFloat(formData.rating),
        sizeVariations: formData.sizeType === 'multiple' ? sizeVariations : [],
        hasMultipleSizes: formData.sizeType === 'multiple',
        size: formData.sizeType === 'single' ? formData.size : 'Not Applicable',
        sizeType: formData.sizeType,
        hasAddOns: categoriesWithAddOns.includes(formData.category) && formData.hasAddOns,
        addOnGroups: categoriesWithAddOns.includes(formData.category) ? addOnGroups : []
      };

      await onUpdateItem(updatedItem);
      // Don't close the modal here, let the parent decide
    } catch (error) {
      console.error('Error updating menu item:', error);
      Alert.alert('Error', 'Failed to update menu item');
    }
  };

  // Updated renderAddOnGroup function to display size-specific pricing
  const renderAddOnGroup = (group: AddOnGroup) => (
    <View key={group.id} style={styles.addOnGroupContainer}>
      <View style={styles.addOnGroupHeader}>
        <Text style={styles.addOnGroupName}>{group.name}</Text>
        <View style={styles.addOnGroupActions}>
          <TouchableOpacity
            style={styles.addOnGroupActionButton}
            onPress={() => {
              setCurrentAddOnGroup(group);
              setShowAddOnModal(true);
            }}
          >
            <Plus size={16} color="#FF6B00" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addOnGroupActionButton}
            onPress={() => removeAddOnGroup(group.id)}
          >
            <Trash2 size={16} color="#F44336" />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.addOnGroupActionButton}
            onPress={() => toggleAddOnGroupRequired(group.id)}
          >
            <Text style={[styles.requiredText, group.required && styles.requiredTextActive]}>
              {group.required ? 'Required' : 'Optional'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <Text style={styles.addOnGroupSelectionText}>
        Select {group.minSelection} to {group.maxSelection} options
      </Text>

      <View style={styles.addOnsList}>
        {group.addOns.map(addOn => (
          <View key={addOn.id} style={styles.addOnItem}>
            <View style={styles.addOnInfo}>
              <Switch
                trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                thumbColor={addOn.available ? "#FF6B00" : "#F4F4F4"}
                onValueChange={() => toggleAddOnAvailability(group.id, addOn.id)}
                value={addOn.available}
              />
              <Text style={styles.addOnName}>{addOn.name}</Text>
            </View>
            
            {addOn.hasSizeSpecificPricing && addOn.sizePricing ? (
              <View style={styles.sizePriceContainer}>
                {addOn.sizePricing.map(sp => (
                  <Text key={sp.size} style={styles.sizePrice}>
                    {sp.size}: ₹{sp.price.toFixed(2)}
                  </Text>
                ))}
              </View>
            ) : (
              <Text style={styles.addOnPrice}>
                {!addOn.isDefault && `+₹${addOn.price.toFixed(2)}`}
              </Text>
            )}
            
            <TouchableOpacity
              style={styles.removeAddOnButton}
              onPress={() => removeAddOn(group.id, addOn.id)}
            >
              <X size={16} color="#F44336" />
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Menu Item</Text>
            <TouchableOpacity onPress={onClose}>
              <X size={24} color="#1F2937" />
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.formContainer}>
            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Image</Text>
              <TouchableOpacity
                style={styles.imageUploadContainer}
                onPress={handleImagePick}
                disabled={imageUploading}
              >
                {formData.image && formData.image !== 'https://via.placeholder.com/100' ? (
                  <View style={styles.uploadedImageContainer}>
                    <Image source={{ uri: formData.image }} style={styles.uploadedImage} />
                    {imageUploading && (
                      <View style={styles.uploadProgressOverlay}>
                        <ActivityIndicator size="large" color="#FF6B00" />
                        <Text style={styles.uploadProgressText}>{uploadProgress}%</Text>
                      </View>
                    )}
                  </View>
                ) : (
                  <>
                    {imageUploading ? (
                      <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color="#FF6B00" />
                        <Text style={styles.uploadingText}>Uploading... {uploadProgress}%</Text>
                      </View>
                    ) : (
                      <>
                        <View style={styles.uploadIcon}>
                          <Upload size={24} color="#FF6B00" />
                        </View>
                        <Text style={styles.uploadText}>Tap to upload image</Text>
                      </>
                    )}
                  </>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Name *</Text>
              <TextInput
                style={styles.input}
                value={formData.name}
                onChangeText={(text) => setFormData({ ...formData, name: text })}
                placeholder="Enter item name"
              />
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Description *</Text>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.description}
                onChangeText={(text) => setFormData({ ...formData, description: text })}
                placeholder="Enter description"
                multiline={true}
                numberOfLines={3}
              />
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Rating</Text>
                <TextInput
                  style={styles.input}
                  value={formData.rating.toString()}
                  onChangeText={(text) => setFormData({ ...formData, rating: text })}
                  placeholder="0.0"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                <Text style={styles.formLabel}>Category *</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                >
                  <Text>{formData.category}</Text>
                  <ChevronDown size={16} color="#666" />
                </TouchableOpacity>

                {categoryDropdownOpen && (
                  <View style={styles.dropdownMenuContainer}>
                    <ScrollView style={styles.dropdownMenu} nestedScrollEnabled={true}>
                      {categories.map((cat: Category) => (
                        <TouchableOpacity
                          key={cat}
                          style={styles.dropdownItem}
                          onPress={() => {
                            setFormData({
                              ...formData,
                              category: cat,
                              hasAddOns: categoriesWithAddOns.includes(cat) ? formData.hasAddOns : false
                            });
                            setCategoryDropdownOpen(false);
                          }}
                        >
                          <Text>{cat}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Food Type *</Text>
                <TouchableOpacity
                  style={styles.dropdownButton}
                  onPress={() => setFoodTypeMenuOpen(!foodTypeMenuOpen)}
                >
                  <Text>{formData.foodType}</Text>
                  <ChevronDown size={16} color="#666" />
                </TouchableOpacity>

                {foodTypeMenuOpen && (
                  <View style={styles.dropdownMenu}>
                    {['Veg', 'Non-Veg', 'Not Applicable'].map((type) => (
                      <TouchableOpacity
                        key={type}
                        style={styles.dropdownItem}
                        onPress={() => {
                          setFormData({ ...formData, foodType: type as FoodType });
                          setFoodTypeMenuOpen(false);
                        }}
                      >
                        <Text>{type}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </View>

            <View style={styles.formGroup}>
              <Text style={styles.formLabel}>Pricing Type *</Text>
              <View style={styles.segmentedControl}>
                <TouchableOpacity
                  style={[
                    styles.segmentedButton,
                    formData.sizeType === 'single' && styles.segmentedButtonActive
                  ]}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      sizeType: 'single',
                      hasMultipleSizes: false,
                      sizeVariations: []
                    });
                  }}
                >
                  {formData.sizeType === 'single' && (
                    <Check size={16} color="#FF6B00" style={styles.segmentedCheckIcon} />
                  )}
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      formData.sizeType === 'single' && styles.segmentedButtonTextActive
                    ]}
                  >
                    Single Price
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.segmentedButton,
                    formData.sizeType === 'multiple' && styles.segmentedButtonActive
                  ]}
                  onPress={() => {
                    setFormData({
                      ...formData,
                      sizeType: 'multiple',
                      hasMultipleSizes: true,
                      price: ''
                    });
                  }}
                >
                  {formData.sizeType === 'multiple' && (
                    <Check size={16} color="#FF6B00" style={styles.segmentedCheckIcon} />
                  )}
                  <Text
                    style={[
                      styles.segmentedButtonText,
                      formData.sizeType === 'multiple' && styles.segmentedButtonTextActive
                    ]}
                  >
                    Multiple Sizes
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {formData.sizeType === 'single' ? (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Price (₹) *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.price}
                  onChangeText={(text) => {
                    const filtered = text.replace(/[^0-9.]/g, '');
                    setFormData({ ...formData, price: filtered });
                  }}
                  placeholder="0.00"
                  keyboardType="decimal-pad"
                />
              </View>
            ) : (
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Size Variations *</Text>
                {sizeVariations.length === 0 && (
                  <Text style={styles.warningText}>
                    Please add at least one size variation
                  </Text>
                )}

                <View style={styles.sizeVariationsContainer}>
                  {sizeVariations.map((variation, index) => (
                    <View key={index} style={styles.sizeVariationItem}>
                      <View style={styles.sizeVariationInfo}>
                        <Text style={styles.sizeVariationText}>
                          {variation.size} - ₹{variation.price.toFixed(2)}
                        </Text>
                        <Switch
                          trackColor={{ false: '#CCCCCC', true: '#FFD2B3' }}
                          thumbColor={variation.available ? '#FF6B00' : '#F4F4F4'}
                          onValueChange={() => {
                            const updatedVariations = [...sizeVariations];
                            updatedVariations[index].available = !updatedVariations[index].available;
                            setSizeVariations(updatedVariations);
                          }}
                          value={variation.available}
                        />
                      </View>
                      <TouchableOpacity
                        style={styles.removeSizeButton}
                        onPress={() => removeSizeVariation(index)}
                      >
                        <Trash2 size={16} color="#F44336" />
                      </TouchableOpacity>
                    </View>
                  ))}
                </View>

                <View style={styles.addSizeContainer}>
                  <View style={styles.sizeInputContainer}>
                    <Text style={styles.sizeLabel}>Size:</Text>
                    <TouchableOpacity
                      style={styles.sizeDropdownButton}
                      onPress={() => setSizeMenuOpen(!sizeMenuOpen)}
                    >
                      <Text style={styles.sizeDropdownText}>{newSize}</Text>
                      <ChevronDown size={16} color="#666" />
                    </TouchableOpacity>

                    {sizeMenuOpen && (
                      <View style={styles.dropdownMenuContainer}>
                        <ScrollView style={styles.sizeDropdownMenu}>
                          {sizes.map((sizeOption) => (
                            <TouchableOpacity
                              key={sizeOption}
                              style={styles.sizeDropdownItem}
                              onPress={() => {
                                setNewSize(sizeOption);
                                setSizeMenuOpen(false);
                              }}
                            >
                              <Text style={styles.dropdownItemText}>{sizeOption}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>

                  <View style={styles.priceInputContainer}>
                    <Text style={styles.formLabel}>Price (₹) *</Text>
                    <TextInput
                      style={styles.sizePriceInput}
                      value={newSizePrice}
                      onChangeText={(text) => {
                        const filtered = text.replace(/[^0-9.]/g, '');
                        setNewSizePrice(filtered);
                      }}
                      placeholder="0.00"
                      keyboardType="decimal-pad"
                    />
                  </View>

                  <TouchableOpacity
                    style={styles.addSizeButton}
                    onPress={addSizeVariation}
                    disabled={!newSizePrice}
                  >
                    <Plus size={16} color="#FFFFFF" />
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {categoriesWithAddOns.includes(formData.category) && (
              <View style={styles.formGroup}>
                <View style={styles.addOnsHeader}>
                  <Text style={styles.formLabel}>Customization Options</Text>
                  <TouchableOpacity
                    style={styles.toggleSwitchContainer}
                    onPress={() => setFormData({ ...formData, hasAddOns: !formData.hasAddOns })}
                  >
                    <Text style={styles.toggleSwitchText}>
                      {formData.hasAddOns ? 'Enabled' : 'Disabled'}
                    </Text>
                    <Switch
                      trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                      thumbColor={formData.hasAddOns ? "#FF6B00" : "#F4F4F4"}
                      onValueChange={(value) => setFormData({ ...formData, hasAddOns: value })}
                      value={formData.hasAddOns}
                    />
                  </TouchableOpacity>
                </View>

                {formData.hasAddOns && (
                  <>
                    {addOnGroups.length === 0 && (
                      <Text style={styles.warningText}>
                        Add at least one customization group
                      </Text>
                    )}

                    {addOnGroups.map(renderAddOnGroup)}

                    <TouchableOpacity
                      style={styles.addAddOnGroupButton}
                      onPress={() => setShowAddOnGroupModal(true)}
                    >
                      <Plus size={16} color="#FF6B00" />
                      <Text style={styles.addAddOnGroupButtonText}>Add Customization Group</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            )}

            <View style={styles.formRow}>
              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Available</Text>
                <Switch
                  trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                  thumbColor={formData.available ? "#FF6B00" : "#F4F4F4"}
                  onValueChange={(value) => setFormData({ ...formData, available: value })}
                  value={formData.available}
                />
              </View>

              <View style={[styles.formGroup, { flex: 1 }]}>
                <Text style={styles.formLabel}>Mark as Popular</Text>
                <Switch
                  trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                  thumbColor={formData.popular ? "#FF6B00" : "#F4F4F4"}
                  onValueChange={(value) => setFormData({ ...formData, popular: value })}
                  value={formData.popular}
                />
              </View>
            </View>
          </ScrollView>

          <TouchableOpacity
            style={[
              styles.saveButton,
              (!formData.name || !formData.description ||
                (formData.sizeType === 'single' && !formData.price) ||
                (formData.sizeType === 'multiple' && sizeVariations.length === 0) ||
                (formData.hasAddOns && addOnGroups.length === 0)) &&
              styles.saveButtonDisabled
            ]}
            onPress={handleSubmit}
            disabled={
              !formData.name || !formData.description ||
              (formData.sizeType === 'single' && !formData.price) ||
              (formData.sizeType === 'multiple' && sizeVariations.length === 0) ||
              (formData.hasAddOns && addOnGroups.length === 0)
            }
          >
            <Save size={20} color="#FFFFFF" />
            <Text style={styles.saveButtonText}>Update Item</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Add On Group Modal */}
      <Modal
        visible={showAddOnGroupModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowAddOnGroupModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.smallModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Customization Group</Text>
              <TouchableOpacity onPress={() => setShowAddOnGroupModal(false)}>
                <X size={24} color="#1F2937" />
              </TouchableOpacity>
            </View>

            <View style={styles.formContainer}>
              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Group Name *</Text>
                <TextInput
                  style={styles.input}
                  value={newAddOnGroup.name}
                  onChangeText={(text) => setNewAddOnGroup({ ...newAddOnGroup, name: text })}
                  placeholder="e.g., Cheese Options, Toppings"
                />
              </View>

              <View style={styles.formRow}>
                <View style={[styles.formGroup, { flex: 1, marginRight: 10 }]}>
                  <Text style={styles.formLabel}>Min Selections</Text>
                  <View style={styles.numberInputContainer}>
                    <TouchableOpacity
                      style={styles.numberInputButton}
                      onPress={() => {
                        if (newAddOnGroup.minSelection > 0) {
                          setNewAddOnGroup({ ...newAddOnGroup, minSelection: newAddOnGroup.minSelection - 1 });
                        }
                      }}
                    >
                      <Minus size={16} color="#666" />
                    </TouchableOpacity>
                    <Text style={styles.numberInputText}>{newAddOnGroup.minSelection}</Text>
                    <TouchableOpacity
                      style={styles.numberInputButton}
                      onPress={() => {
                        if (newAddOnGroup.minSelection < newAddOnGroup.maxSelection) {
                          setNewAddOnGroup({ ...newAddOnGroup, minSelection: newAddOnGroup.minSelection + 1 });
                        }
                      }}
                    >
                      <Plus size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>

                <View style={[styles.formGroup, { flex: 1 }]}>
                  <Text style={styles.formLabel}>Max Selections</Text>
                  <View style={styles.numberInputContainer}>
                    <TouchableOpacity
                      style={styles.numberInputButton}
                      onPress={() => {
                        if (newAddOnGroup.maxSelection > 1 && newAddOnGroup.maxSelection > newAddOnGroup.minSelection) {
                          setNewAddOnGroup({ ...newAddOnGroup, maxSelection: newAddOnGroup.maxSelection - 1 });
                        }
                      }}
                    >
                      <Minus size={16} color="#666" />
                    </TouchableOpacity>
                    <Text style={styles.numberInputText}>{newAddOnGroup.maxSelection}</Text>
                    <TouchableOpacity
                      style={styles.numberInputButton}
                      onPress={() => {
                        setNewAddOnGroup({ ...newAddOnGroup, maxSelection: newAddOnGroup.maxSelection + 1 });
                      }}
                    >
                      <Plus size={16} color="#666" />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>

              <View style={styles.formGroup}>
                <Text style={styles.formLabel}>Required</Text>
                <Switch
                  trackColor={{ false: "#CCCCCC", true: "#FFD2B3" }}
                  thumbColor={newAddOnGroup.required ? "#FF6B00" : "#F4F4F4"}
                  onValueChange={(value) => setNewAddOnGroup({ ...newAddOnGroup, required: value })}
                  value={newAddOnGroup.required}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.saveButton,
                  !newAddOnGroup.name && styles.saveButtonDisabled
                ]}
                onPress={addAddOnGroup}
                disabled={!newAddOnGroup.name}
              >
                <Text style={styles.saveButtonText}>Add Group</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Use CustomizationModal for add-ons with size-specific pricing */}
      <CustomizationModal
        visible={showAddOnModal}
        onClose={() => setShowAddOnModal(false)}
        onAddCustomization={handleAddCustomization}
        sizes={sizes}  // Pass the sizes prop
      />
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  modalContent: {
    width: '90%',
    maxHeight: '80%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  smallModalContent: {
    width: '90%',
    maxHeight: '60%',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  formContainer: {
    maxHeight: 400,
  },
  formGroup: {
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 5,
  },
  input: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  formRow: {
    flexDirection: 'row',
    marginBottom: 15,
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 10,
  },
  dropdownMenuContainer: {
    position: 'absolute',
    top: 75,
    left: 0,
    right: 0,
    zIndex: 1000,
    elevation: 5,
    maxHeight: 200,
  },
  dropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    maxHeight: 200,
  },
  dropdownItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  imageUploadContainer: {
    height: 120,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#EEEEEE',
    borderStyle: 'dashed',
  },
  uploadIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#FFE0CC',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  uploadText: {
    color: '#666666',
  },
  uploadedImageContainer: {
    width: '100%',
    height: '100%',
    borderRadius: 8,
    overflow: 'hidden',
  },
  uploadedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  uploadProgressOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadProgressText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 8,
  },
  uploadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadingText: {
    color: '#666666',
    marginTop: 10,
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
    paddingVertical: 12,
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
  segmentedCheckIcon: {
    marginRight: 6,
  },
  warningText: {
    color: '#EF4444',
    fontSize: 12,
    marginBottom: 8,
    fontStyle: 'italic',
  },
  sizeVariationsContainer: {
    marginBottom: 10,
  },
  sizeVariationItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    padding: 8,
    borderRadius: 4,
    marginBottom: 5,
  },
  sizeVariationInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sizeVariationText: {
    fontSize: 14,
  },
  removeSizeButton: {
    padding: 4,
  },
  addSizeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 5,
  },
  sizeInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  sizeLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  sizeDropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
  },
  sizeDropdownMenu: {
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#EEEEEE',
    maxHeight: 150,
  },
  sizeDropdownItem: {
    padding: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#EEEEEE',
  },
  sizeDropdownText: {
    fontSize: 14,
  },
  dropdownItemText: {
    fontSize: 14,
    color: '#333333',
    paddingVertical: 2
  },
  priceInputContainer: {
    flex: 1,
    marginRight: 10,
  },
  sizePriceInput: {
    backgroundColor: '#F5F5F5',
    borderRadius: 4,
    padding: 8,
    fontSize: 14,
  },
  addSizeButton: {
    width: 36,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    borderRadius: 18,
    marginTop: 16,
  },
  // Add-ons specific styles
  addOnsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  toggleSwitchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  toggleSwitchText: {
    marginRight: 8,
    fontSize: 14,
    color: '#666666',
  },
  addOnGroupContainer: {
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  addOnGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addOnGroupName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#1F2937',
  },
  addOnGroupActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addOnGroupActionButton: {
    marginLeft: 10,
  },
  requiredText: {
    fontSize: 12,
    color: '#666666',
  },
  requiredTextActive: {
    color: '#FF6B00',
    fontWeight: 'bold',
  },
  addOnGroupSelectionText: {
    fontSize: 12,
    color: '#666666',
    marginBottom: 8,
    fontStyle: 'italic',
  },
  addOnsList: {
    marginTop: 8,
  },
  addOnItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 4,
    padding: 8,
    marginBottom: 6,
  },
  addOnInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  addOnName: {
    marginLeft: 8,
    fontSize: 14,
  },
  addOnPrice: {
    fontSize: 14,
    color: '#FF6B00',
    marginRight: 8,
  },
  // New styles for size-specific pricing
  sizePriceContainer: {
    flexDirection: 'column',
    alignItems: 'flex-end',
    marginRight: 8,
  },
  sizePrice: {
    fontSize: 12,
    color: '#FF6B00',
    marginBottom: 2,
  },
  removeAddOnButton: {
    padding: 4,
  },
  addAddOnGroupButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFE0CC',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  addAddOnGroupButtonText: {
    color: '#FF6B00',
    marginLeft: 8,
    fontWeight: 'bold',
  },
  numberInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    paddingHorizontal: 10,
  },
  numberInputButton: {
    padding: 8,
  },
  numberInputText: {
    fontSize: 14,
    marginHorizontal: 10,
  },
  saveButton: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FF6B00',
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 20,
  },
  saveButtonDisabled: {
    backgroundColor: '#CCCCCC',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default EditMenuItem;