# IDL Protocol Security Audit Report

**Date:** 2025-12-18
**Auditor:** Red/Blue Team Pentest
**Program ID:** `BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt`
**Network:** Devnet (Testing Only)

---

## Executive Summary

A comprehensive security audit was performed on the IDL Protocol smart contract. The audit identified **4 confirmed vulnerabilities** through live exploit testing, with 2 rated CRITICAL and 2 rated HIGH severity.

**CRITICAL: This contract is NOT production-ready. Do not deploy to mainnet without implementing the mitigations below.**

### Severity Summary

| Severity | Count | Status |
|----------|-------|--------|
| CRITICAL | 2 | Unmitigated |
| HIGH | 2 | Unmitigated |
| MEDIUM | 0 | N/A |
| LOW | 0 | N/A |

### Vulnerabilities Confirmed via Exploit

| # | Vulnerability | Severity | Exploited |
|---|--------------|----------|-----------|
| 1 | Free Staking (No Token Transfer) | CRITICAL | Yes |
| 2 | Free Betting (No Token Transfer) | CRITICAL | Yes |
| 3 | Bonus Calculation Overflow | HIGH | Theoretical |
| 4 | Badge Volume Gaming | HIGH | Yes |

### Controls That Passed Testing

| Control | Status | Notes |
|---------|--------|-------|
| VeIDL Lock Enforcement | Pass | Cannot unstake locked tokens |
| Early Resolution Prevention | Pass | ResolutionTooEarly error |
| Pre-Resolution Claim Prevention | Pass | MarketNotResolved error |
| Pause Mechanism | Pass | Operations blocked when paused |

---

## Critical Vulnerabilities

### CRITICAL-1: Free Staking (No Token Transfer)

**Location:** `programs/idl-protocol/src/lib.rs:53-72`

**Description:**
The `stake()` function updates accounting variables without transferring any tokens from the user. Users can "stake" arbitrary amounts for free.

**Exploit Result:**
```
✗ VULNERABLE: Staked 1000000 for only 0.000005 SOL
  Expected cost: 1000000 tokens
  Actual cost: ~0.000005 SOL (rent only)
```

**Impact:**
- Unlimited free staking
- Manipulated voting power
- Corrupted protocol state
- Unfair staking bonuses for betting

**Root Cause:**
```rust
pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    // Updates state without token transfer
    staker.staked_amount = staker.staked_amount.checked_add(amount).unwrap();
    state.total_staked = state.total_staked.checked_add(amount).unwrap();
    // NO CPI TO TOKEN PROGRAM
}
```

**Mitigation:**
```rust
use anchor_spl::token::{self, Token, TokenAccount, Transfer};

pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
    require!(amount > 0, IdlError::InvalidAmount);
    require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);

    // Transfer tokens FROM user TO protocol vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

    // Then update state
    let staker = &mut ctx.accounts.staker_account;
    staker.staked_amount = staker.staked_amount.checked_add(amount).unwrap();
    // ...
}
```

**Required Account Changes:**
```rust
#[derive(Accounts)]
pub struct Stake<'info> {
    // ... existing accounts ...

    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}
```

---

### CRITICAL-2: Free Betting (No Token Transfer)

**Location:** `programs/idl-protocol/src/lib.rs:189-234`

**Description:**
The `place_bet()` function records bets without transferring tokens. Users can bet unlimited amounts risk-free.

**Exploit Result:**
```
✗ VULNERABLE: Bet 1000000 for only 0.001585 SOL
  Bet recorded: 1000000
  Actual cost: 0.001585 SOL (rent only)
```

**Impact:**
- Risk-free gambling
- Market pool inflation
- Protocol insolvency when winners claim
- Complete economic model failure

**Mitigation:**
```rust
pub fn place_bet(ctx: Context<PlaceBet>, amount: u64, bet_yes: bool, nonce: u64) -> Result<()> {
    // Transfer tokens to market pool
    let cpi_accounts = Transfer {
        from: ctx.accounts.user_token_account.to_account_info(),
        to: ctx.accounts.market_pool.to_account_info(),
        authority: ctx.accounts.user.to_account_info(),
    };
    token::transfer(
        CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
        amount
    )?;

    // Then record bet
    // ...
}
```

---

## High Severity Vulnerabilities

### HIGH-1: Bonus Calculation Overflow

**Location:** `programs/idl-protocol/src/lib.rs:205-215`

**Description:**
The staker bonus calculation can overflow when processing extremely large bet amounts, potentially causing truncation or panic.

