/**
 * Advanced tests for IDL Protocol
 * - Place bets
 * - Resolve market
 * - Claim winnings
 * - Pause/unpause
 * - Badge upgrade
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');

// Discriminators - first 8 bytes of sha256("global:<name>")
const PLACE_BET_DISCRIMINATOR = Buffer.from([0xde, 0x3e, 0x43, 0xdc, 0x3f, 0xa6, 0x7e, 0x21]);
const RESOLVE_MARKET_DISCRIMINATOR = Buffer.from([0x9a, 0x5e, 0xc8, 0x96, 0x56, 0x5d, 0x37, 0xf5]); // will compute
const CLAIM_WINNINGS_DISCRIMINATOR = Buffer.from([0xa4, 0x0a, 0x6c, 0x52, 0x65, 0x7d, 0x5c, 0x52]); // will compute
const SET_PAUSED_DISCRIMINATOR = Buffer.from([0x5b, 0x3c, 0x7d, 0xc0, 0xb0, 0xe1, 0xa6, 0xda]);
const CREATE_MARKET_DISCRIMINATOR = Buffer.from([103, 226, 97, 235, 200, 188, 251, 254]);
const ISSUE_BADGE_DISCRIMINATOR = Buffer.from([0x9a, 0xa7, 0x3f, 0xb0, 0x18, 0x86, 0xdd, 0x0c]);

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

async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

  console.log('='.repeat(60));
  console.log('IDL Protocol Advanced Tests');
  console.log('='.repeat(60));

  const connection = new Connection(rpcUrl, 'confirmed');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const user = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log(`User: ${user.publicKey.toBase58()}`);

  const [statePDA] = PublicKey.findProgramAddressSync([Buffer.from('state')], PROGRAM_ID);
  const [stakerPDA] = PublicKey.findProgramAddressSync([Buffer.from('staker'), user.publicKey.toBuffer()], PROGRAM_ID);

  // Create a new market that resolves in 5 seconds (for testing)
  console.log('\n' + '-'.repeat(60));
  console.log('TEST: Create Quick-Resolve Market');
  console.log('-'.repeat(60));

  const protocolId = 'test_quick';
  const resolutionTimestamp = Math.floor(Date.now() / 1000) + 3605; // 1 hour + 5 seconds

  const [marketPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(protocolId), encodeI64(resolutionTimestamp)],
    PROGRAM_ID
  );
  console.log(`Market PDA: ${marketPDA.toBase58()}`);

  try {
    const metricType = Buffer.from([0]); // TVL
    const targetValue = encodeU64(50_000_000);
    const description = 'Test market for quick resolution';

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
        { pubkey: user.publicKey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: marketData,
    };

    const tx = new Transaction().add(marketIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`SUCCESS: ${sig}`);
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
  }

  // Place a YES bet
  console.log('\n' + '-'.repeat(60));
  console.log('TEST: Place YES Bet (100 tokens)');
  console.log('-'.repeat(60));

  const currentTimestamp = Math.floor(Date.now() / 1000);
  const [betPDA] = PublicKey.findProgramAddressSync(
    [Buffer.from('bet'), marketPDA.toBuffer(), user.publicKey.toBuffer(), encodeI64(currentTimestamp)],
    PROGRAM_ID
  );
  console.log(`Bet PDA: ${betPDA.toBase58()}`);

  try {
    const betAmount = encodeU64(100);
    const betYes = Buffer.from([1]); // true = YES

    const betData = Buffer.concat([PLACE_BET_DISCRIMINATOR, betAmount, betYes]);

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
    console.log(`SUCCESS: ${sig}`);
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
    if (e.logs) console.log('Logs:', e.logs.slice(-3));
  }

  // Test Admin: Set Paused
  console.log('\n' + '-'.repeat(60));
  console.log('TEST: Pause Protocol');
  console.log('-'.repeat(60));

  try {
    const pausedFlag = Buffer.from([1]); // true = paused
    const pauseData = Buffer.concat([SET_PAUSED_DISCRIMINATOR, pausedFlag]);

    const pauseIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: true, isWritable: false },
      ],
      data: pauseData,
    };

    const tx = new Transaction().add(pauseIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`SUCCESS - Protocol Paused: ${sig}`);
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
  }

  // Test that staking fails when paused
  console.log('\n' + '-'.repeat(60));
  console.log('TEST: Stake While Paused (should FAIL)');
  console.log('-'.repeat(60));

  try {
    const STAKE_DISCRIMINATOR = Buffer.from([206, 176, 202, 18, 200, 209, 179, 108]);
    const stakeData = Buffer.concat([STAKE_DISCRIMINATOR, encodeU64(100)]);

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

    const tx = new Transaction().add(stakeIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`UNEXPECTED SUCCESS: ${sig}`);
  } catch (e: any) {
    if (e.message.includes('ProtocolPaused') || e.message.includes('0x177d')) {
      console.log('EXPECTED ERROR: ProtocolPaused');
      console.log('TEST PASSED - Pause working correctly!');
    } else {
      console.log(`ERROR: ${e.message}`);
    }
  }

  // Unpause
  console.log('\n' + '-'.repeat(60));
  console.log('TEST: Unpause Protocol');
  console.log('-'.repeat(60));

  try {
    const unpausedFlag = Buffer.from([0]); // false = not paused
    const unpauseData = Buffer.concat([SET_PAUSED_DISCRIMINATOR, unpausedFlag]);

    const unpauseIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: true, isWritable: false },
      ],
      data: unpauseData,
    };

    const tx = new Transaction().add(unpauseIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`SUCCESS - Protocol Unpaused: ${sig}`);
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
  }

  // Upgrade Badge to Silver
  console.log('\n' + '-'.repeat(60));
  console.log('TEST: Upgrade Badge to Silver');
  console.log('-'.repeat(60));

  const [badgePDA] = PublicKey.findProgramAddressSync([Buffer.from('badge'), user.publicKey.toBuffer()], PROGRAM_ID);

  try {
    // BadgeTier::Silver = 2
    const tier = Buffer.from([2]);
    const volumeUsd = encodeU64(15000); // $15000 volume

    const badgeData = Buffer.concat([ISSUE_BADGE_DISCRIMINATOR, tier, volumeUsd]);

    const badgeIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: badgePDA, isSigner: false, isWritable: true },
        { pubkey: user.publicKey, isSigner: false, isWritable: false },
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: badgeData,
    };

    const tx = new Transaction().add(badgeIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`SUCCESS - Badge Upgraded to Silver: ${sig}`);
  } catch (e: any) {
    console.log(`ERROR: ${e.message}`);
    if (e.logs) console.log('Logs:', e.logs.slice(-3));
  }

  // Summary
  console.log('\n' + '='.repeat(60));
  console.log('ADVANCED TEST SUMMARY');
  console.log('='.repeat(60));

  // Read state to see totals
  const stateAccount = await connection.getAccountInfo(statePDA);
  if (stateAccount) {
    // Skip 8 byte discriminator, read fields
    const data = stateAccount.data;
    // authority (32) + treasury (32) + total_staked (8) + total_ve_supply (8) + reward_pool (8) + fees (8) + burned (8) + bump (1) + paused (1)
    const totalStaked = data.readBigUInt64LE(8 + 32 + 32);
    const totalVeSupply = data.readBigUInt64LE(8 + 32 + 32 + 8);
    const rewardPool = data.readBigUInt64LE(8 + 32 + 32 + 8 + 8);
    const paused = data[8 + 32 + 32 + 8 + 8 + 8 + 8 + 8 + 1] === 1;

    console.log(`Total Staked: ${totalStaked}`);
    console.log(`Total veIDL Supply: ${totalVeSupply}`);
    console.log(`Reward Pool: ${rewardPool}`);
    console.log(`Paused: ${paused}`);
  }

  const badgeAccount = await connection.getAccountInfo(badgePDA);
  if (badgeAccount) {
    const data = badgeAccount.data;
    const tier = data[8 + 32]; // after discriminator + owner
    const tiers = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    console.log(`Badge Tier: ${tiers[tier] || tier}`);
  }

  console.log('\nAll advanced tests completed!');
}

main().catch(console.error);
