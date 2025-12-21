/**
 * Quick test of hourly metrics functionality
 */

import { getTxMetrics } from './api/services/tx-metrics.js';

console.log('=== Testing Hourly Metrics ===\n');

async function testProtocol(protocolId) {
    try {
        console.log(`Testing ${protocolId}...`);
        const start = Date.now();

        // Get 1-hour metrics
        const metrics = await getTxMetrics(protocolId, 1);

        const elapsed = ((Date.now() - start) / 1000).toFixed(1);

        if (metrics) {
            console.log(`✅ ${protocolId} (${elapsed}s):`);
            console.log(`   Users: ${metrics.users}`);
            console.log(`   Trades: ${metrics.trades}`);
            console.log(`   Window Volume: $${metrics.windowVolume}`);
            console.log(`   Window: ${metrics.windowHours}h`);
            console.log(`   Honest Ratio: ${metrics.honestRatio}%`);
            console.log(`   Whale Dependency: ${metrics.whaleDependency}%`);
            console.log(`   Retail Participation: ${metrics.retailParticipation}%`);
            console.log(`   Success Rate: ${metrics.successRate}%`);
            console.log(`   Activity Type: ${metrics.activityType}`);
            console.log();

            return metrics;
        } else {
            console.log(`❌ ${protocolId}: No data\n`);
            return null;
        }
    } catch (error) {
        console.error(`❌ ${protocolId}: ${error.message}\n`);
        return null;
    }
}

// Test just a couple protocols to verify it works
const protocols = ['raydium', 'orca'];

for (const protocol of protocols) {
    await testProtocol(protocol);
}

console.log('=== Test Complete ===');
process.exit(0);
