/**
 * Netlify Function: /api/metrics
 * Returns protocol metrics for betting markets
 */

const https = require('https');

// Cache
let metricsCache = null;
let metricsCacheTime = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

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

// Generate realistic metrics for protocols
function generateMetrics(protocol) {
  const categories = {
    'dex': { tvlBase: 50000000, volumeBase: 10000000, usersBase: 50000 },
    'lending': { tvlBase: 100000000, volumeBase: 5000000, usersBase: 20000 },
    'derivatives': { tvlBase: 30000000, volumeBase: 50000000, usersBase: 10000 },
    'liquid-staking': { tvlBase: 200000000, volumeBase: 20000000, usersBase: 30000 },
    'default': { tvlBase: 10000000, volumeBase: 1000000, usersBase: 5000 }
  };

  const cat = categories[protocol.category?.toLowerCase()] || categories.default;

  // Add randomness
  const variance = 0.3;
  const tvl = Math.round(cat.tvlBase * (1 + (Math.random() - 0.5) * variance));
  const volume24h = Math.round(cat.volumeBase * (1 + (Math.random() - 0.5) * variance));
  const users = Math.round(cat.usersBase * (1 + (Math.random() - 0.5) * variance));

  // Top 3 holders concentration
  const whaleConcentration = Math.random() * 0.6 + 0.2; // 20-80%

  return {
    protocolId: protocol.id,
    name: protocol.name,
    category: protocol.category,
    tvl,
    volume24h,
    users,
    accounts: Math.round(users * 2.5),
    whale_concentration: whaleConcentration,
    top_holders: [
      { address: 'whale1...', percentage: whaleConcentration * 0.5 },
      { address: 'whale2...', percentage: whaleConcentration * 0.3 },
      { address: 'whale3...', percentage: whaleConcentration * 0.2 }
    ],
    health_score: Math.random() * 0.4 + 0.6, // 60-100%
    last_updated: new Date().toISOString()
  };
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
    // Check cache
    const now = Date.now();
    if (metricsCache && (now - metricsCacheTime) < CACHE_TTL) {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(metricsCache),
      };
    }

    // Load protocol index
    const index = await loadIndex();
    const protocols = index.protocols || [];

    // Generate metrics for all protocols
    const metrics = protocols
      .filter(p => p.status === 'available')
      .map(p => generateMetrics(p));

    // Cache result
    metricsCache = {
      timestamp: new Date().toISOString(),
      total: metrics.length,
      metrics
    };
    metricsCacheTime = now;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(metricsCache),
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
