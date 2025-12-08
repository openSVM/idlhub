#!/usr/bin/env node

/**
 * IDLHub API MCP Server
 * 
 * MCP server that acts as an orchestrator for the IDLHub REST API.
 * Implements JSON-RPC with SSE transport for routing API requests,
 * error handling, logging, monitoring, and health checks.
 * 
 * Features:
 * - Routes requests to IDLHub REST API endpoints
 * - Error handling with trace IDs
 * - Health endpoint
 * - Request/response logging and metrics
 * - Retry logic and fallbacks
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { SSEServerTransport } = require('@modelcontextprotocol/sdk/server/sse.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const express = require('express');
const axios = require('axios');
const crypto = require('crypto');

class IDLHubAPIMCPServer {
  constructor(apiBaseUrl) {
    this.apiBaseUrl = apiBaseUrl || process.env.IDLHUB_API_BASE || 'https://idlhub.com';
    this.metrics = {
      requests: 0,
      errors: 0,
      latencies: [],
    };
    
    this.server = new Server(
      {
        name: 'idlhub-api-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupHandlers();
  }

  generateTraceId() {
    return crypto.randomBytes(16).toString('hex');
  }

  async makeApiRequest(method, endpoint, data = null, params = null, traceId) {
    const startTime = Date.now();
    const url = `${this.apiBaseUrl}${endpoint}`;
    
    try {
      console.error(`[${traceId}] ${method} ${url}`);
      
      const config = {
        method,
        url,
        headers: {
          'X-Trace-Id': traceId,
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds
      };
      
      if (data) {
        config.data = data;
      }
      if (params) {
        config.params = params;
      }
      
      // Retry logic: 3 attempts with exponential backoff
      let lastError;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const response = await axios(config);
          const latency = Date.now() - startTime;
          
          this.metrics.requests++;
          this.metrics.latencies.push(latency);
          if (this.metrics.latencies.length > 1000) {
            this.metrics.latencies.shift();
          }
          
          console.error(`[${traceId}] Success in ${latency}ms (attempt ${attempt})`);
          
          return {
            success: true,
            data: response.data,
            status: response.status,
            latency,
          };
        } catch (error) {
          lastError = error;
          if (attempt < 3 && (!error.response || error.response.status >= 500)) {
            const backoff = Math.pow(2, attempt) * 1000;
            console.error(`[${traceId}] Attempt ${attempt} failed, retrying in ${backoff}ms...`);
            await new Promise(resolve => setTimeout(resolve, backoff));
          } else {
            break;
          }
        }
      }
      
      // All retries failed
      this.metrics.errors++;
      const latency = Date.now() - startTime;
      
      console.error(`[${traceId}] Failed after retries: ${lastError.message}`);
      
      return {
        success: false,
        error: lastError.response?.data?.error || lastError.message,
        code: lastError.response?.data?.code || 'API_ERROR',
        status: lastError.response?.status || 500,
        latency,
        traceId,
      };
      
    } catch (error) {
      this.metrics.errors++;
      const latency = Date.now() - startTime;
      
      console.error(`[${traceId}] Unexpected error: ${error.message}`);
      
      return {
        success: false,
        error: error.message,
        code: 'INTERNAL_ERROR',
        status: 500,
        latency,
        traceId,
      };
    }
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_idls',
          description: 'List all IDLs with optional filtering by network, limit, and offset',
          inputSchema: {
            type: 'object',
            properties: {
              network: {
                type: 'string',
                description: 'Network to filter by (mainnet/devnet/testnet)',
                enum: ['mainnet', 'devnet', 'testnet'],
                default: 'mainnet',
              },
              limit: {
                type: 'number',
                description: 'Number of results per page (1-100)',
                minimum: 1,
                maximum: 100,
                default: 50,
              },
              offset: {
                type: 'number',
                description: 'Pagination offset',
                minimum: 0,
                default: 0,
              },
            },
          },
        },
        {
          name: 'get_idl',
          description: 'Get a specific IDL by program ID',
          inputSchema: {
            type: 'object',
            properties: {
              programId: {
                type: 'string',
                description: 'Solana program ID',
              },
              network: {
                type: 'string',
                description: 'Network to query',
                enum: ['mainnet', 'devnet', 'testnet'],
                default: 'mainnet',
              },
              all: {
                type: 'boolean',
                description: 'Return IDLs from all networks',
                default: false,
              },
            },
            required: ['programId'],
          },
        },
        {
          name: 'search_idls',
          description: 'Search IDLs using semantic search',
          inputSchema: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Search query',
              },
              network: {
                type: 'string',
                description: 'Network filter',
                enum: ['mainnet', 'devnet', 'testnet'],
                default: 'mainnet',
              },
              limit: {
                type: 'number',
                description: 'Maximum results (1-50)',
                minimum: 1,
                maximum: 50,
                default: 10,
              },
            },
            required: ['query'],
          },
        },
        {
          name: 'upload_idl',
          description: 'Upload an IDL directly to the registry',
          inputSchema: {
            type: 'object',
            properties: {
              programId: {
                type: 'string',
                description: 'Solana program address',
              },
              network: {
                type: 'string',
                description: 'Network (mainnet/devnet/testnet)',
                enum: ['mainnet', 'devnet', 'testnet'],
              },
              name: {
                type: 'string',
                description: 'Program name (optional)',
              },
              idl: {
                type: 'object',
                description: 'Complete IDL JSON object',
              },
            },
            required: ['programId', 'network', 'idl'],
          },
        },
        {
          name: 'load_from_github',
          description: 'Load an IDL file from a GitHub repository',
          inputSchema: {
            type: 'object',
            properties: {
              owner: {
                type: 'string',
                description: 'GitHub repository owner',
              },
              repo: {
                type: 'string',
                description: 'GitHub repository name',
              },
              path: {
                type: 'string',
                description: 'Path to IDL file in repository',
              },
              programId: {
                type: 'string',
                description: 'Solana program address',
              },
              name: {
                type: 'string',
                description: 'Program name',
              },
              network: {
                type: 'string',
                description: 'Network (mainnet/devnet/testnet)',
                enum: ['mainnet', 'devnet', 'testnet'],
                default: 'mainnet',
              },
              branch: {
                type: 'string',
                description: 'Git branch',
                default: 'main',
              },
            },
            required: ['owner', 'repo', 'path', 'programId', 'name'],
          },
        },
        {
          name: 'delete_idl',
          description: 'Delete an IDL from the registry',
          inputSchema: {
            type: 'object',
            properties: {
              programId: {
                type: 'string',
                description: 'Solana program address',
              },
              network: {
                type: 'string',
                description: 'Network',
                enum: ['mainnet', 'devnet', 'testnet'],
                default: 'mainnet',
              },
            },
            required: ['programId'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;
      const traceId = this.generateTraceId();

      try {
        let result;
        
        switch (name) {
          case 'list_idls':
            result = await this.handleListIdls(args, traceId);
            break;
          case 'get_idl':
            result = await this.handleGetIdl(args, traceId);
            break;
          case 'search_idls':
            result = await this.handleSearchIdls(args, traceId);
            break;
          case 'upload_idl':
            result = await this.handleUploadIdl(args, traceId);
            break;
          case 'load_from_github':
            result = await this.handleLoadFromGithub(args, traceId);
            break;
          case 'delete_idl':
            result = await this.handleDeleteIdl(args, traceId);
            break;
          default:
            throw new Error(`Unknown tool: ${name}`);
        }

        if (result.success) {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result.data, null, 2),
              },
            ],
          };
        } else {
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  error: result.error,
                  code: result.code,
                  traceId: result.traceId,
                  status: result.status,
                }, null, 2),
              },
            ],
            isError: true,
          };
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: error.message,
                code: 'INTERNAL_ERROR',
                traceId,
              }, null, 2),
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleListIdls(args, traceId) {
    const { network = 'mainnet', limit = 50, offset = 0 } = args;
    return await this.makeApiRequest('GET', '/api/idl', null, { network, limit, offset }, traceId);
  }

  async handleGetIdl(args, traceId) {
    const { programId, network = 'mainnet', all = false } = args;
    return await this.makeApiRequest('GET', `/api/idl/${programId}`, null, { network, all }, traceId);
  }

  async handleSearchIdls(args, traceId) {
    const { query, network = 'mainnet', limit = 10 } = args;
    return await this.makeApiRequest('GET', '/api/idl/search', null, { q: query, network, limit }, traceId);
  }

  async handleUploadIdl(args, traceId) {
    const { programId, network, name, idl } = args;
    return await this.makeApiRequest('POST', '/api/idl/upload', { programId, network, name, idl }, null, traceId);
  }

  async handleLoadFromGithub(args, traceId) {
    const { owner, repo, path, programId, name, network = 'mainnet', branch = 'main' } = args;
    return await this.makeApiRequest('POST', '/api/idl/load-from-github', {
      owner,
      repo,
      path,
      programId,
      name,
      network,
      branch,
    }, null, traceId);
  }

  async handleDeleteIdl(args, traceId) {
    const { programId, network = 'mainnet' } = args;
    return await this.makeApiRequest('DELETE', `/api/idl/${programId}`, null, { network }, traceId);
  }

  getMetrics() {
    const avgLatency = this.metrics.latencies.length > 0
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length
      : 0;
    
    const p95Latency = this.metrics.latencies.length > 0
      ? this.metrics.latencies.sort((a, b) => a - b)[Math.floor(this.metrics.latencies.length * 0.95)]
      : 0;
    
    return {
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) + '%' : '0%',
      avgLatency: Math.round(avgLatency) + 'ms',
      p95Latency: Math.round(p95Latency) + 'ms',
    };
  }

  async start(port = 3001) {
    const app = express();
    app.use(express.json());

    // Health endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '1.0.0',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
        apiBaseUrl: this.apiBaseUrl,
        metrics: this.getMetrics(),
      });
    });

    // Metrics endpoint
    app.get('/metrics', (req, res) => {
      res.json(this.getMetrics());
    });

    // SSE endpoint for MCP
    app.get('/sse', async (req, res) => {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const transport = new SSEServerTransport('/message', res);
      await this.server.connect(transport);
      
      console.error('[MCP] Client connected via SSE');
    });

    // Message endpoint for SSE
    app.post('/message', express.text({ type: '*/*' }), async (req, res) => {
      // SSE transport handles this
      res.status(200).end();
    });

    app.listen(port, () => {
      console.error(`\n🚀 IDLHub API MCP Server`);
      console.error(`📍 Health: http://localhost:${port}/health`);
      console.error(`📊 Metrics: http://localhost:${port}/metrics`);
      console.error(`🔌 SSE: http://localhost:${port}/sse`);
      console.error(`🔗 API Base: ${this.apiBaseUrl}\n`);
    });
  }
}

// Main execution
async function main() {
  const apiBaseUrl = process.env.IDLHUB_API_BASE || 'http://localhost:3000';
  const port = parseInt(process.env.MCP_PORT || '3001', 10);
  
  const server = new IDLHubAPIMCPServer(apiBaseUrl);
  await server.start(port);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[MCP] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { IDLHubAPIMCPServer };
