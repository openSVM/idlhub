// ═══════════════════════════════════════════════════════════════════════════════
//  IDL STABLESWAP - Curve-style AMM for 1:1 Token Swaps
// ═══════════════════════════════════════════════════════════════════════════════
//
//  Enables low-slippage swaps between BAGS-IDL and PUMP-IDL tokens.
//  Uses Curve Finance's StableSwap invariant for near-1:1 exchange rates.
//
//  Tokens:
//    BAGS-IDL: 8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS (bags.fm)
//    PUMP-IDL: 4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump (pump.fun)
//
// ═══════════════════════════════════════════════════════════════════════════════

use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer, MintTo, Burn};

declare_id!("EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte");

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/// Amplification coefficient - higher = closer to constant-sum (1:1)
/// A=1000 provides tight peg with graceful degradation when imbalanced
pub const DEFAULT_AMPLIFICATION: u64 = 1000;

/// Maximum amplification to prevent math issues
pub const MAX_AMPLIFICATION: u64 = 10000;

/// Minimum amplification
pub const MIN_AMPLIFICATION: u64 = 1;

/// Swap fee in basis points (0.04% = 4 bps)
pub const SWAP_FEE_BPS: u64 = 4;

/// Admin fee as percentage of swap fee (50%)
pub const ADMIN_FEE_PERCENT: u64 = 50;

/// Number of tokens in the pool
pub const N_COINS: u128 = 2;

/// Maximum iterations for Newton's method
pub const MAX_ITERATIONS: u64 = 255;

/// Convergence threshold for Newton's method
pub const CONVERGENCE_THRESHOLD: u128 = 1;

/// Minimum liquidity to prevent dust attacks (locked forever)
pub const MINIMUM_LIQUIDITY: u64 = 1000;

/// Token decimals (both tokens use 6 decimals)
pub const TOKEN_DECIMALS: u8 = 6;

/// Authority transfer timelock (48 hours)
pub const AUTHORITY_TIMELOCK: i64 = 172800;

/// Minimum swap amount to prevent dust (0.1 tokens with 6 decimals)
pub const MIN_SWAP_AMOUNT: u64 = 100_000;

/// Minimum initial deposit to prevent inflation attack (100 tokens each)
pub const MIN_INITIAL_DEPOSIT: u64 = 100_000_000;

/// Amplification ramping duration (1 day minimum)
pub const MIN_RAMP_DURATION: i64 = 86400;

/// Maximum amplification change per ramp (10x)
pub const MAX_AMP_CHANGE: u64 = 10;

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM
// ═══════════════════════════════════════════════════════════════════════════════

#[program]
pub mod idl_stableswap {
    use super::*;

    /// Initialize the StableSwap pool
    /// Creates vaults for both tokens and LP token mint
    pub fn initialize(
        ctx: Context<Initialize>,
        amplification: u64,
    ) -> Result<()> {
        require!(
            amplification >= MIN_AMPLIFICATION && amplification <= MAX_AMPLIFICATION,
            StableSwapError::InvalidAmplification
        );

        let pool = &mut ctx.accounts.pool;

        pool.authority = ctx.accounts.authority.key();
        pool.bags_mint = ctx.accounts.bags_mint.key();
        pool.pump_mint = ctx.accounts.pump_mint.key();
        pool.bags_vault = ctx.accounts.bags_vault.key();
        pool.pump_vault = ctx.accounts.pump_vault.key();
        pool.lp_mint = ctx.accounts.lp_mint.key();
        pool.amplification = amplification;
        pool.initial_amplification = amplification;
        pool.target_amplification = amplification;
        pool.ramp_start_time = 0;
        pool.ramp_stop_time = 0;
        pool.swap_fee_bps = SWAP_FEE_BPS;
        pool.admin_fee_percent = ADMIN_FEE_PERCENT;
        pool.bags_balance = 0;
        pool.pump_balance = 0;
        pool.lp_supply = 0;
        pool.admin_fees_bags = 0;
        pool.admin_fees_pump = 0;
        pool.total_volume_bags = 0;
        pool.total_volume_pump = 0;
        pool.paused = false;
        pool.bump = ctx.bumps.pool;
        pool.bags_vault_bump = ctx.bumps.bags_vault;
        pool.pump_vault_bump = ctx.bumps.pump_vault;
        pool.lp_mint_bump = ctx.bumps.lp_mint;
        pool.pending_authority = None;
        pool.authority_transfer_time = None;

        msg!("IDL StableSwap initialized");
        msg!("  BAGS Mint: {}", pool.bags_mint);
        msg!("  PUMP Mint: {}", pool.pump_mint);
        msg!("  Amplification: {}", amplification);

        Ok(())
    }

    /// Add liquidity to the pool
    /// Accepts any ratio of tokens, calculates LP tokens based on invariant change
    pub fn add_liquidity(
        ctx: Context<AddLiquidity>,
        bags_amount: u64,
        pump_amount: u64,
        min_lp_amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.paused, StableSwapError::PoolPaused);
        require!(bags_amount > 0 || pump_amount > 0, StableSwapError::ZeroAmount);

