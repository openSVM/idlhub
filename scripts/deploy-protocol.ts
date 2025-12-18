/**
 * Deploy and initialize IDL Protocol on Solana
 *
 * Usage:
 *   npx ts-node scripts/deploy-protocol.ts
 *
 * Environment:
 *   RPC_URL - Solana RPC endpoint (default: devnet)
 *   KEYPAIR_PATH - Path to deployer keypair (default: ~/.config/solana/id.json)
 *   TREASURY - Treasury pubkey for fee collection
 */

import { Connection, Keypair, PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet, BN } from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID, getAssociatedTokenAddress } from '@solana/spl-token';
import * as fs from 'fs';
import * as path from 'path';

// Constants from the program
const IDL_TOKEN_MINT = new PublicKey('4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump');
const PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');

// Load IDL
const idlPath = path.join(__dirname, '../IDLs/idl-protocolIDL.json');
const idl = JSON.parse(fs.readFileSync(idlPath, 'utf8'));

interface DeployConfig {
  rpcUrl: string;
  keypairPath: string;
  treasury: PublicKey;
}

function getConfig(): DeployConfig {
  const rpcUrl = process.env.RPC_URL || 'https://api.devnet.solana.com';
  const keypairPath = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

  if (!process.env.TREASURY) {
    console.error('ERROR: TREASURY environment variable required');
    console.error('Set it to the pubkey that will receive protocol fees');
    process.exit(1);
  }

  const treasury = new PublicKey(process.env.TREASURY);

  return { rpcUrl, keypairPath, treasury };
}

function loadKeypair(path: string): Keypair {
  const keypairData = JSON.parse(fs.readFileSync(path, 'utf8'));
  return Keypair.fromSecretKey(Uint8Array.from(keypairData));
}

async function findPDA(seeds: Buffer[], programId: PublicKey): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

async function main() {
  console.log('='.repeat(60));
  console.log('IDL Protocol Deployment Script');
  console.log('='.repeat(60));

  const config = getConfig();
  console.log(`\nRPC: ${config.rpcUrl}`);
  console.log(`Treasury: ${config.treasury.toBase58()}`);

  // Setup connection and wallet
  const connection = new Connection(config.rpcUrl, 'confirmed');
  const wallet = new Wallet(loadKeypair(config.keypairPath));
  const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });

  console.log(`Deployer: ${wallet.publicKey.toBase58()}`);

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log(`Balance: ${balance / 1e9} SOL`);

  if (balance < 0.1 * 1e9) {
    console.error('ERROR: Insufficient balance. Need at least 0.1 SOL');
    process.exit(1);
  }

  // Create program interface
  const program = new Program(idl, PROGRAM_ID, provider);

  // Derive PDAs
  const [statePDA] = await findPDA([Buffer.from('state')], PROGRAM_ID);
  const [stakeVaultPDA] = await findPDA([Buffer.from('stake_vault')], PROGRAM_ID);
  const [rewardVaultPDA] = await findPDA([Buffer.from('reward_vault')], PROGRAM_ID);

  console.log('\nPDAs:');
  console.log(`  State:        ${statePDA.toBase58()}`);
  console.log(`  Stake Vault:  ${stakeVaultPDA.toBase58()}`);
  console.log(`  Reward Vault: ${rewardVaultPDA.toBase58()}`);

  // Check if already initialized
  const stateAccount = await connection.getAccountInfo(statePDA);

  if (stateAccount) {
    console.log('\n[!] Protocol already initialized');
    console.log('    Checking vault status...');

    const stakeVault = await connection.getAccountInfo(stakeVaultPDA);
    const rewardVault = await connection.getAccountInfo(rewardVaultPDA);

    if (!stakeVault || !rewardVault) {
      console.log('    Vaults not initialized, initializing...');
      await initializeVaults(program, wallet.publicKey, statePDA, stakeVaultPDA, rewardVaultPDA);
    } else {
      console.log('    Vaults already initialized');
    }

    await printProtocolState(program, statePDA);
    return;
  }

  // Step 1: Initialize protocol
  console.log('\n[1/2] Initializing protocol...');

  try {
    const tx1 = await program.methods
      .initialize()
      .accounts({
        state: statePDA,
        idlMint: IDL_TOKEN_MINT,
        treasury: config.treasury,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log(`    TX: ${tx1}`);
    console.log('    Waiting for confirmation...');
    await connection.confirmTransaction(tx1, 'confirmed');
    console.log('    Done!');
  } catch (e: any) {
    console.error(`    ERROR: ${e.message}`);
    process.exit(1);
  }

  // Step 2: Initialize vaults
  console.log('\n[2/2] Initializing vaults...');
  await initializeVaults(program, wallet.publicKey, statePDA, stakeVaultPDA, rewardVaultPDA);

  // Print final state
  await printProtocolState(program, statePDA);

  console.log('\n' + '='.repeat(60));
  console.log('DEPLOYMENT COMPLETE');
  console.log('='.repeat(60));
  console.log('\nNext steps:');
  console.log('1. Verify the program on Solana Explorer');
  console.log('2. Test staking with a small amount');
  console.log('3. Create first prediction market');
  console.log('4. Run volume tracking: npx ts-node scripts/track-volume.ts');
}

async function initializeVaults(
  program: Program<any>,
  authority: PublicKey,
  statePDA: PublicKey,
  stakeVaultPDA: PublicKey,
  rewardVaultPDA: PublicKey
) {
  try {
    const tx = await program.methods
      .initializeVaults()
      .accounts({
        state: statePDA,
        stakeVault: stakeVaultPDA,
        rewardVault: rewardVaultPDA,
        idlMint: IDL_TOKEN_MINT,
        authority: authority,
        systemProgram: SystemProgram.programId,
        tokenProgram: TOKEN_PROGRAM_ID,
        rent: SYSVAR_RENT_PUBKEY,
      })
      .rpc();

    console.log(`    TX: ${tx}`);
    console.log('    Done!');
  } catch (e: any) {
    console.error(`    ERROR: ${e.message}`);
    throw e;
  }
}

async function printProtocolState(program: Program<any>, statePDA: PublicKey) {
  console.log('\n' + '-'.repeat(60));
  console.log('PROTOCOL STATE');
  console.log('-'.repeat(60));

  try {
    const state = await program.account.protocolState.fetch(statePDA);

    console.log(`Authority:     ${state.authority.toBase58()}`);
    console.log(`Treasury:      ${state.treasury.toBase58()}`);
    console.log(`IDL Mint:      ${state.idlMint.toBase58()}`);
    console.log(`Total Staked:  ${state.totalStaked.toString()}`);
    console.log(`Total veIDL:   ${state.totalVeSupply.toString()}`);
    console.log(`Reward Pool:   ${state.rewardPool.toString()}`);
    console.log(`Fees Collected: ${state.totalFeesCollected.toString()}`);
    console.log(`Total Burned:  ${state.totalBurned.toString()}`);
    console.log(`Paused:        ${state.paused}`);
  } catch (e: any) {
    console.error(`Error fetching state: ${e.message}`);
  }
}

main().catch(console.error);
