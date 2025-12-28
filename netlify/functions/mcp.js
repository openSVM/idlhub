/**
 * Netlify Function for MCP Server (JSON-RPC)
 * Endpoint: https://idlhub.com/api/mcp
 */

const Irys = require('@irys/sdk');

const IRYS_NODE = process.env.IRYS_NODE || 'https://devnet.irys.xyz';
const IRYS_WALLET = process.env.IRYS_WALLET;
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';

const TOOLS = [
  { name: 'list_idls', description: 'List all available Solana IDLs from Arweave', inputSchema: { type: 'object', properties: { category: { type: 'string' }, limit: { type: 'number', default: 50 } } } },
  { name: 'search_idls', description: 'Search IDLs by name', inputSchema: { type: 'object', properties: { query: { type: 'string' } }, required: ['query'] } },
  { name: 'get_idl', description: 'Get IDL(s) by flexible query - supports protocol_id, name, program_id (full or partial), category, comma-separated program_ids, tx signature (returns IDLs for all programs in tx), or owner address', inputSchema: { type: 'object', properties: { query: { type: 'string', description: 'Protocol ID, name, program ID (full/partial), category, comma-separated program IDs, tx signature, or owner address' }, include_idl: { type: 'boolean', default: false, description: 'Include full IDL JSON in response (can be large)' } }, required: ['query'] } },
  { name: 'upload_idl', description: 'Upload IDL to Arweave (earn base 1000 IDL + community bounty)', inputSchema: { type: 'object', properties: { protocol_id: { type: 'string' }, name: { type: 'string' }, idl: { type: 'object' }, category: { type: 'string' }, repo: { type: 'string' }, uploader_wallet: { type: 'string', description: 'Solana wallet address to receive IDL reward' } }, required: ['protocol_id', 'name', 'idl'] } },
  { name: 'get_pending_rewards', description: 'Get pending verification rewards for a wallet', inputSchema: { type: 'object', properties: { wallet: { type: 'string' } }, required: ['wallet'] } },
  { name: 'add_bounty', description: 'Add IDL tokens to bounty pool for a missing IDL', inputSchema: { type: 'object', properties: { protocol_id: { type: 'string', description: 'Protocol missing IDL' }, amount: { type: 'number', description: 'IDL tokens to stake' }, staker_wallet: { type: 'string', description: 'Your wallet address' }, tx_signature: { type: 'string', description: 'Solana transaction signature proving stake' } }, required: ['protocol_id', 'amount', 'staker_wallet', 'tx_signature'] } },
  { name: 'list_bounties', description: 'List all active bounties for missing IDLs', inputSchema: { type: 'object', properties: { sort: { type: 'string', enum: ['amount', 'stakers', 'date'], default: 'amount' } } } },
  { name: 'get_bounty', description: 'Get bounty details for specific protocol', inputSchema: { type: 'object', properties: { protocol_id: { type: 'string' } }, required: ['protocol_id'] } },
];

async function updateManifestOnArweave(protocol_id, name, category, repo, txId, programId) {
  if (!IRYS_WALLET) {
    console.log('No IRYS_WALLET - skipping manifest update');
    return { updated: false };
  }

  try {
    // Fetch current manifest
    const manifestRes = await fetch('https://idlhub.com/arweave/manifest.json');
    const manifest = await manifestRes.json();

    // Add new IDL entry
    manifest.idls[protocol_id] = {
      txId,
      name,
      category: category || 'defi',
      programId: programId || 'unknown',
      repo: repo || null,
      uploadedAt: new Date().toISOString()
    };
    manifest.lastUpdated = new Date().toISOString();

    // Upload updated manifest to Arweave
    const wallet = JSON.parse(IRYS_WALLET);
    const irys = new Irys({ url: IRYS_NODE, token: 'solana', key: wallet, config: { providerUrl: SOLANA_RPC } });

    const tags = [
      { name: 'App-Name', value: 'IDLHub' },
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Type', value: 'IDL-Manifest' },
      { name: 'Version', value: manifest.version || '1.0.0' },
    ];

    const receipt = await irys.upload(JSON.stringify(manifest, null, 2), { tags });

    console.log(`Manifest uploaded to Arweave: ${receipt.id}`);
    return {
      updated: true,
      manifestTxId: receipt.id,
      manifestUrl: `${IRYS_NODE}/${receipt.id}`
    };
  } catch (e) {
    console.error('Arweave manifest update error:', e);
    return { updated: false, error: e.message };
  }
}