        // SECURITY: First deposit requires minimum amounts to prevent inflation attack
        if ctx.accounts.pool.lp_supply == 0 {
            require!(
                bags_amount >= MIN_INITIAL_DEPOSIT && pump_amount >= MIN_INITIAL_DEPOSIT,
                StableSwapError::InitialDepositTooSmall
            );
        }

        // AUDIT FIX: Validate vault balances match tracked balances (prevents donation attack)
        require!(
            ctx.accounts.bags_vault.amount >= ctx.accounts.pool.bags_balance,
            StableSwapError::VaultBalanceMismatch
        );
        require!(
            ctx.accounts.pump_vault.amount >= ctx.accounts.pool.pump_balance,
            StableSwapError::VaultBalanceMismatch
        );

        // Get current amplification (with ramping support)
        let current_amp = get_current_amplification(&ctx.accounts.pool)?;

        // Calculate D before adding liquidity
        let d0 = calculate_d(
            ctx.accounts.pool.bags_balance,
            ctx.accounts.pool.pump_balance,
            current_amp
        )?;

        let old_bags_balance = ctx.accounts.pool.bags_balance;
        let old_pump_balance = ctx.accounts.pool.pump_balance;
        let old_lp_supply = ctx.accounts.pool.lp_supply;
        let pool_bump = ctx.accounts.pool.bump;

