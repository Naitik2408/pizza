import { NativeModules } from 'react-native';

interface PizzaAlarmModuleInterface {
  setOrderAlarm(orderData: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    amount: number;
    delaySeconds?: number;
  }): Promise<string>;
  
  cancelOrderAlarm(orderId: string): Promise<string>;
  requestBatteryOptimizationExemption(): Promise<string>;
  checkExactAlarmPermission(): Promise<boolean>;
}

const { PizzaAlarmModule } = NativeModules;

export const PizzaAlarm: PizzaAlarmModuleInterface = {
  setOrderAlarm: (orderData) => PizzaAlarmModule.setOrderAlarm(orderData),
  cancelOrderAlarm: (orderId) => PizzaAlarmModule.cancelOrderAlarm(orderId),
  requestBatteryOptimizationExemption: () => PizzaAlarmModule.requestBatteryOptimizationExemption(),
  checkExactAlarmPermission: () => PizzaAlarmModule.checkExactAlarmPermission(),
};

// Enhanced Pizza Alarm Service (Zomato-like functionality)
export class ZomatoLikePizzaAlarm {
  private static activePendingAlarms = new Map<string, NodeJS.Timeout[]>();

  /**
   * Set urgent order alarm with escalating alerts (like Zomato)
   */
  static async setUrgentOrderAlarm(orderData: {
    orderId: string;
    orderNumber: string;
    customerName: string;
    amount: number;
  }): Promise<void> {
    try {
      console.log(`🚨 Setting Zomato-like alarm for order: ${orderData.orderNumber}`);

      // Clear any existing alarms for this order
      await this.cancelOrderAlarm(orderData.orderId);

      // Request battery optimization exemption on first use
      try {
        await PizzaAlarm.requestBatteryOptimizationExemption();
      } catch (e) {
        console.warn('Could not request battery optimization exemption:', e);
      }

      // Set immediate alarm (native)
      await PizzaAlarm.setOrderAlarm({
        ...orderData,
        delaySeconds: 0
      });

      // Set escalating follow-up alarms (native)
      const escalatingDelays = [30, 60, 120]; // 30s, 60s, 2min
      
      for (const delay of escalatingDelays) {
        await PizzaAlarm.setOrderAlarm({
          ...orderData,
          orderId: `${orderData.orderId}_${delay}s`, // Unique ID for each escalation
          delaySeconds: delay
        });
      }

      console.log(`✅ Zomato-like alarm system activated for order: ${orderData.orderNumber}`);
      console.log(`   - Immediate alarm: Set`);
      console.log(`   - 30s escalation: Set`);
      console.log(`   - 60s escalation: Set`);
      console.log(`   - 120s escalation: Set`);

    } catch (error) {
      console.error('❌ Failed to set Zomato-like alarm:', error);
      throw error;
    }
  }

  /**
   * Cancel all alarms for an order
   */
  static async cancelOrderAlarm(orderId: string): Promise<void> {
    try {
      // Cancel main alarm
      await PizzaAlarm.cancelOrderAlarm(orderId);
      
      // Cancel escalating alarms
      const escalatingDelays = [30, 60, 120];
      for (const delay of escalatingDelays) {
        await PizzaAlarm.cancelOrderAlarm(`${orderId}_${delay}s`);
      }

      console.log(`✅ All alarms cancelled for order: ${orderId}`);
    } catch (error) {
      console.error('❌ Failed to cancel alarms:', error);
    }
  }

  /**
   * Check if device supports exact alarms (Android 12+)
   */
  static async checkSystemSupport(): Promise<{
    exactAlarmSupported: boolean;
    batteryOptimized: boolean;
    recommendations: string[];
  }> {
    const recommendations: string[] = [];
    
    try {
      const exactAlarmSupported = await PizzaAlarm.checkExactAlarmPermission();
      
      if (!exactAlarmSupported) {
        recommendations.push('Enable "Schedule exact alarm" permission for reliable notifications');
      }
      
      recommendations.push('Disable battery optimization for this app');
      recommendations.push('Add app to auto-start list (manufacturer specific)');
      
      return {
        exactAlarmSupported,
        batteryOptimized: false, // Would need additional native check
        recommendations
      };
    } catch (error) {
      console.error('Failed to check system support:', error);
      return {
        exactAlarmSupported: false,
        batteryOptimized: true,
        recommendations: ['Please check device settings manually']
      };
    }
  }

  /**
   * Request all necessary permissions for Zomato-like behavior
   */
  static async requestAllPermissions(): Promise<void> {
    try {
      console.log('🔐 Requesting Pizza Alarm permissions...');
      
      // Request battery optimization exemption
      await PizzaAlarm.requestBatteryOptimizationExemption();
      
      console.log('✅ Permission requests completed');
    } catch (error) {
      console.error('❌ Failed to request permissions:', error);
    }
  }
}

export default ZomatoLikePizzaAlarm;
