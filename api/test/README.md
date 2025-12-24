# IDLHub API Integration Tests

Comprehensive test suite for the IDLHub API ecosystem, including REST API and MCP (Model Context Protocol) endpoints.

## Test Files

### 1. `server.test.js` - REST API Integration Tests
Tests the Express REST API server (`api/server-arweave.js`) with real HTTP requests.

**Coverage:**
- Health and documentation endpoints
- IDL query endpoints (list, search, get)
- Legacy program endpoints
- Upload validation
- Error handling and CORS

**Run:**
```bash
npm run test:api
```

### 2. `server.unit.test.js` - REST API Unit Tests
Unit tests for individual REST API endpoints with mocked dependencies.

**Run:**
```bash
npm run test:api:unit
```

### 3. `mcp-integration.test.cjs` - MCP API Integration Tests
Tests the Netlify MCP function (`netlify/functions/mcp.js`) against production endpoint.

**Coverage:**
- All 8 MCP tools (list_idls, search_idls, get_idl, upload_idl, get_pending_rewards, add_bounty, list_bounties, get_bounty)
- JSON-RPC 2.0 protocol compliance
- Bounty system functionality
- Reward tracking
- Upload validation
- CORS and security
- Error handling

**Run:**
```bash
npm run test:mcp-integration
```

**Target:** `https://idlhub.com/api/mcp` (production)

**Total Tests:** 17 tests covering:
- Protocol validation (tools/list, invalid methods)
- IDL queries (list, search, get with filters)
- Bounty system (list, get, sort)
- Reward tracking
- Upload validation
- Concurrent requests
- Error handling

### 4. `full-integration.test.cjs` - Full API Ecosystem Tests
End-to-end tests validating both REST and MCP APIs together.

**Coverage:**
- REST API health checks
- MCP API protocol tests
- Cross-API data consistency
- Bounty system workflows
- Upload validation
- Performance (concurrent requests, pagination)
- Error handling (malformed JSON, missing fields, invalid tools)

**Run:**
```bash
npm run test:full-integration
```

**Targets:**
- REST API: `http://localhost:3000` (requires local server)
- MCP API: `https://idlhub.com/api/mcp` (production)

**Total Tests:** 18 tests covering the complete API ecosystem

## Test Results

### MCP Integration Tests (17 tests)
```
✅ tools/list returns all 8 MCP tools
✅ Invalid method returns proper error
✅ list_idls returns IDL list with pagination
✅ list_idls filters by category
✅ search_idls finds protocols by name
✅ search_idls requires query parameter
✅ get_idl returns full IDL with metadata
✅ get_idl returns error for non-existent protocol
✅ list_bounties returns active bounties
✅ list_bounties sorts by different fields
✅ get_bounty returns bounty details or not found
✅ get_bounty handles missing protocol_id gracefully
✅ get_pending_rewards returns reward structure
✅ get_pending_rewards handles missing wallet gracefully
✅ upload_idl validates required parameters
✅ upload_idl validates IDL format
✅ CORS headers are present
```

### Full Integration Tests (18 tests)
```
REST API Tests (3):
✅ REST API health check
✅ REST API docs endpoint
✅ REST API CORS headers

MCP API Tests (2):
✅ MCP tools/list returns all tools
✅ MCP invalid method error handling

Cross-API Consistency (3):
✅ MCP list_idls returns valid IDLs
✅ MCP get_idl retrieves full IDL data
✅ MCP search_idls finds protocols

Bounty System (3):
✅ MCP list_bounties returns bounty data
✅ MCP get_bounty checks protocol bounty
✅ MCP get_pending_rewards returns wallet rewards

Upload Validation (2):
✅ MCP upload_idl validates missing parameters
✅ MCP upload_idl validates IDL structure

Performance (2):
✅ MCP handles concurrent requests
✅ MCP pagination works correctly

Error Handling (3):
✅ MCP handles malformed JSON gracefully
✅ MCP handles missing required fields
✅ MCP handles non-existent tools
```

## Running Tests

