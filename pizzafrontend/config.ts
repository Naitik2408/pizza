// Base API URL - update this to match your backend server address
// export const API_URL = 'http://192.168.154.48:5000'; 
// export const API_URL = 'https://pizza-backend-pi.vercel.app'; 
export const API_URL = 'https://pizzabackend-u9ui.onrender.com'; 

// For easier switching between environments
export const ENVIRONMENTS = {
  development: 'http://192.168.1.100:5000',
  staging: 'https://staging-api.yourpizzaapp.com',
  production: 'https://api.yourpizzaapp.com'
};

// Using the environment-based API URL
// You could replace the hardcoded API_URL with this function if needed
export const getApiUrl = (): string => {
  // You can implement logic to detect the current environment
  const currentEnv = 'development';
  return ENVIRONMENTS[currentEnv];
};

// Payment gateway settings
export const PAYMENT_CONFIG = {
  razorpay: {
    keyId: 'rzp_test_yourkeyhere',
    currency: 'INR',
    name: 'Pizza Shop',
    description: 'Pizza Order Payment'
  }
};

// Cloudinary configuration
export const CLOUDINARY_CONFIG = {
  cloudName: 'dhlxvdmot',
  apiKey: '924561765821468',
  uploadPreset: 'pizza_menu_items', // Unsigned upload preset
  folder: 'menu-items'
};

// App settings
export const APP_VERSION = '1.0.0';
export const APP_NAME = 'Pizza Shop';

// API request config
export const API_TIMEOUT = 30000; // 30 seconds timeout for API requests