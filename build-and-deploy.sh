#!/bin/bash

# Pizza Order Alert System - Build & Deploy Script
# This script helps build and deploy the APK for testing system-level alerts

echo "🍕 Pizza Order Alert System - Build & Deploy Script"
echo "=================================================="

# Check if we're in the correct directory
if [ ! -f "pizzafrontend/package.json" ]; then
    echo "❌ Error: Please run this script from the root pizza directory"
    exit 1
fi

cd pizzafrontend

echo ""
echo "1. Pre-build Checks..."
echo "--------------------"

# Check essential files
echo "Checking core alert files..."
if [ -f "utils/orderAlertService.ts" ] && [ -f "utils/systemLevelAlertService.ts" ]; then
    echo "✅ Alert services found"
else
    echo "❌ Alert services missing"
    exit 1
fi

if [ -f "assets/notification_sound.wav" ]; then
    echo "✅ Notification sound found"
else
    echo "❌ Notification sound missing - Please add notification_sound.wav to assets/"
    exit 1
fi

# Check TypeScript compilation
echo "Checking TypeScript..."
if npx tsc --noEmit > /dev/null 2>&1; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript errors found - Please fix before building"
    echo "Run 'npx tsc --noEmit' to see errors"
    exit 1
fi

echo ""
echo "2. Installing Dependencies..."
echo "---------------------------"

# Install required dependencies
echo "Installing expo-notifications..."
npx expo install expo-notifications

echo "Installing expo-task-manager..."
npx expo install expo-task-manager

echo "Installing expo-av..."
npx expo install expo-av

echo "Installing other dependencies..."
npm install

echo ""
echo "3. Build Options..."
echo "-----------------"

echo "Choose build option:"
echo "1. EAS Build (Recommended)"
echo "2. Classic Expo Build (Legacy)"
echo "3. Development Build"
echo ""

read -p "Enter your choice (1-3): " choice

case $choice in
    1)
        echo "🚀 Starting EAS Build..."
        echo ""
        echo "Note: You need to configure EAS first if not already done:"
        echo "  1. npm install -g @expo/cli"
        echo "  2. eas login"
        echo "  3. eas build:configure"
        echo ""
        read -p "Press Enter to continue with EAS build..."
        
        echo "Building Android APK with EAS..."
        eas build --platform android --profile preview
        ;;
    2)
        echo "🏗️ Starting Classic Expo Build..."
        echo ""
        echo "Note: Classic builds are deprecated. Consider using EAS."
        read -p "Press Enter to continue with classic build..."
        
        echo "Building Android APK..."
        expo build:android
        ;;
    3)
        echo "🧑‍💻 Creating Development Build..."
        echo ""
        echo "Building development APK..."
        eas build --platform android --profile development
        ;;
    *)
        echo "❌ Invalid choice. Exiting."
        exit 1
        ;;
esac

echo ""
echo "4. Post-Build Instructions..."
echo "---------------------------"

echo "📱 After build completes:"
echo ""
echo "1. Download APK from build dashboard"
echo "2. Install on physical Android device"
echo "3. Grant permissions:"
echo "   - Notifications: ON"
echo "   - Display over other apps: ON (Critical!)"
echo "   - Battery optimization: OFF"
echo ""
echo "4. Test the alert system:"
echo "   - Open app and login as admin"
echo "   - Go to /test-alerts page"
echo "   - Test both in-app and system alerts"
echo "   - Test with app in background"
echo "   - Test with app completely closed"
echo "   - Test with phone locked"
echo ""
echo "5. Debug if needed:"
echo "   - Run: npx expo logs --type=device"
echo "   - Check console logs for alert triggers"
echo "   - Verify notification permissions in device settings"

echo ""
echo "🎯 Testing Checklist:"
echo "- [ ] In-app alerts work (sound + modal)"
echo "- [ ] System notifications appear"
echo "- [ ] Full-screen call-like alerts show"
echo "- [ ] Alerts work when app is closed"
echo "- [ ] Sound plays in silent mode"
echo "- [ ] Vibration works"
echo "- [ ] Notifications bypass DND"
echo "- [ ] Interactive buttons work"
echo "- [ ] End-to-end order flow works"

echo ""
echo "✅ Build process completed!"
echo "=========================="

echo ""
echo "🚨 IMPORTANT NOTES:"
echo "- System-level alerts ONLY work in APK builds (not Expo Go)"
echo "- Test on physical device for best results"
echo "- Grant all permissions for full functionality"
echo "- Check SYSTEM_ALERT_GUIDE.md for detailed testing instructions"
