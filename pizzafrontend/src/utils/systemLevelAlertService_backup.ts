import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import       // Create the most aggressive notification possible
      const notificationContent: Notifications.NotificationContentInput = {
        title: '📞 INCOMING ORDER CALL',
        body: `${orderData.customerName}\nOrder ${orderData.orderNumber} - ₹${orderData.amount}\n\nTAP TO ANSWER`,
        data: {
          ...orderData,
          type: 'system_level_alert',
          fullScreen: true,
          systemAlert: true,
          callLike: true,
          timestamp: Date.now()
        },
        sound: 'notification_sound.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
        ...(Platform.OS === 'android' && {
          vibrate: [0, 2000, 500, 2000, 500, 2000]
        })
      };m 'expo-task-manager';

// Define the background notification task
const BACKGROUND_NOTIFICATION_TASK = 'background-notification';

class SystemLevelAlertService {
  
  /**
   * Configure background notification handling
   */
  static async configureBackgroundNotifications() {
    // Define the background task for handling notifications
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error, executionInfo }) => {
      console.log('Background notification task received:', data);
      
      if (error) {
        console.error('Background notification error:', error);
        return;
      }

      if (data && typeof data === 'object' && 'notification' in data) {
        // Handle the notification data in the background
        const notification = (data as any).notification;
        const notificationData = notification?.request?.content?.data;
        
        if (notificationData?.type === 'new_order_alarm' || notificationData?.type === 'new_order') {
          console.log('🚨 Processing background order alert:', notificationData);
          
          // Send system-level alert immediately
          try {
            await SystemLevelAlertService.sendSystemLevelAlert({
              orderId: notificationData.orderId || '',
              orderNumber: notificationData.orderNumber || '',
              customerName: notificationData.customerName || 'Customer',
              amount: parseInt(notificationData.amount || '0')
            });
          } catch (err) {
            console.error('Background alert failed:', err);
          }
        }
      }
    });

    // Register the background notification task
    try {
      await Notifications.registerTaskAsync(BACKGROUND_NOTIFICATION_TASK);
      console.log('Background notification task registered');
    } catch (error) {
      console.error('Failed to register background task:', error);
    }
  }
  
  /**
   * Configure critical notification channels for system-level alerts
   */
  static async configureCriticalChannels() {
    if (Platform.OS === 'android') {
      // Configure full-screen alert channel
      await Notifications.setNotificationChannelAsync('full_screen_alerts', {
        name: 'Full Screen Order Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 2000, 500, 2000, 500, 2000],
        lightColor: '#FF0000',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        sound: 'notification_sound.wav'
      });

      // Configure order alerts channel  
      await Notifications.setNotificationChannelAsync('order_alerts', {
        name: 'Order Alerts',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 1500, 300, 1500, 300, 1500],
        lightColor: '#FF6B00',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true,
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        sound: 'notification_sound.wav'
      });
    }
  }

  /**
   * Send a system-level alarm notification (works even when app is closed)
   */
  static async sendSystemLevelAlert(orderData: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    amount: number;
  }) {
    try {
      console.log('🚨 Sending SYSTEM-LEVEL alert for order:', orderData.orderNumber);

      // Create the most aggressive notification possible
      const notificationContent = {
        title: '� INCOMING ORDER CALL',
        body: `${orderData.customerName}\nOrder ${orderData.orderNumber} - ₹${orderData.amount}\n\nTAP TO ANSWER`,
        data: {
          ...orderData,
          type: 'system_level_alert',
          fullScreen: true,
          systemAlert: true,
          callLike: true,
          timestamp: Date.now()
        },
        sound: 'notification_sound.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
        vibrate: true,
        // Make it persistent and attention-grabbing
        sticky: true,
        autoDismiss: false,
        ongoing: true
      };

      // Send the primary system notification
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
        identifier: `system_alert_${orderData.orderId}_${Date.now()}`
      });

      // For Android, send additional call-like notification
      if (Platform.OS === 'android') {
        await this.sendCallLikeNotification(orderData);
      }

      // For iOS, send critical alert
      if (Platform.OS === 'ios') {
        await this.sendCriticalAlert(orderData);
      }

      // Also send multiple backup notifications with delays
      await this.sendBackupAlerts(orderData);

      return notificationId;
    } catch (error) {
      console.error('Error sending system-level alert:', error);
      throw error;
    }
  }

  /**
   * Send full-screen intent notification for Android (call-like behavior)
   */
  static async sendFullScreenIntentNotification(orderData: any) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📞 INCOMING ORDER CALL',
          body: `${orderData.customerName}\nOrder ${orderData.orderNumber}\n₹${orderData.amount}`,
          data: {
            ...orderData,
            type: 'full_screen_intent',
            callLike: true
          },
          sound: 'notification_sound.wav',
          priority: Notifications.AndroidNotificationPriority.MAX,
          sticky: true,
          autoDismiss: false,
          ongoing: true,
          // This creates the call-like full-screen experience
          categoryId: 'CALL_LIKE_ALERT'
        },
        trigger: null,
        identifier: `full_screen_${orderData.orderId}`
      });
    } catch (error) {
      console.error('Error sending full-screen intent:', error);
    }
  }

  /**
   * Send critical alert for iOS (bypasses silent mode)
   */
  static async sendCriticalAlert(orderData: any) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🚨 CRITICAL: NEW ORDER',
          body: `${orderData.customerName} - ${orderData.orderNumber} - ₹${orderData.amount}`,
          data: {
            ...orderData,
            type: 'critical_alert'
          },
          sound: 'notification_sound.wav',
          priority: Notifications.AndroidNotificationPriority.MAX,
          // iOS critical alert properties
          criticalAlert: {
            critical: true,
            name: 'order-alert',
            volume: 1.0
          }
        },
        trigger: null,
        identifier: `critical_${orderData.orderId}`
      });
    } catch (error) {
      console.error('Error sending critical alert:', error);
    }
  }

  /**
   * Dismiss all active order alerts
   */
  static async dismissAllAlerts() {
    try {
      // Get all scheduled notifications
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      
      // Cancel order-related notifications
      const orderAlerts = scheduled.filter(notif => 
        notif.identifier.includes('order_alert_') || 
        notif.identifier.includes('full_screen_') ||
        notif.identifier.includes('critical_')
      );

      for (const alert of orderAlerts) {
        await Notifications.cancelScheduledNotificationAsync(alert.identifier);
      }

      // Also dismiss presented notifications
      await Notifications.dismissAllNotificationsAsync();
      
      console.log('All order alerts dismissed');
    } catch (error) {
      console.error('Error dismissing alerts:', error);
    }
  }

  /**
   * Set up notification categories for interactive notifications
   */
  static async setupNotificationCategories() {
    try {
      // Set up action categories for call-like alerts
      await Notifications.setNotificationCategoryAsync('CALL_LIKE_ALERT', [
        {
          identifier: 'view_order',
          buttonTitle: 'View Order',
          options: {
            foreground: true,
            authenticationRequired: false
          }
        },
        {
          identifier: 'dismiss_alert', 
          buttonTitle: 'Dismiss',
          options: {
            foreground: false,
            authenticationRequired: false,
            destructive: true
          }
        }
      ]);

      console.log('Notification categories configured');
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }
}

export default SystemLevelAlertService;
