/**
 * Netlify Function for MCP Server (JSON-RPC)
 * Endpoint: https://idlhub.com/api/mcp
 */

const Irys = require('@irys/sdk');

const IRYS_NODE = process.env.IRYS_NODE || 'https://devnet.irys.xyz';
const IRYS_WALLET = process.env.IRYS_WALLET;
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';

const TOOLS = [
  { name: 'list_idls', description: 'List all available Solana IDLs from Arweave', inputSchema: { type: 'object', properties: { category: { type: 'string' }, limit: { type: 'number', default: 50 } } } },
  { name: 'search_idls', description: 'Search IDLs by name', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'get_idl', description: 'Get specific IDL', inputSchema: { type: 'object', properties: { protocol_id: { type: 'string' } }, required: ['protocol_id'] } },
  { name: 'upload_idl', description: 'Upload IDL to Arweave', inputSchema: { type: 'object', properties: { protocol_id: { type: 'string' }, name: { type: 'string' }, idl: { type: 'object' }, category: { type: 'string' }, repo: { type: 'string' } }, required: ['protocol_id', 'name', 'idl'] } },
];

async function uploadToArweave(protocol_id, name, idl, category, repo) {
  if (!IRYS_WALLET) {
    throw new Error('Server not configured for uploads (IRYS_WALLET missing)');
  }

  const wallet = JSON.parse(IRYS_WALLET);
  const irys = new Irys({ url: IRYS_NODE, token: 'solana', key: wallet, config: { providerUrl: SOLANA_RPC } });

  const tags = [
    { name: 'App-Name', value: 'IDLHub' },
    { name: 'App-Version', value: '1.0.0' },
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Network', value: 'solana' },
    { name: 'Type', value: 'IDL' },
    { name: 'Protocol-Name', value: name },
    { name: 'Protocol-ID', value: protocol_id },
    { name: 'Program-ID', value: idl.address || idl.metadata?.address || 'unknown' },
    { name: 'IDL-Version', value: idl.version || '0.1.0' },
    { name: 'Category', value: category || 'defi' },
  ];

  if (repo) tags.push({ name: 'Repository', value: repo });

  const idlContent = JSON.stringify(idl);
  const receipt = await irys.upload(idlContent, { tags });

  return {
    txId: receipt.id,
    url: `https://arweave.net/${receipt.id}`,
    gateway: IRYS_NODE,
    size: Buffer.byteLength(idlContent),
  };
}

async function handleToolCall(name, args) {
  const manifestRes = await fetch('https://idlhub.com/arweave/manifest.json');
  const manifest = await manifestRes.json();

  if (name === 'list_idls') {
    let idls = Object.entries(manifest.idls).map(([id, data]) => ({ 
      id, 
      name: data.name || id, 
      category: data.category || 'defi', 
      arweaveUrl: `${manifest.gateway}/${data.txId}`, 
      repo: data.repo 
    }));
    if (args.category) idls = idls.filter(i => i.category === args.category);
    idls = idls.slice(0, args.limit || 50);
    return { content: [{ type: 'text', text: JSON.stringify({ total: idls.length, idls }, null, 2) }] };
  }

  if (name === 'search_idls') {
    const q = args.query.toLowerCase();
    const results = Object.entries(manifest.idls)
      .filter(([id, data]) => id.toLowerCase().includes(q) || (data.name && data.name.toLowerCase().includes(q)))
      .map(([id, data]) => ({ id, name: data.name || id, category: data.category, arweaveUrl: `${manifest.gateway}/${data.txId}`, repo: data.repo }));
    return { content: [{ type: 'text', text: JSON.stringify({ query: args.query, total: results.length, results }, null, 2) }] };
  }

  if (name === 'get_idl') {
    const idlData = manifest.idls[args.protocol_id];
    if (!idlData) throw new Error(`IDL not found: ${args.protocol_id}`);
    const idlUrl = `${manifest.gateway}/${idlData.txId}`;
    const idlRes = await fetch(idlUrl);
    const idl = await idlRes.json();
    return { content: [{ type: 'text', text: JSON.stringify({ protocol_id: args.protocol_id, name: idlData.name, category: idlData.category, arweaveUrl: idlUrl, repo: idlData.repo, idl }, null, 2) }] };
  }

  if (name === 'upload_idl') {
    if (!args.idl || !args.idl.version || !args.idl.name) {
      throw new Error('Invalid IDL: missing version or name field');
    }

    const arweave = await uploadToArweave(args.protocol_id, args.name, args.idl, args.category, args.repo);

    return { 
      content: [{ 
        type: 'text', 
        text: JSON.stringify({ 
          success: true,
          protocol_id: args.protocol_id,
          name: args.name,
          category: args.category || 'defi',
          repo: args.repo || null,
          arweave,
          message: 'IDL uploaded to Arweave successfully. Will appear in registry after manifest update.',
        }, null, 2) 
      }] 
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

exports.handler = async (event) => {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'Content-Type', 
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 
    'Content-Type': 'application/json' 
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let request;
  try {
    request = JSON.parse(event.body);

    if (request.method === 'tools/list') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { tools: TOOLS } })
      };
    }

    if (request.method === 'tools/call') {
      const result = await handleToolCall(request.params.name, request.params.arguments || {});
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } }) };
  } catch (error) {
    console.error('MCP Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: (request && request.id) || null, error: { code: -32603, message: error.message } })
    };
  }
};
// Force rebuild Tue Dec 23 11:23:10 AM MSK 2025
