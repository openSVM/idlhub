import { useState } from 'react';
import { useGuilds } from '../hooks/useProtocol';
import { useWallet } from '../context/WalletContext';
import './GuildsPage.css';

export default function GuildsPage() {
  const { connected } = useWallet();
  const { guilds, loading, error, refresh } = useGuilds();
  const [guildName, setGuildName] = useState('');

  const formatIDL = (value: bigint) => {
    return (Number(value) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatWallet = (pk: { toString: () => string }) => {
    const s = pk.toString();
    return `${s.slice(0, 4)}...${s.slice(-4)}`;
  };

  const handleCreateGuild = async (e: React.FormEvent) => {
    e.preventDefault();
    alert('Create guild functionality coming soon! Use the SDK directly.');
  };

  const handleJoinGuild = async (guildAddress: string) => {
    alert(`Join guild ${guildAddress.slice(0, 8)}... functionality coming soon!`);
  };

  return (
    <div className="guilds-page">
      <h1 className="page-title">Prediction Guilds</h1>

      {!connected && (
        <div className="connect-prompt">
          Connect your wallet to create or join guilds.
        </div>
      )}

      {/* Create Guild */}
      {connected && (
        <section className="create-guild">
          <h2>Create a Guild</h2>
          <form className="guild-form" onSubmit={handleCreateGuild}>
            <div className="form-group">
              <label>Guild Name</label>
              <input
                type="text"
                value={guildName}
                onChange={(e) => setGuildName(e.target.value)}
                placeholder="Enter guild name"
                maxLength={32}
                required
              />
            </div>
            <button type="submit" className="btn-create">Create Guild (10 IDL)</button>
          </form>
        </section>
      )}

      {/* Guild List */}
      <h2 className="section-title">Active Guilds</h2>
      {loading ? (
        <div className="loading">Loading guilds from chain...</div>
      ) : guilds.length === 0 ? (
        <div className="empty-state">No guilds found. Create the first one!</div>
      ) : (
        <section className="guilds-grid">
          {guilds.map(guild => (
            <div key={guild.address.toString()} className="guild-card">
              <div className="guild-header">
                <h3 className="guild-name">{guild.name}</h3>
                <span className="guild-members">{guild.memberCount} members</span>
              </div>
              <div className="guild-info">
                <div className="guild-stat">
                  <span className="label">Leader</span>
                  <span className="value">{formatWallet(guild.leader)}</span>
                </div>
                <div className="guild-stat">
                  <span className="label">Total Winnings</span>
                  <span className="value highlight">{formatIDL(guild.totalWinnings)} IDL</span>
                </div>
              </div>
              {connected && (
                <button
                  className="btn-join"
                  onClick={() => handleJoinGuild(guild.address.toString())}
                >
                  Join Guild
                </button>
              )}
            </div>
          ))}
        </section>
      )}

      {error && (
        <div className="error-banner">
          Error loading guilds: {error.message}
          <button onClick={refresh}>Retry</button>
        </div>
      )}
    </div>
  );
}
