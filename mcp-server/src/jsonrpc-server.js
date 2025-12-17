#!/usr/bin/env node

/**
 * IDLHub Web JSON-RPC MCP Server
 *
 * A stateless HTTP JSON-RPC 2.0 server that exposes MCP tools via standard POST requests.
 * This is simpler than SSE transport and works with any HTTP client.
 *
 * Features:
 * - Standard JSON-RPC 2.0 protocol
 * - CORS enabled for browser access
 * - Health and metrics endpoints
 * - Both local IDL registry and remote API modes
 * - Batch request support
 */

const express = require('express');
const cors = require('cors');
const fs = require('fs').promises;
const path = require('path');
const axios = require('axios');
const crypto = require('crypto');

const DEFAULT_PORT = 3002;
const BASE_URL = 'https://idlhub.com';
const DEFAULT_TIMEOUT = 30000;

class IDLHubJSONRPCServer {
  constructor(options = {}) {
    this.mode = options.mode || process.env.MCP_MODE || 'local'; // 'local' or 'api'
    this.idlRegistryPath = options.registryPath || process.env.IDL_REGISTRY_PATH || path.join(__dirname, '..', '..');
    this.apiBaseUrl = options.apiBaseUrl || process.env.IDLHUB_API_BASE || BASE_URL;
    this.timeout = options.timeout || parseInt(process.env.IDLHUB_REQUEST_TIMEOUT || DEFAULT_TIMEOUT, 10);

    this.indexData = null;
    this.metrics = {
      requests: 0,
      errors: 0,
      latencies: [],
      startTime: Date.now(),
    };

    // Define available tools
    this.tools = this.getToolDefinitions();
  }

