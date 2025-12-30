/**
 * StableSwap AMM Types
 * Program ID: 3AMM53MsJZy2Jvf7PeHHga3bsGjWV4TSaYz29WUtcdje
 * Generated from stableswap_full.c
 */

import { PublicKey } from '@solana/web3.js';

// Lazy initialization to avoid module-scope side effects (breaks Vite builds)
let _PROGRAM_ID: PublicKey;
export const getProgramId = () => {
  if (!_PROGRAM_ID) {
    _PROGRAM_ID = new PublicKey('3AMM53MsJZy2Jvf7PeHHga3bsGjWV4TSaYz29WUtcdje');
  }
  return _PROGRAM_ID;
};

// ============================================================================
// DISCRIMINATORS (8-byte little-endian)
// ============================================================================

export const DISCRIMINATORS = {
  // Instructions
  createPool:    0xf2b9e4d1c8a7e3f9n,
  createPoolN:   0x27c933bce5c77c1bn,
  initT0Vault:   0x5e8c3b0d0f3e4a9fn,
  initT1Vault:   0x7a4e9f1c3b2d5e8an,
  initLpMint:    0xf4d1e9a3c5b8e7f2n,
  swap:          0x82c69e91e17587c8n,
  swapT0T1:      0x642af2b7e0f14e2an,
  swapT1T0:      0x3a0e131bac75c4c8n,
  swapN:         0xf1a8e3c7b2d9e5f8n,
  migT0T1:       0xd2e4f1a8c3b7e9d5n,
  migT1T0:       0x1888779426393db8n,
  addLiquidity:  0xa2e7c4f8b3d1e5a9n,
  addLiquidity1: 0x51c98b4e3c2e12e6n,
  addLiquidityN: 0xe3f7a2c8d1b9e4f6n,
  removeLiquidity: 0x2e54bc2c75c9f902n,
  removeLiquidityN: 0xb3f8e2a5c7d9e1b4n,
  setPause:      0xe075762b7e0d6ec9n,
  updateFee:     0x8f3a2e5b7c9d1f4an,
  commitAmp:     0xc1d9e3f7a5b8e2c4n,
  rampAmp:       0x9a1c5e3f7b2d8e6an,
  stopRamp:      0x3c9427bb15a21053n,
  initAuthority: 0xf5e2a7c9d3b1e8f4n,
  completeAuthority: 0xf6e8d2a4c7b9e1f5n,
  cancelAuthority: 0xf7e3a9c1d5b2e8f6n,
  withdrawFee:   0xf9e5d3a2c8b1e7f8n,
  createFarm:    0x6d7b0c8e2f1a3d5cn,
  stakeLp:       0xf8d4e1a7c3b9e2f7n,
  unstakeLp:     0x4166bf654e34f8bcn,
  claimFarm:     0x075762b7e0d6ec9bn,
  lockLp:        0xfefb83015f028cecn,
  claimUnlockedLp: 0xca8593f45ce88b1en,
  createLottery: 0xd1c9e7f5a3b8e2d4n,
  enterLottery:  0xe795383a4eef48fcn,
  drawLottery:   0x1361225a4d7cbc11n,
  claimLottery:  0x7e7b5e3f15f93cf4n,

  // Account Types (ASCII)
  POOL:      'POOLSWAP',  // 0x504f4f4c53574150
  NPOOL:     'NPOOLSWA',  // 0x4e504f4f4c535741
  FARM:      'FARMSWAP',  // 0x4641524d53574150
  UFARM:     'UFARMSWA',  // 0x554641524d535741
  LOTTERY:   'LOTTERY!',  // 0x4c4f545445525921
  LOT_ENTRY: 'LOTENTRY',  // 0x4c4f54454e545259
} as const;

// ============================================================================
// CONSTANTS
// ============================================================================

export const CONSTANTS = {
  MIN_AMP: 1n,
  MAX_AMP: 100000n,
  FEE_BPS: 30n,
  ADMIN_FEE_PCT: 50n,
  MIN_SWAP: 100000n,
  MIN_DEPOSIT: 100000000n,
  RAMP_MIN_DURATION: 86400n,  // 1 day
  COMMIT_DELAY: 3600n,        // 1 hour
  MIGRATION_FEE_BPS: 1337n,   // 0.1337%
  MAX_TOKENS: 8,
  POOL_SIZE: 1024,
  NPOOL_SIZE: 2048,
  SLOTS_PER_HOUR: 9000,
  SLOTS_PER_DAY: 216000,
} as const;

// ============================================================================
// ERROR CODES
// ============================================================================

