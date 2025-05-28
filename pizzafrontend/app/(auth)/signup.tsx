import { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Image,
  ScrollView,
  Alert,
  ActivityIndicator,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  StatusBar,
  SafeAreaView,
  Modal
} from 'react-native';
import { useRouter } from 'expo-router';
import {
  Lock,
  Mail,
  User,
  ChevronRight,
  Eye,
  EyeOff,
  AlertCircle,
  Camera,
  Upload,
  FileText,
  Check,
  Truck
} from 'lucide-react-native';
import { API_URL } from '@/config';
import * as ImagePicker from 'expo-image-picker';
import { CLOUDINARY_CONFIG } from '@/config';

const { width, height } = Dimensions.get('window');

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Vehicle type options
const VEHICLE_TYPES = [
  { label: 'Bike', value: 'bike' },
  { label: 'Scooter', value: 'scooter' },
  { label: 'Bicycle', value: 'bicycle' },
  { label: 'Car', value: 'car' }
];

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer'); // Default role
  const [vehicleType, setVehicleType] = useState('bike'); // Default vehicle type
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showVehicleTypeModal, setShowVehicleTypeModal] = useState(false);

  // Document upload states for delivery partners
  const [aadharCard, setAadharCard] = useState<string | null>(null);
  const [drivingLicense, setDrivingLicense] = useState<string | null>(null);
  const [uploadingAadhar, setUploadingAadhar] = useState(false);
  const [uploadingLicense, setUploadingLicense] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadType, setUploadType] = useState<'aadhar' | 'license' | null>(null);
  const [showUploadModal, setShowUploadModal] = useState(false);

  // Add validation state variables
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
  const [aadharError, setAadharError] = useState<string | null>(null);
  const [licenseError, setLicenseError] = useState<string | null>(null);
  const [vehicleTypeError, setVehicleTypeError] = useState<string | null>(null);
  const [formTouched, setFormTouched] = useState(false);

  // Validation functions
  const validateName = (name: string) => {
    if (!name.trim()) {
      setNameError('Name is required');
      return false;
    } else if (name.trim().length < 2) {
      setNameError('Name must be at least 2 characters');
      return false;
    } else {
      setNameError(null);
      return true;
    }
  };

  const validateEmail = (email: string) => {
    if (!email.trim()) {
      setEmailError('Email is required');
      return false;
    } else if (!EMAIL_REGEX.test(email)) {
      setEmailError('Please enter a valid email address');
      return false;
    } else {
      setEmailError(null);
      return true;
    }
  };

  const validatePassword = (password: string) => {
    if (!password) {
      setPasswordError('Password is required');
      return false;
    } else if (password.length < 6) {
      setPasswordError('Password must be at least 6 characters');
      return false;
    } else {
      setPasswordError(null);
      return true;
    }
  };

  const validateConfirmPassword = (password: string, confirmPassword: string) => {
    if (!confirmPassword) {
      setConfirmPasswordError('Please confirm your password');
      return false;
    } else if (password !== confirmPassword) {
      setConfirmPasswordError('Passwords do not match');
      return false;
    } else {
      setConfirmPasswordError(null);
      return true;
    }
  };

  const validateVehicleType = () => {
    if (role === 'delivery' && !vehicleType) {
      setVehicleTypeError('Please select a vehicle type');
      return false;
    } else {
      setVehicleTypeError(null);
      return true;
    }
  };

  const validateDocuments = () => {
    let isValid = true;

    if (role === 'delivery') {
      if (!aadharCard) {
        setAadharError('Aadhar card is required');
        isValid = false;
      } else {
        setAadharError(null);
      }

      if (!drivingLicense) {
        setLicenseError('Driving license is required');
        isValid = false;
      } else {
        setLicenseError(null);
      }
    }

    return isValid;
  };

  // Handle input changes with validation
  const handleNameChange = (text: string) => {
    setName(text);
    if (formTouched) {
      validateName(text);
    }
  };

  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (formTouched) {
      validateEmail(text);
    }
  };

  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (formTouched) {
      validatePassword(text);
      if (confirmPassword) {
        validateConfirmPassword(text, confirmPassword);
      }
    }
  };

  const handleConfirmPasswordChange = (text: string) => {
    setConfirmPassword(text);
    if (formTouched) {
      validateConfirmPassword(password, text);
    }
  };

  // Validate on blur
  const handleBlur = (field: string) => {
    setFocusedInput(null);
    setFormTouched(true);

    if (field === 'name') {
      validateName(name);
    } else if (field === 'email') {
      validateEmail(email);
    } else if (field === 'password') {
      validatePassword(password);
    } else if (field === 'confirmPassword') {
      validateConfirmPassword(password, confirmPassword);
    } else if (field === 'vehicleType') {
      validateVehicleType();
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  // Function to handle role selection
  const handleRoleSelect = (selectedRole: 'customer' | 'delivery') => {
    setRole(selectedRole);

    // Reset document errors when switching roles
    if (selectedRole !== 'delivery') {
      setAadharError(null);
      setLicenseError(null);
      setVehicleTypeError(null);
    }
  };

  const handleVehicleTypeSelect = (value: string) => {
    setVehicleType(value);
    setVehicleTypeError(null);
    setShowVehicleTypeModal(false);
  };

  // Document upload functions
  const openUploadModal = (type: 'aadhar' | 'license') => {
    setUploadType(type);
    setShowUploadModal(true);
  };

  const pickImage = async () => {
    try {
      console.log('Opening image picker...');
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      console.log('Image picker result:', {
        canceled: result.canceled,
        assetCount: result.assets?.length || 0
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const selectedImage = result.assets[0];

        // Set the correct upload type flag
        if (uploadType === 'aadhar') {
          setUploadingAadhar(true);
        } else if (uploadType === 'license') {
          setUploadingLicense(true);
        }

        // Close modal first
        setShowUploadModal(false);

        // Then upload to Cloudinary
        try {
          console.log(`Starting upload for document type: ${uploadType}`);
          const uploadUrl = await uploadImageToCloudinary(
            selectedImage,
            uploadType === 'aadhar' ? 'delivery/documents/aadhar' : 'delivery/documents/license'
          );

          console.log('Upload successful, URL:', uploadUrl.substring(0, 50) + '...');

          if (uploadType === 'aadhar') {
            setAadharCard(uploadUrl);
            setAadharError(null);
          } else if (uploadType === 'license') {
            setDrivingLicense(uploadUrl);
            setLicenseError(null);
          }
        } catch (error) {
          console.error('Upload failed:', error);
          Alert.alert('Upload Error', 'Failed to upload document. Please try again.');
        } finally {
          if (uploadType === 'aadhar') {
            setUploadingAadhar(false);
          } else if (uploadType === 'license') {
            setUploadingLicense(false);
          }
        }
      }
    } catch (error) {
      console.error('Image pick error:', error);
      Alert.alert('Error', 'Failed to pick image from gallery');
      if (uploadType === 'aadhar') {
        setUploadingAadhar(false);
      } else if (uploadType === 'license') {
        setUploadingLicense(false);
      }
    }
  };

  const takePhoto = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant camera permission to take photos');
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.8,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const capturedImage = result.assets[0];

        // Set the correct upload type flag
        if (uploadType === 'aadhar') {
          setUploadingAadhar(true);
        } else if (uploadType === 'license') {
          setUploadingLicense(true);
        }

        // Close modal first
        setShowUploadModal(false);

        // Then upload to Cloudinary
        try {
          const uploadUrl = await uploadImageToCloudinary(
            capturedImage,
            uploadType === 'aadhar' ? 'delivery/documents/aadhar' : 'delivery/documents/license'
          );

          if (uploadType === 'aadhar') {
            setAadharCard(uploadUrl);
            setAadharError(null);
          } else if (uploadType === 'license') {
            setDrivingLicense(uploadUrl);
            setLicenseError(null);
          }
        } catch (error) {
          console.error('Upload failed:', error);
          Alert.alert('Upload Error', 'Failed to upload document. Please try again.');
        } finally {
          if (uploadType === 'aadhar') {
            setUploadingAadhar(false);
          } else if (uploadType === 'license') {
            setUploadingLicense(false);
          }
        }
      }
    } catch (error) {
      console.error('Camera error:', error);
      Alert.alert('Error', 'Failed to take photo');
      if (uploadType === 'aadhar') {
        setUploadingAadhar(false);
      } else if (uploadType === 'license') {
        setUploadingLicense(false);
      }
    }
  };

  // Upload image to Cloudinary
  const uploadImageToCloudinary = async (image: any, folderName: string) => {
    if (!image.uri) {
      Alert.alert('Error', 'No image found to upload');
      throw new Error('No image URI available');
    }

    console.log('Preparing to upload image to Cloudinary:', image.uri);

    setUploadProgress(0);
    console.log('Starting upload to Cloudinary for:', folderName);

    try {
      // Prepare the form data for Cloudinary
      const formData = new FormData();
      formData.append('file', {
        uri: image.uri,
        type: 'image/jpeg', // Ensure the type is set correctly
        name: image.fileName || `upload-${Date.now()}.jpg`,
      } as any);
      formData.append('upload_preset', CLOUDINARY_CONFIG.uploadPreset);
      formData.append('folder', folderName);

      // Upload to Cloudinary
      const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/image/upload`;

      console.log('Sending upload request to Cloudinary...');
      const response = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data', // Explicitly set the Content-Type
        },
      });

      setUploadProgress(100);

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Cloudinary error response:', errorText);
        throw new Error('Failed to upload document to cloud storage');
      }

      const data = await response.json();
      console.log('Upload successful, received data from Cloudinary');
      return data.secure_url;
    } catch (error) {
      console.error('Upload error:', error);
      if ((error as any).name === 'AbortError') {
        throw new Error('Upload timed out. Please try again with a smaller image.');
      } else {
        throw new Error('Failed to upload document: ' + ((error as any).message || 'Network error'));
      }
    }
  };

  const handleSignup = async () => {
    // Set form as touched to show validation errors
    setFormTouched(true);

    // Validate all inputs before attempting signup
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(password, confirmPassword);
    const isVehicleTypeValid = validateVehicleType();
    const areDocumentsValid = validateDocuments();

    // Only proceed if all validations pass
    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid ||
      (role === 'delivery' && (!isVehicleTypeValid || !areDocumentsValid))) {
      console.log('Validation failed, stopping signup process');
      return;
    }

    setIsLoading(true);

    try {
      console.log('Preparing registration data...');
      // Prepare the data based on the user role
      const userData = {
        name,
        email,
        password,
        role,
        ...(role === 'delivery' ? {
          vehicleType,
          aadharCard,
          drivingLicense,
        } : {})
      };

      console.log(`Registering ${role} with data:`, {
        ...userData,
        password: '********',
        aadharCard: userData.aadharCard ? '[DOCUMENT URL]' : undefined,
        drivingLicense: userData.drivingLicense ? '[DOCUMENT URL]' : undefined
      });

      // Send the registration request
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
      });

      console.log('Registration response status:', response.status);
      const data = await response.json();
      console.log('Registration response data:', data);

      if (response.ok) {
        console.log('Registration successful!');
        Alert.alert(
          'Success',
          role === 'customer'
            ? 'Account created successfully. Please sign in.'
            : 'Your delivery partner application has been submitted. We will review your documents and contact you soon.',
          [{ text: 'Sign In', onPress: () => router.replace('/(auth)/login') }]
        );
      } else {
        console.error('Registration failed:', data.message);
        Alert.alert('Error', data.message || 'Failed to create account');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert(
        'Connection Error',
        'Unable to connect to the server. Please check your internet connection and try again.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContainer}
          showsVerticalScrollIndicator={false}
        >
          {/* Header with image and overlay */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/auth.png')}
              style={styles.headerImage}
              resizeMode="cover"
            />
            <View style={styles.overlay} />
            <View style={styles.headerContent}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join us to order or deliver delicious pizzas</Text>
            </View>
          </View>

          {/* Signup Form */}
          <View style={styles.formContainer}>
            <View style={styles.form}>
              {/* Role Selection Tabs */}
              <View style={styles.roleTabs}>
                <TouchableOpacity
                  style={[styles.roleTab, role === 'customer' && styles.activeRoleTab]}
                  onPress={() => handleRoleSelect('customer')}
                  disabled={isLoading}
                >
                  <Text style={[styles.roleTabText, role === 'customer' && styles.activeRoleTabText]}>
                    Customer
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.roleTab, role === 'delivery' && styles.activeRoleTab]}
                  onPress={() => handleRoleSelect('delivery')}
                  disabled={isLoading}
                >
                  <Text style={[styles.roleTabText, role === 'delivery' && styles.activeRoleTabText]}>
                    Delivery Partner
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Role Description */}
              <View style={styles.roleDescription}>
                <Text style={styles.roleDescriptionText}>
                  {role === 'customer'
                    ? 'Sign up as a customer to order food and enjoy our delicious pizzas delivered to your doorstep.'
                    : 'Join our delivery team to deliver food to customers and earn money. You will need to provide identification and license details.'}
                </Text>
              </View>

              {/* Name Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'name' && styles.inputContainerFocused,
                nameError && formTouched && styles.inputContainerError
              ]}>
                <User size={20} color={
                  nameError && formTouched ? '#DC2626' :
                    focusedInput === 'name' ? '#FF6B00' : '#666'
                } />
                <TextInput
                  style={styles.input}
                  placeholder="Full Name"
                  placeholderTextColor="#999"
                  value={name}
                  onChangeText={handleNameChange}
                  editable={!isLoading}
                  onFocus={() => setFocusedInput('name')}
                  onBlur={() => handleBlur('name')}
                />
                {nameError && formTouched && (
                  <AlertCircle size={20} color="#DC2626" />
                )}
              </View>

              {/* Name Error Message */}
              {nameError && formTouched && (
                <Text style={styles.errorText}>{nameError}</Text>
              )}

              {/* Email Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'email' && styles.inputContainerFocused,
                emailError && formTouched && styles.inputContainerError
              ]}>
                <Mail size={20} color={
                  emailError && formTouched ? '#DC2626' :
                    focusedInput === 'email' ? '#FF6B00' : '#666'
                } />
                <TextInput
                  style={styles.input}
                  placeholder="Email Address"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={email}
                  onChangeText={handleEmailChange}
                  editable={!isLoading}
                  onFocus={() => setFocusedInput('email')}
                  onBlur={() => handleBlur('email')}
                />
                {emailError && formTouched && (
                  <AlertCircle size={20} color="#DC2626" />
                )}
              </View>

              {/* Email Error Message */}
              {emailError && formTouched && (
                <Text style={styles.errorText}>{emailError}</Text>
              )}

              {/* Password Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'password' && styles.inputContainerFocused,
                passwordError && formTouched && styles.inputContainerError
              ]}>
                <Lock size={20} color={
                  passwordError && formTouched ? '#DC2626' :
                    focusedInput === 'password' ? '#FF6B00' : '#666'
                } />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={handlePasswordChange}
                  editable={!isLoading}
                  onFocus={() => setFocusedInput('password')}
                  onBlur={() => handleBlur('password')}
                />
                <TouchableOpacity
                  onPress={togglePasswordVisibility}
                  activeOpacity={0.7}
                  style={styles.passwordToggle}
                >
                  {showPassword ? (
                    <EyeOff size={20} color={passwordError && formTouched ? '#DC2626' : '#666'} />
                  ) : (
                    <Eye size={20} color={passwordError && formTouched ? '#DC2626' : '#666'} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Password Error Message */}
              {passwordError && formTouched && (
                <Text style={styles.errorText}>{passwordError}</Text>
              )}

              {/* Confirm Password Input */}
              <View style={[
                styles.inputContainer,
                focusedInput === 'confirmPassword' && styles.inputContainerFocused,
                confirmPasswordError && formTouched && styles.inputContainerError
              ]}>
                <Lock size={20} color={
                  confirmPasswordError && formTouched ? '#DC2626' :
                    focusedInput === 'confirmPassword' ? '#FF6B00' : '#666'
                } />
                <TextInput
                  style={styles.input}
                  placeholder="Confirm Password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={handleConfirmPasswordChange}
                  editable={!isLoading}
                  onFocus={() => setFocusedInput('confirmPassword')}
                  onBlur={() => handleBlur('confirmPassword')}
                />
                <TouchableOpacity
                  onPress={toggleConfirmPasswordVisibility}
                  activeOpacity={0.7}
                  style={styles.passwordToggle}
                >
                  {showConfirmPassword ? (
                    <EyeOff size={20} color={confirmPasswordError && formTouched ? '#DC2626' : '#666'} />
                  ) : (
                    <Eye size={20} color={confirmPasswordError && formTouched ? '#DC2626' : '#666'} />
                  )}
                </TouchableOpacity>
              </View>

              {/* Confirm Password Error Message */}
              {confirmPasswordError && formTouched && (
                <Text style={styles.errorText}>{confirmPasswordError}</Text>
              )}

              {/* Document Upload Section for Delivery Partners */}
              {role === 'delivery' && (
                <View style={styles.documentsSection}>
                  <Text style={styles.documentSectionTitle}>Required Information</Text>
                  <Text style={styles.documentDescription}>
                    Please provide your vehicle information and upload necessary documents
                  </Text>

                  {/* Vehicle Type Selection */}
                  <TouchableOpacity
                    style={[
                      styles.inputContainer,
                      focusedInput === 'vehicleType' && styles.inputContainerFocused,
                      vehicleTypeError && formTouched && styles.inputContainerError
                    ]}
                    onPress={() => setShowVehicleTypeModal(true)}
                    disabled={isLoading}
                  >
                    <Truck size={20} color={
                      vehicleTypeError && formTouched ? '#DC2626' :
                        focusedInput === 'vehicleType' ? '#FF6B00' : '#666'
                    } />
                    <Text style={[
                      styles.input,
                      !vehicleType && styles.placeholderText
                    ]}>
                      {VEHICLE_TYPES.find(v => v.value === vehicleType)?.label || "Select Vehicle Type"}
                    </Text>
                    <ChevronRight size={20} color="#666" />
                  </TouchableOpacity>

                  {/* Vehicle Type Error Message */}
                  {vehicleTypeError && formTouched && (
                    <Text style={styles.errorText}>{vehicleTypeError}</Text>
                  )}

                  {/* Aadhar Card Upload */}
                  <TouchableOpacity
                    style={[
                      styles.documentUploadButton,
                      aadharError && formTouched && styles.documentUploadError
                    ]}
                    onPress={() => openUploadModal('aadhar')}
                    disabled={isLoading || uploadingAadhar}
                  >
                    {aadharCard ? (
                      <View style={styles.uploadedContainer}>
                        <Image source={{ uri: aadharCard }} style={styles.uploadedThumbnail} />
                        <View style={styles.uploadedInfo}>
                          <Text style={styles.uploadedText}>Aadhar Card Uploaded</Text>
                          <Text style={styles.tapToChangeText}>Tap to change</Text>
                        </View>
                        <Check size={20} color="#10B981" />
                      </View>
                    ) : uploadingAadhar ? (
                      <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color="#FF6B00" />
                        <Text style={styles.uploadingText}>Uploading... {uploadProgress}%</Text>
                      </View>
                    ) : (
                      <View style={styles.uploadContainer}>
                        <Upload size={24} color={aadharError && formTouched ? '#DC2626' : '#666'} />
                        <Text style={[
                          styles.uploadText,
                          aadharError && formTouched && styles.uploadTextError
                        ]}>
                          Upload Aadhar Card
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Aadhar Error Message */}
                  {aadharError && formTouched && (
                    <Text style={styles.errorText}>{aadharError}</Text>
                  )}

                  {/* Driving License Upload */}
                  <TouchableOpacity
                    style={[
                      styles.documentUploadButton,
                      licenseError && formTouched && styles.documentUploadError
                    ]}
                    onPress={() => openUploadModal('license')}
                    disabled={isLoading || uploadingLicense}
                  >
                    {drivingLicense ? (
                      <View style={styles.uploadedContainer}>
                        <Image source={{ uri: drivingLicense }} style={styles.uploadedThumbnail} />
                        <View style={styles.uploadedInfo}>
                          <Text style={styles.uploadedText}>Driving License Uploaded</Text>
                          <Text style={styles.tapToChangeText}>Tap to change</Text>
                        </View>
                        <Check size={20} color="#10B981" />
                      </View>
                    ) : uploadingLicense ? (
                      <View style={styles.uploadingContainer}>
                        <ActivityIndicator size="large" color="#FF6B00" />
                        <Text style={styles.uploadingText}>Uploading... {uploadProgress}%</Text>
                      </View>
                    ) : (
                      <View style={styles.uploadContainer}>
                        <FileText size={24} color={licenseError && formTouched ? '#DC2626' : '#666'} />
                        <Text style={[
                          styles.uploadText,
                          licenseError && formTouched && styles.uploadTextError
                        ]}>
                          Upload Driving License
                        </Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* License Error Message */}
                  {licenseError && formTouched && (
                    <Text style={styles.errorText}>{licenseError}</Text>
                  )}
                </View>
              )}

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  (isLoading || (formTouched && (
                    !!nameError ||
                    !!emailError ||
                    !!passwordError ||
                    !!confirmPasswordError ||
                    (role === 'delivery' && (!!aadharError || !!licenseError || !!vehicleTypeError))
                  )))
                  && styles.signupButtonDisabled
                ]}
                onPress={handleSignup}
                disabled={isLoading || uploadingAadhar || uploadingLicense || (formTouched && (
                  !!nameError ||
                  !!emailError ||
                  !!passwordError ||
                  !!confirmPasswordError ||
                  (role === 'delivery' && (!!aadharError || !!licenseError || !!vehicleTypeError))
                ))}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.signupButtonText}>
                      {role === 'customer' ? 'Create Account' : 'Submit Application'}
                    </Text>
                    <ChevronRight size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Sign In Link */}
              <TouchableOpacity
                style={styles.loginLink}
                onPress={() => router.push('/(auth)/login')}
                disabled={isLoading}
              >
                <Text style={styles.loginText}>
                  Already have an account? <Text style={styles.loginTextBold}>Sign In</Text>
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Document Upload Modal */}
      <Modal
        visible={showUploadModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUploadModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Upload Document</Text>
            <Text style={styles.modalDescription}>
              Choose how you want to upload your {uploadType === 'aadhar' ? 'Aadhar Card' : 'Driving License'}
            </Text>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={takePhoto}
              disabled={uploadingAadhar || uploadingLicense}
            >
              <Camera size={24} color="#1F2937" />
              <Text style={styles.modalOptionText}>Take a Photo</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalOption}
              onPress={pickImage}
              disabled={uploadingAadhar || uploadingLicense}
            >
              <Upload size={24} color="#1F2937" />
              <Text style={styles.modalOptionText}>Choose from Gallery</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowUploadModal(false)}
              disabled={uploadingAadhar || uploadingLicense}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Vehicle Type Selection Modal */}
      <Modal
        visible={showVehicleTypeModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowVehicleTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.vehicleModalContent}>
            <Text style={styles.modalTitle}>Select Vehicle Type</Text>

            <View style={styles.vehicleTypeList}>
              {VEHICLE_TYPES.map((vehicle) => (
                <TouchableOpacity
                  key={vehicle.value}
                  style={[
                    styles.vehicleTypeOption,
                    vehicleType === vehicle.value && styles.vehicleTypeOptionSelected
                  ]}
                  onPress={() => handleVehicleTypeSelect(vehicle.value)}
                >
                  <Text style={[
                    styles.vehicleTypeText,
                    vehicleType === vehicle.value && styles.vehicleTypeTextSelected
                  ]}>
                    {vehicle.label}
                  </Text>
                  {vehicleType === vehicle.value && (
                    <Check size={20} color="#FF6B00" />
                  )}
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity
              style={styles.modalCancelButton}
              onPress={() => setShowVehicleTypeModal(false)}
            >
              <Text style={styles.modalCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  keyboardAvoid: {
    flex: 1,
  },
  scrollContainer: {
    flexGrow: 1,
  },
  header: {
    height: height * 0.35,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
  headerContent: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#fff',
    opacity: 0.9,
    letterSpacing: 0.2,
  },
  formContainer: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    marginTop: -30,
    paddingBottom: 40,
  },
  form: {
    padding: 24,
    paddingTop: 40,
  },
  // Role selection tabs
  roleTabs: {
    flexDirection: 'row',
    marginBottom: 20,
    borderRadius: 16,
    backgroundColor: '#f7f7f7',
    padding: 4,
  },
  roleTab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 12,
  },
  activeRoleTab: {
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  roleTabText: {
    fontSize: 16,
    color: '#888',
    fontWeight: '500',
  },
  activeRoleTabText: {
    color: '#FF6B00',
    fontWeight: '600',
  },
  roleDescription: {
    backgroundColor: '#FFF8F3',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderLeftWidth: 4,
    borderLeftColor: '#FF6B00',
  },
  roleDescriptionText: {
    fontSize: 14,
    color: '#666',
    lineHeight: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f7f7f7',
    borderRadius: 16,
    paddingHorizontal: 16,
    marginBottom: 8,
    height: 60,
    borderWidth: 1,
    borderColor: '#eee',
  },
  inputContainerFocused: {
    borderColor: '#FF6B00',
    backgroundColor: '#FFF8F3',
  },
  inputContainerError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  input: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  placeholderText: {
    color: '#999',
  },
  passwordToggle: {
    padding: 8,
  },
  errorText: {
    color: '#DC2626',
    fontSize: 12,
    marginLeft: 12,
    marginBottom: 16,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  signupButton: {
    backgroundColor: '#1c1917',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  signupButtonDisabled: {
    backgroundColor: '#44403c',
    elevation: 0,
    shadowOpacity: 0,
  },
  signupButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  loginLink: {
    alignItems: 'center',
  },
  loginText: {
    fontSize: 16,
    color: '#444',
  },
  loginTextBold: {
    color: '#FF6B00',
    fontWeight: '700',
  },
  // Document upload section
  documentsSection: {
    marginTop: 16,
    marginBottom: 8,
  },
  documentSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1F2937',
    marginBottom: 8,
  },
  documentDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
  },
  documentUploadButton: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderStyle: 'dashed',
    borderRadius: 16,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
    backgroundColor: '#f9f9f9',
  },
  documentUploadError: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  uploadContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadText: {
    marginTop: 8,
    fontSize: 14,
    color: '#666',
  },
  uploadTextError: {
    color: '#DC2626',
  },
  uploadedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '90%',
    paddingHorizontal: 12,
  },
  uploadedThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  uploadedInfo: {
    flex: 1,
  },
  uploadedText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#1F2937',
  },
  tapToChangeText: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  uploadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  uploadingText: {
    color: '#666',
    marginTop: 10,
    fontSize: 14,
  },
  // Document upload modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#1F2937',
    marginBottom: 8,
  },
  modalDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  modalOptionText: {
    fontSize: 16,
    color: '#1F2937',
    marginLeft: 16,
  },
  modalCancelButton: {
    marginTop: 24,
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  modalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
  // Vehicle type modal
  vehicleModalContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 24,
    paddingBottom: Platform.OS === 'ios' ? 40 : 24,
  },
  vehicleTypeList: {
    marginTop: 8,
  },
  vehicleTypeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  vehicleTypeOptionSelected: {
    backgroundColor: '#FFF8F3',
  },
  vehicleTypeText: {
    fontSize: 16,
    color: '#1F2937',
  },
  vehicleTypeTextSelected: {
    color: '#FF6B00',
    fontWeight: '600',
  },
});