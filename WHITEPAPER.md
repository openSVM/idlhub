# IDL Protocol Whitepaper v3.0

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
15. [Appendix](#15-appendix)

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

## 15. Appendix

### 15.1 Contract Addresses

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

### 15.2 Links

```
Website:          https://idlhub.io
Documentation:    https://docs.idlhub.io
GitHub:           https://github.com/openSVM/idlhub
Twitter:          https://twitter.com/IDLProtocol
Telegram:         https://t.me/IDLProtocol
Discord:          https://discord.gg/idlprotocol
DexScreener:      https://dexscreener.com/solana/4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump
```

### 15.3 Glossary

| Term | Definition |
|------|------------|
| IDL | Interface Definition Language - JSON schema describing Solana program interfaces |
| veIDL | Vote-escrowed IDL - locked staking tokens with governance power |
| MCP | Model Context Protocol - AI agent API standard |
| Parimutuel | Betting system where all bets pooled, winners split loser pool |
| TVL | Total Value Locked - assets deposited in a protocol |
| Commit-Reveal | Two-phase scheme preventing front-running |
| StableSwap | AMM optimized for pegged assets (Curve-style) |

### 15.4 Changelog

```
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
