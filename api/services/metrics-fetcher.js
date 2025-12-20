/**
 * Real-time metrics fetcher for Solana protocols
 * Fetches TVL, volume, and user data from various sources
 */

import fetch from 'node-fetch';

// DeFiLlama API - Most comprehensive DeFi metrics
const DEFILLAMA_API = 'https://api.llama.fi';

// Solana RPC endpoints
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.mainnet-beta.solana.com';

/**
 * Fetch protocol metrics from DeFiLlama
 */
async function fetchDefiLlamaMetrics(protocolSlug) {
    try {
        const response = await fetch(`${DEFILLAMA_API}/protocol/${protocolSlug}`);
        if (!response.ok) return null;

        const data = await response.json();
        return {
            tvl: data.tvl?.[0]?.totalLiquidityUSD || data.currentChainTvls?.Solana || 0,
            volume24h: data.volume24h || 0,
            users: data.users || 0,
            source: 'defillama',
            lastUpdated: Date.now()
        };
    } catch (error) {
        console.error(`DeFiLlama fetch error for ${protocolSlug}:`, error.message);
        return null;
    }
}

/**
 * Fetch all protocols from DeFiLlama
 */
async function fetchAllDefiLlamaProtocols() {
    try {
        const response = await fetch(`${DEFILLAMA_API}/protocols`);
        if (!response.ok) return {};

        const protocols = await response.json();

        // Build mapping of protocol name -> metrics
        const metricsMap = {};

        for (const protocol of protocols) {
            // Only include Solana protocols
            if (!protocol.chains?.includes('Solana')) continue;

            const key = protocol.name.toLowerCase().replace(/\s+/g, '-');
            metricsMap[key] = {
                tvl: protocol.tvl || 0,
                volume24h: protocol.volume24h || 0,
                mcap: protocol.mcap || 0,
                chains: protocol.chains || [],
                category: protocol.category,
                source: 'defillama',
                lastUpdated: Date.now()
            };
        }

        return metricsMap;
    } catch (error) {
        console.error('Failed to fetch DeFiLlama protocols:', error.message);
        return {};
    }
}

/**
 * Map IDL protocol IDs to DeFiLlama slugs
 */
const PROTOCOL_MAPPING = {
    'jupiter': 'jupiter-aggregator',
    'raydium': 'raydium',
    'marinade': 'marinade-finance',
    'drift': 'drift-protocol',
    'mango': 'mango-markets',
    'kamino': 'kamino',
    'jito': 'jito',
    'marginfi': 'marginfi',
    'solend': 'solend',
    'tulip': 'tulip-protocol',
    'saber': 'saber',
    'orca': 'orca',
    'lifinity': 'lifinity',
    'aldrin': 'aldrin',
    'francium': 'francium',
    'hubble': 'hubble',
    'port': 'port-finance',
    'larix': 'larix',
    'apricot': 'apricot-finance',
    'credix': 'credix',
    'ratio': 'ratio-finance',
    'jet': 'jet-protocol',
    'parrot': 'parrot-protocol',
    'cyclos': 'cyclos',
    'invariant': 'invariant',
    'phoenix': 'phoenix',
    'zeta': 'zeta',
    'cypher': 'cypher',
    'hxro': 'hxro',
    'dexlab': 'dexlab',
    'step': 'step-finance',
    'mercurial': 'mercurial-finance',
    'sunny': 'sunny-aggregator'
};

/**
 * Get metrics for a specific protocol
 */
export async function getProtocolMetrics(protocolId) {
    const slug = PROTOCOL_MAPPING[protocolId] || protocolId;
    return await fetchDefiLlamaMetrics(slug);
}

/**
 * Get metrics for all protocols
 */
export async function getAllProtocolMetrics() {
    const allMetrics = await fetchAllDefiLlamaProtocols();

    // Map to our protocol IDs
    const metrics = {};
    for (const [idlId, defiLlamaSlug] of Object.entries(PROTOCOL_MAPPING)) {
        const defiLlamaKey = defiLlamaSlug.toLowerCase();
        if (allMetrics[defiLlamaKey]) {
            metrics[idlId] = allMetrics[defiLlamaKey];
        }
    }

    return metrics;
}

/**
 * Cache metrics data
 */
let metricsCache = null;
let cacheTimestamp = 0;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

export async function getCachedMetrics() {
    const now = Date.now();

    if (metricsCache && (now - cacheTimestamp) < CACHE_TTL) {
        return metricsCache;
    }

    console.log('Fetching fresh metrics from DeFiLlama...');
    metricsCache = await getAllProtocolMetrics();
    cacheTimestamp = now;

    return metricsCache;
}

export default {
    getProtocolMetrics,
    getAllProtocolMetrics,
    getCachedMetrics
};
