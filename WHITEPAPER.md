# IDL Protocol Whitepaper v3.1

```
     ██╗██████╗ ██╗         ██████╗ ██████╗  ██████╗ ████████╗ ██████╗  ██████╗ ██████╗ ██╗
     ██║██╔══██╗██║         ██╔══██╗██╔══██╗██╔═══██╗╚══██╔══╝██╔═══██╗██╔════╝██╔═══██╗██║
     ██║██║  ██║██║         ██████╔╝██████╔╝██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║
     ██║██║  ██║██║         ██╔═══╝ ██╔══██╗██║   ██║   ██║   ██║   ██║██║     ██║   ██║██║
     ██║██████╔╝███████╗    ██║     ██║  ██║╚██████╔╝   ██║   ╚██████╔╝╚██████╗╚██████╔╝███████╗
     ╚═╝╚═════╝ ╚══════╝    ╚═╝     ╚═╝  ╚═╝ ╚═════╝    ╚═╝    ╚═════╝  ╚═════╝ ╚═════╝ ╚══════╝

                              The Prediction Layer for Solana DeFi
```

---

## Executive Summary

IDL Protocol is a comprehensive DeFi ecosystem built on Solana, combining:

1. **IDLHub** - The largest registry of Solana Interface Definition Languages (100+ protocols)
2. **Prediction Markets** - Bet on DeFi protocol metrics (TVL, volume, users, etc.)
3. **StableSwap AMM** - Unified liquidity for dual-token system
4. **Social Trading** - Guilds, battles, leaderboards, and referrals
5. **AI Integration** - Claude-powered market making and odds calculation