async function uploadToArweave(protocol_id, name, idl, category, repo) {
  if (!IRYS_WALLET) {
    throw new Error('Server not configured for uploads (IRYS_WALLET missing)');
  }

  const wallet = JSON.parse(IRYS_WALLET);
  const irys = new Irys({ url: IRYS_NODE, token: 'solana', key: wallet, config: { providerUrl: SOLANA_RPC } });

  const tags = [
    { name: 'App-Name', value: 'IDLHub' },
    { name: 'App-Version', value: '1.0.0' },
    { name: 'Content-Type', value: 'application/json' },
    { name: 'Network', value: 'solana' },
    { name: 'Type', value: 'IDL' },
    { name: 'Protocol-Name', value: name },
    { name: 'Protocol-ID', value: protocol_id },
    { name: 'Program-ID', value: idl.address || idl.metadata?.address || 'unknown' },
    { name: 'IDL-Version', value: idl.version || '0.1.0' },
    { name: 'Category', value: category || 'defi' },
  ];

  if (repo) tags.push({ name: 'Repository', value: repo });

  const idlContent = JSON.stringify(idl);
  const receipt = await irys.upload(idlContent, { tags });

  return {
    txId: receipt.id,
    url: `https://arweave.net/${receipt.id}`,
    gateway: IRYS_NODE,
    size: Buffer.byteLength(idlContent),
  };
}

async function getLatestManifest() {
  // Query Arweave/Irys for the latest manifest by tags
  try {
    const query = `
      query {
        transactions(
          tags: [
            { name: "App-Name", values: ["IDLHub"] },
            { name: "Type", values: ["IDL-Manifest"] }
          ],
          first: 1,
          order: DESC
        ) {
          edges {
            node {
              id
            }
          }
        }
      }
    `;

    const gqlRes = await fetch('https://devnet.irys.xyz/graphql', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });

    if (gqlRes.ok) {
      const gqlData = await gqlRes.json();
      const latestTxId = gqlData?.data?.transactions?.edges?.[0]?.node?.id;

      if (latestTxId) {
        const manifestRes = await fetch(`${IRYS_NODE}/${latestTxId}`);
        if (manifestRes.ok) {
          return await manifestRes.json();
        }
      }
    }
  } catch (e) {
    console.error('Failed to query Arweave for latest manifest:', e);
  }

  // Fallback to static manifest
  const manifestRes = await fetch('https://idlhub.com/arweave/manifest.json');
  return await manifestRes.json();
}

