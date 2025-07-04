// Define Razorpay interface types
export interface RazorpayOptions {
  key: string;
  amount: number;
  currency: string;
  name: string;
  description?: string;
  image?: string;
  order_id: string;
  prefill?: {
    name?: string;
    email?: string;
    contact?: string;
    method?: string;
  };
  theme?: {
    color?: string;
    backdrop_color?: string;
    hide_topbar?: boolean;
  };
  modal?: {
    confirm_close?: boolean;
    ondismiss?: () => void;
    animation?: boolean;
  };
  notes?: Record<string, string>;
  retry?: {
    enabled?: boolean;
    max_count?: number;
  };
  send_sms_hash?: boolean;
  readonly?: boolean;
  callback_url?: string;
  redirect?: boolean;
  [key: string]: any;
}

export interface RazorpaySuccessResponse {
  razorpay_payment_id: string;
  razorpay_order_id: string;
  razorpay_signature: string;
  [key: string]: any;
}

export interface RazorpayErrorResponse {
  code?: string;
  description?: string;
  source?: string;
  step?: string;
  reason?: string;
  metadata?: any;
  [key: string]: any;
}

export interface RazorpayInterface {
  open: (options: RazorpayOptions) => Promise<RazorpaySuccessResponse>;
  on?: (event: string, callback: (data: any) => void) => void;
  [key: string]: any;
}

// A wrapper around Razorpay to handle import errors gracefully
let RazorpayCheckout: RazorpayInterface | null = null;

try {
  // Try to import the module
  const module = require('react-native-razorpay');
  RazorpayCheckout = module as RazorpayInterface;
} catch (error) {
  console.warn('Razorpay native module could not be loaded:', 
    error instanceof Error ? error.message : String(error));
    
  // Create a mock implementation that falls back to the WebView approach
  RazorpayCheckout = {
    open: () => Promise.reject(new Error('Native Razorpay module not available')),
    on: (event: string, callback: (data: any) => void) => {
      // No-op implementation for compatibility
      console.warn('Razorpay event binding not available: ', event);
    }
  };
}

/**
 * Check if the native Razorpay module is available
 * @returns {boolean} True if the native module is available and functional
 */
export const isNativeRazorpayAvailable = (): boolean => {
  return RazorpayCheckout !== null && typeof RazorpayCheckout.open === 'function';
};

/**
 * Get the Razorpay module
 * If the native module is not available, this will return a mock implementation
 * that rejects with an error, allowing you to fall back to the WebView approach
 */
export default RazorpayCheckout as RazorpayInterface;