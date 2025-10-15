# IDLHUB.COM - Solana IDL Registry

idlhub - a comprehensive, searchable registry of Interface Definition Language (IDL) files for Solana protocols. This repository provides a centralized location for discovering and accessing IDLs across the Solana ecosystem.

## 🚀 Features

- **Comprehensive Coverage**: IDLs for 100+ Solana protocols including Jupiter, Orca, Marinade, Drift, Kamino, and many more
- **Web Interface**: Simple, intuitive web UI for searching and browsing protocols
- **Easy Export**: Select and download multiple IDLs at once
- **Organized Structure**: Clean directory layout with standardized naming
- **Searchable**: Filter by category, search by name or description
- **Extensible**: Easy to contribute new IDLs or update existing ones
- **🆕 MCP Server**: Model Context Protocol server for LLM and editor integration with schema lookup, code generation, and diagnostics

## 📁 Structure

```
idl-registry/
├── index.html          # Web UI for browsing and exporting IDLs
├── index.json          # Registry index with all protocol metadata
├── IDLs/              # Directory containing all IDL files
│   ├── jupiterIDL.json
│   ├── orcaIDL.json
│   ├── marinadeIDL.json
│   └── ...
├── mcp-server/        # Model Context Protocol server
│   ├── src/           # Server source code
│   ├── config.json    # Server configuration
│   └── README.md      # MCP server documentation
└── README.md
```

## 🌐 Usage

### Web Interface

1. Open `index.html` in your browser (or visit the hosted version)
2. Search for protocols by name or description
3. Filter by category (DEX, Lending, Derivatives, etc.)
4. Select protocols you're interested in
5. Click "Export Selected IDLs" to download them as a single JSON file

### Direct Access

Access IDL files directly from the `IDLs/` directory:

```bash
# Clone the repository
git clone https://github.com/openSVM/idl-registry.git

# Access a specific IDL
cat idl-registry/IDLs/jupiterIDL.json
```

### Programmatic Access

```javascript
// Load the registry index
const response = await fetch('https://raw.githubusercontent.com/openSVM/idl-registry/main/index.json');
const registry = await response.json();

// Find a specific protocol
const jupiter = registry.protocols.find(p => p.id === 'jupiter');

// Load its IDL
const idlResponse = await fetch(`https://raw.githubusercontent.com/openSVM/idl-registry/main/${jupiter.idlPath}`);
const idl = await idlResponse.json();
```

### Model Context Protocol (MCP) Server

IDLHub includes a **Model Context Protocol (MCP) server** that provides structured, high-performance access to IDL schemas, symbol lookup, code generation, and diagnostics. Perfect for LLM integration and editor tooling.

**One-Line Install:**

```bash
curl -fsSL https://idlhub.com/mcp | sh
```

Or if you have the repository already:

```bash
# Install dependencies
npm install

# Start the MCP server (stdio transport)
npm run mcp:start

# Or start with WebSocket transport
npm run mcp:websocket
```

**Features:**
- 📋 Schema listing & retrieval
- 🔍 Symbol lookup (types, instructions, accounts, enums)
- 💻 Code generation (TypeScript, Rust, Python, Anchor TS)
- ✅ IDL validation and diagnostics
- 🚀 High performance (p95 < 100ms)
- 🔌 Multiple transports (stdio, WebSocket)

**Integration Examples:**

```json
// Claude Desktop / Cline
{
  "mcpServers": {
    "idlhub": {
      "command": "node",
      "args": ["/path/to/idlhub/mcp-server/src/index.js"]
    }
  }
}
```

See [mcp-server/README.md](mcp-server/README.md) for complete documentation.

## 🚀 Deployment

### Netlify (Recommended)

Deploy IDLHub to Netlify with one click:

[![Deploy to Netlify](https://www.netlify.com/img/deploy/button.svg)](https://app.netlify.com/start/deploy?repository=https://github.com/openSVM/idlhub)

IDLHub includes a complete Netlify configuration (`netlify.toml`) with:
- Automatic redirects for the `/mcp` installation endpoint
- Optimized caching and security headers
- CDN distribution for fast global access

**Quick setup:**
1. Click the deploy button above
2. Configure environment variables for Qdrant (optional)
3. Deploy and get your custom domain

See [NETLIFY.md](NETLIFY.md) for detailed deployment instructions.

### Qdrant Integration

IDLHub supports Qdrant for enhanced search and discovery:

```bash
# Install dependencies
npm install

# Configure Qdrant credentials
cp .env.example .env
# Edit .env with your Qdrant URL and API key

