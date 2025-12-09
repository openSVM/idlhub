# IDLHub Model Context Protocol (MCP) Server

A foundational implementation of the [Model Context Protocol (MCP) 2025-06-18 specification](https://modelcontextprotocol.io/specification/2025-06-18) for IDLHub, providing structured, high-performance access to Solana IDL schemas, symbol lookup, code generation, and diagnostics.

## Two MCP Server Options

IDLHub provides **two MCP server implementations** for different use cases:

### 1. Local IDL Registry MCP Server (Default)
- **Use Case**: Direct access to local IDL files
- **Transport**: stdio, WebSocket
- **Best For**: LLM integrations, editor plugins, offline work
- **Documentation**: This README

### 2. API MCP Server
- **Use Case**: Orchestrator for IDLHub REST API
- **Transport**: JSON-RPC over SSE (Server-Sent Events)
- **Best For**: Web applications, remote clients, API proxy
- **Documentation**: [API_MCP_README.md](./API_MCP_README.md)

## Features

### Core Capabilities

- **Schema Listing & Retrieval**: Browse and fetch IDL schemas from the registry
- **Symbol Lookup**: Search for types, instructions, accounts, enums, and errors within IDLs
- **Code Generation**: Generate type-safe code for TypeScript, Rust, Python, and Anchor TypeScript
- **Diagnostics**: Validate IDL schemas and receive detailed diagnostics
- **Multiple Transports**: Support for both stdio and WebSocket transports

### Performance Targets (v1)

- p95 schema list: < 50ms
- p95 schema retrieval: < 100ms
- p95 symbol lookup: < 50ms
- p95 code generation: < 200ms

## Installation

### Quick Install (Recommended)

The easiest way to install the IDLHub MCP Server:

```bash
curl -fsSL https://idlhub.com/mcp | sh
```

This will automatically:
- Detect your OS (Linux, macOS, Windows/WSL)
- Install Node.js and dependencies if needed
- Clone the repository to `~/.idlhub`
- Configure your environment
- Run tests to verify installation

### Manual Installation

If you prefer to install manually or already have the repository:

```bash
# Clone the repository (if not already cloned)
git clone https://github.com/openSVM/idlhub.git
cd idlhub

# Install npm dependencies
npm install

# Test the installation
npm test
```

See [INSTALL.md](../INSTALL.md) for detailed installation instructions and troubleshooting.

## Usage

### Local IDL Registry MCP Server

#### stdio Transport (Default)

The stdio transport is ideal for local tools, CLI applications, and editor integrations:

```bash
# Start the MCP server on stdio
npm run mcp:stdio

# Or use the binary directly
node mcp-server/src/index.js
```

#### WebSocket Transport

The WebSocket transport is suitable for web applications and remote clients:

```bash
# Start the MCP server on WebSocket (default port 8080)
npm run mcp:websocket

# Or specify a custom port
MCP_PORT=9000 npm run mcp:websocket
```

### API MCP Server

The API MCP Server acts as an orchestrator for the IDLHub REST API:

```bash
# Start the API MCP server (SSE transport, default port 3001)
npm run mcp:api

# Or with custom settings
IDLHUB_API_BASE=https://idlhub.com MCP_PORT=3001 npm run mcp:api
```

For complete API MCP Server documentation, see [API_MCP_README.md](./API_MCP_README.md).

### Environment Variables

**Local IDL Registry MCP Server:**
- `IDL_REGISTRY_PATH`: Path to the IDL registry (defaults to repository root)
- `MCP_PORT`: WebSocket server port (defaults to 8080)

**API MCP Server:**
- `IDLHUB_API_BASE`: IDLHub API base URL (defaults to http://localhost:3000)
- `MCP_PORT`: Server port (defaults to 3001)

## MCP Tools (Local IDL Registry)

The server exposes the following MCP tools:

### 1. list_schemas

List all available IDL schemas in the registry with optional filtering.

**Arguments:**
- `category` (optional): Filter by category (defi, dex, lending, etc.)
- `status` (optional): Filter by status (available, placeholder)

**Example:**
```json
{
  "name": "list_schemas",
  "arguments": {
    "category": "dex",
    "status": "available"
  }
}
```

### 2. get_schema

Retrieve a specific IDL schema by protocol ID.

**Arguments:**
- `protocol_id` (required): The protocol ID (e.g., "jupiter", "orca")

**Example:**
```json
{
  "name": "get_schema",
  "arguments": {
    "protocol_id": "jupiter"
  }
}
```

### 3. lookup_symbol

Look up types, instructions, accounts, or enums in an IDL.

**Arguments:**
- `protocol_id` (required): The protocol ID to search in
- `symbol_name` (required): The symbol name to look up
- `symbol_type` (optional): Type of symbol (instruction, account, type, enum, error)

**Example:**
```json
{
  "name": "lookup_symbol",
  "arguments": {
    "protocol_id": "jupiter",
    "symbol_name": "route",
    "symbol_type": "instruction"
  }
}
```

### 4. generate_code

Generate code from an IDL for a specific target language/framework.

**Arguments:**
- `protocol_id` (required): The protocol ID to generate code for
- `target` (required): Target language (typescript, rust, python, anchor-ts)
- `symbols` (optional): Specific symbols to generate (generates all if not specified)

**Example:**
```json
{
  "name": "generate_code",
  "arguments": {
    "protocol_id": "jupiter",
    "target": "typescript"
  }
}
```

### 5. validate_idl

Validate an IDL schema and provide diagnostics.

**Arguments:**
- `protocol_id` (required): The protocol ID to validate

**Example:**
```json
{
  "name": "validate_idl",
  "arguments": {
    "protocol_id": "jupiter"
  }
}
```

## MCP Resources

The server exposes IDL schemas as MCP resources with URIs in the format:

```
idl://<protocol_id>
```

For example:
- `idl://jupiter`
- `idl://orca`
- `idl://marinade`

Resources can be accessed using the standard MCP resource API:
- `resources/list`: List all available IDL resources
- `resources/read`: Read a specific IDL resource by URI

## Code Generation Targets

The server supports code generation for the following targets:

### TypeScript

Generates TypeScript type definitions from IDL types and instructions.

```typescript
// Example generated TypeScript
export type SwapInstruction = {
  amountIn: bigint;
  minimumAmountOut: bigint;
  platformFeeBps: number;
};
```

### Rust

Generates Rust struct and enum definitions compatible with Anchor.

```rust
// Example generated Rust
#[derive(AnchorSerialize, AnchorDeserialize, Clone)]
pub struct SwapInstruction {
    pub amount_in: u64,
    pub minimum_amount_out: u64,
    pub platform_fee_bps: u16,
}
```

### Python

Generates Python dataclasses and type hints.

```python
# Example generated Python
@dataclass
class SwapInstruction:
    amount_in: int
    minimum_amount_out: int
    platform_fee_bps: int
```

### Anchor TypeScript

Generates a complete Anchor TypeScript client with the IDL embedded.

```typescript
// Example generated Anchor TS
import { Program } from '@coral-xyz/anchor';

export type JupiterAggregator = { /* IDL */ };
export const IDL: JupiterAggregator = { /* IDL */ };
```

## Integration Examples

### Claude Desktop

Add to your Claude Desktop configuration:

```json
{
  "mcpServers": {
    "idlhub": {
      "command": "node",
      "args": ["/path/to/idlhub/mcp-server/src/index.js"],
      "env": {
        "IDL_REGISTRY_PATH": "/path/to/idlhub"
      }
    }
  }
}
```

### Cline / VSCode

Add to your Cline MCP settings:

```json
{
  "mcpServers": {
    "idlhub": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-server/src/index.js"]
    }
  }
}
```

### Custom Client (WebSocket)

```javascript
import WebSocket from 'ws';

const ws = new WebSocket('ws://localhost:8080');

ws.on('open', () => {
  // Send MCP request
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'list_schemas',
      arguments: { category: 'dex' }
    }
  }));
});

ws.on('message', (data) => {
  const response = JSON.parse(data);
  console.log(response);
});
```

## Architecture

```
┌─────────────────────────────────────────┐
│         MCP Client (LLM/Editor)         │
└────────────────┬────────────────────────┘
                 │
    ┌────────────┴────────────┐
    │                         │
┌───▼────┐              ┌────▼──────┐
│ stdio  │              │ WebSocket │
│Transport│              │ Transport │
└───┬────┘              └────┬──────┘
    │                         │
    └────────────┬────────────┘
                 │
         ┌───────▼────────┐
         │  IDLHub MCP    │
         │     Server     │
         └───────┬────────┘
                 │
    ┌────────────┼────────────┐
    │            │            │
┌───▼────┐  ┌───▼────┐  ┌───▼────┐
│ Schema │  │ Symbol │  │Codegen │
│ Listing│  │ Lookup │  │        │
└───┬────┘  └───┬────┘  └───┬────┘
    │           │            │
    └───────────┴────────────┘
                │
         ┌──────▼──────┐
         │ IDL Registry│
         │ (index.json)│
         └──────┬──────┘
                │
         ┌──────▼──────┐
         │  IDL Files  │
         │   (IDLs/)   │
         └─────────────┘
```

## Protocol Conformance

This server implements the following MCP 2025-06-18 specification features:

- ✅ Server initialization and capability negotiation
- ✅ Tool registration and invocation (5 tools)
- ✅ Resource listing and reading
- ✅ stdio transport
- ✅ WebSocket transport
- ✅ JSON-RPC 2.0 message framing
- ✅ Error handling and diagnostics

## Development

### Project Structure

```
mcp-server/
├── src/
│   ├── index.js              # Main MCP server (stdio)
│   └── websocket-server.js   # WebSocket transport server
├── config.json               # Server configuration
└── README.md                 # This file
```

### Testing the Server

You can test the server using the MCP inspector or by sending JSON-RPC requests:

```bash
# Test stdio server
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | npm run mcp:stdio

# Test WebSocket server (in another terminal)
npm run mcp:websocket

# Then connect with a WebSocket client
wscat -c ws://localhost:8080
```

## Performance Considerations

The server is designed for high performance:

- **In-memory index**: The registry index is loaded once at startup
- **Lazy loading**: IDL files are loaded on-demand
- **Minimal parsing**: JSON parsing only when needed
- **Efficient filtering**: Category and status filtering without full IDL loading

## Future Enhancements (v2+)

- [ ] Caching layer for frequently accessed IDLs
- [ ] Streaming responses for large IDL collections
- [ ] Advanced code generation (custom templates)
- [ ] Real-time IDL updates via file watching
- [ ] Authentication and rate limiting for WebSocket
- [ ] Metrics and observability
- [ ] gRPC transport option
- [ ] IDL diffing and versioning tools

## Contributing

Contributions are welcome! Please ensure that:

1. Code follows the existing style
2. All tools maintain sub-100ms p95 latency for simple operations
3. Documentation is updated for new features
4. Error messages are clear and actionable

## License

This project is released into the public domain under the Unlicense.

## Resources

- [Model Context Protocol Specification](https://modelcontextprotocol.io/specification/2025-06-18)
- [MCP SDK Documentation](https://github.com/modelcontextprotocol/sdk)
- [Anchor IDL Specification](https://www.anchor-lang.com/docs/idl)
- [IDLHub Repository](https://github.com/openSVM/idlhub)