        // Transfer BAGS tokens if provided
        if bags_amount > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_bags.to_account_info(),
                        to: ctx.accounts.bags_vault.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                bags_amount,
            )?;
        }

        // Transfer PUMP tokens if provided
        if pump_amount > 0 {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_pump.to_account_info(),
                        to: ctx.accounts.pump_vault.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                pump_amount,
            )?;
        }

        // New balances after transfers
        let new_bags_balance = old_bags_balance.checked_add(bags_amount).ok_or(StableSwapError::MathOverflow)?;
        let new_pump_balance = old_pump_balance.checked_add(pump_amount).ok_or(StableSwapError::MathOverflow)?;

        // Calculate D after adding liquidity
        let d1 = calculate_d(new_bags_balance, new_pump_balance, current_amp)?;
        require!(d1 > d0, StableSwapError::InvariantViolation);

        // Calculate LP tokens to mint and imbalance fees
        let (lp_amount, imbalance_fee_bags, imbalance_fee_pump, is_first_deposit) = if old_lp_supply == 0 {
            // First deposit: LP tokens = D (minus minimum liquidity locked forever)
            let initial_lp = d1.checked_sub(MINIMUM_LIQUIDITY as u128)
                .ok_or(StableSwapError::InsufficientLiquidity)?;

            (initial_lp as u64, 0u64, 0u64, true)
        } else {
            // Subsequent deposits: proportional to D increase
            let lp_amount = (d1 - d0)
                .checked_mul(old_lp_supply as u128)
                .and_then(|v| v.checked_div(d0))
                .ok_or(StableSwapError::MathOverflow)? as u64;

            // Apply imbalance fee for non-proportional deposits
            // FIXED: Calculate ideal balance from OLD balance scaled by D ratio
            let ideal_bags = (old_bags_balance as u128)
                .checked_mul(d1)
                .and_then(|v| v.checked_div(d0))
                .ok_or(StableSwapError::MathOverflow)? as u64;
            let ideal_pump = (old_pump_balance as u128)
                .checked_mul(d1)
                .and_then(|v| v.checked_div(d0))
                .ok_or(StableSwapError::MathOverflow)? as u64;

            let bags_diff = if new_bags_balance > ideal_bags {
                new_bags_balance - ideal_bags
            } else {
                ideal_bags - new_bags_balance
            };
            let pump_diff = if new_pump_balance > ideal_pump {
                new_pump_balance - ideal_pump
            } else {
                ideal_pump - new_pump_balance
            };

            // Fee on imbalance (using swap fee rate)
            let imbalance_fee_bags = (bags_diff as u128 * SWAP_FEE_BPS as u128 / 10000) as u64;
            let imbalance_fee_pump = (pump_diff as u128 * SWAP_FEE_BPS as u128 / 10000) as u64;

            (lp_amount, imbalance_fee_bags, imbalance_fee_pump, false)
        };

        require!(lp_amount >= min_lp_amount, StableSwapError::SlippageExceeded);

        // Mint LP tokens to user
        let pool_seeds = &[b"pool".as_ref(), &[pool_bump]];
        let signer_seeds = &[&pool_seeds[..]];

        token::mint_to(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                MintTo {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    to: ctx.accounts.user_lp.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer_seeds,
            ),
            lp_amount,
        )?;

        // Update state after all operations
        ctx.accounts.pool.bags_balance = new_bags_balance;
        ctx.accounts.pool.pump_balance = new_pump_balance;

        // FIXED: Properly handle first deposit LP supply
        // First deposit: set to MINIMUM_LIQUIDITY (locked) + lp_amount (to user)
        // Subsequent: just add lp_amount
        if is_first_deposit {
            ctx.accounts.pool.lp_supply = MINIMUM_LIQUIDITY
                .checked_add(lp_amount)
                .ok_or(StableSwapError::MathOverflow)?;
        } else {
            ctx.accounts.pool.lp_supply = ctx.accounts.pool.lp_supply
                .checked_add(lp_amount)
                .ok_or(StableSwapError::MathOverflow)?;
        }
        ctx.accounts.pool.admin_fees_bags = ctx.accounts.pool.admin_fees_bags
            .checked_add(imbalance_fee_bags * ADMIN_FEE_PERCENT as u64 / 100)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.admin_fees_pump = ctx.accounts.pool.admin_fees_pump
            .checked_add(imbalance_fee_pump * ADMIN_FEE_PERCENT as u64 / 100)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Added liquidity: {} BAGS + {} PUMP = {} LP", bags_amount, pump_amount, lp_amount);

        Ok(())
    }

    /// Remove liquidity from the pool
    /// Burns LP tokens and returns proportional amounts of both tokens
    pub fn remove_liquidity(
        ctx: Context<RemoveLiquidity>,
        lp_amount: u64,
        min_bags_amount: u64,
        min_pump_amount: u64,
    ) -> Result<()> {
        // NOTE: Intentionally no pause check - users must always be able to withdraw
        require!(lp_amount > 0, StableSwapError::ZeroAmount);
        require!(ctx.accounts.pool.lp_supply > lp_amount, StableSwapError::InsufficientLiquidity);

        // AUDIT FIX: Ensure minimum liquidity remains (prevent pool drain)
        require!(
            ctx.accounts.pool.lp_supply.saturating_sub(lp_amount) >= MINIMUM_LIQUIDITY,
            StableSwapError::InsufficientLiquidity
        );

        // Calculate proportional amounts
        let bags_amount = (ctx.accounts.pool.bags_balance as u128)
            .checked_mul(lp_amount as u128)
            .and_then(|v| v.checked_div(ctx.accounts.pool.lp_supply as u128))
            .ok_or(StableSwapError::MathOverflow)? as u64;

        let pump_amount = (ctx.accounts.pool.pump_balance as u128)
            .checked_mul(lp_amount as u128)
            .and_then(|v| v.checked_div(ctx.accounts.pool.lp_supply as u128))
            .ok_or(StableSwapError::MathOverflow)? as u64;

        require!(bags_amount >= min_bags_amount, StableSwapError::SlippageExceeded);
        require!(pump_amount >= min_pump_amount, StableSwapError::SlippageExceeded);

        let pool_bump = ctx.accounts.pool.bump;

        // Burn LP tokens
        token::burn(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Burn {
                    mint: ctx.accounts.lp_mint.to_account_info(),
                    from: ctx.accounts.user_lp.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            lp_amount,
        )?;

        // Transfer tokens to user
        let pool_seeds = &[b"pool".as_ref(), &[pool_bump]];
        let signer_seeds = &[&pool_seeds[..]];

        // Transfer BAGS
        if bags_amount > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.bags_vault.to_account_info(),
                        to: ctx.accounts.user_bags.to_account_info(),
                        authority: ctx.accounts.pool.to_account_info(),
                    },
                    signer_seeds,
                ),
                bags_amount,
            )?;
        }

        // Transfer PUMP
        if pump_amount > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.pump_vault.to_account_info(),
                        to: ctx.accounts.user_pump.to_account_info(),
                        authority: ctx.accounts.pool.to_account_info(),
                    },
                    signer_seeds,
                ),
                pump_amount,
            )?;
        }

        // Update state after transfers
        ctx.accounts.pool.lp_supply = ctx.accounts.pool.lp_supply
            .checked_sub(lp_amount)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.bags_balance = ctx.accounts.pool.bags_balance
            .checked_sub(bags_amount)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.pump_balance = ctx.accounts.pool.pump_balance
            .checked_sub(pump_amount)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Removed liquidity: {} LP = {} BAGS + {} PUMP", lp_amount, bags_amount, pump_amount);

        Ok(())
    }

    /// Swap BAGS for PUMP
    pub fn swap_bags_to_pump(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        deadline: i64,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.paused, StableSwapError::PoolPaused);
        require!(amount_in >= MIN_SWAP_AMOUNT, StableSwapError::AmountTooSmall);

        // SECURITY: Check deadline to prevent stale transactions
        let clock = Clock::get()?;
        require!(clock.unix_timestamp <= deadline, StableSwapError::TransactionExpired);

        // AUDIT FIX: Validate vault balances match tracked balances (prevents donation attack)
        require!(
            ctx.accounts.bags_vault.amount >= ctx.accounts.pool.bags_balance,
            StableSwapError::VaultBalanceMismatch
        );
        require!(
            ctx.accounts.pump_vault.amount >= ctx.accounts.pool.pump_balance,
            StableSwapError::VaultBalanceMismatch
        );

        // Get current amplification (with ramping support)
        let current_amp = get_current_amplification(&ctx.accounts.pool)?;

        // Calculate output amount using StableSwap formula
        let amount_out = calculate_swap_output(
            ctx.accounts.pool.bags_balance,
            ctx.accounts.pool.pump_balance,
            amount_in,
            current_amp,
            true, // bags to pump
        )?;

        // Apply swap fee
        let fee = amount_out as u128 * ctx.accounts.pool.swap_fee_bps as u128 / 10000;
        let admin_fee = fee * ctx.accounts.pool.admin_fee_percent as u128 / 100;
        let amount_out_after_fee = amount_out - fee as u64;

        require!(amount_out_after_fee >= min_amount_out, StableSwapError::SlippageExceeded);
        require!(amount_out_after_fee <= ctx.accounts.pool.pump_balance, StableSwapError::InsufficientLiquidity);

        let pool_bump = ctx.accounts.pool.bump;

        // Transfer BAGS in
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_bags.to_account_info(),
                    to: ctx.accounts.bags_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_in,
        )?;

        // Transfer PUMP out
        let pool_seeds = &[b"pool".as_ref(), &[pool_bump]];
        let signer_seeds = &[&pool_seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.pump_vault.to_account_info(),
                    to: ctx.accounts.user_pump.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount_out_after_fee,
        )?;

        // Update balances after transfers
        ctx.accounts.pool.bags_balance = ctx.accounts.pool.bags_balance
            .checked_add(amount_in)
            .ok_or(StableSwapError::MathOverflow)?;
        // SELF-REVIEW FIX: Reduce by amount_out (not amount_out_after_fee)
        // This way vault - tracked_balance = fee, which can be claimed
        // Fee breakdown: (fee - admin_fee) goes to LPs, admin_fee to admin
        ctx.accounts.pool.pump_balance = ctx.accounts.pool.pump_balance
            .checked_sub(amount_out)
            .ok_or(StableSwapError::MathOverflow)?;

        // Track admin's portion of fees
        ctx.accounts.pool.admin_fees_pump = ctx.accounts.pool.admin_fees_pump
            .checked_add(admin_fee as u64)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.total_volume_bags = ctx.accounts.pool.total_volume_bags
            .checked_add(amount_in)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Swapped {} BAGS -> {} PUMP (fee: {})", amount_in, amount_out_after_fee, fee);

        Ok(())
    }

    /// Swap PUMP for BAGS
    pub fn swap_pump_to_bags(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        deadline: i64,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.paused, StableSwapError::PoolPaused);
        require!(amount_in >= MIN_SWAP_AMOUNT, StableSwapError::AmountTooSmall);

        // SECURITY: Check deadline to prevent stale transactions
        let clock = Clock::get()?;
        require!(clock.unix_timestamp <= deadline, StableSwapError::TransactionExpired);

        // AUDIT FIX: Validate vault balances match tracked balances (prevents donation attack)
        require!(
            ctx.accounts.bags_vault.amount >= ctx.accounts.pool.bags_balance,
            StableSwapError::VaultBalanceMismatch
        );
        require!(
            ctx.accounts.pump_vault.amount >= ctx.accounts.pool.pump_balance,
            StableSwapError::VaultBalanceMismatch
        );

        // Get current amplification (with ramping support)
        let current_amp = get_current_amplification(&ctx.accounts.pool)?;

        // Calculate output amount using StableSwap formula
        let amount_out = calculate_swap_output(
            ctx.accounts.pool.bags_balance,
            ctx.accounts.pool.pump_balance,
            amount_in,
            current_amp,
            false, // pump to bags
        )?;

        // Apply swap fee
        let fee = amount_out as u128 * ctx.accounts.pool.swap_fee_bps as u128 / 10000;
        let admin_fee = fee * ctx.accounts.pool.admin_fee_percent as u128 / 100;
        let amount_out_after_fee = amount_out - fee as u64;

        require!(amount_out_after_fee >= min_amount_out, StableSwapError::SlippageExceeded);
        require!(amount_out_after_fee <= ctx.accounts.pool.bags_balance, StableSwapError::InsufficientLiquidity);

        let pool_bump = ctx.accounts.pool.bump;

        // Transfer PUMP in
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_pump.to_account_info(),
                    to: ctx.accounts.pump_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount_in,
        )?;

        // Transfer BAGS out
        let pool_seeds = &[b"pool".as_ref(), &[pool_bump]];
        let signer_seeds = &[&pool_seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.bags_vault.to_account_info(),
                    to: ctx.accounts.user_bags.to_account_info(),
                    authority: ctx.accounts.pool.to_account_info(),
                },
                signer_seeds,
            ),
            amount_out_after_fee,
        )?;

        // Update balances after transfers
        ctx.accounts.pool.pump_balance = ctx.accounts.pool.pump_balance
            .checked_add(amount_in)
            .ok_or(StableSwapError::MathOverflow)?;
        // SELF-REVIEW FIX: Reduce by amount_out (not amount_out_after_fee)
        // This way vault - tracked_balance = fee, which can be claimed
        ctx.accounts.pool.bags_balance = ctx.accounts.pool.bags_balance
            .checked_sub(amount_out)
            .ok_or(StableSwapError::MathOverflow)?;

        // Track admin's portion of fees
        ctx.accounts.pool.admin_fees_bags = ctx.accounts.pool.admin_fees_bags
            .checked_add(admin_fee as u64)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.total_volume_pump = ctx.accounts.pool.total_volume_pump
            .checked_add(amount_in)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Swapped {} PUMP -> {} BAGS (fee: {})", amount_in, amount_out_after_fee, fee);

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ADMIN FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// Start amplification ramping (admin only)
    /// Amplification changes gradually over time to prevent manipulation
    pub fn ramp_amplification(
        ctx: Context<AdminOnly>,
        target_amplification: u64,
        ramp_duration: i64,
    ) -> Result<()> {
        require!(
            target_amplification >= MIN_AMPLIFICATION && target_amplification <= MAX_AMPLIFICATION,
            StableSwapError::InvalidAmplification
        );
        require!(ramp_duration >= MIN_RAMP_DURATION, StableSwapError::RampTooFast);

        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;

        // Get current effective amplification
        let current_amp = get_current_amplification(pool)?;

        // Check max change constraint (10x in either direction)
        let max_new = current_amp.saturating_mul(MAX_AMP_CHANGE);
        let min_new = current_amp / MAX_AMP_CHANGE;
        require!(
            target_amplification <= max_new && target_amplification >= min_new,
            StableSwapError::AmpChangeTooLarge
        );

        // Set up the ramp
        pool.initial_amplification = current_amp;
        pool.target_amplification = target_amplification;
        pool.ramp_start_time = clock.unix_timestamp;
        pool.ramp_stop_time = clock.unix_timestamp + ramp_duration;

        msg!(
            "Amplification ramp started: {} -> {} over {} seconds",
            current_amp,
            target_amplification,
            ramp_duration
        );
        Ok(())
    }

    /// Stop amplification ramping (admin only)
    pub fn stop_ramp_amplification(ctx: Context<AdminOnly>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let current_amp = get_current_amplification(pool)?;

        // Set current amp as both initial and target (stops ramping)
        pool.initial_amplification = current_amp;
        pool.target_amplification = current_amp;
        pool.amplification = current_amp;
        pool.ramp_start_time = 0;
        pool.ramp_stop_time = 0;

        msg!("Amplification ramp stopped at {}", current_amp);
        Ok(())
    }

    /// Update swap fee (admin only)
    pub fn update_swap_fee(
        ctx: Context<AdminOnly>,
        new_fee_bps: u64,
    ) -> Result<()> {
        require!(new_fee_bps <= 100, StableSwapError::FeeTooHigh); // Max 1%

        let pool = &mut ctx.accounts.pool;
        let old_fee = pool.swap_fee_bps;
        pool.swap_fee_bps = new_fee_bps;

        msg!("Swap fee updated: {} -> {} bps", old_fee, new_fee_bps);
        Ok(())
    }

    /// Pause/unpause the pool (admin only)
    pub fn set_paused(
        ctx: Context<AdminOnly>,
        paused: bool,
    ) -> Result<()> {
        ctx.accounts.pool.paused = paused;
        msg!("Pool paused: {}", paused);
        Ok(())
    }

    /// Withdraw accumulated admin fees (admin only)
    /// AUDIT FIX: Ensure admin fees don't drain LP deposits
    pub fn withdraw_admin_fees(ctx: Context<WithdrawAdminFees>) -> Result<()> {
        let bags_fees = ctx.accounts.pool.admin_fees_bags;
        let pump_fees = ctx.accounts.pool.admin_fees_pump;

        require!(bags_fees > 0 || pump_fees > 0, StableSwapError::NoFeesToWithdraw);

        // SECURITY: Validate fees don't exceed actual vault balance
        let bags_vault_balance = ctx.accounts.bags_vault.amount;
        let pump_vault_balance = ctx.accounts.pump_vault.amount;
        require!(bags_fees <= bags_vault_balance, StableSwapError::InsufficientLiquidity);
        require!(pump_fees <= pump_vault_balance, StableSwapError::InsufficientLiquidity);

        // AUDIT FIX: Admin fees must not exceed the difference between vault and tracked balance
        // This ensures we don't withdraw LP deposits
        let bags_available = bags_vault_balance.saturating_sub(ctx.accounts.pool.bags_balance);
        let pump_available = pump_vault_balance.saturating_sub(ctx.accounts.pool.pump_balance);
        let bags_to_withdraw = std::cmp::min(bags_fees, bags_available);
        let pump_to_withdraw = std::cmp::min(pump_fees, pump_available);

        require!(bags_to_withdraw > 0 || pump_to_withdraw > 0, StableSwapError::NoFeesToWithdraw);

        let pool_bump = ctx.accounts.pool.bump;
        let pool_seeds = &[b"pool".as_ref(), &[pool_bump]];
        let signer_seeds = &[&pool_seeds[..]];

        // AUDIT FIX: Withdraw only safe amounts (capped to available)
        if bags_to_withdraw > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.bags_vault.to_account_info(),
                        to: ctx.accounts.admin_bags.to_account_info(),
                        authority: ctx.accounts.pool.to_account_info(),
                    },
                    signer_seeds,
                ),
                bags_to_withdraw,
            )?;
        }

        // AUDIT FIX: Withdraw only safe amounts (capped to available)
        if pump_to_withdraw > 0 {
            token::transfer(
                CpiContext::new_with_signer(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.pump_vault.to_account_info(),
                        to: ctx.accounts.admin_pump.to_account_info(),
                        authority: ctx.accounts.pool.to_account_info(),
                    },
                    signer_seeds,
                ),
                pump_to_withdraw,
            )?;
        }

        // AUDIT FIX: Only subtract what was actually withdrawn
        ctx.accounts.pool.admin_fees_bags = ctx.accounts.pool.admin_fees_bags.saturating_sub(bags_to_withdraw);
        ctx.accounts.pool.admin_fees_pump = ctx.accounts.pool.admin_fees_pump.saturating_sub(pump_to_withdraw);

        msg!("Admin fees withdrawn: {} BAGS, {} PUMP", bags_to_withdraw, pump_to_withdraw);
        Ok(())
    }

    /// Initiate authority transfer with timelock (admin only)
    pub fn initiate_authority_transfer(
        ctx: Context<AdminOnly>,
        new_authority: Pubkey,
    ) -> Result<()> {
        require!(new_authority != Pubkey::default(), StableSwapError::InvalidAuthority);

        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;

        pool.pending_authority = Some(new_authority);
        pool.authority_transfer_time = Some(clock.unix_timestamp);

        msg!("Authority transfer initiated to {}. Timelock: 48 hours", new_authority);
        Ok(())
    }

    /// Complete authority transfer after timelock (new authority only)
    pub fn complete_authority_transfer(ctx: Context<CompleteAuthorityTransfer>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;

        let pending = pool.pending_authority.ok_or(StableSwapError::NoTransferPending)?;
        let transfer_time = pool.authority_transfer_time.ok_or(StableSwapError::NoTransferPending)?;

        require!(pending == ctx.accounts.new_authority.key(), StableSwapError::Unauthorized);
        require!(
            clock.unix_timestamp >= transfer_time + AUTHORITY_TIMELOCK,
            StableSwapError::TimelockNotExpired
        );

        let old_authority = pool.authority;
        pool.authority = pending;
        pool.pending_authority = None;
        pool.authority_transfer_time = None;

        msg!("Authority transferred: {} -> {}", old_authority, pending);
        Ok(())
    }

    /// Cancel pending authority transfer (current admin only)
    pub fn cancel_authority_transfer(ctx: Context<AdminOnly>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        require!(pool.pending_authority.is_some(), StableSwapError::NoTransferPending);

        pool.pending_authority = None;
        pool.authority_transfer_time = None;

        msg!("Authority transfer cancelled");
        Ok(())
    }
}

