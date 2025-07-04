import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../constants';

// Generic storage functions
export const storage = {
  // Get item from storage
  async getItem<T>(key: string): Promise<T | null> {
    try {
      const value = await AsyncStorage.getItem(key);
      return value ? JSON.parse(value) : null;
    } catch (error) {
      console.error('Error getting item from storage:', error);
      return null;
    }
  },

  // Set item in storage
  async setItem<T>(key: string, value: T): Promise<boolean> {
    try {
      await AsyncStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Error setting item in storage:', error);
      return false;
    }
  },

  // Remove item from storage
  async removeItem(key: string): Promise<boolean> {
    try {
      await AsyncStorage.removeItem(key);
      return true;
    } catch (error) {
      console.error('Error removing item from storage:', error);
      return false;
    }
  },

  // Clear all storage
  async clear(): Promise<boolean> {
    try {
      await AsyncStorage.clear();
      return true;
    } catch (error) {
      console.error('Error clearing storage:', error);
      return false;
    }
  },

  // Get multiple items
  async multiGet(keys: string[]): Promise<Record<string, any>> {
    try {
      const values = await AsyncStorage.multiGet(keys);
      const result: Record<string, any> = {};
      
      values.forEach(([key, value]) => {
        result[key] = value ? JSON.parse(value) : null;
      });
      
      return result;
    } catch (error) {
      console.error('Error getting multiple items from storage:', error);
      return {};
    }
  },

  // Set multiple items
  async multiSet(items: Array<[string, any]>): Promise<boolean> {
    try {
      const stringifiedItems: [string, string][] = items.map(([key, value]) => [
        key,
        JSON.stringify(value),
      ]);
      await AsyncStorage.multiSet(stringifiedItems);
      return true;
    } catch (error) {
      console.error('Error setting multiple items in storage:', error);
      return false;
    }
  },
};

// Specific storage functions for app data
export const authStorage = {
  async getToken(): Promise<string | null> {
    return storage.getItem<string>(STORAGE_KEYS.TOKEN);
  },

  async setToken(token: string): Promise<boolean> {
    return storage.setItem(STORAGE_KEYS.TOKEN, token);
  },

  async removeToken(): Promise<boolean> {
    return storage.removeItem(STORAGE_KEYS.TOKEN);
  },

  async getUser(): Promise<any | null> {
    return storage.getItem(STORAGE_KEYS.USER);
  },

  async setUser(user: any): Promise<boolean> {
    return storage.setItem(STORAGE_KEYS.USER, user);
  },

  async removeUser(): Promise<boolean> {
    return storage.removeItem(STORAGE_KEYS.USER);
  },

  async clearAuth(): Promise<boolean> {
    const keys = [STORAGE_KEYS.TOKEN, STORAGE_KEYS.USER];
    try {
      await AsyncStorage.multiRemove(keys);
      return true;
    } catch (error) {
      console.error('Error clearing auth data:', error);
      return false;
    }
  },
};

export const cartStorage = {
  async getCart(): Promise<any | null> {
    return storage.getItem(STORAGE_KEYS.CART);
  },

  async setCart(cart: any): Promise<boolean> {
    return storage.setItem(STORAGE_KEYS.CART, cart);
  },

  async clearCart(): Promise<boolean> {
    return storage.removeItem(STORAGE_KEYS.CART);
  },
};

export const appStorage = {
  async getTheme(): Promise<string | null> {
    return storage.getItem<string>(STORAGE_KEYS.THEME);
  },

  async setTheme(theme: string): Promise<boolean> {
    return storage.setItem(STORAGE_KEYS.THEME, theme);
  },

  async getLanguage(): Promise<string | null> {
    return storage.getItem<string>(STORAGE_KEYS.LANGUAGE);
  },

  async setLanguage(language: string): Promise<boolean> {
    return storage.setItem(STORAGE_KEYS.LANGUAGE, language);
  },

  async isOnboardingCompleted(): Promise<boolean> {
    const completed = await storage.getItem<boolean>(STORAGE_KEYS.ONBOARDING);
    return completed === true;
  },

  async setOnboardingCompleted(): Promise<boolean> {
    return storage.setItem(STORAGE_KEYS.ONBOARDING, true);
  },

  async areNotificationsEnabled(): Promise<boolean> {
    const enabled = await storage.getItem<boolean>(STORAGE_KEYS.NOTIFICATIONS);
    return enabled !== false; // Default to true
  },

  async setNotificationsEnabled(enabled: boolean): Promise<boolean> {
    return storage.setItem(STORAGE_KEYS.NOTIFICATIONS, enabled);
  },
};
