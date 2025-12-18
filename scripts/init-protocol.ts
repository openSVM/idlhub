/**
 * Initialize IDL Protocol on devnet
 */

import { Connection, Keypair, PublicKey, SystemProgram, Transaction, sendAndConfirmTransaction } from '@solana/web3.js';
import * as fs from 'fs';
import * as path from 'path';

const PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');

// Anchor discriminators (first 8 bytes of sha256("global:<instruction_name>"))
const INITIALIZE_DISCRIMINATOR = Buffer.from([175, 175, 109, 31, 13, 152, 155, 237]);

async function main() {
  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

  console.log('Initializing IDL Protocol on devnet...');
  console.log(`RPC: ${rpcUrl}`);

  const connection = new Connection(rpcUrl, 'confirmed');
  const keypairData = JSON.parse(fs.readFileSync(keypairPath, 'utf8'));
  const authority = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  console.log(`Authority: ${authority.publicKey.toBase58()}`);

  // Derive PDAs
  const [statePDA, stateBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('state')],
    PROGRAM_ID
  );

  console.log(`State PDA: ${statePDA.toBase58()}`);

  // Check if already initialized
  const stateAccount = await connection.getAccountInfo(statePDA);
  if (stateAccount) {
    console.log('Protocol already initialized!');
    console.log(`Account size: ${stateAccount.data.length} bytes`);
    return;
  }

  // Use authority as treasury for simplicity on devnet
  const treasury = authority.publicKey;
  console.log(`Treasury: ${treasury.toBase58()}`);

  // Build initialize instruction manually
  // Accounts: state, treasury, authority, system_program
  const keys = [
    { pubkey: statePDA, isSigner: false, isWritable: true },
    { pubkey: treasury, isSigner: false, isWritable: false },
    { pubkey: authority.publicKey, isSigner: true, isWritable: true },
    { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
  ];

  const data = INITIALIZE_DISCRIMINATOR;

  const ix = {
    programId: PROGRAM_ID,
    keys,
    data,
  };

  const tx = new Transaction().add(ix);

  console.log('Sending initialize transaction...');

  try {
    const sig = await sendAndConfirmTransaction(connection, tx, [authority], {
      commitment: 'confirmed',
    });
    console.log(`Success! Signature: ${sig}`);
    console.log(`Explorer: https://explorer.solana.com/tx/${sig}?cluster=devnet`);
  } catch (e: any) {
    console.error('Error:', e.message);
    if (e.logs) {
      console.log('Logs:', e.logs);
    }
  }

  // Verify
  const newStateAccount = await connection.getAccountInfo(statePDA);
  if (newStateAccount) {
    console.log('\nProtocol initialized successfully!');
    console.log(`State account size: ${newStateAccount.data.length} bytes`);
  }
}

main().catch(console.error);
