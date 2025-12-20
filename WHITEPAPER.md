# IDL Protocol Whitepaper v3.2

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

### 15.11 Worked Example: Computing Jupiter 24h Volume

```
CONCRETE EXAMPLE: JUPITER VOLUME CALCULATION
════════════════════════════════════════════

Given:
  - Program ID: JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB
  - Target: 24h volume ending at slot 250,000,000
  - Estimated TPS: 75 swaps/second

Step 1: Estimate Transaction Count
──────────────────────────────────

Query: getSignaturesForAddress(JUP4..., {limit: 1000})
Result: 1000 signatures spanning slots 249,998,500 to 250,000,000

Slots covered: 1,500
Time covered: 1,500 × 0.4s = 600 seconds
Tx density: 1000 / 600 = 1.67 tx/second (for this program address)

Note: Jupiter uses multiple program addresses. True TPS higher.

24h slots: 86,400 / 0.4 = 216,000 slots
Estimated 24h tx: 1.67 × 86,400 = 144,288 transactions


Step 2: Stratified Sampling
───────────────────────────

24 hourly buckets, 100 samples each = 2,400 samples

Bucket 0 (hour 0): slots 249,784,000 - 249,793,000
  Query: getSignaturesForAddress(JUP4..., {limit: 100, before: slot_249793000})
  Result: 100 signatures

  For each signature, getTransaction() and parse:
    - Signature: 5Uh7...  → in_amount: 1.5 SOL ($262.50 @ $175)
    - Signature: 3Kp9...  → in_amount: 500 USDC ($500.00)
    - Signature: 7Ym2...  → in_amount: 0.1 SOL ($17.50)
    ... (97 more)

  Bucket 0 sum: $47,832.15
  Bucket 0 mean: $478.32

[Repeat for buckets 1-23]


Step 3: Aggregation
───────────────────

Sample results:
┌────────┬───────────────┬────────────────┬──────────────┐
│ Bucket │ Sample Sum    │ Sample Mean    │ Sample σ     │
├────────┼───────────────┼────────────────┼──────────────┤
│   0    │   $47,832     │    $478.32     │   $1,245     │
│   1    │   $52,104     │    $521.04     │   $1,892     │
│   2    │   $38,291     │    $382.91     │   $987       │
│  ...   │     ...       │      ...       │    ...       │
│  23    │   $61,455     │    $614.55     │   $2,103     │
├────────┼───────────────┼────────────────┼──────────────┤
│ TOTAL  │ $1,156,832    │    $482.01     │   $1,567     │
└────────┴───────────────┴────────────────┴──────────────┘

Overall mean: $482.01 per swap
Estimated 24h volume: 144,288 × $482.01 = $69,546,179


Step 4: Confidence Interval
───────────────────────────

Using CLT for sample mean:

Standard Error = σ / √n = $1,567 / √2,400 = $31.99

95% CI for mean: $482.01 ± 1.96 × $31.99 = [$419.31, $544.71]

Volume 95% CI: [144,288 × $419.31, 144,288 × $544.71]
             = [$60.5M, $78.6M]

Reported: $69.5M ± 13% (95% confidence)


Step 5: Sanity Checks
─────────────────────

□ Volume within historical range? (Jupiter typical: $50M-$200M/day) ✓
□ Mean swap size reasonable? ($482 typical for retail) ✓
□ No bucket with >3σ deviation? (Check for anomalies) ✓
□ Sufficient liquidity for price accuracy? (>$1M per pool) ✓

FINAL RESULT: $69,546,179 (±13%, 95% CI)
```

### 15.12 Vault Discovery: The Protocol Mapping Problem

```
CHALLENGE: DISCOVERING PROTOCOL VAULTS
══════════════════════════════════════

Not all protocols use predictable PDAs. Discovery strategies:

METHOD 1: KNOWN SEEDS (Anchor Programs)
───────────────────────────────────────

For Anchor programs, vaults often use deterministic seeds:

  vault_pda = findProgramAddress([
    "vault",
    pool_pubkey,
    token_mint
  ], program_id)

IDLHub maintains a registry of seed patterns:
  {
    "marinade": {
      "pattern": ["reserve"],
      "program_id": "MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD"
    },
    "drift": {
      "pattern": ["spot_market_vault", market_index.to_le_bytes()],
      "program_id": "dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH"
    }
  }


METHOD 2: OWNERSHIP SCANNING
────────────────────────────

For protocols without predictable PDAs:

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function discoverVaults(program_id):                                       │
│                                                                             │
│      // Find all token accounts owned by PDAs of this program              │
│      pda_owners = []                                                        │
│                                                                             │
│      // Strategy: Scan recent transactions for account creation            │
│      sigs = getSignaturesForAddress(program_id, {limit: 1000})              │
│                                                                             │
│      for sig in sigs:                                                       │
│          tx = getTransaction(sig)                                           │
│          for account in tx.meta.postTokenBalances:                          │
│              if isPDA(account.owner, program_id):                           │
│                  pda_owners.add(account.owner)                              │
│                                                                             │
│      // Fetch all token accounts for discovered PDAs                        │
│      vaults = []                                                            │
│      for pda in pda_owners:                                                 │
│          token_accounts = getTokenAccountsByOwner(pda, {                    │
│              programId: TOKEN_PROGRAM_ID                                    │
│          })                                                                 │
│          vaults.extend(token_accounts)                                      │
│                                                                             │
│      return vaults                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

Limitation: May miss inactive vaults not touched in last 1000 txs.


METHOD 3: IDL-GUIDED DISCOVERY
──────────────────────────────

Using the protocol's IDL from IDLHub:

1. Parse IDL for account types containing "vault", "reserve", "pool"
2. Extract discriminator bytes
3. Use getProgramAccounts with memcmp filter on discriminator
4. Parse matched accounts to extract token account references

Example for Drift:
  idl = fetchIDL("drift")
  vault_discriminator = sha256("account:SpotMarketVault")[:8]

  vaults = getProgramAccounts(DRIFT_PROGRAM, {
    filters: [
      {memcmp: {offset: 0, bytes: base58(vault_discriminator)}}
    ]
  })


METHOD 4: TOKEN-2022 HANDLING
─────────────────────────────

Token-2022 accounts have different layout:

SPL Token (legacy):        Token-2022:
┌────────────────────┐     ┌────────────────────┐
│ mint (32)          │     │ mint (32)          │
│ owner (32)         │     │ owner (32)         │
│ amount (8)         │     │ amount (8)         │
│ delegate_opt (36)  │     │ delegate_opt (36)  │
│ state (1)          │     │ state (1)          │
│ is_native_opt (12) │     │ is_native_opt (12) │
│ delegated_amt (8)  │     │ delegated_amt (8)  │
│ close_auth_opt (36)│     │ close_auth_opt (36)│
└────────────────────┘     │ extensions...      │
     165 bytes             └────────────────────┘
                                165+ bytes

Detection:
  if account.owner == TOKEN_PROGRAM_ID:
      parse_legacy_layout()
  elif account.owner == TOKEN_2022_PROGRAM_ID:
      parse_token2022_layout()
```

### 15.13 Cross-Protocol TVL: Avoiding Double-Counting

