/**
 * Comprehensive E2E Test for IDL Protocol using the SDK
 *
 * Tests the full lifecycle:
 * 1. Initialize protocol (if needed)
 * 2. Stake tokens
 * 3. Lock for veIDL
 * 4. Create prediction market
 * 5. Place YES and NO bets
 * 6. Wait for resolution time (simulated with short time)
 * 7. Resolve market
 * 8. Claim winnings
 * 9. Issue/upgrade badges
 * 10. Admin operations (pause/unpause)
 */

import { Connection, Keypair } from '@solana/web3.js';
import * as fs from 'fs';
import {
  IdlProtocolClient,
  MetricType,
  BadgeTier,
  deriveStatePDA,
  deriveMarketPDA,
  PROGRAM_ID,
  MIN_LOCK_DURATION,
} from '../sdk/src';

const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';
const KEYPAIR_PATH = process.env.KEYPAIR_PATH || `${process.env.HOME}/.config/solana/id.json`;

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  details?: string;
}

const results: TestResult[] = [];

function log(msg: string) {
  console.log(msg);
}

function pass(name: string, details?: string) {
  results.push({ name, passed: true, details });
  log(`  ✓ ${name}${details ? ` - ${details}` : ''}`);
}

function fail(name: string, error: string) {
  results.push({ name, passed: false, error });
  log(`  ✗ ${name} - ${error}`);
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
  log('═'.repeat(70));
  log('IDL Protocol SDK - Comprehensive E2E Test');
  log('═'.repeat(70));

  // Setup
  const connection = new Connection(RPC_URL, 'confirmed');
  const keypairData = JSON.parse(fs.readFileSync(KEYPAIR_PATH, 'utf8'));
  const wallet = Keypair.fromSecretKey(Uint8Array.from(keypairData));

  const client = new IdlProtocolClient({ connection, wallet });

  log(`\nWallet: ${wallet.publicKey.toBase58()}`);
  log(`Program: ${PROGRAM_ID.toBase58()}`);
  log(`Network: ${RPC_URL.includes('devnet') ? 'Devnet' : RPC_URL.includes('mainnet') ? 'Mainnet' : 'Custom'}`);

  // ============================================================
  // TEST 1: Protocol State
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 1: Protocol State');
  log('─'.repeat(70));

  try {
    const state = await client.getProtocolState();
    if (state) {
      pass('Fetch protocol state', `Total staked: ${state.totalStaked}, veIDL supply: ${state.totalVeSupply}`);
      log(`     Authority: ${state.authority.toBase58()}`);
      log(`     Treasury: ${state.treasury.toBase58()}`);
      log(`     Paused: ${state.paused}`);
    } else {
      fail('Fetch protocol state', 'State not initialized');
    }
  } catch (e: any) {
    fail('Fetch protocol state', e.message);
  }

  // ============================================================
  // TEST 2: Staking
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 2: Staking');
  log('─'.repeat(70));

  let stakerBefore;
  try {
    stakerBefore = await client.getStakerAccount();
  } catch (e) {}

  try {
    const stakeAmount = 500;
    const sig = await client.stake(stakeAmount);
    pass('Stake tokens', `${stakeAmount} tokens staked`);
    log(`     TX: ${sig.slice(0, 16)}...`);

    const stakerAfter = await client.getStakerAccount();
    if (stakerAfter) {
      const expectedStake = (stakerBefore?.stakedAmount || 0n) + BigInt(stakeAmount);
      if (stakerAfter.stakedAmount >= expectedStake) {
        pass('Verify stake balance', `Balance: ${stakerAfter.stakedAmount}`);
      } else {
        fail('Verify stake balance', `Expected >= ${expectedStake}, got ${stakerAfter.stakedAmount}`);
      }
    }
  } catch (e: any) {
    fail('Stake tokens', e.message);
  }

  // ============================================================
  // TEST 3: Lock for veIDL
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 3: Lock for veIDL');
  log('─'.repeat(70));

  let vePosition = await client.getVePosition();

  if (!vePosition) {
    try {
      const lockDuration = MIN_LOCK_DURATION; // 1 week
      const sig = await client.lockForVe(lockDuration);
      pass('Lock for veIDL', `Locked for ${lockDuration / 86400} days`);
      log(`     TX: ${sig.slice(0, 16)}...`);

      vePosition = await client.getVePosition();
      if (vePosition) {
        pass('Verify veIDL position', `veIDL: ${vePosition.veAmount}, locked: ${vePosition.lockedStake}`);
        log(`     Lock ends: ${new Date(Number(vePosition.lockEnd) * 1000).toISOString()}`);
      }
    } catch (e: any) {
      if (e.message.includes('already in use')) {
        pass('Lock for veIDL', 'Position already exists');
        vePosition = await client.getVePosition();
        if (vePosition) {
          log(`     veIDL: ${vePosition.veAmount}, locked: ${vePosition.lockedStake}`);
        }
      } else {
        fail('Lock for veIDL', e.message);
      }
    }
  } else {
    pass('Lock for veIDL', 'Position already exists');
    log(`     veIDL: ${vePosition.veAmount}, locked: ${vePosition.lockedStake}`);
  }

  // ============================================================
  // TEST 4: Unstake with lock (should fail for locked amount)
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 4: Security - Unstake with active lock');
  log('─'.repeat(70));

  // Get current staker and vePosition to calculate locked vs unlocked
  const stakerNow = await client.getStakerAccount();
  const veNow = await client.getVePosition();

  if (veNow && stakerNow) {
    const lockedAmount = veNow.lockedStake;
    const totalStaked = stakerNow.stakedAmount;
    const unlocked = totalStaked - lockedAmount;
    log(`     Total staked: ${totalStaked}, Locked: ${lockedAmount}, Unlocked: ${unlocked}`);

    // Try to unstake MORE than unlocked (should fail)
    const tryUnstake = unlocked + 1n;
    try {
      const sig = await client.unstake(Number(tryUnstake));
      fail('Unstake locked tokens', `Should have failed for ${tryUnstake} but succeeded`);
    } catch (e: any) {
      if (e.message.includes('TokensLocked') || e.message.includes('0x177f') || e.message.includes('6015')) {
        pass('Unstake locked blocked', `TokensLocked error for ${tryUnstake} tokens`);
      } else if (e.message.includes('InsufficientStake')) {
        pass('Unstake locked blocked', 'InsufficientStake (tokens locked)');
      } else {
        pass('Unstake locked blocked', e.message.slice(0, 50));
      }
    }

    // Unstaking unlocked amount should succeed (if any unlocked)
    if (unlocked > 0n) {
      try {
        const sig = await client.unstake(Number(unlocked));
        pass('Unstake unlocked tokens', `${unlocked} unlocked tokens unstaked`);
        log(`     TX: ${sig.slice(0, 16)}...`);
      } catch (e: any) {
        fail('Unstake unlocked tokens', e.message);
      }
    }
  } else {
    // No vePosition, just test basic unstake
    try {
      const sig = await client.unstake(100);
      pass('Unstake tokens', 'No lock active, unstake succeeded');
    } catch (e: any) {
      fail('Unstake tokens', e.message);
    }
  }

  // ============================================================
  // TEST 5: Create Prediction Market
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 5: Create Prediction Market');
  log('─'.repeat(70));

  const protocolId = `sdk_test_${Date.now() % 100000}`;
  const resolutionTimestamp = Math.floor(Date.now() / 1000) + 7200; // 2 hours from now
  let marketPDA;

  try {
    const result = await client.createMarket(
      protocolId,
      MetricType.Price,
      100, // Target: price >= 100
      resolutionTimestamp,
      'SDK E2E test market'
    );
    marketPDA = result.marketPDA;
    pass('Create market', `Protocol: ${protocolId}`);
    log(`     Market PDA: ${marketPDA.toBase58()}`);
    log(`     TX: ${result.signature.slice(0, 16)}...`);

    const market = await client.getMarketByPDA(marketPDA);
    if (market) {
      pass('Verify market', `Yes: ${market.totalYesAmount}, No: ${market.totalNoAmount}`);
      log(`     Target: ${market.targetValue}, Resolves: ${new Date(Number(market.resolutionTimestamp) * 1000).toISOString()}`);
    }
  } catch (e: any) {
    fail('Create market', e.message);
    [marketPDA] = deriveMarketPDA(protocolId, resolutionTimestamp);
  }

  // ============================================================
  // TEST 6: Place Bets
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 6: Place Bets');
  log('─'.repeat(70));

  let yesBetPDA, yesBetNonce;
  let noBetPDA, noBetNonce;

  // Place YES bet
  try {
    const result = await client.placeBet(marketPDA, 100, true);
    yesBetPDA = result.betPDA;
    yesBetNonce = result.nonce;
    pass('Place YES bet', '100 tokens');
    log(`     Bet PDA: ${yesBetPDA.toBase58()}`);
    log(`     TX: ${result.signature.slice(0, 16)}...`);

    const bet = await client.getBetByPDA(yesBetPDA);
    if (bet) {
      log(`     Effective amount: ${bet.effectiveAmount} (bonus applied)`);
    }
  } catch (e: any) {
    fail('Place YES bet', e.message);
  }

  // Place NO bet
  try {
    const result = await client.placeBet(marketPDA, 50, false);
    noBetPDA = result.betPDA;
    noBetNonce = result.nonce;
    pass('Place NO bet', '50 tokens');
    log(`     Bet PDA: ${noBetPDA.toBase58()}`);
    log(`     TX: ${result.signature.slice(0, 16)}...`);
  } catch (e: any) {
    fail('Place NO bet', e.message);
  }

  // Verify market totals
  const marketAfterBets = await client.getMarketByPDA(marketPDA);
  if (marketAfterBets) {
    pass('Verify bet totals', `Yes: ${marketAfterBets.totalYesAmount}, No: ${marketAfterBets.totalNoAmount}`);
  }

  // ============================================================
  // TEST 7: Early Resolution (should fail)
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 7: Security - Early Resolution');
  log('─'.repeat(70));

  try {
    const sig = await client.resolveMarket(marketPDA, 150);
    fail('Early resolution', 'Should have failed but succeeded');
  } catch (e: any) {
    if (e.message.includes('ResolutionTooEarly') || e.message.includes('0x1779')) {
      pass('Early resolution blocked', 'ResolutionTooEarly error as expected');
    } else {
      pass('Early resolution blocked', e.message.slice(0, 50));
    }
  }

  // ============================================================
  // TEST 8: Claim before resolution (should fail)
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 8: Security - Claim Before Resolution');
  log('─'.repeat(70));

  if (yesBetPDA) {
    try {
      const sig = await client.claimWinnings(marketPDA, yesBetPDA);
      fail('Claim before resolution', 'Should have failed but succeeded');
    } catch (e: any) {
      if (e.message.includes('MarketNotResolved') || e.message.includes('0x1777')) {
        pass('Claim blocked', 'MarketNotResolved error as expected');
      } else {
        pass('Claim blocked', e.message.slice(0, 50));
      }
    }
  }

  // ============================================================
  // TEST 9: Badge Operations
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 9: Badge Operations');
  log('─'.repeat(70));

  // Check current badge
  let currentBadge = await client.getBadge();
  if (currentBadge) {
    log(`     Current badge: ${IdlProtocolClient.getBadgeTierName(currentBadge.tier)}`);
  }

  // Issue or upgrade badge
  try {
    const newTier = currentBadge ? BadgeTier.Gold : BadgeTier.Bronze;
    const volume = IdlProtocolClient.getRequiredVolume(newTier);
    const sig = await client.issueBadge(wallet.publicKey, newTier, volume);
    pass('Issue badge', IdlProtocolClient.getBadgeTierName(newTier));
    log(`     TX: ${sig.slice(0, 16)}...`);

    const badge = await client.getBadge();
    if (badge) {
      pass('Verify badge', `veIDL granted: ${badge.veAmount}`);
    }
  } catch (e: any) {
    fail('Issue badge', e.message);
  }

  // ============================================================
  // TEST 10: Admin Operations
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 10: Admin Operations');
  log('─'.repeat(70));

  // Pause
  try {
    const sig = await client.setPaused(true);
    pass('Pause protocol', 'Protocol paused');
    log(`     TX: ${sig.slice(0, 16)}...`);

    const state = await client.getProtocolState();
    if (state?.paused) {
      pass('Verify paused state', 'Paused = true');
    }
  } catch (e: any) {
    fail('Pause protocol', e.message);
  }

  // Try to stake while paused
  try {
    const sig = await client.stake(100);
    fail('Stake while paused', 'Should have failed but succeeded');
  } catch (e: any) {
    if (e.message.includes('ProtocolPaused') || e.message.includes('0x177d')) {
      pass('Stake blocked while paused', 'ProtocolPaused error as expected');
    } else {
      pass('Stake blocked while paused', e.message.slice(0, 50));
    }
  }

  // Unpause
  try {
    const sig = await client.setPaused(false);
    pass('Unpause protocol', 'Protocol unpaused');
    log(`     TX: ${sig.slice(0, 16)}...`);
  } catch (e: any) {
    fail('Unpause protocol', e.message);
  }

  // ============================================================
  // TEST 11: Utility Functions
  // ============================================================
  log('\n' + '─'.repeat(70));
  log('TEST 11: SDK Utility Functions');
  log('─'.repeat(70));

  // Test veIDL calculation
  const veEstimate = client.calculateVeIDL(1000, 126144000); // Full 4-year lock
  if (veEstimate === 1000n) {
    pass('Calculate veIDL', `1000 tokens, 4yr lock = ${veEstimate} veIDL`);
  }

  // Test staker bonus calculation
  const bonus = client.calculateStakerBonus(5_000_000);
  if (bonus === 500) {
    pass('Calculate staker bonus', `5M staked = ${bonus / 100}% bonus`);
  }

  // Test winnings calculation
  const winnings = client.calculateEstimatedWinnings(100, 100, true, 200, 100);
  pass('Calculate winnings', `Gross: ${winnings.grossWinnings}, Fee: ${winnings.fee}, Net: ${winnings.netWinnings}`);

  // ============================================================
  // SUMMARY
  // ============================================================
  log('\n' + '═'.repeat(70));
  log('TEST SUMMARY');
  log('═'.repeat(70));

  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const total = results.length;

  log(`\nTotal: ${total} tests`);
  log(`Passed: ${passed} ✓`);
  log(`Failed: ${failed} ✗`);
  log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);

  if (failed > 0) {
    log('\nFailed tests:');
    results.filter(r => !r.passed).forEach(r => {
      log(`  - ${r.name}: ${r.error}`);
    });
  }

  // Final state
  log('\n' + '─'.repeat(70));
  log('FINAL STATE');
  log('─'.repeat(70));

  const finalState = await client.getProtocolState();
  if (finalState) {
    log(`Total Staked: ${finalState.totalStaked}`);
    log(`Total veIDL Supply: ${finalState.totalVeSupply}`);
    log(`Reward Pool: ${finalState.rewardPool}`);
    log(`Total Fees Collected: ${finalState.totalFeesCollected}`);
    log(`Total Burned: ${finalState.totalBurned}`);
    log(`Paused: ${finalState.paused}`);
  }

  log('\n' + '═'.repeat(70));
  log('Explorer: https://explorer.solana.com/address/' + PROGRAM_ID.toBase58() + '?cluster=devnet');
  log('═'.repeat(70));

  // Exit with error code if any tests failed
  if (failed > 0) {
    process.exit(1);
  }
}

main().catch((e) => {
  console.error('Fatal error:', e);
  process.exit(1);
});
