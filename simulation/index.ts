/**
 * IDL Protocol Multi-Agent Simulation
 *
 * Run 5 AI agents competing to maximize gains on the IDL prediction market protocol.
 * Each agent uses a different free OpenRouter model with unique strategies.
 *
 * Usage:
 *   OPENROUTER_API_KEY=your_key npx ts-node simulation/index.ts
 *
 * Options:
 *   --rounds=N      Number of simulation rounds (default: 10)
 *   --delay=N       Delay between rounds in ms (default: 2000)
 *   --balance=N     Initial IDL balance per agent (default: 10000)
 *   --devnet        Use real devnet transactions (default: simulated)
 *   --debug         Enable debug logging
 */

import { SimulationEngine } from './engine/simulation';
import { SimulationConfig, SimulationResult } from './types';
import { Logger } from './utils/logger';

// Parse command line arguments
function parseArgs(): {
  rounds: number;
  delay: number;
  balance: bigint;
  devnet: boolean;
  debug: boolean;
  mock: boolean;
} {
  const args = process.argv.slice(2);
  const result = {
    rounds: 10,
    delay: 2000,
    balance: 10000n * BigInt(1e9), // 10,000 IDL tokens (with 9 decimals)
    devnet: false,
    debug: false,
    mock: false,
  };

  for (const arg of args) {
    if (arg.startsWith('--rounds=')) {
      result.rounds = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--delay=')) {
      result.delay = parseInt(arg.split('=')[1], 10);
    } else if (arg.startsWith('--balance=')) {
      result.balance = BigInt(arg.split('=')[1]) * BigInt(1e9);
    } else if (arg === '--devnet') {
      result.devnet = true;
    } else if (arg === '--debug') {
      result.debug = true;
    } else if (arg === '--mock') {
      result.mock = true;
    }
  }

  return result;
}

function printBanner(): void {
  console.log(`
 _____ _____  _       _____           _                  _
|_   _|  __ \\| |     |  __ \\         | |                | |
  | | | |  | | |     | |__) | __ ___ | |_ ___   ___ ___ | |
  | | | |  | | |     |  ___/ '__/ _ \\| __/ _ \\ / __/ _ \\| |
 _| |_| |__| | |____ | |   | | | (_) | || (_) | (_| (_) | |
|_____|_____/|______||_|   |_|  \\___/ \\__\\___/ \\___\\___/|_|

   __  __       _ _   _                            _
  |  \\/  |     | | | (_)     /\\                   | |
  | \\  / |_   _| | |_ _ ___ /  \\   __ _  ___ _ __ | |_
  | |\\/| | | | | | __| |___/ /\\ \\ / _\` |/ _ \\ '_ \\| __|
  | |  | | |_| | | |_| |  / ____ \\ (_| |  __/ | | | |_
  |_|  |_|\\__,_|_|\\__|_| /_/    \\_\\__, |\\___|_| |_|\\__|
                                   __/ |
                                  |___/
   ____  _                 _       _   _
  / ___|(_)_ __ ___  _   _| | __ _| |_(_) ___  _ __
  \\___ \\| | '_ \` _ \\| | | | |/ _\` | __| |/ _ \\| '_ \\
   ___) | | | | | | | |_| | | (_| | |_| | (_) | | | |
  |____/|_|_| |_| |_|\\__,_|_|\\__,_|\\__|_|\\___/|_| |_|

`);
}

function printAgentIntro(): void {
  console.log('='.repeat(60));
  console.log('  COMPETING AGENTS');
  console.log('='.repeat(60));
  console.log(`
  1. \x1b[31mAggressive Alpha\x1b[0m (DeepSeek R1)
     Strategy: High-stakes betting, contrarian positions
     Risk: EXTREME

  2. \x1b[34mConservative Carl\x1b[0m (Gemma 2 9B)
     Strategy: Capital preservation, staking focus
     Risk: LOW

  3. \x1b[35mContrarian Cathy\x1b[0m (Mistral 7B)
     Strategy: Fade the crowd, exploit imbalances
     Risk: MEDIUM

  4. \x1b[36mMomentum Mike\x1b[0m (Qwen 2 7B)
     Strategy: Follow trends, ride momentum
     Risk: HIGH

  5. \x1b[32mValue Victor\x1b[0m (Llama 4 Maverick)
     Strategy: Expected value calculations, mispriced markets
     Risk: MEDIUM
`);
  console.log('='.repeat(60));
  console.log('');
}