```
PROBLEM: NESTED PROTOCOL TVL
════════════════════════════

Kamino deposits into Drift, Mango, and Marginfi.
Naive counting:
  TVL_kamino = $100M
  TVL_drift  = $500M (includes $100M from Kamino)
  TVL_mango  = $300M
  Total = $900M  ← WRONG (double-counted $100M)


SOLUTION: ATTRIBUTION GRAPH
───────────────────────────

Build directed graph of fund flows:

     User Wallets
          │
          ▼
    ┌─────────────┐
    │   Kamino    │ ─────────────┬─────────────┐
    │   $100M     │              │             │
    └─────────────┘              │             │
          │                      │             │
          ▼                      ▼             ▼
    ┌─────────────┐       ┌───────────┐  ┌───────────┐
    │   Drift     │       │   Mango   │  │ Marginfi  │
    │   $400M     │       │   $200M   │  │   $150M   │
    │ (+$50M K)   │       │ (+$30M K) │  │ (+$20M K) │
    └─────────────┘       └───────────┘  └───────────┘


ALGORITHM: ComputeAdjustedTVL
─────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function computeAdjustedTVL(protocol):                                     │
│                                                                             │
│      raw_tvl = computeTVL(protocol)                                         │
│                                                                             │
│      // Identify deposits from other protocols                              │
│      nested_deposits = 0                                                    │
│      for vault in protocol.vaults:                                          │
│          owner = getAccountInfo(vault).owner                                │
│          if isKnownProtocolPDA(owner):                                      │
│              nested_deposits += vault.balance                               │
│                                                                             │
│      // Report both metrics                                                 │
│      return {                                                               │
│          gross_tvl: raw_tvl,                                                │
│          net_tvl: raw_tvl - nested_deposits,                                │
│          nested_from: identifySourceProtocols(nested_deposits)              │
│      }                                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘

For prediction markets, we specify:
  - "Jupiter Gross TVL > $2B" (includes nested)
  - "Jupiter Net TVL > $2B" (excludes nested)

This removes ambiguity in market resolution.
```

### 15.14 Handling Program Upgrades and Version Migrations

```
PROBLEM: ACCOUNT LAYOUT CHANGES
═══════════════════════════════

Jupiter v5 → v6 migration changed swap instruction format.
Parsing v5 transactions with v6 parser = garbage data.


SOLUTION: VERSION-AWARE PARSING
───────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  // IDLHub version registry                                                 │
│  PROTOCOL_VERSIONS = {                                                      │
│      "jupiter": [                                                           │
│          {                                                                  │
│              version: "v5",                                                 │
│              program_id: "JUP4Fb2cqiRUcaTHdrPC8h2gNsA2ETXiPDD33WcGuJB",     │
│              active_until_slot: 200_000_000,                                │
│              idl_hash: "abc123..."                                          │
│          },                                                                 │
│          {                                                                  │
│              version: "v6",                                                 │
│              program_id: "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4",     │
│              active_from_slot: 200_000_001,                                 │
│              idl_hash: "def456..."                                          │
│          }                                                                  │
│      ]                                                                      │
│  }                                                                          │
│                                                                             │
│  function parseSwap(tx, slot):                                              │
│      protocol = identifyProtocol(tx.programId)                              │
│      version = getVersionForSlot(protocol, slot)                            │
│      idl = fetchIDL(protocol, version)                                      │
│      return parseWithIDL(tx, idl)                                           │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


MIGRATION WINDOW HANDLING
─────────────────────────

During migrations, both versions may be active:

  Slot 199,999,000: 100% v5 traffic
  Slot 200,000,000: 70% v5, 30% v6
  Slot 200,001,000: 10% v5, 90% v6
  Slot 200,002,000: 100% v6

Volume calculation must sum across both:
  Volume_total = Volume_v5 + Volume_v6

We detect version by instruction discriminator:
  v5 swap discriminator: 0xe4, 0x45, 0xa5, 0x2e, ...
  v6 swap discriminator: 0x19, 0x3c, 0x2b, 0x8a, ...
```

### 15.15 Minimum Liquidity Thresholds

```
PRICE RELIABILITY VS LIQUIDITY DEPTH
════════════════════════════════════

Price from low-liquidity pools is unreliable and manipulable.

MINIMUM THRESHOLDS:
───────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Pool Liquidity    │ Price Confidence │ Action                              │
├───────────────────┼──────────────────┼─────────────────────────────────────┤
│ < $1,000          │ UNTRUSTED        │ Exclude from aggregation            │
│ $1,000 - $10,000  │ LOW              │ Weight = sqrt(TVL) × 0.1            │
│ $10,000 - $100K   │ MEDIUM           │ Weight = sqrt(TVL) × 0.5            │
│ $100K - $1M       │ HIGH             │ Weight = sqrt(TVL) × 1.0            │
│ > $1M             │ VERY HIGH        │ Weight = sqrt(TVL) × 1.0            │
└─────────────────────────────────────────────────────────────────────────────┘


TOKENS WITH NO LIQUIDITY
────────────────────────

For tokens with no qualifying pools:

1. Check for Pyth/Switchboard on-chain feed (last resort, breaks pure RPC)
2. Use multi-hop: Token → SOL → USDC
3. If no path exists with >$10K liquidity per hop: PRICE_UNAVAILABLE

Market resolution for PRICE_UNAVAILABLE tokens:
  - If >10% of TVL in unpriceable tokens: delay resolution 24h
  - If still unpriceable after 24h: use last known price (max 7 days old)
  - If no price ever known: cancel market, refund bets


SLIPPAGE-ADJUSTED PRICING
─────────────────────────

For large TVL calculations, spot price overstates realizable value.

True value = Σᵢ ∫₀^balanceᵢ price(x) dx

For constant product AMM:
  price(x) = k / (reserve + x)²

  Slippage for selling balance b:
  avg_price = (1/b) × ∫₀^b k/(r+x)² dx
            = k × [1/r - 1/(r+b)] / b
            = k / [r × (r+b)]

For 10% of pool reserves: ~9% slippage
For 50% of pool reserves: ~33% slippage

We report both:
  - Mark-to-market TVL (spot prices)
  - Liquidation TVL (slippage-adjusted)
```

### 15.16 Dispute Resolution with On-Chain Verification

```
DISPUTE MECHANISM: ON-CHAIN PROOF VERIFICATION
══════════════════════════════════════════════

When oracle submits resolution, anyone can dispute with counter-evidence.

DISPUTE FLOW:
─────────────

1. Oracle submits: resolve_market(market_id, actual_value=2.1B, proof_data)
2. Dispute window opens: 1 hour
3. Disputer submits: dispute_resolution(market_id, counter_proof)
4. On-chain arbiter evaluates both proofs
5. Winner receives opponent's bond


ON-CHAIN PROOF FORMAT:
──────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  struct OracleProof {                                                       │
│      // Merkle root of account states at resolution slot                    │
│      state_root: [u8; 32],                                                  │
│                                                                             │
│      // Slot when measurement was taken                                     │
│      slot: u64,                                                             │
│                                                                             │
│      // Blockhash for slot verification                                     │
│      blockhash: [u8; 32],                                                   │
│                                                                             │
│      // List of account pubkeys included in calculation                     │
│      accounts: Vec<Pubkey>,                                                 │
│                                                                             │
│      // Merkle proofs for each account                                      │
│      proofs: Vec<MerkleProof>,                                              │
│                                                                             │
│      // Computed metric value                                               │
│      value: u64,                                                            │
│                                                                             │
│      // Calculation method (TVL, Volume, Users, etc.)                       │
│      method: MetricType,                                                    │
│  }                                                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


ON-CHAIN VERIFICATION (CU-OPTIMIZED):
─────────────────────────────────────

Full on-chain verification is CU-prohibitive (~millions of CU).
Instead, we use optimistic verification with fraud proofs:

1. Oracle posts proof_hash = sha256(OracleProof)
2. Anyone can download full proof off-chain
3. Dispute points to specific invalid sub-proof
4. On-chain verifier checks only disputed portion

Dispute types:
  - INVALID_ACCOUNT: Account not owned by claimed program
  - WRONG_BALANCE: Merkle proof doesn't match claimed balance
  - WRONG_SLOT: Blockhash doesn't match claimed slot
  - MATH_ERROR: Sum of balances × prices ≠ claimed TVL
  - MISSING_ACCOUNT: Major vault excluded from calculation

CU budget per dispute type:
  - INVALID_ACCOUNT: ~50,000 CU (one account check)
  - WRONG_BALANCE: ~100,000 CU (merkle verification)
  - WRONG_SLOT: ~20,000 CU (hash comparison)
  - MATH_ERROR: ~200,000 CU (re-sum subset)
  - MISSING_ACCOUNT: ~150,000 CU (PDA derivation + existence)
```

### 15.17 Latency and Cost Analysis

