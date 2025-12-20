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

/// SECURITY FIX: Maximum allowed slippage (5% = 500 bps)
/// Prevents users from setting min_amount_out = 0 and losing everything to MEV
pub const MAX_SLIPPAGE_BPS: u64 = 500;

/// AUDIT FIX: Commit-reveal delay for amplification changes (1 hour)
/// Prevents front-running of amp ramps
pub const AMP_COMMIT_DELAY: i64 = 3600;

// ═══════════════════════════════════════════════════════════════════════════════
// MIGRATION POOL CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════════

/// Migration swap fee in milli-basis-points (0.1337% = 1337 milli-bps)
/// Fee calculation: amount * 1337 / 1_000_000
pub const MIGRATION_FEE_MILLI_BPS: u64 = 1337;

/// Maximum farming periods that can be active simultaneously
pub const MAX_FARMING_PERIODS: usize = 5;

/// Minimum farming period duration (1 day)
pub const MIN_FARMING_DURATION: i64 = 86400;

/// Precision for reward calculations
pub const REWARD_PRECISION: u128 = 1_000_000_000_000; // 1e12

// ═══════════════════════════════════════════════════════════════════════════════
// PROGRAM
// ═══════════════════════════════════════════════════════════════════════════════

#[program]
pub mod idl_stableswap {
    use super::*;

    /// Step 1: Create the pool account
    /// This must be called before init_vaults to set up the pool PDA
    pub fn create_pool(
        ctx: Context<CreatePool>,
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
        // Vaults and LP mint will be set in init_vaults
        pool.bags_vault = Pubkey::default();
        pool.pump_vault = Pubkey::default();
        pool.lp_mint = Pubkey::default();
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
        pool.paused = true; // Paused until init_vaults is called
        pool.bump = ctx.bumps.pool;
        pool.bags_vault_bump = 0;
        pool.pump_vault_bump = 0;
        pool.lp_mint_bump = 0;
        pool.pending_authority = None;
        pool.authority_transfer_time = None;
        pool.pending_amp_commit = None;
        pool.amp_commit_time = None;

        msg!("Pool account created - call init_vaults next");

        Ok(())
    }

    /// Step 2: Initialize vaults and LP mint
    /// Must be called after create_pool
    pub fn init_vaults(ctx: Context<InitVaults>) -> Result<()> {
        let pool = &mut ctx.accounts.pool;

        // Ensure vaults haven't been initialized yet
        require!(pool.bags_vault == Pubkey::default(), StableSwapError::AlreadyInitialized);

        pool.bags_vault = ctx.accounts.bags_vault.key();
        pool.pump_vault = ctx.accounts.pump_vault.key();
        pool.lp_mint = ctx.accounts.lp_mint.key();
        pool.bags_vault_bump = ctx.bumps.bags_vault;
        pool.pump_vault_bump = ctx.bumps.pump_vault;
        pool.lp_mint_bump = ctx.bumps.lp_mint;
        pool.paused = false; // Now ready for use

        msg!("IDL StableSwap initialized");
        msg!("  BAGS Mint: {}", pool.bags_mint);
        msg!("  PUMP Mint: {}", pool.pump_mint);
        msg!("  Amplification: {}", pool.amplification);

        Ok(())
    }

    /// Combined initialize (for backwards compatibility - may hit stack limits on some validators)
    /// Prefer using create_pool + init_vaults instead
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
        // AUDIT FIX: Initialize commit-reveal fields
        pool.pending_amp_commit = None;
        pool.amp_commit_time = None;

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

        // Calculate proportional amounts (before fee)
        let bags_proportional = (ctx.accounts.pool.bags_balance as u128)
            .checked_mul(lp_amount as u128)
            .and_then(|v| v.checked_div(ctx.accounts.pool.lp_supply as u128))
            .ok_or(StableSwapError::MathOverflow)? as u64;

        let pump_proportional = (ctx.accounts.pool.pump_balance as u128)
            .checked_mul(lp_amount as u128)
            .and_then(|v| v.checked_div(ctx.accounts.pool.lp_supply as u128))
            .ok_or(StableSwapError::MathOverflow)? as u64;

        // AUDIT FIX: Apply imbalance fee on withdrawal
        // Fee is proportional to pool imbalance (how far from 50/50)
        // This prevents extraction of value when pool rebalances
        let total_balance = ctx.accounts.pool.bags_balance
            .checked_add(ctx.accounts.pool.pump_balance)
            .ok_or(StableSwapError::MathOverflow)?;

        let (bags_amount, pump_amount, imbalance_fee_bags, imbalance_fee_pump) = if total_balance > 0 {
            // Calculate imbalance: |bags - pump| / total
            // Fee = swap_fee_bps * imbalance_ratio (max fee when fully imbalanced)
            let bags_ratio = (ctx.accounts.pool.bags_balance as u128 * 10000) / total_balance as u128;
            let imbalance_bps = if bags_ratio > 5000 {
                bags_ratio - 5000  // How much above 50%
            } else {
                5000 - bags_ratio  // How much below 50%
            };

            // Fee scales with imbalance: at 50/50 = 0 fee, at 100/0 = full swap fee
            // fee_bps = swap_fee_bps * imbalance_bps / 5000
            let effective_fee_bps = (ctx.accounts.pool.swap_fee_bps as u128 * imbalance_bps) / 5000;

            let fee_bags = (bags_proportional as u128 * effective_fee_bps / 10000) as u64;
            let fee_pump = (pump_proportional as u128 * effective_fee_bps / 10000) as u64;

            (
                bags_proportional.saturating_sub(fee_bags),
                pump_proportional.saturating_sub(fee_pump),
                fee_bags,
                fee_pump
            )
        } else {
            (bags_proportional, pump_proportional, 0, 0)
        };

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
        // AUDIT FIX: Subtract full proportional amount (fee stays in pool for LPs)
        ctx.accounts.pool.bags_balance = ctx.accounts.pool.bags_balance
            .checked_sub(bags_proportional)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.pump_balance = ctx.accounts.pool.pump_balance
            .checked_sub(pump_proportional)
            .ok_or(StableSwapError::MathOverflow)?;

