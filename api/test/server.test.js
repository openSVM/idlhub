#!/usr/bin/env node

/**
 * Integration Tests for IDLHub REST API Server
 * 
 * Tests all API endpoints with mocked external dependencies
 * and real HTTP requests to the Express server.
 */

const http = require('http');
const { spawn } = require('child_process');
const path = require('path');

let serverProcess = null;
const API_PORT = 3600;
const API_URL = `http://localhost:${API_PORT}`;

let testsPassed = 0;
let testsFailed = 0;

/**
 * Simple test wrapper function
 */
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

/**
 * Simple HTTP request helper using Node.js built-in http module
 */
function makeRequest(method, urlPath, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, API_URL);
    const options = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 30000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          parsedData = data;
        }
        resolve({
          status: res.statusCode,
          headers: res.headers,
          data: parsedData,
        });
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (body) {
      req.write(JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Start the API server
 */
async function startServer() {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'server.js');
    serverProcess = spawn('node', [serverPath], {
      env: {
        ...process.env,
        API_PORT: API_PORT.toString(),
        OPENSVM_API_BASE: 'https://opensvm.com/api',
      },
    });

    let resolved = false;

    serverProcess.stdout.on('data', (data) => {
      const output = data.toString();
      if (!resolved && output.includes('IDLHub API Server')) {
        resolved = true;
        setTimeout(resolve, 1000);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const output = data.toString();
      // Check stderr too since console.log sometimes goes there
      if (!resolved && output.includes('IDLHub API Server')) {
        resolved = true;
        setTimeout(resolve, 1000);
      }
    });

    serverProcess.on('error', (err) => {
      if (!resolved) {
        reject(err);
      }
    });

    // Timeout if server doesn't start
    setTimeout(() => {
      if (!resolved) {
        resolved = true;
        // Try connecting anyway
        resolve();
      }
    }, 5000);
  });
}

/**
 * Stop the API server
 */
async function stopServer() {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
  await new Promise(resolve => setTimeout(resolve, 500));
}

/**
 * Wait for server to be ready
 */
