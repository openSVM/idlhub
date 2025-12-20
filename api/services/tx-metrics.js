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
        feeAccount: 'JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN', // Jupiter fee account
        programId: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4'
    },
    'raydium': {
        name: 'Raydium AMM',
        feeAccount: '7YttLkHDoNj9wyDur5pM1ejNaAvT9X4eqaYcHQqtj2G5', // Raydium authority
        programId: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8'
    },
    'orca': {
        name: 'Orca',
        feeAccount: 'orcaEKTdK7LKz57vaAYr9QeNsVEPfiu6QeMU1kektZE', // Orca fee vault
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
 * Get transaction signatures for a program
 */
async function getProgramTransactions(programId, limit = 1000) {
    try {
        const pubkey = new PublicKey(programId);
        const signatures = await connection.getSignaturesForAddress(pubkey, {
            limit: limit
        });
        return signatures;
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

    // Process in batches to avoid rate limits
    const batchSize = 50;
    for (let i = 0; i < Math.min(signatures.length, 200); i += batchSize) {
        const batch = signatures.slice(i, i + batchSize);

        try {
            const txs = await connection.getTransactions(
                batch.map(sig => sig.signature),
                {
                    maxSupportedTransactionVersion: 0,
                    commitment: 'confirmed'
                }
            );

            for (let j = 0; j < txs.length; j++) {
                const tx = txs[j];
                const sig = batch[j];

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
            }
        } catch (error) {
            console.error(`Error parsing transaction batch:`, error.message);
            continue;
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

        // Get recent transactions
        const signatures = await getProgramTransactions(protocol.programId, 1000);

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

        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 100));
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
