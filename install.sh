#!/bin/bash
#
# IDLHub MCP Server - Universal Installation Script
# 
# Usage:
#   curl -fsSL https://idlhub.com/mcp | sh
#   or
#   wget -qO- https://idlhub.com/mcp | sh
#
# This script will:
# - Detect your operating system
# - Check for and install required dependencies (Node.js, npm, git)
# - Clone the IDLHub repository
# - Install npm dependencies
# - Configure the MCP server
# - Provide integration instructions
#

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
REPO_URL="https://github.com/openSVM/idlhub.git"
INSTALL_DIR="${HOME}/.idlhub"
NODE_MIN_VERSION="14"

# Print functions
print_header() {
    echo ""
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}  IDLHub MCP Server - Universal Installer${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════${NC}"
    echo ""
}

print_step() {
    echo -e "${GREEN}▶${NC} $1"
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

# Detect OS
detect_os() {
    print_step "Detecting operating system..."
    
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        OS="linux"
        if [ -f /etc/os-release ]; then
            . /etc/os-release
            DISTRO=$ID
            print_info "Detected: Linux ($NAME)"
        else
            DISTRO="unknown"
            print_info "Detected: Linux (Unknown distribution)"
        fi
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        OS="macos"
        DISTRO="macos"
        print_info "Detected: macOS"
    elif [[ "$OSTYPE" == "cygwin" ]] || [[ "$OSTYPE" == "msys" ]] || [[ "$OSTYPE" == "win32" ]]; then
        OS="windows"
        DISTRO="windows"
        print_info "Detected: Windows (Git Bash/WSL recommended)"
    else
        OS="unknown"
        DISTRO="unknown"
        print_warning "Unknown OS: $OSTYPE"
    fi
}

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Compare versions
version_ge() {
    [ "$(printf '%s\n' "$1" "$2" | sort -V | head -n1)" = "$2" ]
}

# Check Node.js version
check_node_version() {
    if command_exists node; then
        NODE_VERSION=$(node --version | cut -d 'v' -f 2 | cut -d '.' -f 1)
        if version_ge "$NODE_VERSION" "$NODE_MIN_VERSION"; then
            print_success "Node.js v$NODE_VERSION detected (>= v$NODE_MIN_VERSION required)"
            return 0
        else
            print_warning "Node.js v$NODE_VERSION is too old (>= v$NODE_MIN_VERSION required)"
            return 1
        fi
    else
        return 1
    fi
}

# Install Node.js on macOS
install_node_macos() {
    print_step "Installing Node.js on macOS..."
    
    if command_exists brew; then
        print_info "Using Homebrew to install Node.js..."
        brew install node
    else
        print_warning "Homebrew not found. Installing Homebrew first..."
        /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
        brew install node
    fi
}

# Install Node.js on Linux
install_node_linux() {
    print_step "Installing Node.js on Linux..."
    
    case "$DISTRO" in
        ubuntu|debian|linuxmint|pop)
            print_info "Using apt to install Node.js..."
            # Install NodeSource repository
            curl -fsSL https://deb.nodesource.com/setup_lts.x | sudo -E bash -
            sudo apt-get install -y nodejs
            ;;
        fedora|rhel|centos)
            print_info "Using dnf/yum to install Node.js..."
            curl -fsSL https://rpm.nodesource.com/setup_lts.x | sudo bash -
            sudo dnf install -y nodejs || sudo yum install -y nodejs
            ;;
        arch|manjaro)
            print_info "Using pacman to install Node.js..."
            sudo pacman -S --noconfirm nodejs npm
            ;;
        opensuse*)
            print_info "Using zypper to install Node.js..."
            sudo zypper install -y nodejs npm
            ;;
        *)
            print_warning "Unsupported Linux distribution: $DISTRO"
            print_info "Please install Node.js >= v$NODE_MIN_VERSION manually from: https://nodejs.org/"
            print_info "Then re-run this script."
            exit 1
            ;;
    esac
}

# Install Node.js
install_node() {
    if check_node_version; then
        return 0
    fi
    
    print_step "Node.js >= v$NODE_MIN_VERSION is required but not found."
    
    case "$OS" in
        macos)
            install_node_macos
            ;;
        linux)
            install_node_linux
            ;;
        windows)
            print_error "Please install Node.js manually from: https://nodejs.org/"
            print_info "After installation, re-run this script."
            exit 1
            ;;
        *)
            print_error "Cannot auto-install Node.js on this OS."
            print_info "Please install Node.js >= v$NODE_MIN_VERSION from: https://nodejs.org/"
            exit 1
            ;;
    esac
    
    # Verify installation
    if check_node_version; then
        print_success "Node.js installed successfully!"
    else
        print_error "Node.js installation failed. Please install manually."
        exit 1
    fi
}

# Install git if needed
install_git() {
    if command_exists git; then
        print_success "Git is already installed"
        return 0
    fi
    
    print_step "Installing Git..."
    
    case "$OS" in
        macos)
            if command_exists brew; then
                brew install git
            else
                print_info "Please install Xcode Command Line Tools"
                xcode-select --install
            fi
            ;;
        linux)
            case "$DISTRO" in
                ubuntu|debian|linuxmint|pop)
                    sudo apt-get update && sudo apt-get install -y git
                    ;;
                fedora|rhel|centos)
                    sudo dnf install -y git || sudo yum install -y git
                    ;;
                arch|manjaro)
                    sudo pacman -S --noconfirm git
                    ;;
                opensuse*)
                    sudo zypper install -y git
                    ;;
            esac
            ;;
        windows)
            print_error "Please install Git from: https://git-scm.com/download/win"
            exit 1
            ;;
    esac
    
    if command_exists git; then
        print_success "Git installed successfully!"
    else
        print_error "Git installation failed. Please install manually."
        exit 1
    fi
}

