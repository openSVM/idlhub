/**
 * Direct test of novel attack vectors
 * Bypasses LLM agent decision-making to test specific vectors
 */

import { Keypair, Connection } from '@solana/web3.js';
import { AttackAgent } from './agents/base';
import { ATTACK_AGENT_CONFIGS } from './agents/configs';
import { AttackVector, AttackStatus, ProtocolSnapshot, AttackSeverity } from './types';

// Novel vectors to test - v1
const NOVEL_VECTORS_V1: AttackVector[] = [
  AttackVector.COMMITMENT_GRIEF,
  AttackVector.COMMITMENT_SNIPE,
  AttackVector.STALE_COMMITMENT,
  AttackVector.CORRELATED_MARKET,
  AttackVector.MARKET_SPAM,
  AttackVector.DISPUTE_GRIEF,
  AttackVector.STAKE_FRONT_RUN,
  AttackVector.REWARD_TIMING,
  AttackVector.TVL_CAP_RACE,
  AttackVector.VE_DECAY_ARBITRAGE,
  AttackVector.INSURANCE_DRAIN,
  AttackVector.CHECKPOINT_DESYNC,
  AttackVector.SEASON_TRANSITION,
  AttackVector.BOND_EXHAUSTION,
];

// Novel vectors to test - v2 (PUMP mechanics & cross-feature)
const NOVEL_VECTORS_V2: AttackVector[] = [
  // Referral exploits
  AttackVector.REFERRAL_LOOP,
  AttackVector.REFERRAL_HIJACK,
  AttackVector.REFERRAL_ORPHAN,
  AttackVector.REFERRAL_VOLUME_WASH,
  // VIP exploits
  AttackVector.VIP_TIER_FLASH,
  AttackVector.VIP_FEE_DRAIN,
  // Auto-compound
  AttackVector.COMPOUND_TIMING,
  AttackVector.COMPOUND_GRIEF,
  // Conviction betting
  AttackVector.CONVICTION_CANCEL,
  AttackVector.CONVICTION_STACK,
  AttackVector.CONVICTION_FRONT_RUN,
  // Predictor stats
  AttackVector.STREAK_MANIPULATION,
  AttackVector.ACCURACY_GAMING,
  AttackVector.STATS_INFLATION,
  // Creator fees
  AttackVector.CREATOR_SELF_BET,
  AttackVector.CREATOR_FEE_DRAIN,
  AttackVector.CREATOR_SPAM,
  // Season
  AttackVector.SEASON_PRIZE_SNIPE,
  AttackVector.SEASON_BONUS_STACK,
  AttackVector.SEASON_ROLLOVER,
  // Cross-feature
  AttackVector.BADGE_VIP_COMBO,
  AttackVector.STAKE_BONUS_LOOP,
  // Early bird
  AttackVector.EARLY_BIRD_GRIEF,
  AttackVector.EARLY_BIRD_SNIPE,
  // Oracle
  AttackVector.BOND_REFRESH_RACE,
  AttackVector.ORACLE_ROTATION,
  // Cooldown
  AttackVector.COOLDOWN_SPLIT,
  AttackVector.REWARD_TIMING_SPLIT,
  // PDA
  AttackVector.NONCE_REUSE,
  AttackVector.PDA_SEED_COLLISION,
];

