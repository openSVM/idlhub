/**
 * Netlify Function: /api/status
 * Returns service status (simplified for static hosting)
 */

const https = require('https');

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
  try {
    const url = 'https://raw.githubusercontent.com/openSVM/idlhub/main/index.json';
    return await fetchJSON(url);
  } catch (e) {
    console.error('Failed to load index.json:', e);
    return { protocols: [] };
  }
}

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Content-Type': 'application/json',
  'Cache-Control': 'public, max-age=60',
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
    const pathParts = event.path.replace(/^\/+|\/+$/g, '').split('/');
    // pathParts: ['api', 'status'] or ['api', 'status', 'protocols']

    const subPath = pathParts[2];

    if (subPath === 'protocols') {
      // Return empty protocols status for static hosting
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          timestamp: new Date().toISOString(),
          protocols: {},
          message: 'Verification status not available on static hosting',
        }),
      };
    }

    // Main status endpoint
    const index = await loadIndex();
    const totalProtocols = index.protocols?.length || 0;
    const availableProtocols = index.protocols?.filter(p => p.status === 'available').length || 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        service: 'IDLHub',
        version: '4.0.0',
        status: 'operational',
        hosting: 'netlify-static',
        timestamp: new Date().toISOString(),
        stats: {
          totalProtocols,
          availableProtocols,
          categories: [...new Set(index.protocols?.map(p => p.category) || [])],
        },
        verification: {
          message: 'On-chain verification not available on static hosting',
          available: false,
        },
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
