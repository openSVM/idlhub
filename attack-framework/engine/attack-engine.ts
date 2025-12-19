/**
 * Attack Simulation Engine
 *
 * Orchestrates multiple attack agents and generates security reports.
 */

import { Connection, Keypair } from '@solana/web3.js';
import {
  AttackSimulationConfig,
  AttackSimulationResult,
  AttackReport,
  AttackResult,
  AttackStatus,
  AttackSeverity,
  AttackVector,
  ProtocolSnapshot,
  MarketSnapshot,
  StakerSnapshot,
  AttackAgentResult,
} from '../types';
import { AttackAgent } from '../agents/base';
import { ATTACK_AGENT_CONFIGS } from '../agents/configs';

// Simple OpenRouter client config
interface OpenRouterConfig {
  apiKey: string;
}

class OpenRouterClient {
  constructor(config: OpenRouterConfig) {}
}

export class AttackEngine {
  private config: AttackSimulationConfig;
  private connection: Connection;
  private apiKey: string;
  private agents: AttackAgent[] = [];
  private snapshots: ProtocolSnapshot[] = [];
  private allResults: AttackResult[] = [];
  private currentRound: number = 0;

  constructor(config: AttackSimulationConfig) {
    this.config = config;
    this.connection = new Connection(config.rpcUrl, 'confirmed');
    this.apiKey = process.env.OPENROUTER_API_KEY || '';
  }

  /**
   * Initialize attack agents
   */
  async initialize(): Promise<void> {
    console.log('\n\x1b[1m\x1b[31m========================================\x1b[0m');
    console.log('\x1b[1m\x1b[31m  IDL PROTOCOL ATTACK FRAMEWORK\x1b[0m');
    console.log('\x1b[1m\x1b[31m  AUTHORIZED SECURITY TESTING ONLY\x1b[0m');
    console.log('\x1b[1m\x1b[31m========================================\x1b[0m\n');

    console.log('\x1b[33mInitializing attack agents...\x1b[0m\n');

    // Filter agents by enabled vectors
    const enabledAgentConfigs = this.config.attackAgents.length > 0
      ? ATTACK_AGENT_CONFIGS.filter(c =>
          this.config.attackAgents.some(ac => ac.id === c.id)
        )
      : ATTACK_AGENT_CONFIGS.filter(c =>
          c.vectors.some(v => this.config.enabledVectors.includes(v))
        );

    for (const agentConfig of enabledAgentConfigs) {
      const wallet = Keypair.generate();
      const agent = new AttackAgent(
        agentConfig,
        wallet,
        this.connection,
        this.apiKey
      );

      this.agents.push(agent);
      console.log(`  \x1b[31m▸ ${agentConfig.name}\x1b[0m (${agentConfig.role})`);
      console.log(`    Vectors: ${agentConfig.vectors.slice(0, 3).join(', ')}...`);
    }

    console.log(`\n\x1b[32m✓ Initialized ${this.agents.length} attack agents\x1b[0m\n`);
  }

  /**
   * Run the attack simulation
   */
  async run(): Promise<AttackSimulationResult> {
    const startTime = Date.now();
    const agentResults: AttackAgentResult[] = [];

    console.log('\x1b[1m\x1b[33m=== BEGINNING ATTACK SIMULATION ===\x1b[0m\n');
    console.log(`Rounds: ${this.config.rounds}`);
    console.log(`Enabled vectors: ${this.config.enabledVectors.length}`);
    console.log(`Parallel attacks: ${this.config.parallelAttacks}\n`);

    for (let round = 1; round <= this.config.rounds; round++) {
      this.currentRound = round;
      await this.runAttackRound(round);

      if (this.config.saveSnapshots) {
        const snapshot = await this.captureProtocolSnapshot();
        this.snapshots.push(snapshot);
      }

      // Brief delay between rounds
      await this.sleep(1000);
    }

    // Collect agent results
    for (const agent of this.agents) {
      const summary = agent.getAttackSummary();
      agentResults.push({
        agentId: agent.config.id,
        attacksExecuted: agent.state.attacksExecuted > 0
          ? this.allResults.filter(r => r.vector && agent.config.vectors.includes(r.vector))
          : [],
        totalProfit: agent.state.profitExtracted,
        successRate: agent.state.attacksExecuted > 0
          ? agent.state.attacksSuccessful / agent.state.attacksExecuted
          : 0,
      });
    }

    // Generate report
    const report = this.generateReport(startTime);

    // Save report if path specified
    if (this.config.reportPath) {
      await this.saveReport(report);
    }

    return {
      config: this.config,
      report,
      snapshots: this.snapshots,
      agentResults,
    };
  }

