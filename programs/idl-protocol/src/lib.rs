use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn};

declare_id!("IDLpro111111111111111111111111111111111111");

// Constants
pub const EPOCH_LENGTH: i64 = 28800; // ~8 hours in slots (assuming 400ms slots)
pub const REBASE_RATE_BPS: u64 = 50; // 0.5% per epoch
pub const MAX_LOCK_DURATION: i64 = 126144000; // 4 years in seconds
pub const BET_FEE_BPS: u64 = 300; // 3% fee on bets
pub const STAKER_FEE_SHARE_BPS: u64 = 5000; // 50% of fees to stakers
pub const CREATOR_FEE_SHARE_BPS: u64 = 2500; // 25% to market creator
pub const TREASURY_FEE_SHARE_BPS: u64 = 1500; // 15% to treasury
pub const BURN_FEE_SHARE_BPS: u64 = 1000; // 10% burned

#[program]
pub mod idl_protocol {
    use super::*;

    // ==================== INITIALIZATION ====================

    /// Initialize the protocol state
    pub fn initialize(
        ctx: Context<Initialize>,
        treasury: Pubkey,
    ) -> Result<()> {
        let state = &mut ctx.accounts.state;
        state.authority = ctx.accounts.authority.key();
        state.treasury = treasury;
        state.idl_mint = ctx.accounts.idl_mint.key();
        state.sidl_mint = ctx.accounts.sidl_mint.key();
        state.total_staked = 0;
        state.total_ve_supply = 0;
        state.last_rebase_epoch = Clock::get()?.epoch;
        state.rebase_index = 1_000_000_000; // 1.0 in 9 decimals
        state.total_fees_collected = 0;
        state.total_burned = 0;
        state.bump = ctx.bumps.state;

        msg!("IDL Protocol initialized");
        Ok(())
    }

    // ==================== STAKING ====================

