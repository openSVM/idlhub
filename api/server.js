/**
 * IDLHub REST API Server
 * Provides endpoints for dynamically loading/uploading IDL files
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');
const qdrant = require('../lib/qdrant');

const app = express();
const PORT = process.env.API_PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging middleware
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

/**
 * Health check endpoint
 */
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

/**
 * Get all programs/protocols
 */
app.get('/api/programs', async (req, res) => {
  try {
    const indexPath = path.join(__dirname, '..', 'index.json');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    
    const { category, status, search } = req.query;
    let protocols = indexData.protocols;
    
    // Filter by category
    if (category) {
      protocols = protocols.filter(p => p.category === category);
    }
    
    // Filter by status
    if (status) {
      protocols = protocols.filter(p => p.status === status);
    }
    
    // Search by name or description
    if (search) {
      const searchLower = search.toLowerCase();
      protocols = protocols.filter(p => 
        p.name.toLowerCase().includes(searchLower) ||
        p.description.toLowerCase().includes(searchLower)
      );
    }
    
    res.json({
      total: protocols.length,
      protocols
    });
  } catch (error) {
    console.error('Error fetching programs:', error);
    res.status(500).json({ error: 'Failed to fetch programs' });
  }
});

/**
 * Get a specific program by ID
 */
app.get('/api/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const indexPath = path.join(__dirname, '..', 'index.json');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    
    const protocol = indexData.protocols.find(p => p.id === id);
    
    if (!protocol) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    res.json(protocol);
  } catch (error) {
    console.error('Error fetching program:', error);
    res.status(500).json({ error: 'Failed to fetch program' });
  }
});

/**
 * Get IDL for a specific program
 */
app.get('/api/programs/:id/idl', async (req, res) => {
  try {
    const { id } = req.params;
    const indexPath = path.join(__dirname, '..', 'index.json');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    
    const protocol = indexData.protocols.find(p => p.id === id);
    
    if (!protocol) {
      return res.status(404).json({ error: 'Program not found' });
    }
    
    if (!protocol.idlPath) {
      return res.status(404).json({ error: 'IDL not available for this program' });
    }
    
    const idlPath = path.join(__dirname, '..', protocol.idlPath);
    const idlData = JSON.parse(await fs.readFile(idlPath, 'utf8'));
    
    res.json(idlData);
  } catch (error) {
    console.error('Error fetching IDL:', error);
    res.status(500).json({ error: 'Failed to fetch IDL' });
  }
});

/**
 * Load IDL from GitHub repository
 * POST /api/idl/load-from-github
 * Body: { owner, repo, path, branch?, programId, name, description, category }
 */
