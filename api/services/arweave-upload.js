/**
 * Arweave Upload Service
 *
 * Handles server-side uploads to Arweave via Irys SDK
 * Clients only interact with IDLHub API - no direct Arweave access needed
 */

import Irys from '@irys/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const IRYS_NODE = process.env.IRYS_NODE || 'https://devnet.irys.xyz';
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';
const WALLET_PATH = process.env.IRYS_WALLET || path.join(process.env.HOME, '.config/solana/id.json');
const MANIFEST_FILE = path.join(__dirname, '..', '..', 'arweave', 'manifest.json');

// Base tags for all uploads
const BASE_TAGS = [
  { name: 'App-Name', value: 'IDLHub' },
  { name: 'App-Version', value: '1.0.0' },
  { name: 'Content-Type', value: 'application/json' },
  { name: 'Network', value: 'solana' },
];

let irysInstance = null;

/**
 * Initialize Irys SDK with server wallet
 */
async function getIrys() {
  if (irysInstance) {
    return irysInstance;
  }

  if (!fs.existsSync(WALLET_PATH)) {
    throw new Error(`Wallet not found at ${WALLET_PATH}. Set IRYS_WALLET env var.`);
  }

  const wallet = JSON.parse(fs.readFileSync(WALLET_PATH, 'utf-8'));

  irysInstance = new Irys({
    url: IRYS_NODE,
    token: 'solana',
    key: wallet,
    config: { providerUrl: SOLANA_RPC },
  });

  // Check balance
  const balance = await irysInstance.getLoadedBalance();
  console.log(`[Arweave] Irys balance: ${irysInstance.utils.fromAtomic(balance)} SOL`);

  return irysInstance;
}

/**
 * Load the manifest file
 */
function loadManifest() {
  if (fs.existsSync(MANIFEST_FILE)) {
    return JSON.parse(fs.readFileSync(MANIFEST_FILE, 'utf-8'));
  }
  return {
    version: '1.0.0',
    network: 'solana',
    gateway: 'https://devnet.irys.xyz',
    lastUpdated: new Date().toISOString(),
    indexTxId: null,
    idls: {},
  };
}

/**
 * Save the manifest file
 */
function saveManifest(manifest) {
  manifest.lastUpdated = new Date().toISOString();
  fs.writeFileSync(MANIFEST_FILE, JSON.stringify(manifest, null, 2));
}

/**
 * Upload IDL to Arweave
 *
 * @param {Object} idl - The IDL object to upload
 * @param {Object} metadata - Protocol metadata (name, programId, category)
 * @returns {Object} Upload result with txId and URL
 */
export async function uploadIDL(idl, metadata) {
  const irys = await getIrys();
  const idlContent = JSON.stringify(idl, null, 2);

  // Extract info from IDL
  const programId = idl.metadata?.address || idl.address || metadata?.programId || 'unknown';
  const protocolName = metadata?.name || idl.name || 'unknown';
  const protocolId = metadata?.id || idl.name || protocolName;

  const tags = [
    ...BASE_TAGS,
    { name: 'Type', value: 'IDL' },
    { name: 'Protocol-Name', value: protocolName },
    { name: 'Protocol-ID', value: protocolId },
    { name: 'Program-ID', value: programId },
    { name: 'IDL-Version', value: idl.version || '0.1.0' },
    { name: 'Category', value: metadata?.category || 'defi' },
  ];

  // Upload to Arweave
  const receipt = await irys.upload(idlContent, { tags });

  // Update manifest
  const manifest = loadManifest();
  manifest.idls[protocolId] = {
    txId: receipt.id,
    name: protocolName,
    category: metadata?.category || 'defi',
    programId: programId,
    uploadedAt: new Date().toISOString(),
    size: receipt.size,
  };
  saveManifest(manifest);

  console.log(`[Arweave] Uploaded ${protocolName}: ${manifest.gateway}/${receipt.id}`);

  return {
    txId: receipt.id,
    url: `${manifest.gateway}/${receipt.id}`,
    size: receipt.size,
    protocolId,
  };
}

/**
 * Check if an IDL is already uploaded
 */
export function isUploaded(protocolId) {
  const manifest = loadManifest();
  const entry = manifest.idls[protocolId];
  return entry && entry.txId && !entry.txId.startsWith('dry-run');
}

/**
 * Get upload status for a protocol
 */
export function getUploadStatus(protocolId) {
  const manifest = loadManifest();
  const entry = manifest.idls[protocolId];

  if (!entry) {
    return { uploaded: false };
  }

  return {
    uploaded: !entry.txId.startsWith('dry-run'),
    txId: entry.txId,
    url: `${manifest.gateway}/${entry.txId}`,
    uploadedAt: entry.uploadedAt,
  };
}

/**
 * Get Irys balance
 */
export async function getBalance() {
  const irys = await getIrys();
  const balance = await irys.getLoadedBalance();
  return {
    balance: irys.utils.fromAtomic(balance),
    unit: 'SOL',
  };
}

/**
 * Estimate upload cost
 */
export async function estimateCost(sizeBytes) {
  const irys = await getIrys();
  const price = await irys.getPrice(sizeBytes);
  return {
    cost: irys.utils.fromAtomic(price),
    unit: 'SOL',
    sizeBytes,
  };
}

export default {
  uploadIDL,
  isUploaded,
  getUploadStatus,
  getBalance,
  estimateCost,
};