    /// Stake IDL tokens to receive sIDL
    pub fn stake(ctx: Context<Stake>, amount: u64) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);

        let state = &mut ctx.accounts.state;
        let staker = &mut ctx.accounts.staker_account;

        // Calculate sIDL to mint based on rebase index
        let sidl_amount = (amount as u128)
            .checked_mul(1_000_000_000)
            .unwrap()
            .checked_div(state.rebase_index as u128)
            .unwrap() as u64;

        // Transfer IDL from user to vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_idl.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Mint sIDL to user
        let seeds = &[b"state".as_ref(), &[state.bump]];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.sidl_mint.to_account_info(),
                    to: ctx.accounts.user_sidl.to_account_info(),
                    authority: ctx.accounts.state.to_account_info(),
                },
                signer,
            ),
            sidl_amount,
        )?;

        // Update state
        state.total_staked = state.total_staked.checked_add(amount).unwrap();

        // Update staker account
        staker.owner = ctx.accounts.user.key();
        staker.staked_amount = staker.staked_amount.checked_add(amount).unwrap();
        staker.sidl_balance = staker.sidl_balance.checked_add(sidl_amount).unwrap();
        staker.last_stake_timestamp = Clock::get()?.unix_timestamp;

        msg!("Staked {} IDL, received {} sIDL", amount, sidl_amount);
        Ok(())
    }

    /// Unstake sIDL to receive IDL tokens
    pub fn unstake(ctx: Context<Unstake>, sidl_amount: u64) -> Result<()> {
        require!(sidl_amount > 0, IdlError::InvalidAmount);

        let state = &mut ctx.accounts.state;
        let staker = &mut ctx.accounts.staker_account;

        // Calculate IDL to return based on rebase index
        let idl_amount = (sidl_amount as u128)
            .checked_mul(state.rebase_index as u128)
            .unwrap()
            .checked_div(1_000_000_000)
            .unwrap() as u64;

        // Burn sIDL from user
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.sidl_mint.to_account_info(),
                    from: ctx.accounts.user_sidl.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            sidl_amount,
        )?;

        // Transfer IDL from vault to user
        let seeds = &[b"state".as_ref(), &[state.bump]];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.user_idl.to_account_info(),
                    authority: ctx.accounts.state.to_account_info(),
                },
                signer,
            ),
            idl_amount,
        )?;

        // Update state
        state.total_staked = state.total_staked.checked_sub(idl_amount).unwrap();

        // Update staker account
        staker.staked_amount = staker.staked_amount.saturating_sub(idl_amount);
        staker.sidl_balance = staker.sidl_balance.saturating_sub(sidl_amount);

        msg!("Unstaked {} sIDL, received {} IDL", sidl_amount, idl_amount);
        Ok(())
    }

    /// Execute rebase - increase rebase index based on fees collected
    pub fn rebase(ctx: Context<Rebase>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let current_epoch = Clock::get()?.epoch;

        require!(
            current_epoch > state.last_rebase_epoch,
            IdlError::RebaseTooEarly
        );

        let epochs_passed = current_epoch - state.last_rebase_epoch;

        // Calculate new rebase index: index * (1 + rate)^epochs
        // Using simple multiplication for each epoch
        let mut new_index = state.rebase_index;
        for _ in 0..epochs_passed {
            new_index = new_index
                .checked_mul(10000 + REBASE_RATE_BPS)
                .unwrap()
                .checked_div(10000)
                .unwrap();
        }

        state.rebase_index = new_index;
        state.last_rebase_epoch = current_epoch;

        msg!("Rebased! New index: {}", new_index);
        Ok(())
    }

    // ==================== VOTE-ESCROWED TOKENS (veIDL) ====================

    /// Lock sIDL for veIDL (vote-escrowed)
    pub fn lock_for_ve(
        ctx: Context<LockForVe>,
        amount: u64,
        lock_duration: i64,
    ) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);
        require!(
            lock_duration > 0 && lock_duration <= MAX_LOCK_DURATION,
            IdlError::InvalidLockDuration
        );

        let state = &mut ctx.accounts.state;
        let ve_position = &mut ctx.accounts.ve_position;
        let clock = Clock::get()?;

        // Calculate veIDL amount based on lock duration
        // Max lock (4 years) = 1:1, linear decrease
        let ve_amount = (amount as u128)
            .checked_mul(lock_duration as u128)
            .unwrap()
            .checked_div(MAX_LOCK_DURATION as u128)
            .unwrap() as u64;

        // Transfer sIDL to escrow
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_sidl.to_account_info(),
                    to: ctx.accounts.ve_escrow.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Update ve position
        ve_position.owner = ctx.accounts.user.key();
        ve_position.locked_amount = amount;
        ve_position.ve_amount = ve_amount;
        ve_position.lock_start = clock.unix_timestamp;
        ve_position.lock_end = clock.unix_timestamp.checked_add(lock_duration).unwrap();
        ve_position.bump = ctx.bumps.ve_position;

        // Update state
        state.total_ve_supply = state.total_ve_supply.checked_add(ve_amount).unwrap();

        msg!("Locked {} sIDL for {} veIDL, unlock at {}", amount, ve_amount, ve_position.lock_end);
        Ok(())
    }

    /// Unlock expired veIDL position
    pub fn unlock_ve(ctx: Context<UnlockVe>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let ve_position = &ctx.accounts.ve_position;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp >= ve_position.lock_end,
            IdlError::LockNotExpired
        );

        // Transfer sIDL back to user
        let seeds = &[
            b"ve_position".as_ref(),
            ctx.accounts.user.key.as_ref(),
            &[ve_position.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.ve_escrow.to_account_info(),
                    to: ctx.accounts.user_sidl.to_account_info(),
                    authority: ctx.accounts.ve_position.to_account_info(),
                },
                signer,
            ),
            ve_position.locked_amount,
        )?;

        // Update state
        state.total_ve_supply = state.total_ve_supply.saturating_sub(ve_position.ve_amount);

        msg!("Unlocked {} sIDL from veIDL position", ve_position.locked_amount);
        Ok(())
    }

    // ==================== BONDING ====================

    /// Bond assets to mint IDL at discount
    pub fn bond(
        ctx: Context<Bond>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, IdlError::InvalidAmount);

        let bond_config = &ctx.accounts.bond_config;
        let user_bond = &mut ctx.accounts.user_bond;
        let clock = Clock::get()?;

        require!(bond_config.is_active, IdlError::BondNotActive);
        require!(
            bond_config.total_bonded.checked_add(amount).unwrap() <= bond_config.max_capacity,
            IdlError::BondCapacityExceeded
        );

        // Calculate IDL to vest based on discount
        let idl_to_vest = (amount as u128)
            .checked_mul(10000 + bond_config.discount_bps as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;

        // Transfer bond asset from user
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_bond_asset.to_account_info(),
                    to: ctx.accounts.bond_treasury.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Create/update user bond position
        user_bond.owner = ctx.accounts.user.key();
        user_bond.bond_config = bond_config.key();
        user_bond.amount_bonded = user_bond.amount_bonded.checked_add(amount).unwrap();
        user_bond.idl_to_vest = user_bond.idl_to_vest.checked_add(idl_to_vest).unwrap();
        user_bond.vesting_start = clock.unix_timestamp;
        user_bond.vesting_end = clock.unix_timestamp.checked_add(bond_config.vesting_term).unwrap();
        user_bond.last_claim = clock.unix_timestamp;

        msg!("Bonded {} for {} IDL vesting over {} seconds", amount, idl_to_vest, bond_config.vesting_term);
        Ok(())
    }

    /// Claim vested IDL from bond
    pub fn claim_bond(ctx: Context<ClaimBond>) -> Result<()> {
        let state = &ctx.accounts.state;
        let user_bond = &mut ctx.accounts.user_bond;
        let clock = Clock::get()?;

        let elapsed = clock.unix_timestamp - user_bond.last_claim;
        let total_vesting_time = user_bond.vesting_end - user_bond.vesting_start;

        // Calculate claimable amount
        let claimable = if clock.unix_timestamp >= user_bond.vesting_end {
            user_bond.idl_to_vest
        } else {
            (user_bond.idl_to_vest as u128)
                .checked_mul(elapsed as u128)
                .unwrap()
                .checked_div(total_vesting_time as u128)
                .unwrap() as u64
        };

        require!(claimable > 0, IdlError::NothingToClaim);

        // Mint IDL to user
        let seeds = &[b"state".as_ref(), &[state.bump]];
        let signer = &[&seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.idl_mint.to_account_info(),
                    to: ctx.accounts.user_idl.to_account_info(),
                    authority: ctx.accounts.state.to_account_info(),
                },
                signer,
            ),
            claimable,
        )?;

        // Update user bond
        user_bond.idl_to_vest = user_bond.idl_to_vest.saturating_sub(claimable);
        user_bond.last_claim = clock.unix_timestamp;

        msg!("Claimed {} IDL from bond", claimable);
        Ok(())
    }

    // ==================== PREDICTION MARKETS ====================

    /// Create a new prediction market
    pub fn create_market(
        ctx: Context<CreateMarket>,
        protocol_id: String,
        metric_type: MetricType,
        target_value: u64,
        resolution_timestamp: i64,
        description: String,
    ) -> Result<()> {
        require!(protocol_id.len() <= 32, IdlError::InvalidInput);
        require!(description.len() <= 256, IdlError::InvalidInput);
        require!(
            resolution_timestamp > Clock::get()?.unix_timestamp,
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
        market.bump = ctx.bumps.market;
        market.created_at = Clock::get()?.unix_timestamp;

        msg!("Created prediction market for protocol");
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

        require!(!market.resolved, IdlError::MarketResolved);
        require!(
            Clock::get()?.unix_timestamp < market.resolution_timestamp,
            IdlError::BettingClosed
        );

        // Calculate bet multiplier based on staking
        // 0 staked: 1.0x, 100M staked: 1.5x, 100M locked 1yr+: 2.0x
        let base_multiplier = 10000u64; // 1.0x
        let stake_bonus = std::cmp::min(
            staker.staked_amount / 200_000_000, // 0.5% bonus per 200M staked, max 50%
            5000
        );
        let multiplier = base_multiplier + stake_bonus;
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
        bet.timestamp = Clock::get()?.unix_timestamp;
        bet.claimed = false;

        msg!("Placed {} bet of {} IDL (effective: {})", if bet_yes { "YES" } else { "NO" }, amount, effective_amount);
        Ok(())
    }

    /// Resolve a prediction market (oracle call)
    pub fn resolve_market(
        ctx: Context<ResolveMarket>,
        actual_value: u64,
    ) -> Result<()> {
        let market = &mut ctx.accounts.market;

        require!(!market.resolved, IdlError::MarketResolved);
        require!(
            Clock::get()?.unix_timestamp >= market.resolution_timestamp,
            IdlError::ResolutionTooEarly
        );

        // Determine outcome
        let outcome = actual_value >= market.target_value;
        market.outcome = Some(outcome);
        market.resolved = true;
        market.actual_value = Some(actual_value);

        msg!("Market resolved: outcome = {}, actual = {}", outcome, actual_value);
        Ok(())
    }

    /// Claim winnings from a resolved market
    pub fn claim_winnings(ctx: Context<ClaimWinnings>) -> Result<()> {
        let state = &mut ctx.accounts.state;
        let market = &ctx.accounts.market;
        let bet = &mut ctx.accounts.bet;

        require!(market.resolved, IdlError::MarketNotResolved);
        require!(!bet.claimed, IdlError::AlreadyClaimed);

        let outcome = market.outcome.unwrap();
        let is_winner = (bet.bet_yes && outcome) || (!bet.bet_yes && !outcome);

        if !is_winner {
            bet.claimed = true;
            msg!("Bet lost, no winnings to claim");
            return Ok(());
        }

        // Calculate winnings
        let (winning_pool, losing_pool) = if outcome {
            (market.total_yes_amount, market.total_no_amount)
        } else {
            (market.total_no_amount, market.total_yes_amount)
        };

        // User's share of winnings
        let user_share = (bet.effective_amount as u128)
            .checked_mul(losing_pool as u128)
            .unwrap()
            .checked_div(winning_pool as u128)
            .unwrap() as u64;

        let gross_winnings = bet.amount.checked_add(user_share).unwrap();

        // Deduct fees
        let fee = (gross_winnings as u128)
            .checked_mul(BET_FEE_BPS as u128)
            .unwrap()
            .checked_div(10000)
            .unwrap() as u64;

        let net_winnings = gross_winnings.checked_sub(fee).unwrap();

        // Distribute fees
        let staker_fee = (fee as u128 * STAKER_FEE_SHARE_BPS as u128 / 10000) as u64;
        let creator_fee = (fee as u128 * CREATOR_FEE_SHARE_BPS as u128 / 10000) as u64;
        let treasury_fee = (fee as u128 * TREASURY_FEE_SHARE_BPS as u128 / 10000) as u64;
        let burn_fee = (fee as u128 * BURN_FEE_SHARE_BPS as u128 / 10000) as u64;

        state.total_fees_collected = state.total_fees_collected.checked_add(fee).unwrap();
        state.total_burned = state.total_burned.checked_add(burn_fee).unwrap();

        // Transfer winnings to user
        let seeds = &[
            b"market".as_ref(),
            market.protocol_id.as_bytes(),
            &market.resolution_timestamp.to_le_bytes(),
            &[market.bump],
        ];
        let signer = &[&seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.market_pool.to_account_info(),
                    to: ctx.accounts.user_idl.to_account_info(),
                    authority: ctx.accounts.market.to_account_info(),
                },
                signer,
            ),
            net_winnings,
        )?;

        bet.claimed = true;

        msg!("Claimed {} IDL (fee: {}, burned: {})", net_winnings, fee, burn_fee);
        Ok(())
    }

    // ==================== GAUGES ====================

    /// Vote on gauge weights with veIDL
    pub fn vote_gauge(
        ctx: Context<VoteGauge>,
        weight: u64,
    ) -> Result<()> {
        let gauge = &mut ctx.accounts.gauge;
        let ve_position = &ctx.accounts.ve_position;
        let gauge_vote = &mut ctx.accounts.gauge_vote;
        let clock = Clock::get()?;

        require!(
            clock.unix_timestamp < ve_position.lock_end,
            IdlError::VeExpired
        );
        require!(weight <= 10000, IdlError::InvalidWeight);

        // Calculate voting power
        let voting_power = ve_position.ve_amount;

        // Update gauge
        gauge.total_votes = gauge.total_votes.checked_add(voting_power).unwrap();

        // Record vote
        gauge_vote.voter = ctx.accounts.user.key();
        gauge_vote.gauge = gauge.key();
        gauge_vote.weight = weight;
        gauge_vote.voting_power = voting_power;
        gauge_vote.timestamp = clock.unix_timestamp;

        msg!("Voted on gauge with {} veIDL power", voting_power);
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

    #[account(mut)]
    pub idl_mint: Account<'info, Mint>,

    #[account(mut)]
    pub sidl_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
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

    #[account(mut, constraint = user_sidl.owner == user.key())]
    pub user_sidl: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"vault"], bump)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub sidl_mint: Account<'info, Mint>,

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
        bump
    )]
    pub staker_account: Account<'info, StakerAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, constraint = user_idl.owner == user.key())]
    pub user_idl: Account<'info, TokenAccount>,

    #[account(mut, constraint = user_sidl.owner == user.key())]
    pub user_sidl: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"vault"], bump)]
    pub vault: Account<'info, TokenAccount>,

    #[account(mut)]
    pub sidl_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Rebase<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,
}

