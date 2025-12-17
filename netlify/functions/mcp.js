const fs = require('fs');
const path = require('path');
const https = require('https');

// JSON-RPC Error Codes
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

// OpenSVM API configuration
const OPENSVM_API_BASE = process.env.OPENSVM_API_BASE || 'https://opensvm.com/api';
let indexData = null;

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse JSON'));
        }
      });
    }).on('error', reject);
  });
}

async function loadIndex() {
  if (indexData) return indexData;

  try {
    // Load directly from GitHub (OpenSVM API not deployed yet)
    const url = 'https://raw.githubusercontent.com/openSVM/idlhub/main/index.json';
    indexData = await fetchJSON(url);
    return indexData;
  } catch (e) {
    console.error('Failed to load index.json from GitHub:', e);
    return { protocols: [] };
  }
}

// Tool definitions
const tools = [
  // Local registry tools
  {
    name: 'list_schemas',
    description: 'List all available IDL schemas in the registry',
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
    description: 'Retrieve a specific IDL schema by protocol ID',
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
  // IDL upload/management tools
  {
    name: 'upload_idl',
    description: 'Upload an IDL to the registry (creates a GitHub issue with the IDL data)',
    inputSchema: {
      type: 'object',
      properties: {
        programId: { type: 'string', description: 'Solana program address' },
        network: { type: 'string', enum: ['mainnet', 'devnet', 'testnet'] },
        name: { type: 'string', description: 'Program name' },
        idl: { type: 'object', description: 'Complete IDL JSON object' },
      },
      required: ['programId', 'network', 'name', 'idl'],
    },
  },
  {
    name: 'load_from_github',
    description: 'Load an IDL from a GitHub repository (creates a GitHub issue with the source info)',
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
];

// Helper to fetch IDL from GitHub (OpenSVM API not deployed yet)
async function fetchIDL(protocolId) {
  const index = await loadIndex();
  const protocol = index.protocols.find(p => p.id === protocolId);
  if (!protocol || !protocol.idlPath) {
    throw new Error(`Protocol ${protocolId} not found or missing IDL path`);
  }
  const githubUrl = `https://raw.githubusercontent.com/openSVM/idlhub/main/${protocol.idlPath}`;
  return await fetchJSON(githubUrl);
}

// Tool handlers
async function handleListSchemas(args) {
  const index = await loadIndex();
  let protocols = index.protocols || [];

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

async function handleGetSchema(args) {
  const idl = await fetchIDL(args.protocol_id);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(idl, null, 2),
    }],
  };
}

async function handleLookupSymbol(args) {
  const idl = await fetchIDL(args.protocol_id);
  const results = [];

  if (!args.symbol_type || args.symbol_type === 'instruction') {
    const instruction = idl.instructions?.find(i => i.name === args.symbol_name);
    if (instruction) results.push({ type: 'instruction', data: instruction });
  }
  if (!args.symbol_type || args.symbol_type === 'account') {
    const account = idl.accounts?.find(a => a.name === args.symbol_name);
    if (account) results.push({ type: 'account', data: account });
  }
  if (!args.symbol_type || args.symbol_type === 'type') {
    const type = idl.types?.find(t => t.name === args.symbol_name);
    if (type) results.push({ type: 'type', data: type });
  }
  if (!args.symbol_type || args.symbol_type === 'error') {
    const error = idl.errors?.find(e => e.name === args.symbol_name);
    if (error) results.push({ type: 'error', data: error });
  }

  if (results.length === 0) {
    throw new Error(`Symbol not found: ${args.symbol_name}`);
  }

  return {
    content: [{
      type: 'text',
      text: JSON.stringify(results, null, 2),
    }],
  };
}