```
COMPUTATION TIME BENCHMARKS
═══════════════════════════

Measured on standard VPS (4 vCPU, 8GB RAM) against public RPC:

┌────────────────────────┬────────────────┬────────────────┬──────────────┐
│ Metric                 │ RPC Calls      │ Time (p50)     │ Time (p99)   │
├────────────────────────┼────────────────┼────────────────┼──────────────┤
│ Single Token Price     │ 2-5            │ 0.3s           │ 1.2s         │
│ Protocol TVL (10 vault)│ 15-25          │ 2.1s           │ 5.8s         │
│ Protocol TVL (100 vlt) │ 120-150        │ 18s            │ 45s          │
│ 24h Volume (sampled)   │ 2,426          │ 4.2 min        │ 8.5 min      │
│ 24h Volume (full scan) │ 50,000+        │ 45+ min        │ 2+ hours     │
│ Unique Users (1M tx)   │ 11,000         │ 12 min         │ 28 min       │
└────────────────────────┴────────────────┴────────────────┴──────────────┘

Note: HLL doesn't reduce RPC calls, only memory usage.


RATE LIMIT IMPACT
─────────────────

At 10 req/s rate limit:

  TVL (100 vaults): 150 calls / 10 = 15 seconds minimum
  Volume (sampled): 2,426 calls / 10 = 4.04 minutes minimum
  Users (1M tx): 11,000 calls / 10 = 18.3 minutes minimum

Parallelization limited by rate limits, not by network bandwidth.


COST ANALYSIS (Per Resolution)
──────────────────────────────

Using paid RPC tier ($100/month for 100M requests):

┌────────────────────────┬────────────────┬────────────────┐
│ Metric                 │ Requests       │ Cost           │
├────────────────────────┼────────────────┼────────────────┤
│ TVL Resolution         │ ~200           │ $0.0002        │
│ Volume Resolution      │ ~3,000         │ $0.003         │
│ User Count Resolution  │ ~15,000        │ $0.015         │
├────────────────────────┼────────────────┼────────────────┤
│ Monthly (100 markets)  │ ~1.8M          │ $1.80          │
│ Monthly (1000 markets) │ ~18M           │ $18.00         │
└────────────────────────┴────────────────┴────────────────┘

Public RPC: Free but rate-limited and less reliable.
```

### 15.18 Transaction Parsing: Handling Complexity

```
CHALLENGE: IDENTIFYING SWAP TRANSACTIONS
════════════════════════════════════════

Jupiter v6 has 20+ instruction types. Only some are swaps:

┌───────────────────────┬──────────────────────┬──────────┬─────────────────┐
│ Instruction           │ Discriminator        │ Is Swap? │ Has Volume?     │
├───────────────────────┼──────────────────────┼──────────┼─────────────────┤
│ Route                 │ 0xe4, 0x45, 0xa5...  │ YES      │ YES             │
│ SharedAccountsRoute   │ 0xc1, 0xe5, 0x72...  │ YES      │ YES             │
│ ExactOutRoute         │ 0xd0, 0x33, 0x8c...  │ YES      │ YES             │
│ SetTokenLedger        │ 0x7b, 0x3a, 0x9c...  │ NO       │ NO              │
│ CreateOpenOrders      │ 0x12, 0x4e, 0x87...  │ NO       │ NO              │
│ ClaimToken            │ 0x5c, 0x91, 0x2f...  │ NO       │ NO (just claim) │
└───────────────────────┴──────────────────────┴──────────┴─────────────────┘


ALGORITHM: ParseSwapTransaction
───────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function parseSwapTransaction(tx):                                         │
│                                                                             │
│      // Step 1: Check transaction succeeded                                 │
│      if tx.meta.err != null:                                                │
│          return null  // Failed tx, no volume                               │
│                                                                             │
│      // Step 2: Find swap instruction in outer instructions                 │
│      for ix in tx.transaction.message.instructions:                         │
│          if ix.programId == JUPITER_PROGRAM:                                │
│              discriminator = ix.data[0:8]                                   │
│              if discriminator in SWAP_DISCRIMINATORS:                       │
│                  return parseSwapData(ix, tx.meta)                          │
│                                                                             │
│      // Step 3: Check inner instructions (CPI calls)                        │
│      for innerGroup in tx.meta.innerInstructions:                           │
│          for ix in innerGroup.instructions:                                 │
│              if ix.programId == JUPITER_PROGRAM:                            │
│                  discriminator = ix.data[0:8]                               │
│                  if discriminator in SWAP_DISCRIMINATORS:                   │
│                      return parseSwapData(ix, tx.meta)                      │
│                                                                             │
│      return null  // No swap found                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


EXTRACTING SWAP AMOUNTS
───────────────────────

Amounts are in token balance changes, not instruction data:

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function extractSwapAmounts(tx):                                           │
│                                                                             │
│      user = tx.transaction.message.accountKeys[0]  // Fee payer = user      │
│                                                                             │
│      in_amount = 0                                                          │
│      out_amount = 0                                                         │
│      in_mint = null                                                         │
│      out_mint = null                                                        │
│                                                                             │
│      for i, balance in enumerate(tx.meta.postTokenBalances):                │
│          if balance.owner == user:                                          │
│              pre = tx.meta.preTokenBalances[i].uiTokenAmount.amount         │
│              post = balance.uiTokenAmount.amount                            │
│              delta = post - pre                                             │
│                                                                             │
│              if delta < 0:  // User spent this token                        │
│                  in_amount = abs(delta)                                     │
│                  in_mint = balance.mint                                     │
│              elif delta > 0:  // User received this token                   │
│                  out_amount = delta                                         │
│                  out_mint = balance.mint                                    │
│                                                                             │
│      return {in_mint, in_amount, out_mint, out_amount}                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


HANDLING INNER INSTRUCTIONS (CPI)
─────────────────────────────────

Jupiter routes through multiple DEXes via CPI:

  User → Jupiter.Route → Raydium.Swap → Orca.Swap → User

The outer instruction is Jupiter, but actual swaps happen in inner instructions.

For volume counting:
  - Count only the Jupiter outer instruction value
  - DO NOT sum inner DEX calls (would double-count)

For TVL:
  - Inner instruction balance changes are reflected in postTokenBalances
  - No special handling needed
```

### 15.19 SOL/USD Price Bootstrap Problem

```
CHALLENGE: PRICING THE BASE ASSET
═════════════════════════════════

All prices ultimately need USD denomination.
Token → SOL is easy (on-chain pools).
SOL → USD requires external price.

WITHOUT PYTH/SWITCHBOARD:
─────────────────────────

Option 1: USDC/USDT Pools
─────────────────────────

Assume USDC ≈ $1.00 (stablecoin peg)

SOL/USDC pools exist on-chain:
  - Raydium SOL/USDC: ~$50M liquidity
  - Orca SOL/USDC: ~$30M liquidity

price(SOL, USD) ≈ price(SOL, USDC) × 1.00

Risk: USDC depeg event (e.g., March 2023: USDC → $0.87)

Mitigation:
  - Cross-reference SOL/USDC with SOL/USDT
  - If |price_USDC - price_USDT| / price_USDC > 5%:
      → Flag for manual review
      → Use geometric mean: √(price_USDC × price_USDT)


Option 2: Multi-Stablecoin Median
─────────────────────────────────

stablecoins = [USDC, USDT, USDH, UXD, PAI]
prices = [getPoolPrice(SOL, s) for s in stablecoins]
sol_usd = median(prices)

More robust but requires more RPC calls.


Option 3: Wrapped Asset Triangulation
─────────────────────────────────────

wBTC exists on Solana with known BTC/USD external price.

If we trust one external price (BTC from Binance/Coinbase API):
  SOL/USD = SOL/wBTC × BTC/USD

But this breaks "pure RPC" constraint.


RECOMMENDED APPROACH:
─────────────────────

Primary: SOL/USDC with minimum $10M pool liquidity
Fallback: Geometric mean of SOL/USDC and SOL/USDT
Circuit breaker: If stablecoins diverge >5%, halt resolution

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function getSOLPrice():                                                    │
│                                                                             │
│      usdc_price = getPoolPrice(SOL_MINT, USDC_MINT)                         │
│      usdt_price = getPoolPrice(SOL_MINT, USDT_MINT)                         │
│                                                                             │
│      // Check stablecoin divergence                                         │
│      divergence = abs(usdc_price - usdt_price) / usdc_price                 │
│                                                                             │
│      if divergence > 0.05:                                                  │
│          // Stablecoin crisis - use geometric mean with warning             │
│          log.warn("Stablecoin divergence detected: " + divergence)          │
│          return {                                                           │
│              price: sqrt(usdc_price × usdt_price),                          │
│              confidence: LOW,                                               │
│              flag: STABLECOIN_DIVERGENCE                                    │
│          }                                                                  │
│                                                                             │
│      // Normal case - use USDC (higher liquidity)                           │
│      return {                                                               │
│          price: usdc_price,                                                 │
│          confidence: HIGH,                                                  │
│          flag: null                                                         │
│      }                                                                      │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.20 Data Freshness and Staleness Detection

```
PROBLEM: DETECTING STALE RPC DATA
═════════════════════════════════

