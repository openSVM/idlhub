/**
 * IDL Protocol Adversarial Attack Framework - Type Definitions
 *
 * AUTHORIZED SECURITY TESTING ONLY
 * This framework is for protocol developers and security researchers
 * to test the IDL Protocol's resilience against various attack vectors.
 */

import { PublicKey, Keypair } from '@solana/web3.js';

// ==================== ATTACK VECTOR DEFINITIONS ====================

export enum AttackVector {
  // MEV & Front-running Attacks
  SANDWICH_ATTACK = 'SANDWICH_ATTACK',           // Front-run + back-run bets
  JUST_IN_TIME_LIQUIDITY = 'JIT_LIQUIDITY',      // Add liquidity before resolution
  ORACLE_FRONT_RUN = 'ORACLE_FRONT_RUN',         // Front-run oracle resolution

  // Flash Loan Attacks
  FLASH_LOAN_STAKE = 'FLASH_LOAN_STAKE',         // Flash loan for instant staking bonus
  FLASH_LOAN_VOTE = 'FLASH_LOAN_VOTE',           // Flash loan for veIDL voting power

  // Economic Attacks
  MARKET_MANIPULATION = 'MARKET_MANIPULATION',   // Create artificial odds
  WASH_TRADING = 'WASH_TRADING',                 // Fake volume for badge farming
  DUST_ATTACK = 'DUST_ATTACK',                   // Spam tiny bets to clog state
  LIQUIDITY_DRAIN = 'LIQUIDITY_DRAIN',           // Extract all pool liquidity
  PRICE_MANIPULATION = 'PRICE_MANIPULATION',     // Move market prices artificially

  // Oracle Attacks
  ORACLE_MANIPULATION = 'ORACLE_MANIPULATION',   // Corrupt oracle data
  STALE_ORACLE = 'STALE_ORACLE',                 // Exploit stale price feeds
  ORACLE_SANDWICH = 'ORACLE_SANDWICH',           // MEV around oracle updates

  // Protocol Logic Attacks
  REENTRANCY = 'REENTRANCY',                     // Reentrant call exploitation
  INTEGER_OVERFLOW = 'INTEGER_OVERFLOW',         // Arithmetic overflow/underflow
  PRECISION_LOSS = 'PRECISION_LOSS',             // Decimal precision exploits
  ROUNDING_ATTACK = 'ROUNDING_ATTACK',           // Exploit rounding errors

  // Governance Attacks
  VOTE_BUYING = 'VOTE_BUYING',                   // Buy votes for proposals
  GOVERNANCE_HIJACK = 'GOVERNANCE_HIJACK',       // Take over protocol governance
  TIMELOCK_BYPASS = 'TIMELOCK_BYPASS',           // Skip timelock delays

  // Access Control Attacks
  PRIVILEGE_ESCALATION = 'PRIVILEGE_ESCALATION', // Gain unauthorized access
  SYBIL_ATTACK = 'SYBIL_ATTACK',                 // Multiple fake identities

  // State Manipulation
  STATE_CORRUPTION = 'STATE_CORRUPTION',         // Corrupt protocol state
  ACCOUNT_CONFUSION = 'ACCOUNT_CONFUSION',       // Wrong account passed
  PDA_COLLISION = 'PDA_COLLISION',               // Find PDA collisions

  // Denial of Service
  COMPUTE_EXHAUSTION = 'COMPUTE_EXHAUSTION',     // Exceed CU limits
  STORAGE_BLOAT = 'STORAGE_BLOAT',               // Fill up storage
  TX_SPAM = 'TX_SPAM',                           // Transaction spam

  // ==================== NOVEL ATTACK VECTORS ====================
  // These are NEW attacks invented specifically for IDL Protocol

  // Commitment Window Exploits
  COMMITMENT_GRIEF = 'COMMITMENT_GRIEF',         // Spam commitments to block legitimate bets
  COMMITMENT_SNIPE = 'COMMITMENT_SNIPE',         // Wait for reveal window edge, observe mempool
  STALE_COMMITMENT = 'STALE_COMMITMENT',         // Exploit expired but unrevealed commitments

