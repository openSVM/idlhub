/**
 * Qdrant Database utilities for IDLHub
 * Based on aldrin-labs/openSVM Qdrant configuration
 * Uses the same ProgramMetadataEntry model for compatibility
 */

const { QdrantClient } = require('@qdrant/js-client-rest');
const fs = require('fs');
const path = require('path');

// Collection names - matching openSVM structure
const COLLECTIONS = {
  PROGRAM_METADATA: 'program_metadata', // Main collection matching openSVM
  TOKEN_METADATA: 'token_metadata',      // For future token support
  IDL_CACHE: 'idl_cache'                 // Additional caching layer
};

// Vector size for embeddings - matching openSVM
const VECTOR_SIZE = 384;

// Normalization factor for embedding values
const NORMALIZATION_FACTOR = 1000;

// Initialize Qdrant client with timeout
const qdrantClient = new QdrantClient({
  url: process.env.QDRANT_URL || process.env.QDRANT_SERVER || 'http://localhost:6333',
  apiKey: process.env.QDRANT_API_KEY || process.env.QDRANT || undefined,
});

// Helper function to add timeout to Qdrant operations
async function withTimeout(promise, timeoutMs = 5000) {
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Qdrant operation timed out')), timeoutMs);
  });
  
  return Promise.race([promise, timeoutPromise]);
}

/**
 * Generate simple embedding for text content
 * This is a basic implementation - in production, use a proper embedding model
 */
function generateSimpleEmbedding(text) {
  const vector = new Array(VECTOR_SIZE).fill(0);
  
  if (!text) return vector;
  
  const normalizedText = text.toLowerCase();
  
  // Simple hash-based vector generation
  // Note: We could optimize by splitting once, but that increases memory usage for large texts
  for (let i = 0; i < VECTOR_SIZE; i++) {
    const hash = normalizedText.split('').reduce((acc, char, idx) => {
      return ((acc << 5) - acc + char.charCodeAt(0) + idx) & 0xffffffff;
    }, i * 31);
    vector[i] = (hash % NORMALIZATION_FACTOR) / NORMALIZATION_FACTOR; // Normalize to 0-1
  }
  
  return vector;
}

/**
 * Initialize Qdrant collections for IDLHub
 * Uses the same structure as aldrin-labs/openSVM for compatibility
 */
async function initializeCollections() {
  try {
    console.log('Initializing Qdrant collections (openSVM compatible)...');

    // Helper function to ensure collection exists
    const ensureCollection = async (collectionName, description) => {
      try {
        const exists = await qdrantClient.getCollection(collectionName).catch(() => null);
        
        if (!exists) {
          await qdrantClient.createCollection(collectionName, {
            vectors: {
              size: VECTOR_SIZE,
              distance: 'Cosine'
            }
          });
          console.log(`✅ Created ${collectionName} collection - ${description}`);
        } else {
          console.log(`✓ ${collectionName} collection already exists`);
        }
      } catch (error) {
        console.error(`Error creating ${collectionName} collection:`, error.message);
        throw error;
      }
    };

    // Helper function to ensure index exists
    const ensureIndex = async (collectionName, fieldName, fieldType = 'keyword') => {
      try {
        await qdrantClient.createPayloadIndex(collectionName, {
          field_name: fieldName,
          field_schema: fieldType
        });
        console.log(`  ✓ Created index for ${fieldName} in ${collectionName}`);
      } catch (error) {
        if (error?.data?.status?.error?.includes('already exists') ||
            error?.message?.includes('already exists')) {
          console.log(`  ✓ Index for ${fieldName} in ${collectionName} already exists`);
        } else {
          console.warn(`  ⚠ Failed to create index for ${fieldName}:`, error?.message);
        }
      }
    };

    // Create PROGRAM_METADATA collection (matching openSVM)
    await ensureCollection(COLLECTIONS.PROGRAM_METADATA, 'Program metadata with IDLs (openSVM compatible)');
    await ensureIndex(COLLECTIONS.PROGRAM_METADATA, 'programId');
    await ensureIndex(COLLECTIONS.PROGRAM_METADATA, 'name');
    await ensureIndex(COLLECTIONS.PROGRAM_METADATA, 'category');
    await ensureIndex(COLLECTIONS.PROGRAM_METADATA, 'verified');

    // Create TOKEN_METADATA collection (matching openSVM)
    await ensureCollection(COLLECTIONS.TOKEN_METADATA, 'Token metadata (openSVM compatible)');
    await ensureIndex(COLLECTIONS.TOKEN_METADATA, 'mint');
    await ensureIndex(COLLECTIONS.TOKEN_METADATA, 'symbol');

    // Create IDL_CACHE collection for additional caching
    await ensureCollection(COLLECTIONS.IDL_CACHE, 'IDL content cache');
    await ensureIndex(COLLECTIONS.IDL_CACHE, 'protocolId');

    console.log('✅ All Qdrant collections initialized successfully (openSVM compatible)');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Qdrant collections:', error);
    return false;
  }
}

