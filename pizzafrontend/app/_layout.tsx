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

// Configure notifications behavior
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

function AppInitializer() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { token, role } = useSelector((state: RootState) => state.auth);
  const notificationResponseListener = useRef<any>(null);

  // Set up push notification listeners
  useEffect(() => {
    // Handle notification taps (when app is in background or closed)
    notificationResponseListener.current = Notifications.addNotificationResponseReceivedListener(response => {
      const data = response.notification.request.content.data;
      console.log('Notification tapped, data:', data);

      // Navigate based on the notification data and user role
      if (data?.orderId) {
        if (role === 'admin') {
          router.push(`/admin/orders?openOrderId=${data.orderId}`);
        } else if (role === 'delivery') {
          router.push(`/delivery/assignedOrders?openOrderId=${data.orderId}`);
        }
      }
    });

    // Cleanup function
    return () => {
      if (notificationResponseListener.current) {
        Notifications.removeNotificationSubscription(notificationResponseListener.current);
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