RPC nodes may return cached/outdated data due to:
  - Load balancer routing to lagging nodes
  - Network partitions
  - Node synchronization delays

STALENESS DETECTION:
────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function checkDataFreshness(response, expected_slot):                      │
│                                                                             │
│      // Get current slot from RPC                                           │
│      current_slot = getSlot()                                               │
│                                                                             │
│      // Check response context slot                                         │
│      response_slot = response.context.slot                                  │
│                                                                             │
│      // Calculate lag                                                       │
│      lag_slots = current_slot - response_slot                               │
│      lag_seconds = lag_slots × 0.4                                          │
│                                                                             │
│      // Apply thresholds by metric type                                     │
│      if metric_type == TVL:                                                 │
│          max_lag = 100 slots (40 seconds)                                   │
│      elif metric_type == VOLUME:                                            │
│          max_lag = 50 slots (20 seconds)  // More time-sensitive            │
│      elif metric_type == PRICE:                                             │
│          max_lag = 25 slots (10 seconds)  // Most time-sensitive            │
│                                                                             │
│      if lag_slots > max_lag:                                                │
│          return {fresh: false, lag: lag_seconds}                            │
│                                                                             │
│      return {fresh: true, lag: lag_seconds}                                 │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘


FRESHNESS THRESHOLDS BY METRIC
──────────────────────────────

┌────────────────┬───────────────┬──────────────────────────────────────────┐
│ Metric         │ Max Staleness │ Reasoning                                │
├────────────────┼───────────────┼──────────────────────────────────────────┤
│ Token Price    │ 10 seconds    │ Prices move fast, arbitrage-sensitive    │
│ Pool Liquidity │ 30 seconds    │ Large moves happen in seconds            │
│ Account Balance│ 60 seconds    │ Moderate sensitivity                     │
│ TVL Aggregate  │ 5 minutes     │ Aggregate is naturally smoothed          │
│ 24h Volume     │ 10 minutes    │ Already a trailing window                │
│ User Count     │ 30 minutes    │ Slow-moving metric                       │
└────────────────┴───────────────┴──────────────────────────────────────────┘


SLOT DRIFT DETECTION
────────────────────

Compare slots across multiple RPC endpoints:

  slot_1 = rpc1.getSlot()  // 250,000,000
  slot_2 = rpc2.getSlot()  // 249,999,950
  slot_3 = rpc3.getSlot()  // 250,000,010

  median_slot = 250,000,000
  max_drift = max(|slotᵢ - median|) = 50 slots

If max_drift > 100 slots:
  - One or more RPCs are lagging
  - Exclude lagging RPCs from queries
  - Log alert for infrastructure team


BLOCKHASH VALIDATION
────────────────────

For critical resolutions, verify slot authenticity:

┌─────────────────────────────────────────────────────────────────────────────┐
│                                                                             │
│  function validateSlot(claimed_slot, claimed_blockhash):                    │
│                                                                             │
│      // Fetch block for claimed slot                                        │
│      block = getBlock(claimed_slot)                                         │
│                                                                             │
│      if block == null:                                                      │
│          // Slot doesn't exist or was skipped                               │
│          return {valid: false, reason: "SLOT_NOT_FOUND"}                    │
│                                                                             │
│      if block.blockhash != claimed_blockhash:                               │
│          // Blockhash mismatch - possible fabrication                       │
│          return {valid: false, reason: "BLOCKHASH_MISMATCH"}                │
│                                                                             │
│      return {valid: true}                                                   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.21 Confidence Scoring Formula

```
FORMAL CONFIDENCE MODEL
═══════════════════════

Each metric resolution has a confidence score C ∈ [0, 1].

COMPONENTS:
───────────

C = w₁·C_data + w₂·C_price + w₃·C_freshness + w₄·C_coverage

Where:
  w₁ = 0.30 (data quality weight)
  w₂ = 0.30 (price reliability weight)
  w₃ = 0.20 (data freshness weight)
  w₄ = 0.20 (coverage completeness weight)


C_data: DATA QUALITY SCORE
──────────────────────────

For sampled metrics (volume):
  C_data = 1 - (CI_width / estimate)

  Where CI_width = 1.96 × σ / √n (95% confidence interval width)

Example:
  Estimate = $69.5M, CI = ±$9M
  C_data = 1 - (18/69.5) = 0.74


C_price: PRICE RELIABILITY SCORE
────────────────────────────────

C_price = Σᵢ (liquidityᵢ / Σ liquidity) × reliabilityᵢ

Where reliabilityᵢ based on pool liquidity:
  - >$1M: 1.0
  - $100K-$1M: 0.8
  - $10K-$100K: 0.5
  - <$10K: 0.0 (excluded)


C_freshness: DATA FRESHNESS SCORE
─────────────────────────────────

C_freshness = max(0, 1 - lag_seconds / max_allowed_lag)

Example:
  lag = 15 seconds, max_allowed = 60 seconds
  C_freshness = 1 - 15/60 = 0.75


C_coverage: COVERAGE COMPLETENESS SCORE
───────────────────────────────────────

C_coverage = accounts_successfully_fetched / accounts_attempted

Example:
  Attempted 150 vaults, 145 succeeded, 5 failed
  C_coverage = 145/150 = 0.967


FINAL CONFIDENCE CALCULATION
────────────────────────────

Example for TVL resolution:
  C_data = 0.95 (low variance)
  C_price = 0.88 (some low-liquidity tokens)
  C_freshness = 0.92 (8 second lag)
  C_coverage = 0.967

  C = 0.30×0.95 + 0.30×0.88 + 0.20×0.92 + 0.20×0.967
    = 0.285 + 0.264 + 0.184 + 0.193
    = 0.926 (92.6% confidence)


CONFIDENCE THRESHOLDS FOR RESOLUTION
────────────────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Confidence     │ Action                                                    │
├────────────────┼───────────────────────────────────────────────────────────┤
│ C ≥ 0.90       │ Resolve immediately                                       │
│ 0.80 ≤ C < 0.90│ Resolve with "LOW_CONFIDENCE" flag, extended dispute      │
│ 0.60 ≤ C < 0.80│ Delay resolution 1 hour, retry measurement                │
│ C < 0.60       │ Cancel market, refund all bets                            │
└─────────────────────────────────────────────────────────────────────────────┘
```

### 15.22 Security Considerations for On-Chain Oracles

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

### 15.23 Unverifiable Programs and Closed-Source Protocols

