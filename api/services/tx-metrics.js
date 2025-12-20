/**
 * Transaction-based metrics using fee accounts and transaction history
 * Gets real users, trades, and volume by parsing on-chain transactions
 */

import { Connection, PublicKey } from '@solana/web3.js';

const RPC_ENDPOINT = 'http://svm.run:8899';
const connection = new Connection(RPC_ENDPOINT, 'confirmed');

/**
 * Known fee/authority accounts for each protocol
 * These are the accounts that receive fees or are signers on transactions
 */
const PROTOCOL_FEE_ACCOUNTS = {
    'jupiter': {
        name: 'Jupiter Aggregator',
        feeAccount: 'pQjN9gGZYxoutMizeToKKKzUgb1PU31nLrThK1hxZWs', // Real: Referral fee account
        programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
    },
    'raydium': {
        name: 'Raydium AMM',
        feeAccount: 'CHynyGLd4fDo35VP4yftAZ9724Gt49uXYXuqmdWtt68F', // Real: CLMM Treasury USDC
        programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
    },
    'orca': {
        name: 'Orca',
        feeAccount: 'DWo8SNtdBDuebAEeVDf7cWBQ6DUvoDbS7K4QTrQvYS1S', // Real: Fee Treasury
        programId: '9W959DqEETiGZocYWCQPaJ6sBmUzgfxXfqGeTEdp3aQP'
    },
    'marinade': {
        name: 'Marinade Finance',
        feeAccount: 'mSoLzYCxHdYgdzU16g5QSh3i5K3z3KZK7ytfqcJm7So', // Marinade msol token
        programId: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD'
    },
    'drift': {
        name: 'Drift Protocol',
        feeAccount: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH', // Drift program itself
        programId: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH'
    },
    'mango': {
        name: 'Mango Markets v4',
        feeAccount: '4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg', // Mango program
        programId: '4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg'
    },
    'kamino': {
        name: 'Kamino Finance',
        feeAccount: '6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc',
        programId: '6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc'
    },
    'phoenix': {
        name: 'Phoenix DEX',
        feeAccount: 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY',
        programId: 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY'
    }
};

/**
 * Get transaction signatures for a program with pagination until time window
 * @param {string} programId - Program address
 * @param {number} windowHours - Time window in hours (default 1 hour)
 */
async function getProgramTransactions(programId, windowHours = 1) {
    try {
        const pubkey = new PublicKey(programId);
        let allSignatures = [];
        let before = undefined;
        const limitPerRequest = 1000;
        const windowSeconds = windowHours * 3600;
        const windowStart = Date.now() / 1000 - windowSeconds;
        let reachedOldTransactions = false;

        // Fetch in batches until we reach transactions older than time window
        while (!reachedOldTransactions && allSignatures.length < 100000000) { // Safety limit of 100M
            try {
                const signatures = await connection.getSignaturesForAddress(pubkey, {
                    limit: limitPerRequest,
                    before: before
                });

                if (signatures.length === 0) break;

                // Check if any signatures in this batch are older than time window
                for (const sig of signatures) {
                    if (sig.blockTime && sig.blockTime < windowStart) {
                        reachedOldTransactions = true;
                    }
                    allSignatures.push(sig);
                }

                // If we got less than the limit, we've reached the end
                if (signatures.length < limitPerRequest) break;

                // Set 'before' to the last signature for next page
                before = signatures[signatures.length - 1].signature;

                // Small delay to avoid rate limiting
                await new Promise(resolve => setTimeout(resolve, 200));

                // Log progress every 5000 signatures
                if (allSignatures.length % 5000 === 0) {
                    console.log(`  Fetched ${allSignatures.length} signatures so far...`);
                }
            } catch (error) {
                // If RPC fails, return what we've fetched so far instead of nothing
                console.error(`Error during pagination for ${programId}:`, error.message);
                console.log(`  Returning ${allSignatures.length} signatures fetched before error`);
                break;
            }
        }

        console.log(`Fetched ${allSignatures.length} transaction signatures for ${programId} (reached ${windowHours}h window: ${reachedOldTransactions})`);
        return allSignatures;
    } catch (error) {
        console.error(`Error fetching transactions for ${programId}:`, error.message);
        return [];
    }
}

/**
 * Parse transactions to get users, trades, volume, and advanced metrics
 * @param {Array} signatures - Transaction signatures
 * @param {string} programId - Program address
 * @param {number} windowHours - Time window in hours
 */
