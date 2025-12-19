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
    balance: 10000n * BigInt(1e6), // 10,000 IDL tokens (with 6 decimals, realistic supply)
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
      result.balance = BigInt(arg.split('=')[1]) * BigInt(1e6);
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
  console.log('='.repeat(65));
  console.log('  \x1b[1m\x1b[33mDEGEN ARENA - 5 EXPLOITERS ENTER, 1 EXITS WITH THE BAG\x1b[0m');
  console.log('='.repeat(65));
  console.log(`
  1. \x1b[31m\x1b[1mMEV_Liquidator\x1b[0m \x1b[2m[Claude Haiku]\x1b[0m
     \x1b[31m"Everyone else is exit liquidity"\x1b[0m
     Ruthless MEV extractor. Studied every exploit. No mercy.

  2. \x1b[34m\x1b[1mWhale_Manipulator\x1b[0m \x1b[2m[Claude Haiku]\x1b[0m
     \x1b[34m"Your capital is your weapon"\x1b[0m
     OG whale since 2013. Moves markets. Liquidates protocols.

  3. \x1b[33m\x1b[1mDegen_Ape\x1b[0m \x1b[2m[Claude Haiku]\x1b[0m
     \x1b[33m"APE OR DIE - NO MIDDLE GROUND"\x1b[0m
     Full send every time. Lost fortunes, made them back 10x.

  4. \x1b[36m\x1b[1mQuant_Exploiter\x1b[0m \x1b[2m[Claude Haiku]\x1b[0m
     \x1b[36m"Emotion is a bug, not a feature"\x1b[0m
     Ex-Jane Street. Kelly criterion. Mathematical destruction.

  5. \x1b[32m\x1b[1mInsider_Chad\x1b[0m \x1b[2m[Claude Haiku]\x1b[0m
     \x1b[32m"Information asymmetry IS the edge"\x1b[0m
     Knows the devs. Seen the roadmaps. Trades the alpha.
`);
  console.log('='.repeat(65));
  console.log('');
}

function printFinalResults(result: SimulationResult): void {
  console.log('\n' + '='.repeat(70));
  console.log('  FINAL RESULTS');
  console.log('='.repeat(70));

  const duration = (result.endTime - result.startTime) / 1000;
  console.log(`\n  Duration: ${duration.toFixed(1)}s`);
  console.log(`  Total Rounds: ${result.totalRounds}`);

  // Calculate aggregate stats
  const totalBetsAllAgents = result.finalLeaderboard.reduce((sum, e) => sum + e.totalBets, 0);
  const totalVolume = result.finalLeaderboard.reduce((sum, e) => sum + e.avgBetSize * BigInt(e.totalBets), 0n);

  console.log(`  Total Bets Placed: ${totalBetsAllAgents}`);
  console.log(`  Total Betting Volume: ${totalVolume} IDL`);

  console.log('\n  FINAL STANDINGS:');
  console.log('-'.repeat(70));

  const formatIDL = (amount: bigint): string => {
    const value = Number(amount) / 1e6;
    if (Math.abs(value) >= 1000000) return `${(value / 1000000).toFixed(2)}M`;
    if (Math.abs(value) >= 1000) return `${(value / 1000).toFixed(2)}K`;
    return value.toFixed(2);
  };

  for (const entry of result.finalLeaderboard) {
    const pnlStr = entry.totalPnL >= 0n
      ? `\x1b[32m+${formatIDL(entry.totalPnL)}\x1b[0m`
      : `\x1b[31m${formatIDL(entry.totalPnL)}\x1b[0m`;

    const medal = entry.rank === 1 ? ' [WINNER]' : entry.rank === 2 ? ' [2nd]' : entry.rank === 3 ? ' [3rd]' : '';

    // Calculate ROI
    const initialBalance = 10000n * BigInt(1e6);
    const roi = initialBalance > 0n
      ? Number(entry.totalPnL * 10000n / initialBalance) / 100
      : 0;
    const roiStr = roi >= 0 ? `\x1b[32m+${roi.toFixed(2)}%\x1b[0m` : `\x1b[31m${roi.toFixed(2)}%\x1b[0m`;

    // Strategy assessment
    let strategyGrade = '';
    if (entry.winRate >= 0.6 && entry.totalPnL > 0n) strategyGrade = '\x1b[32mExcellent\x1b[0m';
    else if (entry.winRate >= 0.5 && entry.totalPnL >= 0n) strategyGrade = '\x1b[33mGood\x1b[0m';
    else if (entry.totalPnL >= 0n) strategyGrade = '\x1b[36mSafe\x1b[0m';
    else strategyGrade = '\x1b[31mPoor\x1b[0m';

    console.log(`
  #${entry.rank} ${entry.agentName}${medal}
     PnL: ${pnlStr} IDL | ROI: ${roiStr}
     Win Rate: ${(entry.winRate * 100).toFixed(1)}% (${Math.round(entry.winRate * entry.totalBets)}/${entry.totalBets} bets)
     Avg Bet Size: ${formatIDL(entry.avgBetSize)} IDL
     Strategy Grade: ${strategyGrade}`);
  }

  // Strategy insights
  console.log('\n' + '-'.repeat(70));
  console.log('  STRATEGY INSIGHTS:');

  const winner = result.finalLeaderboard[0];
  const loser = result.finalLeaderboard[result.finalLeaderboard.length - 1];

  if (winner.totalPnL > 0n) {
    console.log(`\n  Winner's Edge: ${winner.agentName} succeeded with`);
    if (winner.winRate > 0.5) console.log(`    - High win rate (${(winner.winRate * 100).toFixed(0)}%)`);
    if (winner.totalBets < 5) console.log(`    - Selective betting (${winner.totalBets} bets only)`);
    if (winner.avgBetSize < 500n * BigInt(1e6)) console.log(`    - Conservative bet sizing`);
  }

  if (loser.totalPnL < 0n) {
    console.log(`\n  Loser's Mistakes: ${loser.agentName} struggled with`);
    if (loser.winRate < 0.4) console.log(`    - Low win rate (${(loser.winRate * 100).toFixed(0)}%)`);
    if (loser.totalBets > 8) console.log(`    - Overtrading (${loser.totalBets} bets)`);
    if (loser.avgBetSize > 800n * BigInt(1e6)) console.log(`    - Oversized bets`);
  }

  console.log('\n' + '='.repeat(70));
  console.log(`  WINNER: ${result.winner}`);
  console.log('='.repeat(70) + '\n');
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
  console.log(`  Initial Balance: ${args.balance / BigInt(1e6)} IDL per agent`);
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
