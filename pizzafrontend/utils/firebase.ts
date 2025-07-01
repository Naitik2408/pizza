import { initializeApp } from 'firebase/app';
import { getMessaging, onMessage } from 'firebase/messaging';
import firebaseConfig from '../firebaseConfig';

// Initialize Firebase
export const firebaseApp = initializeApp(firebaseConfig);
export const messaging = getMessaging(firebaseApp);

// Handle foreground messages from Firebase
export const setupFirebaseMessaging = () => {
  try {
    onMessage(messaging, (payload) => {
      console.log('Firebase message received in foreground:', payload);
      // You can trigger a local notification here if needed
    });
  } catch (error) {
    console.error('Error setting up Firebase messaging:', error);
  }
};