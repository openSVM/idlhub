/**
 * Issue volume badges to traders based on tracked volume
 *
 * Usage:
 *   npx ts-node scripts/track-volume.ts > volume-data.json
 *   npx ts-node scripts/issue-badges.ts volume-data.json
 *
 * Or pipe directly:
 *   npx ts-node scripts/track-volume.ts | npx ts-node scripts/issue-badges.ts
 *
 * Environment:
 *   RPC_URL - Solana RPC endpoint
 *   KEYPAIR_PATH - Path to admin keypair (must be protocol authority)
 */

import { Connection, Keypair, PublicKey, SystemProgram } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

const PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');

// Badge tiers matching the smart contract
enum BadgeTier {
  None = 0,
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Platinum = 4,
  Diamond = 5,
}

const TIER_THRESHOLDS: Record<string, { tier: BadgeTier; minVolume: number }> = {
  Diamond: { tier: BadgeTier.Diamond, minVolume: 1_000_000 },
  Platinum: { tier: BadgeTier.Platinum, minVolume: 500_000 },
  Gold: { tier: BadgeTier.Gold, minVolume: 100_000 },
  Silver: { tier: BadgeTier.Silver, minVolume: 10_000 },
  Bronze: { tier: BadgeTier.Bronze, minVolume: 1_000 },
};

interface TraderData {
  wallet: string;
  tier: string;
  volumeUSD: number;
  veIDL: number;
}

// Load IDL
const idlPath = path.join(__dirname, '../IDLs/idl-protocolIDL.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

function loadKeypair(keypairPath: string): Keypair {
  const data = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(data));
}

async function readInput(): Promise<TraderData[]> {
  // Check if file path provided as argument
  if (process.argv[2] && fs.existsSync(process.argv[2])) {
    const content = fs.readFileSync(process.argv[2], 'utf8');
    return JSON.parse(content);
  }

  // Otherwise read from stdin
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    terminal: false,
  });

  let data = '';
  for await (const line of rl) {
    data += line;
  }

  return JSON.parse(data);
}

async function main() {
  console.log('='.repeat(60));
  console.log('Volume Badge Issuance Script');
  console.log('='.repeat(60));

  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

  // Setup connection
  const connection = new Connection(rpcUrl, 'confirmed');
  const wallet = new Wallet(loadKeypair(keypairPath));
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
  const program = new Program(idl, PROGRAM_ID, provider);

  console.log(`\nRPC: ${rpcUrl}`);
  console.log(`Authority: ${wallet.publicKey.toBase58()}`);

  // Derive state PDA
  const [statePDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('state')],
    PROGRAM_ID
  );

  // Verify we are the authority
  try {
    const state = await program.account.protocolState.fetch(statePDA);
    if (!state.authority.equals(wallet.publicKey)) {
      console.error('\nERROR: Wallet is not protocol authority');
      console.error(`Expected: ${state.authority.toBase58()}`);
      console.error(`Got: ${wallet.publicKey.toBase58()}`);
      process.exit(1);
    }
  } catch (e) {
    console.error('\nERROR: Could not fetch protocol state. Is the protocol initialized?');
    process.exit(1);
  }

  // Read trader data
  console.log('\nReading trader data...');
  let traders: TraderData[];

  try {
    traders = await readInput();
  } catch (e) {
    console.error('ERROR: Could not parse trader data');
    console.error('Make sure input is valid JSON array from track-volume.ts');
    process.exit(1);
  }

  console.log(`Found ${traders.length} traders eligible for badges`);

  // Filter to only those with valid tiers
  const eligibleTraders = traders.filter(t => t.tier !== 'None' && TIER_THRESHOLDS[t.tier]);
  console.log(`${eligibleTraders.length} traders with valid badge tiers`);

  if (eligibleTraders.length === 0) {
    console.log('\nNo badges to issue.');
    return;
  }

  // Summary by tier
  console.log('\nBadge Distribution:');
  for (const [tierName] of Object.entries(TIER_THRESHOLDS)) {
    const count = eligibleTraders.filter(t => t.tier === tierName).length;
    if (count > 0) {
      console.log(`  ${tierName}: ${count}`);
    }
  }

  // Confirm before proceeding
  console.log('\n' + '-'.repeat(60));
  console.log('Ready to issue badges. This will cost SOL for account creation.');
  console.log('Press Ctrl+C to cancel, or wait 5 seconds to continue...');
  await new Promise(r => setTimeout(r, 5000));

  // Issue badges
  let issued = 0;
  let skipped = 0;
  let failed = 0;

  for (const trader of eligibleTraders) {
    const recipient = new PublicKey(trader.wallet);
    const tierInfo = TIER_THRESHOLDS[trader.tier];

    // Derive badge PDA
    const [badgePDA] = PublicKey.findProgramAddressSync(
      [Buffer.from('badge'), recipient.toBuffer()],
      PROGRAM_ID
    );

    // Check if badge already exists
    const existingBadge = await connection.getAccountInfo(badgePDA);
    if (existingBadge) {
      console.log(`[SKIP] ${trader.wallet.slice(0, 8)}... already has badge`);
      skipped++;
      continue;
    }

    console.log(`[ISSUE] ${trader.wallet.slice(0, 8)}... ${trader.tier} ($${trader.volumeUSD.toLocaleString()})`);

    try {
      const tx = await program.methods
        .issueBadge(
          { [trader.tier.toLowerCase()]: {} }, // BadgeTier enum
          Math.floor(trader.volumeUSD)
        )
        .accounts({
          state: statePDA,
          badge: badgePDA,
          recipient: recipient,
          authority: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();

      console.log(`        TX: ${tx}`);
      issued++;

      // Rate limit
      await new Promise(r => setTimeout(r, 500));
    } catch (e: any) {
      console.error(`        ERROR: ${e.message}`);
      failed++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Issued:  ${issued}`);
  console.log(`Skipped: ${skipped} (already had badge)`);
  console.log(`Failed:  ${failed}`);
}

main().catch(console.error);
