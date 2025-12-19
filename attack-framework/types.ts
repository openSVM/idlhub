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
