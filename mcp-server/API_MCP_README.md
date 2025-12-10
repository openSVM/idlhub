# IDLHub API MCP Server

A Model Context Protocol (MCP) server that acts as an orchestrator for the IDLHub REST API. This server provides a standardized, web-accessible JSON-RPC interface for AI agents and tools to interact with the IDLHub API without requiring local git clone.

## Overview

The IDLHub API MCP Server bridges the gap between MCP-compatible clients (like Claude Desktop, Cline, or custom tools) and the IDLHub REST API. It provides:

- **Web-Accessible**: No local installation required, accessible via idlhub.com
- **Standardized API Access**: All IDLHub API endpoints accessible via MCP tools
- **API Client Pattern**: Clean separation with dedicated IDLHubAPIClient class
- **Error Handling**: Comprehensive error handling with trace IDs for debugging
- **Retry Logic**: Automatic retries with exponential backoff for failed requests
- **Health Monitoring**: Built-in health and metrics endpoints
- **Request Logging**: Detailed logging with trace IDs for all API calls
- **SSE Transport**: Real-time communication via Server-Sent Events
- **Smithery Compatible**: Exports configSchema for automatic discovery by @smithery/cli

## Architecture

```
┌─────────────────────────────────────────┐
│    MCP Client (Claude, Cline, etc.)    │
└────────────────┬────────────────────────┘
                 │ JSON-RPC over SSE
         ┌───────▼────────┐
         │  API MCP       │
         │  Server        │
         │  (Port 3001)   │
         └───────┬────────┘
                 │ HTTP REST
         ┌───────▼────────┐
         │  IDLHub API    │
         │ (idlhub.com)   │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │  OpenSVM API   │
         │ (opensvm.com)  │
         └───────┬────────┘
                 │
         ┌───────▼────────┐
         │ Qdrant Vector  │
         │    Database    │
         └────────────────┘
```

## Configuration

### Smithery Configuration Schema

The server exports a `configSchema` for automatic discovery:

```javascript
{
  apiUrl: {
    type: 'string',
    description: 'Base URL for the IDLHub API',
    default: 'https://idlhub.com',
  },
  requestTimeout: {
    type: 'number',
    description: 'Timeout for API requests in milliseconds',
    default: 30000,
  },
}
```

## Features

### MCP Tools

The server provides 7 MCP tools that map to IDLHub API endpoints:

1. **list_idls** - List all IDLs with filtering
2. **get_idl** - Get a specific IDL by program ID
3. **search_idls** - Semantic search for IDLs
4. **upload_idl** - Upload an IDL directly
5. **create_or_update_idl** - Create or update an IDL
6. **load_from_github** - Load IDL from GitHub repository
7. **delete_idl** - Delete an IDL from the registry

### Error Handling

All errors follow a consistent JSON schema with trace IDs:

```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "traceId": "a1b2c3d4e5f6...",
  "status": 500,
  "details": {}
}
```

### Retry Logic

The server implements intelligent retry logic:
- 3 retry attempts for failed requests
- Exponential backoff (2^attempt * 1000ms)
- Only retries on network errors and 5xx status codes
- Trace IDs preserved across retries

### Health & Metrics

- **Health Endpoint**: `GET /health` - Server status and configuration
- **Metrics Endpoint**: `GET /metrics` - Request statistics and performance

## Installation

```bash
# Install dependencies (if not already installed)
npm install

# Set environment variables (optional)
export IDLHUB_API_BASE=https://idlhub.com
export IDLHUB_REQUEST_TIMEOUT=30000
export MCP_PORT=3001
```

## Usage

### Starting the Server

```bash
# Start the API MCP server
npm run mcp:api

# Or directly
node mcp-server/src/api-server.js

# With custom settings
IDLHUB_API_BASE=https://idlhub.com MCP_PORT=4000 npm run mcp:api
```

### Web Access (No Git Clone Required)

The server is designed to be accessible via web without requiring local git clone:

1. **MCP Endpoint**: Connect to `https://idlhub.com/api/mcp` for MCP access via SSE
2. **Health Check**: `GET https://idlhub.com/health`
3. **Metrics**: `GET https://idlhub.com/metrics`

### Environment Variables