### Individual Test Suites
```bash
# MCP server basic tests
npm test

# REST API integration tests
npm run test:api

# REST API unit tests
npm run test:api:unit

# MCP integration tests (production endpoint)
npm run test:mcp-integration

# Full integration tests (REST + MCP)
npm run test:full-integration

# Anchor Solana program tests
npm run test:anchor

# E2E tests (Playwright)
npm run test:e2e
```

### Run All Tests
```bash
npm run test:all
```

This runs:
1. API unit tests
2. MCP server tests
3. REST API integration tests
4. MCP integration tests (production)
5. E2E tests (785 Playwright tests)

## Test Configuration

### Environment Variables

**MCP Integration Tests:**
- `MCP_TEST_URL` - MCP endpoint URL (default: `https://idlhub.com/api/mcp`)

**Full Integration Tests:**
- `REST_API_URL` - REST API URL (default: `http://localhost:3000`)
- `MCP_API_URL` - MCP API URL (default: `https://idlhub.com/api/mcp`)

**Example:**
```bash
# Test against local MCP function (if running Netlify Dev)
MCP_TEST_URL=http://localhost:8888/api/mcp npm run test:mcp-integration

# Test against staging REST API
REST_API_URL=https://staging.idlhub.com npm run test:full-integration
```

## Test Architecture

### MCP Tests (`mcp-integration.test.cjs`)
- Pure Node.js (no external HTTP libraries)
- CommonJS module (`.cjs` extension for ES module compatibility)
- JSON-RPC 2.0 protocol validation
- Tests against live production endpoint
- No mocks - real Arweave data

### Full Integration Tests (`full-integration.test.cjs`)
- Tests both REST and MCP APIs
- Validates cross-API data consistency
- End-to-end workflow testing
- Performance and concurrency tests

### Test Data
- Uses live Arweave manifest from `https://idlhub.com/arweave/manifest.json`
- Tests against real IDL data (166+ protocols)
- Bounty data from `https://idlhub.com/data/idl-bounties.json`

## Key Features Tested

### MCP API (8 Tools)
1. **list_idls** - List all IDLs with pagination and category filtering
2. **search_idls** - Search IDLs by name with fuzzy matching
3. **get_idl** - Get full IDL with metadata and Arweave URL
4. **upload_idl** - Upload new IDL with reward eligibility (1000 IDL base + community bounty)
5. **get_pending_rewards** - Check pending rewards for wallet
6. **add_bounty** - Add community bounty to missing IDL
7. **list_bounties** - List all active bounties with sorting
8. **get_bounty** - Get bounty details for specific protocol

### Bounty System
- 1000 IDL base reward for valid uploads
- Community staking on missing protocols
- Total reward = base + community bounty
- Bounty sorting (amount, stakers, date)
- Verification period tracking (48 hours)

### REST API Endpoints
- Health check (`/health`)
- API documentation (`/api/docs`)
- IDL queries (`/api/idl`, `/api/idl/:id`, `/api/search`)
- Upload validation (`/api/idl/upload`, `/api/idl/load-from-github`)
- CORS headers

## Continuous Integration

Tests run automatically on:
- Every push to main branch
- Every pull request
- Manual workflow dispatch

**GitHub Actions:**
- `.github/workflows/e2e-tests.yml` - E2E tests
- Future: Add workflow for API integration tests

## Troubleshooting

### "ReferenceError: require is not defined"
Files must use `.cjs` extension because `package.json` has `"type": "module"`.

### "ECONNREFUSED" errors
Ensure the REST API server is running:
```bash
npm run api:start
```

### MCP tests failing
Check if production endpoint is accessible:
```bash
curl -X POST https://idlhub.com/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

### Timeout errors
Increase timeout in test files or set environment variable:
```bash
# In test file
timeout: 60000  // 60 seconds
```

## Contributing

When adding new tests:
1. Use `.cjs` extension for Node.js test files
2. Follow existing test patterns (test() wrapper function)
3. Add descriptive test names
4. Update this README with new test coverage
5. Ensure tests pass before committing

## License

ISC
