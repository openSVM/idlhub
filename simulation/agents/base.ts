/**
 * Base Agent class for the IDL Protocol simulation
 */

import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import {
  AgentConfig,
  AgentState,
  Action,
  BetPosition,
  SimulationContext,
  MarketInfo,
  LLMResponse,
  AgentMemory,
} from '../types';
import { OpenRouterClient } from '../utils/openrouter';
import { Logger } from '../utils/logger';
import { IdlProtocolClient, MetricType, deriveMarketPDA, deriveBetPDA } from '../../sdk/src/index';

export class BaseAgent {
  public config: AgentConfig;
  public state: AgentState;
  public wallet: Keypair;
  public client: IdlProtocolClient;
  protected llmClient: OpenRouterClient;
  protected logger: Logger;
  protected connection: Connection;

  // Tracking metrics
  public totalBets: number = 0;
  public wonBets: number = 0;
  public totalBetAmount: bigint = 0n;

  // Agent memory for learning
  public memory: AgentMemory = {
    recentActions: [],
    marketHistory: [],
    winningStrategies: [],
    losingStrategies: [],
    competitorPatterns: {},
  };

  constructor(
    config: AgentConfig,
    wallet: Keypair,
    connection: Connection,
    llmClient: OpenRouterClient,
    initialState: Partial<AgentState> = {}
  ) {
    this.config = config;
    this.wallet = wallet;
    this.connection = connection;
    this.llmClient = llmClient;
    this.logger = Logger.getInstance();

    this.client = new IdlProtocolClient({
      connection,
      wallet,
      commitment: 'confirmed',
    });

    this.state = {
      balance: 0n,
      idlBalance: initialState.idlBalance || 0n,
      stakedAmount: 0n,
      veAmount: 0n,
      lockEndTime: null,
      activeBets: [],
      totalPnL: 0n,
      roundPnL: 0n,
    };
  }

  /**
   * Get the next action from the LLM
   */
  async decideAction(context: SimulationContext): Promise<LLMResponse> {
    this.logger.debug(`${this.config.name} deciding action...`);

    const response = await this.llmClient.getAgentAction(
      this.config,
      context,
      this.state,
      this.memory
    );

    this.logger.agent(
      this.config.name,
      `Thought: ${response.thought}`
    );

    return response;
  }

  /**
   * Record action result in memory
   */
  recordAction(round: number, action: string, success: boolean, pnl: bigint): void {
    this.memory.recentActions.push({ round, action, success, pnl });

    // Keep only last 20 actions
    if (this.memory.recentActions.length > 20) {
      this.memory.recentActions.shift();
    }

    // Track winning/losing strategies
    if (pnl > 0n) {
      this.memory.winningStrategies.push(action);
      if (this.memory.winningStrategies.length > 10) {
        this.memory.winningStrategies.shift();
      }
    } else if (pnl < 0n) {
      this.memory.losingStrategies.push(action);
      if (this.memory.losingStrategies.length > 10) {
        this.memory.losingStrategies.shift();
      }
    }
  }

  /**
   * Record bet result in memory
   */
  recordBetResult(protocolId: string, betYes: boolean, won: boolean, pnl: bigint): void {
    this.memory.marketHistory.push({ protocolId, betYes, won, pnl });

    // Keep only last 30 bets
    if (this.memory.marketHistory.length > 30) {
      this.memory.marketHistory.shift();
    }
  }

  /**
   * Update observed patterns for competitors
   */
  updateCompetitorPattern(agentName: string, pattern: string): void {
    this.memory.competitorPatterns[agentName] = pattern;
  }

  /**
   * Execute an action on the protocol
   */
  async executeAction(action: Action): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    this.logger.action(
      this.config.name,
      action.type,
      `${action.reasoning} (confidence: ${(action.confidence * 100).toFixed(0)}%)`
    );

