/**
 * Devnet Setup Script
 * Creates BAGS and PUMP token mints on devnet for testing the AMM
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createInitializeMintInstruction,
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  TOKEN_PROGRAM_ID,
  MINT_SIZE,
} from '../lib/spl-token-utils.js';

// Pure JS replacement for getMinimumBalanceForRentExemptMint
async function getMinimumBalanceForRentExemptMint(connection) {
  return await connection.getMinimumBalanceForRentExemption(MINT_SIZE);
}
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Devnet RPC
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Token decimals (same as mainnet)
const TOKEN_DECIMALS = 6;

// Initial liquidity amounts (1M each for pool)
const INITIAL_LIQUIDITY = 1_000_000_000_000n; // 1M tokens with 6 decimals

// Config file path
const CONFIG_PATH = path.join(__dirname, '../data/devnet-tokens.json');

async function main() {
  console.log('='.repeat(60));
  console.log('IDLHub Devnet Token Setup');
  console.log('='.repeat(60));

  // Load wallet
  const walletPath = process.env.WALLET_PATH || path.join(process.env.HOME, '.config/solana/id.json');
  if (!fs.existsSync(walletPath)) {
    console.error('Wallet not found at:', walletPath);
    console.error('Set WALLET_PATH env var or create default wallet with: solana-keygen new');
    process.exit(1);
  }

  const walletData = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(walletData));
  console.log('Wallet:', wallet.publicKey.toString());

  // Connect to devnet
  const connection = new Connection(DEVNET_RPC, 'confirmed');

  // Check balance
  const balance = await connection.getBalance(wallet.publicKey);
  console.log('Balance:', balance / 1e9, 'SOL');

  if (balance < 0.1 * 1e9) {
    console.log('\nInsufficient balance. Requesting airdrop...');
    const sig = await connection.requestAirdrop(wallet.publicKey, 2 * 1e9);
    await connection.confirmTransaction(sig);
    console.log('Airdrop complete!');
  }

  // Check if already configured
  if (fs.existsSync(CONFIG_PATH)) {
    const existing = JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf-8'));
    console.log('\nExisting devnet config found:');
    console.log('  BAGS:', existing.bagsMint);
    console.log('  PUMP:', existing.pumpMint);

    const args = process.argv.slice(2);
    if (!args.includes('--force')) {
      console.log('\nUse --force to recreate tokens');
      return existing;
    }
    console.log('\n--force flag set, recreating tokens...');
  }

  // Create BAGS mint
  console.log('\nCreating BAGS-IDL devnet mint...');
  const bagsMint = Keypair.generate();
  const bagsRent = await getMinimumBalanceForRentExemptMint(connection);

  const bagsTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: bagsMint.publicKey,
      space: MINT_SIZE,
      lamports: bagsRent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      bagsMint.publicKey,
      TOKEN_DECIMALS,
      wallet.publicKey, // mint authority
      wallet.publicKey, // freeze authority
    )
  );

  await sendAndConfirmTransaction(connection, bagsTx, [wallet, bagsMint]);
  console.log('  BAGS Mint:', bagsMint.publicKey.toString());

  // Create PUMP mint
  console.log('\nCreating PUMP-IDL devnet mint...');
  const pumpMint = Keypair.generate();

  const pumpTx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: wallet.publicKey,
      newAccountPubkey: pumpMint.publicKey,
      space: MINT_SIZE,
      lamports: bagsRent,
      programId: TOKEN_PROGRAM_ID,
    }),
    createInitializeMintInstruction(
      pumpMint.publicKey,
      TOKEN_DECIMALS,
      wallet.publicKey,
      wallet.publicKey,
    )
  );

  await sendAndConfirmTransaction(connection, pumpTx, [wallet, pumpMint]);
  console.log('  PUMP Mint:', pumpMint.publicKey.toString());

  // Create ATAs for wallet
  console.log('\nCreating token accounts...');
  const bagsAta = await getAssociatedTokenAddress(bagsMint.publicKey, wallet.publicKey);
  const pumpAta = await getAssociatedTokenAddress(pumpMint.publicKey, wallet.publicKey);

  const ataTx = new Transaction().add(
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      bagsAta,
      wallet.publicKey,
      bagsMint.publicKey,
    ),
    createAssociatedTokenAccountInstruction(
      wallet.publicKey,
      pumpAta,
      wallet.publicKey,
      pumpMint.publicKey,
    )
  );

  await sendAndConfirmTransaction(connection, ataTx, [wallet]);
  console.log('  BAGS ATA:', bagsAta.toString());
  console.log('  PUMP ATA:', pumpAta.toString());

  // Mint initial supply for liquidity
  console.log('\nMinting initial supply...');
  const mintTx = new Transaction().add(
    createMintToInstruction(
      bagsMint.publicKey,
      bagsAta,
      wallet.publicKey,
      INITIAL_LIQUIDITY,
    ),
    createMintToInstruction(
      pumpMint.publicKey,
      pumpAta,
      wallet.publicKey,
      INITIAL_LIQUIDITY,
    )
  );

  await sendAndConfirmTransaction(connection, mintTx, [wallet]);
  console.log('  Minted 1M BAGS and 1M PUMP to wallet');

  // Save config
  const config = {
    network: 'devnet',
    createdAt: new Date().toISOString(),
    bagsMint: bagsMint.publicKey.toString(),
    pumpMint: pumpMint.publicKey.toString(),
    mintAuthority: wallet.publicKey.toString(),
    decimals: TOKEN_DECIMALS,
    mainnetBags: '8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS',
    mainnetPump: '4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump',
    ammProgram: '3AMM53MsJZy2Jvf7PeHHga3bsGjWV4TSaYz29WUtcdje',
  };

  // Ensure data directory exists
  const dataDir = path.dirname(CONFIG_PATH);
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }

  fs.writeFileSync(CONFIG_PATH, JSON.stringify(config, null, 2));
  console.log('\nConfig saved to:', CONFIG_PATH);

  console.log('\n' + '='.repeat(60));
  console.log('Setup Complete!');
  console.log('='.repeat(60));
  console.log('\nDevnet Tokens:');
  console.log(`  BAGS-IDL: ${bagsMint.publicKey.toString()}`);
  console.log(`  PUMP-IDL: ${pumpMint.publicKey.toString()}`);
  console.log('\nNext steps:');
  console.log('  1. Run: npm run devnet:init-pool');
  console.log('  2. Start API: npm run api:start');
  console.log('  3. Test faucet: curl http://localhost:3000/api/faucet/<wallet>');

  return config;
}

main().catch(console.error);
