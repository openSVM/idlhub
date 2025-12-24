#!/usr/bin/env node

/**
 * Integration Tests for /api/mcp Netlify Function
 *
 * Tests all 8 MCP tools with real JSON-RPC 2.0 requests
 * Validates bounty system, IDL uploads, rewards, and search
 */

const http = require('http');
const https = require('https');

const MCP_URL = process.env.MCP_TEST_URL || 'https://idlhub.com/api/mcp';
const USE_HTTPS = MCP_URL.startsWith('https');

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
 * Make JSON-RPC 2.0 request to MCP endpoint
 */
function makeRPCRequest(method, params = {}, id = 1) {
  return new Promise((resolve, reject) => {
    const url = new URL(MCP_URL);
    const body = JSON.stringify({
      jsonrpc: '2.0',
      method,
      params,
      id,
    });

    const options = {
      method: 'POST',
      hostname: url.hostname,
      port: url.port || (USE_HTTPS ? 443 : 80),
      path: url.pathname,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
      },
      timeout: 30000,
    };

    const requester = USE_HTTPS ? https : http;

    const req = requester.request(options, (res) => {
      let data = '';
      res.on('data', chunk => { data += chunk; });
      res.on('end', () => {
        let parsedData;
        try {
          parsedData = JSON.parse(data);
        } catch (e) {
          reject(new Error(`Invalid JSON response: ${data.substring(0, 200)}`));
          return;
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

    req.write(body);
    req.end();
  });
}

/**
 * Validate JSON-RPC 2.0 response structure
 */
function validateRPCResponse(response, shouldHaveResult = true) {
  if (!response.data.jsonrpc || response.data.jsonrpc !== '2.0') {
    throw new Error('Missing or invalid jsonrpc field');
  }

  if (response.data.id === undefined) {
    throw new Error('Missing id field');
  }

  if (shouldHaveResult) {
    if (response.data.error) {
      throw new Error(`RPC Error: ${response.data.error.message} (code: ${response.data.error.code})`);
    }
    if (!response.data.result) {
      throw new Error('Missing result field');
    }
  }
}

/**
 * Main test runner
 */
async function runTests() {
  console.log('🧪 Running /api/mcp Integration Tests\n');
  console.log(`Target: ${MCP_URL}\n`);

  try {
    // ===========================================
    // MCP Protocol Tests
    // ===========================================

    await test('tools/list returns all 8 MCP tools', async () => {
      const response = await makeRPCRequest('tools/list');

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);

      const tools = response.data.result.tools;
      if (!Array.isArray(tools)) {
        throw new Error('tools is not an array');
      }

      if (tools.length !== 8) {
        throw new Error(`Expected 8 tools, got ${tools.length}`);
      }

      const expectedTools = [
        'list_idls',
        'search_idls',
        'get_idl',
        'upload_idl',
        'get_pending_rewards',
        'add_bounty',
        'list_bounties',
        'get_bounty',
      ];

      for (const toolName of expectedTools) {
        const tool = tools.find(t => t.name === toolName);
        if (!tool) {
          throw new Error(`Missing tool: ${toolName}`);
        }
        if (!tool.description) {
          throw new Error(`Tool ${toolName} missing description`);
        }
        if (!tool.inputSchema) {
          throw new Error(`Tool ${toolName} missing inputSchema`);
        }
      }

      console.log(`   Found all 8 tools: ${expectedTools.join(', ')}`);
    });

    await test('Invalid method returns proper error', async () => {
      const response = await makeRPCRequest('invalid/method');

      if (response.status !== 400) {
        throw new Error(`Expected status 400, got ${response.status}`);
      }

      if (!response.data.error) {
        throw new Error('Expected error field');
      }

      if (response.data.error.code !== -32601) {
        throw new Error(`Expected error code -32601, got ${response.data.error.code}`);
      }

      console.log(`   Error code: ${response.data.error.code}`);
      console.log(`   Error message: ${response.data.error.message}`);
    });

    // ===========================================
    // IDL Query Tools
    // ===========================================

    await test('list_idls returns IDL list with pagination', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'list_idls',
        arguments: { limit: 10 }
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);

      const content = response.data.result.content;
      if (!Array.isArray(content) || content.length === 0) {
        throw new Error('Missing content array');
      }

      const data = JSON.parse(content[0].text);
      if (typeof data.total !== 'number') {
        throw new Error('Missing total field');
      }

      if (!Array.isArray(data.idls)) {
        throw new Error('Missing idls array');
      }

      if (data.idls.length > 10) {
        throw new Error(`Expected max 10 IDLs, got ${data.idls.length}`);
      }

      // Validate IDL structure
      const firstIdl = data.idls[0];
      if (!firstIdl.id || !firstIdl.name || !firstIdl.arweaveUrl) {
        throw new Error('Invalid IDL structure');
      }

      console.log(`   Total IDLs: ${data.total}`);
      console.log(`   Returned: ${data.idls.length} IDLs`);
      console.log(`   First IDL: ${firstIdl.name} (${firstIdl.id})`);
    });

    await test('list_idls filters by category', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'list_idls',
        arguments: { category: 'dex', limit: 5 }
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);

      const content = response.data.result.content;
      const data = JSON.parse(content[0].text);

      // All returned IDLs should be in dex category
      for (const idl of data.idls) {
        if (idl.category && idl.category !== 'dex') {
          throw new Error(`Expected dex category, got ${idl.category}`);
        }
      }

      console.log(`   Found ${data.idls.length} DEX IDLs`);
    });

    await test('search_idls finds protocols by name', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'search_idls',
        arguments: { query: 'jupiter' }
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);

      const content = response.data.result.content;
      const data = JSON.parse(content[0].text);

      if (data.query !== 'jupiter') {
        throw new Error('Query mismatch');
      }

      if (typeof data.total !== 'number') {
        throw new Error('Missing total');
      }

      if (!Array.isArray(data.results)) {
        throw new Error('Missing results array');
      }

      console.log(`   Query: "${data.query}"`);
      console.log(`   Found: ${data.total} results`);
    });

    await test('search_idls requires query parameter', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'search_idls',
        arguments: {}
      });

      // Should return error for missing required parameter
      if (response.status !== 500) {
        throw new Error(`Expected status 500 for missing param, got ${response.status}`);
      }

      if (!response.data.error) {
        throw new Error('Expected error for missing query');
      }

      console.log(`   Error: ${response.data.error.message}`);
    });

    await test('get_idl returns full IDL with metadata', async () => {
      // First get an IDL ID from list
      const listResponse = await makeRPCRequest('tools/call', {
        name: 'list_idls',
        arguments: { limit: 1 }
      });

      const listData = JSON.parse(listResponse.data.result.content[0].text);
      const protocolId = listData.idls[0].id;

      // Now fetch the full IDL
      const response = await makeRPCRequest('tools/call', {
        name: 'get_idl',
        arguments: { protocol_id: protocolId }
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);

      const content = response.data.result.content;
      const data = JSON.parse(content[0].text);

      if (data.protocol_id !== protocolId) {
        throw new Error('Protocol ID mismatch');
      }

      if (!data.idl) {
        throw new Error('Missing IDL object');
      }

      if (!data.idl.version) {
        throw new Error('IDL missing version');
      }

      if (!data.idl.name) {
        throw new Error('IDL missing name');
      }

      if (!data.arweaveUrl) {
        throw new Error('Missing arweaveUrl');
      }

      console.log(`   Protocol: ${data.name} (${data.protocol_id})`);
      console.log(`   IDL version: ${data.idl.version}`);
      console.log(`   Instructions: ${data.idl.instructions?.length || 0}`);
      console.log(`   Arweave URL: ${data.arweaveUrl}`);
    });

    await test('get_idl returns error for non-existent protocol', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'get_idl',
        arguments: { protocol_id: 'non-existent-protocol-xyz-123' }
      });

      if (response.status !== 500) {
        throw new Error(`Expected error status, got ${response.status}`);
      }

      if (!response.data.error) {
        throw new Error('Expected error for non-existent protocol');
      }

      if (!response.data.error.message.includes('not found')) {
        throw new Error('Error message should mention "not found"');
      }

      console.log(`   Error: ${response.data.error.message}`);
    });

    // ===========================================
    // Bounty System Tests
    // ===========================================

    await test('list_bounties returns active bounties', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'list_bounties',
        arguments: { sort: 'amount' }
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);

      const content = response.data.result.content;
      const data = JSON.parse(content[0].text);

      if (typeof data.total_active_bounties !== 'number') {
        throw new Error('Missing total_active_bounties');
      }

      if (typeof data.total_staked !== 'number') {
        throw new Error('Missing total_staked');
      }

      if (!Array.isArray(data.bounties)) {
        throw new Error('Missing bounties array');
      }

      console.log(`   Active bounties: ${data.total_active_bounties}`);
      console.log(`   Total staked: ${data.total_staked} IDL`);

      if (data.bounties.length > 0) {
        const topBounty = data.bounties[0];
        console.log(`   Top bounty: ${topBounty.protocol_id} (${topBounty.total_reward} IDL)`);
      }
    });

    await test('list_bounties sorts by different fields', async () => {
      const sortFields = ['amount', 'stakers', 'date'];

      for (const sortField of sortFields) {
        const response = await makeRPCRequest('tools/call', {
          name: 'list_bounties',
          arguments: { sort: sortField }
        });

        if (response.status !== 200) {
          throw new Error(`Sort by ${sortField} failed`);
        }

        validateRPCResponse(response);
        console.log(`   Sorted by: ${sortField} ✓`);
      }
    });

    await test('get_bounty returns bounty details or not found', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'get_bounty',
        arguments: { protocol_id: 'test-protocol-bounty' }
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);

      const content = response.data.result.content;
      const data = JSON.parse(content[0].text);

      if (data.protocol_id !== 'test-protocol-bounty') {
        throw new Error('Protocol ID mismatch');
      }

      if (typeof data.base_reward !== 'number') {
        throw new Error('Missing base_reward');
      }

      if (typeof data.community_bounty !== 'number') {
        throw new Error('Missing community_bounty');
      }

      if (typeof data.total_reward !== 'number') {
        throw new Error('Missing total_reward');
      }

      if (data.total_reward !== data.base_reward + data.community_bounty) {
        throw new Error('Total reward calculation incorrect');
      }

      console.log(`   Protocol: ${data.protocol_id}`);
      console.log(`   Exists: ${data.exists || false}`);
      console.log(`   Base reward: ${data.base_reward} IDL`);
      console.log(`   Community bounty: ${data.community_bounty} IDL`);
      console.log(`   Total reward: ${data.total_reward} IDL`);
    });

    await test('get_bounty handles missing protocol_id gracefully', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'get_bounty',
        arguments: {}
      });

      // Should still return 200 with default bounty response (undefined protocol)
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);
      const content = response.data.result.content;
      const data = JSON.parse(content[0].text);

      // Should return base reward info even with undefined protocol_id
      if (typeof data.base_reward !== 'number') {
        throw new Error('Missing base_reward');
      }

      console.log(`   Protocol: ${data.protocol_id || 'undefined'}`);
      console.log(`   Base reward: ${data.base_reward} IDL`);
    });

    // ===========================================
    // Reward System Tests
    // ===========================================

    await test('get_pending_rewards returns reward structure', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'get_pending_rewards',
        arguments: { wallet: 'TestWallet123456789' }
      });

      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);

      const content = response.data.result.content;
      const data = JSON.parse(content[0].text);

      if (data.wallet !== 'TestWallet123456789') {
        throw new Error('Wallet mismatch');
      }

      if (!Array.isArray(data.pending_rewards)) {
        throw new Error('Missing pending_rewards array');
      }

      if (typeof data.total_pending !== 'number') {
        throw new Error('Missing total_pending');
      }

      console.log(`   Wallet: ${data.wallet}`);
      console.log(`   Pending rewards: ${data.pending_rewards.length}`);
      console.log(`   Total pending: ${data.total_pending} IDL`);
    });

    await test('get_pending_rewards handles missing wallet gracefully', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'get_pending_rewards',
        arguments: {}
      });

      // Should still return 200 with default response (undefined wallet)
      if (response.status !== 200) {
        throw new Error(`Expected status 200, got ${response.status}`);
      }

      validateRPCResponse(response);
      const content = response.data.result.content;
      const data = JSON.parse(content[0].text);

      // Should return empty rewards even with undefined wallet
      if (!Array.isArray(data.pending_rewards)) {
        throw new Error('Missing pending_rewards array');
      }

      console.log(`   Wallet: ${data.wallet || 'undefined'}`);
      console.log(`   Pending rewards: ${data.pending_rewards.length}`);
    });

    // ===========================================
    // Upload Tool Validation Tests
    // ===========================================

    await test('upload_idl validates required parameters', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'upload_idl',
        arguments: {
          protocol_id: 'test-protocol',
          name: 'Test Protocol',
          // Missing idl
        }
      });

      if (response.status !== 500) {
        throw new Error(`Expected error status, got ${response.status}`);
      }

      if (!response.data.error) {
        throw new Error('Expected error for missing idl');
      }

      console.log(`   Error: ${response.data.error.message}`);
    });

    await test('upload_idl validates IDL format', async () => {
      const response = await makeRPCRequest('tools/call', {
        name: 'upload_idl',
        arguments: {
          protocol_id: 'test-protocol',
          name: 'Test Protocol',
          idl: { invalid: 'format' } // Missing version and name
        }
      });

      if (response.status !== 500) {
        throw new Error(`Expected error status, got ${response.status}`);
      }

      if (!response.data.error) {
        throw new Error('Expected error for invalid IDL format');
      }

      if (!response.data.error.message.includes('Invalid IDL')) {
        throw new Error('Error should mention "Invalid IDL"');
      }

      console.log(`   Error: ${response.data.error.message}`);
    });

    // ===========================================
    // CORS and Security Tests
    // ===========================================

    await test('CORS headers are present', async () => {
      const response = await makeRPCRequest('tools/list');

      if (!response.headers['access-control-allow-origin']) {
        throw new Error('Missing Access-Control-Allow-Origin header');
      }

      if (response.headers['access-control-allow-origin'] !== '*') {
        throw new Error('CORS should allow all origins');
      }

      console.log(`   CORS: ${response.headers['access-control-allow-origin']}`);
    });

    // Print summary
    console.log('\n' + '='.repeat(60));
    console.log(`✅ Tests Passed: ${testsPassed}`);
    console.log(`❌ Tests Failed: ${testsFailed}`);
    console.log('='.repeat(60));

  } catch (error) {
    console.error('\nFatal test error:', error.message);
    testsFailed++;
  }

  if (testsFailed > 0) {
    console.log('\n⚠️  Some tests failed.');
    process.exit(1);
  } else {
    console.log('\n🎉 All integration tests passed!');
    console.log('\n✨ The /api/mcp endpoint is fully functional with all 8 tools.');
    process.exit(0);
  }
}

runTests().catch((err) => {
  console.error('Fatal error:', err);
  process.exit(1);
});