app.post('/api/idl/load-from-github', async (req, res) => {
  try {
    const { owner, repo, path: filePath, branch = 'main', programId, name, description, category } = req.body;
    
    if (!owner || !repo || !filePath || !programId || !name) {
      return res.status(400).json({ 
        error: 'Missing required fields: owner, repo, path, programId, name' 
      });
    }
    
    // Construct GitHub raw URL
    const githubUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    console.log(`Fetching IDL from: ${githubUrl}`);
    
    // Fetch IDL from GitHub
    const response = await axios.get(githubUrl, {
      headers: {
        'Accept': 'application/json'
      }
    });
    
    const idlData = response.data;
    
    // Validate IDL structure
    if (!idlData.version || !idlData.name) {
      return res.status(400).json({ 
        error: 'Invalid IDL format: missing version or name' 
      });
    }
    
    // Save IDL to file
    const idlFileName = `${programId}IDL.json`;
    const idlPath = path.join(__dirname, '..', 'IDLs', idlFileName);
    await fs.writeFile(idlPath, JSON.stringify(idlData, null, 2));
    
    // Update index.json
    const indexPath = path.join(__dirname, '..', 'index.json');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    
    // Check if program already exists
    const existingIndex = indexData.protocols.findIndex(p => p.id === programId);
    const newProtocol = {
      id: programId,
      name,
      description: description || `${name} protocol on Solana`,
      category: category || 'defi',
      idlPath: `IDLs/${idlFileName}`,
      repo: `https://github.com/${owner}/${repo}`,
      status: 'available',
      version: idlData.version || '0.1.0',
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    if (existingIndex >= 0) {
      // Update existing
      indexData.protocols[existingIndex] = newProtocol;
    } else {
      // Add new and sort alphabetically
      indexData.protocols.push(newProtocol);
      indexData.protocols.sort((a, b) => a.id.localeCompare(b.id));
      indexData.totalProtocols = indexData.protocols.length;
    }
    
    indexData.lastUpdated = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
    
    // Store in Qdrant if available
    try {
      await qdrant.storeProgramMetadata(newProtocol, idlData);
      console.log(`Stored ${programId} in Qdrant`);
    } catch (qdrantError) {
      console.warn('Qdrant storage failed (continuing anyway):', qdrantError.message);
    }
    
    res.json({
      success: true,
      message: 'IDL loaded successfully from GitHub',
      program: newProtocol,
      idl: idlData
    });
    
  } catch (error) {
    console.error('Error loading IDL from GitHub:', error);
    
    if (error.response?.status === 404) {
      return res.status(404).json({ 
        error: 'IDL file not found on GitHub',
        details: error.message 
      });
    }
    
    res.status(500).json({ 
      error: 'Failed to load IDL from GitHub',
      details: error.message 
    });
  }
});

/**
 * Upload IDL directly
 * POST /api/idl/upload
 * Body: { programId, name, description, category, idl }
 */
app.post('/api/idl/upload', async (req, res) => {
  try {
    const { programId, name, description, category, idl: idlData, repo } = req.body;
    
    if (!programId || !name || !idlData) {
      return res.status(400).json({ 
        error: 'Missing required fields: programId, name, idl' 
      });
    }
    
    // Validate IDL structure
    if (!idlData.version || !idlData.name) {
      return res.status(400).json({ 
        error: 'Invalid IDL format: missing version or name' 
      });
    }
    
    // Save IDL to file
    const idlFileName = `${programId}IDL.json`;
    const idlPath = path.join(__dirname, '..', 'IDLs', idlFileName);
    await fs.writeFile(idlPath, JSON.stringify(idlData, null, 2));
    
    // Update index.json
    const indexPath = path.join(__dirname, '..', 'index.json');
    const indexData = JSON.parse(await fs.readFile(indexPath, 'utf8'));
    
    // Check if program already exists
    const existingIndex = indexData.protocols.findIndex(p => p.id === programId);
    const newProtocol = {
      id: programId,
      name,
      description: description || `${name} protocol on Solana`,
      category: category || 'defi',
      idlPath: `IDLs/${idlFileName}`,
      repo: repo || null,
      status: 'available',
      version: idlData.version || '0.1.0',
      lastUpdated: new Date().toISOString().split('T')[0]
    };
    
    if (existingIndex >= 0) {
      // Update existing
      indexData.protocols[existingIndex] = newProtocol;
    } else {
      // Add new and sort alphabetically
      indexData.protocols.push(newProtocol);
      indexData.protocols.sort((a, b) => a.id.localeCompare(b.id));
      indexData.totalProtocols = indexData.protocols.length;
    }
    
    indexData.lastUpdated = new Date().toISOString();
    await fs.writeFile(indexPath, JSON.stringify(indexData, null, 2));
    
    // Store in Qdrant if available
    try {
      await qdrant.storeProgramMetadata(newProtocol, idlData);
      console.log(`Stored ${programId} in Qdrant`);
    } catch (qdrantError) {
      console.warn('Qdrant storage failed (continuing anyway):', qdrantError.message);
    }
    
    res.json({
      success: true,
      message: 'IDL uploaded successfully',
      program: newProtocol
    });
    
  } catch (error) {
    console.error('Error uploading IDL:', error);
    res.status(500).json({ 
      error: 'Failed to upload IDL',
      details: error.message 
    });
  }
});

/**
 * Search programs using Qdrant semantic search
 */
app.get('/api/search', async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;
    
    if (!q) {
      return res.status(400).json({ error: 'Missing query parameter: q' });
    }
    
    const results = await qdrant.searchPrograms(q, parseInt(limit));
    
    res.json({
      query: q,
      total: results.length,
      results
    });
  } catch (error) {
    console.error('Error searching programs:', error);
    res.status(500).json({ 
      error: 'Search failed',
      details: error.message 
    });
  }
});

/**
 * Get program metadata from Qdrant
 */
app.get('/api/qdrant/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const metadata = await qdrant.getProgramMetadata(id);
    
    if (!metadata) {
      return res.status(404).json({ error: 'Program not found in Qdrant' });
    }
    
    res.json(metadata);
  } catch (error) {
    console.error('Error fetching from Qdrant:', error);
    res.status(500).json({ 
      error: 'Failed to fetch from Qdrant',
      details: error.message 
    });
  }
});

/**
 * Get API documentation
 */
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'IDLHub REST API',
    version: '1.0.0',
    description: 'REST API for managing Solana program IDLs',
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/programs': 'List all programs (query params: category, status, search)',
      'GET /api/programs/:id': 'Get specific program',
      'GET /api/programs/:id/idl': 'Get IDL for specific program',
      'POST /api/idl/load-from-github': 'Load IDL from GitHub',
      'POST /api/idl/upload': 'Upload IDL directly',
      'GET /api/search': 'Semantic search using Qdrant',
      'GET /api/qdrant/programs/:id': 'Get program from Qdrant',
      'GET /api/docs': 'This documentation'
    },
    examples: {
      loadFromGitHub: {
        method: 'POST',
        url: '/api/idl/load-from-github',
        body: {
          owner: 'coral-xyz',
          repo: 'anchor',
          path: 'tests/example.json',
          branch: 'master',
          programId: 'example',
          name: 'Example Program',
          description: 'Example Anchor program',
          category: 'defi'
        }
      },
      upload: {
        method: 'POST',
        url: '/api/idl/upload',
        body: {
          programId: 'myprogram',
          name: 'My Program',
          description: 'My custom program',
          category: 'defi',
          repo: 'https://github.com/myorg/myrepo',
          idl: {
            version: '0.1.0',
            name: 'myprogram',
            instructions: [],
            accounts: [],
            types: []
          }
        }
      }
    }
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    details: err.message 
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 IDLHub REST API Server running on port ${PORT}`);
  console.log(`📚 API Documentation: http://localhost:${PORT}/api/docs`);
  console.log(`💚 Health Check: http://localhost:${PORT}/health\n`);
});

module.exports = app;