```
HANDLING CLOSED-SOURCE PROGRAMS
═══════════════════════════════

Problem: Many Solana programs are closed-source with no published IDL.
         Without the IDL, we cannot:
           - Parse account data structures
           - Identify vault accounts vs user accounts
           - Interpret transaction instructions

PROTOCOL CLASSIFICATION
───────────────────────

┌───────────────────┬─────────────────────────────────────────────────────────┐
│ Category          │ Approach                                                │
├───────────────────┼─────────────────────────────────────────────────────────┤
│ Full IDL          │ Parse directly using Anchor/Shank schema                │
│ Partial IDL       │ Combine IDL with heuristics for missing types           │
│ Reverse-engineered│ Community-contributed layouts (verified by consensus)   │
│ Unknown           │ Balance-only mode: sum all token accounts owned by pgm  │
└───────────────────┴─────────────────────────────────────────────────────────┘


BALANCE-ONLY FALLBACK MODE
──────────────────────────

When no IDL is available, use conservative balance estimation:

function estimateTVL_balanceOnly(programId: PublicKey): number {
  // Find all token accounts where owner authority is the program
  const tokenAccounts = await connection.getTokenAccountsByOwner(
    programId,
    { programId: TOKEN_PROGRAM_ID }
  );

  // Also check for native SOL in PDAs
  const pdaAccounts = await findProgramPDAs(programId);

  let tvl = 0;

  // Token accounts
  for (const acc of tokenAccounts) {
    const balance = parseTokenAmount(acc.data);
    const price = getTokenPrice(acc.mint);
    tvl += balance * price;
  }

  // Native SOL in PDAs (subtract rent exemption)
  for (const pda of pdaAccounts) {
    const lamports = pda.lamports - RENT_EXEMPTION_LAMPORTS;
    if (lamports > 0) {
      tvl += lamports * solPrice / 1e9;
    }
  }

  return tvl;
}

Limitations of balance-only mode:
  - Cannot distinguish user deposits from protocol reserves
  - May include operational accounts (fee collectors, etc.)
  - No insight into locked vs available liquidity


CONFIDENCE PENALTY FOR UNKNOWN PROGRAMS
───────────────────────────────────────

Markets on unknown protocols receive reduced confidence:

C_final = C_measured × IDL_factor

where:
  IDL_factor = 1.0    for full IDL
  IDL_factor = 0.85   for partial/heuristic IDL
  IDL_factor = 0.70   for reverse-engineered layouts
  IDL_factor = 0.50   for balance-only mode

Markets with C_final < 0.60 are automatically flagged as "EXPERIMENTAL".
```

### 15.24 LP Tokens and Recursive TVL

```
THE LP TOKEN PROBLEM
════════════════════

LP tokens represent share of liquidity pool. Naive counting leads to errors:

Problem 1: DOUBLE COUNTING
──────────────────────────

Scenario:
  - User deposits 100 USDC + 100 SOL into Raydium → receives 100 RAY-LP
  - User stakes 100 RAY-LP into yield farm

Naive counting:
  TVL = pool_value(USDC + SOL) + farm_value(RAY-LP)
      = $200 + $200 = $400  ← WRONG! Should be $200


RECURSIVE TVL UNWRAPPING
────────────────────────

function computeRealTVL(protocol: Protocol): number {
  const directAssets = getDirectAssets(protocol);
  const lpTokens = getLPTokens(protocol);

  let tvl = 0;
  const visited = new Set<string>();  // Prevent cycles

  // Direct assets (SOL, USDC, etc.)
  for (const asset of directAssets) {
    if (!isLPToken(asset.mint)) {
      tvl += asset.balance * getPrice(asset.mint);
    }
  }

  // Recursively unwrap LP tokens
  for (const lp of lpTokens) {
    if (visited.has(lp.mint)) continue;
    visited.add(lp.mint);

    const poolInfo = getPoolInfo(lp.mint);
    const shareRatio = lp.balance / poolInfo.totalSupply;

    // Get underlying assets
    for (const underlying of poolInfo.underlyingAssets) {
      if (isLPToken(underlying.mint)) {
        // Recursive case: LP of LP (e.g., Curve meta-pools)
        tvl += computeUnderlyingValue(underlying, visited);
      } else {
        tvl += underlying.balance * shareRatio * getPrice(underlying.mint);
      }
    }
  }

  return tvl;
}


LP TOKEN IDENTIFICATION
───────────────────────

Heuristics to identify LP tokens:

1. Token name contains "LP", "Pool", "Share"
2. Token authority is a known AMM program
3. Token metadata contains pool address reference
4. Token is minted by AMM in response to addLiquidity

Known LP token patterns:
┌──────────────────────────────────────────────────────────────────────┐
│ AMM         │ LP Token Pattern                                      │
├─────────────┼────────────────────────────────────────────────────────┤
│ Raydium     │ Mint authority = AMM pool PDA                         │
│ Orca        │ Token name = "Orca LP: {TOKEN_A}/{TOKEN_B}"           │
│ Meteora     │ Mint authority = pool address                          │
│ Phoenix     │ LP token embedded in market account                    │
└──────────────────────────────────────────────────────────────────────┘


CYCLE DETECTION
───────────────

Some DeFi structures create cycles:

  Protocol A deposits LP-B tokens
  Protocol B deposits LP-A tokens

Resolution:
  - Track visited protocols in recursion
  - Report cycle if detected
  - Use snapshot values to break cycle (value at first visit)
  - Flag affected protocols with reduced confidence

Cycle detection algorithm:

function detectTVLCycles(protocolGraph: Graph): Cycle[] {
  const cycles = [];
  const visiting = new Set();
  const visited = new Set();

  function dfs(node, path) {
    if (visiting.has(node)) {
      cycles.push(path.slice(path.indexOf(node)));
      return;
    }
    if (visited.has(node)) return;

    visiting.add(node);
    path.push(node);

    for (const neighbor of protocolGraph.getDeposits(node)) {
      dfs(neighbor, path);
    }

    path.pop();
    visiting.delete(node);
    visited.add(node);
  }

  for (const protocol of protocolGraph.nodes()) {
    dfs(protocol, []);
  }

  return cycles;
}
```

### 15.25 Multi-Hop Swaps and Aggregator Volume

```
AGGREGATOR VOLUME ATTRIBUTION
═════════════════════════════

Aggregators like Jupiter route through multiple DEXes:

  User swap: 100 USDC → SOL

  Jupiter route:
    Step 1: 100 USDC → 50 BONK (Raydium)
    Step 2: 50 BONK → SOL (Orca)

Question: Who gets the volume credit?
  - Jupiter: $100 (user-facing volume)?
  - Raydium: $100 (executed swap)?
  - Orca: ~$100 (executed swap)?

This would count $300 total volume for a $100 swap!


VOLUME ATTRIBUTION RULES
────────────────────────

Rule 1: USER-FACING VOLUME
  Count only the initial user transaction value
  Attribution: aggregator that initiated the swap

Rule 2: EXECUTION VOLUME
  Count each DEX's executed leg
  Attribution: individual DEXes
  Flag as "routed" vs "direct" volume

We implement BOTH metrics with clear labeling:

┌─────────────────────────────────────────────────────────────────────────────┐
│ Metric                  │ What it measures                                  │
├─────────────────────────┼───────────────────────────────────────────────────┤
│ Gross Volume            │ Sum of all swap executions (includes routing)     │
│ Net Volume              │ User-initiated value only (deduplicated)          │
│ Direct Volume           │ Swaps directly on DEX (not via aggregator)        │
│ Routed Volume           │ Swaps routed through aggregator                   │
└─────────────────────────────────────────────────────────────────────────────┘


AGGREGATOR DETECTION
────────────────────

Identify aggregator transactions:

function isAggregatorRouted(tx: Transaction): boolean {
  // Check if outer instruction is from known aggregator
  const AGGREGATORS = [
    JUPITER_V6_PROGRAM,
    PRISM_PROGRAM,
    DFLOW_PROGRAM,
  ];

  const outerProgram = tx.instructions[0].programId;
  if (AGGREGATORS.includes(outerProgram)) {
    return true;
  }

  // Check for shared accounts pattern (aggregator uses intermediate accounts)
  const accountOverlap = detectIntermediateAccounts(tx);
  if (accountOverlap > 2) {
    return true;  // Likely routed
  }

  return false;
}

function extractRoutingPath(tx: Transaction): SwapLeg[] {
  const legs = [];

  for (const ix of tx.innerInstructions) {
    if (isSwapInstruction(ix)) {
      legs.push({
        dex: ix.programId,
        tokenIn: extractTokenIn(ix),
        tokenOut: extractTokenOut(ix),
        amountIn: extractAmountIn(tx, ix),
        amountOut: extractAmountOut(tx, ix),
      });
    }
  }

  return legs;
}


MARKET DEFINITION CLARITY
─────────────────────────

Markets must specify volume type:

interface VolumeMarket {
  protocol: PublicKey;
  metricType: 'GROSS_VOLUME' | 'NET_VOLUME' | 'DIRECT_VOLUME';
  period: number;  // seconds

  // For prediction resolution
  includeAggregatorRouted: boolean;
}

Example market definitions:
  "Jupiter 24h Volume" → NET_VOLUME (user-initiated only)
  "Raydium 24h Volume" → GROSS_VOLUME (includes Jupiter routing)
  "Orca Direct Volume" → DIRECT_VOLUME (excludes aggregator traffic)
```

