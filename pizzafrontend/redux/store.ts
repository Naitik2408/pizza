import { configureStore, Middleware, AnyAction } from '@reduxjs/toolkit';
import authReducer, { AuthState } from './slices/authSlice';
import cartReducer, { CartState } from './slices/cartSlice';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Step 1: Create the reducer map separately
const rootReducer = {
  auth: authReducer,
  cart: cartReducer
};

// Step 2: Create a temporary store without middleware for type extraction
const tempStore = configureStore({
  reducer: rootReducer
});

// Step 3: Define RootState before importing socketMiddleware
export type RootState = ReturnType<typeof tempStore.getState>;
export type AppDispatch = typeof tempStore.dispatch;

// Step 4: Now import socketMiddleware after RootState is defined
import { socketMiddleware } from './middleware/socketMiddleware';

// Step 5: Create the real store with middleware
const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) => 
    getDefaultMiddleware().concat(socketMiddleware as Middleware<{}, RootState, AppDispatch>),
});

// Save the authentication state to AsyncStorage whenever it changes
store.subscribe(() => {
  const state = store.getState();
  AsyncStorage.setItem('authState', JSON.stringify(state.auth)); // Persist auth state
});

// Load the authentication state from AsyncStorage
export const loadAuthState = async (): Promise<AuthState | null> => {
  const authState = await AsyncStorage.getItem('authState');
  if (authState) {
    return JSON.parse(authState);
  }
  return null;
};

export default store;