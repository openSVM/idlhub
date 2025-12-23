/**
 * Upload Bitquery IDL Library to Arweave via Irys
 * Usage: IRYS_WALLET=/path/to/wallet.json node upload-bitquery-idls.mjs
 */

import Irys from '@irys/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDL_LIB_DIR = path.join(process.env.HOME, 'aldrin', 'idl-lib');
const MANIFEST_FILE = path.join(__dirname, 'arweave', 'manifest.json');

const IRYS_NODE = process.env.IRYS_NODE || 'https://devnet.irys.xyz';
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';

const BASE_TAGS = [
  { name: 'App-Name', value: 'IDLHub' },
  { name: 'App-Version', value: '1.0.0' },
  { name: 'Content-Type', value: 'application/json' },
  { name: 'Network', value: 'solana' },
];

async function getIrys() {
  const walletPath = process.env.IRYS_WALLET;

  if (!walletPath) {
    throw new Error('IRYS_WALLET environment variable required');
  }

  const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

  const irys = new Irys({
    url: IRYS_NODE,
    token: 'solana',
    key: wallet,
    config: { providerUrl: SOLANA_RPC },
  });

  return irys;
}

async function uploadIDL(irys, idlPath) {
  const idlContent = fs.readFileSync(idlPath, 'utf-8');
  const idl = JSON.parse(idlContent);

  const relativePath = path.relative(IDL_LIB_DIR, idlPath);
  const parts = relativePath.split(path.sep);
  const protocolName = parts[0];
  const fileName = path.basename(idlPath, '.json');

  let protocolId = `${protocolName}-${fileName}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  if (protocolId.endsWith(`-${protocolName}`)) {
    protocolId = protocolId.replace(`-${protocolName}`, '');
  }

  const programId = idl.address || idl.metadata?.address || 'unknown';

  const tags = [
    ...BASE_TAGS,
    { name: 'Type', value: 'IDL' },
    { name: 'Protocol-Name', value: protocolName },
    { name: 'Protocol-ID', value: protocolId },
    { name: 'Program-ID', value: programId },
    { name: 'IDL-Version', value: idl.version || '0.1.0' },
    { name: 'Category', value: 'defi' },
    { name: 'Source', value: 'bitquery' },
  ];

  try {
    console.log(`Uploading: ${protocolId}`);
    const receipt = await irys.upload(idlContent, { tags });
    console.log(`  ✅ ${receipt.id}`);

    return {
      txId: receipt.id,
      name: protocolName,
      category: 'defi',
      uploadedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`);
    return null;
  }
}

async function main() {
  const irys = await getIrys();
  console.log(`Irys node: ${IRYS_NODE}\n`);

  const idlFiles = execSync(`find ${IDL_LIB_DIR} -name "*.json" -type f`, { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(f => f);

  console.log(`Found ${idlFiles.length} IDL files\n`);

  const manifest = fs.existsSync(MANIFEST_FILE)
    ? JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'))
    : { version: '1.0.0', gateway: IRYS_NODE, idls: {} };

  let uploaded = 0;
  let failed = 0;

  for (const idlPath of idlFiles) {
    const relativePath = path.relative(IDL_LIB_DIR, idlPath);
    const parts = relativePath.split(path.sep);
    const protocolName = parts[0];
    const fileName = path.basename(idlPath, '.json');

    let protocolId = `${protocolName}-${fileName}`.replace(/[^a-zA-Z0-9_-]/g, '-');
    if (protocolId.endsWith(`-${protocolName}`)) {
      protocolId = protocolId.replace(`-${protocolName}`, '');
    }

    const result = await uploadIDL(irys, idlPath);

    if (result) {
      manifest.idls[protocolId] = result;
      uploaded++;
    } else {
      failed++;
    }

    // Save manifest after each upload
    manifest.lastUpdated = new Date().toISOString();
    fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ Uploaded: ${uploaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${idlFiles.length}`);
  console.log(`\nManifest updated: ${MANIFEST_FILE}`);
}

main().catch(console.error);
