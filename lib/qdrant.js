/**
 * Qdrant Database utilities for IDLHub
 * Based on aldrin-labs/openSVM Qdrant configuration
 */

const { QdrantClient } = require('@qdrant/js-client-rest');

// Collection names for IDLHub
const COLLECTIONS = {
  IDL_METADATA: 'idl_metadata',
  PROTOCOL_SEARCH: 'protocol_search',
  USER_SEARCHES: 'user_searches',
  IDL_CACHE: 'idl_cache'
};

// Vector size for embeddings
const VECTOR_SIZE = 384;

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
  for (let i = 0; i < VECTOR_SIZE; i++) {
    const hash = normalizedText.split('').reduce((acc, char, idx) => {
      return ((acc << 5) - acc + char.charCodeAt(0) + idx) & 0xffffffff;
    }, i * 31);
    vector[i] = (hash % 1000) / 1000; // Normalize to 0-1
  }
  
  return vector;
}

/**
 * Initialize Qdrant collections for IDLHub
 */
async function initializeCollections() {
  try {
    console.log('Initializing Qdrant collections...');

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

    // Create collections
    await ensureCollection(COLLECTIONS.IDL_METADATA, 'IDL metadata and protocol information');
    await ensureIndex(COLLECTIONS.IDL_METADATA, 'protocolId');
    await ensureIndex(COLLECTIONS.IDL_METADATA, 'category');
    await ensureIndex(COLLECTIONS.IDL_METADATA, 'status');

    await ensureCollection(COLLECTIONS.PROTOCOL_SEARCH, 'Protocol search index');
    await ensureIndex(COLLECTIONS.PROTOCOL_SEARCH, 'protocolId');
    await ensureIndex(COLLECTIONS.PROTOCOL_SEARCH, 'name');

    await ensureCollection(COLLECTIONS.USER_SEARCHES, 'User search history');
    await ensureIndex(COLLECTIONS.USER_SEARCHES, 'userId');
    await ensureIndex(COLLECTIONS.USER_SEARCHES, 'timestamp');

    await ensureCollection(COLLECTIONS.IDL_CACHE, 'IDL content cache');
    await ensureIndex(COLLECTIONS.IDL_CACHE, 'protocolId');

    console.log('✅ All Qdrant collections initialized successfully');
    return true;
  } catch (error) {
    console.error('❌ Error initializing Qdrant collections:', error);
    return false;
  }
}

/**
 * Store IDL metadata in Qdrant
 */
async function storeIDLMetadata(protocol) {
  try {
    const textContent = `${protocol.name} ${protocol.description} ${protocol.category}`;
    const vector = generateSimpleEmbedding(textContent);

    await withTimeout(
      qdrantClient.upsert(COLLECTIONS.IDL_METADATA, {
        wait: true,
        points: [{
          id: protocol.id,
          vector,
          payload: {
            protocolId: protocol.id,
            name: protocol.name,
            description: protocol.description,
            category: protocol.category,
            status: protocol.status,
            version: protocol.version,
            lastUpdated: protocol.lastUpdated,
            repo: protocol.repo
          }
        }]
      })
    );

    console.log(`Stored metadata for protocol: ${protocol.id}`);
  } catch (error) {
    console.error(`Error storing IDL metadata for ${protocol.id}:`, error);
    throw error;
  }
}

/**
 * Search for protocols by text query
 */
async function searchProtocols(query, limit = 10) {
  try {
    const vector = generateSimpleEmbedding(query);

    const searchResult = await withTimeout(
      qdrantClient.search(COLLECTIONS.IDL_METADATA, {
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
    console.error('Error searching protocols:', error);
    return [];
  }
}

/**
 * Get protocol metadata by ID
 */
async function getProtocolMetadata(protocolId) {
  try {
    const result = await withTimeout(
      qdrantClient.retrieve(COLLECTIONS.IDL_METADATA, {
        ids: [protocolId],
        with_payload: true,
        with_vector: false
      })
    );

    return result.length > 0 ? result[0].payload : null;
  } catch (error) {
    console.error(`Error getting metadata for ${protocolId}:`, error);
    return null;
  }
}

/**
 * Batch store multiple protocols
 */
async function batchStoreProtocols(protocols) {
  try {
    if (!protocols || protocols.length === 0) return;

    console.log(`Batch storing ${protocols.length} protocols...`);

    const points = protocols.map(protocol => {
      const textContent = `${protocol.name} ${protocol.description} ${protocol.category}`;
      const vector = generateSimpleEmbedding(textContent);

      return {
        id: protocol.id,
        vector,
        payload: {
          protocolId: protocol.id,
          name: protocol.name,
          description: protocol.description,
          category: protocol.category,
          status: protocol.status,
          version: protocol.version,
          lastUpdated: protocol.lastUpdated,
          repo: protocol.repo
        }
      };
    });

    await withTimeout(
      qdrantClient.upsert(COLLECTIONS.IDL_METADATA, {
        wait: true,
        points
      }),
      15000 // Longer timeout for batch operations
    );

    console.log(`✅ Successfully stored ${protocols.length} protocols`);
  } catch (error) {
    console.error('Error batch storing protocols:', error);
    throw error;
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
  storeIDLMetadata,
  searchProtocols,
  getProtocolMetadata,
  batchStoreProtocols,
  healthCheck,
  generateSimpleEmbedding
};