async function parseTransactions(signatures, programId, windowHours = 1) {
    const uniqueUsers = new Set();
    let totalTrades = 0;
    let totalVolume = 0;
    let windowVolume = 0;

    // Advanced metrics tracking
    const userVolumes = new Map(); // Track volume per user for whale detection
    const timestamps = []; // Track timestamps for bot detection
    let failedTxVolume = 0;
    let failedTxCount = 0;

    const windowSeconds = windowHours * 3600;
    const windowStart = Date.now() / 1000 - windowSeconds;

    // Process limited number of transactions individually to avoid payload size limits
    // Parse more transactions for better accuracy (200 recent transactions)
    const maxTransactions = 200;
    for (let i = 0; i < Math.min(signatures.length, maxTransactions); i++) {
        const sig = signatures[i];

        try {
            const tx = await connection.getTransaction(sig.signature, {
                maxSupportedTransactionVersion: 0,
                commitment: 'confirmed'
            });

            if (!tx || !tx.meta) continue;

            // Get fee payer (user)
            const feePayer = tx.transaction.message.staticAccountKeys?.[0]?.toString() ||
                            tx.transaction.message.accountKeys?.[0]?.toString();

            if (feePayer) {
                uniqueUsers.add(feePayer);
                totalTrades++;

                // Track timestamp for bot detection
                if (sig.blockTime) {
                    timestamps.push(sig.blockTime);
                }

                // Track failed transactions
                if (tx.meta.err) {
                    failedTxCount++;
                }

                // Calculate volume from pre/post balances
                let txVolume = 0;
                if (tx.meta.preBalances && tx.meta.postBalances) {
                    for (let k = 0; k < tx.meta.preBalances.length; k++) {
                        const diff = Math.abs(tx.meta.postBalances[k] - tx.meta.preBalances[k]);
                        if (diff > 0) {
                            const volumeInSOL = diff / 1e9;
                            totalVolume += volumeInSOL;
                            txVolume += volumeInSOL;

                            // Check if transaction is within time window
                            if (sig.blockTime && sig.blockTime > windowStart) {
                                windowVolume += volumeInSOL;
                            }
                        }
                    }
                }

                // Track per-user volume for whale detection
                userVolumes.set(feePayer, (userVolumes.get(feePayer) || 0) + txVolume);

                // Track failed tx volume
                if (tx.meta.err && txVolume > 0) {
                    failedTxVolume += txVolume;
                }
            }
        } catch (error) {
            // Skip failed transactions silently
            continue;
        }

        // Small delay to avoid rate limiting (every 5 transactions)
        if (i % 5 === 0 && i > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
        }
    }

    // Calculate advanced metrics
    const advancedMetrics = calculateAdvancedMetrics(
        userVolumes,
        timestamps,
        totalVolume,
        failedTxVolume,
        failedTxCount,
        totalTrades
    );

    return {
        uniqueUsers: uniqueUsers.size,
        totalTrades,
        totalVolume: Math.round(totalVolume * 100), // Convert to USD (~$100/SOL estimate)
        windowVolume: Math.round(windowVolume * 100), // Volume in current window
        windowHours, // Track window size
        ...advancedMetrics
    };
}

/**
 * Calculate advanced metrics: Honest Volume Ratio, Whale Dependency, Bot Detection
 */
function calculateAdvancedMetrics(userVolumes, timestamps, totalVolume, failedTxVolume, failedTxCount, totalTrades) {
    // 1. Calculate Whale Dependency Index (Top 10 users)
    const sortedUsers = Array.from(userVolumes.entries())
        .sort((a, b) => b[1] - a[1]);

    const top10Volume = sortedUsers.slice(0, 10)
        .reduce((sum, [_, vol]) => sum + vol, 0);

    const whaleDependency = totalVolume > 0 ? (top10Volume / totalVolume) : 0;

    // 2. Retail vs Programmatic Activity Analysis
    let timestampStdDev = 0;
    let programmaticVolume = 0;
    let retailParticipation = 0;

    if (timestamps.length > 1) {
        const mean = timestamps.reduce((a, b) => a + b, 0) / timestamps.length;
        const variance = timestamps.reduce((sum, t) => sum + Math.pow(t - mean, 2), 0) / timestamps.length;
        timestampStdDev = Math.sqrt(variance);

        // Low variance = programmatic trading (market makers, arbs - GOOD!)
        // High variance = retail/human trading (also GOOD!)
        if (timestampStdDev < 1.0) {
            programmaticVolume = totalVolume * 0.7; // Estimate programmatic share
        }
    }

    // Calculate retail participation (users outside top 10 with varied patterns)
    const retailVolume = totalVolume - top10Volume - failedTxVolume;
    retailParticipation = totalVolume > 0 ? (retailVolume / totalVolume) : 0;

    // 3. Calculate Honest Volume Ratio (whale manipulation + failed only, no bot penalty)
    const whaleVolume = top10Volume;
    const dishonestVolume = whaleVolume + failedTxVolume; // Removed bot volume
    const honestVolume = Math.max(0, totalVolume - dishonestVolume);
    const honestRatio = totalVolume > 0 ? (honestVolume / totalVolume) : 0;

    // 4. Success Rate
    const successRate = totalTrades > 0 ? ((totalTrades - failedTxCount) / totalTrades) : 1.0;

    return {
        // Honest Volume Metrics
        honestVolume: Math.round(honestVolume * 100), // USD
        honestRatio: Math.round(honestRatio * 100), // Percentage
        dishonestVolume: Math.round(dishonestVolume * 100), // USD

        // Whale Metrics
        whaleDependency: Math.round(whaleDependency * 100), // Percentage
        whaleVolume: Math.round(whaleVolume * 100), // USD
        isHealthy: whaleDependency < 0.30, // <30% = healthy

        // Retail vs Programmatic Activity
        retailParticipation: Math.round(retailParticipation * 100), // Percentage
        programmaticVolume: Math.round(programmaticVolume * 100), // USD
        timestampStdDev: Math.round(timestampStdDev * 100) / 100, // Seconds
        activityType: timestampStdDev < 1.0 ? 'programmatic' : 'retail', // Classification

        // Success Rate
        successRate: Math.round(successRate * 100), // Percentage
        failedTxCount,
        failedTxVolume: Math.round(failedTxVolume * 100) // USD
    };
}