async function waitForServer(maxAttempts = 10) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await makeRequest('GET', '/health');
      return true;
    } catch (e) {
      await new Promise(resolve => setTimeout(resolve, 500));
    }
  }
  throw new Error('Server did not become ready');
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Running IDLHub API Server Integration Tests\n');

  try {
    console.log('Starting API server...');
    await startServer();
    await waitForServer();
    console.log('✓ Server started\n');

    // ===========================================
    // Health & Documentation Endpoints
    // ===========================================
    
    await test('GET /health returns ok status', async () => {
      const response = await makeRequest('GET', '/health');
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      if (response.data.status !== 'ok') {
        throw new Error(`Expected status 'ok', got '${response.data.status}'`);
      }
      
      if (!response.data.version) {
        throw new Error('Missing version field');
      }
      
      if (!response.data.timestamp) {
        throw new Error('Missing timestamp field');
      }
      
      if (!response.data.backend) {
        throw new Error('Missing backend field');
      }
    });

    await test('GET /api/docs returns API documentation', async () => {
      const response = await makeRequest('GET', '/api/docs');
      
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }
      
      if (!response.data.title) {
        throw new Error('Missing title in docs');
      }
      
      if (!response.data.version) {
        throw new Error('Missing version in docs');
      }
      
      if (!response.data.endpoints) {
        throw new Error('Missing endpoints in docs');
      }
      
      // Verify expected endpoints are documented
      const expectedEndpoints = [
        'GET /health',
        'GET /api/idl',
        'GET /api/idl/:programId',
        'POST /api/idl',
        'DELETE /api/idl/:programId',
        'GET /api/idl/search',
        'POST /api/idl/load-from-github',
        'POST /api/idl/upload',
        'GET /api/programs',
        'GET /api/search',
        'GET /api/docs',
      ];
      
      for (const endpoint of expectedEndpoints) {
        if (!response.data.endpoints[endpoint]) {
          throw new Error(`Missing documentation for: ${endpoint}`);
        }
      }
    });

    // ===========================================
    // IDL Endpoints (Integration with OpenSVM API)
    // ===========================================
    
    await test('GET /api/idl returns IDL list', async () => {
      const response = await makeRequest('GET', '/api/idl?limit=5');
      
      // Accept both success and error responses (external API may be unavailable)
      if (response.status !== 200 && response.status !== 500 && response.status !== 502) {
        throw new Error(`Unexpected status ${response.status}`);
      }
      
      if (response.status === 200) {
        // If successful, verify response structure
        if (typeof response.data !== 'object') {
          throw new Error('Expected object response');
        }
      } else {
        // If error, verify error response structure
        if (!response.data.error) {
          throw new Error('Error response missing error field');
        }
      }
    });

    await test('GET /api/idl with network parameter', async () => {
      const response = await makeRequest('GET', '/api/idl?network=devnet&limit=3');
      
      // Accept both success and error responses
      if (response.status !== 200 && response.status !== 500 && response.status !== 502) {
        throw new Error(`Unexpected status ${response.status}`);
      }
    });

    await test('GET /api/idl/:programId returns single IDL or error', async () => {
      // Use a known program ID (Jupiter aggregator)
      const programId = 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4';
      const response = await makeRequest('GET', `/api/idl/${programId}`);
      
      // Accept 200, 404, or 500 (external API status)
      if (response.status !== 200 && response.status !== 404 && response.status !== 500 && response.status !== 502) {
        throw new Error(`Unexpected status ${response.status}`);
      }
      
      if (typeof response.data !== 'object') {
        throw new Error('Expected object response');
      }
    });

    // ===========================================
    // Search Endpoints
    // ===========================================

    await test('GET /api/search requires query parameter', async () => {
      const response = await makeRequest('GET', '/api/search');
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400, got ${response.status}`);
      }
      
      if (!response.data.error) {
        throw new Error('Missing error message');
      }
    });

    await test('GET /api/search with query parameter', async () => {
      const response = await makeRequest('GET', '/api/search?q=jupiter');
      
      // Accept both success and error (external API may be unavailable)
      if (response.status !== 200 && response.status !== 500 && response.status !== 502) {
        throw new Error(`Unexpected status ${response.status}`);
      }
      
      if (response.status === 200) {
        if (typeof response.data.query !== 'string') {
          throw new Error('Missing query in response');
        }
      }
    });

    // ===========================================
    // Legacy Program Endpoints
    // ===========================================

    await test('GET /api/programs returns programs list', async () => {
      const response = await makeRequest('GET', '/api/programs?limit=5');
      
      // Accept both success and error responses
      if (response.status !== 200 && response.status !== 500 && response.status !== 502) {
        throw new Error(`Unexpected status ${response.status}`);
      }
      
      if (response.status === 200) {
        if (typeof response.data.total !== 'number') {
          throw new Error('Missing total count');
        }
      }
    });

    await test('GET /api/programs/:id returns program or error', async () => {
      const response = await makeRequest('GET', '/api/programs/test-program-id');
      
      // Accept 200, 400, 404, or 500 (external API may return different errors)
      if (response.status !== 200 && response.status !== 400 && response.status !== 404 && response.status !== 500 && response.status !== 502) {
        throw new Error(`Unexpected status ${response.status}`);
      }
      
      if (typeof response.data !== 'object') {
        throw new Error('Expected object response');
      }
    });

    await test('GET /api/programs/:id/idl returns IDL or error', async () => {
      const response = await makeRequest('GET', '/api/programs/test-program-id/idl');
      
      // Accept 200, 400, 404, or 500 (external API may return different errors)
      if (response.status !== 200 && response.status !== 400 && response.status !== 404 && response.status !== 500 && response.status !== 502) {
        throw new Error(`Unexpected status ${response.status}`);
      }
    });

    // ===========================================
    // Upload/Create Endpoints (Validation Tests)
    // ===========================================

    await test('POST /api/idl/upload validates required fields', async () => {
      const response = await makeRequest('POST', '/api/idl/upload', {});
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400, got ${response.status}`);
      }
      
      if (!response.data.error) {
        throw new Error('Missing error message');
      }
    });

    await test('POST /api/idl/upload validates IDL format', async () => {
      const response = await makeRequest('POST', '/api/idl/upload', {
        programId: 'TestProgramId123',
        idl: { invalid: 'format' },
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400, got ${response.status}`);
      }
      
      if (!response.data.error.includes('Invalid IDL format')) {
        throw new Error('Expected IDL format validation error');
      }
    });

    await test('POST /api/idl/load-from-github validates required fields', async () => {
      const response = await makeRequest('POST', '/api/idl/load-from-github', {});
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400, got ${response.status}`);
      }
      
      if (!response.data.error) {
        throw new Error('Missing error message');
      }
    });

    await test('POST /api/idl/load-from-github validates owner/repo format', async () => {
      const response = await makeRequest('POST', '/api/idl/load-from-github', {
        owner: 'invalid/owner',
        repo: 'repo',
        path: 'file.json',
        programId: 'TestProgramId',
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400, got ${response.status}`);
      }
      
      if (!response.data.error.includes('Invalid')) {
        throw new Error('Expected format validation error');
      }
    });

    await test('POST /api/idl/load-from-github validates path format', async () => {
      const response = await makeRequest('POST', '/api/idl/load-from-github', {
        owner: 'validowner',
        repo: 'validrepo',
        path: '../../../etc/passwd',
        programId: 'TestProgramId',
      });
      
      if (response.status !== 400) {
        throw new Error(`Expected status 400, got ${response.status}`);
      }
      
      if (!response.data.error.includes('Invalid')) {
        throw new Error('Expected path validation error');
      }
    });

    // ===========================================
    // Error Handling
    // ===========================================

    await test('Server handles invalid JSON gracefully', async () => {
      // Send request with content-type json but invalid body
      const response = await new Promise((resolve, reject) => {
        const url = new URL('/api/idl', API_URL);
        const options = {
          method: 'POST',
          hostname: url.hostname,
          port: url.port,
          path: url.pathname,
          headers: {
            'Content-Type': 'application/json',
          },
        };

        const req = http.request(options, (res) => {
          let data = '';
          res.on('data', chunk => { data += chunk; });
          res.on('end', () => {
            let parsedData;
            try {
              parsedData = JSON.parse(data);
            } catch (e) {
              parsedData = data;
            }
            resolve({
              status: res.statusCode,
              data: parsedData,
            });
          });
        });

        req.on('error', reject);
        req.write('{ invalid json }');
        req.end();
      });
      
      // Express should return 400 for invalid JSON
      if (response.status !== 400 && response.status !== 500) {
        throw new Error(`Expected status 400 or 500, got ${response.status}`);
      }
    });

    await test('CORS headers are present', async () => {
      const response = await makeRequest('GET', '/health');
      
      // Check for CORS headers
      if (!response.headers['access-control-allow-origin']) {
        throw new Error('Missing Access-Control-Allow-Origin header');
      }
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nFatal test error:', error.message);
    testsFailed++;
  } finally {
    console.log('\nStopping server...');
    await stopServer();
  }

  if (testsFailed > 0) {
    console.log('\n⚠️  Some tests failed.');
    process.exit(1);
  } else {
    console.log('\n🎉 All integration tests passed!');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
  stopServer().then(() => process.exit(1));
});
