/**
 * Initialize BAGS-PUMP Pool on Devnet
 * Uses the Anchor StableSwap program (EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte)
 *
 * 4-step initialization process:
 * 1. create_pool - creates pool account
 * 2. init_bags_vault - creates BAGS vault
 * 3. init_pump_vault - creates PUMP vault
 * 4. init_lp_mint - creates LP mint and activates pool
 */

import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  SystemProgram,
  sendAndConfirmTransaction,
  SYSVAR_RENT_PUBKEY,
} from '@solana/web3.js';
import {
  TOKEN_PROGRAM_ID,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  unpackAccount,
} from '../lib/spl-token-utils.js';

// Pure JS replacement for getAccount
async function getAccount(connection, address) {
  const accountInfo = await connection.getAccountInfo(address);
  if (!accountInfo) throw new Error('Account not found');
  return unpackAccount(accountInfo.data);
}
import * as anchor from '@coral-xyz/anchor';
import BN from 'bn.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Devnet RPC
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Anchor StableSwap Program ID
const STABLESWAP_PROGRAM_ID = new PublicKey('EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte');

// Pool parameters
const AMPLIFICATION = new BN(1000); // Curve A parameter

// Config paths
const CONFIG_PATH = path.join(__dirname, '../data/devnet-tokens.json');
const POOL_CONFIG_PATH = path.join(__dirname, '../data/devnet-pool.json');

// Load the full IDL from the built target
// The deployed program uses camelCase (standard Anchor v0.29+)
const STABLESWAP_IDL = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../target/idl/idl_stableswap.json'), 'utf-8')
);

