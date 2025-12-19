/**
 * IDLHub Arweave Fetcher
 *
 * Fetches IDLs from Arweave with local caching
 * Supports GraphQL queries for discovery
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const MANIFEST_FILE = path.join(__dirname, 'manifest.json');
const CACHE_DIR = path.join(__dirname, 'cache');

// Arweave gateways (fallback order)
const GATEWAYS = [
  'https://arweave.net',
  'https://arweave.dev',
  'https://gateway.irys.xyz',
];

// GraphQL endpoint for queries
const GRAPHQL_ENDPOINT = 'https://arweave.net/graphql';

/**
 * Fetch with timeout and retry
 */
async function fetchWithRetry(url, options = {}, retries = 3) {
  const timeout = options.timeout || 10000;

  for (let i = 0; i < retries; i++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);

      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(r => setTimeout(r, 1000 * (i + 1)));
    }
  }
}

/**
 * Load the manifest file
 */
export function loadManifest() {
  if (!fs.existsSync(MANIFEST_FILE)) {
    throw new Error('Manifest not found. Run upload.js first.');
  }
  return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
}

/**
 * Fetch an IDL by protocol ID
 */
export async function fetchIDL(protocolId, useCache = true) {
  const manifest = loadManifest();
  const entry = manifest.idls[protocolId];

  if (!entry) {
    throw new Error(`Protocol not found: ${protocolId}`);
  }

  // Check cache first
  if (useCache) {
    const cachePath = path.join(CACHE_DIR, `${protocolId}.json`);
    if (fs.existsSync(cachePath)) {
      const cached = JSON.parse(fs.readFileSync(cachePath, 'utf-8'));
      if (cached._txId === entry.txId) {
        return cached.idl;
      }
    }
  }

  // Fetch from Arweave
  for (const gateway of GATEWAYS) {
    try {
      const url = `${gateway}/${entry.txId}`;
      const response = await fetchWithRetry(url);
      const idl = await response.json();

      // Cache the result
      if (useCache) {
        if (!fs.existsSync(CACHE_DIR)) {
          fs.mkdirSync(CACHE_DIR, { recursive: true });
        }
        fs.writeFileSync(
          path.join(CACHE_DIR, `${protocolId}.json`),
          JSON.stringify({ _txId: entry.txId, idl }, null, 2)
        );
      }

      return idl;
    } catch (error) {
      console.warn(`Gateway ${gateway} failed:`, error.message);
    }
  }

  throw new Error(`Failed to fetch IDL from all gateways: ${protocolId}`);
}

/**
 * Fetch the index manifest from Arweave
 */
export async function fetchIndex() {
  const manifest = loadManifest();

  if (!manifest.indexTxId) {
    // Return local manifest if no on-chain index
    return manifest;
  }

  for (const gateway of GATEWAYS) {
    try {
      const url = `${gateway}/${manifest.indexTxId}`;
      const response = await fetchWithRetry(url);
      return await response.json();
    } catch (error) {
      console.warn(`Gateway ${gateway} failed:`, error.message);
    }
  }

  // Fallback to local manifest
  return manifest;
}

/**
 * Search IDLs on Arweave using GraphQL
 */
export async function searchIDLs(query, limit = 20) {
  const graphqlQuery = {
    query: `
      query {
        transactions(
          tags: [
            { name: "App-Name", values: ["IDLHub"] },
            { name: "Type", values: ["IDL"] }
          ],
          first: ${limit}
        ) {
          edges {
            node {
              id
              tags {
                name
                value
              }
            }
          }
        }
      }
    `,
  };

  const response = await fetchWithRetry(GRAPHQL_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(graphqlQuery),
  });

  const data = await response.json();
  const results = [];

  for (const edge of data.data.transactions.edges) {
    const tags = {};
    for (const tag of edge.node.tags) {
      tags[tag.name] = tag.value;
    }

    // Filter by query if provided
    const name = tags['Protocol-Name'] || '';
    const id = tags['Protocol-ID'] || '';
    if (query && !name.toLowerCase().includes(query.toLowerCase()) &&
        !id.toLowerCase().includes(query.toLowerCase())) {
      continue;
    }

    results.push({
      txId: edge.node.id,
      protocolId: tags['Protocol-ID'],
      name: tags['Protocol-Name'],
      programId: tags['Program-ID'],
      category: tags['Category'],
      version: tags['IDL-Version'],
    });
  }

  return results;
}

/**
 * List all available IDLs
 */
export function listIDLs() {
  const manifest = loadManifest();
  return Object.entries(manifest.idls).map(([id, data]) => ({
    protocolId: id,
    ...data,
    url: `${manifest.gateway}/${data.txId}`,
  }));
}

/**
 * Get IDL by program address
 */
export async function fetchIDLByProgramId(programId, useCache = true) {
  const manifest = loadManifest();

  // Search through manifest for matching program ID
  for (const [protocolId, entry] of Object.entries(manifest.idls)) {
    if (entry.programId === programId) {
      return fetchIDL(protocolId, useCache);
    }
  }

  // Fallback: search on Arweave
  const results = await searchIDLs('');
  for (const result of results) {
    if (result.programId === programId) {
      return fetchIDL(result.protocolId, useCache);
    }
  }

  throw new Error(`No IDL found for program: ${programId}`);
}

// CLI usage
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const command = process.argv[2];
  const arg = process.argv[3];

  async function main() {
    switch (command) {
      case 'get':
        if (!arg) {
          console.error('Usage: node fetch.js get <protocolId>');
          process.exit(1);
        }
        const idl = await fetchIDL(arg);
        console.log(JSON.stringify(idl, null, 2));
        break;

      case 'list':
        const idls = listIDLs();
        console.log(`Found ${idls.length} IDLs:\n`);
        for (const entry of idls) {
          console.log(`  ${entry.protocolId}: ${entry.url}`);
        }
        break;

      case 'search':
        const results = await searchIDLs(arg || '');
        console.log(`Found ${results.length} results:\n`);
        for (const r of results) {
          console.log(`  ${r.protocolId} (${r.name}): https://arweave.net/${r.txId}`);
        }
        break;

      default:
        console.log('Usage: node fetch.js <command> [args]');
        console.log('Commands:');
        console.log('  get <protocolId>  - Fetch IDL by protocol ID');
        console.log('  list              - List all uploaded IDLs');
        console.log('  search [query]    - Search IDLs on Arweave');
    }
  }

  main().catch(console.error);
}
