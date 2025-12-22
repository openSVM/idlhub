import { Outlet, Link, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useWallet } from '../context/WalletContext';
import './Layout.css';

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

export default function Layout() {
  const location = useLocation();
  const { theme, setTheme } = useTheme();
  const { connected, publicKey, connect, disconnect } = useWallet();

  const isActive = (path: string) => {
    if (path === '/' && location.pathname === '/') return true;
    if (path !== '/' && location.pathname.startsWith(path)) return true;
    return false;
  };

  const shortWallet = publicKey
    ? `${publicKey.toString().slice(0, 4)}...${publicKey.toString().slice(-4)}`
    : '';

  return (
    <div className="container">
      <header className="header">
        <div className="header-content">
          <div className="header-left">
            <Link to="/" className="logo">
              <span className="logo-text">IDL Protocol</span>
              <p>Stake | Vote | Bet | Earn</p>
            </Link>
          </div>
          <div className="header-actions">
            <nav className="nav-links">
              <Link to="/registry" className={`nav-link ${isActive('/registry') ? 'active' : ''}`}>
                Registry
              </Link>
              <Link to="/protocol" className={`nav-link ${isActive('/protocol') ? 'active' : ''}`}>
                Protocol
              </Link>
              <Link to="/battles" className={`nav-link ${isActive('/battles') ? 'active' : ''}`}>
                Battles
              </Link>
              <Link to="/guilds" className={`nav-link ${isActive('/guilds') ? 'active' : ''}`}>
                Guilds
              </Link>
              <Link to="/status" className={`nav-link ${isActive('/status') ? 'active' : ''}`}>
                Status
              </Link>
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
            <button
              className={`wallet-btn ${connected ? 'connected' : ''}`}
              onClick={connected ? disconnect : connect}
            >
              {connected ? shortWallet : 'Connect Wallet'}
            </button>
          </div>
        </div>
      </header>
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
