/**
 * Main Simulation Engine for IDL Protocol Multi-Agent Competition
 */

import { Connection, Keypair, LAMPORTS_PER_SOL, PublicKey } from '@solana/web3.js';
import {
  SimulationConfig,
  SimulationContext,
  SimulationResult,
  RoundResult,
  MarketInfo,
  CompetitorStat,
  AgentConfig,
} from '../types';
import { BaseAgent } from '../agents/base';
import { AGENT_CONFIGS } from '../agents/configs';
import { OpenRouterClient } from '../utils/openrouter';
import { Logger } from '../utils/logger';
import { IdlProtocolClient, deriveStatePDA, deriveMarketPDA } from '../../sdk/src/index';

// Sample protocol IDs from the IDLHub registry
const PROTOCOL_IDS = [
  'jupiter', 'orca', 'raydium', 'marinade', 'solend',
  'drift', 'mango', 'serum', 'phoenix', 'tensor',
  'magic-eden', 'metaplex', 'jito', 'pyth', 'switchboard',
];

export class SimulationEngine {
  private config: SimulationConfig;
  private connection: Connection;
  private agents: BaseAgent[] = [];
  private markets: MarketInfo[] = [];
  private llmClient: OpenRouterClient;
  private logger: Logger;
  private roundResults: RoundResult[] = [];
  private currentRound: number = 0;

  constructor(config: SimulationConfig) {
    this.config = config;
    this.connection = new Connection(config.devnetRpc, 'confirmed');
    this.llmClient = new OpenRouterClient({
      apiKey: config.openRouterApiKey,
    });
    this.logger = Logger.getInstance(config.logLevel);
  }

  /**
   * Initialize the simulation with agents and initial state
   */
  async initialize(): Promise<void> {
    this.logger.info('Initializing simulation...');

    // Create agents with unique wallets
    for (const agentConfig of AGENT_CONFIGS) {
      const wallet = Keypair.generate();

      const agent = new BaseAgent(
        agentConfig,
        wallet,
        this.connection,
        this.llmClient,
        {
          idlBalance: this.config.initialIdlBalance,
        }
      );

      this.agents.push(agent);
      this.logger.info(`Created agent: ${agentConfig.name} (${agentConfig.model})`);
      this.logger.info(`  Wallet: ${wallet.publicKey.toBase58().slice(0, 16)}...`);
    }

    // Create some initial markets for agents to interact with
    await this.seedInitialMarkets();

    this.logger.info(`Simulation initialized with ${this.agents.length} agents`);
  }

  /**
   * Seed some initial prediction markets
   */
  private async seedInitialMarkets(): Promise<void> {
    const now = Math.floor(Date.now() / 1000);

    // Create mock markets (in real scenario these would be on-chain)
    const mockMarkets: MarketInfo[] = [
      {
        pda: Keypair.generate().publicKey.toBase58(),
        protocolId: 'jupiter',
        metricType: 0, // TVL
        targetValue: 1_000_000_000n, // $1B TVL
        resolutionTimestamp: now + 86400 * 2, // 2 days
        description: 'Will Jupiter TVL exceed $1B?',
        totalYesAmount: 5000n * BigInt(1e9),
        totalNoAmount: 3000n * BigInt(1e9),
        resolved: false,
        outcome: null,
        actualValue: null,
        creator: this.agents[0]?.wallet.publicKey.toBase58() || '',
      },
      {
        pda: Keypair.generate().publicKey.toBase58(),
        protocolId: 'raydium',
        metricType: 1, // Volume24h
        targetValue: 500_000_000n, // $500M daily volume
        resolutionTimestamp: now + 86400 * 3,
        description: 'Will Raydium 24h volume exceed $500M?',
        totalYesAmount: 2000n * BigInt(1e9),
        totalNoAmount: 4000n * BigInt(1e9),
        resolved: false,
        outcome: null,
        actualValue: null,
        creator: '',
      },
      {
        pda: Keypair.generate().publicKey.toBase58(),
        protocolId: 'marinade',
        metricType: 2, // Users
        targetValue: 100_000n, // 100k users
        resolutionTimestamp: now + 86400 * 4,
        description: 'Will Marinade reach 100k unique users?',
        totalYesAmount: 1500n * BigInt(1e9),
        totalNoAmount: 1500n * BigInt(1e9),
        resolved: false,
        outcome: null,
        actualValue: null,
        creator: '',
      },
    ];

    this.markets = mockMarkets;
    this.logger.info(`Seeded ${this.markets.length} initial markets`);
  }

