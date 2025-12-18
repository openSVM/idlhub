# Commit-Reveal System for IDL Protocol

The IDL Protocol uses a commit-reveal scheme to prevent front-running attacks on both betting and market resolution. This document explains how to use the system.

## Why Commit-Reveal?

Without commit-reveal, malicious actors could:
1. **Front-run bets**: Watch the mempool for large bets and place their own bets first
2. **Front-run resolution**: See what the oracle is about to resolve and bet accordingly

The commit-reveal scheme prevents this by splitting each action into two phases:
1. **Commit**: Submit a hash of your action (no one can see what you're doing)
2. **Reveal**: After a delay, reveal your actual action

## Betting Flow

### 1. Commit Your Bet

First, create a commitment hash and submit it:

```typescript
import { createHash } from 'crypto';
import * as anchor from '@coral-xyz/anchor';

// Your bet parameters
const amount = new anchor.BN(100_000_000_000); // 100 tokens
const betYes = true; // betting YES
const nonce = 1; // unique nonce for this bet
const salt = crypto.getRandomValues(new Uint8Array(32)); // random salt

// Create commitment hash
function createBetCommitment(amount: anchor.BN, betYes: boolean, nonce: number, salt: Uint8Array): Uint8Array {
  const hasherInput = Buffer.concat([
    Buffer.from(amount.toArray('le', 8)),
    Buffer.from([betYes ? 1 : 0]),
    Buffer.from(new anchor.BN(nonce).toArray('le', 8)),
    Buffer.from(salt)
  ]);
  return createHash('sha256').update(hasherInput).digest();
}

const commitment = createBetCommitment(amount, betYes, nonce, salt);

// Submit commitment
await program.methods
  .commitBet(Array.from(commitment))
  .accounts({
    state: statePda,
    market: marketPda,
    betCommitment: betCommitmentPda, // PDA: [b"bet_commit", market, user]
    user: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 2. Wait for Commit Window

After committing, you must wait for the **BET_COMMIT_WINDOW** (5 minutes) before revealing.

```typescript
const BET_COMMIT_WINDOW = 300; // 5 minutes in seconds
const BET_REVEAL_WINDOW = 3600; // 1 hour max to reveal
```

### 3. Reveal Your Bet

After the commit window passes, reveal your bet:

```typescript
await program.methods
  .revealBet(
    amount,
    betYes,
    new anchor.BN(nonce),
    Array.from(salt)
  )
  .accounts({
    state: statePda,
    market: marketPda,
    betCommitment: betCommitmentPda,
    bet: betPda, // PDA: [b"bet", market, user, nonce]
    stakerAccount: stakerAccountPda, // optional, for staker bonus
    userVolume: userVolumePda, // PDA: [b"volume", user]
    userTokenAccount: userTokenAccount,
    marketPool: marketPoolPda,
    user: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

**Important**: You must reveal within the **BET_REVEAL_WINDOW** (1 hour) or your commitment expires.

## Oracle Resolution Flow

Oracles must also use commit-reveal for market resolution.

### 1. Deposit Oracle Bond

Before resolving any markets, oracles must deposit a bond:

```typescript
const ORACLE_BOND_AMOUNT = 10_000_000_000; // 10 tokens

await program.methods
  .depositOracleBond()
  .accounts({
    state: statePda,
    oracleBond: oracleBondPda, // PDA: [b"oracle_bond", oracle]
    oracleTokenAccount: oracleTokenAccount,
    vault: vaultPda,
    oracle: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 2. Commit Resolution

```typescript
const actualValue = 1500; // The actual value to resolve with
const nonce = 12345;

// Create resolution commitment
function createResolutionCommitment(actualValue: number, nonce: number): Uint8Array {
  const hasherInput = Buffer.concat([
    Buffer.from(new anchor.BN(actualValue).toArray('le', 8)),
    Buffer.from(new anchor.BN(nonce).toArray('le', 8))
  ]);
  return createHash('sha256').update(hasherInput).digest();
}

const commitment = createResolutionCommitment(actualValue, nonce);

await program.methods
  .commitResolution(Array.from(commitment))
  .accounts({
    market: marketPda,
    oracleBond: oracleBondPda,
    resolutionCommitment: resCommitmentPda, // PDA: [b"res_commit", market]
    oracle: wallet.publicKey,
    systemProgram: SystemProgram.programId,
  })
  .rpc();
```

### 3. Reveal Resolution

```typescript
await program.methods
  .revealResolution(
    new anchor.BN(actualValue),
    new anchor.BN(nonce)
  )
  .accounts({
    market: marketPda,
    resolutionCommitment: resCommitmentPda,
    oracle: wallet.publicKey,
  })
  .rpc();
```

## Disputing Resolutions

After a resolution is revealed, there is a **ORACLE_DISPUTE_WINDOW** (1 hour) during which the protocol authority can dispute the resolution:

```typescript
await program.methods
  .disputeResolution()
  .accounts({
    state: statePda,
    resolutionCommitment: resCommitmentPda,
    oracleBond: oracleBondPda,
    market: marketPda,
    authority: authorityWallet.publicKey,
  })
  .rpc();
```

If disputed:
- The oracle loses 50% of their bond (**ORACLE_SLASH_PERCENT**)
- The slashed tokens go to the insurance fund
- The market is **cancelled** (not re-resolved)
- Users can claim refunds for their bets

## Withdrawing Oracle Bond

After resolving a market and the dispute window passes, oracles can withdraw their bond:

```typescript
await program.methods
  .withdrawOracleBond()
  .accounts({
    state: statePda,
    vault: vaultPda,
    oracleBond: oracleBondPda,
    resolutionCommitment: resCommitmentPda,
    market: marketPda,
    oracleTokenAccount: oracleTokenAccount,
    oracle: wallet.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
  })
  .rpc();
```

## Claiming Winnings

After resolution, users must wait for the dispute window to close before claiming:

```typescript
const ORACLE_DISPUTE_WINDOW = 3600; // 1 hour

// Wait until dispute window closes
const resolvedAt = market.resolvedAt.toNumber();
const currentTime = Math.floor(Date.now() / 1000);
const canClaim = currentTime >= resolvedAt + ORACLE_DISPUTE_WINDOW;

if (canClaim) {
  await program.methods
    .claimWinnings()
    .accounts({
      state: statePda,
      market: marketPda,
      bet: betPda,
      marketPool: marketPoolPda,
      userTokenAccount: userTokenAccount,
      creatorTokenAccount: creatorTokenAccount,
      treasuryTokenAccount: treasuryTokenAccount,
      vault: vaultPda,
      burnVault: burnVaultPda,
      user: wallet.publicKey,
      tokenProgram: TOKEN_PROGRAM_ID,
    })
    .rpc();
}
```

## Error Codes

| Error | Description |
|-------|-------------|
| `UseCommitReveal` | Direct betting/resolution disabled - use commit-reveal |
| `RevealTooEarly` | Must wait for commit window before revealing |
| `RevealTooLate` | Reveal window expired |
| `AlreadyRevealed` | Commitment already revealed |
| `InvalidCommitment` | Revealed values don't match commitment hash |
| `DisputeWindowOpen` | Cannot claim until dispute window closes |
| `InsufficientOracleBond` | Oracle must have full bond deposited |
| `OracleSlashed` | Oracle has been slashed and cannot resolve |

## Timing Constants

| Constant | Value | Description |
|----------|-------|-------------|
| `BET_COMMIT_WINDOW` | 5 minutes | Minimum wait before revealing bet |
| `BET_REVEAL_WINDOW` | 1 hour | Maximum time to reveal bet |
| `ORACLE_DISPUTE_WINDOW` | 1 hour | Time to dispute resolution |
| `ORACLE_BOND_AMOUNT` | 10 tokens | Required oracle bond |
| `ORACLE_SLASH_PERCENT` | 50% | Bond slash on dispute |

## Security Considerations

1. **Never reuse salts**: Each bet commitment should use a unique random salt
2. **Store secrets locally**: Keep your salt and nonce secure until reveal
3. **Time your reveals**: Reveal as soon as the commit window passes to avoid missing the reveal window
4. **Verify oracle bond**: Check that oracles have sufficient bond before trusting their resolutions
