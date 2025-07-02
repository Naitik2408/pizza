#!/bin/bash

# System-Level Alert Testing Script
# This script helps test the alarm-like notification system for pizza orders

echo "🍕 Pizza Order Alert System - Comprehensive Testing Script"
echo "=========================================================="

# Check if we're in the correct directory
if [ ! -f "pizzafrontend/package.json" ]; then
    echo "❌ Error: Please run this script from the root pizza directory"
    exit 1
fi

cd pizzafrontend

# Function to check if a file exists
check_file() {
    if [ -f "$1" ]; then
        echo "✅ $1 - Found"
        return 0
    else
        echo "❌ $1 - Missing"
        return 1
    fi
}

echo ""
echo "1. Checking Core Alert System Files..."
echo "------------------------------------"

# Check essential files
check_file "utils/orderAlertService.ts"
check_file "utils/systemLevelAlertService.ts"
check_file "assets/notification_sound.wav"
check_file "app/_layout.tsx"
check_file "app/admin/orders.tsx"
check_file "app/test-alerts.tsx"
check_file "app.json"

echo ""
echo "2. Checking Backend Files..."
echo "---------------------------"

# Check backend files
if [ -d "../pizzabackend" ]; then
    echo "✅ Backend directory found"
    check_file "../pizzabackend/utils/notifications.js"
else
    echo "❌ Backend directory not found - Please ensure pizzabackend is in parent directory"
fi

echo ""
echo "3. Checking App Configuration..."
echo "------------------------------"

# Check app.json for notification channels
if grep -q "order_alerts" app.json; then
    echo "✅ order_alerts channel - Configured"
else
    echo "❌ order_alerts channel - Missing"
fi

if grep -q "full_screen_alerts" app.json; then
    echo "✅ full_screen_alerts channel - Configured"
else
    echo "❌ full_screen_alerts channel - Missing"
fi

# Check for required permissions
if grep -q "USE_FULL_SCREEN_INTENT" app.json; then
    echo "✅ USE_FULL_SCREEN_INTENT permission - Found"
else
    echo "❌ USE_FULL_SCREEN_INTENT permission - Missing"
fi

if grep -q "SYSTEM_ALERT_WINDOW" app.json; then
    echo "✅ SYSTEM_ALERT_WINDOW permission - Found"
else
    echo "❌ SYSTEM_ALERT_WINDOW permission - Missing"
fi

echo ""
echo "4. Testing Dependencies..."
echo "------------------------"

# Check if required packages are installed
if npm list expo-notifications > /dev/null 2>&1; then
    echo "✅ expo-notifications - Installed"
else
    echo "❌ expo-notifications - Missing (Run: npx expo install expo-notifications)"
fi

if npm list expo-task-manager > /dev/null 2>&1; then
    echo "✅ expo-task-manager - Installed"
else
    echo "❌ expo-task-manager - Missing (Run: npx expo install expo-task-manager)"
fi

if npm list expo-av > /dev/null 2>&1; then
    echo "✅ expo-av - Installed"
else
    echo "❌ expo-av - Missing (Run: npx expo install expo-av)"
fi

echo ""
echo "5. Build and Test Instructions..."
echo "-------------------------------"

echo "📱 Complete Testing Workflow:"
echo ""
echo "Step 1: Build APK"
echo "  cd pizzafrontend"
echo "  npx expo build:android  # or eas build --platform android"
echo ""
echo "Step 2: Install on Physical Device"
echo "  - Install APK on Android device (not emulator)"
echo "  - Grant all notification permissions"
echo "  - Allow 'Display over other apps' permission"
echo ""
echo "Step 3: Test In-App Alerts"
echo "  - Open app and login as admin"
echo "  - Navigate to /test-alerts"
echo "  - Test 'Test In-App Alert' button"
echo "  - Verify sound, vibration, and modal appear"
echo ""
echo "Step 4: Test System-Level Alerts"
echo "  - Use 'Test System Alert' button"
echo "  - Verify notification appears in notification panel"
echo "  - Check if notification has action buttons"
echo ""
echo "Step 5: Test Background Behavior" 
echo "  - Put app in background"
echo "  - From another device/backend, trigger new order"
echo "  - Verify alarm-like notification appears"
echo "  - Test with phone locked"
echo "  - Test with Do Not Disturb enabled"
echo ""
echo "Step 6: End-to-End Testing"
echo "  - Create real order from customer app"
echo "  - Verify admin receives all alert types"
echo "  - Check console logs for debugging"

