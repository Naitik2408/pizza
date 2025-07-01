import { useEffect } from 'react';
import * as Notifications from 'expo-notifications';
import { useSelector } from 'react-redux';
import { RootState } from '../../redux/store';
import { registerDeviceForNotifications } from '../../utils/notifications';

const NotificationService = () => {
  const { token } = useSelector((state: RootState) => state.auth);
  
  useEffect(() => {
    // Configure notification handler
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
    
    // Subscribe to notification received when app is in foreground
    const foregroundSubscription = Notifications.addNotificationReceivedListener(notification => {
      console.log('Notification received in foreground:', notification);
    });
    
    // Subscribe to notification response when notification is tapped
    const responseSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('Notification response:', response);
      // Handle notification tap here
    });
    
    // Register for notifications when user is logged in
    if (token) {
      registerDeviceForNotifications(token);
    }
    
    return () => {
      // Clean up listeners
      Notifications.removeNotificationSubscription(foregroundSubscription);
      Notifications.removeNotificationSubscription(responseSubscription);
    };
  }, [token]);
  
  // Empty render - this is just a service component
  return null;
};

export default NotificationService;