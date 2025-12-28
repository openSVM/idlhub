/**
 * IDL Transaction Verification Service
 *
 * Verifies IDLs by attempting to decode real on-chain transactions.
 * If the IDL is correct, we can decode instruction data and accounts.
 * If decoding fails, the IDL may be outdated or incorrect.
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const { BorshCoder } = require('@coral-xyz/anchor');
const fs = require('fs');
const path = require('path');

// Use the custom RPC proxy
const RPC_ENDPOINT = 'https://solana-rpc-proxy.0xrinegade.workers.dev';
const DEVNET_RPC = 'https://api.devnet.solana.com';
const ARWEAVE_GATEWAY = 'https://devnet.irys.xyz';

/**
 * Fetch IDL from Arweave
 */
async function fetchIdlFromArweave(txId) {
  const url = `${ARWEAVE_GATEWAY}/${txId}`;
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to fetch IDL: ${response.status}`);
  }
  return response.json();
}

/**
 * Known program IDs for protocols (VERIFIED ON-CHAIN)
 * IMPORTANT: IDLs should include their program ID in metadata.address or address field.
 * This mapping is a fallback for legacy IDLs that don't have embedded addresses.
 *
 * All addresses verified via RPC getAccountInfo - only executable programs included.
 */
const KNOWN_PROGRAM_IDS = {
  // SPL Programs (verified)
  'spl-token': 'TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA',
  'spl-token-2022': 'TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb',
  'spl-associated-token-account': 'ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL',
  'spl-memo': 'MemoSq4gqABAXKb96qnH8TysNcWxMyWCqXgDLGmfcHr',
  'spl-name-service': 'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX',
  'spl-token-lending': 'LendZqTs7gn5CTSJU1jWKhKuVpjJGom45nnwPb2AMTi',
  'spl-token-swap': 'SwaPpA9LAaLfeLi3a68M4DjnLqgtticKg6CnyNwgAC8',

  // Native programs (verified)
  'native-compute-budget': 'ComputeBudget111111111111111111111111111111',

  // Jupiter (verified)
  'jupiter': 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',
  'jupiter-v6': 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4',

  // Raydium (verified)
  'raydium': '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',
  'raydium-clmm': 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  'raydium-amm_v3': 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  'raydium-amm_v3_with_swapv2': 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK',
  'raydium-pool_v4': '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8',

  // Orca (verified)
  'orca': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  'orca-whirlpool': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  'orca-whirlpool_v2': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  'orca-lyf_orca': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',
  'whirlpool': 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc',

  // Meteora (verified)
  'meteora': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'meteora-amm': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'meteora-amm_052': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'meteora-lb_clmm': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',
  'meteora-lb_clmm_090': 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo',

  // Lifinity (verified)
  'lifinity': 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S',
  'lifinity-v2': 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S',
  'lifinity-idl-0.1.1': 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S',
  'lifinity-dummy_idl': 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S',

  // OpenBook / Serum (verified)
  'openbook': 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb',
  'open-book-dex': 'srmqPvymJeFKQ4zGQed1GFppgkRHL9kaELCbyksJtPX',
  'open-book-openbook_v2': 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb',
  'serum': '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin',

  // Metaplex / NFT (verified)
  'metaplex-bubblegum': 'BGUMAp9Gq7iTEuizy4pqaxsTyUCBK68MDfK752saRPUY',
  'metaplex-nft_candy_machine': 'cndy3Z4yapfJBmL3ShUp5exZKqR3z33thTzeNMm2gRZ',
  'magiceden-m2': 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
  'magiceden-m3': 'M3mxk5W2tt27WGT7THox7PmgRDp4m6NEhL5xvxrBfS1',
  'magic-eden': 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K',
  'tensor': 'TSWAPaqyCSx2KABk68Shruf4rp7CxcNi8hAsbdwmHbN',

  // Staking / Yield (verified)
  'marinade': 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD',
  'solend': 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo',

  // Perpetuals / Trading (verified)
  'drift': 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH',
  'mango': '4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg',
  'phoenix': 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY',
  'marginfi': 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA',

  // Merkle / Airdrops (verified)
  'merkle-distributor': 'MErKy6nZVoVAkryxAejJz2juifQ4ArgLgHmaJCQkU7N',

  // Other verified protocols
  'aldrin': 'AMM55ShdkoGRB5jVYPjWziwk8m5MpwyDgsMWHaMSQWH6',
  'atrix': 'HvwYjjzPbXWpykgVZhqvvfeeaSraQVnTiQibofaFw9M7',
  'balansol': 'D3BBjqUdCYuP18fNvvMbPAZ8DpcRi4io2EsYHQawJDag',
  'bonfida': 'jCebN34bUfdeUYJT13J1yG16XWQpt5PDx6Mse9GUqhR',
  'crate': 'CRATwLpu6YZEeiVq9ajjxs61wPQ9f29s1UoQR9siJCRs',
  'cropper': 'CTMAxxk34HjKWxQ3QLZK1HpaLXmBveao3ESePXbiyfzh',
  'cyclos': 'cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8',
  'cykura': 'cysPXAjehMpVKUapzbMCCnpFxUFFryEWEaLgnb9NrR8',
  'invariant': 'HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt',
  'jupiter-limit': 'jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu',
  'nosana': 'nosJhNRqr2bc9g1nfGDcXXTXvYUmxD4cVwy2pMWhrYM',
  'parrot': 'PARrVs6F5egaNuz8g6pKJyU4ze3eX5xGZCFb3GLiVvu',
  'saros': 'SSwapUtytfBdBn1b9NUGG6foMVPtcWgpRU32HToDUZr',

  // AeX402 AMM (pure eBPF C)
  'aex402-amm': '3AMM53MsJZy2Jvf7PeHHga3bsGjWV4TSaYz29WUtcdje',
  'aex402': '3AMM53MsJZy2Jvf7PeHHga3bsGjWV4TSaYz29WUtcdje',
};

/**
 * Find program ID by trying multiple name variations
 */
function findProgramId(protocolId) {
  // Direct match
  if (KNOWN_PROGRAM_IDS[protocolId]) {
    return KNOWN_PROGRAM_IDS[protocolId];
  }

  // Try lowercase
  const lower = protocolId.toLowerCase();
  if (KNOWN_PROGRAM_IDS[lower]) {
    return KNOWN_PROGRAM_IDS[lower];
  }

  // Try with dashes replaced by underscores and vice versa
  const withDashes = lower.replace(/_/g, '-');
  const withUnderscores = lower.replace(/-/g, '_');
  if (KNOWN_PROGRAM_IDS[withDashes]) return KNOWN_PROGRAM_IDS[withDashes];
  if (KNOWN_PROGRAM_IDS[withUnderscores]) return KNOWN_PROGRAM_IDS[withUnderscores];

  // Try partial matches (e.g., "orca-whirlpool" should match "orca")
  for (const [key, value] of Object.entries(KNOWN_PROGRAM_IDS)) {
    // Check if the protocol ID contains or is contained by the key
    if (lower.includes(key) || key.includes(lower)) {
      return value;
    }
    // Also try with dashes/underscores normalized
    const keyNorm = key.replace(/[-_]/g, '');
    const protoNorm = lower.replace(/[-_]/g, '');
    if (protoNorm.includes(keyNorm) || keyNorm.includes(protoNorm)) {
      return value;
    }
  }

  return null;
}

/**
 * Verify an IDL by parsing real transactions
 */
async function verifyIdlWithTransactions(protocolId, idl, options = {}) {
  const {
    maxTxToCheck = 20,
    network = 'mainnet',
    verbose = false,
  } = options;

  const result = {
    protocolId,
    programId: null,
    idlName: idl?.name || 'unknown',
    idlVersion: idl?.version || 'unknown',
    instructionCount: idl?.instructions?.length || 0,
    timestamp: new Date().toISOString(),
    status: 'pending',
    txChecked: 0,
    txDecoded: 0,
    txFailed: 0,
    decodedInstructions: {},
    failedInstructions: {},
    errors: [],
    details: {},
  };

  // Get program ID - first from IDL, then from known mappings with fuzzy matching
  const programId = idl?.metadata?.address || idl?.address || findProgramId(protocolId);
  if (!programId) {
    result.status = 'no_program_id';
    result.errors.push('No program ID found in IDL or known mappings');
    return result;
  }
  result.programId = programId;

  // Validate IDL structure
  if (!idl || !idl.instructions || idl.instructions.length === 0) {
    result.status = 'invalid_idl';
    result.errors.push('IDL has no instructions defined');
    return result;
  }

  // Check if IDL is a placeholder
  if (idl.instructions.length === 1 && idl.instructions[0].name === 'placeholder') {
    result.status = 'placeholder';
    result.errors.push('IDL is a placeholder');
    return result;
  }

  try {
    // Create connection
    const rpcEndpoint = network === 'devnet' ? DEVNET_RPC : RPC_ENDPOINT;
    const connection = new Connection(rpcEndpoint, 'confirmed');

    // Create BorshCoder from IDL
    let coder;
    try {
      coder = new BorshCoder(idl);
    } catch (err) {
      result.status = 'coder_error';
      result.errors.push(`Failed to create BorshCoder: ${err.message}`);
      return result;
    }

    // Fetch recent transactions for this program
    const pubkey = new PublicKey(programId);
    if (verbose) console.log(`Fetching transactions for ${programId}...`);

    const signatures = await connection.getSignaturesForAddress(pubkey, {
      limit: maxTxToCheck,
    });

    if (signatures.length === 0) {
      result.status = 'no_transactions';
      result.details.message = 'No recent transactions found for this program';
      return result;
    }

    result.details.signaturesFound = signatures.length;
    if (verbose) console.log(`Found ${signatures.length} transactions`);

    // Process each transaction
    for (const sigInfo of signatures) {
      result.txChecked++;

      try {
        const tx = await connection.getTransaction(sigInfo.signature, {
          maxSupportedTransactionVersion: 0,
          commitment: 'confirmed',
        });

        if (!tx || !tx.transaction || !tx.transaction.message) {
          continue;
        }

        // Find instructions that belong to our program
        const message = tx.transaction.message;

        // Build full account keys list (static + lookup table accounts)
        let accountKeys = [];

        // Add static account keys
        const staticKeys = message.staticAccountKeys || message.accountKeys || [];
        for (const key of staticKeys) {
          accountKeys.push(key.toString());
        }

        // Add lookup table accounts if present (v0 transactions)
        if (tx.meta?.loadedAddresses) {
          const { writable, readonly } = tx.meta.loadedAddresses;
          if (writable) {
            for (const key of writable) {
              accountKeys.push(key.toString());
            }
          }
          if (readonly) {
            for (const key of readonly) {
              accountKeys.push(key.toString());
            }
          }
        }

        // Get program index from full account keys
        const programIndex = accountKeys.findIndex(key => key === programId);

        if (programIndex === -1) {
          continue;
        }

        // Helper function to try decoding an instruction
        const tryDecodeInstruction = (ixData, source) => {
          try {
            const decoded = coder.instruction.decode(ixData);
            if (decoded) {
              result.txDecoded++;
              const ixName = decoded.name;
              result.decodedInstructions[ixName] = (result.decodedInstructions[ixName] || 0) + 1;

              if (verbose) {
                console.log(`  Decoded (${source}): ${ixName}`);
              }
              return true;
            }
          } catch (decodeErr) {
            result.txFailed++;

            // Extract discriminator for debugging
            const discriminator = ixData.slice(0, 8).toString('hex');
            result.failedInstructions[discriminator] = (result.failedInstructions[discriminator] || 0) + 1;

            if (verbose) {
              console.log(`  Failed (${source}, discriminator: ${discriminator}): ${decodeErr.message}`);
            }
          }
          return false;
        };

        // Get compiled instructions (top-level)
        const instructions = message.compiledInstructions || message.instructions || [];

        for (const ix of instructions) {
          if (ix.programIdIndex !== programIndex) {
            continue;
          }

          // Try to decode the instruction
          const ixData = Buffer.from(ix.data);
          tryDecodeInstruction(ixData, 'top-level');
        }

        // Also check inner instructions (CPI calls)
        if (tx.meta?.innerInstructions) {
          for (const innerGroup of tx.meta.innerInstructions) {
            for (const innerIx of innerGroup.instructions || []) {
              // Inner instructions use the same account keys array
              if (innerIx.programIdIndex !== programIndex) {
                continue;
              }

              // Inner instruction data might be base58 encoded or buffer
              let ixData;
              if (typeof innerIx.data === 'string') {
                // Base58 encoded
                const bs58 = require('bs58');
                ixData = Buffer.from(bs58.decode(innerIx.data));
              } else {
                ixData = Buffer.from(innerIx.data);
              }

              tryDecodeInstruction(ixData, 'CPI');
            }
          }
        }

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (txErr) {
        if (verbose) {
          console.log(`  Error fetching tx: ${txErr.message}`);
        }
      }
    }

    // Calculate success rate and determine status
    const totalIxAttempts = result.txDecoded + result.txFailed;
    result.details.totalInstructionsAttempted = totalIxAttempts;

    if (totalIxAttempts === 0) {
      result.status = 'no_program_instructions';
      result.details.message = 'No instructions found for this program in checked transactions';
    } else {
      const successRate = result.txDecoded / totalIxAttempts;
      result.details.successRate = Math.round(successRate * 100);
      result.details.uniqueDecodedInstructions = Object.keys(result.decodedInstructions).length;
      result.details.uniqueFailedDiscriminators = Object.keys(result.failedInstructions).length;

      if (successRate >= 0.9) {
        result.status = 'verified';
        result.details.message = `IDL verified: ${result.details.successRate}% decode success rate`;
      } else if (successRate >= 0.5) {
        result.status = 'partial';
        result.details.message = `IDL partially valid: ${result.details.successRate}% decode success rate`;
      } else if (successRate > 0) {
        result.status = 'outdated';
        result.details.message = `IDL may be outdated: only ${result.details.successRate}% decode success rate`;
      } else {
        result.status = 'invalid';
        // Check if it's likely a stub/incomplete IDL
        if (idl.instructions.length <= 5) {
          result.details.message = `IDL appears to be a stub (only ${idl.instructions.length} instructions, none match on-chain)`;
        } else {
          result.details.message = `IDL invalid: 0% decode success, ${result.details.uniqueFailedDiscriminators} unknown discriminators`;
        }
      }
    }

    // Add coverage info
    result.details.idlInstructionsCovered = Object.keys(result.decodedInstructions).length;
    result.details.idlInstructionsTotal = idl.instructions.length;
    result.details.coveragePercent = Math.round(
      (result.details.idlInstructionsCovered / result.details.idlInstructionsTotal) * 100
    );

  } catch (err) {
    result.status = 'error';
    result.errors.push(err.message);
  }

  return result;
}

/**
 * Verify multiple protocols using Arweave manifest
 */
async function verifyAllIdls(manifestPath, options = {}) {
  const { protocols = null, verbose = false } = options;

  const results = {
    timestamp: new Date().toISOString(),
    totalChecked: 0,
    verified: 0,
    partial: 0,
    outdated: 0,
    invalid: 0,
    errors: 0,
    protocols: [],
  };

  // Load manifest
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`Manifest file not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const allProtocolIds = Object.keys(manifest.idls);

  const protocolsToCheck = protocols
    ? allProtocolIds.filter(id => protocols.includes(id))
    : allProtocolIds;

  console.log(`Verifying ${protocolsToCheck.length} IDLs via transaction parsing...`);

  for (const protocolId of protocolsToCheck) {
    const entry = manifest.idls[protocolId];
    if (!entry || !entry.txId) {
      continue;
    }

    try {
      console.log(`\nVerifying ${protocolId}...`);

      // Fetch IDL from Arweave
      const idl = await fetchIdlFromArweave(entry.txId);

      // Check if placeholder
      if (idl.instructions && idl.instructions.length === 1 && idl.instructions[0].name === 'placeholder') {
        console.log(`  - PLACEHOLDER (skipping)`);
        continue;
      }

      const result = await verifyIdlWithTransactions(protocolId, idl, { verbose });

      results.totalChecked++;
      results.protocols.push(result);

      switch (result.status) {
        case 'verified':
          results.verified++;
          console.log(`  VERIFIED (${result.details.successRate}% success, ${result.details.coveragePercent}% coverage)`);
          break;
        case 'partial':
          results.partial++;
          console.log(`  ~ PARTIAL (${result.details.successRate}% success)`);
          break;
        case 'outdated':
          results.outdated++;
          console.log(`  ! OUTDATED (${result.details.successRate}% success)`);
          break;
        case 'invalid':
          results.invalid++;
          console.log(`  x INVALID (0% success)`);
          break;
        default:
          results.errors++;
          console.log(`  ? ${result.status}: ${result.errors.join(', ') || result.details.message}`);
      }

      // Rate limit between protocols
      await new Promise(resolve => setTimeout(resolve, 200));

    } catch (err) {
      console.log(`  Error: ${err.message}`);
      results.errors++;
    }
  }

  console.log(`\n=== Summary ===`);
  console.log(`Total checked: ${results.totalChecked}`);
  console.log(`Verified: ${results.verified}`);
  console.log(`Partial: ${results.partial}`);
  console.log(`Outdated: ${results.outdated}`);
  console.log(`Invalid: ${results.invalid}`);
  console.log(`Errors: ${results.errors}`);

  // Save results to file
  const outputPath = path.join(__dirname, '../../data/tx-verification-results.json');
  try {
    // Ensure data directory exists
    const dataDir = path.dirname(outputPath);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(outputPath, JSON.stringify(results, null, 2));
    console.log(`\nResults saved to: ${outputPath}`);
  } catch (err) {
    console.error(`Failed to save results: ${err.message}`);
  }

  return results;
}