  getToolDefinitions() {
    // Local registry tools
    const localTools = [
      {
        name: 'list_schemas',
        description: 'List all available IDL schemas in the local registry',
        inputSchema: {
          type: 'object',
          properties: {
            category: { type: 'string', description: 'Filter by category (defi, dex, lending, etc.)' },
            status: { type: 'string', description: 'Filter by status (available, placeholder)' },
          },
        },
      },
      {
        name: 'get_schema',
        description: 'Retrieve a specific IDL schema by protocol ID from local registry',
        inputSchema: {
          type: 'object',
          properties: {
            protocol_id: { type: 'string', description: 'The protocol ID (e.g., "jupiter", "orca")' },
          },
          required: ['protocol_id'],
        },
      },
      {
        name: 'lookup_symbol',
        description: 'Look up types, instructions, accounts, or enums in an IDL',
        inputSchema: {
          type: 'object',
          properties: {
            protocol_id: { type: 'string', description: 'The protocol ID to search in' },
            symbol_name: { type: 'string', description: 'The symbol name to look up' },
            symbol_type: { type: 'string', description: 'Type of symbol: instruction, account, type, enum, error' },
          },
          required: ['protocol_id', 'symbol_name'],
        },
      },
      {
        name: 'generate_code',
        description: 'Generate code from an IDL for a specific target language/framework',
        inputSchema: {
          type: 'object',
          properties: {
            protocol_id: { type: 'string', description: 'The protocol ID to generate code for' },
            target: {
              type: 'string',
              description: 'Target language: typescript, rust, python, anchor-ts',
              enum: ['typescript', 'rust', 'python', 'anchor-ts'],
            },
            symbols: {
              type: 'array',
              items: { type: 'string' },
              description: 'Specific symbols to generate (optional)',
            },
          },
          required: ['protocol_id', 'target'],
        },
      },
      {
        name: 'validate_idl',
        description: 'Validate an IDL schema and provide diagnostics',
        inputSchema: {
          type: 'object',
          properties: {
            protocol_id: { type: 'string', description: 'The protocol ID to validate' },
          },
          required: ['protocol_id'],
        },
      },
    ];

    // Remote API tools for IDL management
    const apiTools = [
      {
        name: 'list_idls',
        description: 'List all IDLs from remote API with optional filtering by network',
        inputSchema: {
          type: 'object',
          properties: {
            network: { type: 'string', enum: ['mainnet', 'devnet', 'testnet'], default: 'mainnet' },
            limit: { type: 'number', minimum: 1, maximum: 100, default: 50 },
            offset: { type: 'number', minimum: 0, default: 0 },
          },
        },
      },
      {
        name: 'get_idl',
        description: 'Get a specific IDL by program ID from remote API',
        inputSchema: {
          type: 'object',
          properties: {
            programId: { type: 'string', description: 'Solana program ID' },
            network: { type: 'string', enum: ['mainnet', 'devnet', 'testnet'], default: 'mainnet' },
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
            query: { type: 'string', description: 'Search query' },
            network: { type: 'string', enum: ['mainnet', 'devnet', 'testnet'], default: 'mainnet' },
            limit: { type: 'number', minimum: 1, maximum: 50, default: 10 },
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
            programId: { type: 'string', description: 'Solana program address' },
            network: { type: 'string', enum: ['mainnet', 'devnet', 'testnet'] },
            name: { type: 'string', description: 'Program name (optional)' },
            idl: { type: 'object', description: 'Complete IDL JSON object' },
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
            owner: { type: 'string', description: 'GitHub repository owner' },
            repo: { type: 'string', description: 'GitHub repository name' },
            path: { type: 'string', description: 'Path to IDL file in repository' },
            programId: { type: 'string', description: 'Solana program address' },
            name: { type: 'string', description: 'Program name' },
            network: { type: 'string', enum: ['mainnet', 'devnet', 'testnet'], default: 'mainnet' },
            branch: { type: 'string', default: 'main', description: 'Git branch' },
          },
          required: ['owner', 'repo', 'path', 'programId', 'name'],
        },
      },
      {
        name: 'create_or_update_idl',
        description: 'Create or update an IDL in the registry',
        inputSchema: {
          type: 'object',
          properties: {
            programId: { type: 'string', description: 'Solana program address' },
            network: { type: 'string', enum: ['mainnet', 'devnet', 'testnet'] },
            name: { type: 'string', description: 'Program name (optional)' },
            idl: { type: 'object', description: 'Complete IDL JSON object' },
            metadata: { type: 'object', description: 'Additional metadata (optional)' },
          },
          required: ['programId', 'network', 'idl'],
        },
      },
      {
        name: 'delete_idl',
        description: 'Delete an IDL from the registry',
        inputSchema: {
          type: 'object',
          properties: {
            programId: { type: 'string', description: 'Solana program address' },
            network: { type: 'string', enum: ['mainnet', 'devnet', 'testnet'], default: 'mainnet' },
          },
          required: ['programId'],
        },
      },
    ];

    // Return ALL tools - both local and API
    return [...localTools, ...apiTools];
  }

  async initialize() {
    if (this.mode === 'local') {
      const indexPath = path.join(this.idlRegistryPath, 'index.json');
      try {
        const indexContent = await fs.readFile(indexPath, 'utf-8');
        this.indexData = JSON.parse(indexContent);
        console.log(`[IDLHub JSON-RPC] Loaded registry with ${this.indexData.protocols.length} protocols`);
      } catch (error) {
        console.error(`[IDLHub JSON-RPC] Failed to load index.json: ${error.message}`);
        console.error('[IDLHub JSON-RPC] Falling back to API mode');
        this.mode = 'api';
        this.tools = this.getToolDefinitions();
      }
    }
  }

  generateTraceId() {
    return crypto.randomBytes(8).toString('hex');
  }

  // JSON-RPC 2.0 Error Codes
  static PARSE_ERROR = -32700;
  static INVALID_REQUEST = -32600;
  static METHOD_NOT_FOUND = -32601;
  static INVALID_PARAMS = -32602;
  static INTERNAL_ERROR = -32603;