async function handleGenerateCode(args) {
  const idl = await fetchIDL(args.protocol_id);
  let code = '';

  const types = args.symbols ? idl.types?.filter(t => args.symbols.includes(t.name)) : idl.types;

  switch (args.target) {
    case 'typescript':
      code = `// Generated TypeScript types for ${idl.name}\n\n`;
      if (types?.length > 0) {
        types.forEach(type => {
          code += `export type ${type.name} = `;
          if (type.type?.kind === 'struct') {
            code += `{\n`;
            type.type.fields?.forEach(f => {
              code += `  ${f.name}: ${mapTypeToTS(f.type)};\n`;
            });
            code += `};\n\n`;
          } else if (type.type?.kind === 'enum') {
            code += type.type.variants?.map(v => `{ ${v.name}: null }`).join(' | ') + ';\n\n';
          }
        });
      }
      break;
    case 'rust':
      code = `// Generated Rust types for ${idl.name}\n\nuse anchor_lang::prelude::*;\n\n`;
      if (types?.length > 0) {
        types.forEach(type => {
          if (type.type?.kind === 'struct') {
            code += `#[derive(AnchorSerialize, AnchorDeserialize, Clone)]\npub struct ${type.name} {\n`;
            type.type.fields?.forEach(f => {
              code += `    pub ${f.name}: ${mapTypeToRust(f.type)},\n`;
            });
            code += `}\n\n`;
          }
        });
      }
      break;
    case 'python':
      code = `# Generated Python types for ${idl.name}\n\nfrom dataclasses import dataclass\n\n`;
      if (types?.length > 0) {
        types.forEach(type => {
          if (type.type?.kind === 'struct') {
            code += `@dataclass\nclass ${type.name}:\n`;
            type.type.fields?.forEach(f => {
              code += `    ${f.name}: ${mapTypeToPython(f.type)}\n`;
            });
            code += `\n`;
          }
        });
      }
      break;
    case 'anchor-ts':
      code = `// Generated Anchor TypeScript client for ${idl.name}\n\nimport { Program } from '@coral-xyz/anchor';\n\nexport const IDL = ${JSON.stringify(idl, null, 2)};\n`;
      break;
    default:
      throw new Error(`Unsupported target: ${args.target}`);
  }

  return {
    content: [{
      type: 'text',
      text: code,
    }],
  };
}

function mapTypeToTS(type) {
  if (typeof type === 'string') {
    const map = { u8: 'number', u16: 'number', u32: 'number', u64: 'bigint', i8: 'number', i16: 'number', i32: 'number', i64: 'bigint', bool: 'boolean', string: 'string', publicKey: 'PublicKey', bytes: 'Uint8Array' };
    return map[type] || type;
  }
  if (type.vec) return `Array<${mapTypeToTS(type.vec)}>`;
  if (type.option) return `${mapTypeToTS(type.option)} | null`;
  if (type.defined) return type.defined;
  return 'any';
}

function mapTypeToRust(type) {
  if (typeof type === 'string') {
    const map = { publicKey: 'Pubkey', bool: 'bool', string: 'String', bytes: 'Vec<u8>' };
    return map[type] || type;
  }
  if (type.vec) return `Vec<${mapTypeToRust(type.vec)}>`;
  if (type.option) return `Option<${mapTypeToRust(type.option)}>`;
  if (type.defined) return type.defined;
  return 'Unknown';
}

function mapTypeToPython(type) {
  if (typeof type === 'string') {
    const map = { u8: 'int', u16: 'int', u32: 'int', u64: 'int', i8: 'int', i16: 'int', i32: 'int', i64: 'int', bool: 'bool', string: 'str', publicKey: 'str', bytes: 'bytes' };
    return map[type] || type;
  }
  if (type.vec) return `list[${mapTypeToPython(type.vec)}]`;
  if (type.option) return `${mapTypeToPython(type.option)} | None`;
  if (type.defined) return type.defined;
  return 'Any';
}

async function handleValidateIdl(args) {
  const idl = await fetchIDL(args.protocol_id);
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

// Upload IDL handler - creates a GitHub issue
async function handleUploadIdl(args) {
  const { programId, network, name, idl } = args;

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: 'IDL upload request received',
        instructions: 'To add this IDL to the registry, please create a GitHub issue at https://github.com/openSVM/idlhub/issues with the following details:',
        data: {
          programId,
          network,
          name,
          idl: typeof idl === 'object' ? '[IDL Object]' : idl,
        },
        note: 'For security reasons, IDLs must be manually reviewed before being added to the registry.',
      }, null, 2),
    }],
  };
}