// ═══════════════════════════════════════════════════════════════════════════════
// STABLESWAP MATH - Curve Finance Style
// ═══════════════════════════════════════════════════════════════════════════════

/// Get current amplification coefficient with ramping support
fn get_current_amplification(pool: &StablePool) -> Result<u64> {
    let clock = Clock::get()?;
    let now = clock.unix_timestamp;

    // If no ramping is active, return base amplification
    if pool.ramp_stop_time == 0 || now >= pool.ramp_stop_time {
        return Ok(pool.target_amplification.max(pool.amplification));
    }

    if now <= pool.ramp_start_time {
        return Ok(pool.initial_amplification.max(pool.amplification));
    }

    // Linear interpolation between initial and target
    let elapsed = (now - pool.ramp_start_time) as u128;
    let duration = (pool.ramp_stop_time - pool.ramp_start_time) as u128;

    let initial = pool.initial_amplification as u128;
    let target = pool.target_amplification as u128;

    let current = if target > initial {
        initial + (target - initial) * elapsed / duration
    } else {
        initial - (initial - target) * elapsed / duration
    };

    Ok(current as u64)
}

/// Calculate D (invariant) using Newton's method
/// StableSwap invariant: A*n^n*sum(x_i) + D = A*D*n^n + D^(n+1)/(n^n*prod(x_i))
fn calculate_d(bags_balance: u64, pump_balance: u64, amplification: u64) -> Result<u128> {
    let balances = [bags_balance as u128, pump_balance as u128];

    let sum: u128 = balances.iter().sum();
    if sum == 0 {
        return Ok(0);
    }

    let n = N_COINS;
    let ann = (amplification as u128) * n; // A * n

    let mut d = sum;
    let mut d_prev;

    // Newton's method iteration
    for _ in 0..MAX_ITERATIONS {
        // D_P = D^(n+1) / (n^n * prod(x_i))
        let mut d_p = d;
        for balance in balances.iter() {
            if *balance == 0 {
                return Ok(0);
            }
            // d_p = d_p * D / (x * n)
            d_p = d_p
                .checked_mul(d)
                .and_then(|v| v.checked_div(balance.checked_mul(n)?))
                .ok_or(StableSwapError::MathOverflow)?;
        }

        d_prev = d;

        // D = (Ann * S + D_P * n) * D / ((Ann - 1) * D + (n + 1) * D_P)
        let numerator = ann
            .checked_mul(sum)
            .and_then(|v| v.checked_add(d_p.checked_mul(n)?))
            .and_then(|v| v.checked_mul(d))
            .ok_or(StableSwapError::MathOverflow)?;

        let denominator = ann
            .checked_sub(1)
            .and_then(|v| v.checked_mul(d))
            .and_then(|v| v.checked_add(d_p.checked_mul(n + 1)?))
            .ok_or(StableSwapError::MathOverflow)?;

        if denominator == 0 {
            return Err(StableSwapError::MathOverflow.into());
        }

        d = numerator
            .checked_div(denominator)
            .ok_or(StableSwapError::MathOverflow)?;

        // Check convergence
        if d > d_prev {
            if d - d_prev <= CONVERGENCE_THRESHOLD {
                return Ok(d);
            }
        } else if d_prev - d <= CONVERGENCE_THRESHOLD {
            return Ok(d);
        }
    }

    Err(StableSwapError::ConvergenceFailed.into())
}

