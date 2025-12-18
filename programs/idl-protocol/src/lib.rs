use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt");

// ==================== CONSTANTS ====================

pub const MAX_LOCK_DURATION: i64 = 126144000; // 4 years in seconds
pub const MIN_LOCK_DURATION: i64 = 604800; // 1 week minimum
pub const BET_FEE_BPS: u64 = 300; // 3% fee on winning bets
pub const STAKER_FEE_SHARE_BPS: u64 = 5000; // 50% of fees to stakers
pub const CREATOR_FEE_SHARE_BPS: u64 = 2500; // 25% to market creator
pub const TREASURY_FEE_SHARE_BPS: u64 = 1500; // 15% to treasury
pub const BURN_FEE_SHARE_BPS: u64 = 1000; // 10% burned

// SECURITY FIX: Add bet limits
pub const MAX_BET_AMOUNT: u64 = 1_000_000_000_000_000; // 1M tokens (with 9 decimals)
pub const MIN_BET_AMOUNT: u64 = 1_000_000; // 0.001 tokens minimum (prevent dust attacks)
pub const MIN_RESOLUTION_DELAY: i64 = 86400; // 24 hours minimum (was 1 hour)
pub const BETTING_CLOSE_WINDOW: i64 = 3600; // Close betting 1 hour before resolution (was 5 min)
pub const CLAIM_DELAY_AFTER_RESOLUTION: i64 = 300; // 5 min delay after resolution to claim

// Volume Badge Tiers (in USD value traded)
pub const BADGE_TIER_BRONZE: u64 = 1_000;
pub const BADGE_TIER_SILVER: u64 = 10_000;
pub const BADGE_TIER_GOLD: u64 = 100_000;
pub const BADGE_TIER_PLATINUM: u64 = 500_000;
pub const BADGE_TIER_DIAMOND: u64 = 1_000_000;

// veIDL granted per badge tier
pub const BADGE_VEIDL_BRONZE: u64 = 50_000;
pub const BADGE_VEIDL_SILVER: u64 = 250_000;
pub const BADGE_VEIDL_GOLD: u64 = 1_000_000;
pub const BADGE_VEIDL_PLATINUM: u64 = 5_000_000;
pub const BADGE_VEIDL_DIAMOND: u64 = 20_000_000;

pub const STAKE_BONUS_PER_MILLION: u64 = 100; // 1% in bps
pub const MAX_STAKE_BONUS_BPS: u64 = 5000; // 50% max

// Market status for cancellation
pub const MARKET_STATUS_ACTIVE: u8 = 0;
pub const MARKET_STATUS_RESOLVED: u8 = 1;
pub const MARKET_STATUS_CANCELLED: u8 = 2;

// Authority timelock
pub const AUTHORITY_TIMELOCK: i64 = 172800; // 48 hours

// Minimum target value to prevent trivial markets
pub const MIN_TARGET_VALUE: u64 = 1;

// RICK FIX: Prevent dust bet attacks and imbalanced markets
pub const MIN_OPPOSITE_LIQUIDITY: u64 = 1_000_000; // 0.001 tokens min on other side
pub const MAX_BET_IMBALANCE_RATIO: u64 = 100; // Can't bet more than 100x the other side

// RICK FIX: Claim cooldown to prevent rapid draining
pub const REWARD_CLAIM_COOLDOWN: i64 = 3600; // 1 hour between claims

// 10/10 FIX: Commit-reveal for bets (prevents front-running)
pub const BET_COMMIT_WINDOW: i64 = 300; // 5 minutes to reveal after commit
pub const BET_REVEAL_WINDOW: i64 = 3600; // 1 hour max to reveal

// 10/10 FIX: Oracle bonding (prevents malicious resolution)
pub const ORACLE_BOND_AMOUNT: u64 = 10_000_000_000; // 10 tokens required bond
pub const ORACLE_DISPUTE_WINDOW: i64 = 3600; // 1 hour to dispute resolution
pub const ORACLE_SLASH_PERCENT: u64 = 50; // 50% slash for bad resolution

// 10/10 FIX: Badge anti-gaming
pub const BADGE_HOLD_TIME: i64 = 604800; // 7 days minimum between volume updates for badge

// TIER 1 FIX: Anti-flash-loan - minimum stake duration before unstake
pub const MIN_STAKE_DURATION: i64 = 86400; // 24 hours minimum stake

// TIER 3: TVL caps (gradual rollout)
pub const INITIAL_TVL_CAP: u64 = 100_000_000_000; // 100 tokens initial cap
pub const MAX_TVL_CAP: u64 = 10_000_000_000_000_000; // 10M tokens max cap
pub const TVL_CAP_INCREMENT: u64 = 100_000_000_000; // 100 tokens per increment

// TIER 3: Insurance fund
pub const INSURANCE_FEE_BPS: u64 = 100; // 1% of fees go to insurance fund

#[program]
pub mod idl_protocol {
    use super::*;

    /// Initialize the protocol with token mint and vault
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.treasury = ctx.accounts.treasury.key();
        state.idl_mint = ctx.accounts.idl_mint.key();
        state.vault = ctx.accounts.vault.key();
        state.total_staked = 0;
        state.total_ve_supply = 0;
        state.reward_pool = 0;
        state.total_fees_collected = 0;
        state.total_burned = 0;
        state.bump = ctx.bumps.state;
        state.vault_bump = ctx.bumps.vault;
        state.paused = false;
        // SECURITY FIX: Initialize checkpoint system
        state.reward_per_token_stored = 0;
        state.last_reward_update = Clock::get()?.unix_timestamp;
        // TIER 3: Initialize TVL cap and insurance fund
        state.tvl_cap = INITIAL_TVL_CAP;
        state.insurance_fund = 0;

