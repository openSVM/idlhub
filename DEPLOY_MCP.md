# Deploy MCP Server (24/7)

The MCP server must run 24/7 for AI agents to access the IDL registry.

## Option 1: PM2 (Local/VPS)

Install PM2:
```bash
npm install -g pm2
```

Start MCP server:
```bash
cd ~/aldrin/idlhub
pm2 start ecosystem.config.cjs
pm2 save
pm2 startup  # Enable auto-start on system boot
```

Monitor:
```bash
pm2 status
pm2 logs idlhub-mcp
pm2 monit
```

## Option 2: Netlify Functions (Serverless)

The MCP server can run as Netlify Function at `/.netlify/functions/mcp`

Create `netlify/functions/mcp.js`:
```javascript
import apiServer from '../../mcp-server/src/api-server.js';

export const handler = apiServer;
```

Then access at: `https://idlhub.com/.netlify/functions/mcp`

## Option 3: Railway/Render/Fly.io

Deploy as standalone service with:
- Command: `npm run mcp:api`
- Port: 3001
- Env vars: `QDRANT_URL`, `QDRANT_API_KEY`

## Testing

```bash
curl -X POST https://idlhub.com/api/mcp \\
  -H "Content-Type: application/json" \\
  -d '{"jsonrpc":"2.0","method":"tools/list","id":1}'
```

Should return list of available tools (list_idls, search_idls, get_idl, etc.)
