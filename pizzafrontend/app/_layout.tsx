import { useEffect, useRef } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store, { loadAuthState } from '../redux/store';
import { restoreAuthState } from '../redux/slices/authSlice';
import { RootState } from '../redux/store';
import { useRouter } from 'expo-router';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import orderAlertService from '../src/utils/orderAlertService';
import SystemLevelAlertService from '../src/utils/systemLevelAlertService';

// Enhanced notification configuration for alarm-like behavior
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const notificationType = notification.request.content.data?.type;
    
    // Handle new order notifications with maximum priority
    if (notificationType === 'new_order_alarm' || 
        notificationType === 'critical_order_alert' ||
        notificationType === 'system_level_alert' ||
        notificationType === 'escalating_alert') {
      return {
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
        priority: Notifications.AndroidNotificationPriority.MAX,
      };
    }
    
    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    };
  },
});

function AppInitializer() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { token, role } = useSelector((state: RootState) => state.auth);
  const notificationResponseListener = useRef<any>(null);
  const notificationReceivedListener = useRef<any>(null);

  // Initialize order alert service
  useEffect(() => {
    const initializeSystemAlerts = async () => {

      
      if (role === 'admin' || role === 'delivery') {

        
        // Initialize both in-app and system-level alerts

        orderAlertService.initializeSound();
        
        // Initialize the complete system-level alert service

        try {
          await SystemLevelAlertService.initialize();

        } catch (error) {
          console.error('❌ Failed to initialize system-level alert service:', error);
        }
      } else {

      }
    };

    initializeSystemAlerts();

    return () => {

      orderAlertService.cleanup();
    };
  }, [role]);

  // Set up push notification listeners
  useEffect(() => {
    // Set notification handler for foreground notifications
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowBanner: false, // We handle the alert ourselves
        shouldShowList: true,    // Allow in notification list
        shouldPlaySound: false,  // We handle the sound ourselves  
        shouldSetBadge: true,
      }),
    });

    // Handle notifications received while app is in foreground
    notificationReceivedListener.current = Notifications.addNotificationReceivedListener(notification => {

      
      const notificationType = notification.request.content.data?.type;

      
      // Trigger alarm for new order notifications (handle all types for compatibility)
      if ((notificationType === 'new_order_alarm' || 
           notificationType === 'new_order' || 
           notificationType === 'critical_order_alert' ||
           notificationType === 'system_level_alert' ||
           notificationType === 'escalating_alert') && 
          (role === 'admin' || role === 'delivery')) {
        

        
        const orderData = {
          orderId: String(notification.request.content.data?.orderId || ''),
          orderNumber: String(notification.request.content.data?.orderNumber || ''),
          customerName: String(notification.request.content.data?.customerName || 'Customer'),
          amount: parseInt(String(notification.request.content.data?.amount || '0'))
        };
        

        
        // Trigger in-app alert sound/vibration

        orderAlertService.playOrderAlert(orderData);
        
        // Note: Enhanced system-level alert already sent from orders page, no need to duplicate here

      }
    });

    // Handle notification taps (when app is in background or closed)
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;


      // Stop any active alerts (both in-app and system-level)
      orderAlertService.stopAlert();
      SystemLevelAlertService.dismissAllAlerts();

      // Navigate based on the notification data and user role
      if (data?.orderId) {
        if (role === 'admin') {
          router.push(`/admin/OrderManagement?openOrderId=${data.orderId}`);
        } else if (role === 'delivery') {
          router.push(`/delivery/assignedOrders?openOrderId=${data.orderId}`);
        }
      }
    });

    // Handle notification actions (when user taps action buttons)
    const notificationActionSubscription = Notifications.addNotificationResponseReceivedListener(response => {

      
      const { actionIdentifier, notification } = response;
      const orderData = notification.request.content.data;
      
      switch (actionIdentifier) {
        case 'view_order':
        case 'view_urgent':

          // Navigate to orders page
          router.push('/admin/OrderManagement');
          break;
          
        case 'mark_acknowledged':

          // You can implement acknowledgment storage here
          // This would stop the escalating alerts
          break;
          
        case 'dismiss_alert':
        case 'stop_alerts':

          // Cancel any pending escalating alerts for this order
          SystemLevelAlertService.dismissAllAlerts();
          break;
          
        default:

          // Default tap behavior - open the app
          if (role === 'admin') {
            router.push('/admin/OrderManagement');
          }
          break;
      }
    });

    // Cleanup function
    return () => {
      if (notificationResponseListener.current) {
        notificationResponseListener.current.remove();
      }
      if (notificationReceivedListener.current) {
        notificationReceivedListener.current.remove();
      }
    };
  }, [role, router]);

  // Auth initialization effect
  // Auth initialization effect
  useEffect(() => {
    const initializeAuthState = async () => {
      const authState = await loadAuthState();
      if (authState?.token) {
        // Type assertion to match the required input type for restoreAuthState
        dispatch(restoreAuthState({
          token: authState.token,
          role: authState.role || '',
          name: authState.name || '',
          email: authState.email || '',
          userId: authState.userId || '',
          isGuest: authState.isGuest
        }));
      } else {
        router.replace('/(auth)/login'); // Redirect to login if no token
      }
    };

    initializeAuthState();
  }, [dispatch, router]);

  // Role-based routing effect
  useEffect(() => {
    if (token) {
      // Redirect based on role
      if (role === 'admin') {
        router.replace('/admin/dashboard');
      } else if (role === 'delivery') {
        router.replace('/delivery/assignedOrders');
      } else {
        router.replace('/(tabs)'); // Customer home page
      }
    }
  }, [token, role, router]);

  return null;
}

export default function RootLayout() {
  return (
    <Provider store={store}>
      <AppInitializer />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
        <Stack.Screen name="admin" />
        <Stack.Screen name="delivery" />
        {/* <Stack.Screen name="cart" /> */}
        {/* <Stack.Screen name="order-confirmation" /> */}
        {/* <Stack.Screen name="(modals)" /> */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </Provider>
  );
}