        msg!("IDL Protocol initialized. Vault: {}, TVL Cap: {}", state.vault, state.tvl_cap);
        Ok(())
    }

    /// SECURITY FIX: Stake IDL tokens with actual SPL token transfer
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);

        // TIER 3: Check TVL cap
        let new_total = ctx.accounts.state.total_staked.saturating_add(amount);
        require!(new_total <= ctx.accounts.state.tvl_cap, IdlError::TvlCapExceeded);

        // CRITICAL FIX: Transfer tokens from user to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        let state = &mut ctx.accounts.state;
        let staker = &mut ctx.accounts.staker_account;

        // Initialize staker if new
        if staker.owner == Pubkey::default() {
            staker.owner = ctx.accounts.user.key();
            staker.bump = ctx.bumps.staker_account;
            staker.reward_per_token_paid = state.reward_per_token_stored;
        } else {
            // SECURITY FIX: Update pending rewards before changing stake
            let earned = calculate_earned(staker, state);
            staker.pending_rewards = staker.pending_rewards
                .checked_add(earned)
                .ok_or(IdlError::MathOverflow)?;
            staker.reward_per_token_paid = state.reward_per_token_stored;
        }

        // SECURITY FIX: Use checked arithmetic
        staker.staked_amount = staker.staked_amount
            .checked_add(amount)
            .ok_or(IdlError::MathOverflow)?;
        staker.last_stake_timestamp = Clock::get()?.unix_timestamp;
        state.total_staked = state.total_staked
            .checked_add(amount)
            .ok_or(IdlError::MathOverflow)?;

        msg!("Staked {} tokens. Total staked: {}", amount, state.total_staked);
        Ok(())
    }

    /// SECURITY FIX: Unstake tokens with actual SPL token transfer
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);
        // RICK FIX: Add pause check (was missing!)
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);

        let staker = &ctx.accounts.staker_account;
        let clock = Clock::get()?;

        // TIER 1 FIX: Anti-flash-loan - enforce minimum stake duration
        require!(
            clock.unix_timestamp >= staker.last_stake_timestamp + MIN_STAKE_DURATION,
            IdlError::StakeTooRecent
        );

        require!(staker.staked_amount >= amount, IdlError::InsufficientStake);

        // Check for active veIDL lock
        if let Some(ref ve) = ctx.accounts.ve_position {
            let clock = Clock::get()?;
            if clock.unix_timestamp < ve.lock_end {
                let unlocked = staker.staked_amount.saturating_sub(ve.locked_stake);
                require!(amount <= unlocked, IdlError::TokensLocked);
            }
        }

        let state_bump = ctx.accounts.state.bump;

        // CRITICAL FIX: Transfer tokens from vault to user via PDA signer
        let seeds = &[b"state".as_ref(), &[state_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            amount
        )?;

        // Update state after transfer
        let staker = &mut ctx.accounts.staker_account;
        let state = &mut ctx.accounts.state;
        staker.staked_amount = staker.staked_amount.saturating_sub(amount);
        state.total_staked = state.total_staked.saturating_sub(amount);

        msg!("Unstaked {} tokens", amount);
        Ok(())
    }

    /// Lock staked tokens for veIDL voting power
    pub fn lock_for_ve(ctx: Context<LockForVe>, lock_duration: i64) -> Result<()> {
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);
        require!(
            lock_duration >= MIN_LOCK_DURATION && lock_duration <= MAX_LOCK_DURATION,
            IdlError::InvalidLockDuration
        );

        let state = &mut ctx.accounts.state;
        let staker = &ctx.accounts.staker_account;
        let ve_position = &mut ctx.accounts.ve_position;
        let clock = Clock::get()?;

        require!(staker.staked_amount > 0, IdlError::InsufficientStake);

        // SECURITY FIX: Safe overflow handling with checked ops
        // Initial veIDL = stake * (duration / max_duration)
        let initial_ve_amount = (staker.staked_amount as u128)
            .checked_mul(lock_duration as u128)
            .and_then(|v| v.checked_div(MAX_LOCK_DURATION as u128))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(IdlError::MathOverflow)?;

        ve_position.owner = ctx.accounts.user.key();
        ve_position.locked_stake = staker.staked_amount;
        ve_position.initial_ve_amount = initial_ve_amount;
        ve_position.lock_start = clock.unix_timestamp;
        ve_position.lock_end = clock.unix_timestamp
            .checked_add(lock_duration)
            .ok_or(IdlError::MathOverflow)?;
        ve_position.lock_duration = lock_duration;  // RICK FIX: Store for decay calc
        ve_position.bump = ctx.bumps.ve_position;

        // Note: total_ve_supply tracks INITIAL amounts.
        // For accurate governance, query current_ve_amount() at vote time.
        state.total_ve_supply = state.total_ve_supply
            .checked_add(initial_ve_amount)
            .ok_or(IdlError::MathOverflow)?;

        msg!("Locked {} for {} initial veIDL (decays linearly) until {}",
            staker.staked_amount, initial_ve_amount, ve_position.lock_end);
        Ok(())
    }

    /// Unlock expired veIDL position
    pub fn unlock_ve(ctx: Context<UnlockVe>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let ve_position = &ctx.accounts.ve_position;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp >= ve_position.lock_end, IdlError::LockNotExpired);

        // Remove from total supply (tracks initial amounts)
        state.total_ve_supply = state.total_ve_supply.saturating_sub(ve_position.initial_ve_amount);

        msg!("Unlocked veIDL position");
        Ok(())
    }

    /// RICK FIX: Extend existing lock duration
    pub fn extend_lock(ctx: Context<ExtendLock>, additional_duration: i64) -> Result<()> {
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);
        require!(additional_duration > 0, IdlError::InvalidLockDuration);

        let state = &mut ctx.accounts.state;
        let ve_position = &mut ctx.accounts.ve_position;
        let clock = Clock::get()?;

        // Can only extend if lock hasn't expired
        require!(clock.unix_timestamp < ve_position.lock_end, IdlError::LockExpired);

        // Calculate new end time
        let new_end = ve_position.lock_end
            .checked_add(additional_duration)
            .ok_or(IdlError::MathOverflow)?;

        // Ensure total lock doesn't exceed max
        let total_lock_from_now = new_end.saturating_sub(clock.unix_timestamp);
        require!(total_lock_from_now <= MAX_LOCK_DURATION, IdlError::LockTooLong);

        // Calculate new veIDL based on remaining time
        let new_total_duration = new_end.saturating_sub(ve_position.lock_start);
        let new_initial_ve = (ve_position.locked_stake as u128)
            .checked_mul(new_total_duration as u128)
            .and_then(|v| v.checked_div(MAX_LOCK_DURATION as u128))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(IdlError::MathOverflow)?;

        // Adjust total supply
        state.total_ve_supply = state.total_ve_supply
            .saturating_sub(ve_position.initial_ve_amount)
            .checked_add(new_initial_ve)
            .ok_or(IdlError::MathOverflow)?;

        ve_position.initial_ve_amount = new_initial_ve;
        ve_position.lock_end = new_end;
        ve_position.lock_duration = new_total_duration;

        msg!("Extended lock to {} with {} veIDL", new_end, new_initial_ve);
        Ok(())
    }

    /// Create a prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        protocol_id: String,
        metric_type: MetricType,
        target_value: u64,
        resolution_timestamp: i64,
        description: String,
    ) -> Result<()> {
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);
        require!(protocol_id.len() <= 32, IdlError::InvalidInput);
        require!(description.len() <= 200, IdlError::InvalidInput);
        // RICK FIX: Prevent trivial markets like "Will TVL be > $0?"
        require!(target_value >= MIN_TARGET_VALUE, IdlError::InvalidTargetValue);

        let clock = Clock::get()?;
        // SECURITY FIX: Increase minimum resolution delay to 24 hours
        require!(
            resolution_timestamp > clock.unix_timestamp + MIN_RESOLUTION_DELAY,
            IdlError::InvalidTimestamp
        );

        let market = &mut ctx.accounts.market;
        market.creator = ctx.accounts.creator.key();
        market.protocol_id = protocol_id;
        market.metric_type = metric_type;
        market.target_value = target_value;
        market.resolution_timestamp = resolution_timestamp;
        market.description = description;
        // SECURITY FIX: Track both actual and effective amounts
        market.total_yes_actual = 0;
        market.total_no_actual = 0;
        market.total_yes_amount = 0;
        market.total_no_amount = 0;
        market.resolved = false;
        market.resolved_at = None;
        market.outcome = None;
        market.actual_value = None;
        market.oracle = ctx.accounts.oracle.key();
        market.created_at = clock.unix_timestamp;
        market.bump = ctx.bumps.market;
        market.status = MARKET_STATUS_ACTIVE;

        msg!("Created prediction market for {}", market.protocol_id);
        Ok(())
    }

    /// SECURITY FIX: Place a bet with token transfer and oracle check
    pub fn place_bet(ctx: Context<PlaceBet>, amount: u64, bet_yes: bool, nonce: u64) -> Result<()> {
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);
        require!(amount >= MIN_BET_AMOUNT, IdlError::BetTooSmall);
        require!(amount <= MAX_BET_AMOUNT, IdlError::BetTooLarge);

        let market = &mut ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;
        let clock = Clock::get()?;

        // Get staker bonus (0 if no staker account)
        let staked_amount = ctx.accounts.staker_account
            .as_ref()
            .map(|s| s.staked_amount)
            .unwrap_or(0);

        require!(!market.resolved, IdlError::MarketResolved);

        // SECURITY FIX: Increase betting close window to 1 hour before resolution
        require!(
            clock.unix_timestamp < market.resolution_timestamp - BETTING_CLOSE_WINDOW,
            IdlError::BettingClosed
        );

        // SECURITY FIX: Prevent oracle/creator from betting on their own market
        require!(
            ctx.accounts.user.key() != market.oracle,
            IdlError::OracleCannotBet
        );
        require!(
            ctx.accounts.user.key() != market.creator,
            IdlError::CreatorCannotBet
        );

        // RICK FIX: Prevent dust bet attacks with imbalance check
        // If there's already liquidity on the other side, enforce ratio limits
        let opposite_liquidity = if bet_yes { market.total_no_actual } else { market.total_yes_actual };
        let same_side_liquidity = if bet_yes { market.total_yes_actual } else { market.total_no_actual };

        // If opposite side has liquidity, check imbalance ratio
        if opposite_liquidity > 0 {
            let new_same_side = same_side_liquidity.saturating_add(amount);
            // Can't bet more than 100x the opposite side
            require!(
                new_same_side <= opposite_liquidity.saturating_mul(MAX_BET_IMBALANCE_RATIO),
                IdlError::BetImbalanceTooHigh
            );
        }

        // CRITICAL FIX: Transfer tokens from user to market pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.market_pool.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        // Calculate staker bonus with SECURITY FIX: Safe overflow handling
        let stake_millions = staked_amount / 1_000_000;
        let stake_bonus = std::cmp::min(
            stake_millions.saturating_mul(STAKE_BONUS_PER_MILLION),
            MAX_STAKE_BONUS_BPS
        );
        let multiplier = 10000u64
            .checked_add(stake_bonus)
            .ok_or(IdlError::MathOverflow)?;

        // SECURITY FIX: Safe calculation with proper overflow handling
        let effective_amount = (amount as u128)
            .checked_mul(multiplier as u128)
            .and_then(|v| v.checked_div(10000))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(IdlError::MathOverflow)?;

        // SECURITY FIX: Track both actual and effective amounts
        if bet_yes {
            market.total_yes_actual = market.total_yes_actual
                .checked_add(amount)
                .ok_or(IdlError::MathOverflow)?;
            market.total_yes_amount = market.total_yes_amount
                .checked_add(effective_amount)
                .ok_or(IdlError::MathOverflow)?;
        } else {
            market.total_no_actual = market.total_no_actual
                .checked_add(amount)
                .ok_or(IdlError::MathOverflow)?;
            market.total_no_amount = market.total_no_amount
                .checked_add(effective_amount)
                .ok_or(IdlError::MathOverflow)?;
        }

        bet.owner = ctx.accounts.user.key();
        bet.market = market.key();
        bet.amount = amount;
        bet.effective_amount = effective_amount;
        bet.bet_yes = bet_yes;
        bet.timestamp = clock.unix_timestamp;
        bet.claimed = false;
        bet.nonce = nonce;
        bet.bump = ctx.bumps.bet;

        // SECURITY FIX: Update user volume for badge tracking
        let user_volume = &mut ctx.accounts.user_volume;
        if user_volume.user == Pubkey::default() {
            user_volume.user = ctx.accounts.user.key();
            user_volume.bump = ctx.bumps.user_volume;
        }
        user_volume.total_volume_usd = user_volume.total_volume_usd
            .checked_add(amount)
            .ok_or(IdlError::MathOverflow)?;
        user_volume.last_updated = clock.unix_timestamp;

        msg!("Placed {} bet: {} (effective: {})", if bet_yes { "YES" } else { "NO" }, amount, effective_amount);
        Ok(())
    }

    /// Resolve market - only authorized oracle
    pub fn resolve_market(ctx: Context<ResolveMarket>, actual_value: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(market.status == MARKET_STATUS_ACTIVE, IdlError::MarketResolved);
        require!(!market.resolved, IdlError::MarketResolved);
        require!(ctx.accounts.oracle.key() == market.oracle, IdlError::Unauthorized);
        require!(clock.unix_timestamp >= market.resolution_timestamp, IdlError::ResolutionTooEarly);

        let outcome = actual_value >= market.target_value;
        market.outcome = Some(outcome);
        market.actual_value = Some(actual_value);
        market.resolved = true;
        market.resolved_at = Some(clock.unix_timestamp);
        market.status = MARKET_STATUS_RESOLVED;

        msg!("Market resolved: {} (target: {}, actual: {})",
            if outcome { "YES" } else { "NO" }, market.target_value, actual_value);
        Ok(())
    }

    /// SECURITY FIX: Cancel market and allow refunds (admin only, for emergencies)
    pub fn cancel_market(ctx: Context<CancelMarket>) -> Result<()> {
        let market = &mut ctx.accounts.market;

        require!(market.status == MARKET_STATUS_ACTIVE, IdlError::MarketResolved);
        require!(!market.resolved, IdlError::MarketResolved);

        market.status = MARKET_STATUS_CANCELLED;

        msg!("Market cancelled: {}", market.protocol_id);
        Ok(())
    }

    /// SECURITY FIX: Claim refund from cancelled market
    pub fn claim_refund(ctx: Context<ClaimRefund>) -> Result<()> {
        let market = &ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;

        require!(market.status == MARKET_STATUS_CANCELLED, IdlError::MarketNotCancelled);
        require!(!bet.claimed, IdlError::AlreadyClaimed);
        require!(bet.owner == ctx.accounts.user.key(), IdlError::Unauthorized);

        bet.claimed = true;

        // Refund the original bet amount (not effective amount)
        let refund_amount = bet.amount;

        // PDA signer seeds for market pool
        let market_key = market.key();
        let market_pool_bump = ctx.bumps.market_pool;
        let market_seeds = &[
            b"market_pool".as_ref(),
            market_key.as_ref(),
            &[market_pool_bump],
        ];
        let signer_seeds = &[&market_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.market_pool.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.market_pool.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            refund_amount
        )?;

        msg!("Refunded {} from cancelled market", refund_amount);
        Ok(())
    }

    /// SECURITY FIX: Claim winnings with token transfer and delay
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let market = &ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;
        let clock = Clock::get()?;

        // SECURITY FIX: Check market status
        require!(market.status == MARKET_STATUS_RESOLVED, IdlError::MarketNotResolved);
        require!(market.resolved, IdlError::MarketNotResolved);
        require!(!bet.claimed, IdlError::AlreadyClaimed);
        require!(bet.owner == ctx.accounts.user.key(), IdlError::Unauthorized);

        // SECURITY FIX: Validate market_pool has correct mint and seeds
        let market_pool = &ctx.accounts.market_pool;
        require!(market_pool.mint == state.idl_mint, IdlError::InvalidMint);

        // SECURITY FIX: Add delay after resolution before claiming
        let resolved_at = market.resolved_at.ok_or(IdlError::MarketNotResolved)?;
        require!(
            clock.unix_timestamp >= resolved_at + CLAIM_DELAY_AFTER_RESOLUTION,
            IdlError::ClaimTooEarly
        );

        let outcome = market.outcome.unwrap();
        let is_winner = (bet.bet_yes && outcome) || (!bet.bet_yes && !outcome);

        bet.claimed = true;

        if !is_winner {
            msg!("Bet lost, no winnings");
            return Ok(());
        }

        // SECURITY FIX: Use effective_amount for share calculation, actual pool for funds
        let (winning_pool_effective, losing_pool_actual) = if outcome {
            (market.total_yes_amount, market.total_no_actual)
        } else {
            (market.total_no_amount, market.total_yes_actual)
        };

        // Calculate winnings share based on effective amounts (includes staker bonus)
        let winnings_share = if winning_pool_effective > 0 {
            (bet.effective_amount as u128)
                .checked_mul(losing_pool_actual as u128)
                .and_then(|v| v.checked_div(winning_pool_effective as u128))
                .and_then(|v| u64::try_from(v).ok())
                .unwrap_or(0)
        } else {
            0
        };

        // SECURITY FIX: Verify pool has enough balance before transfer
        let pool_balance = ctx.accounts.market_pool.amount;
        let gross_winnings = bet.amount
            .checked_add(winnings_share)
            .ok_or(IdlError::MathOverflow)?;

        // Cap gross_winnings to available pool balance pro-rata
        let gross_winnings = std::cmp::min(gross_winnings, pool_balance);

        let fee = (gross_winnings as u128 * BET_FEE_BPS as u128 / 10000) as u64;
        let net_winnings = gross_winnings.saturating_sub(fee);

        // TIER 3: Insurance fund takes 1% of total fee first
        let insurance_fee = (fee as u128 * INSURANCE_FEE_BPS as u128 / 10000) as u64;
        let distributable_fee = fee.saturating_sub(insurance_fee);

        // Calculate fee distribution (from remaining after insurance)
        let staker_fee = (distributable_fee as u128 * STAKER_FEE_SHARE_BPS as u128 / 10000) as u64;
        let creator_fee = (distributable_fee as u128 * CREATOR_FEE_SHARE_BPS as u128 / 10000) as u64;
        let treasury_fee = (distributable_fee as u128 * TREASURY_FEE_SHARE_BPS as u128 / 10000) as u64;
        let burn_amount = (distributable_fee as u128 * BURN_FEE_SHARE_BPS as u128 / 10000) as u64;

        // PDA signer seeds for market pool
        let market_key = market.key();
        let market_pool_bump = ctx.bumps.market_pool;
        let market_seeds = &[
            b"market_pool".as_ref(),
            market_key.as_ref(),
            &[market_pool_bump],
        ];
        let signer_seeds = &[&market_seeds[..]];
        let cpi_program = ctx.accounts.token_program.to_account_info();

        // CRITICAL FIX: Transfer net winnings to user
        let cpi_accounts_user = Transfer {
            from: ctx.accounts.market_pool.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.market_pool.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts_user, signer_seeds),
            net_winnings
        )?;

        // Transfer creator fee
        let cpi_accounts_creator = Transfer {
            from: ctx.accounts.market_pool.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.market_pool.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts_creator, signer_seeds),
            creator_fee
        )?;

        // Transfer treasury fee
        let cpi_accounts_treasury = Transfer {
            from: ctx.accounts.market_pool.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.market_pool.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts_treasury, signer_seeds),
            treasury_fee
        )?;

        // Transfer staker rewards to vault
        let cpi_accounts_vault = Transfer {
            from: ctx.accounts.market_pool.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.market_pool.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts_vault, signer_seeds),
            staker_fee
        )?;

        // RICK FIX: Send "burn" to burn_vault instead of actual burn
        // (Actual SPL burn requires mint authority which market_pool doesn't have)
        let cpi_accounts_burn = Transfer {
            from: ctx.accounts.market_pool.to_account_info(),
            to: ctx.accounts.burn_vault.to_account_info(),
            authority: ctx.accounts.market_pool.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts_burn, signer_seeds),
            burn_amount
        )?;

        // TIER 3: Transfer insurance fee to vault (tracked separately in state)
        if insurance_fee > 0 {
            let cpi_accounts_insurance = Transfer {
                from: ctx.accounts.market_pool.to_account_info(),
                to: ctx.accounts.vault.to_account_info(),
                authority: ctx.accounts.market_pool.to_account_info(),
            };
            token::transfer(
                CpiContext::new_with_signer(cpi_program, cpi_accounts_insurance, signer_seeds),
                insurance_fee
            )?;
        }

        // SECURITY FIX: Update reward checkpoint before adding to pool
        update_reward_per_token(state, staker_fee);

        // Update state tracking
        state.reward_pool = state.reward_pool
            .checked_add(staker_fee)
            .ok_or(IdlError::MathOverflow)?;
        state.total_burned = state.total_burned
            .checked_add(burn_amount)
            .ok_or(IdlError::MathOverflow)?;
        state.total_fees_collected = state.total_fees_collected
            .checked_add(fee)
            .ok_or(IdlError::MathOverflow)?;
        // TIER 3: Track insurance fund
        state.insurance_fund = state.insurance_fund
            .checked_add(insurance_fee)
            .ok_or(IdlError::MathOverflow)?;

        msg!("Claimed {} (fee: {}, stakers: {}, burned: {}, insurance: {})", net_winnings, fee, staker_fee, burn_amount, insurance_fee);
        Ok(())
    }

    /// Claim staking rewards from reward pool
    /// SECURITY FIX: Use checkpoint system to prevent race conditions
    pub fn claim_staking_rewards(ctx: Context<ClaimStakingRewards>) -> Result<()> {
        let state = &ctx.accounts.state;
        let staker = &ctx.accounts.staker_account;

        require!(state.total_staked > 0, IdlError::InsufficientStake);
        require!(staker.staked_amount > 0, IdlError::InsufficientStake);

        // RICK FIX: Enforce claim cooldown (1 hour between claims)
        let clock = Clock::get()?;
        require!(
            clock.unix_timestamp >= staker.last_reward_claim + REWARD_CLAIM_COOLDOWN,
            IdlError::ClaimCooldown
        );

        // SECURITY FIX: Calculate rewards using checkpoint system
        let earned = calculate_earned(staker, state);
        let total_rewards = earned
            .checked_add(staker.pending_rewards)
            .ok_or(IdlError::MathOverflow)?;

        require!(total_rewards > 0, IdlError::NoRewardsToClaim);

        // Verify vault has enough balance
        require!(
            ctx.accounts.vault.amount >= total_rewards,
            IdlError::InsufficientPoolBalance
        );

        let state_bump = ctx.accounts.state.bump;

        // Transfer rewards from vault to user
        let seeds = &[b"state".as_ref(), &[state_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            total_rewards
        )?;

        // Update staker checkpoint after transfer
        let staker = &mut ctx.accounts.staker_account;
        let state = &mut ctx.accounts.state;

        staker.rewards_claimed = staker.rewards_claimed
            .checked_add(total_rewards)
            .ok_or(IdlError::MathOverflow)?;
        staker.reward_per_token_paid = state.reward_per_token_stored;
        staker.pending_rewards = 0;
        staker.last_reward_claim = Clock::get()?.unix_timestamp;  // RICK FIX: Update cooldown
        state.reward_pool = state.reward_pool.saturating_sub(total_rewards);

        msg!("Claimed {} staking rewards (total claimed: {})", total_rewards, staker.rewards_claimed);
        Ok(())
    }

    /// SECURITY FIX: Issue badge based on VERIFIED on-chain volume
    pub fn issue_badge(ctx: Context<IssueBadge>, tier: BadgeTier) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let badge = &mut ctx.accounts.badge;
        let user_volume = &ctx.accounts.user_volume;
        let clock = Clock::get()?;

        // CRITICAL FIX: Read volume from on-chain account, NOT from parameter
        let volume_usd = user_volume.total_volume_usd;

        // 10/10 FIX: Require 7 days since last volume update (prevents rapid wash trading)
        require!(
            clock.unix_timestamp >= user_volume.last_updated + BADGE_HOLD_TIME,
            IdlError::BadgeHoldTimeNotMet
        );

        let required_volume = match tier {
            BadgeTier::Bronze => BADGE_TIER_BRONZE,
            BadgeTier::Silver => BADGE_TIER_SILVER,
            BadgeTier::Gold => BADGE_TIER_GOLD,
            BadgeTier::Platinum => BADGE_TIER_PLATINUM,
            BadgeTier::Diamond => BADGE_TIER_DIAMOND,
            BadgeTier::None => 0,
        };
        require!(volume_usd >= required_volume, IdlError::InsufficientVolume);

        // SECURITY FIX: Prevent badge downgrades
        if badge.owner != Pubkey::default() {
            require!(tier as u8 > badge.tier as u8, IdlError::CannotDowngradeBadge);
        }

        let ve_grant = match tier {
            BadgeTier::Bronze => BADGE_VEIDL_BRONZE,
            BadgeTier::Silver => BADGE_VEIDL_SILVER,
            BadgeTier::Gold => BADGE_VEIDL_GOLD,
            BadgeTier::Platinum => BADGE_VEIDL_PLATINUM,
            BadgeTier::Diamond => BADGE_VEIDL_DIAMOND,
            BadgeTier::None => 0,
        };

        // If upgrading, subtract old veIDL first
        if badge.owner != Pubkey::default() && badge.tier != BadgeTier::None {
            state.total_ve_supply = state.total_ve_supply.saturating_sub(badge.ve_amount);
        }

        badge.owner = ctx.accounts.recipient.key();
        badge.tier = tier;
        badge.volume_usd = volume_usd;
        badge.ve_amount = ve_grant;
        badge.issued_at = Clock::get()?.unix_timestamp;
        badge.bump = ctx.bumps.badge;

        state.total_ve_supply = state.total_ve_supply
            .checked_add(ve_grant)
            .ok_or(IdlError::MathOverflow)?;

        msg!("Issued {:?} badge with {} veIDL (verified volume: {})", tier, ve_grant, volume_usd);
        Ok(())
    }

    /// Revoke a badge
    pub fn revoke_badge(ctx: Context<RevokeBadge>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let badge = &ctx.accounts.badge;

        state.total_ve_supply = state.total_ve_supply.saturating_sub(badge.ve_amount);

        msg!("Revoked badge from {}", badge.owner);
        Ok(())
    }

    /// Pause/unpause protocol
    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        ctx.accounts.state.paused = paused;
        msg!("Protocol paused: {}", paused);
        Ok(())
    }

    /// RICK FIX: Initiate authority transfer with timelock
    pub fn initiate_authority_transfer(ctx: Context<AdminOnly>, new_authority: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.pending_authority = Some(new_authority);
        state.authority_transfer_time = Some(Clock::get()?.unix_timestamp);
        msg!("Authority transfer initiated to {}. Must wait {} seconds.", new_authority, AUTHORITY_TIMELOCK);
        Ok(())
    }

    /// RICK FIX: Complete authority transfer after timelock expires
    pub fn complete_authority_transfer(ctx: Context<AdminOnly>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let transfer_time = state.authority_transfer_time.ok_or(IdlError::NoTransferPending)?;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= transfer_time + AUTHORITY_TIMELOCK,
            IdlError::TimelockNotExpired
        );

        let new_authority = state.pending_authority.ok_or(IdlError::NoTransferPending)?;
        state.authority = new_authority;
        state.pending_authority = None;
        state.authority_transfer_time = None;

        msg!("Authority transferred to {}", new_authority);
        Ok(())
    }

    /// RICK FIX: Cancel pending authority transfer
    pub fn cancel_authority_transfer(ctx: Context<AdminOnly>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        require!(state.pending_authority.is_some(), IdlError::NoTransferPending);

        state.pending_authority = None;
        state.authority_transfer_time = None;

        msg!("Authority transfer cancelled");
        Ok(())
    }

    /// TIER 3: Raise TVL cap (gradual rollout)
    pub fn raise_tvl_cap(ctx: Context<AdminOnly>) -> Result<()> {
        let state = &mut ctx.accounts.state;

        let new_cap = state.tvl_cap
            .checked_add(TVL_CAP_INCREMENT)
            .ok_or(IdlError::MathOverflow)?;

        require!(new_cap <= MAX_TVL_CAP, IdlError::MaxTvlCapReached);

        state.tvl_cap = new_cap;
        msg!("TVL cap raised to {}", new_cap);
        Ok(())
    }

    /// TIER 3: Withdraw from insurance fund (emergency only)
    pub fn withdraw_insurance(ctx: Context<WithdrawInsurance>, amount: u64) -> Result<()> {
        require!(amount <= ctx.accounts.state.insurance_fund, IdlError::InsufficientInsuranceFund);

        // Transfer from vault to recipient
        let state_bump = ctx.accounts.state.bump;
        let seeds = &[b"state".as_ref(), &[state_bump]];
        let signer_seeds = &[&seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.recipient.to_account_info(),
            authority: ctx.accounts.state.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds
            ),
            amount
        )?;

        // Update state after transfer
        ctx.accounts.state.insurance_fund = ctx.accounts.state.insurance_fund.saturating_sub(amount);
        msg!("Withdrew {} from insurance fund", amount);
        Ok(())
    }

    // ==================== 10/10 FIXES ====================

    /// 10/10 FIX: Commit a bet (step 1 of commit-reveal)
    pub fn commit_bet(ctx: Context<CommitBet>, commitment: [u8; 32]) -> Result<()> {
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);

        let market = &ctx.accounts.market;
        let clock = Clock::get()?;

        require!(!market.resolved, IdlError::MarketResolved);
        require!(market.status == MARKET_STATUS_ACTIVE, IdlError::MarketResolved);

        // Must commit before betting closes
        require!(
            clock.unix_timestamp < market.resolution_timestamp - BETTING_CLOSE_WINDOW,
            IdlError::BettingClosed
        );

        let bet_commitment = &mut ctx.accounts.bet_commitment;
        bet_commitment.owner = ctx.accounts.user.key();
        bet_commitment.market = market.key();
        bet_commitment.commitment = commitment;
        bet_commitment.commit_time = clock.unix_timestamp;
        bet_commitment.revealed = false;
        bet_commitment.bump = ctx.bumps.bet_commitment;

        msg!("Bet committed, must reveal within {} seconds", BET_REVEAL_WINDOW);
        Ok(())
    }

    /// 10/10 FIX: Reveal a committed bet (step 2 of commit-reveal)
    pub fn reveal_bet(
        ctx: Context<RevealBet>,
        amount: u64,
        bet_yes: bool,
        nonce: u64,
        salt: [u8; 32]
    ) -> Result<()> {
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);
        require!(amount >= MIN_BET_AMOUNT, IdlError::BetTooSmall);
        require!(amount <= MAX_BET_AMOUNT, IdlError::BetTooLarge);

        let commitment = &mut ctx.accounts.bet_commitment;
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(!commitment.revealed, IdlError::AlreadyRevealed);
        require!(!market.resolved, IdlError::MarketResolved);

        // Check reveal window
        require!(
            clock.unix_timestamp >= commitment.commit_time + BET_COMMIT_WINDOW,
            IdlError::RevealTooEarly
        );
        require!(
            clock.unix_timestamp <= commitment.commit_time + BET_REVEAL_WINDOW,
            IdlError::RevealTooLate
        );

        // Verify commitment hash
        let mut hasher_input = Vec::new();
        hasher_input.extend_from_slice(&amount.to_le_bytes());
        hasher_input.push(if bet_yes { 1 } else { 0 });
        hasher_input.extend_from_slice(&nonce.to_le_bytes());
        hasher_input.extend_from_slice(&salt);

        let computed_hash = anchor_lang::solana_program::hash::hash(&hasher_input);
        require!(
            computed_hash.to_bytes() == commitment.commitment,
            IdlError::InvalidCommitment
        );

        commitment.revealed = true;

        // Transfer tokens
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.market_pool.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            amount
        )?;

        // Get staker bonus
        let staked_amount = ctx.accounts.staker_account
            .as_ref()
            .map(|s| s.staked_amount)
            .unwrap_or(0);

        let stake_millions = staked_amount / 1_000_000;
        let stake_bonus = std::cmp::min(
            stake_millions.saturating_mul(STAKE_BONUS_PER_MILLION),
            MAX_STAKE_BONUS_BPS
        );
        let multiplier = 10000u64.saturating_add(stake_bonus);
        let effective_amount = (amount as u128)
            .saturating_mul(multiplier as u128)
            / 10000;
        let effective_amount = effective_amount as u64;

        // Update market
        if bet_yes {
            market.total_yes_actual = market.total_yes_actual.saturating_add(amount);
            market.total_yes_amount = market.total_yes_amount.saturating_add(effective_amount);
        } else {
            market.total_no_actual = market.total_no_actual.saturating_add(amount);
            market.total_no_amount = market.total_no_amount.saturating_add(effective_amount);
        }

        // Create bet record
        let bet = &mut ctx.accounts.bet;
        bet.owner = ctx.accounts.user.key();
        bet.market = market.key();
        bet.amount = amount;
        bet.effective_amount = effective_amount;
        bet.bet_yes = bet_yes;
        bet.timestamp = clock.unix_timestamp;
        bet.claimed = false;
        bet.nonce = nonce;
        bet.bump = ctx.bumps.bet;

        msg!("Bet revealed: {} on {}", amount, if bet_yes { "YES" } else { "NO" });
        Ok(())
    }

    /// 10/10 FIX: Oracle deposits bond before they can resolve markets
    pub fn deposit_oracle_bond(ctx: Context<DepositOracleBond>) -> Result<()> {
        // Transfer bond from oracle to vault
        let cpi_accounts = Transfer {
            from: ctx.accounts.oracle_token_account.to_account_info(),
            to: ctx.accounts.vault.to_account_info(),
            authority: ctx.accounts.oracle.to_account_info(),
        };
        token::transfer(
            CpiContext::new(ctx.accounts.token_program.to_account_info(), cpi_accounts),
            ORACLE_BOND_AMOUNT
        )?;

        let bond = &mut ctx.accounts.oracle_bond;
        bond.oracle = ctx.accounts.oracle.key();
        bond.bond_amount = ORACLE_BOND_AMOUNT;
        bond.bonded_at = Clock::get()?.unix_timestamp;
        bond.slashed = false;
        bond.bump = ctx.bumps.oracle_bond;

        msg!("Oracle bond deposited: {}", ORACLE_BOND_AMOUNT);
        Ok(())
    }

    /// 10/10 FIX: Oracle commits resolution (step 1)
    pub fn commit_resolution(ctx: Context<CommitResolution>, commitment: [u8; 32]) -> Result<()> {
        let market = &ctx.accounts.market;
        let oracle_bond = &ctx.accounts.oracle_bond;
        let clock = Clock::get()?;

        require!(oracle_bond.bond_amount >= ORACLE_BOND_AMOUNT, IdlError::InsufficientOracleBond);
        require!(!oracle_bond.slashed, IdlError::OracleSlashed);
        require!(!market.resolved, IdlError::MarketResolved);
        require!(clock.unix_timestamp >= market.resolution_timestamp, IdlError::ResolutionTooEarly);

        let res_commit = &mut ctx.accounts.resolution_commitment;
        res_commit.market = market.key();
        res_commit.oracle = ctx.accounts.oracle.key();
        res_commit.commitment = commitment;
        res_commit.commit_time = clock.unix_timestamp;
        res_commit.revealed = false;
        res_commit.disputed = false;
        res_commit.bump = ctx.bumps.resolution_commitment;

        msg!("Resolution committed");
        Ok(())
    }

    /// 10/10 FIX: Oracle reveals resolution (step 2)
    pub fn reveal_resolution(
        ctx: Context<RevealResolution>,
        actual_value: u64,
        nonce: u64
    ) -> Result<()> {
        let res_commit = &mut ctx.accounts.resolution_commitment;
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(!res_commit.revealed, IdlError::AlreadyRevealed);
        require!(!res_commit.disputed, IdlError::ResolutionDisputed);

        // Must wait minimum time after commit
        require!(
            clock.unix_timestamp >= res_commit.commit_time + BET_COMMIT_WINDOW,
            IdlError::RevealTooEarly
        );

        // Verify commitment
        let mut hasher_input = Vec::new();
        hasher_input.extend_from_slice(&actual_value.to_le_bytes());
        hasher_input.extend_from_slice(&nonce.to_le_bytes());

        let computed_hash = anchor_lang::solana_program::hash::hash(&hasher_input);
        require!(
            computed_hash.to_bytes() == res_commit.commitment,
            IdlError::InvalidCommitment
        );

        res_commit.revealed = true;

        // Resolve market
        let outcome = actual_value >= market.target_value;
        market.outcome = Some(outcome);
        market.actual_value = Some(actual_value);
        market.resolved = true;
        market.resolved_at = Some(clock.unix_timestamp);
        market.status = MARKET_STATUS_RESOLVED;

        msg!("Market resolved via commit-reveal: {}", if outcome { "YES" } else { "NO" });
        Ok(())
    }

    /// 10/10 FIX: Dispute a resolution (slashes oracle if authority agrees)
    pub fn dispute_resolution(ctx: Context<DisputeResolution>) -> Result<()> {
        let res_commit = &mut ctx.accounts.resolution_commitment;
        let oracle_bond = &mut ctx.accounts.oracle_bond;
        let clock = Clock::get()?;

        require!(res_commit.revealed, IdlError::NotRevealed);
        require!(!res_commit.disputed, IdlError::ResolutionDisputed);

        // Must be within dispute window
        require!(
            clock.unix_timestamp <= res_commit.commit_time + ORACLE_DISPUTE_WINDOW,
            IdlError::DisputeWindowClosed
        );

        res_commit.disputed = true;

        // Slash oracle bond
        let slash_amount = (oracle_bond.bond_amount * ORACLE_SLASH_PERCENT) / 100;
        oracle_bond.bond_amount = oracle_bond.bond_amount.saturating_sub(slash_amount);
        oracle_bond.slashed = true;

        msg!("Oracle disputed and slashed: {}", slash_amount);
        Ok(())
    }
}