  // Cross-Market Attacks
  CORRELATED_MARKET = 'CORRELATED_MARKET',       // Create correlated markets for arbitrage
  MARKET_SPAM = 'MARKET_SPAM',                   // Create many markets to dilute oracle attention
  RESOLUTION_RACE = 'RESOLUTION_RACE',           // Race oracles on resolution timing

  // veIDL Specific Attacks
  LOCK_EXTENSION_GRIEF = 'LOCK_EXTENSION_GRIEF', // Spam extend_lock calls
  VE_DECAY_ARBITRAGE = 'VE_DECAY_ARBITRAGE',     // Exploit veIDL decay timing
  BADGE_TIER_GAMING = 'BADGE_TIER_GAMING',       // Game badge tiers across wallets

  // Oracle Collusion
  ORACLE_CARTEL = 'ORACLE_CARTEL',               // Multiple oracles collude on false outcome
  DISPUTE_GRIEF = 'DISPUTE_GRIEF',               // Spam disputes to cancel markets
  BOND_EXHAUSTION = 'BOND_EXHAUSTION',           // Drain oracle's bond across markets

  // Staking Game Theory
  STAKE_FRONT_RUN = 'STAKE_FRONT_RUN',           // Front-run large stakes to dilute rewards
  REWARD_TIMING = 'REWARD_TIMING',               // Exploit reward distribution timing
  TVL_CAP_RACE = 'TVL_CAP_RACE',                 // Race to fill TVL cap before others

  // Social Engineering
  FAKE_RESOLUTION_DATA = 'FAKE_RESOLUTION_DATA', // Publish fake resolution data offchain
  MARKET_DESCRIPTION_ABUSE = 'MARKET_DESCRIPTION_ABUSE', // Misleading market descriptions

  // Protocol State Exploits
  INSURANCE_DRAIN = 'INSURANCE_DRAIN',           // Drain insurance fund via edge cases
  CHECKPOINT_DESYNC = 'CHECKPOINT_DESYNC',       // Desync reward checkpoints
  SEASON_TRANSITION = 'SEASON_TRANSITION',       // Exploit season bonus transitions

  // ==================== NOVEL ATTACK VECTORS v2 ====================
  // NEW attacks targeting PUMP mechanics and cross-feature interactions

  // Referral System Exploits
  REFERRAL_LOOP = 'REFERRAL_LOOP',               // Self-referral via multiple wallets
  REFERRAL_HIJACK = 'REFERRAL_HIJACK',           // Register referral right before large bet
  REFERRAL_ORPHAN = 'REFERRAL_ORPHAN',           // Become referrer of whales before they stake

  // VIP Tier Exploits
  VIP_TIER_FLASH = 'VIP_TIER_FLASH',             // Flash stake to max VIP, bet, unstake
  VIP_FEE_DRAIN = 'VIP_FEE_DRAIN',               // Abuse VIP discounts to extract protocol value

  // Auto-Compound Exploits
  COMPOUND_TIMING = 'COMPOUND_TIMING',           // Game auto-compound timing for extra rewards
  COMPOUND_GRIEF = 'COMPOUND_GRIEF',             // Spam compound calls to waste compute

  // Conviction Betting Exploits
  CONVICTION_CANCEL = 'CONVICTION_CANCEL',       // Lock for bonus then force market cancel
  CONVICTION_STACK = 'CONVICTION_STACK',         // Stack multiple conviction locks unfairly
  CONVICTION_FRONT_RUN = 'CONVICTION_FRONT_RUN', // Front-run conviction bonus calculations

  // Predictor Stats Gaming
  STREAK_MANIPULATION = 'STREAK_MANIPULATION',   // Game streak system via market selection
  ACCURACY_GAMING = 'ACCURACY_GAMING',           // Manipulate accuracy for bonus qualification
  STATS_INFLATION = 'STATS_INFLATION',           // Inflate predictor stats artificially

