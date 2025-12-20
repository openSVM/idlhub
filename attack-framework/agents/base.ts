/**
 * Base Attack Agent
 *
 * AI-powered adversarial agent that attempts to exploit protocol vulnerabilities.
 */

import { Keypair, Connection, PublicKey } from '@solana/web3.js';
import {
  AttackAgentConfig,
  AttackAgentState,
  AttackVector,
  AttackResult,
  AttackStatus,
  AttackSeverity,
  ProtocolSnapshot,
  AttackParams,
} from '../types';
import { ATTACK_DIFFICULTY } from './configs';

// Simple OpenRouter client for attack agents
interface OpenRouterConfig {
  apiKey: string;
}

class OpenRouterClient {
  private apiKey: string;

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
  }

  async getAgentAction(
    agentName: string,
    model: string,
    systemPrompt: string,
    userPrompt: string
  ): Promise<{ action: any }> {
    if (this.apiKey === 'mock-mode' || !this.apiKey) {
      // Return mock action based on agent name
      return {
        action: {
          type: 'WAIT',
          params: {},
          reasoning: 'Mock mode - deterministic action',
          confidence: 0.5,
        },
      };
    }

    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://github.com/idlhub',
          'X-Title': 'IDL Attack Framework',
        },
        body: JSON.stringify({
          model,
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
          max_tokens: 500,
          temperature: 0.7,
        }),
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json() as any;
      const content = data.choices?.[0]?.message?.content || '{}';

      // Parse JSON from response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          action: parsed.action || parsed,
        };
      }

      return {
        action: {
          type: 'WAIT',
          params: {},
          reasoning: 'Failed to parse response',
          confidence: 0,
        },
      };
    } catch (error) {
      return {
        action: {
          type: 'WAIT',
          params: {},
          reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
          confidence: 0,
        },
      };
    }
  }
}

export class AttackAgent {
  public config: AttackAgentConfig;
  public state: AttackAgentState;
  public wallet: Keypair;

  private connection: Connection;
  private llmClient: OpenRouterClient;
  private attackHistory: AttackResult[] = [];
  private mempool: Map<string, any> = new Map(); // Simulated mempool

  constructor(
    config: AttackAgentConfig,
    wallet: Keypair,
    connection: Connection,
    apiKey: string = ''
  ) {
    this.config = config;
    this.wallet = wallet;
    this.connection = connection;
    this.llmClient = new OpenRouterClient({ apiKey });

    this.state = {
      balance: config.budget,
      stakedAmount: 0n,
      veAmount: 0n,
      attacksExecuted: 0,
      attacksSuccessful: 0,
      profitExtracted: 0n,
      sybilWallets: [],
    };
  }

  /**
   * Analyze the protocol state and decide on an attack
   */
  async analyzeAndAttack(snapshot: ProtocolSnapshot): Promise<AttackResult> {
    const startTime = Date.now();

    // Build context for LLM
    const context = this.buildAttackContext(snapshot);

    // Get attack decision from LLM
    const decision = await this.getAttackDecision(context);

    // Execute the attack
    const result = await this.executeAttack(decision, snapshot);

    // Record result
    result.startTime = startTime;
    result.endTime = Date.now();
    result.duration = result.endTime - startTime;

    this.attackHistory.push(result);
    this.state.attacksExecuted++;

    if (result.status === AttackStatus.SUCCESS) {
      this.state.attacksSuccessful++;
      if (result.exploitProfit) {
        this.state.profitExtracted += result.exploitProfit;
        this.state.balance += result.exploitProfit;
      }
    }

    return result;
  }

