import { useState } from 'react';
import BattlesPage from './BattlesPage';
import GuildsPage from './GuildsPage';
import ProtocolPage from './ProtocolPage';
import './CommunityPage.css';

type TabType = 'protocol' | 'battles' | 'guilds';

export default function CommunityPage() {
  const [activeTab, setActiveTab] = useState<TabType>('protocol');

  return (
    <div className="community-page">
      <div className="community-header">
        <h1 className="page-title">IDL Protocol</h1>
        <p className="page-subtitle">Prediction markets, social trading, and community governance</p>
      </div>

      <div className="community-tabs">
        <button
          className={`tab-btn ${activeTab === 'protocol' ? 'active' : ''}`}
          onClick={() => setActiveTab('protocol')}
        >
          Markets
        </button>
        <button
          className={`tab-btn ${activeTab === 'battles' ? 'active' : ''}`}
          onClick={() => setActiveTab('battles')}
        >
          1v1 Battles
        </button>
        <button
          className={`tab-btn ${activeTab === 'guilds' ? 'active' : ''}`}
          onClick={() => setActiveTab('guilds')}
        >
          Guilds
        </button>
      </div>

      <div className="community-content">
        {activeTab === 'protocol' && <ProtocolPage />}
        {activeTab === 'battles' && <BattlesPage />}
        {activeTab === 'guilds' && <GuildsPage />}
      </div>
    </div>
  );
}
