import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import cartReducer from './slices/cartSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

const store = configureStore({
  reducer: {
    auth: authReducer,
    cart: cartReducer
  },
});

// Save the authentication state to AsyncStorage whenever it changes
store.subscribe(() => {
  const state = store.getState();
  AsyncStorage.setItem('authState', JSON.stringify(state.auth)); // Persist auth state
});

// Load the authentication state from AsyncStorage
export const loadAuthState = async () => {
  const authState = await AsyncStorage.getItem('authState');
  if (authState) {
    return JSON.parse(authState);
  }
  return null;
};

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;

export default store;