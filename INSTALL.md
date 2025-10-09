# IDLHub MCP Server - Installation Script

This directory contains the universal installation script for the IDLHub MCP Server.

## Quick Install

The easiest way to install the IDLHub MCP Server is using our one-line installer:

```bash
curl -fsSL https://idlhub.com/mcp | sh
```

Or with wget:

```bash
wget -qO- https://idlhub.com/mcp | sh
```

## What the Script Does

The installation script will:

1. **Detect your operating system** (Linux, macOS, Windows/WSL)
2. **Check for dependencies** (Node.js >= v14, npm, git)
3. **Install missing dependencies** automatically
4. **Clone the IDLHub repository** to `~/.idlhub`
5. **Install npm packages** required for the MCP server
6. **Configure your shell** environment
7. **Test the installation** to ensure everything works
8. **Provide integration instructions** for Claude Desktop, Cline, etc.

## Supported Platforms

### macOS
- ✅ macOS 10.15+ (Catalina and later)
- ✅ Apple Silicon (M1/M2/M3) and Intel
- ✅ Automatic dependency installation via Homebrew

### Linux
- ✅ Ubuntu 18.04+
- ✅ Debian 10+
- ✅ Fedora 30+
- ✅ RHEL/CentOS 7+
- ✅ Arch Linux
- ✅ openSUSE
- ✅ Linux Mint
- ✅ Pop!_OS

### Windows
- ✅ Windows 10/11 with WSL2 (recommended)
- ✅ Git Bash
- ⚠️ Manual Node.js installation required

## Dependencies

The script will automatically install these if missing:

- **Node.js** >= v14 (LTS recommended)
- **npm** (included with Node.js)
- **git** (for cloning the repository)

## Installation Directory

By default, the MCP server is installed to:

```
~/.idlhub/
```

This includes:
- The IDLHub repository with all IDL files
- MCP server source code
- Documentation
- Examples and tests

## Manual Installation

If you prefer to install manually or the script doesn't work on your system:

```bash
# Clone the repository
git clone https://github.com/openSVM/idlhub.git ~/.idlhub
cd ~/.idlhub

# Install dependencies
npm install

# Test the installation
npm test

# Start the server
npm run mcp:start
```

## Hosting the Script

To host this script at `https://idlhub.com/mcp`, you have several options:

### Option 1: GitHub Pages (Recommended)

1. The script is already in the repository as `install.sh`
2. Configure GitHub Pages to serve from the root directory
3. Access via: `https://raw.githubusercontent.com/openSVM/idlhub/main/install.sh`
4. Set up a redirect from `idlhub.com/mcp` to the raw GitHub URL

### Option 2: Cloudflare Pages

1. Connect your repository to Cloudflare Pages
2. Set build command: `echo ""`
3. Set output directory: `/`
4. Configure a redirect:
   - From: `/mcp`
   - To: `/install.sh`
   - Status: 200 (not 301/302)

### Option 3: Custom Server

1. Upload `install.sh` to your web server
2. Configure nginx/apache to serve it with proper headers:

```nginx
location /mcp {
    alias /path/to/install.sh;
    default_type text/plain;
    add_header Content-Type "text/x-shellscript; charset=utf-8";
    add_header X-Content-Type-Options "nosniff";
}
```

### Option 4: Using a CDN

Point `idlhub.com/mcp` to:
```
https://cdn.jsdelivr.net/gh/openSVM/idlhub@main/install.sh
```

## Security Considerations

The installation script:

- ✅ Uses HTTPS for all downloads
- ✅ Verifies git repository authenticity
- ✅ Does not require sudo except for system package managers
- ✅ Installs to user's home directory by default
- ✅ Shows all commands before executing
- ✅ Has error handling and rollback

Users should always:
- Review the script before running
- Use HTTPS (`-fsSL` flags with curl)
- Run from trusted sources only

## Troubleshooting

### Permission Denied

If you get "permission denied" errors:

```bash
# Make the script executable
chmod +x install.sh
./install.sh
```

### Node.js Version Too Old

```bash
# The script will attempt to upgrade automatically
# Or manually upgrade Node.js from: https://nodejs.org/
```

### Installation Fails

```bash
# Try manual installation
git clone https://github.com/openSVM/idlhub.git ~/.idlhub
cd ~/.idlhub
npm install
npm test
```

### Can't Connect to GitHub

```bash
# Check your internet connection
# Try using a VPN if GitHub is blocked
# Or download the repository manually
```

## Updating

To update an existing installation:

```bash
# Re-run the installation script
curl -fsSL https://idlhub.com/mcp | sh

# Or manually update
cd ~/.idlhub
git pull origin main
npm install
```

## Uninstalling

To remove the MCP server:

```bash
# Remove the installation directory
rm -rf ~/.idlhub

# Remove shell configuration (optional)
# Edit ~/.bashrc or ~/.zshrc and remove IDLHub entries
```

## Environment Variables

The script respects these environment variables:

- `INSTALL_DIR` - Custom installation directory (default: `~/.idlhub`)
- `NODE_MIN_VERSION` - Minimum Node.js version (default: `14`)

Example:
```bash
INSTALL_DIR=~/custom/path curl -fsSL https://idlhub.com/mcp | sh
```

## Testing the Script Locally

Before hosting publicly, test the script:

```bash
# Test locally
bash install.sh

# Test with curl
curl -fsSL http://localhost:8000/install.sh | sh

# Test error handling
bash -x install.sh  # Debug mode
```

## Support

- **Issues**: https://github.com/openSVM/idlhub/issues
- **Discussions**: https://github.com/openSVM/idlhub/discussions
- **Documentation**: See `mcp-server/README.md`

## License

This script is part of the IDLHub project and is released into the public domain under the Unlicense.
