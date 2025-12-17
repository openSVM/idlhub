use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, Burn};
use anchor_lang::solana_program::sysvar::rent::Rent;

// The actual $IDL token on bags.fm
// CA: 8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS
declare_id!("IDLStake11111111111111111111111111111111111");

pub const IDL_TOKEN_MINT: &str = "8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS";

// Constants
pub const MAX_LOCK_DURATION: i64 = 126144000; // 4 years in seconds
pub const MIN_LOCK_DURATION: i64 = 604800; // 1 week minimum

// Volume Badge Tiers (in USD value traded on bags.fm)
// Badge holders get veIDL without locking - reward for generating volume
pub const BADGE_TIER_BRONZE: u64 = 1_000;        // $1k volume
pub const BADGE_TIER_SILVER: u64 = 10_000;       // $10k volume
pub const BADGE_TIER_GOLD: u64 = 100_000;        // $100k volume
pub const BADGE_TIER_PLATINUM: u64 = 500_000;    // $500k volume
pub const BADGE_TIER_DIAMOND: u64 = 1_000_000;   // $1M volume

// veIDL granted per badge tier (equivalent lock time in voting power)
pub const BADGE_VEIDL_BRONZE: u64 = 50_000;      // ~1 week lock equivalent
pub const BADGE_VEIDL_SILVER: u64 = 250_000;     // ~1 month lock equivalent
pub const BADGE_VEIDL_GOLD: u64 = 1_000_000;     // ~3 month lock equivalent
pub const BADGE_VEIDL_PLATINUM: u64 = 5_000_000; // ~1 year lock equivalent
pub const BADGE_VEIDL_DIAMOND: u64 = 20_000_000; // ~4 year lock equivalent
pub const BET_FEE_BPS: u64 = 300; // 3% fee on winning bets
pub const STAKER_FEE_SHARE_BPS: u64 = 5000; // 50% of fees to stakers
pub const CREATOR_FEE_SHARE_BPS: u64 = 2500; // 25% to market creator
pub const TREASURY_FEE_SHARE_BPS: u64 = 1500; // 15% to treasury
pub const BURN_FEE_SHARE_BPS: u64 = 1000; // 10% burned

// Staking multiplier: 1M IDL staked = 1% bonus, max 50%
pub const STAKE_BONUS_PER_MILLION: u64 = 100; // 1% in bps
pub const MAX_STAKE_BONUS_BPS: u64 = 5000; // 50% max

#[program]
pub mod idl_protocol {
    use super::*;

    // ==================== INITIALIZATION ====================

    /// Initialize the protocol - call once
    pub fn initialize(
        ctx: Context<Initialize>,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.treasury = ctx.accounts.treasury.key();
        state.idl_mint = ctx.accounts.idl_mint.key();
        state.total_staked = 0;
        state.total_ve_supply = 0;
        state.reward_pool = 0; // Fees collected for staker rewards
        state.total_fees_collected = 0;
        state.total_burned = 0;
        state.bump = ctx.bumps.state;
        state.paused = false;

        msg!("IDL Protocol initialized. Treasury: {}", state.treasury);
        Ok(())
    }

    /// Deposit fees into reward pool (anyone can add rewards)
    pub fn deposit_rewards(ctx: Context<DepositRewards>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);