### 15.26 Emergency Procedures and Oracle Failure

```
ORACLE FAILURE MODES
════════════════════

Mode 1: COMPLETE DATA UNAVAILABILITY
  - All RPCs return errors
  - Network partition
  - Solana halt/restart

Mode 2: PARTIAL DATA CORRUPTION
  - Some accounts return invalid data
  - Mismatch between RPC sources
  - Slot desync > 50 slots

Mode 3: RESOLUTION DEADLINE BREACH
  - Oracle cannot compute in time
  - Dispute raised but unresolved

Mode 4: ECONOMIC ATTACK DETECTED
  - Flash loan signature in resolution slot
  - Price deviation exceeds safety threshold


EMERGENCY RESPONSE PROTOCOL
───────────────────────────

┌─────────────────────────────────────────────────────────────────────────────┐
│ Phase      │ Action                                                         │
├────────────┼────────────────────────────────────────────────────────────────┤
│ Detection  │ Monitor fails → alert oracle operators                        │
│ Grace      │ 15-minute window for automatic recovery                        │
│ Extension  │ If unresolved, extend deadline by 1 hour                       │
│ Escalation │ If still unresolved, multi-sig takes control                   │
│ Fallback   │ Multi-sig votes on resolution OR cancels market                │
│ Refund     │ If cancelled, all bets refunded minus gas                      │
└─────────────────────────────────────────────────────────────────────────────┘


ON-CHAIN EMERGENCY STATE
────────────────────────

#[account]
pub struct OracleState {
    pub status: OracleStatus,
    pub last_healthy_slot: u64,
    pub consecutive_failures: u32,
    pub emergency_council: [Pubkey; 5],
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub enum OracleStatus {
    Healthy,
    Degraded { reason: [u8; 32] },
    Emergency { initiated_at: i64 },
    Halted,
}

// Emergency pause instruction (requires 3-of-5 council)
pub fn emergency_pause(ctx: Context<EmergencyPause>) -> Result<()> {
    let oracle = &mut ctx.accounts.oracle_state;

    require!(
        oracle.consecutive_failures >= 3 ||
        ctx.accounts.emergency_override.is_some(),
        OracleError::NotEmergency
    );

    oracle.status = OracleStatus::Emergency {
        initiated_at: Clock::get()?.unix_timestamp,
    };

    emit!(EmergencyPauseEvent {
        slot: Clock::get()?.slot,
        reason: "Oracle failure",
    });

    Ok(())
}


AUTOMATIC CIRCUIT BREAKERS
──────────────────────────

Trigger conditions for automatic market pause:

1. RPC Response Failure
   consecutive_rpc_errors >= 10 → PAUSE

2. Data Inconsistency
   |value_rpc1 - value_rpc2| / value_avg > 0.30 → PAUSE

3. Stale Data
   current_slot - last_update_slot > 100 → PAUSE

4. Price Anomaly
   |price_now - price_1h_ago| / price_1h_ago > 0.50 → PAUSE

5. Volume Anomaly
   volume_last_5min / volume_avg_5min > 100 → PAUSE


RECOVERY PROCEDURE
──────────────────

After emergency resolved:

1. Council reviews root cause
2. Oracle software patched if needed
3. Test resolution on expired markets (historical validation)
4. Council votes to resume (3-of-5)
5. Markets resume with extended betting windows
6. Post-mortem published on-chain (IPFS hash in account)

// Resume from emergency
pub fn emergency_resume(ctx: Context<EmergencyResume>) -> Result<()> {
    let oracle = &mut ctx.accounts.oracle_state;

    require!(
        matches!(oracle.status, OracleStatus::Emergency { .. }),
        OracleError::NotInEmergency
    );

    // Require sufficient council signatures
    require!(
        ctx.accounts.council_votes.count() >= 3,
        OracleError::InsufficientVotes
    );

    oracle.status = OracleStatus::Healthy;
    oracle.consecutive_failures = 0;
    oracle.last_healthy_slot = Clock::get()?.slot;

    Ok(())
}
```

### 15.27 Historical Data and Trend Predictions

```
THE HISTORICAL DATA PROBLEM
═══════════════════════════

Prediction types requiring historical context:

  "Jupiter TVL will increase by 10% this week"
  "Raydium volume will exceed last month's average"
  "Marinade will gain 5% market share"

Problem: Solana RPC provides NO historical queries!
  - getAccountInfo() → current state only
  - getSignaturesForAddress() → tx hashes, not balances
  - No time-travel or archive queries


SOLUTION: INCREMENTAL SNAPSHOTS
───────────────────────────────

Oracle maintains off-chain snapshot database:

┌─────────────────────────────────────────────────────────────────────────────┐
│ Table: protocol_snapshots                                                   │
├─────────────────────────────────────────────────────────────────────────────┤
│ protocol_id │ slot      │ timestamp   │ tvl_usd    │ volume_24h │ users_24h│
├─────────────┼───────────┼─────────────┼────────────┼────────────┼──────────┤
│ jupiter     │ 250000000 │ 2024-01-01  │ 50,000,000 │ 10,000,000 │ 50,000   │
│ jupiter     │ 250050000 │ 2024-01-01  │ 50,100,000 │ 10,200,000 │ 51,000   │
│ ...         │ ...       │ ...         │ ...        │ ...        │ ...      │
└─────────────────────────────────────────────────────────────────────────────┘

Snapshot frequency:
  - Every 1000 slots (~6.7 minutes) for top 20 protocols
  - Every 5000 slots (~33 minutes) for others
  - Every 100 slots (~40 seconds) during market resolution window


SNAPSHOT ANCHORING TO CHAIN
───────────────────────────

Each snapshot includes on-chain anchor for verification:

interface Snapshot {
  slot: number;
  blockhash: string;          // Verifiable on-chain
  merkleRoot: string;         // Merkle root of all account states
  metrics: ProtocolMetrics;
  signature: string;          // Oracle operator signature
}

Verification (anyone can challenge):

function verifyHistoricalSnapshot(snapshot: Snapshot): boolean {
  // 1. Verify blockhash existed at claimed slot
  const blockInfo = await connection.getBlock(snapshot.slot);
  if (blockInfo.blockhash !== snapshot.blockhash) {
    return false;  // Snapshot slot mismatch
  }

  // 2. Verify oracle signature
  if (!verifySignature(snapshot, oraclePublicKey)) {
    return false;  // Invalid oracle signature
  }

  // 3. Merkle proof verification (if challenged)
  // Challenger provides account data, we verify against merkleRoot

  return true;
}


TREND MARKET RESOLUTION
───────────────────────

For percentage-change markets:

Market: "Jupiter TVL increases 10% this week"
Start: Slot 250,000,000 (TVL = $50M)
End: Slot 251,200,000 (7 days later)

Resolution formula:
  TVL_start = snapshot_at(250,000,000).tvl
  TVL_end = current_tvl()  // Live query at resolution time

  change_pct = (TVL_end - TVL_start) / TVL_start * 100

  outcome = change_pct >= 10.0 ? YES : NO


HANDLING MISSING SNAPSHOTS
──────────────────────────

If snapshot missing for exact slot:

function getSnapshotAtSlot(protocol: string, targetSlot: number): Snapshot {
  // Find nearest snapshots
  const before = db.query(`
    SELECT * FROM snapshots
    WHERE protocol_id = ? AND slot <= ?
    ORDER BY slot DESC LIMIT 1
  `, [protocol, targetSlot]);

  const after = db.query(`
    SELECT * FROM snapshots
    WHERE protocol_id = ? AND slot > ?
    ORDER BY slot ASC LIMIT 1
  `, [protocol, targetSlot]);

  if (!before && !after) {
    throw new Error("No snapshots available");
  }

  // Use nearest snapshot (prefer before)
  if (before && (targetSlot - before.slot) < 1000) {
    return before;  // Within ~6 minutes, acceptable
  }

  // Interpolate only for TVL (volume/users not interpolatable)
  if (before && after &&
      (after.slot - before.slot) < 10000) {  // Gap < 1 hour
    return interpolateSnapshot(before, after, targetSlot);
  }

  // Gap too large - flag with reduced confidence
  return {
    ...before,
    confidence: 0.70,
    interpolated: true,
  };
}


DATA RETENTION POLICY
─────────────────────

Storage constraints require rotation:

┌─────────────────────────────────────────────────────────────────────────────┐
│ Period           │ Resolution      │ Storage per protocol │ Total (100 pgm)│
├──────────────────┼─────────────────┼──────────────────────┼────────────────┤
│ Last 24 hours    │ Every 1000 slots│ 210 snapshots/day    │ 21,000         │
│ Last 7 days      │ Hourly          │ 168 snapshots        │ 16,800         │
│ Last 30 days     │ Daily           │ 30 snapshots         │ 3,000          │
│ Last 365 days    │ Weekly          │ 52 snapshots         │ 5,200          │
└─────────────────────────────────────────────────────────────────────────────┘

Total: ~46,000 snapshots × 1KB ≈ 46MB per year (highly compressible)
```