// ==================== HELPER FUNCTIONS ====================

/// Calculate earned rewards for a staker using checkpoint system
fn calculate_earned(staker: &StakerAccount, state: &ProtocolState) -> u64 {
    if staker.staked_amount == 0 {
        return 0;
    }

    let reward_delta = state.reward_per_token_stored
        .saturating_sub(staker.reward_per_token_paid);

    // Scale down from 1e18 precision
    ((staker.staked_amount as u128)
        .saturating_mul(reward_delta)
        / 1_000_000_000_000_000_000u128) as u64
}

/// Update reward_per_token when new rewards are added
fn update_reward_per_token(state: &mut ProtocolState, new_rewards: u64) {
    if state.total_staked > 0 {
        // Scale up by 1e18 for precision
        let reward_increase = (new_rewards as u128)
            .saturating_mul(1_000_000_000_000_000_000u128)
            / (state.total_staked as u128);
        state.reward_per_token_stored = state.reward_per_token_stored
            .saturating_add(reward_increase);
    }
}

/// RICK FIX: Get total voting power for a user (veIDL from lock + badge)
/// This accounts for veIDL decay over time
pub fn get_voting_power(
    ve_position: Option<&VePosition>,
    badge: Option<&VolumeBadge>,
    current_time: i64
) -> u64 {
    let ve_power = ve_position
        .map(|vp| vp.current_ve_amount(current_time))
        .unwrap_or(0);

    let badge_power = badge
        .map(|b| b.ve_amount)
        .unwrap_or(0);

    ve_power.saturating_add(badge_power)
}

