# IDL Protocol Deployment Guide

## Deployed Contracts (Devnet)

| Program | Address | Status |
|---------|---------|--------|
| IDL Protocol | `BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt` | Deployed |
| IDL StableSwap | `EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte` | Deployed |

## Building

### Prerequisites

- Rust 1.70+
- Solana CLI 1.17+
- Anchor CLI 0.29+

### Build Commands

```bash
# Build IDL Protocol
cargo build-sbf --manifest-path programs/idl-protocol/Cargo.toml

# Build StableSwap
cargo build-sbf --manifest-path programs/idl-stableswap/Cargo.toml

# Or use Anchor
anchor build
```

## Deploying

### Devnet

```bash
# Set to devnet
solana config set --url https://api.devnet.solana.com

# Request airdrop for deployment
solana airdrop 5

# Deploy IDL Protocol
solana program deploy target/deploy/idl_protocol.so \
  --program-id BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt

# Deploy StableSwap
solana program deploy target/deploy/idl_stableswap.so \
  --keypair target/deploy/idl_stableswap-keypair-new.json
```

### Mainnet

**Important**: Before mainnet deployment:

1. Complete external security audit
2. Set up bug bounty program
3. Configure multisig governance
4. Integrate with oracle partner (Pyth/Chainlink)
5. Test on devnet for minimum 2 weeks

```bash
# Set to mainnet
solana config set --url https://api.mainnet-beta.solana.com

# Deploy with upgrade authority
solana program deploy target/deploy/idl_protocol.so \
  --program-id BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt \
  --upgrade-authority <MULTISIG_ADDRESS>
```

## Initializing Protocol

After deployment, initialize the protocol:

```typescript
import * as anchor from '@coral-xyz/anchor';
import { TOKEN_PROGRAM_ID } from '@solana/spl-token';

const program = anchor.workspace.IdlProtocol;

// Derive PDAs
const [statePda] = PublicKey.findProgramAddressSync(
  [Buffer.from("state")],
  program.programId
);

const [vaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("vault")],
  program.programId
);

const [burnVaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("burn_vault")],
  program.programId
);

// Initialize
await program.methods
  .initialize()
  .accounts({
    state: statePda,
    idlMint: IDL_MINT_ADDRESS, // Your IDL token mint
    vault: vaultPda,
    burnVault: burnVaultPda,
    authority: authority.publicKey,
    treasury: treasury.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
  })
  .signers([authority])
  .rpc();
```

## Initializing StableSwap Pool

```typescript
const program = anchor.workspace.IdlStableswap;

// Derive PDAs
const [poolPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("pool")],
  program.programId
);

const [bagsVaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("bags_vault")],
  program.programId
);

const [pumpVaultPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("pump_vault")],
  program.programId
);

const [lpMintPda] = PublicKey.findProgramAddressSync(
  [Buffer.from("lp_mint")],
  program.programId
);

// Initialize with A=1000 (tight peg)
await program.methods
  .initialize(new anchor.BN(1000))
  .accounts({
    pool: poolPda,
    bagsMint: BAGS_IDL_MINT, // 8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS
    pumpMint: PUMP_IDL_MINT, // 4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump
    bagsVault: bagsVaultPda,
    pumpVault: pumpVaultPda,
    lpMint: lpMintPda,
    authority: authority.publicKey,
    tokenProgram: TOKEN_PROGRAM_ID,
    systemProgram: SystemProgram.programId,
    rent: SYSVAR_RENT_PUBKEY,
  })
  .signers([authority])
  .rpc();
```

## Post-Deployment Checklist

### Devnet
- [x] Deploy IDL Protocol
- [ ] Deploy StableSwap
- [ ] Initialize protocol state
- [ ] Initialize StableSwap pool
- [ ] Create test markets
- [ ] Test commit-reveal flow
- [ ] Test staking/unstaking
- [ ] Test market resolution
- [ ] Run multi-agent simulation

### Mainnet
- [ ] Complete all devnet testing
- [ ] External security audit
- [ ] Bug bounty setup
- [ ] Multisig governance
- [ ] Oracle integration
- [ ] Deploy with upgrade authority = multisig
- [ ] Initialize with conservative TVL cap
- [ ] Monitor for 30 days before raising caps

## Upgrading Programs

```bash
# Upgrade IDL Protocol (requires upgrade authority)
solana program deploy target/deploy/idl_protocol.so \
  --program-id BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt \
  --upgrade-authority <AUTHORITY_KEYPAIR>
```

## Closing/Freezing Programs

To permanently prevent upgrades (final deployment):

```bash
solana program set-upgrade-authority <PROGRAM_ID> --final
```

**Warning**: This is irreversible. Only do this after thorough testing.