  // Creator Fee Exploits (Prediction Mining)
  CREATOR_SELF_BET = 'CREATOR_SELF_BET',         // Create market, bet on both sides for volume
  CREATOR_FEE_DRAIN = 'CREATOR_FEE_DRAIN',       // Drain creator fees via volume wash
  CREATOR_SPAM = 'CREATOR_SPAM',                 // Spam markets to dilute legitimate creators

  // Season Exploits
  SEASON_PRIZE_SNIPE = 'SEASON_PRIZE_SNIPE',     // Snipe season end with massive activity
  SEASON_BONUS_STACK = 'SEASON_BONUS_STACK',     // Stack season + early bird + conviction
  SEASON_ROLLOVER = 'SEASON_ROLLOVER',           // Exploit rewards between season transitions

  // Cross-Feature Attacks
  BADGE_VIP_COMBO = 'BADGE_VIP_COMBO',           // Combine badge + VIP for outsized advantage
  STAKE_BONUS_LOOP = 'STAKE_BONUS_LOOP',         // Loop stake bonus with veIDL multiplier
  REFERRAL_VOLUME_WASH = 'REFERRAL_VOLUME_WASH', // Wash trade to generate referral fees

  // Early Bird Exploits
  EARLY_BIRD_GRIEF = 'EARLY_BIRD_GRIEF',         // Spam early bets to deplete bonus pool
  EARLY_BIRD_SNIPE = 'EARLY_BIRD_SNIPE',         // Bot early bird window on new markets

  // Oracle Bond Edge Cases
  BOND_REFRESH_RACE = 'BOND_REFRESH_RACE',       // Race to withdraw + re-deposit bond
  ORACLE_ROTATION = 'ORACLE_ROTATION',           // Rotate oracle identity to avoid reputation

  // Claim Cooldown Bypass
  COOLDOWN_SPLIT = 'COOLDOWN_SPLIT',             // Split stake across wallets to bypass cooldown
  REWARD_TIMING_SPLIT = 'REWARD_TIMING_SPLIT',   // Coordinate claims across wallets for timing

  // Account/PDA Exploits
  NONCE_REUSE = 'NONCE_REUSE',                   // Attempt to reuse bet nonces
  PDA_SEED_COLLISION = 'PDA_SEED_COLLISION',     // Find seed combinations that collide

  // ==================== NOVEL ATTACK VECTORS v3 ====================
  // DEEPER exploits: state transitions, cross-account, timing, multi-tx chains

  // State Transition Attacks
  PAUSE_FRONT_RUN = 'PAUSE_FRONT_RUN',           // Front-run pause to extract funds
  UNPAUSE_RACE = 'UNPAUSE_RACE',                 // Race to exploit on unpause
  AUTHORITY_SNIPE = 'AUTHORITY_SNIPE',           // Exploit during authority transfer window
  TVL_CAP_SANDWICH = 'TVL_CAP_SANDWICH',         // Sandwich TVL cap raise

  // veIDL Decay Edge Cases
  DECAY_ROUNDING = 'DECAY_ROUNDING',             // Exploit rounding in veIDL decay calc
  LOCK_END_EDGE = 'LOCK_END_EDGE',               // Exploit exact lock_end timestamp
  EXTEND_LOCK_ABUSE = 'EXTEND_LOCK_ABUSE',       // Game extend_lock for veIDL manipulation
  VE_TOTAL_SUPPLY_DRIFT = 'VE_TOTAL_SUPPLY_DRIFT', // total_ve_supply != sum of positions

  // Reward Checkpoint Exploits
  CHECKPOINT_SANDWICH = 'CHECKPOINT_SANDWICH',   // Sandwich stake around reward distribution
  ZERO_TOTAL_STAKED = 'ZERO_TOTAL_STAKED',       // Exploit when total_staked = 0
  PRECISION_ACCUMULATOR = 'PRECISION_ACCUMULATOR', // Accumulate precision loss over time
  REWARD_POOL_DRAIN = 'REWARD_POOL_DRAIN',       // Claim more than reward_pool balance

