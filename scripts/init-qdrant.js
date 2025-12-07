#!/usr/bin/env node
/**
 * Initialize Qdrant database with IDL metadata
 * This script loads all protocols from index.json and stores them in Qdrant
 */

const fs = require('fs');
const path = require('path');
const qdrant = require('../lib/qdrant');

async function initializeQdrant() {
  console.log('🚀 Starting Qdrant initialization...\n');

  try {
    // Check Qdrant health
    console.log('Checking Qdrant connection...');
    const isHealthy = await qdrant.healthCheck();
    
    if (!isHealthy) {
      console.error('❌ Qdrant is not accessible. Please check your connection settings.');
      console.log('\nMake sure:');
      console.log('  1. Qdrant is running (docker, cloud instance, or local)');
      console.log('  2. QDRANT_URL and QDRANT_API_KEY are set correctly in .env');
      process.exit(1);
    }
    
    console.log('✅ Qdrant connection successful\n');

    // Initialize collections
    console.log('Creating collections...');
    await qdrant.initializeCollections();
    console.log('');

    // Load index.json
    console.log('Loading protocols from index.json...');
    const indexPath = path.join(__dirname, '..', 'index.json');
    
    let indexData;
    try {
      indexData = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    } catch (err) {
      if (err.code === 'ENOENT') {
        console.error(`\n❌ index.json not found in the expected location: ${indexPath}`);
      } else if (err instanceof SyntaxError) {
        console.error(`\n❌ index.json is not valid JSON or is corrupted: ${indexPath}`);
      } else {
        console.error(`\n❌ Failed to read or parse index.json: ${indexPath}`);
      }
      console.error('Please ensure index.json exists and is a valid JSON file.');
      process.exit(1);
    }
    
    const protocols = indexData.protocols;
    console.log(`Found ${protocols.length} protocols\n`);

    // Batch store protocols
    console.log('Storing programs with IDLs in Qdrant...');
    await qdrant.batchStorePrograms(protocols);
    
    console.log('\n✅ Qdrant initialization complete!');
    console.log(`\nStored ${protocols.length} programs with IDLs in openSVM-compatible format`);
    console.log(`Collections: ${Object.keys(qdrant.COLLECTIONS).join(', ')}`);
    console.log('\nYou can now use Qdrant for semantic search and program discovery.');
    console.log('This database is compatible with aldrin-labs/openSVM.');
    
  } catch (error) {
    console.error('\n❌ Error during initialization:', error.message);
    console.error('\nFull error:', error);
    process.exit(1);
  }
}

// Run initialization
initializeQdrant();