#[derive(Accounts)]
pub struct LockForVe<'info> {
    #[account(mut, seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

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

    #[account(mut, constraint = user_sidl.owner == user.key())]
    pub user_sidl: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"ve_escrow"], bump)]
    pub ve_escrow: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
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

    #[account(mut, constraint = user_sidl.owner == user.key())]
    pub user_sidl: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"ve_escrow"], bump)]
    pub ve_escrow: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Bond<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        seeds = [b"bond_config", bond_config.bond_asset.as_ref()],
        bump = bond_config.bump
    )]
    pub bond_config: Account<'info, BondConfig>,

    #[account(
        init_if_needed,
        payer = user,
        space = 8 + UserBond::INIT_SPACE,
        seeds = [b"user_bond", user.key().as_ref(), bond_config.key().as_ref()],
        bump
    )]
    pub user_bond: Account<'info, UserBond>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, constraint = user_bond_asset.owner == user.key())]
    pub user_bond_asset: Account<'info, TokenAccount>,

    #[account(mut)]
    pub bond_treasury: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimBond<'info> {
    #[account(seeds = [b"state"], bump = state.bump)]
    pub state: Account<'info, ProtocolState>,

    #[account(
        mut,
        seeds = [b"user_bond", user.key().as_ref(), user_bond.bond_config.as_ref()],
        bump,
        constraint = user_bond.owner == user.key()
    )]
    pub user_bond: Account<'info, UserBond>,

    pub user: Signer<'info>,

    #[account(mut, constraint = user_idl.owner == user.key())]
    pub user_idl: Account<'info, TokenAccount>,

    #[account(mut)]
    pub idl_mint: Account<'info, Mint>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
