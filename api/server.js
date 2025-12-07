/**
 * IDLHub REST API Server
 * Acts as a wrapper for OpenSVM API (https://opensvm.com/api)
 */

const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
const PORT = process.env.API_PORT || 3000;
const OPENSVM_API_BASE = process.env.OPENSVM_API_BASE || 'https://opensvm.com/api';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Request logging
app.use((req, res, next) => {
  console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
  next();
});

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '2.0.0',
    backend: OPENSVM_API_BASE
  });
});

// List IDLs
app.get('/api/idl', async (req, res) => {
  try {
    const { network = 'mainnet', limit = 50, offset = 0 } = req.query;
    const response = await axios.get(`${OPENSVM_API_BASE}/idl`, {
      params: { network, limit, offset }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch IDLs',
      details: error.response?.data || error.message
    });
  }
});

// Get IDL by program ID
app.get('/api/idl/:programId', async (req, res) => {
  try {
    const { programId } = req.params;
    const { network = 'mainnet', all = false } = req.query;
    const response = await axios.get(`${OPENSVM_API_BASE}/idl/${programId}`, {
      params: { network, all }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch IDL',
      details: error.response?.data || error.message
    });
  }
});

// Create/Update IDL
app.post('/api/idl', async (req, res) => {
  try {
    const response = await axios.post(`${OPENSVM_API_BASE}/idl`, req.body);
    res.status(201).json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to create/update IDL',
      details: error.response?.data || error.message
    });
  }
});

// Delete IDL
app.delete('/api/idl/:programId', async (req, res) => {
  try {
    const { programId } = req.params;
    const { network = 'mainnet' } = req.query;
    const response = await axios.delete(`${OPENSVM_API_BASE}/idl/${programId}`, {
      params: { network }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to delete IDL',
      details: error.response?.data || error.message
    });
  }
});

// Search IDLs
app.get('/api/idl/search', async (req, res) => {
  try {
    const { q, network = 'mainnet', limit = 20 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const response = await axios.get(`${OPENSVM_API_BASE}/idl/search`, {
      params: { q, network, limit }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to search IDLs',
      details: error.response?.data || error.message
    });
  }
});

// Load IDL from GitHub
app.post('/api/idl/load-from-github', async (req, res) => {
  try {
    const { owner, repo, path: filePath, branch = 'main', programId, name, network = 'mainnet' } = req.body;
    
    if (!owner || !repo || !filePath || !programId) {
      return res.status(400).json({
        error: 'Missing required fields: owner, repo, path, programId'
      });
    }
    
    const githubUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/${filePath}`;
    console.log(`Fetching IDL from: ${githubUrl}`);
    
    const githubResponse = await axios.get(githubUrl, {
      headers: { 'Accept': 'application/json' }
    });
    
    const idlData = githubResponse.data;
    
    if (!idlData.version || !idlData.name) {
      return res.status(400).json({
        error: 'Invalid IDL format: missing version or name'
      });
    }
    
    const storePayload = {
      programId,
      network,
      idl: idlData,
      metadata: {
        name: name || idlData.name,
        github: `https://github.com/${owner}/${repo}`,
        source: githubUrl
      }
    };
    
    const opensvmResponse = await axios.post(`${OPENSVM_API_BASE}/idl`, storePayload);
    
    res.status(201).json({
      success: true,
      message: 'IDL loaded from GitHub and stored in OpenSVM',
      data: opensvmResponse.data
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    if (error.response?.status === 404) {
      return res.status(404).json({
        error: 'IDL file not found on GitHub',
        details: error.message
      });
    }
    res.status(error.response?.status || 500).json({
      error: 'Failed to load IDL from GitHub',
      details: error.response?.data || error.message
    });
  }
});

// Upload IDL
app.post('/api/idl/upload', async (req, res) => {
  try {
    const { programId, name, idl: idlData, network = 'mainnet' } = req.body;
    
    if (!programId || !idlData) {
      return res.status(400).json({
        error: 'Missing required fields: programId, idl'
      });
    }
    
    if (!idlData.version || !idlData.name) {
      return res.status(400).json({
        error: 'Invalid IDL format: missing version or name'
      });
    }
    
    const storePayload = {
      programId,
      network,
      idl: idlData,
      metadata: {
        name: name || idlData.name
      }
    };
    
    const response = await axios.post(`${OPENSVM_API_BASE}/idl`, storePayload);
    
    res.status(201).json({
      success: true,
      message: 'IDL uploaded successfully',
      data: response.data
    });
    
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to upload IDL',
      details: error.response?.data || error.message
    });
  }
});

