/**
 * OpenRouter API Client for free LLM models
 */

import { LLMResponse, Action, SimulationContext, AgentState, AgentConfig, AgentMemory } from '../types';

const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Free models on OpenRouter (as of 2025)
export const FREE_MODELS = {
  // DeepSeek models - excellent for reasoning
  DEEPSEEK_R1: 'deepseek/deepseek-r1:free',

  // Meta Llama 4 - powerful open model
  LLAMA_4_MAVERICK: 'meta-llama/llama-4-maverick:free',

  // Google Gemma - efficient and capable
  GEMMA_2_9B: 'google/gemma-2-9b-it:free',

  // Mistral models - good balance of speed and quality
  MISTRAL_7B: 'mistralai/mistral-7b-instruct:free',

  // Qwen - strong multilingual reasoning
  QWEN_2_7B: 'qwen/qwen-2-7b-instruct:free',
};

export interface OpenRouterConfig {
  apiKey: string;
  defaultModel?: string;
  maxRetries?: number;
  retryDelayMs?: number;
}

export class OpenRouterClient {
  private apiKey: string;
  private defaultModel: string;
  private maxRetries: number;
  private retryDelayMs: number;

  constructor(config: OpenRouterConfig) {
    this.apiKey = config.apiKey;
    this.defaultModel = config.defaultModel || FREE_MODELS.DEEPSEEK_R1;
    this.maxRetries = config.maxRetries || 3;
    this.retryDelayMs = config.retryDelayMs || 1000;
  }

  private buildSystemPrompt(agentConfig: AgentConfig): string {
    return `You are ${agentConfig.name}, an AI agent competing in a prediction market simulation on the IDL Protocol.

PERSONALITY: ${agentConfig.personality}
RISK TOLERANCE: ${agentConfig.riskTolerance}
STRATEGY: ${agentConfig.strategy}

You are competing against 4 other AI agents. Your goal is to MAXIMIZE your total IDL token profit (PnL).

AVAILABLE ACTIONS:
1. STAKE - Stake IDL tokens to earn protocol fees and get betting bonuses (up to 50% effective bet bonus)
2. UNSTAKE - Withdraw staked tokens (24hr minimum hold)
3. LOCK_VE - Lock staked tokens for vote-escrow power (1 week to 4 years)
4. UNLOCK_VE - Unlock vote-escrowed tokens when lock expires
5. CREATE_MARKET - Create a prediction market (earn 25% of fees)
6. PLACE_BET - Bet YES or NO on a market outcome
7. CLAIM_WINNINGS - Claim winnings from resolved winning bets
8. WAIT - Skip this round
9. ANALYZE - Spend round analyzing without action

IMPORTANT PROTOCOL MECHANICS:
- Staking bonus: min(staked_amount / 1,000,000, 50%) extra effective bet
- Market fees: 3% of winnings (50% to stakers, 25% to creator, 15% treasury, 10% burned)
- Min bet: 0.001 IDL, Max bet: 1M IDL
- Markets resolve after 24+ hours
- Parimutuel system: winners split losers' pool proportionally

Respond ONLY with valid JSON in this exact format:
{
  "thought": "Your brief strategic reasoning (1-2 sentences)",
  "marketAnalysis": "Brief analysis of current markets if relevant",
  "action": {
    "type": "ACTION_TYPE",
    "params": { "key": "value" },
    "reasoning": "Why this specific action",
    "confidence": 0.0 to 1.0
  }
}

For PLACE_BET, params must include: marketPDA, amount (in IDL tokens), betYes (true/false)
For STAKE/UNSTAKE, params must include: amount (in IDL tokens)
For CREATE_MARKET, params must include: protocolId, metricType (0-6), targetValue, description
For CLAIM_WINNINGS, params must include: marketPDA, betPDA`;
  }

