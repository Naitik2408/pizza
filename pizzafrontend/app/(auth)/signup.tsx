import { useState } from 'react';
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
  SafeAreaView
} from 'react-native';
import { useRouter } from 'expo-router';
import { Lock, Mail, User, ChevronRight, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { API_URL } from '@/config';

const { width, height } = Dimensions.get('window');

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function SignupScreen() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [role, setRole] = useState('customer'); // Default role
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Add validation state variables
  const [nameError, setNameError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [confirmPasswordError, setConfirmPasswordError] = useState<string | null>(null);
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
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  const handleSignup = async () => {
    // Set form as touched to show validation errors
    setFormTouched(true);

    // Validate all inputs before attempting signup
    const isNameValid = validateName(name);
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);
    const isConfirmPasswordValid = validateConfirmPassword(password, confirmPassword);

    // Only proceed if all validations pass
    if (!isNameValid || !isEmailValid || !isPasswordValid || !isConfirmPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await response.json();

      if (response.ok) {
        Alert.alert(
          'Success',
          'Account created successfully. Please sign in.',
          [
            {
              text: 'Sign In',
              onPress: () => router.replace('/(auth)/login')
            }
          ]
        );
      } else {
        Alert.alert('Error', data.message || 'Failed to create account');
      }
    } catch (error) {
      console.error('Signup error:', error);
      Alert.alert('Connection Error', 'Unable to connect to the server. Please check your internet connection and try again.');
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
              source={{ uri: 'https://img.freepik.com/free-photo/smiling-good-looking-deliveryman-with-pizza-boxes_273609-31433.jpg?t=st=1745241002~exp=1745244602~hmac=91c441ad50fc982982c159788a95388da7e9484819564ee5a6f8b1a59c6999fc&w=1380' }}
              style={styles.headerImage}
              resizeMode="cover"
            />
            {/* <View style={styles.overlay} /> */}
            {/* <View style={styles.headerContent}>
              <Text style={styles.title}>Create Account</Text>
              <Text style={styles.subtitle}>Join us to start ordering delicious pizzas</Text>
            </View> */}
          </View>

          {/* Signup Form */}
          <View style={styles.formContainer}>
            <View style={styles.form}>
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

              {/* Sign Up Button */}
              <TouchableOpacity
                style={[
                  styles.signupButton,
                  (isLoading || (formTouched && (!!nameError || !!emailError || !!passwordError || !!confirmPasswordError)))
                  && styles.signupButtonDisabled
                ]}
                onPress={handleSignup}
                disabled={isLoading || (formTouched && (!!nameError || !!emailError || !!passwordError || !!confirmPasswordError))}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.signupButtonText}>Create Account</Text>
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
});