/**
 * Quick upload script for StableSwap AMM IDL
 */
import Irys from '@irys/sdk';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const IRYS_NODE = 'https://devnet.irys.xyz';
const SOLANA_RPC = 'https://api.devnet.solana.com';

async function uploadStableSwapAMM() {
  const walletPath = process.env.IRYS_WALLET || '/home/larp/.config/solana/id.json';

  console.log('Loading wallet from:', walletPath);
  const wallet = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));

  console.log('Connecting to Irys...');
  const irys = new Irys({
    url: IRYS_NODE,
    token: 'solana',
    key: wallet,
    config: { providerUrl: SOLANA_RPC },
  });

  const balance = await irys.getLoadedBalance();
  console.log(`Balance: ${irys.utils.fromAtomic(balance)} SOL\n`);

  // Load StableSwap AMM IDL
  const idlPath = path.join(__dirname, 'cache', 'stableswap-amm.json');
  const idlContent = fs.readFileSync(idlPath, 'utf-8');
  const idl = JSON.parse(idlContent);

  console.log('Uploading StableSwap AMM IDL...');
  console.log('- Name:', idl.name);
  console.log('- Version:', idl.version);
  console.log('- Program ID:', idl.metadata.address);
  console.log('- Size:', Buffer.byteLength(idlContent, 'utf-8'), 'bytes\n');

  const tags = [
    { name: 'App-Name', value: 'IDLHub' },
    { name: 'App-Version', value: '1.0.0' },
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Network', value: 'solana' },
    { name: 'Type', value: 'IDL' },
    { name: 'Protocol-Name', value: 'StableSwap AMM' },
    { name: 'Protocol-ID', value: 'stableswap-amm' },
    { name: 'Program-ID', value: idl.metadata.address },
    { name: 'IDL-Version', value: idl.version },
    { name: 'Category', value: 'dex' },
    { name: 'Repository', value: 'https://github.com/openSVM/ammasm' },
  ];

  const receipt = await irys.upload(idlContent, { tags });

  console.log('✅ Upload successful!');
  console.log('Transaction ID:', receipt.id);
  console.log('URL:', `https://devnet.irys.xyz/${receipt.id}`);
  console.log('Arweave URL:', `https://arweave.net/${receipt.id}`);

  // Update manifest
  const manifestPath = path.join(__dirname, 'manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  manifest.idls['stableswap-amm'] = {
    txId: receipt.id,
    name: 'StableSwap AMM',
    category: 'dex',
    repo: 'https://github.com/openSVM/ammasm',
    uploadedAt: new Date().toISOString(),
    size: receipt.size,
  };

  manifest.lastUpdated = new Date().toISOString();

  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log('\n✅ Manifest updated');

  // Also update public manifest
  const publicManifestPath = path.join(__dirname, '..', 'public', 'arweave', 'manifest.json');
  fs.writeFileSync(publicManifestPath, JSON.stringify(manifest, null, 2));
  console.log('✅ Public manifest updated');
}

uploadStableSwapAMM().catch(console.error);
