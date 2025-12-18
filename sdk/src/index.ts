/**
 * IDL Protocol TypeScript SDK
 *
 * A complete SDK for interacting with the IDL Protocol on Solana
 */

import {
  Connection,
  Keypair,
  PublicKey,
  SystemProgram,
  Transaction,
  TransactionInstruction,
  sendAndConfirmTransaction,
  Commitment,
} from '@solana/web3.js';
import { createHash } from 'crypto';

// ==================== CONSTANTS ====================

export const PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');

export const MAX_LOCK_DURATION = 126144000; // 4 years in seconds
export const MIN_LOCK_DURATION = 604800; // 1 week minimum
export const BET_FEE_BPS = 300; // 3% fee on winning bets

// Badge volume thresholds (USD)
export const BADGE_TIER_BRONZE = 1_000;
export const BADGE_TIER_SILVER = 10_000;
export const BADGE_TIER_GOLD = 100_000;
export const BADGE_TIER_PLATINUM = 500_000;
export const BADGE_TIER_DIAMOND = 1_000_000;

// veIDL granted per badge tier
export const BADGE_VEIDL_BRONZE = 50_000;
export const BADGE_VEIDL_SILVER = 250_000;
export const BADGE_VEIDL_GOLD = 1_000_000;
export const BADGE_VEIDL_PLATINUM = 5_000_000;
export const BADGE_VEIDL_DIAMOND = 20_000_000;

// ==================== ENUMS ====================

export enum MetricType {
  Tvl = 0,
  Volume24h = 1,
  Users = 2,
  Transactions = 3,
  Price = 4,
  MarketCap = 5,
  Custom = 6,
}

export enum BadgeTier {
  None = 0,
  Bronze = 1,
  Silver = 2,
  Gold = 3,
  Platinum = 4,
  Diamond = 5,
}

// ==================== DISCRIMINATORS ====================

function computeDiscriminator(name: string): Buffer {
  const hash = createHash('sha256').update(`global:${name}`).digest();
  return Buffer.from(hash.slice(0, 8));
}

const DISCRIMINATORS = {
  initialize: computeDiscriminator('initialize'),
  stake: computeDiscriminator('stake'),
  unstake: computeDiscriminator('unstake'),
  lockForVe: computeDiscriminator('lock_for_ve'),
  unlockVe: computeDiscriminator('unlock_ve'),
  createMarket: computeDiscriminator('create_market'),
  placeBet: computeDiscriminator('place_bet'),
  resolveMarket: computeDiscriminator('resolve_market'),
  claimWinnings: computeDiscriminator('claim_winnings'),
  issueBadge: computeDiscriminator('issue_badge'),
  revokeBadge: computeDiscriminator('revoke_badge'),
  setPaused: computeDiscriminator('set_paused'),
  transferAuthority: computeDiscriminator('transfer_authority'),
};

// ==================== ENCODING HELPERS ====================

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

function encodeBool(value: boolean): Buffer {
  return Buffer.from([value ? 1 : 0]);
}

function encodePubkey(pubkey: PublicKey): Buffer {
  return pubkey.toBuffer();
}

// ==================== PDA DERIVATION ====================

export function deriveStatePDA(): [PublicKey, number] {
  return PublicKey.findProgramAddressSync([Buffer.from('state')], PROGRAM_ID);
}

export function deriveStakerPDA(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('staker'), user.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveVePositionPDA(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('ve_position'), user.toBuffer()],
    PROGRAM_ID
  );
}

export function deriveMarketPDA(protocolId: string, resolutionTimestamp: number): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('market'), Buffer.from(protocolId), encodeI64(resolutionTimestamp)],
    PROGRAM_ID
  );
}

export function deriveBetPDA(market: PublicKey, user: PublicKey, nonce: number | bigint): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('bet'), market.toBuffer(), user.toBuffer(), encodeU64(nonce)],
    PROGRAM_ID
  );
}

export function deriveBadgePDA(user: PublicKey): [PublicKey, number] {
  return PublicKey.findProgramAddressSync(
    [Buffer.from('badge'), user.toBuffer()],
    PROGRAM_ID
  );
}

// ==================== ACCOUNT TYPES ====================