// Legacy: List programs
app.get('/api/programs', async (req, res) => {
  try {
    const { category, status, search, network = 'mainnet', limit = 50, offset = 0 } = req.query;
    
    let url = `${OPENSVM_API_BASE}/idl`;
    let params = { network, limit, offset };
    
    if (search) {
      url = `${OPENSVM_API_BASE}/idl/search`;
      params.q = search;
    }
    
    const response = await axios.get(url, { params });
    let programs = response.data.idls || response.data.results || [];
    
    if (category) {
      programs = programs.filter(p => 
        p.metadata?.category === category || p.category === category
      );
    }
    
    if (status) {
      programs = programs.filter(p => p.status === status);
    }
    
    res.json({
      total: programs.length,
      protocols: programs,
      programs: programs
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Failed to fetch programs',
      details: error.response?.data || error.message
    });
  }
});

// Legacy: Get program
app.get('/api/programs/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { network = 'mainnet' } = req.query;
    const response = await axios.get(`${OPENSVM_API_BASE}/idl/${id}`, {
      params: { network }
    });
    res.json(response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Program not found',
      details: error.response?.data || error.message
    });
  }
});

// Legacy: Get program IDL
app.get('/api/programs/:id/idl', async (req, res) => {
  try {
    const { id } = req.params;
    const { network = 'mainnet' } = req.query;
    const response = await axios.get(`${OPENSVM_API_BASE}/idl/${id}`, {
      params: { network }
    });
    res.json(response.data.idl || response.data);
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'IDL not found',
      details: error.response?.data || error.message
    });
  }
});

// Search alias
app.get('/api/search', async (req, res) => {
  try {
    const { q, network = 'mainnet', limit = 20 } = req.query;
    if (!q) {
      return res.status(400).json({ error: 'Query parameter "q" is required' });
    }
    const response = await axios.get(`${OPENSVM_API_BASE}/idl/search`, {
      params: { q, network, limit }
    });
    res.json({
      query: q,
      total: response.data.results?.length || 0,
      results: response.data.results || response.data
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(error.response?.status || 500).json({
      error: 'Search failed',
      details: error.response?.data || error.message
    });
  }
});

// API documentation
app.get('/api/docs', (req, res) => {
  res.json({
    title: 'IDLHub REST API',
    version: '2.0.0',
    description: 'REST API wrapper for OpenSVM IDL storage',
    backend: OPENSVM_API_BASE,
    endpoints: {
      'GET /health': 'Health check',
      'GET /api/idl': 'List IDLs (proxied to OpenSVM)',
      'GET /api/idl/:programId': 'Get IDL (proxied to OpenSVM)',
      'POST /api/idl': 'Create/update IDL (proxied to OpenSVM)',
      'DELETE /api/idl/:programId': 'Delete IDL (proxied to OpenSVM)',
      'GET /api/idl/search': 'Search IDLs (proxied to OpenSVM)',
      'POST /api/idl/load-from-github': 'Load from GitHub',
      'POST /api/idl/upload': 'Upload IDL',
      'GET /api/programs': 'List programs (legacy)',
      'GET /api/programs/:id': 'Get program (legacy)',
      'GET /api/programs/:id/idl': 'Get program IDL (legacy)',
      'GET /api/search': 'Search (alias)',
      'GET /api/docs': 'Documentation'
    }
  });
});

// Error handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  res.status(500).json({
    error: 'Internal server error',
    details: err.message
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 IDLHub API Server on port ${PORT}`);
  console.log(`📚 Docs: http://localhost:${PORT}/api/docs`);
  console.log(`🔗 Backend: ${OPENSVM_API_BASE}\n`);
});

module.exports = app;
