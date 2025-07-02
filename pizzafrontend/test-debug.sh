#!/bin/bash

echo "🚀 PIZZA ADMIN NOTIFICATION SYSTEM TESTING"
echo "==========================================="
echo ""

# Check if running from correct directory
if [ ! -f "package.json" ]; then
    echo "❌ Error: Run this script from the pizzafrontend directory"
    exit 1
fi

echo "📱 Starting Expo Development Server with Debug Logging..."
echo ""
echo "🔍 DEBUG CHECKLIST:"
echo "==================="
echo "1. ✅ Open the app on a physical device (not emulator)"
echo "2. ✅ Log in as admin user"
echo "3. ✅ Go to /test-alerts page"
echo "4. ✅ Click 'Initialize Services' first"
echo "5. ✅ Check Metro logs for initialization messages"
echo "6. ✅ Test in-app alerts first"
echo "7. ✅ Then test system-level alerts"
echo ""
echo "🚨 Look for these DEBUG LOGS:"
echo "=============================="
echo "- '🚀 APP LAYOUT - Initializing system alerts...'"
echo "- '✅ SystemLevelAlertService initialized successfully'"
echo "- '🔔 ORDER ALERT SERVICE - playOrderAlert called'"
echo "- '🚨 STARTING SYSTEM-LEVEL ALERT PROCESS'"
echo ""
echo "💡 TROUBLESHOOTING:"
echo "=================="
echo "- If no logs appear → Services not initializing"
echo "- If initialization fails → Check permissions"
echo "- If alerts don't work → Check notification permissions"
echo "- If system alerts don't work → Need APK build"
echo ""
echo "Starting development server..."
echo ""

# Start expo with debug logging
EXPO_NO_TELEMETRY=1 npx expo start --clear