        // AUDIT FIX: Track admin portion of imbalance fees
        let admin_fee_bags = (imbalance_fee_bags as u128 * ctx.accounts.pool.admin_fee_percent as u128 / 100) as u64;
        let admin_fee_pump = (imbalance_fee_pump as u128 * ctx.accounts.pool.admin_fee_percent as u128 / 100) as u64;
        ctx.accounts.pool.admin_fees_bags = ctx.accounts.pool.admin_fees_bags
            .checked_add(admin_fee_bags)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.admin_fees_pump = ctx.accounts.pool.admin_fees_pump
            .checked_add(admin_fee_pump)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Removed liquidity: {} LP = {} BAGS + {} PUMP (imbalance fee: {} BAGS, {} PUMP)",
             lp_amount, bags_amount, pump_amount, imbalance_fee_bags, imbalance_fee_pump);

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // MIGRATION POOL FUNCTIONS - 1:1 Constant Price with 0.1337% Fee
    // ═══════════════════════════════════════════════════════════════════════════

    /// Add single-sided liquidity (BAGS only OR PUMP only)
    /// For migration pool - LP tokens proportional to pool share
    pub fn add_liquidity_single_sided(
        ctx: Context<AddLiquiditySingleSided>,
        amount: u64,
        is_bags: bool,
        min_lp_amount: u64,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.paused, StableSwapError::PoolPaused);
        require!(amount > 0, StableSwapError::ZeroAmount);
        // AUDIT FIX M-3: Minimum deposit to prevent dust/rounding attacks
        require!(amount >= MIN_SWAP_AMOUNT, StableSwapError::AmountTooSmall);

        // AUDIT FIX H-3: Validate is_bags parameter matches actual token mint
        let pool = &ctx.accounts.pool;
        if is_bags {
            require!(ctx.accounts.user_token.mint == pool.bags_mint, StableSwapError::InvalidMint);
        } else {
            require!(ctx.accounts.user_token.mint == pool.pump_mint, StableSwapError::InvalidMint);
        }

        let pool_bump = pool.bump;

        // AUDIT FIX C-1: Calculate LP proportional to pool value, not 1:1
        // For 1:1 pool: total_value = bags + pump, new_lp = amount * supply / total_value
        let total_pool_value = pool.bags_balance
            .checked_add(pool.pump_balance)
            .ok_or(StableSwapError::MathOverflow)?;

        // AUDIT FIX: Always use proportional calculation, require non-zero pool value
        // This prevents inflation attacks from single-sided deposits after pool drain
        let lp_amount = if pool.lp_supply == 0 {
            // First deposit via single-sided - same as balanced deposit
            // Require minimum and lock MINIMUM_LIQUIDITY forever
            require!(amount >= MIN_INITIAL_DEPOSIT, StableSwapError::InitialDepositTooSmall);
            amount.checked_sub(MINIMUM_LIQUIDITY).ok_or(StableSwapError::InitialDepositTooSmall)?
        } else if total_pool_value == 0 {
            // Pool drained but LP exists - this should never happen in normal operation
            // Reject to prevent inflation attack
            return Err(StableSwapError::InsufficientLiquidity.into());
        } else {
            // Proportional: lp = amount * lp_supply / total_pool_value
            (amount as u128)
                .checked_mul(pool.lp_supply as u128)
                .and_then(|v| v.checked_div(total_pool_value as u128))
                .ok_or(StableSwapError::MathOverflow)? as u64
        };

        require!(lp_amount >= min_lp_amount, StableSwapError::SlippageExceeded);

        // AUDIT FIX: Enforce maximum slippage to prevent MEV exploitation
        // For single-sided deposits, min_lp_amount must be at least 95% of expected output
        // Expected output for 1:1 pool ≈ amount (in terms of pool value)
        // So min_lp_amount should be >= amount * 0.95 * lp_supply / total_pool_value
        if pool.lp_supply > 0 && total_pool_value > 0 {
            let expected_lp = (amount as u128)
                .checked_mul(pool.lp_supply as u128)
                .and_then(|v| v.checked_div(total_pool_value as u128))
                .unwrap_or(0) as u64;
            let min_allowed = (expected_lp as u128 * (10000 - MAX_SLIPPAGE_BPS) as u128 / 10000) as u64;
            require!(min_lp_amount >= min_allowed, StableSwapError::SlippageTooHigh);
        }

        // Transfer tokens to appropriate vault
        if is_bags {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_token.to_account_info(),
                        to: ctx.accounts.bags_vault.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount,
            )?;
        } else {
            token::transfer(
                CpiContext::new(
                    ctx.accounts.token_program.to_account_info(),
                    Transfer {
                        from: ctx.accounts.user_token.to_account_info(),
                        to: ctx.accounts.pump_vault.to_account_info(),
                        authority: ctx.accounts.user.to_account_info(),
                    },
                ),
                amount,
            )?;
        }

        // Mint LP tokens
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

        // Update state after CPIs
        if is_bags {
            ctx.accounts.pool.bags_balance = ctx.accounts.pool.bags_balance
                .checked_add(amount)
                .ok_or(StableSwapError::MathOverflow)?;
        } else {
            ctx.accounts.pool.pump_balance = ctx.accounts.pool.pump_balance
                .checked_add(amount)
                .ok_or(StableSwapError::MathOverflow)?;
        }
        ctx.accounts.pool.lp_supply = ctx.accounts.pool.lp_supply
            .checked_add(lp_amount)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Added single-sided liquidity: {} {} = {} LP",
            amount,
            if is_bags { "BAGS" } else { "PUMP" },
            lp_amount
        );

        Ok(())
    }

    /// Migrate BAGS to PUMP at 1:1 rate with 0.1337% fee
    /// Simplified swap - no curve math, constant price
    pub fn migrate_bags_to_pump(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        deadline: i64,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.paused, StableSwapError::PoolPaused);
        require!(amount_in >= MIN_SWAP_AMOUNT, StableSwapError::AmountTooSmall);

        // SECURITY FIX: Enforce maximum slippage to prevent MEV exploitation
        // min_amount_out must be at least 95% of amount_in (max 5% slippage)
        let min_allowed = (amount_in as u128 * (10000 - MAX_SLIPPAGE_BPS) as u128 / 10000) as u64;
        require!(min_amount_out >= min_allowed, StableSwapError::SlippageTooHigh);

        let clock = Clock::get()?;
        require!(clock.unix_timestamp <= deadline, StableSwapError::TransactionExpired);

        // AUDIT FIX M-4: Validate vault balances match tracked balances (donation attack prevention)
        require!(
            ctx.accounts.bags_vault.amount >= ctx.accounts.pool.bags_balance,
            StableSwapError::VaultBalanceMismatch
        );
        require!(
            ctx.accounts.pump_vault.amount >= ctx.accounts.pool.pump_balance,
            StableSwapError::VaultBalanceMismatch
        );

        // 1:1 swap with 0.1337% fee
        // fee = amount * 1337 / 1_000_000
        let fee = (amount_in as u128)
            .checked_mul(MIGRATION_FEE_MILLI_BPS as u128)
            .and_then(|v| v.checked_div(1_000_000))
            .ok_or(StableSwapError::MathOverflow)? as u64;

        let amount_out = amount_in.checked_sub(fee).ok_or(StableSwapError::MathOverflow)?;
        let admin_fee = (fee as u128 * ctx.accounts.pool.admin_fee_percent as u128 / 100) as u64;

        require!(amount_out >= min_amount_out, StableSwapError::SlippageExceeded);
        require!(amount_out <= ctx.accounts.pool.pump_balance, StableSwapError::InsufficientLiquidity);

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
            amount_out,
        )?;

        // AUDIT FIX C-2: Update balances correctly
        // bags_balance increases by amount_in (what we received)
        // pump_balance decreases by amount_out (what we sent out)
        // The fee (amount_in - amount_out) stays in the pool as LP profit
        ctx.accounts.pool.bags_balance = ctx.accounts.pool.bags_balance
            .checked_add(amount_in)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.pump_balance = ctx.accounts.pool.pump_balance
            .checked_sub(amount_out) // FIXED: was amount_in, now amount_out
            .ok_or(StableSwapError::MathOverflow)?;

        ctx.accounts.pool.admin_fees_pump = ctx.accounts.pool.admin_fees_pump
            .checked_add(admin_fee)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.total_volume_bags = ctx.accounts.pool.total_volume_bags
            .checked_add(amount_in)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Migrated {} BAGS -> {} PUMP (fee: {} = 0.1337%)", amount_in, amount_out, fee);

        Ok(())
    }

    /// Migrate PUMP to BAGS at 1:1 rate with 0.1337% fee
    pub fn migrate_pump_to_bags(
        ctx: Context<Swap>,
        amount_in: u64,
        min_amount_out: u64,
        deadline: i64,
    ) -> Result<()> {
        require!(!ctx.accounts.pool.paused, StableSwapError::PoolPaused);
        require!(amount_in >= MIN_SWAP_AMOUNT, StableSwapError::AmountTooSmall);

        // SECURITY FIX: Enforce maximum slippage to prevent MEV exploitation
        let min_allowed = (amount_in as u128 * (10000 - MAX_SLIPPAGE_BPS) as u128 / 10000) as u64;
        require!(min_amount_out >= min_allowed, StableSwapError::SlippageTooHigh);

        let clock = Clock::get()?;
        require!(clock.unix_timestamp <= deadline, StableSwapError::TransactionExpired);

        // AUDIT FIX M-4: Validate vault balances match tracked balances (donation attack prevention)
        require!(
            ctx.accounts.bags_vault.amount >= ctx.accounts.pool.bags_balance,
            StableSwapError::VaultBalanceMismatch
        );
        require!(
            ctx.accounts.pump_vault.amount >= ctx.accounts.pool.pump_balance,
            StableSwapError::VaultBalanceMismatch
        );

        // 1:1 swap with 0.1337% fee
        let fee = (amount_in as u128)
            .checked_mul(MIGRATION_FEE_MILLI_BPS as u128)
            .and_then(|v| v.checked_div(1_000_000))
            .ok_or(StableSwapError::MathOverflow)? as u64;

        let amount_out = amount_in.checked_sub(fee).ok_or(StableSwapError::MathOverflow)?;
        let admin_fee = (fee as u128 * ctx.accounts.pool.admin_fee_percent as u128 / 100) as u64;

        require!(amount_out >= min_amount_out, StableSwapError::SlippageExceeded);
        require!(amount_out <= ctx.accounts.pool.bags_balance, StableSwapError::InsufficientLiquidity);

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
            amount_out,
        )?;

        // AUDIT FIX C-3: Update balances correctly
        // pump_balance increases by amount_in (what we received)
        // bags_balance decreases by amount_out (what we sent out)
        ctx.accounts.pool.pump_balance = ctx.accounts.pool.pump_balance
            .checked_add(amount_in)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.bags_balance = ctx.accounts.pool.bags_balance
            .checked_sub(amount_out) // FIXED: was amount_in, now amount_out
            .ok_or(StableSwapError::MathOverflow)?;

        ctx.accounts.pool.admin_fees_bags = ctx.accounts.pool.admin_fees_bags
            .checked_add(admin_fee)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.pool.total_volume_pump = ctx.accounts.pool.total_volume_pump
            .checked_add(amount_in)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Migrated {} PUMP -> {} BAGS (fee: {} = 0.1337%)", amount_in, amount_out, fee);

        Ok(())
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // FARMING FUNCTIONS
    // ═══════════════════════════════════════════════════════════════════════════

    /// Create a new farming period (admin only)
    pub fn create_farming_period(
        ctx: Context<CreateFarmingPeriod>,
        start_time: i64,
        end_time: i64,
        total_rewards: u64,
    ) -> Result<()> {
        let clock = Clock::get()?;

        require!(start_time >= clock.unix_timestamp, StableSwapError::InvalidFarmingPeriod);
        require!(end_time > start_time, StableSwapError::InvalidFarmingPeriod);
        require!(end_time - start_time >= MIN_FARMING_DURATION, StableSwapError::FarmingPeriodTooShort);
        require!(total_rewards > 0, StableSwapError::ZeroAmount);

        let duration = (end_time - start_time) as u64;

        // AUDIT FIX: Ensure reward_per_second is non-zero to prevent lost rewards
        let reward_per_second = total_rewards
            .checked_div(duration)
            .ok_or(StableSwapError::MathOverflow)?;
        require!(reward_per_second > 0, StableSwapError::ZeroAmount);

        // Transfer reward tokens to farming vault
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.authority_reward_account.to_account_info(),
                    to: ctx.accounts.farming_vault.to_account_info(),
                    authority: ctx.accounts.authority.to_account_info(),
                },
            ),
            total_rewards,
        )?;

        let period = &mut ctx.accounts.farming_period;
        period.pool = ctx.accounts.pool.key();
        period.reward_mint = ctx.accounts.reward_mint.key();
        period.start_time = start_time;
        period.end_time = end_time;
        period.reward_per_second = reward_per_second;
        period.total_rewards = total_rewards;
        period.distributed_rewards = 0;
        period.last_update_time = start_time;
        period.acc_reward_per_share = 0;
        period.total_staked = 0;
        period.bump = ctx.bumps.farming_period;

        msg!("Created farming period: {} rewards over {} seconds", total_rewards, duration);

        Ok(())
    }

    /// Stake LP tokens for farming rewards
    pub fn stake_lp(
        ctx: Context<StakeLp>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, StableSwapError::ZeroAmount);

        let clock = Clock::get()?;
        let now = clock.unix_timestamp;

        // AUDIT FIX C-5: Cannot stake before farming period starts
        require!(
            now >= ctx.accounts.farming_period.start_time,
            StableSwapError::FarmingNotStarted
        );

        // AUDIT FIX C-6: Cannot stake after farming period ends
        require!(
            now < ctx.accounts.farming_period.end_time,
            StableSwapError::FarmingEnded
        );

        // Update pool rewards first
        update_farming_rewards(&mut ctx.accounts.farming_period)?;

        // If user has existing stake, harvest pending rewards
        if ctx.accounts.user_position.lp_staked > 0 {
            let pending = calculate_pending_rewards(&ctx.accounts.user_position, &ctx.accounts.farming_period)?;
            ctx.accounts.user_position.pending_rewards = ctx.accounts.user_position.pending_rewards
                .checked_add(pending)
                .ok_or(StableSwapError::MathOverflow)?;
        }

        // Transfer LP tokens to farming
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.user_lp.to_account_info(),
                    to: ctx.accounts.staked_lp_vault.to_account_info(),
                    authority: ctx.accounts.user.to_account_info(),
                },
            ),
            amount,
        )?;

        // Capture values needed for update
        let acc_reward_per_share = ctx.accounts.farming_period.acc_reward_per_share;
        let farming_period_key = ctx.accounts.farming_period.key();

        // Update state
        ctx.accounts.user_position.owner = ctx.accounts.user.key();
        ctx.accounts.user_position.farming_period = farming_period_key;
        ctx.accounts.user_position.lp_staked = ctx.accounts.user_position.lp_staked
            .checked_add(amount)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.user_position.reward_debt = calculate_reward_debt(
            ctx.accounts.user_position.lp_staked,
            acc_reward_per_share
        )?;

        ctx.accounts.farming_period.total_staked = ctx.accounts.farming_period.total_staked
            .checked_add(amount)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Staked {} LP tokens for farming", amount);

        Ok(())
    }

    /// Unstake LP tokens from farming
    pub fn unstake_lp(
        ctx: Context<UnstakeLp>,
        amount: u64,
    ) -> Result<()> {
        require!(amount > 0, StableSwapError::ZeroAmount);
        require!(ctx.accounts.user_position.lp_staked >= amount, StableSwapError::InsufficientStake);

        // Capture values needed for signer seeds before mutable borrows
        let period_bump = ctx.accounts.farming_period.bump;

        // Update pool rewards
        update_farming_rewards(&mut ctx.accounts.farming_period)?;

        // Calculate and store pending rewards
        let pending = calculate_pending_rewards(&ctx.accounts.user_position, &ctx.accounts.farming_period)?;
        ctx.accounts.user_position.pending_rewards = ctx.accounts.user_position.pending_rewards
            .checked_add(pending)
            .ok_or(StableSwapError::MathOverflow)?;

        // Transfer LP tokens back to user
        let pool_key = ctx.accounts.pool.key();
        let start_time_bytes = ctx.accounts.farming_period.start_time.to_le_bytes();
        let period_seeds = &[
            b"farming_period".as_ref(),
            pool_key.as_ref(),
            start_time_bytes.as_ref(),
            &[period_bump],
        ];
        let signer_seeds = &[&period_seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.staked_lp_vault.to_account_info(),
                    to: ctx.accounts.user_lp.to_account_info(),
                    authority: ctx.accounts.farming_period.to_account_info(),
                },
                signer_seeds,
            ),
            amount,
        )?;

        // Capture acc_reward_per_share before mutable borrow
        let acc_reward_per_share = ctx.accounts.farming_period.acc_reward_per_share;

        // Update state
        ctx.accounts.user_position.lp_staked = ctx.accounts.user_position.lp_staked
            .checked_sub(amount)
            .ok_or(StableSwapError::MathOverflow)?;
        ctx.accounts.user_position.reward_debt = calculate_reward_debt(
            ctx.accounts.user_position.lp_staked,
            acc_reward_per_share
        )?;

        ctx.accounts.farming_period.total_staked = ctx.accounts.farming_period.total_staked
            .checked_sub(amount)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Unstaked {} LP tokens from farming", amount);

        Ok(())
    }

    /// Claim farming rewards
    pub fn claim_farming_rewards(ctx: Context<ClaimFarmingRewards>) -> Result<()> {
        // Capture values needed for signer seeds before mutable borrows
        let period_bump = ctx.accounts.farming_period.bump;
        let period_start_time = ctx.accounts.farming_period.start_time;

        // Update pool rewards
        update_farming_rewards(&mut ctx.accounts.farming_period)?;

        // Calculate total pending rewards
        let pending_new = calculate_pending_rewards(&ctx.accounts.user_position, &ctx.accounts.farming_period)?;
        let total_pending = ctx.accounts.user_position.pending_rewards
            .checked_add(pending_new)
            .ok_or(StableSwapError::MathOverflow)?;

        require!(total_pending > 0, StableSwapError::NoRewardsToClaim);

        // Transfer rewards to user
        let pool_key = ctx.accounts.pool.key();
        let start_time_bytes = period_start_time.to_le_bytes();
        let period_seeds = &[
            b"farming_period".as_ref(),
            pool_key.as_ref(),
            start_time_bytes.as_ref(),
            &[period_bump],
        ];
        let signer_seeds = &[&period_seeds[..]];

        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                Transfer {
                    from: ctx.accounts.farming_vault.to_account_info(),
                    to: ctx.accounts.user_reward_account.to_account_info(),
                    authority: ctx.accounts.farming_period.to_account_info(),
                },
                signer_seeds,
            ),
            total_pending,
        )?;

        // Capture acc_reward_per_share before mutable borrow
        let acc_reward_per_share = ctx.accounts.farming_period.acc_reward_per_share;
        let lp_staked = ctx.accounts.user_position.lp_staked;

        // Update state
        ctx.accounts.user_position.pending_rewards = 0;
        ctx.accounts.user_position.reward_debt = calculate_reward_debt(lp_staked, acc_reward_per_share)?;

        ctx.accounts.farming_period.distributed_rewards = ctx.accounts.farming_period.distributed_rewards
            .checked_add(total_pending)
            .ok_or(StableSwapError::MathOverflow)?;

        msg!("Claimed {} farming rewards", total_pending);

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

        // SECURITY FIX: Enforce maximum slippage to prevent MEV exploitation
        let min_allowed = (amount_in as u128 * (10000 - MAX_SLIPPAGE_BPS) as u128 / 10000) as u64;
        require!(min_amount_out >= min_allowed, StableSwapError::SlippageTooHigh);

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

        // SECURITY FIX: Enforce maximum slippage to prevent MEV exploitation
        let min_allowed = (amount_in as u128 * (10000 - MAX_SLIPPAGE_BPS) as u128 / 10000) as u64;
        require!(min_amount_out >= min_allowed, StableSwapError::SlippageTooHigh);

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

    /// AUDIT FIX: Commit to amplification change (step 1 of commit-reveal)
    /// Admin commits hash of (target_amp, duration, salt) and must wait AMP_COMMIT_DELAY
    /// This prevents MEV from front-running amp changes
    pub fn commit_amp_ramp(
        ctx: Context<AdminOnly>,
        commit_hash: [u8; 32],
    ) -> Result<()> {
        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;

        pool.pending_amp_commit = Some(commit_hash);
        pool.amp_commit_time = Some(clock.unix_timestamp);

        msg!("Amplification ramp committed. Reveal after {} seconds", AMP_COMMIT_DELAY);
        Ok(())
    }

    /// Start amplification ramping (admin only) - AUDIT FIX: Now requires valid commit
    /// Amplification changes gradually over time to prevent manipulation
    pub fn ramp_amplification(
        ctx: Context<AdminOnly>,
        target_amplification: u64,
        ramp_duration: i64,
        salt: [u8; 32],
    ) -> Result<()> {
        require!(
            target_amplification >= MIN_AMPLIFICATION && target_amplification <= MAX_AMPLIFICATION,
            StableSwapError::InvalidAmplification
        );
        require!(ramp_duration >= MIN_RAMP_DURATION, StableSwapError::RampTooFast);

        let pool = &mut ctx.accounts.pool;
        let clock = Clock::get()?;

        // AUDIT FIX: Verify commit-reveal
        let pending_commit = pool.pending_amp_commit.ok_or(StableSwapError::NoAmpCommitPending)?;
        let commit_time = pool.amp_commit_time.ok_or(StableSwapError::NoAmpCommitPending)?;

        // Check commit delay has passed
        require!(
            clock.unix_timestamp >= commit_time + AMP_COMMIT_DELAY,
            StableSwapError::AmpCommitDelayNotPassed
        );

        // Verify the reveal matches the commit
        // Hash = sha256(target_amp || duration || salt)
        let mut data = Vec::with_capacity(48);
        data.extend_from_slice(&target_amplification.to_le_bytes());
        data.extend_from_slice(&ramp_duration.to_le_bytes());
        data.extend_from_slice(&salt);
        let computed_hash = anchor_lang::solana_program::hash::hash(&data);
        require!(
            computed_hash.to_bytes() == pending_commit,
            StableSwapError::AmpCommitMismatch
        );

        // Clear the commit
        pool.pending_amp_commit = None;
        pool.amp_commit_time = None;

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
// FARMING HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════════

/// Update accumulated rewards per share
/// AUDIT FIX H-5: Gets clock internally to prevent timestamp manipulation
fn update_farming_rewards(period: &mut FarmingPeriod) -> Result<()> {
    let clock = Clock::get()?;
    let current_time = clock.unix_timestamp;

    // Don't update before farming starts
    if current_time < period.start_time {
        return Ok(());
    }

    if period.total_staked == 0 {
        period.last_update_time = std::cmp::max(current_time, period.start_time);
        return Ok(());
    }

    let effective_time = std::cmp::min(current_time, period.end_time);
    if effective_time <= period.last_update_time {
        return Ok(());
    }

    let time_elapsed = (effective_time - period.last_update_time) as u128;
    let rewards = (period.reward_per_second as u128)
        .checked_mul(time_elapsed)
        .ok_or(StableSwapError::MathOverflow)?;

    let reward_per_share_increase = rewards
        .checked_mul(REWARD_PRECISION)
        .and_then(|v| v.checked_div(period.total_staked as u128))
        .ok_or(StableSwapError::MathOverflow)?;

    period.acc_reward_per_share = period.acc_reward_per_share
        .checked_add(reward_per_share_increase)
        .ok_or(StableSwapError::MathOverflow)?;

    period.last_update_time = effective_time;

    Ok(())
}

/// Calculate pending rewards for a user position
fn calculate_pending_rewards(position: &UserFarmingPosition, period: &FarmingPeriod) -> Result<u64> {
    if position.lp_staked == 0 {
        return Ok(0);
    }

    let accumulated = (position.lp_staked as u128)
        .checked_mul(period.acc_reward_per_share)
        .and_then(|v| v.checked_div(REWARD_PRECISION))
        .ok_or(StableSwapError::MathOverflow)?;

    // AUDIT FIX C-4: Use saturating_sub to prevent underflow locking user funds
    // If reward_debt > accumulated (due to rounding), just return 0
    let pending = accumulated.saturating_sub(position.reward_debt as u128);

    Ok(pending as u64)
}

/// Calculate reward debt for a given stake amount
fn calculate_reward_debt(lp_staked: u64, acc_reward_per_share: u128) -> Result<u64> {
    let debt = (lp_staked as u128)
        .checked_mul(acc_reward_per_share)
        .and_then(|v| v.checked_div(REWARD_PRECISION))
        .ok_or(StableSwapError::MathOverflow)?;

    Ok(debt as u64)
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

/// Step 1: Create pool account only (smaller stack footprint)
#[derive(Accounts)]
pub struct CreatePool<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StablePool::INIT_SPACE,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Box<Account<'info, StablePool>>,

    pub bags_mint: Box<Account<'info, Mint>>,
    pub pump_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub system_program: Program<'info, System>,
}

/// Step 2: Initialize vaults and LP mint
#[derive(Accounts)]
pub struct InitVaults<'info> {
    #[account(
        mut,
        seeds = [b"pool"],
        bump = pool.bump,
        constraint = pool.authority == authority.key() @ StableSwapError::Unauthorized
    )]
    pub pool: Box<Account<'info, StablePool>>,

    pub bags_mint: Box<Account<'info, Mint>>,
    pub pump_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = authority,
        seeds = [b"bags_vault"],
        bump,
        token::mint = bags_mint,
        token::authority = pool,
    )]
    pub bags_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        seeds = [b"pump_vault"],
        bump,
        token::mint = pump_mint,
        token::authority = pool,
    )]
    pub pump_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        seeds = [b"lp_mint"],
        bump,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = pool,
    )]
    pub lp_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

