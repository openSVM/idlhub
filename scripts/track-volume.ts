/**
 * Track trading volume from bags.fm pool for $IDL
 * Pool: HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC
 *
 * This script:
 * 1. Fetches all transactions from the pool
 * 2. Calculates volume per wallet
 * 3. Determines badge tier eligibility
 * 4. Outputs list of wallets and their earned badges
 */

import { Connection, PublicKey } from '@solana/web3.js';

// Constants
const BAGS_FM_POOL = 'HLnpSz9h2S4hiLQ43rnSD9XkcUThA7B8hQMKmDaiTLcC';
const IDL_TOKEN_MINT = '4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump';
const RPC_URL = process.env.RPC_URL || 'https://api.mainnet-beta.solana.com';

// Badge tiers in USD
const BADGE_TIERS = {
  BRONZE: { volume: 1_000, veIDL: 50_000, name: 'Bronze' },
  SILVER: { volume: 10_000, veIDL: 250_000, name: 'Silver' },
  GOLD: { volume: 100_000, veIDL: 1_000_000, name: 'Gold' },
  PLATINUM: { volume: 500_000, veIDL: 5_000_000, name: 'Platinum' },
  DIAMOND: { volume: 1_000_000, veIDL: 20_000_000, name: 'Diamond' },
};

interface TraderVolume {
  wallet: string;
  volumeUSD: number;
  txCount: number;
  badge: string;
  veIDL: number;
}

function getBadgeTier(volumeUSD: number): { name: string; veIDL: number } {
  if (volumeUSD >= BADGE_TIERS.DIAMOND.volume) return { name: 'Diamond', veIDL: BADGE_TIERS.DIAMOND.veIDL };
  if (volumeUSD >= BADGE_TIERS.PLATINUM.volume) return { name: 'Platinum', veIDL: BADGE_TIERS.PLATINUM.veIDL };
  if (volumeUSD >= BADGE_TIERS.GOLD.volume) return { name: 'Gold', veIDL: BADGE_TIERS.GOLD.veIDL };
  if (volumeUSD >= BADGE_TIERS.SILVER.volume) return { name: 'Silver', veIDL: BADGE_TIERS.SILVER.veIDL };
  if (volumeUSD >= BADGE_TIERS.BRONZE.volume) return { name: 'Bronze', veIDL: BADGE_TIERS.BRONZE.veIDL };
  return { name: 'None', veIDL: 0 };
}

async function getPoolSignatures(connection: Connection, poolAddress: PublicKey, limit = 1000): Promise<string[]> {
  console.log(`Fetching signatures for pool ${poolAddress.toBase58()}...`);

  const signatures: string[] = [];
  let before: string | undefined = undefined;

  while (signatures.length < limit) {
    const batch = await connection.getSignaturesForAddress(poolAddress, {
      before,
      limit: Math.min(1000, limit - signatures.length),
    });

    if (batch.length === 0) break;

    signatures.push(...batch.map(s => s.signature));
    before = batch[batch.length - 1].signature;

    console.log(`  Fetched ${signatures.length} signatures...`);

    // Rate limit
    await new Promise(r => setTimeout(r, 100));
  }

  return signatures;
}

