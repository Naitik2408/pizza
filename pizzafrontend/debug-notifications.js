#!/usr/bin/env node

/**
 * Debug Script for Pizza Admin Notification System
 * This script helps diagnose notification and alert issues
 */

const { exec } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🔍 PIZZA ADMIN NOTIFICATION DEBUG TOOL');
console.log('=====================================\n');

// Check if we're in the right directory
const currentDir = process.cwd();
const packageJsonPath = path.join(currentDir, 'package.json');

if (!fs.existsSync(packageJsonPath)) {
  console.log('❌ Error: Not in a valid React Native/Expo project directory');
  console.log('Please run this script from the pizzafrontend directory\n');
  process.exit(1);
}

// Check package.json for dependencies
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
console.log('📦 DEPENDENCY CHECK:');
console.log('==================');

const requiredDeps = [
  'expo-notifications',
  'expo-task-manager', 
  'expo-av',
  'socket.io-client'
];

requiredDeps.forEach(dep => {
  if (packageJson.dependencies && packageJson.dependencies[dep]) {
    console.log(`✅ ${dep}: ${packageJson.dependencies[dep]}`);
  } else {
    console.log(`❌ ${dep}: NOT FOUND`);
  }
});

// Check app.json configuration
console.log('\n🔧 APP.JSON CONFIGURATION:');
console.log('========================');

const appJsonPath = path.join(currentDir, 'app.json');
if (fs.existsSync(appJsonPath)) {
  const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));
  
  // Check notifications plugin
  const plugins = appJson.expo?.plugins || [];
  const notificationPlugin = plugins.find(p => 
    (Array.isArray(p) && p[0] === 'expo-notifications') || p === 'expo-notifications'
  );
  
  if (notificationPlugin) {
    console.log('✅ expo-notifications plugin configured');
    if (Array.isArray(notificationPlugin) && notificationPlugin[1]?.androidChannels) {
      console.log(`✅ Android channels: ${notificationPlugin[1].androidChannels.length} configured`);
    }
  } else {
    console.log('❌ expo-notifications plugin NOT configured');
  }
  
  // Check Android permissions
  const permissions = appJson.expo?.android?.permissions || [];
  const requiredPerms = [
    'RECEIVE_BOOT_COMPLETED',
    'VIBRATE',
    'POST_NOTIFICATIONS',
    'USE_FULL_SCREEN_INTENT',
    'SYSTEM_ALERT_WINDOW'
  ];
  
  console.log('\n📱 ANDROID PERMISSIONS:');
  requiredPerms.forEach(perm => {
    if (permissions.includes(perm)) {
      console.log(`✅ ${perm}`);
    } else {
      console.log(`❌ ${perm}`);
    }
  });
} else {
  console.log('❌ app.json not found');
}

// Check if notification sound exists
console.log('\n🔊 NOTIFICATION SOUND:');
console.log('====================');
const soundPath = path.join(currentDir, 'assets', 'notification_sound.wav');
if (fs.existsSync(soundPath)) {
  const stats = fs.statSync(soundPath);
  console.log(`✅ notification_sound.wav exists (${(stats.size / 1024).toFixed(1)} KB)`);
} else {
  console.log('❌ notification_sound.wav NOT FOUND');
}

// Check service files
console.log('\n📁 SERVICE FILES:');
console.log('================');
const serviceFiles = [
  'utils/systemLevelAlertService.ts',
  'utils/orderAlertService.ts',
  'app/_layout.tsx'
];

serviceFiles.forEach(file => {
  const filePath = path.join(currentDir, file);
  if (fs.existsSync(filePath)) {
    const stats = fs.statSync(filePath);
    console.log(`✅ ${file} (${(stats.size / 1024).toFixed(1)} KB)`);
  } else {
    console.log(`❌ ${file} NOT FOUND`);
  }
});

console.log('\n🚀 TESTING RECOMMENDATIONS:');
console.log('===========================');
console.log('1. Test notifications step by step:');
console.log('   - First test basic push notifications');
console.log('   - Then test in-app alerts');
console.log('   - Finally test system-level alerts');
console.log('');
console.log('2. Check device permissions:');
console.log('   - Go to Settings > Apps > Your App > Notifications');
console.log('   - Enable all notification categories');
console.log('   - Go to Special app access > Display over other apps');
console.log('   - Enable for your app');
console.log('');
console.log('3. Test on physical device (not emulator)');
console.log('4. Build APK/AAB for full system-level alert testing');
console.log('');
console.log('🔧 Quick fixes to try:');
console.log('- Clear app data and reinstall');
console.log('- Check if backend is sending notifications');
console.log('- Test with /test-alerts page');
console.log('- Check Metro logs for errors');

console.log('\n✅ Debug complete! Check the results above.\n');
