# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

IDLHub is a **decentralized prediction market for Solana DeFi metrics** built on a comprehensive IDL registry. The protocol enables betting on verifiable on-chain metrics (TVL, volume, user counts) using pure Solana RPC data without third-party APIs.

### Two Core Components

1. **IDL Registry (IDLHub)** - Free, open registry of 100+ Solana protocol IDLs
   - Web UI at https://idlhub.com (React SPA)
   - REST API for programmatic access
   - MCP server for AI agent integration
   - Arweave permanent storage backend

2. **IDL Protocol** - On-chain prediction markets with DeFi tokenomics
   - veIDL staking (vote-escrowed tokens) with time-weighted voting power
   - Commit-reveal betting to prevent front-running
   - Parimutuel pool structure with fair payouts
   - Social trading: 1v1 battles, guilds, leaderboards, referrals
   - Dual-token model: PUMP-IDL (1B supply) + BAGS-IDL (1B legacy)
   - Deflationary mechanics: 10% of fees burned
   - Fee distribution: 50% stakers, 25% creators, 15% treasury, 10% burn

**Program IDs:**
- `idl-protocol`: BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt
- `idl-stableswap`: EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte (Curve-style AMM for BAGS⟷PUMP)

**Core Principles:**
- Free access to IDL registry (no token gating)
- Real yield from protocol revenue (not inflationary emissions)
- Fair launch: 95% public distribution, 2.5% team
- Community governance via veIDL
- On-chain oracle using only pure Solana RPC (no third-party APIs)

## Common Commands

### Development

```bash
# Install dependencies
npm install

# Start React dev server (port 5174)
npm run dev

# Build React app for production
npm run build

# Preview production build
npm run preview
```

### Testing

```bash
# Run all tests (MCP + API + Anchor + E2E)
npm run test:all

# Individual test suites
npm test                    # MCP server tests
npm run test:api           # API server integration tests
npm run test:api:unit      # API server unit tests
npm run test:anchor        # Anchor Solana program tests

# E2E tests (Playwright)
npm run test:e2e           # Run all E2E tests (all browsers)
npm run test:e2e:ui        # Interactive UI mode
npm run test:e2e:chromium  # Chromium only (fast)
npm run test:e2e:debug     # Debug mode (step through)
npm run test:e2e:report    # View HTML report
```

### Solana Programs

```bash
# Build Anchor programs
anchor build

# Test programs (spawns localnet)
anchor test

# Deploy to devnet
anchor deploy --provider.cluster devnet

# Deploy to mainnet (requires mainnet wallet)
anchor deploy --provider.cluster mainnet
```

### Servers

```bash
# REST API (Arweave backend)
npm run api:start          # Production (port 3000)
npm run api:dev            # Development mode
npm run api:start:legacy   # Legacy OpenSVM backend (deprecated)

# MCP Server (Model Context Protocol)
npm run mcp:stdio          # stdio transport (default)
npm run mcp:websocket      # WebSocket (port 8080)
npm run mcp:api            # SSE (port 3001)
npm run mcp:jsonrpc        # JSON-RPC transport
```

### Arweave IDL Storage

```bash
# Preview upload (dry run)
npm run arweave:upload:dry

# Upload IDLs to Arweave (requires IRYS_WALLET env var)
IRYS_WALLET=~/.config/solana/id.json npm run arweave:upload

# Query Arweave
npm run arweave:list       # List uploaded IDLs
npm run arweave:search     # Search IDLs
```

### Protocol Scripts

```bash
# Initialize protocol on devnet
npm run protocol:init

# Test protocol instructions
npm run protocol:test
npm run protocol:test:advanced
npm run protocol:test:lifecycle
npm run protocol:test:sdk

# Deploy with configuration
npm run protocol:deploy

# Track volume and issue badges
npm run protocol:track-volume
npm run protocol:issue-badges
```

### Simulations & Bots

```bash
# Multi-agent AI simulation (5 LLMs compete via OpenRouter)
# Tests protocol by simulating realistic user behavior
OPENROUTER_API_KEY=key npm run sim:run
npm run sim:quick          # 5 rounds, 1s delay (fast test)
npm run sim:long           # 30 rounds, 2s delay (thorough)
npm run sim:debug          # With debug logging

# Attack framework (security testing)
# Automated vulnerability scanning and exploit testing
npm run attack:scan        # Scan for vulnerabilities
npm run attack:quick       # 5 rounds, mock mode (safe)
npm run attack:full        # 20 rounds, parallel (comprehensive)
npm run attack:mev         # MEV-specific attacks (sandwich, JIT, oracle)
npm run attack:flash       # Flash loan attacks (stake, vote, drain)

# Bots (production automation)
npm run bot:telegram       # Telegram notifications bot
npm run bot:twitter        # Twitter engagement bot
npm run bot:market-maker   # AI-powered market maker bot
npm run bot:all            # Run all bots in parallel
```

