#!/usr/bin/env node

/**
 * Tests for IDLHub API MCP Server
 * 
 * Tests the MCP server that proxies to the IDLHub REST API
 */

const axios = require('axios');
const { spawn } = require('child_process');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;
let serverProcess = null;
let apiServerProcess = null;

const MCP_PORT = 3501;
const API_PORT = 3500;
const MCP_URL = `http://localhost:${MCP_PORT}`;
const API_URL = `http://localhost:${API_PORT}`;

function test(name, fn) {
  return fn()
    .then(() => {
      console.log(`✅ ${name}`);
      testsPassed++;
    })
    .catch(err => {
      console.error(`❌ ${name}`);
      console.error(`   Error: ${err.message}`);
      testsFailed++;
    });
}

async function startApiServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', '..', 'api', 'server.js');
    apiServerProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        API_PORT: API_PORT.toString(),
        OPENSVM_API_BASE: 'https://opensvm.com/api',
      },
    });

    let resolved = false;
    
    apiServerProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (!resolved && output.includes('IDLHub API Server')) {
        resolved = true;
        setTimeout(resolve, 2000);
      }
    });

    apiServerProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (!resolved && output.includes('IDLHub API Server')) {
        resolved = true;
        setTimeout(resolve, 2000);
      }
    });

    apiServerProcess.on('error', reject);

    setTimeout(() => {
      if (!resolved) {
        reject(new Error('API server startup timeout'));
      }
    }, 15000);
  });
}

async function startMcpServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'src', 'api-server.js');
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        MCP_PORT: MCP_PORT.toString(),
        IDLHUB_API_BASE: API_URL,
      },
    });

    let resolved = false;

    // Listen to both stdout and stderr for startup message
    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (!resolved && output.includes('IDLHub API MCP Server')) {
        resolved = true;
        setTimeout(resolve, 2000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      if (!resolved && output.includes('IDLHub API MCP Server')) {
        resolved = true;
        setTimeout(resolve, 2000);
      }
    });

    serverProcess.on('error', reject);

    setTimeout(() => {
      if (!resolved) {
        reject(new Error('MCP server startup timeout'));
      }
    }, 15000);
  });
}

async function stopServers() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  if (apiServerProcess) {
    apiServerProcess.kill();
    apiServerProcess = null;
  }
  // Wait a bit for cleanup
  await new Promise(resolve => setTimeout(resolve, 500));
}

async function runTests() {
  console.log('🧪 Testing IDLHub API MCP Server\n');
  
  try {
    console.log('Starting API server...');
    await startApiServer();
    console.log('✓ API server started');
    
    console.log('Starting MCP server...');
    await startMcpServer();
    console.log('✓ MCP server started\n');

    // Test 1: Health endpoint
    await test('Health endpoint returns status', async () => {
      const response = await axios.get(`${MCP_URL}/health`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      if (!response.data.status || response.data.status !== 'ok') {
        throw new Error('Health check failed');
      }
      
      if (!response.data.version || !response.data.apiBaseUrl) {
        throw new Error('Missing health check fields');
      }
    });

    // Test 2: Metrics endpoint
    await test('Metrics endpoint returns data', async () => {
      const response = await axios.get(`${MCP_URL}/metrics`);
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      if (typeof response.data.requests !== 'number') {
        throw new Error('Metrics missing requests count');
      }
    });

    // Test 3: SSE endpoint exists
    await test('SSE endpoint is accessible', async () => {
      try {
        const response = await axios.get(`${MCP_URL}/sse`, {
          timeout: 2000,
          responseType: 'stream',
        });
        
        if (response.status !== 200) {
          throw new Error(`Expected status 200, got ${response.status}`);
        }
        
        response.data.destroy();
      } catch (error) {
        if (error.code === 'ECONNABORTED') {
          // Timeout is ok, it means the SSE connection was established
          return;
        }
        throw error;
      }
    });

    // Note: Testing actual MCP tool calls via SSE is complex and requires
    // a proper MCP client. The basic functionality tests above verify
    // the server is running correctly.

    console.log('\n' + '='.repeat(50));
    console.log(`Tests passed: ${testsPassed}`);
    console.log(`Tests failed: ${testsFailed}`);
    console.log('='.repeat(50));

  } catch (error) {
    console.error('\nFatal test error:', error.message);
    testsFailed++;
  } finally {
    console.log('\nStopping servers...');
    await stopServers();
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
  stopServers().then(() => process.exit(1));
});