    try {
      switch (action.type) {
        case 'STAKE':
          return await this.executeStake(action);
        case 'UNSTAKE':
          return await this.executeUnstake(action);
        case 'LOCK_VE':
          return await this.executeLockVe(action);
        case 'UNLOCK_VE':
          return await this.executeUnlockVe(action);
        case 'CREATE_MARKET':
          return await this.executeCreateMarket(action);
        case 'PLACE_BET':
          return await this.executePlaceBet(action);
        case 'CLAIM_WINNINGS':
          return await this.executeClaimWinnings(action);
        case 'WAIT':
        case 'ANALYZE':
          return { success: true };
        default:
          return { success: false, error: `Unknown action type: ${action.type}` };
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      this.logger.error(`${this.config.name} action failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  }

  private async executeStake(action: Action): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    const amount = BigInt(action.params.amount || 0);
    if (amount <= 0n) {
      return { success: false, error: 'Invalid stake amount' };
    }
    if (amount > this.state.idlBalance) {
      return { success: false, error: 'Insufficient IDL balance' };
    }

    const txSignature = await this.client.stake(amount);
    this.state.idlBalance -= amount;
    this.state.stakedAmount += amount;

    return { success: true, txSignature };
  }

  private async executeUnstake(action: Action): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    const amount = BigInt(action.params.amount || 0);
    if (amount <= 0n) {
      return { success: false, error: 'Invalid unstake amount' };
    }
    if (amount > this.state.stakedAmount) {
      return { success: false, error: 'Insufficient staked amount' };
    }

    const txSignature = await this.client.unstake(amount);
    this.state.stakedAmount -= amount;
    this.state.idlBalance += amount;

    return { success: true, txSignature };
  }

  private async executeLockVe(action: Action): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    const duration = Number(action.params.duration || 604800); // Default 1 week
    if (this.state.stakedAmount <= 0n) {
      return { success: false, error: 'No staked tokens to lock' };
    }

    const txSignature = await this.client.lockForVe(duration);
    this.state.veAmount = (this.state.stakedAmount * BigInt(duration)) / BigInt(126144000);
    this.state.lockEndTime = Math.floor(Date.now() / 1000) + duration;

    return { success: true, txSignature };
  }

  private async executeUnlockVe(action: Action): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    if (!this.state.lockEndTime || Date.now() / 1000 < this.state.lockEndTime) {
      return { success: false, error: 'Lock period not expired' };
    }

    const txSignature = await this.client.unlockVe();
    this.state.veAmount = 0n;
    this.state.lockEndTime = null;

    return { success: true, txSignature };
  }

  private async executeCreateMarket(action: Action): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    const { protocolId, metricType, targetValue, description } = action.params;

    if (!protocolId || targetValue === undefined) {
      return { success: false, error: 'Missing market parameters' };
    }

    // Resolution in 24+ hours
    const resolutionTimestamp = Math.floor(Date.now() / 1000) + 86400 + 3600;

    const { signature, marketPDA } = await this.client.createMarket(
      protocolId,
      metricType as MetricType || MetricType.Tvl,
      BigInt(targetValue),
      resolutionTimestamp,
      description || `Will ${protocolId} reach ${targetValue}?`
    );

    return { success: true, txSignature: signature };
  }

  private async executePlaceBet(action: Action): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    const { marketPDA, amount, betYes } = action.params;

    if (!marketPDA || amount === undefined || betYes === undefined) {
      return { success: false, error: 'Missing bet parameters' };
    }

    const betAmount = BigInt(amount);
    if (betAmount > this.state.idlBalance) {
      return { success: false, error: 'Insufficient IDL balance for bet' };
    }

    const marketPubkey = new PublicKey(marketPDA);
    const nonce = BigInt(Date.now());

    const { signature, betPDA } = await this.client.placeBet(
      marketPubkey,
      betAmount,
      betYes,
      nonce
    );

    // Calculate effective amount with staking bonus
    const bonusBps = Math.min(Number(this.state.stakedAmount / 1000000n), 5000);
    const effectiveAmount = betAmount + (betAmount * BigInt(bonusBps)) / 10000n;

    this.state.idlBalance -= betAmount;
    this.state.activeBets.push({
      marketPDA,
      betPDA: betPDA.toBase58(),
      amount: betAmount,
      effectiveAmount,
      betYes,
      nonce,
    });

    this.totalBets++;
    this.totalBetAmount += betAmount;

    return { success: true, txSignature: signature };
  }

  private async executeClaimWinnings(action: Action): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    const { marketPDA, betPDA } = action.params;

    if (!marketPDA || !betPDA) {
      return { success: false, error: 'Missing claim parameters' };
    }

    const txSignature = await this.client.claimWinnings(
      new PublicKey(marketPDA),
      new PublicKey(betPDA)
    );

    // Remove from active bets
    this.state.activeBets = this.state.activeBets.filter(
      b => b.betPDA !== betPDA
    );

    this.wonBets++;

    return { success: true, txSignature };
  }

  /**
   * Update agent state from on-chain data
   */
  async syncState(): Promise<void> {
    try {
      const stakerAccount = await this.client.getStakerAccount();
      if (stakerAccount) {
        this.state.stakedAmount = stakerAccount.stakedAmount;
      }

      const vePosition = await this.client.getVePosition();
      if (vePosition) {
        this.state.veAmount = vePosition.veAmount;
        this.state.lockEndTime = Number(vePosition.lockEnd);
      }
    } catch (error) {
      this.logger.debug(`State sync failed for ${this.config.name}: ${error}`);
    }
  }

  /**
   * Reset round PnL for new round
   */
  resetRoundPnL(): void {
    this.state.roundPnL = 0n;
  }

  /**
   * Get win rate
   */
  getWinRate(): number {
    return this.totalBets > 0 ? this.wonBets / this.totalBets : 0;
  }

  /**
   * Get average bet size
   */
  getAvgBetSize(): bigint {
    return this.totalBets > 0 ? this.totalBetAmount / BigInt(this.totalBets) : 0n;
  }
}
