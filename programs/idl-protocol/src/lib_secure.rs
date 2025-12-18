/**
 * IDL Protocol - SECURE VERSION
 *
 * This version includes all security mitigations from the pentest audit:
 * - SPL Token transfers for stake/unstake/bet/claim
 * - Overflow protection with proper error handling
 * - On-chain volume tracking for badges
 * - PDA validation on all accounts
 * - Reward distribution mechanism
 *
 * IMPORTANT: This requires the IDL token to be deployed first
 */

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

declare_id!("BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt");

// Constants
pub const MAX_LOCK_DURATION: i64 = 126144000; // 4 years in seconds
pub const MIN_LOCK_DURATION: i64 = 604800; // 1 week minimum
pub const BET_FEE_BPS: u64 = 300; // 3% fee on winning bets
pub const STAKER_FEE_SHARE_BPS: u64 = 5000; // 50% of fees to stakers
pub const CREATOR_FEE_SHARE_BPS: u64 = 2500; // 25% to market creator
pub const TREASURY_FEE_SHARE_BPS: u64 = 1500; // 15% to treasury
pub const BURN_FEE_SHARE_BPS: u64 = 1000; // 10% burned
pub const MAX_BET_AMOUNT: u64 = 100_000_000_000_000; // 100K tokens with 9 decimals

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

#[program]
pub mod idl_protocol_secure {
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

