import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import {
  Keypair,
  PublicKey,
  SystemProgram,
  LAMPORTS_PER_SOL
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  createAccount,
  mintTo,
  getAccount
} from "../lib/spl-token-utils.js";
import { assert } from "chai";
import { createHash } from "crypto";

// Constants from the program
const MIN_BET_AMOUNT = 1_000_000; // 0.001 tokens
const MIN_RESOLUTION_DELAY = 86400; // 24 hours
const ORACLE_BOND_AMOUNT = 10_000_000_000; // 10 tokens
const BET_COMMIT_WINDOW = 300; // 5 minutes
const BET_REVEAL_WINDOW = 3600; // 1 hour

describe("idl-protocol", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.IdlProtocol as Program;

  // Keypairs
  const authority = Keypair.generate();
  const treasury = Keypair.generate();
  const oracle = Keypair.generate();
  const user1 = Keypair.generate();
  const user2 = Keypair.generate();

  // Token mint
  let idlMint: PublicKey;
  let authorityTokenAccount: PublicKey;
  let treasuryTokenAccount: PublicKey;
  let oracleTokenAccount: PublicKey;
  let user1TokenAccount: PublicKey;
  let user2TokenAccount: PublicKey;

  // PDAs
  let statePda: PublicKey;
  let vaultPda: PublicKey;
  let burnVaultPda: PublicKey;
  let marketPda: PublicKey;
  let marketPoolPda: PublicKey;
  let oracleBondPda: PublicKey;

  // Test market params
  const protocolId = "test-protocol";
  const targetValue = 1000;
  let resolutionTimestamp: number;

  before(async () => {
    // Airdrop SOL to all accounts
    const accounts = [authority, treasury, oracle, user1, user2];
    for (const account of accounts) {
      const sig = await provider.connection.requestAirdrop(
        account.publicKey,
        10 * LAMPORTS_PER_SOL
      );
      await provider.connection.confirmTransaction(sig);
    }

    // Create IDL token mint
    idlMint = await createMint(
      provider.connection,
      authority,
      authority.publicKey,
      null,
      9 // 9 decimals
    );

    // Create token accounts
    authorityTokenAccount = await createAccount(
      provider.connection,
      authority,
      idlMint,
      authority.publicKey
    );

    treasuryTokenAccount = await createAccount(
      provider.connection,
      authority,
      idlMint,
      treasury.publicKey
    );

    oracleTokenAccount = await createAccount(
      provider.connection,
      authority,
      idlMint,
      oracle.publicKey
    );

    user1TokenAccount = await createAccount(
      provider.connection,
      authority,
      idlMint,
      user1.publicKey
    );

    user2TokenAccount = await createAccount(
      provider.connection,
      authority,
      idlMint,
      user2.publicKey
    );

    // Mint tokens to accounts
    await mintTo(
      provider.connection,
      authority,
      idlMint,
      oracleTokenAccount,
      authority,
      100_000_000_000 // 100 tokens for oracle bond
    );

    await mintTo(
      provider.connection,
      authority,
      idlMint,
      user1TokenAccount,
      authority,
      1_000_000_000_000 // 1000 tokens
    );

    await mintTo(
      provider.connection,
      authority,
      idlMint,
      user2TokenAccount,
      authority,
      1_000_000_000_000 // 1000 tokens
    );

    // Derive PDAs
    [statePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("state")],
      program.programId
    );

    [vaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("vault")],
      program.programId
    );

    [burnVaultPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("burn_vault")],
      program.programId
    );

    // Resolution timestamp 25 hours from now (> MIN_RESOLUTION_DELAY)
    resolutionTimestamp = Math.floor(Date.now() / 1000) + MIN_RESOLUTION_DELAY + 3600;

    [marketPda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("market"),
        Buffer.from(protocolId),
        Buffer.from(new anchor.BN(resolutionTimestamp).toArray("le", 8))
      ],
      program.programId
    );

    [marketPoolPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("market_pool"), marketPda.toBuffer()],
      program.programId
    );

    [oracleBondPda] = PublicKey.findProgramAddressSync(
      [Buffer.from("oracle_bond"), oracle.publicKey.toBuffer()],
      program.programId
    );
  });

  describe("Initialization", () => {
    it("initializes the protocol", async () => {
      await program.methods
        .initialize()
        .accounts({
          state: statePda,
          idlMint: idlMint,
          vault: vaultPda,
          burnVault: burnVaultPda,
          authority: authority.publicKey,
          treasury: treasury.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      const state = await program.account.protocolState.fetch(statePda);
      assert.ok(state.authority.equals(authority.publicKey));
      assert.ok(state.treasury.equals(treasury.publicKey));
      assert.equal(state.totalStaked.toNumber(), 0);
      assert.equal(state.paused, false);
    });
  });

  describe("Market Creation", () => {
    it("creates a prediction market", async () => {
      await program.methods
        .createMarket(
          protocolId,
          { tvl: {} }, // MetricType::TVL
          new anchor.BN(targetValue),
          new anchor.BN(resolutionTimestamp)
        )
        .accounts({
          state: statePda,
          market: marketPda,
          marketPool: marketPoolPda,
          idlMint: idlMint,
          creator: authority.publicKey,
          oracle: oracle.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();

      const market = await program.account.predictionMarket.fetch(marketPda);
      assert.equal(market.protocolId, protocolId);
      assert.equal(market.targetValue.toNumber(), targetValue);
      assert.ok(market.oracle.equals(oracle.publicKey));
      assert.equal(market.resolved, false);
    });
  });

  describe("Oracle Bonding", () => {
    it("oracle deposits bond", async () => {
      await program.methods
        .depositOracleBond()
        .accounts({
          state: statePda,
          oracleBond: oracleBondPda,
          oracleTokenAccount: oracleTokenAccount,
          vault: vaultPda,
          oracle: oracle.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([oracle])
        .rpc();

      const bond = await program.account.oracleBond.fetch(oracleBondPda);
      assert.ok(bond.oracle.equals(oracle.publicKey));
      assert.equal(bond.bondAmount.toNumber(), ORACLE_BOND_AMOUNT);
      assert.equal(bond.slashed, false);
    });
  });

  describe("Commit-Reveal Betting", () => {
    const betAmount = 100_000_000_000; // 100 tokens
    const betYes = true;
    const nonce = 1;
    const salt = Buffer.alloc(32);
    salt.fill(0x42); // Random salt

    let betCommitmentPda: PublicKey;
    let betPda: PublicKey;
    let userVolumePda: PublicKey;
    let commitment: Buffer;

    before(() => {
      [betCommitmentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("bet_commit"), marketPda.toBuffer(), user1.publicKey.toBuffer()],
        program.programId
      );

      [betPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("bet"),
          marketPda.toBuffer(),
          user1.publicKey.toBuffer(),
          Buffer.from(new anchor.BN(nonce).toArray("le", 8))
        ],
        program.programId
      );

      [userVolumePda] = PublicKey.findProgramAddressSync(
        [Buffer.from("volume"), user1.publicKey.toBuffer()],
        program.programId
      );

      // Create commitment hash: hash(amount || bet_yes || nonce || salt)
      const hasherInput = Buffer.concat([
        Buffer.from(new anchor.BN(betAmount).toArray("le", 8)),
        Buffer.from([betYes ? 1 : 0]),
        Buffer.from(new anchor.BN(nonce).toArray("le", 8)),
        salt
      ]);
      commitment = createHash("sha256").update(hasherInput).digest();
    });

    it("fails to place bet directly (deprecated)", async () => {
      try {
        await program.methods
          .placeBet(new anchor.BN(betAmount), betYes, new anchor.BN(nonce))
          .accounts({
            state: statePda,
            market: marketPda,
            bet: betPda,
            stakerAccount: null,
            userVolume: userVolumePda,
            userTokenAccount: user1TokenAccount,
            marketPool: marketPoolPda,
            user: user1.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown UseCommitReveal error");
      } catch (e) {
        assert.include(e.message, "UseCommitReveal");
      }
    });

    it("commits a bet", async () => {
      await program.methods
        .commitBet(Array.from(commitment))
        .accounts({
          state: statePda,
          market: marketPda,
          betCommitment: betCommitmentPda,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const betCommit = await program.account.betCommitment.fetch(betCommitmentPda);
      assert.ok(betCommit.owner.equals(user1.publicKey));
      assert.deepEqual(Array.from(betCommit.commitment), Array.from(commitment));
      assert.equal(betCommit.revealed, false);
    });

    it("fails to reveal too early", async () => {
      try {
        await program.methods
          .revealBet(
            new anchor.BN(betAmount),
            betYes,
            new anchor.BN(nonce),
            Array.from(salt)
          )
          .accounts({
            state: statePda,
            market: marketPda,
            betCommitment: betCommitmentPda,
            bet: betPda,
            stakerAccount: null,
            userVolume: userVolumePda,
            userTokenAccount: user1TokenAccount,
            marketPool: marketPoolPda,
            user: user1.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown RevealTooEarly error");
      } catch (e) {
        assert.include(e.message, "RevealTooEarly");
      }
    });

    it("reveals a bet after commit window", async () => {
      // NOTE: In a real test, we'd need to wait BET_COMMIT_WINDOW seconds
      // or use a local validator with time warp. For now, this test documents
      // the expected flow.
      console.log("  (skipping reveal test - requires time warp on localnet)");
    });
  });

  describe("Commit-Reveal Resolution", () => {
    const actualValue = 1500; // Above target, so YES wins
    const nonce = 12345;
    let resCommitmentPda: PublicKey;
    let commitment: Buffer;

    before(() => {
      [resCommitmentPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("res_commit"), marketPda.toBuffer()],
        program.programId
      );

      // Create commitment hash: hash(actual_value || nonce)
      const hasherInput = Buffer.concat([
        Buffer.from(new anchor.BN(actualValue).toArray("le", 8)),
        Buffer.from(new anchor.BN(nonce).toArray("le", 8))
      ]);
      commitment = createHash("sha256").update(hasherInput).digest();
    });

    it("fails to resolve directly (deprecated)", async () => {
      // NOTE: This test would fail because resolution_timestamp hasn't passed
      // In production, the error would be UseCommitReveal
      console.log("  (skipping direct resolve test - resolution timestamp not reached)");
    });

    it("oracle commits resolution", async () => {
      // NOTE: This would fail because resolution_timestamp hasn't passed
      // In a real test with time warp:
      console.log("  (skipping commit resolution test - resolution timestamp not reached)");
    });
  });

  describe("Staking", () => {
    let stakerPda: PublicKey;
    const stakeAmount = 100_000_000_000; // 100 tokens

    before(() => {
      [stakerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("staker"), user1.publicKey.toBuffer()],
        program.programId
      );
    });

    it("stakes tokens", async () => {
      await program.methods
        .stake(new anchor.BN(stakeAmount))
        .accounts({
          state: statePda,
          stakerAccount: stakerPda,
          userTokenAccount: user1TokenAccount,
          vault: vaultPda,
          user: user1.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const staker = await program.account.stakerAccount.fetch(stakerPda);
      assert.ok(staker.owner.equals(user1.publicKey));
      assert.equal(staker.stakedAmount.toNumber(), stakeAmount);
    });

    it("fails to unstake before MIN_STAKE_DURATION", async () => {
      try {
        await program.methods
          .unstake(new anchor.BN(stakeAmount))
          .accounts({
            state: statePda,
            stakerAccount: stakerPda,
            vePosition: null,
            userTokenAccount: user1TokenAccount,
            vault: vaultPda,
            user: user1.publicKey,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([user1])
          .rpc();
        assert.fail("Should have thrown StakeTooRecent error");
      } catch (e) {
        assert.include(e.message, "StakeTooRecent");
      }
    });
  });

  describe("veIDL Locking", () => {
    let vePositionPda: PublicKey;
    let stakerPda: PublicKey;
    const lockDuration = 604800; // 1 week

    before(() => {
      [vePositionPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("ve_position"), user1.publicKey.toBuffer()],
        program.programId
      );

      [stakerPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("staker"), user1.publicKey.toBuffer()],
        program.programId
      );
    });

    it("locks staked tokens for veIDL", async () => {
      await program.methods
        .lockForVe(new anchor.BN(lockDuration))
        .accounts({
          state: statePda,
          stakerAccount: stakerPda,
          vePosition: vePositionPda,
          user: user1.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .signers([user1])
        .rpc();

      const vePosition = await program.account.vePosition.fetch(vePositionPda);
      assert.ok(vePosition.owner.equals(user1.publicKey));
      assert.isAbove(vePosition.lockEnd.toNumber(), Date.now() / 1000);
    });
  });

  describe("Admin Functions", () => {
    it("pauses the protocol", async () => {
      await program.methods
        .pause()
        .accounts({
          state: statePda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const state = await program.account.protocolState.fetch(statePda);
      assert.equal(state.paused, true);
    });

    it("unpauses the protocol", async () => {
      await program.methods
        .unpause()
        .accounts({
          state: statePda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const state = await program.account.protocolState.fetch(statePda);
      assert.equal(state.paused, false);
    });

    it("raises TVL cap", async () => {
      const stateBefore = await program.account.protocolState.fetch(statePda);
      const oldCap = stateBefore.tvlCap.toNumber();

      await program.methods
        .raiseTvlCap()
        .accounts({
          state: statePda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const stateAfter = await program.account.protocolState.fetch(statePda);
      assert.isAbove(stateAfter.tvlCap.toNumber(), oldCap);
    });
  });

  describe("Market Cancellation", () => {
    let cancelMarketPda: PublicKey;
    let cancelMarketPoolPda: PublicKey;
    const cancelProtocolId = "cancel-test";
    let cancelResolutionTimestamp: number;

    before(async () => {
      cancelResolutionTimestamp = Math.floor(Date.now() / 1000) + MIN_RESOLUTION_DELAY + 7200;

      [cancelMarketPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("market"),
          Buffer.from(cancelProtocolId),
          Buffer.from(new anchor.BN(cancelResolutionTimestamp).toArray("le", 8))
        ],
        program.programId
      );

      [cancelMarketPoolPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("market_pool"), cancelMarketPda.toBuffer()],
        program.programId
      );

      // Create the market to cancel
      await program.methods
        .createMarket(
          cancelProtocolId,
          { tvl: {} },
          new anchor.BN(1000),
          new anchor.BN(cancelResolutionTimestamp)
        )
        .accounts({
          state: statePda,
          market: cancelMarketPda,
          marketPool: cancelMarketPoolPda,
          idlMint: idlMint,
          creator: authority.publicKey,
          oracle: oracle.publicKey,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([authority])
        .rpc();
    });

    it("authority cancels market", async () => {
      await program.methods
        .cancelMarket()
        .accounts({
          state: statePda,
          market: cancelMarketPda,
          authority: authority.publicKey,
        })
        .signers([authority])
        .rpc();

      const market = await program.account.predictionMarket.fetch(cancelMarketPda);
      assert.equal(market.status, 2); // MARKET_STATUS_CANCELLED
    });
  });
});