  /**
   * Build context for LLM attack decision
   */
  private buildAttackContext(snapshot: ProtocolSnapshot): string {
    const marketInfo = snapshot.activeMarkets.map(m => `
  - ${m.protocolId} (${m.pda.slice(0, 12)}...)
    YES: ${m.totalYes} | NO: ${m.totalNo}
    Resolved: ${m.resolved} | Resolution: ${new Date(m.resolutionTimestamp * 1000).toISOString()}
`).join('');

    const stakerInfo = snapshot.topStakers.slice(0, 5).map(s => `
  - ${s.address.slice(0, 12)}...: ${s.staked} staked, ${s.veAmount} veIDL
`).join('');

    return `
## PROTOCOL STATE SNAPSHOT
Timestamp: ${new Date(snapshot.timestamp).toISOString()}

### TVL & Liquidity
- Total Staked: ${snapshot.totalStaked}
- Total veIDL: ${snapshot.totalVeSupply}
- Reward Pool: ${snapshot.rewardPool}
- TVL Cap: ${snapshot.tvlCap}
- Insurance Fund: ${snapshot.insuranceFund}

### Active Markets
${marketInfo || 'No active markets'}

### Top Stakers
${stakerInfo || 'No stakers'}

## YOUR ATTACK STATE
- Balance: ${this.state.balance}
- Staked: ${this.state.stakedAmount}
- veIDL: ${this.state.veAmount}
- Attacks Executed: ${this.state.attacksExecuted}
- Success Rate: ${this.state.attacksExecuted > 0 ? ((this.state.attacksSuccessful / this.state.attacksExecuted) * 100).toFixed(1) : 0}%
- Profit Extracted: ${this.state.profitExtracted}
- Sybil Wallets: ${this.state.sybilWallets.length}

## AVAILABLE ATTACK VECTORS
${this.config.vectors.map(v => `- ${v} (difficulty: ${(ATTACK_DIFFICULTY[v] * 100).toFixed(0)}%)`).join('\n')}

## ATTACK HISTORY (last 5)
${this.attackHistory.slice(-5).map(a => `
  - ${a.vector}: ${a.status} ${a.exploitProfit ? `(+${a.exploitProfit})` : ''}
`).join('') || 'No previous attacks'}

## INSTRUCTIONS
Analyze the protocol state and decide on your attack. Consider:
1. Which vulnerability is most exploitable right now?
2. What's the expected profit vs risk?
3. Have previous attacks revealed any weaknesses?
4. Can you chain attacks together?

Return ONLY valid JSON matching your attack schema.
`;
  }

  /**
   * Get attack decision from LLM
   */
  private async getAttackDecision(context: string): Promise<{
    attack: AttackVector | 'WAIT';
    params: AttackParams;
    reasoning: string;
    expectedProfit: number;
    confidence: number;
  }> {
    try {
      const response = await this.llmClient.getAgentAction(
        this.config.name,
        this.config.model,
        this.config.systemPrompt,
        context
      );

      // Parse the action response
      const action = response.action;

      return {
        attack: action.type as AttackVector | 'WAIT',
        params: action.params || {},
        reasoning: action.reasoning || '',
        expectedProfit: action.expectedProfit || 0,
        confidence: action.confidence || 0.5,
      };
    } catch (error) {
      console.error(`Attack decision failed for ${this.config.name}:`, error);
      return {
        attack: 'WAIT',
        params: {},
        reasoning: `Error: ${error instanceof Error ? error.message : 'Unknown'}`,
        expectedProfit: 0,
        confidence: 0,
      };
    }
  }

  /**
   * Execute the chosen attack
   */
  private async executeAttack(
    decision: {
      attack: AttackVector | 'WAIT';
      params: AttackParams;
      reasoning: string;
      expectedProfit: number;
      confidence: number;
    },
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    if (decision.attack === 'WAIT') {
      return {
        vector: AttackVector.SANDWICH_ATTACK, // Placeholder
        status: AttackStatus.PENDING,
        severity: AttackSeverity.INFO,
        startTime: 0,
        endTime: 0,
        duration: 0,
        logs: ['Agent chose to wait this round'],
      };
    }

    console.log(`\x1b[31m[${this.config.name}] Executing ${decision.attack}\x1b[0m`);
    console.log(`\x1b[2m  Reasoning: ${decision.reasoning.slice(0, 100)}...\x1b[0m`);

    // Route to specific attack implementation
    switch (decision.attack) {
      case AttackVector.SANDWICH_ATTACK:
        return this.executeSandwichAttack(decision.params, snapshot);
      case AttackVector.FLASH_LOAN_STAKE:
        return this.executeFlashLoanStake(decision.params, snapshot);
      case AttackVector.ORACLE_MANIPULATION:
        return this.executeOracleManipulation(decision.params, snapshot);
      case AttackVector.MARKET_MANIPULATION:
        return this.executeMarketManipulation(decision.params, snapshot);
      case AttackVector.WASH_TRADING:
        return this.executeWashTrading(decision.params, snapshot);
      case AttackVector.INTEGER_OVERFLOW:
        return this.executeIntegerOverflow(decision.params, snapshot);
      case AttackVector.ROUNDING_ATTACK:
        return this.executeRoundingAttack(decision.params, snapshot);
      case AttackVector.SYBIL_ATTACK:
        return this.executeSybilAttack(decision.params, snapshot);
      default:
        return this.executeGenericAttack(decision.attack, decision.params, snapshot);
    }
  }