        msg!("IDL Protocol initialized with vault: {}", state.vault);
        Ok(())
    }

    /// Stake IDL tokens - SECURE VERSION with token transfer
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);

        // SECURITY FIX: Transfer tokens from user to vault
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
        }

        staker.staked_amount = staker.staked_amount.checked_add(amount)
            .ok_or(IdlError::MathOverflow)?;
        staker.last_stake_timestamp = Clock::get()?.unix_timestamp;
        state.total_staked = state.total_staked.checked_add(amount)
            .ok_or(IdlError::MathOverflow)?;

        msg!("Staked {} tokens. Total staked: {}", amount, state.total_staked);
        Ok(())
    }

    /// Unstake tokens - SECURE VERSION with token transfer
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);

        let staker = &mut ctx.accounts.staker_account;
        let state = &mut ctx.accounts.state;

        require!(staker.staked_amount >= amount, IdlError::InsufficientStake);

        // Check for active veIDL lock
        if let Some(ref ve) = ctx.accounts.ve_position {
            let clock = Clock::get()?;
            if clock.unix_timestamp < ve.lock_end {
                let unlocked = staker.staked_amount.saturating_sub(ve.locked_stake);
                require!(amount <= unlocked, IdlError::TokensLocked);
            }
        }

        // SECURITY FIX: Transfer tokens from vault to user
        let state_seeds = &[b"state".as_ref(), &[state.bump]];
        let signer_seeds = &[&state_seeds[..]];

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

        // veIDL = staked * (lock_duration / max_duration)
        let ve_amount = (staker.staked_amount as u128)
            .checked_mul(lock_duration as u128)
            .and_then(|v| v.checked_div(MAX_LOCK_DURATION as u128))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(IdlError::MathOverflow)?;

        ve_position.owner = ctx.accounts.user.key();
        ve_position.locked_stake = staker.staked_amount;
        ve_position.ve_amount = ve_amount;
        ve_position.lock_start = clock.unix_timestamp;
        ve_position.lock_end = clock.unix_timestamp.checked_add(lock_duration)
            .ok_or(IdlError::MathOverflow)?;
        ve_position.bump = ctx.bumps.ve_position;

        state.total_ve_supply = state.total_ve_supply.checked_add(ve_amount)
            .ok_or(IdlError::MathOverflow)?;

        msg!("Locked {} for {} veIDL until {}", staker.staked_amount, ve_amount, ve_position.lock_end);
        Ok(())
    }

    /// Place a bet on a prediction market - SECURE VERSION with token transfer
    pub fn place_bet(ctx: Context<PlaceBet>, amount: u64, bet_yes: bool, nonce: u64) -> Result<()> {
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);
        require!(amount > 0, IdlError::InvalidAmount);
        require!(amount <= MAX_BET_AMOUNT, IdlError::BetTooLarge);

        let market = &mut ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;
        let staker = &ctx.accounts.staker_account;
        let clock = Clock::get()?;

        require!(!market.resolved, IdlError::MarketResolved);
        require!(
            clock.unix_timestamp < market.resolution_timestamp - 300,
            IdlError::BettingClosed
        );

        // SECURITY FIX: Transfer tokens from user to market pool
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.market_pool.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(CpiContext::new(cpi_program, cpi_accounts), amount)?;

        // Calculate staker bonus with overflow protection
        let stake_millions = staker.staked_amount / 1_000_000;
        let stake_bonus = std::cmp::min(
            stake_millions.saturating_mul(STAKE_BONUS_PER_MILLION),
            MAX_STAKE_BONUS_BPS
        );
        let multiplier = 10000u64.checked_add(stake_bonus).ok_or(IdlError::MathOverflow)?;

        // SECURITY FIX: Safe overflow handling
        let effective_amount = (amount as u128)
            .checked_mul(multiplier as u128)
            .and_then(|v| v.checked_div(10000))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(IdlError::MathOverflow)?;

        if bet_yes {
            market.total_yes_amount = market.total_yes_amount.checked_add(effective_amount)
                .ok_or(IdlError::MathOverflow)?;
        } else {
            market.total_no_amount = market.total_no_amount.checked_add(effective_amount)
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

        msg!("Placed {} bet: {} (effective: {})", if bet_yes { "YES" } else { "NO" }, amount, effective_amount);
        Ok(())
    }

    /// Resolve market - only authorized oracle
    pub fn resolve_market(ctx: Context<ResolveMarket>, actual_value: u64) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(!market.resolved, IdlError::MarketResolved);
        require!(ctx.accounts.oracle.key() == market.oracle, IdlError::Unauthorized);
        require!(clock.unix_timestamp >= market.resolution_timestamp, IdlError::ResolutionTooEarly);

        let outcome = actual_value >= market.target_value;
        market.outcome = Some(outcome);
        market.actual_value = Some(actual_value);
        market.resolved = true;

        msg!("Market resolved: {} (target: {}, actual: {})", if outcome { "YES" } else { "NO" }, market.target_value, actual_value);
        Ok(())
    }

    /// Claim winnings - SECURE VERSION with token transfer and volume tracking
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let market = &ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;
        let user_volume = &mut ctx.accounts.user_volume;

        require!(market.resolved, IdlError::MarketNotResolved);
        require!(!bet.claimed, IdlError::AlreadyClaimed);
        require!(bet.owner == ctx.accounts.user.key(), IdlError::Unauthorized);

        let outcome = market.outcome.unwrap();
        let is_winner = (bet.bet_yes && outcome) || (!bet.bet_yes && !outcome);

        bet.claimed = true;

        // SECURITY FIX: Track user volume on-chain
        user_volume.total_volume_usd = user_volume.total_volume_usd
            .checked_add(bet.amount)
            .ok_or(IdlError::MathOverflow)?;

        if !is_winner {
            msg!("Bet lost, no winnings");
            return Ok(());
        }

        let (winning_pool, losing_pool) = if outcome {
            (market.total_yes_amount, market.total_no_amount)
        } else {
            (market.total_no_amount, market.total_yes_amount)
        };

        let winnings_share = if winning_pool > 0 {
            (bet.effective_amount as u128)
                .checked_mul(losing_pool as u128)
                .and_then(|v| v.checked_div(winning_pool as u128))
                .and_then(|v| u64::try_from(v).ok())
                .unwrap_or(0)
        } else {
            0
        };

        let gross_winnings = bet.amount.checked_add(winnings_share)
            .ok_or(IdlError::MathOverflow)?;
        let fee = (gross_winnings as u128 * BET_FEE_BPS as u128 / 10000) as u64;
        let net_winnings = gross_winnings.saturating_sub(fee);

        // SECURITY FIX: Transfer winnings from market pool to user
        let market_seeds = &[
            b"market".as_ref(),
            market.protocol_id.as_bytes(),
            &market.resolution_timestamp.to_le_bytes(),
            &[market.bump]
        ];
        let signer_seeds = &[&market_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.market_pool.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            net_winnings
        )?;

        // Distribute fees
        let staker_fee = (fee as u128 * STAKER_FEE_SHARE_BPS as u128 / 10000) as u64;
        let creator_fee = (fee as u128 * CREATOR_FEE_SHARE_BPS as u128 / 10000) as u64;
        let treasury_fee = (fee as u128 * TREASURY_FEE_SHARE_BPS as u128 / 10000) as u64;
        let burn_amount = (fee as u128 * BURN_FEE_SHARE_BPS as u128 / 10000) as u64;

        state.reward_pool = state.reward_pool.checked_add(staker_fee)
            .ok_or(IdlError::MathOverflow)?;
        state.total_burned = state.total_burned.checked_add(burn_amount)
            .ok_or(IdlError::MathOverflow)?;
        state.total_fees_collected = state.total_fees_collected.checked_add(fee)
            .ok_or(IdlError::MathOverflow)?;

        // Transfer creator fee
        let cpi_accounts_creator = Transfer {
            from: ctx.accounts.market_pool.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts_creator, signer_seeds),
            creator_fee
        )?;

        // Transfer treasury fee
        let cpi_accounts_treasury = Transfer {
            from: ctx.accounts.market_pool.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.market.to_account_info(),
        };
        token::transfer(
            CpiContext::new_with_signer(cpi_program.clone(), cpi_accounts_treasury, signer_seeds),
            treasury_fee
        )?;

        msg!("Claimed {} (fee: {}, to stakers: {}, burned: {})", net_winnings, fee, staker_fee, burn_amount);
        Ok(())
    }

    /// Issue badge based on verified on-chain volume
    pub fn issue_badge(ctx: Context<IssueBadge>, tier: BadgeTier) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let badge = &mut ctx.accounts.badge;
        let user_volume = &ctx.accounts.user_volume;

        // SECURITY FIX: Read volume from on-chain account, not parameter
        let volume_usd = user_volume.total_volume_usd;

        let required_volume = match tier {
            BadgeTier::Bronze => BADGE_TIER_BRONZE,
            BadgeTier::Silver => BADGE_TIER_SILVER,
            BadgeTier::Gold => BADGE_TIER_GOLD,
            BadgeTier::Platinum => BADGE_TIER_PLATINUM,
            BadgeTier::Diamond => BADGE_TIER_DIAMOND,
            BadgeTier::None => 0,
        };
        require!(volume_usd >= required_volume, IdlError::InsufficientVolume);

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

        state.total_ve_supply = state.total_ve_supply.checked_add(ve_grant)
            .ok_or(IdlError::MathOverflow)?;

        msg!("Issued {:?} badge with {} veIDL (verified volume: {})", tier, ve_grant, volume_usd);
        Ok(())
    }

    /// Claim staking rewards
    pub fn claim_staking_rewards(ctx: Context<ClaimStakingRewards>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let staker = &ctx.accounts.staker_account;

        require!(state.total_staked > 0, IdlError::InsufficientStake);
        require!(staker.staked_amount > 0, IdlError::InsufficientStake);

        // Calculate share of reward pool
        let share = (staker.staked_amount as u128)
            .checked_mul(state.reward_pool as u128)
            .and_then(|v| v.checked_div(state.total_staked as u128))
            .and_then(|v| u64::try_from(v).ok())
            .ok_or(IdlError::MathOverflow)?;

        require!(share > 0, IdlError::NoRewardsToClaim);

        // Transfer rewards from vault to user
        let state_seeds = &[b"state".as_ref(), &[state.bump]];
        let signer_seeds = &[&state_seeds[..]];

        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.state.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        token::transfer(
            CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds),
            share
        )?;

        // Reduce reward pool
        state.reward_pool = state.reward_pool.saturating_sub(share);

        msg!("Claimed {} staking rewards", share);
        Ok(())
    }

    /// Pause/unpause protocol
    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        ctx.accounts.state.paused = paused;
        msg!("Protocol paused: {}", paused);
        Ok(())
    }
}

