/**
 * Test IDL Protocol on devnet
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');

// Anchor discriminators (first 8 bytes of sha256("global:<name>"))
const STAKE_DISCRIMINATOR = Buffer.from([206, 176, 202, 18, 200, 209, 179, 108]);
const UNSTAKE_DISCRIMINATOR = Buffer.from([90, 95, 107, 42, 205, 124, 50, 225]);
const LOCK_FOR_VE_DISCRIMINATOR = Buffer.from([0x92, 0xed, 0x99, 0xad, 0xa3, 0xd4, 0x36, 0x4c]);
const CREATE_MARKET_DISCRIMINATOR = Buffer.from([103, 226, 97, 235, 200, 188, 251, 254]);
const ISSUE_BADGE_DISCRIMINATOR = Buffer.from([0x9a, 0xa7, 0x3f, 0xb0, 0x18, 0x86, 0xdd, 0x0c]);

// Helper to encode u64
function encodeU64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

// Helper to encode i64
function encodeI64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigInt64LE(BigInt(value));
  return buf;
}

// Helper to encode string with length prefix
function encodeString(str: string): Buffer {
  const strBuf = Buffer.from(str, 'utf8');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32LE(strBuf.length);
  return Buffer.concat([lenBuf, strBuf]);
}

async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

  console.log('='.repeat(60));
  console.log('IDL Protocol Test Suite');
  console.log('='.repeat(60));

  const connection = new Connection(rpcUrl, 'confirmed');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const user = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log(`User: ${user.publicKey.toBase58()}`);
  console.log(`Program: ${PROGRAM_ID.toBase58()}`);

  // Derive PDAs
  const [statePDA] = PublicKey.findProgramAddressSync([Buffer.from('state')], PROGRAM_ID);
  const [stakerPDA] = PublicKey.findProgramAddressSync([Buffer.from('staker'), user.publicKey.toBuffer()], PROGRAM_ID);

  console.log(`State PDA: ${statePDA.toBase58()}`);
  console.log(`Staker PDA: ${stakerPDA.toBase58()}`);

  // Test 1: Stake
  console.log('\n' + '-'.repeat(60));
  console.log('TEST 1: Stake 1000 tokens');
  console.log('-'.repeat(60));

  try {
    const stakeAmount = 1000;
    const stakeData = Buffer.concat([STAKE_DISCRIMINATOR, encodeU64(stakeAmount)]);

    const stakeIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: stakeData,
    };

    const stakeTx = new Transaction().add(stakeIx);
    const stakeSig = await sendAndConfirmTransaction(connection, stakeTx, [user], { commitment: 'confirmed' });
    console.log(`SUCCESS: ${stakeSig}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${stakeSig}?cluster=devnet`);
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
    if (e.logs) console.log('Logs:', e.logs.slice(-5));
  }

  // Check staker account
  const stakerAccount = await connection.getAccountInfo(stakerPDA);
  if (stakerAccount) {
    console.log(`Staker account created: ${stakerAccount.data.length} bytes`);
  }

  // Test 2: Lock for veIDL (1 week = 604800 seconds)
  console.log('\n' + '-'.repeat(60));
  console.log('TEST 2: Lock for veIDL (1 week)');
  console.log('-'.repeat(60));

  const [vePositionPDA] = PublicKey.findProgramAddressSync([Buffer.from('ve_position'), user.publicKey.toBuffer()], PROGRAM_ID);
  console.log(`vePosition PDA: ${vePositionPDA.toBase58()}`);

  try {
    const lockDuration = 604800; // 1 week in seconds
    const lockData = Buffer.concat([LOCK_FOR_VE_DISCRIMINATOR, encodeI64(lockDuration)]);

    const lockIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: false },
        { pubkey: vePositionPDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: lockData,
    };

    const lockTx = new Transaction().add(lockIx);
    const lockSig = await sendAndConfirmTransaction(connection, lockTx, [user], { commitment: 'confirmed' });
    console.log(`SUCCESS: ${lockSig}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${lockSig}?cluster=devnet`);
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
    if (e.logs) console.log('Logs:', e.logs.slice(-5));
  }

  // Test 3: Create prediction market
  console.log('\n' + '-'.repeat(60));
  console.log('TEST 3: Create Prediction Market');
  console.log('-'.repeat(60));

  const protocolId = 'raydium';
  const resolutionTimestamp = Math.floor(Date.now() / 1000) + 86400; // 24h from now

  const [marketPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(protocolId), encodeI64(resolutionTimestamp)],
    PROGRAM_ID
  );
  console.log(`Market PDA: ${marketPDA.toBase58()}`);

  try {
    // MetricType::Tvl = 0
    const metricType = Buffer.from([0]);
    const targetValue = encodeU64(100_000_000); // $100M TVL
    const description = 'Will Raydium TVL reach $100M?';

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
        { pubkey: user.publicKey, isSigner: false, isWritable: false }, // oracle = creator for test
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: marketData,
    };

    const marketTx = new Transaction().add(marketIx);
    const marketSig = await sendAndConfirmTransaction(connection, marketTx, [user], { commitment: 'confirmed' });
    console.log(`SUCCESS: ${marketSig}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${marketSig}?cluster=devnet`);
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
    if (e.logs) console.log('Logs:', e.logs.slice(-5));
  }

  // Test 4: Issue Badge
  console.log('\n' + '-'.repeat(60));
  console.log('TEST 4: Issue Bronze Badge');
  console.log('-'.repeat(60));

  const [badgePDA] = PublicKey.findProgramAddressSync([Buffer.from('badge'), user.publicKey.toBuffer()], PROGRAM_ID);
  console.log(`Badge PDA: ${badgePDA.toBase58()}`);

  try {
    // BadgeTier::Bronze = 1
    const tier = Buffer.from([1]);
    const volumeUsd = encodeU64(5000); // $5000 volume

    const badgeData = Buffer.concat([ISSUE_BADGE_DISCRIMINATOR, tier, volumeUsd]);

    const badgeIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: badgePDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: false, isWritable: false }, // recipient
        { pubkey: user.publicKey, isSigner: true, isWritable: true }, // authority
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: badgeData,
    };

    const badgeTx = new Transaction().add(badgeIx);
    const badgeSig = await sendAndConfirmTransaction(connection, badgeTx, [user], { commitment: 'confirmed' });
    console.log(`SUCCESS: ${badgeSig}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${badgeSig}?cluster=devnet`);
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
    if (e.logs) console.log('Logs:', e.logs.slice(-5));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('TEST SUMMARY');
  console.log('='.repeat(60));

  const finalState = await connection.getAccountInfo(statePDA);
  const finalStaker = await connection.getAccountInfo(stakerPDA);
  const finalVe = await connection.getAccountInfo(vePositionPDA);
  const finalBadge = await connection.getAccountInfo(badgePDA);

  console.log(`State account: ${finalState ? 'EXISTS' : 'NOT FOUND'}`);
  console.log(`Staker account: ${finalStaker ? 'EXISTS' : 'NOT FOUND'}`);
  console.log(`vePosition account: ${finalVe ? 'EXISTS' : 'NOT FOUND'}`);
  console.log(`Badge account: ${finalBadge ? 'EXISTS' : 'NOT FOUND'}`);

  console.log('\nProgram: https://explorer.solana.com/address/' + PROGRAM_ID.toBase58() + '?cluster=devnet');
}

main().catch(console.error);