The $IDL token captures value through staking rewards, fee burns, and governance rights.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [The Problem](#2-the-problem)
3. [The Solution](#3-the-solution)
4. [Token Economics](#4-token-economics)
5. [Core Protocol](#5-core-protocol)
6. [Prediction Markets](#6-prediction-markets)
7. [Advanced Trading Features](#7-advanced-trading-features)
8. [Social Layer](#8-social-layer)
9. [AI Integration](#9-ai-integration)
10. [StableSwap AMM](#10-stableswap-amm)
11. [Security](#11-security)
12. [Governance](#12-governance)
13. [Roadmap](#13-roadmap)
14. [Technical Architecture](#14-technical-architecture)
15. [On-Chain Metrics Oracle: Technical Deep Dive](#15-on-chain-metrics-oracle-technical-deep-dive)
16. [Appendix](#16-appendix)

---

## 1. Introduction

### 1.1 Vision

IDL Protocol aims to become the **Bloomberg Terminal of Solana DeFi** - a comprehensive platform where users can:

- Access standardized program interfaces for any Solana protocol
- Predict and bet on DeFi metrics with real economic stakes
- Compete with other predictors through battles and leaderboards
- Earn rewards for accurate predictions and market creation

### 1.2 Core Principles

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║   1. FREE ACCESS     - IDLHub registry is free forever, no paywalls          ║
║   2. REAL YIELD      - Staking rewards from actual protocol revenue          ║
║   3. DEFLATIONARY    - 10% of all fees permanently burned                    ║
║   4. FAIR LAUNCH     - No VC allocation, no presale, 95% public              ║
║   5. COMMUNITY FIRST - Governance by veIDL holders                           ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

## 2. The Problem

### 2.1 Fragmented IDL Ecosystem

Solana developers and AI agents face significant challenges:

| Problem | Impact |
|---------|--------|
| IDLs scattered across GitHub repos | Hours wasted searching |
| Many IDLs outdated or incomplete | Integration failures |
| No standardized registry | Each team builds from scratch |
| AI agents can't find interfaces | Limits automation potential |

### 2.2 Prediction Market Gaps

Existing prediction markets fail DeFi users:

| Platform | Issue |
|----------|-------|
| Polymarket | Ethereum-based, high fees, no DeFi focus |
| Drift Markets | Limited to specific assets |
| Custom solutions | Fragmented liquidity, poor UX |

### 2.3 Token Value Problem

Most DeFi tokens suffer from:

- **Inflationary emissions** diluting holder value
- **Governance-only utility** with no real yield
- **Lack of engagement** beyond speculation

---

## 3. The Solution

### 3.1 IDLHub: The Registry

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              IDLHub Registry                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   100+ Solana Protocol IDLs                                                 │
│   ├── Jupiter (DEX)                                                         │
│   ├── Marinade (Staking)                                                    │
│   ├── Drift (Perps)                                                         │
│   ├── Jito (MEV)                                                            │
│   ├── Raydium (AMM)                                                         │
│   ├── Orca (AMM)                                                            │
│   ├── Tensor (NFT)                                                          │
│   ├── Magic Eden (NFT)                                                      │
│   └── ... and 90+ more                                                      │
│                                                                             │
│   Access Methods:                                                           │
│   ├── Web Interface (idlhub.io)                                             │
│   ├── REST API (/api/idl/{program})                                         │
│   ├── MCP Server (AI agents)                                                │
│   └── JSON-RPC (/api/mcp)                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 3.2 Prediction Markets

Bet on verifiable DeFi metrics:

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         SAMPLE PREDICTION MARKETS                            ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   [JUP-TVL-3B]  "Jupiter TVL > $3B by March 2025?"                           ║
║                  ├── YES: 65% (650,000 IDL)                                  ║
║                  ├── NO:  35% (350,000 IDL)                                  ║
║                  └── Resolution: DeFiLlama Oracle                            ║
║                                                                               ║
║   [DRIFT-VOL]   "Drift 24h Volume > $2B?"                                    ║
║                  ├── YES: 40% (200,000 IDL)                                  ║
║                  ├── NO:  60% (300,000 IDL)                                  ║
║                  └── Resolution: Drift API                                   ║
║                                                                               ║
║   [SOL-100K]    "Solana reaches 100k TPS average?"                           ║
║                  ├── YES: 25% (125,000 IDL)                                  ║
║                  ├── NO:  75% (375,000 IDL)                                  ║
║                  └── Resolution: Solana Explorer                             ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### 3.3 Social Trading

Transform prediction markets into a social experience:

- **1v1 Battles** - Challenge any user to head-to-head predictions
- **Guilds** - Pool capital with friends, share winnings
- **Leaderboards** - Compete for accuracy rankings
- **Referrals** - Earn 5% of referred users' fees forever
- **Seasons** - Time-limited competitions with prize pools

---

## 4. Token Economics

### 4.1 Token Overview

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                              $IDL TOKEN                                       ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   Network:        Solana                                                      ║
║   Standard:       SPL Token                                                   ║
║   Decimals:       9                                                           ║
║                                                                               ║
║   PUMP-IDL:       4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump (Active)      ║
║   BAGS-IDL:       8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS (Legacy)      ║
║                                                                               ║
║   Total Supply:   2,000,000,000 IDL (2B combined)                            ║
║   Circulating:    ~1,950,000,000 IDL (97.5%)                                 ║
║   Team:           ~50,000,000 IDL (2.5%)                                     ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### 4.2 Supply Distribution

```
PUMP-IDL (1B):
├── Bonding Curve:        800,000,000  (80%)
└── Raydium Migration:    200,000,000  (20%)

BAGS-IDL (1B):
├── Public (bags.fm):     950,000,000  (95%)
└── Team:                  50,000,000  (5%)

VISUAL:
[████████████████████████████████████████████████████████████] 100%
[██████████████████████████████████████████████████████████  ] 97.5% Public
[██                                                          ] 2.5%  Team
```

### 4.3 Token Utility Matrix

| Utility | Description | Requirement |
|---------|-------------|-------------|
| **Stake** | Earn 50% of protocol fees | Hold IDL |
| **Lock (veIDL)** | Governance voting power | Lock staked IDL |
| **Bet** | Predict DeFi metrics | Hold IDL |
| **Battle** | 1v1 prediction challenges | Hold IDL |
| **Guild** | Pooled betting groups | 10 IDL creation fee |
| **Lootbox** | Random rewards | 1-100 IDL per box |
| **VIP Tiers** | Fee discounts | Stake thresholds |

### 4.4 Fee Structure

```
                         PREDICTION MARKET FEE FLOW
                         ═══════════════════════════

                              Winner Claims 1000 IDL
                                       │
                                       ▼
                              ┌────────────────┐
                              │  3% Fee = 30   │
                              └───────┬────────┘
                                      │
              ┌───────────┬───────────┼───────────┬───────────┐
              │           │           │           │           │
              ▼           ▼           ▼           ▼           ▼
         ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐ ┌────────┐
         │Stakers │ │Creator │ │Treasury│ │  Burn  │ │Referrer│
         │  50%   │ │  25%   │ │  15%   │ │  10%   │ │  5%*   │
         │ 15 IDL │ │7.5 IDL │ │4.5 IDL │ │ 3 IDL  │ │  *if   │
         └────────┘ └────────┘ └────────┘ └────────┘ │ exists │
                                                      └────────┘

         * Referral fee taken from staker share when applicable
```

### 4.5 Deflationary Mechanics

```
BURN SOURCES
════════════

1. Prediction Market Fees    │  10% of all fees burned
2. Lootbox Purchases         │  50% of purchase price burned
3. Guild Creation            │  Fee partially burned
4. Failed Stop Loss          │  Small penalty burned

PROJECTED BURN (5 Years)
════════════════════════

Volume Scenario  │ Monthly Fees │ Monthly Burn │ 5-Year Burn
─────────────────┼──────────────┼──────────────┼─────────────
Conservative     │    $30,000   │    $3,000    │   $180,000
Base Case        │   $300,000   │   $30,000    │ $1,800,000
Bullish          │ $3,000,000   │  $300,000    │$18,000,000
Hyperbull        │$30,000,000   │$3,000,000    │   5.5% supply
```

### 4.6 Staking Tiers & VIP Benefits

```
VIP TIER SYSTEM
═══════════════

Tier         │ Stake Required  │ Fee Discount │ Betting Bonus │ Perks
─────────────┼─────────────────┼──────────────┼───────────────┼──────────────
Bronze VIP   │     100 IDL     │    0.5%      │      5%       │ Early access
Silver VIP   │   1,000 IDL     │    1.0%      │     10%       │ + Exclusive markets
Gold VIP     │  10,000 IDL     │    1.5%      │     25%       │ + Priority support
Platinum VIP │ 100,000 IDL     │    2.0%      │     50%       │ + Whale chat access

STAKING APY PROJECTION
══════════════════════

Total Staked  │ Daily Volume │ Annual Fees │ Staker Share │ APY
──────────────┼──────────────┼─────────────┼──────────────┼─────
$100,000      │  $100,000    │  $1,095,000 │   $547,500   │ 547%
$500,000      │  $100,000    │  $1,095,000 │   $547,500   │ 109%
$1,000,000    │  $500,000    │  $5,475,000 │ $2,737,500   │ 274%
$5,000,000    │$1,000,000    │ $10,950,000 │ $5,475,000   │ 109%

Note: APY = (Staker Share / Total Staked) × 100
```

---

## 5. Core Protocol

### 5.1 Smart Contract Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         IDL PROTOCOL CONTRACTS                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   IDL Protocol (BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt)              │
│   ├── Staking Module                                                        │
│   │   ├── stake() / unstake()                                               │
│   │   ├── lock_for_ve() / unlock_ve()                                       │
│   │   └── claim_rewards()                                                   │
│   │                                                                         │
│   ├── Prediction Market Module                                              │
│   │   ├── create_market()                                                   │
│   │   ├── commit_bet() / reveal_bet()                                       │
│   │   ├── commit_resolution() / reveal_resolution()                         │
│   │   └── claim_winnings() / claim_refund()                                 │
│   │                                                                         │
│   ├── Social Trading Module                                                 │
│   │   ├── create_battle() / accept_battle() / resolve_battle()             │
│   │   ├── create_guild() / join_guild()                                     │
│   │   ├── register_referral() / claim_referral_fees()                       │
│   │   └── create_season() / end_season()                                    │
│   │                                                                         │
│   ├── Advanced Orders Module                                                │
│   │   ├── create_limit_order() / cancel_limit_order()                       │
│   │   ├── set_stop_loss()                                                   │
│   │   └── partial_cashout()                                                 │
│   │                                                                         │
│   └── Gamification Module                                                   │
│       ├── buy_lootbox()                                                     │
│       ├── init_predictor_stats() / update_vip_tier()                        │
│       └── init_dynamic_odds()                                               │
│                                                                             │
│   IDL StableSwap (EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte)            │
│   ├── initialize()                                                          │
│   ├── add_liquidity() / remove_liquidity()                                  │
│   ├── swap_bags_to_pump() / swap_pump_to_bags()                             │
│   └── add_farming_period() / claim_farming_rewards()                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 5.2 State Accounts

```
PROTOCOL STATE
══════════════

ProtocolState {
    authority: Pubkey,           // Admin key (timelocked)
    treasury: Pubkey,            // Fee recipient
    idl_mint: Pubkey,            // IDL token mint
    vault: Pubkey,               // Staking vault
    total_staked: u64,           // Total IDL staked
    total_ve_supply: u64,        // Total veIDL locked
    reward_pool: u64,            // Pending rewards
    total_fees_collected: u64,   // Lifetime fees
    total_burned: u64,           // Lifetime burns
    tvl_cap: u64,                // Current TVL limit
    insurance_fund: u64,         // Emergency fund
    paused: bool,                // Circuit breaker
}

USER ACCOUNTS
═════════════

StakerAccount {
    owner: Pubkey,
    staked_amount: u64,
    reward_per_token_paid: u128,  // Checkpoint for rewards
    pending_rewards: u64,
    last_stake_timestamp: i64,
}

VePosition {
    owner: Pubkey,
    locked_stake: u64,
    initial_ve_amount: u64,
    lock_start: i64,
    lock_end: i64,
    lock_duration: i64,
}

PredictorStats {
    owner: Pubkey,
    total_predictions: u64,
    correct_predictions: u64,
    current_streak: u64,
    best_streak: u64,
    total_winnings: u64,
    auto_compound: bool,
    vip_tier: u8,
}
```

---

## 6. Prediction Markets

### 6.1 Market Lifecycle

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        PREDICTION MARKET LIFECYCLE                          │
└─────────────────────────────────────────────────────────────────────────────┘

   CREATE                   BET                    RESOLVE               CLAIM
      │                      │                        │                    │
      ▼                      ▼                        ▼                    ▼
┌──────────┐           ┌──────────┐            ┌──────────┐          ┌──────────┐
│  Market  │           │  Commit  │            │  Oracle  │          │ Winners  │
│ Created  │──────────▶│  Reveal  │───────────▶│ Commits  │─────────▶│  Claim   │
│          │           │   Bets   │            │ Reveals  │          │ Losers   │
└──────────┘           └──────────┘            └──────────┘          │  Refund  │
      │                      │                        │              │(if cancel)│
      │                      │                        │              └──────────┘
   t = 0              t < deadline            t >= deadline
                                                     │
                                              ┌──────┴──────┐
                                              ▼             ▼
                                        ┌──────────┐  ┌──────────┐
                                        │ 1hr Wait │  │ Dispute  │
                                        │   then   │  │ Window   │
                                        │  Claims  │  │(optional)│
                                        └──────────┘  └──────────┘
```

### 6.2 Commit-Reveal Scheme

To prevent front-running, all bets and resolutions use a commit-reveal scheme:

```
BETTING FLOW
════════════

1. COMMIT PHASE (User)
   ┌────────────────────────────────────────────────────────────────────┐
   │ commitment = SHA256(amount || bet_yes || nonce || salt)           │
   │                                                                    │
   │ commit_bet(commitment)                                             │
   │   → BetCommitment account created                                  │
   │   → No tokens moved yet                                            │
   └────────────────────────────────────────────────────────────────────┘

2. WAIT (5 minutes minimum)

3. REVEAL PHASE (within 1 hour)
   ┌────────────────────────────────────────────────────────────────────┐
   │ reveal_bet(amount, bet_yes, nonce, salt)                          │
   │   → Hash verified against commitment                               │
   │   → Tokens transferred to market pool                              │
   │   → Bet account created                                            │
   └────────────────────────────────────────────────────────────────────┘


RESOLUTION FLOW
═══════════════

1. Oracle commits resolution hash
2. Wait 5 minutes
3. Oracle reveals actual value
4. 1-hour dispute window
5. If no dispute: claims open
6. If disputed: market cancelled, refunds issued
```

### 6.3 Oracle System

```
ORACLE BONDING
══════════════

Before resolving any market, oracles must:

1. Deposit ORACLE_BOND_AMOUNT (10 IDL)
2. Bond is locked until dispute window closes
3. If resolution is disputed:
   - Oracle loses 50% of bond (slashed)
   - Slashed tokens go to insurance fund
   - Market is cancelled
   - All bets refunded

TRUSTED ORACLE SOURCES
══════════════════════

Metric Type    │ Oracle Source        │ Verification
───────────────┼──────────────────────┼─────────────────────
TVL            │ DeFiLlama API        │ Historical snapshots
Volume         │ Protocol APIs        │ On-chain verification
Price          │ Pyth / Switchboard   │ Aggregated feeds
Users          │ On-chain indexing    │ Unique wallet count
Custom         │ Multi-sig committee  │ 3-of-5 approval
```

### 6.4 Betting Mechanics

```
PARIMUTUEL SYSTEM
═════════════════

All bets pooled together. Winners split loser pool proportionally.

Example Resolution:
───────────────────

Market: "Jupiter TVL > $3B?"
Result: YES wins

Before Resolution:
┌─────────────────────────────────────┐
│  YES Pool: 700,000 IDL (70%)        │
│  NO Pool:  300,000 IDL (30%)        │
│  Total:  1,000,000 IDL              │
└─────────────────────────────────────┘

Your Bet: 100,000 IDL on YES

Calculation:
─────────────
Your Share of YES Pool: 100,000 / 700,000 = 14.28%
Your Share of NO Pool:  300,000 × 14.28% = 42,857 IDL

Gross Return: 100,000 + 42,857 = 142,857 IDL
Fee (3%):     142,857 × 0.03 = 4,286 IDL
Net Return:   138,571 IDL
Net Profit:   38,571 IDL (+38.6%)


STAKER BONUS
════════════

Staked IDL grants betting power multiplier:

Bonus = min(Staked IDL / 1,000,000 × 1%, 50%)

Examples:
- 0 IDL staked:      1.00x (no bonus)
- 10M IDL staked:    1.10x (10% bonus)
- 50M+ IDL staked:   1.50x (50% max)
```

---

## 7. Advanced Trading Features

### 7.1 Dynamic Odds

Market odds shift based on betting volume:

```
DYNAMIC ODDS ALGORITHM
══════════════════════

Initial State: 50% YES / 50% NO

After each bet:
1. Calculate new implied probability
2. Apply maximum shift (5% per update)
3. Update DynamicOdds account

Example:
────────
Pool before: 100 YES / 100 NO (50/50)
Bet: 50 on YES
Pool after: 150 YES / 100 NO (60/40)
Odds shift: 50% → 60% for YES (capped at 55% if > 5% shift)
```

### 7.2 Limit Orders

Place bets that only execute at target odds:

```
LIMIT ORDER FLOW
════════════════

create_limit_order(market, amount, bet_yes, target_odds_bps)
│
├── Locks 'amount' in vault
├── Creates LimitOrder account
├── Order expires in 7 days if not filled
│
└── When market odds reach target:
    ├── Keeper calls fill_limit_order()
    ├── Bet placed at target odds
    └── LimitOrder marked as filled

CANCEL: cancel_limit_order() → Full refund
```

### 7.3 Stop Loss

Automatically exit positions when losing:

```
STOP LOSS MECHANISM
═══════════════════

set_stop_loss(bet, threshold_bps)
│
├── Creates StopLoss account
├── Threshold: 10% - 90% loss
│
└── Monitoring (off-chain keeper):
    ├── Check current odds every 5 minutes
    ├── If your side's odds < threshold:
    │   └── Trigger stop loss
    └── Execute partial_cashout at current odds
```

### 7.4 Partial Cashout

Exit early at current market odds:

```
CASHOUT CALCULATION
═══════════════════

partial_cashout(bet, cashout_amount)

Formula:
────────
current_odds = your_side_pool / total_pool
fee = cashout_amount × 3%
payout = (cashout_amount - fee) × current_odds

Example:
────────
Your bet: 100 IDL on YES
Current odds: 60% YES / 40% NO
Cashout: 50 IDL

Calculation:
- Fee: 50 × 0.03 = 1.5 IDL
- After fee: 48.5 IDL
- Payout: 48.5 × 0.60 = 29.1 IDL

You receive 29.1 IDL now instead of waiting for resolution.
Risk: If YES wins, you would have gotten more.
Benefit: If NO wins, you salvaged 29.1 IDL.
```

### 7.5 Conviction Betting

Lock bets for bonus payouts:

```
CONVICTION BONUS TIERS
══════════════════════

Lock Duration  │  Bonus
───────────────┼─────────
1 day          │   0.5%
7 days         │   3.5%
14 days        │   7.0%
30 days (max)  │  15.0%

place_conviction_bet(lock_duration)
│
├── Creates ConvictionBet account
├── Bet cannot be cashed out early
├── If you WIN:
│   └── Payout = normal_winnings × (1 + bonus)
└── If you LOSE:
    └── Same as normal (no additional penalty)
```

---

## 8. Social Layer

### 8.1 Prediction Battles

Head-to-head 1v1 challenges:

```
BATTLE FLOW
═══════════

1. CREATE BATTLE
   ┌────────────────────────────────────────────────────────────────┐
   │ Challenger calls create_battle(market, stake, bet_yes)        │
   │ → Stake escrowed in vault                                      │
   │ → Battle status: PENDING                                       │
   │ → 24 hours for opponent to accept                              │
   └────────────────────────────────────────────────────────────────┘

2. ACCEPT BATTLE
   ┌────────────────────────────────────────────────────────────────┐
   │ Opponent calls accept_battle()                                 │
   │ → Matching stake escrowed                                      │
   │ → Opponent takes opposite side (NO if challenger bet YES)      │
   │ → Battle status: ACTIVE                                        │
   └────────────────────────────────────────────────────────────────┘

3. RESOLUTION
   ┌────────────────────────────────────────────────────────────────┐
   │ After market resolves, anyone calls resolve_battle()          │
   │ → Winner = side that matches market outcome                    │
   │ → Winner gets: (2 × stake) - 2.5% platform fee                │
   │ → Battle status: RESOLVED                                      │
   └────────────────────────────────────────────────────────────────┘

EXAMPLE:
────────
Challenger: 100 IDL on YES
Opponent: 100 IDL on NO
Market resolves: YES

Winner (Challenger) receives:
- Total pot: 200 IDL
- Platform fee: 5 IDL (2.5%)
- Net payout: 195 IDL
- Profit: 95 IDL (+95%)
```

### 8.2 Guild System

Pooled betting with profit sharing:

```
GUILD STRUCTURE
═══════════════

                    ┌─────────────────────┐
                    │    GUILD TREASURY    │
                    │                     │
                    │   Pooled IDL from   │
                    │    all members      │
                    └──────────┬──────────┘
                               │
          ┌────────────────────┼────────────────────┐
          │                    │                    │
          ▼                    ▼                    ▼
    ┌───────────┐        ┌───────────┐        ┌───────────┐
    │  LEADER   │        │  MEMBER   │        │  MEMBER   │
    │           │        │           │        │           │
    │ 10% extra │        │ Pro-rata  │        │ Pro-rata  │
    │  of wins  │        │  share    │        │  share    │
    └───────────┘        └───────────┘        └───────────┘


CREATION & JOINING
══════════════════

create_guild(name)
├── Costs: 10 IDL
├── Creator becomes leader
├── Max 50 members
└── Creates Guild account

join_guild(contribution)
├── Transfers contribution to guild treasury
├── Creates GuildMember account
└── Share of winnings = contribution / total_pooled


PROFIT DISTRIBUTION
═══════════════════

When guild bet wins:
1. 10% of profit to leader (GUILD_LEADER_SHARE)
2. 90% distributed pro-rata to all members
3. Members can claim anytime
```

### 8.3 Referral System

Earn passive income from referrals:

```
REFERRAL MECHANICS
══════════════════

register_referral(referrer)
│
└── Creates ReferralAccount linking user → referrer

Forever after:
├── User pays betting fee
├── 5% of fee goes to referrer (from staker share)
└── Referrer can claim accumulated fees anytime


REFERRAL EARNINGS PROJECTION
════════════════════════════

Scenario: 100 active referred users

User Avg Monthly Volume │ Your Monthly Earnings
────────────────────────┼───────────────────────
$100 × 100 users        │  $15 (0.05 × 3% × $10,000)
$1,000 × 100 users      │  $150
$10,000 × 100 users     │  $1,500


VIRAL LOOP
══════════

┌──────────────────────────────────────────────────────────────────┐
│                                                                  │
│    Share Link                                                    │
│        │                                                         │
│        ▼                                                         │
│    Friend Signs Up ─────────────────┐                           │
│        │                            │                           │
│        ▼                            ▼                           │
│    Friend Bets ──────────▶ You Earn 5% of Fees                  │
│        │                            │                           │
│        ▼                            │                           │
│    Friend Refers Others             │                           │
│        │                            │                           │
│        └───────────────────────────►│                           │
│                                     ▼                           │
│                           Network Effect Grows                   │
│                                                                  │
└──────────────────────────────────────────────────────────────────┘
```

### 8.4 Leaderboards & Seasons

Compete for accuracy rankings:

```
PREDICTOR STATS
═══════════════

PredictorStats tracks:
├── total_predictions
├── correct_predictions
├── current_streak
├── best_streak
├── total_winnings
└── vip_tier

Accuracy = correct_predictions / total_predictions × 100

STREAK BONUS
════════════
+1% per consecutive win (max 20%)

Example: 5-win streak → +5% bonus on next win


SEASONS
═══════

create_season(season_number, prize_pool)
│
├── Duration: 30 days
├── Prize pool funded by admin
└── At season end:
    ├── Top 10 by accuracy share prizes
    ├── Leaderboard entries minted
    └── Winners claim via claim_season_prize()

PRIZE DISTRIBUTION (Example 10,000 IDL pool)
═════════════════════════════════════════════

Rank  │  Share  │  Prize
──────┼─────────┼─────────
1st   │   25%   │  2,500 IDL
2nd   │   15%   │  1,500 IDL
3rd   │   10%   │  1,000 IDL
4-5   │    8%   │    800 IDL each
6-10  │    5%   │    500 IDL each
```

### 8.5 Loot Boxes

Gamified rewards:

```
LOOTBOX TIERS
═════════════

Tier       │  Price   │  Burn   │  Rewards
───────────┼──────────┼─────────┼─────────────────────────────────
Common     │   1 IDL  │  0.5 IDL│  1% fee discount, 2% stake boost
Rare       │  10 IDL  │  5 IDL  │  3-5% discounts, 20 IDL jackpot
Legendary  │ 100 IDL  │  50 IDL │  10% discounts, VIP upgrade, 500 IDL

REWARD PROBABILITIES (Legendary Box)
════════════════════════════════════

Roll  │  Reward                │  Probability
──────┼────────────────────────┼──────────────
0-29  │  10% fee discount 90d  │     30%
30-59 │  10% stake boost 90d   │     30%
60-89 │  VIP tier upgrade      │     30%
90-99 │  500 IDL JACKPOT!      │     10%
```

---

## 9. AI Integration

### 9.1 AI Market Maker

Claude-powered liquidity and odds:

```
AI MARKET MAKER ARCHITECTURE
════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│                           AI MARKET MAKER                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐                  │
│   │  External   │────▶│   Claude    │────▶│   Action    │                  │
│   │    Data     │     │   Analysis  │     │   Engine    │                  │
│   └─────────────┘     └─────────────┘     └─────────────┘                  │
│         │                   │                   │                          │
│         │                   │                   │                          │
│   ┌─────┴─────┐       ┌─────┴─────┐       ┌─────┴─────┐                    │
│   │           │       │           │       │           │                    │
│   │ DeFiLlama │       │ Analyze   │       │ Provide   │                    │
│   │ Pyth      │       │ Sentiment │       │ Liquidity │                    │
│   │ Protocols │       │ Set Odds  │       │ Rebalance │                    │
│   │ Twitter   │       │ Suggest   │       │ Create    │                    │
│   │           │       │ Markets   │       │ Markets   │                    │
│   └───────────┘       └───────────┘       └───────────┘                    │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


FUNCTIONS
═════════

1. analyzeMarket(description, data)
   → Returns: probability, confidence, reasoning

2. calculateOdds(market, pools)
   → Returns: recommended odds with spread

3. suggestNewMarkets()
   → Returns: trending market ideas

4. provideLiquidity(market, recommendation)
   → Places bets on both sides to seed liquidity

5. rebalancePosition(market)
   → Adjusts positions when too skewed
```

### 9.2 Telegram Bot

```
TELEGRAM COMMANDS
═════════════════

/start          - Welcome & wallet setup
/markets        - Browse active markets
/bet <id> <amt> - Place a prediction bet
/portfolio      - View your positions
/leaderboard    - Top predictors
/battle @user   - Challenge to 1v1
/guild          - Guild management
/lootbox <tier> - Buy mystery box
/connect        - Link Solana wallet

NOTIFICATIONS
═════════════
- Market resolution alerts
- Win notifications
- Battle challenges
- Streak milestones
```

### 9.3 Twitter Bot

```
AUTO-POSTING
════════════

Triggers:
├── User wins > 1000 IDL
├── Market resolves
├── Leaderboard updates
├── Battle completions
└── New season starts

Post Format:
────────────
🎯 Prediction confirmed!

[wallet] just won [amount] $IDL (+X%)
predicting [YES/NO] on "[market]"

Bet on Solana DeFi metrics at idlhub.io
Use code [referral] for bonus rewards

#Solana #DeFi #PredictionMarkets
```

### 9.4 Embeddable Widget

```
WIDGET INTEGRATION
══════════════════

<script src="https://idlhub.io/widget.js"
        data-market="JUP-TVL-3B"
        data-ref="your_code">
</script>

Features:
├── Real-time odds display
├── One-click bet redirect
├── Customizable styling
├── Referral tracking
└── Mobile responsive
```

---

## 10. StableSwap AMM

### 10.1 Purpose

Unify BAGS-IDL and PUMP-IDL liquidity with near-zero slippage swaps.

```
TOKEN EQUIVALENCE
═════════════════

╔════════════════════════════════════════════════════════════════╗
║                                                                ║
║        1 BAGS-IDL  ≡  1 PUMP-IDL  (via StableSwap)            ║
║                                                                ║
╚════════════════════════════════════════════════════════════════╝

Swap Fee: 0.1337% (1337 milli-bps)
LP Rewards: 50% of swap fees
```

### 10.2 Curve StableSwap Math

```
INVARIANT
═════════

A·n^n·Σx + D = A·D·n^n + D^(n+1) / (n^n·Πx)

Where:
- A = Amplification coefficient (1000)
- n = Number of tokens (2)
- x = Token balances [BAGS, PUMP]
- D = Invariant (total value)


SLIPPAGE COMPARISON
═══════════════════

Swap: 1M BAGS → PUMP (100M balanced pool)

Method          │  Output         │  Slippage
────────────────┼─────────────────┼───────────
Constant Product│  990,099 PUMP   │  0.99%
StableSwap A=100│  999,800 PUMP   │  0.02%
StableSwap A=1000│ 999,960 PUMP   │  0.004%

StableSwap provides 250x better execution!
```

### 10.3 LP Token Economics

```
ADD LIQUIDITY
═════════════

Deposit: 1000 BAGS + 1000 PUMP
Receive: ~2000 IDL-LP tokens

LP REWARDS
══════════

50% of swap fees auto-compound to LPs

PROJECTED APY
═════════════

Daily Volume   │  LP Fees/Day  │  APY (on $1M TVL)
───────────────┼───────────────┼──────────────────
$100,000       │      $67      │     2.4%
$1,000,000     │     $667      │    24.4%
$10,000,000    │   $6,670      │   243.5%
```

### 10.4 Farming Rewards

```
FARMING PERIODS
═══════════════

add_farming_period(reward_amount, duration)
│
├── Creates FarmingPeriod
├── Rewards distributed linearly
├── Max 5 active periods
└── Min 1 day duration

REWARD CALCULATION
══════════════════

user_reward = (user_lp / total_lp) × period_rewards × time_staked
```

---

## 11. Security

### 11.1 Smart Contract Security

```
SECURITY MEASURES
═════════════════

✓ Commit-reveal scheme (prevents front-running)
✓ Oracle bonding & slashing (accountability)
✓ 48-hour authority timelock
✓ Pausable protocol (circuit breaker)
✓ TVL caps (gradual rollout)
✓ Insurance fund
✓ Minimum bet amounts (dust prevention)
✓ Checked arithmetic (overflow protection)

AUDITS
══════

Internal Red Team:     Complete
External Audit:        Pending
Bug Bounty:            Planned
```

### 11.2 Protocol Constants

```
TIMING SECURITY
═══════════════

MIN_RESOLUTION_DELAY     = 24 hours    // Prevents same-day manipulation
BETTING_CLOSE_WINDOW     = 1 hour      // Stops last-second arbitrage
BET_COMMIT_WINDOW        = 5 minutes   // Commit-reveal delay
BET_REVEAL_WINDOW        = 1 hour      // Max reveal time
ORACLE_DISPUTE_WINDOW    = 1 hour      // Time to challenge resolution
AUTHORITY_TIMELOCK       = 48 hours    // Admin action delay
MIN_STAKE_DURATION       = 24 hours    // Anti-flash-loan

ECONOMIC SECURITY
═════════════════

MIN_BET_AMOUNT           = 0.001 IDL   // Prevents dust attacks
MAX_BET_AMOUNT           = 1M IDL      // Limits whale manipulation
MAX_BET_IMBALANCE_RATIO  = 100x        // Prevents extreme skew
ORACLE_BOND_AMOUNT       = 10 IDL      // Oracle accountability
ORACLE_SLASH_PERCENT     = 50%         // Penalty for bad resolution
```

### 11.3 Risk Factors

| Risk | Severity | Mitigation |
|------|----------|------------|
| Oracle manipulation | High | Bonding, slashing, dispute window |
| Front-running | High | Commit-reveal scheme |
| Flash loan attacks | Medium | 24h minimum stake duration |
| Contract bugs | High | Audits, pausability, insurance |
| Governance attacks | Medium | Timelock, veIDL distribution |
| Low liquidity | Low | AI market maker, incentives |

---

## 12. Governance

### 12.1 veIDL Voting

```
VOTING POWER
════════════

veIDL = Staked IDL × (Lock Duration / 4 years)

Lock Duration  │  veIDL per IDL  │  Voting Power
───────────────┼─────────────────┼───────────────
4 years        │     1.00        │     100%
2 years        │     0.50        │      50%
1 year         │     0.25        │      25%
1 week (min)   │     0.0048      │     0.48%


LINEAR DECAY
════════════

veIDL decreases linearly as lock expires:

Current veIDL = Initial veIDL × (Time Remaining / Lock Duration)

Year 0: 1000 veIDL
Year 1:  750 veIDL (25% decay)
Year 2:  500 veIDL (50% decay)
Year 3:  250 veIDL (75% decay)
Year 4:    0 veIDL (expired)
```

### 12.2 Governance Process

```
PROPOSAL LIFECYCLE
══════════════════

┌──────────────┐     ┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│  DISCUSSION  │────▶│   VOTING     │────▶│   TIMELOCK   │────▶│  EXECUTION   │
│   (3 days)   │     │   (5 days)   │     │   (2 days)   │     │              │
└──────────────┘     └──────────────┘     └──────────────┘     └──────────────┘
                            │
                     ┌──────┴──────┐
                     │             │
                     ▼             ▼
              Quorum Met?     Quorum Failed
                  │               │
                  ▼               ▼
             Majority?        Rejected
              YES/NO
                │
        ┌───────┴───────┐
        ▼               ▼
     Passed          Rejected


QUORUM: 20% of veIDL supply
MAJORITY: 50%+1 of votes cast
```

### 12.3 Governable Parameters

| Parameter | Current | Range | Description |
|-----------|---------|-------|-------------|
| BET_FEE_BPS | 300 | 100-500 | Fee on winning bets |
| STAKER_FEE_SHARE | 50% | 30-70% | Staker portion of fees |
| BURN_FEE_SHARE | 10% | 5-20% | Burn portion of fees |
| MIN_BET_AMOUNT | 0.001 | 0.001-1 | Minimum bet size |
| TVL_CAP | Variable | - | Protocol capacity |

---

## 13. Roadmap

### Phase 1: Foundation (Complete)
- [x] IDLHub registry (100+ IDLs)
- [x] MCP API for AI agents
- [x] Token launch (BAGS + PUMP)
- [x] Core smart contracts
- [x] Commit-reveal betting

### Phase 2: Social (Current)
- [x] Prediction battles
- [x] Guild system
- [x] Referral program
- [x] Leaderboards
- [x] Loot boxes
- [ ] Deploy to mainnet

### Phase 3: Advanced Trading
- [x] Dynamic odds
- [x] Limit orders
- [x] Stop loss
- [x] Partial cashout
- [ ] UI implementation

### Phase 4: Bots & Integrations
- [x] Telegram bot
- [x] Twitter bot
- [x] Embed widget
- [x] AI market maker
- [ ] Jupiter integration
- [ ] Discord bot

### Phase 5: Governance & Expansion
- [ ] Snapshot integration
- [ ] On-chain voting
- [ ] Cross-chain IDLs (EVM)
- [ ] Mobile app
- [ ] Institutional API

---

## 14. Technical Architecture

### 14.1 System Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          IDL PROTOCOL ARCHITECTURE                          │
└─────────────────────────────────────────────────────────────────────────────┘

                                    FRONTEND
                    ┌──────────────────────────────────────┐
                    │                                      │
                    │    Web App (idlhub.io)               │
                    │    ├── Market Browser                │
                    │    ├── Betting Interface             │
                    │    ├── Portfolio Dashboard           │
                    │    └── Governance UI                 │
                    │                                      │
                    │    Embed Widget                      │
                    │    └── Drop-in for partner sites     │
                    │                                      │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                                    BOTS
                    ┌──────────────────────────────────────┐
                    │                                      │
                    │    Telegram Bot (@IDLProtocolBot)    │
                    │    Twitter Bot (@IDLProtocol)        │
                    │    AI Market Maker                   │
                    │                                      │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                                   BACKEND
                    ┌──────────────────────────────────────┐
                    │                                      │
                    │    API Server                        │
                    │    ├── /api/idl/* (IDL registry)     │
                    │    ├── /api/mcp (JSON-RPC)           │
                    │    ├── /api/markets (GraphQL)        │
                    │    └── /api/user (REST)              │
                    │                                      │
                    │    Indexer                           │
                    │    └── Real-time on-chain parsing    │
                    │                                      │
                    │    Keeper                            │
                    │    ├── Fill limit orders             │
                    │    ├── Trigger stop losses           │
                    │    └── Execute AI MM actions         │
                    │                                      │
                    └──────────────────┬───────────────────┘
                                       │
                                       ▼
                              SOLANA BLOCKCHAIN
                    ┌──────────────────────────────────────┐
                    │                                      │
                    │    IDL Protocol Program              │
                    │    └── BSn7neic...Lq7dt (devnet)     │
                    │                                      │
                    │    IDL StableSwap Program            │
                    │    └── EFsgmpbK...oTte (devnet)      │
                    │                                      │
                    │    Token Mints                       │
                    │    ├── PUMP-IDL: 4GihJrYJ...pump     │
                    │    └── BAGS-IDL: 8zdhHxth...BAG      │
                    │                                      │
                    └──────────────────────────────────────┘
```

### 14.2 Data Flow

```
BET PLACEMENT FLOW
══════════════════

User                    Frontend                  Backend                 Solana
  │                        │                         │                      │
  │  Select market         │                         │                      │
  ├───────────────────────▶│                         │                      │
  │                        │  Fetch market data      │                      │
  │                        ├────────────────────────▶│                      │
  │                        │                         │  getProgramAccounts  │
  │                        │                         ├─────────────────────▶│
  │                        │                         │◀─────────────────────┤
  │                        │◀────────────────────────┤                      │
  │                        │                         │                      │
  │  Enter bet amount      │                         │                      │
  ├───────────────────────▶│                         │                      │
  │                        │  Generate commitment    │                      │
  │                        │  hash locally           │                      │
  │                        │                         │                      │
  │  Sign transaction      │                         │                      │
  ├───────────────────────▶│                         │                      │
  │                        │                         │  commit_bet()        │
  │                        ├─────────────────────────┼─────────────────────▶│
  │                        │                         │◀─────────────────────┤
  │                        │◀────────────────────────┤                      │
  │                        │                         │                      │
  │  (Wait 5 minutes)      │                         │                      │
  │                        │                         │                      │
  │  Sign reveal tx        │                         │                      │
  ├───────────────────────▶│                         │                      │
  │                        │                         │  reveal_bet()        │
  │                        ├─────────────────────────┼─────────────────────▶│
  │                        │                         │                      │
  │  Bet confirmed!        │                         │                      │
  │◀───────────────────────┤                         │                      │
```

---

## 15. On-Chain Metrics Oracle: Technical Deep Dive

### 15.1 The Core Challenge

IDL Protocol resolves prediction markets using only pure Solana RPC—no third-party APIs, no centralized data providers, no DeFiLlama, no Pyth. This constraint creates significant technical challenges but ensures:

1. **Decentralization** - No single point of failure
2. **Censorship Resistance** - Data cannot be blocked or manipulated
3. **Transparency** - All data derivation is verifiable on-chain
4. **Cost Efficiency** - No API subscription fees

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                         PURE RPC ORACLE CONSTRAINTS                           ║
╠═══════════════════════════════════════════════════════════════════════════════╣
║                                                                               ║
║   AVAILABLE METHODS:                                                          ║
║   ├── getAccountInfo(pubkey)                                                  ║
║   ├── getProgramAccounts(programId, filters)                                  ║
║   ├── getMultipleAccounts(pubkeys[])                                          ║
║   ├── getTokenAccountsByOwner(owner, filter)                                  ║
║   ├── getTokenLargestAccounts(mint)                                           ║
║   ├── getTokenSupply(mint)                                                    ║
║   ├── getSignaturesForAddress(address, options)                               ║
║   ├── getTransaction(signature)                                               ║
║   └── getSlot() / getBlockTime(slot)                                          ║
║                                                                               ║
║   RATE LIMITS (Public RPC):                                                   ║
║   ├── 100 requests/10 seconds                                                 ║
║   ├── 40 requests/10 seconds (getProgramAccounts)                             ║
║   ├── Maximum response size: 10MB                                             ║
║   └── Maximum dataSlice: 128 accounts per call                                ║
║                                                                               ║
║   MISSING FEATURES:                                                           ║
║   ├── No historical state queries                                             ║
║   ├── No aggregate functions                                                  ║
║   ├── No cross-program joins                                                  ║
║   └── No time-travel queries                                                  ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

### 15.2 Metric Type Definitions

#### Definition 1: Total Value Locked (TVL)

For a protocol P with token vaults V₁, V₂, ..., Vₙ:

```
TVL(P) = Σᵢ₌₁ⁿ balance(Vᵢ) × price(token(Vᵢ))

Where:
  - balance(V) = token amount held in vault V
  - price(t) = spot price of token t in USD
  - token(V) = the token type stored in vault V
```

**Challenge:** Solana RPC cannot query historical balances. We must snapshot at resolution time.

#### Definition 2: 24-Hour Volume

For a DEX/AMM program P over time window [t₀, t₁]:

```
Volume₂₄ₕ(P) = Σ value(swap_i) for all swaps where t₀ ≤ timestamp(swap_i) ≤ t₁

Where:
  - t₁ - t₀ = 86400 seconds (24 hours)
  - value(swap) = input_amount × price(input_token)
```

**Challenge:** Must reconstruct from transaction history. Limited to 1000 signatures per query.

#### Definition 3: Unique Active Users (UAU)

```
UAU(P, window) = |{wallet : ∃tx ∈ transactions(P, window) where signer(tx) = wallet}|

Where:
  - |S| = cardinality of set S
  - window = time range for counting
```

**Challenge:** Requires iterating all transactions and deduplicating signers.

### 15.3 TVL Calculation Algorithm

```
ALGORITHM: ComputeTVL_PureRPC(protocol)
════════════════════════════════════════

INPUT:
  - protocol: Protocol configuration with program_id, vault_seeds[]

OUTPUT:
  - tvl: Total value locked in USD

COMPLEXITY: O(n × m) where n = number of vaults, m = tokens per vault

PSEUDOCODE:
┌──────────────────────────────────────────────────────────────────────────────┐
│                                                                              │
│  function ComputeTVL(protocol):                                              │
│      tvl = 0                                                                 │
│                                                                              │
│      // Step 1: Derive all vault PDAs                                        │
│      vaults = []                                                             │
│      for seed in protocol.vault_seeds:                                       │
│          pda = derivePDA(protocol.program_id, seed)                          │
│          vaults.append(pda)                                                  │
│                                                                              │
│      // Step 2: Batch fetch token accounts (max 100 per call)                │
│      for batch in chunks(vaults, 100):                                       │
│          accounts = getMultipleAccounts(batch)                               │
│                                                                              │
│          for account in accounts:                                            │
│              if account.owner == TOKEN_PROGRAM_ID:                           │
│                  // Parse SPL Token account data                             │
│                  mint = account.data[0:32]                                   │
│                  balance = account.data[64:72] as u64                        │
│                                                                              │
│                  // Get token price from on-chain oracle                     │
│                  price = getOraclePrice(mint)                                │
│                                                                              │
│                  tvl += balance × price / 10^decimals(mint)                  │
│                                                                              │
│      return tvl                                                              │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘

RPC CALLS REQUIRED:
  - getProgramAccounts: 1 (to discover vaults if not hardcoded)
  - getMultipleAccounts: ⌈n/100⌉ (for n vaults)
  - getAccountInfo: 1 per unique oracle price feed

TOTAL: O(n/100) + O(unique_tokens)
```

### 15.4 Volume Calculation: The Signature Pagination Problem

```
PROBLEM: 24h VOLUME COMPUTATION
═══════════════════════════════

Solana RPC returns maximum 1000 signatures per getSignaturesForAddress call.
High-volume DEX may have 10,000+ transactions per hour.

MATHEMATICAL BOUND:
  - Target window: 86,400 seconds
  - Signature limit: 1,000 per query
  - If TPS_protocol > 1000/86400 ≈ 0.0116 TPS, multiple queries needed

For Jupiter (typical 50-100 TPS on swaps):
  - Estimated 24h transactions: 50 × 86400 = 4,320,000 tx
  - Required queries: 4,320,000 / 1000 = 4,320 queries
  - At 10 req/s rate limit: 432 seconds (7.2 minutes)
  - Data transfer: ~500 bytes × 4.3M = 2.15 GB
```

**Solution: Logarithmic Sampling with Error Bounds**

```
ALGORITHM: EstimateVolume_Sampling(program_id, window)
══════════════════════════════════════════════════════

Instead of fetching all transactions, we use statistical sampling:

MATHEMATICAL FOUNDATION:
────────────────────────

Let X = {x₁, x₂, ..., xₙ} be all swap values in the window.
True Volume: V = Σᵢ₌₁ⁿ xᵢ

We sample k transactions uniformly at random.
Sample: S = {s₁, s₂, ..., sₖ}

Estimated Volume: V̂ = (n/k) × Σⱼ₌₁ᵏ sⱼ

CONFIDENCE INTERVAL (CLT):
──────────────────────────

For 95% confidence:
V̂ ± 1.96 × σ_s × √(n/k)

Where σ_s = standard deviation of sample values

SAMPLING STRATEGY:
──────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function EstimateVolume(program_id, window_start, window_end):             │
│                                                                             │
│      // Phase 1: Get transaction count estimate                             │
│      first_sigs = getSignaturesForAddress(                                  │
│          program_id,                                                        │
│          limit=1000,                                                        │
│          until=window_start                                                 │
│      )                                                                      │
│      last_sigs = getSignaturesForAddress(                                   │
│          program_id,                                                        │
│          limit=1000,                                                        │
│          before=window_end                                                  │
│      )                                                                      │
│                                                                             │
│      // Estimate total tx count by slot density                             │
│      slots_in_window = (window_end - window_start) / 0.4  // ~400ms slots   │
│      tx_density = len(first_sigs) / slots_covered(first_sigs)               │
│      estimated_total_tx = tx_density × slots_in_window                      │
│                                                                             │
│      // Phase 2: Stratified sampling across time buckets                    │
│      num_buckets = 24  // One per hour                                      │
│      samples_per_bucket = 100                                               │
│      sample_sum = 0                                                         │
│      sample_count = 0                                                       │
│                                                                             │
│      for bucket in 0..num_buckets:                                          │
│          bucket_start = window_start + bucket × 3600                        │
│          bucket_end = bucket_start + 3600                                   │
│                                                                             │
│          sigs = getSignaturesForAddress(                                    │
│              program_id,                                                    │
│              limit=samples_per_bucket,                                      │
│              before=bucket_end,                                             │
│              until=bucket_start                                             │
│          )                                                                  │
│                                                                             │
│          for sig in sigs:                                                   │
│              tx = getTransaction(sig)                                       │
│              swap_value = parseSwapValue(tx, program_id)                    │
│              if swap_value > 0:                                             │
│                  sample_sum += swap_value                                   │
│                  sample_count += 1                                          │
│                                                                             │
│      // Phase 3: Extrapolate                                                │
│      avg_swap_value = sample_sum / sample_count                             │
│      estimated_volume = avg_swap_value × estimated_total_tx                 │
│                                                                             │
│      return estimated_volume                                                │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

RPC CALLS:
  - getSignaturesForAddress: 26 calls (1 count + 1 recent + 24 buckets)
  - getTransaction: 2,400 calls (100 samples × 24 buckets)

TOTAL: 2,426 calls over ~4 minutes at rate limit

ERROR ANALYSIS:
───────────────
Assuming swap values follow log-normal distribution (typical for DEX):
  - Sample size: 2,400
  - Expected relative error: σ / (μ × √n) ≈ 2-5%
  - 95% confidence interval: ±10% of true volume
```

### 15.5 Price Discovery: On-Chain Oracle Aggregation

Without Pyth/Switchboard, we derive prices from on-chain liquidity pools:

```
ALGORITHM: GetOnChainPrice(mint)
════════════════════════════════

APPROACH: Use TWAP from Raydium/Orca concentrated liquidity pools

MATHEMATICAL MODEL:
───────────────────

For a token pair (A, B) in pool P with reserves (rₐ, rᵦ):

Spot Price: p_spot = rᵦ / rₐ

For concentrated liquidity (CLMM):
  Price within tick range [i, j]: p = 1.0001^((i+j)/2)

Time-Weighted Average Price (TWAP):
  P_twap = (1/T) × ∫₀ᵀ p(t) dt

Discrete approximation over n observations:
  P_twap ≈ (1/n) × Σᵢ₌₁ⁿ pᵢ

IMPLEMENTATION:
───────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function GetOnChainPrice(mint):                                            │
│                                                                             │
│      // Step 1: Find all pools containing this token                        │
│      pools = []                                                             │
│                                                                             │
│      // Raydium CLMM pools                                                  │
│      raydium_pools = getProgramAccounts(                                    │
│          RAYDIUM_CLMM_PROGRAM,                                              │
│          filters=[                                                          │
│              {memcmp: {offset: 8, bytes: mint.toBase58()}}  // tokenMint0   │
│          ]                                                                  │
│      )                                                                      │
│      pools.extend(raydium_pools)                                            │
│                                                                             │
│      // Orca Whirlpool                                                      │
│      orca_pools = getProgramAccounts(                                       │
│          ORCA_WHIRLPOOL_PROGRAM,                                            │
│          filters=[                                                          │
│              {memcmp: {offset: 101, bytes: mint.toBase58()}}                │
│          ]                                                                  │
│      )                                                                      │
│      pools.extend(orca_pools)                                               │
│                                                                             │
│      // Step 2: Calculate liquidity-weighted price                          │
│      total_liquidity = 0                                                    │
│      weighted_price_sum = 0                                                 │
│                                                                             │
│      for pool in pools:                                                     │
│          price = extractPrice(pool)                                         │
│          liquidity = extractLiquidity(pool)                                 │
│                                                                             │
│          // Weight by sqrt(liquidity) to reduce manipulation                │
│          weight = sqrt(liquidity)                                           │
│          weighted_price_sum += price × weight                               │
│          total_liquidity += weight                                          │
│                                                                             │
│      return weighted_price_sum / total_liquidity                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

MANIPULATION RESISTANCE:
────────────────────────

Cost to move price by Δp in pool with liquidity L:

  Cost = L × |ln(p₁) - ln(p₀)|   (for concentrated liquidity)

For $1M liquidity pool:
  - 1% price move: ~$10,000 attack cost
  - 5% price move: ~$50,000 attack cost
  - Cross-pool arbitrage limits duration of manipulation

MULTI-HOP PRICING:
──────────────────

For tokens without direct USDC/SOL pools:

  Token A → Token B → USDC

  price(A, USDC) = price(A, B) × price(B, USDC)

Error propagation:
  σ_total² = σ_AB² + σ_BC²  (for independent price errors)
```

### 15.6 User Count: Signature Deduplication

```
ALGORITHM: CountUniqueUsers(program_id, window)
═══════════════════════════════════════════════

CHALLENGE:
  - Must iterate all transactions in window
  - Deduplicate signer addresses
  - Memory constraint: cannot hold millions of addresses

SOLUTION: HyperLogLog Probabilistic Counter

MATHEMATICAL FOUNDATION:
────────────────────────

HyperLogLog estimates cardinality |S| of set S using:

  E = α_m × m² × (Σⱼ₌₁ᵐ 2^(-M[j]))⁻¹

Where:
  - m = 2^b (number of registers, typically b=14 → m=16384)
  - M[j] = maximum leading zeros in hash values mapping to register j
  - α_m = bias correction constant ≈ 0.7213/(1 + 1.079/m)

STANDARD ERROR: σ = 1.04/√m ≈ 0.81% for m=16384

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function CountUniqueUsers(program_id, window):                             │
│                                                                             │
│      hll = HyperLogLog(precision=14)  // 16KB memory                        │
│                                                                             │
│      cursor = null                                                          │
│      total_processed = 0                                                    │
│                                                                             │
│      while true:                                                            │
│          sigs = getSignaturesForAddress(                                    │
│              program_id,                                                    │
│              limit=1000,                                                    │
│              before=cursor,                                                 │
│              until=window.start                                             │
│          )                                                                  │
│                                                                             │
│          if len(sigs) == 0:                                                 │
│              break                                                          │
│                                                                             │
│          // Batch fetch transactions                                        │
│          for batch in chunks(sigs, 100):                                    │
│              txs = getMultipleTransactions(batch)                           │
│              for tx in txs:                                                 │
│                  for signer in tx.transaction.signatures:                   │
│                      hll.add(hash(signer.pubkey))                           │
│                                                                             │
│          cursor = sigs[-1].signature                                        │
│          total_processed += len(sigs)                                       │
│                                                                             │
│          // Check if we've exited the window                                │
│          if sigs[-1].blockTime < window.start:                              │
│              break                                                          │
│                                                                             │
│      return hll.count()                                                     │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

SPACE COMPLEXITY: O(m) = O(16KB) regardless of user count
TIME COMPLEXITY: O(n) where n = total transactions
RPC CALLS: O(n/1000) + O(n/100) for signatures and transactions
```

### 15.7 Snapshot Consistency: The Finality Problem

```
PROBLEM: STATE CONSISTENCY AT RESOLUTION TIME
═════════════════════════════════════════════

Solana slots are produced every ~400ms. During resolution:
  - Query A at slot S₁ → Balance = 100
  - Query B at slot S₂ → Balance = 95 (if S₂ > S₁)

Without historical queries, we cannot guarantee atomic reads.

MATHEMATICAL MODEL:
───────────────────

Let t_resolution be the market resolution timestamp.
Let S(t) = slot number at time t.

Oracle queries occur over interval [t₀, t₁] where t₁ - t₀ = Δt_query.

State drift during query: |TVL(S(t₁)) - TVL(S(t₀))| ≤ max_change × Δt_query

For typical DeFi protocol:
  - max_change ≈ 0.1% per second (during high volatility)
  - Δt_query ≈ 60 seconds
  - Maximum drift: 6%

SOLUTION: MULTI-SLOT CONSENSUS
──────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function ResolveWithConsensus(metric_fn, target_time):                     │
│                                                                             │
│      measurements = []                                                      │
│      target_slot = getSlotForTimestamp(target_time)                         │
│                                                                             │
│      // Take 5 measurements over 10-minute window                           │
│      for i in 0..5:                                                         │
│          wait(120_000)  // 2 minutes between measurements                   │
│          value = metric_fn()                                                │
│          slot = getSlot()                                                   │
│          measurements.append({value, slot})                                 │
│                                                                             │
│      // Filter outliers (>2σ from median)                                   │
│      median = percentile(measurements.values, 50)                           │
│      σ = stddev(measurements.values)                                        │
│      filtered = [m for m in measurements if |m.value - median| < 2σ]        │
│                                                                             │
│      // Take median of filtered values                                      │
│      result = percentile(filtered.values, 50)                               │
│                                                                             │
│      // Confidence score based on measurement spread                        │
│      spread = (max(filtered) - min(filtered)) / median                      │
│      confidence = 1 - min(spread / 0.1, 1)  // 100% if spread < 10%         │
│                                                                             │
│      return {result, confidence}                                            │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

DISPUTE THRESHOLD:
──────────────────

If confidence < 80%, market resolution is delayed 1 hour for re-measurement.
If 3 consecutive low-confidence readings, market is cancelled (refunds issued).
```

### 15.8 Protocol-Specific Account Layouts

To compute metrics, we must parse each protocol's account structures:

```
JUPITER AGGREGATOR (JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB)
═══════════════════════════════════════════════════════════════

Swap Account Layout (for volume tracking):
┌──────────────────────────────────────────────────────────────────────────────┐
│ Offset │ Size │ Field             │ Type        │ Description               │
├────────┼──────┼───────────────────┼─────────────┼───────────────────────────┤
│   0    │   8  │ discriminator     │ [u8; 8]     │ Anchor discriminator      │
│   8    │  32  │ user              │ Pubkey      │ User wallet               │
│  40    │  32  │ input_mint        │ Pubkey      │ Token sold                │
│  72    │  32  │ output_mint       │ Pubkey      │ Token bought              │
│ 104    │   8  │ in_amount         │ u64         │ Amount sold (raw)         │
│ 112    │   8  │ out_amount        │ u64         │ Amount received (raw)     │
│ 120    │   8  │ timestamp         │ i64         │ Unix timestamp            │
└──────────────────────────────────────────────────────────────────────────────┘

Volume Calculation:
  volume_usd = in_amount × price(input_mint) / 10^decimals(input_mint)


MARINADE FINANCE (MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD)
═══════════════════════════════════════════════════════════════

State Account Layout (for TVL):
┌──────────────────────────────────────────────────────────────────────────────┐
│ Offset │ Size │ Field                    │ Type        │ Description        │
├────────┼──────┼──────────────────────────┼─────────────┼────────────────────┤
│   0    │   8  │ discriminator            │ [u8; 8]     │ Anchor disc        │
│   8    │   4  │ version                  │ u32         │ State version      │
│  12    │  32  │ admin_authority          │ Pubkey      │ Admin              │
│  ...   │ ...  │ ...                      │ ...         │ ...                │
│ 272    │   8  │ total_lamports_under_ctl │ u64         │ Total SOL staked   │
│ 280    │   8  │ total_cooling_down       │ u64         │ SOL unstaking      │
└──────────────────────────────────────────────────────────────────────────────┘

TVL Calculation:
  tvl_sol = (total_lamports_under_ctl + total_cooling_down) / 1e9
  tvl_usd = tvl_sol × price(SOL)


DRIFT PROTOCOL (dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH)
══════════════════════════════════════════════════════════════

User Stats Account (for unique users):
┌──────────────────────────────────────────────────────────────────────────────┐
│ Offset │ Size │ Field                    │ Type        │ Description        │
├────────┼──────┼──────────────────────────┼─────────────┼────────────────────┤
│   0    │   8  │ discriminator            │ [u8; 8]     │ 0x55c3f2ea...      │
│   8    │  32  │ authority                │ Pubkey      │ User wallet        │
│  40    │   8  │ total_trades             │ u64         │ Lifetime trades    │
│  48    │   8  │ total_volume_30d         │ u64         │ 30d volume (USD)   │
│  56    │   8  │ last_trade_ts            │ i64         │ Last activity      │
└──────────────────────────────────────────────────────────────────────────────┘

User Count:
  active_users = count(UserStats where last_trade_ts > now - 30 days)
```

### 15.9 Rate Limit Optimization

```
PROBLEM: RPC RATE LIMITS
════════════════════════

Public Solana RPC endpoints enforce:
  - 100 requests per 10 seconds (general)
  - 40 requests per 10 seconds (getProgramAccounts)
  - Maximum request body: 50KB
  - Maximum response: 10MB

For high-frequency metrics (volume, TPS), this creates bottlenecks.

OPTIMIZATION STRATEGIES:

1. BATCH REQUESTS
─────────────────

Instead of:
  for account in accounts:
      getAccountInfo(account)  // 1000 calls

Use:
  for batch in chunks(accounts, 100):
      getMultipleAccounts(batch)  // 10 calls

Reduction: 100x fewer RPC calls


2. WEBSOCKET SUBSCRIPTIONS
──────────────────────────

Instead of polling:
  while true:
      data = getAccountInfo(account)
      sleep(1000)  // 86,400 calls/day

Use WebSocket:
  ws.accountSubscribe(account, callback)  // 1 subscription, real-time updates

Reduction: 86,400x fewer calls for real-time data


3. COMPRESSED RESPONSES
───────────────────────

Request with encoding: "base64+zstd"
Typical compression: 3-5x smaller responses
Faster parsing: Skip base58 decoding


4. STRATEGIC CACHING
────────────────────

Cache hierarchy:
┌─────────────────────────────────────────────────────────────────────────────┐
│ Layer        │ TTL      │ Data Type                                        │
├──────────────┼──────────┼──────────────────────────────────────────────────┤
│ L1 (Memory)  │ 1 slot   │ Hot accounts (prices, pools)                     │
│ L2 (Redis)   │ 10 slots │ Recent transactions, signatures                  │
│ L3 (Disk)    │ 1 hour   │ Account snapshots, historical data               │
└─────────────────────────────────────────────────────────────────────────────┘

Cache hit reduces RPC calls by ~90% for repeated queries.


5. PARALLEL FANOUT
──────────────────

For large getProgramAccounts:

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  // Sequential: 10 seconds                                                  │
│  for filter in filters:                                                     │
│      results.extend(getProgramAccounts(filter))                             │
│                                                                             │
│  // Parallel: 2 seconds (5x speedup)                                        │
│  results = await Promise.all(                                               │
│      filters.map(f => getProgramAccounts(f))                                │
│  )                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Note: Must respect rate limits across parallel requests.
```

### 15.10 Error Handling and Fallbacks

```
FAILURE MODES AND MITIGATIONS
═════════════════════════════

┌─────────────────────────────────────────────────────────────────────────────┐
│ Failure                │ Detection            │ Mitigation                 │
├────────────────────────┼──────────────────────┼────────────────────────────┤
│ RPC timeout            │ No response 30s      │ Retry with backoff         │
│ RPC rate limit         │ HTTP 429             │ Queue with delays          │
│ Invalid account data   │ Parse exception      │ Skip, log, alert           │
│ Stale data             │ Slot age > 100       │ Refresh from WebSocket     │
│ Network partition      │ Slot not advancing   │ Switch RPC endpoint        │
│ Account not found      │ null response        │ Check if closed/migrated   │
│ Insufficient liquidity │ Pool TVL < $10K      │ Exclude from price calc    │
│ Price manipulation     │ >50% deviation       │ Use TWAP, flag for review  │
└─────────────────────────────────────────────────────────────────────────────┘

FALLBACK HIERARCHY:
───────────────────

1. Primary: Mainnet RPC (api.mainnet-beta.solana.com)
2. Secondary: Genesys Go (ssc-dao.genesysgo.net)
3. Tertiary: Helius (mainnet.helius-rpc.com) - if available
4. Emergency: Cached last-known-good value (max 1 hour stale)

CIRCUIT BREAKER:
────────────────

If > 50% of RPC calls fail over 5-minute window:
  - Halt new market resolutions
  - Extend resolution deadlines by 1 hour
  - Alert operators via PagerDuty
  - Log to on-chain emergency account for transparency
```

### 15.11 Security Considerations for On-Chain Oracles

```
ATTACK VECTORS AND DEFENSES
═══════════════════════════

1. FLASH LOAN PRICE MANIPULATION
────────────────────────────────

Attack: Borrow large amount, manipulate pool, oracle reads bad price, repay.

Defense:
  - Use TWAP over multiple slots (minimum 10 slots = 4 seconds)
  - Cross-reference multiple pools (Raydium + Orca + Phoenix)
  - Reject prices deviating >20% from 1-hour moving average

Mathematical threshold:
  |p_spot - p_twap| / p_twap > 0.20 → REJECT


2. SANDWICH ATTACK ON RESOLUTION
────────────────────────────────

Attack: Front-run resolution transaction, manipulate metric, back-run.

Defense:
  - Oracle resolution uses VRF-delayed execution
  - Resolution slot = commit_slot + random(100, 200) slots
  - Attacker cannot predict exact resolution time


3. ECLIPSE ATTACK
─────────────────

Attack: Isolate oracle node from network, feed false data.

Defense:
  - Multi-source validation (minimum 3 RPC endpoints)
  - Validator vote lag detection
  - Slot hash verification against known validators


4. DATA AVAILABILITY ATTACK
───────────────────────────

Attack: Prevent oracle from accessing account data during resolution.

Defense:
  - Resolution window (not instant): oracle has 1 hour to submit
  - Multiple redundant oracle operators
  - On-chain deadline extension mechanism


5. ECONOMIC ATTACK ON SMALL MARKETS
───────────────────────────────────

Attack: If attack_cost < expected_profit from wrong resolution.

Defense:
  Minimum market requirement:
    TVL_min = f(attack_cost, confidence_threshold)

  For markets < $10,000 TVL:
    - Require 3-of-5 multi-sig resolution
    - Extended dispute window (24 hours vs 1 hour)
```

---

## 16. Appendix

### 16.1 Contract Addresses

```
MAINNET (Pending)
═════════════════
IDL Protocol:     TBD
IDL StableSwap:   TBD
PUMP-IDL Token:   4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump
BAGS-IDL Token:   8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS

DEVNET
══════
IDL Protocol:     BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt
IDL StableSwap:   EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte
```

### 16.2 Links

```
Website:          https://idlhub.io
Documentation:    https://docs.idlhub.io
GitHub:           https://github.com/openSVM/idlhub
Twitter:          https://twitter.com/IDLProtocol
Telegram:         https://t.me/IDLProtocol
Discord:          https://discord.gg/idlprotocol
DexScreener:      https://dexscreener.com/solana/4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump
```

### 16.3 Glossary

| Term | Definition |
|------|------------|
| IDL | Interface Definition Language - JSON schema describing Solana program interfaces |
| veIDL | Vote-escrowed IDL - locked staking tokens with governance power |
| MCP | Model Context Protocol - AI agent API standard |
| Parimutuel | Betting system where all bets pooled, winners split loser pool |
| TVL | Total Value Locked - assets deposited in a protocol |
| Commit-Reveal | Two-phase scheme preventing front-running |
| StableSwap | AMM optimized for pegged assets (Curve-style) |
| RPC | Remote Procedure Call - API for querying Solana blockchain state |
| TWAP | Time-Weighted Average Price - price averaged over time to resist manipulation |
| HyperLogLog | Probabilistic algorithm for counting unique elements with O(1) memory |
| PDA | Program Derived Address - deterministic account addresses in Solana |
| CLMM | Concentrated Liquidity Market Maker - AMM with liquidity in specific price ranges |
| Slot | Solana time unit (~400ms), used for transaction ordering |
| Finality | Confirmation that a transaction is irreversible |

### 16.4 Changelog

```
v3.1.0 (December 2024)
- Added comprehensive on-chain metrics oracle documentation
- Pure Solana RPC architecture (no third-party APIs)
- TVL/Volume/User calculation algorithms with mathematical proofs
- Stratified sampling for high-volume protocols
- HyperLogLog for memory-efficient user counting
- Multi-slot consensus for snapshot consistency
- Protocol-specific account layout parsing
- Attack vector analysis and defenses

v3.0.0 (December 2024)
- Added prediction battles, guilds, referrals
- Added loot boxes and gamification
- Added limit orders, stop loss, partial cashout
- Added dynamic odds system
- Added Telegram, Twitter bots
- Added AI market maker
- Added embed widget
- Added conviction betting
- Added VIP tier system
- Added seasons and leaderboards

v2.0.0 (December 2024)
- Added dual token system (BAGS + PUMP)
- Added StableSwap AMM
- Added LP farming

v1.0.0 (November 2024)
- Initial release
- IDLHub registry
- Basic prediction markets
- Staking and veIDL
```

---

## Disclaimer

```
╔═══════════════════════════════════════════════════════════════════════════════╗
║                                                                               ║
║                              ⚠️  DISCLAIMER  ⚠️                               ║
║                                                                               ║
║   $IDL IS A MEMECOIN WITH OPTIONAL UTILITY.                                  ║
║                                                                               ║
║   • IDLHub is FREE to use - no token required                                ║
║   • Do not invest more than you can afford to lose                           ║
║   • Prediction markets are for entertainment                                  ║
║   • Check local regulations before participating                              ║
║   • No guarantees on oracle accuracy or returns                               ║
║   • Smart contracts are unaudited - use at your own risk                      ║
║                                                                               ║
║   DYOR. NFA. WAGMI (maybe).                                                   ║
║                                                                               ║
╚═══════════════════════════════════════════════════════════════════════════════╝
```

---

```
Document Version: 3.0.0
Last Updated:     December 2024
Authors:          IDL Protocol Team
License:          MIT

                    Built with 🤖 on Solana
```
