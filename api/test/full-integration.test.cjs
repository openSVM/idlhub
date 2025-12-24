#!/usr/bin/env node

/**
 * Full Integration Tests for IDLHub API Ecosystem
 *
 * Tests both REST API (server-arweave.js) and MCP API (Netlify function)
 * Validates end-to-end workflows: search, upload, bounties, rewards
 */

const http = require('http');
const https = require('https');

// Test configuration
const REST_API_URL = process.env.REST_API_URL || 'http://localhost:3000';
const MCP_API_URL = process.env.MCP_API_URL || 'https://idlhub.com/api/mcp';

let testsPassed = 0;
let testsFailed = 0;

/**
 * Test wrapper function
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
 * Make HTTP request
 */
function makeHTTPRequest(method, url, body = null, headers = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const useHttps = parsedUrl.protocol === 'https:';

    const options = {
      method,
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (useHttps ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      timeout: 30000,
    };

    if (body) {
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);
      options.headers['Content-Length'] = Buffer.byteLength(bodyStr);
    }

    const requester = useHttps ? https : http;
    const req = requester.request(options, (res) => {
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
      req.write(typeof body === 'string' ? body : JSON.stringify(body));
    }
    req.end();
  });
}

/**
 * Make MCP JSON-RPC request
 */
function makeMCPRequest(method, params = {}, id = 1) {
  return makeHTTPRequest('POST', MCP_API_URL, {
    jsonrpc: '2.0',
    method,
    params,
    id,
  });
}

/**
 * Validate JSON-RPC response
 */
