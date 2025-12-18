/**
 * Types for the IDL Protocol Multi-Agent Simulation
 */

import { PublicKey, Keypair } from '@solana/web3.js';

// Agent action types
export type ActionType =
  | 'STAKE'
  | 'UNSTAKE'
  | 'LOCK_VE'
  | 'UNLOCK_VE'
  | 'CREATE_MARKET'
  | 'PLACE_BET'
  | 'CLAIM_WINNINGS'
  | 'WAIT'
  | 'ANALYZE';

export interface Action {
  type: ActionType;
  params: Record<string, any>;
  reasoning: string;
  confidence: number; // 0-1
}

export interface AgentState {
  balance: bigint;           // SOL balance
  idlBalance: bigint;        // IDL token balance
  stakedAmount: bigint;      // Staked IDL
  veAmount: bigint;          // Vote-escrowed IDL
  lockEndTime: number | null;
  activeBets: BetPosition[];
  totalPnL: bigint;          // Running profit/loss
  roundPnL: bigint;          // This round's P&L
}

export interface AgentMemory {
  recentActions: { round: number; action: string; success: boolean; pnl: bigint }[];
  marketHistory: { protocolId: string; betYes: boolean; won: boolean; pnl: bigint }[];
  winningStrategies: string[];
  losingStrategies: string[];
  competitorPatterns: Record<string, string>; // agentName -> observed pattern
}

export interface BetPosition {
  marketPDA: string;
  betPDA: string;
  amount: bigint;
  effectiveAmount: bigint;
  betYes: boolean;
  nonce: bigint;
}

export interface MarketInfo {
  pda: string;
  protocolId: string;
  metricType: number;
  targetValue: bigint;
  resolutionTimestamp: number;
  description: string;
  totalYesAmount: bigint;
  totalNoAmount: bigint;
  resolved: boolean;
  outcome: boolean | null;
  actualValue: bigint | null;
  creator: string;
}

export interface SimulationContext {
  round: number;
  timestamp: number;
  markets: MarketInfo[];
  protocolState: {
    totalStaked: bigint;
    totalVeSupply: bigint;
    rewardPool: bigint;
  };
  competitorStats: CompetitorStat[];
}

export interface CompetitorStat {
  agentName: string;
  totalPnL: bigint;
  stakedAmount: bigint;
  activeBets: number;
}

export interface AgentConfig {
  name: string;
  model: string;
  personality: string;
  riskTolerance: 'low' | 'medium' | 'high' | 'extreme';
  strategy: string;
}

export interface SimulationConfig {
  devnetRpc: string;
  openRouterApiKey: string;
  rounds: number;
  roundDurationMs: number;
  initialIdlBalance: bigint;
  initialSolBalance: bigint;
  logLevel: 'debug' | 'info' | 'warn' | 'error';
}

export interface LLMResponse {
  action: Action;
  thought: string;
  marketAnalysis?: string;
}

export interface RoundResult {
  round: number;
  timestamp: number;
  agentActions: {
    agentName: string;
    action: Action;
    success: boolean;
    error?: string;
    txSignature?: string;
  }[];
  leaderboard: {
    rank: number;
    agentName: string;
    totalPnL: bigint;
    roundPnL: bigint;
  }[];
}

export interface SimulationResult {
  startTime: number;
  endTime: number;
  totalRounds: number;
  roundResults: RoundResult[];
  finalLeaderboard: {
    rank: number;
    agentName: string;
    totalPnL: bigint;
    winRate: number;
    totalBets: number;
    avgBetSize: bigint;
  }[];
  winner: string;
}
