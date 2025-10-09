#!/usr/bin/env node

/**
 * Basic Tests for IDLHub MCP Server
 * 
 * Simple test suite to validate core MCP server functionality
 */

const { spawn } = require('child_process');
const path = require('path');

let testsPassed = 0;
let testsFailed = 0;

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

function sendRequestAndGetResponse(request, timeout = 5000) {
  return new Promise((resolve, reject) => {
    const serverPath = path.join(__dirname, '..', 'src', 'index.js');
    const server = spawn('node', [serverPath]);
    
    let responseReceived = false;
    let responseBuffer = '';
    
    const timer = setTimeout(() => {
      if (!responseReceived) {
        server.kill();
        reject(new Error('Request timeout'));
      }
    }, timeout);
    
    server.stdout.on('data', (data) => {
      responseBuffer += data.toString();
      
      // Try to parse JSON response
      const lines = responseBuffer.split('\n');
      for (const line of lines) {
        if (line.trim() && line.includes('"jsonrpc"')) {
          try {
            const response = JSON.parse(line);
            clearTimeout(timer);
            responseReceived = true;
            server.kill();
            resolve(response);
            return;
          } catch (e) {
            // Continue
          }
        }
      }
    });
    
    server.stderr.on('data', () => {
      // Ignore server logs
    });
    
    server.on('error', (err) => {
      clearTimeout(timer);
      server.kill();
      reject(err);
    });
    
    // Send request
    setTimeout(() => {
      server.stdin.write(JSON.stringify(request) + '\n');
    }, 1000);
  });
}

async function runTests() {
  console.log('🧪 Running IDLHub MCP Server Tests\n');
  
  // Test 1: List tools
  await test('Server responds to tools/list', async () => {
    const response = await sendRequestAndGetResponse({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });
    
    if (!response.result || !response.result.tools) {
      throw new Error('Invalid response structure');
    }
    
    if (response.result.tools.length !== 5) {
      throw new Error(`Expected 5 tools, got ${response.result.tools.length}`);
    }
  });
  
  // Test 2: List schemas
  await test('list_schemas tool works', async () => {
    const response = await sendRequestAndGetResponse({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_schemas',
        arguments: { status: 'available' },
      },
    });
    
    if (!response.result || !response.result.content) {
      throw new Error('Invalid response structure');
    }
    
    const content = JSON.parse(response.result.content[0].text);
    if (!content.protocols || !Array.isArray(content.protocols)) {
      throw new Error('Expected protocols array');
    }
  });
  
  // Test 3: Get schema
  await test('get_schema tool works', async () => {
    const response = await sendRequestAndGetResponse({
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_schema',
        arguments: { protocol_id: 'jupiter' },
      },
    });
    
    if (!response.result || !response.result.content) {
      throw new Error('Invalid response structure');
    }
    
    const idl = JSON.parse(response.result.content[0].text);
    if (!idl.name || !idl.version) {
      throw new Error('Invalid IDL structure');
    }
  });
  
  // Test 4: Lookup symbol
  await test('lookup_symbol tool works', async () => {
    const response = await sendRequestAndGetResponse({
      jsonrpc: '2.0',
      id: 4,
      method: 'tools/call',
      params: {
        name: 'lookup_symbol',
        arguments: {
          protocol_id: 'jupiter',
          symbol_name: 'route',
          symbol_type: 'instruction',
        },
      },
    });
    
    if (!response.result || !response.result.content) {
      throw new Error('Invalid response structure');
    }
    
    const results = JSON.parse(response.result.content[0].text);
    if (!Array.isArray(results) || results.length === 0) {
      throw new Error('Expected symbol results');
    }
  });
  
  // Test 5: Generate code
  await test('generate_code tool works', async () => {
    const response = await sendRequestAndGetResponse({
      jsonrpc: '2.0',
      id: 5,
      method: 'tools/call',
      params: {
        name: 'generate_code',
        arguments: {
          protocol_id: 'jupiter',
          target: 'typescript',
        },
      },
    });
    
    if (!response.result || !response.result.content) {
      throw new Error('Invalid response structure');
    }
    
    const code = response.result.content[0].text;
    if (!code.includes('// Generated TypeScript')) {
      throw new Error('Generated code missing expected content');
    }
  });
  
  // Test 6: Validate IDL
  await test('validate_idl tool works', async () => {
    const response = await sendRequestAndGetResponse({
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'validate_idl',
        arguments: { protocol_id: 'jupiter' },
      },
    });
    
    if (!response.result || !response.result.content) {
      throw new Error('Invalid response structure');
    }
    
    const diagnostics = JSON.parse(response.result.content[0].text);
    if (typeof diagnostics.valid !== 'boolean') {
      throw new Error('Invalid diagnostics structure');
    }
  });
  
  // Test 7: List resources
  await test('resources/list works', async () => {
    const response = await sendRequestAndGetResponse({
      jsonrpc: '2.0',
      id: 7,
      method: 'resources/list',
      params: {},
    });
    
    if (!response.result || !response.result.resources) {
      throw new Error('Invalid response structure');
    }
    
    if (!Array.isArray(response.result.resources)) {
      throw new Error('Expected resources array');
    }
  });
  
  // Test 8: Read resource
  await test('resources/read works', async () => {
    const response = await sendRequestAndGetResponse({
      jsonrpc: '2.0',
      id: 8,
      method: 'resources/read',
      params: { uri: 'idl://jupiter' },
    });
    
    if (!response.result || !response.result.contents) {
      throw new Error('Invalid response structure');
    }
    
    const content = response.result.contents[0];
    if (!content.text || !content.uri) {
      throw new Error('Invalid resource content');
    }
  });
  
  // Test 9: Error handling
  await test('Server handles invalid protocol gracefully', async () => {
    const response = await sendRequestAndGetResponse({
      jsonrpc: '2.0',
      id: 9,
      method: 'tools/call',
      params: {
        name: 'get_schema',
        arguments: { protocol_id: 'nonexistent_protocol_12345' },
      },
    });
    
    if (!response.result || !response.result.isError) {
      throw new Error('Expected error response');
    }
  });
  
  // Print summary
  console.log('\n' + '='.repeat(50));
  console.log(`Tests passed: ${testsPassed}`);
  console.log(`Tests failed: ${testsFailed}`);
  console.log('='.repeat(50));
  
  process.exit(testsFailed > 0 ? 1 : 0);
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
