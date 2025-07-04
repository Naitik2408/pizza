// Debug script to test socket connection
// Run this with: node debug-socket-test.js

const io = require('socket.io-client');

const API_URL = 'http://localhost:5000'; // Change this to your backend URL
const socket = io(API_URL, {
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
  
  // Join as a test user
  socket.emit('join', { userId: 'test-user', role: 'customer' });
});

socket.on('businessStatusChanged', (data) => {
  console.log('📢 Business status changed:', data);
});

socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('🔴 Connection error:', error);
});

console.log('🔍 Testing socket connection to:', API_URL);
console.log('Listening for businessStatusChanged events...');
console.log('Press Ctrl+C to exit');

// Keep the script running
process.on('SIGINT', () => {
  console.log('\n👋 Closing socket connection...');
  socket.disconnect();
  process.exit(0);
});
