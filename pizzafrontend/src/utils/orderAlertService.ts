import { Audio } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Vibration, Alert, Platform } from 'react-native';
import * as Haptics from 'expo-haptics';
import AsyncStorage from '@react-native-async-storage/async-storage';

class OrderAlertService {
  private sound: Audio.Sound | null = null;
  private isAlertActive = false;
  private alertTimeoutId: ReturnType<typeof setTimeout> | null = null;
  private vibrationIntervalId: ReturnType<typeof setInterval> | null = null;

  /**
   * Initialize the alert sound
   */
  async initializeSound() {
    try {
      // Set audio mode for notifications
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false
      });

      // Load alarm sound - using the existing notification_sound.wav
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/notification_sound.wav'),
        { 
          shouldPlay: false, 
          isLooping: true,
          volume: 1.0
        }
      );
      this.sound = sound;
      console.log('Order alert sound initialized');
    } catch (error) {
      console.error('Error loading order alert sound:', error);
      // Create a fallback using system sounds
      await this.initializeFallbackSound();
    }
  }

  /**
   * Fallback sound initialization if custom sound fails
   */
  async initializeFallbackSound() {
    try {
      // Use a simple beep sound as fallback instead of malformed URI
      const { sound } = await Audio.Sound.createAsync(
        { uri: 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LNeSsFJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8N2QQAoUXrTp66hVFApGn+DyvmMcBjiS2e/MdyYEJHfH8OOEoC0,1000' },
        { 
          shouldPlay: false, 
          isLooping: true,
          volume: 1.0
        }
      );
      this.sound = sound;
      console.log('Fallback alert sound initialized');
    } catch (error) {
      console.error('Fallback sound initialization failed:', error);
    }
  }

  /**
   * Play alarm-like alert for new orders
   */
  async playOrderAlert(orderData: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    amount: number;
  }) {
    console.log('🔔 ORDER ALERT SERVICE - playOrderAlert called');
    console.log('📦 Order data received:', JSON.stringify(orderData, null, 2));
    console.log('🔄 Is alert currently active?', this.isAlertActive);
    
    if (this.isAlertActive) {
      console.log('⚠️ Alert already active, skipping...');
      return;
    }

    try {
      this.isAlertActive = true;
      console.log('🚨 STARTING URGENT ORDER ALERT for order:', orderData.orderNumber);
      console.log('📱 Platform:', Platform.OS);

      // Start all alert mechanisms immediately
      console.log('1️⃣ Starting haptic feedback...');
      this.startHapticFeedback();
      
      console.log('2️⃣ Starting vibration pattern...');
      this.startVibrationPattern();
      
      console.log('3️⃣ Playing alarm sound...');
      await this.playAlarmSound();
      
      // Show full-screen alert immediately (don't wait)
      console.log('4️⃣ Showing full-screen alert...');
      this.showFullScreenAlert(orderData);

      // DON'T send backup notification - let SystemLevelAlertService handle notifications
      console.log('5️⃣ Skipping notification - handled by SystemLevelAlertService');

      // Auto-stop alert after 60 seconds if not manually stopped
      this.alertTimeoutId = setTimeout(() => {
        console.log('⏰ Auto-stopping alert after 60 seconds');
        this.stopAlert();
      }, 60000);

      console.log('✅ ORDER ALERT STARTED SUCCESSFULLY!');

    } catch (error) {
      console.error('❌ Error playing order alert:', error);
      this.isAlertActive = false;
    }
  }

  /**
   * Send a backup local notification 
   */
  private async sendBackupNotification(orderData: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    amount: number;
  }) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 URGENT: NEW ORDER! 🚨',
          body: `${orderData.customerName} - Order ${orderData.orderNumber} - ₹${orderData.amount}`,
          data: orderData,
          sound: true,
          priority: Notifications.AndroidNotificationPriority.MAX,
        },
        trigger: null, // Show immediately
      });
    } catch (error) {
      console.error('Error sending backup notification:', error);
    }
  }

  /**
   * Start haptic feedback pattern
   */
  private startHapticFeedback() {
    if (Platform.OS === 'ios') {
      // Create a repeating haptic pattern
      const hapticInterval = setInterval(() => {
        if (!this.isAlertActive) {
          clearInterval(hapticInterval);
          return;
        }
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        setTimeout(() => {
          if (this.isAlertActive) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
          }
        }, 200);
      }, 600);

      // Store interval for cleanup
      setTimeout(() => clearInterval(hapticInterval), 60000);
    }
  }

  /**
   * Start call-like vibration pattern
   */
  private startVibrationPattern() {
    // Create aggressive call-like vibration pattern: longer vibrations
    const pattern = [0, 1500, 300, 1500, 300, 1500, 300]; // More intense pattern
    
    if (Platform.OS === 'android') {
      // Start repeating vibration
      Vibration.vibrate(pattern, true);
    } else {
      // iOS vibration pattern - more frequent
      this.vibrationIntervalId = setInterval(() => {
        if (!this.isAlertActive) {
          return;
        }
        Vibration.vibrate([0, 1500, 300]); // Longer vibration
      }, 1500); // More frequent
    }
  }

  /**
   * Play the alarm sound
   */
  private async playAlarmSound() {
    try {
      if (this.sound) {
        await this.sound.setVolumeAsync(1.0);
        await this.sound.setIsLoopingAsync(true);
        await this.sound.playAsync();
        console.log('🔊 Order alert sound playing at max volume');
      } else {
        console.log('⚠️ No sound loaded, using fallback notification');
        // Fallback: use system notification with sound
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 NEW ORDER ALERT! 🚨',
            body: 'Tap to view order details - URGENT!',
            sound: true,
            priority: Notifications.AndroidNotificationPriority.MAX,
          },
          trigger: null,
        });
      }
    } catch (error) {
      console.error('Error playing alarm sound:', error);
      // Try fallback notification even if sound fails
      try {
        await Notifications.scheduleNotificationAsync({
          content: {
            title: '🚨 NEW ORDER ALERT! 🚨',
            body: 'Sound failed - Check orders now!',
            sound: true,
          },
          trigger: null,
        });
      } catch (fallbackError) {
        console.error('Even fallback notification failed:', fallbackError);
      }
    }
  }

  /**
   * Show full-screen alert modal
   */
  private showFullScreenAlert(orderData: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    amount: number;
  }) {
    Alert.alert(
      '🚨 NEW ORDER ALERT! 🚨',
      `Order: ${orderData.orderNumber}\nCustomer: ${orderData.customerName}\nAmount: ₹${orderData.amount}\n\nImmediate attention required!`,
      [
        {
          text: 'Snooze (5 min)',
          style: 'cancel',
          onPress: () => {
            this.stopAlert();
            this.scheduleSnoozeAlert(orderData);
          }
        },
        {
          text: 'View Order',
          style: 'default',
          onPress: () => {
            this.stopAlert();
            // This will be handled by the navigation system
            console.log('Navigate to order:', orderData.orderId);
          }
        }
      ],
      { 
        cancelable: false,
        userInterfaceStyle: 'dark' // Make it stand out
      }
    );
  }

  /**
   * Schedule a snooze alert
   */
  private async scheduleSnoozeAlert(orderData: any) {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ Order Reminder',
        body: `Don't forget: Order ${orderData.orderNumber} from ${orderData.customerName}`,
        data: orderData,
        sound: true,
      },
      trigger: {
        seconds: 300, // 5 minutes
      } as any, // Type assertion to bypass strict typing
    });
  }

  /**
   * Stop all alert activities
   */
  async stopAlert() {
    try {
      this.isAlertActive = false;
      console.log('Stopping order alert');

      // Stop sound
      if (this.sound) {
        await this.sound.stopAsync();
      }

      // Stop vibration
      Vibration.cancel();
      if (this.vibrationIntervalId) {
        clearInterval(this.vibrationIntervalId);
        this.vibrationIntervalId = null;
      }

      // Clear timeout
      if (this.alertTimeoutId) {
        clearTimeout(this.alertTimeoutId);
        this.alertTimeoutId = null;
      }

      console.log('Order alert stopped');
    } catch (error) {
      console.error('Error stopping alert:', error);
    }
  }

  /**
   * Cleanup resources
   */
  async cleanup() {
    await this.stopAlert();
    if (this.sound) {
      await this.sound.unloadAsync();
      this.sound = null;
    }
  }

  /**
   * Check if alert is currently active
   */
  isActive(): boolean {
    return this.isAlertActive;
  }
}

export default new OrderAlertService();
