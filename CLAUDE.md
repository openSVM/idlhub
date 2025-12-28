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

## CRITICAL: Never Truncate Blockchain Identifiers

**NEVER truncate, shorten, abbreviate, or use ellipsis (...) on ANY of the following identifiers when displaying them:**

- Solana addresses (public keys)
- Transaction signatures/IDs
- Block hashes
- Account addresses
- Program IDs
- Arweave transaction IDs
- Any base58-encoded identifiers
- Any cryptographic hashes (SHA256, etc.)

**Why:** Truncated identifiers are useless for copy-paste, verification, or debugging. Users need the FULL identifier to interact with blockchain explorers, wallets, or programmatic tools.

**Examples:**
```
WRONG: BSn7nei...65Lq7dt
WRONG: 8aR1Auj...MGyv7N
WRONG: So111...1111

CORRECT: BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt
CORRECT: 8aR1AujJy5otN3W9AAvu1Aqo85kHLY2dVoNXh3MGyv7N
CORRECT: So11111111111111111111111111111111111111112
```

**This applies to:**
- Code output and logs
- API responses
- UI displays
- Documentation
- Error messages
- Any context where identifiers are shown

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

### IDL Transaction Verification

Verifies IDLs by attempting to decode real on-chain transactions using Anchor's BorshCoder:

```bash
# Verify sample protocols (drift, orca, marginfi, etc.)
npm run verify:tx

# Verify specific protocols
npm run verify:tx -- protocol1 protocol2

# Verify ALL protocols in manifest
npm run verify:tx -- --all

# Verbose output (shows decoded instructions)
npm run verify:tx -- -v
```

Results saved to `data/tx-verification-results.json` and displayed on Registry page.

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