## Architecture

### Directory Structure

- **src/** - React application (TypeScript)
  - `pages/` - Route components (HomePage, RegistryPage, ProtocolPage, BattlesPage, etc.)
  - `components/` - Reusable UI components (Layout, etc.)
  - `hooks/` - Custom React hooks (useProtocol, useWallet, etc.)
  - `context/` - React context providers
  - `theme.css` - Global theme variables
  - `main.tsx` - React entry point
  - `App.tsx` - Root component with routing

- **programs/** - Solana programs (Rust/Anchor)
  - `idl-protocol/` - veIDL staking, prediction markets, volume badges, fee distribution
  - `idl-stableswap/` - Curve-style AMM for BAGS⟷PUMP swaps

- **api/** - Express REST API
  - `server-arweave.js` - Production server (Arweave backend)
  - `server.js` - Legacy server (OpenSVM backend)
  - `test/` - API tests

- **mcp-server/** - Model Context Protocol server
  - `src/index.js` - stdio transport
  - `src/websocket-server.js` - WebSocket transport
  - `src/api-server.js` - SSE transport
  - `test/` - MCP server tests

- **sdk/** - TypeScript SDK (`@idlhub/protocol-sdk`)
  - Client library for interacting with IDL Protocol programs

- **simulation/** - Multi-agent AI simulation
  - 5 LLM agents compete via OpenRouter API

- **attack-framework/** - Security testing framework
  - Automated vulnerability scanning
  - MEV attack simulations
  - Flash loan exploit tests

- **bots/** - Automated bots
  - Telegram, Twitter, market maker

- **arweave/** - Arweave/Irys integration
  - Upload scripts, manifest, cache

- **IDLs/** - IDL JSON files (100+ Solana protocols)

- **scripts/** - Protocol initialization and testing

- **e2e/** - Playwright E2E tests (785 tests, 100% passing)
  - Tests for all pages and features
  - Accessibility, performance, visual regression

- **public/** - Static assets served by Vite
  - `index.json` - Registry metadata (loaded by RegistryPage)

- **dist/** - Production build output (generated by `npm run build`)

### Build System

**React App (Vite):**
- Entry point: `index.html` → `src/main.tsx` → `src/App.tsx`
- Dev server: port 5174 (with API proxy to :3000)
- Production build: `npm run build` → `dist/`
- E2E tests serve built app on port 5173
- **Important**: `public/index.json` must exist for RegistryPage to load data

**Solana Programs (Anchor):**
- Build: `anchor build`
- Test: `anchor test` (spawns local validator)
- Deploy: `anchor deploy --provider.cluster <cluster>`

### Critical Architecture Details

#### React App Entry Point
The app is a **React SPA** (not static HTML). The build process:
1. `index.html` (root) contains `<div id="root"></div>` and loads `src/main.tsx`
2. Vite bundles React app into `dist/assets/index-*.js` and `dist/assets/index-*.css`
3. **DO NOT** replace `index.html` with static HTML - this breaks the React app

#### Registry Data Loading
- `src/pages/RegistryPage.tsx` fetches `/index.json` (from `public/`)
- Vite copies `public/` contents to `dist/` during build
- **Critical**: `public/index.json` must be present for registry to work

#### On-Chain Metrics Oracle

The protocol's key innovation is a **pure RPC oracle** that calculates DeFi metrics without external APIs:

- **TVL Calculation**: Queries vault token accounts via `getMultipleAccounts()`, aggregates balances, computes USD value from on-chain liquidity pools
- **Volume Calculation**: Uses **stratified sampling** for high-volume protocols (>1M daily txs) to overcome 1000-signature pagination limit. Provides unbiased estimates with ~2-5% error.
- **User Count**: Implements **HyperLogLog** probabilistic counting (16KB memory, 0.81% error) for unique user estimation across millions of transactions
- **Price Discovery**: TWAP from multiple liquidity pools, weighted by depth, with flash-loan protection (rejects if |spot - TWAP| > 20%)
- **Confidence Scoring**: Each resolution gets confidence score (0-1); markets with score <0.60 are cancelled

See whitepaper `latex/idl-protocol.pdf` Section 11 for mathematical formulations and algorithms.

### Security Features (programs/idl-protocol/src/lib.rs)

- **Commit-Reveal**: 5min commit window, 1hr reveal window prevents front-running
- **Oracle Bonding**: 10 IDL bond required, 50% slashed if disputed
- **Timelock**: 48hr delay on authority actions
- **Anti-Flash-Loan**: MIN_STAKE_DURATION = 24h, prevents flash-stake attacks
- **Bet Limits**: MIN_BET = 0.001 IDL, MAX_BET = 1M IDL
- **TVL Caps**: Gradual rollout from 100 IDL → 10M IDL max
- **VIP Tiers**: Stake-based fee discounts (Bronze 100 IDL → Platinum 100k IDL)

## Environment Variables

**Required (for specific tasks):**
- `IRYS_WALLET` - Path to Solana wallet (required for Arweave uploads only)
- `OPENROUTER_API_KEY` - OpenRouter API key (required for simulations only)

**Optional:**
- `IRYS_NODE` - Irys node URL (default: https://node1.irys.xyz, use devnet.irys.xyz for testing)
- `API_PORT` - REST API port (default: 3000)
- `MCP_PORT` - MCP server port (default: 8080)
- `QDRANT_URL`, `QDRANT_API_KEY` - Qdrant vector database (for semantic search)
- `BASE_URL` - E2E test target URL (default: http://localhost:5173)

**Note**: Basic development (`npm run dev`, `npm run build`, `npm run test`) requires no environment variables.

## Common Workflows

### Add New IDL to Registry
1. Add JSON to `IDLs/` directory (e.g., `protocolIDL.json`)
2. Update `index.json` metadata (id, name, description, category)
3. Preview: `npm run arweave:upload:dry`
4. Upload: `IRYS_WALLET=~/.config/solana/id.json npm run arweave:upload`
5. Auto-updates `arweave/manifest.json`

### Test Protocol Changes
1. `anchor build` - Build programs
2. `anchor test` - Run Anchor tests (spawns localnet)
3. `anchor deploy --provider.cluster devnet` - Deploy to devnet
4. `npm run protocol:test` - Integration tests
5. `npm run sim:quick` - Multi-agent simulation (5 rounds)

### Add New React Page
1. Create component in `src/pages/` (e.g., `NewPage.tsx`)
2. Add CSS file `src/pages/NewPage.css`
3. Add route in `src/App.tsx`:
   ```tsx
   <Route path="/new-page" element={<NewPage />} />
   ```
4. Add navigation link in `src/components/Layout.tsx`
5. Add E2E tests in `e2e/new-page.spec.ts`

### Run E2E Tests
1. Build app: `npm run build`
2. Start server: `npx serve -s dist -l 5173 &`
3. Run tests: `npm run test:e2e`
4. View report: `npm run test:e2e:report`

**Note**: E2E tests run automatically in CI on every push/PR. 785 tests, 100% passing.

## Technical Details from Whitepaper

**Prediction Market Mechanics:**
- **Parimutuel Payouts**: Winners split losers' pool proportionally. For YES pool PY and NO pool PN, winning bettor with stake s receives: `Payout = s + (s/PY) × PN × (1 - 0.03)`
- **Dynamic Odds**: Update with each bet, max 5% shift per bet
- **Market Lifecycle**: Creation → Betting → Resolution → Settlement
- **VIP Stake Bonuses**: Up to 50% effective bet size increase for Platinum stakers

**Token Economics:**
- Total Supply: 2B IDL (1B PUMP + 1B BAGS)
- Circulating: ~1.95B (97.5%)
- Team: ~50M (2.5%, fair launch)
- Staking APY: `(DailyVolume × 365 × 0.03 × 0.50) / TotalStaked × 100%`
- veIDL Formula: `veIDL = staked_amount × (lock_duration / 4_years)`

**Social Trading:**
- Battles: 1v1 with 2.5% fee, winner takes 2x stake minus fees
- Guilds: Pooled betting, leader gets 10%, members split 90% proportionally
- Referrals: Perpetual 5% of staker fees from referred users
- Seasons: 30-day competitions with prize pools

**StableSwap AMM:**
- Curve invariant with A=1000 amplification
- 0.004% slippage for balanced pools (vs 0.99% constant product)
- 13.37 bps swap fee (50% to LPs)

**Documentation:**
- Whitepaper: `latex/idl-protocol.pdf` (v3.2, 20 pages)
- Mathematical proofs for parimutuel zero-sum property, unbiased volume estimation, HyperLogLog error bounds
- E2E test documentation: `e2e/README.md`, `e2e/QUICKSTART.md`
- E2E test status: `E2E_FINAL_STATUS.md` (100% passing, 785 tests)

## CI/CD

**GitHub Actions:**
- E2E tests run on every push/PR
- Workflow: `.github/workflows/e2e-tests.yml`
- 4 parallel shards (Chromium only in CI)
- Visual tests skipped in CI (run locally with `--update-snapshots`)
- Artifacts uploaded on failure (screenshots, videos, traces)

**Deployment:**
- Frontend: Auto-deploys to Netlify from main branch
- Solana Programs: Manual deploy via `anchor deploy`
- MCP Server: npm package published as `idlhub-mcp`
