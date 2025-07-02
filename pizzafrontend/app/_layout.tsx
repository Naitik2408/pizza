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
import orderAlertService from '../utils/orderAlertService';
import SystemLevelAlertService from '../utils/systemLevelAlertService';

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
      console.log('🚀 APP LAYOUT - Initializing system alerts...');
      console.log('👤 Current user role:', role);
      console.log('🔑 Token exists:', !!token);
      
      if (role === 'admin' || role === 'delivery') {
        console.log('✅ User is admin/delivery - initializing alert services...');
        
        // Initialize both in-app and system-level alerts
        console.log('1️⃣ Initializing in-app order alert service...');
        orderAlertService.initializeSound();
        
        // Initialize the complete system-level alert service
        console.log('2️⃣ Initializing system-level alert service...');
        try {
          await SystemLevelAlertService.initialize();
          console.log('✅ System-level alert service initialized successfully');
        } catch (error) {
          console.error('❌ Failed to initialize system-level alert service:', error);
        }
      } else {
        console.log('ℹ️ User role is not admin/delivery, skipping alert initialization');
      }
    };

    initializeSystemAlerts();

    return () => {
      console.log('🧹 Cleaning up order alert service...');
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
      console.log('📨 NOTIFICATION RECEIVED IN FOREGROUND:');
      console.log('📦 Full notification object:', JSON.stringify(notification, null, 2));
      
      const notificationType = notification.request.content.data?.type;
      console.log('🏷️ Notification type:', notificationType);
      console.log('👤 Current user role:', role);
      
      // Trigger alarm for new order notifications (handle all types for compatibility)
      if ((notificationType === 'new_order_alarm' || 
           notificationType === 'new_order' || 
           notificationType === 'critical_order_alert' ||
           notificationType === 'system_level_alert' ||
           notificationType === 'escalating_alert') && 
          (role === 'admin' || role === 'delivery')) {
        
        console.log('🎯 NEW ORDER NOTIFICATION DETECTED - Processing...');
        
        const orderData = {
          orderId: String(notification.request.content.data?.orderId || ''),
          orderNumber: String(notification.request.content.data?.orderNumber || ''),
          customerName: String(notification.request.content.data?.customerName || 'Customer'),
          amount: parseInt(String(notification.request.content.data?.amount || '0'))
        };
        
        console.log('📦 Extracted order data:', JSON.stringify(orderData, null, 2));
        console.log('🚨 Triggering ENHANCED alert for order:', orderData.orderNumber);
        
        // Trigger in-app alert sound/vibration
        console.log('🔔 Starting in-app alert...');
        orderAlertService.playOrderAlert(orderData);
        
        // Note: Enhanced system-level alert already sent from orders page, no need to duplicate here
        console.log('📱 Enhanced notification system already handled the alert');
      } else {
        console.log('ℹ️ Notification not processed - either wrong type or wrong user role');
        console.log('   - Type match:', (notificationType === 'new_order_alarm' || notificationType === 'new_order' || notificationType === 'critical_order_alert' || notificationType === 'system_level_alert' || notificationType === 'escalating_alert'));
        console.log('   - Role match:', (role === 'admin' || role === 'delivery'));
      }
    });

    // Handle notification taps (when app is in background or closed)
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped, data:', data);

      // Stop any active alerts (both in-app and system-level)
      orderAlertService.stopAlert();
      SystemLevelAlertService.dismissAllAlerts();

      // Navigate based on the notification data and user role
      if (data?.orderId) {
        if (role === 'admin') {
          router.push(`/admin/orders?openOrderId=${data.orderId}`);
        } else if (role === 'delivery') {
          router.push(`/delivery/assignedOrders?openOrderId=${data.orderId}`);
        }
      }
    });

    // Handle notification actions (when user taps action buttons)
    const notificationActionSubscription = Notifications.addNotificationResponseReceivedListener(response => {
      console.log('🎬 Notification action received:', response);
      
      const { actionIdentifier, notification } = response;
      const orderData = notification.request.content.data;
      
      switch (actionIdentifier) {
        case 'view_order':
        case 'view_urgent':
          console.log('👀 User wants to view order:', orderData?.orderNumber);
          // Navigate to orders page
          router.push('/admin/orders');
          break;
          
        case 'mark_acknowledged':
          console.log('✅ User acknowledged order:', orderData?.orderNumber);
          // You can implement acknowledgment storage here
          // This would stop the escalating alerts
          break;
          
        case 'dismiss_alert':
        case 'stop_alerts':
          console.log('🔕 User dismissed alerts for order:', orderData?.orderNumber);
          // Cancel any pending escalating alerts for this order
          SystemLevelAlertService.dismissAllAlerts();
          break;
          
        default:
          console.log('📱 Default notification tap - opening app');
          // Default tap behavior - open the app
          if (role === 'admin') {
            router.push('/admin/orders');
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