- **data/** - Verification and runtime data
  - `verification-results.json` - Program existence verification results
  - `verification-history.json` - Historical verification runs
  - `tx-verification-results.json` - Transaction-based IDL verification
  - `idl-bounties.json` - Community bounty data

- **IDLs/** - IDL JSON files (100+ Solana protocols)

- **scripts/** - Protocol initialization and testing

- **e2e/** - Playwright E2E tests (785 tests, 100% passing)
  - Tests for all pages and features
  - Accessibility, performance, visual regression

- **public/** - Static assets served by Vite
  - `arweave/manifest.json` - Arweave transaction IDs for all IDLs

- **dist/** - Production build output (generated by `npm run build`)

### Build System

**React App (Vite):**
- Entry point: `index.html` → `src/main.tsx` → `src/App.tsx`
- Dev server: port 5174 (NO API proxy needed - fully static with Arweave)
- Production build: `npm run build` → `dist/`
- E2E tests serve built app on port 5173
- **Important**: `public/arweave/manifest.json` contains Arweave txIds for registry

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

#### Registry Data Loading (Arweave - CRITICAL!)
- `src/pages/RegistryPage.tsx` fetches `/arweave/manifest.json` (from `public/arweave/`)
- Manifest contains Arweave transaction IDs (txId) for all 166+ IDLs
- IDLs loaded directly from Arweave gateway: `https://devnet.irys.xyz/{txId}`
- **NO localhost API calls** - fully static, works offline with Arweave
- **NO wallet required** - browse and download IDLs without connecting wallet
- **NO local JSON files** - everything fetched from Arweave permanent storage
- Manifest generated by `arweave/upload.js` and cached in `arweave/manifest.json`

#### On-Chain Metrics Oracle

The protocol's key innovation is a **pure RPC oracle** that calculates DeFi metrics without external APIs:

- **TVL Calculation**: Queries vault token accounts via `getMultipleAccounts()`, aggregates balances, computes USD value from on-chain liquidity pools
- **Volume Calculation**: Uses **stratified sampling** for high-volume protocols (>1M daily txs) to overcome 1000-signature pagination limit. Provides unbiased estimates with ~2-5% error.
- **User Count**: Implements **HyperLogLog** probabilistic counting (16KB memory, 0.81% error) for unique user estimation across millions of transactions
- **Price Discovery**: TWAP from multiple liquidity pools, weighted by depth, with flash-loan protection (rejects if |spot - TWAP| > 20%)
- **Confidence Scoring**: Each resolution gets confidence score (0-1); markets with score <0.60 are cancelled

See whitepaper `latex/idl-protocol.pdf` Section 11 for mathematical formulations and algorithms.

### IDL Verification System

Two-tier verification runs hourly via `api/services/verification-scheduler.js`:

**1. Program Verification** (`api/services/idl-verifier.js`):
- Checks if program exists on-chain via RPC
- Validates program is executable
- Uses custom RPC proxy: `solana-rpc-proxy.0xrinegade.workers.dev`

**2. Transaction Verification** (`api/services/idl-tx-verifier.cjs`):
- Fetches real transactions for each program
- Attempts to decode instruction data using Anchor's BorshCoder
- Parses both top-level AND CPI (inner) instructions
- Reports success rate and instruction coverage

**Verification Statuses:**
- `verified` - 90%+ decode success (IDL works)
- `partial` - 50-90% success
- `outdated` - <50% success (IDL may be old version)
- `invalid` - 0% success (wrong IDL)
- `no_program_id` - IDL missing program address
- `no_transactions` - Program has no recent activity
- `no_program_instructions` - Transactions exist but none match
- `coder_error` - IDL has broken type definitions

**API Endpoints:**
- `GET /api/status` - Overall verification summary
- `GET /api/status/tx-verification` - Full TX verification results
- `GET /api/status/tx-verification/:protocolId` - Live verify specific protocol

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

**Via MCP API (recommended):**
```bash
curl -X POST https://idlhub.com/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "upload_idl",
      "arguments": {
        "protocol_id": "my-protocol",
        "name": "My Protocol",
        "idl": { ... },
        "category": "defi"
      }
    },
    "id": 1
  }'
```
- Auto-uploads to Arweave
- Auto-updates manifest on Arweave (queries latest via GraphQL)
- No manual file editing required

**Via Local Upload:**
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

## Critical Architecture Notes

### React App Build & Entry Point

**IMPORTANT**: The app is a **React SPA**, not static HTML.

Build process:
1. `index.html` (root) contains `<div id="root"></div>` and loads `src/main.tsx`
2. Vite bundles React app into `dist/assets/index-*.js` and `dist/assets/index-*.css`
3. **DO NOT** replace `index.html` with static HTML - this breaks the React app

### Buffer Polyfill Requirement

Solana Web3.js requires `Buffer` global in browser:
- `src/main.tsx` imports Buffer and sets `window.Buffer = Buffer`
- `index.html` also has inline script setting up Buffer before main app loads
- `vite.config.js` defines global polyfills
- **CRITICAL**: Without this, Solana libraries will fail with "Buffer is not defined"

### Registry Page Architecture

`src/pages/RegistryPage.tsx` - Full React implementation with table layout:

**Table Columns:**
- Checkbox (bulk selection)
- Protocol name (with bookmark, bounty indicators)
- Category
- IDL Status (available/placeholder)
- TX Verify (verification status badge)
- Rate (decode success %)
- Coverage (instruction coverage %)
- Actions (download, view)

**Data Loading:**
- Fetches `/arweave/manifest.json` for IDL list and Arweave txIds
- Fetches `/api/status/tx-verification` for verification status
- Merges data to display verification badges per protocol
- IDLs loaded from Arweave gateway: `https://devnet.irys.xyz/{txId}`

**Features:**
- Search/filter by name, category
- Bulk select and download as ZIP
- Bookmark protocols (persisted to localStorage)
- Click row to expand IDL details panel
- Code generation for 6 languages (TypeScript, Rust, C, Kotlin, Crystal, Zig)

### Swap Page (AMM)

**Location:** `src/pages/SwapPage-simple.tsx` + `src/pages/SwapPage.css` + `src/hooks/useAMM.ts`

**Current Implementation (Simplified):**
- Token0 ↔ Token1 swaps with StableSwap curve pricing
- Real-time pool stats (balances, fees, LP supply)
- Slippage protection (0.1%, 0.5%, 1.0%)
- Live swap quotes with price impact
- Token switch button (↓↑)
- Wallet connection required for trading

**Pool Initialization:**
- Pool must be initialized before swaps work
- If pool not found, shows helpful error with:
  - Program address and token mint addresses
  - Instructions to initialize: `anchor run init-pool`
  - Technical error details (collapsible)

**Key Details:**
- Uses `useAMM()` and `usePoolState()` hooks from `src/hooks/useAMM.ts`
- StableSwap Program: `EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte`
- Default tokens: SOL (Token0) and USDC (Token1)
- Token decimals: 6 for both tokens
- All CSS scoped with `.swap-page` prefix
- Full ARIA accessibility support

**Advanced Features (in full SwapPage.tsx, currently disabled):**
- Add/Remove Liquidity tabs
- LP token farming UI (stake/unstake/claim)
- Fee claiming for LP providers
- Pool governance voting
- Create token functionality

**Note:** Full SwapPage exists but requires additional hooks (`useTokenBalances`, `useAddLiquidity`, etc.) that aren't yet implemented.

### Analytics Dashboard

**Location:** `src/pages/AnalyticsPage.tsx` + `src/pages/AnalyticsPage.css`

**8 Comprehensive Metric Cards:**
1. **Total TVL** - Total value locked with % change
2. **24h Volume** - Trading volume with trend indicator
3. **Total Fees (24h)** - Fees collected (calculated from 0.3% tier)
4. **Unique Traders** - Active traders (24h, estimated from volume)
5. **Active Pools** - Count of live AMM pools
6. **Avg Pool APR** - Average annualized returns across pools
7. **Total Swaps** - Transaction count (24h)
8. **LP Positions** - Total active liquidity providers

**Additional Features:**
- Custom SVG line charts (TVL, Volume trends over time)
- Time range selection (7d/30d/90d)
- Protocol statistics and rankings table
- Developer activity metrics (commits, PRs, issues)
- AMM pool performance breakdown
- LP token and position statistics
- AI Insights generation (Claude API integration)

**Key Details:**
- All metrics auto-calculated from existing data sources
- No heavy chart dependencies (pure SVG implementation)
- Charts memoized with useCallback for performance
- Minimalistic terminal aesthetic matching site design
- Full accessibility: ARIA labels, keyboard navigation
- Responsive design with mobile support
- Color-coded metrics: green (positive), red (negative), gray (neutral)

### Vite Configuration Details

**Dev Server:**
- Port: 5174 (host: 0.0.0.0)
- API Proxy: `/api/*` → `http://localhost:3000`
- **Both servers must run**: Vite (5174) + API (3000)

**Path Aliases:**
```typescript
@/          → src/
@components → src/components/
@pages      → src/pages/
@hooks      → src/hooks/
@lib        → lib/
@sdk        → sdk/src/
```

**Build Output:**
- `dist/` directory
- `public/` → `dist/` (copied as-is)
- Chunked JS/CSS with content hashes

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

## Design System & Best Practices

### CSS Architecture

**Theme Variables** (`src/theme.css`):
- 11 themes supported (light, dark, solarized, dracula, monokai, nord, gruvbox, tokyo-night, catppuccin, everforest, rose-pine)
- Typography scale: `--font-xs` (10px) through `--font-3xl` (24px)
- Spacing scale: `--space-sm` (8px) through `--space-2xl` (32px)
- Colors: `--bg-primary/secondary/tertiary`, `--text-primary/secondary/muted`, `--accent-primary/hover`
- **Convention**: All section titles use `// ` prefix (not `> `)
- **Design**: No border-radius (sharp corners throughout for terminal aesthetic)

**CSS Patterns**:
- Prefix all classes with page name (e.g., `.swap-page`, `.analytics-page`)
- Use CSS variables for all colors, fonts, spacing
- Never hard-code colors or pixel values
- Consistent hover states: border-color change only (no transforms)

### Component Patterns

**Tab Navigation Pattern**:
```typescript
// State
const [activeTab, setActiveTab] = useState<TabType>('default');

// Keyboard handler
const handleTabKeyPress = (e: React.KeyboardEvent, tab: TabType) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    setActiveTab(tab);
  }
};

// ARIA attributes
<div role="tablist" aria-label="Description">
  <button
    role="tab"
    aria-selected={activeTab === 'tab1'}
    aria-controls="tab1-panel"
    tabIndex={activeTab === 'tab1' ? 0 : -1}
    onClick={() => setActiveTab('tab1')}
    onKeyDown={(e) => handleTabKeyPress(e, 'tab1')}
  >
    Tab 1
  </button>
</div>
```

**Error Handling**:
- Global `ErrorBoundary` component wraps entire app (`src/components/ErrorBoundary.tsx`)
- Catches React errors and displays user-friendly recovery UI
- Three actions: Reload Page, Try Again, Go Back
- Error details collapsible in development mode

**Shared Utilities** (`src/utils/format.ts`):
- `formatIDL(value)` - Format IDL token amounts
- `formatWallet(address)` - Shorten wallet addresses (first4...last4)
- `formatUSD(value)` - Format currency with K/M suffixes
- `formatPercent(value)` - Format percentage with sign

### Performance Patterns

- **Memoization**: Use `useCallback` for expensive functions (especially chart rendering)
- **Charts**: Custom SVG implementation (no canvas dependencies)
- **Code Splitting**: Not yet implemented (bundle is 647KB, consider lazy loading routes)
- **Images**: No image optimization yet (could add lazy loading)

### Accessibility Requirements

All interactive elements must have:
- `role` attribute (`button`, `tab`, `tablist`, `img`)
- `aria-label` or `aria-labelledby`
- `aria-selected` for tabs
- `tabIndex` management (0 for active, -1 for inactive tabs)
- Keyboard handlers (Enter and Space keys)

### Security Status

**Production & Development**: ✅ 0 vulnerabilities

The codebase uses `lib/spl-token-utils.js` - a pure JavaScript implementation of SPL Token functions that replaces `@solana/spl-token`, eliminating the bigint-buffer vulnerability (CVE-2025-3194).

Command to verify:
```bash
npm audit  # Should show 0 vulnerabilities
```

### SPL Token Utilities (`lib/spl-token-utils.js`)

Pure JS replacement for `@solana/spl-token` to eliminate CVE-2025-3194:
- `TOKEN_PROGRAM_ID`, `ASSOCIATED_TOKEN_PROGRAM_ID` constants
- `getAssociatedTokenAddress()`, `getAssociatedTokenAddressSync()`
- `createAssociatedTokenAccountInstruction()`
- `createMint()`, `createAccount()`, `mintTo()`, `getAccount()`
- `unpackMint()`, `unpackAccount()` for parsing account data

**Usage**: Import from `../lib/spl-token-utils.js` instead of `@solana/spl-token`

### Module System

**Important**: `package.json` has `"type": "module"` to use ES modules throughout and eliminate Vite CJS deprecation warnings.

## Current Navigation Structure

**Main Navigation** (visible in header):
- **Registry** (`/` and `/registry`) - IDL protocol registry (default landing page)
- **Protocol** (`/protocol`) - Prediction markets (staking, betting)
- **Swap** (`/swap`) - StableSwap AMM for BAGS⟷PUMP tokens
- **Dashboard** (`/analytics`) - Comprehensive metrics (TVL, volume, fees, pools, traders, APR)
- **Status** (`/status`) - Verification and protocol status
- **Docs** (`/docs`) - Documentation

**Direct Access** (not in nav, accessible via URL):
- `/tokenomics` - Token economics
- `/battles` - 1v1 battles (page exists but route commented out)
- `/guilds` - Guild system (page exists but route commented out)

**Note**: Battles and Guilds routes are commented out in `src/App.tsx` but page files preserved for future use.

## Community Bounty System

IDLHub incentivizes community contributions with a reward system:

### Reward Structure
- **Base reward**: 1000 IDL for valid IDL uploads that replace placeholders
- **Community bounties**: Anyone can stake IDL tokens to increase rewards for specific protocols
- **Total reward** = 1000 base + community stakes
- **Verification period**: 48 hours

### MCP API Tools (8 total)
1. `list_idls` - List all available IDLs
2. `search_idls` - Search IDLs by name
3. `get_idl` - Get specific IDL with full JSON
4. `upload_idl` - Upload IDL + earn rewards (1000 base + bounty)
5. `get_pending_rewards` - Check reward status for wallet
6. `add_bounty` - Stake IDL tokens on missing protocols
7. `list_bounties` - Browse all active bounties (sort by amount/stakers/date)
8. `get_bounty` - Get bounty details for specific protocol

### Example: Add Bounty via MCP
```bash
curl -X POST https://idlhub.com/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{
    "jsonrpc": "2.0",
    "method": "tools/call",
    "params": {
      "name": "add_bounty",
      "arguments": {
        "protocol_id": "missing-protocol",
        "amount": 1000,
        "staker_wallet": "YourSolanaAddress",
        "tx_signature": "SolanaTransactionSignature"
      }
    },
    "id": 1
  }'
```

**Response:**
```json
{
  "success": true,
  "total_reward": 2000,
  "message": "🎯 Added 1000 IDL to bounty! Total reward now: 2000 IDL"
}
```

### Registry UI Features
- Bounty badges (💰) show on protocols with active bounties
- Hover tooltip displays number of community contributors
- Auto-loads bounty data from `/data/idl-bounties.json`

**Documentation:** See `docs/REWARDS.md` and `BOUNTY_SYSTEM.md` for complete details.