### 15.28 Cross-Chain Assets and Bridges

```
BRIDGE TVL CHALLENGES
═════════════════════

Wrapped assets from other chains:

  wETH (Wormhole Ethereum)
  wBTC (Wormhole Bitcoin)
  USDCet (Ethereum USDC via Wormhole)
  USDCpo (Polygon USDC via Wormhole)

Problem: How to price cross-chain assets?
  - They should trade 1:1 with native... but don't always
  - Bridge exploits can cause depegs
  - No native Solana liquidity for price discovery


CROSS-CHAIN ASSET PRICING
─────────────────────────

Strategy 1: ASSUME PEG (Naive)
  wETH price = ETH price (from Solana ETH/USDC pools)

  Risk: If bridge is exploited, wETH != ETH but we don't detect it

Strategy 2: LOCAL LIQUIDITY PRICING
  wETH price = wETH/USDC pool price on Solana

  Risk: Low liquidity = easy manipulation

Strategy 3: HYBRID (Recommended)
  base_price = native_asset_price  // From largest pools
  local_price = wrapped_pool_price  // From Solana pools

  deviation = |local_price - base_price| / base_price

  if deviation < 0.02:  // Within 2%
    price = local_price  // Use local (more current)
  elif deviation < 0.05:  // 2-5% deviation
    price = (local_price + base_price) / 2  // Average
    flag = "MINOR_DEPEG"
  else:  // >5% deviation
    price = base_price  // Use peg assumption
    flag = "MAJOR_DEPEG"  // Alert operators


BRIDGE PROGRAM IDENTIFICATION
─────────────────────────────

Known bridge programs on Solana:

┌─────────────────────────────────────────────────────────────────────────────┐
│ Bridge        │ Program ID                                    │ Assets      │
├───────────────┼───────────────────────────────────────────────┼─────────────┤
│ Wormhole      │ worm2ZoG2kUd4vFXhvjh93UUH596ayRfgQ2MgjNMTth  │ wETH,wBTC...│
│ DeBridge      │ DEbrdGj3HsRsAzx6uH4MKyREKxVAfBydijLUF3ygsFfh │ deETH...    │
│ Allbridge     │ BrdgN2RPzEMWF96ZbnnJaUtQDQx7VRXYaHHbYCBvceWB │ abETH...    │
│ Portal(WH)    │ Portal111111111111111111111111111111111111111 │ Portal*     │
└─────────────────────────────────────────────────────────────────────────────┘


BRIDGE EXPLOIT DETECTION
────────────────────────

Automated detection for market safety:

interface BridgeHealth {
  bridge: string;
  lastVerified: number;  // slot
  pegDeviation: number;
  liquidityDepth: number;
  status: 'HEALTHY' | 'WARNING' | 'CIRCUIT_BREAKER';
}

function monitorBridgeHealth(bridge: string): BridgeHealth {
  const wrappedAssets = getWrappedAssets(bridge);

  for (const asset of wrappedAssets) {
    const localPrice = getLocalPrice(asset);
    const pegPrice = getPegPrice(asset);
    const deviation = Math.abs(localPrice - pegPrice) / pegPrice;

    if (deviation > 0.10) {  // 10% depeg
      return {
        bridge,
        status: 'CIRCUIT_BREAKER',
        pegDeviation: deviation,
        ...
      };
    }
  }

  return { bridge, status: 'HEALTHY', ... };
}

// Circuit breaker: pause markets involving depegged assets
if (bridgeHealth.status === 'CIRCUIT_BREAKER') {
  pauseMarketsWithAsset(bridgeHealth.affectedAssets);
}


TVL COUNTING FOR BRIDGES
────────────────────────

Bridge TVL should be counted once:

  wETH locked in bridge = $10M
  wETH deposited in Marinade = $5M (subset of locked wETH)

Correct: Total wETH TVL on Solana = $10M (bridge custody)
Wrong: $10M + $5M = $15M (double counting)

Rule: Count at the bridge level, not in downstream protocols
  - Bridge TVL = sum of all wrapped tokens issued
  - Protocol TVL excludes wrapped tokens (counts as "external")
  - OR protocol TVL includes wrapped tokens, marked separately

interface ProtocolTVL {
  nativeAssets: number;      // SOL, USDC, etc.
  wrappedAssets: number;     // wETH, wBTC, etc.
  lpTokens: number;          // Already handled in 15.24
  totalTVL: number;          // Sum
  nativeOnlyTVL: number;     // Excludes bridge exposure
}
```

### 15.29 Token Decimals and Balance Normalization

```
THE DECIMALS PROBLEM
════════════════════

Solana tokens have varying decimal places:

┌────────────────────────────────────────────────────────────────────────┐
│ Token    │ Decimals │ Raw Balance      │ Actual Balance               │
├──────────┼──────────┼──────────────────┼──────────────────────────────┤
│ SOL      │ 9        │ 1000000000       │ 1.0 SOL                      │
│ USDC     │ 6        │ 1000000          │ 1.0 USDC                     │
│ BONK     │ 5        │ 100000           │ 1.0 BONK                     │
│ wBTC     │ 8        │ 100000000        │ 1.0 wBTC                     │
│ RAY      │ 6        │ 1000000          │ 1.0 RAY                      │
└────────────────────────────────────────────────────────────────────────┘

Critical: Mixing up decimals → 1000x errors in TVL!


DECIMAL DISCOVERY
─────────────────

function getTokenDecimals(mint: PublicKey): number {
  // 1. Try SPL token mint account
  const mintInfo = await getMint(connection, mint);
  if (mintInfo) {
    return mintInfo.decimals;
  }

  // 2. Try Token-2022 mint
  const mint2022 = await getMint(connection, mint, undefined, TOKEN_2022_PROGRAM);
  if (mint2022) {
    return mint2022.decimals;
  }

  // 3. Fallback: known token registry
  const known = TOKEN_REGISTRY.get(mint.toString());
  if (known) {
    return known.decimals;
  }

  // 4. Unknown token - assume 9 (SOL standard) and flag
  console.warn(`Unknown decimals for ${mint}, assuming 9`);
  return 9;
}


BALANCE NORMALIZATION
─────────────────────

function normalizeBalance(rawBalance: bigint, decimals: number): number {
  // Avoid floating point errors with BigInt
  const divisor = BigInt(10 ** decimals);
  const wholePart = rawBalance / divisor;
  const fractionalPart = rawBalance % divisor;

  // Combine with precision
  return Number(wholePart) + Number(fractionalPart) / Number(divisor);
}

// Example usage in TVL calculation
function computeTokenValue(account: TokenAccount): number {
  const decimals = getTokenDecimals(account.mint);
  const balance = normalizeBalance(account.amount, decimals);
  const price = getTokenPrice(account.mint);

  return balance * price;
}


EDGE CASES
──────────

1. Token-2022 with interest-bearing extension
   - Raw balance ≠ actual balance
   - Must apply interest calculation

   function getInterestBearingBalance(account: TokenAccount): bigint {
     const extension = getInterestBearingExtension(account.mint);
     const elapsed = currentTime - account.lastUpdate;
     const interest = account.amount * extension.rate * elapsed / YEAR_SECONDS;
     return account.amount + interest;
   }

2. Tokens with transfer fees (Token-2022)
   - TVL should use gross balance (before fees)
   - Volume should reflect net transferred amount

3. Tokens with permanent delegate
   - Balance may be seized at any time
   - Flag with "CUSTODY_RISK" in TVL

4. Wrapped vs Native representation
   - wSOL (wrapped SOL) has 9 decimals
   - Native SOL in PDA also has 9 decimals
   - Ensure not double-counted


VALIDATION CHECKS
─────────────────

function validateTokenValue(
  mint: PublicKey,
  rawBalance: bigint,
  computedValue: number
): ValidationResult {
  const decimals = getTokenDecimals(mint);
  const price = getTokenPrice(mint);

  // Sanity check 1: Value should be positive
  if (computedValue < 0) {
    return { valid: false, error: "Negative value" };
  }

  // Sanity check 2: Decimal calculation consistency
  const expectedValue = Number(rawBalance) / (10 ** decimals) * price;
  if (Math.abs(computedValue - expectedValue) / expectedValue > 0.001) {
    return { valid: false, error: "Decimal mismatch" };
  }

  // Sanity check 3: Reasonable total supply
  const totalSupply = getTotalSupply(mint);
  if (rawBalance > totalSupply) {
    return { valid: false, error: "Balance exceeds supply" };
  }

  return { valid: true };
}
```