  /**
   * Run a single round of attacks
   */
  private async runAttackRound(round: number): Promise<void> {
    console.log(`\n\x1b[1m\x1b[36m══════════════════════════════════════\x1b[0m`);
    console.log(`\x1b[1m\x1b[36m  ATTACK ROUND ${round} / ${this.config.rounds}\x1b[0m`);
    console.log(`\x1b[1m\x1b[36m══════════════════════════════════════\x1b[0m\n`);

    const snapshot = await this.captureProtocolSnapshot();

    if (this.config.parallelAttacks) {
      // Run all agents in parallel
      const attackPromises = this.agents.map(agent =>
        agent.analyzeAndAttack(snapshot)
      );
      const results = await Promise.all(attackPromises);
      this.allResults.push(...results);
      this.logRoundResults(results);
    } else {
      // Run agents sequentially
      for (const agent of this.agents) {
        const result = await agent.analyzeAndAttack(snapshot);
        this.allResults.push(result);
        this.logAttackResult(agent.config.name, result);
        await this.sleep(500);
      }
    }

    // Log round summary
    this.logRoundSummary(round);
  }

  /**
   * Capture current protocol state
   */
  private async captureProtocolSnapshot(): Promise<ProtocolSnapshot> {
    // In real scenario, this would query on-chain state
    // For simulation, we generate mock data

    const mockMarkets: MarketSnapshot[] = [
      {
        pda: Keypair.generate().publicKey.toBase58(),
        protocolId: 'jupiter',
        totalYes: BigInt(Math.floor(Math.random() * 1000000)) * BigInt(1e6),
        totalNo: BigInt(Math.floor(Math.random() * 1000000)) * BigInt(1e6),
        resolved: false,
        createdAt: Math.floor(Date.now() / 1000) - 86400,
        resolutionTimestamp: Math.floor(Date.now() / 1000) + 86400,
      },
      {
        pda: Keypair.generate().publicKey.toBase58(),
        protocolId: 'raydium',
        totalYes: BigInt(Math.floor(Math.random() * 500000)) * BigInt(1e6),
        totalNo: BigInt(Math.floor(Math.random() * 800000)) * BigInt(1e6),
        resolved: false,
        createdAt: Math.floor(Date.now() / 1000) - 172800,
        resolutionTimestamp: Math.floor(Date.now() / 1000) + 43200,
      },
    ];

    const mockStakers: StakerSnapshot[] = [
      {
        address: Keypair.generate().publicKey.toBase58(),
        staked: BigInt(Math.floor(Math.random() * 10000000)) * BigInt(1e6),
        veAmount: BigInt(Math.floor(Math.random() * 5000000)) * BigInt(1e6),
        pendingRewards: BigInt(Math.floor(Math.random() * 100000)) * BigInt(1e6),
      },
    ];

    return {
      timestamp: Date.now(),
      totalStaked: BigInt(Math.floor(Math.random() * 100000000)) * BigInt(1e6),
      totalVeSupply: BigInt(Math.floor(Math.random() * 50000000)) * BigInt(1e6),
      rewardPool: BigInt(Math.floor(Math.random() * 1000000)) * BigInt(1e6),
      tvlCap: 100_000_000_000n,
      insuranceFund: BigInt(Math.floor(Math.random() * 500000)) * BigInt(1e6),
      activeMarkets: mockMarkets,
      topStakers: mockStakers,
    };
  }

