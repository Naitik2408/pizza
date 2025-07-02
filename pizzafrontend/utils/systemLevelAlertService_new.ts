import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import * as TaskManager from 'expo-task-manager';

// Define the background notification task
const BACKGROUND_NOTIFICATION_TASK = 'background-notification';

interface OrderData {
  orderId: string;
  orderNumber: string;
  customerName: string;
  amount: number;
}

class SystemLevelAlertService {
  
  /**
   * Configure background notification handling
   */
  static async configureBackgroundNotifications() {
    // Define the background task for handling notifications
    TaskManager.defineTask(BACKGROUND_NOTIFICATION_TASK, async ({ data, error }: any) => {
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
  static async sendSystemLevelAlert(orderData: OrderData) {
    try {
      console.log('🚨 Sending SYSTEM-LEVEL alert for order:', orderData.orderNumber);

      // Create the most aggressive notification possible
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
          vibrationPattern: [0, 2000, 500, 2000, 500, 2000]
        })
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
   * Send call-like notification for Android
   */
  static async sendCallLikeNotification(orderData: OrderData) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '📞 INCOMING ORDER CALL',
          body: `${orderData.customerName}\nOrder ${orderData.orderNumber}\n₹${orderData.amount}`,
          data: {
            ...orderData,
            type: 'call_like_alert',
            callLike: true
          },
          sound: 'notification_sound.wav',
          priority: Notifications.AndroidNotificationPriority.MAX,
          categoryIdentifier: 'CALL_LIKE_ALERT'
        },
        trigger: null,
        identifier: `call_like_${orderData.orderId}`
      });
    } catch (error) {
      console.error('Error sending call-like notification:', error);
    }
  }

  /**
   * Send full-screen intent notification for Android (call-like behavior)
   */
  static async sendFullScreenIntentNotification(orderData: OrderData) {
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
          categoryIdentifier: 'CALL_LIKE_ALERT'
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
  static async sendCriticalAlert(orderData: OrderData) {
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
          priority: Notifications.AndroidNotificationPriority.MAX
        },
        trigger: null,
        identifier: `critical_${orderData.orderId}`
      });
    } catch (error) {
      console.error('Error sending critical alert:', error);
    }
  }

  /**
   * Send backup alerts with delays
   */
  static async sendBackupAlerts(orderData: OrderData) {
    try {
      // Send follow-up alerts every 10 seconds for 1 minute
      const delays = [10, 20, 30, 45, 60]; // seconds
      
      for (const delay of delays) {
        setTimeout(async () => {
          try {
            await Notifications.scheduleNotificationAsync({
              content: {
                title: `⚠️ URGENT: Order ${orderData.orderNumber}`,
                body: `Still waiting! ${orderData.customerName} - ₹${orderData.amount}`,
                data: {
                  ...orderData,
                  type: 'backup_alert',
                  attempt: delay
                },
                sound: 'notification_sound.wav',
                priority: Notifications.AndroidNotificationPriority.HIGH
              },
              trigger: null,
              identifier: `backup_${orderData.orderId}_${delay}`
            });
          } catch (err) {
            console.error(`Backup alert ${delay}s failed:`, err);
          }
        }, delay * 1000);
      }
    } catch (error) {
      console.error('Error scheduling backup alerts:', error);
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
        notif.identifier.includes('critical_') ||
        notif.identifier.includes('backup_') ||
        notif.identifier.includes('call_like_') ||
        notif.identifier.includes('system_alert_')
      );

      for (const alert of orderAlerts) {
        await Notifications.cancelScheduledNotificationAsync(alert.identifier);
      }

      // Also dismiss presented notifications
      await Notifications.dismissAllNotificationsAsync();
      
      console.log(`Dismissed ${orderAlerts.length} order alerts`);
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
            opensAppToForeground: true,
            isAuthenticationRequired: false
          }
        },
        {
          identifier: 'dismiss_alert', 
          buttonTitle: 'Dismiss',
          options: {
            opensAppToForeground: false,
            isAuthenticationRequired: false,
            isDestructive: true
          }
        }
      ]);

      console.log('Notification categories configured');
    } catch (error) {
      console.error('Error setting up notification categories:', error);
    }
  }

  /**
   * Initialize the system-level alert service
   */
  static async initialize() {
    try {
      await this.configureCriticalChannels();
      await this.setupNotificationCategories();
      await this.configureBackgroundNotifications();
      console.log('SystemLevelAlertService initialized');
    } catch (error) {
      console.error('Error initializing SystemLevelAlertService:', error);
    }
  }
}

export default SystemLevelAlertService;