  createErrorResponse(id, code, message, data = null) {
    const response = {
      jsonrpc: '2.0',
      error: { code, message },
      id,
    };
    if (data) response.error.data = data;
    return response;
  }

  createSuccessResponse(id, result) {
    return {
      jsonrpc: '2.0',
      result,
      id,
    };
  }

  async handleRequest(request) {
    const startTime = Date.now();
    this.metrics.requests++;

    // Validate JSON-RPC structure
    if (!request || typeof request !== 'object') {
      return this.createErrorResponse(null, IDLHubJSONRPCServer.INVALID_REQUEST, 'Invalid Request');
    }

    const { jsonrpc, method, params, id } = request;

    if (jsonrpc !== '2.0') {
      return this.createErrorResponse(id, IDLHubJSONRPCServer.INVALID_REQUEST, 'Invalid JSON-RPC version');
    }

    if (!method || typeof method !== 'string') {
      return this.createErrorResponse(id, IDLHubJSONRPCServer.INVALID_REQUEST, 'Method is required');
    }

    try {
      let result;

      switch (method) {
        // MCP Standard Methods
        case 'initialize':
          result = await this.handleInitialize(params);
          break;
        case 'tools/list':
          result = await this.handleToolsList();
          break;
        case 'tools/call':
          result = await this.handleToolsCall(params);
          break;
        case 'resources/list':
          result = await this.handleResourcesList();
          break;
        case 'resources/read':
          result = await this.handleResourcesRead(params);
          break;

        // Direct tool methods (shorthand) - Local tools
        case 'list_schemas':
        case 'get_schema':
        case 'lookup_symbol':
        case 'generate_code':
        case 'validate_idl':
        // Direct tool methods (shorthand) - API tools
        case 'list_idls':
        case 'get_idl':
        case 'search_idls':
        case 'upload_idl':
        case 'load_from_github':
        case 'create_or_update_idl':
        case 'delete_idl':
          result = await this.handleToolsCall({ name: method, arguments: params || {} });
          break;

        default:
          this.metrics.errors++;
          return this.createErrorResponse(id, IDLHubJSONRPCServer.METHOD_NOT_FOUND, `Method not found: ${method}`);
      }

      const latency = Date.now() - startTime;
      this.metrics.latencies.push(latency);
      if (this.metrics.latencies.length > 1000) this.metrics.latencies.shift();

      return this.createSuccessResponse(id, result);

    } catch (error) {
      this.metrics.errors++;
      const latency = Date.now() - startTime;
      this.metrics.latencies.push(latency);

      return this.createErrorResponse(
        id,
        IDLHubJSONRPCServer.INTERNAL_ERROR,
        error.message,
        { traceId: this.generateTraceId() }
      );
    }
  }