function printFinalResults(result: SimulationResult): void {
  console.log('\n' + '='.repeat(60));
  console.log('  FINAL RESULTS');
  console.log('='.repeat(60));

  const duration = (result.endTime - result.startTime) / 1000;
  console.log(`\n  Duration: ${duration.toFixed(1)}s`);
  console.log(`  Total Rounds: ${result.totalRounds}`);

  console.log('\n  FINAL STANDINGS:');
  console.log('-'.repeat(60));

  for (const entry of result.finalLeaderboard) {
    const pnlStr = entry.totalPnL >= 0n
      ? `\x1b[32m+${entry.totalPnL}\x1b[0m`
      : `\x1b[31m${entry.totalPnL}\x1b[0m`;

    const medal = entry.rank === 1 ? ' [WINNER]' : entry.rank === 2 ? ' [2nd]' : entry.rank === 3 ? ' [3rd]' : '';

    console.log(`
  #${entry.rank} ${entry.agentName}${medal}
     PnL: ${pnlStr} IDL
     Win Rate: ${(entry.winRate * 100).toFixed(1)}%
     Total Bets: ${entry.totalBets}
     Avg Bet Size: ${entry.avgBetSize} IDL`);
  }

  console.log('\n' + '='.repeat(60));
  console.log(`\n  WINNER: ${result.winner}`);
  console.log('='.repeat(60) + '\n');
}

async function main(): Promise<void> {
  printBanner();

  const args = parseArgs();

  // Check for API key (unless mock mode)
  let apiKey = process.env.OPENROUTER_API_KEY || '';
  if (!apiKey && !args.mock) {
    console.error('\x1b[31mError: OPENROUTER_API_KEY environment variable is required.\x1b[0m');
    console.error('\nGet a free API key at: https://openrouter.ai/keys');
    console.error('\nUsage:');
    console.error('  OPENROUTER_API_KEY=your_key npx ts-node simulation/index.ts');
    console.error('\nOr run in mock mode (no LLM calls):');
    console.error('  npx ts-node simulation/index.ts --mock');
    process.exit(1);
  }

  if (args.mock) {
    apiKey = 'mock-mode';
    console.log('\x1b[33mRunning in MOCK MODE - agents will use random decisions\x1b[0m\n');
  }
  printAgentIntro();

  console.log('Configuration:');
  console.log(`  Rounds: ${args.rounds}`);
  console.log(`  Round Delay: ${args.delay}ms`);
  console.log(`  Initial Balance: ${args.balance / BigInt(1e9)} IDL per agent`);
  console.log(`  Mode: ${args.devnet ? 'DEVNET (real transactions)' : 'SIMULATED'}`);
  console.log(`  Log Level: ${args.debug ? 'DEBUG' : 'INFO'}`);
  console.log('');

  const config: SimulationConfig = {
    devnetRpc: 'https://api.devnet.solana.com',
    openRouterApiKey: apiKey,
    rounds: args.rounds,
    roundDurationMs: args.delay,
    initialIdlBalance: args.balance,
    initialSolBalance: BigInt(1e9), // 1 SOL for tx fees
    logLevel: args.debug ? 'debug' : 'info',
  };

  const engine = new SimulationEngine(config);

  console.log('Starting simulation in 3 seconds...\n');
  await new Promise(r => setTimeout(r, 3000));

  try {
    const result = await engine.run();
    printFinalResults(result);

    // Save results to file
    const fs = await import('fs');
    const resultsFile = `simulation/results/run_${Date.now()}.json`;
    await fs.promises.mkdir('simulation/results', { recursive: true });
    await fs.promises.writeFile(
      resultsFile,
      JSON.stringify(result, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2)
    );
    console.log(`Results saved to: ${resultsFile}`);

  } catch (error) {
    console.error('\x1b[31mSimulation failed:\x1b[0m', error);
    process.exit(1);
  }
}

main().catch(console.error);