- `IDLHUB_API_BASE`: Base URL for IDLHub API (default: `https://idlhub.com`)
- `IDLHUB_REQUEST_TIMEOUT`: Request timeout in milliseconds (default: `30000`)
- `MCP_PORT`: Port for the MCP server (default: `3001`)

### Endpoints

- `GET /health` - Health check and server status
- `GET /metrics` - Request metrics and statistics
- `GET /api/mcp` - MCP endpoint with SSE transport
- `POST /api/mcp/message` - Message endpoint for MCP SSE transport

## MCP Tools Reference

### 1. list_idls

List all IDLs with optional filtering.

**Arguments:**
```json
{
  "network": "mainnet",  // Optional: mainnet/devnet/testnet
  "limit": 50,           // Optional: 1-100
  "offset": 0            // Optional: pagination offset
}
```

**Response:**
```json
{
  "idls": [
    {
      "programId": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "name": "Jupiter",
      "version": "0.1.0",
      "network": "mainnet",
      "instructionCount": 25,
      "createdAt": "2024-01-01T00:00:00Z"
    }
  ],
  "total": 100,
  "hasMore": true
}
```

### 2. get_idl

Get a specific IDL by program ID.

**Arguments:**
```json
{
  "programId": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",  // Required
  "network": "mainnet",  // Optional: mainnet/devnet/testnet
  "all": false          // Optional: return from all networks
}
```

**Response:**
```json
{
  "programId": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
  "name": "Jupiter",
  "network": "mainnet",
  "idl": {
    "version": "0.1.0",
    "name": "jupiter",
    "instructions": [...],
    "accounts": [...],
    "types": [...],
    "errors": [...]
  },
  "createdAt": "2024-01-01T00:00:00Z"
}
```

### 3. search_idls

Search for IDLs using semantic search.

**Arguments:**
```json
{
  "query": "jupiter swap",  // Required: search query
  "network": "mainnet",     // Optional: mainnet/devnet/testnet
  "limit": 10              // Optional: 1-50
}
```

**Response:**
```json
{
  "query": "jupiter swap",
  "results": [
    {
      "programId": "JUPyiwrYJFskUPiHa7hkeR8VUtAeFoSYbKedZNsDvCN",
      "name": "Jupiter",
      "score": 0.95,
      "network": "mainnet"
    }
  ],
  "total": 5
}
```

### 4. upload_idl

Upload an IDL directly to the registry.

**Arguments:**
```json
{
  "programId": "MyProgram1111111111111111111111111111111",  // Required
  "network": "mainnet",  // Required: mainnet/devnet/testnet
  "name": "My Program",  // Optional
  "idl": {               // Required: complete IDL object
    "version": "0.1.0",
    "name": "my_program",
    "instructions": [...],
    "accounts": [],
    "types": [],
    "errors": []
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "IDL uploaded successfully",
  "data": {
    "programId": "MyProgram1111111111111111111111111111111",
    "network": "mainnet"
  }
}
```

### 5. create_or_update_idl

Create or update an IDL in the registry (alternative to upload_idl with metadata support).

**Arguments:**
```json
{
  "programId": "MyProgram1111111111111111111111111111111",  // Required
  "network": "mainnet",  // Required: mainnet/devnet/testnet
  "name": "My Program",  // Optional
  "idl": {               // Required: complete IDL object
    "version": "0.1.0",
    "name": "my_program",
    "instructions": [...],
    "accounts": [],
    "types": [],
    "errors": []
  },
  "metadata": {          // Optional: additional metadata
    "github": "https://github.com/example/repo",
    "description": "Custom description"
  }
}
```

**Response:**
```json
{
  "success": true,
  "message": "IDL created/updated successfully",
  "data": {
    "programId": "MyProgram1111111111111111111111111111111",
    "network": "mainnet"
  }
}
```

### 6. load_from_github

Load an IDL file from a GitHub repository.

**Arguments:**
```json
{
  "owner": "coral-xyz",       // Required: GitHub repo owner
  "repo": "anchor",           // Required: GitHub repo name
  "path": "idl.json",         // Required: path to IDL file
  "programId": "ExampleProg", // Required: program ID
  "name": "Example",          // Required: program name
  "network": "mainnet",       // Optional: mainnet/devnet/testnet
  "branch": "main"           // Optional: git branch
}
```

**Response:**
```json
{
  "success": true,
  "message": "IDL loaded from GitHub and stored",
  "data": {
    "programId": "ExampleProg",
    "idl": {...}
  }
}
```

