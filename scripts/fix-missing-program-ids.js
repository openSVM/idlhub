/**
 * Script to identify and fix IDLs missing program addresses
 *
 * Program address is REQUIRED for IDL verification and should be in:
 * - idl.metadata.address (Anchor v0.29+)
 * - idl.address (Anchor legacy)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ARWEAVE_GATEWAY = 'https://devnet.irys.xyz';

// Known program IDs for protocols that need fixing (VERIFIED ON-CHAIN)
// All addresses verified via RPC getAccountInfo - only executable programs
const KNOWN_FIXES = {
  // Major DeFi - verified addresses
  'drift': 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
  'meteora-amm': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'meteora-amm_052': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'meteora-lb_clmm': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'meteora-lb_clmm_090': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'orca-whirlpool': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  'orca-whirlpool_v2': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  'orca-lyf_orca': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  'raydium-amm_v3': 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  'raydium-amm_v3_with_swapv2': 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  'raydium-pool_v4': '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  'open-book-dex': 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
  'open-book-openbook_v2': 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb',
  'serum': '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',

  // Metaplex / NFT (verified)
  'metaplex-bubblegum': 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY',
  'metaplex-nft_candy_machine': 'cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ',
  'magiceden-m2': 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
  'magiceden-m3': 'M3mxk5W2tt27WGT7THox7PmgRDp4m6NEhL5xvxrBfS1',
  'merkle-distributor': 'MErKy6nZVoVAkryxAejJz2juifQ4ArgLgHmaJCQkU7N',

  // Native / SPL (verified)
  'native-compute-budget': 'ComputeBudget111111111111111111111111111111',
  'spl-associated-token-account': 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  'spl-memo': 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  'spl-name-service': 'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX',
  'spl-token-lending': 'LendZqTs7gn5CTSJU1jWKhKuVpjJGom45nnwPb2AMTi',
  'spl-token-swap': 'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8',

  // Lifinity variants (verified)
  'lifinity-dummy_idl': 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S',
  'lifinity-idl-0.1.1': 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S',

  // Other verified protocols
  'parrot': 'PARrVs6F5egaNuz8g6pKJyU4ze3eX5xGZCFb3GLiVvu',
  'saros': 'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr',

  // AeX402 AMM (pure eBPF C)
  'aex402-amm': '3AMM53MsJZy2Jvf7PeHHga3bsGjWV4TSaYz29WUtcdje',
};

async function main() {
  const manifestPath = path.join(__dirname, '../public/arweave/manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf-8'));

  console.log('Checking IDLs for missing program addresses...\n');

  const missing = [];
  const fixable = [];
  const hasAddress = [];

  for (const [name, data] of Object.entries(manifest.idls)) {
    try {
      const res = await fetch(`${ARWEAVE_GATEWAY}/${data.txId}`);
      const idl = await res.json();

      const address = idl.metadata?.address || idl.address;
      if (address) {
        hasAddress.push({ name, address });
      } else if (KNOWN_FIXES[name]) {
        fixable.push({ name, suggestedAddress: KNOWN_FIXES[name] });
      } else {
        missing.push(name);
      }
    } catch (err) {
      console.error(`Error fetching ${name}: ${err.message}`);
    }
  }

  console.log(`=== Summary ===`);
  console.log(`Has address: ${hasAddress.length}`);
  console.log(`Fixable (known address): ${fixable.length}`);
  console.log(`Missing (needs research): ${missing.length}`);
  console.log(`Total: ${hasAddress.length + fixable.length + missing.length}\n`);

  if (fixable.length > 0) {
    console.log(`=== FIXABLE IDLs (${fixable.length}) ===`);
    fixable.forEach(({ name, suggestedAddress }) => {
      console.log(`  ${name}: ${suggestedAddress}`);
    });
    console.log();
  }

  if (missing.length > 0) {
    console.log(`=== NEEDS RESEARCH (${missing.length}) ===`);
    missing.forEach(name => console.log(`  - ${name}`));
    console.log();
  }

  // Generate fix commands
  if (fixable.length > 0) {
    console.log(`=== To Fix ===`);
    console.log(`These IDLs need to be re-uploaded with the correct program address.`);
    console.log(`Add "address": "<program_id>" to the IDL JSON before uploading.\n`);
  }
}

main().catch(console.error);