export const ERRORS = {
  ERR_KEYS: 3,
  ERR_SIG: 4,
  ERR_DATA: 5,
  ERR_IMMUT: 6,
  Paused: 6000,
  InvalidAmp: 6001,
  MathOverflow: 6002,
  ZeroAmount: 6003,
  SlippageExceeded: 6004,
  InvalidInvariant: 6005,
  InsufficientLiquidity: 6006,
  VaultMismatch: 6007,
  Expired: 6008,
  AlreadyInitialized: 6009,
  Unauthorized: 6010,
  RampConstraint: 6011,
  Locked: 6012,
  FarmError: 6013,
  InvalidOwner: 6014,
  InvalidDiscriminator: 6015,
  CpiError: 6016,
} as const;

// ============================================================================
// ACCOUNT STRUCTURES
// ============================================================================

export interface Candle {
  open: number;        // u32 - Base price (scaled 1e6)
  highDelta: number;   // u16 - High = open + highDelta
  lowDelta: number;    // u16 - Low = open - lowDelta
  closeDelta: number;  // i16 - Close = open + closeDelta
  volume: number;      // u16 - Volume in 1e9 units
}

export interface Pool {
  discriminator: Uint8Array;  // 8 bytes - "POOLSWAP"
  authority: PublicKey;
  t0Mint: PublicKey;
  t1Mint: PublicKey;
  t0Vault: PublicKey;
  t1Vault: PublicKey;
  lpMint: PublicKey;
  amp: bigint;
  initAmp: bigint;
  targetAmp: bigint;
  rampStart: bigint;
  rampStop: bigint;
  feeBps: bigint;
  adminPct: bigint;
  balance0: bigint;
  balance1: bigint;
  lpSupply: bigint;
  adminFee0: bigint;
  adminFee1: bigint;
  volume0: bigint;
  volume1: bigint;
  paused: number;
  bump: number;
  v0Bump: number;
  v1Bump: number;
  lpBump: number;
  pendingAuthority: PublicKey;
  authTime: bigint;
  pendingAmp: bigint;
  ampTime: bigint;
  // Analytics
  tradeCount: bigint;
  sumTrade: bigint;
  maxPrice: number;
  minPrice: number;
  hourSlot: number;
  daySlot: number;
  hourIdx: number;
  dayIdx: number;
  bloom: Uint8Array;      // 128 bytes
  hourlyCandles: Candle[];  // 24 candles
  dailyCandles: Candle[];   // 7 candles
}

export interface NPool {
  discriminator: Uint8Array;  // 8 bytes - "NPOOLSWA"
  authority: PublicKey;
  nTokens: number;
  paused: number;
  bump: number;
  amp: bigint;
  feeBps: bigint;
  adminPct: bigint;
  lpSupply: bigint;
  mints: PublicKey[];     // Up to 8
  vaults: PublicKey[];    // Up to 8
  lpMint: PublicKey;
  balances: bigint[];     // Up to 8
  adminFees: bigint[];    // Up to 8
}

export interface Farm {
  discriminator: Uint8Array;  // 8 bytes - "FARMSWAP"
  pool: PublicKey;
  rewardMint: PublicKey;
  rewardRate: bigint;
  startTime: bigint;
  endTime: bigint;
  totalStaked: bigint;
  accReward: bigint;
  lastUpdate: bigint;
}

export interface UserFarm {
  discriminator: Uint8Array;  // 8 bytes - "UFARMSWA"
  owner: PublicKey;
  farm: PublicKey;
  staked: bigint;
  rewardDebt: bigint;
  lockEnd: bigint;
}

export interface Lottery {
  discriminator: Uint8Array;  // 8 bytes - "LOTTERY!"
  pool: PublicKey;
  authority: PublicKey;
  lotteryVault: PublicKey;
  ticketPrice: bigint;
  totalTickets: bigint;
  prizePool: bigint;
  endTime: bigint;
  winningTicket: bigint;
  drawn: boolean;
  claimed: boolean;
}

export interface LotteryEntry {
  discriminator: Uint8Array;  // 8 bytes - "LOTENTRY"
  owner: PublicKey;
  lottery: PublicKey;
  ticketStart: bigint;
  ticketCount: bigint;
}

// ============================================================================
// INSTRUCTION BUILDERS
// ============================================================================

export function makeDiscriminator(d: bigint): Buffer {
  const b = Buffer.alloc(8);
  b.writeBigUInt64LE(d);
  return b;
}

export function createSwapData(
  from: number,
  to: number,
  amountIn: bigint,
  minOut: bigint,
  deadline: bigint
): Buffer {
  const data = Buffer.alloc(26);
  makeDiscriminator(DISCRIMINATORS.swap).copy(data);
  data[8] = from;
  data[9] = to;
  data.writeBigUInt64LE(amountIn, 10);
  data.writeBigUInt64LE(minOut, 18);
  // Note: deadline is at offset 18 in the swap handler but we need 26 bytes total
  // Actually: disc(8) + from(1) + to(1) + amt(8) + min(8) = 26, deadline is separate
  return data;
}

