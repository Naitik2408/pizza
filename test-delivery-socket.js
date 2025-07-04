#!/usr/bin/env node

/**
 * Test script to verify socket connection and events for delivery agent
 */

const { io } = require('socket.io-client');

// Replace with your actual API URL and delivery agent token
const API_URL = 'http://localhost:5000';
const DELIVERY_AGENT_TOKEN = 'your_delivery_agent_token_here';
const DELIVERY_AGENT_ID = 'your_delivery_agent_id_here';

console.log('🧪 Testing delivery agent socket connection...');

// Create socket connection
const socket = io(API_URL, {
  auth: { token: DELIVERY_AGENT_TOKEN },
  transports: ['websocket', 'polling'],
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
});

// Handle connection events
socket.on('connect', () => {
  console.log('✅ Socket connected:', socket.id);
  
  // Join delivery agent rooms
  socket.emit('join', { userId: DELIVERY_AGENT_ID, role: 'delivery' });
  console.log('👤 Joined delivery agent rooms');
});

socket.on('disconnect', () => {
  console.log('❌ Socket disconnected');
});

socket.on('connect_error', (error) => {
  console.error('❌ Socket connection error:', error);
});

// Listen for delivery-specific events
socket.on('new_order_assigned', (data) => {
  console.log('🍕 NEW ORDER ASSIGNED:', data);
});

socket.on('assigned_order_update', (data) => {
  console.log('🔄 ORDER UPDATE:', data);
});

socket.on('order_unassigned', (data) => {
  console.log('❌ ORDER UNASSIGNED:', data);
});

// Listen for all events (debugging)
socket.onAny((event, ...args) => {
  console.log(`🔔 Socket event: ${event}`, args);
});

// Keep the script running
process.on('SIGINT', () => {
  console.log('\n📴 Disconnecting socket...');
  socket.disconnect();
  process.exit(0);
});

console.log('🔄 Listening for socket events... (Press Ctrl+C to stop)');