  /**
   * Generate attack report
   */
  private generateReport(startTime: number): AttackReport {
    const endTime = Date.now();

    let successfulAttacks = 0;
    let mitigatedAttacks = 0;
    let failedAttacks = 0;
    let criticalFindings = 0;
    let highFindings = 0;
    let mediumFindings = 0;
    let lowFindings = 0;

    for (const result of this.allResults) {
      switch (result.status) {
        case AttackStatus.SUCCESS:
          successfulAttacks++;
          break;
        case AttackStatus.MITIGATED:
          mitigatedAttacks++;
          break;
        case AttackStatus.FAILED:
          failedAttacks++;
          break;
      }

      if (result.status === AttackStatus.SUCCESS) {
        switch (result.severity) {
          case AttackSeverity.CRITICAL:
            criticalFindings++;
            break;
          case AttackSeverity.HIGH:
            highFindings++;
            break;
          case AttackSeverity.MEDIUM:
            mediumFindings++;
            break;
          case AttackSeverity.LOW:
            lowFindings++;
            break;
        }
      }
    }

    // Calculate risk score (0-100)
    const riskScore = Math.min(100,
      criticalFindings * 25 +
      highFindings * 15 +
      mediumFindings * 5 +
      lowFindings * 1
    );

    const mitigationRate = this.allResults.length > 0
      ? (mitigatedAttacks / this.allResults.length) * 100
      : 100;

    const summary = this.generateSummary(
      successfulAttacks,
      mitigatedAttacks,
      criticalFindings,
      highFindings,
      mitigationRate,
      riskScore
    );

    return {
      timestamp: endTime,
      protocolVersion: '1.0.0',
      framework: 'IDL Attack Framework v1.0',
      totalAttacks: this.allResults.length,
      successfulAttacks,
      mitigatedAttacks,
      failedAttacks,
      criticalFindings,
      highFindings,
      mediumFindings,
      lowFindings,
      results: this.allResults,
      summary,
      riskScore,
    };
  }

  /**
   * Generate human-readable summary
   */
  private generateSummary(
    successful: number,
    mitigated: number,
    critical: number,
    high: number,
    mitigationRate: number,
    riskScore: number
  ): string {
    const lines: string[] = [];

    lines.push('# IDL Protocol Security Assessment\n');

    if (critical > 0) {
      lines.push(`⚠️  CRITICAL: ${critical} critical vulnerabilities found!`);
    }
    if (high > 0) {
      lines.push(`⚠️  HIGH: ${high} high-severity vulnerabilities found!`);
    }

    lines.push(`\n## Mitigation Effectiveness: ${mitigationRate.toFixed(1)}%`);
    lines.push(`Risk Score: ${riskScore}/100 (${riskScore < 30 ? 'LOW' : riskScore < 60 ? 'MEDIUM' : 'HIGH'})\n`);

    lines.push('## Defense Analysis\n');

    // Analyze which defenses worked
    const defenses = new Map<string, number>();
    for (const result of this.allResults) {
      if (result.mitigationTriggered) {
        defenses.set(
          result.mitigationTriggered,
          (defenses.get(result.mitigationTriggered) || 0) + 1
        );
      }
    }

    if (defenses.size > 0) {
      lines.push('Effective Defenses:');
      for (const [defense, count] of defenses) {
        lines.push(`  ✓ ${defense}: blocked ${count} attacks`);
      }
    }

    lines.push('\n## Recommendations\n');

    const recommendations = new Set<string>();
    for (const result of this.allResults) {
      if (result.recommendation) {
        recommendations.add(result.recommendation);
      }
    }

    for (const rec of recommendations) {
      lines.push(`  • ${rec}`);
    }

    return lines.join('\n');
  }

