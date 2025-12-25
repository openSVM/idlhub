import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import JSZip from 'jszip';
import './RegistryPage.css';

interface Protocol {
  id: string;
  name: string;
  description: string;
  category: string;
  idlPath: string;
  repo: string | null;
  status: string;
  version: string;
  lastUpdated: string;
  bounty?: {
    total: number;
    stakers: number;
  };
  metrics?: {
    users?: number;
    accounts?: number;
    tvl?: number;
  };
}

interface IDLData {
  idl?: {
    instructions?: any[];
    accounts?: any[];
    types?: any[];
    errors?: any[];
  };
  arweaveUrl?: string;
}

const THEMES = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'night', name: 'Night' },
  { id: 'terminal', name: 'Terminal' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'nord', name: 'Nord' },
  { id: 'onedark', name: 'One Dark' },
  { id: 'solarized', name: 'Solarized' },
  { id: 'solarized-light', name: 'Solarized Light' },
  { id: 'monokai-light', name: 'Monokai Light' },
  { id: 'dos', name: 'DOS' },
] as const;

export default function RegistryPage() {
  const { theme, setTheme } = useTheme();
  const [allProtocols, setAllProtocols] = useState<Protocol[]>([]);
  const [selectedProtocols, setSelectedProtocols] = useState<Set<string>>(new Set());
  const [bookmarkedProtocols, setBookmarkedProtocols] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('idlhub-bookmarks');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentProtocolId, setCurrentProtocolId] = useState<string | null>(null);
  const [idlData, setIdlData] = useState<IDLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [selectedInstruction, setSelectedInstruction] = useState<any | null>(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);

  // Load protocols from Arweave manifest
  useEffect(() => {
    const loadProtocols = async () => {
      try {
        const manifestRes = await fetch('/arweave/manifest.json');
        if (!manifestRes.ok) throw new Error('Failed to load Arweave manifest');
        const manifest = await manifestRes.json();

        // Load bounties
        let bounties: any = { bounties: {} };
        try {
          const bountiesRes = await fetch('/data/idl-bounties.json');
          if (bountiesRes.ok) bounties = await bountiesRes.json();
        } catch (e) {
          console.log('No bounties data available');
        }

        const protocols: Protocol[] = Object.entries(manifest.idls).map(([id, data]: [string, any]) => {
          const bountyData = bounties.bounties[id];
          return {
            id,
            name: data.name || id,
            description: `${data.name || id} Solana program`,
            category: data.category || 'defi',
            idlPath: `${manifest.gateway}/${data.txId}`,
            repo: data.repo || null,
            status: 'available',
            version: '1.0.0',
            lastUpdated: data.uploadedAt || '2025-12-19',
            bounty: bountyData ? {
              total: 1000 + bountyData.total_amount,
              stakers: bountyData.stakers?.length || 0
            } : undefined
          };
        });

        setAllProtocols(protocols);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load protocols from Arweave:', err);
        setError('Failed to load registry from Arweave');
        setLoading(false);
      }
    };

    loadProtocols();
  }, []);

  // Load IDL when protocol selected (from Arweave)
  useEffect(() => {
    if (!currentProtocolId) {
      setIdlData(null);
      return;
    }

    const loadIDL = async () => {
      try {
        const protocol = allProtocols.find(p => p.id === currentProtocolId);
        if (!protocol?.idlPath) throw new Error('IDL path not found');

        const res = await fetch(protocol.idlPath);
        if (!res.ok) throw new Error('Failed to fetch from Arweave');
        const data = await res.json();
        setIdlData({ idl: data, arweaveUrl: protocol.idlPath });
      } catch (err) {
        console.error('Failed to load IDL from Arweave:', err);
        setIdlData(null);
      }
    };

    loadIDL();
  }, [currentProtocolId, allProtocols]);

  // Filter protocols
  const filteredProtocols = useMemo(() => {
    return allProtocols.filter(protocol => {
      const matchesSearch = !searchQuery ||
        protocol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        protocol.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        protocol.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = currentCategory === 'all' ||
        (currentCategory === 'bookmarks' ? bookmarkedProtocols.has(protocol.id) :
        protocol.category?.toLowerCase() === currentCategory);

      return matchesSearch && matchesCategory;
    });
  }, [allProtocols, searchQuery, currentCategory, bookmarkedProtocols]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>(['all']);
    allProtocols.forEach(p => {
      if (p.category) cats.add(p.category.toLowerCase());
    });
    // Add bookmarks as a virtual category
    if (bookmarkedProtocols.size > 0) {
      cats.add('bookmarks');
    }
    return Array.from(cats);
  }, [allProtocols, bookmarkedProtocols]);

  // Stats
  const stats = useMemo(() => ({
    total: allProtocols.length,
    available: allProtocols.filter(p => p.status === 'available').length,
    selected: selectedProtocols.size
  }), [allProtocols, selectedProtocols]);

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('idlhub-bookmarks', JSON.stringify(Array.from(bookmarkedProtocols)));
  }, [bookmarkedProtocols]);

  // Toggle checkbox
  const toggleCheckbox = (protocolId: string) => {
    const newSelected = new Set(selectedProtocols);
    if (newSelected.has(protocolId)) {
      newSelected.delete(protocolId);
    } else {
      newSelected.add(protocolId);
    }
    setSelectedProtocols(newSelected);
  };

  // Toggle bookmark
  const toggleBookmark = (protocolId: string) => {
    const newBookmarks = new Set(bookmarkedProtocols);
    if (newBookmarks.has(protocolId)) {
      newBookmarks.delete(protocolId);
    } else {
      newBookmarks.add(protocolId);
    }
    setBookmarkedProtocols(newBookmarks);
  };

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedProtocols.size === filteredProtocols.length) {
      setSelectedProtocols(new Set());
    } else {
      setSelectedProtocols(new Set(filteredProtocols.map(p => p.id)));
    }
  };

  // Download selected protocols as ZIP
  const downloadSelected = async () => {
    if (selectedProtocols.size === 0) return;

    setDownloadingBulk(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      const allIDLs = [];
      const total = selectedProtocols.size;
      let completed = 0;

      for (const protocolId of selectedProtocols) {
        const protocol = allProtocols.find(p => p.id === protocolId);
        if (!protocol?.idlPath) continue;

        const res = await fetch(protocol.idlPath);
        if (!res.ok) continue;
        const data = await res.json();

        // Add individual IDL file to zip
        zip.file(`${protocolId}.json`, JSON.stringify(data, null, 2));

        // Collect for concatenated file
        allIDLs.push({
          protocol: protocolId,
          name: protocol.name,
          category: protocol.category,
          idl: data
        });

        completed++;
        setDownloadProgress(Math.round((completed / total) * 100));
      }

      // Add concatenated file for AI agents
      zip.file('all-idls-concatenated.json', JSON.stringify(allIDLs, null, 2));

      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `idlhub-${selectedProtocols.size}-protocols.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to create zip:', error);
      alert('Failed to download IDLs as ZIP');
    }

    setDownloadingBulk(false);
    setDownloadProgress(0);
  };

  // Select protocol to view details
  const selectProtocol = (protocolId: string, event: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox or buttons
    if (
      (event.target as HTMLElement).classList.contains('protocol-checkbox') ||
      (event.target as HTMLElement).classList.contains('icon-btn') ||
      (event.target as HTMLElement).tagName === 'A' ||
      (event.target as HTMLElement).tagName === 'BUTTON'
    ) {
      return;
    }

    // Toggle if same protocol
    if (currentProtocolId === protocolId) {
      closeDetail();
      return;
    }

    setCurrentProtocolId(protocolId);

    // Scroll detail panel into view after state update
    setTimeout(() => {
      const detailPanel = document.querySelector('.protocol-detail.active');
      if (detailPanel) {
        detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  // Close detail panel
  const closeDetail = () => {
    setCurrentProtocolId(null);
    setIdlData(null);
  };

  // Copy IDL content to clipboard
  const copyArweaveURLs = async () => {
    try {
      const idls = [];
      let completed = 0;

      for (const protocolId of selectedProtocols) {
        const protocol = allProtocols.find(p => p.id === protocolId);
        if (!protocol?.idlPath) continue;

        const res = await fetch(protocol.idlPath);
        if (!res.ok) continue;
        const data = await res.json();

        idls.push({
          protocol: protocolId,
          idl: data
        });
        completed++;
      }

      const content = JSON.stringify(idls, null, 2);
      await navigator.clipboard.writeText(content);
      alert(`Copied ${completed} IDLs to clipboard!`);
    } catch (error) {
      console.error('Failed to copy IDLs:', error);
      alert('Failed to copy IDLs to clipboard');
    }
  };

  // Download IDL (from Arweave)
  const downloadIDL = async (protocolId: string) => {
    try {
      const protocol = allProtocols.find(p => p.id === protocolId);
      if (!protocol?.idlPath) throw new Error('IDL path not found');

      const res = await fetch(protocol.idlPath);
      if (!res.ok) throw new Error('Failed to fetch from Arweave');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${protocolId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download IDL from Arweave:', error);
      alert('Failed to download IDL from Arweave');
    }
  };

  // Generate TypeScript code snippet for instruction
  const generateTypeScriptSnippet = (instruction: any, programId: string) => {
    const argsType = instruction.args?.map((arg: any) =>
      `  ${arg.name}: ${mapIDLTypeToTS(arg.type)};`
    ).join('\n') || '';

    const accountsList = instruction.accounts?.map((acc: any) =>
      `  ${acc.name}: PublicKey; // ${acc.isMut ? 'writable' : 'readonly'}${acc.isSigner ? ', signer' : ''}`
    ).join('\n') || '';

    return `import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';

// Instruction arguments
interface ${instruction.name}Args {
${argsType || '  // No arguments'}
}

// Account inputs
interface ${instruction.name}Accounts {
${accountsList || '  // No accounts'}
}

// Create instruction
async function create${instruction.name}Instruction(
  program: Program,
  args: ${instruction.name}Args,
  accounts: ${instruction.name}Accounts
): Promise<TransactionInstruction> {
  return await program.methods
    .${instruction.name}(${instruction.args?.map((a: any) => `args.${a.name}`).join(', ') || ''})
    .accounts(accounts)
    .instruction();
}`;
  };

  // Generate Rust code snippet for instruction
  const generateRustSnippet = (instruction: any, programId: string) => {
    const argsFields = instruction.args?.map((arg: any) =>
      `    pub ${arg.name}: ${mapIDLTypeToRust(arg.type)},`
    ).join('\n') || '';

    const accountsList = instruction.accounts?.map((acc: any) => {
      const attrs = [];
      if (acc.isMut) attrs.push('mut');
      if (acc.isSigner) attrs.push('signer');
      const attrStr = attrs.length > 0 ? `#[account(${attrs.join(', ')})]` : '#[account]';
      return `    ${attrStr}\n    pub ${acc.name}: AccountInfo<'info>,`;
    }).join('\n') || '';

    return `use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ${instruction.name}<'info> {
${accountsList || '    // No accounts'}
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ${instruction.name}Args {
${argsFields || '    // No arguments'}
}

pub fn ${instruction.name}(
    ctx: Context<${instruction.name}>,
    args: ${instruction.name}Args,
) -> Result<()> {
    // Implementation here
    Ok(())
}`;
  };

  // Generate C code snippet for instruction
  const generateCSnippet = (instruction: any, programId: string) => {
    const argsFields = instruction.args?.map((arg: any) =>
      `    ${mapIDLTypeToC(arg.type)} ${arg.name};`
    ).join('\n') || '';

    const accountsList = instruction.accounts?.map((acc: any, i: number) =>
      `    accounts[${i}] = ${acc.name}_account; // ${acc.isMut ? 'writable' : 'readonly'}${acc.isSigner ? ', signer' : ''}`
    ).join('\n') || '';

    return `#include <solana_sdk.h>

// Instruction arguments
typedef struct {
${argsFields || '    // No arguments'}
} ${instruction.name}_args_t;

// Create instruction
SolInstruction create_${instruction.name}_instruction(
    ${instruction.name}_args_t *args,
    SolAccountMeta *accounts,
    size_t num_accounts
) {
    // Serialize instruction data
    uint8_t data[1024];
    size_t data_len = 0;

    // Add instruction discriminator
    // ... serialize args

    return (SolInstruction){
        .program_id = (SolPubkey*)&program_id,
        .accounts = accounts,
        .account_len = num_accounts,
        .data = data,
        .data_len = data_len
    };
}`;
  };

  // Map IDL types to TypeScript
  const mapIDLTypeToTS = (type: any): string => {
    if (typeof type === 'string') {
      const typeMap: Record<string, string> = {
        'publicKey': 'PublicKey',
        'u8': 'number', 'u16': 'number', 'u32': 'number', 'u64': 'BN',
        'i8': 'number', 'i16': 'number', 'i32': 'number', 'i64': 'BN',
        'bool': 'boolean',
        'string': 'string',
        'bytes': 'Buffer',
      };
      return typeMap[type] || type;
    }
    if (type?.vec) return `${mapIDLTypeToTS(type.vec)}[]`;
    if (type?.option) return `${mapIDLTypeToTS(type.option)} | null`;
    if (type?.defined) return type.defined;
    return 'any';
  };

  // Map IDL types to Rust
  const mapIDLTypeToRust = (type: any): string => {
    if (typeof type === 'string') {
      const typeMap: Record<string, string> = {
        'publicKey': 'Pubkey',
        'u8': 'u8', 'u16': 'u16', 'u32': 'u32', 'u64': 'u64', 'u128': 'u128',
        'i8': 'i8', 'i16': 'i16', 'i32': 'i32', 'i64': 'i64', 'i128': 'i128',
        'bool': 'bool',
        'string': 'String',
        'bytes': 'Vec<u8>',
      };
      return typeMap[type] || type;
    }
    if (type?.vec) return `Vec<${mapIDLTypeToRust(type.vec)}>`;
    if (type?.option) return `Option<${mapIDLTypeToRust(type.option)}>`;
    if (type?.defined) return type.defined;
    return 'Unknown';
  };

  // Map IDL types to C
  const mapIDLTypeToC = (type: any): string => {
    if (typeof type === 'string') {
      const typeMap: Record<string, string> = {
        'publicKey': 'SolPubkey',
        'u8': 'uint8_t', 'u16': 'uint16_t', 'u32': 'uint32_t', 'u64': 'uint64_t',
        'i8': 'int8_t', 'i16': 'int16_t', 'i32': 'int32_t', 'i64': 'int64_t',
        'bool': 'bool',
        'string': 'char*',
        'bytes': 'uint8_t*',
      };
      return typeMap[type] || type;
    }
    if (type?.vec) return `${mapIDLTypeToC(type.vec)}*`;
    if (type?.option) return mapIDLTypeToC(type.option);
    if (type?.defined) return type.defined;
    return 'void*';
  };

  // Copy code to clipboard
  const copyCode = async (code: string, language: string) => {
    try {
      await navigator.clipboard.writeText(code);
      alert(`${language} code copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy code:', error);
      alert('Failed to copy code');
    }
  };

  // Open instruction modal
  const openInstructionModal = (instruction: any) => {
    setSelectedInstruction(instruction);
    setShowInstructionModal(true);
  };

  // Close instruction modal
  const closeInstructionModal = () => {
    setShowInstructionModal(false);
    setTimeout(() => setSelectedInstruction(null), 300);
  };

  // Format metrics
  const formatMetrics = (metrics?: Protocol['metrics']) => {
    if (!metrics) return null;

    const parts = [];
    if (metrics.users !== undefined && metrics.users !== null) {
      parts.push(`Users: ${metrics.users.toLocaleString()}`);
    }
    if (metrics.accounts !== undefined && metrics.accounts !== null) {
      parts.push(`Accounts: ${metrics.accounts.toLocaleString()}`);
    }
    if (metrics.tvl !== undefined && metrics.tvl !== null && metrics.tvl > 0) {
      const formattedTVL = metrics.tvl >= 1000000
        ? `$${(metrics.tvl / 1000000).toFixed(2)}M`
        : `$${metrics.tvl.toLocaleString()}`;
      parts.push(`TVL: ${formattedTVL}`);
    }

    if (parts.length === 0) return null;

    return (
      <div className="protocol-metrics" dangerouslySetInnerHTML={{
        __html: parts.map(p => p.replace(/: (.+)/, ': <span class="metric-value">$1</span>')).join(' | ')
      }} />
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="protocols-list">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading protocols...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="protocols-list">
          <div className="no-results">
            <h3>Failed to Load Protocols</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  const currentProtocol = allProtocols.find(p => p.id === currentProtocolId);

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <div>
              <h1>idlhub.com</h1>
              <p>Solana IDL Registry</p>
            </div>
          </div>
          <div className="header-actions">
            <nav className="nav-links">
              <Link to="/registry" className="nav-link active">Registry</Link>
              <Link to="/" className="nav-link">Protocol</Link>
              <Link to="/status" className="nav-link">Status</Link>
              <Link to="/docs" className="nav-link">Docs</Link>
              <Link to="/tokenomics" className="nav-link">$IDL</Link>
            </nav>
            <div className="theme-selector">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as typeof theme)}
                className="theme-select"
              >
                {THEMES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Protocols</div>
          </div>
          <div className="stat">
            <div className="stat-number">{stats.available}</div>
            <div className="stat-label">IDLs Available</div>
          </div>
          <div className="stat">
            <div className="stat-number">{stats.selected}</div>
            <div className="stat-label">Selected</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-section">
          <span className="filter-label">Filter by:</span>
          <div className="filter-buttons">
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${currentCategory === cat ? 'active' : ''}`}
                onClick={() => setCurrentCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="bulk-actions">
          <button className="action-btn" onClick={toggleSelectAll}>
            {selectedProtocols.size === filteredProtocols.length && filteredProtocols.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          {selectedProtocols.size > 0 && (
            <>
              <button
                className="action-btn"
                onClick={() => copyArweaveURLs()}
              >
                Copy IDLs ({selectedProtocols.size})
              </button>
              <button
                className="action-btn primary"
                onClick={downloadSelected}
                disabled={downloadingBulk}
              >
                {downloadingBulk
                  ? `Creating ZIP... ${downloadProgress}%`
                  : `Download ZIP (${selectedProtocols.size})`
                }
              </button>
            </>
          )}
        </div>
      </div>

      {/* Protocols List */}
      <div className="protocols-list">
        {filteredProtocols.length === 0 ? (
          <div className="no-results">
            <h3>No protocols found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          filteredProtocols.map(protocol => (
            <div
              key={protocol.id}
              className={`protocol-item ${currentProtocolId === protocol.id ? 'selected' : ''}`}
              onClick={(e) => selectProtocol(protocol.id, e)}
            >
              <input
                type="checkbox"
                className="protocol-checkbox"
                checked={selectedProtocols.has(protocol.id)}
                onChange={() => toggleCheckbox(protocol.id)}
              />
              <button
                className={`bookmark-btn ${bookmarkedProtocols.has(protocol.id) ? 'bookmarked' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  toggleBookmark(protocol.id);
                }}
                title={bookmarkedProtocols.has(protocol.id) ? 'Remove bookmark' : 'Bookmark protocol'}
              >
                ★
              </button>
              <div className="protocol-info">
                <div className="protocol-header">
                  <span className="protocol-name">{protocol.name}</span>
                  <span className={`protocol-badge badge-${protocol.status || 'placeholder'}`}>
                    {protocol.status || 'placeholder'}
                  </span>
                  <span className="category-badge">{protocol.category || 'Unknown'}</span>
                  {protocol.bounty && (
                    <span className="bounty-badge" title={`${protocol.bounty.stakers} community contributor${protocol.bounty.stakers !== 1 ? 's' : ''}`}>
                      💰 {protocol.bounty.total} IDL
                    </span>
                  )}
                </div>
                <div className="protocol-description">
                  {protocol.description || 'No description available'}
                </div>
                <div className="protocol-meta">
                  {protocol.repo && (
                    <>
                      <a href={protocol.repo} target="_blank" rel="noopener noreferrer">Repository</a>
                      {' • '}
                    </>
                  )}
                  Version {protocol.version || 'N/A'} • Updated {protocol.lastUpdated || 'N/A'}
                </div>
                {formatMetrics(protocol.metrics)}
              </div>
              <div className="protocol-actions">
                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    window.open(`/api/idl/${protocol.id}`, '_blank');
                  }}
                  title="View IDL"
                >
                  View IDL
                </button>
                <button
                  className="icon-btn"
                  onClick={(e) => {
                    e.stopPropagation();
                    downloadIDL(protocol.id);
                  }}
                  title="Download IDL"
                >
                  Download
                </button>
                <a
                  href={`/protocol#bet-${protocol.id}`}
                  className="icon-btn btn-bet"
                  title="Bet on Metrics"
                >
                  Bet on Metrics
                </a>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Detail Panel */}
      <div className={`protocol-detail ${currentProtocolId ? 'active' : ''}`}>
        <div className="protocol-detail-header">
          <span className="protocol-detail-title">{currentProtocol?.name || 'Protocol Details'}</span>
          <button className="protocol-detail-close" onClick={closeDetail}>
            Close [X]
          </button>
        </div>
        <div className="protocol-detail-content">
          <div className="detail-section">
            <div className="detail-section-title">Instructions</div>
            <div className="detail-list">
              {!idlData ? (
                <div className="detail-item">Loading...</div>
              ) : (idlData.idl?.instructions || []).length > 0 ? (
                (idlData.idl?.instructions || []).map((ix, i) => (
                  <div
                    key={i}
                    className="detail-item instruction-clickable"
                    onClick={() => openInstructionModal(ix)}
                  >
                    <span className="detail-item-name">{ix.name}</span>
                    <span className="detail-item-type">
                      {ix.args?.length || 0} args, {ix.accounts?.length || 0} accounts
                    </span>
                  </div>
                ))
              ) : (
                <div className="detail-item">No instructions</div>
              )}
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Accounts</div>
            <div className="detail-list">
              {!idlData ? (
                <div className="detail-item">Loading...</div>
              ) : (idlData.idl?.accounts || []).length > 0 ? (
                (idlData.idl?.accounts || []).map((acc, i) => (
                  <div key={i} className="detail-item">
                    <span className="detail-item-name">{acc.name}</span>
                  </div>
                ))
              ) : (
                <div className="detail-item">No accounts</div>
              )}
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Types</div>
            <div className="detail-list">
              {!idlData ? (
                <div className="detail-item">Loading...</div>
              ) : (idlData.idl?.types || []).length > 0 ? (
                (idlData.idl?.types || []).map((t, i) => (
                  <div key={i} className="detail-item">
                    <span className="detail-item-name">{t.name}</span>
                    <span className="detail-item-type">{t.type?.kind || 'type'}</span>
                  </div>
                ))
              ) : (
                <div className="detail-item">No types</div>
              )}
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Errors</div>
            <div className="detail-list">
              {!idlData ? (
                <div className="detail-item">Loading...</div>
              ) : (idlData.idl?.errors || []).length > 0 ? (
                (idlData.idl?.errors || []).map((e, i) => (
                  <div key={i} className="detail-item">
                    <span className="detail-item-name">{e.code}: {e.name}</span>
                    <span className="detail-item-type">{e.msg || ''}</span>
                  </div>
                ))
              ) : (
                <div className="detail-item">No errors defined</div>
              )}
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <button
            className="detail-btn"
            onClick={() => currentProtocolId && downloadIDL(currentProtocolId)}
          >
            Download IDL
          </button>
          <button
            className="detail-btn secondary"
            onClick={() => window.open(`/api/idl/${currentProtocolId}`, '_blank')}
          >
            View Raw JSON
          </button>
          {idlData?.arweaveUrl && (
            <a
              className="detail-btn secondary"
              href={idlData.arweaveUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Arweave
            </a>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <p>
          idlhub.com - Open source IDL registry for the Solana ecosystem •{' '}
          <a href="https://github.com/openSVM/idlhub" target="_blank" rel="noopener noreferrer">GitHub</a> •{' '}
          <a href="/docs.html">Documentation</a>
        </p>
        <p style={{ marginTop: '10px', fontSize: '12px' }}>
          Contributions welcome! Help us complete missing IDLs.
        </p>
      </div>

      {/* Instruction Detail Modal */}
      {showInstructionModal && selectedInstruction && (
        <div className="modal-overlay" onClick={closeInstructionModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedInstruction.name}</h2>
              <button className="modal-close" onClick={closeInstructionModal}>
                Close [X]
              </button>
            </div>
            <div className="modal-body">
              {/* Arguments */}
              <div className="instruction-section">
                <div className="instruction-section-title">Arguments ({selectedInstruction.args?.length || 0})</div>
                {(selectedInstruction.args?.length || 0) > 0 ? (
                  <table className="instruction-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInstruction.args.map((arg: any, argIdx: number) => (
                        <tr key={argIdx}>
                          <td><code>{arg.name}</code></td>
                          <td><code>{typeof arg.type === 'string' ? arg.type : JSON.stringify(arg.type)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="instruction-empty">No arguments</div>
                )}
              </div>

              {/* Accounts */}
              <div className="instruction-section">
                <div className="instruction-section-title">Accounts ({selectedInstruction.accounts?.length || 0})</div>
                {(selectedInstruction.accounts?.length || 0) > 0 ? (
                  <table className="instruction-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Writable</th>
                        <th>Signer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInstruction.accounts.map((acc: any, accIdx: number) => (
                        <tr key={accIdx}>
                          <td>{accIdx}</td>
                          <td><code>{acc.name}</code></td>
                          <td>{acc.isMut ? '✓' : '—'}</td>
                          <td>{acc.isSigner ? '✓' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="instruction-empty">No accounts</div>
                )}
              </div>

              {/* Code Snippets */}
              <div className="instruction-section">
                <div className="instruction-section-title">Code Snippets</div>
                <div className="code-snippets">
                  {/* TypeScript */}
                  <div className="code-snippet">
                    <div className="code-snippet-header">
                      <span className="code-snippet-lang">TypeScript</span>
                      <button
                        className="code-copy-btn"
                        onClick={() => copyCode(generateTypeScriptSnippet(selectedInstruction, currentProtocol?.id || ''), 'TypeScript')}
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="code-snippet-content"><code>{generateTypeScriptSnippet(selectedInstruction, currentProtocol?.id || '')}</code></pre>
                  </div>

                  {/* Rust */}
                  <div className="code-snippet">
                    <div className="code-snippet-header">
                      <span className="code-snippet-lang">Rust</span>
                      <button
                        className="code-copy-btn"
                        onClick={() => copyCode(generateRustSnippet(selectedInstruction, currentProtocol?.id || ''), 'Rust')}
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="code-snippet-content"><code>{generateRustSnippet(selectedInstruction, currentProtocol?.id || '')}</code></pre>
                  </div>

                  {/* C */}
                  <div className="code-snippet">
                    <div className="code-snippet-header">
                      <span className="code-snippet-lang">C</span>
                      <button
                        className="code-copy-btn"
                        onClick={() => copyCode(generateCSnippet(selectedInstruction, currentProtocol?.id || ''), 'C')}
                      >
                        Copy
                      </button>
                    </div>
                    <pre className="code-snippet-content"><code>{generateCSnippet(selectedInstruction, currentProtocol?.id || '')}</code></pre>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
