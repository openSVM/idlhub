import { Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import ErrorBoundary from './components/ErrorBoundary';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import RegistryPage from './pages/RegistryPage';
import ProtocolPage from './pages/ProtocolPage';
// import BattlesPage from './pages/BattlesPage';
// import GuildsPage from './pages/GuildsPage';
import StatusPage from './pages/StatusPage';
import DocsPage from './pages/DocsPage';
import TokenomicsPage from './pages/TokenomicsPage';
import SwapPage from './pages/SwapPage';
import AnalyticsPage from './pages/AnalyticsPage';

export default function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider>
        <WalletProvider>
        <Routes>
          {/* Standalone Registry Page */}
          <Route path="/registry" element={<RegistryPage />} />

          {/* Other pages with layout */}
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="protocol" element={<ProtocolPage />} />
            {/* <Route path="battles" element={<BattlesPage />} /> */}
            {/* <Route path="guilds" element={<GuildsPage />} /> */}
            <Route path="swap" element={<SwapPage />} />
            <Route path="analytics" element={<AnalyticsPage />} />
            <Route path="status" element={<StatusPage />} />
            <Route path="docs" element={<DocsPage />} />
            <Route path="tokenomics" element={<TokenomicsPage />} />
          </Route>
        </Routes>
        </WalletProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}
