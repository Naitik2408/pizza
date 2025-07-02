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
        
        if (notificationData?.type === 'new_order_alarm' || 
            notificationData?.type === 'new_order' ||
            notificationData?.type === 'critical_order_alert' ||
            notificationData?.type === 'system_level_alert' ||
            notificationData?.type === 'escalating_alert') {
          console.log(`🚨 Processing background order alert (${notificationData?.type}):`, notificationData);
          
          // Handle different notification types appropriately
          try {
            if (notificationData?.type === 'escalating_alert') {
              // For escalating alerts, trigger alarm/vibration but don't send new notification
              console.log('⏰ Triggering escalating alert alarm in background...');
              await SystemLevelAlertService.triggerAlarmInBackground({
                orderId: notificationData.orderId || '',
                orderNumber: notificationData.orderNumber || '',
                customerName: notificationData.customerName || 'Customer',
                amount: parseInt(notificationData.amount || '0'),
                urgency: notificationData.urgency || 'High'
              });
            } else {
              // For new orders, send full system-level alert
              await SystemLevelAlertService.sendSystemLevelAlert({
                orderId: notificationData.orderId || '',
                orderNumber: notificationData.orderNumber || '',
                customerName: notificationData.customerName || 'Customer',
                amount: parseInt(notificationData.amount || '0')
              });
            }
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
      // Configure CRITICAL order alerts channel (highest priority)
      await Notifications.setNotificationChannelAsync('critical_order_alerts', {
        name: '🚨 CRITICAL Order Alerts',
        description: 'Urgent order notifications that bypass Do Not Disturb',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 2000, 500, 2000, 500, 2000], // Strong pattern
        lightColor: '#FF0000',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        bypassDnd: true, // CRITICAL: Bypasses Do Not Disturb
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        sound: 'notification_sound.wav'
      });

      // Configure high priority alerts channel  
      await Notifications.setNotificationChannelAsync('high_priority_alerts', {
        name: '⚡ High Priority Alerts',
        description: 'Important order notifications',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 1500, 300, 1500, 300, 1500],
        lightColor: '#FF6B00',
        lockscreenVisibility: Notifications.AndroidNotificationVisibility.PUBLIC,
        enableLights: true,
        enableVibrate: true,
        showBadge: true,
        sound: 'notification_sound.wav'
      });

      console.log('✅ Critical notification channels configured');
    }
  }

  /**
   * Send a system-level alarm notification (works even when app is closed)
   */
  static async sendSystemLevelAlert(orderData: OrderData) {
    try {
      console.log('🚨 STARTING SYSTEM-LEVEL ALERT PROCESS');
      console.log('📦 Order Data:', JSON.stringify(orderData, null, 2));
      console.log('📱 Platform:', Platform.OS);
      console.log('🚨 Sending SINGLE SYSTEM-LEVEL alert for order:', orderData.orderNumber);

      // Create ONE effective notification that works when app is closed
      const notificationContent: Notifications.NotificationContentInput = {
        title: '� NEW ORDER ALERT',
        body: `${orderData.customerName}\nOrder ${orderData.orderNumber} - ₹${orderData.amount}\n\nTAP TO VIEW`,
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
          channelId: 'full_screen_alerts', // Use critical channel
          vibrationPattern: [0, 1000, 500, 1000, 500, 1000],
          sticky: true,
          autoDismiss: false
        }),
        ...(Platform.OS === 'ios' && {
          critical: true,
          criticalSoundName: 'notification_sound.wav'
        })
      };

      // Send the single effective system notification
      console.log('📤 Scheduling single system notification...');
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
        identifier: `system_alert_${orderData.orderId}_${Date.now()}`
      });
      console.log('✅ Single system notification scheduled with ID:', notificationId);

      console.log('✅ SYSTEM-LEVEL ALERT SENT SUCCESSFULLY!');
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
      // Set up action categories for order alerts
      await Notifications.setNotificationCategoryAsync('ORDER_ALERT', [
        {
          identifier: 'view_order',
          buttonTitle: '👀 View Order',
          options: {
            opensAppToForeground: true,
            isAuthenticationRequired: false
          }
        },
        {
          identifier: 'mark_acknowledged', 
          buttonTitle: '✅ Acknowledged',
          options: {
            opensAppToForeground: false,
            isAuthenticationRequired: false
          }
        },
        {
          identifier: 'dismiss_alert', 
          buttonTitle: '🔕 Dismiss',
          options: {
            opensAppToForeground: false,
            isAuthenticationRequired: false,
            isDestructive: true
          }
        }
      ]);

      // Set up escalating alert category
      await Notifications.setNotificationCategoryAsync('ESCALATING_ALERT', [
        {
          identifier: 'view_urgent',
          buttonTitle: '🚨 View Urgent',
          options: {
            opensAppToForeground: true,
            isAuthenticationRequired: false
          }
        },
        {
          identifier: 'stop_alerts', 
          buttonTitle: '🛑 Stop Alerts',
          options: {
            opensAppToForeground: false,
            isAuthenticationRequired: false,
            isDestructive: true
          }
        }
      ]);

      console.log('✅ Interactive notification categories configured');
    } catch (error) {
      console.error('❌ Error setting up notification categories:', error);
    }
  }

  /**
   * Initialize the system-level alert service
   */
  static async initialize() {
    try {
      console.log('🚀 INITIALIZING SystemLevelAlertService...');
      console.log('📱 Platform:', Platform.OS);
      
      console.log('1️⃣ Configuring critical channels...');
      await this.configureCriticalChannels();
      
      console.log('2️⃣ Setting up notification categories...');
      await this.setupNotificationCategories();
      
      console.log('3️⃣ Configuring background notifications...');
      await this.configureBackgroundNotifications();
      
      console.log('✅ SystemLevelAlertService initialized successfully!');
    } catch (error) {
      console.error('❌ Error initializing SystemLevelAlertService:', error);
      throw error;
    }
  }

  /**
   * ENHANCED: Send a critical notification with duplicate prevention
   */
  static async sendEnhancedSystemAlert(orderData: OrderData) {
    try {
      console.log('🚨 STARTING ENHANCED SYSTEM-LEVEL ALERT');
      console.log('📦 Order Data:', JSON.stringify(orderData, null, 2));
      console.log('📱 Platform:', Platform.OS);

      // First, cancel any existing notifications for this order to prevent duplicates
      await this.cancelDuplicateNotifications(orderData.orderId);

      // Create CRITICAL notification that bypasses DND and works when app is closed
      const notificationContent: Notifications.NotificationContentInput = {
        title: '🚨 URGENT: NEW PIZZA ORDER!',
        body: `👤 ${orderData.customerName}\n📦 Order ${orderData.orderNumber}\n💰 ₹${orderData.amount}\n\n🔔 TAP TO VIEW ORDER DETAILS`,
        data: {
          ...orderData,
          type: 'critical_order_alert',
          priority: 'critical',
          timestamp: Date.now(),
          orderId: orderData.orderId,
          orderNumber: orderData.orderNumber,
          route: '/admin/orders' // For navigation when tapped
        },
        sound: 'notification_sound.wav',
        priority: Notifications.AndroidNotificationPriority.MAX,
        categoryIdentifier: 'ORDER_ALERT',
        ...(Platform.OS === 'android' && {
          channelId: 'critical_order_alerts', // Use our critical channel
          vibrationPattern: [0, 1000, 200, 1000, 200, 1000, 200, 1000], // Long pattern
          sticky: true, // Won't auto-dismiss
          autoDismiss: false,
          color: '#FF0000', // Red color for urgency
        }),
        ...(Platform.OS === 'ios' && {
          critical: true, // Bypasses silent mode on iOS
          criticalSoundName: 'notification_sound.wav',
          interruptionLevel: 'critical' // iOS 15+ critical interruption
        })
      };

      // Send the CRITICAL notification
      console.log('📤 Sending CRITICAL notification...');
      const notificationId = await Notifications.scheduleNotificationAsync({
        content: notificationContent,
        trigger: null, // Show immediately
        identifier: `critical_order_${orderData.orderId}_${Date.now()}`
      });
      
      console.log('✅ CRITICAL notification sent with ID:', notificationId);

      // Schedule escalating follow-up notifications if not acknowledged
      await this.scheduleEscalatingAlerts(orderData);

      console.log('✅ ENHANCED SYSTEM-LEVEL ALERT COMPLETED!');
      return notificationId;
      
    } catch (error) {
      console.error('❌ Error sending enhanced system alert:', error);
      
      // Fallback: Send basic notification if critical one fails
      try {
        console.log('🔄 Sending fallback notification...');
        await this.sendFallbackNotification(orderData);
      } catch (fallbackError) {
        console.error('❌ Fallback notification also failed:', fallbackError);
      }
      
      throw error;
    }
  }

  /**
   * Cancel duplicate notifications for the same order
   */
  static async cancelDuplicateNotifications(orderId: string) {
    try {
      const scheduled = await Notifications.getAllScheduledNotificationsAsync();
      const duplicates = scheduled.filter(notif => 
        notif.identifier.includes(orderId) || 
        notif.identifier.includes('system_alert_') ||
        notif.identifier.includes('critical_order_')
      );

      for (const duplicate of duplicates) {
        await Notifications.cancelScheduledNotificationAsync(duplicate.identifier);
        console.log('🗑️ Cancelled duplicate notification:', duplicate.identifier);
      }

      // Also dismiss any presented notifications
      const presented = await Notifications.getPresentedNotificationsAsync();
      const presentedDuplicates = presented.filter(notif => 
        notif.request.identifier.includes(orderId)
      );

      for (const duplicate of presentedDuplicates) {
        await Notifications.dismissNotificationAsync(duplicate.request.identifier);
        console.log('🗑️ Dismissed duplicate notification:', duplicate.request.identifier);
      }

    } catch (error) {
      console.error('❌ Error cancelling duplicates:', error);
    }
  }

  /**
   * Schedule escalating follow-up alerts
   */
  static async scheduleEscalatingAlerts(orderData: OrderData) {
    try {
      console.log('⏰ Scheduling escalating follow-up alerts...');
      
      // Follow-up alerts at increasing intervals
      const intervals = [30, 60, 120]; // 30s, 1min, 2min
      
      for (const interval of intervals) {
        setTimeout(async () => {
          try {
            // Check if order was acknowledged (you can implement this check)
            const isAcknowledged = await this.checkIfOrderAcknowledged(orderData.orderId);
            
            if (!isAcknowledged) {
              console.log(`⚡ Sending escalating alert after ${interval}s...`);
              
              const urgencyLevel = interval === 30 ? 'High' : interval === 60 ? 'Very High' : 'CRITICAL';
              
              await Notifications.scheduleNotificationAsync({
                content: {
                  title: `🚨 ${urgencyLevel} PRIORITY: Order Waiting!`,
                  body: `⏰ ${interval}s passed!\n👤 ${orderData.customerName}\n📦 ${orderData.orderNumber} - ₹${orderData.amount}\n\n❗ PLEASE CHECK IMMEDIATELY!`,
                  data: {
                    ...orderData,
                    type: 'escalating_alert',
                    attempt: interval,
                    urgency: urgencyLevel
                  },
                  sound: 'notification_sound.wav',
                  priority: Notifications.AndroidNotificationPriority.MAX,
                  ...(Platform.OS === 'android' && {
                    channelId: 'critical_order_alerts',
                    vibrationPattern: [0, 1500, 300, 1500, 300, 1500, 300, 1500], // Longer pattern
                    sticky: true,
                    autoDismiss: false
                  })
                },
                trigger: null,
                identifier: `escalating_${orderData.orderId}_${interval}s`
              });
              
              console.log(`✅ Escalating alert sent for ${interval}s delay`);
            } else {
              console.log(`✅ Order ${orderData.orderId} was acknowledged, skipping escalation`);
            }
          } catch (err) {
            console.error(`❌ Error sending escalating alert (${interval}s):`, err);
          }
        }, interval * 1000);
      }
      
    } catch (error) {
      console.error('❌ Error scheduling escalating alerts:', error);
    }
  }

  /**
   * Check if order was acknowledged (basic implementation)
   */
  static async checkIfOrderAcknowledged(orderId: string): Promise<boolean> {
    // TODO: Implement actual check - for now return false to continue alerts
    // You can implement this by storing acknowledged orders in AsyncStorage
    // or checking if the admin opened the orders page recently
    return false;
  }

  /**
   * Send fallback notification if critical one fails
   */
  static async sendFallbackNotification(orderData: OrderData) {
    try {
      console.log('🔄 Sending fallback notification...');
      
      await Notifications.scheduleNotificationAsync({
        content: {
          title: '🍕 New Pizza Order',
          body: `${orderData.customerName} - ${orderData.orderNumber} - ₹${orderData.amount}`,
          data: {
            ...orderData,
            type: 'fallback_alert'
          },
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null,
        identifier: `fallback_${orderData.orderId}_${Date.now()}`
      });
      
      console.log('✅ Fallback notification sent');
    } catch (error) {
      console.error('❌ Fallback notification failed:', error);
    }
  }

  /**
   * Trigger alarm/vibration in background for escalating alerts
   */
  static async triggerAlarmInBackground(alertData: OrderData & { urgency?: string }) {
    try {
      console.log('⏰ Triggering background alarm for escalating alert...');
      
      if (Platform.OS === 'android') {
        // Trigger immediate vibration
        const { Haptics } = require('expo-haptics');
        await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        
        // Schedule a simple alert notification with high priority
        await Notifications.scheduleNotificationAsync({
          content: {
            title: `🚨 ${alertData.urgency || 'High'} PRIORITY: Order Waiting!`,
            body: `⏰ Order ${alertData.orderNumber} still needs attention!\n👤 ${alertData.customerName}\n💰 ₹${alertData.amount}`,
            data: {
              ...alertData,
              type: 'background_escalating_alarm'
            } as Record<string, unknown>,
            sound: 'notification_sound.wav',
            priority: Notifications.AndroidNotificationPriority.MAX,
            ...(Platform.OS === 'android' && {
              channelId: 'critical_order_alerts',
              vibrationPattern: [0, 2000, 500, 2000, 500, 2000],
              sticky: true,
              autoDismiss: false
            })
          },
          trigger: null,
          identifier: `background_alarm_${alertData.orderId}_${Date.now()}`
        });
        
        console.log('✅ Background alarm triggered successfully');
      }
    } catch (error) {
      console.error('❌ Error triggering background alarm:', error);
    }
  }
}

export default SystemLevelAlertService;