/// Calculate y (output balance) given x (input balance) and D
fn calculate_y(x: u128, d: u128, amplification: u64) -> Result<u128> {
    if d == 0 || x == 0 {
        return Ok(0);
    }

    let n = N_COINS;
    let ann = (amplification as u128) * n;

    // c = D^(n+1) / (n^n * x * Ann)
    let c = d
        .checked_mul(d)
        .and_then(|v| v.checked_div(x.checked_mul(n)?))
        .and_then(|v| v.checked_mul(d))
        .and_then(|v| v.checked_div(ann.checked_mul(n)?))
        .ok_or(StableSwapError::MathOverflow)?;

    // b = x + D/Ann
    let b = x
        .checked_add(d.checked_div(ann).ok_or(StableSwapError::MathOverflow)?)
        .ok_or(StableSwapError::MathOverflow)?;

    // Newton's method to solve for y
    let mut y = d;
    let mut y_prev;

    for _ in 0..MAX_ITERATIONS {
        y_prev = y;

        // y = (y^2 + c) / (2*y + b - D)
        let numerator = y
            .checked_mul(y)
            .and_then(|v| v.checked_add(c))
            .ok_or(StableSwapError::MathOverflow)?;

        let denominator = y
            .checked_mul(2)
            .and_then(|v| v.checked_add(b))
            .and_then(|v| v.checked_sub(d))
            .ok_or(StableSwapError::MathOverflow)?;

        if denominator == 0 {
            return Err(StableSwapError::MathOverflow.into());
        }

        y = numerator
            .checked_div(denominator)
            .ok_or(StableSwapError::MathOverflow)?;

        // Check convergence
        if y > y_prev {
            if y - y_prev <= CONVERGENCE_THRESHOLD {
                return Ok(y);
            }
        } else if y_prev - y <= CONVERGENCE_THRESHOLD {
            return Ok(y);
        }
    }

    Err(StableSwapError::ConvergenceFailed.into())
}