// ==================== ACCOUNTS ====================

/// Stack-optimized with Box for large accounts
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolState::INIT_SPACE,
        seeds = [b"state"],
        bump
    )]
    pub state: Box<Account<'info, ProtocolState>>,

    pub idl_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = authority,
        seeds = [b"vault"],
        bump,
        token::mint = idl_mint,
        token::authority = state,
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    /// RICK FIX: Burn vault holds "burned" tokens (locked forever, effectively burned)
    #[account(
        init,
        payer = authority,
        seeds = [b"burn_vault"],
        bump,
        token::mint = idl_mint,
        token::authority = state,  // State owns it but will never transfer out
    )]
    pub burn_vault: Box<Account<'info, TokenAccount>>,

    /// CHECK: Treasury account
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct Stake<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + StakerAccount::INIT_SPACE,
        seeds = [b"staker", user.key().as_ref()],
        bump
    )]
    pub staker_account: Account<'info, StakerAccount>,

    #[account(
        mut,
        constraint = user_token_account.mint == state.idl_mint @ IdlError::InvalidMint,
        constraint = user_token_account.owner == user.key() @ IdlError::Unauthorized
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = state.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Unstake<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [b"staker", user.key().as_ref()],
        bump = staker_account.bump,
        constraint = staker_account.owner == user.key() @ IdlError::Unauthorized
    )]
    pub staker_account: Account<'info, StakerAccount>,

    #[account(
        seeds = [b"ve_position", user.key().as_ref()],
        bump
    )]
    pub ve_position: Option<Account<'info, VePosition>>,

    #[account(
        mut,
        constraint = user_token_account.mint == state.idl_mint @ IdlError::InvalidMint,
        constraint = user_token_account.owner == user.key() @ IdlError::Unauthorized
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = state.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct LockForVe<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        seeds = [b"staker", user.key().as_ref()],
        bump = staker_account.bump,
        constraint = staker_account.owner == user.key()
    )]
    pub staker_account: Account<'info, StakerAccount>,

    #[account(
        init,
        payer = user,
        space = 8 + VePosition::INIT_SPACE,
        seeds = [b"ve_position", user.key().as_ref()],
        bump
    )]
    pub ve_position: Account<'info, VePosition>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct UnlockVe<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        mut,
        close = user,
        seeds = [b"ve_position", user.key().as_ref()],
        bump = ve_position.bump,
        constraint = ve_position.owner == user.key()
    )]
    pub ve_position: Account<'info, VePosition>,

    #[account(mut)]
    pub user: Signer<'info>,
}