export function createSwapT0T1Data(amountIn: bigint, minOut: bigint): Buffer {
  const data = Buffer.alloc(24);
  makeDiscriminator(DISCRIMINATORS.swapT0T1).copy(data);
  data.writeBigUInt64LE(amountIn, 8);
  data.writeBigUInt64LE(minOut, 16);
  return data;
}

export function createSwapT1T0Data(amountIn: bigint, minOut: bigint): Buffer {
  const data = Buffer.alloc(24);
  makeDiscriminator(DISCRIMINATORS.swapT1T0).copy(data);
  data.writeBigUInt64LE(amountIn, 8);
  data.writeBigUInt64LE(minOut, 16);
  return data;
}

export function createAddLiquidityData(
  amount0: bigint,
  amount1: bigint,
  minLp: bigint
): Buffer {
  const data = Buffer.alloc(32);
  makeDiscriminator(DISCRIMINATORS.addLiquidity).copy(data);
  data.writeBigUInt64LE(amount0, 8);
  data.writeBigUInt64LE(amount1, 16);
  data.writeBigUInt64LE(minLp, 24);
  return data;
}

export function createRemoveLiquidityData(
  lpAmount: bigint,
  minAmount0: bigint,
  minAmount1: bigint
): Buffer {
  const data = Buffer.alloc(32);
  makeDiscriminator(DISCRIMINATORS.removeLiquidity).copy(data);
  data.writeBigUInt64LE(lpAmount, 8);
  data.writeBigUInt64LE(minAmount0, 16);
  data.writeBigUInt64LE(minAmount1, 24);
  return data;
}

export function createPoolData(amp: bigint, bump: number): Buffer {
  const data = Buffer.alloc(17);
  makeDiscriminator(DISCRIMINATORS.createPool).copy(data);
  data.writeBigUInt64LE(amp, 8);
  data[16] = bump;
  return data;
}

export function createSetPauseData(paused: boolean): Buffer {
  const data = Buffer.alloc(9);
  makeDiscriminator(DISCRIMINATORS.setPause).copy(data);
  data[8] = paused ? 1 : 0;
  return data;
}

export function createUpdateFeeData(feeBps: bigint): Buffer {
  const data = Buffer.alloc(16);
  makeDiscriminator(DISCRIMINATORS.updateFee).copy(data);
  data.writeBigUInt64LE(feeBps, 8);
  return data;
}

export function createCommitAmpData(targetAmp: bigint): Buffer {
  const data = Buffer.alloc(16);
  makeDiscriminator(DISCRIMINATORS.commitAmp).copy(data);
  data.writeBigUInt64LE(targetAmp, 8);
  return data;
}

export function createRampAmpData(targetAmp: bigint, duration: bigint): Buffer {
  const data = Buffer.alloc(24);
  makeDiscriminator(DISCRIMINATORS.rampAmp).copy(data);
  data.writeBigUInt64LE(targetAmp, 8);
  data.writeBigInt64LE(duration, 16);
  return data;
}

export function createStakeLpData(amount: bigint): Buffer {
  const data = Buffer.alloc(16);
  makeDiscriminator(DISCRIMINATORS.stakeLp).copy(data);
  data.writeBigUInt64LE(amount, 8);
  return data;
}

export function createUnstakeLpData(amount: bigint): Buffer {
  const data = Buffer.alloc(16);
  makeDiscriminator(DISCRIMINATORS.unstakeLp).copy(data);
  data.writeBigUInt64LE(amount, 8);
  return data;
}

export function createLockLpData(amount: bigint, duration: bigint): Buffer {
  const data = Buffer.alloc(24);
  makeDiscriminator(DISCRIMINATORS.lockLp).copy(data);
  data.writeBigUInt64LE(amount, 8);
  data.writeBigInt64LE(duration, 16);
  return data;
}

export function createLotteryData(ticketPrice: bigint, endTime: bigint): Buffer {
  const data = Buffer.alloc(24);
  makeDiscriminator(DISCRIMINATORS.createLottery).copy(data);
  data.writeBigUInt64LE(ticketPrice, 8);
  data.writeBigInt64LE(endTime, 16);
  return data;
}

export function createEnterLotteryData(ticketCount: bigint): Buffer {
  const data = Buffer.alloc(16);
  makeDiscriminator(DISCRIMINATORS.enterLottery).copy(data);
  data.writeBigUInt64LE(ticketCount, 8);
  return data;
}

