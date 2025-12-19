/**
 * IDLHub REST API Server - Arweave Backend
 *
 * Serves IDLs from Arweave permanent storage via Irys
 * Falls back to local IDLs/ directory for development
 */

import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.API_PORT || 3000;

// Paths
const ARWEAVE_DIR = path.join(__dirname, '..', 'arweave');
const MANIFEST_FILE = path.join(ARWEAVE_DIR, 'manifest.json');
const IDLS_DIR = path.join(__dirname, '..', 'IDLs');
const INDEX_FILE = path.join(__dirname, '..', 'index.json');
const CACHE_DIR = path.join(ARWEAVE_DIR, 'cache');

// Arweave/Irys gateways (try devnet first for testing, then mainnet)
const GATEWAYS = [
  'https://devnet.irys.xyz',
  'https://arweave.net',
  'https://gateway.irys.xyz',
];

// In-memory cache
const memoryCache = new Map();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Load manifest (creates stub if not exists)
 */
function loadManifest() {
  if (fs.existsSync(MANIFEST_FILE)) {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
  }
  // Return empty manifest for local dev
  return { version: '1.0.0', gateway: 'https://arweave.net', idls: {} };
}

/**
 * Load protocol index
 */
function loadIndex() {
  return JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
}

/**
 * Fetch with timeout
 */
async function fetchWithTimeout(url, timeout = 10000) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);
    throw error;
  }
}

/**
 * Get IDL from Arweave or local fallback
 */
async function getIDL(protocolId) {
  // Check memory cache
  const cached = memoryCache.get(protocolId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const manifest = loadManifest();
  const entry = manifest.idls[protocolId];

  // Try Arweave first if we have a txId
  if (entry?.txId && !entry.txId.startsWith('dry-run')) {
    // Check disk cache
    const cachePath = path.join(CACHE_DIR, `${protocolId}.json`);
    if (fs.existsSync(cachePath)) {
      try {
        const cachedFile = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
        if (cachedFile._txId === entry.txId) {
          memoryCache.set(protocolId, { data: cachedFile.idl, timestamp: Date.now() });
          return cachedFile.idl;
        }
      } catch (e) { /* ignore cache errors */ }
    }

    // Fetch from Arweave
    for (const gateway of GATEWAYS) {
      try {
        const url = `${gateway}/${entry.txId}`;
        const response = await fetchWithTimeout(url);
        if (response.ok) {
          const idl = await response.json();

          // Cache to disk
          if (!fs.existsSync(CACHE_DIR)) {
            fs.mkdirSync(CACHE_DIR, { recursive: true });
          }
          fs.writeFileSync(cachePath, JSON.stringify({ _txId: entry.txId, idl }));

          // Cache to memory
          memoryCache.set(protocolId, { data: idl, timestamp: Date.now() });
          return idl;
        }
      } catch (error) {
        console.warn(`Gateway ${gateway} failed for ${protocolId}:`, error.message);
      }
    }
  }

  // Fallback to local file
  const localPath = path.join(IDLS_DIR, `${protocolId}IDL.json`);
  if (fs.existsSync(localPath)) {
    const idl = JSON.parse(fs.readFileSync(localPath, 'utf-8'));
    memoryCache.set(protocolId, { data: idl, timestamp: Date.now() });
    return idl;
  }

  // Try without IDL suffix
  const localPath2 = path.join(IDLS_DIR, `${protocolId}.json`);
  if (fs.existsSync(localPath2)) {
    const idl = JSON.parse(fs.readFileSync(localPath2, 'utf-8'));
    memoryCache.set(protocolId, { data: idl, timestamp: Date.now() });
    return idl;
  }

  return null;
}

// Health check
app.get('/health', (req, res) => {
  const manifest = loadManifest();
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '3.0.0',
    backend: 'arweave',
    gateway: manifest.gateway,
    indexTxId: manifest.indexTxId || null,
    totalIDLs: Object.keys(manifest.idls).length,
  });
});

// List IDLs
app.get('/api/idl', async (req, res) => {
  try {
    const { limit = 50, offset = 0, category } = req.query;
    const index = loadIndex();
    const manifest = loadManifest();

    let protocols = index.protocols.map(p => ({
      ...p,
      arweaveTxId: manifest.idls[p.id]?.txId || null,
      arweaveUrl: manifest.idls[p.id]?.txId
        ? `${manifest.gateway}/${manifest.idls[p.id].txId}`
        : null,
    }));

    if (category) {
      protocols = protocols.filter(p => p.category === category);
    }

    const paginated = protocols.slice(Number(offset), Number(offset) + Number(limit));

    res.json({
      total: protocols.length,
      offset: Number(offset),
      limit: Number(limit),
      idls: paginated,
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to list IDLs', details: error.message });
  }
});

// Get IDL by protocol ID or program address
app.get('/api/idl/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // First try as protocol ID
    let idl = await getIDL(id);

    // If not found, try to find by program address
    if (!idl) {
      const index = loadIndex();
      const protocol = index.protocols.find(p =>
        p.programId === id || p.address === id
      );
      if (protocol) {
        idl = await getIDL(protocol.id);
      }
    }

    if (!idl) {
      return res.status(404).json({ error: 'IDL not found', protocolId: id });
    }

    const manifest = loadManifest();
    const entry = manifest.idls[id];

    res.json({
      protocolId: id,
      arweaveTxId: entry?.txId || null,
      arweaveUrl: entry?.txId ? `${manifest.gateway}/${entry.txId}` : null,
      idl,
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to fetch IDL', details: error.message });
  }
});

// Search IDLs
app.get('/api/idl/search', async (req, res) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }

    const index = loadIndex();
    const manifest = loadManifest();
    const query = q.toLowerCase();

    const results = index.protocols
      .filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.id.toLowerCase().includes(query) ||
        (p.description && p.description.toLowerCase().includes(query))
      )
      .slice(0, Number(limit))
      .map(p => ({
        ...p,
        arweaveTxId: manifest.idls[p.id]?.txId || null,
      }));

    res.json({
      query: q,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Search failed', details: error.message });
  }
});