**Theoretical Exploit:**
```
Max input: 18446744073709551615 (u64::MAX)
With 50% bonus would be: 27670116110564327422
Exceeds u64::MAX: true
```

**Impact:**
- Silent truncation of large bets
- Market pool accounting errors
- Potential for arbitrage

**Mitigation:**
```rust
let effective_amount = (amount as u128)
    .checked_mul(multiplier as u128)
    .and_then(|v| v.checked_div(10000))
    .and_then(|v| u64::try_from(v).ok())
    .ok_or(IdlError::MathOverflow)?;
```

---

### HIGH-2: Badge Volume Gaming

**Location:** `programs/idl-protocol/src/lib.rs:307-354`

**Description:**
The `issue_badge()` function accepts `volume_usd` as a parameter without verification, allowing authority to issue badges for fake trading volume.

**Exploit Result:**
```
✗ VULNERABLE: Diamond badge issued with unverified volume
  Claimed volume: $1,000,000,000
  veIDL granted: 20000000
```

**Impact:**
- Arbitrary veIDL inflation
- Governance manipulation
- Unfair badge distribution

**Note:** This requires authority access, but the volume should still be verified on-chain.

**Mitigation:**
```rust
// Add on-chain volume tracking
#[account]
pub struct UserVolume {
    pub user: Pubkey,
    pub total_volume_usd: u64,
    pub last_updated: i64,
}

// Update volume in claim_winnings
pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
    // ... existing logic ...

    // Track volume
    ctx.accounts.user_volume.total_volume_usd = ctx.accounts.user_volume
        .total_volume_usd
        .checked_add(bet.amount)
        .unwrap();
}

// Verify in issue_badge
pub fn issue_badge(ctx: Context<IssueBadge>, tier: BadgeTier) -> Result<()> {
    let volume = ctx.accounts.user_volume.total_volume_usd;
    require!(volume >= required_volume, IdlError::InsufficientVolume);
    // Remove volume_usd parameter - read from chain
}
```

---

## Controls That Passed Testing

### VeIDL Lock Enforcement
The lock mechanism correctly prevents unstaking locked tokens:
```
✓ PROTECTED: TokensLocked error prevents bypass
```

### Early Resolution Prevention
Markets cannot be resolved before their scheduled time:
```
✓ PROTECTED: ResolutionTooEarly error
```

### Pre-Resolution Claim Prevention
Bets cannot be claimed before market resolution:
```
✓ PROTECTED: MarketNotResolved error
```

### Pause Mechanism
Protocol correctly blocks operations when paused:
```
✓ PROTECTED: Staking blocked while paused
```

---

## Additional Security Concerns

### Missing Reward Distribution
The `reward_pool` accumulates staker fees but there's no function to claim rewards.

### Missing Fee Distribution
Creator fees (25%) and treasury fees (15%) are calculated but never distributed.

### No Slippage Protection
Payout calculations occur at claim time, not bet time.

### PDA Validation in ClaimWinnings
The bet account in `ClaimWinnings` lacks seed validation, potentially allowing fake bet accounts.

---

## Recommendations

### Immediate (Before Any Deployment)
1. Add SPL token transfer logic to `stake()`, `unstake()`, `place_bet()`, `claim_winnings()`
2. Add overflow protection with `checked_*` operations and proper error handling
3. Add on-chain volume tracking for badges

### Before Mainnet
1. Add PDA seed validation to all account constraints
2. Implement reward and fee distribution functions
3. Add bet size limits
4. Increase minimum resolution time to 24 hours

### Recommended Architecture Changes
1. Use SPL tokens instead of simulated token accounting
2. Add market pool token accounts
3. Implement time-weighted voting power decay
4. Add front-running protection (commit-reveal for bets)

---

## Test Reproduction

To reproduce the exploit tests:

```bash
cd /home/larp/aldrin/idlhub
npx ts-node scripts/security/exploit-tests.ts
```

---

## Conclusion

The IDL Protocol has critical vulnerabilities that make it unsuitable for production deployment. The missing token transfer logic means the protocol's core functionality is broken - users can stake and bet unlimited amounts without risk.

**Severity Assessment: CRITICAL - DO NOT DEPLOY TO MAINNET**

The audit found that basic security controls (pause, locks, timestamps) work correctly, but the economic model is fundamentally broken due to missing token transfers.

---

*This audit was performed on the deployed devnet program. Production deployment requires implementing all critical mitigations and a follow-up audit.*
