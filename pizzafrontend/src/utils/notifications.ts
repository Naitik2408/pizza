import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_URL } from '@/config';
import AsyncStorage from '@react-native-async-storage/async-storage';
import firebaseConfig from '../../firebaseConfig';

// Define types for Firebase modules
type FirebaseApp = {
  name: string;
  options: object;
  automaticDataCollectionEnabled: boolean;
};

type FirebaseMessaging = {
  getToken: (messaging: any, options?: any) => Promise<string>;
  getMessaging: (app?: any) => any;
};

type FirebaseAppModule = {
  initializeApp: (config: object) => FirebaseApp;
  getApps: () => FirebaseApp[];
};

// Import Firebase if available
let firebase: FirebaseAppModule | undefined;
let messaging: FirebaseMessaging | undefined;

try {
  // Use dynamic import for Firebase modules
  firebase = require('firebase/app');
  messaging = require('firebase/messaging');
} catch (e) {
  console.log('Firebase modules not available');
}

// Try to initialize Firebase for native builds
let firebaseApp: FirebaseApp | undefined;
const FIREBASE_TOKEN_KEY = '@pizza_fcm_token';

// Set up notification handler
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

/**
 * Initialize Firebase if needed
 */
const initFirebaseMessaging = async (): Promise<boolean> => {
  if (Platform.OS !== 'web' && !__DEV__ && firebase && messaging) {
    try {
      // Check if Firebase is already initialized
      if (!firebaseApp) {
        firebaseApp = firebase.initializeApp(firebaseConfig);
      }
      return true;
    } catch (error) {
      // Firebase already initialized or error
      console.log('Firebase initialization issue:', error);
      return (firebase.getApps().length > 0);
    }
  }
  return false;
};

/**
 * Try to get the FCM token for production builds
 */
const getFCMToken = async (): Promise<string | null> => {
  if (await initFirebaseMessaging()) {
    try {
      // Check for cached token first
      const cachedToken = await AsyncStorage.getItem(FIREBASE_TOKEN_KEY);
      if (cachedToken) {
        console.log('Using cached FCM token');
        return cachedToken;
      }

      // Get a new token
      if (messaging && firebaseApp) {
        const messagingInstance = messaging.getMessaging(firebaseApp);
        const fcmToken = await messaging.getToken(messagingInstance);
        
        // Save token for future use
        if (fcmToken) {
          await AsyncStorage.setItem(FIREBASE_TOKEN_KEY, fcmToken);
        }
        
        console.log('New FCM token obtained:', fcmToken);
        return fcmToken;
      }
    } catch (error) {
      console.error('Error getting FCM token:', error);
    }
  }
  return null;
};

/**
 * Request notification permissions and get the appropriate token
 * First try Firebase token for production builds, fall back to Expo token
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  let token: string | null = null;

  // Physical device check
  if (!Device.isDevice) {
    console.log('Push notifications require a physical device');
    return null;
  }

  // Request permissions
  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;

  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') {
    console.log('Permission not granted for notifications');
    return null;
  }

  // Try getting FCM token first for production builds
  if (!__DEV__ && Platform.OS === 'android') {
    token = await getFCMToken();
    
    // If we got an FCM token, return it
    if (token) {
      console.log('Using FCM token for notifications:', token);
      return token;
    }
  }

  // Fall back to Expo push token
  try {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId;
    token = (await Notifications.getExpoPushTokenAsync({
      projectId: projectId || 'pizza-abe9a',
    })).data;

    console.log('Using Expo push token:', token);
    return token;
  } catch (error) {
    console.error('Error getting push token:', error);
    return null;
  }
}

/**
 * Register device token with backend
 */
export async function registerDeviceForNotifications(authToken: string): Promise<boolean> {
  try {
    // Get the push token
    const pushToken = await registerForPushNotificationsAsync();
    console.log('Registering device with token:', pushToken);

    if (!pushToken) {
      return false;
    }

    // Determine token type (FCM vs Expo)
    const tokenType = pushToken.startsWith('ExponentPushToken') ? 'expo' : 'fcm';

    // Register with backend
    const response = await fetch(`${API_URL}/api/device/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token: pushToken,
        platform: Platform.OS,
        tokenType: tokenType,
        deviceInfo: {
          brand: Device.brand,
          modelName: Device.modelName,
          osVersion: Device.osVersion,
          appVersion: Constants.expoConfig?.version || '1.0.0'
        }
      })
    });

    const data = await response.json();

    if (response.ok) {
      console.log('Device registered for notifications:', data);
      return true;
    } else {
      console.error('Error registering device:', data);
      return false;
    }
  } catch (error) {
    console.error('Failed to register device for notifications:', error);
    return false;
  }
}

/**
 * Unregister device token (for logout)
 */
export async function unregisterDeviceToken(authToken: string): Promise<boolean> {
  try {
    const pushToken = await AsyncStorage.getItem(FIREBASE_TOKEN_KEY) || 
                      (await registerForPushNotificationsAsync());

    if (!pushToken) {
      return true; // No token to unregister
    }

    const response = await fetch(`${API_URL}/api/device/unregister`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}`
      },
      body: JSON.stringify({
        token: pushToken
      })
    });

    if (response.ok) {
      // Clear stored FCM token
      await AsyncStorage.removeItem(FIREBASE_TOKEN_KEY);
    }

    return response.ok;
  } catch (error) {
    console.error('Error unregistering device token:', error);
    return false;
  }
}

/**
 * Set up notification listeners 
 */
export function setupNotificationListeners(
  onNotification: (notification: Notifications.Notification) => void,
  onNotificationResponse: (response: Notifications.NotificationResponse) => void
): () => void {
  // When a notification is received while the app is in the foreground
  const notificationListener = Notifications.addNotificationReceivedListener(
    notification => {
      console.log('Notification received in foreground:', notification);
      onNotification(notification);
    }
  );

  // When the user taps on a notification
  const responseListener = Notifications.addNotificationResponseReceivedListener(
    response => {
      console.log('Notification response received:', response);
      onNotificationResponse(response);
    }
  );

  // Return unsubscribe functions
  return () => {
    Notifications.removeNotificationSubscription(notificationListener);
    Notifications.removeNotificationSubscription(responseListener);
  };
}

/**
 * Schedule a local notification
 */
export async function scheduleLocalNotification(
  title: string, 
  body: string, 
  data: Record<string, unknown> = {},
  options: Partial<Notifications.NotificationRequestInput> = {}
): Promise<string | null> {
  try {
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title,
        body,
        data,
        sound: true,
        ...options.content
      },
      trigger: options.trigger || null
    });
    
    console.log('Scheduled local notification:', notificationId);
    return notificationId;
  } catch (error) {
    console.error('Failed to schedule notification:', error);
    return null;
  }
}

/**
 * Cancel all scheduled notifications
 */
export async function cancelAllNotifications(): Promise<void> {
  return Notifications.cancelAllScheduledNotificationsAsync();
}