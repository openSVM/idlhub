/**
 * IDL Protocol Adversarial Attack Framework
 *
 * AUTHORIZED SECURITY TESTING ONLY
 *
 * This framework tests the IDL Protocol's resilience against various attack vectors
 * including MEV, flash loans, oracle manipulation, and economic exploits.
 *
 * Usage:
 *   OPENROUTER_API_KEY=key npx ts-node attack-framework/index.ts
 *
 * Options:
 *   --rounds=N        Number of attack rounds (default: 10)
 *   --vectors=all     Attack vectors to enable (default: all)
 *   --scan            Run static vulnerability scan only
 *   --report=path     Output report path
 *   --parallel        Run attacks in parallel
 *   --mock            Use mock mode without LLM calls
 */

import { AttackEngine } from './engine/attack-engine';
import { VulnerabilityScanner } from './scanner/vulnerability-scanner';
import { AttackSimulationConfig, AttackVector } from './types';
import { ATTACK_AGENT_CONFIGS } from './agents/configs';

// Parse command line arguments
function parseArgs(): {
  rounds: number;
  vectors: AttackVector[];
  scanOnly: boolean;
  reportPath: string;
  parallel: boolean;
  mock: boolean;
  scanPath: string;
} {
  const args = process.argv.slice(2);
  const result = {
    rounds: 10,
    vectors: Object.values(AttackVector),
    scanOnly: false,
    reportPath: `attack-framework/reports/attack_${Date.now()}.json`,
    parallel: false,
    mock: false,
    scanPath: 'programs/idl-protocol/src',
  };

  for (const arg of args) {
    if (arg.startsWith('--rounds=')) {
      result.rounds = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--vectors=')) {
      const vectorStr = arg.split('=')[1];
      if (vectorStr !== 'all') {
        result.vectors = vectorStr.split(',').map(v => v.trim() as AttackVector);
      }
    } else if (arg === '--scan') {
      result.scanOnly = true;
    } else if (arg.startsWith('--report=')) {
      result.reportPath = arg.split('=')[1];
    } else if (arg === '--parallel') {
      result.parallel = true;
    } else if (arg === '--mock') {
      result.mock = true;
    } else if (arg.startsWith('--scan-path=')) {
      result.scanPath = arg.split('=')[1];
    }
  }

  return result;
}

function printBanner(): void {
  console.log(`
\x1b[31m
   █████╗ ████████╗████████╗ █████╗  ██████╗██╗  ██╗
  ██╔══██╗╚══██╔══╝╚══██╔══╝██╔══██╗██╔════╝██║ ██╔╝
  ███████║   ██║      ██║   ███████║██║     █████╔╝
  ██╔══██║   ██║      ██║   ██╔══██║██║     ██╔═██╗
  ██║  ██║   ██║      ██║   ██║  ██║╚██████╗██║  ██╗
  ╚═╝  ╚═╝   ╚═╝      ╚═╝   ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝

  ███████╗██████╗  █████╗ ███╗   ███╗███████╗
  ██╔════╝██╔══██╗██╔══██╗████╗ ████║██╔════╝
  █████╗  ██████╔╝███████║██╔████╔██║█████╗
  ██╔══╝  ██╔══██╗██╔══██║██║╚██╔╝██║██╔══╝
  ██║     ██║  ██║██║  ██║██║ ╚═╝ ██║███████╗
  ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝     ╚═╝╚══════╝
\x1b[0m
  \x1b[33mIDL Protocol Adversarial Security Testing\x1b[0m
  \x1b[2mAuthorized use only - For protocol security testing\x1b[0m
`);
}

