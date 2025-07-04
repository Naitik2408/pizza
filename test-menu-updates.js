#!/usr/bin/env node

// Test script to verify menu item real-time updates are working

const fetch = require('node-fetch');
const io = require('socket.io-client');

const API_URL = 'http://localhost:3000';
const SOCKET_URL = 'http://localhost:3000';

// Mock auth token (you'd need a real one for actual testing)
const AUTH_TOKEN = 'your-auth-token-here';

async function testMenuUpdates() {
  console.log('🧪 Testing Menu Item Real-time Updates...\n');

  // 1. First, let's fetch current menu items
  console.log('1. Fetching current menu items...');
  try {
    const response = await fetch(`${API_URL}/api/menu`);
    const menuItems = await response.json();
    console.log(`✅ Found ${menuItems.length} menu items`);
    
    if (menuItems.length > 0) {
      const firstItem = menuItems[0];
      console.log(`📋 Testing with item: ${firstItem.name} (ID: ${firstItem._id})`);
      console.log(`   Current availability: ${firstItem.available}`);
      
      // 2. Set up socket listener
      console.log('\n2. Setting up socket connection...');
      const socket = io(SOCKET_URL, {
        auth: {
          token: AUTH_TOKEN
        }
      });

      socket.on('connect', () => {
        console.log('✅ Socket connected');

        // Listen for menu item updates
        socket.on('menuItemUpdated', (updateData) => {
          console.log('🔄 Received menu item update:', updateData);
        });

        // 3. Toggle the availability of the first item
        console.log('\n3. Testing availability toggle...');
        
        // Simulate admin toggling availability
        fetch(`${API_URL}/api/menu/${firstItem._id}/toggle-availability`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${AUTH_TOKEN}`
          }
        })
        .then(response => response.json())
        .then(data => {
          console.log(`✅ Toggled availability to: ${data.available}`);
        })
        .catch(err => {
          console.log('❌ Failed to toggle availability:', err.message);
        });
      });

      socket.on('disconnect', () => {
        console.log('❌ Socket disconnected');
      });

      socket.on('connect_error', (error) => {
        console.log('❌ Socket connection error:', error.message);
      });

      // Clean up after 10 seconds
      setTimeout(() => {
        socket.disconnect();
        console.log('\n🏁 Test completed');
        process.exit(0);
      }, 10000);

    } else {
      console.log('❌ No menu items found to test with');
    }
  } catch (error) {
    console.log('❌ Failed to fetch menu items:', error.message);
  }
}

// Run the test
testMenuUpdates();
