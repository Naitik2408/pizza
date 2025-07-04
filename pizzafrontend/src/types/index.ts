// Core Types for Pizza App

// Re-export admin menu types
export * from './adminMenu';

// User Types
export interface User {
  _id: string;
  email: string;
  name: string;
  phone: string;
  role: 'user' | 'admin' | 'delivery';
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// Auth Types
export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isGuest: boolean;
  loading: boolean;
  error: string | null;
}

// Address Types
export interface Address {
  id?: string;
  _id?: string;
  name?: string;
  phone?: string;
  addressLine1: string;
  addressLine2?: string;
  street?: string; // For backwards compatibility
  city: string;
  state: string;
  zipCode: string;
  landmark?: string;
  isDefault?: boolean;
  userId?: string;
}

// Menu Item Types
export interface MenuItem {
  _id: string;
  name: string;
  description: string;
  image: string;
  price: number;
  category: string;
  foodType: 'Veg' | 'Non-Veg';
  isAvailable: boolean;
  sizeVariations?: SizeVariation[];
  customizations?: CustomizationCategory[];
  addOns?: AddOnCategory[];
  createdAt: string;
  updatedAt: string;
}

export interface SizeVariation {
  size: 'Small' | 'Medium' | 'Large';
  price: number;
}

export interface CustomizationCategory {
  name: string;
  options: CustomizationOption[];
  required: boolean;
  allowMultiple: boolean;
}

export interface CustomizationOption {
  name: string;
  price: number;
}

export interface AddOnCategory {
  name: string;
  options: AddOnOption[];
  allowMultiple: boolean;
}

export interface AddOnOption {
  name: string;
  price: number;
}

// Cart Types
export interface CartItem {
  id: string;
  name: string;
  price: number;
  image: string;
  quantity: number;
  size?: string;
  foodType?: string;
  customizations?: Record<string, CustomizationOption>;
  addOns?: AddOnOption[];
}

export interface CartState {
  items: CartItem[];
  total: number;
  taxRate: number;
  taxAmount: number;
  deliveryFee: number;
  discount: Discount | null;
  discountAmount: number;
}

export interface Discount {
  code: string;
  type: 'percentage' | 'fixed';
  value: number;
  minOrderValue?: number;
}

// Order Types
export interface OrderItem {
  menuItemId?: string;
  name: string;
  quantity: number;
  price: number;
  size?: string;
  foodType?: string;
  image?: string;
  basePrice?: number;
  totalItemPrice?: number;
  customizations?: Array<{
    name: string;
    option: string;
    price: number;
  }>;
  addOns?: Array<{
    name: string;
    option?: string;
    price: number;
  }>;
  toppings?: Array<{
    name: string;
    option?: string;
    price: number;
  }>;
  specialInstructions?: string;
  hasCustomizations?: boolean;
  totalPrice?: number;
}

export interface StatusUpdate {
  status: string;
  time: string;
  note?: string;
}

export interface Order {
  _id: string;
  id?: string;
  orderNumber: string;
  date: string;
  time: string;
  createdAt: string;
  status: OrderStatus;
  items: OrderItem[];
  amount: number;
  customerName: string;
  customerPhone: string;
  address: Address;
  fullAddress: string;
  estimatedDeliveryTime?: string;
  deliveryAgent?: DeliveryAgent | null;
  paymentMethod: string;
  paymentStatus: PaymentStatus;
  statusUpdates: StatusUpdate[];
  notes?: string;
  subTotal?: number;
  tax?: number;
  deliveryFee?: number;
  discounts?: {
    code: string;
    amount: number;
    percentage?: number;
  };
}

export type OrderStatus = 'Pending' | 'Preparing' | 'Out for delivery' | 'Delivered' | 'Cancelled';
export type PaymentStatus = 'Pending' | 'Completed' | 'Failed' | 'Refunded';

// Delivery Agent Types
export interface DeliveryAgent {
  _id: string;
  name: string;
  phone: string;
  photo?: string;
}

// Business Types
export interface Business {
  _id: string;
  name: string;
  description: string;
  address: Address;
  phone: string;
  email: string;
  hours: BusinessHours;
  isOpen: boolean;
}

export interface BusinessHours {
  [key: string]: {
    open: string;
    close: string;
    isOpen: boolean;
  };
}

// Offer Types
export interface Offer {
  _id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  minOrderValue?: number;
  maxDiscount?: number;
  validFrom: string;
  validTo: string;
  isActive: boolean;
  applicableCategories?: string[];
  code?: string;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  message?: string;
  error?: string;
}

// Navigation Types
export interface TabParamList {
  home: undefined;
  menu: undefined;
  orders: undefined;
  profile: undefined;
}

export interface RootStackParamList {
  '(tabs)': undefined;
  '(auth)': undefined;
  admin: undefined;
  delivery: undefined;
  cart: { reorder?: string };
  unauthorized: undefined;
}

// Component Props Types
export interface ScreenProps {
  navigation?: any;
  route?: any;
}

// Form Types
export interface LoginForm {
  email: string;
  password: string;
}

export interface SignupForm {
  name: string;
  email: string;
  phone: string;
  password: string;
  confirmPassword: string;
}

export interface ProfileForm {
  name: string;
  email: string;
  phone: string;
}

// Notification Types
export interface NotificationPayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

export interface PushToken {
  token: string;
  userId: string;
  platform: 'ios' | 'android';
  isActive: boolean;
}
