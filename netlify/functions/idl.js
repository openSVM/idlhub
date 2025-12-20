/**
 * Netlify Function: /api/idl
 * Serves IDL data from Arweave permanent storage via Irys
 */

const https = require('https');

// Cache for data
let indexCache = null;
let manifestCache = null;
let indexCacheTime = 0;
let manifestCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Arweave/Irys gateways (try in order)
const GATEWAYS = [
  'https://devnet.irys.xyz',
  'https://arweave.net',
  'https://gateway.irys.xyz',
];

function fetchJSON(url) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : require('http');
    client.get(url, (res) => {
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
  const now = Date.now();
  if (indexCache && (now - indexCacheTime) < CACHE_TTL) {
    return indexCache;
  }

  try {
    const url = 'https://raw.githubusercontent.com/openSVM/idlhub/main/index.json';
    indexCache = await fetchJSON(url);
    indexCacheTime = now;
    return indexCache;
  } catch (e) {
    console.error('Failed to load index.json:', e);
    return { protocols: [] };
  }
}

async function loadManifest() {
  const now = Date.now();
  if (manifestCache && (now - manifestCacheTime) < CACHE_TTL) {
    return manifestCache;
  }

  try {
    const url = 'https://raw.githubusercontent.com/openSVM/idlhub/main/arweave/manifest.json';
    manifestCache = await fetchJSON(url);
    manifestCacheTime = now;
    return manifestCache;
  } catch (e) {
    console.error('Failed to load manifest.json:', e);
    return { idls: {}, gateway: 'https://arweave.net' };
  }
}

async function fetchIDL(protocolId) {
  const manifest = await loadManifest();
  const entry = manifest.idls[protocolId];

  // Try Arweave first if we have a txId
  if (entry?.txId && !entry.txId.startsWith('dry-run')) {
    for (const gateway of GATEWAYS) {
      try {
        const url = `${gateway}/${entry.txId}`;
        const idl = await fetchJSON(url);
        return idl;
      } catch (error) {
        console.warn(`Gateway ${gateway} failed for ${protocolId}:`, error.message);
      }
    }
  }

  // Fallback to GitHub
  const index = await loadIndex();
  const protocol = index.protocols.find(p => p.id === protocolId);

  if (!protocol) {
    return null;
  }

  const idlPath = protocol.idlPath || `IDLs/${protocolId}IDL.json`;
  const githubUrl = `https://raw.githubusercontent.com/openSVM/idlhub/main/${idlPath}`;

  try {
    return await fetchJSON(githubUrl);
  } catch (e) {
    console.error(`Failed to fetch IDL for ${protocolId}:`, e);
    return null;
  }
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=300',
};

exports.handler = async (event, context) => {
  // Handle preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 204, headers, body: '' };
  }

  // Only GET allowed
  if (event.httpMethod !== 'GET') {
    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };
  }

  try {
    // Parse the path to determine what's being requested
    // event.path will be like /api/idl or /api/idl/jupiter
    const pathParts = event.path.replace(/^\/+|\/+$/g, '').split('/');
    // pathParts: ['api', 'idl'] or ['api', 'idl', 'jupiter']

    const protocolId = pathParts[2]; // undefined for list, or protocol ID

    if (!protocolId) {
      // List all IDLs
      const { limit = '50', offset = '0', category } = event.queryStringParameters || {};
      const index = await loadIndex();
      const manifest = await loadManifest();

      let protocols = index.protocols.map(p => {
        const arweaveEntry = manifest.idls[p.id];
        return {
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          status: p.status,
          version: p.version,
          lastUpdated: p.lastUpdated,
          repo: p.repo,
          arweaveTxId: arweaveEntry?.txId || null,
          arweaveUrl: arweaveEntry?.txId
            ? `${manifest.gateway}/${arweaveEntry.txId}`
            : null,
        };
      });

      if (category) {
        protocols = protocols.filter(p => p.category === category);
      }

      const paginated = protocols.slice(Number(offset), Number(offset) + Number(limit));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          total: protocols.length,
          offset: Number(offset),
          limit: Number(limit),
          gateway: manifest.gateway,
          idls: paginated,
        }),
      };
    }

    // Handle search endpoint
    if (protocolId === 'search') {
      const { q, limit = '20' } = event.queryStringParameters || {};
      if (!q) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Query parameter "q" is required' }),
        };
      }

      const index = await loadIndex();
      const query = q.toLowerCase();

      const results = index.protocols
        .filter(p =>
          p.name.toLowerCase().includes(query) ||
          p.id.toLowerCase().includes(query) ||
          (p.description && p.description.toLowerCase().includes(query))
        )
        .slice(0, Number(limit))
        .map(p => ({
          id: p.id,
          name: p.name,
          description: p.description,
          category: p.category,
          status: p.status,
        }));

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          query: q,
          total: results.length,
          results,
        }),
      };
    }

    // Get specific IDL
    const idl = await fetchIDL(protocolId);

    if (!idl) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'IDL not found', protocolId }),
      };
    }

    // Get metadata from index and manifest
    const index = await loadIndex();
    const manifest = await loadManifest();
    const protocol = index.protocols.find(p => p.id === protocolId);
    const arweaveEntry = manifest.idls[protocolId];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        protocolId,
        name: protocol?.name,
        category: protocol?.category,
        status: protocol?.status,
        arweaveTxId: arweaveEntry?.txId || null,
        arweaveUrl: arweaveEntry?.txId
          ? `${manifest.gateway}/${arweaveEntry.txId}`
          : null,
        idl,
      }),
    };
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Internal server error', details: error.message }),
    };
  }
};