#[instruction(protocol_id: String, metric_type: MetricType, target_value: u64, resolution_timestamp: i64)]
pub struct CreateMarket<'info> {
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

    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct PlaceBet<'info> {
    #[account(mut)]
    pub market: Account<'info, PredictionMarket>,

    #[account(
        init,
        payer = user,
        space = 8 + Bet::INIT_SPACE,
        seeds = [b"bet", market.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub bet: Account<'info, Bet>,

    #[account(
        seeds = [b"staker", user.key().as_ref()],
        bump
    )]
    pub staker_account: Account<'info, StakerAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    #[account(mut, constraint = user_idl.owner == user.key())]
    pub user_idl: Account<'info, TokenAccount>,

    #[account(mut)]
    pub market_pool: Account<'info, TokenAccount>,

    pub system_program: Program<'info, System>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveMarket<'info> {
    #[account(mut)]
    pub market: Account<'info, PredictionMarket>,

    /// Oracle or authority that can resolve markets
    pub resolver: Signer<'info>,
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
        seeds = [b"bet", market.key().as_ref(), user.key().as_ref()],
        bump,
        constraint = bet.owner == user.key()
    )]
    pub bet: Account<'info, Bet>,

    pub user: Signer<'info>,

    #[account(mut, constraint = user_idl.owner == user.key())]
    pub user_idl: Account<'info, TokenAccount>,

    #[account(mut)]
    pub market_pool: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct VoteGauge<'info> {
    #[account(mut)]
    pub gauge: Account<'info, Gauge>,

    #[account(
        seeds = [b"ve_position", user.key().as_ref()],
        bump = ve_position.bump,
        constraint = ve_position.owner == user.key()
    )]
    pub ve_position: Account<'info, VePosition>,

    #[account(
        init,
        payer = user,
        space = 8 + GaugeVote::INIT_SPACE,
        seeds = [b"gauge_vote", gauge.key().as_ref(), user.key().as_ref()],
        bump
    )]
    pub gauge_vote: Account<'info, GaugeVote>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub system_program: Program<'info, System>,
}