  // Market Pool Exploits
  POOL_BALANCE_MISMATCH = 'POOL_BALANCE_MISMATCH', // Pool balance != total_yes + total_no
  EMPTY_SIDE_BET = 'EMPTY_SIDE_BET',             // Bet when one side is 0
  RESOLUTION_ORDER = 'RESOLUTION_ORDER',         // Exploit claim order after resolution
  CANCEL_AFTER_CLAIM = 'CANCEL_AFTER_CLAIM',     // Race cancel vs claim after resolution

  // Multi-Account Coordination
  BET_COORDINATION = 'BET_COORDINATION',         // Coordinate bets to game effective_amount
  VOLUME_SHUFFLE = 'VOLUME_SHUFFLE',             // Shuffle volume between wallets for badges
  LEADERBOARD_SNIPE = 'LEADERBOARD_SNIPE',       // Snipe leaderboard position at season end
  PRIZE_POOL_DRAIN = 'PRIZE_POOL_DRAIN',         // Drain season prize pool unfairly

  // Cross-Instruction Attacks
  INIT_REINIT = 'INIT_REINIT',                   // Reinitialize already initialized accounts
  CLOSE_REOPEN = 'CLOSE_REOPEN',                 // Close and reopen accounts in same tx
  STAKE_DURING_LOCK = 'STAKE_DURING_LOCK',       // Add stake while veIDL locked
  BET_AFTER_CLOSE = 'BET_AFTER_CLOSE',           // Bet after betting window closed

  // Hash/Commitment Exploits
  COMMITMENT_PREIMAGE = 'COMMITMENT_PREIMAGE',   // Find preimage collisions
  SALT_REUSE = 'SALT_REUSE',                     // Reuse salts across commitments
  WEAK_NONCE = 'WEAK_NONCE',                     // Predictable nonces
  HASH_LENGTH_EXTENSION = 'HASH_LENGTH_EXTENSION', // Extend commitment hashes

  // Oracle Multi-Market Attacks
  ORACLE_EXHAUSTION = 'ORACLE_EXHAUSTION',       // Exhaust all available oracles
  RESOLUTION_STALL = 'RESOLUTION_STALL',         // Stall resolution indefinitely
  DISPUTE_DEADLOCK = 'DISPUTE_DEADLOCK',         // Create dispute deadlock
  ORACLE_CARTEL_V2 = 'ORACLE_CARTEL_V2',         // Coordinated oracle attack v2

  // Economic Imbalance Attacks
  INFINITE_LOOP_BONUS = 'INFINITE_LOOP_BONUS',   // Chain bonuses infinitely
  NEGATIVE_SUM_GAME = 'NEGATIVE_SUM_GAME',       // Make protocol pay out more than taken in
  FEE_EVASION = 'FEE_EVASION',                   // Evade protocol fees
  DUST_ACCUMULATION = 'DUST_ACCUMULATION',       // Accumulate dust across many accounts

  // Time-Based Attacks
  CLOCK_MANIPULATION = 'CLOCK_MANIPULATION',     // Exploit Solana clock drift
  SLOT_RACING = 'SLOT_RACING',                   // Race for specific slot inclusion
  TIMESTAMP_BOUNDARY = 'TIMESTAMP_BOUNDARY',     // Exploit timestamp boundary conditions
  EPOCH_TRANSITION = 'EPOCH_TRANSITION',         // Attack during epoch transitions

  // Account Closure Attacks
  RENT_DRAIN = 'RENT_DRAIN',                     // Drain rent from protocol accounts
  LAMPORT_UNDERFLOW = 'LAMPORT_UNDERFLOW',       // Underflow lamport balances
  CLOSE_AUTHORITY = 'CLOSE_AUTHORITY',           // Close authority-controlled accounts
  ORPHAN_ACCOUNTS = 'ORPHAN_ACCOUNTS',           // Create orphan accounts