  /**
   * Save report to file
   */
  private async saveReport(report: AttackReport): Promise<void> {
    const fs = await import('fs');
    const path = this.config.reportPath;

    await fs.promises.mkdir('attack-framework/reports', { recursive: true });

    await fs.promises.writeFile(
      path,
      JSON.stringify(report, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)
    );

    console.log(`\n\x1b[32m✓ Report saved to: ${path}\x1b[0m`);
  }

  /**
   * Log individual attack result
   */
  private logAttackResult(agentName: string, result: AttackResult): void {
    const statusColor = result.status === AttackStatus.SUCCESS ? '\x1b[31m'
      : result.status === AttackStatus.MITIGATED ? '\x1b[32m'
      : '\x1b[33m';

    console.log(`  ${statusColor}[${agentName}] ${result.vector}: ${result.status}\x1b[0m`);

    if (result.mitigationTriggered) {
      console.log(`    \x1b[2mBlocked by: ${result.mitigationTriggered}\x1b[0m`);
    }
    if (result.exploitProfit && result.exploitProfit > 0n) {
      console.log(`    \x1b[31mProfit extracted: ${result.exploitProfit}\x1b[0m`);
    }
  }

  /**
   * Log multiple results at once
   */
  private logRoundResults(results: AttackResult[]): void {
    for (let i = 0; i < results.length; i++) {
      const agent = this.agents[i];
      if (agent) {
        this.logAttackResult(agent.config.name, results[i]);
      }
    }
  }

  /**
   * Log round summary
   */
  private logRoundSummary(round: number): void {
    const roundResults = this.allResults.slice(
      -this.agents.length
    );

    const successful = roundResults.filter(r => r.status === AttackStatus.SUCCESS).length;
    const mitigated = roundResults.filter(r => r.status === AttackStatus.MITIGATED).length;

    console.log(`\n  \x1b[1mRound ${round} Summary:\x1b[0m`);
    console.log(`    Successful attacks: \x1b[31m${successful}\x1b[0m`);
    console.log(`    Mitigated attacks: \x1b[32m${mitigated}\x1b[0m`);
  }

  /**
   * Print final report to console
   */
  printReport(report: AttackReport): void {
    console.log('\n\x1b[1m\x1b[35m╔══════════════════════════════════════════════════════════╗\x1b[0m');
    console.log('\x1b[1m\x1b[35m║          ATTACK SIMULATION FINAL REPORT                  ║\x1b[0m');
    console.log('\x1b[1m\x1b[35m╚══════════════════════════════════════════════════════════╝\x1b[0m\n');

    console.log(`Total Attacks: ${report.totalAttacks}`);
    console.log(`  \x1b[31m• Successful: ${report.successfulAttacks}\x1b[0m`);
    console.log(`  \x1b[32m• Mitigated: ${report.mitigatedAttacks}\x1b[0m`);
    console.log(`  \x1b[33m• Failed: ${report.failedAttacks}\x1b[0m`);

    console.log('\nVulnerabilities Found:');
    console.log(`  \x1b[31m• CRITICAL: ${report.criticalFindings}\x1b[0m`);
    console.log(`  \x1b[33m• HIGH: ${report.highFindings}\x1b[0m`);
    console.log(`  • MEDIUM: ${report.mediumFindings}`);
    console.log(`  \x1b[2m• LOW: ${report.lowFindings}\x1b[0m`);

    const riskColor = report.riskScore < 30 ? '\x1b[32m'
      : report.riskScore < 60 ? '\x1b[33m'
      : '\x1b[31m';

    console.log(`\nRisk Score: ${riskColor}${report.riskScore}/100\x1b[0m`);

    console.log('\n' + '─'.repeat(60));
    console.log(report.summary);
    console.log('─'.repeat(60) + '\n');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