/// Combined initialization (for backwards compatibility - may hit stack limits)
#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + StablePool::INIT_SPACE,
        seeds = [b"pool"],
        bump
    )]
    pub pool: Box<Account<'info, StablePool>>,

    pub bags_mint: Box<Account<'info, Mint>>,
    pub pump_mint: Box<Account<'info, Mint>>,

    #[account(
        init,
        payer = authority,
        seeds = [b"bags_vault"],
        bump,
        token::mint = bags_mint,
        token::authority = pool,
    )]
    pub bags_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        seeds = [b"pump_vault"],
        bump,
        token::mint = pump_mint,
        token::authority = pool,
    )]
    pub pump_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        init,
        payer = authority,
        seeds = [b"lp_mint"],
        bump,
        mint::decimals = TOKEN_DECIMALS,
        mint::authority = pool,
    )]
    pub lp_mint: Box<Account<'info, Mint>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct AddLiquidity<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Box<Account<'info, StablePool>>,

    #[account(mut, seeds = [b"bags_vault"], bump = pool.bags_vault_bump)]
    pub bags_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [b"pump_vault"], bump = pool.pump_vault_bump)]
    pub pump_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [b"lp_mint"], bump = pool.lp_mint_bump)]
    pub lp_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = user_bags.mint == pool.bags_mint @ StableSwapError::InvalidMint,
        constraint = user_bags.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_bags: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_pump.mint == pool.pump_mint @ StableSwapError::InvalidMint,
        constraint = user_pump.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_pump: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_lp.mint == pool.lp_mint @ StableSwapError::InvalidMint,
        constraint = user_lp.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_lp: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct RemoveLiquidity<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Box<Account<'info, StablePool>>,

    #[account(mut, seeds = [b"bags_vault"], bump = pool.bags_vault_bump)]
    pub bags_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [b"pump_vault"], bump = pool.pump_vault_bump)]
    pub pump_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [b"lp_mint"], bump = pool.lp_mint_bump)]
    pub lp_mint: Box<Account<'info, Mint>>,

    #[account(
        mut,
        constraint = user_bags.mint == pool.bags_mint @ StableSwapError::InvalidMint,
        constraint = user_bags.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_bags: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_pump.mint == pool.pump_mint @ StableSwapError::InvalidMint,
        constraint = user_pump.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_pump: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_lp.mint == pool.lp_mint @ StableSwapError::InvalidMint,
        constraint = user_lp.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_lp: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Swap<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Box<Account<'info, StablePool>>,

    #[account(mut, seeds = [b"bags_vault"], bump = pool.bags_vault_bump)]
    pub bags_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [b"pump_vault"], bump = pool.pump_vault_bump)]
    pub pump_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_bags.mint == pool.bags_mint @ StableSwapError::InvalidMint,
        constraint = user_bags.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_bags: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_pump.mint == pool.pump_mint @ StableSwapError::InvalidMint,
        constraint = user_pump.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_pump: Box<Account<'info, TokenAccount>>,

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
    pub pool: Box<Account<'info, StablePool>>,

    #[account(mut, seeds = [b"bags_vault"], bump = pool.bags_vault_bump)]
    pub bags_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [b"pump_vault"], bump = pool.pump_vault_bump)]
    pub pump_vault: Box<Account<'info, TokenAccount>>,

    // AUDIT FIX: Also verify owner to prevent sending fees to arbitrary accounts
    #[account(
        mut,
        constraint = admin_bags.mint == pool.bags_mint @ StableSwapError::InvalidMint,
        constraint = admin_bags.owner == authority.key() @ StableSwapError::InvalidOwner
    )]
    pub admin_bags: Box<Account<'info, TokenAccount>>,

    // AUDIT FIX: Also verify owner to prevent sending fees to arbitrary accounts
    #[account(
        mut,
        constraint = admin_pump.mint == pool.pump_mint @ StableSwapError::InvalidMint,
        constraint = admin_pump.owner == authority.key() @ StableSwapError::InvalidOwner
    )]
    pub admin_pump: Box<Account<'info, TokenAccount>>,

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
// MIGRATION POOL ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
pub struct AddLiquiditySingleSided<'info> {
    #[account(mut, seeds = [b"pool"], bump = pool.bump)]
    pub pool: Box<Account<'info, StablePool>>,

    #[account(mut, seeds = [b"bags_vault"], bump = pool.bags_vault_bump)]
    pub bags_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [b"pump_vault"], bump = pool.pump_vault_bump)]
    pub pump_vault: Box<Account<'info, TokenAccount>>,

    #[account(mut, seeds = [b"lp_mint"], bump = pool.lp_mint_bump)]
    pub lp_mint: Box<Account<'info, Mint>>,

    // AUDIT FIX H-3: Validate user_token is either BAGS or PUMP mint
    /// User's token account (BAGS or PUMP depending on is_bags parameter)
    #[account(
        mut,
        constraint = user_token.mint == pool.bags_mint || user_token.mint == pool.pump_mint @ StableSwapError::InvalidMint,
        constraint = user_token.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_token: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_lp.mint == pool.lp_mint @ StableSwapError::InvalidMint,
        constraint = user_lp.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_lp: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// FARMING ACCOUNTS
