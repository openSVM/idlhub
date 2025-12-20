import { Routes, Route } from 'react-router-dom';
import { WalletProvider } from './context/WalletContext';
import { ThemeProvider } from './context/ThemeContext';
import Layout from './components/Layout';
import HomePage from './pages/HomePage';
import RegistryPage from './pages/RegistryPage';
import ProtocolPage from './pages/ProtocolPage';
import BattlesPage from './pages/BattlesPage';
import GuildsPage from './pages/GuildsPage';
import StatusPage from './pages/StatusPage';
import DocsPage from './pages/DocsPage';
import TokenomicsPage from './pages/TokenomicsPage';

export default function App() {
  return (
    <ThemeProvider>
      <WalletProvider>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<HomePage />} />
            <Route path="registry" element={<RegistryPage />} />
            <Route path="protocol" element={<ProtocolPage />} />
            <Route path="battles" element={<BattlesPage />} />
            <Route path="guilds" element={<GuildsPage />} />
            <Route path="status" element={<StatusPage />} />
            <Route path="docs" element={<DocsPage />} />
            <Route path="tokenomics" element={<TokenomicsPage />} />
          </Route>
        </Routes>
      </WalletProvider>
    </ThemeProvider>
  );
}