  // Prediction Stats Gaming v2
  ACCURACY_INFLATION_V2 = 'ACCURACY_INFLATION_V2', // Inflate accuracy via cancelled markets
  STREAK_RESET_ABUSE = 'STREAK_RESET_ABUSE',     // Abuse streak reset mechanics
  VIP_OSCILLATION = 'VIP_OSCILLATION',           // Oscillate VIP tiers for max benefit
  AUTO_COMPOUND_TIMING = 'AUTO_COMPOUND_TIMING', // Time auto-compound for max bonus

  // ==================== NOVEL ATTACK VECTORS v4 ====================
  // STABLESWAP & CROSS-PROGRAM EXPLOITS

  // StableSwap Curve Attacks
  NEWTON_ITERATION_LIMIT = 'NEWTON_ITERATION_LIMIT', // Force Newton's method to max iterations
  INVARIANT_VIOLATION = 'INVARIANT_VIOLATION',   // Break D invariant via edge inputs
  AMPLIFICATION_RAMP_EXPLOIT = 'AMPLIFICATION_RAMP_EXPLOIT', // Exploit during amp ramping
  CONVERGENCE_FAILURE = 'CONVERGENCE_FAILURE',   // Cause convergence threshold failure
  IMBALANCE_FEE_BYPASS = 'IMBALANCE_FEE_BYPASS', // Bypass imbalance fees via sequencing

  // LP Token Attacks
  LP_INFLATION_ATTACK = 'LP_INFLATION_ATTACK',   // Inflate LP via first-depositor
  LP_DONATION_ATTACK = 'LP_DONATION_ATTACK',     // Direct vault transfer to manipulate
  MINIMUM_LIQUIDITY_BYPASS = 'MINIMUM_LIQUIDITY_BYPASS', // Bypass minimum liquidity lock
  LP_SANDWICH = 'LP_SANDWICH',                   // Sandwich add/remove liquidity

  // Migration Pool Attacks
  MIGRATION_FEE_ROUNDING = 'MIGRATION_FEE_ROUNDING', // 0.1337% fee rounding exploitation
  MIGRATION_FRONT_RUN = 'MIGRATION_FRONT_RUN',   // Front-run large migrations
  IMBALANCED_POOL_DRAIN = 'IMBALANCED_POOL_DRAIN', // Drain one side of pool
  SINGLE_SIDED_EXPLOIT = 'SINGLE_SIDED_EXPLOIT', // Exploit single-sided liquidity

  // Farming Attacks
  FARMING_REWARD_STEAL = 'FARMING_REWARD_STEAL', // Steal farming rewards via timing
  ACC_REWARD_OVERFLOW = 'ACC_REWARD_OVERFLOW',   // Overflow acc_reward_per_share
  FARMING_PERIOD_SNIPE = 'FARMING_PERIOD_SNIPE', // Snipe farming period start/end
  REWARD_CALCULATION_DRIFT = 'REWARD_CALCULATION_DRIFT', // Precision drift in rewards

  // Cross-Program Attacks
  PROTOCOL_SWAP_ARBITRAGE = 'PROTOCOL_SWAP_ARBITRAGE', // Arbitrage between protocols
  VOLUME_INFLATION_SWAP = 'VOLUME_INFLATION_SWAP', // Inflate volume via stableswap
  BADGE_VIA_SWAP = 'BADGE_VIA_SWAP',             // Get badges via swap volume
  VE_SWAP_COMBO = 'VE_SWAP_COMBO',               // Combine veIDL with swap benefits

  // Vault Balance Attacks
  VAULT_DONATION = 'VAULT_DONATION',             // Donate to vault to manipulate prices
  VAULT_BALANCE_DESYNC = 'VAULT_BALANCE_DESYNC', // Desync tracked vs actual balance
  ADMIN_FEE_ACCUMULATION = 'ADMIN_FEE_ACCUMULATION', // Manipulate admin fee accumulation

  // Deadline Attacks
  DEADLINE_MANIPULATION = 'DEADLINE_MANIPULATION', // Set malicious deadlines
  EXPIRED_TX_REPLAY = 'EXPIRED_TX_REPLAY',       // Replay expired transactions
  TIMESTAMP_DEADLINE_RACE = 'TIMESTAMP_DEADLINE_RACE', // Race condition at deadline

