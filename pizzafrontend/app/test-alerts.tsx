import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import SystemLevelAlertService from '../utils/systemLevelAlertService';
import orderAlertService from '../utils/orderAlertService';

const TestSystemAlerts = () => {
  const testOrderData = {
    orderId: 'test_order_123',
    orderNumber: '#TEST001',
    customerName: 'Test Customer',
    amount: 999
  };

  const testInAppAlert = async () => {
    console.log('🧪 MANUAL TEST - Testing In-App Alert');
    Alert.alert('Testing In-App Alert', 'This will trigger the in-app alarm (only works when app is open)', [
      {
        text: 'Cancel',
        style: 'cancel'
      },
      {
        text: 'Test In-App Alert',
        onPress: () => {
          console.log('🔔 Manually triggering in-app alert');
          orderAlertService.playOrderAlert(testOrderData);
        }
      }
    ]);
  };

  const testSystemAlert = async () => {
    console.log('🧪 MANUAL TEST - Testing System-Level Alert');
    Alert.alert(
      'Testing System-Level Alert', 
      'This will send a system-level notification that works even when the app is closed. Close the app after tapping OK to test.',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Send System Alert',
          onPress: async () => {
            try {
              console.log('📱 Manually triggering system-level alert');
              await SystemLevelAlertService.sendSystemLevelAlert(testOrderData);
              Alert.alert('Success', 'System-level alert sent! Close the app to test if it works when app is closed.');
            } catch (error) {
              console.error('❌ Manual system alert failed:', error);
              Alert.alert('Error', `Failed to send system alert: ${error}`);
            }
          }
        }
      ]
    );
  };

  const testBothAlerts = async () => {
    console.log('🧪 MANUAL TEST - Testing Both Alerts');
    Alert.alert(
      'Testing Both Alerts',
      'This will trigger both in-app and system-level alerts (like when a real order comes in)',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Test Both',
          onPress: async () => {
            console.log('🔔📱 Manually triggering both alerts');
            // Trigger in-app alert
            orderAlertService.playOrderAlert(testOrderData);
            
            // Trigger system-level alert
            await SystemLevelAlertService.sendSystemLevelAlert(testOrderData);
            
            Alert.alert('Success', 'Both alerts triggered! Close app to test system-level alert.');
          }
        }
      ]
    );
  };

  const testServiceInitialization = async () => {
    console.log('🧪 MANUAL TEST - Testing Service Initialization');
    Alert.alert(
      'Testing Service Initialization',
      'This will re-initialize both alert services with debug logging',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Initialize Services',
          onPress: async () => {
            try {
              console.log('🔧 Manually initializing services...');
              
              // Initialize in-app service
              console.log('1️⃣ Initializing orderAlertService...');
              await orderAlertService.initializeSound();
              
              // Initialize system-level service
              console.log('2️⃣ Initializing SystemLevelAlertService...');
              await SystemLevelAlertService.initialize();
              
              Alert.alert('Success', 'Services initialized successfully! Check console for details.');
            } catch (error) {
              console.error('❌ Service initialization failed:', error);
              Alert.alert('Error', `Failed to initialize services: ${error}`);
            }
          }
        }
      ]
    );
  };

  const dismissAllAlerts = async () => {
    orderAlertService.stopAlert();
    await SystemLevelAlertService.dismissAllAlerts();
    Alert.alert('Success', 'All alerts dismissed');
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🚨 System Alert Tester</Text>
      <Text style={styles.subtitle}>Test the different types of order alerts</Text>

      <TouchableOpacity style={styles.button} onPress={testInAppAlert}>
        <Text style={styles.buttonText}>Test In-App Alert Only</Text>
        <Text style={styles.buttonSubtext}>Only works when app is open</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.systemButton]} onPress={testSystemAlert}>
        <Text style={styles.buttonText}>Test System-Level Alert</Text>
        <Text style={styles.buttonSubtext}>Works even when app is closed</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.bothButton]} onPress={testBothAlerts}>
        <Text style={styles.buttonText}>Test Both Alerts</Text>
        <Text style={styles.buttonSubtext}>Real order simulation</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.initButton]} onPress={testServiceInitialization}>
        <Text style={styles.buttonText}>Initialize Services</Text>
        <Text style={styles.buttonSubtext}>Re-initialize with debug logs</Text>
      </TouchableOpacity>

      <TouchableOpacity style={[styles.button, styles.dismissButton]} onPress={dismissAllAlerts}>
        <Text style={styles.buttonText}>Dismiss All Alerts</Text>
        <Text style={styles.buttonSubtext}>Stop all active alerts</Text>
      </TouchableOpacity>

      <View style={styles.instructions}>
        <Text style={styles.instructionsTitle}>📋 Testing Instructions:</Text>
        <Text style={styles.instructionsText}>
          1. Test "In-App Alert" - should vibrate, play sound, show dialog{'\n'}
          2. Test "System-Level Alert" - should work even when app is closed{'\n'}
          3. For system test: tap button, close app, wait for notification{'\n'}
          4. System alert should appear like an incoming call
        </Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f5f5f5',
    justifyContent: 'center'
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333'
  },
  subtitle: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    color: '#666'
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 15,
    borderRadius: 10,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3
  },
  systemButton: {
    backgroundColor: '#FF6B00'
  },
  bothButton: {
    backgroundColor: '#34C759'
  },
  initButton: {
    backgroundColor: '#8E44AD'
  },
  dismissButton: {
    backgroundColor: '#FF3B30'
  },
  buttonText: {
    color: 'white',
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center'
  },
  buttonSubtext: {
    color: 'rgba(255,255,255,0.8)',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 5
  },
  instructions: {
    marginTop: 30,
    padding: 15,
    backgroundColor: 'white',
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333'
  },
  instructionsText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#666'
  }
});

export default TestSystemAlerts;
