# Pizza Order Alert System - Testing Guide

## Overview
This guide helps you test the alarm-like notification system for new orders in the pizza delivery app.

## Testing Checklist

### 1. **APK Build Testing**
- [ ] Build APK using `eas build --platform android`
- [ ] Install APK on physical Android device
- [ ] Test with device in Do Not Disturb mode
- [ ] Test with app in background/closed state

### 2. **Notification Permissions**
- [ ] Verify notification permissions are granted
- [ ] Check if app can override Do Not Disturb
- [ ] Ensure custom notification channel is created

### 3. **Alarm Functionality Test**
- [ ] Place a test order from customer app
- [ ] Verify admin receives alarm notification
- [ ] Check sound plays continuously (looping)
- [ ] Verify vibration pattern works
- [ ] Test full-screen alert appears
- [ ] Verify snooze functionality

### 4. **User Experience Flow**
```
1. Customer places order → 
2. Backend sends alarm notification → 
3. Admin device plays sound/vibrates → 
4. Full-screen alert appears → 
5. Admin taps notification → 
6. Navigates to order details
```

### 5. **Edge Cases**
- [ ] Test when app is completely closed
- [ ] Test when device is locked
- [ ] Test with multiple rapid orders
- [ ] Test alert stop functionality
- [ ] Test when notification permission denied

## Test Commands

### Build and Test APK
```bash
# Build APK
cd /home/naitik2408/Contribution/pizza/pizzafrontend
eas build --platform android --profile preview

# Install on device
adb install path-to-your-app.apk
```

### Debug Notifications
```bash
# Check notification channels on device
adb shell dumpsys notification | grep -A 10 "order_alerts"

# Monitor system logs
adb logcat | grep -E "(notification|alarm|sound)"
```

## Configuration Files to Verify

### app.json - Notification Channel
```json
{
  "plugins": [
    {
      "expo-notifications": {
        "notificationChannels": [
          {
            "id": "order_alerts",
            "name": "Order Alerts",
            "importance": "max",
            "vibrationPattern": [0, 250, 250, 250],
            "sound": "./assets/notification_sound.wav"
          }
        ]
      }
    }
  ]
}
```

### Required Permissions
- `android.permission.VIBRATE`
- `android.permission.USE_FULL_SCREEN_INTENT`
- `android.permission.SYSTEM_ALERT_WINDOW`

## Troubleshooting

### If alarm doesn't work:
1. Check notification permissions
2. Verify custom sound file exists
3. Check notification channel settings
4. Test on different Android versions

### If sound doesn't loop:
1. Verify `orderAlertService.playOrderAlert()` is called
2. Check sound file format (should be WAV)
3. Ensure proper cleanup in `stopAlert()`

### If full-screen alert doesn't appear:
1. Check `USE_FULL_SCREEN_INTENT` permission
2. Verify device settings allow full-screen notifications
3. Test on different device/Android version

## Success Criteria
- ✅ Admin receives immediate notification
- ✅ Sound plays continuously until stopped
- ✅ Device vibrates with pattern
- ✅ Full-screen alert appears
- ✅ Works even when app is closed/DND mode
- ✅ Proper navigation on notification tap
