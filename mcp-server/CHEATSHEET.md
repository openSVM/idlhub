# MCP Server Cheat Sheet

Quick reference for the IDLHub MCP Server

## 🚀 Quick Start

```bash
# Install
npm install

# Start server (stdio)
npm run mcp:start

# Start server (WebSocket)
npm run mcp:websocket

# Run tests
npm test

# Try examples
node mcp-server/examples/basic-usage.js
```

## 🛠️ Available Tools

### 1. list_schemas
List all IDL schemas with optional filtering.

```json
{
  "name": "list_schemas",
  "arguments": {
    "category": "dex",      // Optional: defi, dex, lending, etc.
    "status": "available"   // Optional: available, placeholder
  }
}
```

**Response**: List of protocols with metadata

---

### 2. get_schema
Get a complete IDL by protocol ID.

```json
{
  "name": "get_schema",
  "arguments": {
    "protocol_id": "jupiter"  // Required: protocol identifier
  }
}
```

**Response**: Full IDL JSON

---

### 3. lookup_symbol
Find specific symbols in an IDL.

```json
{
  "name": "lookup_symbol",
  "arguments": {
    "protocol_id": "jupiter",   // Required: protocol identifier
    "symbol_name": "route",     // Required: symbol to find
    "symbol_type": "instruction" // Optional: instruction, account, type, enum, error
  }
}
```

**Response**: Symbol definition(s)

---

### 4. generate_code
Generate code from an IDL.

```json
{
  "name": "generate_code",
  "arguments": {
    "protocol_id": "jupiter",  // Required: protocol identifier
    "target": "typescript",    // Required: typescript, rust, python, anchor-ts
    "symbols": ["Route"]       // Optional: specific symbols to generate
  }
}
```

**Response**: Generated code

---

### 5. validate_idl
Validate an IDL and get diagnostics.

```json
{
  "name": "validate_idl",
  "arguments": {
    "protocol_id": "jupiter"  // Required: protocol identifier
  }
}
```

**Response**: Validation results with errors, warnings, and info

---

## 📚 Resource API

### List Resources
```json
{
  "method": "resources/list",
  "params": {}
}
```

**Response**: Array of available IDL resources

### Read Resource
```json
{
  "method": "resources/read",
  "params": {
    "uri": "idl://jupiter"  // Format: idl://<protocol_id>
  }
}
```

**Response**: IDL content

---

## 🔧 Code Generation Targets

### TypeScript
```json
{ "target": "typescript" }
```
Generates: Type definitions, interfaces

### Rust
```json
{ "target": "rust" }
```
Generates: Anchor-compatible structs, enums

### Python
```json
{ "target": "python" }
```
Generates: Dataclasses with type hints

### Anchor TypeScript
```json
{ "target": "anchor-ts" }
```
Generates: Complete Anchor client with embedded IDL

---

## 🎯 Common Use Cases

### Browse Protocols
```bash
list_schemas → filter by category → get_schema
```

### Code Generation
```bash
get_schema → generate_code (typescript) → save to file
```

### Symbol Lookup
```bash
lookup_symbol → find instruction → get details
```

### Validation
```bash
validate_idl → check errors → fix issues
```

---

## ⚙️ Configuration

### Environment Variables
```bash
IDL_REGISTRY_PATH=/path/to/idlhub  # Registry location
MCP_PORT=8080                       # WebSocket port
```

### npm Scripts
```bash
npm run mcp:start      # Start stdio server
npm run mcp:stdio      # Same as mcp:start
npm run mcp:websocket  # Start WebSocket server
npm test               # Run test suite
```

---

## 🔌 Integration Examples

### Claude Desktop
Location: `~/Library/Application Support/Claude/claude_desktop_config.json`

```json
{
  "mcpServers": {
    "idlhub": {
      "command": "node",
      "args": ["/absolute/path/to/idlhub/mcp-server/src/index.js"]
    }
  }
}
```

### Cline (VSCode)
Settings → Cline → MCP Servers

```json
{
  "idlhub": {
    "command": "node",
    "args": ["${workspaceFolder}/mcp-server/src/index.js"]
  }
}
```

### WebSocket Client
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

### CLI Usage
```bash
# Direct execution
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}' | node mcp-server/src/index.js

# Using binary
idlhub-mcp
```

---

## 🐛 Troubleshooting

### Server Won't Start
```bash
# Check dependencies
npm install

# Check Node version
node --version  # Should be v14+

# Check registry path
ls index.json IDLs/
```

### Invalid Protocol Error
```bash
# List available protocols
cat index.json | grep '"id"'

# Check protocol status
cat index.json | jq '.protocols[] | select(.id=="jupiter")'
```

### WebSocket Connection Failed
```bash
# Check if port is available
lsof -i :8080

# Try different port
MCP_PORT=9000 npm run mcp:websocket
```

### Slow Performance
```bash
# Check IDL file sizes
du -sh IDLs/*.json

# Monitor memory
top -p $(pgrep -f "mcp-server")
```

---

## 📊 Performance Expectations

| Operation | p95 Target | Typical |
|-----------|-----------|---------|
| list_schemas | < 50ms | ~10ms |
| get_schema | < 100ms | ~30ms |
| lookup_symbol | < 50ms | ~20ms |
| generate_code | < 200ms | ~100ms |
| validate_idl | < 100ms | ~40ms |

---

## 📖 More Resources

- **Full Documentation**: `mcp-server/README.md`
- **Quick Start**: `mcp-server/QUICKSTART.md`
- **Implementation Details**: `mcp-server/IMPLEMENTATION_SUMMARY.md`
- **Examples**: `mcp-server/examples/`
- **Tests**: `mcp-server/test/`

---

## 🆘 Getting Help

- **Issues**: https://github.com/openSVM/idlhub/issues
- **Discussions**: https://github.com/openSVM/idlhub/discussions
- **MCP Spec**: https://modelcontextprotocol.io/specification/2025-06-18

---

**Pro Tip**: Run `npm test` regularly to ensure everything works correctly!