// Novel vectors v3 - deeper exploits
const NOVEL_VECTORS_V3: AttackVector[] = [
  // State transition
  AttackVector.PAUSE_FRONT_RUN,
  AttackVector.UNPAUSE_RACE,
  AttackVector.AUTHORITY_SNIPE,
  AttackVector.TVL_CAP_SANDWICH,
  // veIDL edge cases
  AttackVector.DECAY_ROUNDING,
  AttackVector.LOCK_END_EDGE,
  AttackVector.EXTEND_LOCK_ABUSE,
  AttackVector.VE_TOTAL_SUPPLY_DRIFT,
  // Reward checkpoint
  AttackVector.CHECKPOINT_SANDWICH,
  AttackVector.ZERO_TOTAL_STAKED,
  AttackVector.PRECISION_ACCUMULATOR,
  AttackVector.REWARD_POOL_DRAIN,
  // Market pool
  AttackVector.POOL_BALANCE_MISMATCH,
  AttackVector.EMPTY_SIDE_BET,
  AttackVector.RESOLUTION_ORDER,
  AttackVector.CANCEL_AFTER_CLAIM,
  // Multi-account
  AttackVector.BET_COORDINATION,
  AttackVector.VOLUME_SHUFFLE,
  AttackVector.LEADERBOARD_SNIPE,
  AttackVector.PRIZE_POOL_DRAIN,
  // Cross-instruction
  AttackVector.INIT_REINIT,
  AttackVector.CLOSE_REOPEN,
  AttackVector.STAKE_DURING_LOCK,
  AttackVector.BET_AFTER_CLOSE,
  // Hash/commitment
  AttackVector.COMMITMENT_PREIMAGE,
  AttackVector.SALT_REUSE,
  AttackVector.WEAK_NONCE,
  AttackVector.HASH_LENGTH_EXTENSION,
  // Oracle multi-market
  AttackVector.ORACLE_EXHAUSTION,
  AttackVector.RESOLUTION_STALL,
  AttackVector.DISPUTE_DEADLOCK,
  AttackVector.ORACLE_CARTEL_V2,
  // Economic imbalance
  AttackVector.INFINITE_LOOP_BONUS,
  AttackVector.NEGATIVE_SUM_GAME,
  AttackVector.FEE_EVASION,
  AttackVector.DUST_ACCUMULATION,
  // Time-based
  AttackVector.CLOCK_MANIPULATION,
  AttackVector.SLOT_RACING,
  AttackVector.TIMESTAMP_BOUNDARY,
  AttackVector.EPOCH_TRANSITION,
  // Account closure
  AttackVector.RENT_DRAIN,
  AttackVector.LAMPORT_UNDERFLOW,
  AttackVector.CLOSE_AUTHORITY,
  AttackVector.ORPHAN_ACCOUNTS,
  // Prediction stats v2
  AttackVector.ACCURACY_INFLATION_V2,
  AttackVector.STREAK_RESET_ABUSE,
  AttackVector.VIP_OSCILLATION,
  AttackVector.AUTO_COMPOUND_TIMING,
];

// Novel vectors v4 - stableswap & cross-program
const NOVEL_VECTORS_V4: AttackVector[] = [
  // StableSwap curve attacks
  AttackVector.NEWTON_ITERATION_LIMIT,
  AttackVector.INVARIANT_VIOLATION,
  AttackVector.AMPLIFICATION_RAMP_EXPLOIT,
  AttackVector.CONVERGENCE_FAILURE,
  AttackVector.IMBALANCE_FEE_BYPASS,
  // LP token attacks
  AttackVector.LP_INFLATION_ATTACK,
  AttackVector.LP_DONATION_ATTACK,
  AttackVector.MINIMUM_LIQUIDITY_BYPASS,
  AttackVector.LP_SANDWICH,
  // Migration pool attacks
  AttackVector.MIGRATION_FEE_ROUNDING,
  AttackVector.MIGRATION_FRONT_RUN,
  AttackVector.IMBALANCED_POOL_DRAIN,
  AttackVector.SINGLE_SIDED_EXPLOIT,
  // Farming attacks
  AttackVector.FARMING_REWARD_STEAL,
  AttackVector.ACC_REWARD_OVERFLOW,
  AttackVector.FARMING_PERIOD_SNIPE,
  AttackVector.REWARD_CALCULATION_DRIFT,
  // Cross-program attacks
  AttackVector.PROTOCOL_SWAP_ARBITRAGE,
  AttackVector.VOLUME_INFLATION_SWAP,
  AttackVector.BADGE_VIA_SWAP,
  AttackVector.VE_SWAP_COMBO,
  // Vault balance attacks
  AttackVector.VAULT_DONATION,
  AttackVector.VAULT_BALANCE_DESYNC,
  AttackVector.ADMIN_FEE_ACCUMULATION,
  // Deadline attacks
  AttackVector.DEADLINE_MANIPULATION,
  AttackVector.EXPIRED_TX_REPLAY,
  AttackVector.TIMESTAMP_DEADLINE_RACE,
  // Slippage attacks
  AttackVector.SLIPPAGE_SANDWICH,
  AttackVector.DYNAMIC_SLIPPAGE_ATTACK,
  AttackVector.ZERO_SLIPPAGE_EXPLOIT,
  // Admin function attacks
  AttackVector.ADMIN_FEE_DRAIN,
  AttackVector.AMP_RAMPING_FRONT_RUN,
  AttackVector.PAUSED_STATE_EXPLOIT,
  // Token mint attacks
  AttackVector.MINT_AUTHORITY_EXPLOIT,
  AttackVector.WRONG_MINT_PARAMETER,
  AttackVector.DECIMAL_MISMATCH,
  // SDK/client-side attacks
  AttackVector.PDA_DERIVATION_MISMATCH,
  AttackVector.INSTRUCTION_MALFORMATION,
  AttackVector.ACCOUNT_ORDER_MANIPULATION,
  AttackVector.DISCRIMINATOR_COLLISION,
];

