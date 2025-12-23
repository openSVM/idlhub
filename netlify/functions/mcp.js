const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { CallToolRequestSchema, ListToolsRequestSchema } = require('@modelcontextprotocol/sdk/types.js');

const server = new Server({ name: 'idlhub-mcp', version: '1.0.0' }, { capabilities: { tools: {} } });

const TOOLS = [
  { name: 'list_idls', description: 'List all available Solana IDLs from Arweave', inputSchema: { type: 'object', properties: { category: { type: 'string' }, limit: { type: 'number', default: 50 } } } },
  { name: 'search_idls', description: 'Search IDLs by name', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'get_idl', description: 'Get specific IDL', inputSchema: { type: 'object', properties: { protocol_id: { type: 'string' } }, required: ['protocol_id'] } },
];

server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  try {
    const manifestRes = await fetch('https://idlhub.com/arweave/manifest.json');
    const manifest = await manifestRes.json();

    if (name === 'list_idls') {
      let idls = Object.entries(manifest.idls).map(([id, data]) => ({ id, name: data.name || id, category: data.category || 'defi', arweaveUrl: `${manifest.gateway}/${data.txId}`, repo: data.repo }));
      if (args.category) idls = idls.filter(i => i.category === args.category);
      idls = idls.slice(0, args.limit || 50);
      return { content: [{ type: 'text', text: JSON.stringify({ total: idls.length, idls }, null, 2) }] };
    }

    if (name === 'search_idls') {
      const q = args.query.toLowerCase();
      const results = Object.entries(manifest.idls).filter(([id, data]) => id.toLowerCase().includes(q) || (data.name && data.name.toLowerCase().includes(q))).map(([id, data]) => ({ id, name: data.name || id, category: data.category, arweaveUrl: `${manifest.gateway}/${data.txId}`, repo: data.repo }));
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

    throw new Error(`Unknown tool: ${name}`);
  } catch (error) {
    return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }], isError: true };
  }
});

exports.handler = async (event) => {
  const headers = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'Content-Type', 'Access-Control-Allow-Methods': 'POST, OPTIONS', 'Content-Type': 'application/json' };
  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const request = JSON.parse(event.body);
    if (request.method === 'tools/list') {
      const response = await server.request({ method: 'tools/list', params: {} }, ListToolsRequestSchema);
      return { statusCode: 200, headers, body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: response }) };
    }
    if (request.method === 'tools/call') {
      const response = await server.request({ method: 'tools/call', params: request.params }, CallToolRequestSchema);
      return { statusCode: 200, headers, body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: response }) };
    }
    return { statusCode: 400, headers, body: JSON.stringify({ error: 'Invalid method' }) };
  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ jsonrpc: '2.0', id: null, error: { code: -32603, message: error.message } }) };
  }
};
