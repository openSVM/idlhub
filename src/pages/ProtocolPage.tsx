import { useEffect } from 'react';
import { useMarkets, useProtocolStats } from '../hooks/useProtocol';
import { useWallet } from '../context/WalletContext';
import './ProtocolPage.css';

export default function ProtocolPage() {
  const { connected } = useWallet();
  const { stats, loading: statsLoading } = useProtocolStats();
  const { markets, loading: marketsLoading } = useMarkets();

  // Handle hash navigation (e.g., #bet-titan)
  useEffect(() => {
    if (window.location.hash && !marketsLoading) {
      const hash = window.location.hash.substring(1); // Remove #
      const protocolId = hash.replace('bet-', '');

      // Find market for this protocol
      const targetMarket = markets.find(m => m.protocolId.toLowerCase() === protocolId.toLowerCase());
      if (targetMarket) {
        // Scroll to market card
        setTimeout(() => {
          const element = document.getElementById(`market-${protocolId}`);
          element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }, 100);
      }
    }
  }, [markets, marketsLoading]);

  const formatIDL = (value: bigint | undefined) => {
    if (value === undefined) return '...';
    return (Number(value) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const calculateOdds = (yes: bigint, no: bigint) => {
    const total = Number(yes) + Number(no);
    if (total === 0) return { yes: 50, no: 50 };
    return {
      yes: Math.round((Number(yes) / total) * 100),
      no: Math.round((Number(no) / total) * 100)
    };
  };

  const activeMarkets = markets.filter(m => !m.resolved);
  const resolvedMarkets = markets.filter(m => m.resolved);

  return (
    <div className="protocol-page">
      <h1 className="page-title">Prediction Markets</h1>

      {!connected && (
        <div className="connect-prompt">
          Connect your wallet to place bets on prediction markets.
        </div>
      )}

      {/* Protocol Stats */}
      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{statsLoading ? '...' : formatIDL(stats?.totalStaked)}</div>
          <div className="stat-label">Total Staked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeMarkets.length}</div>
          <div className="stat-label">Active Markets</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statsLoading ? '...' : formatIDL(stats?.rewardPool)}</div>
          <div className="stat-label">Reward Pool</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{statsLoading ? '...' : formatIDL(stats?.totalBurned)}</div>
          <div className="stat-label">Burned</div>
        </div>
      </section>

      {/* Active Markets */}
      <h2 className="section-title">Active Markets</h2>
      {marketsLoading ? (
        <div className="loading">Loading markets from chain...</div>
      ) : activeMarkets.length === 0 ? (
        <div className="empty-state">No active markets. Markets will appear when created.</div>
      ) : (
        <div className="markets-grid">
          {activeMarkets.map(market => {
            const odds = calculateOdds(market.totalYesAmount, market.totalNoAmount);
            const resolution = new Date(Number(market.resolutionTimestamp) * 1000);
            const pool = Number(market.totalYesAmount + market.totalNoAmount) / 1e9;

            return (
              <div
                key={market.address.toString()}
                id={`market-${market.protocolId.toLowerCase()}`}
                className="market-card"
              >
                <div className="market-protocol">{market.protocolId}</div>
                <div className="market-description">{market.description}</div>
                <div className="market-odds">
                  <button className="odds-btn yes">
                    <span className="odds-label">YES</span>
                    <span className="odds-value">{odds.yes}%</span>
                  </button>
                  <button className="odds-btn no">
                    <span className="odds-label">NO</span>
                    <span className="odds-value">{odds.no}%</span>
                  </button>
                </div>
                <div className="market-meta">
                  <span>Pool: {pool.toLocaleString()} IDL</span>
                  <span>Resolves: {resolution.toLocaleDateString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Resolved Markets */}
      {resolvedMarkets.length > 0 && (
        <>
          <h2 className="section-title">Resolved Markets</h2>
          <div className="markets-grid resolved">
            {resolvedMarkets.map(market => (
              <div
                key={market.address.toString()}
                id={`market-${market.protocolId.toLowerCase()}`}
                className="market-card resolved"
              >
                <div className="market-protocol">{market.protocolId}</div>
                <div className="market-description">{market.description}</div>
                <div className={`market-outcome ${market.outcome ? 'yes' : 'no'}`}>
                  Resolved: {market.outcome ? 'YES' : 'NO'}
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
