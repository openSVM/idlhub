const fs = require('fs');
const path = require('path');
const https = require('https');

// JSON-RPC Error Codes
const PARSE_ERROR = -32700;
const INVALID_REQUEST = -32600;
const METHOD_NOT_FOUND = -32601;
const INVALID_PARAMS = -32602;
const INTERNAL_ERROR = -32603;

// Load index.json at cold start
let indexData = null;

function loadIndex() {
  if (indexData) return indexData;
  try {
    const indexPath = path.join(__dirname, '..', '..', 'index.json');
    indexData = JSON.parse(fs.readFileSync(indexPath, 'utf-8'));
    return indexData;
  } catch (e) {
    console.error('Failed to load index.json:', e);
    return { protocols: [] };
  }
}

// Tool definitions
const tools = [
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
];

// Helper to fetch IDL from GitHub raw
function fetchIDL(idlPath) {
  return new Promise((resolve, reject) => {
    const url = `https://raw.githubusercontent.com/openSVM/idlhub/main/${idlPath}`;
    https.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Failed to parse IDL'));
        }
      });
    }).on('error', reject);
  });
}

// Tool handlers
async function handleListSchemas(args) {
  const index = loadIndex();
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
  const index = loadIndex();
  const protocol = index.protocols?.find(p => p.id === args.protocol_id);

  if (!protocol) {
    throw new Error(`Protocol not found: ${args.protocol_id}`);
  }

  const idl = await fetchIDL(protocol.idlPath);
  return {
    content: [{
      type: 'text',
      text: JSON.stringify(idl, null, 2),
    }],
  };
}

async function handleLookupSymbol(args) {
  const index = loadIndex();
  const protocol = index.protocols?.find(p => p.id === args.protocol_id);

  if (!protocol) {
    throw new Error(`Protocol not found: ${args.protocol_id}`);
  }

  const idl = await fetchIDL(protocol.idlPath);
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
  const index = loadIndex();
  const protocol = index.protocols?.find(p => p.id === args.protocol_id);

  if (!protocol) {
    throw new Error(`Protocol not found: ${args.protocol_id}`);
  }

  const idl = await fetchIDL(protocol.idlPath);
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
  const index = loadIndex();
  const protocol = index.protocols?.find(p => p.id === args.protocol_id);

  if (!protocol) {
    throw new Error(`Protocol not found: ${args.protocol_id}`);
  }

  const idl = await fetchIDL(protocol.idlPath);
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
        const index = loadIndex();
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
        const idx = loadIndex();
        const proto = idx.protocols?.find(p => p.id === match[1]);
        if (!proto) throw new Error(`Protocol not found: ${match[1]}`);
        const idlContent = await fetchIDL(proto.idlPath);
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
