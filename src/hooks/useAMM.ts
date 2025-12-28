import { useState, useEffect, useCallback } from 'react';
import { useWallet } from '../context/WalletContext';
import { PublicKey, Transaction, TransactionInstruction, SystemProgram } from '@solana/web3.js';
import * as anchor from '@coral-xyz/anchor';
import { PROGRAM_ID, DISCRIMINATORS, CONSTANTS } from '../amm-types';

// Token Program constants - replacing @solana/spl-token to eliminate bigint-buffer vulnerability
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

// Pure JS implementation of getAssociatedTokenAddress (no native bindings)
async function getAssociatedTokenAddress(
  mint: PublicKey,
  owner: PublicKey,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
): Promise<PublicKey> {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  );
  return address;
}

const BN = anchor.BN;

// Lazy initialization to avoid module-scope side effects (breaks Vite builds)
let _TOKEN0_MINT: PublicKey;
let _TOKEN1_MINT: PublicKey;
let _tokensInitialized = false;

// Try to load devnet tokens from config, fallback to defaults
const initTokens = async () => {
  if (_tokensInitialized) return;

  try {
    const res = await fetch('/api/faucet/config');
    if (res.ok) {
      const config = await res.json();
      if (config.tokens?.bags?.devnet && config.tokens?.pump?.devnet) {
        _TOKEN0_MINT = new PublicKey(config.tokens.bags.devnet);
        _TOKEN1_MINT = new PublicKey(config.tokens.pump.devnet);
        _tokensInitialized = true;
        console.log('AMM: Using devnet BAGS/PUMP tokens');
        return;
      }
    }
  } catch {
    // Fallback to defaults
  }

  // Fallback: use mainnet BAGS/PUMP
  _TOKEN0_MINT = new PublicKey('8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS'); // BAGS
  _TOKEN1_MINT = new PublicKey('4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump'); // PUMP
  _tokensInitialized = true;
  console.log('AMM: Using mainnet BAGS/PUMP tokens (fallback)');
};

const getToken0Mint = () => {
  if (!_TOKEN0_MINT) {
    // Sync fallback - will be overridden by async init
    _TOKEN0_MINT = new PublicKey('8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS');
  }
  return _TOKEN0_MINT;
};

const getToken1Mint = () => {
  if (!_TOKEN1_MINT) {
    _TOKEN1_MINT = new PublicKey('4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump');
  }
  return _TOKEN1_MINT;
};

const TOKEN_DECIMALS = 6;

interface PoolState {
  authority: PublicKey;
  t0Mint: PublicKey;
  t1Mint: PublicKey;
  t0Vault: PublicKey;
  t1Vault: PublicKey;
  lpMint: PublicKey;
  amp: bigint;
  feeBps: bigint;
  balance0: bigint;
  balance1: bigint;
  lpSupply: bigint;
  paused: boolean;
}

interface TokenBalances {
  token0: bigint;
  token1: bigint;
  lp: bigint;
}

interface SwapQuote {
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  fee: bigint;
  minimumReceived: bigint;
}

// StableSwap invariant calculation (D)
function calculateD(x: bigint, y: bigint, amp: bigint): bigint {
  const sum = x + y;
  if (sum === 0n) return 0n;

  const ann = amp * 2n;
  let d = sum;

  for (let i = 0; i < 255; i++) {
    const d_p = d * d * d / (x * y * 4n);
    const prev_d = d;
    d = (ann * sum + d_p * 2n) * d / ((ann - 1n) * d + 3n * d_p);

    if (d > prev_d) {
      if (d - prev_d <= 1n) break;
    } else {
      if (prev_d - d <= 1n) break;
    }
  }

  return d;
}

// Calculate output amount for swap
function calculateSwapOutput(
  amountIn: bigint,
  reserveIn: bigint,
  reserveOut: bigint,
  amp: bigint,
  feeBps: bigint
): bigint {
  const amountInAfterFee = amountIn - (amountIn * feeBps / 10000n);

  const d = calculateD(reserveIn, reserveOut, amp);
  const newReserveIn = reserveIn + amountInAfterFee;

  // Solve for newReserveOut using StableSwap formula
  const ann = amp * 2n;
  let y = d;

  for (let i = 0; i < 255; i++) {
    const y_prev = y;
    const k = y * y * newReserveIn / (d * d);
    y = (y * y + d * d / (ann * 2n)) / (2n * y + k - d);

    if (y > y_prev) {
      if (y - y_prev <= 1n) break;
    } else {
      if (y_prev - y <= 1n) break;
    }
  }

  return reserveOut - y;
}