/// Calculate swap output amount
fn calculate_swap_output(
    bags_balance: u64,
    pump_balance: u64,
    amount_in: u64,
    amplification: u64,
    bags_to_pump: bool,
) -> Result<u64> {
    let d = calculate_d(bags_balance, pump_balance, amplification)?;

    let (x_new, y_old) = if bags_to_pump {
        ((bags_balance as u128) + (amount_in as u128), pump_balance as u128)
    } else {
        ((pump_balance as u128) + (amount_in as u128), bags_balance as u128)
    };

    let y_new = calculate_y(x_new, d, amplification)?;

    let dy = y_old
        .checked_sub(y_new)
        .ok_or(StableSwapError::MathOverflow)?;

    Ok(dy as u64)
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StablePool::INIT_SPACE,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Account<'info, StablePool>,

    pub bags_mint: Account<'info, Mint>,
    pub pump_mint: Account<'info, Mint>,

    #[account(
        init,
        payer = authority,
        seeds = [b"bags_vault"],
        bump,
        token::mint = bags_mint,
        token::authority = pool,
    )]
    pub bags_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [b"pump_vault"],
        bump,
        token::mint = pump_mint,
        token::authority = pool,
    )]
    pub pump_vault: Account<'info, TokenAccount>,

    #[account(
        init,
        payer = authority,
        seeds = [b"lp_mint"],
        bump,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = pool,
    )]
    pub lp_mint: Account<'info, Mint>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, StablePool>,

    #[account(mut, seeds = [b"bags_vault"], bump = pool.bags_vault_bump)]
    pub bags_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"pump_vault"], bump = pool.pump_vault_bump)]
    pub pump_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"lp_mint"], bump = pool.lp_mint_bump)]
    pub lp_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = user_bags.mint == pool.bags_mint @ StableSwapError::InvalidMint,
        constraint = user_bags.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_bags: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_pump.mint == pool.pump_mint @ StableSwapError::InvalidMint,
        constraint = user_pump.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_pump: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_lp.mint == pool.lp_mint @ StableSwapError::InvalidMint,
        constraint = user_lp.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_lp: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, StablePool>,

    #[account(mut, seeds = [b"bags_vault"], bump = pool.bags_vault_bump)]
    pub bags_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"pump_vault"], bump = pool.pump_vault_bump)]
    pub pump_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"lp_mint"], bump = pool.lp_mint_bump)]
    pub lp_mint: Account<'info, Mint>,

    #[account(
        mut,
        constraint = user_bags.mint == pool.bags_mint @ StableSwapError::InvalidMint,
        constraint = user_bags.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_bags: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_pump.mint == pool.pump_mint @ StableSwapError::InvalidMint,
        constraint = user_pump.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_pump: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_lp.mint == pool.lp_mint @ StableSwapError::InvalidMint,
        constraint = user_lp.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_lp: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Account<'info, StablePool>,

    #[account(mut, seeds = [b"bags_vault"], bump = pool.bags_vault_bump)]
    pub bags_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"pump_vault"], bump = pool.pump_vault_bump)]
    pub pump_vault: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_bags.mint == pool.bags_mint @ StableSwapError::InvalidMint,
        constraint = user_bags.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_bags: Account<'info, TokenAccount>,

    #[account(
        mut,
        constraint = user_pump.mint == pool.pump_mint @ StableSwapError::InvalidMint,
        constraint = user_pump.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_pump: Account<'info, TokenAccount>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct AdminOnly<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump,
        constraint = pool.authority == authority.key() @ StableSwapError::Unauthorized
    )]
    pub pool: Account<'info, StablePool>,

    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct WithdrawAdminFees<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump,
        constraint = pool.authority == authority.key() @ StableSwapError::Unauthorized
    )]
    pub pool: Account<'info, StablePool>,

    #[account(mut, seeds = [b"bags_vault"], bump = pool.bags_vault_bump)]
    pub bags_vault: Account<'info, TokenAccount>,

    #[account(mut, seeds = [b"pump_vault"], bump = pool.pump_vault_bump)]
    pub pump_vault: Account<'info, TokenAccount>,

    #[account(mut, constraint = admin_bags.mint == pool.bags_mint @ StableSwapError::InvalidMint)]
    pub admin_bags: Account<'info, TokenAccount>,

    #[account(mut, constraint = admin_pump.mint == pool.pump_mint @ StableSwapError::InvalidMint)]
    pub admin_pump: Account<'info, TokenAccount>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CompleteAuthorityTransfer<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump
    )]
    pub pool: Account<'info, StablePool>,

    pub new_authority: Signer<'info>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════