// ═══════════════════════════════════════════════════════════════════════════════

#[derive(Accounts)]
#[instruction(start_time: i64, end_time: i64)]
pub struct CreateFarmingPeriod<'info> {
    #[account(
        seeds = [b"pool"],
        bump = pool.bump,
        constraint = pool.authority == authority.key() @ StableSwapError::Unauthorized
    )]
    pub pool: Box<Account<'info, StablePool>>,

    #[account(
        init,
        payer = authority,
        space = 8 + FarmingPeriod::INIT_SPACE,
        seeds = [b"farming_period", pool.key().as_ref(), &start_time.to_le_bytes()],
        bump
    )]
    pub farming_period: Box<Account<'info, FarmingPeriod>>,

    /// Reward token mint
    pub reward_mint: Box<Account<'info, Mint>>,

    /// Vault to hold farming rewards
    #[account(
        init,
        payer = authority,
        seeds = [b"farming_vault", farming_period.key().as_ref()],
        bump,
        token::mint = reward_mint,
        token::authority = farming_period,
    )]
    pub farming_vault: Box<Account<'info, TokenAccount>>,

    /// Authority's reward token account to transfer from
    #[account(
        mut,
        constraint = authority_reward_account.mint == reward_mint.key() @ StableSwapError::InvalidMint
    )]
    pub authority_reward_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub authority: Signer<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct StakeLp<'info> {
    #[account(seeds = [b"pool"], bump = pool.bump)]
    pub pool: Box<Account<'info, StablePool>>,

    #[account(
        mut,
        constraint = farming_period.pool == pool.key() @ StableSwapError::InvalidFarmingPeriod
    )]
    pub farming_period: Box<Account<'info, FarmingPeriod>>,

    // AUDIT FIX H-1: Validate user_position ownership
    // Either it's a new position (owner is default) or belongs to user
    #[account(
        mut,
        constraint = user_position.owner == Pubkey::default() || user_position.owner == user.key() @ StableSwapError::Unauthorized
    )]
    pub user_position: Box<Account<'info, UserFarmingPosition>>,

    // AUDIT FIX H-2: Validate staked_lp_vault is correct PDA for this farming period
    #[account(
        mut,
        constraint = staked_lp_vault.mint == pool.lp_mint @ StableSwapError::InvalidMint,
        constraint = staked_lp_vault.owner == farming_period.key() @ StableSwapError::InvalidOwner
    )]
    pub staked_lp_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_lp.mint == pool.lp_mint @ StableSwapError::InvalidMint,
        constraint = user_lp.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_lp: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct UnstakeLp<'info> {
    #[account(seeds = [b"pool"], bump = pool.bump)]
    pub pool: Box<Account<'info, StablePool>>,

    #[account(
        mut,
        constraint = farming_period.pool == pool.key() @ StableSwapError::InvalidFarmingPeriod
    )]
    pub farming_period: Box<Account<'info, FarmingPeriod>>,

    #[account(
        mut,
        constraint = user_position.owner == user.key() @ StableSwapError::Unauthorized,
        constraint = user_position.farming_period == farming_period.key() @ StableSwapError::InvalidFarmingPeriod
    )]
    pub user_position: Box<Account<'info, UserFarmingPosition>>,

    // AUDIT FIX H-2: Validate staked_lp_vault
    #[account(
        mut,
        constraint = staked_lp_vault.mint == pool.lp_mint @ StableSwapError::InvalidMint,
        constraint = staked_lp_vault.owner == farming_period.key() @ StableSwapError::InvalidOwner
    )]
    pub staked_lp_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_lp.mint == pool.lp_mint @ StableSwapError::InvalidMint,
        constraint = user_lp.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_lp: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ClaimFarmingRewards<'info> {
    #[account(seeds = [b"pool"], bump = pool.bump)]
    pub pool: Box<Account<'info, StablePool>>,

    #[account(
        mut,
        constraint = farming_period.pool == pool.key() @ StableSwapError::InvalidFarmingPeriod
    )]
    pub farming_period: Box<Account<'info, FarmingPeriod>>,

    #[account(
        mut,
        constraint = user_position.owner == user.key() @ StableSwapError::Unauthorized,
        constraint = user_position.farming_period == farming_period.key() @ StableSwapError::InvalidFarmingPeriod
    )]
    pub user_position: Box<Account<'info, UserFarmingPosition>>,

    // AUDIT FIX H-2: Validate farming_vault
    #[account(
        mut,
        constraint = farming_vault.mint == farming_period.reward_mint @ StableSwapError::InvalidMint,
        constraint = farming_vault.owner == farming_period.key() @ StableSwapError::InvalidOwner
    )]
    pub farming_vault: Box<Account<'info, TokenAccount>>,

    #[account(
        mut,
        constraint = user_reward_account.mint == farming_period.reward_mint @ StableSwapError::InvalidMint,
        constraint = user_reward_account.owner == user.key() @ StableSwapError::InvalidOwner
    )]
    pub user_reward_account: Box<Account<'info, TokenAccount>>,

    #[account(mut)]
    pub user: Signer<'info>,

    pub token_program: Program<'info, Token>,
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
    // AUDIT FIX: Commit-reveal for amplification changes
    /// Committed hash of (target_amp, duration, salt)
    pub pending_amp_commit: Option<[u8; 32]>,
    /// Timestamp when amp commit was made
    pub amp_commit_time: Option<i64>,
}

