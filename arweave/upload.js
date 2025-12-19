/**
 * IDLHub Arweave Upload Script
 *
 * Uploads all IDL files to Arweave via Irys (Bundlr)
 * Creates a manifest file mapping program IDs to Arweave transaction IDs
 *
 * Usage:
 *   IRYS_WALLET=/path/to/wallet.json node upload.js
 *   IRYS_WALLET=/path/to/wallet.json node upload.js --dry-run
 */

import Irys from '@irys/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IDLS_DIR = path.join(__dirname, '..', 'IDLs');
const INDEX_FILE = path.join(__dirname, '..', 'index.json');
const MANIFEST_FILE = path.join(__dirname, 'manifest.json');

// Irys node for Solana (use 'https://node1.irys.xyz' for mainnet)
const IRYS_NODE = process.env.IRYS_NODE || 'https://devnet.irys.xyz';

// Tags for Arweave content discovery
const BASE_TAGS = [
  { name: 'App-Name', value: 'IDLHub' },
  { name: 'App-Version', value: '1.0.0' },
  { name: 'Content-Type', value: 'application/json' },
  { name: 'Network', value: 'solana' },
];

async function getIrys() {
  const walletPath = process.env.IRYS_WALLET;

  if (!walletPath) {
    throw new Error('IRYS_WALLET environment variable required (path to Solana wallet JSON)');
  }

  const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

  const irys = new Irys({
    url: IRYS_NODE,
    token: 'solana',
    key: wallet,
  });

  return irys;
}

async function uploadIDL(irys, idlPath, metadata, dryRun = false) {
  const idlContent = fs.readFileSync(idlPath, 'utf-8');
  const idl = JSON.parse(idlContent);

  // Extract program ID from IDL if available
  const programId = idl.metadata?.address || idl.address || metadata?.programId || 'unknown';

  const tags = [
    ...BASE_TAGS,
    { name: 'Type', value: 'IDL' },
    { name: 'Protocol-Name', value: metadata?.name || idl.name || path.basename(idlPath, '.json') },
    { name: 'Protocol-ID', value: metadata?.id || idl.name },
    { name: 'Program-ID', value: programId },
    { name: 'IDL-Version', value: idl.version || '0.1.0' },
    { name: 'Category', value: metadata?.category || 'defi' },
  ];

  if (dryRun) {
    const size = Buffer.byteLength(idlContent, 'utf-8');
    console.log(`[DRY RUN] Would upload: ${metadata?.name || idl.name} (${size} bytes)`);
    return { id: 'dry-run-' + Date.now(), size };
  }

  try {
    const receipt = await irys.upload(idlContent, { tags });
    console.log(`Uploaded ${metadata?.name || idl.name}: https://arweave.net/${receipt.id}`);
    return { id: receipt.id, size: receipt.size };
  } catch (error) {
    console.error(`Failed to upload ${idlPath}:`, error.message);
    throw error;
  }
}

async function uploadIndex(irys, manifest, dryRun = false) {
  const indexContent = JSON.stringify(manifest, null, 2);

  const tags = [
    ...BASE_TAGS,
    { name: 'Type', value: 'IDL-Index' },
    { name: 'Total-Protocols', value: String(Object.keys(manifest.idls).length) },
  ];

  if (dryRun) {
    console.log(`[DRY RUN] Would upload index manifest`);
    return { id: 'dry-run-index' };
  }

  const receipt = await irys.upload(indexContent, { tags });
  console.log(`Uploaded index: https://arweave.net/${receipt.id}`);
  return { id: receipt.id };
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');

  if (dryRun) {
    console.log('=== DRY RUN MODE ===\n');
  }

  // Load existing manifest or create new
  let manifest = {
    version: '1.0.0',
    network: 'solana',
    gateway: 'https://arweave.net',
    lastUpdated: new Date().toISOString(),
    indexTxId: null,
    idls: {},
  };

  if (fs.existsSync(MANIFEST_FILE)) {
    manifest = JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
    console.log(`Loaded existing manifest with ${Object.keys(manifest.idls).length} IDLs\n`);
  }

  // Load protocol index for metadata
  const index = JSON.parse(fs.readFileSync(INDEX_FILE, 'utf-8'));
  const protocolMap = {};
  for (const protocol of index.protocols) {
    protocolMap[protocol.id] = protocol;
  }

  // Get all IDL files
  const idlFiles = fs.readdirSync(IDLS_DIR).filter(f => f.endsWith('.json'));
  console.log(`Found ${idlFiles.length} IDL files\n`);

  // Initialize Irys (only if not dry run)
  let irys = null;
  if (!dryRun) {
    irys = await getIrys();
    const balance = await irys.getLoadedBalance();
    console.log(`Irys balance: ${irys.utils.fromAtomic(balance)} SOL\n`);
  }

  // Upload each IDL
  let uploaded = 0;
  let skipped = 0;
  let failed = 0;

  for (const file of idlFiles) {
    const idlPath = path.join(IDLS_DIR, file);
    const protocolId = file.replace('IDL.json', '').replace('.json', '');

    // Skip if already uploaded (unless forced)
    if (manifest.idls[protocolId] && !process.argv.includes('--force')) {
      console.log(`Skipping ${protocolId} (already uploaded)`);
      skipped++;
      continue;
    }

    const metadata = protocolMap[protocolId] || { id: protocolId, name: protocolId };

    try {
      const result = await uploadIDL(irys, idlPath, metadata, dryRun);
      manifest.idls[protocolId] = {
        txId: result.id,
        name: metadata.name,
        category: metadata.category,
        programId: metadata.programId,
        uploadedAt: new Date().toISOString(),
        size: result.size,
      };
      uploaded++;
    } catch (error) {
      console.error(`Failed: ${protocolId}`);
      failed++;
    }

    // Rate limit
    if (!dryRun) {
      await new Promise(r => setTimeout(r, 100));
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Uploaded: ${uploaded}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Failed: ${failed}`);

  // Upload the index manifest
  if (uploaded > 0 && !dryRun) {
    const indexResult = await uploadIndex(irys, manifest, dryRun);
    manifest.indexTxId = indexResult.id;
    manifest.lastUpdated = new Date().toISOString();
  }

  // Save manifest locally
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
  console.log(`\nManifest saved to ${MANIFEST_FILE}`);

  if (manifest.indexTxId) {
    console.log(`\nIndex URL: https://arweave.net/${manifest.indexTxId}`);
  }
}

main().catch(console.error);