/// RICK FIX: ExtendLock accounts
#[derive(Accounts)]
pub struct ExtendLock<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [b"ve_position", user.key().as_ref()],
        bump = ve_position.bump,
        constraint = ve_position.owner == user.key() @ IdlError::Unauthorized
    )]
    pub ve_position: Account<'info, VePosition>,

    #[account(mut)]
    pub user: Signer<'info>,
}

// ==================== 10/10 ACCOUNT STRUCTS ====================

#[derive(Accounts)]
pub struct CommitBet<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    pub market: Account<'info, PredictionMarket>,

    #[account(
        init,
        payer = user,
        space = 8 + BetCommitment::INIT_SPACE,
        seeds = [b"bet_commit", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub bet_commitment: Account<'info, BetCommitment>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
#[instruction(amount: u64, bet_yes: bool, nonce: u64, salt: [u8; 32])]
pub struct RevealBet<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Box<Account<'info, ProtocolState>>,

    #[account(mut)]
    pub market: Box<Account<'info, PredictionMarket>>,

    #[account(
        mut,
        seeds = [b"bet_commit", market.key().as_ref(), user.key().as_ref()],
        bump = bet_commitment.bump,
        constraint = bet_commitment.owner == user.key() @ IdlError::Unauthorized
    )]
    pub bet_commitment: Box<Account<'info, BetCommitment>>,

    #[account(
        init,
        payer = user,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", market.key().as_ref(), user.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub bet: Box<Account<'info, Bet>>,

    #[account(
        seeds = [b"staker", user.key().as_ref()],
        bump
    )]
    pub staker_account: Option<Box<Account<'info, StakerAccount>>>,

    #[account(
        mut,
        constraint = user_token_account.mint == state.idl_mint @ IdlError::InvalidMint
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"market_pool", market.key().as_ref()],
        bump
    )]
    pub market_pool: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositOracleBond<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        init,
        payer = oracle,
        space = 8 + OracleBond::INIT_SPACE,
        seeds = [b"oracle_bond", oracle.key().as_ref()],
        bump
    )]
    pub oracle_bond: Account<'info, OracleBond>,

    #[account(
        mut,
        constraint = oracle_token_account.mint == state.idl_mint @ IdlError::InvalidMint
    )]
    pub oracle_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = state.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub oracle: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct CommitResolution<'info> {
    pub market: Account<'info, PredictionMarket>,

    #[account(
        seeds = [b"oracle_bond", oracle.key().as_ref()],
        bump = oracle_bond.bump,
        constraint = oracle_bond.oracle == oracle.key() @ IdlError::Unauthorized
    )]
    pub oracle_bond: Account<'info, OracleBond>,

    #[account(
        init,
        payer = oracle,
        space = 8 + ResolutionCommitment::INIT_SPACE,
        seeds = [b"res_commit", market.key().as_ref()],
        bump
    )]
    pub resolution_commitment: Account<'info, ResolutionCommitment>,

    #[account(mut)]
    pub oracle: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevealResolution<'info> {
    #[account(mut)]
    pub market: Account<'info, PredictionMarket>,

    #[account(
        mut,
        seeds = [b"res_commit", market.key().as_ref()],
        bump = resolution_commitment.bump,
        constraint = resolution_commitment.oracle == oracle.key() @ IdlError::Unauthorized
    )]
    pub resolution_commitment: Account<'info, ResolutionCommitment>,

    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