export function usePoolState() {
  const { connection } = useWallet();
  const [pool, setPool] = useState<PoolState | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchPoolState = useCallback(async () => {
    if (!connection) return;

    try {
      setLoading(true);
      setError(null);

      // Initialize tokens from config (devnet or mainnet)
      await initTokens();

      // Pool PDA: seeds = ["pool", mint0]
      const [poolPDA] = PublicKey.findProgramAddressSync(
        [Buffer.from('pool'), getToken0Mint().toBuffer()],
        PROGRAM_ID
      );

      const account = await connection.getAccountInfo(poolPDA);

      if (!account) {
        setError('Pool not initialized');
        setLoading(false);
        return;
      }

      // Parse pool account (based on Pool struct from IDL)
      const data = account.data;
      let offset = 8; // Skip discriminator

      const authority = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const t0Mint = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const t1Mint = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const t0Vault = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const t1Vault = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;
      const lpMint = new PublicKey(data.subarray(offset, offset + 32)); offset += 32;

      const amp = data.readBigUInt64LE(offset); offset += 8;
      offset += 8 * 3; // Skip initAmp, targetAmp, rampStart
      offset += 8; // Skip rampStop

      const feeBps = data.readBigUInt64LE(offset); offset += 8;
      offset += 8; // Skip adminPct

      const balance0 = data.readBigUInt64LE(offset); offset += 8;
      const balance1 = data.readBigUInt64LE(offset); offset += 8;
      const lpSupply = data.readBigUInt64LE(offset); offset += 8;

      offset += 8 * 2; // Skip adminFee0, adminFee1
      offset += 8 * 2; // Skip volume0, volume1

      const paused = data.readUInt8(offset) !== 0;

      setPool({
        authority,
        t0Mint,
        t1Mint,
        t0Vault,
        t1Vault,
        lpMint,
        amp,
        feeBps,
        balance0,
        balance1,
        lpSupply,
        paused,
      });

      setLoading(false);
    } catch (err: any) {
      console.error('Failed to fetch pool:', err);
      setError(err.message || 'Failed to fetch pool state');
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    fetchPoolState();
    const interval = setInterval(fetchPoolState, 10000); // Refresh every 10s
    return () => clearInterval(interval);
  }, [fetchPoolState]);

  return { pool, loading, error, refetch: fetchPoolState };
}

export function useAMM() {
  const { publicKey, connection, signAndSendTransaction } = useWallet();
  const { pool } = usePoolState();

  const getSwapQuote = useCallback(
    (amountIn: bigint, fromToken: 'token0' | 'token1', slippageBps: number): SwapQuote | null => {
      if (!pool || !amountIn) return null;

      const [reserveIn, reserveOut] = fromToken === 'token0'
        ? [pool.balance0, pool.balance1]
        : [pool.balance1, pool.balance0];

      const amountOut = calculateSwapOutput(amountIn, reserveIn, reserveOut, pool.amp, pool.feeBps);
      const fee = amountIn * pool.feeBps / 10000n;

      const priceImpact = Number((amountOut * 10000n) / reserveOut) / 100;
      const minimumReceived = amountOut - (amountOut * BigInt(slippageBps) / 10000n);

      return {
        amountIn,
        amountOut,
        priceImpact,
        fee,
        minimumReceived,
      };
    },
    [pool]
  );

  const swap = useCallback(
    async (amountIn: bigint, minOut: bigint, fromToken: 'token0' | 'token1') => {
      if (!publicKey || !connection || !pool) {
        throw new Error('Wallet not connected or pool not loaded');
      }

      const [poolPDA] = PublicKey.findProgramAddressSync(
        [getToken0Mint().toBuffer(), getToken1Mint().toBuffer(), Buffer.from('pool')],
        PROGRAM_ID
      );

      const userToken0 = await getAssociatedTokenAddress(getToken0Mint(), publicKey);
      const userToken1 = await getAssociatedTokenAddress(getToken1Mint(), publicKey);

      const instruction = new TransactionInstruction({
        programId: PROGRAM_ID,
        keys: [
          { pubkey: poolPDA, isSigner: false, isWritable: true },
          { pubkey: pool.t0Vault, isSigner: false, isWritable: true },
          { pubkey: pool.t1Vault, isSigner: false, isWritable: true },
          { pubkey: userToken0, isSigner: false, isWritable: true },
          { pubkey: userToken1, isSigner: false, isWritable: true },
          { pubkey: publicKey, isSigner: true, isWritable: false },
          { pubkey: TOKEN_PROGRAM_ID, isSigner: false, isWritable: false },
        ],
        data: Buffer.concat([
          fromToken === 'token0'
            ? Buffer.from([0x2a, 0x4e, 0xf1, 0xe0, 0xb7, 0xf2, 0x64, 0x64]) // swapT0T1
            : Buffer.from([0xc8, 0xc4, 0x75, 0xac, 0x1b, 0x13, 0x0e, 0x3a]), // swapT1T0
          Buffer.from(new BN(amountIn.toString()).toArray('le', 8)),
          Buffer.from(new BN(minOut.toString()).toArray('le', 8)),
        ]),
      });

      const tx = new Transaction().add(instruction);
      const signature = await signAndSendTransaction(tx);

      return signature;
    },
    [publicKey, connection, pool, signAndSendTransaction]
  );

  return {
    pool,
    getSwapQuote,
    swap,
  };
}