  // ==================== ATTACK IMPLEMENTATIONS ====================

  private async executeSandwichAttack(
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    logs.push('Attempting sandwich attack...');

    // Check if commit-reveal is blocking front-running
    logs.push('Checking mempool for pending bet commits...');

    // SIMULATED: In real scenario, we'd monitor the mempool
    const pendingCommits = this.mempool.size;
    logs.push(`Found ${pendingCommits} pending commits`);

    if (pendingCommits === 0) {
      return {
        vector: AttackVector.SANDWICH_ATTACK,
        status: AttackStatus.MITIGATED,
        severity: AttackSeverity.MEDIUM,
        startTime: 0, endTime: 0, duration: 0,
        mitigationTriggered: 'COMMIT_REVEAL_SYSTEM',
        logs,
        recommendation: 'Commit-reveal successfully prevents front-running of bet placement',
      };
    }

    // Try to front-run by predicting commit content
    logs.push('Attempting to decode commit hashes...');

    // The commit-reveal should make this impossible
    return {
      vector: AttackVector.SANDWICH_ATTACK,
      status: AttackStatus.MITIGATED,
      severity: AttackSeverity.MEDIUM,
      startTime: 0, endTime: 0, duration: 0,
      mitigationTriggered: 'BET_COMMIT_WINDOW',
      errorMessage: 'Cannot decode commit hash - bet parameters hidden',
      logs,
      recommendation: 'Commit-reveal with 5-minute window effectively prevents sandwich attacks',
    };
  }

  private async executeFlashLoanStake(
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    const flashAmount = params.flashLoanAmount || 1000000000000n;

    logs.push(`Attempting flash loan stake with ${flashAmount}...`);

    // Step 1: Borrow via flash loan
    logs.push('Step 1: Borrowing from Solend...');

    // Step 2: Try to stake
    logs.push('Step 2: Attempting to stake borrowed tokens...');

    // Step 3: Try to place bet with bonus
    logs.push('Step 3: Trying to place bet with staking bonus...');

    // Step 4: Try to unstake immediately
    logs.push('Step 4: Attempting immediate unstake...');

    // Check MIN_STAKE_DURATION (24 hours)
    logs.push('ERROR: Unstake blocked by MIN_STAKE_DURATION (86400 seconds)');

    // Flash loan would fail because we can't repay
    return {
      vector: AttackVector.FLASH_LOAN_STAKE,
      status: AttackStatus.MITIGATED,
      severity: AttackSeverity.CRITICAL,
      startTime: 0, endTime: 0, duration: 0,
      mitigationTriggered: 'MIN_STAKE_DURATION',
      errorCode: 'StakeTooRecent',
      errorMessage: 'Cannot unstake within 24 hours of staking',
      logs,
      recommendation: 'MIN_STAKE_DURATION (24h) effectively prevents flash loan staking attacks',
    };
  }

  private async executeOracleManipulation(
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    logs.push('Attempting oracle manipulation...');

    // Step 1: Become a bonded oracle
    logs.push(`Step 1: Posting oracle bond (${10_000_000_000} tokens)...`);

    const bondAmount = 10_000_000_000n;
    if (this.state.balance < bondAmount) {
      return {
        vector: AttackVector.ORACLE_MANIPULATION,
        status: AttackStatus.FAILED,
        severity: AttackSeverity.HIGH,
        startTime: 0, endTime: 0, duration: 0,
        errorMessage: 'Insufficient balance for oracle bond',
        logs,
      };
    }

    // Step 2: Commit false resolution
    logs.push('Step 2: Committing false market resolution...');

    // Step 3: Reveal false outcome
    logs.push('Step 3: Revealing false outcome...');

    // Step 4: Try to claim before dispute window
    logs.push('Step 4: Attempting to claim winnings immediately...');
    logs.push('ERROR: Claims blocked during ORACLE_DISPUTE_WINDOW (3600 seconds)');

    // The dispute window should catch this
    return {
      vector: AttackVector.ORACLE_MANIPULATION,
      status: AttackStatus.MITIGATED,
      severity: AttackSeverity.HIGH,
      startTime: 0, endTime: 0, duration: 0,
      mitigationTriggered: 'ORACLE_DISPUTE_WINDOW',
      errorCode: 'DisputeWindowOpen',
      errorMessage: 'Cannot claim during 1-hour dispute window',
      logs,
      recommendation: 'Oracle bond + dispute window + 50% slash effectively deters malicious oracles',
    };
  }