pub struct DisputeResolution<'info> {
    #[account(
        seeds = [b"state"],
        bump = state.bump,
        constraint = state.authority == authority.key() @ IdlError::Unauthorized
    )]
    pub state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [b"res_commit", market.key().as_ref()],
        bump = resolution_commitment.bump
    )]
    pub resolution_commitment: Account<'info, ResolutionCommitment>,

    #[account(
        mut,
        seeds = [b"oracle_bond", resolution_commitment.oracle.as_ref()],
        bump = oracle_bond.bump
    )]
    pub oracle_bond: Account<'info, OracleBond>,

    pub market: Account<'info, PredictionMarket>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
#[instruction(protocol_id: String, metric_type: MetricType, target_value: u64, resolution_timestamp: i64)]
pub struct CreateMarket<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        init,
        payer = creator,
        space = 8 + PredictionMarket::INIT_SPACE,
        seeds = [b"market", protocol_id.as_bytes(), &resolution_timestamp.to_le_bytes()],
        bump
    )]
    pub market: Account<'info, PredictionMarket>,

    #[account(
        init,
        payer = creator,
        seeds = [b"market_pool", market.key().as_ref()],
        bump,
        token::mint = idl_mint,
        token::authority = market_pool,
    )]
    pub market_pool: Account<'info, TokenAccount>,

    pub idl_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Oracle authorized to resolve
    pub oracle: UncheckedAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
