# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IDLHub is a Solana IDL registry with an integrated DeFi protocol. The codebase has two main layers:

1. **IDL Registry** - Web UI, REST API, and MCP server for browsing/serving Solana IDL files from Arweave (permanent storage)
2. **IDL Protocol** - On-chain Solana programs for staking, prediction markets, and token swaps

## Common Commands

```bash
# Install dependencies
npm install

# Run all tests
npm run test:all

# Individual test commands
npm test                    # MCP server tests
npm run test:api           # API server tests (integration)
npm run test:api:unit      # API server unit tests
npm run test:anchor        # Anchor tests (requires Solana)

# Build Solana programs
anchor build

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Start servers
npm run api:start          # REST API on port 3000 (Arweave backend)
npm run api:start:legacy   # REST API with OpenSVM backend (deprecated)
npm run mcp:stdio          # MCP server (stdio transport)
npm run mcp:websocket      # MCP server (WebSocket on port 8080)
npm run mcp:api            # API MCP server (SSE on port 3001)

# Arweave IDL storage
npm run arweave:upload:dry # Preview what will be uploaded
npm run arweave:upload     # Upload all IDLs to Arweave via Irys
npm run arweave:list       # List uploaded IDLs
npm run arweave:search     # Search IDLs on Arweave

# Run multi-agent simulation
OPENROUTER_API_KEY=key npm run sim:run
npm run sim:quick          # 5 rounds, 1s delay
npm run sim:long           # 30 rounds, 2s delay
npm run sim:debug          # With debug logging

# Protocol scripts (require devnet setup)
npm run protocol:init      # Initialize protocol state
npm run protocol:test      # Test protocol instructions
npm run protocol:deploy    # Deploy with configuration
```

## Architecture

### On-Chain Programs (Rust/Anchor)

Two Solana programs in `programs/`:

- **idl-protocol** (`BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt`): Core protocol with:
  - veIDL staking with time-weighted voting power
  - Prediction markets with commit-reveal betting
  - Volume-based badge system (Bronze→Diamond)
  - Fee distribution to stakers/treasury/burn

- **idl-stableswap** (`EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte`): Curve-style AMM for BAGS⟷PUMP token swaps with low slippage

Both use Anchor 0.29.0 with security features: oracle bonding, bet limits, timelock authority transfers, anti-flash-loan protections.

### Off-Chain Components

- **api/** - Express REST API serving IDLs from Arweave permanent storage (with local cache)
- **arweave/** - Irys upload scripts and Arweave manifest for permanent IDL storage
- **mcp-server/** - MCP 2025-06-18 compliant server for LLM integration (schema lookup, code generation, validation)
- **sdk/** - TypeScript SDK (`@idlhub/protocol-sdk`) for protocol interactions
- **simulation/** - Multi-agent AI simulation using OpenRouter models to test protocol dynamics
- **lib/** - Shared utilities and Qdrant integration

### Data Flow

```
Web UI / API Clients
        ↓
    REST API (api/server-arweave.js)
        ↓
   Arweave Gateway ←→ Local Cache (arweave/cache/)
        ↓                    ↓
   Permanent Storage    IDLs/ (fallback)
        ↓
   MCP Server (mcp-server/)
        ↓
   LLM / Editor Integration
```

## Key Files

- `Anchor.toml` - Program IDs and cluster configuration
- `index.json` - Registry index with protocol metadata
- `programs/*/src/lib.rs` - On-chain program logic
- `sdk/src/index.ts` - Full SDK with instruction builders and PDA derivation
- `simulation/engine/simulation.ts` - Simulation engine core
- `api/server-arweave.js` - REST API entry point (Arweave backend)
- `arweave/manifest.json` - Maps protocol IDs to Arweave transaction IDs
- `arweave/upload.js` - Irys upload script for IDLs
- `mcp-server/src/index.js` - MCP server entry point

## Environment Variables

```bash
# Arweave/Irys
IRYS_WALLET=/path/to/solana-wallet.json  # Required for uploads
IRYS_NODE=https://node1.irys.xyz         # Use devnet.irys.xyz for testing

# API
API_PORT=3000

# MCP Server
IDL_REGISTRY_PATH=/path/to/idlhub
MCP_PORT=8080

# Simulation
OPENROUTER_API_KEY=your_key

# Qdrant (optional, for semantic search)
QDRANT_URL=http://localhost:6333
QDRANT_API_KEY=your_key
```

## Arweave Upload Workflow

1. Add new IDL to `IDLs/` directory
2. Update `index.json` with protocol metadata
3. Preview: `npm run arweave:upload:dry`
4. Upload: `IRYS_WALLET=/path/to/wallet.json npm run arweave:upload`
5. Manifest updates automatically in `arweave/manifest.json`

## Testing Protocol Changes

1. Build: `anchor build`
2. Test locally: `anchor test` (uses localnet)
3. Deploy to devnet: `anchor deploy --provider.cluster devnet`
4. Run integration: `npm run protocol:test`
5. Run simulation: `npm run sim:quick`
