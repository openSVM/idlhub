# IDL Protocol - Market Types & Bettable Metrics

## Core Philosophy

Bots aren't bad - they provide liquidity, arbitrage, and efficiency.
We measure **market health**, not "bot attacks".

---

## The Three Core Metrics

### 1. Honest Volume Ratio 🏆

**Formula:**
```
Honest Volume = Total Volume - (Whale Volume + Failed Tx Volume)
Honest Ratio = Honest Volume / Total Volume
```

**What it detects:**
- Whale manipulation (top 10 users controlling market)
- Failed transactions (wasted capital)
- Does NOT penalize bots/MMs (they're good!)

**Market Examples:**
```
"Which protocol is most decentralized this hour?"
[ Jupiter 60% ] [ Raydium 75% ] [ Orca 80% ]

"Raydium honest ratio >70%?"
[ YES - Decentralized ] [ NO - Whale Controlled ]
```

---

### 2. Whale Dependency Index 🐋

**Formula:**
```
Whale Dependency = (Top 10 Users Volume) / Total Volume
isHealthy = whaleDependency < 30%
```

**What it reveals:**
- <30% = Decentralized, healthy market
- 30-50% = Moderate concentration
- >50% = Centralized, manipulation risk

**Market Examples:**
```
"Jupiter has <30% whale concentration?"
[ YES - Healthy ] [ NO - Centralized ]

"Which DEX is most decentralized?"
Ranking by lowest whale dependency
```

---

### 3. Retail Participation 🎯

**Formula:**
```
Retail Participation = (Volume outside Top 10) / Total Volume
```

**What it shows:**
- High = Real user adoption, retail interest
- Low = Institutional/MM only (not bad, just different!)
- Programmatic activity (bots/MMs) is GOOD for markets

**Market Examples:**
```
"Jupiter has >40% retail participation?"
[ YES - Retail Adoption ] [ NO - Institutional Only ]

"Which protocol has highest retail interest?"
Competition for user adoption
```

---

## Market Type Categories

### A. Comparison Markets (Most Engaging)

Users love competition between protocols.

**Format:** "Which protocol wins on metric X?"

**Examples:**

1. **Most Decentralized**
   ```
   "Lowest whale dependency this hour?"
   [ Jupiter 25% ] [ Raydium 20% ] [ Orca 15% ]
   Winner: Orca
   ```

2. **Highest Retail Adoption**
   ```
   "Most retail participation?"
   [ Jupiter 45% ] [ Raydium 30% ] [ Orca 60% ]
   Winner: Orca
   ```

3. **Best Success Rate**
   ```
   "Highest transaction success rate?"
   [ Jupiter 98% ] [ Raydium 95% ] [ Orca 97% ]
   Winner: Jupiter
   ```

---

### B. Binary Markets (Simplest)

Clear yes/no predictions.

**Examples:**

1. **Health Check**
   ```
   "Raydium has <30% whale dependency?"
   [ YES - Healthy ] [ NO - Centralized ]
   ```

2. **Retail Threshold**
   ```
   "Jupiter exceeds 40% retail participation?"
   [ YES ] [ NO ]
   ```

3. **Success Benchmark**
   ```
   "Drift maintains >95% success rate?"
   [ YES - Reliable ] [ NO - Issues ]
   ```

---

### C. Hourly Competitions

Fast feedback loop, high engagement.

**Examples:**

1. **Volume King**
   ```
   "Highest honest volume next hour?"
   All 8 protocols compete
   Winner determined in 60 minutes
   ```

2. **Retail Champion**
   ```
   "Most retail participation this hour?"
   Live leaderboard updates every 10 minutes
   ```

3. **Most Efficient**
   ```
   "Best success rate this hour?"
   Real-time tracking
   ```

---

### D. Trend Markets

Predict changes, not absolutes.

**Examples:**

1. **Growth Direction**
   ```
   "Jupiter retail participation increasing?"
   Compare: Current hour vs Previous hour
   [ UP ] [ DOWN ]
   ```

2. **Decentralization Trend**
   ```
   "Raydium whale dependency decreasing?"
   [ YES - Improving ] [ NO - Worsening ]
   ```

3. **Reliability Trend**
   ```
   "Drift success rate improving?"
   [ YES ] [ NO ]
   ```

---

## Anti-Patterns (Don't Do This)

❌ **"Bot Attack" Markets**
```
"Jupiter under bot attack?"  // WRONG - bots are good!
```

❌ **"Bot-Free" Markets**
```
"Most human protocol?"  // WRONG - we want bots!
```

❌ **"Natural Trading" Markets**
```
"Pure human trading?"  // WRONG - MMs are essential!
```

---

## Market Generation Algorithm

```javascript
function generateHourlyMarkets(protocols) {
    const markets = [];
    
    // 1. Comparison: Most Decentralized
    const byWhales = protocols
        .sort((a, b) => a.whaleDependency - b.whaleDependency)
        .slice(0, 3);
    
    markets.push({
        type: 'comparison',
        question: 'Lowest whale dependency this hour?',
        outcomes: byWhales.map(p => ({
            name: p.name,
            value: p.whaleDependency + '%',
            current: p.whaleDependency
        })),
        resolution: 'Lowest percentage wins',
        timeWindow: '1 hour'
    });
    
    // 2. Binary: Health Check
    protocols.filter(p => p.volume > 1000).forEach(p => {
        markets.push({
            type: 'binary',
            question: `${p.name} has <30% whale dependency?`,
            outcomes: ['YES - Healthy', 'NO - Centralized'],
            current: p.whaleDependency,
            threshold: 30,
            resolution: '1 hour'
        });
    });
    
    // 3. Comparison: Retail Adoption
    const byRetail = protocols
        .sort((a, b) => b.retailParticipation - a.retailParticipation)
        .slice(0, 3);
    
    markets.push({
        type: 'comparison',
        question: 'Highest retail participation?',
        outcomes: byRetail.map(p => ({
            name: p.name,
            value: p.retailParticipation + '%',
            current: p.retailParticipation
        })),
        resolution: 'Highest percentage wins',
        timeWindow: '1 hour'
    });
    
    // 4. Honest Volume Winner
    const byHonest = protocols
        .sort((a, b) => b.honestRatio - a.honestRatio)
        .slice(0, 3);
    
    markets.push({
        type: 'comparison',
        question: 'Most honest protocol this hour?',
        outcomes: byHonest.map(p => ({
            name: p.name,
            value: p.honestRatio + '%',
            current: p.honestRatio
        })),
        resolution: 'Highest honest ratio wins',
        timeWindow: '1 hour'
    });
    
    return markets;
}
```

---

## Example UI Flow

```
┌─────────────────────────────────────────────┐
│ [ LIVE: Hourly Competition ]                │
│                                             │
│ Lowest Whale Dependency Right Now?         │
│                                             │
│ [ Orca 15% ]     45 IDL bet → Win 2.2x    │
│ [ Raydium 20% ]  30 IDL bet → Win 3.3x    │
│ [ Jupiter 25% ]  25 IDL bet → Win 4.0x    │
│                                             │
│ Updates in: 43:22 remaining                 │
│ Total Pool: 500 IDL                         │
└─────────────────────────────────────────────┘

┌─────────────────────────────────────────────┐
│ [ BINARY: Health Check ]                    │
│                                             │
│ Raydium has <30% whale dependency?          │
│ Current: 20% (Healthy!)                     │
│                                             │
│ [ YES - 70% ]  [ NO - 30% ]                │
│                                             │
│ Resolves in: 1 hour                         │
└─────────────────────────────────────────────┘
```

---

## Next Steps

1. ✅ Metrics implemented (honest volume, whale dependency, retail)
2. → Build market generation UI
3. → Add hourly reset mechanism
4. → Implement live updates (10 second polling)
5. → Add leaderboards and competitions

Ready to implement?