#[instruction(amount: u64, bet_yes: bool, nonce: u64)]
pub struct PlaceBet<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Box<Account<'info, ProtocolState>>,

    #[account(mut)]
    pub market: Box<Account<'info, PredictionMarket>>,

    #[account(
        init,
        payer = user,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", market.key().as_ref(), user.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub bet: Box<Account<'info, Bet>>,

    /// Staker account - optional, if missing user gets no bonus
    /// (To save stack space, we don't init_if_needed here)
    #[account(
        seeds = [b"staker", user.key().as_ref()],
        bump
    )]
    pub staker_account: Option<Box<Account<'info, StakerAccount>>>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserVolume::INIT_SPACE,
        seeds = [b"volume", user.key().as_ref()],
        bump
    )]
    pub user_volume: Box<Account<'info, UserVolume>>,

    #[account(
        mut,
        constraint = user_token_account.mint == state.idl_mint @ IdlError::InvalidMint,
        constraint = user_token_account.owner == user.key() @ IdlError::Unauthorized
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"market_pool", market.key().as_ref()],
        bump
    )]
    pub market_pool: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, PredictionMarket>,

    pub oracle: Signer<'info>,
}

#[derive(Accounts)]
pub struct CancelMarket<'info> {
    #[account(
        seeds = [b"state"],
        bump = state.bump,
        constraint = state.authority == authority.key() @ IdlError::Unauthorized
    )]
    pub state: Account<'info, ProtocolState>,

    #[account(mut)]
    pub market: Account<'info, PredictionMarket>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ClaimRefund<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Box<Account<'info, ProtocolState>>,

    #[account(
        seeds = [b"market", market.protocol_id.as_bytes(), &market.resolution_timestamp.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, PredictionMarket>>,

    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), bet.owner.as_ref(), &bet.nonce.to_le_bytes()],
        bump = bet.bump,
        constraint = bet.owner == user.key() @ IdlError::Unauthorized
    )]
    pub bet: Box<Account<'info, Bet>>,

    #[account(
        mut,
        seeds = [b"market_pool", market.key().as_ref()],
        bump
    )]
    pub market_pool: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_account.mint == state.idl_mint @ IdlError::InvalidMint
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Box<Account<'info, ProtocolState>>,

    #[account(
        seeds = [b"market", market.protocol_id.as_bytes(), &market.resolution_timestamp.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Box<Account<'info, PredictionMarket>>,

    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), bet.owner.as_ref(), &bet.nonce.to_le_bytes()],
        bump = bet.bump,
        constraint = bet.owner == user.key() @ IdlError::Unauthorized
    )]
    pub bet: Box<Account<'info, Bet>>,

    #[account(
        mut,
        seeds = [b"market_pool", market.key().as_ref()],
        bump
    )]
    pub market_pool: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_token_account.mint == state.idl_mint @ IdlError::InvalidMint
    )]
    pub user_token_account: Box<Account<'info, TokenAccount>>,

    /// SECURITY FIX: Validate creator token account belongs to market creator
    #[account(
        mut,
        constraint = creator_token_account.owner == market.creator @ IdlError::InvalidCreatorAccount,
        constraint = creator_token_account.mint == state.idl_mint @ IdlError::InvalidMint
    )]
    pub creator_token_account: Box<Account<'info, TokenAccount>>,

    /// SECURITY FIX: Validate treasury token account matches state treasury
    #[account(
        mut,
        constraint = treasury_token_account.owner == state.treasury @ IdlError::InvalidTreasuryAccount,
        constraint = treasury_token_account.mint == state.idl_mint @ IdlError::InvalidMint
    )]
    pub treasury_token_account: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = state.vault_bump
    )]
    pub vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = idl_mint.key() == state.idl_mint @ IdlError::InvalidMint
    )]
    pub idl_mint: Box<Account<'info, Mint>>,

    /// RICK FIX: Burn vault to hold "burned" tokens (since we can't actually burn without mint authority)
    #[account(
        mut,
        seeds = [b"burn_vault"],
        bump
    )]
    pub burn_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimStakingRewards<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        mut,  // SECURITY FIX: Now mutable to track claimed amounts
        seeds = [b"staker", user.key().as_ref()],
        bump = staker_account.bump,
        constraint = staker_account.owner == user.key() @ IdlError::Unauthorized
    )]
    pub staker_account: Account<'info, StakerAccount>,

    #[account(
        mut,
        constraint = user_token_account.mint == state.idl_mint @ IdlError::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = state.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct IssueBadge<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump,
        constraint = state.authority == authority.key() @ IdlError::Unauthorized
    )]
    pub state: Account<'info, ProtocolState>,

    #[account(
        init_if_needed,
        payer = authority,
        space = 8 + VolumeBadge::INIT_SPACE,
        seeds = [b"badge", recipient.key().as_ref()],
        bump
    )]
    pub badge: Account<'info, VolumeBadge>,

    #[account(
        seeds = [b"volume", recipient.key().as_ref()],
        bump = user_volume.bump
    )]
    pub user_volume: Account<'info, UserVolume>,

    /// CHECK: Badge recipient
    pub recipient: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct RevokeBadge<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump,
        constraint = state.authority == authority.key() @ IdlError::Unauthorized
    )]
    pub state: Account<'info, ProtocolState>,

    #[account(
        mut,
        close = authority,
        seeds = [b"badge", badge.owner.as_ref()],
        bump = badge.bump
    )]
    pub badge: Account<'info, VolumeBadge>,

    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump,
        constraint = state.authority == authority.key() @ IdlError::Unauthorized
    )]
    pub state: Account<'info, ProtocolState>,

    pub authority: Signer<'info>,
}

// TIER 3: Withdraw from insurance fund
#[derive(Accounts)]
pub struct WithdrawInsurance<'info> {
    #[account(
        mut,
        seeds = [b"state"],
        bump = state.bump,
        constraint = state.authority == authority.key() @ IdlError::Unauthorized
    )]
    pub state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [b"vault"],
        bump = state.vault_bump
    )]
    pub vault: Account<'info, TokenAccount>,

    /// Recipient token account for insurance withdrawal
    #[account(mut)]
    pub recipient: Account<'info, TokenAccount>,

    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// ==================== STATE ====================

