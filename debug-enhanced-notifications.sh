#!/bin/bash

echo "🔧 ENHANCED NOTIFICATION DEBUG SCRIPT"
echo "======================================"

# Function to test notification
test_notification() {
    local order_id=$1
    local order_number=$2
    local customer_name=$3
    local amount=$4
    
    echo ""
    echo "📱 Testing notification for Order: $order_number"
    echo "   Customer: $customer_name"
    echo "   Amount: ₹$amount"
    echo ""
    
    curl -s -X POST http://localhost:5000/api/test/notification \
      -H "Content-Type: application/json" \
      -d "{
        \"type\": \"test_enhanced\",
        \"orderData\": {
          \"orderId\": \"$order_id\",
          \"orderNumber\": \"$order_number\",
          \"customerName\": \"$customer_name\",
          \"amount\": $amount
        }
      }" | jq '.'
}

# Check if backend is running
echo "🔍 Checking if backend is running..."
if curl -s http://localhost:3000/ > /dev/null; then
    echo "✅ Backend is running"
else
    echo "❌ Backend is not running. Please start it with:"
    echo "   cd pizzabackend && npm run dev"
    exit 1
fi

# Menu
echo ""
echo "🎯 Select test scenario:"
echo "1. Single notification test"
echo "2. Duplicate prevention test"
echo "3. Multiple orders test"
echo "4. Escalating alerts test (wait 2+ minutes)"
echo "5. Custom test"
echo ""

read -p "Enter choice (1-5): " choice

case $choice in
    1)
        echo "🧪 Running single notification test..."
        test_notification "test_001" "#TEST001" "John Doe" 599
        ;;
    2)
        echo "🧪 Running duplicate prevention test..."
        echo "Sending same order twice quickly..."
        test_notification "test_002" "#TEST002" "Jane Smith" 799
        sleep 2
        test_notification "test_002" "#TEST002" "Jane Smith" 799
        echo ""
        echo "🔍 Expected: Only ONE notification should appear"
        ;;
    3)
        echo "🧪 Running multiple orders test..."
        test_notification "test_003" "#TEST003" "Alice Brown" 899
        sleep 3
        test_notification "test_004" "#TEST004" "Bob Wilson" 1299
        sleep 3
        test_notification "test_005" "#TEST005" "Carol Davis" 699
        echo ""
        echo "🔍 Expected: Three separate notifications"
        ;;
    4)
        echo "🧪 Running escalating alerts test..."
        echo "⚠️  IMPORTANT: Do NOT tap or dismiss the notification"
        echo "    Wait and watch for follow-up alerts at:"
        echo "    - 30 seconds: High priority"
        echo "    - 60 seconds: Very High priority"
        echo "    - 120 seconds: CRITICAL priority"
        echo ""
        test_notification "test_006" "#TEST006" "Test Customer" 1499
        echo ""
        echo "⏰ Timer started. Watching for escalating alerts..."
        
        # Timer display
        for i in {1..130}; do
            if [ $i -eq 30 ]; then
                echo "⚡ 30s - High priority alert should appear now"
            elif [ $i -eq 60 ]; then
                echo "⚡ 60s - Very High priority alert should appear now"
            elif [ $i -eq 120 ]; then
                echo "⚡ 120s - CRITICAL alert should appear now"
            fi
            
            printf "\r⏱️  %ds elapsed" $i
            sleep 1
        done
        echo ""
        echo "✅ Escalating alerts test completed"
        ;;
    5)
        echo "🧪 Custom test"
        read -p "Order ID: " custom_id
        read -p "Order Number: " custom_number
        read -p "Customer Name: " custom_name
        read -p "Amount (₹): " custom_amount
        
        test_notification "$custom_id" "$custom_number" "$custom_name" "$custom_amount"
        ;;
    *)
        echo "❌ Invalid choice"
        exit 1
        ;;
esac

echo ""
echo "✅ Test completed!"
echo ""
echo "📋 CHECKLIST - Verify these work:"
echo "   [ ] Notification appeared"
echo "   [ ] Notification has action buttons"
echo "   [ ] Sound/vibration worked"
echo "   [ ] Works when app is in background"
echo "   [ ] Works when app is completely closed"
echo "   [ ] Critical alerts bypass silent mode (Android)"
echo ""
echo "🔧 TROUBLESHOOTING:"
echo "   - No notification? Check Expo push token registration"
echo "   - No sound? Check notification_sound.wav file"
echo "   - Duplicates? Check duplicate prevention logic"
echo "   - Not working when closed? Check background task registration"
echo ""
echo "📖 For full testing guide, see: ENHANCED_NOTIFICATION_GUIDE.md"