async function main() {
  console.log('='.repeat(60));
  console.log('IDLHub BAGS-PUMP Pool Initialization (Anchor StableSwap)');
  console.log('='.repeat(60));

  // Load token config
  if (!fs.existsSync(CONFIG_PATH)) {
    console.error('Devnet tokens not configured!');
    console.error('Run: npm run devnet:setup first');
    process.exit(1);
  }

  const tokenConfig = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
  console.log('\nToken Config:');
  console.log('  BAGS:', tokenConfig.bagsMint);
  console.log('  PUMP:', tokenConfig.pumpMint);

  // Load wallet
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME, '.config/solana/id.json');
  if (!fs.existsSync(walletPath)) {
    console.error('Wallet not found:', walletPath);
    process.exit(1);
  }

  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  console.log('\nWallet:', wallet.publicKey.toString());

  const connection = new Connection(DEVNET_RPC, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL');

  if (balance < 0.5 * 1e9) {
    console.log('\nRequesting airdrop...');
    try {
      const sig = await connection.requestAirdrop(wallet.publicKey, 2 * 1e9);
      await connection.confirmTransaction(sig);
      console.log('Airdrop received!');
    } catch (e) {
      console.log('Airdrop failed (rate limited), continuing...');
    }
  }

  const bagsMint = new PublicKey(tokenConfig.bagsMint);
  const pumpMint = new PublicKey(tokenConfig.pumpMint);

  // Derive PDAs - using simple seeds from the Anchor program
  const [poolPda, poolBump] = PublicKey.findProgramAddressSync(
    [Buffer.from('pool')],
    STABLESWAP_PROGRAM_ID
  );
  const [bagsVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('bags_vault')],
    STABLESWAP_PROGRAM_ID
  );
  const [pumpVault] = PublicKey.findProgramAddressSync(
    [Buffer.from('pump_vault')],
    STABLESWAP_PROGRAM_ID
  );
  const [lpMint] = PublicKey.findProgramAddressSync(
    [Buffer.from('lp_mint')],
    STABLESWAP_PROGRAM_ID
  );

  console.log('\nPDAs:');
  console.log('  Pool:', poolPda.toString());
  console.log('  BAGS Vault:', bagsVault.toString());
  console.log('  PUMP Vault:', pumpVault.toString());
  console.log('  LP Mint:', lpMint.toString());

  // Check if pool already exists
  const poolAccount = await connection.getAccountInfo(poolPda);
  if (poolAccount) {
    console.log('\nPool already exists!');
    console.log('Account size:', poolAccount.data.length, 'bytes');

    // Save config
    const poolConfig = {
      network: 'devnet',
      poolPda: poolPda.toString(),
      bagsMint: bagsMint.toString(),
      pumpMint: pumpMint.toString(),
      bagsVault: bagsVault.toString(),
      pumpVault: pumpVault.toString(),
      lpMint: lpMint.toString(),
      program: STABLESWAP_PROGRAM_ID.toString(),
    };
    fs.writeFileSync(POOL_CONFIG_PATH, JSON.stringify(poolConfig, null, 2));
    console.log('Pool config saved to:', POOL_CONFIG_PATH);
    return;
  }

  // Setup Anchor provider
  const anchorWallet = new anchor.Wallet(wallet);
  const provider = new anchor.AnchorProvider(connection, anchorWallet, {
    commitment: 'confirmed',
  });

  // Create program interface
  const program = new anchor.Program(STABLESWAP_IDL, STABLESWAP_PROGRAM_ID, provider);

  // Step 1: Create pool
  console.log('\n1. Creating pool...');
  try {
    const tx = await program.methods
      .createPool(AMPLIFICATION)
      .accounts({
        pool: poolPda,
        bagsMint: bagsMint,
        pumpMint: pumpMint,
        authority: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('   Pool created! Tx:', tx);
  } catch (err) {
    console.error('   Failed:', err.message);
    if (err.logs) err.logs.forEach(log => console.log('   ', log));
    process.exit(1);
  }

  // Step 2: Init BAGS vault
  console.log('\n2. Initializing BAGS vault...');
  try {
    const tx = await program.methods
      .initBagsVault()
      .accounts({
        pool: poolPda,
        bagsMint: bagsMint,
        bagsVault: bagsVault,
        authority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('   BAGS vault created! Tx:', tx);
  } catch (err) {
    console.error('   Failed:', err.message);
    if (err.logs) err.logs.forEach(log => console.log('   ', log));
    process.exit(1);
  }

  // Step 3: Init PUMP vault
  console.log('\n3. Initializing PUMP vault...');
  try {
    const tx = await program.methods
      .initPumpVault()
      .accounts({
        pool: poolPda,
        pumpMint: pumpMint,
        pumpVault: pumpVault,
        authority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('   PUMP vault created! Tx:', tx);
  } catch (err) {
    console.error('   Failed:', err.message);
    if (err.logs) err.logs.forEach(log => console.log('   ', log));
    process.exit(1);
  }

  // Step 4: Init LP mint
  console.log('\n4. Initializing LP mint...');
  try {
    const tx = await program.methods
      .initLpMint()
      .accounts({
        pool: poolPda,
        lpMint: lpMint,
        authority: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
        systemProgram: SystemProgram.programId,
      })
      .rpc();
    console.log('   LP mint created! Tx:', tx);
  } catch (err) {
    console.error('   Failed:', err.message);
    if (err.logs) err.logs.forEach(log => console.log('   ', log));
    process.exit(1);
  }

  // Step 5: Add initial liquidity
  console.log('\n5. Adding initial liquidity...');

  const walletBagsAta = await getAssociatedTokenAddress(bagsMint, wallet.publicKey);
  const walletPumpAta = await getAssociatedTokenAddress(pumpMint, wallet.publicKey);
  const walletLpAta = await getAssociatedTokenAddress(lpMint, wallet.publicKey);

  // Create LP ATA
  console.log('   Creating LP token account...');
  try {
    const createAtaTx = new Transaction().add(
      createAssociatedTokenAccountInstruction(
        wallet.publicKey,
        walletLpAta,
        wallet.publicKey,
        lpMint,
      )
    );
    await sendAndConfirmTransaction(connection, createAtaTx, [wallet]);
  } catch (e) {
    console.log('   LP ATA may already exist, continuing...');
  }

  // Add 100k of each token
  const initialAmount = new BN(100_000_000_000); // 100k with 6 decimals

  try {
    const tx = await program.methods
      .addLiquidity(initialAmount, initialAmount, new BN(0))
      .accounts({
        pool: poolPda,
        bagsVault: bagsVault,
        pumpVault: pumpVault,
        lpMint: lpMint,
        userBags: walletBagsAta,
        userPump: walletPumpAta,
        userLp: walletLpAta,
        user: wallet.publicKey,
        tokenProgram: TOKEN_PROGRAM_ID,
      })
      .rpc();
    console.log('   Liquidity added! Tx:', tx);
  } catch (err) {
    console.error('   Failed:', err.message);
    if (err.logs) err.logs.forEach(log => console.log('   ', log));
  }

  // Save pool config
  const poolConfig = {
    network: 'devnet',
    createdAt: new Date().toISOString(),
    poolPda: poolPda.toString(),
    bagsMint: bagsMint.toString(),
    pumpMint: pumpMint.toString(),
    bagsVault: bagsVault.toString(),
    pumpVault: pumpVault.toString(),
    lpMint: lpMint.toString(),
    program: STABLESWAP_PROGRAM_ID.toString(),
    initialLiquidity: 100000,
  };

  fs.writeFileSync(POOL_CONFIG_PATH, JSON.stringify(poolConfig, null, 2));

  console.log('\n' + '='.repeat(60));
  console.log('Pool Setup Complete!');
  console.log('='.repeat(60));
  console.log('\nPool:', poolPda.toString());
  console.log('LP Mint:', lpMint.toString());
  console.log('\nConfig saved to:', POOL_CONFIG_PATH);
}

main().catch(console.error);