### 15.30 Compute Budget and Transaction Limits

```
SOLANA TRANSACTION CONSTRAINTS
══════════════════════════════

Resolution transactions must fit within Solana's limits:

┌─────────────────────────────────────────────────────────────────────────────┐
│ Constraint           │ Limit                        │ Impact                │
├──────────────────────┼──────────────────────────────┼───────────────────────┤
│ Compute units        │ 1,400,000 CU per tx          │ Complex math limited  │
│ Transaction size     │ 1,232 bytes                  │ Few accounts per tx   │
│ Account inputs       │ 64 accounts max              │ Can't read many vaults│
│ Stack depth          │ 64 frames                    │ No deep recursion     │
│ Heap size            │ 32 KB                        │ Small data structures │
│ Cross-program invoke │ 4 levels deep                │ Limited CPI chains    │
└─────────────────────────────────────────────────────────────────────────────┘


MULTI-TRANSACTION RESOLUTION
────────────────────────────

For complex metrics requiring many account reads:

Phase 1: ACCUMULATION TRANSACTIONS
  - Multiple txs each reading subset of accounts
  - Results stored in accumulator PDA

Phase 2: FINALIZATION TRANSACTION
  - Reads accumulator PDA
  - Computes final metric
  - Resolves market

#[account]
pub struct MetricAccumulator {
    pub market: Pubkey,
    pub metric_type: MetricType,
    pub partial_results: Vec<PartialResult>,
    pub accounts_processed: u32,
    pub accounts_total: u32,
    pub created_slot: u64,
    pub expires_slot: u64,
}

// Example: TVL across 200 vaults
// Each tx processes 30 vaults (account limit)
// 7 accumulation txs + 1 finalization tx

pub fn accumulate_tvl(ctx: Context<AccumulateTVL>) -> Result<()> {
    let accumulator = &mut ctx.accounts.accumulator;

    // Sum balances from this batch
    let mut batch_sum: u64 = 0;
    for account in ctx.remaining_accounts {
        let balance = parse_token_account(account)?;
        batch_sum = batch_sum.checked_add(balance)
            .ok_or(OracleError::Overflow)?;
    }

    accumulator.partial_results.push(PartialResult {
        slot: Clock::get()?.slot,
        value: batch_sum,
        accounts_in_batch: ctx.remaining_accounts.len() as u32,
    });

    accumulator.accounts_processed += ctx.remaining_accounts.len() as u32;

    Ok(())
}

pub fn finalize_tvl(ctx: Context<FinalizeTVL>) -> Result<()> {
    let accumulator = &ctx.accounts.accumulator;
    let market = &mut ctx.accounts.market;

    // Verify all accounts processed
    require!(
        accumulator.accounts_processed >= accumulator.accounts_total,
        OracleError::IncompleteAccumulation
    );

    // Sum all partial results
    let total: u64 = accumulator.partial_results
        .iter()
        .map(|r| r.value)
        .sum();

    // Convert to USD and resolve
    let tvl_usd = apply_price_and_decimals(total, ...);
    market.resolve(tvl_usd)?;

    // Close accumulator, reclaim rent
    close_account(accumulator)?;

    Ok(())
}


COMPUTE OPTIMIZATION TECHNIQUES
───────────────────────────────

1. PRE-COMPUTED ACCOUNT LISTS
   - Off-chain: identify all relevant accounts
   - Store as Merkle tree root on-chain
   - Verify subset membership in each tx

2. PARALLEL TRANSACTION SUBMISSION
   - Split account batches across multiple txs
   - Submit all accumulation txs in same slot
   - Finalization waits for all to confirm

3. INSTRUCTION PACKING
   - Combine multiple read operations in one tx
   - Use remaining_accounts for dynamic inputs

4. ARITHMETIC OPTIMIZATION
   - Use fixed-point instead of floating point
   - Batch multiplications before divisions
   - Avoid large exponents in on-chain math

Example fixed-point TVL:

// All values in basis points (1/10000)
pub fn compute_tvl_fixed(
    balances: &[u64],      // Raw token balances
    prices: &[u64],        // Prices in basis points (1 USD = 10000)
    decimals: &[u8],       // Token decimals
) -> Result<u64> {
    let mut total_bps: u128 = 0;

    for i in 0..balances.len() {
        // Normalize balance to 6 decimals (USDC standard)
        let normalized = normalize_to_6_decimals(balances[i], decimals[i]);

        // Multiply by price (in bps)
        let value_bps = (normalized as u128) * (prices[i] as u128) / 10000;

        total_bps = total_bps.checked_add(value_bps)
            .ok_or(OracleError::Overflow)?;
    }

    // Return in USD (6 decimals)
    Ok((total_bps / 10000) as u64)
}


TRANSACTION SIZE ESTIMATION
───────────────────────────

Pre-compute transaction feasibility:

function estimateTransactionSize(accounts: PublicKey[]): TxEstimate {
  // Base overhead
  let size = 232;  // Signatures, header, recent blockhash

  // Account keys (32 bytes each)
  size += accounts.length * 32;

  // Instruction data (varies by program)
  size += ORACLE_INSTRUCTION_SIZE;  // ~100 bytes typical

  const fits = size <= 1232;
  const computeUnits = estimateComputeUnits(accounts.length);

  return {
    fits,
    size,
    computeUnits,
    accountCount: accounts.length,
    needsSplit: accounts.length > 30,  // Conservative threshold
    recommendedBatchSize: Math.min(30, Math.floor(1232 / 32)),
  };
}
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
v3.2.0 (December 2024)
- Added closed-source program handling (balance-only fallback mode)
- LP token unwrapping and recursive TVL calculation
- Cycle detection for interdependent protocol TVL
- Multi-hop swap attribution and aggregator volume deduplication
- Emergency procedures and oracle failure modes
- Historical snapshot system for trend predictions
- Cross-chain asset pricing and bridge exploit detection
- Token decimals normalization with Token-2022 edge cases
- Compute budget optimization and multi-tx resolution
- Expanded security considerations and circuit breakers

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
Document Version: 3.2.0
Last Updated:     December 2024
Authors:          IDL Protocol Team
License:          MIT

                    Built with 🤖 on Solana
```