// ==================== STATE ====================

#[account]
#[derive(InitSpace)]
pub struct ProtocolState {
    pub authority: Pubkey,
    pub treasury: Pubkey,
    pub idl_mint: Pubkey,
    pub sidl_mint: Pubkey,
    pub total_staked: u64,
    pub total_ve_supply: u64,
    pub last_rebase_epoch: u64,
    pub rebase_index: u64, // 9 decimals precision
    pub total_fees_collected: u64,
    pub total_burned: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct StakerAccount {
    pub owner: Pubkey,
    pub staked_amount: u64,
    pub sidl_balance: u64,
    pub last_stake_timestamp: i64,
}

#[account]
#[derive(InitSpace)]
pub struct VePosition {
    pub owner: Pubkey,
    pub locked_amount: u64,
    pub ve_amount: u64,
    pub lock_start: i64,
    pub lock_end: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct BondConfig {
    pub bond_asset: Pubkey,
    pub discount_bps: u16,
    pub vesting_term: i64,
    pub max_capacity: u64,
    pub total_bonded: u64,
    pub is_active: bool,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserBond {
    pub owner: Pubkey,
    pub bond_config: Pubkey,
    pub amount_bonded: u64,
    pub idl_to_vest: u64,
    pub vesting_start: i64,
    pub vesting_end: i64,
    pub last_claim: i64,
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
    #[max_len(256)]
    pub description: String,
    pub total_yes_amount: u64,
    pub total_no_amount: u64,
    pub resolved: bool,
    pub outcome: Option<bool>,
    pub actual_value: Option<u64>,
    pub created_at: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Bet {
    pub owner: Pubkey,
    pub market: Pubkey,
    pub amount: u64,
    pub effective_amount: u64, // After staking multiplier
    pub bet_yes: bool,
    pub timestamp: i64,
    pub claimed: bool,
}

#[account]
#[derive(InitSpace)]
pub struct Gauge {
    #[max_len(32)]
    pub protocol_id: String,
    pub total_votes: u64,
    pub reward_weight: u64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct GaugeVote {
    pub voter: Pubkey,
    pub gauge: Pubkey,
    pub weight: u64,
    pub voting_power: u64,
    pub timestamp: i64,
}

// ==================== TYPES ====================

#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum MetricType {
    Tvl,           // Total Value Locked
    Volume24h,     // 24h trading volume
    Users,         // Unique users
    Transactions,  // Transaction count
    Price,         // Token price
    MarketCap,     // Market cap
    Custom,        // Custom metric
}

// ==================== ERRORS ====================

#[error_code]
pub enum IdlError {
    #[msg("Invalid amount")]
    InvalidAmount,

    #[msg("Rebase too early")]
    RebaseTooEarly,

    #[msg("Invalid lock duration")]
    InvalidLockDuration,

    #[msg("Lock not expired")]
    LockNotExpired,

    #[msg("Bond not active")]
    BondNotActive,

    #[msg("Bond capacity exceeded")]
    BondCapacityExceeded,

    #[msg("Nothing to claim")]
    NothingToClaim,

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

    #[msg("veIDL position expired")]
    VeExpired,

    #[msg("Invalid weight")]
    InvalidWeight,
}
