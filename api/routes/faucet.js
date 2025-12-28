/**
 * Devnet Faucet API
 * Airdrops devnet BAGS/PUMP tokens to users who hold mainnet tokens
 */

import { Router } from 'express';
import {
  Connection,
  Keypair,
  PublicKey,
  Transaction,
  sendAndConfirmTransaction,
} from '@solana/web3.js';
import {
  createAssociatedTokenAccountInstruction,
  createMintToInstruction,
  getAssociatedTokenAddress,
  unpackAccount,
  TOKEN_PROGRAM_ID,
} from '../../lib/spl-token-utils.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Pure JS replacement for getAccount
async function getAccount(connection, address) {
  const accountInfo = await connection.getAccountInfo(address);
  if (!accountInfo) throw new Error('Account not found');
  return unpackAccount(accountInfo.data);
}

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const router = Router();

// RPC endpoints
const MAINNET_RPC = 'https://solana-rpc-proxy.0xrinegade.workers.dev';
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Mainnet token addresses
const MAINNET_BAGS = '8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS';
const MAINNET_PUMP = '4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump';

// Airdrop amounts based on mainnet holdings
const AIRDROP_TIERS = [
  { minHolding: 1_000_000_000_000n, airdrop: 100_000_000_000n }, // 1M+ mainnet = 100k devnet
  { minHolding: 100_000_000_000n, airdrop: 50_000_000_000n },    // 100k+ = 50k
  { minHolding: 10_000_000_000n, airdrop: 20_000_000_000n },     // 10k+ = 20k
  { minHolding: 1_000_000_000n, airdrop: 10_000_000_000n },      // 1k+ = 10k
  { minHolding: 100_000_000n, airdrop: 5_000_000_000n },         // 100+ = 5k
  { minHolding: 1_000_000n, airdrop: 1_000_000_000n },           // 1+ = 1k
];

// Default airdrop for non-holders (for testing)
const DEFAULT_AIRDROP = 100_000_000n; // 100 tokens

// Rate limiting: one claim per wallet per hour
const claimCooldowns = new Map();
const COOLDOWN_MS = 60 * 60 * 1000; // 1 hour

// Load devnet config
function loadConfig() {
  const configPath = path.join(__dirname, '../../data/devnet-tokens.json');
  if (!fs.existsSync(configPath)) {
    return null;
  }
  return JSON.parse(fs.readFileSync(configPath, 'utf-8'));
}

// Load mint authority wallet
function loadMintAuthority() {
  const walletPath = process.env.FAUCET_WALLET || path.join(process.env.HOME, '.config/solana/id.json');
  if (!fs.existsSync(walletPath)) {
    return null;
  }
  const data = JSON.parse(fs.readFileSync(walletPath, 'utf-8'));
  return Keypair.fromSecretKey(Uint8Array.from(data));
}

// Check mainnet token balance
async function getMainnetBalance(wallet, mint) {
  try {
    const connection = new Connection(MAINNET_RPC, 'confirmed');
    const walletPubkey = new PublicKey(wallet);
    const mintPubkey = new PublicKey(mint);

    const ata = await getAssociatedTokenAddress(mintPubkey, walletPubkey);
    const account = await getAccount(connection, ata);
    return account.amount;
  } catch (err) {
    // Account doesn't exist = 0 balance
    return 0n;
  }
}

// Calculate airdrop amount based on mainnet holdings
function calculateAirdrop(bagsBalance, pumpBalance) {
  const totalBalance = bagsBalance + pumpBalance;

  for (const tier of AIRDROP_TIERS) {
    if (totalBalance >= tier.minHolding) {
      return tier.airdrop;
    }
  }

  return DEFAULT_AIRDROP;
}

// GET /api/faucet/config - Get faucet configuration
router.get('/config', (req, res) => {
  const config = loadConfig();
  if (!config) {
    return res.status(503).json({
      error: 'Faucet not configured',
      message: 'Run npm run devnet:setup to create devnet tokens',
    });
  }

  res.json({
    network: 'devnet',
    tokens: {
      bags: {
        devnet: config.bagsMint,
        mainnet: MAINNET_BAGS,
        symbol: 'BAGS-IDL',
        decimals: config.decimals,
      },
      pump: {
        devnet: config.pumpMint,
        mainnet: MAINNET_PUMP,
        symbol: 'PUMP-IDL',
        decimals: config.decimals,
      },
    },
    tiers: AIRDROP_TIERS.map(t => ({
      minHolding: (Number(t.minHolding) / 1e6).toLocaleString(),
      airdrop: (Number(t.airdrop) / 1e6).toLocaleString(),
    })),
    defaultAirdrop: (Number(DEFAULT_AIRDROP) / 1e6).toLocaleString(),
    cooldownMinutes: COOLDOWN_MS / 60000,
  });
});

