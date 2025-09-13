#!/usr/bin/env node

/**
 * WebSocket Security Test Suite
 * Tests critical security fixes for chat system authentication and authorization
 */

import WebSocket from 'ws';

const WS_URL = 'ws://localhost:5000/ws';
const API_BASE = 'http://localhost:5000/api';

// Test utilities
function createWebSocket() {
  return new WebSocket(WS_URL);
}

function sendMessage(ws, type, data) {
  return new Promise((resolve, reject) => {
    const message = JSON.stringify({ type, data });
    ws.send(message);
    
    // Wait for response
    const timeout = setTimeout(() => {
      reject(new Error('Response timeout'));
    }, 5000);
    
    ws.once('message', (response) => {
      clearTimeout(timeout);
      try {
        resolve(JSON.parse(response.toString()));
      } catch (error) {
        reject(error);
      }
    });
  });
}

async function delay(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Test 1: Non-existent user authentication should be rejected
async function testNonExistentUserAuth() {
  console.log('\n🔒 Testing non-existent user authentication...');
  
  const ws = createWebSocket();
  
  return new Promise((resolve, reject) => {
    ws.on('open', async () => {
      try {
        console.log('   Attempting to authenticate with non-existent user: fake-user-123');
        
        // Try to authenticate as non-existent user
        const response = await sendMessage(ws, 'auth', { userId: 'fake-user-123' });
        
        if (response.type === 'error') {
          console.log('   ✅ PASS: Authentication rejected for non-existent user');
          console.log(`   Response: ${response.data.message}`);
          resolve(true);
        } else {
          console.log('   ❌ FAIL: Authentication should have been rejected');
          resolve(false);
        }
      } catch (error) {
        console.log(`   ❌ FAIL: Error during test: ${error.message}`);
        resolve(false);
      }
    });
    
    ws.on('close', (code, reason) => {
      if (code === 4001) {
        console.log('   ✅ PASS: Connection closed with security code 4001');
        resolve(true);
      }
    });
    
    ws.on('error', (error) => {
      console.log(`   ❌ FAIL: WebSocket error: ${error.message}`);
      resolve(false);
    });
    
    // Test timeout
    setTimeout(() => {
      console.log('   ❌ FAIL: Test timeout');
      ws.close();
      resolve(false);
    }, 10000);
  });
}

// Test 2: Valid user authentication should succeed  
async function testValidUserAuth() {
  console.log('\n🔓 Testing valid user authentication...');
  
  try {
    // First create a test user via HTTP API
    const response = await fetch(`${API_BASE}/users`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: 'test-user-security',
        major: 'Computer Science'
      })
    });
    
    if (!response.ok) {
      console.log('   ❌ FAIL: Could not create test user');
      return false;
    }
    
    const user = await response.json();
    console.log(`   Created test user: ${user.id}`);
    
    // Now test WebSocket authentication
    const ws = createWebSocket();
    
    return new Promise((resolve) => {
      ws.on('open', async () => {
        try {
          console.log('   Attempting to authenticate with valid user...');
          
          const authResponse = await sendMessage(ws, 'auth', { userId: user.id });
          
          if (authResponse.type === 'user_online') {
            console.log('   ✅ PASS: Valid user authentication succeeded');
            console.log(`   User online status: ${authResponse.data.status}`);
            ws.close();
            resolve(true);
          } else {
            console.log('   ❌ FAIL: Expected user_online response');
            ws.close();
            resolve(false);
          }
        } catch (error) {
          console.log(`   ❌ FAIL: Error during authentication: ${error.message}`);
          ws.close();
          resolve(false);
        }
      });
      
      ws.on('error', (error) => {
        console.log(`   ❌ FAIL: WebSocket error: ${error.message}`);
        resolve(false);
      });
      
      // Test timeout
      setTimeout(() => {
        console.log('   ❌ FAIL: Test timeout');
        ws.close();
        resolve(false);
      }, 10000);
    });
    
  } catch (error) {
    console.log(`   ❌ FAIL: Test setup error: ${error.message}`);
    return false;
  }
}

// Test 3: Unauthorized message operations should be blocked
async function testUnauthorizedMessageOperations() {
  console.log('\n🚫 Testing unauthorized message operations...');
  
  const ws = createWebSocket();
  
  return new Promise((resolve) => {
    ws.on('open', async () => {
      try {
        console.log('   Attempting to send message without authentication...');
        
        // Try to send message without authenticating
        const response = await sendMessage(ws, 'message', {
          senderId: 'fake-user',
          chatId: 'fake-chat', 
          content: 'This should be blocked!'
        });
        
        if (response.type === 'error' && response.data.message.includes('not authenticated')) {
          console.log('   ✅ PASS: Unauthenticated message operation blocked');
          console.log(`   Response: ${response.data.message}`);
          ws.close();
          resolve(true);
        } else {
          console.log('   ❌ FAIL: Unauthenticated operation should have been blocked');
          ws.close();
          resolve(false);
        }
      } catch (error) {
        console.log(`   ❌ FAIL: Error during test: ${error.message}`);
        ws.close();
        resolve(false);
      }
    });
    
    ws.on('error', (error) => {
      console.log(`   ❌ FAIL: WebSocket error: ${error.message}`);
      resolve(false);
    });
    
    // Test timeout
    setTimeout(() => {
      console.log('   ❌ FAIL: Test timeout');
      ws.close();
      resolve(false);
    }, 10000);
  });
}

// Main test runner
async function runSecurityTests() {
  console.log('🔐 WebSocket Security Test Suite');
  console.log('================================');
  
  const results = [];
  
  try {
    // Test 1: Non-existent user authentication
    results.push(await testNonExistentUserAuth());
    
    await delay(1000);
    
    // Test 2: Valid user authentication
    results.push(await testValidUserAuth());
    
    await delay(1000);
    
    // Test 3: Unauthorized operations
    results.push(await testUnauthorizedMessageOperations());
    
  } catch (error) {
    console.log(`❌ Test suite error: ${error.message}`);
  }
  
  // Results summary
  console.log('\n📊 Test Results Summary');
  console.log('=======================');
  const passed = results.filter(Boolean).length;
  const total = results.length;
  
  console.log(`Passed: ${passed}/${total}`);
  
  if (passed === total) {
    console.log('🎉 All security tests PASSED! WebSocket security is working correctly.');
    process.exit(0);
  } else {
    console.log('⚠️  Some security tests FAILED! Please review the implementation.');
    process.exit(1);
  }
}

// WebSocket module check is handled by ES import

// Run tests
runSecurityTests().catch(error => {
  console.error('❌ Test suite crashed:', error);
  process.exit(1);
});