  /**
   * Build the current simulation context for agents
   */
  private buildContext(): SimulationContext {
    const competitorStats: CompetitorStat[] = this.agents.map(agent => ({
      agentName: agent.config.name,
      totalPnL: agent.state.totalPnL,
      stakedAmount: agent.state.stakedAmount,
      activeBets: agent.state.activeBets.length,
    }));

    return {
      round: this.currentRound,
      timestamp: Math.floor(Date.now() / 1000),
      markets: this.markets.filter(m => !m.resolved),
      protocolState: {
        totalStaked: this.agents.reduce((sum, a) => sum + a.state.stakedAmount, 0n),
        totalVeSupply: this.agents.reduce((sum, a) => sum + a.state.veAmount, 0n),
        rewardPool: 10000n * BigInt(1e9), // Mock reward pool
      },
      competitorStats,
    };
  }

  /**
   * Run a single round of the simulation
   */
  private async runRound(): Promise<RoundResult> {
    this.currentRound++;
    this.logger.round(this.currentRound, this.config.rounds);

    const context = this.buildContext();
    const agentActions: RoundResult['agentActions'] = [];

    // Reset round PnL for all agents
    this.agents.forEach(a => a.resetRoundPnL());

    // Process each agent sequentially to allow for realistic market updates
    for (const agent of this.agents) {
      try {
        // Get agent's decision from LLM
        const response = await agent.decideAction(context);

        // Execute the action (simulated for non-devnet or real for devnet)
        const result = await this.executeAgentAction(agent, response.action);

        agentActions.push({
          agentName: agent.config.name,
          action: response.action,
          success: result.success,
          error: result.error,
          txSignature: result.txSignature,
        });

        // Small delay between agents to prevent rate limiting
        await this.sleep(500);
      } catch (error) {
        this.logger.error(`Error processing ${agent.config.name}:`, {
          error: error instanceof Error ? error.message : String(error),
        });

        agentActions.push({
          agentName: agent.config.name,
          action: { type: 'WAIT', params: {}, reasoning: 'Error occurred', confidence: 0 },
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    // Update market state based on bets placed this round
    this.updateMarketState();

    // Randomly resolve a market every few rounds for testing
    if (this.currentRound % 3 === 0 && this.markets.some(m => !m.resolved)) {
      await this.resolveRandomMarket();
    }

    // Calculate leaderboard
    const leaderboard = this.calculateLeaderboard();
    this.logger.leaderboard(leaderboard.map(l => ({
      rank: l.rank,
      name: l.agentName,
      pnl: l.totalPnL,
    })));

    const roundResult: RoundResult = {
      round: this.currentRound,
      timestamp: Date.now(),
      agentActions,
      leaderboard,
    };

    this.roundResults.push(roundResult);
    return roundResult;
  }

  /**
   * Execute agent action (simulated mode for testing)
   */
  private async executeAgentAction(
    agent: BaseAgent,
    action: any
  ): Promise<{ success: boolean; error?: string; txSignature?: string }> {
    // Simulated execution for testing
    switch (action.type) {
      case 'STAKE': {
        const amount = BigInt(action.params.amount || 0);
        if (amount <= 0n || amount > agent.state.idlBalance) {
          return { success: false, error: 'Invalid stake amount' };
        }
        agent.state.idlBalance -= amount;
        agent.state.stakedAmount += amount;
        this.logger.agent(agent.config.name, `Staked ${amount} IDL`);
        return { success: true, txSignature: `sim_stake_${Date.now()}` };
      }

      case 'UNSTAKE': {
        const amount = BigInt(action.params.amount || 0);
        if (amount <= 0n || amount > agent.state.stakedAmount) {
          return { success: false, error: 'Invalid unstake amount' };
        }
        agent.state.stakedAmount -= amount;
        agent.state.idlBalance += amount;
        this.logger.agent(agent.config.name, `Unstaked ${amount} IDL`);
        return { success: true, txSignature: `sim_unstake_${Date.now()}` };
      }

      case 'PLACE_BET': {
        const { marketPDA, amount, betYes } = action.params;
        const betAmount = BigInt(amount || 0);

        if (!marketPDA) {
          return { success: false, error: 'No market specified' };
        }
        if (betAmount <= 0n || betAmount > agent.state.idlBalance) {
          return { success: false, error: 'Invalid bet amount' };
        }

        const market = this.markets.find(m => m.pda === marketPDA);
        if (!market || market.resolved) {
          return { success: false, error: 'Invalid or resolved market' };
        }

        // Calculate effective amount with staking bonus
        const bonusBps = Math.min(Number(agent.state.stakedAmount / BigInt(1e9) / 1000000n), 5000);
        const effectiveAmount = betAmount + (betAmount * BigInt(bonusBps)) / 10000n;

        // Update market state
        if (betYes) {
          market.totalYesAmount += effectiveAmount;
        } else {
          market.totalNoAmount += effectiveAmount;
        }

        // Update agent state
        agent.state.idlBalance -= betAmount;
        agent.state.activeBets.push({
          marketPDA,
          betPDA: `bet_${Date.now()}_${Math.random().toString(36).slice(2)}`,
          amount: betAmount,
          effectiveAmount,
          betYes,
          nonce: BigInt(Date.now()),
        });

        agent.totalBets++;
        agent.totalBetAmount += betAmount;

        this.logger.agent(
          agent.config.name,
          `Placed ${betYes ? 'YES' : 'NO'} bet of ${betAmount} IDL on ${market.protocolId}`
        );
        this.logger.market(
          market.pda,
          market.totalYesAmount,
          market.totalNoAmount
        );

        return { success: true, txSignature: `sim_bet_${Date.now()}` };
      }

      case 'CREATE_MARKET': {
        const { protocolId, metricType, targetValue, description } = action.params;

        if (!protocolId) {
          return { success: false, error: 'No protocol ID specified' };
        }

        const newMarket: MarketInfo = {
          pda: Keypair.generate().publicKey.toBase58(),
          protocolId,
          metricType: metricType || 0,
          targetValue: BigInt(targetValue || 0),
          resolutionTimestamp: Math.floor(Date.now() / 1000) + 86400 * 2,
          description: description || `Will ${protocolId} reach target?`,
          totalYesAmount: 0n,
          totalNoAmount: 0n,
          resolved: false,
          outcome: null,
          actualValue: null,
          creator: agent.wallet.publicKey.toBase58(),
        };

        this.markets.push(newMarket);
        this.logger.agent(agent.config.name, `Created market: ${description}`);

        return { success: true, txSignature: `sim_create_${Date.now()}` };
      }

      case 'LOCK_VE': {
        const duration = Number(action.params.duration || 604800);
        if (agent.state.stakedAmount <= 0n) {
          return { success: false, error: 'No staked tokens to lock' };
        }

        agent.state.veAmount = (agent.state.stakedAmount * BigInt(duration)) / BigInt(126144000);
        agent.state.lockEndTime = Math.floor(Date.now() / 1000) + duration;

        this.logger.agent(agent.config.name, `Locked for veIDL: ${agent.state.veAmount}`);
        return { success: true, txSignature: `sim_lock_${Date.now()}` };
      }

      case 'CLAIM_WINNINGS': {
        const { betPDA } = action.params;
        const bet = agent.state.activeBets.find(b => b.betPDA === betPDA);

        if (!bet) {
          return { success: false, error: 'Bet not found' };
        }

        const market = this.markets.find(m => m.pda === bet.marketPDA);
        if (!market || !market.resolved) {
          return { success: false, error: 'Market not resolved' };
        }

        const won = market.outcome === bet.betYes;
        if (!won) {
          return { success: false, error: 'Bet did not win' };
        }

        // Calculate winnings (simplified parimutuel)
        const winningPool = bet.betYes ? market.totalYesAmount : market.totalNoAmount;
        const losingPool = bet.betYes ? market.totalNoAmount : market.totalYesAmount;
        const share = winningPool > 0n
          ? (bet.effectiveAmount * losingPool) / winningPool
          : 0n;
        const gross = bet.amount + share;
        const fee = (gross * 300n) / 10000n;
        const net = gross - fee;

        agent.state.idlBalance += net;
        agent.state.totalPnL += net - bet.amount;
        agent.state.roundPnL += net - bet.amount;
        agent.state.activeBets = agent.state.activeBets.filter(b => b.betPDA !== betPDA);
        agent.wonBets++;

        this.logger.agent(agent.config.name, `Claimed winnings: +${net - bet.amount} IDL`);
        return { success: true, txSignature: `sim_claim_${Date.now()}` };
      }

      case 'WAIT':
      case 'ANALYZE':
        this.logger.agent(agent.config.name, `${action.type}: ${action.reasoning}`);
        return { success: true };

      default:
        return { success: false, error: `Unknown action: ${action.type}` };
    }
  }

  /**
   * Update market state (e.g., resolve old markets)
   */
  private updateMarketState(): void {
    // Add small random fluctuations to market odds
    for (const market of this.markets) {
      if (!market.resolved) {
        const noise = BigInt(Math.floor(Math.random() * 100)) * BigInt(1e9);
        if (Math.random() > 0.5) {
          market.totalYesAmount += noise;
        } else {
          market.totalNoAmount += noise;
        }
      }
    }
  }

  /**
   * Resolve a random market for testing
   */
  private async resolveRandomMarket(): Promise<void> {
    const unresolvedMarkets = this.markets.filter(m => !m.resolved);
    if (unresolvedMarkets.length === 0) return;

    const market = unresolvedMarkets[Math.floor(Math.random() * unresolvedMarkets.length)];
    market.resolved = true;

    // Smarter resolution: slightly favor the underdog (contrarian edge)
    const total = market.totalYesAmount + market.totalNoAmount;
    const yesRatio = total > 0n ? Number(market.totalYesAmount * 100n / total) : 50;
    // 40% base chance for underdog to win (rewards contrarian betting)
    const underdogBonus = Math.abs(50 - yesRatio) / 100; // 0 to 0.5
    const yesWinChance = yesRatio < 50
      ? 0.5 + underdogBonus * 0.3 // Underdog YES gets boost
      : 0.5 - underdogBonus * 0.3; // Favorite YES gets penalty

    market.outcome = Math.random() < yesWinChance;
    market.actualValue = market.outcome
      ? market.targetValue + BigInt(Math.floor(Math.random() * 1000000))
      : market.targetValue - BigInt(Math.floor(Math.random() * 1000000));

    this.logger.info(
      `Market resolved: ${market.protocolId} - Outcome: ${market.outcome ? 'YES' : 'NO'} (was ${yesRatio}% YES)`
    );

    // Process winning/losing bets for all agents - AUTO-CLAIM winnings
    for (const agent of this.agents) {
      const bets = agent.state.activeBets.filter(b => b.marketPDA === market.pda);

      for (const bet of bets) {
        const won = market.outcome === bet.betYes;

        if (won) {
          // AUTO-CLAIM: Calculate and credit winnings immediately
          const winningPool = bet.betYes ? market.totalYesAmount : market.totalNoAmount;
          const losingPool = bet.betYes ? market.totalNoAmount : market.totalYesAmount;
          const share = winningPool > 0n
            ? (bet.effectiveAmount * losingPool) / winningPool
            : 0n;
          const gross = bet.amount + share;
          const fee = (gross * 300n) / 10000n;
          const net = gross - fee;
          const profit = net - bet.amount;

          agent.state.idlBalance += net;
          agent.state.totalPnL += profit;
          agent.state.roundPnL += profit;
          agent.wonBets++;

          this.logger.agent(
            agent.config.name,
            `WON on ${market.protocolId}! +${profit} IDL (bet: ${bet.amount}, won: ${net})`
          );
        } else {
          // Losing bet - update PnL
          agent.state.totalPnL -= bet.amount;
          agent.state.roundPnL -= bet.amount;
          this.logger.agent(agent.config.name, `LOST on ${market.protocolId}: -${bet.amount} IDL`);
        }

        // Remove bet from active bets
        agent.state.activeBets = agent.state.activeBets.filter(b => b.betPDA !== bet.betPDA);
      }
    }

    // Pay market creator fee (25% of total fees)
    const totalBets = market.totalYesAmount + market.totalNoAmount;
    const totalFees = (totalBets * 300n) / 10000n; // 3% fee
    const creatorFee = (totalFees * 25n) / 100n; // 25% to creator
    const creator = this.agents.find(a => a.wallet.publicKey.toBase58() === market.creator);
    if (creator && creatorFee > 0n) {
      creator.state.idlBalance += creatorFee;
      creator.state.totalPnL += creatorFee;
      this.logger.agent(creator.config.name, `Earned creator fee: +${creatorFee} IDL`);
    }

    // Add a new market to replace resolved one
    const randomProtocol = PROTOCOL_IDS[Math.floor(Math.random() * PROTOCOL_IDS.length)];
    this.markets.push({
      pda: Keypair.generate().publicKey.toBase58(),
      protocolId: randomProtocol,
      metricType: Math.floor(Math.random() * 5),
      targetValue: BigInt(Math.floor(Math.random() * 10000000000)),
      resolutionTimestamp: Math.floor(Date.now() / 1000) + 86400 * 3,
      description: `New market for ${randomProtocol}`,
      totalYesAmount: BigInt(Math.floor(Math.random() * 5000)) * BigInt(1e9),
      totalNoAmount: BigInt(Math.floor(Math.random() * 5000)) * BigInt(1e9),
      resolved: false,
      outcome: null,
      actualValue: null,
      creator: '',
    });
  }

  /**
   * Calculate current leaderboard
   */
  private calculateLeaderboard(): RoundResult['leaderboard'] {
    const rankings = this.agents
      .map(agent => ({
        agentName: agent.config.name,
        totalPnL: agent.state.totalPnL,
        roundPnL: agent.state.roundPnL,
      }))
      .sort((a, b) => {
        if (b.totalPnL > a.totalPnL) return 1;
        if (b.totalPnL < a.totalPnL) return -1;
        return 0;
      });

    return rankings.map((r, i) => ({
      rank: i + 1,
      ...r,
    }));
  }

  /**
   * Run the full simulation
   */
  async run(): Promise<SimulationResult> {
    const startTime = Date.now();

    this.logger.info('Starting IDL Protocol Multi-Agent Simulation');
    this.logger.info(`Rounds: ${this.config.rounds}`);
    this.logger.info(`Initial IDL Balance: ${this.config.initialIdlBalance}`);

    await this.initialize();

    for (let i = 0; i < this.config.rounds; i++) {
      await this.runRound();
      await this.sleep(this.config.roundDurationMs);
    }

    const endTime = Date.now();

    // Calculate final results
    const finalLeaderboard = this.agents
      .map(agent => ({
        agentName: agent.config.name,
        totalPnL: agent.state.totalPnL,
        winRate: agent.getWinRate(),
        totalBets: agent.totalBets,
        avgBetSize: agent.getAvgBetSize(),
      }))
      .sort((a, b) => {
        if (b.totalPnL > a.totalPnL) return 1;
        if (b.totalPnL < a.totalPnL) return -1;
        return 0;
      })
      .map((r, i) => ({ rank: i + 1, ...r }));

    const winner = finalLeaderboard[0]?.agentName || 'No winner';

    this.logger.winner(winner, finalLeaderboard[0]?.totalPnL || 0n);

    return {
      startTime,
      endTime,
      totalRounds: this.config.rounds,
      roundResults: this.roundResults,
      finalLeaderboard,
      winner,
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
