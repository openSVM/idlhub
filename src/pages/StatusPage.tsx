import { useState, useEffect } from 'react';
import { useProtocolStats } from '../hooks/useProtocol';
import { useWallet } from '../context/WalletContext';
import './StatusPage.css';

interface VerificationStatus {
  service: string;
  version: string;
  status: string;
  verification: {
    totalProtocols: number;
    verified: number;
    partial: number;
    placeholder: number;
    noProgram: number;
    lastRun: string;
  };
  txVerification: {
    timestamp: string;
    totalChecked: number;
    verified: number;
    partial: number;
    outdated: number;
    invalid: number;
    errors: number;
  } | null;
}

interface TxVerificationResult {
  timestamp: string;
  totalChecked: number;
  verified: number;
  protocols: Array<{
    protocolId: string;
    status: string;
    idlName: string;
    instructionCount: number;
    txDecoded: number;
    txFailed: number;
    details: {
      successRate?: number;
      coveragePercent?: number;
      message?: string;
    };
    decodedInstructions: Record<string, number>;
  }>;
}

export default function StatusPage() {
  const { connection } = useWallet();
  const { stats, loading, error } = useProtocolStats();
  const [verificationStatus, setVerificationStatus] = useState<VerificationStatus | null>(null);
  const [txResults, setTxResults] = useState<TxVerificationResult | null>(null);
  const [statusLoading, setStatusLoading] = useState(true);

  useEffect(() => {
    // Fetch verification status from API
    const fetchStatus = async () => {
      try {
        const [statusRes, txRes] = await Promise.all([
          fetch('/api/status'),
          fetch('/api/status/tx-verification'),
        ]);

        if (statusRes.ok) {
          const data = await statusRes.json();
          setVerificationStatus(data);
        }

        if (txRes.ok) {
          const data = await txRes.json();
          if (data.protocols) {
            setTxResults(data);
          }
        }
      } catch (err) {
        console.error('Failed to fetch verification status:', err);
      } finally {
        setStatusLoading(false);
      }
    };

    fetchStatus();
  }, []);

  const formatIDL = (value: bigint | undefined) => {
    if (value === undefined) return '...';
    return (Number(value) / 1e9).toLocaleString(undefined, { maximumFractionDigits: 2 });
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString();
  };

  const getStatusClass = (status: string) => {
    switch (status) {
      case 'verified': return 'online';
      case 'partial': return 'warning';
      case 'outdated':
      case 'invalid': return 'offline';
      default: return 'neutral';
    }
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

      {/* IDL Registry Verification */}
      <section className="verification-section">
        <h2 className="section-title">IDL Registry Verification</h2>

        {statusLoading ? (
          <div className="loading-state">Loading verification status...</div>
        ) : verificationStatus ? (
          <div className="verification-grid">
            <div className="status-card">
              <h2>Program Verification</h2>
              <div className={`status-value ${verificationStatus.verification.verified > 0 ? 'online' : 'warning'}`}>
                {verificationStatus.verification.verified} / {verificationStatus.verification.totalProtocols}
              </div>
              <div className="status-detail">Programs exist on-chain</div>
            </div>

            <div className="status-card">
              <h2>Placeholder IDLs</h2>
              <div className="status-value neutral">{verificationStatus.verification.placeholder}</div>
              <div className="status-detail">Awaiting community upload</div>
            </div>

            {verificationStatus.txVerification && (
              <>
                <div className="status-card">
                  <h2>TX Verified</h2>
                  <div className="status-value online">
                    {verificationStatus.txVerification.verified} / {verificationStatus.txVerification.totalChecked}
                  </div>
                  <div className="status-detail">IDLs decode real txs</div>
                </div>

                <div className="status-card">
                  <h2>Last Verified</h2>
                  <div className="status-value">{formatDate(verificationStatus.txVerification.timestamp)}</div>
                </div>
              </>
            )}
          </div>
        ) : (
          <div className="error-state">Failed to load verification status</div>
        )}
      </section>

      {/* Transaction Verification Details */}
      {txResults && txResults.protocols && txResults.protocols.length > 0 && (
        <section className="tx-verification-section">
          <h2 className="section-title">Transaction Parsing Results</h2>
          <p className="section-description">
            IDLs verified by decoding real on-chain transactions
          </p>

          <div className="tx-results-table">
            <table>
              <thead>
                <tr>
                  <th>Protocol</th>
                  <th>Status</th>
                  <th>Success Rate</th>
                  <th>Coverage</th>
                  <th>Instructions Decoded</th>
                </tr>
              </thead>
              <tbody>
                {txResults.protocols.map((p) => (
                  <tr key={p.protocolId}>
                    <td className="protocol-name">{p.protocolId}</td>
                    <td>
                      <span className={`status-badge ${getStatusClass(p.status)}`}>
                        {p.status}
                      </span>
                    </td>
                    <td>{p.details.successRate !== undefined ? `${p.details.successRate}%` : '-'}</td>
                    <td>{p.details.coveragePercent !== undefined ? `${p.details.coveragePercent}%` : '-'}</td>
                    <td className="decoded-list">
                      {Object.keys(p.decodedInstructions).length > 0
                        ? Object.entries(p.decodedInstructions)
                            .map(([name, count]) => `${name} (${count})`)
                            .join(', ')
                        : p.details.message || '-'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

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
