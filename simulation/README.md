# IDL Protocol Multi-Agent Simulation

A competitive simulation framework where 5 AI agents battle to maximize gains on the IDL prediction market protocol. Each agent uses a different free LLM from OpenRouter with unique trading strategies.

## Quick Start

```bash
# Set your OpenRouter API key
export OPENROUTER_API_KEY=your_key_here

# Run the simulation
npx ts-node simulation/index.ts
```

## The Agents

| Agent | Model | Strategy | Risk Level |
|-------|-------|----------|------------|
| **Aggressive Alpha** | DeepSeek R1 | High-stakes bets, contrarian positions, martingale mindset | EXTREME |
| **Conservative Carl** | Gemma 2 9B | Capital preservation, heavy staking, small safe bets | LOW |
| **Contrarian Cathy** | Mistral 7B | Fade the crowd, exploit market imbalances | MEDIUM |
| **Momentum Mike** | Qwen 2 7B | Follow trends, ride momentum, multiple positions | HIGH |
| **Value Victor** | Llama 4 Maverick | Expected value calculations, mispriced markets | MEDIUM |

## How It Works

1. **Initialization**: Each agent starts with the same IDL token balance
2. **Each Round**:
   - Agents receive market state and competitor info
   - LLM decides next action based on strategy
   - Actions are executed (staking, betting, market creation, etc.)
   - Markets randomly resolve, determining winners/losers
3. **Winning**: Agent with highest PnL at the end wins

## Available Actions

- **STAKE** - Stake IDL tokens to earn protocol fees + betting bonus (up to 50%)
- **UNSTAKE** - Withdraw staked tokens
- **LOCK_VE** - Lock tokens for vote-escrow power
- **PLACE_BET** - Bet YES/NO on market outcomes
- **CREATE_MARKET** - Create new prediction markets (earn 25% of fees)
- **CLAIM_WINNINGS** - Collect winnings from resolved markets
- **WAIT/ANALYZE** - Skip round

## Command Line Options

```bash
npx ts-node simulation/index.ts [options]

Options:
  --rounds=N      Number of simulation rounds (default: 10)
  --delay=N       Delay between rounds in ms (default: 2000)
  --balance=N     Initial IDL balance per agent (default: 10000)
  --devnet        Use real devnet transactions (default: simulated)
  --debug         Enable debug logging
```

## Examples

```bash
# Quick test (5 rounds, fast)
OPENROUTER_API_KEY=sk-xxx npx ts-node simulation/index.ts --rounds=5 --delay=1000

# Long simulation with more starting capital
OPENROUTER_API_KEY=sk-xxx npx ts-node simulation/index.ts --rounds=50 --balance=100000

# Debug mode
OPENROUTER_API_KEY=sk-xxx npx ts-node simulation/index.ts --debug
```

## Protocol Mechanics

The agents compete on the IDL Protocol which features:

- **Parimutuel Betting**: Winners split the losers' pool proportionally
- **Staking Bonus**: Stakers get up to 50% extra effective bet size
- **Market Creation Rewards**: Creators earn 25% of betting fees
- **Fee Distribution**: 3% fee on winnings (50% stakers, 25% creator, 15% treasury, 10% burned)

## Output

Results are saved to `simulation/results/run_<timestamp>.json` including:
- Round-by-round actions
- Final leaderboard
- Win rates and statistics
- All agent decisions and reasoning

## Architecture

```
simulation/
├── index.ts           # Main entry point
├── types.ts           # TypeScript interfaces
├── agents/
│   ├── base.ts        # Base agent class
│   └── configs.ts     # Agent configurations
├── engine/
│   └── simulation.ts  # Main simulation loop
├── utils/
│   ├── logger.ts      # Colorful console output
│   └── openrouter.ts  # LLM API client
└── results/           # Saved simulation results
```

## Free OpenRouter Models Used

1. **DeepSeek R1** (`deepseek/deepseek-r1:free`) - Strong reasoning
2. **Gemma 2 9B** (`google/gemma-2-9b-it:free`) - Balanced performance
3. **Mistral 7B** (`mistralai/mistral-7b-instruct:free`) - Fast and capable
4. **Qwen 2 7B** (`qwen/qwen-2-7b-instruct:free`) - Multilingual reasoning
5. **Llama 4 Maverick** (`meta-llama/llama-4-maverick:free`) - Meta's latest

Get your free API key at: https://openrouter.ai/keys

## Tips for Best Results

1. **More rounds = more data**: Agents learn and adapt over time
2. **Watch the contrarian**: Contrarian Cathy often wins in volatile markets
3. **Staking matters**: Conservative Carl's staking strategy provides steady returns
4. **Market creation**: Creating popular markets can be very profitable

## License

MIT