function printAttackAgents(): void {
  console.log('\x1b[1m\x1b[31m═══════════════════════════════════════════════════════\x1b[0m');
  console.log('\x1b[1m\x1b[31m  ATTACK AGENTS - ADVERSARIAL AI SQUAD\x1b[0m');
  console.log('\x1b[1m\x1b[31m═══════════════════════════════════════════════════════\x1b[0m');
  console.log(`
  1. \x1b[31m\x1b[1mMEV_Hunter\x1b[0m
     \x1b[31m"Front-run everything, back-run the rest"\x1b[0m
     Sandwich attacks, JIT liquidity, oracle front-running

  2. \x1b[35m\x1b[1mFlash_Exploiter\x1b[0m
     \x1b[35m"Why own when you can borrow infinity?"\x1b[0m
     Flash loan attacks on staking, voting, liquidity

  3. \x1b[33m\x1b[1mOracle_Manipulator\x1b[0m
     \x1b[33m"Control the data, control the market"\x1b[0m
     Oracle manipulation, stale data exploitation

  4. \x1b[36m\x1b[1mEconomic_Attacker\x1b[0m
     \x1b[36m"Economics is just math with money"\x1b[0m
     Market manipulation, wash trading, dust attacks

  5. \x1b[32m\x1b[1mGovernance_Attacker\x1b[0m
     \x1b[32m"Democracy is a vulnerability"\x1b[0m
     Vote buying, governance hijacking, timelock bypass

  6. \x1b[34m\x1b[1mProtocol_Fuzzer\x1b[0m
     \x1b[34m"If it doesn't crash, you're not trying hard enough"\x1b[0m
     Integer overflow, reentrancy, state corruption

  7. \x1b[37m\x1b[1mSybil_Operator\x1b[0m
     \x1b[37m"I am Legion, for we are many"\x1b[0m
     Multiple identities, coordinated attacks
`);
  console.log('\x1b[1m\x1b[31m═══════════════════════════════════════════════════════\x1b[0m\n');
}

async function runVulnerabilityScan(scanPath: string): Promise<void> {
  console.log('\n\x1b[1m\x1b[36m=== STATIC VULNERABILITY SCAN ===\x1b[0m\n');
  console.log(`Scanning: ${scanPath}\n`);

  const scanner = new VulnerabilityScanner();

  try {
    const results = await scanner.scanDirectory(scanPath);
    scanner.printReport();

    // Save detailed report
    const report = scanner.generateReport();
    const fs = await import('fs');
    await fs.promises.mkdir('attack-framework/reports', { recursive: true });
    await fs.promises.writeFile(
      `attack-framework/reports/scan_${Date.now()}.md`,
      report
    );
    console.log('\n\x1b[32m✓ Detailed report saved to attack-framework/reports/\x1b[0m');
  } catch (error) {
    console.error('\x1b[31mScan failed:\x1b[0m', error);
  }
}

async function runAttackSimulation(args: ReturnType<typeof parseArgs>): Promise<void> {
  // Check for API key (unless mock mode)
  let apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey && !args.mock) {
    console.error('\n\x1b[31mError: OPENROUTER_API_KEY environment variable is required.\x1b[0m');
    console.error('\nGet a free API key at: https://openrouter.ai/keys');
    console.error('\nUsage:');
    console.error('  OPENROUTER_API_KEY=your_key npx ts-node attack-framework/index.ts');
    console.error('\nOr run in mock mode (deterministic attacks):');
    console.error('  npx ts-node attack-framework/index.ts --mock');
    process.exit(1);
  }

  if (args.mock) {
    apiKey = 'mock-mode';
    console.log('\n\x1b[33mRunning in MOCK MODE - using deterministic attack decisions\x1b[0m\n');
  }

  printAttackAgents();

  console.log('Configuration:');
  console.log(`  Attack Rounds: ${args.rounds}`);
  console.log(`  Enabled Vectors: ${args.vectors.length}`);
  console.log(`  Parallel Attacks: ${args.parallel}`);
  console.log(`  Report Path: ${args.reportPath}`);
  console.log('');

  const config: AttackSimulationConfig = {
    rpcUrl: 'https://api.devnet.solana.com',
    programId: 'BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt',
    attackAgents: ATTACK_AGENT_CONFIGS,
    enabledVectors: args.vectors,
    rounds: args.rounds,
    reportPath: args.reportPath,
    verboseLogging: true,
    saveSnapshots: false,
    parallelAttacks: args.parallel,
  };

  const engine = new AttackEngine(config);
  await engine.initialize();

  console.log('\n\x1b[33mStarting attack simulation in 3 seconds...\x1b[0m\n');
  await new Promise(r => setTimeout(r, 3000));

  try {
    const result = await engine.run();
    engine.printReport(result.report);

    console.log(`\n\x1b[32m✓ Attack simulation complete!\x1b[0m`);
    console.log(`  Results saved to: ${args.reportPath}`);
  } catch (error) {
    console.error('\n\x1b[31mAttack simulation failed:\x1b[0m', error);
    process.exit(1);
  }
}

async function main(): Promise<void> {
  printBanner();

  const args = parseArgs();

  if (args.scanOnly) {
    await runVulnerabilityScan(args.scanPath);
  } else {
    // Run both scan and attack simulation
    await runVulnerabilityScan(args.scanPath);
    await runAttackSimulation(args);
  }
}

main().catch(console.error);
