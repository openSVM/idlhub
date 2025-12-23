# IDLHub Reward Program

## Overview

IDLHub incentivizes community contributions with a **1000 $IDL base reward** for uploading missing protocol IDLs, plus **community bounties** staked by users who want specific IDLs prioritized.

## How It Works

### 1. Base Reward: 1000 $IDL

Every valid IDL submission that replaces a placeholder earns **1000 $IDL** after verification.

**Eligibility:**
- IDL must have > 0 instructions (not a placeholder)
- IDL must replace an existing placeholder entry
- IDL must pass verification (valid JSON, correct structure)
- Must provide your Solana wallet address when uploading

**Verification Period:** 48 hours

### 2. Community Bounties

Anyone can stake $IDL tokens to increase the reward for specific missing protocols.

**Example:**
- Base reward: 1000 $IDL
- Community stakes: 5000 $IDL (from 12 contributors)
- **Total reward: 6000 $IDL**

## MCP API Tools

### upload_idl

Upload an IDL and earn rewards.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "upload_idl",
    "arguments": {
      "protocol_id": "protocol-name",
      "name": "Protocol Name",
      "idl": { /* IDL JSON object */ },
      "category": "defi",
      "repo": "https://github.com/protocol/repo",
      "uploader_wallet": "YourSolanaWalletAddress"
    }
  },
  "id": 1
}
```

**Response (with bounty):**
```json
{
  "success": true,
  "protocol_id": "protocol-name",
  "reward": {
    "base_amount": 1000,
    "community_bounty": 5000,
    "total_amount": 6000,
    "token": "IDL",
    "wallet": "YourSolanaWalletAddress",
    "status": "pending_verification",
    "bounty_contributors": 12,
    "message": "🎁 You're eligible for 6000 IDL reward! (1000 base + 5000 community bounty from 12 contributors)",
    "verification": {
      "txId": "ArweaveTxId",
      "submittedAt": "2025-12-23T12:00:00Z",
      "replaced_placeholder": true,
      "instruction_count": 42
    }
  }
}
```

### add_bounty

Stake $IDL tokens to incentivize a missing IDL.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "add_bounty",
    "arguments": {
      "protocol_id": "missing-protocol",
      "amount": 1000,
      "staker_wallet": "YourSolanaWalletAddress",
      "tx_signature": "SolanaTransactionSignature"
    }
  },
  "id": 1
}
```

**Response:**
```json
{
  "success": true,
  "protocol_id": "missing-protocol",
  "your_stake": 1000,
  "total_bounty": 3000,
  "base_reward": 1000,
  "total_reward": 4000,
  "stakers_count": 3,
  "message": "🎯 Added 1000 IDL to bounty! Total reward now: 4000 IDL"
}
```

### list_bounties

View all active bounties sorted by amount, stakers, or date.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "list_bounties",
    "arguments": {
      "sort": "amount"
    }
  },
  "id": 1
}
```

**Response:**
```json
{
  "total_active_bounties": 15,
  "total_staked": 50000,
  "bounties": [
    {
      "protocol_id": "high-priority-protocol",
      "total_reward": 10000,
      "base_reward": 1000,
      "community_bounty": 9000,
      "stakers_count": 25,
      "created_at": "2025-12-20T10:00:00Z"
    }
  ]
}
```

### get_bounty

Get bounty details for a specific protocol.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_bounty",
    "arguments": {
      "protocol_id": "protocol-name"
    }
  },
  "id": 1
}
```

### get_pending_rewards

Check your pending rewards awaiting verification.

**Request:**
```json
{
  "jsonrpc": "2.0",
  "method": "tools/call",
  "params": {
    "name": "get_pending_rewards",
    "arguments": {
      "wallet": "YourSolanaWalletAddress"
    }
  },
  "id": 1
}
```

## Registry UI

Protocols with active bounties display a **💰 bounty badge** showing total reward amount.

**Hover tooltip** shows number of community contributors.

## Verification Process

1. **Upload**: Submit IDL via MCP API with your wallet address
2. **Auto-Check**: System validates:
   - Valid JSON structure
   - Required fields present (version, name, instructions)
   - Instruction count > 0
   - Replaces existing placeholder
3. **Manual Review**: Team verifies program ID matches and IDL is accurate
4. **Distribution**: If approved, rewards sent to your wallet within 48h

## Reward Distribution

When a bounty is claimed:
- **Uploader**: Receives 1000 $IDL base + full community bounty
- **Bounty Stakers**: No refund (stake is paid to uploader)
- **Failed Verification**: Bounty remains active for next submitter

## Best Practices

### For Uploaders
- Verify program ID matches on-chain data
- Include GitHub repo URL when available
- Test IDL works with Anchor/Solana CLI
- Provide wallet address to receive rewards

### For Bounty Stakers
- Stake on high-priority protocols needed for your project
- Higher bounties attract more developers
- Consider staking 500-2000 $IDL for meaningful impact

## Examples

### High-Impact Bounties
```
Protocol: solend (lending protocol)
Base: 1000 IDL
Community: 15000 IDL (from 45 stakers)
Total: 16000 IDL reward
```

### Quick Wins
```
Protocol: small-dex
Base: 1000 IDL
Community: 0 IDL
Total: 1000 IDL reward (still worth it!)
```

## FAQ

**Q: Can I upload an IDL without a wallet address?**
A: Yes, but you won't be eligible for rewards.

**Q: How do I stake on a bounty?**
A: Send $IDL to the bounty escrow account and call `add_bounty` with tx signature.

**Q: What if my submission is rejected?**
A: You can fix issues and resubmit. Bounty remains active.

**Q: Can I stake on my own upload?**
A: No, to prevent gaming the system.

**Q: How long until I receive rewards?**
A: Up to 48 hours after upload for verification and distribution.

**Q: What happens to my stake if someone else claims the bounty?**
A: Your stake is paid to the successful uploader. This incentivizes them to fill the gap.

## API Endpoint

All MCP tools available at: `https://idlhub.com/api/mcp`

**Transport:** JSON-RPC 2.0
**Method:** POST
**Content-Type:** application/json

## Support

Questions? Issues?
- GitHub: https://github.com/idlhub/issues
- Discord: https://discord.gg/idlhub (coming soon)
- Twitter: [@idlhub](https://twitter.com/idlhub) (coming soon)
