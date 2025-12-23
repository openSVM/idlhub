import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
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

  // Load protocols from static JSON (no API required - dev tool first!)
  useEffect(() => {
    const loadProtocols = async () => {
      try {
        const res = await fetch('/index.json');
        if (!res.ok) throw new Error('Failed to load registry data');
        const data = await res.json();

        setAllProtocols(data.idls || []);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load protocols:', err);
        setError('Failed to load registry data from /index.json');
        setLoading(false);
      }
    };

    loadProtocols();
  }, []);

  // Load IDL when protocol selected (from static files in IDLs/)
  useEffect(() => {
    if (!currentProtocolId) {
      setIdlData(null);
      return;
    }

    const loadIDL = async () => {
      try {
        const res = await fetch(`/IDLs/${currentProtocolId}.json`);
        if (!res.ok) throw new Error('IDL not found');
        const data = await res.json();
        setIdlData({ idl: data });
      } catch (err) {
        console.error('Failed to load IDL:', err);
        setIdlData(null);
      }
    };

    loadIDL();
  }, [currentProtocolId]);

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

  // Download selected protocols
  const downloadSelected = async () => {
    if (selectedProtocols.size === 0) return;

    setDownloadingBulk(true);
    setDownloadProgress(0);

    const total = selectedProtocols.size;
    let completed = 0;

    for (const protocolId of selectedProtocols) {
      await downloadIDL(protocolId);
      completed++;
      setDownloadProgress(Math.round((completed / total) * 100));
      // Small delay between downloads
      await new Promise(resolve => setTimeout(resolve, 200));
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

  // Download IDL (from static files)
  const downloadIDL = async (protocolId: string) => {
    try {
      const res = await fetch(`/IDLs/${protocolId}.json`);
      if (!res.ok) throw new Error('IDL not found');
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
      console.error('Failed to download IDL:', error);
      alert('Failed to download IDL');
    }
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
            <button
              className="action-btn primary"
              onClick={downloadSelected}
              disabled={downloadingBulk}
            >
              {downloadingBulk
                ? `Downloading... ${downloadProgress}%`
                : `Download Selected (${selectedProtocols.size})`
              }
            </button>
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
                  href={`/app/#bet-${protocol.id}`}
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
                  <div key={i} className="detail-item">
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
    </div>
  );
}