// Combined all novel vectors
const NOVEL_VECTORS: AttackVector[] = [...NOVEL_VECTORS_V1, ...NOVEL_VECTORS_V2, ...NOVEL_VECTORS_V3, ...NOVEL_VECTORS_V4];

async function main() {
  console.log('\n\x1b[1m\x1b[35m╔══════════════════════════════════════════════════════════╗\x1b[0m');
  console.log('\x1b[1m\x1b[35m║          NOVEL ATTACK VECTOR DIRECT TEST                  ║\x1b[0m');
  console.log('\x1b[1m\x1b[35m╚══════════════════════════════════════════════════════════╝\x1b[0m\n');

  // Create mock snapshot
  const snapshot: ProtocolSnapshot = {
    timestamp: Date.now(),
    totalStaked: BigInt(50_000_000_000_000),  // 50k tokens
    totalVeSupply: BigInt(25_000_000_000_000),
    rewardPool: BigInt(1_000_000_000_000),
    tvlCap: BigInt(100_000_000_000_000),  // 100k cap
    insuranceFund: BigInt(500_000_000_000),
    activeMarkets: [],
    topStakers: [],
  };

  // Create a test agent
  const novelConfig = ATTACK_AGENT_CONFIGS.find(c => c.id === 'novel_attacker')
    || ATTACK_AGENT_CONFIGS[0];

  const agent = new AttackAgent(
    novelConfig,
    Keypair.generate(),
    new Connection('https://api.devnet.solana.com'),
    ''
  );

  const results: { vector: string; status: string; severity: string; recommendation?: string }[] = [];

  console.log(`Testing ${NOVEL_VECTORS.length} novel attack vectors...\n`);

  for (const vector of NOVEL_VECTORS) {
    // Directly call executeGenericAttack via reflection
    const result = await (agent as any).executeGenericAttack(vector, {}, snapshot);

    const statusColor = result.status === AttackStatus.SUCCESS ? '\x1b[31m'
      : result.status === AttackStatus.MITIGATED ? '\x1b[32m'
      : '\x1b[33m';

    const severityColor = result.severity === AttackSeverity.CRITICAL ? '\x1b[31m'
      : result.severity === AttackSeverity.HIGH ? '\x1b[33m'
      : '\x1b[0m';

    console.log(`${statusColor}[${result.status}]\x1b[0m ${vector}`);
    if (result.mitigationTriggered) {
      console.log(`  \x1b[2mBlocked by: ${result.mitigationTriggered}\x1b[0m`);
    }
    if (result.recommendation) {
      console.log(`  \x1b[36mRecommendation: ${result.recommendation}\x1b[0m`);
    }
    console.log();

    results.push({
      vector,
      status: result.status,
      severity: result.severity,
      recommendation: result.recommendation,
    });
  }

  // Summary
  const successful = results.filter(r => r.status === AttackStatus.SUCCESS);
  const mitigated = results.filter(r => r.status === AttackStatus.MITIGATED);

  console.log('\n\x1b[1m════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1mNOVEL ATTACK SUMMARY\x1b[0m');
  console.log('\x1b[1m════════════════════════════════════════\x1b[0m\n');

  console.log(`Total Vectors Tested: ${NOVEL_VECTORS.length}`);
  console.log(`\x1b[31mSuccessful (VULNERABILITIES): ${successful.length}\x1b[0m`);
  console.log(`\x1b[32mMitigated (PROTECTED): ${mitigated.length}\x1b[0m`);

  if (successful.length > 0) {
    console.log('\n\x1b[1m\x1b[31mVULNERABLE VECTORS:\x1b[0m');
    for (const s of successful) {
      console.log(`  ⚠️  ${s.vector} (${s.severity})`);
      if (s.recommendation) {
        console.log(`      Fix: ${s.recommendation}`);
      }
    }
  }

  const riskScore = Math.min(100, successful.length * 10);
  console.log(`\nRisk Score: ${riskScore}/100\n`);
}

main().catch(console.error);