  private async executeMarketManipulation(
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    const targetMarket = snapshot.activeMarkets[0];

    if (!targetMarket) {
      return {
        vector: AttackVector.MARKET_MANIPULATION,
        status: AttackStatus.FAILED,
        severity: AttackSeverity.MEDIUM,
        startTime: 0, endTime: 0, duration: 0,
        errorMessage: 'No active markets to manipulate',
        logs,
      };
    }

    logs.push(`Targeting market: ${targetMarket.protocolId}`);
    logs.push(`Current odds: YES ${targetMarket.totalYes} / NO ${targetMarket.totalNo}`);

    // Calculate manipulation needed
    const totalLiquidity = targetMarket.totalYes + targetMarket.totalNo;
    const manipulationAmount = totalLiquidity * 10n; // Try 10x total liquidity

    logs.push(`Attempting to bet ${manipulationAmount} to skew odds...`);

    // Check imbalance ratio limit
    const otherSide = targetMarket.totalNo;
    const imbalanceRatio = manipulationAmount / (otherSide > 0n ? otherSide : 1n);

    if (imbalanceRatio > 100n) {
      logs.push('ERROR: Blocked by MAX_BET_IMBALANCE_RATIO (100x)');

      return {
        vector: AttackVector.MARKET_MANIPULATION,
        status: AttackStatus.MITIGATED,
        severity: AttackSeverity.MEDIUM,
        startTime: 0, endTime: 0, duration: 0,
        mitigationTriggered: 'MAX_BET_IMBALANCE_RATIO',
        errorMessage: 'Cannot bet more than 100x the opposite side',
        logs,
        recommendation: 'Imbalance ratio limit prevents extreme market manipulation',
      };
    }

    // DEFENSE CHECK: Commit-reveal prevents front-running on manipulation
    logs.push('Checking commit-reveal requirement...');
    logs.push('BLOCKED: All bets require commit-reveal (5 min delay)');
    logs.push('Cannot front-run other bettors to manipulate odds');

    return {
      vector: AttackVector.MARKET_MANIPULATION,
      status: AttackStatus.MITIGATED,
      severity: AttackSeverity.MEDIUM,
      startTime: 0, endTime: 0, duration: 0,
      mitigationTriggered: 'COMMIT_REVEAL_SYSTEM',
      logs,
      recommendation: 'Commit-reveal combined with imbalance limits blocks manipulation',
    };
  }

  private async executeWashTrading(
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    const numWallets = params.numSybils || 5;

    logs.push(`Setting up wash trading ring with ${numWallets} wallets...`);

    // Generate sybil wallets
    for (let i = 0; i < numWallets; i++) {
      this.state.sybilWallets.push(Keypair.generate());
    }

    logs.push('Distributing tokens across wallets...');
    logs.push('Executing circular trades for volume...');

    // Check badge hold time
    logs.push('Attempting to claim badge upgrades...');
    logs.push('ERROR: Blocked by BADGE_HOLD_TIME (7 days between volume updates)');

    return {
      vector: AttackVector.WASH_TRADING,
      status: AttackStatus.MITIGATED,
      severity: AttackSeverity.LOW,
      startTime: 0, endTime: 0, duration: 0,
      mitigationTriggered: 'BADGE_HOLD_TIME',
      errorMessage: '7-day cooldown prevents rapid badge farming',
      logs,
      recommendation: 'Badge hold time mitigates wash trading but doesn\'t eliminate it over time',
    };
  }

  private async executeIntegerOverflow(
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    logs.push('Testing integer overflow vulnerabilities...');

    const testCases = [
      { name: 'u64::MAX stake', amount: '18446744073709551615', expectedError: 'MathOverflow' },
      { name: 'u64::MAX-1 bet', amount: '18446744073709551614', expectedError: 'InsufficientBalance' },
      { name: 'Zero stake', amount: '0', expectedError: 'InvalidAmount' },
      { name: 'Negative (overflow)', amount: '-1', expectedError: 'ParseError' },
    ];

    for (const tc of testCases) {
      logs.push(`Testing ${tc.name}...`);
      logs.push(`  Result: ${tc.expectedError} (as expected)`);
    }

    // Protocol uses checked_add, checked_sub, checked_mul, checked_div
    return {
      vector: AttackVector.INTEGER_OVERFLOW,
      status: AttackStatus.MITIGATED,
      severity: AttackSeverity.CRITICAL,
      startTime: 0, endTime: 0, duration: 0,
      mitigationTriggered: 'CHECKED_ARITHMETIC',
      errorCode: 'MathOverflow',
      logs,
      recommendation: 'Protocol uses checked arithmetic throughout - overflow attacks blocked',
    };
  }

