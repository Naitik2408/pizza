# 🚨 PIZZA ADMIN NOTIFICATION DEBUGGING GUIDE

## Current Issue
You're not getting any alerts or logs even when the app is open. This suggests the alert system is not being triggered.

## 🔍 DEBUGGING STEPS (Follow in Order)

### Step 1: Check Basic Setup
```bash
cd /home/naitik2408/Contribution/pizza/pizzafrontend
node debug-notifications.js
```
This will verify all dependencies, permissions, and files are correctly configured.

### Step 2: Start Development Server with Debug Logging
```bash
./test-debug.sh
```
Or manually:
```bash
EXPO_NO_TELEMETRY=1 npx expo start --clear
```

### Step 3: Check Service Initialization
1. Open the app on a **physical device** (not emulator)
2. Log in as **admin** user
3. Look for these logs in Metro console:
   ```
   🚀 APP LAYOUT - Initializing system alerts...
   👤 Current user role: admin
   ✅ SystemLevelAlertService initialized successfully
   ```

**If you DON'T see these logs:**
- The user role might not be 'admin'
- The services are not initializing
- Check authentication state

### Step 4: Manual Service Testing
1. Navigate to `/test-alerts` page in the app
2. Click "Initialize Services" button
3. Check console for:
   ```
   🔧 Manually initializing services...
   1️⃣ Initializing orderAlertService...
   2️⃣ Initializing SystemLevelAlertService...
   ```

### Step 5: Test In-App Alerts
1. On `/test-alerts` page, click "Test In-App Alert Only"
2. Should see logs:
   ```
   🔔 ORDER ALERT SERVICE - playOrderAlert called
   🚨 STARTING URGENT ORDER ALERT for order: #TEST001
   ```
3. Should hear sound, feel vibration, see modal

**If in-app alerts don't work:**
- Audio permissions issue
- Sound file not loading
- Service not initialized

### Step 6: Test System-Level Alerts
1. Click "Test System-Level Alert"
2. Should see logs:
   ```
   🚨 STARTING SYSTEM-LEVEL ALERT PROCESS
   📤 Scheduling primary system notification...
   ✅ Primary notification scheduled
   ```
3. Should receive notification

### Step 7: Test Socket Connection (Real Orders)
Check if the admin orders page is receiving socket events:
1. Go to `/admin/orders` page
2. Place a test order from another device/customer app
3. Look for logs:
   ```
   New order received in admin orders page: [data]
   🚨 System-level alert sent for order: #XXX
   ```

**If no socket logs:**
- Backend not sending events
- Socket connection not established
- User not admin/delivery role

## 🔧 COMMON ISSUES & FIXES

### Issue 1: No Initialization Logs
**Cause:** User role is not 'admin' or 'delivery'
**Fix:** Check authentication state in Redux store

### Issue 2: Services Initialize but No Alerts
**Cause:** Notification permissions not granted
**Fix:** 
```javascript
// Check permissions
const { status } = await Notifications.getPermissionsAsync();
if (status !== 'granted') {
  await Notifications.requestPermissionsAsync();
}
```

### Issue 3: In-App Alerts Work, System Alerts Don't
**Cause:** Need APK build for full system-level features
**Fix:** Build APK and test on device:
```bash
npx eas build --platform android --profile preview
```

### Issue 4: No Socket Events
**Cause:** Backend not connected or not sending notifications
**Fix:** Check backend logs and socket connection

## 📋 DEBUG CHECKLIST

- [ ] All dependencies installed correctly
- [ ] App.json permissions configured
- [ ] Sound file exists
- [ ] User logged in as admin
- [ ] Services initialize on app start
- [ ] Manual service initialization works
- [ ] In-app alerts work
- [ ] System notifications work
- [ ] Socket connection established
- [ ] Backend sending notifications

## 🚨 NEXT STEPS

1. **Start with Step 1** and work through each step
2. **Check Metro console logs** for each step
3. **Share the logs** you see (or don't see) for further debugging
4. If services don't initialize → Authentication/role issue
5. If services initialize but no alerts → Permissions issue
6. If in-app works but system doesn't → Need APK build

## 📞 Quick Test Commands

Test just the notification system:
```javascript
// In React Native debugger console:
import SystemLevelAlertService from './utils/systemLevelAlertService';
SystemLevelAlertService.sendSystemLevelAlert({
  orderId: 'test', 
  orderNumber: '#TEST', 
  customerName: 'Test User', 
  amount: 100
});
```

Let me know what logs you see at each step!
