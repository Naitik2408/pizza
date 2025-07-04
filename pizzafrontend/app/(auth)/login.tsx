import { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { login } from '../../redux/slices/authSlice';
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
import { Lock, Mail, ChevronRight, Eye, EyeOff, AlertCircle } from 'lucide-react-native';
import { API_URL } from '@/config';
import { LinearGradient } from 'expo-linear-gradient';
import { registerDeviceForNotifications } from '../../src/utils/notifications';

const { width, height } = Dimensions.get('window');

// Email regex pattern for validation
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export default function LoginScreen() {
  const router = useRouter();
  const dispatch = useDispatch();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [focusedInput, setFocusedInput] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Add validation state variables
  const [emailError, setEmailError] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [formTouched, setFormTouched] = useState(false);

  // Validate email whenever it changes
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

  // Validate password whenever it changes
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

  // Handle email change with validation
  const handleEmailChange = (text: string) => {
    setEmail(text);
    if (formTouched) {
      validateEmail(text);
    }
  };

  // Handle password change with validation
  const handlePasswordChange = (text: string) => {
    setPassword(text);
    if (formTouched) {
      validatePassword(text);
    }
  };

  // Validate on blur
  const handleBlur = (field: string) => {
    setFocusedInput(null);
    setFormTouched(true);

    if (field === 'email') {
      validateEmail(email);
    } else if (field === 'password') {
      validatePassword(password);
    }
  };

  const handleLogin = async () => {
    // Set form as touched to show validation errors
    setFormTouched(true);

    // Validate inputs before attempting login
    const isEmailValid = validateEmail(email);
    const isPasswordValid = validatePassword(password);

    // Only proceed if both validations pass
    if (!isEmailValid || !isPasswordValid) {
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${API_URL}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (response.ok) {
        // Store user data in Redux
        dispatch(
          login({
            token: data.token,
            role: data.role,
            name: data.name,
            email: data.email,
            userId: data._id || data.userId || '', // Add this line to include userId
          })
        );

        // Register for push notifications if admin or delivery role
        if (data.role === 'admin' || data.role === 'delivery') {
          registerDeviceForNotifications(data.token)
            .then(success => {

            })
            .catch(err => {
              console.error('Error during notification registration:', err);
            });
        }

        // Redirect based on role
        if (data.role === 'admin') {
          router.replace('/admin/dashboard');
        } else if (data.role === 'delivery') {
          router.replace('/delivery/assignedOrders');
        } else {
          router.replace('/(tabs)');
        }
      } else {
        Alert.alert('Login Failed', data.message || 'Invalid email or password');
      }
    } catch (error) {
      console.error('Login error:', error);
      Alert.alert('Connection Error', 'Unable to connect to the server. Please check your internet connection and try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
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
          {/* Header with pizza image and overlay */}
          <View style={styles.header}>
            <Image
              source={require('../../assets/images/auth.png')}
              style={styles.headerImage}
              resizeMode="cover"
            />
          </View>

          {/* Login Form */}
          <View style={styles.formContainer}>
            <View style={styles.form}>
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

              {/* Password Input with Show/Hide Toggle */}
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

              {/* Forgot Password Link */}
              <TouchableOpacity
                style={styles.forgotPassword}
                disabled={isLoading}
              >
                <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
              </TouchableOpacity>

              {/* Sign In Button */}
              <TouchableOpacity
                style={[
                  styles.loginButton,
                  (isLoading || (formTouched && (!!emailError || !!passwordError))) && styles.loginButtonDisabled
                ]}
                onPress={handleLogin}
                disabled={isLoading || (formTouched && (!!emailError || !!passwordError))}
                activeOpacity={0.8}
              >
                {isLoading ? (
                  <ActivityIndicator size="small" color="#ffffff" />
                ) : (
                  <View style={styles.buttonContent}>
                    <Text style={styles.loginButtonText}>Sign In</Text>
                    <ChevronRight size={20} color="#fff" />
                  </View>
                )}
              </TouchableOpacity>

              {/* Sign Up Link with separator */}
              <View style={styles.separatorContainer}>
                <View style={styles.separator} />
                <Text style={styles.separatorText}>OR</Text>
                <View style={styles.separator} />
              </View>

              {/* Sign Up Link */}
              <TouchableOpacity
                style={styles.signupLink}
                onPress={() => router.push('/signup')}
                disabled={isLoading}
              >
                <Text style={styles.signupText}>
                  Don't have an account? <Text style={styles.signupTextBold}>Sign Up</Text>
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
    height: height * 0.45,
    position: 'relative',
  },
  headerImage: {
    width: '100%',
    height: '100%',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
  },
  headerContent: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    paddingHorizontal: 24,
  },
  appName: {
    fontSize: 22,
    fontWeight: '800',
    color: '#FF6B00',
    marginBottom: 8,
    letterSpacing: 0.5,
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
    marginBottom: 8, // Reduced to make room for error messages
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
  forgotPassword: {
    alignSelf: 'flex-end',
    marginBottom: 28,
  },
  forgotPasswordText: {
    color: '#FF6B00',
    fontSize: 14,
    fontWeight: '600',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loginButton: {
    backgroundColor: '#1c1917',
    borderRadius: 16,
    height: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 28,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 5,
  },
  loginButtonDisabled: {
    backgroundColor: '#44403c',
    elevation: 0,
    shadowOpacity: 0,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
    marginRight: 8,
  },
  separatorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 24,
  },
  separator: {
    flex: 1,
    height: 1,
    backgroundColor: '#E5E5E5',
  },
  separatorText: {
    paddingHorizontal: 10,
    color: '#888',
    fontSize: 14,
  },
  signupLink: {
    alignItems: 'center',
  },
  signupText: {
    fontSize: 16,
    color: '#444',
  },
  signupTextBold: {
    color: '#FF6B00',
    fontWeight: '700',
  },
});