#!/bin/bash

echo "🔧 RESTARTING PIZZA BACKEND SERVER"
echo "=================================="

# Navigate to backend directory
cd /home/naitik2408/Contribution/pizza/pizzabackend

echo "📱 Current API URL in frontend: http://192.168.74.48:5000"
echo ""

# Kill existing node processes for this project (if any)
echo "🛑 Stopping existing backend processes..."
pkill -f "node.*pizzabackend" 2>/dev/null || echo "No existing processes found"

echo ""
echo "🚀 Starting backend server..."
echo "Backend will be available at: http://192.168.74.48:5000"
echo ""
echo "📋 Available endpoints:"
echo "- GET  /api/orders         - List all orders"
echo "- GET  /api/orders/:id     - Get order details"  
echo "- POST /api/orders         - Create new order"
echo ""
echo "🔍 Watch for order detail fetch logs..."
echo ""

# Start the server
npm start
