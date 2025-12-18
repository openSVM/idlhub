/**
 * Test full market lifecycle: create -> bet -> resolve -> claim
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');

// Discriminators - first 8 bytes of sha256("global:<name>")
const CREATE_MARKET_DISCRIMINATOR = Buffer.from([103, 226, 97, 235, 200, 188, 251, 254]);
const PLACE_BET_DISCRIMINATOR = Buffer.from([0xde, 0x3e, 0x43, 0xdc, 0x3f, 0xa6, 0x7e, 0x21]);
const RESOLVE_MARKET_DISCRIMINATOR = Buffer.from([0x9b, 0x17, 0x50, 0xad, 0x2e, 0x4a, 0x17, 0xef]);
const CLAIM_WINNINGS_DISCRIMINATOR = Buffer.from([0xa1, 0xd7, 0x18, 0x3b, 0x0e, 0xec, 0xf2, 0xdd]);

function encodeU64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

function encodeI64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(value));
  return buf;
}

function encodeString(str: string): Buffer {
  const strBuf = Buffer.from(str, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBuf.length);
  return Buffer.concat([lenBuf, strBuf]);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

  console.log('='.repeat(60));
  console.log('Market Lifecycle Test');
  console.log('='.repeat(60));

  const connection = new Connection(rpcUrl, 'confirmed');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const user = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log(`User/Oracle: ${user.publicKey.toBase58()}`);

  const [statePDA] = PublicKey.findProgramAddressSync([Buffer.from('state')], PROGRAM_ID);
  const [stakerPDA] = PublicKey.findProgramAddressSync([Buffer.from('staker'), user.publicKey.toBuffer()], PROGRAM_ID);

  // Step 1: Create market that resolves soon (but > 1 hour as required)
  console.log('\n[1/4] Creating prediction market...');

  const protocolId = `lc${Date.now() % 1000000}`; // Short to fit 32 char limit
  // Resolution must be > 1 hour from now per program rules
  const resolutionTimestamp = Math.floor(Date.now() / 1000) + 7200; // 2 hours

  const [marketPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(protocolId), encodeI64(resolutionTimestamp)],
    PROGRAM_ID
  );

  try {
    const metricType = Buffer.from([4]); // Price
    const targetValue = encodeU64(100); // Target: 100
    const description = 'Lifecycle test market';

    const marketData = Buffer.concat([
      CREATE_MARKET_DISCRIMINATOR,
      encodeString(protocolId),
      metricType,
      targetValue,
      encodeI64(resolutionTimestamp),
      encodeString(description),
    ]);

    const marketIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: false },
        { pubkey: marketPDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: user.publicKey, isSigner: false, isWritable: false }, // oracle = creator
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: marketData,
    };

    const tx = new Transaction().add(marketIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`   Market created: ${marketPDA.toBase58()}`);
    console.log(`   TX: ${sig}`);
  } catch (e: any) {
    console.log(`   ERROR: ${e.message}`);
    if (e.logs) console.log('   Logs:', e.logs.slice(-3));
    return;
  }

  // Step 2: Place YES bet
  console.log('\n[2/4] Placing YES bet (100 tokens)...');

  const nonce = Date.now();
  const [betPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bet'), marketPDA.toBuffer(), user.publicKey.toBuffer(), encodeU64(nonce)],
    PROGRAM_ID
  );

  try {
    const betAmount = encodeU64(100);
    const betYes = Buffer.from([1]);
    const nonceBytes = encodeU64(nonce);

    const betData = Buffer.concat([PLACE_BET_DISCRIMINATOR, betAmount, betYes, nonceBytes]);

    const betIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: false },
        { pubkey: marketPDA, isSigner: false, isWritable: true },
        { pubkey: betPDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: false },
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: betData,
    };

    const tx = new Transaction().add(betIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`   Bet placed: ${betPDA.toBase58()}`);
    console.log(`   TX: ${sig}`);
  } catch (e: any) {
    console.log(`   ERROR: ${e.message}`);
    return;
  }

  // Step 3: Try to resolve (should fail - too early)
  console.log('\n[3/4] Attempting early resolution (should fail)...');

  try {
    const actualValue = encodeU64(150); // Actual: 150 > Target: 100 = YES wins
    const resolveData = Buffer.concat([RESOLVE_MARKET_DISCRIMINATOR, actualValue]);

    const resolveIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: marketPDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: true, isWritable: false }, // oracle
      ],
      data: resolveData,
    };

    const tx = new Transaction().add(resolveIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`   UNEXPECTED SUCCESS: ${sig}`);
  } catch (e: any) {
    if (e.message.includes('ResolutionTooEarly') || e.message.includes('0x1779')) {
      console.log(`   EXPECTED: ResolutionTooEarly error`);
      console.log(`   Market can only be resolved after: ${new Date(resolutionTimestamp * 1000).toISOString()}`);
    } else {
      console.log(`   ERROR: ${e.message}`);
    }
  }

  // Step 4: Try to claim (should fail - not resolved)
  console.log('\n[4/4] Attempting claim before resolution (should fail)...');

  try {
    const claimData = CLAIM_WINNINGS_DISCRIMINATOR;

    const claimIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: marketPDA, isSigner: false, isWritable: false },
        { pubkey: betPDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: true, isWritable: false },
      ],
      data: claimData,
    };

    const tx = new Transaction().add(claimIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`   UNEXPECTED SUCCESS: ${sig}`);
  } catch (e: any) {
    if (e.message.includes('MarketNotResolved') || e.message.includes('0x1777')) {
      console.log(`   EXPECTED: MarketNotResolved error`);
      console.log(`   Cannot claim until market is resolved`);
    } else {
      console.log(`   ERROR: ${e.message}`);
    }
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('LIFECYCLE TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Market: ${marketPDA.toBase58()}`);
  console.log(`Bet: ${betPDA.toBase58()}`);
  console.log(`Resolution time: ${new Date(resolutionTimestamp * 1000).toISOString()}`);
  console.log(`\nTo complete the test after resolution time:`);
  console.log(`1. Resolve: Call resolve_market with actual_value`);
  console.log(`2. Claim: Call claim_winnings to get payout`);
  console.log('\nExplorer:');
  console.log(`https://explorer.solana.com/address/${marketPDA.toBase58()}?cluster=devnet`);
}

main().catch(console.error);