export interface ProtocolState {
  authority: PublicKey;
  treasury: PublicKey;
  totalStaked: bigint;
  totalVeSupply: bigint;
  rewardPool: bigint;
  totalFeesCollected: bigint;
  totalBurned: bigint;
  bump: number;
  paused: boolean;
}

export interface StakerAccount {
  owner: PublicKey;
  stakedAmount: bigint;
  lastStakeTimestamp: bigint;
  bump: number;
}

export interface VePosition {
  owner: PublicKey;
  lockedStake: bigint;
  veAmount: bigint;
  lockStart: bigint;
  lockEnd: bigint;
  bump: number;
}

export interface PredictionMarket {
  creator: PublicKey;
  protocolId: string;
  metricType: MetricType;
  targetValue: bigint;
  resolutionTimestamp: bigint;
  description: string;
  totalYesAmount: bigint;
  totalNoAmount: bigint;
  resolved: boolean;
  outcome: boolean | null;
  actualValue: bigint | null;
  oracle: PublicKey;
  createdAt: bigint;
  bump: number;
}

export interface Bet {
  owner: PublicKey;
  market: PublicKey;
  amount: bigint;
  effectiveAmount: bigint;
  betYes: boolean;
  timestamp: bigint;
  claimed: boolean;
  bump: number;
}

export interface VolumeBadge {
  owner: PublicKey;
  tier: BadgeTier;
  volumeUsd: bigint;
  veAmount: bigint;
  issuedAt: bigint;
  bump: number;
}

// ==================== ACCOUNT PARSING ====================

function parseProtocolState(data: Buffer): ProtocolState {
  let offset = 8; // Skip discriminator
  const authority = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const treasury = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const totalStaked = data.readBigUInt64LE(offset); offset += 8;
  const totalVeSupply = data.readBigUInt64LE(offset); offset += 8;
  const rewardPool = data.readBigUInt64LE(offset); offset += 8;
  const totalFeesCollected = data.readBigUInt64LE(offset); offset += 8;
  const totalBurned = data.readBigUInt64LE(offset); offset += 8;
  const bump = data[offset]; offset += 1;
  const paused = data[offset] === 1;

  return { authority, treasury, totalStaked, totalVeSupply, rewardPool, totalFeesCollected, totalBurned, bump, paused };
}

function parseStakerAccount(data: Buffer): StakerAccount {
  let offset = 8;
  const owner = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const stakedAmount = data.readBigUInt64LE(offset); offset += 8;
  const lastStakeTimestamp = data.readBigInt64LE(offset); offset += 8;
  const bump = data[offset];

  return { owner, stakedAmount, lastStakeTimestamp, bump };
}

function parseVePosition(data: Buffer): VePosition {
  let offset = 8;
  const owner = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const lockedStake = data.readBigUInt64LE(offset); offset += 8;
  const veAmount = data.readBigUInt64LE(offset); offset += 8;
  const lockStart = data.readBigInt64LE(offset); offset += 8;
  const lockEnd = data.readBigInt64LE(offset); offset += 8;
  const bump = data[offset];

  return { owner, lockedStake, veAmount, lockStart, lockEnd, bump };
}

function parsePredictionMarket(data: Buffer): PredictionMarket {
  let offset = 8;
  const creator = new PublicKey(data.slice(offset, offset + 32)); offset += 32;

  // Protocol ID (string with 4-byte length prefix)
  const protocolIdLen = data.readUInt32LE(offset); offset += 4;
  const protocolId = data.slice(offset, offset + protocolIdLen).toString('utf8'); offset += protocolIdLen;

  const metricType = data[offset] as MetricType; offset += 1;
  const targetValue = data.readBigUInt64LE(offset); offset += 8;
  const resolutionTimestamp = data.readBigInt64LE(offset); offset += 8;

  // Description (string with 4-byte length prefix)
  const descLen = data.readUInt32LE(offset); offset += 4;
  const description = data.slice(offset, offset + descLen).toString('utf8'); offset += descLen;

  const totalYesAmount = data.readBigUInt64LE(offset); offset += 8;
  const totalNoAmount = data.readBigUInt64LE(offset); offset += 8;
  const resolved = data[offset] === 1; offset += 1;

  // Option<bool> for outcome
  const hasOutcome = data[offset] === 1; offset += 1;
  const outcome = hasOutcome ? data[offset] === 1 : null; if (hasOutcome) offset += 1;

  // Option<u64> for actual_value
  const hasActualValue = data[offset] === 1; offset += 1;
  const actualValue = hasActualValue ? data.readBigUInt64LE(offset) : null; if (hasActualValue) offset += 8;

  const oracle = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const createdAt = data.readBigInt64LE(offset); offset += 8;
  const bump = data[offset];

  return { creator, protocolId, metricType, targetValue, resolutionTimestamp, description, totalYesAmount, totalNoAmount, resolved, outcome, actualValue, oracle, createdAt, bump };
}

