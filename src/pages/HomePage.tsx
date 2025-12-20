import { Link } from 'react-router-dom';
import { useProtocolStats } from '../hooks/useProtocol';
import './HomePage.css';

export default function HomePage() {
  const { stats, loading, error } = useProtocolStats();

  const formatIDL = (value: bigint | undefined) => {
    if (value === undefined) return '...';
    return (Number(value) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  return (
    <div className="home-page">
      <section className="hero">
        <h1>IDL Protocol</h1>
        <p className="hero-subtitle">
          Stake $IDL. Predict DeFi metrics. Earn rewards.
        </p>
        <div className="hero-actions">
          <Link to="/protocol" className="btn btn-primary">Start Trading</Link>
          <Link to="/docs" className="btn btn-secondary">Read Docs</Link>
        </div>
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : formatIDL(stats?.totalStaked)} IDL
          </div>
          <div className="stat-label">Total Staked</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : formatIDL(stats?.totalVeSupply)} veIDL
          </div>
          <div className="stat-label">Vote Escrow Supply</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : formatIDL(stats?.rewardPool)} IDL
          </div>
          <div className="stat-label">Reward Pool</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {loading ? '...' : formatIDL(stats?.totalBurned)} IDL
          </div>
          <div className="stat-label">Total Burned</div>
        </div>
      </section>

      <section className="features">
        <h2 className="section-title">Core Features</h2>
        <div className="features-grid">
          <div className="feature-card">
            <div className="feature-icon">$</div>
            <h3>Stake & Lock</h3>
            <p>Lock IDL for veIDL. Longer locks = more voting power and fee share.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">?</div>
            <h3>Prediction Markets</h3>
            <p>Bet on Solana DeFi metrics: TVL, volume, users. Commit-reveal prevents MEV.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">X</div>
            <h3>1v1 Battles</h3>
            <p>Challenge anyone to a prediction duel. Winner takes all.</p>
          </div>
          <div className="feature-card">
            <div className="feature-icon">#</div>
            <h3>Guilds</h3>
            <p>Pool resources with friends. Share winnings. Climb the leaderboard.</p>
          </div>
        </div>
      </section>

      {error && (
        <div className="error-banner">
          Failed to fetch protocol data. Please check your RPC connection.
        </div>
      )}
    </div>
  );
}
