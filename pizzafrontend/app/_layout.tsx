import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Provider, useDispatch, useSelector } from 'react-redux';
import store, { loadAuthState } from '../redux/store';
import { restoreAuthState } from '../redux/slices/authSlice';
import { RootState } from '../redux/store';
import { useRouter } from 'expo-router';

function AppInitializer() {
  const dispatch = useDispatch();
  const router = useRouter();
  const { token, role } = useSelector((state: RootState) => state.auth);

  useEffect(() => {
    const initializeAuthState = async () => {
      const authState = await loadAuthState();
      if (authState?.token) {
        dispatch(restoreAuthState(authState)); // Restore auth state into Redux
      } else {
        router.replace('/(auth)/login'); // Redirect to login if no token
      }
    };

    initializeAuthState();
  }, [dispatch, router]);

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
        {/* <Stack.Screen name="cart" /> */}
        {/* <Stack.Screen name="order-confirmation" /> */}
        {/* <Stack.Screen name="(modals)" /> */}
        <Stack.Screen name="+not-found" />
      </Stack>
      <StatusBar style="auto" />
    </Provider>
  );
}