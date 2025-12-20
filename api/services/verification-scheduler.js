/**
 * Verification Scheduler Service
 *
 * Runs IDL verification on a schedule and persists results.
 * Default: Every 1 hour
 */

const fs = require('fs');
const path = require('path');
const { verifyAllProtocols, getSummary, getLatestResults } = require('./idl-verifier');

// Configuration
const VERIFICATION_INTERVAL_MS = 60 * 60 * 1000; // 1 hour
const RESULTS_FILE = path.join(__dirname, '../../data/verification-results.json');
const HISTORY_FILE = path.join(__dirname, '../../data/verification-history.json');

// Ensure data directory exists
const dataDir = path.dirname(RESULTS_FILE);
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

let schedulerInterval = null;
let isRunning = false;
let lastRunTime = null;
let nextRunTime = null;

/**
 * Load persisted results from disk
 */
function loadPersistedResults() {
  try {
    if (fs.existsSync(RESULTS_FILE)) {
      const data = JSON.parse(fs.readFileSync(RESULTS_FILE, 'utf8'));
      console.log(`Loaded ${Object.keys(data.protocolResults || {}).length} persisted verification results`);
      return data;
    }
  } catch (err) {
    console.error('Failed to load persisted results:', err.message);
  }
  return null;
}

/**
 * Load persisted history from disk
 */
function loadPersistedHistory() {
  try {
    if (fs.existsSync(HISTORY_FILE)) {
      const data = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
      console.log(`Loaded ${data.length} historical verification runs`);
      return data;
    }
  } catch (err) {
    console.error('Failed to load persisted history:', err.message);
  }
  return [];
}

/**
 * Persist results to disk
 */
function persistResults(results) {
  try {
    fs.writeFileSync(RESULTS_FILE, JSON.stringify(results, null, 2));
    console.log('Verification results persisted to disk');
  } catch (err) {
    console.error('Failed to persist results:', err.message);
  }
}

/**
 * Persist history to disk
 */
function persistHistory(history) {
  try {
    // Keep only last 168 runs (1 week if hourly)
    const trimmedHistory = history.slice(0, 168);
    fs.writeFileSync(HISTORY_FILE, JSON.stringify(trimmedHistory, null, 2));
    console.log(`Verification history persisted (${trimmedHistory.length} runs)`);
  } catch (err) {
    console.error('Failed to persist history:', err.message);
  }
}

/**
 * Run a single verification cycle
 */
async function runVerification() {
  if (isRunning) {
    console.log('Verification already in progress, skipping...');
    return null;
  }

  isRunning = true;
  lastRunTime = new Date();

  console.log(`\n${'='.repeat(60)}`);
  console.log(`Starting scheduled verification at ${lastRunTime.toISOString()}`);
  console.log('='.repeat(60));

  try {
    const indexPath = path.join(__dirname, '../../index.json');
    const idlsPath = path.join(__dirname, '../../IDLs');

    const results = await verifyAllProtocols(indexPath, idlsPath);

    // Persist results
    const latestResults = getLatestResults();
    persistResults(latestResults);

    // Load and update history
    const history = loadPersistedHistory();
    history.unshift({
      timestamp: results.timestamp,
      verified: results.verified,
      total: results.totalProtocols,
      placeholder: results.placeholder,
      noProgram: results.noProgram,
      rpcError: results.rpcError,
      durationMs: results.durationMs,
    });
    persistHistory(history);

    console.log(`\nVerification complete:`);
    console.log(`  - Verified: ${results.verified}/${results.totalProtocols}`);
    console.log(`  - Placeholder: ${results.placeholder}`);
    console.log(`  - No Program ID: ${results.noProgram}`);
    console.log(`  - RPC Errors: ${results.rpcError}`);
    console.log(`  - Duration: ${results.durationMs}ms`);

    return results;

  } catch (err) {
    console.error('Verification run failed:', err);
    return { error: err.message };

  } finally {
    isRunning = false;
    nextRunTime = new Date(Date.now() + VERIFICATION_INTERVAL_MS);
    console.log(`Next verification scheduled for ${nextRunTime.toISOString()}`);
    console.log('='.repeat(60) + '\n');
  }
}

/**
 * Start the scheduler
 */
function startScheduler(runImmediately = true) {
  if (schedulerInterval) {
    console.log('Scheduler already running');
    return;
  }

  console.log(`Starting verification scheduler (interval: ${VERIFICATION_INTERVAL_MS / 1000}s)`);

  // Run immediately if requested
  if (runImmediately) {
    runVerification();
  }

  // Schedule periodic runs
  schedulerInterval = setInterval(runVerification, VERIFICATION_INTERVAL_MS);

  // Calculate next run time
  nextRunTime = new Date(Date.now() + VERIFICATION_INTERVAL_MS);

  return {
    interval: VERIFICATION_INTERVAL_MS,
    nextRun: nextRunTime,
  };
}

/**
 * Stop the scheduler
 */
function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('Verification scheduler stopped');
  }
}

/**
 * Get scheduler status
 */
function getSchedulerStatus() {
  return {
    running: schedulerInterval !== null,
    isVerifying: isRunning,
    lastRun: lastRunTime?.toISOString() || null,
    nextRun: nextRunTime?.toISOString() || null,
    intervalMs: VERIFICATION_INTERVAL_MS,
    intervalHuman: `${VERIFICATION_INTERVAL_MS / 1000 / 60} minutes`,
  };
}

/**
 * Trigger a manual verification run
 */
async function triggerManualRun() {
  return await runVerification();
}

/**
 * Get persisted data for API responses
 */
function getPersistedData() {
  return {
    results: loadPersistedResults(),
    history: loadPersistedHistory(),
  };
}

module.exports = {
  startScheduler,
  stopScheduler,
  getSchedulerStatus,
  triggerManualRun,
  getPersistedData,
  loadPersistedResults,
  loadPersistedHistory,
  VERIFICATION_INTERVAL_MS,
};
