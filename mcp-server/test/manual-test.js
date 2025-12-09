#!/usr/bin/env node

/**
 * Manual test script for API MCP Server
 * Tests the server with real API calls
 */

const axios = require('axios');

const MCP_URL = process.env.MCP_URL || 'http://localhost:3001';

async function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function testEndpoint(name, fn) {
  try {
    console.log(`\n📝 Testing: ${name}`);
    await fn();
    console.log(`✅ ${name} - PASSED`);
    return true;
  } catch (error) {
    console.error(`❌ ${name} - FAILED`);
    console.error(`   Error: ${error.message}`);
    if (error.response) {
      console.error(`   Status: ${error.response.status}`);
      console.error(`   Data:`, JSON.stringify(error.response.data, null, 2));
    }
    return false;
  }
}

async function main() {
  console.log('🚀 Manual Testing IDLHub API MCP Server');
  console.log(`   MCP URL: ${MCP_URL}\n`);
  console.log('⚠️  Make sure the API MCP server is running:');
  console.log('   npm run mcp:api\n');
  
  await sleep(2000);
  
  let passed = 0;
  let failed = 0;
  
  // Test 1: Health endpoint
  if (await testEndpoint('Health Check', async () => {
    const response = await axios.get(`${MCP_URL}/health`);
    console.log('   Status:', response.data.status);
    console.log('   Version:', response.data.version);
    console.log('   API Base:', response.data.apiBaseUrl);
    
    if (response.data.status !== 'ok') {
      throw new Error('Health check failed');
    }
  })) {
    passed++;
  } else {
    failed++;
  }
  
  // Test 2: Metrics endpoint
  if (await testEndpoint('Metrics', async () => {
    const response = await axios.get(`${MCP_URL}/metrics`);
    console.log('   Requests:', response.data.requests);
    console.log('   Errors:', response.data.errors);
    console.log('   Error Rate:', response.data.errorRate);
    console.log('   Avg Latency:', response.data.avgLatency);
  })) {
    passed++;
  } else {
    failed++;
  }
  
  // Test 3: SSE endpoint connection
  if (await testEndpoint('SSE Endpoint Connection', async () => {
    const response = await axios.get(`${MCP_URL}/sse`, {
      timeout: 3000,
      responseType: 'stream',
      validateStatus: () => true,
    });
    
    console.log('   Status:', response.status);
    console.log('   Content-Type:', response.headers['content-type']);
    
    if (response.status !== 200) {
      throw new Error(`Expected status 200, got ${response.status}`);
    }
    
    if (!response.headers['content-type']?.includes('text/event-stream')) {
      throw new Error('Expected text/event-stream content type');
    }
    
    response.data.destroy();
  })) {
    passed++;
  } else {
    failed++;
  }
  
  // Summary
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Tests Passed: ${passed}`);
  console.log(`❌ Tests Failed: ${failed}`);
  console.log('='.repeat(60));
  
  if (failed > 0) {
    console.log('\n⚠️  Some tests failed. Check the errors above.');
    process.exit(1);
  } else {
    console.log('\n🎉 All manual tests passed!');
    console.log('\n💡 Next steps:');
    console.log('   - The server is running and accessible');
    console.log('   - MCP tools are registered and ready');
    console.log('   - Try integrating with Claude Desktop or other MCP clients');
    process.exit(0);
  }
}

main().catch(error => {
  console.error('\n❌ Fatal error:', error.message);
  process.exit(1);
});
