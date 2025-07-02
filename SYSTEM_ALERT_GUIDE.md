# 🚨 System-Level Order Alert Implementation Guide

## Overview
This implementation provides **true system-level alerts** that work even when the app is completely closed, similar to incoming phone calls. The alerts will wake up the device, bypass Do Not Disturb mode, and show full-screen notifications.

## What's Been Implemented

### 1. **System-Level Alert Service** (`systemLevelAlertService.ts`)
- **Full-screen intent notifications** (Android) - shows like incoming call
- **Critical alerts** (iOS) - bypasses silent mode
- **Call-like vibration patterns** - aggressive vibration
- **Interactive notifications** - with action buttons
- **Works when app is closed** - true background alerts

### 2. **Enhanced App Configuration** (`app.json`)
- **Critical notification channels** with max priority
- **Full-screen intent permissions** 
- **System alert permissions** (wake screen, bypass DND)
- **Custom vibration patterns** for call-like behavior

### 3. **Backend Enhancements** (`notifications.js`)
- **System-level notification flags** in payload
- **Full-screen intent triggers**
- **Critical alert metadata**
- **Max priority settings**

### 4. **Dual Alert System**
- **In-App Alerts**: Work when app is open (immediate response)
- **System-Level Alerts**: Work when app is closed (true background alerts)
- **Automatic fallbacks**: If one fails, the other works

## How It Works

### When App is Open:
1. Normal push notification received
2. **In-app alert triggered**: Sound + Vibration + Dialog
3. **System alert also sent**: Backup for when app closes

### When App is Closed:
1. System-level notification received
2. **Device wakes up** (even from sleep)
3. **Full-screen alert appears** (like incoming call)
4. **Vibration + Sound** (bypasses silent mode)
5. **Interactive buttons**: View Order / Dismiss

## Testing Instructions

### 1. **Development Testing**
```bash
cd pizzafrontend
npm start
# Navigate to /test-alerts to test different alert types
```

### 2. **APK Testing (IMPORTANT)**
```bash
cd pizzafrontend
eas build --platform android --profile production
# Install APK on physical device
```

### 3. **Test Scenarios**
- ✅ **App Open**: Should get both in-app + system alerts
- ✅ **App Background**: Should get system-level full-screen alert
- ✅ **App Closed**: Should get call-like notification that wakes device
- ✅ **Silent Mode**: Should bypass and play sound
- ✅ **DND Mode**: Should bypass and vibrate/sound
- ✅ **Device Locked**: Should wake screen and show full-screen alert

### 4. **Real Order Test**
1. Login as admin
2. Place order from customer account
3. Close the pizza admin app completely
4. Should receive call-like alert even with app closed

## Key Features

### ✅ **Call-Like Behavior**
- Full-screen notifications
- Aggressive vibration patterns (2-second pulses)
- Sound that bypasses silent mode
- Wakes device from sleep

### ✅ **True Background Alerts**
- Works when app is completely closed
- No need to keep app running
- System-level notifications
- Independent of app state

### ✅ **Interactive Notifications**
- "View Order" button - opens app to order details
- "Dismiss" button - stops the alert
- Tapping notification navigates to orders page

### ✅ **Fallback System**
- If system alert fails → In-app alert still works
- If sound fails → Vibration still works
- Multiple notification layers for reliability

## Permissions Required

The app now requests these critical permissions:
- `USE_FULL_SCREEN_INTENT` - For call-like notifications
- `DISABLE_KEYGUARD` - To show over lock screen
- `TURN_SCREEN_ON` - To wake device
- `SHOW_WHEN_LOCKED` - To display when locked
- `REQUEST_IGNORE_BATTERY_OPTIMIZATIONS` - To prevent system killing

## File Changes Summary

### New Files:
- `utils/systemLevelAlertService.ts` - System-level alert logic
- `app/test-alerts.tsx` - Testing component
- `SYSTEM_ALERT_GUIDE.md` - This guide

### Modified Files:
- `app.json` - Added critical permissions and channels
- `app/_layout.tsx` - Integrated system alerts
- `app/admin/orders.tsx` - Triggers system alerts
- `pizzabackend/utils/notifications.js` - Enhanced payloads

## Expected Behavior

When a new order arrives:

1. **If admin app is open**: 
   - Immediate vibration and sound
   - Full-screen dialog appears
   - Background system alert also sent

2. **If admin app is closed**:
   - Device wakes up (even from sleep)
   - Full-screen notification appears (like incoming call)
   - Strong vibration pattern (2s pulses)
   - Sound plays (bypasses silent mode)
   - Admin can tap "View Order" to open app

## Troubleshooting

### If System Alerts Don't Work:
1. **Check permissions**: Ensure all permissions granted
2. **Battery optimization**: Disable for the app
3. **DND settings**: Allow app to bypass DND
4. **Test on real device**: Emulator won't show full behavior

### If No Sound:
1. **Check notification channels**: Verify in Android settings
2. **Volume settings**: Check notification volume
3. **Sound file**: Ensure `notification_sound.wav` exists

### If Vibration Doesn't Work:
1. **Permission**: Check VIBRATE permission
2. **Device settings**: Ensure vibration enabled
3. **Test different patterns**: Try various vibration patterns

## Success Criteria

✅ **Admin receives immediate alert even if phone is away**  
✅ **Alert wakes device from sleep**  
✅ **Bypasses silent mode and DND**  
✅ **Shows like incoming call when app closed**  
✅ **Works reliably without app running**  
✅ **Interactive - can directly open to order details**

The system now provides **true call-like alerts** that ensure the admin never misses an order, regardless of device state or app status! 🚨📞
