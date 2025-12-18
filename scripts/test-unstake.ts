/**
 * Test unstaking - should fail because tokens are locked for veIDL
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';

const PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');
const UNSTAKE_DISCRIMINATOR = Buffer.from([90, 95, 107, 42, 205, 124, 50, 225]);

function encodeU64(value: number | bigint): Buffer {
  const buf = Buffer.alloc(8);
  buf.writeBigUInt64LE(BigInt(value));
  return buf;
}

async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

  console.log('Testing Unstake (should FAIL - tokens locked for veIDL)');
  console.log('='.repeat(60));

  const connection = new Connection(rpcUrl, 'confirmed');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const user = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  const [statePDA] = PublicKey.findProgramAddressSync([Buffer.from('state')], PROGRAM_ID);
  const [stakerPDA] = PublicKey.findProgramAddressSync([Buffer.from('staker'), user.publicKey.toBuffer()], PROGRAM_ID);
  const [vePositionPDA] = PublicKey.findProgramAddressSync([Buffer.from('ve_position'), user.publicKey.toBuffer()], PROGRAM_ID);

  console.log(`User: ${user.publicKey.toBase58()}`);
  console.log(`State: ${statePDA.toBase58()}`);
  console.log(`Staker: ${stakerPDA.toBase58()}`);
  console.log(`vePosition: ${vePositionPDA.toBase58()}`);

  // Check vePosition exists
  const veAccount = await connection.getAccountInfo(vePositionPDA);
  console.log(`\nvePosition exists: ${veAccount ? 'YES' : 'NO'}`);

  if (!veAccount) {
    console.log('No vePosition - unstake should succeed');
  } else {
    console.log('vePosition exists - unstake should FAIL with TokensLocked error');
  }

  // Try to unstake 500 tokens
  console.log('\nAttempting to unstake 500 tokens...');

  try {
    const unstakeAmount = 500;
    const unstakeData = Buffer.concat([UNSTAKE_DISCRIMINATOR, encodeU64(unstakeAmount)]);

    const unstakeIx = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: true },
        { pubkey: vePositionPDA, isSigner: false, isWritable: false }, // optional account
        { pubkey: user.publicKey, isSigner: true, isWritable: true },
      ],
      data: unstakeData,
    };

    const tx = new Transaction().add(unstakeIx);
    const sig = await sendAndConfirmTransaction(connection, tx, [user], { commitment: 'confirmed' });
    console.log(`UNEXPECTED SUCCESS: ${sig}`);
  } catch (e: any) {
    if (e.message.includes('0x177f') || e.message.includes('TokensLocked') || e.message.includes('6015')) {
      console.log('EXPECTED ERROR: TokensLocked - tokens are locked for veIDL');
      console.log('TEST PASSED - Security check working correctly!');
    } else {
      console.log(`Error: ${e.message}`);
      if (e.logs) {
        console.log('\nLogs:');
        e.logs.slice(-5).forEach((log: string) => console.log(`  ${log}`));
      }
    }
  }
}

main().catch(console.error);
