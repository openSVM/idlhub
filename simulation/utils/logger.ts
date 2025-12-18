/**
 * Colorful logger for the simulation
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const COLORS = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
  white: '\x1b[37m',
  bgRed: '\x1b[41m',
  bgGreen: '\x1b[42m',
  bgYellow: '\x1b[43m',
  bgBlue: '\x1b[44m',
};

const AGENT_COLORS: Record<string, string> = {
  'Aggressive Alpha': COLORS.red,
  'Conservative Carl': COLORS.blue,
  'Contrarian Cathy': COLORS.magenta,
  'Momentum Mike': COLORS.cyan,
  'Value Victor': COLORS.green,
};

export class Logger {
  private level: LogLevel;
  private static instance: Logger;

  constructor(level: LogLevel = 'info') {
    this.level = level;
  }

  static getInstance(level?: LogLevel): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(level);
    }
    return Logger.instance;
  }

  private shouldLog(msgLevel: LogLevel): boolean {
    const levels = ['debug', 'info', 'warn', 'error'];
    return levels.indexOf(msgLevel) >= levels.indexOf(this.level);
  }

  private formatTimestamp(): string {
    return new Date().toISOString().replace('T', ' ').slice(0, 19);
  }

  debug(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('debug')) {
      console.log(
        `${COLORS.dim}[${this.formatTimestamp()}] DEBUG: ${message}${COLORS.reset}`,
        context ? context : ''
      );
    }
  }

  info(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('info')) {
      console.log(
        `${COLORS.white}[${this.formatTimestamp()}] INFO:  ${message}${COLORS.reset}`,
        context ? context : ''
      );
    }
  }

  warn(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('warn')) {
      console.log(
        `${COLORS.yellow}[${this.formatTimestamp()}] WARN:  ${message}${COLORS.reset}`,
        context ? context : ''
      );
    }
  }

  error(message: string, context?: Record<string, any>): void {
    if (this.shouldLog('error')) {
      console.log(
        `${COLORS.red}[${this.formatTimestamp()}] ERROR: ${message}${COLORS.reset}`,
        context ? context : ''
      );
    }
  }

  agent(agentName: string, message: string): void {
    const color = AGENT_COLORS[agentName] || COLORS.white;
    console.log(
      `${color}[${this.formatTimestamp()}] [${agentName}] ${message}${COLORS.reset}`
    );
  }

  action(agentName: string, action: string, details: string): void {
    const color = AGENT_COLORS[agentName] || COLORS.white;
    console.log(
      `${color}${COLORS.bright}[${this.formatTimestamp()}] [${agentName}] ACTION: ${action}${COLORS.reset}`
    );
    console.log(`${COLORS.dim}    ${details}${COLORS.reset}`);
  }

  round(roundNum: number, totalRounds: number): void {
    const bar = '='.repeat(50);
    console.log(`\n${COLORS.bright}${COLORS.cyan}${bar}${COLORS.reset}`);
    console.log(
      `${COLORS.bright}${COLORS.cyan}  ROUND ${roundNum} / ${totalRounds}${COLORS.reset}`
    );
    console.log(`${COLORS.bright}${COLORS.cyan}${bar}${COLORS.reset}\n`);
  }

  leaderboard(rankings: { rank: number; name: string; pnl: bigint }[]): void {
    console.log(`\n${COLORS.bright}${COLORS.yellow}--- LEADERBOARD ---${COLORS.reset}`);
    rankings.forEach(({ rank, name, pnl }) => {
      const color = AGENT_COLORS[name] || COLORS.white;
      const pnlStr = pnl >= 0n ? `+${pnl}` : `${pnl}`;
      const medal = rank === 1 ? ' [1st]' : rank === 2 ? ' [2nd]' : rank === 3 ? ' [3rd]' : '';
      console.log(
        `${color}  #${rank} ${name}${medal}: ${pnlStr} IDL${COLORS.reset}`
      );
    });
    console.log('');
  }

  market(marketId: string, yes: bigint, no: bigint): void {
    const total = yes + no;
    const yesPercent = total > 0n ? Number((yes * 100n) / total) : 50;
    console.log(
      `${COLORS.dim}  Market ${marketId.slice(0, 8)}... YES: ${yesPercent}% (${yes}) | NO: ${100 - yesPercent}% (${no})${COLORS.reset}`
    );
  }

  winner(agentName: string, pnl: bigint): void {
    const color = AGENT_COLORS[agentName] || COLORS.green;
    const box = '='.repeat(50);
    console.log(`\n${COLORS.bright}${COLORS.bgGreen}${box}${COLORS.reset}`);
    console.log(
      `${COLORS.bright}${COLORS.bgGreen}  WINNER: ${agentName} with PnL: ${pnl} IDL  ${COLORS.reset}`
    );
    console.log(`${COLORS.bright}${COLORS.bgGreen}${box}${COLORS.reset}\n`);
  }
}