// GET /api/faucet/check/:wallet - Check wallet eligibility
router.get('/check/:wallet', async (req, res) => {
  const { wallet } = req.params;

  try {
    // Validate wallet address
    new PublicKey(wallet);
  } catch {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const config = loadConfig();
  if (!config) {
    return res.status(503).json({ error: 'Faucet not configured' });
  }

  try {
    // Check mainnet balances
    const [bagsBalance, pumpBalance] = await Promise.all([
      getMainnetBalance(wallet, MAINNET_BAGS),
      getMainnetBalance(wallet, MAINNET_PUMP),
    ]);

    const airdropAmount = calculateAirdrop(bagsBalance, pumpBalance);

    // Check cooldown
    const lastClaim = claimCooldowns.get(wallet);
    const now = Date.now();
    const canClaim = !lastClaim || (now - lastClaim) > COOLDOWN_MS;
    const cooldownRemaining = lastClaim ? Math.max(0, COOLDOWN_MS - (now - lastClaim)) : 0;

    res.json({
      wallet,
      mainnet: {
        bags: (Number(bagsBalance) / 1e6).toFixed(2),
        pump: (Number(pumpBalance) / 1e6).toFixed(2),
        total: (Number(bagsBalance + pumpBalance) / 1e6).toFixed(2),
      },
      airdrop: {
        bags: (Number(airdropAmount) / 1e6).toFixed(2),
        pump: (Number(airdropAmount) / 1e6).toFixed(2),
        total: (Number(airdropAmount * 2n) / 1e6).toFixed(2),
      },
      canClaim,
      cooldownRemaining: Math.ceil(cooldownRemaining / 60000), // minutes
      tier: bagsBalance + pumpBalance >= AIRDROP_TIERS[0].minHolding ? 'whale' :
            bagsBalance + pumpBalance >= AIRDROP_TIERS[2].minHolding ? 'holder' :
            bagsBalance + pumpBalance > 0n ? 'small' : 'new',
    });
  } catch (err) {
    console.error('Check error:', err);
    res.status(500).json({ error: err.message });
  }
});

// POST /api/faucet/claim - Claim airdrop
router.post('/claim', async (req, res) => {
  const { wallet } = req.body;

  if (!wallet) {
    return res.status(400).json({ error: 'Wallet address required' });
  }

  let walletPubkey;
  try {
    walletPubkey = new PublicKey(wallet);
  } catch {
    return res.status(400).json({ error: 'Invalid wallet address' });
  }

  const config = loadConfig();
  if (!config) {
    return res.status(503).json({ error: 'Faucet not configured' });
  }

  const mintAuthority = loadMintAuthority();
  if (!mintAuthority) {
    return res.status(503).json({ error: 'Mint authority not configured' });
  }

  // Check cooldown
  const lastClaim = claimCooldowns.get(wallet);
  const now = Date.now();
  if (lastClaim && (now - lastClaim) < COOLDOWN_MS) {
    const remaining = Math.ceil((COOLDOWN_MS - (now - lastClaim)) / 60000);
    return res.status(429).json({
      error: 'Cooldown active',
      message: `Please wait ${remaining} minutes before claiming again`,
      cooldownRemaining: remaining,
    });
  }

  try {
    // Check mainnet balances
    const [bagsBalance, pumpBalance] = await Promise.all([
      getMainnetBalance(wallet, MAINNET_BAGS),
      getMainnetBalance(wallet, MAINNET_PUMP),
    ]);

    const airdropAmount = calculateAirdrop(bagsBalance, pumpBalance);

    // Connect to devnet
    const connection = new Connection(DEVNET_RPC, 'confirmed');

    const bagsMint = new PublicKey(config.bagsMint);
    const pumpMint = new PublicKey(config.pumpMint);

    // Get or create ATAs
    const bagsAta = await getAssociatedTokenAddress(bagsMint, walletPubkey);
    const pumpAta = await getAssociatedTokenAddress(pumpMint, walletPubkey);

    const tx = new Transaction();

    // Check if ATAs exist, create if not
    try {
      await getAccount(connection, bagsAta);
    } catch {
      tx.add(createAssociatedTokenAccountInstruction(
        mintAuthority.publicKey,
        bagsAta,
        walletPubkey,
        bagsMint,
      ));
    }

    try {
      await getAccount(connection, pumpAta);
    } catch {
      tx.add(createAssociatedTokenAccountInstruction(
        mintAuthority.publicKey,
        pumpAta,
        walletPubkey,
        pumpMint,
      ));
    }

    // Mint tokens
    tx.add(
      createMintToInstruction(bagsMint, bagsAta, mintAuthority.publicKey, airdropAmount),
      createMintToInstruction(pumpMint, pumpAta, mintAuthority.publicKey, airdropAmount),
    );

    // Send transaction
    const signature = await sendAndConfirmTransaction(connection, tx, [mintAuthority]);

    // Set cooldown
    claimCooldowns.set(wallet, now);

    res.json({
      success: true,
      signature,
      airdrop: {
        bags: (Number(airdropAmount) / 1e6).toFixed(2),
        pump: (Number(airdropAmount) / 1e6).toFixed(2),
      },
      mainnetHoldings: {
        bags: (Number(bagsBalance) / 1e6).toFixed(2),
        pump: (Number(pumpBalance) / 1e6).toFixed(2),
      },
      message: bagsBalance + pumpBalance > 0n
        ? `Airdrop sent! Thank you for holding IDL tokens on mainnet.`
        : `Test airdrop sent! Hold BAGS or PUMP on mainnet for larger airdrops.`,
    });

  } catch (err) {
    console.error('Claim error:', err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/faucet/stats - Faucet statistics
router.get('/stats', (req, res) => {
  const config = loadConfig();

  res.json({
    configured: !!config,
    totalClaims: claimCooldowns.size,
    activeCooldowns: Array.from(claimCooldowns.entries())
      .filter(([_, time]) => Date.now() - time < COOLDOWN_MS).length,
  });
});

export default router;
