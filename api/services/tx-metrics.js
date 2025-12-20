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
 * Get transaction signatures for a program with pagination until 24h ago
 */
async function getProgramTransactions(programId) {
    try {
        const pubkey = new PublicKey(programId);
        let allSignatures = [];
        let before = undefined;
        const limitPerRequest = 1000;
        const oneDayAgo = Date.now() / 1000 - 86400;
        let reachedOldTransactions = false;

        // Fetch in batches until we reach transactions older than 24h
        while (!reachedOldTransactions && allSignatures.length < 100000000) { // Safety limit of 100M
            try {
                const signatures = await connection.getSignaturesForAddress(pubkey, {
                    limit: limitPerRequest,
                    before: before
                });

                if (signatures.length === 0) break;

                // Check if any signatures in this batch are older than 24h
                for (const sig of signatures) {
                    if (sig.blockTime && sig.blockTime < oneDayAgo) {
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

        console.log(`Fetched ${allSignatures.length} transaction signatures for ${programId} (reached 24h: ${reachedOldTransactions})`);
        return allSignatures;
    } catch (error) {
        console.error(`Error fetching transactions for ${programId}:`, error.message);
        return [];
    }
}

/**
 * Parse transactions to get users, trades, and volume
 */
async function parseTransactions(signatures, programId) {
    const uniqueUsers = new Set();
    let totalTrades = 0;
    let totalVolume = 0;
    let last24hVolume = 0;

    const oneDayAgo = Date.now() / 1000 - 86400;

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

                // Calculate volume from pre/post balances
                if (tx.meta.preBalances && tx.meta.postBalances) {
                    for (let k = 0; k < tx.meta.preBalances.length; k++) {
                        const diff = Math.abs(tx.meta.postBalances[k] - tx.meta.preBalances[k]);
                        if (diff > 0) {
                            const volumeInSOL = diff / 1e9;
                            totalVolume += volumeInSOL;

                            // Check if transaction is within last 24h
                            if (sig.blockTime && sig.blockTime > oneDayAgo) {
                                last24hVolume += volumeInSOL;
                            }
                        }
                    }
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

    return {
        uniqueUsers: uniqueUsers.size,
        totalTrades,
        totalVolume: Math.round(totalVolume * 100), // Convert to USD (~$100/SOL estimate)
        volume24h: Math.round(last24hVolume * 100)
    };
}

/**
 * Get transaction-based metrics for a protocol
 */
export async function getTxMetrics(protocolId) {
    const protocol = PROTOCOL_FEE_ACCOUNTS[protocolId];
    if (!protocol) {
        return null;
    }

    try {
        console.log(`Fetching tx history for ${protocolId}...`);

        // Get all transactions from last 24h with automatic pagination
        const signatures = await getProgramTransactions(protocol.programId);

        if (signatures.length === 0) {
            return {
                users: 0,
                trades: 0,
                volume: 0,
                volume24h: 0,
                txCount: 0,
                programId: protocol.programId,
                source: 'transactions',
                rpc: RPC_ENDPOINT,
                lastUpdated: Date.now()
            };
        }

        // Parse transactions
        const metrics = await parseTransactions(signatures, protocol.programId);

        return {
            users: metrics.uniqueUsers,
            trades: metrics.totalTrades,
            volume: metrics.totalVolume,
            volume24h: metrics.volume24h,
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