// Upload new IDL (stores locally, requires separate Arweave upload)
app.post('/api/idl', async (req, res) => {
  try {
    const { programId, name, idl: idlData, network = 'mainnet' } = req.body;

    if (!programId || !idlData) {
      return res.status(400).json({ error: 'Missing required fields: programId, idl' });
    }

    // Validate IDL structure
    if (!idlData.version || !idlData.name) {
      return res.status(400).json({ error: 'Invalid IDL format: missing version or name' });
    }

    // Save locally (Arweave upload is a separate step)
    const protocolId = name || idlData.name;
    const localPath = path.join(IDLS_DIR, `${protocolId}IDL.json`);
    fs.writeFileSync(localPath, JSON.stringify(idlData, null, 2));

    // Update index.json
    const index = loadIndex();
    const existingIndex = index.protocols.findIndex(p => p.id === protocolId);

    const protocolEntry = {
      id: protocolId,
      name: name || idlData.name,
      description: idlData.description || `${name || idlData.name} protocol on Solana`,
      category: 'defi',
      idlPath: `IDLs/${protocolId}IDL.json`,
      programId,
      network,
      status: 'pending-arweave',
      version: idlData.version,
      lastUpdated: new Date().toISOString().split('T')[0],
    };

    if (existingIndex >= 0) {
      index.protocols[existingIndex] = { ...index.protocols[existingIndex], ...protocolEntry };
    } else {
      index.protocols.push(protocolEntry);
      index.totalProtocols = index.protocols.length;
    }

    index.lastUpdated = new Date().toISOString();
    fs.writeFileSync(INDEX_FILE, JSON.stringify(index, null, 2));

    // Clear cache
    memoryCache.delete(protocolId);

    res.status(201).json({
      success: true,
      message: 'IDL saved locally. Run `npm run upload` in arweave/ to upload to Arweave.',
      protocolId,
      localPath,
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({ error: 'Failed to save IDL', details: error.message });
  }
});

// Legacy endpoints for compatibility
app.get('/api/programs', async (req, res) => {
  const { category, search, limit = 50, offset = 0 } = req.query;

  const index = loadIndex();
  let programs = index.protocols;

  if (category) {
    programs = programs.filter(p => p.category === category);
  }
  if (search) {
    const q = search.toLowerCase();
    programs = programs.filter(p =>
      p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q)
    );
  }

  res.json({
    total: programs.length,
    protocols: programs.slice(Number(offset), Number(offset) + Number(limit)),
    programs: programs.slice(Number(offset), Number(offset) + Number(limit)),
  });
});

app.get('/api/programs/:id', async (req, res) => {
  const { id } = req.params;
  const index = loadIndex();
  const protocol = index.protocols.find(p => p.id === id);

  if (!protocol) {
    return res.status(404).json({ error: 'Program not found' });
  }

  res.json(protocol);
});

app.get('/api/programs/:id/idl', async (req, res) => {
  const idl = await getIDL(req.params.id);
  if (!idl) {
    return res.status(404).json({ error: 'IDL not found' });
  }
  res.json(idl);
});

// Arweave-specific endpoints
app.get('/api/arweave/manifest', (req, res) => {
  const manifest = loadManifest();
  res.json(manifest);
});

app.get('/api/arweave/stats', (req, res) => {
  const manifest = loadManifest();
  const uploaded = Object.values(manifest.idls).filter(e => e.txId && !e.txId.startsWith('dry-run'));
  const totalSize = uploaded.reduce((sum, e) => sum + (e.size || 0), 0);

  res.json({
    totalIDLs: Object.keys(manifest.idls).length,
    uploadedToArweave: uploaded.length,
    pendingUpload: Object.keys(manifest.idls).length - uploaded.length,
    totalSize,
    indexTxId: manifest.indexTxId,
    lastUpdated: manifest.lastUpdated,
  });
});

// API documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'IDLHub REST API',
    version: '3.0.0',
    description: 'REST API serving IDLs from Arweave permanent storage',
    backend: 'arweave',
    endpoints: {
      'GET /health': 'Health check with Arweave status',
      'GET /api/idl': 'List all IDLs',
      'GET /api/idl/:id': 'Get IDL by protocol ID or program address',
      'GET /api/idl/search?q=': 'Search IDLs',
      'POST /api/idl': 'Upload new IDL (local, then run arweave upload)',
      'GET /api/programs': 'List programs (legacy)',
      'GET /api/programs/:id': 'Get program (legacy)',
      'GET /api/programs/:id/idl': 'Get program IDL (legacy)',
      'GET /api/arweave/manifest': 'Get Arweave manifest',
      'GET /api/arweave/stats': 'Get Arweave upload stats',
    },
  });
});

// Error handler
app.use((err, req, res, _next) => {
  console.error('Error:', err);
  res.status(500).json({ error: 'Internal server error', details: err.message });
});

// Start server
app.listen(PORT, () => {
  const manifest = loadManifest();
  console.log(`\n🚀 IDLHub API Server (Arweave) on port ${PORT}`);
  console.log(`📚 Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🔗 Gateway: ${manifest.gateway}`);
  console.log(`📦 IDLs in manifest: ${Object.keys(manifest.idls).length}\n`);
});

export default app;
