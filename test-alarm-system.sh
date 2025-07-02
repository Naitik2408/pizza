#!/bin/bash

# Test the Order Alert System
echo "🍕 Testing Pizza Order Alert System"
echo "=================================="

# Test if the alert service can be imported (basic syntax check)
echo "Testing TypeScript compilation..."

cd /home/naitik2408/Contribution/pizza/pizzafrontend

# Check if TypeScript compiles without errors
npx tsc --noEmit --skipLibCheck utils/orderAlertService.ts 2>/dev/null

if [ $? -eq 0 ]; then
    echo "✅ TypeScript compilation successful"
else
    echo "❌ TypeScript compilation failed"
    echo "Running detailed check..."
    npx tsc --noEmit --skipLibCheck utils/orderAlertService.ts
fi

echo ""
echo "🔍 Checking key implementation points:"

# Check if the notification handler is updated
if grep -q "shouldShowBanner" app/_layout.tsx; then
    echo "✅ Updated notification handler (no more shouldShowAlert warning)"
else
    echo "❌ Notification handler still uses deprecated API"
fi

# Check if both notification types are handled
if grep -q "new_order_alarm.*new_order" app/_layout.tsx; then
    echo "✅ Handles both 'new_order_alarm' and 'new_order' types"
else
    echo "❌ Only handles one notification type"
fi

# Check if the backend sends the correct type
if grep -q "new_order_alarm" ../pizzabackend/utils/notifications.js; then
    echo "✅ Backend sends 'new_order_alarm' type"
else
    echo "❌ Backend not configured for alarm type"
fi

echo ""
echo "📱 To test the alarm system:"
echo "1. Start the backend: cd pizzabackend && npm start"
echo "2. Start the frontend: cd pizzafrontend && npm start"  
echo "3. Place a test order from a customer account"
echo "4. Check if admin receives:"
echo "   - Immediate vibration (1.5s pulses)"
echo "   - Looping alarm sound"
echo "   - Full-screen alert dialog"
echo "   - Multiple notification fallbacks"

echo ""
echo "🔧 For APK testing:"
echo "1. Build: eas build --platform android"
echo "2. Install on device"
echo "3. Test with device locked/in DND mode"
echo "4. Verify alert works even when app is closed"

echo ""
echo "🚨 Expected behavior when new order arrives:"
echo "- Strong vibration pattern (like incoming call)"
echo "- Continuous alarm sound (looping)"  
echo "- Full-screen alert dialog"
echo "- Works even if phone is away/silent"
echo "- Multiple fallback notifications"