/**
 * CLI entry point
 */
async function main() {
  const args = process.argv.slice(2);
  const verbose = args.includes('-v') || args.includes('--verbose');
  const verifyAll = args.includes('--all');

  // Filter out flags
  const protocolArgs = args.filter(a => !a.startsWith('-'));

  const manifestPath = path.join(__dirname, '../../public/arweave/manifest.json');

  if (verifyAll) {
    // Verify all protocols in manifest
    console.log('Verifying ALL protocols in manifest...\n');
    await verifyAllIdls(manifestPath, {
      protocols: null, // null = all
      verbose,
    });
  } else if (protocolArgs.length > 0) {
    // Verify specific protocols
    await verifyAllIdls(manifestPath, {
      protocols: protocolArgs,
      verbose,
    });
  } else {
    // Verify a sample of known active protocols
    const sampleProtocols = [
      'drift',
      'orca',
      'marginfi',
      'kamino',
      'lifinity',
      'meteora',
      'mango',
      'sanctum',
    ];

    console.log('Verifying sample protocols:', sampleProtocols.join(', '));
    console.log('Use: node idl-tx-verifier.cjs <protocol-id> [...] to verify specific protocols');
    console.log('Use: node idl-tx-verifier.cjs --all to verify all protocols');
    console.log('Add -v for verbose output\n');

    await verifyAllIdls(manifestPath, {
      protocols: sampleProtocols,
      verbose,
    });
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

module.exports = {
  verifyIdlWithTransactions,
  verifyAllIdls,
  KNOWN_PROGRAM_IDS,
};
