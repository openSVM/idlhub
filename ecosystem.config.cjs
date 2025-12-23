/**
 * PM2 Ecosystem Configuration for IDLHub MCP Server
 *
 * Deploy:
 *   pm2 start ecosystem.config.cjs
 *   pm2 save
 *   pm2 startup (run once to enable auto-start on boot)
 */

module.exports = {
  apps: [{
    name: 'idlhub-mcp',
    script: './mcp-server/src/api-server.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production',
      MCP_PORT: process.env.MCP_PORT || 3001,
      QDRANT_URL: process.env.QDRANT_URL,
      QDRANT_API_KEY: process.env.QDRANT_API_KEY,
    },
    error_file: './logs/mcp-error.log',
    out_file: './logs/mcp-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10,
    min_uptime: '10s',
  }]
};