export function createDrawLotteryData(randomSeed: bigint): Buffer {
  const data = Buffer.alloc(16);
  makeDiscriminator(DISCRIMINATORS.drawLottery).copy(data);
  data.writeBigUInt64LE(randomSeed, 8);
  return data;
}

export function createSwapNData(
  fromIdx: number,
  toIdx: number,
  amountIn: bigint,
  minOut: bigint
): Buffer {
  const data = Buffer.alloc(26);
  makeDiscriminator(DISCRIMINATORS.swapN).copy(data);
  data[8] = fromIdx;
  data[9] = toIdx;
  data.writeBigUInt64LE(amountIn, 10);
  data.writeBigUInt64LE(minOut, 18);
  return data;
}

export function createPoolNData(amp: bigint, nTokens: number, bump: number): Buffer {
  const data = Buffer.alloc(18);
  makeDiscriminator(DISCRIMINATORS.createPoolN).copy(data);
  data.writeBigUInt64LE(amp, 8);
  data[16] = nTokens;
  data[17] = bump;
  return data;
}

// ============================================================================
// PDA DERIVATION
// ============================================================================

export function derivePoolPda(mint0: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('pool'), mint0.toBuffer()],
    getProgramId()
  );
}

export function deriveNPoolPda(mint0: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('npool'), mint0.toBuffer()],
    getProgramId()
  );
}

// ============================================================================
// ACCOUNT PARSING
// ============================================================================

export function parsePool(data: Buffer): Pool {
  const discriminator = data.slice(0, 8);
  let offset = 8;

  const readPubkey = (): PublicKey => {
    const pk = new PublicKey(data.slice(offset, offset + 32));
    offset += 32;
    return pk;
  };

  const readU64 = (): bigint => {
    const val = data.readBigUInt64LE(offset);
    offset += 8;
    return val;
  };

  const readI64 = (): bigint => {
    const val = data.readBigInt64LE(offset);
    offset += 8;
    return val;
  };

  const readU32 = (): number => {
    const val = data.readUInt32LE(offset);
    offset += 4;
    return val;
  };

  const readU8 = (): number => {
    return data[offset++];
  };

  const readCandle = (): Candle => {
    return {
      open: readU32(),
      highDelta: data.readUInt16LE(offset) + (offset += 2, 0),
      lowDelta: data.readUInt16LE(offset - 2 + 2) + (offset += 2, 0) - 2,
      closeDelta: data.readInt16LE(offset - 2),
      volume: data.readUInt16LE(offset) + (offset += 2, 0) - 2,
    };
  };

  return {
    discriminator,
    authority: readPubkey(),
    t0Mint: readPubkey(),
    t1Mint: readPubkey(),
    t0Vault: readPubkey(),
    t1Vault: readPubkey(),
    lpMint: readPubkey(),
    amp: readU64(),
    initAmp: readU64(),
    targetAmp: readU64(),
    rampStart: readI64(),
    rampStop: readI64(),
    feeBps: readU64(),
    adminPct: readU64(),
    balance0: readU64(),
    balance1: readU64(),
    lpSupply: readU64(),
    adminFee0: readU64(),
    adminFee1: readU64(),
    volume0: readU64(),
    volume1: readU64(),
    paused: readU8(),
    bump: readU8(),
    v0Bump: readU8(),
    v1Bump: readU8(),
    lpBump: readU8(),
    pendingAuthority: (offset += 3, readPubkey()),
    authTime: readI64(),
    pendingAmp: readU64(),
    ampTime: readI64(),
    tradeCount: readU64(),
    sumTrade: readU64(),
    maxPrice: readU32(),
    minPrice: readU32(),
    hourSlot: readU32(),
    daySlot: readU32(),
    hourIdx: readU8(),
    dayIdx: readU8(),
    bloom: (offset += 6, data.slice(offset, offset + 128)),
    hourlyCandles: Array.from({ length: 24 }, () => {
      offset += (offset === offset ? 128 : 0);
      const c: Candle = {
        open: data.readUInt32LE(offset),
        highDelta: data.readUInt16LE(offset + 4),
        lowDelta: data.readUInt16LE(offset + 6),
        closeDelta: data.readInt16LE(offset + 8),
        volume: data.readUInt16LE(offset + 10),
      };
      offset += 12;
      return c;
    }),
    dailyCandles: Array.from({ length: 7 }, () => {
      const c: Candle = {
        open: data.readUInt32LE(offset),
        highDelta: data.readUInt16LE(offset + 4),
        lowDelta: data.readUInt16LE(offset + 6),
        closeDelta: data.readInt16LE(offset + 8),
        volume: data.readUInt16LE(offset + 10),
      };
      offset += 12;
      return c;
    }),
  };
}
