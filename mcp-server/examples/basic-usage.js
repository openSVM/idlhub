#!/usr/bin/env node

/**
 * Example: Using the IDLHub MCP Server
 * 
 * This script demonstrates how to interact with the MCP server
 * by sending JSON-RPC requests via stdio.
 */

const { spawn } = require('child_process');
const path = require('path');

// Start the MCP server
const serverPath = path.join(__dirname, '..', 'src', 'index.js');
const server = spawn('node', [serverPath]);

let responseBuffer = '';

server.stdout.on('data', (data) => {
  responseBuffer += data.toString();
  
  // Try to parse complete JSON-RPC responses
  const lines = responseBuffer.split('\n');
  responseBuffer = lines.pop() || ''; // Keep incomplete line in buffer
  
  lines.forEach(line => {
    if (line.trim()) {
      try {
        const response = JSON.parse(line);
        console.log('\n📥 Response:', JSON.stringify(response, null, 2));
      } catch (e) {
        // Not JSON, probably server logs
      }
    }
  });
});

server.stderr.on('data', (data) => {
  console.error('ℹ️', data.toString().trim());
});

// Wait for server to start
setTimeout(() => {
  console.log('\n🚀 Sending example requests to MCP server...\n');

  // Example 1: List all tools
  console.log('1️⃣ Listing available tools...');
  sendRequest(server, {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {},
  });

  // Example 2: List schemas filtered by category
  setTimeout(() => {
    console.log('\n2️⃣ Listing DEX protocols...');
    sendRequest(server, {
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'list_schemas',
        arguments: {
          category: 'dex',
          status: 'available',
        },
      },
    });
  }, 500);

  // Example 3: Get a specific schema
  setTimeout(() => {
    console.log('\n3️⃣ Getting Jupiter IDL schema...');
    sendRequest(server, {
      jsonrpc: '2.0',
      id: 3,
      method: 'tools/call',
      params: {
        name: 'get_schema',
        arguments: {
          protocol_id: 'jupiter',
        },
      },
    });
  }, 1000);

  // Example 4: Lookup a symbol
  setTimeout(() => {
    console.log('\n4️⃣ Looking up "route" instruction in Jupiter...');
    sendRequest(server, {
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
  }, 1500);

  // Example 5: Generate TypeScript code
  setTimeout(() => {
    console.log('\n5️⃣ Generating TypeScript code for Jupiter...');
    sendRequest(server, {
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
  }, 2000);

  // Example 6: Validate an IDL
  setTimeout(() => {
    console.log('\n6️⃣ Validating Jupiter IDL...');
    sendRequest(server, {
      jsonrpc: '2.0',
      id: 6,
      method: 'tools/call',
      params: {
        name: 'validate_idl',
        arguments: {
          protocol_id: 'jupiter',
        },
      },
    });
  }, 2500);

  // Example 7: List resources
  setTimeout(() => {
    console.log('\n7️⃣ Listing available resources...');
    sendRequest(server, {
      jsonrpc: '2.0',
      id: 7,
      method: 'resources/list',
      params: {},
    });
  }, 3000);

  // Example 8: Read a resource
  setTimeout(() => {
    console.log('\n8️⃣ Reading Jupiter resource...');
    sendRequest(server, {
      jsonrpc: '2.0',
      id: 8,
      method: 'resources/read',
      params: {
        uri: 'idl://jupiter',
      },
    });
  }, 3500);

  // Cleanup after all examples
  setTimeout(() => {
    console.log('\n✅ All examples completed!\n');
    server.kill();
    process.exit(0);
  }, 4500);
}, 2000);

function sendRequest(server, request) {
  server.stdin.write(JSON.stringify(request) + '\n');
}

// Handle cleanup
process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});
