# $IDL Protocol Whitepaper

```
     ___ ____  _
    |_ _|  _ \| |
     | || | | | |
     | || |_| | |___
    |___|____/|_____|

    PROTOCOL v0.1.0
```

## Abstract

$IDL is the native token of IDLHub, Solana's largest Interface Definition Language registry. The protocol enables staking, vote-escrow mechanics, and prediction markets for betting on DeFi protocol metrics. This paper describes the tokenomics, mechanisms, and economic design.

---

## Table of Contents

1. [Introduction](#1-introduction)
2. [Token Overview](#2-token-overview)
3. [Staking Mechanism](#3-staking-mechanism)
4. [Vote-Escrowed IDL (veIDL)](#4-vote-escrowed-idl-veidl)
5. [Volume Badges](#5-volume-badges)
6. [Prediction Markets](#6-prediction-markets)
7. [Fee Structure](#7-fee-structure)
8. [Economic Model](#8-economic-model)
   - 8.1 Value Accrual Mechanics
   - 8.2 Deflationary Tokenomics
   - 8.3 Staking Economics
   - 8.4 Prediction Market Economics
   - 8.5 Flywheel Effect
   - 8.6 Game Theory
   - 8.7 Risk Factors
   - 8.8 Token Utility Summary
   - 8.9 Comparison to Other Models
   - 8.10 Long-Term Value Proposition
9. [Governance](#9-governance)
10. [Security Considerations](#10-security-considerations)
11. [Roadmap](#11-roadmap)

---

## 1. Introduction

### 1.1 The Problem

Solana developers need reliable access to Interface Definition Language (IDL) files to interact with on-chain programs. Currently:

- IDLs are scattered across GitHub repos
- Many are outdated or incomplete
- No standardized registry exists
- AI agents struggle to find correct program interfaces

### 1.2 The Solution

IDLHub provides:

- Centralized registry of 100+ Solana protocol IDLs
- MCP (Model Context Protocol) API for AI agents
- Free access forever - no paywalls
- Community-driven updates

### 1.3 Why a Token?

$IDL is a **memecoin with optional utility**. It exists to:

1. Allow community members to support the project
2. Enable prediction markets on protocol metrics
3. Provide speculative exposure to IDLHub's growth
4. Create skin-in-the-game for governance participants

**Important:** IDLHub is FREE. You do NOT need $IDL to use it.

---

## 2. Token Overview

### 2.1 Basic Information

```
Name:           $IDL
Network:        Solana
Standard:       SPL Token
Decimals:       6
Contract:       8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS
Launch:         bags.fm
```

### 2.2 Supply Distribution

```
Total Supply:       1,000,000,000 $IDL (1 Billion)
                    ================================

Circulating:        950,000,000 $IDL    (95.0%)
    |
    +-- Public:     950,000,000 $IDL    Fair launch on bags.fm
                                        No presale, no VC

Team Allocation:     50,000,000 $IDL    (5.0%)
    |
    +-- Dev:         50,000,000 $IDL    For development, ops
                                        No vesting (it's a memecoin)
```

### 2.3 Supply Visualization

```
[##################################################] 100%
[################################################  ] 95% - Public (Fair Launch)
[##                                                ] 5%  - Team
```

### 2.4 Token Flow Diagram

```
                    +------------------+
                    |   $IDL HOLDERS   |
                    +--------+---------+
                             |
              +--------------+--------------+
              |              |              |
              v              v              v
        +---------+    +---------+    +---------+
        |  STAKE  |    |   BET   |    |  HOLD   |
        +----+----+    +----+----+    +---------+
             |              |
             v              v
        +---------+    +---------+
        |  sIDL   |    | MARKETS |
        +----+----+    +----+----+
             |              |
             v              |
        +---------+         |
        |  veIDL  |         |
        +----+----+         |
             |              |
             v              v
        +---------+    +---------+
        |  VOTE   |    | RESOLVE |
        +---------+    +----+----+
                            |
              +-------------+-------------+
              |             |             |
              v             v             v
         +--------+   +----------+   +--------+
         | WINNER |   |  LOSERS  |   |  FEES  |
         +--------+   +----------+   +---+----+
                                         |
                      +------------------+------------------+
                      |         |         |                 |
                      v         v         v                 v
                  +-------+ +-------+ +--------+       +--------+
                  |STAKERS| |CREATOR| |TREASURY|       |  BURN  |
                  | (50%) | | (25%) | | (15%)  |       | (10%)  |
                  +-------+ +-------+ +--------+       +--------+
```

---

## 3. Staking Mechanism

### 3.1 Overview

Staking allows $IDL holders to:
- Earn share of protocol fees
- Gain betting power multiplier
- Participate in governance (via veIDL)

### 3.2 How It Works

```
+----------+     stake()      +------------+
|   $IDL   | ---------------> |   sIDL     |
| (wallet) |                  | (staked)   |
+----------+                  +------------+
                                    |
                              earns fees from
                              prediction markets
                                    |
                                    v
+----------+    unstake()     +------------+
|   $IDL   | <--------------- |   sIDL     |
| + rewards|                  |            |
+----------+                  +------------+
```

### 3.3 Reward Distribution

Stakers earn 50% of all prediction market fees, distributed proportionally:

```
Your Reward = (Your Stake / Total Staked) * Reward Pool

Example:
- Total Staked: 100,000,000 IDL
- Your Stake:     1,000,000 IDL (1%)
- Reward Pool:      500,000 IDL
- Your Reward:        5,000 IDL (1% of pool)
```

### 3.4 Staking Parameters

| Parameter | Value |
|-----------|-------|
| Minimum Stake | 1 IDL |
| Unstake Delay | None (instant) |
| Reward Source | 50% of betting fees |

---

## 4. Vote-Escrowed IDL (veIDL)

### 4.1 Overview

veIDL is a vote-escrow mechanism inspired by Curve's veCRV. Users lock their staked IDL for a period to gain:

- Voting power for governance
- Boosted betting multiplier
- Non-transferable (soulbound)

### 4.2 Lock Duration vs Voting Power

```
veIDL = Staked IDL * (Lock Duration / Max Duration)

Max Duration = 4 years (126,144,000 seconds)
Min Duration = 1 week (604,800 seconds)
```

```
Lock Duration    |  veIDL per IDL  |  Multiplier
-----------------+-----------------+-------------
4 years          |  1.00 veIDL     |  100%
2 years          |  0.50 veIDL     |  50%
1 year           |  0.25 veIDL     |  25%
6 months         |  0.125 veIDL    |  12.5%
1 week (min)     |  0.0048 veIDL   |  0.48%
```

### 4.3 Visual: Lock Curve

```
veIDL
  ^
1 |                                        *
  |                                   *
  |                              *
  |                         *
  |                    *
  |               *
  |          *
  |     *
0 +----*----+----+----+----+----+----+----+--> Duration
  0   6mo  1yr      2yr      3yr      4yr
```

### 4.4 veIDL Decay (Future Implementation)

Unlike static locks, veIDL will decay linearly over time:

```
Current veIDL = Initial veIDL * (Time Remaining / Lock Duration)

Example: Lock 1000 IDL for 4 years
- At lock:     1000 veIDL
- After 1 yr:   750 veIDL
- After 2 yr:   500 veIDL
- After 3 yr:   250 veIDL
- At expiry:      0 veIDL
```

---

## 5. Volume Badges

### 5.1 Overview

Traders who generate volume on the bags.fm $IDL pool earn badges that grant veIDL voting power WITHOUT locking tokens. This rewards early supporters and active traders.

### 5.2 Pool Address

```
bags.fm Pool: HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC
```

### 5.3 Badge Tiers

```
+===========+===============+================+====================+
| Badge     | Volume (USD)  | veIDL Granted  | Lock Equivalent    |
+===========+===============+================+====================+
| Bronze    | $1,000+       | 50,000 veIDL   | ~1 week lock       |
| Silver    | $10,000+      | 250,000 veIDL  | ~1 month lock      |
| Gold      | $100,000+     | 1,000,000 veIDL| ~3 month lock      |
| Platinum  | $500,000+     | 5,000,000 veIDL| ~1 year lock       |
| Diamond   | $1,000,000+   | 20,000,000 veIDL| ~4 year lock      |
+===========+===============+================+====================+
```

### 5.4 How It Works

```
TRADER                    PROTOCOL                  BADGE
   |                          |                        |
   |  Trade on bags.fm pool   |                        |
   |------------------------->|                        |
   |                          |                        |
   |                    Track volume                   |
   |                          |                        |
   |                    Reach threshold                |
   |                          |                        |
   |                          |  issue_badge()         |
   |                          |----------------------->|
   |                          |                        |
   |                          |    veIDL granted       |
   |<-------------------------------------------------|
   |                          |                        |
   |  Vote in governance      |                        |
   |  Boosted betting power   |                        |
```

### 5.5 Badge Benefits

1. **Voting Power** - veIDL from badges counts toward governance votes
2. **Betting Bonus** - Badges stack with staking for prediction markets
3. **Status** - On-chain proof of trading activity
4. **No Lock Required** - Unlike regular veIDL, no token lock needed

### 5.6 Badge Upgrades

Badges upgrade automatically as volume increases:

```
Example:
- Trader has Bronze badge (50k veIDL) from $5k volume
- Trader reaches $15k total volume
- Admin issues Silver badge upgrade
- Old Bronze veIDL removed, Silver veIDL added
- Net change: +200k veIDL (250k - 50k)
```

### 5.7 Volume Tracking

Volume is tracked off-chain via:
1. Indexing pool transactions from bags.fm
2. Calculating USD value at time of trade
3. Aggregating per wallet
4. Periodic badge issuance by admin

---

## 6. Prediction Markets

### 6.1 Overview

Users can create and bet on prediction markets for DeFi protocol metrics tracked in IDLHub's registry.

### 6.2 Supported Metric Types

| Type | Description | Example |
|------|-------------|---------|
| TVL | Total Value Locked | "Jupiter TVL > $2B by March 2025?" |
| Volume24h | 24-hour trading volume | "Raydium daily volume > $500M?" |
| Users | Unique users | "Drift reaches 100k users?" |
| Transactions | Transaction count | "Kamino > 1M txs this month?" |
| Price | Token price | "JUP token > $2?" |
| MarketCap | Market capitalization | "Marinade mcap > $100M?" |
| Custom | Any verifiable metric | "Protocol ships v2?" |

### 6.3 Market Lifecycle

```
    CREATE           BETTING            RESOLVE           CLAIM
       |                |                  |                |
       v                v                  v                v
+------------+   +------------+    +------------+   +------------+
| Market     |   | Users bet  |    | Oracle     |   | Winners    |
| created    |-->| YES or NO  |--->| reports    |-->| claim      |
| by creator |   | (deadline) |    | outcome    |   | winnings   |
+------------+   +------------+    +------------+   +------------+
       |                |                  |                |
       |                |                  |                |
   t=0            t < deadline       t >= deadline    t > deadline
                 (betting open)      (resolution)      (claims)
```

### 6.4 Betting Mechanics

**Parimutuel System:**
- All bets pooled together
- Winners split losing pool proportionally
- No odds set by market maker

```
                     MARKET POOL
              +----------------------+
              |                      |
    YES Bets  |  +-------+-------+   |  NO Bets
    --------->|  |  YES  |  NO   |   |<---------
              |  | Pool  | Pool  |   |
              |  +-------+-------+   |
              |                      |
              +----------+-----------+
                         |
                   RESOLUTION
                         |
            +------------+------------+
            |                         |
            v                         v
    +---------------+        +---------------+
    | YES WINS:     |        | NO WINS:      |
    | YES bettors   |   OR   | NO bettors    |
    | split NO pool |        | split YES pool|
    +---------------+        +---------------+
```

### 6.5 Staking Bonus

Stakers receive a betting power multiplier:

```
Effective Bet = Actual Bet * (1 + Staking Bonus)

Staking Bonus = min(Staked IDL / 1,000,000, 50%)

Examples:
- 0 IDL staked:      1.00x (no bonus)
- 1M IDL staked:     1.01x (1% bonus)
- 10M IDL staked:    1.10x (10% bonus)
- 50M IDL staked:    1.50x (50% bonus, max)
- 100M IDL staked:   1.50x (capped at 50%)
```

### 6.6 Example Market

```
MARKET: "Jupiter TVL > $3B by Jan 1, 2025?"
========================================

Protocol:     Jupiter (JUP)
Metric:       TVL
Target:       $3,000,000,000
Resolution:   Jan 1, 2025 00:00 UTC
Oracle:       DeFiLlama API (verified by multisig)

CURRENT BETS:
+------------------+------------------+
|      YES         |       NO         |
+------------------+------------------+
|   5,000,000 IDL  |   3,000,000 IDL  |
|      (62.5%)     |      (37.5%)     |
+------------------+------------------+

IMPLIED ODDS: 62.5% YES / 37.5% NO

IF YES WINS:
- YES bettors split 3,000,000 IDL proportionally
- Less 3% fee

IF NO WINS:
- NO bettors split 5,000,000 IDL proportionally
- Less 3% fee
```

---

## 7. Fee Structure

### 7.1 Prediction Market Fees

```
Fee Rate: 3% of winning claims

Fee Distribution:
+===================+===========+=================================+
| Recipient         | Share     | Purpose                         |
+===================+===========+=================================+
| Stakers           | 50%       | Reward pool for sIDL holders    |
| Market Creator    | 25%       | Incentive to create markets     |
| Treasury          | 15%       | Protocol development            |
| Burn              | 10%       | Deflationary pressure           |
+===================+===========+=================================+
```

### 7.2 Fee Flow Diagram

```
                    WINNER CLAIMS 1000 IDL
                            |
                            v
                    +---------------+
                    | 3% Fee = 30   |
                    +-------+-------+
                            |
        +--------+----------+----------+--------+
        |        |          |          |        |
        v        v          v          v        v
    +------+ +------+   +------+   +------+ +------+
    |Staker| |Staker|   |Creator|  |Treas.| | Burn |
    | 7.5  | | 7.5  |   |  7.5  |  | 4.5  | |  3   |
    +------+ +------+   +------+   +------+ +------+
       |        |           |          |        |
       v        v           |          |        v
    +-------------+         |          |    [BURNED]
    | Reward Pool |         |          |
    +-------------+         |          |
                            v          v
                    +----------+ +----------+
                    | Creator  | | Treasury |
                    | Wallet   | | Multisig |
                    +----------+ +----------+
```

### 7.3 Burn Mechanics

10% of all fees are permanently burned:

```
Total Supply (t) = 1,000,000,000 - Total Burned

As markets resolve:
  - Burn accumulates
  - Supply decreases
  - Remaining tokens become more scarce
```

**Projected Burn Scenarios:**

| Monthly Volume | Monthly Fees | Monthly Burn | Annual Burn |
|----------------|--------------|--------------|-------------|
| $100,000 | $3,000 | $300 | $3,600 |
| $1,000,000 | $30,000 | $3,000 | $36,000 |
| $10,000,000 | $300,000 | $30,000 | $360,000 |

---

## 8. Economic Model

### 8.1 Value Accrual Mechanics

The $IDL token captures value through multiple interconnected mechanisms:

```
                         +------------------+
                         |   IDLHub Usage   |
                         | (Free, no fees)  |
                         +--------+---------+
                                  |
                         Drives awareness
                                  |
                                  v
                         +------------------+
                         | $IDL Speculation |
                         |  & Prediction    |
                         |    Markets       |
                         +--------+---------+
                                  |
                         Generates fees
                                  |
              +-------------------+-------------------+
              |                   |                   |
              v                   v                   v
    +------------------+ +------------------+ +------------------+
    |  Staker Rewards  | |  Token Burns     | |  Treasury        |
    |  (50% of fees)   | |  (10% of fees)   | |  (15% of fees)   |
    +------------------+ +------------------+ +------------------+
              |                   |                   |
              v                   v                   v
    +------------------+ +------------------+ +------------------+
    | Incentivizes     | | Reduces supply   | | Funds            |
    | staking/locking  | | over time        | | development      |
    +------------------+ +------------------+ +------------------+
```

### 8.2 Deflationary Tokenomics

Unlike inflationary models that dilute holders, $IDL has **pure deflationary mechanics**:

```
SUPPLY DYNAMICS
===============

Initial Supply:      1,000,000,000 IDL
                            |
                            v
                    +--------------+
                    |  BURN ONLY   |  No minting function
                    +--------------+  No inflation
                            |
                            v
                    +---------------+
                    |  10% of fees  |
                    |   BURNED      |
                    +---------------+
                            |
                            v
                    Final Supply < 1B (always decreasing)
```

**Burn Rate Projections:**

| Scenario | Daily Volume | Annual Fees | Annual Burn | Supply After 5 Years |
|----------|-------------|-------------|-------------|---------------------|
| Bear | $10,000 | $109,500 | $10,950 | 999,945,250 IDL |
| Base | $100,000 | $1,095,000 | $109,500 | 999,452,500 IDL |
| Bull | $1,000,000 | $10,950,000 | $1,095,000 | 994,525,000 IDL |
| Moon | $10,000,000 | $109,500,000 | $10,950,000 | 945,250,000 IDL |

### 8.3 Staking Economics

**Real Yield, Not Emissions:**

$IDL staking generates yield from **actual protocol revenue**, not token emissions:

```
Traditional DeFi                    $IDL Staking
===============                    ==============

Print new tokens ────────>    ❌    No new tokens minted
Distribute to stakers
Inflation dilutes value

                              ✓    Fees from prediction markets
                                   ────> Distributed to stakers
                                   Real economic activity = Real yield
```

**APY Calculation:**

```
Staking APY = (Annual Fees × 50%) / Total Staked Value

Example:
- Annual betting volume: $10,000,000
- Fees (3%):             $300,000
- Staker share (50%):    $150,000
- Total staked:          $500,000 worth of IDL
- Staking APY:           30%

Note: APY varies with volume and staked amount
```

**Staking Lock-Up Incentives:**

| Lock Duration | veIDL Multiplier | Effective APY Boost |
|--------------|------------------|---------------------|
| No lock | 0x | Base APY |
| 1 week | 0.005x | +0.5% bonus |
| 1 month | 0.02x | +2% bonus |
| 6 months | 0.125x | +12.5% bonus |
| 1 year | 0.25x | +25% bonus |
| 4 years (max) | 1.0x | +100% bonus (2x base) |

### 8.4 Prediction Market Economics

**Parimutuel vs Order Book:**

$IDL uses parimutuel markets, which are simpler and more fair:

```
ORDER BOOK (Polymarket-style)         PARIMUTUEL ($IDL)
==========================         ===================

Market makers set odds          All bets pooled together
Spread = MM profit              No spread, no MM
Complex liquidity               Simple: bet yes or no
Can be manipulated              Natural price discovery

Pro: More capital efficient     Pro: Fair to all bettors
Con: Sophisticated users win    Con: Less flexible odds
```

**Winnings Calculation:**

```
Your Winnings = Your Bet × (Losing Pool / Winning Pool)

Example Market Resolution:
==========================
YES Pool: 700,000 IDL (70%)
NO Pool:  300,000 IDL (30%)
Your Bet: 100,000 IDL on YES
Result:   YES wins

Your Share of YES Pool: 100,000 / 700,000 = 14.28%
Your Share of NO Pool:  300,000 × 14.28% = 42,857 IDL

Gross Return: 100,000 + 42,857 = 142,857 IDL
Fee (3%):     142,857 × 0.03 = 4,286 IDL
Net Return:   138,571 IDL
Net Profit:   38,571 IDL (+38.6%)
```

**Betting Power with Staking:**

```
STAKER ADVANTAGE
================

Non-Staker:
  Bet 100 IDL → Counted as 100 IDL

Staker (10M IDL staked):
  Bet 100 IDL → Counted as 110 IDL (10% bonus)

Max Staker (50M+ IDL):
  Bet 100 IDL → Counted as 150 IDL (50% bonus)

This means stakers get proportionally MORE of the winning pool!
```

### 8.5 Flywheel Effect

```
                    +-> More Stakers
                    |        |
                    |        v
             Higher |   More veIDL
             Rewards|   Locked
                    |        |
                    |        v
                    +-- More Betting <--+
                            |           |
                            v           |
                       More Fees        |
                            |           |
                            v           |
                    +-- More Burns      |
                    |       |           |
                    |       v           |
                    |  Higher Price ----+
                    |       |
                    |       v
                    +-> More Attention
```

### 8.3 Game Theory

**For Stakers:**
- Stake to earn fees (passive income)
- Lock for veIDL to boost betting power
- Longer locks = more voting power but less liquidity

**For Bettors:**
- Stake before betting for up to 50% bonus
- Create markets to earn 25% of fees
- Research protocols in IDLHub registry

**For Holders:**
- Supply decreases via burns
- Network effects from IDLHub adoption
- Speculative exposure to DeFi metrics

### 8.4 Risk Factors

| Risk | Description | Mitigation |
|------|-------------|------------|
| Low Volume | No fees if no betting | Creator incentives |
| Oracle Manipulation | False resolution | Multisig oracles |
| Smart Contract Bug | Fund loss | Audits, bug bounty |
| Regulatory | Securities classification | Memecoin framing |
| Competition | Other prediction markets | IDLHub integration |

### 8.8 Token Utility Summary

```
+==================+=================================================+
|     UTILITY      |                  DESCRIPTION                    |
+==================+=================================================+
| STAKE            | Deposit IDL to earn 50% of protocol fees        |
|                  | Real yield from prediction market activity      |
+------------------+-------------------------------------------------+
| LOCK (veIDL)     | Time-lock staked IDL for governance power       |
|                  | Longer lock = more voting influence             |
+------------------+-------------------------------------------------+
| BET              | Place predictions on DeFi protocol metrics      |
|                  | Stakers get up to 50% bonus betting power       |
+------------------+-------------------------------------------------+
| VOTE             | veIDL holders control protocol parameters       |
|                  | Fee rates, oracle selection, treasury spend     |
+------------------+-------------------------------------------------+
| BURN             | 10% of all fees permanently removed from supply |
|                  | Deflationary pressure increases scarcity        |
+------------------+-------------------------------------------------+
| BADGE            | Trade on bags.fm to earn permanent veIDL        |
|                  | Volume tiers: Bronze → Diamond                  |
+==================+=================================================+
```

### 8.9 Comparison to Other Token Models

```
MODEL COMPARISON
================

PURE GOVERNANCE (UNI, AAVE)           $IDL HYBRID
   - Vote on proposals                   - Vote on proposals ✓
   - No staking yield                    - Real staking yield ✓
   - No burning                          - Deflationary burns ✓
   - Speculation only                    - Speculation + utility ✓

REBASING/INFLATIONARY (OHM, SPELL)    $IDL HYBRID
   - High APY (emissions)                - Lower APY (real yield) ✓
   - Infinite inflation                  - Zero inflation ✓
   - Ponzinomics risk                    - Sustainable model ✓
   - Dilution over time                  - Appreciation over time ✓

PURE UTILITY (LINK, GRT)              $IDL HYBRID
   - Service payment only                - Prediction market betting ✓
   - No staking                          - Staking with fees ✓
   - Demand-driven value                 - Multi-source value ✓
```

### 8.10 Long-Term Value Proposition

**For Stakers:**
```
YEAR 1: Stake IDL → Earn fees → Compound into more IDL
YEAR 2: Lock for veIDL → Boost betting power → Earn more
YEAR 3: Burns reduce supply → Your % of supply grows
YEAR 4: Governance influence → Shape protocol direction
```

**For Traders:**
```
ACTIVITY: Trade IDL on bags.fm
REWARD:   Volume badges grant permanent veIDL
BENEFIT:  No lock required, voting power from activity
SYNERGY:  Trade volume → fees generated → ecosystem grows
```

**For Bettors:**
```
ADVANTAGE: Stake + bet for maximum returns
STRATEGY:  Research DeFi protocols via IDLHub → informed bets
EDGE:      50% bonus betting power vs non-stakers
```

---

## 9. Governance

### 9.1 veIDL Voting

veIDL holders can vote on:

1. **Protocol Parameters**
   - Fee percentages
   - Minimum bet amounts
   - Lock durations

2. **Treasury Allocation**
   - Development funding
   - Marketing spend
   - Grants

3. **Oracle Selection**
   - Approved oracle list
   - Dispute resolution

### 9.2 Voting Power

```
Voting Power = veIDL Balance

Example Proposal:
- Total veIDL: 10,000,000
- Your veIDL:     100,000 (1% voting power)
- Quorum:       2,000,000 (20% of supply)
- Threshold:          50% majority
```

### 9.3 Governance Process

```
PHASE 1: Discussion (3 days)
    |
    v
PHASE 2: Snapshot Vote (5 days)
    |
    +-- Quorum not met --> Proposal fails
    |
    v
PHASE 3: Timelock (2 days)
    |
    v
PHASE 4: Execution
```

---

## 10. Security Considerations

### 10.0 Protocol Constants

The protocol enforces these hardcoded security parameters:

```
TIMING PARAMETERS
=================
MIN_RESOLUTION_DELAY      = 86,400 seconds (24 hours)
BETTING_CLOSE_WINDOW      = 3,600 seconds (1 hour before resolution)
CLAIM_DELAY_AFTER_RESOLVE = 300 seconds (5 minutes)
MIN_LOCK_DURATION         = 604,800 seconds (1 week)
MAX_LOCK_DURATION         = 126,144,000 seconds (4 years)

ECONOMIC PARAMETERS
===================
MIN_BET_AMOUNT           = 1,000,000 units (0.001 IDL, prevents dust)
STAKER_FEE_BPS           = 5,000 (50% of fees to stakers)
CREATOR_FEE_BPS          = 2,500 (25% to market creator)
TREASURY_FEE_BPS         = 1,500 (15% to treasury)
BURN_RATE_BPS            = 1,000 (10% burned)
MAX_STAKER_BONUS_BPS     = 5,000 (50% max betting bonus)
STAKER_BONUS_DIVISOR     = 100,000,000 (scaling factor)
```

**Why These Values?**

| Parameter | Rationale |
|-----------|-----------|
| 24h resolution delay | Prevents same-day oracle manipulation |
| 1h betting close | Stops last-second information arbitrage |
| 5 min claim delay | Allows dispute window |
| 0.001 IDL minimum | Prevents bet account spam attacks |
| 50% to stakers | Competitive yield attracts staking |
| 10% burn | Meaningful deflation without being excessive |

### 10.1 Smart Contract Security

| Measure | Status |
|---------|--------|
| Internal Audit | Complete (see audit report) |
| External Audit | Pending |
| Bug Bounty | Planned |
| Timelock | 2 days on admin functions |
| Multisig | Treasury controlled by 3/5 |

### 10.2 Known Limitations

1. **Oracle Trust** - Markets rely on honest oracle resolution
2. **Liquidity Risk** - Low liquidity = high slippage on bets
3. **Governance Attack** - Large veIDL holders control votes

### 10.3 Emergency Procedures

```
IF vulnerability detected:
    1. Admin calls set_paused(true)
    2. All staking/betting halted
    3. Investigation begins
    4. Fix deployed
    5. Admin calls set_paused(false)

IF admin key compromised:
    1. Multisig can override
    2. 2-day timelock on authority transfer
    3. Community alert via Twitter/Discord
```

---

## 11. Roadmap

### Phase 1: Launch (Current)

- [x] Token launch on bags.fm
- [x] IDLHub registry live (100+ IDLs)
- [x] MCP API deployed
- [x] Tokenomics design
- [ ] Smart contract audit

### Phase 2: Staking

- [ ] Deploy staking contract
- [ ] Reward vault initialization
- [ ] UI for staking/unstaking
- [ ] veIDL lock mechanism

### Phase 3: Prediction Markets

- [ ] Market creation UI
- [ ] Betting interface
- [ ] Oracle integration (DeFiLlama, Pyth)
- [ ] Claim/resolution flow

### Phase 4: Governance

- [ ] Snapshot integration
- [ ] Proposal system
- [ ] Treasury multisig
- [ ] On-chain voting (optional)

### Phase 5: Expansion

- [ ] More IDL sources
- [ ] Cross-chain IDLs (EVM, Move)
- [ ] API monetization (optional premium tier)
- [ ] Mobile app

---

## Appendix A: Contract Addresses

```
$IDL Token:     8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS
Protocol:       [TBD - pending deployment]
Staking Vault:  [TBD - PDA]
Reward Vault:   [TBD - PDA]
Treasury:       [TBD - multisig]
```

## Appendix B: Links

```
Website:        https://idlhub.com
Token Page:     https://idlhub.com/tokenomics.html
GitHub:         https://github.com/openSVM/idlhub
bags.fm:        https://bags.fm/b/8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS
DexScreener:    https://dexscreener.com/solana/8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS
```

## Appendix C: Glossary

| Term | Definition |
|------|------------|
| IDL | Interface Definition Language - JSON schema for Solana programs |
| sIDL | Staked IDL token |
| veIDL | Vote-escrowed IDL - locked sIDL with voting power |
| MCP | Model Context Protocol - API standard for AI agents |
| Parimutuel | Betting system where all bets pooled, winners split losers' pool |
| TVL | Total Value Locked - assets deposited in a protocol |

---

## Disclaimer

```
THIS IS A MEMECOIN.

$IDL has no guaranteed utility or value. IDLHub is free to use
regardless of token ownership. Do not invest more than you can
afford to lose. This is not financial advice.

The prediction markets described are for entertainment purposes.
Check local regulations before participating. The protocol makes
no guarantees about oracle accuracy or market resolution.

DYOR. NFA. WAGMI (maybe).
```

---

```
Document Version: 1.1.0
Last Updated:     December 2024
Authors:          IDLHub Team
License:          MIT

Changelog:
- v1.1.0: Expanded tokenomics section with deflationary mechanics,
          staking economics, APY calculations, parimutuel details,
          model comparisons, protocol constants, and value propositions
- v1.0.0: Initial whitepaper release
```