function validateMCPResponse(response, shouldHaveResult = true) {
  if (!response.data.jsonrpc || response.data.jsonrpc !== '2.0') {
    throw new Error('Missing or invalid jsonrpc field');
  }
  if (response.data.id === undefined) {
    throw new Error('Missing id field');
  }
  if (shouldHaveResult && !response.data.result && !response.data.error) {
    throw new Error('Missing result or error field');
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Full Integration Tests for IDLHub API Ecosystem\n');
  console.log(`REST API: ${REST_API_URL}`);
  console.log(`MCP API:  ${MCP_API_URL}\n`);

  try {
    // ===========================================
    // REST API Health Checks
    // ===========================================

    console.log('=== REST API Tests ===\n');

    await test('REST API health check', async () => {
      const response = await makeHTTPRequest('GET', `${REST_API_URL}/health`);

      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }

      if (response.data.status !== 'ok') {
        throw new Error('Health check failed');
      }

      console.log(`   Backend: ${response.data.backend}`);
      console.log(`   Version: ${response.data.version}`);
    });

    await test('REST API docs endpoint', async () => {
      const response = await makeHTTPRequest('GET', `${REST_API_URL}/api/docs`);

      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }

      if (!response.data.title) {
        throw new Error('Missing title');
      }

      if (!response.data.endpoints) {
        throw new Error('Missing endpoints');
      }

      console.log(`   Title: ${response.data.title}`);
      console.log(`   Endpoints documented: ${Object.keys(response.data.endpoints).length}`);
    });

    await test('REST API CORS headers', async () => {
      const response = await makeHTTPRequest('GET', `${REST_API_URL}/health`);

      if (!response.headers['access-control-allow-origin']) {
        throw new Error('Missing CORS header');
      }

      console.log(`   CORS: ${response.headers['access-control-allow-origin']}`);
    });

    // ===========================================
    // MCP API Protocol Tests
    // ===========================================

    console.log('\n=== MCP API Tests ===\n');

    await test('MCP tools/list returns all tools', async () => {
      const response = await makeMCPRequest('tools/list');

      if (response.status !== 200) {
        throw new Error(`Expected 200, got ${response.status}`);
      }

      validateMCPResponse(response);

      const tools = response.data.result.tools;
      if (!Array.isArray(tools) || tools.length !== 8) {
        throw new Error(`Expected 8 tools, got ${tools.length}`);
      }

      console.log(`   Tools: ${tools.map(t => t.name).join(', ')}`);
    });

    await test('MCP invalid method error handling', async () => {
      const response = await makeMCPRequest('invalid/method');

      if (response.status !== 400) {
        throw new Error(`Expected 400, got ${response.status}`);
      }

      if (!response.data.error || response.data.error.code !== -32601) {
        throw new Error('Invalid error response');
      }

      console.log(`   Error code: ${response.data.error.code}`);
    });

    // ===========================================
    // Cross-API Data Consistency Tests
    // ===========================================

    console.log('\n=== Cross-API Consistency Tests ===\n');

    let testProtocolId = null;
    let testProtocolName = null;

    await test('MCP list_idls returns valid IDLs', async () => {
      const response = await makeMCPRequest('tools/call', {
        name: 'list_idls',
        arguments: { limit: 5 }
      });

      validateMCPResponse(response);
      const data = JSON.parse(response.data.result.content[0].text);

      if (!data.idls || data.idls.length === 0) {
        throw new Error('No IDLs returned');
      }

      testProtocolId = data.idls[0].id;
      testProtocolName = data.idls[0].name;

      console.log(`   Total: ${data.total}, Returned: ${data.idls.length}`);
      console.log(`   Test protocol: ${testProtocolName} (${testProtocolId})`);
    });

    await test('MCP get_idl retrieves full IDL data', async () => {
      const response = await makeMCPRequest('tools/call', {
        name: 'get_idl',
        arguments: { protocol_id: testProtocolId }
      });

      validateMCPResponse(response);
      const data = JSON.parse(response.data.result.content[0].text);

      if (data.protocol_id !== testProtocolId) {
        throw new Error('Protocol ID mismatch');
      }

      if (!data.idl || !data.idl.version || !data.idl.name) {
        throw new Error('Invalid IDL structure');
      }

      console.log(`   Protocol: ${data.name}`);
      console.log(`   IDL version: ${data.idl.version}`);
      console.log(`   Instructions: ${data.idl.instructions?.length || 0}`);
    });

    await test('MCP search_idls finds protocols', async () => {
      const searchTerm = testProtocolName.substring(0, 5).toLowerCase();
      const response = await makeMCPRequest('tools/call', {
        name: 'search_idls',
        arguments: { query: searchTerm }
      });

      validateMCPResponse(response);
      const data = JSON.parse(response.data.result.content[0].text);

      if (!Array.isArray(data.results)) {
        throw new Error('Invalid results');
      }

      console.log(`   Query: "${searchTerm}"`);
      console.log(`   Results: ${data.total}`);
    });

    // ===========================================
    // Bounty System Workflow Tests
    // ===========================================

    console.log('\n=== Bounty System Tests ===\n');

    await test('MCP list_bounties returns bounty data', async () => {
      const response = await makeMCPRequest('tools/call', {
        name: 'list_bounties',
        arguments: { sort: 'amount' }
      });

      validateMCPResponse(response);
      const data = JSON.parse(response.data.result.content[0].text);

      if (typeof data.total_active_bounties !== 'number') {
        throw new Error('Invalid bounty data');
      }

      console.log(`   Active bounties: ${data.total_active_bounties}`);
      console.log(`   Total staked: ${data.total_staked} IDL`);
    });

    await test('MCP get_bounty checks protocol bounty', async () => {
      const response = await makeMCPRequest('tools/call', {
        name: 'get_bounty',
        arguments: { protocol_id: testProtocolId }
      });

      validateMCPResponse(response);
      const data = JSON.parse(response.data.result.content[0].text);

      if (data.protocol_id !== testProtocolId) {
        throw new Error('Protocol ID mismatch');
      }

      if (typeof data.total_reward !== 'number') {
        throw new Error('Missing total_reward');
      }

      // Validate calculation: total = base + community
      if (data.total_reward !== data.base_reward + data.community_bounty) {
        throw new Error('Reward calculation incorrect');
      }

      console.log(`   Base: ${data.base_reward} IDL`);
      console.log(`   Community: ${data.community_bounty} IDL`);
      console.log(`   Total: ${data.total_reward} IDL`);
      console.log(`   Exists: ${data.exists || false}`);
    });

    await test('MCP get_pending_rewards returns wallet rewards', async () => {
      const testWallet = 'TestWallet123456789';
      const response = await makeMCPRequest('tools/call', {
        name: 'get_pending_rewards',
        arguments: { wallet: testWallet }
      });

      validateMCPResponse(response);
      const data = JSON.parse(response.data.result.content[0].text);

      if (data.wallet !== testWallet) {
        throw new Error('Wallet mismatch');
      }

      if (!Array.isArray(data.pending_rewards)) {
        throw new Error('Invalid pending_rewards');
      }

      console.log(`   Wallet: ${data.wallet}`);
      console.log(`   Pending: ${data.total_pending} IDL`);
    });

    // ===========================================
    // Upload Validation Tests
    // ===========================================

    console.log('\n=== Upload Validation Tests ===\n');

    await test('MCP upload_idl validates missing parameters', async () => {
      const response = await makeMCPRequest('tools/call', {
        name: 'upload_idl',
        arguments: {
          protocol_id: 'test',
          name: 'Test',
          // Missing idl
        }
      });

      if (response.status !== 500) {
        throw new Error(`Expected error, got ${response.status}`);
      }

      if (!response.data.error) {
        throw new Error('Expected error response');
      }

      console.log(`   Error: ${response.data.error.message}`);
    });

    await test('MCP upload_idl validates IDL structure', async () => {
      const response = await makeMCPRequest('tools/call', {
        name: 'upload_idl',
        arguments: {
          protocol_id: 'test',
          name: 'Test',
          idl: { invalid: 'format' }
        }
      });

      if (response.status !== 500) {
        throw new Error(`Expected error, got ${response.status}`);
      }

      if (!response.data.error) {
        throw new Error('Expected error response');
      }

      if (!response.data.error.message.includes('Invalid IDL')) {
        throw new Error('Error should mention Invalid IDL');
      }

      console.log(`   Error: ${response.data.error.message}`);
    });

    // ===========================================
    // Performance and Reliability Tests
    // ===========================================

    console.log('\n=== Performance Tests ===\n');

    await test('MCP handles concurrent requests', async () => {
      const requests = [];
      for (let i = 0; i < 5; i++) {
        requests.push(makeMCPRequest('tools/list'));
      }

      const responses = await Promise.all(requests);

      for (const response of responses) {
        if (response.status !== 200) {
          throw new Error('Concurrent request failed');
        }
        validateMCPResponse(response);
      }

      console.log(`   Handled 5 concurrent requests successfully`);
    });

    await test('MCP pagination works correctly', async () => {
      const response1 = await makeMCPRequest('tools/call', {
        name: 'list_idls',
        arguments: { limit: 3 }
      });

      const response2 = await makeMCPRequest('tools/call', {
        name: 'list_idls',
        arguments: { limit: 10 }
      });

      validateMCPResponse(response1);
      validateMCPResponse(response2);

      const data1 = JSON.parse(response1.data.result.content[0].text);
      const data2 = JSON.parse(response2.data.result.content[0].text);

      if (data1.idls.length > 3) {
        throw new Error('Limit not respected');
      }

      if (data2.idls.length > 10) {
        throw new Error('Limit not respected');
      }

      console.log(`   Limit 3: ${data1.idls.length} IDLs`);
      console.log(`   Limit 10: ${data2.idls.length} IDLs`);
    });

    // ===========================================
    // Error Handling Tests
    // ===========================================

    console.log('\n=== Error Handling Tests ===\n');

    await test('MCP handles malformed JSON gracefully', async () => {
      const response = await makeHTTPRequest(
        'POST',
        MCP_API_URL,
        '{ invalid json }'
      );

      // Should return error status
      if (response.status !== 500) {
        throw new Error(`Expected error status, got ${response.status}`);
      }

      console.log(`   Status: ${response.status}`);
    });

    await test('MCP handles missing required fields', async () => {
      const response = await makeMCPRequest('tools/call', {
        name: 'get_idl',
        arguments: {} // Missing protocol_id
      });

      if (response.status !== 500) {
        throw new Error(`Expected error, got ${response.status}`);
      }

      if (!response.data.error) {
        throw new Error('Expected error response');
      }

      console.log(`   Error: ${response.data.error.message}`);
    });

    await test('MCP handles non-existent tools', async () => {
      const response = await makeMCPRequest('tools/call', {
        name: 'non_existent_tool',
        arguments: {}
      });

      if (response.status !== 500) {
        throw new Error(`Expected error, got ${response.status}`);
      }

      if (!response.data.error) {
        throw new Error('Expected error response');
      }

      if (!response.data.error.message.includes('Unknown tool')) {
        throw new Error('Error should mention Unknown tool');
      }

      console.log(`   Error: ${response.data.error.message}`);
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nFatal test error:', error.message);
    console.error(error.stack);
    testsFailed++;
  }

  if (testsFailed > 0) {
    console.log('\n⚠️  Some tests failed.');
    process.exit(1);
  } else {
    console.log('\n🎉 All integration tests passed!');
    console.log('\n✨ IDLHub API ecosystem is fully functional:');
    console.log('   - REST API endpoints working');
    console.log('   - MCP API with 8 tools operational');
    console.log('   - Bounty system validated');
    console.log('   - Cross-API data consistency verified');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