  private buildUserPrompt(context: SimulationContext, state: AgentState, memory?: AgentMemory): string {
    const formatBigInt = (n: bigint) => n.toString();

    const marketsList = context.markets.map(m => {
      const total = m.totalYesAmount + m.totalNoAmount;
      const yesOdds = total > 0n ? Number((m.totalYesAmount * 100n) / total) : 50;
      return `  - ${m.protocolId} (${m.pda.slice(0, 8)}...): Target=${m.targetValue}, YES=${yesOdds}% NO=${100-yesOdds}%, Resolved=${m.resolved}`;
    }).join('\n');

    const competitorsList = context.competitorStats.map(c =>
      `  - ${c.agentName}: PnL=${formatBigInt(c.totalPnL)}, Staked=${formatBigInt(c.stakedAmount)}, Bets=${c.activeBets}`
    ).join('\n');

    const yourBets = state.activeBets.map(b =>
      `  - Market ${b.marketPDA.slice(0, 8)}...: ${formatBigInt(b.amount)} IDL on ${b.betYes ? 'YES' : 'NO'}`
    ).join('\n') || '  None';

    return `ROUND ${context.round} - Current Timestamp: ${context.timestamp}

YOUR STATE:
- IDL Balance: ${formatBigInt(state.idlBalance)} IDL
- Staked Amount: ${formatBigInt(state.stakedAmount)} IDL
- veIDL Amount: ${formatBigInt(state.veAmount)}
- Lock End: ${state.lockEndTime ? new Date(state.lockEndTime * 1000).toISOString() : 'Not locked'}
- Total PnL: ${formatBigInt(state.totalPnL)} IDL
- Round PnL: ${formatBigInt(state.roundPnL)} IDL
- Your Active Bets:
${yourBets}

PROTOCOL STATE:
- Total Staked: ${formatBigInt(context.protocolState.totalStaked)} IDL
- Total veIDL: ${formatBigInt(context.protocolState.totalVeSupply)}
- Reward Pool: ${formatBigInt(context.protocolState.rewardPool)} IDL

AVAILABLE MARKETS:
${marketsList || '  No markets available'}

COMPETITOR STANDINGS:
${competitorsList}
${memory ? this.buildMemorySection(memory) : ''}
What is your next action? Remember to maximize your profit and beat the competition!`;
  }

  private buildMemorySection(memory: AgentMemory): string {
    const formatBigInt = (n: bigint) => n.toString();

    let section = '\nYOUR MEMORY (Learn from this!):\n';

    // Recent actions summary
    if (memory.recentActions.length > 0) {
      const recentWins = memory.recentActions.filter(a => a.pnl > 0n).length;
      const recentLosses = memory.recentActions.filter(a => a.pnl < 0n).length;
      section += `- Recent record: ${recentWins}W / ${recentLosses}L\n`;

      const lastActions = memory.recentActions.slice(-3).map(a =>
        `  R${a.round}: ${a.action} -> ${a.pnl >= 0n ? '+' : ''}${formatBigInt(a.pnl)}`
      ).join('\n');
      section += `- Last 3 actions:\n${lastActions}\n`;
    }

    // Market history insights
    if (memory.marketHistory.length > 0) {
      const protocolStats: Record<string, { wins: number; losses: number }> = {};
      for (const m of memory.marketHistory) {
        if (!protocolStats[m.protocolId]) {
          protocolStats[m.protocolId] = { wins: 0, losses: 0 };
        }
        if (m.won) protocolStats[m.protocolId].wins++;
        else protocolStats[m.protocolId].losses++;
      }

      const insights = Object.entries(protocolStats)
        .map(([proto, stats]) => `  ${proto}: ${stats.wins}W/${stats.losses}L`)
        .slice(0, 5)
        .join('\n');
      section += `- Protocol betting history:\n${insights}\n`;
    }

    // Winning/losing strategies
    if (memory.winningStrategies.length > 0) {
      section += `- What worked: ${memory.winningStrategies.slice(-3).join(', ')}\n`;
    }
    if (memory.losingStrategies.length > 0) {
      section += `- What failed: ${memory.losingStrategies.slice(-3).join(', ')}\n`;
    }

    // Competitor patterns
    if (Object.keys(memory.competitorPatterns).length > 0) {
      const patterns = Object.entries(memory.competitorPatterns)
        .map(([name, pattern]) => `  ${name}: ${pattern}`)
        .join('\n');
      section += `- Competitor patterns:\n${patterns}\n`;
    }

    return section;
  }

  async getAgentAction(
    agentConfig: AgentConfig,
    context: SimulationContext,
    state: AgentState,
    memory?: AgentMemory
  ): Promise<LLMResponse> {
    // Mock mode - generate random but strategy-appropriate actions
    if (this.apiKey === 'mock-mode') {
      return this.getMockAction(agentConfig, context, state, memory);
    }

    const systemPrompt = this.buildSystemPrompt(agentConfig);
    const userPrompt = this.buildUserPrompt(context, state, memory);

    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.maxRetries; attempt++) {
      try {
        const response = await fetch(OPENROUTER_API_URL, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://idlhub.io',
            'X-Title': 'IDL Protocol Agent Simulation',
          },
          body: JSON.stringify({
            model: agentConfig.model,
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: agentConfig.riskTolerance === 'extreme' ? 0.9 :
                         agentConfig.riskTolerance === 'high' ? 0.7 :
                         agentConfig.riskTolerance === 'medium' ? 0.5 : 0.3,
            max_tokens: 1000,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
        }

        const data = await response.json() as { choices?: { message?: { content?: string } }[] };
        const content = data.choices?.[0]?.message?.content;

        if (!content) {
          throw new Error('Empty response from OpenRouter');
        }

        // Parse JSON from response (handle markdown code blocks)
        let jsonStr = content;
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
          jsonStr = jsonMatch[1].trim();
        }

        const parsed = JSON.parse(jsonStr);

        return {
          thought: parsed.thought || 'No thought provided',
          marketAnalysis: parsed.marketAnalysis,
          action: {
            type: parsed.action?.type || 'WAIT',
            params: parsed.action?.params || {},
            reasoning: parsed.action?.reasoning || 'No reasoning',
            confidence: parsed.action?.confidence || 0.5,
          },
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`Attempt ${attempt + 1} failed:`, error);

        if (attempt < this.maxRetries - 1) {
          await new Promise(r => setTimeout(r, this.retryDelayMs * (attempt + 1)));
        }
      }
    }