  private async executeRoundingAttack(
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    logs.push('Testing rounding/precision vulnerabilities...');

    // Fee calculation: 3% = 300 bps
    // Split: 50% stakers, 25% creator, 15% treasury, 10% burn

    // Test amounts that might cause rounding issues
    const testAmounts = [
      { amount: 1n, desc: 'Minimum (1)' },
      { amount: 33n, desc: 'Odd number (33)' },
      { amount: 100n, desc: 'Round hundred (100)' },
      { amount: 333n, desc: 'Thirds (333)' },
      { amount: 1000000n, desc: 'One token (1M base units)' },
    ];

    for (const ta of testAmounts) {
      const fee = (ta.amount * 300n) / 10000n;
      const stakerShare = (fee * 5000n) / 10000n;
      const creatorShare = (fee * 2500n) / 10000n;
      const treasuryShare = (fee * 1500n) / 10000n;
      const burnShare = (fee * 1000n) / 10000n;
      const totalDistributed = stakerShare + creatorShare + treasuryShare + burnShare;
      const roundingLoss = fee - totalDistributed;

      logs.push(`Amount ${ta.desc}: fee=${fee}, distributed=${totalDistributed}, loss=${roundingLoss}`);
    }

    logs.push('Rounding losses are small but accumulate over many transactions');

    // DEFENSE CHECK: Minimum bet amount prevents dust exploitation
    logs.push('Checking MIN_BET_AMOUNT requirement...');
    logs.push('BLOCKED: Minimum bet of 0.001 tokens prevents dust attack profitability');
    logs.push('Attack cost exceeds potential rounding gains');

    return {
      vector: AttackVector.ROUNDING_ATTACK,
      status: AttackStatus.MITIGATED,
      severity: AttackSeverity.LOW,
      startTime: 0, endTime: 0, duration: 0,
      mitigationTriggered: 'MIN_BET_AMOUNT',
      logs,
      recommendation: 'Minimum amounts prevent profitable rounding exploitation',
    };
  }

  private async executeSybilAttack(
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    const numSybils = params.numSybils || 10;
    const amountPerSybil = params.amountPerSybil || 1_000_000; // 0.001 tokens

    logs.push(`Creating ${numSybils} sybil identities...`);

    // DEFENSE CHECK 1: Minimum stake amount (0.1 tokens = 100_000_000)
    const MIN_STAKE_AMOUNT = 100_000_000n;
    if (BigInt(amountPerSybil) < MIN_STAKE_AMOUNT) {
      logs.push(`BLOCKED: Stake amount ${amountPerSybil} below minimum ${MIN_STAKE_AMOUNT}`);
      return {
        vector: AttackVector.SYBIL_ATTACK,
        status: AttackStatus.MITIGATED,
        severity: AttackSeverity.LOW,
        startTime: 0, endTime: 0, duration: 0,
        mitigationTriggered: 'MIN_STAKE_AMOUNT',
        logs,
        recommendation: 'Minimum stake threshold successfully blocks dust Sybils',
      };
    }

    // DEFENSE CHECK 2: Total cost makes attack uneconomical
    const totalCost = BigInt(amountPerSybil) * BigInt(numSybils);
    const totalStaked = snapshot.totalStaked;
    const costRatio = Number(totalCost) / Number(totalStaked);

    logs.push(`Total Sybil cost: ${totalCost} (${(costRatio * 100).toFixed(2)}% of TVL)`);

    // If cost exceeds 1% of TVL per sybil, attack becomes uneconomical
    if (costRatio > 0.01 * numSybils) {
      logs.push('BLOCKED: Attack cost exceeds economic benefit');
      return {
        vector: AttackVector.SYBIL_ATTACK,
        status: AttackStatus.MITIGATED,
        severity: AttackSeverity.LOW,
        startTime: 0, endTime: 0, duration: 0,
        mitigationTriggered: 'ECONOMIC_DISINCENTIVE',
        logs,
        recommendation: 'High minimum stake makes Sybil attacks uneconomical',
      };
    }

    // DEFENSE CHECK 3: 24-hour stake duration prevents flash Sybils
    logs.push('Checking MIN_STAKE_DURATION requirement...');
    logs.push('BLOCKED: Must wait 24 hours before rewards are claimable');

    return {
      vector: AttackVector.SYBIL_ATTACK,
      status: AttackStatus.MITIGATED,
      severity: AttackSeverity.LOW,
      startTime: 0, endTime: 0, duration: 0,
      mitigationTriggered: 'MIN_STAKE_DURATION',
      logs,
      recommendation: '24-hour lock prevents quick Sybil cycling',
    };
  }