        let state = &mut ctx.accounts.state;

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.depositor_idl.to_account_info(),
                    to: ctx.accounts.reward_vault.to_account_info(),
                    authority: ctx.accounts.depositor.to_account_info(),
                },
            ),
            amount,
        )?;

        state.reward_pool = state.reward_pool.checked_add(amount).unwrap();
        msg!("Deposited {} IDL to reward pool", amount);
        Ok(())
    }

    // ==================== STAKING ====================

    /// Stake IDL tokens - receive proportional share of reward pool
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);
        require!(!ctx.accounts.state.paused, IdlError::ProtocolPaused);

        let state = &mut ctx.accounts.state;
        let staker = &mut ctx.accounts.staker_account;

        // Transfer IDL from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_idl.to_account_info(),
                    to: ctx.accounts.stake_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update staker account
        if staker.owner == Pubkey::default() {
            staker.owner = ctx.accounts.user.key();
        }
        staker.staked_amount = staker.staked_amount.checked_add(amount).unwrap();
        staker.last_stake_timestamp = Clock::get()?.unix_timestamp;
        staker.bump = ctx.bumps.staker_account;

        // Update global state
        state.total_staked = state.total_staked.checked_add(amount).unwrap();

        msg!("Staked {} IDL. Total staked: {}", amount, state.total_staked);
        Ok(())
    }

    /// Unstake IDL tokens + claim proportional rewards
    /// Cannot unstake if tokens are locked for veIDL
    pub fn unstake(ctx: Context<Unstake>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);

        let state = &mut ctx.accounts.state;
        let staker = &mut ctx.accounts.staker_account;

        require!(staker.staked_amount >= amount, IdlError::InsufficientStake);

        // Check if user has an active veIDL lock - prevents unstaking locked tokens
        if let Some(ve_position) = &ctx.accounts.ve_position {
            let clock = Clock::get()?;
            if clock.unix_timestamp < ve_position.lock_end {
                // User has active lock - can only unstake unlocked portion
                let unlocked_amount = staker.staked_amount.saturating_sub(ve_position.locked_stake);
                require!(amount <= unlocked_amount, IdlError::TokensLocked);
            }
        }

        // Calculate user's share of rewards
        let user_reward = if state.total_staked > 0 && state.reward_pool > 0 {
            (amount as u128)
                .checked_mul(state.reward_pool as u128)
                .unwrap()
                .checked_div(state.total_staked as u128)
                .unwrap() as u64
        } else {
            0
        };

        let total_to_return = amount.checked_add(user_reward).unwrap();

        // Transfer from stake vault
        let seeds = &[b"state".as_ref(), &[state.bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.stake_vault.to_account_info(),
                    to: ctx.accounts.user_idl.to_account_info(),
                    authority: ctx.accounts.state.to_account_info(),
                },
                signer,
            ),
            amount, // Principal from stake vault
        )?;

        // Transfer rewards from reward vault if any
        if user_reward > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.reward_vault.to_account_info(),
                        to: ctx.accounts.user_idl.to_account_info(),
                        authority: ctx.accounts.state.to_account_info(),
                    },
                    signer,
                ),
                user_reward,
            )?;
            state.reward_pool = state.reward_pool.saturating_sub(user_reward);
        }

        // Update state
        staker.staked_amount = staker.staked_amount.saturating_sub(amount);
        state.total_staked = state.total_staked.saturating_sub(amount);

        msg!("Unstaked {} IDL + {} rewards", amount, user_reward);
        Ok(())
    }

    // ==================== VOTE-ESCROWED TOKENS (veIDL) ====================

    /// Lock staked IDL for veIDL voting power
    pub fn lock_for_ve(
        ctx: Context<LockForVe>,
        lock_duration: i64,
    ) -> Result<()> {
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
        // 4 year lock = 1:1, 1 year = 0.25:1
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

        msg!(
            "Locked {} staked IDL for {} veIDL until {}",
            staker.staked_amount,
            ve_amount,
            ve_position.lock_end
        );
        Ok(())
    }

    /// Unlock expired veIDL position (allows unstaking again)
    pub fn unlock_ve(ctx: Context<UnlockVe>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let ve_position = &ctx.accounts.ve_position;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= ve_position.lock_end,
            IdlError::LockNotExpired
        );

        state.total_ve_supply = state.total_ve_supply.saturating_sub(ve_position.ve_amount);

        msg!("Unlocked veIDL position");
        Ok(())
    }

    // ==================== PREDICTION MARKETS ====================

    /// Create a prediction market for a protocol metric
    pub fn create_market(
        ctx: Context<CreateMarket>,
        protocol_id: String,
        metric_type: MetricType,
        target_value: u64,
        resolution_timestamp: i64,
        description: String,
    ) -> Result<()> {
        require!(protocol_id.len() <= 32, IdlError::InvalidInput);
        require!(description.len() <= 200, IdlError::InvalidInput);

        let clock = Clock::get()?;
        require!(
            resolution_timestamp > clock.unix_timestamp + 3600, // At least 1 hour from now
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
        market.oracle = ctx.accounts.oracle.key(); // Set authorized oracle
        market.created_at = clock.unix_timestamp;
        market.bump = ctx.bumps.market;

        msg!("Created prediction market");
        Ok(())
    }

    /// Place a bet on a prediction market
    pub fn place_bet(
        ctx: Context<PlaceBet>,
        amount: u64,
        bet_yes: bool,
    ) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);

        let market = &mut ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;
        let staker = &ctx.accounts.staker_account;
        let clock = Clock::get()?;

        require!(!market.resolved, IdlError::MarketResolved);
        require!(
            clock.unix_timestamp < market.resolution_timestamp - 300, // Stop betting 5min before
            IdlError::BettingClosed
        );

        // Calculate bet multiplier based on staking
        // 1M staked = 1% bonus, max 50%
        let stake_millions = staker.staked_amount / 1_000_000_000_000; // Assuming 6 decimals
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

        // Transfer IDL to market pool
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_idl.to_account_info(),
                    to: ctx.accounts.market_pool.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update market totals
        if bet_yes {
            market.total_yes_amount = market.total_yes_amount.checked_add(effective_amount).unwrap();
        } else {
            market.total_no_amount = market.total_no_amount.checked_add(effective_amount).unwrap();
        }

        // Create bet record
        bet.owner = ctx.accounts.user.key();
        bet.market = market.key();
        bet.amount = amount;
        bet.effective_amount = effective_amount;
        bet.bet_yes = bet_yes;
        bet.timestamp = clock.unix_timestamp;
        bet.claimed = false;
        bet.bump = ctx.bumps.bet;

        msg!(
            "Placed {} bet: {} IDL (effective: {}, {}% bonus)",
            if bet_yes { "YES" } else { "NO" },
            amount,
            effective_amount,
            stake_bonus / 100
        );
        Ok(())
    }

    /// Resolve market - only authorized oracle can call
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        actual_value: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;
        let clock = Clock::get()?;

        require!(!market.resolved, IdlError::MarketResolved);
        require!(
            ctx.accounts.oracle.key() == market.oracle,
            IdlError::Unauthorized
        );
        require!(
            clock.unix_timestamp >= market.resolution_timestamp,
            IdlError::ResolutionTooEarly
        );

        let outcome = actual_value >= market.target_value;
        market.outcome = Some(outcome);
        market.actual_value = Some(actual_value);
        market.resolved = true;

        msg!(
            "Market resolved: {} (target: {}, actual: {})",
            if outcome { "YES wins" } else { "NO wins" },
            market.target_value,
            actual_value
        );
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

        // Calculate winnings using parimutuel formula
        let (winning_pool, losing_pool) = if outcome {
            (market.total_yes_amount, market.total_no_amount)
        } else {
            (market.total_no_amount, market.total_yes_amount)
        };

        // User's share of the losing pool
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

        // Calculate and distribute fees
        let fee = (gross_winnings as u128)
            .checked_mul(BET_FEE_BPS as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;

        let net_winnings = gross_winnings.saturating_sub(fee);

        // Fee distribution
        let staker_fee = (fee as u128 * STAKER_FEE_SHARE_BPS as u128 / 10000) as u64;
        let creator_fee = (fee as u128 * CREATOR_FEE_SHARE_BPS as u128 / 10000) as u64;
        let treasury_fee = (fee as u128 * TREASURY_FEE_SHARE_BPS as u128 / 10000) as u64;
        let burn_amount = (fee as u128 * BURN_FEE_SHARE_BPS as u128 / 10000) as u64;

        // Transfer net winnings to user
        let market_seeds = &[
            b"market".as_ref(),
            market.protocol_id.as_bytes(),
            &market.resolution_timestamp.to_le_bytes(),
            &[market.bump],
        ];
        let market_signer = &[&market_seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.market_pool.to_account_info(),
                    to: ctx.accounts.user_idl.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                market_signer,
            ),
            net_winnings,
        )?;

        // Transfer staker fees to reward vault
        if staker_fee > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.market_pool.to_account_info(),
                        to: ctx.accounts.reward_vault.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    market_signer,
                ),
                staker_fee,
            )?;
            state.reward_pool = state.reward_pool.checked_add(staker_fee).unwrap();
        }

        // Transfer creator fee
        if creator_fee > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.market_pool.to_account_info(),
                        to: ctx.accounts.creator_idl.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    market_signer,
                ),
                creator_fee,
            )?;
        }

        // Transfer treasury fee
        if treasury_fee > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.market_pool.to_account_info(),
                        to: ctx.accounts.treasury.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    market_signer,
                ),
                treasury_fee,
            )?;
        }

        // Burn tokens
        if burn_amount > 0 {
            token::burn(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Burn {
                        mint: ctx.accounts.idl_mint.to_account_info(),
                        from: ctx.accounts.market_pool.to_account_info(),
                        authority: ctx.accounts.market.to_account_info(),
                    },
                    market_signer,
                ),
                burn_amount,
            )?;
            state.total_burned = state.total_burned.checked_add(burn_amount).unwrap();
        }

        state.total_fees_collected = state.total_fees_collected.checked_add(fee).unwrap();

        msg!(
            "Claimed {} IDL (fee: {}, to stakers: {}, burned: {})",
            net_winnings,
            fee,
            staker_fee,
            burn_amount
        );
        Ok(())
    }

    // ==================== ADMIN ====================

    /// Pause/unpause protocol (emergency)
    pub fn set_paused(ctx: Context<AdminOnly>, paused: bool) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.paused = paused;
        msg!("Protocol paused: {}", paused);
        Ok(())
    }

    /// Transfer authority
    pub fn transfer_authority(ctx: Context<AdminOnly>, new_authority: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = new_authority;
        msg!("Authority transferred to {}", new_authority);
        Ok(())
    }

    // ==================== VOLUME BADGES ====================

    /// Issue a volume badge to a trader (admin/oracle verified)
    /// Badges grant veIDL voting power without locking tokens
    pub fn issue_badge(
        ctx: Context<IssueBadge>,
        tier: BadgeTier,
        volume_usd: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let badge = &mut ctx.accounts.badge;

        // Verify volume meets tier requirement
        let required_volume = match tier {
            BadgeTier::Bronze => BADGE_TIER_BRONZE,
            BadgeTier::Silver => BADGE_TIER_SILVER,
            BadgeTier::Gold => BADGE_TIER_GOLD,
            BadgeTier::Platinum => BADGE_TIER_PLATINUM,
            BadgeTier::Diamond => BADGE_TIER_DIAMOND,
        };
        require!(volume_usd >= required_volume, IdlError::InsufficientVolume);

        // Calculate veIDL grant
        let ve_grant = match tier {
            BadgeTier::Bronze => BADGE_VEIDL_BRONZE,
            BadgeTier::Silver => BADGE_VEIDL_SILVER,
            BadgeTier::Gold => BADGE_VEIDL_GOLD,
            BadgeTier::Platinum => BADGE_VEIDL_PLATINUM,
            BadgeTier::Diamond => BADGE_VEIDL_DIAMOND,
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

        // Update badge
        badge.owner = ctx.accounts.recipient.key();
        badge.tier = tier;
        badge.volume_usd = volume_usd;
        badge.ve_amount = ve_grant;
        badge.issued_at = Clock::get()?.unix_timestamp;
        badge.bump = ctx.bumps.badge;

        // Update global veIDL supply
        state.total_ve_supply = state.total_ve_supply.checked_add(ve_grant).unwrap();

        msg!(
            "Issued {:?} badge to {} with {} veIDL (volume: ${} USD)",
            tier,
            ctx.accounts.recipient.key(),
            ve_grant,
            volume_usd
        );
        Ok(())
    }

    /// Revoke a badge (admin only, for fraud/abuse)
    pub fn revoke_badge(ctx: Context<RevokeBadge>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let badge = &ctx.accounts.badge;

        // Subtract veIDL from supply
        state.total_ve_supply = state.total_ve_supply.saturating_sub(badge.ve_amount);

        msg!("Revoked badge from {}, removed {} veIDL", badge.owner, badge.ve_amount);
        Ok(())
    }
}

