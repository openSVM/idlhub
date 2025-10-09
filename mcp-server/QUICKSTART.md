# IDLHub MCP Server - Quick Start Guide

Get started with the IDLHub Model Context Protocol server in minutes!

## Installation

### One-Line Install (Recommended)

The fastest way to get started:

```bash
curl -fsSL https://idlhub.com/mcp | sh
```

This automatically installs everything you need on macOS, Linux, or Windows (WSL).

### Manual Installation

If you prefer manual setup:

```bash
# Clone the repository
git clone https://github.com/openSVM/idlhub.git
cd idlhub

# Install dependencies
npm install
```

## Basic Usage

### 1. Start the Server (stdio)

```bash
npm run mcp:start
```

The server will start and listen on stdin/stdout for JSON-RPC requests.

### 2. Try the Examples

```bash
node mcp-server/examples/basic-usage.js
```

This will run through all the MCP tools and show you how they work.

### 3. Run Tests

```bash
npm test
```

## Quick Examples

### List All DEX Protocols

Send this JSON-RPC request:

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "tools/call",
  "params": {
    "name": "list_schemas",
    "arguments": {
      "category": "dex",
      "status": "available"
    }
  }
}
```

### Get Jupiter IDL

```json
{
  "jsonrpc": "2.0",
  "id": 2,
  "method": "tools/call",
  "params": {
    "name": "get_schema",
    "arguments": {
      "protocol_id": "jupiter"
    }
  }
}
```

### Generate TypeScript Code

```json
{
  "jsonrpc": "2.0",
  "id": 3,
  "method": "tools/call",
  "params": {
    "name": "generate_code",
    "arguments": {
      "protocol_id": "jupiter",
      "target": "typescript"
    }
  }
}
```

## Integration with LLMs

### Claude Desktop

1. Open your Claude Desktop config:
   - macOS: `~/Library/Application Support/Claude/claude_desktop_config.json`
   - Windows: `%APPDATA%\Claude\claude_desktop_config.json`

2. Add the IDLHub server:

```json
{
  "mcpServers": {
    "idlhub": {
      "command": "node",
      "args": ["/absolute/path/to/idlhub/mcp-server/src/index.js"],
      "env": {
        "IDL_REGISTRY_PATH": "/absolute/path/to/idlhub"
      }
    }
  }
}
```

3. Restart Claude Desktop

4. Test it by asking Claude: "List all DEX protocols in the IDL registry"

### Cline (VSCode Extension)

1. Open VSCode Settings
2. Search for "Cline MCP"
3. Add server configuration:

```json
{
  "idlhub": {
    "command": "node",
    "args": ["${workspaceFolder}/mcp-server/src/index.js"]
  }
}
```

## WebSocket Mode

For web applications or remote access:

```bash
# Start WebSocket server on port 8080
npm run mcp:websocket

# Or specify a custom port
MCP_PORT=9000 npm run mcp:websocket
```

Then connect from your application:

```javascript
const ws = new WebSocket('ws://localhost:8080');

ws.onopen = () => {
  ws.send(JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list',
    params: {}
  }));
};

ws.onmessage = (event) => {
  const response = JSON.parse(event.data);
  console.log(response);
};
```

## Available Tools

1. **list_schemas** - List all IDL schemas (with optional filters)
2. **get_schema** - Get a specific IDL by protocol ID
3. **lookup_symbol** - Find types, instructions, accounts, or enums
4. **generate_code** - Generate code in TypeScript, Rust, Python, or Anchor TS
5. **validate_idl** - Validate an IDL and get diagnostics

## Common Use Cases

### Building an IDE Extension

Use `lookup_symbol` for autocomplete and `validate_idl` for linting:

```javascript
// Autocomplete example
const symbolLookup = {
  protocol_id: "jupiter",
  symbol_name: "route",
  symbol_type: "instruction"
};

// Validation example
const validation = {
  protocol_id: "jupiter"
};
```

### Generating Client Libraries

Use `generate_code` to create type-safe client code:

```javascript
// Generate TypeScript types
const tsCodegen = {
  protocol_id: "jupiter",
  target: "typescript"
};

// Generate Rust structs
const rustCodegen = {
  protocol_id: "jupiter",
  target: "rust"
};
```

### IDL Documentation

Use the resources API to build documentation:

```javascript
// List all resources
GET resources/list

// Read specific IDL
GET resources/read?uri=idl://jupiter
```

## Troubleshooting

### Server won't start

Make sure you've installed dependencies:
```bash
npm install
```

### Invalid protocol error

Check that the protocol exists:
```bash
cat index.json | grep "protocol_id"
```

### Performance issues

The server is designed for < 100ms p95 latency. If you're seeing slower responses:
- Check that IDL files aren't corrupted
- Ensure you have sufficient RAM
- Try reducing concurrent requests

## Next Steps

- Read the [full documentation](README.md)
- Check out the [examples](examples/)
- Run the [test suite](test/)
- Explore the [MCP specification](https://modelcontextprotocol.io/specification/2025-06-18)

## Getting Help

- Issues: https://github.com/openSVM/idlhub/issues
- Discussions: https://github.com/openSVM/idlhub/discussions

Happy coding! 🚀