### 7. delete_idl

Delete an IDL from the registry.

**Arguments:**
```json
{
  "programId": "MyProgram1111111111111111111111111111111",  // Required
  "network": "mainnet"  // Optional: mainnet/devnet/testnet
}
```

**Response:**
```json
{
  "success": true,
  "message": "IDL deleted from OpenSVM"
}
```

## Integration Examples

### Claude Desktop

Add to your Claude Desktop configuration (`claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "idlhub-api": {
      "command": "node",
      "args": ["/path/to/idlhub/mcp-server/src/api-server.js"],
      "env": {
        "IDLHUB_API_BASE": "https://idlhub.com",
        "MCP_PORT": "3001"
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
    "idlhub-api": {
      "command": "node",
      "args": ["${workspaceFolder}/mcp-server/src/api-server.js"],
      "env": {
        "IDLHUB_API_BASE": "http://localhost:3000"
      }
    }
  }
}
```

### Custom Client (JavaScript)

```javascript
const EventSource = require('eventsource');

// Connect to MCP endpoint
const es = new EventSource('http://localhost:3001/api/mcp');

es.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Received:', data);
};

// Send MCP request
fetch('http://localhost:3001/api/mcp/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/call',
    params: {
      name: 'list_idls',
      arguments: { network: 'mainnet', limit: 10 }
    }
  })
});
```

## Monitoring

### Health Check

```bash
curl http://localhost:3001/health
```

**Response:**
```json
{
  "status": "ok",
  "version": "1.0.0",
  "uptime": 3600,
  "timestamp": "2024-01-01T00:00:00.000Z",
  "apiBaseUrl": "http://localhost:3000",
  "metrics": {
    "requests": 150,
    "errors": 2,
    "errorRate": "1.33%",
    "avgLatency": "45ms",
    "p95Latency": "120ms"
  }
}
```

### Metrics

```bash
curl http://localhost:3001/metrics
```

**Response:**
```json
{
  "requests": 150,
  "errors": 2,
  "errorRate": "1.33%",
  "avgLatency": "45ms",
  "p95Latency": "120ms"
}
```

## Error Codes

Common error codes returned by the server:

- `API_ERROR`: Error from the IDLHub API
- `INTERNAL_ERROR`: Internal server error
- `VALIDATION_ERROR`: Invalid request parameters
- `NOT_FOUND`: Resource not found (404)
- `BAD_REQUEST`: Invalid request (400)
- `SERVER_ERROR`: Upstream server error (500+)

## Testing

```bash
# Run API MCP server tests
npm run test:api-mcp

# Or directly
node mcp-server/test/api-server.test.js
```

## Troubleshooting

### Server won't start

- Check if port 3001 is already in use
- Verify IDLHUB_API_BASE is accessible
- Check Node.js version (requires 14+)

### Connection errors

- Ensure IDLHub API server is running
- Verify network connectivity to API base URL
- Check firewall settings

### Timeout errors

- Increase timeout in api-server.js (default: 30s)
- Check upstream API response times
- Verify network latency

## Performance

### Targets

- p95 API response time: < 200ms (excluding upstream)
- Retry overhead: < 5s for 3 attempts
- Health check: < 10ms
- SSE connection: < 100ms

### Optimization Tips

- Use connection pooling for HTTP requests
- Enable response caching for read-heavy workloads
- Monitor metrics regularly
- Tune retry backoff parameters

## Security Considerations

### Current Implementation

- No authentication (suitable for local development)
- Trace IDs for debugging
- Input validation for tool arguments
- Error message sanitization

### Production Recommendations

- Add authentication (API keys, OAuth)
- Implement rate limiting
- Enable HTTPS for SSE
- Add request logging to file/service
- Implement CORS policies
- Validate all user inputs
- Add secrets management

## License

ISC License - see LICENSE file for details

## Support

- GitHub Issues: https://github.com/openSVM/idlhub/issues
- Documentation: https://github.com/openSVM/idlhub
- API Reference: See `llms.txt` in repository

## Related Documentation

- [IDLHub REST API](../api/README.md)
- [MCP Server (Local IDL)](./README.md)
- [Quick Start Guide](./QUICKSTART.md)
- [llms.txt](../llms.txt) - API specification
