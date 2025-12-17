use anchor_lang::prelude::*;

declare_id!("BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt");

// Constants
pub const MAX_LOCK_DURATION: i64 = 126144000; // 4 years in seconds
pub const MIN_LOCK_DURATION: i64 = 604800; // 1 week minimum
pub const BET_FEE_BPS: u64 = 300; // 3% fee on winning bets
pub const STAKER_FEE_SHARE_BPS: u64 = 5000; // 50% of fees to stakers
pub const CREATOR_FEE_SHARE_BPS: u64 = 2500; // 25% to market creator
pub const TREASURY_FEE_SHARE_BPS: u64 = 1500; // 15% to treasury
pub const BURN_FEE_SHARE_BPS: u64 = 1000; // 10% burned

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
pub mod idl_protocol {
    use super::*;

    /// Initialize the protocol - call once
    pub fn initialize(ctx: Context<Initialize>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.treasury = ctx.accounts.treasury.key();
        state.total_staked = 0;
        state.total_ve_supply = 0;
        state.reward_pool = 0;
        state.total_fees_collected = 0;
        state.total_burned = 0;
        state.bump = ctx.bumps.state;
        state.paused = false;

        msg!("IDL Protocol initialized. Treasury: {}", state.treasury);
        Ok(())
    }

    /// Stake IDL tokens (native SOL for devnet testing)
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);

        let state = &mut ctx.accounts.state;
        let staker = &mut ctx.accounts.staker_account;

        // Initialize staker if new
        if staker.owner == Pubkey::default() {
            staker.owner = ctx.accounts.user.key();
            staker.bump = ctx.bumps.staker_account;
        }

        staker.staked_amount = staker.staked_amount.checked_add(amount).unwrap();
        staker.last_stake_timestamp = Clock::get()?.unix_timestamp;
        state.total_staked = state.total_staked.checked_add(amount).unwrap();

        msg!("Staked {} tokens. Total staked: {}", amount, state.total_staked);
        Ok(())
    }

    /// Unstake tokens
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);

        let staker = &mut ctx.accounts.staker_account;
        let state = &mut ctx.accounts.state;

        require!(staker.staked_amount >= amount, IdlError::InsufficientStake);

        // Check for active veIDL lock
        if ctx.accounts.ve_position.is_some() {
            let ve = ctx.accounts.ve_position.as_ref().unwrap();
            let clock = Clock::get()?;
            if clock.unix_timestamp < ve.lock_end {
                let unlocked = staker.staked_amount.saturating_sub(ve.locked_stake);
                require!(amount <= unlocked, IdlError::TokensLocked);
            }
        }

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
            .unwrap()
            .checked_div(MAX_LOCK_DURATION as u128)
            .unwrap() as u64;

        ve_position.owner = ctx.accounts.user.key();
        ve_position.locked_stake = staker.staked_amount;
        ve_position.ve_amount = ve_amount;
        ve_position.lock_start = clock.unix_timestamp;
        ve_position.lock_end = clock.unix_timestamp.checked_add(lock_duration).unwrap();
        ve_position.bump = ctx.bumps.ve_position;

        state.total_ve_supply = state.total_ve_supply.checked_add(ve_amount).unwrap();

        msg!("Locked {} for {} veIDL until {}", staker.staked_amount, ve_amount, ve_position.lock_end);
        Ok(())
    }

    /// Unlock expired veIDL position
    pub fn unlock_ve(ctx: Context<UnlockVe>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let ve_position = &ctx.accounts.ve_position;
        let clock = Clock::get()?;

        require!(clock.unix_timestamp >= ve_position.lock_end, IdlError::LockNotExpired);

        state.total_ve_supply = state.total_ve_supply.saturating_sub(ve_position.ve_amount);

        msg!("Unlocked veIDL position");
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

        let clock = Clock::get()?;
        require!(
            resolution_timestamp > clock.unix_timestamp + 3600,
            IdlError::InvalidTimestamp
        );

        let market = &mut ctx.accounts.market;
        market.creator = ctx.accounts.creator.key();
        market.protocol_id = protocol_id;
        market.metric_type = metric_type;
        market.target_value = target_value;
        market.resolution_timestamp = resolution_timestamp;
        market.description = description;
        market.total_yes_amount = 0;
        market.total_no_amount = 0;
        market.resolved = false;
        market.outcome = None;
        market.actual_value = None;
        market.oracle = ctx.accounts.oracle.key();
        market.created_at = clock.unix_timestamp;
        market.bump = ctx.bumps.market;

        msg!("Created prediction market for {}", market.protocol_id);
        Ok(())
    }

    /// Place a bet on a prediction market
    pub fn place_bet(ctx: Context<PlaceBet>, amount: u64, bet_yes: bool) -> Result<()> {
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);
        require!(amount > 0, IdlError::InvalidAmount);

        let market = &mut ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;
        let staker = &ctx.accounts.staker_account;
        let clock = Clock::get()?;

        require!(!market.resolved, IdlError::MarketResolved);
        require!(
            clock.unix_timestamp < market.resolution_timestamp - 300,
            IdlError::BettingClosed
        );

        // Calculate staker bonus
        let stake_millions = staker.staked_amount / 1_000_000;
        let stake_bonus = std::cmp::min(
            stake_millions.saturating_mul(STAKE_BONUS_PER_MILLION),
            MAX_STAKE_BONUS_BPS
        );
        let multiplier = 10000u64 + stake_bonus;
        let effective_amount = (amount as u128)
            .checked_mul(multiplier as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;

        if bet_yes {
            market.total_yes_amount = market.total_yes_amount.checked_add(effective_amount).unwrap();
        } else {
            market.total_no_amount = market.total_no_amount.checked_add(effective_amount).unwrap();
        }

        bet.owner = ctx.accounts.user.key();
        bet.market = market.key();
        bet.amount = amount;
        bet.effective_amount = effective_amount;
        bet.bet_yes = bet_yes;
        bet.timestamp = clock.unix_timestamp;
        bet.claimed = false;
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

    /// Claim winnings from resolved market
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let market = &ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;

        require!(market.resolved, IdlError::MarketNotResolved);
        require!(!bet.claimed, IdlError::AlreadyClaimed);
        require!(bet.owner == ctx.accounts.user.key(), IdlError::Unauthorized);

        let outcome = market.outcome.unwrap();
        let is_winner = (bet.bet_yes && outcome) || (!bet.bet_yes && !outcome);

        bet.claimed = true;

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
                .unwrap()
                .checked_div(winning_pool as u128)
                .unwrap() as u64
        } else {
            0
        };

        let gross_winnings = bet.amount.checked_add(winnings_share).unwrap();
        let fee = (gross_winnings as u128 * BET_FEE_BPS as u128 / 10000) as u64;
        let net_winnings = gross_winnings.saturating_sub(fee);

        // Track fees
        let staker_fee = (fee as u128 * STAKER_FEE_SHARE_BPS as u128 / 10000) as u64;
        let burn_amount = (fee as u128 * BURN_FEE_SHARE_BPS as u128 / 10000) as u64;

        state.reward_pool = state.reward_pool.checked_add(staker_fee).unwrap();
        state.total_burned = state.total_burned.checked_add(burn_amount).unwrap();
        state.total_fees_collected = state.total_fees_collected.checked_add(fee).unwrap();

        msg!("Claimed {} (fee: {}, to stakers: {}, burned: {})", net_winnings, fee, staker_fee, burn_amount);
        Ok(())
    }

    /// Issue a volume badge
    pub fn issue_badge(ctx: Context<IssueBadge>, tier: BadgeTier, volume_usd: u64) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let badge = &mut ctx.accounts.badge;

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
        if badge.tier != BadgeTier::None {
            let old_ve = match badge.tier {
                BadgeTier::Bronze => BADGE_VEIDL_BRONZE,
                BadgeTier::Silver => BADGE_VEIDL_SILVER,
                BadgeTier::Gold => BADGE_VEIDL_GOLD,
                BadgeTier::Platinum => BADGE_VEIDL_PLATINUM,
                BadgeTier::Diamond => BADGE_VEIDL_DIAMOND,
                BadgeTier::None => 0,
            };
            state.total_ve_supply = state.total_ve_supply.saturating_sub(old_ve);
        }

        badge.owner = ctx.accounts.recipient.key();
        badge.tier = tier;
        badge.volume_usd = volume_usd;
        badge.ve_amount = ve_grant;
        badge.issued_at = Clock::get()?.unix_timestamp;
        badge.bump = ctx.bumps.badge;

        state.total_ve_supply = state.total_ve_supply.checked_add(ve_grant).unwrap();

        msg!("Issued {:?} badge with {} veIDL", tier, ve_grant);
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

    /// Transfer authority
    pub fn transfer_authority(ctx: Context<AdminOnly>, new_authority: Pubkey) -> Result<()> {
        ctx.accounts.state.authority = new_authority;
        msg!("Authority transferred to {}", new_authority);
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

    /// CHECK: Treasury account
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
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

    #[account(mut)]
    pub user: Signer<'info>,

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
        constraint = staker_account.owner == user.key()
    )]
    pub staker_account: Account<'info, StakerAccount>,

    #[account(
        seeds = [b"ve_position", user.key().as_ref()],
        bump
    )]
    pub ve_position: Option<Account<'info, VePosition>>,

    #[account(mut)]
    pub user: Signer<'info>,
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

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Oracle authorized to resolve
    pub oracle: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(mut)]
    pub market: Account<'info, PredictionMarket>,

    #[account(
        init,
        payer = user,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", market.key().as_ref(), user.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(
        seeds = [b"staker", user.key().as_ref()],
        bump = staker_account.bump
    )]
    pub staker_account: Account<'info, StakerAccount>,

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
        constraint = bet.owner == user.key() @ IdlError::Unauthorized
    )]
    pub bet: Account<'info, Bet>,

    pub user: Signer<'info>,
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

// ==================== STATE ====================

#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub total_staked: u64,
    pub total_ve_supply: u64,
    pub reward_pool: u64,
    pub total_fees_collected: u64,
    pub total_burned: u64,
    pub bump: u8,
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
}
