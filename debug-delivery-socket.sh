#!/bin/bash

# Debug script to test delivery socket events
echo "🧪 Testing Delivery Agent Socket Connection & Events"
echo "======================================================"

echo ""
echo "1. Check if backend server is running:"
curl -s http://localhost:5000/ && echo "✅ Backend server is running" || echo "❌ Backend server is NOT running"

echo ""
echo "2. Testing socket connection (you'll need to check the frontend console logs):"
echo "   - Open the delivery agent assigned orders page"
echo "   - Check console for these logs:"
echo "     🔌 Setting up socket for delivery agent: { userId: 'xxx', role: 'delivery', ... }"
echo "     ✅ Socket connected in delivery orders screen"
echo "     🔗 Socket ID: xxx"
echo "     🏠 Joining rooms: user:xxx and role:delivery"

echo ""
echo "3. Testing order assignment from admin:"
echo "   - Open admin panel"
echo "   - Assign an order to the delivery agent"
echo "   - Check delivery agent console for:"
echo "     🔔 Socket event received: new_order_assigned { ... }"
echo "     ✅ New order assigned to delivery agent: { ... }"
echo "     🔊 Triggering system-level alert..."
echo "     📢 Setting urgent alarm..."

echo ""
echo "4. Common issues to check:"
echo "   ❌ userId is null/undefined"
echo "   ❌ Socket not connecting"
echo "   ❌ Not joining socket rooms"
echo "   ❌ Backend not emitting new_order_assigned event"
echo "   ❌ Alarm permissions not granted"

echo ""
echo "5. Backend socket room structure should be:"
echo "   - user:{userId} (specific delivery agent)"
echo "   - role:delivery (all delivery agents)"

echo ""
echo "6. If events are not received, check:"
echo "   - Frontend userId matches backend deliveryAgent ID"
echo "   - Socket rooms are being joined correctly"
echo "   - Backend is emitting to the correct room"

echo ""
echo "To continue debugging, check the console logs in both frontend and backend..."