/**
 * Store program metadata with IDL (matching openSVM ProgramMetadataEntry model)
 * @param {Object} protocol - Protocol from index.json
 * @param {Object} idl - IDL JSON object
 */
async function storeProgramMetadata(protocol, idl = null) {
  try {
    // Load IDL if not provided
    let idlData = idl;
    if (!idlData && protocol.idlPath) {
      try {
        const idlPath = path.join(__dirname, '..', protocol.idlPath);
        if (fs.existsSync(idlPath)) {
          idlData = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
        }
      } catch (error) {
        console.warn(`Could not load IDL for ${protocol.id}:`, error.message);
      }
    }

    // Create ProgramMetadataEntry matching openSVM model
    const now = Date.now();
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 hours
    
    const programMetadata = {
      id: protocol.id,
      programId: protocol.id,
      name: protocol.name,
      description: protocol.description,
      websiteUrl: null, // Can be extracted from repo
      docsUrl: null,
      githubUrl: protocol.repo,
      category: protocol.category,
      verified: protocol.status === 'available',
      idl: idlData, // Store the full IDL
      cached: true,
      lastUpdated: now,
      cacheExpiry: now + CACHE_DURATION,
      tags: [protocol.category, protocol.status]
    };

    // Generate embedding from program content
    const textContent = `${programMetadata.name} ${programMetadata.description} ${programMetadata.category} ${programMetadata.programId}`;
    const vector = generateSimpleEmbedding(textContent);

    await withTimeout(
      qdrantClient.upsert(COLLECTIONS.PROGRAM_METADATA, {
        wait: true,
        points: [{
          id: programMetadata.id,
          vector,
          payload: {
            ...programMetadata,
            lastUpdated: Number(programMetadata.lastUpdated),
            cacheExpiry: Number(programMetadata.cacheExpiry)
          }
        }]
      })
    );

    console.log(`Stored program metadata for: ${protocol.name} (${protocol.id})`);
  } catch (error) {
    console.error(`Error storing program metadata for ${protocol.id}:`, error);
    throw error;
  }
}

/**
 * Search for programs by text query (matching openSVM search patterns)
 */
async function searchPrograms(query, limit = 10) {
  try {
    const vector = generateSimpleEmbedding(query);

    const searchResult = await withTimeout(
      qdrantClient.search(COLLECTIONS.PROGRAM_METADATA, {
        vector,
        limit,
        with_payload: true,
        with_vector: false
      })
    );

    return searchResult.map(result => ({
      ...result.payload,
      score: result.score
    }));
  } catch (error) {
    console.error('Error searching programs:', error);
    return [];
  }
}

/**
 * Get program metadata by ID (matching openSVM getCachedProgramMetadata)
 */