#[account]
#[derive(InitSpace)]
pub struct StablePool {
    pub authority: Pubkey,
    pub bags_mint: Pubkey,
    pub pump_mint: Pubkey,
    pub bags_vault: Pubkey,
    pub pump_vault: Pubkey,
    pub lp_mint: Pubkey,
    /// Base amplification coefficient
    pub amplification: u64,
    /// Amplification ramping: initial value
    pub initial_amplification: u64,
    /// Amplification ramping: target value
    pub target_amplification: u64,
    /// Amplification ramping: start timestamp
    pub ramp_start_time: i64,
    /// Amplification ramping: end timestamp
    pub ramp_stop_time: i64,
    pub swap_fee_bps: u64,
    pub admin_fee_percent: u64,
    pub bags_balance: u64,
    pub pump_balance: u64,
    pub lp_supply: u64,
    pub admin_fees_bags: u64,
    pub admin_fees_pump: u64,
    pub total_volume_bags: u64,
    pub total_volume_pump: u64,
    pub paused: bool,
    pub bump: u8,
    pub bags_vault_bump: u8,
    pub pump_vault_bump: u8,
    pub lp_mint_bump: u8,
    // Authority timelock fields
    pub pending_authority: Option<Pubkey>,
    pub authority_transfer_time: Option<i64>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// ERRORS
// ═══════════════════════════════════════════════════════════════════════════════

#[error_code]
pub enum StableSwapError {
    #[msg("Math overflow")]
    MathOverflow,