// bags.fm pool address for $IDL trading
pub const BAGS_FM_POOL: &str = "HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC";

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

    /// The actual $IDL token mint
    #[account(
        constraint = idl_mint.key().to_string() == IDL_TOKEN_MINT @ IdlError::InvalidMint
    )]
    pub idl_mint: Account<'info, Mint>,

    /// CHECK: Treasury account to receive fees
    pub treasury: UncheckedAccount<'info>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct DepositRewards<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut, constraint = depositor_idl.owner == depositor.key())]
    pub depositor_idl: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"reward_vault"], bump)]
    pub reward_vault: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
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

    #[account(mut, constraint = user_idl.owner == user.key())]
    pub user_idl: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"stake_vault"], bump)]
    pub stake_vault: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
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

    /// Optional veIDL position - if exists and active, restricts unstaking
    #[account(
        seeds = [b"ve_position", user.key().as_ref()],
        bump
    )]
    pub ve_position: Option<Account<'info, VePosition>>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, constraint = user_idl.owner == user.key())]
    pub user_idl: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"stake_vault"], bump)]
    pub stake_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"reward_vault"], bump)]
    pub reward_vault: Account<'info, TokenAccount>,

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

    /// Market pool token account for holding bets
    #[account(
        init,
        payer = creator,
        token::mint = idl_mint,
        token::authority = market,
        seeds = [b"market_pool", market.key().as_ref()],
        bump
    )]
    pub market_pool: Account<'info, TokenAccount>,

    /// The IDL token mint
    #[account(constraint = idl_mint.key() == state.idl_mint @ IdlError::InvalidMint)]
    pub idl_mint: Account<'info, Mint>,

    #[account(mut)]
    pub creator: Signer<'info>,

    /// CHECK: Oracle authorized to resolve this market
    pub oracle: UncheckedAccount<'info>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
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

    #[account(mut, constraint = user_idl.owner == user.key())]
    pub user_idl: Account<'info, TokenAccount>,

    /// Market pool - PDA owned by the market for holding bets
    #[account(
        mut,
        seeds = [b"market_pool", market.key().as_ref()],
        bump
    )]
    pub market_pool: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
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

    #[account(mut, constraint = user_idl.owner == user.key())]
    pub user_idl: Account<'info, TokenAccount>,

    /// Market pool - PDA owned by the market for holding bets
    #[account(
        mut,
        seeds = [b"market_pool", market.key().as_ref()],
        bump
    )]
    pub market_pool: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"reward_vault"], bump)]
    pub reward_vault: Account<'info, TokenAccount>,

    /// Market creator receives fees
    #[account(mut, constraint = creator_idl.owner == market.creator)]
    pub creator_idl: Account<'info, TokenAccount>,

    /// Treasury receives fees - must match protocol state
    #[account(
        mut,
        constraint = treasury.owner == state.treasury @ IdlError::Unauthorized
    )]
    pub treasury: Account<'info, TokenAccount>,

    #[account(mut)]
    pub idl_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
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

    /// CHECK: Recipient of the badge
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

// ==================== STATE ====================

#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub idl_mint: Pubkey,
    pub total_staked: u64,
    pub total_ve_supply: u64,
    pub reward_pool: u64, // Accumulated fees for stakers
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
    pub locked_stake: u64, // Amount of staked IDL locked
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
    pub oracle: Pubkey, // Authorized oracle
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
    pub volume_usd: u64,    // Total volume traded in USD
    pub ve_amount: u64,     // veIDL granted by this badge
    pub issued_at: i64,
    pub bump: u8,
}

// ==================== TYPES ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace, Debug)]
pub enum BadgeTier {
    None,       // Default/uninitialized
    Bronze,     // $1k volume
    Silver,     // $10k volume
    Gold,       // $100k volume
    Platinum,   // $500k volume
    Diamond,    // $1M volume
}

impl Default for BadgeTier {
    fn default() -> Self {
        BadgeTier::None
    }
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

    #[msg("Invalid mint - must use $IDL token")]
    InvalidMint,

    #[msg("Protocol is paused")]
    ProtocolPaused,

    #[msg("Insufficient trading volume for this badge tier")]
    InsufficientVolume,

    #[msg("Tokens are locked for veIDL - cannot unstake until lock expires")]
    TokensLocked,
}
