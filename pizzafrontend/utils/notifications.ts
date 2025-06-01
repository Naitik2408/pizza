import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { API_URL } from '@/config';  // Adjust import path as needed

// Update this part:
Notifications.setNotificationHandler({
    handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,  // Add this line
        shouldShowList: true,    // Add this line
    }),
});

// Request notification permissions and get token
export async function registerForPushNotificationsAsync() {
    let token;

    if (!Device.isDevice) {
        console.log('Push notifications require a physical device');
        return null;
    }

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

    // Get Expo push token
    try {
        token = (await Notifications.getExpoPushTokenAsync({
            projectId: Constants.expoConfig?.extra?.eas?.projectId || 'pizza-abe9a',
        })).data;

        console.log('Push token:', token);
        return token;
    } catch (error) {
        console.error('Error getting push token:', error);
        return null;
    }
}

// Register device token with backend
export async function registerDeviceForNotifications(authToken: string) {
    try {
        // Get the push token
        const pushToken = await registerForPushNotificationsAsync();

        if (!pushToken) {
            return false;
        }

        // Register with backend
        const response = await fetch(`${API_URL}/api/device/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${authToken}`
            },
            body: JSON.stringify({
                token: pushToken,
                platform: Platform.OS
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

// Unregister device token (for logout)
export async function unregisterDeviceToken(authToken: string) {
    try {
        const pushToken = await registerForPushNotificationsAsync();

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

        return response.ok;
    } catch (error) {
        console.error('Error unregistering device token:', error);
        return false;
    }
}