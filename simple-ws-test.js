#!/usr/bin/env node

/**
 * Simple WebSocket Connection Test
 * Tests basic WebSocket connectivity to verify server is working
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:5000/ws';

console.log('🔌 Testing WebSocket Connection...');
console.log(`Connecting to: ${WS_URL}`);

const ws = new WebSocket(WS_URL);

ws.on('open', () => {
  console.log('✅ WebSocket connection established!');
  console.log('📤 Sending test auth message...');
  
  // Send a test auth message
  ws.send(JSON.stringify({
    type: 'auth',
    data: { userId: 'test-connection' }
  }));
});

ws.on('message', (data) => {
  console.log('📥 Received message:', data.toString());
  try {
    const message = JSON.parse(data.toString());
    console.log('📨 Parsed message:', message);
    
    if (message.type === 'error') {
      console.log('✅ GOOD: Server correctly rejected invalid user auth');
    }
  } catch (error) {
    console.log('⚠️  Could not parse message as JSON:', error.message);
  }
  
  ws.close();
});

ws.on('close', (code, reason) => {
  console.log(`🔌 Connection closed: ${code} - ${reason}`);
  if (code === 4001) {
    console.log('✅ GOOD: Server closed connection with security code (authentication failed)');
  }
  process.exit(0);
});

ws.on('error', (error) => {
  console.log('❌ WebSocket error:', error.message);
  console.log('🔍 Debugging info:');
  console.log('   - Check if server is running on port 5000');
  console.log('   - Check if WebSocket server is properly initialized');
  console.log('   - Check for any server-side errors');
  process.exit(1);
});

// Timeout after 10 seconds
setTimeout(() => {
  console.log('⏰ Connection timeout after 10 seconds');
  console.log('❌ Could not establish WebSocket connection');
  ws.close();
  process.exit(1);
}, 10000);