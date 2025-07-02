#!/bin/bash

echo "🚀 TESTING ENHANCED NOTIFICATION SYSTEM"
echo "========================================="

# Test 1: Basic notification functionality
echo ""
echo "📱 Test 1: Testing basic enhanced notification..."
curl -X POST http://localhost:3000/api/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test_enhanced",
    "orderData": {
      "orderId": "test_123",
      "orderNumber": "#TEST123",
      "customerName": "Test Customer",
      "amount": 499
    }
  }'

echo ""
echo "⏱️  Waiting 10 seconds for notification to appear..."
sleep 10

# Test 2: Duplicate prevention
echo ""
echo "📱 Test 2: Testing duplicate prevention (sending same order twice)..."
curl -X POST http://localhost:3000/api/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test_enhanced",
    "orderData": {
      "orderId": "test_123",
      "orderNumber": "#TEST123",
      "customerName": "Test Customer",
      "amount": 499
    }
  }'

curl -X POST http://localhost:3000/api/test/notification \
  -H "Content-Type: application/json" \
  -d '{
    "type": "test_enhanced",
    "orderData": {
      "orderId": "test_123",
      "orderNumber": "#TEST123",
      "customerName": "Test Customer",
      "amount": 499
    }
  }'

echo ""
echo "⏱️  Waiting 40 seconds to test escalating alerts..."
sleep 40

echo ""
echo "✅ Enhanced notification test completed!"
echo ""
echo "🔍 EXPECTED RESULTS:"
echo "   1. You should see 1 URGENT notification (not duplicates)"
echo "   2. After 30s: High priority follow-up"
echo "   3. After 60s: Very High priority follow-up"
echo "   4. Notifications should have action buttons"
echo "   5. Notifications should work even if app is closed"
echo ""
echo "📋 NEXT STEPS:"
echo "   1. Test with app in background"
echo "   2. Test with phone on silent mode"
echo "   3. Test notification action buttons"
echo "   4. Test Do Not Disturb bypass (Android)"