async function getProgramMetadata(programId) {
  try {
    const result = await withTimeout(
      qdrantClient.search(COLLECTIONS.PROGRAM_METADATA, {
        vector: generateSimpleEmbedding(programId),
        filter: {
          must: [
            { key: 'programId', match: { value: programId } }
          ]
        },
        limit: 1,
        with_payload: true
      })
    );

    if (result.length > 0) {
      const metadata = result[0].payload;
      
      // Check if cache is still valid
      const now = Date.now();
      if (metadata.cacheExpiry > now) {
        return metadata;
      } else {
        console.log(`Program metadata cache expired for ${programId}`);
        return null;
      }
    }

    return null;
  } catch (error) {
    console.error(`Error getting metadata for ${programId}:`, error);
    return null;
  }
}

/**
 * Batch store multiple programs (matching openSVM batch operations)
 */
async function batchStorePrograms(protocols) {
  try {
    if (!protocols || protocols.length === 0) return;

    console.log(`Batch storing ${protocols.length} programs with IDLs...`);

    const now = Date.now();
    const CACHE_DURATION = 24 * 60 * 60 * 1000;

    const points = protocols.map(protocol => {
      // Try to load IDL for each protocol
      let idlData = null;
      if (protocol.idlPath) {
        try {
          const idlPath = path.join(__dirname, '..', protocol.idlPath);
          if (fs.existsSync(idlPath)) {
            idlData = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
          }
        } catch (error) {
          console.warn(`Could not load IDL for ${protocol.id}`);
        }
      }

      // Create ProgramMetadataEntry
      const programMetadata = {
        id: protocol.id,
        programId: protocol.id,
        name: protocol.name,
        description: protocol.description,
        githubUrl: protocol.repo,
        category: protocol.category,
        verified: protocol.status === 'available',
        idl: idlData,
        cached: true,
        lastUpdated: now,
        cacheExpiry: now + CACHE_DURATION,
        tags: [protocol.category, protocol.status]
      };

      const textContent = `${programMetadata.name} ${programMetadata.description} ${programMetadata.category} ${programMetadata.programId}`;
      const vector = generateSimpleEmbedding(textContent);

      return {
        id: programMetadata.id,
        vector,
        payload: {
          ...programMetadata,
          lastUpdated: Number(programMetadata.lastUpdated),
          cacheExpiry: Number(programMetadata.cacheExpiry)
        }
      };
    });

    await withTimeout(
      qdrantClient.upsert(COLLECTIONS.PROGRAM_METADATA, {
        wait: true,
        points
      }),
      15000 // Longer timeout for batch operations
    );

    console.log(`✅ Successfully stored ${protocols.length} programs`);
  } catch (error) {
    console.error('Error batch storing programs:', error);
    throw error;
  }
}

/**
 * Batch get program metadata (matching openSVM batchGetCachedProgramMetadata)
 */
async function batchGetProgramMetadata(programIds) {
  const results = new Map();

  try {
    const batchSize = 10;
    for (let i = 0; i < programIds.length; i += batchSize) {
      const batch = programIds.slice(i, i + batchSize);

      const promises = batch.map(async (programId) => {
        const metadata = await getProgramMetadata(programId);
        if (metadata) {
          results.set(programId, metadata);
        }
      });

      await Promise.all(promises);
    }

    return results;
  } catch (error) {
    console.error('Error batch getting program metadata:', error);
    return new Map();
  }
}

/**
 * Health check for Qdrant connection
 */
async function healthCheck() {
  try {
    await withTimeout(qdrantClient.getCollections(), 3000);
    return true;
  } catch (error) {
    console.error('Qdrant health check failed:', error);
    return false;
  }
}

module.exports = {
  qdrantClient,
  COLLECTIONS,
  VECTOR_SIZE,
  initializeCollections,
  storeProgramMetadata,
  searchPrograms,
  getProgramMetadata,
  batchStorePrograms,
  batchGetProgramMetadata,
  healthCheck,
  generateSimpleEmbedding
};