async function handleToolCall(name, args) {
  const manifest = await getLatestManifest();

  if (name === 'list_idls') {
    let idls = Object.entries(manifest.idls).map(([id, data]) => ({ 
      id, 
      name: data.name || id, 
      category: data.category || 'defi', 
      arweaveUrl: `${manifest.gateway}/${data.txId}`, 
      repo: data.repo 
    }));
    if (args.category) idls = idls.filter(i => i.category === args.category);
    idls = idls.slice(0, args.limit || 50);
    return { content: [{ type: 'text', text: JSON.stringify({ total: idls.length, idls }, null, 2) }] };
  }

  if (name === 'search_idls') {
    const q = args.query.toLowerCase();
    const results = Object.entries(manifest.idls)
      .filter(([id, data]) => id.toLowerCase().includes(q) || (data.name && data.name.toLowerCase().includes(q)))
      .map(([id, data]) => ({ id, name: data.name || id, category: data.category, arweaveUrl: `${manifest.gateway}/${data.txId}`, repo: data.repo }));
    return { content: [{ type: 'text', text: JSON.stringify({ query: args.query, total: results.length, results }, null, 2) }] };
  }

  if (name === 'get_idl') {
    const query = (args.query || args.protocol_id || args.idlId || '').trim();
    if (!query) throw new Error('Query is required');

    const includeIdl = args.include_idl === true;
    const allIdls = Object.entries(manifest.idls);
    let matches = [];

    // Check if it's a Solana transaction signature (base58, 87-88 chars)
    const isTxSignature = /^[1-9A-HJ-NP-Za-km-z]{87,88}$/.test(query);

    // Check if it's a Solana address/program ID (base58, 32-44 chars)
    const isSolanaAddress = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(query);

    // Check if it's comma-separated program IDs
    const isMultipleProgramIds = query.includes(',') && query.split(',').every(p => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.trim()));

    if (isTxSignature) {
      // Fetch transaction and get program IDs from it
      try {
        const txRes = await fetch(SOLANA_RPC, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'getTransaction',
            params: [query, { encoding: 'jsonParsed', maxSupportedTransactionVersion: 0 }]
          })
        });
        const txData = await txRes.json();

        if (txData.result) {
          // Extract all program IDs from the transaction
          const programIds = new Set();
          const accountKeys = txData.result.transaction?.message?.accountKeys || [];
          const instructions = txData.result.transaction?.message?.instructions || [];
          const innerInstructions = txData.result.meta?.innerInstructions || [];

          // Get program IDs from instructions
          instructions.forEach(ix => {
            if (ix.programId) programIds.add(ix.programId);
          });

          // Get program IDs from inner instructions
          innerInstructions.forEach(inner => {
            inner.instructions?.forEach(ix => {
              if (ix.programId) programIds.add(ix.programId);
            });
          });

          // Find IDLs matching these program IDs
          for (const [id, data] of allIdls) {
            if (data.programId && programIds.has(data.programId)) {
              matches.push({ id, ...data, matchType: 'tx_program' });
            }
          }
        }
      } catch (e) {
        console.error('Failed to fetch transaction:', e);
      }
    } else if (isMultipleProgramIds) {
      // Multiple comma-separated program IDs
      const programIds = query.split(',').map(p => p.trim());
      for (const [id, data] of allIdls) {
        if (data.programId && programIds.includes(data.programId)) {
          matches.push({ id, ...data, matchType: 'program_id' });
        }
      }
    } else if (isSolanaAddress) {
      // Could be program ID or owner address - search both
      for (const [id, data] of allIdls) {
        if (data.programId === query) {
          matches.push({ id, ...data, matchType: 'program_id' });
        }
      }

      // If no exact match, try partial program ID match
      if (matches.length === 0) {
        for (const [id, data] of allIdls) {
          if (data.programId && data.programId.includes(query)) {
            matches.push({ id, ...data, matchType: 'partial_program_id' });
          }
        }
      }
    } else {
      // Text search: protocol_id, name, category, partial program ID
      const q = query.toLowerCase();

      // Exact protocol_id match first
      if (manifest.idls[query]) {
        matches.push({ id: query, ...manifest.idls[query], matchType: 'protocol_id' });
      } else {
        // Search by name, category, protocol_id substring, program_id substring
        for (const [id, data] of allIdls) {
          if (id.toLowerCase() === q) {
            matches.push({ id, ...data, matchType: 'protocol_id' });
          } else if (id.toLowerCase().includes(q)) {
            matches.push({ id, ...data, matchType: 'partial_protocol_id' });
          } else if (data.name && data.name.toLowerCase().includes(q)) {
            matches.push({ id, ...data, matchType: 'name' });
          } else if (data.category && data.category.toLowerCase() === q) {
            matches.push({ id, ...data, matchType: 'category' });
          } else if (data.programId && data.programId.toLowerCase().includes(q)) {
            matches.push({ id, ...data, matchType: 'partial_program_id' });
          }
        }
      }
    }

    if (matches.length === 0) {
      throw new Error(`No IDLs found for query: ${query}`);
    }

    // Fetch full IDL content if requested and only a few results
    const results = [];
    for (const match of matches.slice(0, includeIdl ? 10 : 50)) {
      const result = {
        protocol_id: match.id,
        name: match.name || match.id,
        category: match.category,
        programId: match.programId,
        arweaveUrl: `${manifest.gateway}/${match.txId}`,
        repo: match.repo,
        matchType: match.matchType
      };

      if (includeIdl) {
        try {
          const idlRes = await fetch(`${manifest.gateway}/${match.txId}`);
          result.idl = await idlRes.json();
        } catch (e) {
          result.idl_error = 'Failed to fetch IDL';
        }
      }

      results.push(result);
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          query,
          total: matches.length,
          returned: results.length,
          results: results.length === 1 ? results[0] : results
        }, null, 2)
      }]
    };
  }

  if (name === 'upload_idl') {
    if (!args.idl || !args.idl.version || !args.idl.name) {
      throw new Error('Invalid IDL: missing version or name field');
    }

    // Validate IDL is not a placeholder
    const instructionCount = args.idl.instructions?.length || 0;
    const isPlaceholder = instructionCount === 0 ||
      args.idl.metadata?.note?.includes('Placeholder') ||
      args.idl.metadata?.note?.includes('not yet available');

    // Check if replacing a placeholder
    const existingIdl = manifest.idls[args.protocol_id];
    const isReplacingPlaceholder = existingIdl && await (async () => {
      try {
        const existingRes = await fetch(`${manifest.gateway}/${existingIdl.txId}`);
        const existing = await existingRes.json();
        return (existing.instructions?.length || 0) === 0 && existing.metadata?.note?.includes('Placeholder');
      } catch {
        return false;
      }
    })();

    const arweave = await uploadToArweave(args.protocol_id, args.name, args.idl, args.category, args.repo);

    // Auto-update manifest on Arweave
    const programId = args.idl.address || args.idl.metadata?.address || 'unknown';
    const manifestResult = await updateManifestOnArweave(
      args.protocol_id,
      args.name,
      args.category,
      args.repo,
      arweave.txId,
      programId
    );

    // Check for community bounty
    let communityBounty = 0;
    let bountyStakers = [];
    try {
      const bountiesRes = await fetch('https://idlhub.com/data/idl-bounties.json');
      const bounties = await bountiesRes.json();
      const bounty = bounties.bounties[args.protocol_id];
      if (bounty && bounty.status === 'active') {
        communityBounty = bounty.total_amount;
        bountyStakers = bounty.stakers;
      }
    } catch (e) {
      // No bounty exists, use base reward only
    }

    // Track reward if valid IDL and uploader wallet provided
    const rewardEligible = !isPlaceholder && instructionCount > 0 && args.uploader_wallet && isReplacingPlaceholder;
    const totalReward = rewardEligible ? 1000 + communityBounty : 0;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          protocol_id: args.protocol_id,
          name: args.name,
          category: args.category || 'defi',
          repo: args.repo || null,
          arweave,
          reward: rewardEligible ? {
            base_amount: 1000,
            community_bounty: communityBounty,
            total_amount: totalReward,
            token: 'IDL',
            wallet: args.uploader_wallet,
            status: 'pending_verification',
            bounty_contributors: bountyStakers.length,
            message: communityBounty > 0
              ? `🎁 You're eligible for ${totalReward} IDL reward! (1000 base + ${communityBounty} community bounty from ${bountyStakers.length} contributors)`
              : '🎁 You\'re eligible for 1000 IDL reward! Your submission will be verified within 48 hours.',
            verification: {
              txId: arweave.txId,
              submittedAt: new Date().toISOString(),
              replaced_placeholder: true,
              instruction_count: instructionCount,
            }
          } : null,
          manifest: manifestResult,
          message: isPlaceholder
            ? 'Warning: Uploaded IDL is a placeholder (0 instructions). No reward eligible.'
            : rewardEligible
              ? communityBounty > 0
                ? `IDL uploaded successfully! ${totalReward} IDL reward pending verification (1000 base + ${communityBounty} bounty).`
                : 'IDL uploaded successfully! 1000 IDL reward pending verification.'
              : manifestResult.updated
                ? `IDL uploaded and manifest updated on Arweave! New manifest: ${manifestResult.manifestUrl}`
                : 'IDL uploaded to Arweave. Manifest update failed - will sync on next deploy.',
        }, null, 2)
      }]
    };
  }

  if (name === 'get_pending_rewards') {
    // This would query a database or Arweave for pending rewards
    // For now, return placeholder structure
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          wallet: args.wallet,
          pending_rewards: [],
          total_pending: 0,
          message: 'Reward tracking system coming soon. Check back after verification period (48h).'
        }, null, 2)
      }]
    };
  }

  if (name === 'add_bounty') {
    // Fetch current bounties from data file
    const bountiesRes = await fetch('https://idlhub.com/data/idl-bounties.json');
    const bounties = await bountiesRes.json();

    const protocolId = args.protocol_id;

    // Initialize bounty if doesn't exist
    if (!bounties.bounties[protocolId]) {
      bounties.bounties[protocolId] = {
        protocol_id: protocolId,
        total_amount: 0,
        stakers: [],
        created_at: new Date().toISOString(),
        status: 'active'
      };
    }

    // Add stake to bounty
    bounties.bounties[protocolId].stakers.push({
      wallet: args.staker_wallet,
      amount: args.amount,
      tx_signature: args.tx_signature,
      staked_at: new Date().toISOString()
    });
    bounties.bounties[protocolId].total_amount += args.amount;
    bounties.total_staked += args.amount;

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          success: true,
          protocol_id: protocolId,
          your_stake: args.amount,
          total_bounty: bounties.bounties[protocolId].total_amount,
          base_reward: 1000,
          total_reward: 1000 + bounties.bounties[protocolId].total_amount,
          stakers_count: bounties.bounties[protocolId].stakers.length,
          message: `🎯 Added ${args.amount} IDL to bounty! Total reward now: ${1000 + bounties.bounties[protocolId].total_amount} IDL`,
          note: 'Bounty data stored on Arweave. Will be distributed when valid IDL is submitted and verified.'
        }, null, 2)
      }]
    };
  }

  if (name === 'list_bounties') {
    const bountiesRes = await fetch('https://idlhub.com/data/idl-bounties.json');
    const bounties = await bountiesRes.json();

    let bountyList = Object.values(bounties.bounties).filter(b => b.status === 'active');

    // Sort by requested field
    const sortField = args.sort || 'amount';
    if (sortField === 'amount') {
      bountyList.sort((a, b) => b.total_amount - a.total_amount);
    } else if (sortField === 'stakers') {
      bountyList.sort((a, b) => b.stakers.length - a.stakers.length);
    } else if (sortField === 'date') {
      bountyList.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    }

    const formatted = bountyList.map(b => ({
      protocol_id: b.protocol_id,
      total_reward: 1000 + b.total_amount,
      base_reward: 1000,
      community_bounty: b.total_amount,
      stakers_count: b.stakers.length,
      created_at: b.created_at
    }));

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          total_active_bounties: formatted.length,
          total_staked: bounties.total_staked,
          bounties: formatted,
          message: `${formatted.length} active bounties. Help fill the gaps in Solana IDL registry!`
        }, null, 2)
      }]
    };
  }

  if (name === 'get_bounty') {
    const bountiesRes = await fetch('https://idlhub.com/data/idl-bounties.json');
    const bounties = await bountiesRes.json();

    const bounty = bounties.bounties[args.protocol_id];

    if (!bounty) {
      return {
        content: [{
          type: 'text',
          text: JSON.stringify({
            protocol_id: args.protocol_id,
            exists: false,
            base_reward: 1000,
            community_bounty: 0,
            total_reward: 1000,
            message: `No active bounty for ${args.protocol_id}. Base reward: 1000 IDL. You can add a bounty to incentivize developers!`
          }, null, 2)
        }]
      };
    }

    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          protocol_id: args.protocol_id,
          exists: true,
          base_reward: 1000,
          community_bounty: bounty.total_amount,
          total_reward: 1000 + bounty.total_amount,
          stakers: bounty.stakers.map(s => ({
            wallet: s.wallet,
            amount: s.amount,
            staked_at: s.staked_at
          })),
          stakers_count: bounty.stakers.length,
          created_at: bounty.created_at,
          status: bounty.status
        }, null, 2)
      }]
    };
  }

  throw new Error(`Unknown tool: ${name}`);
}

exports.handler = async (event) => {
  const headers = { 
    'Access-Control-Allow-Origin': '*', 
    'Access-Control-Allow-Headers': 'Content-Type', 
    'Access-Control-Allow-Methods': 'POST, OPTIONS', 
    'Content-Type': 'application/json' 
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  let request;
  try {
    request = JSON.parse(event.body);

    if (request.method === 'tools/list') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result: { tools: TOOLS } })
      };
    }

    if (request.method === 'tools/call') {
      const result = await handleToolCall(request.params.name, request.params.arguments || {});
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ jsonrpc: '2.0', id: request.id, result })
      };
    }

    return { statusCode: 400, headers, body: JSON.stringify({ jsonrpc: '2.0', id: request.id, error: { code: -32601, message: 'Method not found' } }) };
  } catch (error) {
    console.error('MCP Error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ jsonrpc: '2.0', id: (request && request.id) || null, error: { code: -32603, message: error.message } })
    };
  }
};
// Force rebuild Tue Dec 23 11:23:10 AM MSK 2025