# Initialize Qdrant collections
npm run qdrant:init
```

This enables:
- Semantic search across protocols
- Similar protocol discovery
- Fast metadata queries
- Search history tracking

Qdrant configuration is based on [aldrin-labs/openSVM](https://github.com/aldrin-labs/openSVM) for compatibility.

## 📦 Protocol Categories

- **DEX**: Decentralized exchanges (Orca, Raydium, Phoenix, OpenBook)
- **DEX Aggregator**: Liquidity aggregators (Jupiter)
- **Lending**: Lending protocols (Kamino, Solend, MarginFi)
- **Liquid Staking**: Staking solutions (Marinade, Jito, Sanctum)
- **Derivatives**: Futures and options (Drift, Zeta, Mango)
- **Launchpad**: Token launch platforms
- **Infrastructure**: Core protocols and tools
- And more...

## 🤝 Contributing

We welcome contributions! Here's how you can help:

### Adding a New IDL

1. Fork this repository
2. Add your IDL file to the `IDLs/` directory following the naming convention: `{protocol}IDL.json`
3. The IDL should follow the standard Anchor IDL format
4. Update `index.json` (or run the generation script)
5. Submit a pull request

### Updating an Existing IDL

1. Fork this repository
2. Update the IDL file in the `IDLs/` directory
3. Update the version and lastUpdated fields in `index.json`
4. Submit a pull request

### IDL Format

IDLs should follow the standard Anchor IDL format:

```json
{
  "version": "0.1.0",
  "name": "protocol_name",
  "instructions": [
    {
      "name": "instruction_name",
      "accounts": [...],
      "args": [...]
    }
  ],
  "accounts": [...],
  "types": [...],
  "metadata": {
    "address": "program_address"
  }
}
```

For protocols without available IDLs, we include placeholder files with:

```json
{
  "version": "0.1.0",
  "name": "protocol_name",
  "instructions": [],
  "accounts": [],
  "types": [],
  "metadata": {
    "note": "Placeholder - IDL not yet available. Contributions welcome."
  }
}
```

## 📊 Current Status

- **Total Protocols**: 101
- **IDLs Available**: 5 (Jupiter, Orca, Marinade, Drift, Kamino)
- **Placeholders**: 96 (awaiting community contributions)

## 🛠️ Development

### Regenerating index.json

If you add or modify IDL files, you can regenerate the index:

```bash
# Install dependencies (Node.js required)
npm install

# Regenerate index.json (script to be added)
npm run generate-index
```

### Testing Locally

```bash
# Serve the web interface locally
python3 -m http.server 8000
# or
npx serve .

# Open http://localhost:8000 in your browser
```

## 📝 Protocol List

The registry includes IDLs (or placeholders) for the following protocols:

- Acceleraytor, Adrena, Aldrin, Apricot, Arrow, Atrix, Balansol, Beluga, Blaze
- Bonfida, Byreal, Cashio, Clone, Crate, Crema, Cropper, Cyclos, Cykura
- DeltaOne, Dexlab, Dexterity, Drift, Ellipsis, EnjinStarter, Flash, FluxBeam
- Francium, Gauge, Gavel, GMX, Goki, GoonFi, GooseFX, Hawksight, Hubble
- Humidifi, Hxro, Invariant, Jet, Jito, Jupiter, Kamino, Kommunitas, Larix
- LaunchMyNFT, Lifinity, Lifinity V2, Magic Eden, Mango, Mango V3, MarginFi
- Marinade, Mercurial, Merkle Distributor, Meteora, Obric, OpenBook, Orca
- Parrot, Penguin, Permalock, Phoenix, Plasma, Pool Manager, Port, Prism
- Pump.fun, PumpSwap, Quarry, Ribbon, Saber, Saber Periphery, Sanctum, Saros
- Save, Sencha, Serum V2, Snapshots, Solanium, Solend, SolFi, Solrazr
- SolStarter, Stabble, Stable Swap, StarLaunch, Step, STEPN, Sunny
- Switchboard, Symmetry, Synthetify, Tessera V, Titan, Tribeca, Tulip, UXD
- Venko, Whirlpool, Yi, ZeroFi, ZeroOne, Zeta

## 🔗 Resources

- [Anchor Framework](https://www.anchor-lang.com/) - IDL standard for Solana
- [Solana Documentation](https://docs.solana.com/)
- [Program IDL Specification](https://www.anchor-lang.com/docs/idl)

## 📄 License

This project is released into the public domain under the Unlicense. See [LICENSE](LICENSE) for details.

## 🙏 Acknowledgments

Special thanks to all the Solana protocols and their teams for building the ecosystem. This registry is a community effort to make protocol integration easier for developers.

---

**Note**: Many IDLs are currently placeholders. We encourage the community and protocol teams to contribute actual IDL files. Together, we can build a comprehensive resource for the entire Solana ecosystem!