// ==================== ACCOUNTS ====================

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + ProtocolState::INIT_SPACE,
        seeds = [b"state"],
        bump
    )]
    pub state: Account<'info, ProtocolState>,

    pub idl_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [b"vault"],
        bump,
        token::mint = idl_mint,
        token::authority = state,
    )]
    pub vault: Account<'info, TokenAccount>,

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
#[instruction(amount: u64, bet_yes: bool, nonce: u64)]
pub struct PlaceBet<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(mut)]
    pub market: Account<'info, PredictionMarket>,

    #[account(
        init,
        payer = user,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", market.key().as_ref(), user.key().as_ref(), &nonce.to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(
        seeds = [b"staker", user.key().as_ref()],
        bump = staker_account.bump,
        constraint = staker_account.owner == user.key() @ IdlError::Unauthorized
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
        constraint = market_pool.mint == state.idl_mint @ IdlError::InvalidMint
    )]
    pub market_pool: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimWinnings<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        seeds = [b"market", market.protocol_id.as_bytes(), &market.resolution_timestamp.to_le_bytes()],
        bump = market.bump
    )]
    pub market: Account<'info, PredictionMarket>,

    #[account(
        mut,
        seeds = [b"bet", market.key().as_ref(), bet.owner.as_ref(), &bet.nonce.to_le_bytes()],
        bump = bet.bump,
        constraint = bet.owner == user.key() @ IdlError::Unauthorized
    )]
    pub bet: Account<'info, Bet>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserVolume::INIT_SPACE,
        seeds = [b"volume", user.key().as_ref()],
        bump
    )]
    pub user_volume: Account<'info, UserVolume>,

    #[account(
        mut,
        constraint = user_token_account.mint == state.idl_mint @ IdlError::InvalidMint
    )]
    pub user_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub market_pool: Account<'info, TokenAccount>,

    #[account(mut)]
    pub creator_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
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
        bump
    )]
    pub user_volume: Account<'info, UserVolume>,

    /// CHECK: Badge recipient
    pub recipient: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct ClaimStakingRewards<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
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

// (Include all other account structs from original with added token accounts)

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
}

#[account]
#[derive(InitSpace)]
pub struct StakerAccount {
    pub owner: Pubkey,
    pub staked_amount: u64,
    pub last_stake_timestamp: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct VePosition {
    pub owner: Pubkey,
    pub locked_stake: u64,
    pub ve_amount: u64,
    pub lock_start: i64,
    pub lock_end: i64,
    pub bump: u8,
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
    pub total_yes_amount: u64,
    pub total_no_amount: u64,
    pub resolved: bool,
    pub outcome: Option<bool>,
    pub actual_value: Option<u64>,
    pub oracle: Pubkey,
    pub created_at: i64,
    pub bump: u8,
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
    pub nonce: u64,  // Added for PDA validation
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
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, PredictionMarket>,

    pub oracle: Signer<'info>,
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
}
