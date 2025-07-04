// App Constants

// Colors
export const COLORS = {
  primary: '#F97316',
  primaryLight: '#FEF3E7',
  secondary: '#1c1917',
  success: '#4CAF50',
  warning: '#FF9800',
  error: '#F44336',
  info: '#2196F3',
  white: '#FFFFFF',
  black: '#000000',
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  background: '#F5F5F8',
  surface: '#FFFFFF',
  text: {
    primary: '#000000',
    secondary: '#666666',
    disabled: '#9CA3AF',
  },
  border: '#E5E7EB',
} as const;

// Sizes
export const SIZES = {
  // Padding
  padding: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  // Margin
  margin: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    xxl: 24,
  },
  // Font sizes
  fontSize: {
    xs: 10,
    sm: 12,
    md: 14,
    lg: 16,
    xl: 18,
    xxl: 20,
    xxxl: 24,
  },
  // Border radius
  borderRadius: {
    sm: 4,
    md: 8,
    lg: 12,
    xl: 16,
    xxl: 20,
    full: 9999,
  },
  // Icons
  icon: {
    sm: 16,
    md: 20,
    lg: 24,
    xl: 32,
  },
  // Avatar
  avatar: {
    sm: 32,
    md: 40,
    lg: 48,
    xl: 64,
  },
  // Images
  image: {
    thumbnail: 48,
    small: 80,
    medium: 120,
    large: 200,
  },
} as const;

// Font weights
export const FONT_WEIGHTS = {
  light: '300',
  regular: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
} as const;

// Shadows
export const SHADOWS = {
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  lg: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
} as const;

// Animation durations
export const ANIMATIONS = {
  fast: 150,
  normal: 300,
  slow: 500,
} as const;

// API Endpoints
export const API_ENDPOINTS = {
  auth: {
    login: '/api/auth/login',
    signup: '/api/auth/signup',
    logout: '/api/auth/logout',
    me: '/api/auth/me',
    refresh: '/api/auth/refresh',
  },
  menu: {
    items: '/api/menu/items',
    categories: '/api/menu/categories',
    search: '/api/menu/search',
  },
  orders: {
    create: '/api/orders',
    myOrders: '/api/orders/my-orders',
    track: '/api/orders/track',
    rate: '/api/orders/rate',
  },
  cart: {
    add: '/api/cart/add',
    remove: '/api/cart/remove',
    clear: '/api/cart/clear',
    get: '/api/cart',
  },
  offers: {
    active: '/api/offers/active',
    validate: '/api/offers/validate',
  },
  business: {
    info: '/api/business/info',
    hours: '/api/business/hours',
  },
  admin: {
    dashboard: '/api/admin/dashboard',
    orders: '/api/admin/orders',
    menu: '/api/admin/menu',
    users: '/api/admin/users',
    analytics: '/api/admin/analytics',
  },
  delivery: {
    assigned: '/api/delivery/assigned',
    update: '/api/delivery/update',
    complete: '/api/delivery/complete',
  },
  notifications: {
    register: '/api/notifications/register',
    unregister: '/api/notifications/unregister',
  },
} as const;

// Order statuses
export const ORDER_STATUSES = {
  PENDING: 'Pending',
  PREPARING: 'Preparing',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
} as const;

// Payment statuses
export const PAYMENT_STATUSES = {
  PENDING: 'Pending',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
  REFUNDED: 'Refunded',
} as const;

// Food types
export const FOOD_TYPES = {
  VEG: 'Veg',
  NON_VEG: 'Non-Veg',
} as const;

// User roles
export const USER_ROLES = {
  USER: 'user',
  ADMIN: 'admin',
  DELIVERY: 'delivery',
} as const;

// Screen names
export const SCREENS = {
  tabs: {
    HOME: 'home',
    MENU: 'menu',
    ORDERS: 'orders',
    PROFILE: 'profile',
  },
  auth: {
    LOGIN: 'login',
    SIGNUP: 'signup',
    FORGOT_PASSWORD: 'forgot-password',
  },
  admin: {
    DASHBOARD: 'dashboard',
    MENU: 'menu',
    ORDERS: 'orders',
    PROFILE: 'profile',
  },
  delivery: {
    ASSIGNED_ORDERS: 'assignedOrders',
    COMPLETED_ORDERS: 'completedOrders',
    PROFILE: 'profile',
    QR_SCANNER: 'qrscanner',
  },
  common: {
    CART: 'cart',
    UNAUTHORIZED: 'unauthorized',
    NOT_FOUND: '+not-found',
  },
} as const;

// Storage keys
export const STORAGE_KEYS = {
  TOKEN: 'auth_token',
  USER: 'user_data',
  CART: 'cart_data',
  THEME: 'app_theme',
  LANGUAGE: 'app_language',
  NOTIFICATIONS: 'notifications_enabled',
  ONBOARDING: 'onboarding_completed',
} as const;

// Validation rules
export const VALIDATION = {
  password: {
    minLength: 6,
    maxLength: 50,
  },
  phone: {
    minLength: 10,
    maxLength: 15,
  },
  email: {
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  },
  name: {
    minLength: 2,
    maxLength: 50,
  },
} as const;

// App config
export const APP_CONFIG = {
  name: 'Pizza App',
  version: '1.0.0',
  defaultLanguage: 'en',
  defaultCurrency: '₹',
  maxCartItems: 20,
  minOrderValue: 100,
  deliveryFee: 30,
  taxRate: 0.05, // 5%
  supportEmail: 'support@pizzaapp.com',
  supportPhone: '+1234567890',
} as const;

// Breakpoints for responsive design
export const BREAKPOINTS = {
  mobile: 0,
  tablet: 768,
  desktop: 1024,
} as const;

// Error messages
export const ERROR_MESSAGES = {
  network: 'Network error. Please check your connection.',
  server: 'Server error. Please try again later.',
  auth: {
    invalidCredentials: 'Invalid email or password.',
    sessionExpired: 'Your session has expired. Please log in again.',
    unauthorized: 'You are not authorized to perform this action.',
  },
  validation: {
    required: 'This field is required.',
    invalidEmail: 'Please enter a valid email address.',
    passwordTooShort: `Password must be at least ${VALIDATION.password.minLength} characters.`,
    passwordMismatch: 'Passwords do not match.',
    invalidPhone: 'Please enter a valid phone number.',
  },
  cart: {
    empty: 'Your cart is empty.',
    itemNotFound: 'Item not found in cart.',
    maxItems: `Maximum ${APP_CONFIG.maxCartItems} items allowed in cart.`,
  },
  order: {
    failed: 'Failed to place order. Please try again.',
    notFound: 'Order not found.',
    cannotCancel: 'This order cannot be cancelled.',
  },
} as const;

// Success messages
export const SUCCESS_MESSAGES = {
  auth: {
    loginSuccess: 'Login successful!',
    signupSuccess: 'Account created successfully!',
    logoutSuccess: 'Logged out successfully!',
  },
  cart: {
    itemAdded: 'Item added to cart!',
    itemRemoved: 'Item removed from cart!',
    cleared: 'Cart cleared!',
  },
  order: {
    placed: 'Order placed successfully!',
    cancelled: 'Order cancelled successfully!',
    rated: 'Thank you for your rating!',
  },
  profile: {
    updated: 'Profile updated successfully!',
  },
} as const;
