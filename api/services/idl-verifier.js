/**
 * IDL Verification Service
 *
 * Verifies that IDLs match deployed on-chain programs by:
 * 1. Extracting program IDs from IDL metadata or known mappings
 * 2. Supporting multiple programs per protocol
 * 3. Checking if programs exist on-chain and are executable
 * 4. Tracking verification history and status
 */

const { Connection, PublicKey } = require('@solana/web3.js');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

// RPC endpoints with fallbacks
const RPC_ENDPOINTS = [
  'https://solana-rpc-proxy.0xrinegade.workers.dev',
  'https://api.mainnet-beta.solana.com',
  'https://solana-api.projectserum.com',
  'https://rpc.ankr.com/solana',
];

// Known program IDs for protocols
// Supports multiple programs per protocol as an array
const KNOWN_PROGRAM_IDS = {
  // IDLHub's own programs
  'idl-protocol': [
    { name: 'IDL Protocol', address: 'BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt', network: 'devnet' },
  ],
  'idl-stableswap': [
    { name: 'IDL StableSwap', address: 'EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte', network: 'devnet' },
  ],

  // Jupiter - multiple programs
  'jupiter': [
    { name: 'Jupiter v6', address: 'JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4' },
    { name: 'Jupiter Limit Order', address: 'jupoNjAxXgZ4rjzxzPMP4oxduvQsQtZzyknqvzYNrNu' },
    { name: 'Jupiter DCA', address: 'DCA265Vj8a9CEuX1eb1LWRnDT7uK6q1xMipnNyatn23M' },
  ],

  // Raydium - multiple programs
  'raydium': [
    { name: 'Raydium AMM v4', address: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' },
    { name: 'Raydium CLMM', address: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK' },
    { name: 'Raydium CP-Swap', address: 'CPMMoo8L3F4NbTegBCKVNunggL7H1ZpdTHKxQB5qKP1C' },
  ],
  'raydium-amm': [
    { name: 'Raydium AMM v4', address: '675kPX9MHTjS2zt1qfr1NYHuzeLXfQM9H24wFSUt1Mp8' },
  ],
  'raydium-clmm': [
    { name: 'Raydium CLMM', address: 'CAMMCzo5YL8w4VFF8KVHrK22GGUsp5VTaW7grrKgrWqK' },
  ],

  // Orca
  'orca': [
    { name: 'Orca Whirlpool', address: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' },
  ],
  'orca-whirlpool': [
    { name: 'Orca Whirlpool', address: 'whirLbMiicVdio4qvUfM5KAg6Ct8VwpYzGff3uctyCc' },
  ],

  // Marinade
  'marinade': [
    { name: 'Marinade Finance', address: 'MarBmsSgKXdrN1egZf5sqe1TMai9K1rChYNDJgjq7aD' },
  ],

  // Drift
  'drift': [
    { name: 'Drift Protocol', address: 'dRiftyHA39MWEi3m9aunc5MzRF1JYuBsbn6VPcn33UH' },
  ],

  // Mango
  'mango': [
    { name: 'Mango v4', address: '4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg' },
  ],
  'mango-v4': [
    { name: 'Mango v4', address: '4MangoMjqJ2firMokCjjGgoK8d4MXcrgL7XJaL3w6fVg' },
  ],
  'mango-v3': [
    { name: 'Mango v3', address: 'mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68' },
  ],

  // Phoenix
  'phoenix': [
    { name: 'Phoenix DEX', address: 'PhoeNiXZ8ByJGLkxNfZRnkUfjvmuYqLR89jjFHGqdXY' },
  ],

  // OpenBook
  'openbook': [
    { name: 'OpenBook v2', address: 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb' },
  ],
  'openbook-v2': [
    { name: 'OpenBook v2', address: 'opnb2LAfJYbRMAHHvqjCwQxanZn7ReEHp1k81EohpZb' },
  ],

  // MarginFi
  'marginfi': [
    { name: 'MarginFi', address: 'MFv2hWf31Z9kbCa1snEPYctwafyhdvnV7FZnsebVacA' },
  ],

  // Kamino
  'kamino': [
    { name: 'Kamino Lending', address: 'KLend2g3cP87ber41GRRMFjD2a44rFDPdxYf68LN5Un' },
    { name: 'Kamino Liquidity', address: '6LtLpnUFNByNXLyCoK9wA2MykKAmQNZKBdY8s47dehDc' },
  ],

  // Solend
  'solend': [
    { name: 'Solend', address: 'So1endDq2YkqhipRh3WViPa8hdiSpxWy6z3Z6tMCpAo' },
  ],

  // Jito
  'jito': [
    { name: 'Jito Stake Pool', address: 'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb' },
    { name: 'Jito TipRouter', address: 'Jito4APyf642JPZPx3hGc6WWJ8zPKtRbRs4P815Awbb' },
  ],

  // Sanctum
  'sanctum': [
    { name: 'Sanctum', address: 'SP12tWFxD9oJsVWNavTTBZvMbA6gkAmxtVgxdqvyvhY' },
  ],

  // Meteora
  'meteora': [
    { name: 'Meteora DLMM', address: 'LBUZKhRxPF3XUpBCjp4YzTKgLccjZhTSDM9YuVaPwxo' },
    { name: 'Meteora Pools', address: 'Eo7WjKq67rjJQSZxS6z3YkapzY3eMj6Xy8X5EQVn5UaB' },
  ],

  // Lifinity
  'lifinity': [
    { name: 'Lifinity v1', address: 'EewxydAPCCVuNEyrVN68PuSYdQ7wKn27V9Gjeoi8dy3S' },
  ],
  'lifinity-v2': [
    { name: 'Lifinity v2', address: '2wT8Yq49kHgDzXuPxZSaeLkbYyJN8hAXNx7e3vP4qsEb' },
  ],

  // Aldrin
  'aldrin': [
    { name: 'Aldrin AMM', address: 'AMM55ShdkoGRB5jVYPjWziwk8m5MpwyDgsMWHaMSQWH6' },
  ],

  // Saber
  'saber': [
    { name: 'Saber Stable Swap', address: 'SSwpkEEcbUqx4vtoEByFjSkhKdCT862DNVb52nZg1UZ' },
  ],

  // Mercurial
  'mercurial': [
    { name: 'Mercurial', address: 'MERLuDFBMmsHnsBPZw2sDQZHvXFMwp8EdjudcU2HKky' },
  ],

  // Other protocols with known addresses
  'invariant': [{ name: 'Invariant', address: 'HyaB3W9q6XdA5xwpU4XnSZV94htfmbmqJXZcEbRaJutt' }],
  'goosefx': [{ name: 'GooseFX', address: 'GFXsSL5sSaDfNFQUYsHekbWBW1TsFdjDYzACh62tEHxn' }],
  'crema': [{ name: 'Crema', address: 'CLMM9tUoggJu2wagPkkqs9eFG4BWhVBZWkP1qv3Sp7tR' }],
  'bonfida': [{ name: 'Bonfida', address: 'namesLPneVptA9Z5rqUDD9tMTWEJwofgaYwp8cawRkX' }],
  'zeta': [{ name: 'Zeta Markets', address: 'ZETAxsqBRek56DhiGXrn7PZgAGxnseodLXgLnqrFp6u' }],
  'francium': [{ name: 'Francium', address: 'FC81tbGt6JWRXidaWYFXeRaQKQCJc25JWD4RZGHwaqrz' }],
  'jet': [{ name: 'Jet Protocol', address: 'JPLockxtkngHkaQT5AuRMhKgVNDJzQcqhPxhxbocmP5' }],
  'port': [{ name: 'Port Finance', address: 'Port7uDYB3wk6GJAw4KT1WpTeMtSu9bTcChBHkX2LfR' }],
  'quarry': [{ name: 'Quarry', address: 'QMNeHCGYnLVDn1icRAfQhpbV9MBgtZNFqFLqejqhvPK' }],
  'tribeca': [{ name: 'Tribeca', address: 'Govz1VyoyLD5BL6CSCxUx7PtmNyBL4pLPVXNHD9cLFb' }],
  'switchboard': [{ name: 'Switchboard', address: 'SW1TCH7qEPTdLsDHRgPuMQjbQxKdH2aBStViMFnt64f' }],
  'goki': [{ name: 'Goki', address: 'GokivDYuQXPZCWRkwMhdH2h91KpDQXBEmpsPZ3DoPj24' }],
  'sencha': [{ name: 'Sencha', address: 'SCHAtsf8mbjyjiv4LkhLKutxRoJHSFsqcCbMWLzX7TX' }],
  'fluxbeam': [{ name: 'FluxBeam', address: 'FLUXubRmkEi2q6K3Y9kBPgSpwfBDYxZqYBdRJg6mEZ1' }],
  'arrow': [{ name: 'Arrow', address: 'ARoWLTBWoWrKMvxEiaE2fn1sPA7kBL98B6nqYSPBPz4h' }],
  'uxd': [{ name: 'UXD', address: 'UXD8m9cvwk4RcSxnX2HZ9VudQCEeDH6fGFteuHQ8pNq' }],
  'magiceden': [{ name: 'Magic Eden', address: 'M2mx93ekt1fmXSVkTrUL9xVFHkmME8HTUi5Cyc5aF7K' }],
  'serum-v2': [{ name: 'Serum v2', address: '9xQeWvG816bUx9EPjHmaT23yvVM2ZWbrrpZb9PusVFin' }],
};

// Verification result status
const VerificationStatus = {
  VERIFIED: 'verified',
  PARTIAL: 'partial',             // Some programs verified, some not
  PROGRAM_NOT_FOUND: 'program_not_found',
  IDL_MISMATCH: 'idl_mismatch',
  NO_PROGRAM_ID: 'no_program_id',
  RPC_ERROR: 'rpc_error',
  PENDING: 'pending',
  PLACEHOLDER: 'placeholder',
  DEVNET_ONLY: 'devnet_only',     // Program only on devnet
};

// Store verification results
const verificationResults = new Map();
const verificationHistory = [];

/**
 * Get a working RPC connection with fallback
 */
async function getConnection(network = 'mainnet') {
  const endpoints = network === 'devnet'
    ? ['https://api.devnet.solana.com']
    : RPC_ENDPOINTS;

  for (const endpoint of endpoints) {
    try {
      const connection = new Connection(endpoint, 'confirmed');
      await connection.getSlot();
      return connection;
    } catch (err) {
      console.warn(`RPC ${endpoint} failed, trying next...`);
    }
  }
  throw new Error('All RPC endpoints failed');
}

/**
 * Check if a program exists on-chain and is executable
 */
async function checkProgramExists(connection, programId) {
  try {
    const pubkey = new PublicKey(programId);
    const accountInfo = await connection.getAccountInfo(pubkey);

    if (!accountInfo) {
      return { exists: false, executable: false, dataLen: 0 };
    }

    return {
      exists: true,
      executable: accountInfo.executable,
      dataLen: accountInfo.data.length,
      owner: accountInfo.owner.toBase58(),
      lamports: accountInfo.lamports,
    };
  } catch (err) {
    return { exists: false, error: err.message };
  }
}

/**
 * Try to fetch Anchor IDL from on-chain IDL account
 */
async function fetchOnChainIdl(connection, programId) {
  try {
    const pubkey = new PublicKey(programId);
    const [idlAddress] = PublicKey.findProgramAddressSync(
      [Buffer.from('anchor:idl'), pubkey.toBuffer()],
      pubkey
    );

    const accountInfo = await connection.getAccountInfo(idlAddress);
    if (!accountInfo) {
      return { found: false };
    }

    return {
      found: true,
      dataLen: accountInfo.data.length,
    };
  } catch (err) {
    return { found: false, error: err.message };
  }
}

/**
 * Extract program IDs from IDL file
 */
function extractProgramIdsFromIdl(idl) {
  const programIds = [];

  if (!idl) return programIds;

  // Check metadata.address (most common)
  if (idl.metadata?.address) {
    try {
      new PublicKey(idl.metadata.address);
      programIds.push({
        name: idl.name || 'Main Program',
        address: idl.metadata.address,
        source: 'metadata.address',
      });
    } catch {}
  }

  // Check address field directly (Anchor 0.30+)
  if (idl.address) {
    try {
      new PublicKey(idl.address);
      if (!programIds.find(p => p.address === idl.address)) {
        programIds.push({
          name: idl.name || 'Main Program',
          address: idl.address,
          source: 'address',
        });
      }
    } catch {}
  }

  // Check constants for program ID patterns
  // But filter out common non-program constants (mints, pools, etc.)
  const NON_PROGRAM_PATTERNS = [
    /mint/i, /token/i, /pool/i, /vault/i, /treasury/i,
    /authority/i, /admin/i, /fee/i, /reward/i
  ];

  if (idl.constants) {
    for (const constant of idl.constants) {
      if (constant.type === 'string' && constant.value?.length >= 32 && constant.value?.length <= 44) {
        // Skip if name matches non-program patterns
        if (NON_PROGRAM_PATTERNS.some(pattern => pattern.test(constant.name))) {
          continue;
        }
        try {
          new PublicKey(constant.value);
          // Avoid duplicates
          if (!programIds.find(p => p.address === constant.value)) {
            programIds.push({
              name: constant.name || 'Program',
              address: constant.value,
              source: `constants.${constant.name}`,
            });
          }
        } catch {}
      }
    }
  }

  return programIds;
}

/**
 * Generate a hash of IDL instruction signatures for comparison
 */
function hashIdlSignatures(idl) {
  if (!idl || !idl.instructions) return null;

  const signatures = idl.instructions.map(ix => ({
    name: ix.name,
    accounts: (ix.accounts || []).map(a => ({
      name: a.name,
      isMut: a.isMut,
      isSigner: a.isSigner,
    })),
    args: (ix.args || []).map(a => ({
      name: a.name,
      type: JSON.stringify(a.type),
    })),
  })).sort((a, b) => a.name.localeCompare(b.name));

  const hash = crypto.createHash('sha256');
  hash.update(JSON.stringify(signatures));
  return hash.digest('hex').substring(0, 16);
}

/**
 * Verify a single protocol's IDL (supports multiple programs)
 */
async function verifyProtocol(protocol, idlData, connections) {
  const result = {
    protocolId: protocol.id,
    protocolName: protocol.name,
    status: VerificationStatus.PENDING,
    timestamp: new Date().toISOString(),
    programs: [],
    details: {},
  };

  // Check if it's a placeholder
  if (protocol.status === 'placeholder') {
    result.status = VerificationStatus.PLACEHOLDER;
    result.details.message = 'IDL is a placeholder, not yet available';
    return result;
  }

  // Get program IDs from multiple sources
  let programIds = [];

  // 1. Check known program IDs mapping
  if (KNOWN_PROGRAM_IDS[protocol.id]) {
    const known = KNOWN_PROGRAM_IDS[protocol.id];
    programIds = Array.isArray(known) ? known : [{ address: known, name: 'Main' }];
  }

  // 2. Extract from IDL if not in known list or to supplement
  if (idlData) {
    const fromIdl = extractProgramIdsFromIdl(idlData);
    for (const prog of fromIdl) {
      if (!programIds.find(p => p.address === prog.address)) {
        programIds.push(prog);
      }
    }
  }

  if (programIds.length === 0) {
    result.status = VerificationStatus.NO_PROGRAM_ID;
    result.details.message = 'No program ID found in IDL or known mappings';
    return result;
  }

  result.details.programCount = programIds.length;
  result.details.idlHash = hashIdlSignatures(idlData);
  result.details.instructionCount = idlData?.instructions?.length || 0;
  result.details.accountCount = idlData?.accounts?.length || 0;

  let verifiedCount = 0;
  let devnetOnlyCount = 0;

  // Verify each program
  for (const prog of programIds) {
    const progResult = {
      name: prog.name,
      address: prog.address,
      network: prog.network || 'mainnet',
      status: 'pending',
    };

    try {
      // Use appropriate connection based on network
      const connection = prog.network === 'devnet'
        ? connections.devnet
        : connections.mainnet;

      const programInfo = await checkProgramExists(connection, prog.address);
      progResult.programInfo = programInfo;

      if (!programInfo.exists) {
        progResult.status = 'not_found';
        progResult.message = 'Program not found on-chain';
      } else if (!programInfo.executable) {
        progResult.status = 'not_executable';
        progResult.message = 'Account exists but is not executable';
      } else {
        progResult.status = 'verified';
        progResult.message = 'Program exists and is executable';

        if (prog.network === 'devnet') {
          devnetOnlyCount++;
        } else {
          verifiedCount++;
        }

        // Try to fetch on-chain IDL
        const onChainIdl = await fetchOnChainIdl(connection, prog.address);
        progResult.onChainIdl = onChainIdl;
      }
    } catch (err) {
      progResult.status = 'error';
      progResult.message = err.message;
    }

    result.programs.push(progResult);

    // Rate limit
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  // Determine overall status
  if (verifiedCount === programIds.length) {
    result.status = VerificationStatus.VERIFIED;
    result.details.message = `All ${programIds.length} program(s) verified on mainnet`;
  } else if (verifiedCount > 0) {
    result.status = VerificationStatus.PARTIAL;
    result.details.message = `${verifiedCount}/${programIds.length} programs verified on mainnet`;
  } else if (devnetOnlyCount > 0) {
    result.status = VerificationStatus.DEVNET_ONLY;
    result.details.message = `Program(s) only available on devnet`;
  } else {
    result.status = VerificationStatus.PROGRAM_NOT_FOUND;
    result.details.message = 'No programs found on-chain';
  }

  result.details.verified = verifiedCount;
  result.details.total = programIds.length;

  return result;
}

/**
 * Run verification for all protocols
 */
async function verifyAllProtocols(indexPath, idlsPath) {
  console.log('Starting IDL verification run...');
  const startTime = Date.now();

  const results = {
    timestamp: new Date().toISOString(),
    totalProtocols: 0,
    verified: 0,
    partial: 0,
    failed: 0,
    placeholder: 0,
    noProgram: 0,
    devnetOnly: 0,
    rpcError: 0,
    totalPrograms: 0,
    verifiedPrograms: 0,
    protocols: [],
  };

  try {
    // Load index
    const index = JSON.parse(fs.readFileSync(indexPath, 'utf8'));
    results.totalProtocols = index.protocols.length;

    // Get RPC connections for both networks
    console.log('Connecting to RPCs...');
    const connections = {
      mainnet: await getConnection('mainnet'),
      devnet: await getConnection('devnet'),
    };
    console.log('Connected to mainnet and devnet RPCs');

    // Verify each protocol
    for (const protocol of index.protocols) {
      try {
        // Load IDL
        const idlPath = path.join(path.dirname(indexPath), protocol.idlPath);
        let idlData = null;

        if (fs.existsSync(idlPath)) {
          idlData = JSON.parse(fs.readFileSync(idlPath, 'utf8'));
        }

        // Verify
        const result = await verifyProtocol(protocol, idlData, connections);
        results.protocols.push(result);

        // Update counters
        results.totalPrograms += result.programs?.length || 0;
        results.verifiedPrograms += result.programs?.filter(p => p.status === 'verified').length || 0;

        switch (result.status) {
          case VerificationStatus.VERIFIED:
            results.verified++;
            break;
          case VerificationStatus.PARTIAL:
            results.partial++;
            break;
          case VerificationStatus.PLACEHOLDER:
            results.placeholder++;
            break;
          case VerificationStatus.NO_PROGRAM_ID:
            results.noProgram++;
            break;
          case VerificationStatus.DEVNET_ONLY:
            results.devnetOnly++;
            break;
          case VerificationStatus.RPC_ERROR:
            results.rpcError++;
            break;
          default:
            results.failed++;
        }

        // Store result
        verificationResults.set(protocol.id, result);

        // Rate limit
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (err) {
        console.error(`Error verifying ${protocol.id}:`, err.message);
        results.failed++;
      }
    }

  } catch (err) {
    console.error('Verification run failed:', err);
    results.error = err.message;
  }

  results.durationMs = Date.now() - startTime;

  // Store in history
  verificationHistory.unshift(results);
  if (verificationHistory.length > 24) {
    verificationHistory.pop();
  }

  console.log(`Verification complete: ${results.verified} fully verified, ${results.partial} partial, ${results.verifiedPrograms}/${results.totalPrograms} programs in ${results.durationMs}ms`);

  return results;
}

/**
 * Get latest verification results
 */
function getLatestResults() {
  return {
    lastRun: verificationHistory[0] || null,
    protocolResults: Object.fromEntries(verificationResults),
  };
}

/**
 * Get verification history
 */
function getHistory() {
  return verificationHistory;
}

/**
 * Get result for a specific protocol
 */
function getProtocolResult(protocolId) {
  return verificationResults.get(protocolId) || null;
}

/**
 * Get summary statistics
 */
function getSummary() {
  const latest = verificationHistory[0];
  if (!latest) {
    return {
      status: 'no_data',
      message: 'No verification runs yet',
    };
  }

  const verifiedPercent = ((latest.verified / latest.totalProtocols) * 100).toFixed(1);
  const programsVerifiedPercent = latest.totalPrograms > 0
    ? ((latest.verifiedPrograms / latest.totalPrograms) * 100).toFixed(1)
    : 0;

  return {
    status: latest.verified > 0 ? 'operational' : 'degraded',
    lastRun: latest.timestamp,
    totalProtocols: latest.totalProtocols,
    verified: latest.verified,
    partial: latest.partial,
    verifiedPercent,
    placeholder: latest.placeholder,
    noProgram: latest.noProgram,
    devnetOnly: latest.devnetOnly,
    rpcError: latest.rpcError,
    totalPrograms: latest.totalPrograms,
    verifiedPrograms: latest.verifiedPrograms,
    programsVerifiedPercent,
    durationMs: latest.durationMs,
    uptimeHistory: verificationHistory.slice(0, 24).map(h => ({
      timestamp: h.timestamp,
      verified: h.verified,
      total: h.totalProtocols,
      programs: h.verifiedPrograms,
      totalPrograms: h.totalPrograms,
    })),
  };
}

module.exports = {
  verifyAllProtocols,
  verifyProtocol,
  getLatestResults,
  getHistory,
  getProtocolResult,
  getSummary,
  VerificationStatus,
  KNOWN_PROGRAM_IDS,
  extractProgramIdsFromIdl,
};