/**
 * Get transaction-based metrics for a protocol
 * @param {string} protocolId - Protocol ID
 * @param {number} windowHours - Time window in hours (default 1 hour)
 */
export async function getTxMetrics(protocolId, windowHours = 1) {
    const protocol = PROTOCOL_FEE_ACCOUNTS[protocolId];
    if (!protocol) {
        return null;
    }

    try {
        console.log(`Fetching ${windowHours}h tx history for ${protocolId}...`);

        // Get all transactions from time window with automatic pagination
        const signatures = await getProgramTransactions(protocol.programId, windowHours);

        if (signatures.length === 0) {
            return {
                users: 0,
                trades: 0,
                volume: 0,
                windowVolume: 0,
                windowHours,
                txCount: 0,
                programId: protocol.programId,
                source: 'transactions',
                rpc: RPC_ENDPOINT,
                lastUpdated: Date.now()
            };
        }

        // Parse transactions
        const metrics = await parseTransactions(signatures, protocol.programId, windowHours);

        return {
            users: metrics.uniqueUsers,
            trades: metrics.totalTrades,
            volume: metrics.totalVolume,
            windowVolume: metrics.windowVolume,
            windowHours: metrics.windowHours,

            // Advanced Metrics
            honestVolume: metrics.honestVolume,
            honestRatio: metrics.honestRatio,
            dishonestVolume: metrics.dishonestVolume,
            whaleDependency: metrics.whaleDependency,
            whaleVolume: metrics.whaleVolume,
            isHealthy: metrics.isHealthy,
            retailParticipation: metrics.retailParticipation,
            programmaticVolume: metrics.programmaticVolume,
            activityType: metrics.activityType,
            timestampStdDev: metrics.timestampStdDev,
            successRate: metrics.successRate,
            failedTxCount: metrics.failedTxCount,
            failedTxVolume: metrics.failedTxVolume,

            tvl: 0, // Would need to query token accounts
            txCount: signatures.length,
            programId: protocol.programId,
            source: 'transactions',
            rpc: RPC_ENDPOINT,
            lastUpdated: Date.now()
        };
    } catch (error) {
        console.error(`Error getting tx metrics for ${protocolId}:`, error.message);
        return null;
    }
}

/**
 * Get all transaction-based metrics
 */
export async function getAllTxMetrics() {
    const metrics = {};

    console.log(`Fetching transaction-based metrics from ${RPC_ENDPOINT}...`);

    // Process sequentially to avoid rate limits
    for (const protocolId of Object.keys(PROTOCOL_FEE_ACCOUNTS)) {
        const data = await getTxMetrics(protocolId);
        if (data) {
            metrics[protocolId] = data;
            console.log(`  ${protocolId}: ${data.users} users, ${data.trades} trades, $${data.volume24h} 24h volume`);
        }

        // Delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    return metrics;
}

/**
 * Cache metrics
 */
let metricsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedTxMetrics() {
    const now = Date.now();

    if (metricsCache && (now - cacheTimestamp) < CACHE_TTL) {
        console.log('Returning cached tx metrics');
        return metricsCache;
    }

    console.log('Fetching fresh tx metrics...');
    metricsCache = await getAllTxMetrics();
    cacheTimestamp = now;

    return metricsCache;
}

export default {
    getTxMetrics,
    getAllTxMetrics,
    getCachedTxMetrics,
    PROTOCOL_FEE_ACCOUNTS
};