echo ""
echo "🔧 Troubleshooting Tips:"
echo "-----------------------"
echo "- No notifications: Check device notification permissions"
echo "- No sound: Verify device volume and notification sound settings"  
echo "- No vibration: Enable vibration in device settings"
echo "- Alerts not working when closed: Ensure APK build (not Expo Go)"
echo "- Full-screen not showing: Check 'Display over other apps' permission"
echo ""
echo "Debug logs: npx expo logs --type=device"

echo ""
echo "✅ Alert System Test Setup Complete!"
echo "===================================="
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

echo
echo "Checking system files..."

# Check if required files exist
if [ -f "/home/naitik2408/Contribution/pizza/pizzafrontend/utils/orderAlertService.ts" ]; then
    print_status "orderAlertService.ts exists"
else
    print_error "orderAlertService.ts missing"
    exit 1
fi

if [ -f "/home/naitik2408/Contribution/pizza/pizzafrontend/assets/notification_sound.wav" ]; then
    print_status "notification_sound.wav exists"
else
    print_error "notification_sound.wav missing"
    exit 1
fi

if [ -f "/home/naitik2408/Contribution/pizza/pizzabackend/utils/notifications.js" ]; then
    print_status "backend notifications.js exists"
else
    print_error "backend notifications.js missing"
    exit 1
fi

echo
echo "Checking app configuration..."

# Check app.json for required configurations
if grep -q "order_alerts" "/home/naitik2408/Contribution/pizza/pizzafrontend/app.json"; then
    print_status "notification channel 'order_alerts' configured"
else
    print_error "notification channel 'order_alerts' not found in app.json"
fi

if grep -q "USE_FULL_SCREEN_INTENT" "/home/naitik2408/Contribution/pizza/pizzafrontend/app.json"; then
    print_status "USE_FULL_SCREEN_INTENT permission added"
else
    print_warning "USE_FULL_SCREEN_INTENT permission not found"
fi

echo
echo "Testing backend notification payload..."

# Check if backend has correct notification type
if grep -q "new_order_alarm" "/home/naitik2408/Contribution/pizza/pizzabackend/utils/notifications.js"; then
    print_status "backend sends 'new_order_alarm' type notifications"
else
    print_error "backend notification type not configured correctly"
fi

echo
echo "Checking frontend integration..."

# Check if _layout.tsx has orderAlertService import
if grep -q "orderAlertService" "/home/naitik2408/Contribution/pizza/pizzafrontend/app/_layout.tsx"; then
    print_status "_layout.tsx has orderAlertService integration"
else
    print_error "_layout.tsx missing orderAlertService integration"
fi

# Check if admin orders page has orderAlertService
if grep -q "orderAlertService" "/home/naitik2408/Contribution/pizza/pizzafrontend/app/admin/orders.tsx"; then
    print_status "admin orders page has orderAlertService integration"
else
    print_error "admin orders page missing orderAlertService integration"
fi

echo
echo "System files check complete!"
echo
echo "📝 Next steps:"
echo "1. Build APK: cd pizzafrontend && eas build --platform android"
echo "2. Install on device: adb install your-app.apk"
echo "3. Test with a real order from customer app"
echo "4. Verify alarm plays even when app is closed/DND mode"
echo

# Quick build command suggestion
echo "💡 Quick build command:"
echo "cd /home/naitik2408/Contribution/pizza/pizzafrontend"
echo "eas build --platform android --profile preview"
echo

echo "📱 For testing, you can also use:"
echo "npm run android  # for development testing"
echo "npm run start    # to start the development server"
echo