    // Return fallback action on failure
    console.warn(`All retries failed for ${agentConfig.name}, using fallback action`);
    return {
      thought: `API call failed: ${lastError?.message}`,
      action: {
        type: 'WAIT',
        params: {},
        reasoning: 'API failure fallback',
        confidence: 0,
      },
    };
  }

  /**
   * Generate mock actions based on agent personality (for testing without API)
   */
  private getMockAction(
    agentConfig: AgentConfig,
    context: SimulationContext,
    state: AgentState,
    memory?: AgentMemory
  ): LLMResponse {
    const availableMarkets = context.markets.filter(m => !m.resolved);
    const rand = Math.random();

    // Agent-specific behavior based on personality
    switch (agentConfig.name) {
      case 'Aggressive Alpha': {
        // Aggressive: big bets, frequent trading
        if (state.stakedAmount === 0n && state.idlBalance > 0n) {
          const stakeAmount = state.idlBalance * 7n / 10n; // Stake 70%
          return {
            thought: 'Need staking bonus for maximum betting power',
            action: {
              type: 'STAKE',
              params: { amount: stakeAmount.toString() },
              reasoning: 'Maximize staking bonus before betting',
              confidence: 0.9,
            },
          };
        }
        if (availableMarkets.length > 0 && state.idlBalance > 0n) {
          const market = availableMarkets[Math.floor(rand * availableMarkets.length)];
          const betAmount = state.idlBalance * BigInt(Math.floor(rand * 30 + 20)) / 100n; // 20-50%
          const total = market.totalYesAmount + market.totalNoAmount;
          const yesRatio = total > 0n ? Number(market.totalYesAmount * 100n / total) : 50;
          // Contrarian: bet against the majority
          const betYes = yesRatio > 60 ? false : yesRatio < 40 ? true : rand > 0.5;
          return {
            thought: `Market ${market.protocolId} looks imbalanced, going contrarian`,
            marketAnalysis: `YES: ${yesRatio}%, betting ${betYes ? 'YES' : 'NO'}`,
            action: {
              type: 'PLACE_BET',
              params: { marketPDA: market.pda, amount: betAmount.toString(), betYes },
              reasoning: 'High conviction contrarian play',
              confidence: 0.85,
            },
          };
        }
        break;
      }

      case 'Conservative Carl': {
        // Conservative: heavy staking, small bets
        if (state.stakedAmount < state.idlBalance * 4n) {
          const stakeAmount = state.idlBalance * 8n / 10n; // Stake 80%
          if (stakeAmount > 0n) {
            return {
              thought: 'Building staking position for passive income',
              action: {
                type: 'STAKE',
                params: { amount: stakeAmount.toString() },
                reasoning: 'Maximize staking rewards',
                confidence: 0.95,
              },
            };
          }
        }
        if (state.stakedAmount > 0n && state.veAmount === 0n) {
          return {
            thought: 'Lock staked tokens for veIDL',
            action: {
              type: 'LOCK_VE',
              params: { duration: 2592000 }, // 30 days
              reasoning: 'Secure long-term staking benefits',
              confidence: 0.9,
            },
          };
        }
        // Small safe bets
        if (availableMarkets.length > 0 && state.idlBalance > 0n && rand > 0.6) {
          const market = availableMarkets[0];
          const betAmount = state.idlBalance / 10n; // Only 10%
          return {
            thought: 'Small position in established market',
            action: {
              type: 'PLACE_BET',
              params: { marketPDA: market.pda, amount: betAmount.toString(), betYes: true },
              reasoning: 'Conservative YES bet on stable protocol',
              confidence: 0.7,
            },
          };
        }
        return {
          thought: 'Market conditions uncertain, staying patient',
          action: { type: 'WAIT', params: {}, reasoning: 'Patience is key', confidence: 0.8 },
        };
      }

      case 'Contrarian Cathy': {
        // Only bet when market is heavily skewed
        if (state.stakedAmount === 0n && state.idlBalance > 0n) {
          return {
            thought: 'Building modest stake for betting bonus',
            action: {
              type: 'STAKE',
              params: { amount: (state.idlBalance / 2n).toString() },
              reasoning: 'Moderate staking for flexibility',
              confidence: 0.8,
            },
          };
        }
        const skewedMarket = availableMarkets.find(m => {
          const total = m.totalYesAmount + m.totalNoAmount;
          if (total === 0n) return false;
          const ratio = Number(m.totalYesAmount * 100n / total);
          return ratio > 75 || ratio < 25;
        });
        if (skewedMarket && state.idlBalance > 0n) {
          const total = skewedMarket.totalYesAmount + skewedMarket.totalNoAmount;
          const yesRatio = Number(skewedMarket.totalYesAmount * 100n / total);
          const betYes = yesRatio > 75 ? false : true; // Fade the crowd
          const betAmount = state.idlBalance * BigInt(Math.floor(rand * 10 + 15)) / 100n;
          return {
            thought: `Found heavily skewed market ${skewedMarket.protocolId} - fading crowd`,
            marketAnalysis: `Market at ${yesRatio}% YES - classic contrarian setup`,
            action: {
              type: 'PLACE_BET',
              params: { marketPDA: skewedMarket.pda, amount: betAmount.toString(), betYes },
              reasoning: 'Extreme sentiment = fade opportunity',
              confidence: 0.85,
            },
          };
        }
        return {
          thought: 'No extreme imbalances found, waiting for setup',
          action: { type: 'ANALYZE', params: {}, reasoning: 'Patience for right opportunity', confidence: 0.7 },
        };
      }

      case 'Momentum Mike': {
        // Follow the trend
        if (state.stakedAmount === 0n && state.idlBalance > 0n) {
          return {
            thought: 'Light stake to stay nimble',
            action: {
              type: 'STAKE',
              params: { amount: (state.idlBalance * 3n / 10n).toString() },
              reasoning: 'Keep capital liquid for momentum plays',
              confidence: 0.75,
            },
          };
        }
        if (availableMarkets.length > 0 && state.idlBalance > 0n) {
          const market = availableMarkets[Math.floor(rand * availableMarkets.length)];
          const total = market.totalYesAmount + market.totalNoAmount;
          const yesRatio = total > 0n ? Number(market.totalYesAmount * 100n / total) : 50;
          // Follow momentum: bet with the majority if > 55%
          const betYes = yesRatio > 55 ? true : yesRatio < 45 ? false : rand > 0.5;
          const betAmount = state.idlBalance * BigInt(Math.floor(rand * 15 + 10)) / 100n;
          return {
            thought: `Riding momentum on ${market.protocolId}`,
            marketAnalysis: `Trend: ${yesRatio > 50 ? 'YES' : 'NO'} at ${yesRatio}%`,
            action: {
              type: 'PLACE_BET',
              params: { marketPDA: market.pda, amount: betAmount.toString(), betYes },
              reasoning: 'Trend is your friend',
              confidence: 0.7,
            },
          };
        }
        break;
      }

      case 'Value Victor': {
        // Calculate expected value
        if (state.stakedAmount === 0n && state.idlBalance > 0n) {
          return {
            thought: 'Stake 50% for balanced approach',
            action: {
              type: 'STAKE',
              params: { amount: (state.idlBalance / 2n).toString() },
              reasoning: 'Balanced staking for bonus + liquidity',
              confidence: 0.85,
            },
          };
        }
        // Look for value (close to 50/50 markets where we can find edge)
        const valueMarket = availableMarkets.find(m => {
          const total = m.totalYesAmount + m.totalNoAmount;
          if (total === 0n) return false;
          const ratio = Number(m.totalYesAmount * 100n / total);
          return ratio >= 40 && ratio <= 60; // Look for balanced markets
        });
        if (valueMarket && state.idlBalance > 0n && rand > 0.4) {
          const betAmount = state.idlBalance * BigInt(Math.floor(rand * 15 + 10)) / 100n;
          const betYes = rand > 0.5;
          return {
            thought: `${valueMarket.protocolId} shows value at current odds`,
            marketAnalysis: 'Balanced market with potential edge',
            action: {
              type: 'PLACE_BET',
              params: { marketPDA: valueMarket.pda, amount: betAmount.toString(), betYes },
              reasoning: '+EV play based on fundamentals',
              confidence: 0.75,
            },
          };
        }
        return {
          thought: 'No clear +EV opportunities, analyzing further',
          action: { type: 'ANALYZE', params: {}, reasoning: 'Waiting for mispriced markets', confidence: 0.6 },
        };
      }
    }

    // Default fallback
    return {
      thought: 'Evaluating options...',
      action: { type: 'WAIT', params: {}, reasoning: 'Strategic pause', confidence: 0.5 },
    };
  }
}
