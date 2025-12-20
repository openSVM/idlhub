import { useState } from 'react';
import { useBattles, useMarkets } from '../hooks/useProtocol';
import { useWallet } from '../context/WalletContext';
import './BattlesPage.css';

export default function BattlesPage() {
  const { connected, publicKey } = useWallet();
  const { battles, loading, error, refresh } = useBattles();
  const { markets } = useMarkets();

  const [opponent, setOpponent] = useState('');
  const [selectedMarket, setSelectedMarket] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');

  const formatIDL = (value: bigint) => {
    return (Number(value) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 0 });
  };

  const formatWallet = (pk: { toString: () => string }) => {
    const s = pk.toString();
    return `${s.slice(0, 4)}...${s.slice(-4)}`;
  };

  const getStatusLabel = (status: number) => {
    const labels = ['Pending', 'Active', 'Resolved', 'Cancelled'];
    return labels[status] || 'Unknown';
  };

  const getStatusClass = (status: number) => {
    const classes = ['pending', 'active', 'resolved', 'cancelled'];
    return classes[status] || '';
  };

  const activeBattles = battles.filter(b => b.status === 1);
  const pendingForMe = publicKey
    ? battles.filter(b => b.status === 0 && b.opponent.equals(publicKey))
    : [];

  const handleCreateBattle = async (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Integrate with SDK to create battle
    alert('Create battle functionality coming soon! Use the SDK directly.');
  };

  const handleAcceptBattle = async (battleAddress: string) => {
    // TODO: Integrate with SDK to accept battle
    alert(`Accept battle ${battleAddress.slice(0, 8)}... functionality coming soon!`);
  };

  return (
    <div className="battles-page">
      <h1 className="page-title">1v1 Prediction Battles</h1>

      {!connected && (
        <div className="connect-prompt">
          Connect your wallet to create or accept battle challenges.
        </div>
      )}

      {/* Stats */}
      <section className="battle-stats">
        <div className="stat-card">
          <div className="stat-value">{battles.length}</div>
          <div className="stat-label">Total Battles</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{activeBattles.length}</div>
          <div className="stat-label">Active Now</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">{pendingForMe.length}</div>
          <div className="stat-label">Pending Challenges</div>
        </div>
      </section>

      {/* Create Battle */}
      {connected && (
        <section className="create-battle">
          <h2>Challenge Someone</h2>
          <form className="battle-form" onSubmit={handleCreateBattle}>
            <div className="form-group">
              <label>Opponent Wallet</label>
              <input
                type="text"
                value={opponent}
                onChange={(e) => setOpponent(e.target.value)}
                placeholder="Abc123...xyz"
                required
              />
            </div>
            <div className="form-group">
              <label>Market</label>
              <select
                value={selectedMarket}
                onChange={(e) => setSelectedMarket(e.target.value)}
                required
              >
                <option value="">Select a market</option>
                {markets.map(m => (
                  <option key={m.address.toString()} value={m.address.toString()}>
                    {m.description}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Stake Amount (IDL)</label>
              <input
                type="number"
                value={stakeAmount}
                onChange={(e) => setStakeAmount(e.target.value)}
                placeholder="1000"
                min="1"
                required
              />
            </div>
            <button type="submit" className="btn-battle">Send Challenge</button>
          </form>
        </section>
      )}

      {/* Pending Challenges */}
      {pendingForMe.length > 0 && (
        <>
          <h2 className="section-title">Pending Challenges</h2>
          <section className="battles-grid">
            {pendingForMe.map(battle => (
              <div key={battle.address.toString()} className="battle-card pending">
                <div className="battle-header">
                  <span className="battle-market">{battle.market.toString().slice(0, 8)}...</span>
                  <span className={`battle-status ${getStatusClass(battle.status)}`}>
                    {getStatusLabel(battle.status)}
                  </span>
                </div>
                <div className="battle-arena">
                  <div className="fighter challenger">
                    <div className="fighter-label">Challenger</div>
                    <div className="fighter-wallet">{formatWallet(battle.challenger)}</div>
                    <div className={`fighter-side ${battle.challengerSide ? 'yes' : 'no'}`}>
                      {battle.challengerSide ? 'YES' : 'NO'}
                    </div>
                  </div>
                  <div className="vs-divider">VS</div>
                  <div className="fighter opponent">
                    <div className="fighter-label">You</div>
                    <div className="fighter-wallet">{formatWallet(battle.opponent)}</div>
                    <div className={`fighter-side ${!battle.challengerSide ? 'yes' : 'no'}`}>
                      {!battle.challengerSide ? 'YES' : 'NO'}
                    </div>
                  </div>
                </div>
                <div className="battle-stake">
                  <span className="stake-amount">{formatIDL(battle.stakeAmount)} IDL</span>
                  <span className="stake-total">each ({formatIDL(battle.stakeAmount * 2n)} IDL pot)</span>
                </div>
                <div className="battle-actions">
                  <button className="btn-accept" onClick={() => handleAcceptBattle(battle.address.toString())}>
                    Accept Battle
                  </button>
                  <button className="btn-decline">Decline</button>
                </div>
              </div>
            ))}
          </section>
        </>
      )}

      {/* Active Battles */}
      <h2 className="section-title">Active Battles</h2>
      {loading ? (
        <div className="loading">Loading battles from chain...</div>
      ) : activeBattles.length === 0 ? (
        <div className="empty-state">No active battles. Challenge someone!</div>
      ) : (
        <section className="battles-grid">
          {activeBattles.map(battle => (
            <div key={battle.address.toString()} className="battle-card active">
              <div className="battle-header">
                <span className="battle-market">{battle.market.toString().slice(0, 8)}...</span>
                <span className={`battle-status ${getStatusClass(battle.status)}`}>
                  {getStatusLabel(battle.status)}
                </span>
              </div>
              <div className="battle-arena">
                <div className="fighter challenger">
                  <div className="fighter-label">Challenger</div>
                  <div className="fighter-wallet">{formatWallet(battle.challenger)}</div>
                  <div className={`fighter-side ${battle.challengerSide ? 'yes' : 'no'}`}>
                    {battle.challengerSide ? 'YES' : 'NO'}
                  </div>
                </div>
                <div className="vs-divider">VS</div>
                <div className="fighter opponent">
                  <div className="fighter-label">Opponent</div>
                  <div className="fighter-wallet">{formatWallet(battle.opponent)}</div>
                  <div className={`fighter-side ${!battle.challengerSide ? 'yes' : 'no'}`}>
                    {!battle.challengerSide ? 'YES' : 'NO'}
                  </div>
                </div>
              </div>
              <div className="battle-stake">
                <span className="stake-amount">{formatIDL(battle.stakeAmount)} IDL</span>
                <span className="stake-total">each ({formatIDL(battle.stakeAmount * 2n)} IDL pot)</span>
              </div>
            </div>
          ))}
        </section>
      )}

      {error && (
        <div className="error-banner">
          Error loading battles: {error.message}
          <button onClick={refresh}>Retry</button>
        </div>
      )}
    </div>
  );
}