async function parseTransaction(connection: Connection, signature: string): Promise<{ wallet: string; volumeUSD: number } | null> {
  try {
    const tx = await connection.getParsedTransaction(signature, {
      maxSupportedTransactionVersion: 0,
    });

    if (!tx || !tx.meta) return null;

    // Find the signer (trader)
    const signers = tx.transaction.message.accountKeys.filter(k => k.signer);
    if (signers.length === 0) return null;

    const wallet = signers[0].pubkey.toBase58();

    // Calculate volume from token transfers
    // This is simplified - real implementation would need to:
    // 1. Parse the actual swap instruction
    // 2. Get token prices at time of trade
    // 3. Calculate USD value

    // For now, estimate from SOL transfers (rough approximation)
    const preBalances = tx.meta.preBalances;
    const postBalances = tx.meta.postBalances;

    let solDelta = 0;
    for (let i = 0; i < preBalances.length; i++) {
      const delta = Math.abs(postBalances[i] - preBalances[i]);
      if (delta > solDelta) solDelta = delta;
    }

    // Convert lamports to SOL, then to USD (assuming ~$200/SOL)
    const solAmount = solDelta / 1e9;
    const usdValue = solAmount * 200; // Rough estimate

    return { wallet, volumeUSD: usdValue };
  } catch (e) {
    return null;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('$IDL Volume Tracker - bags.fm Pool');
  console.log('='.repeat(60));
  console.log(`Pool: ${BAGS_FM_POOL}`);
  console.log(`Token: ${IDL_TOKEN_MINT}`);
  console.log('');

  const connection = new Connection(RPC_URL, 'confirmed');
  const poolPubkey = new PublicKey(BAGS_FM_POOL);

  // Fetch signatures
  const signatures = await getPoolSignatures(connection, poolPubkey, 500);
  console.log(`\nTotal signatures: ${signatures.length}`);

  // Parse transactions and aggregate volume per wallet
  const volumeByWallet: Map<string, { volume: number; txCount: number }> = new Map();

  console.log('\nParsing transactions...');
  let parsed = 0;

  for (const sig of signatures) {
    const result = await parseTransaction(connection, sig);
    if (result) {
      const existing = volumeByWallet.get(result.wallet) || { volume: 0, txCount: 0 };
      existing.volume += result.volumeUSD;
      existing.txCount += 1;
      volumeByWallet.set(result.wallet, existing);
    }

    parsed++;
    if (parsed % 50 === 0) {
      console.log(`  Parsed ${parsed}/${signatures.length} transactions...`);
    }

    // Rate limit
    await new Promise(r => setTimeout(r, 50));
  }

  // Calculate badge eligibility
  const traders: TraderVolume[] = [];

  for (const [wallet, data] of volumeByWallet) {
    const badge = getBadgeTier(data.volume);
    traders.push({
      wallet,
      volumeUSD: data.volume,
      txCount: data.txCount,
      badge: badge.name,
      veIDL: badge.veIDL,
    });
  }

  // Sort by volume
  traders.sort((a, b) => b.volumeUSD - a.volumeUSD);

  // Output results
  console.log('\n' + '='.repeat(60));
  console.log('VOLUME LEADERBOARD');
  console.log('='.repeat(60));
  console.log('');

  console.log('Badge Tiers:');
  console.log('  Bronze:   $1,000+   ->   50,000 veIDL');
  console.log('  Silver:   $10,000+  ->  250,000 veIDL');
  console.log('  Gold:     $100,000+ -> 1,000,000 veIDL');
  console.log('  Platinum: $500,000+ -> 5,000,000 veIDL');
  console.log('  Diamond:  $1,000,000+ -> 20,000,000 veIDL');
  console.log('');

  console.log('Top Traders:');
  console.log('-'.repeat(100));
  console.log('Rank | Wallet                                      | Volume USD  | Txs | Badge    | veIDL');
  console.log('-'.repeat(100));

  traders.slice(0, 50).forEach((t, i) => {
    const volumeStr = `$${t.volumeUSD.toFixed(2)}`.padStart(12);
    const txStr = t.txCount.toString().padStart(4);
    const badgeStr = t.badge.padEnd(8);
    const veIDLStr = t.veIDL.toLocaleString().padStart(12);
    console.log(`${(i + 1).toString().padStart(4)} | ${t.wallet} | ${volumeStr} | ${txStr} | ${badgeStr} | ${veIDLStr}`);
  });

  // Summary
  const badgeCounts = {
    Diamond: traders.filter(t => t.badge === 'Diamond').length,
    Platinum: traders.filter(t => t.badge === 'Platinum').length,
    Gold: traders.filter(t => t.badge === 'Gold').length,
    Silver: traders.filter(t => t.badge === 'Silver').length,
    Bronze: traders.filter(t => t.badge === 'Bronze').length,
    None: traders.filter(t => t.badge === 'None').length,
  };

  const totalVeIDL = traders.reduce((sum, t) => sum + t.veIDL, 0);
  const totalVolume = traders.reduce((sum, t) => sum + t.volumeUSD, 0);

  console.log('\n' + '='.repeat(60));
  console.log('SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Traders: ${traders.length}`);
  console.log(`Total Volume:  $${totalVolume.toFixed(2)}`);
  console.log(`Total veIDL to distribute: ${totalVeIDL.toLocaleString()}`);
  console.log('');
  console.log('Badge Distribution:');
  console.log(`  Diamond:  ${badgeCounts.Diamond}`);
  console.log(`  Platinum: ${badgeCounts.Platinum}`);
  console.log(`  Gold:     ${badgeCounts.Gold}`);
  console.log(`  Silver:   ${badgeCounts.Silver}`);
  console.log(`  Bronze:   ${badgeCounts.Bronze}`);
  console.log(`  None:     ${badgeCounts.None}`);

  // Export for badge issuance
  const badgeEligible = traders.filter(t => t.badge !== 'None');
  console.log('\n' + '='.repeat(60));
  console.log('BADGE ISSUANCE LIST (JSON)');
  console.log('='.repeat(60));
  console.log(JSON.stringify(badgeEligible.map(t => ({
    wallet: t.wallet,
    tier: t.badge,
    volumeUSD: Math.floor(t.volumeUSD),
    veIDL: t.veIDL,
  })), null, 2));
}

main().catch(console.error);