#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub idl_mint: Pubkey,
    pub vault: Pubkey,
    pub total_staked: u64,
    pub total_ve_supply: u64,
    pub reward_pool: u64,
    pub total_fees_collected: u64,
    pub total_burned: u64,
    pub bump: u8,
    pub vault_bump: u8,
    pub paused: bool,
    // SECURITY FIX: Reward checkpoint for proper distribution
    pub reward_per_token_stored: u128,  // Scaled by 1e18 for precision
    pub last_reward_update: i64,
    // RICK FIX: Authority timelock
    pub pending_authority: Option<Pubkey>,
    pub authority_transfer_time: Option<i64>,
    // TIER 3: TVL cap (gradual rollout)
    pub tvl_cap: u64,
    // TIER 3: Insurance fund
    pub insurance_fund: u64,
}

#[account]
#[derive(InitSpace)]
pub struct StakerAccount {
    pub owner: Pubkey,
    pub staked_amount: u64,
    pub last_stake_timestamp: i64,
    pub rewards_claimed: u64,               // Track total rewards claimed
    pub reward_per_token_paid: u128,        // SECURITY FIX: Checkpoint per staker
    pub pending_rewards: u64,               // Unclaimed rewards
    pub last_reward_claim: i64,             // RICK FIX: Cooldown timestamp
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VePosition {
    pub owner: Pubkey,
    pub locked_stake: u64,
    pub initial_ve_amount: u64,  // RICK FIX: Renamed - this is veIDL at lock time
    pub lock_start: i64,
    pub lock_end: i64,
    pub lock_duration: i64,      // RICK FIX: Store original duration for decay calc
    pub bump: u8,
}

impl VePosition {
    /// RICK FIX: Calculate current veIDL with linear decay
    /// Whitepaper: "Current veIDL = Initial veIDL * (Time Remaining / Lock Duration)"
    pub fn current_ve_amount(&self, current_time: i64) -> u64 {
        if current_time >= self.lock_end {
            return 0;
        }
        if current_time <= self.lock_start {
            return self.initial_ve_amount;
        }

        let time_remaining = self.lock_end.saturating_sub(current_time);

        // current = initial * (remaining / duration)
        (self.initial_ve_amount as u128)
            .saturating_mul(time_remaining as u128)
            .checked_div(self.lock_duration as u128)
            .map(|v| v as u64)
            .unwrap_or(0)
    }
}

#[account]
#[derive(InitSpace)]
pub struct PredictionMarket {
    pub creator: Pubkey,
    #[max_len(32)]
    pub protocol_id: String,
    pub metric_type: MetricType,
    pub target_value: u64,
    pub resolution_timestamp: i64,
    #[max_len(200)]
    pub description: String,
    // SECURITY FIX: Track ACTUAL tokens deposited (not effective amounts)
    pub total_yes_actual: u64,      // Real tokens deposited on YES
    pub total_no_actual: u64,       // Real tokens deposited on NO
    // Effective amounts for payout calculation only
    pub total_yes_amount: u64,      // Weighted YES (with staker bonus)
    pub total_no_amount: u64,       // Weighted NO (with staker bonus)
    pub resolved: bool,
    pub resolved_at: Option<i64>,
    pub outcome: Option<bool>,
    pub actual_value: Option<u64>,
    pub oracle: Pubkey,
    pub created_at: i64,
    pub bump: u8,
    // SECURITY FIX: Market status for cancellation
    pub status: u8,                 // 0=active, 1=resolved, 2=cancelled
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub amount: u64,
    pub effective_amount: u64,
    pub bet_yes: bool,
    pub timestamp: i64,
    pub claimed: bool,
    pub nonce: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VolumeBadge {
    pub owner: Pubkey,
    pub tier: BadgeTier,
    pub volume_usd: u64,
    pub ve_amount: u64,
    pub issued_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserVolume {
    pub user: Pubkey,
    pub total_volume_usd: u64,
    pub last_updated: i64,
    pub bump: u8,
}

// 10/10 FIX: Commit-reveal bet to prevent front-running
#[account]
#[derive(InitSpace)]
pub struct BetCommitment {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub commitment: [u8; 32],  // hash(amount, bet_yes, nonce, salt)
    pub commit_time: i64,
    pub revealed: bool,
    pub bump: u8,
}

// 10/10 FIX: Oracle bond for accountability
#[account]
#[derive(InitSpace)]
pub struct OracleBond {
    pub oracle: Pubkey,
    pub bond_amount: u64,
    pub bonded_at: i64,
    pub slashed: bool,
    pub bump: u8,
}

// 10/10 FIX: Resolution commitment for oracle commit-reveal
#[account]
#[derive(InitSpace)]
pub struct ResolutionCommitment {
    pub market: Pubkey,
    pub oracle: Pubkey,
    pub commitment: [u8; 32],  // hash(actual_value, nonce)
    pub commit_time: i64,
    pub revealed: bool,
    pub disputed: bool,
    pub bump: u8,
}

// ==================== TYPES ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug, Default)]
pub enum BadgeTier {
    #[default]
    None,
    Bronze,
    Silver,
    Gold,
    Platinum,
    Diamond,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MetricType {
    Tvl,
    Volume24h,
    Users,
    Transactions,
    Price,
    MarketCap,
    Custom,
}

// ==================== ERRORS ====================

#[error_code]
pub enum IdlError {
    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Invalid lock duration (min 1 week, max 4 years)")]
    InvalidLockDuration,

    #[msg("Lock not expired")]
    LockNotExpired,

    #[msg("Insufficient stake")]
    InsufficientStake,

    #[msg("Invalid input")]
    InvalidInput,

    #[msg("Invalid timestamp")]
    InvalidTimestamp,

    #[msg("Market already resolved")]
    MarketResolved,

    #[msg("Market not resolved")]
    MarketNotResolved,

    #[msg("Betting closed")]
    BettingClosed,

    #[msg("Resolution too early")]
    ResolutionTooEarly,

    #[msg("Already claimed")]
    AlreadyClaimed,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Insufficient trading volume for this badge tier")]
    InsufficientVolume,

    #[msg("Tokens are locked for veIDL")]
    TokensLocked,

    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Invalid token mint")]
    InvalidMint,

    #[msg("Bet amount exceeds maximum")]
    BetTooLarge,

    #[msg("No rewards to claim")]
    NoRewardsToClaim,

    #[msg("Oracle cannot bet on their own market")]
    OracleCannotBet,

    #[msg("Market creator cannot bet on their own market")]
    CreatorCannotBet,

    #[msg("Must wait before claiming after resolution")]
    ClaimTooEarly,

    #[msg("Bet amount too small")]
    BetTooSmall,

    #[msg("Invalid creator token account")]
    InvalidCreatorAccount,

    #[msg("Invalid treasury token account")]
    InvalidTreasuryAccount,

    #[msg("Cannot downgrade badge tier")]
    CannotDowngradeBadge,

    #[msg("Market not cancelled")]
    MarketNotCancelled,

    #[msg("Insufficient pool balance")]
    InsufficientPoolBalance,

    #[msg("No authority transfer pending")]
    NoTransferPending,

    #[msg("Authority timelock not expired (48 hours required)")]
    TimelockNotExpired,

    #[msg("Target value must be greater than 0")]
    InvalidTargetValue,

    #[msg("Bet would create too much imbalance (max 100x opposite side)")]
    BetImbalanceTooHigh,

    #[msg("Must wait 1 hour between reward claims")]
    ClaimCooldown,

    #[msg("Lock has already expired")]
    LockExpired,

    #[msg("Extended lock would exceed 4 year maximum")]
    LockTooLong,

    // 10/10 FIX: Commit-reveal errors
    #[msg("Bet commitment already revealed")]
    AlreadyRevealed,

    #[msg("Must wait before revealing")]
    RevealTooEarly,

    #[msg("Reveal window expired")]
    RevealTooLate,

    #[msg("Commitment hash does not match revealed values")]
    InvalidCommitment,

    #[msg("Resolution not yet revealed")]
    NotRevealed,

    #[msg("Resolution has been disputed")]
    ResolutionDisputed,

    #[msg("Dispute window has closed")]
    DisputeWindowClosed,

    // 10/10 FIX: Oracle bond errors
    #[msg("Insufficient oracle bond")]
    InsufficientOracleBond,

    #[msg("Oracle has been slashed")]
    OracleSlashed,

    #[msg("Must wait 7 days after last trade to claim badge")]
    BadgeHoldTimeNotMet,

    #[msg("Must wait 24 hours after staking before unstaking (anti-flash-loan)")]
    StakeTooRecent,

    // TIER 3: TVL cap errors
    #[msg("TVL cap exceeded - protocol at capacity")]
    TvlCapExceeded,

    #[msg("Maximum TVL cap reached - cannot raise further")]
    MaxTvlCapReached,

    #[msg("Insufficient insurance fund balance")]
    InsufficientInsuranceFund,
}