// Load from GitHub handler - creates a GitHub issue
async function handleLoadFromGithub(args) {
  const { owner, repo, path, programId, name, network = 'mainnet', branch = 'main' } = args;

  return {
    content: [{
      type: 'text',
      text: JSON.stringify({
        success: true,
        message: 'GitHub IDL load request received',
        instructions: 'To add this IDL to the registry, please create a GitHub issue at https://github.com/openSVM/idlhub/issues with the following details:',
        data: {
          source: 'github',
          owner,
          repo,
          path,
          branch,
          programId,
          name,
          network,
          githubUrl: `https://github.com/${owner}/${repo}/blob/${branch}/${path}`,
        },
        note: 'For security reasons, IDLs must be manually reviewed before being added to the registry.',
      }, null, 2),
    }],
  };
}

// Main handler
async function handleToolsCall(name, args) {
  switch (name) {
    case 'list_schemas':
      return await handleListSchemas(args);
    case 'get_schema':
      return await handleGetSchema(args);
    case 'lookup_symbol':
      return await handleLookupSymbol(args);
    case 'generate_code':
      return await handleGenerateCode(args);
    case 'validate_idl':
      return await handleValidateIdl(args);
    case 'upload_idl':
      return await handleUploadIdl(args);
    case 'load_from_github':
      return await handleLoadFromGithub(args);
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

function createErrorResponse(id, code, message, data = null) {
  const response = { jsonrpc: '2.0', error: { code, message }, id };
  if (data) response.error.data = data;
  return response;
}

function createSuccessResponse(id, result) {
  return { jsonrpc: '2.0', result, id };
}

async function handleRequest(request) {
  if (!request || typeof request !== 'object') {
    return createErrorResponse(null, INVALID_REQUEST, 'Invalid Request');
  }

  const { jsonrpc, method, params, id } = request;

  if (jsonrpc !== '2.0') {
    return createErrorResponse(id, INVALID_REQUEST, 'Invalid JSON-RPC version');
  }

  if (!method || typeof method !== 'string') {
    return createErrorResponse(id, INVALID_REQUEST, 'Method is required');
  }

  try {
    let result;

    switch (method) {
      case 'initialize':
        result = {
          protocolVersion: '2024-11-05',
          capabilities: { tools: {}, resources: {} },
          serverInfo: { name: 'idlhub-mcp-server', version: '1.0.0' },
        };
        break;
      case 'tools/list':
        result = { tools };
        break;
      case 'tools/call':
        result = await handleToolsCall(params.name, params.arguments || {});
        break;
      case 'resources/list':
        const index = await loadIndex();
        result = {
          resources: (index.protocols || [])
            .filter(p => p.status === 'available')
            .map(p => ({
              uri: `idl://${p.id}`,
              name: p.name,
              description: p.description,
              mimeType: 'application/json',
            })),
        };
        break;
      case 'resources/read':
        const match = params.uri?.match(/^idl:\/\/(.+)$/);
        if (!match) throw new Error('Invalid URI format');
        const idlContent = await fetchIDL(match[1]);
        result = {
          contents: [{
            uri: params.uri,
            mimeType: 'application/json',
            text: JSON.stringify(idlContent, null, 2),
          }],
        };
        break;
      // Direct tool shortcuts
      case 'list_schemas':
      case 'get_schema':
      case 'lookup_symbol':
      case 'generate_code':
      case 'validate_idl':
      case 'upload_idl':
      case 'load_from_github':
        result = await handleToolsCall(method, params || {});
        break;
      default:
        return createErrorResponse(id, METHOD_NOT_FOUND, `Method not found: ${method}`);
    }

    return createSuccessResponse(id, result);
  } catch (error) {
    return createErrorResponse(id, INTERNAL_ERROR, error.message);
  }
}

// Netlify Function handler
exports.handler = async (event, context) => {
  // CORS headers
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only POST allowed
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    const body = JSON.parse(event.body);

    // Handle batch requests
    if (Array.isArray(body)) {
      const results = await Promise.all(body.map(r => handleRequest(r)));
      return { statusCode: 200, headers, body: JSON.stringify(results) };
    }

    // Single request
    const result = await handleRequest(body);
    return { statusCode: 200, headers, body: JSON.stringify(result) };
  } catch (error) {
    return {
      statusCode: 400,
      headers,
      body: JSON.stringify(createErrorResponse(null, PARSE_ERROR, 'Parse error')),
    };
  }
};
