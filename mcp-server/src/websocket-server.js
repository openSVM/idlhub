#!/usr/bin/env node

/**
 * IDLHub MCP WebSocket Server
 * Provides WebSocket transport for the MCP server
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { WebSocketServerTransport } = require('@modelcontextprotocol/sdk/server/websocket.js');
const { IDLHubMCPServer } = require('./index.js');
const WebSocket = require('ws');
const path = require('path');

async function main() {
  const port = process.env.MCP_PORT || 8080;
  const registryPath = process.env.IDL_REGISTRY_PATH || path.join(__dirname, '..', '..');
  
  const wss = new WebSocket.Server({ port });
  
  console.error(`[IDLHub MCP] WebSocket server listening on port ${port}`);
  
  wss.on('connection', async (ws) => {
    console.error('[IDLHub MCP] New WebSocket connection');
    
    try {
      const mcpServer = new IDLHubMCPServer(registryPath);
      await mcpServer.initialize();
      
      const transport = new WebSocketServerTransport(ws);
      await mcpServer.server.connect(transport);
      
      console.error('[IDLHub MCP] Client connected via WebSocket');
    } catch (error) {
      console.error('[IDLHub MCP] Error handling connection:', error);
      ws.close();
    }
  });
  
  wss.on('error', (error) => {
    console.error('[IDLHub MCP] WebSocket server error:', error);
  });
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[IDLHub MCP] Fatal error:', error);
    process.exit(1);
  });
}