// ═══════════════════════════════════════════════════════════════════════════════
// FARMING STATE
// ═══════════════════════════════════════════════════════════════════════════════

#[account]
#[derive(InitSpace)]
pub struct FarmingPeriod {
    /// Pool this farming period belongs to
    pub pool: Pubkey,
    /// Reward token mint
    pub reward_mint: Pubkey,
    /// Start timestamp
    pub start_time: i64,
    /// End timestamp
    pub end_time: i64,
    /// Rewards per second
    pub reward_per_second: u64,
    /// Total rewards allocated
    pub total_rewards: u64,
    /// Rewards already distributed
    pub distributed_rewards: u64,
    /// Last time rewards were updated
    pub last_update_time: i64,
    /// Accumulated reward per share (scaled by REWARD_PRECISION)
    pub acc_reward_per_share: u128,
    /// Total LP tokens staked
    pub total_staked: u64,
    /// Bump seed
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct UserFarmingPosition {
    /// User who owns this position
    pub owner: Pubkey,
    /// Farming period this position is in
    pub farming_period: Pubkey,
    /// Amount of LP tokens staked
    pub lp_staked: u64,
    /// Reward debt (for calculating pending rewards)
    pub reward_debt: u64,
    /// Pending rewards not yet claimed
    pub pending_rewards: u64,
    /// Bump seed
    pub bump: u8,
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

    // Migration pool errors
    #[msg("Invalid farming period (start must be in future, end must be after start)")]
    InvalidFarmingPeriod,

    #[msg("Farming period too short (minimum 1 day)")]
    FarmingPeriodTooShort,

    #[msg("Insufficient staked LP tokens")]
    InsufficientStake,

    #[msg("No rewards to claim")]
    NoRewardsToClaim,

    #[msg("Farming period has not started yet")]
    FarmingNotStarted,

    #[msg("Farming period has ended")]
    FarmingEnded,

    // SECURITY FIX: Slippage protection
    #[msg("Slippage tolerance too high (max 5%)")]
    SlippageTooHigh,

    // AUDIT FIX: Commit-reveal for amplification
    #[msg("No amplification commit pending")]
    NoAmpCommitPending,

    #[msg("Amplification commit delay not passed (1 hour required)")]
    AmpCommitDelayNotPassed,

    #[msg("Amplification reveal does not match commit")]
    AmpCommitMismatch,

    #[msg("Pool already initialized")]
    AlreadyInitialized,
}