  // Slippage Attacks
  SLIPPAGE_SANDWICH = 'SLIPPAGE_SANDWICH',       // Exploit min_amount_out slippage
  DYNAMIC_SLIPPAGE_ATTACK = 'DYNAMIC_SLIPPAGE_ATTACK', // Attack dynamic slippage calculation
  ZERO_SLIPPAGE_EXPLOIT = 'ZERO_SLIPPAGE_EXPLOIT', // Exploit zero min_amount transactions

  // Admin Function Attacks
  ADMIN_FEE_DRAIN = 'ADMIN_FEE_DRAIN',           // Drain accumulated admin fees
  AMP_RAMPING_FRONT_RUN = 'AMP_RAMPING_FRONT_RUN', // Front-run amp ramping
  PAUSED_STATE_EXPLOIT = 'PAUSED_STATE_EXPLOIT', // Exploit pause/unpause window

  // Token Mint Attacks
  MINT_AUTHORITY_EXPLOIT = 'MINT_AUTHORITY_EXPLOIT', // Exploit LP mint authority
  WRONG_MINT_PARAMETER = 'WRONG_MINT_PARAMETER', // Pass wrong mint to is_bags
  DECIMAL_MISMATCH = 'DECIMAL_MISMATCH',         // Exploit decimal assumptions

  // SDK/Client-Side Attacks
  PDA_DERIVATION_MISMATCH = 'PDA_DERIVATION_MISMATCH', // SDK vs on-chain PDA mismatch
  INSTRUCTION_MALFORMATION = 'INSTRUCTION_MALFORMATION', // Malformed instruction data
  ACCOUNT_ORDER_MANIPULATION = 'ACCOUNT_ORDER_MANIPULATION', // Wrong account order
  DISCRIMINATOR_COLLISION = 'DISCRIMINATOR_COLLISION', // Anchor discriminator collision
}

export enum AttackSeverity {
  CRITICAL = 'CRITICAL',   // Direct fund loss possible
  HIGH = 'HIGH',           // Significant economic impact
  MEDIUM = 'MEDIUM',       // Limited economic impact
  LOW = 'LOW',             // Minimal impact
  INFO = 'INFO',           // Informational finding
}

export enum AttackStatus {
  PENDING = 'PENDING',
  RUNNING = 'RUNNING',
  SUCCESS = 'SUCCESS',     // Attack succeeded (vulnerability found)
  MITIGATED = 'MITIGATED', // Attack blocked by defenses
  FAILED = 'FAILED',       // Attack failed (error)
}

// ==================== ATTACK CONFIGURATION ====================

export interface AttackConfig {
  vector: AttackVector;
  name: string;
  description: string;
  severity: AttackSeverity;
  enabled: boolean;
  params: AttackParams;
  prerequisites: AttackVector[];  // Must run these first
  timeout: number;                // Max execution time in ms
}

export interface AttackParams {
  // Financial params
  amount?: bigint;
  targetMarket?: string;
  targetUser?: string;

  // Timing params
  delayMs?: number;
  iterations?: number;

  // Attack-specific params
  flashLoanAmount?: bigint;
  sandwichSlippage?: number;
  oracleValue?: bigint;
  numSybils?: number;
  amountPerSybil?: number;  // Amount to stake per Sybil wallet

  // Custom params
  custom?: Record<string, any>;
}

// ==================== ATTACK RESULTS ====================

export interface AttackResult {
  vector: AttackVector;
  status: AttackStatus;
  severity: AttackSeverity;
  startTime: number;
  endTime: number;
  duration: number;

  // Success details
  exploitProfit?: bigint;       // Profit extracted if successful
  affectedAccounts?: string[];  // Accounts impacted
  stateCorrupted?: boolean;     // Protocol state corrupted

  // Defense analysis
  mitigationTriggered?: string; // Which defense blocked the attack
  errorCode?: string;           // Error code if blocked
  errorMessage?: string;        // Error message