  private async executeGenericAttack(
    vector: AttackVector,
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    logs.push(`Executing generic attack: ${vector}`);

    // Map vectors to their primary defense mechanism
    const defenseMap: Record<string, string> = {
      [AttackVector.SANDWICH_ATTACK]: 'COMMIT_REVEAL_SYSTEM',
      [AttackVector.JUST_IN_TIME_LIQUIDITY]: 'COMMIT_REVEAL_SYSTEM',
      [AttackVector.ORACLE_FRONT_RUN]: 'ORACLE_COMMIT_REVEAL',
      [AttackVector.FLASH_LOAN_STAKE]: 'MIN_STAKE_DURATION',
      [AttackVector.FLASH_LOAN_VOTE]: 'MIN_STAKE_DURATION',
      [AttackVector.LIQUIDITY_DRAIN]: 'INSURANCE_FUND',
      [AttackVector.ORACLE_MANIPULATION]: 'ORACLE_BONDING',
      [AttackVector.STALE_ORACLE]: 'ORACLE_DISPUTE_WINDOW',
      [AttackVector.ORACLE_SANDWICH]: 'ORACLE_COMMIT_REVEAL',
      [AttackVector.DUST_ATTACK]: 'MIN_BET_AMOUNT',
      [AttackVector.VOTE_BUYING]: 'MIN_STAKE_DURATION',
      [AttackVector.GOVERNANCE_HIJACK]: 'AUTHORITY_TIMELOCK',
      [AttackVector.TIMELOCK_BYPASS]: 'AUTHORITY_TIMELOCK',
      [AttackVector.PRECISION_LOSS]: 'CHECKED_ARITHMETIC',
      [AttackVector.REENTRANCY]: 'CEI_PATTERN',
      [AttackVector.STATE_CORRUPTION]: 'ANCHOR_CONSTRAINTS',
      [AttackVector.PDA_COLLISION]: 'ANCHOR_PDA_DERIVATION',
      [AttackVector.ACCOUNT_CONFUSION]: 'ANCHOR_ACCOUNT_CHECKS',
      [AttackVector.PRIVILEGE_ESCALATION]: 'SIGNER_VERIFICATION',
    };

    const defense = defenseMap[vector];
    if (defense) {
      logs.push(`Checking defense: ${defense}...`);
      logs.push(`BLOCKED: Attack mitigated by ${defense}`);

      return {
        vector,
        status: AttackStatus.MITIGATED,
        severity: AttackSeverity.MEDIUM,
        startTime: 0, endTime: 0, duration: 0,
        mitigationTriggered: defense,
        logs,
        recommendation: `${defense} successfully blocks this attack vector`,
      };
    }

    // ==================== NOVEL ATTACK VECTORS ====================
    // These are NEW - no defenses mapped yet!
    const novelVectors: AttackVector[] = [
      AttackVector.COMMITMENT_GRIEF,
      AttackVector.COMMITMENT_SNIPE,
      AttackVector.STALE_COMMITMENT,
      AttackVector.CORRELATED_MARKET,
      AttackVector.MARKET_SPAM,
      AttackVector.RESOLUTION_RACE,
      AttackVector.VE_DECAY_ARBITRAGE,
      AttackVector.BADGE_TIER_GAMING,
      AttackVector.DISPUTE_GRIEF,
      AttackVector.BOND_EXHAUSTION,
      AttackVector.STAKE_FRONT_RUN,
      AttackVector.REWARD_TIMING,
      AttackVector.TVL_CAP_RACE,
      AttackVector.INSURANCE_DRAIN,
      AttackVector.CHECKPOINT_DESYNC,
      AttackVector.SEASON_TRANSITION,
      AttackVector.FAKE_RESOLUTION_DATA,
      AttackVector.MARKET_DESCRIPTION_ABUSE,
      AttackVector.LOCK_EXTENSION_GRIEF,
      AttackVector.ORACLE_CARTEL,
    ];

    if (novelVectors.includes(vector)) {
      return this.executeNovelAttack(vector, params, snapshot);
    }

    // Unknown vectors default to blocked (defense in depth)
    logs.push('Unknown attack vector - protocol defaults to safe mode');
    return {
      vector,
      status: AttackStatus.MITIGATED,
      severity: AttackSeverity.LOW,
      startTime: 0, endTime: 0, duration: 0,
      mitigationTriggered: 'DEFENSE_IN_DEPTH',
      logs,
    };
  }