  async handleInitialize(params) {
    return {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {},
        resources: this.mode === 'local' ? {} : undefined,
      },
      serverInfo: {
        name: 'idlhub-jsonrpc-mcp-server',
        version: '1.0.0',
      },
    };
  }

  async handleToolsList() {
    return { tools: this.tools };
  }

  async handleToolsCall(params) {
    const { name, arguments: args = {} } = params;

    // Local registry tools
    const localTools = ['list_schemas', 'get_schema', 'lookup_symbol', 'generate_code', 'validate_idl'];
    // API tools
    const apiTools = ['list_idls', 'get_idl', 'search_idls', 'upload_idl', 'load_from_github', 'create_or_update_idl', 'delete_idl'];

    if (localTools.includes(name)) {
      return await this.handleLocalToolCall(name, args);
    } else if (apiTools.includes(name)) {
      return await this.handleApiToolCall(name, args);
    } else {
      throw new Error(`Unknown tool: ${name}`);
    }
  }

  async handleResourcesList() {
    if (this.mode !== 'local' || !this.indexData) {
      return { resources: [] };
    }

    return {
      resources: this.indexData.protocols
        .filter(p => p.status === 'available')
        .map(protocol => ({
          uri: `idl://${protocol.id}`,
          name: protocol.name,
          description: protocol.description,
          mimeType: 'application/json',
        })),
    };
  }

  async handleResourcesRead(params) {
    const { uri } = params;
    const match = uri.match(/^idl:\/\/(.+)$/);

    if (!match) {
      throw new Error('Invalid URI format. Expected: idl://<protocol_id>');
    }

    const protocolId = match[1];
    const protocol = this.indexData?.protocols.find(p => p.id === protocolId);

    if (!protocol) {
      throw new Error(`Protocol not found: ${protocolId}`);
    }

    const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
    const idlContent = await fs.readFile(idlPath, 'utf-8');

    return {
      contents: [{
        uri,
        mimeType: 'application/json',
        text: idlContent,
      }],
    };
  }

  // Local mode tool handlers
  async handleLocalToolCall(name, args) {
    switch (name) {
      case 'list_schemas':
        return await this.listSchemas(args);
      case 'get_schema':
        return await this.getSchema(args);
      case 'lookup_symbol':
        return await this.lookupSymbol(args);
      case 'generate_code':
        return await this.generateCode(args);
      case 'validate_idl':
        return await this.validateIdl(args);
      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  }

  async listSchemas(args) {
    let protocols = this.indexData.protocols;

    if (args.category) {
      protocols = protocols.filter(p => p.category === args.category);
    }
    if (args.status) {
      protocols = protocols.filter(p => p.status === args.status);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          total: protocols.length,
          categories: [...new Set(protocols.map(p => p.category))],
          protocols: protocols.map(p => ({
            id: p.id,
            name: p.name,
            description: p.description,
            category: p.category,
            status: p.status,
            version: p.version,
          })),
        }, null, 2),
      }],
    };
  }

  async getSchema(args) {
    const { protocol_id } = args;
    const protocol = this.indexData.protocols.find(p => p.id === protocol_id);

    if (!protocol) {
      throw new Error(`Protocol not found: ${protocol_id}`);
    }

    const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
    const idlContent = await fs.readFile(idlPath, 'utf-8');

    return {
      content: [{
        type: 'text',
        text: idlContent,
      }],
    };
  }

  async lookupSymbol(args) {
    const { protocol_id, symbol_name, symbol_type } = args;
    const protocol = this.indexData.protocols.find(p => p.id === protocol_id);

    if (!protocol) {
      throw new Error(`Protocol not found: ${protocol_id}`);
    }

    const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
    const idlContent = await fs.readFile(idlPath, 'utf-8');
    const idl = JSON.parse(idlContent);

    const results = [];

    if (!symbol_type || symbol_type === 'instruction') {
      const instruction = idl.instructions?.find(i => i.name === symbol_name);
      if (instruction) results.push({ type: 'instruction', data: instruction });
    }
    if (!symbol_type || symbol_type === 'account') {
      const account = idl.accounts?.find(a => a.name === symbol_name);
      if (account) results.push({ type: 'account', data: account });
    }
    if (!symbol_type || symbol_type === 'type') {
      const type = idl.types?.find(t => t.name === symbol_name);
      if (type) results.push({ type: 'type', data: type });
    }
    if (!symbol_type || symbol_type === 'error') {
      const error = idl.errors?.find(e => e.name === symbol_name);
      if (error) results.push({ type: 'error', data: error });
    }

    if (results.length === 0) {
      throw new Error(`Symbol not found: ${symbol_name}`);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(results, null, 2),
      }],
    };
  }

  async generateCode(args) {
    const { protocol_id, target, symbols } = args;
    const protocol = this.indexData.protocols.find(p => p.id === protocol_id);

    if (!protocol) {
      throw new Error(`Protocol not found: ${protocol_id}`);
    }

    const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
    const idlContent = await fs.readFile(idlPath, 'utf-8');
    const idl = JSON.parse(idlContent);

    let code = '';
    switch (target) {
      case 'typescript':
        code = this.generateTypeScript(idl, symbols);
        break;
      case 'rust':
        code = this.generateRust(idl, symbols);
        break;
      case 'python':
        code = this.generatePython(idl, symbols);
        break;
      case 'anchor-ts':
        code = this.generateAnchorTS(idl, symbols);
        break;
      default:
        throw new Error(`Unsupported target: ${target}`);
    }

    return {
      content: [{
        type: 'text',
        text: code,
      }],
    };
  }

  generateTypeScript(idl, symbols) {
    let code = `// Generated TypeScript types for ${idl.name}\n\n`;
    const types = symbols ? idl.types?.filter(t => symbols.includes(t.name)) : idl.types;

    if (types?.length > 0) {
      types.forEach(type => {
        code += `export type ${type.name} = `;
        if (type.type?.kind === 'struct') {
          code += `{\n`;
          type.type.fields?.forEach(f => {
            code += `  ${f.name}: ${this.mapTypeToTS(f.type)};\n`;
          });
          code += `};\n\n`;
        } else if (type.type?.kind === 'enum') {
          code += type.type.variants?.map(v => `{ ${v.name}: null }`).join(' | ') + ';\n\n';
        }
      });
    }
    return code;
  }

  generateRust(idl, symbols) {
    let code = `// Generated Rust types for ${idl.name}\n\nuse anchor_lang::prelude::*;\n\n`;
    const types = symbols ? idl.types?.filter(t => symbols.includes(t.name)) : idl.types;

    if (types?.length > 0) {
      types.forEach(type => {
        if (type.type?.kind === 'struct') {
          code += `#[derive(AnchorSerialize, AnchorDeserialize, Clone)]\npub struct ${type.name} {\n`;
          type.type.fields?.forEach(f => {
            code += `    pub ${f.name}: ${this.mapTypeToRust(f.type)},\n`;
          });
          code += `}\n\n`;
        }
      });
    }
    return code;
  }

  generatePython(idl, symbols) {
    let code = `# Generated Python types for ${idl.name}\n\nfrom dataclasses import dataclass\n\n`;
    const types = symbols ? idl.types?.filter(t => symbols.includes(t.name)) : idl.types;

    if (types?.length > 0) {
      types.forEach(type => {
        if (type.type?.kind === 'struct') {
          code += `@dataclass\nclass ${type.name}:\n`;
          type.type.fields?.forEach(f => {
            code += `    ${f.name}: ${this.mapTypeToPython(f.type)}\n`;
          });
          code += `\n`;
        }
      });
    }
    return code;
  }

  generateAnchorTS(idl) {
    return `// Generated Anchor TypeScript client for ${idl.name}\n\nimport { Program } from '@coral-xyz/anchor';\n\nexport const IDL = ${JSON.stringify(idl, null, 2)};\n`;
  }

  mapTypeToTS(type) {
    if (typeof type === 'string') {
      const map = { u8: 'number', u16: 'number', u32: 'number', u64: 'bigint', i8: 'number', i16: 'number', i32: 'number', i64: 'bigint', bool: 'boolean', string: 'string', publicKey: 'PublicKey', bytes: 'Uint8Array' };
      return map[type] || type;
    }
    if (type.vec) return `Array<${this.mapTypeToTS(type.vec)}>`;
    if (type.option) return `${this.mapTypeToTS(type.option)} | null`;
    if (type.defined) return type.defined;
    return 'any';
  }

  mapTypeToRust(type) {
    if (typeof type === 'string') {
      const map = { publicKey: 'Pubkey', bool: 'bool', string: 'String', bytes: 'Vec<u8>' };
      return map[type] || type;
    }
    if (type.vec) return `Vec<${this.mapTypeToRust(type.vec)}>`;
    if (type.option) return `Option<${this.mapTypeToRust(type.option)}>`;
    if (type.defined) return type.defined;
    return 'Unknown';
  }

  mapTypeToPython(type) {
    if (typeof type === 'string') {
      const map = { u8: 'int', u16: 'int', u32: 'int', u64: 'int', i8: 'int', i16: 'int', i32: 'int', i64: 'int', bool: 'bool', string: 'str', publicKey: 'str', bytes: 'bytes' };
      return map[type] || type;
    }
    if (type.vec) return `list[${this.mapTypeToPython(type.vec)}]`;
    if (type.option) return `${this.mapTypeToPython(type.option)} | None`;
    if (type.defined) return type.defined;
    return 'Any';
  }

  async validateIdl(args) {
    const { protocol_id } = args;
    const protocol = this.indexData.protocols.find(p => p.id === protocol_id);

    if (!protocol) {
      throw new Error(`Protocol not found: ${protocol_id}`);
    }

    const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
    const idlContent = await fs.readFile(idlPath, 'utf-8');
    const idl = JSON.parse(idlContent);

    const diagnostics = { valid: true, errors: [], warnings: [], info: [] };

    if (!idl.version) { diagnostics.errors.push('Missing: version'); diagnostics.valid = false; }
    if (!idl.name) { diagnostics.errors.push('Missing: name'); diagnostics.valid = false; }
    if (!idl.instructions?.length) diagnostics.warnings.push('No instructions defined');

    diagnostics.info.push(`Instructions: ${idl.instructions?.length || 0}`);
    diagnostics.info.push(`Accounts: ${idl.accounts?.length || 0}`);
    diagnostics.info.push(`Types: ${idl.types?.length || 0}`);

    return {
      content: [{
        type: 'text',
        text: JSON.stringify(diagnostics, null, 2),
      }],
    };
  }

  // API mode tool handlers
  async handleApiToolCall(name, args) {
    const traceId = this.generateTraceId();

    try {
      let endpoint, method = 'GET', data = null, params = null;

      switch (name) {
        case 'list_idls':
          endpoint = '/api/idl';
          params = { network: args.network || 'mainnet', limit: args.limit || 50, offset: args.offset || 0 };
          break;
        case 'get_idl':
          endpoint = `/api/idl/${args.programId}`;
          params = { network: args.network || 'mainnet' };
          break;
        case 'search_idls':
          endpoint = '/api/idl/search';
          params = { q: args.query, network: args.network || 'mainnet', limit: args.limit || 10 };
          break;
        case 'upload_idl':
          endpoint = '/api/idl/upload';
          method = 'POST';
          data = { programId: args.programId, network: args.network, name: args.name, idl: args.idl };
          break;
        case 'load_from_github':
          endpoint = '/api/idl/load-from-github';
          method = 'POST';
          data = {
            owner: args.owner,
            repo: args.repo,
            path: args.path,
            programId: args.programId,
            name: args.name,
            network: args.network || 'mainnet',
            branch: args.branch || 'main',
          };
          break;
        case 'create_or_update_idl':
          endpoint = '/api/idl';
          method = 'POST';
          data = {
            programId: args.programId,
            network: args.network,
            name: args.name,
            idl: args.idl,
            metadata: args.metadata,
          };
          break;
        case 'delete_idl':
          endpoint = `/api/idl/${args.programId}`;
          method = 'DELETE';
          params = { network: args.network || 'mainnet' };
          break;
        default:
          throw new Error(`Unknown API tool: ${name}`);
      }

      const response = await axios({
        method,
        url: `${this.apiBaseUrl}${endpoint}`,
        params,
        data,
        timeout: this.timeout,
        headers: { 'Content-Type': 'application/json' },
      });

      return {
        content: [{
          type: 'text',
          text: JSON.stringify(response.data, null, 2),
        }],
      };

    } catch (error) {
      throw new Error(`API error [${traceId}]: ${error.response?.data?.error || error.message}`);
    }
  }

  getMetrics() {
    const avgLatency = this.metrics.latencies.length > 0
      ? this.metrics.latencies.reduce((a, b) => a + b, 0) / this.metrics.latencies.length
      : 0;
    const sorted = [...this.metrics.latencies].sort((a, b) => a - b);
    const p95 = sorted.length > 0 ? sorted[Math.floor(sorted.length * 0.95)] : 0;

    return {
      uptime: Math.floor((Date.now() - this.metrics.startTime) / 1000),
      requests: this.metrics.requests,
      errors: this.metrics.errors,
      errorRate: this.metrics.requests > 0 ? (this.metrics.errors / this.metrics.requests * 100).toFixed(2) + '%' : '0%',
      avgLatency: Math.round(avgLatency) + 'ms',
      p95Latency: Math.round(p95) + 'ms',
    };
  }

  async start(port = DEFAULT_PORT) {
    const app = express();
    app.use(cors());
    app.use(express.json({ limit: '10mb' }));

    // Health endpoint
    app.get('/health', (req, res) => {
      res.json({
        status: 'ok',
        version: '1.0.0',
        mode: this.mode,
        timestamp: new Date().toISOString(),
        metrics: this.getMetrics(),
      });
    });

    // Metrics endpoint
    app.get('/metrics', (req, res) => {
      res.json(this.getMetrics());
    });

    // Main JSON-RPC endpoint at /api/mcp
    app.post('/api/mcp', async (req, res) => {
      const body = req.body;

      // Handle batch requests
      if (Array.isArray(body)) {
        const results = await Promise.all(body.map(r => this.handleRequest(r)));
        return res.json(results);
      }

      // Single request
      const result = await this.handleRequest(body);
      res.json(result);
    });

    // OpenAPI-style documentation endpoint
    app.get('/openapi', (req, res) => {
      res.json({
        openapi: '3.0.0',
        info: {
          title: 'IDLHub MCP JSON-RPC API',
          version: '1.0.0',
          description: 'JSON-RPC 2.0 API for IDLHub MCP Server',
        },
        servers: [{ url: `http://localhost:${port}` }],
        paths: {
          '/api/mcp': {
            post: {
              summary: 'JSON-RPC 2.0 endpoint',
              requestBody: {
                content: {
                  'application/json': {
                    schema: {
                      type: 'object',
                      properties: {
                        jsonrpc: { type: 'string', enum: ['2.0'] },
                        method: { type: 'string' },
                        params: { type: 'object' },
                        id: { type: ['string', 'number'] },
                      },
                      required: ['jsonrpc', 'method', 'id'],
                    },
                  },
                },
              },
            },
          },
        },
        components: {
          schemas: {
            tools: this.tools,
          },
        },
      });
    });

    app.listen(port, () => {
      console.log(`\n🚀 IDLHub JSON-RPC MCP Server`);
      console.log(`📍 Mode: ${this.mode}`);
      console.log(`🔌 MCP: http://localhost:${port}/api/mcp`);
      console.log(`📋 OpenAPI: http://localhost:${port}/openapi`);
      console.log(`❤️  Health: http://localhost:${port}/health`);
      console.log(`📊 Metrics: http://localhost:${port}/metrics\n`);
      console.log('Example request:');
      console.log(`  curl -X POST http://localhost:${port}/api/mcp \\`);
      console.log(`    -H "Content-Type: application/json" \\`);
      console.log(`    -d '{"jsonrpc":"2.0","method":"tools/list","params":{},"id":1}'`);
      console.log('');
    });
  }
}

// Main execution
async function main() {
  const port = parseInt(process.env.MCP_PORT || DEFAULT_PORT, 10);

  const server = new IDLHubJSONRPCServer();
  await server.initialize();
  await server.start(port);
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[IDLHub JSON-RPC] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { IDLHubJSONRPCServer };
