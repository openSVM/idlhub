/**
 * Direct test of novel attack vectors
 * Bypasses LLM agent decision-making to test specific vectors
 */

import { Keypair, Connection } from '@solana/web3.js';
import { AttackAgent } from './agents/base';
import { ATTACK_AGENT_CONFIGS } from './agents/configs';
import { AttackVector, AttackStatus, ProtocolSnapshot, AttackSeverity } from './types';

// Novel vectors to test
const NOVEL_VECTORS: AttackVector[] = [
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