    #[msg("Slippage exceeded")]
    SlippageExceeded,

    #[msg("Insufficient liquidity")]
    InsufficientLiquidity,

    #[msg("Invalid mint")]
    InvalidMint,

    #[msg("Invalid token owner")]
    InvalidOwner,

    #[msg("Pool is paused")]
    PoolPaused,

    #[msg("Unauthorized")]
    Unauthorized,

    #[msg("Zero amount")]
    ZeroAmount,

    #[msg("Invariant violation")]
    InvariantViolation,

    #[msg("Convergence failed")]
    ConvergenceFailed,

    #[msg("Invalid amplification")]
    InvalidAmplification,

    #[msg("Fee too high")]
    FeeTooHigh,

    #[msg("No fees to withdraw")]
    NoFeesToWithdraw,

    #[msg("Invalid authority")]
    InvalidAuthority,

    #[msg("No authority transfer pending")]
    NoTransferPending,

    #[msg("Authority timelock not expired (48 hours required)")]
    TimelockNotExpired,

    #[msg("Swap amount too small")]
    AmountTooSmall,

    #[msg("Initial deposit too small (minimum 100 tokens each)")]
    InitialDepositTooSmall,

    #[msg("Transaction deadline expired")]
    TransactionExpired,

    #[msg("Amplification ramp too fast (minimum 1 day)")]
    RampTooFast,

    #[msg("Amplification change too large (max 10x per ramp)")]
    AmpChangeTooLarge,

    // AUDIT FIX: New error codes
    #[msg("Vault balance does not match tracked balance (possible donation attack)")]
    VaultBalanceMismatch,
}