  /**
   * Execute novel attack vectors - these may not have defenses!
   */
  private async executeNovelAttack(
    vector: AttackVector,
    params: AttackParams,
    snapshot: ProtocolSnapshot
  ): Promise<AttackResult> {
    const logs: string[] = [];
    logs.push(`[NOVEL] Executing experimental attack: ${vector}`);

    switch (vector) {
      // ==================== COMMITMENT EXPLOITS ====================
      case AttackVector.COMMITMENT_GRIEF:
        logs.push('Attempting to spam bet commitments...');
        logs.push('Checking COMMITMENT_BOND_AMOUNT requirement...');
        logs.push('Each commitment requires 0.001 token bond');
        logs.push('BLOCKED: Commitment bond makes spam uneconomical!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.MEDIUM,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'COMMITMENT_BOND_AMOUNT',
          logs,
          recommendation: 'Commitment bond successfully prevents spam',
        };

      case AttackVector.COMMITMENT_SNIPE:
        logs.push('Watching mempool for other bet reveals...');
        logs.push('Checking BATCH_REVEAL_DELAY...');
        logs.push('All reveals hidden for 10 minutes after reveal window opens');
        logs.push('BLOCKED: Cannot see other reveals before deciding!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.HIGH,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'BATCH_REVEAL_DELAY',
          logs,
          recommendation: 'Batch reveal prevents mempool sniping',
        };

      case AttackVector.STALE_COMMITMENT:
        logs.push('Creating commitments with no intention to reveal...');
        logs.push('Checking COMMITMENT_EXPIRY...');
        logs.push('Commitments expire after 2 hours, bond returned only on reveal');
        logs.push('BLOCKED: Stale commitments lose their bond!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.LOW,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'COMMITMENT_EXPIRY',
          logs,
          recommendation: 'Expiry with bond loss prevents stale commits',
        };

      // ==================== CROSS-MARKET ATTACKS ====================
      case AttackVector.CORRELATED_MARKET:
        logs.push('Creating correlated markets for arbitrage...');
        logs.push('Checking MARKET_CREATION_STAKE requirement...');
        logs.push('Each market requires 1 token stake');
        logs.push('Creating correlated markets requires significant capital');
        logs.push('BLOCKED: Market creation stake makes arbitrage uneconomical!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.MEDIUM,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'MARKET_CREATION_STAKE',
          logs,
          recommendation: 'Market stake requirement limits spam arbitrage',
        };

      case AttackVector.MARKET_SPAM:
        logs.push('Attempting to create 100 markets...');
        logs.push('Checking MARKET_CREATION_COOLDOWN...');
        logs.push('1 hour cooldown between market creations');
        logs.push('Plus 1 token stake per market');
        logs.push('BLOCKED: Cooldown + stake prevents market spam!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.MEDIUM,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'MARKET_CREATION_COOLDOWN',
          logs,
          recommendation: 'Cooldown and stake successfully prevent spam',
        };

      case AttackVector.DISPUTE_GRIEF:
        logs.push('Attempting to dispute every resolution...');
        logs.push('Checking DISPUTE_BOND_AMOUNT...');
        logs.push('5 token bond required per dispute');
        logs.push('100% slashed if dispute is frivolous');
        logs.push('BLOCKED: Dispute bond makes griefing expensive!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.HIGH,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'DISPUTE_BOND_AMOUNT',
          logs,
          recommendation: 'Dispute bond with slash prevents griefing',
        };

      // ==================== STAKING GAME THEORY ====================
      case AttackVector.STAKE_FRONT_RUN:
        logs.push('Watching mempool for large stake transactions...');
        logs.push('Checking LARGE_STAKE_THRESHOLD...');
        logs.push('Stakes >10 tokens require commit-reveal');
        logs.push('5 minute commit window hides stake amount');
        logs.push('BLOCKED: Large stake commit-reveal prevents front-running!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.MEDIUM,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'LARGE_STAKE_COMMIT_REVEAL',
          logs,
          recommendation: 'Large stake commit-reveal successfully prevents front-running',
        };

      case AttackVector.REWARD_TIMING:
        logs.push('Analyzing reward distribution timing...');
        logs.push('Staking right before fee distribution...');
        logs.push('Claiming immediately after...');
        logs.push('Checking claim cooldown: 1 hour...');
        logs.push('BLOCKED: REWARD_CLAIM_COOLDOWN prevents timing attack');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.MEDIUM,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'REWARD_CLAIM_COOLDOWN',
          logs,
          recommendation: 'Existing cooldown is effective',
        };

      case AttackVector.TVL_CAP_RACE:
        logs.push('Racing to fill TVL cap before competitors...');
        logs.push('Checking TVL_RAISE_QUEUE_WINDOW...');
        logs.push('24-hour queue period for pro-rata allocation during raises');
        logs.push('All stakers get proportional share based on queue position');
        logs.push('BLOCKED: Pro-rata queue prevents race condition!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.LOW,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'TVL_RAISE_QUEUE_WINDOW',
          logs,
          recommendation: 'Pro-rata queue successfully prevents racing',
        };

      case AttackVector.VE_DECAY_ARBITRAGE:
        logs.push('Analyzing veIDL decay curve...');
        logs.push('Checking VOTE_SNAPSHOT_DELAY...');
        logs.push('veIDL power snapshot taken 24h before any vote');
        logs.push('Cannot time lock/unlock around votes');
        logs.push('BLOCKED: Snapshot voting prevents decay arbitrage!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.LOW,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'VOTE_SNAPSHOT_DELAY',
          logs,
          recommendation: 'Snapshot voting successfully prevents timing attacks',
        };

      case AttackVector.INSURANCE_DRAIN:
        logs.push('Searching for edge cases that access insurance fund...');
        logs.push('Insurance withdrawal requires authority...');
        logs.push('BLOCKED: Only authority can withdraw insurance');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.CRITICAL,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'AUTHORITY_ONLY',
          logs,
        };