function parseBet(data: Buffer): Bet {
  let offset = 8;
  const owner = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const market = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const amount = data.readBigUInt64LE(offset); offset += 8;
  const effectiveAmount = data.readBigUInt64LE(offset); offset += 8;
  const betYes = data[offset] === 1; offset += 1;
  const timestamp = data.readBigInt64LE(offset); offset += 8;
  const claimed = data[offset] === 1; offset += 1;
  const bump = data[offset];

  return { owner, market, amount, effectiveAmount, betYes, timestamp, claimed, bump };
}

function parseVolumeBadge(data: Buffer): VolumeBadge {
  let offset = 8;
  const owner = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
  const tier = data[offset] as BadgeTier; offset += 1;
  const volumeUsd = data.readBigUInt64LE(offset); offset += 8;
  const veAmount = data.readBigUInt64LE(offset); offset += 8;
  const issuedAt = data.readBigInt64LE(offset); offset += 8;
  const bump = data[offset];

  return { owner, tier, volumeUsd, veAmount, issuedAt, bump };
}

// ==================== SDK CLIENT ====================

export interface IdlProtocolConfig {
  connection: Connection;
  wallet: Keypair;
  commitment?: Commitment;
}

export class IdlProtocolClient {
  private connection: Connection;
  private wallet: Keypair;
  private commitment: Commitment;

  constructor(config: IdlProtocolConfig) {
    this.connection = config.connection;
    this.wallet = config.wallet;
    this.commitment = config.commitment || 'confirmed';
  }

  // ==================== ACCOUNT FETCHERS ====================

  async getProtocolState(): Promise<ProtocolState | null> {
    const [statePDA] = deriveStatePDA();
    const account = await this.connection.getAccountInfo(statePDA, this.commitment);
    return account ? parseProtocolState(account.data) : null;
  }

  async getStakerAccount(user?: PublicKey): Promise<StakerAccount | null> {
    const [stakerPDA] = deriveStakerPDA(user || this.wallet.publicKey);
    const account = await this.connection.getAccountInfo(stakerPDA, this.commitment);
    return account ? parseStakerAccount(account.data) : null;
  }

  async getVePosition(user?: PublicKey): Promise<VePosition | null> {
    const [vePDA] = deriveVePositionPDA(user || this.wallet.publicKey);
    const account = await this.connection.getAccountInfo(vePDA, this.commitment);
    return account ? parseVePosition(account.data) : null;
  }

  async getMarket(protocolId: string, resolutionTimestamp: number): Promise<PredictionMarket | null> {
    const [marketPDA] = deriveMarketPDA(protocolId, resolutionTimestamp);
    const account = await this.connection.getAccountInfo(marketPDA, this.commitment);
    return account ? parsePredictionMarket(account.data) : null;
  }

  async getMarketByPDA(marketPDA: PublicKey): Promise<PredictionMarket | null> {
    const account = await this.connection.getAccountInfo(marketPDA, this.commitment);
    return account ? parsePredictionMarket(account.data) : null;
  }

  async getBet(market: PublicKey, user: PublicKey, nonce: number | bigint): Promise<Bet | null> {
    const [betPDA] = deriveBetPDA(market, user, nonce);
    const account = await this.connection.getAccountInfo(betPDA, this.commitment);
    return account ? parseBet(account.data) : null;
  }

  async getBetByPDA(betPDA: PublicKey): Promise<Bet | null> {
    const account = await this.connection.getAccountInfo(betPDA, this.commitment);
    return account ? parseBet(account.data) : null;
  }