  // Evidence
  txSignatures?: string[];      // Transaction signatures
  logs?: string[];              // Execution logs
  screenshots?: string[];       // Visual evidence (for UI attacks)

  // Recommendations
  recommendation?: string;      // How to fix if vulnerable
  references?: string[];        // CVE/advisory references
}

export interface AttackReport {
  timestamp: number;
  protocolVersion: string;
  framework: string;
  totalAttacks: number;
  successfulAttacks: number;
  mitigatedAttacks: number;
  failedAttacks: number;
  criticalFindings: number;
  highFindings: number;
  mediumFindings: number;
  lowFindings: number;
  results: AttackResult[];
  summary: string;
  riskScore: number;  // 0-100, higher = more vulnerable
}

// ==================== ATTACK AGENTS ====================

export interface AttackAgentConfig {
  id: string;
  name: string;
  role: AttackRole;
  vectors: AttackVector[];
  model: string;
  systemPrompt: string;
  budget: bigint;            // Max tokens to spend
  riskTolerance: number;     // 0-1, how aggressive
}

export enum AttackRole {
  MEV_BOT = 'MEV_BOT',                    // Extracts MEV
  WHALE_ATTACKER = 'WHALE_ATTACKER',      // Large capital attacks
  FLASHLOAN_EXPLOITER = 'FLASHLOAN_EXPLOITER',
  ORACLE_MANIPULATOR = 'ORACLE_MANIPULATOR',
  GOVERNANCE_ATTACKER = 'GOVERNANCE_ATTACKER',
  SYBIL_OPERATOR = 'SYBIL_OPERATOR',
  FUZZER = 'FUZZER',                      // Random input testing
  STATE_ANALYZER = 'STATE_ANALYZER',      // Finds state inconsistencies
}

export interface AttackAgentState {
  balance: bigint;
  stakedAmount: bigint;
  veAmount: bigint;
  attacksExecuted: number;
  attacksSuccessful: number;
  profitExtracted: bigint;
  sybilWallets: Keypair[];
}

// ==================== PROTOCOL STATE ====================

export interface ProtocolSnapshot {
  timestamp: number;
  totalStaked: bigint;
  totalVeSupply: bigint;
  rewardPool: bigint;
  tvlCap: bigint;
  insuranceFund: bigint;
  activeMarkets: MarketSnapshot[];
  topStakers: StakerSnapshot[];
}

export interface MarketSnapshot {
  pda: string;
  protocolId: string;
  totalYes: bigint;
  totalNo: bigint;
  resolved: boolean;
  outcome?: boolean;
  createdAt: number;
  resolutionTimestamp: number;
}

export interface StakerSnapshot {
  address: string;
  staked: bigint;
  veAmount: bigint;
  pendingRewards: bigint;
}

// ==================== SIMULATION CONTEXT ====================

export interface AttackSimulationConfig {
  rpcUrl: string;
  programId: string;
  attackAgents: AttackAgentConfig[];
  enabledVectors: AttackVector[];
  rounds: number;
  reportPath: string;
  verboseLogging: boolean;
  saveSnapshots: boolean;
  parallelAttacks: boolean;
}

export interface AttackSimulationResult {
  config: AttackSimulationConfig;
  report: AttackReport;
  snapshots: ProtocolSnapshot[];
  agentResults: AttackAgentResult[];
}

export interface AttackAgentResult {
  agentId: string;
  attacksExecuted: AttackResult[];
  totalProfit: bigint;
  successRate: number;
}

// ==================== VULNERABILITY DATABASE ====================

export interface Vulnerability {
  id: string;
  vector: AttackVector;
  severity: AttackSeverity;
  title: string;
  description: string;
  impact: string;
  reproduction: string;
  mitigation: string;
  references: string[];
  discoveredAt: number;
  status: 'OPEN' | 'FIXED' | 'WONTFIX' | 'DISPUTED';
}

export interface VulnerabilityDatabase {
  vulnerabilities: Vulnerability[];
  lastUpdated: number;
  totalDiscovered: number;
  totalFixed: number;
}