# Clone or update repository
setup_repository() {
    print_step "Setting up IDLHub repository..."
    
    if [ -d "$INSTALL_DIR" ]; then
        print_info "IDLHub directory exists. Updating..."
        cd "$INSTALL_DIR"
        git fetch origin
        git reset --hard origin/main
        print_success "Repository updated!"
    else
        print_info "Cloning IDLHub repository to $INSTALL_DIR..."
        git clone "$REPO_URL" "$INSTALL_DIR"
        print_success "Repository cloned!"
    fi
}

# Install npm dependencies
install_dependencies() {
    print_step "Installing npm dependencies..."
    
    cd "$INSTALL_DIR"
    npm install --production
    
    print_success "Dependencies installed!"
}

# Create shell configuration
create_shell_config() {
    print_step "Configuring shell environment..."
    
    # Detect shell
    SHELL_NAME=$(basename "$SHELL")
    case "$SHELL_NAME" in
        bash)
            SHELL_RC="$HOME/.bashrc"
            ;;
        zsh)
            SHELL_RC="$HOME/.zshrc"
            ;;
        fish)
            SHELL_RC="$HOME/.config/fish/config.fish"
            ;;
        *)
            SHELL_RC="$HOME/.profile"
            ;;
    esac
    
    # Add to PATH if not already there
    if ! grep -q "idlhub" "$SHELL_RC" 2>/dev/null; then
        echo "" >> "$SHELL_RC"
        echo "# IDLHub MCP Server" >> "$SHELL_RC"
        echo "export PATH=\"\$PATH:$INSTALL_DIR/node_modules/.bin\"" >> "$SHELL_RC"
        echo "alias idlhub-mcp='node $INSTALL_DIR/mcp-server/src/index.js'" >> "$SHELL_RC"
        print_success "Added to $SHELL_RC"
    else
        print_info "Already configured in $SHELL_RC"
    fi
}

# Test installation
test_installation() {
    print_step "Testing installation..."
    
    cd "$INSTALL_DIR"
    
    # Quick test
    if npm test >/dev/null 2>&1; then
        print_success "All tests passed!"
    else
        print_warning "Some tests failed (this may be okay)"
    fi
}

# Print integration instructions
print_integration() {
    echo ""
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo -e "${GREEN}  Installation Complete! 🎉${NC}"
    echo -e "${GREEN}═══════════════════════════════════════════════════════════${NC}"
    echo ""
    echo -e "${BLUE}Installation Directory:${NC} $INSTALL_DIR"
    echo ""
    echo -e "${BLUE}Quick Start:${NC}"
    echo "  # Reload your shell configuration"
    echo "  source ~/.bashrc  # or ~/.zshrc"
    echo ""
    echo "  # Start the MCP server"
    echo "  cd $INSTALL_DIR"
    echo "  npm run mcp:start"
    echo ""
    echo -e "${BLUE}Claude Desktop Integration:${NC}"
    echo "  Add to: ~/Library/Application Support/Claude/claude_desktop_config.json"
    echo ""
    echo '  {'
    echo '    "mcpServers": {'
    echo '      "idlhub": {'
    echo '        "command": "node",'
    echo "        \"args\": [\"$INSTALL_DIR/mcp-server/src/index.js\"]"
    echo '      }'
    echo '    }'
    echo '  }'
    echo ""
    echo -e "${BLUE}Cline/VSCode Integration:${NC}"
    echo "  Add to Cline MCP settings:"
    echo ""
    echo '  {'
    echo '    "idlhub": {'
    echo '      "command": "node",'
    echo "      \"args\": [\"$INSTALL_DIR/mcp-server/src/index.js\"]"
    echo '    }'
    echo '  }'
    echo ""
    echo -e "${BLUE}Documentation:${NC}"
    echo "  Quick Start: $INSTALL_DIR/mcp-server/QUICKSTART.md"
    echo "  Full Docs:   $INSTALL_DIR/mcp-server/README.md"
    echo "  Cheat Sheet: $INSTALL_DIR/mcp-server/CHEATSHEET.md"
    echo ""
    echo -e "${BLUE}Need Help?${NC}"
    echo "  GitHub: https://github.com/openSVM/idlhub"
    echo "  Issues: https://github.com/openSVM/idlhub/issues"
    echo ""
}

# Main installation flow
main() {
    print_header
    
    # Check for non-interactive mode
    if [ ! -t 0 ]; then
        print_info "Running in non-interactive mode"
    fi
    
    # Detect OS
    detect_os
    
    # Install dependencies
    install_git
    install_node
    
    # Setup repository
    setup_repository
    
    # Install npm packages
    install_dependencies
    
    # Configure shell
    create_shell_config
    
    # Test installation
    test_installation
    
    # Print instructions
    print_integration
}

# Handle errors
trap 'print_error "Installation failed! Check the error messages above."' ERR

# Run main installation
main