  async getBadge(user?: PublicKey): Promise<VolumeBadge | null> {
    const [badgePDA] = deriveBadgePDA(user || this.wallet.publicKey);
    const account = await this.connection.getAccountInfo(badgePDA, this.commitment);
    return account ? parseVolumeBadge(account.data) : null;
  }

  // ==================== INSTRUCTION BUILDERS ====================

  buildInitializeInstruction(treasury: PublicKey): TransactionInstruction {
    const [statePDA] = deriveStatePDA();

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: treasury, isSigner: false, isWritable: false },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: DISCRIMINATORS.initialize,
    };
  }

  buildStakeInstruction(amount: number | bigint): TransactionInstruction {
    const [statePDA] = deriveStatePDA();
    const [stakerPDA] = deriveStakerPDA(this.wallet.publicKey);

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([DISCRIMINATORS.stake, encodeU64(amount)]),
    };
  }

  buildUnstakeInstruction(amount: number | bigint): TransactionInstruction {
    const [statePDA] = deriveStatePDA();
    const [stakerPDA] = deriveStakerPDA(this.wallet.publicKey);
    const [vePDA] = deriveVePositionPDA(this.wallet.publicKey);

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: true },
        { pubkey: vePDA, isSigner: false, isWritable: false },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
      ],
      data: Buffer.concat([DISCRIMINATORS.unstake, encodeU64(amount)]),
    };
  }

  buildLockForVeInstruction(lockDuration: number | bigint): TransactionInstruction {
    const [statePDA] = deriveStatePDA();
    const [stakerPDA] = deriveStakerPDA(this.wallet.publicKey);
    const [vePDA] = deriveVePositionPDA(this.wallet.publicKey);

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: false },
        { pubkey: vePDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([DISCRIMINATORS.lockForVe, encodeI64(lockDuration)]),
    };
  }

  buildUnlockVeInstruction(): TransactionInstruction {
    const [statePDA] = deriveStatePDA();
    const [vePDA] = deriveVePositionPDA(this.wallet.publicKey);

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: vePDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
      ],
      data: DISCRIMINATORS.unlockVe,
    };
  }

  buildCreateMarketInstruction(
    protocolId: string,
    metricType: MetricType,
    targetValue: number | bigint,
    resolutionTimestamp: number | bigint,
    description: string,
    oracle?: PublicKey
  ): TransactionInstruction {
    const [statePDA] = deriveStatePDA();
    const [marketPDA] = deriveMarketPDA(protocolId, Number(resolutionTimestamp));

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: false },
        { pubkey: marketPDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: oracle || this.wallet.publicKey, isSigner: false, isWritable: false },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        DISCRIMINATORS.createMarket,
        encodeString(protocolId),
        Buffer.from([metricType]),
        encodeU64(targetValue),
        encodeI64(resolutionTimestamp),
        encodeString(description),
      ]),
    };
  }

  buildPlaceBetInstruction(
    marketPDA: PublicKey,
    amount: number | bigint,
    betYes: boolean,
    nonce?: number | bigint
  ): { instruction: TransactionInstruction; betPDA: PublicKey; nonce: bigint } {
    const [statePDA] = deriveStatePDA();
    const [stakerPDA] = deriveStakerPDA(this.wallet.publicKey);
    const actualNonce = nonce !== undefined ? BigInt(nonce) : BigInt(Date.now());
    const [betPDA] = deriveBetPDA(marketPDA, this.wallet.publicKey, actualNonce);

    const instruction: TransactionInstruction = {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: false },
        { pubkey: marketPDA, isSigner: false, isWritable: true },
        { pubkey: betPDA, isSigner: false, isWritable: true },
        { pubkey: stakerPDA, isSigner: false, isWritable: false },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([
        DISCRIMINATORS.placeBet,
        encodeU64(amount),
        encodeBool(betYes),
        encodeU64(actualNonce),
      ]),
    };

    return { instruction, betPDA, nonce: actualNonce };
  }

  buildResolveMarketInstruction(marketPDA: PublicKey, actualValue: number | bigint): TransactionInstruction {
    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: marketPDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      ],
      data: Buffer.concat([DISCRIMINATORS.resolveMarket, encodeU64(actualValue)]),
    };
  }

  buildClaimWinningsInstruction(marketPDA: PublicKey, betPDA: PublicKey, market: PredictionMarket): TransactionInstruction {
    const [statePDA] = deriveStatePDA();

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: marketPDA, isSigner: false, isWritable: false },
        { pubkey: betPDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      ],
      data: DISCRIMINATORS.claimWinnings,
    };
  }

  buildIssueBadgeInstruction(recipient: PublicKey, tier: BadgeTier, volumeUsd: number | bigint): TransactionInstruction {
    const [statePDA] = deriveStatePDA();
    const [badgePDA] = deriveBadgePDA(recipient);

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: badgePDA, isSigner: false, isWritable: true },
        { pubkey: recipient, isSigner: false, isWritable: false },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
        { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      ],
      data: Buffer.concat([DISCRIMINATORS.issueBadge, Buffer.from([tier]), encodeU64(volumeUsd)]),
    };
  }

  buildRevokeBadgeInstruction(badgeOwner: PublicKey): TransactionInstruction {
    const [statePDA] = deriveStatePDA();
    const [badgePDA] = deriveBadgePDA(badgeOwner);

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: badgePDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: true },
      ],
      data: DISCRIMINATORS.revokeBadge,
    };
  }

  buildSetPausedInstruction(paused: boolean): TransactionInstruction {
    const [statePDA] = deriveStatePDA();

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      ],
      data: Buffer.concat([DISCRIMINATORS.setPaused, encodeBool(paused)]),
    };
  }

  buildTransferAuthorityInstruction(newAuthority: PublicKey): TransactionInstruction {
    const [statePDA] = deriveStatePDA();

    return {
      programId: PROGRAM_ID,
      keys: [
        { pubkey: statePDA, isSigner: false, isWritable: true },
        { pubkey: this.wallet.publicKey, isSigner: true, isWritable: false },
      ],
      data: Buffer.concat([DISCRIMINATORS.transferAuthority, encodePubkey(newAuthority)]),
    };
  }

  // ==================== TRANSACTION EXECUTORS ====================

  private async sendTransaction(ix: TransactionInstruction): Promise<string> {
    const tx = new Transaction().add(ix);
    return sendAndConfirmTransaction(this.connection, tx, [this.wallet], { commitment: this.commitment });
  }

  async initialize(treasury: PublicKey): Promise<string> {
    return this.sendTransaction(this.buildInitializeInstruction(treasury));
  }

  async stake(amount: number | bigint): Promise<string> {
    return this.sendTransaction(this.buildStakeInstruction(amount));
  }

  async unstake(amount: number | bigint): Promise<string> {
    return this.sendTransaction(this.buildUnstakeInstruction(amount));
  }

  async lockForVe(lockDuration: number | bigint): Promise<string> {
    return this.sendTransaction(this.buildLockForVeInstruction(lockDuration));
  }

  async unlockVe(): Promise<string> {
    return this.sendTransaction(this.buildUnlockVeInstruction());
  }

  async createMarket(
    protocolId: string,
    metricType: MetricType,
    targetValue: number | bigint,
    resolutionTimestamp: number | bigint,
    description: string,
    oracle?: PublicKey
  ): Promise<{ signature: string; marketPDA: PublicKey }> {
    const [marketPDA] = deriveMarketPDA(protocolId, Number(resolutionTimestamp));
    const ix = this.buildCreateMarketInstruction(protocolId, metricType, targetValue, resolutionTimestamp, description, oracle);
    const signature = await this.sendTransaction(ix);
    return { signature, marketPDA };
  }

  async placeBet(
    marketPDA: PublicKey,
    amount: number | bigint,
    betYes: boolean,
    nonce?: number | bigint
  ): Promise<{ signature: string; betPDA: PublicKey; nonce: bigint }> {
    const { instruction, betPDA, nonce: actualNonce } = this.buildPlaceBetInstruction(marketPDA, amount, betYes, nonce);
    const signature = await this.sendTransaction(instruction);
    return { signature, betPDA, nonce: actualNonce };
  }

  async resolveMarket(marketPDA: PublicKey, actualValue: number | bigint): Promise<string> {
    return this.sendTransaction(this.buildResolveMarketInstruction(marketPDA, actualValue));
  }

  async claimWinnings(marketPDA: PublicKey, betPDA: PublicKey): Promise<string> {
    const market = await this.getMarketByPDA(marketPDA);
    if (!market) throw new Error('Market not found');
    return this.sendTransaction(this.buildClaimWinningsInstruction(marketPDA, betPDA, market));
  }

  async issueBadge(recipient: PublicKey, tier: BadgeTier, volumeUsd: number | bigint): Promise<string> {
    return this.sendTransaction(this.buildIssueBadgeInstruction(recipient, tier, volumeUsd));
  }

  async revokeBadge(badgeOwner: PublicKey): Promise<string> {
    return this.sendTransaction(this.buildRevokeBadgeInstruction(badgeOwner));
  }

  async setPaused(paused: boolean): Promise<string> {
    return this.sendTransaction(this.buildSetPausedInstruction(paused));
  }

  async transferAuthority(newAuthority: PublicKey): Promise<string> {
    return this.sendTransaction(this.buildTransferAuthorityInstruction(newAuthority));
  }

  // ==================== UTILITY METHODS ====================

  /**
   * Calculate estimated veIDL for a given stake and lock duration
   */
  calculateVeIDL(stakedAmount: number | bigint, lockDuration: number): bigint {
    return (BigInt(stakedAmount) * BigInt(lockDuration)) / BigInt(MAX_LOCK_DURATION);
  }

  /**
   * Calculate the staker bonus for betting (in basis points)
   */
  calculateStakerBonus(stakedAmount: number | bigint): number {
    const millions = Number(BigInt(stakedAmount) / BigInt(1_000_000));
    return Math.min(millions * 100, 5000); // 1% per million, max 50%
  }

  /**
   * Calculate estimated winnings for a bet
   */
  calculateEstimatedWinnings(
    betAmount: number | bigint,
    effectiveAmount: number | bigint,
    betYes: boolean,
    totalYes: number | bigint,
    totalNo: number | bigint
  ): { grossWinnings: bigint; fee: bigint; netWinnings: bigint } {
    const winningPool = betYes ? BigInt(totalYes) : BigInt(totalNo);
    const losingPool = betYes ? BigInt(totalNo) : BigInt(totalYes);

    const share = winningPool > 0n
      ? (BigInt(effectiveAmount) * losingPool) / winningPool
      : 0n;

    const grossWinnings = BigInt(betAmount) + share;
    const fee = (grossWinnings * BigInt(BET_FEE_BPS)) / 10000n;
    const netWinnings = grossWinnings - fee;

    return { grossWinnings, fee, netWinnings };
  }

  /**
   * Get badge tier name from enum
   */
  static getBadgeTierName(tier: BadgeTier): string {
    const names = ['None', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Diamond'];
    return names[tier] || 'Unknown';
  }

  /**
   * Get metric type name from enum
   */
  static getMetricTypeName(type: MetricType): string {
    const names = ['TVL', 'Volume 24h', 'Users', 'Transactions', 'Price', 'Market Cap', 'Custom'];
    return names[type] || 'Unknown';
  }

  /**
   * Get the required volume for a badge tier
   */
  static getRequiredVolume(tier: BadgeTier): number {
    const volumes = [0, BADGE_TIER_BRONZE, BADGE_TIER_SILVER, BADGE_TIER_GOLD, BADGE_TIER_PLATINUM, BADGE_TIER_DIAMOND];
    return volumes[tier] || 0;
  }

  /**
   * Get the veIDL amount for a badge tier
   */
  static getBadgeVeIDL(tier: BadgeTier): number {
    const amounts = [0, BADGE_VEIDL_BRONZE, BADGE_VEIDL_SILVER, BADGE_VEIDL_GOLD, BADGE_VEIDL_PLATINUM, BADGE_VEIDL_DIAMOND];
    return amounts[tier] || 0;
  }
}

// ==================== EXPORTS ====================

export {
  DISCRIMINATORS,
  encodeU64,
  encodeI64,
  encodeString,
  encodeBool,
  parseProtocolState,
  parseStakerAccount,
  parseVePosition,
  parsePredictionMarket,
  parseBet,
  parseVolumeBadge,
};
