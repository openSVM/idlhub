import { useProtocolStats } from '../hooks/useProtocol';
import { useWallet } from '../context/WalletContext';
import './StatusPage.css';

export default function StatusPage() {
  const { connection } = useWallet();
  const { stats, loading, error } = useProtocolStats();

  const formatIDL = (value: bigint | undefined) => {
    if (value === undefined) return '...';
    return (Number(value) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  return (
    <div className="status-page">
      <h1 className="page-title">Protocol Status</h1>

      <section className="status-grid">
        <div className="status-card">
          <h2>RPC Connection</h2>
          <div className="status-value online">Connected</div>
          <div className="status-detail">{connection.rpcEndpoint}</div>
        </div>

        <div className="status-card">
          <h2>Protocol State</h2>
          {loading ? (
            <div className="status-value">Loading...</div>
          ) : error ? (
            <div className="status-value offline">Error</div>
          ) : stats?.paused ? (
            <div className="status-value warning">Paused</div>
          ) : (
            <div className="status-value online">Active</div>
          )}
        </div>

        <div className="status-card">
          <h2>Total Value Locked</h2>
          <div className="status-value">{formatIDL(stats?.totalStaked)} IDL</div>
        </div>

        <div className="status-card">
          <h2>Total veIDL Supply</h2>
          <div className="status-value">{formatIDL(stats?.totalVeSupply)} veIDL</div>
        </div>

        <div className="status-card">
          <h2>Reward Pool</h2>
          <div className="status-value">{formatIDL(stats?.rewardPool)} IDL</div>
        </div>

        <div className="status-card">
          <h2>Total Fees Collected</h2>
          <div className="status-value">{formatIDL(stats?.totalFeesCollected)} IDL</div>
        </div>

        <div className="status-card">
          <h2>Total Burned</h2>
          <div className="status-value burn">{formatIDL(stats?.totalBurned)} IDL</div>
        </div>
      </section>

      <section className="contracts">
        <h2 className="section-title">Contract Addresses</h2>
        <div className="contract-list">
          <div className="contract-row">
            <span className="contract-name">IDL Protocol</span>
            <code className="contract-address">BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt</code>
          </div>
          <div className="contract-row">
            <span className="contract-name">IDL StableSwap</span>
            <code className="contract-address">EFsgmpbKifyA75ZY5NPHQxrtuAHHB6sYnoGkLi6xoTte</code>
          </div>
        </div>
      </section>
    </div>
  );
}