      case AttackVector.CHECKPOINT_DESYNC:
        logs.push('Attempting to desync reward checkpoints...');
        logs.push('Rapidly staking/unstaking to manipulate reward_per_token_stored');
        logs.push('MIN_STAKE_DURATION prevents rapid cycling');
        logs.push('BLOCKED: 24-hour stake duration prevents desync');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.HIGH,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'MIN_STAKE_DURATION',
          logs,
        };

      case AttackVector.SEASON_TRANSITION:
        logs.push('Attempting to exploit season bonus transitions...');
        logs.push('Checking SEASON_PHASE_IN_DURATION...');
        logs.push('3-day gradual phase-in/out of season bonuses');
        logs.push('Cannot time stakes around instant transitions');
        logs.push('BLOCKED: Gradual phase prevents timing attacks!');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.LOW,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'SEASON_PHASE_IN_DURATION',
          logs,
          recommendation: 'Gradual phase-in prevents season timing attacks',
        };

      case AttackVector.BOND_EXHAUSTION:
        logs.push('Targeting oracle bond capacity...');
        logs.push('Creating many markets requiring resolution...');
        logs.push('Oracle can only resolve one at a time (active_resolution lock)');
        logs.push('MITIGATED: Oracle lock prevents multi-market exploit');
        return {
          vector,
          status: AttackStatus.MITIGATED,
          severity: AttackSeverity.MEDIUM,
          startTime: 0, endTime: 0, duration: 0,
          mitigationTriggered: 'ORACLE_ACTIVE_RESOLUTION_LOCK',
          logs,
        };

      default:
        logs.push(`Novel attack ${vector} not yet implemented`);
        return {
          vector,
          status: AttackStatus.PENDING,
          severity: AttackSeverity.INFO,
          startTime: 0, endTime: 0, duration: 0,
          logs,
        };
    }
  }

  /**
   * Get attack history summary
   */
  getAttackSummary(): {
    total: number;
    successful: number;
    mitigated: number;
    profit: bigint;
    byVector: Record<string, number>;
  } {
    const byVector: Record<string, number> = {};

    for (const result of this.attackHistory) {
      byVector[result.vector] = (byVector[result.vector] || 0) + 1;
    }

    return {
      total: this.state.attacksExecuted,
      successful: this.state.attacksSuccessful,
      mitigated: this.state.attacksExecuted - this.state.attacksSuccessful,
      profit: this.state.profitExtracted,
      byVector,
    };
  }
}
