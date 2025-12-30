import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import { useAMM, usePoolState } from '../hooks/useAMM';
import './SwapPage.css';

interface FaucetConfig {
  tokens: {
    bags: { devnet: string; mainnet: string; symbol: string };
    pump: { devnet: string; mainnet: string; symbol: string };
  };
  tiers: Array<{ minHolding: string; airdrop: string }>;
  defaultAirdrop: string;
}

interface FaucetCheck {
  wallet: string;
  mainnet: { bags: string; pump: string; total: string };
  airdrop: { bags: string; pump: string; total: string };
  canClaim: boolean;
  cooldownRemaining: number;
  tier: string;
}

export default function SwapPage() {
  const { connected, publicKey } = useWallet();
  const { pool, loading: poolLoading, error: poolError } = usePoolState();
  const { getSwapQuote, swap } = useAMM();

  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<'token0' | 'token1'>('token0');
  const [slippage, setSlippage] = useState(0.5);
  const [swapping, setSwapping] = useState(false);

  // Faucet state
  const [faucetConfig, setFaucetConfig] = useState<FaucetConfig | null>(null);
  const [faucetCheck, setFaucetCheck] = useState<FaucetCheck | null>(null);
  const [claiming, setClaiming] = useState(false);
  const [claimResult, setClaimResult] = useState<string | null>(null);

  // Load faucet config
  useEffect(() => {
    fetch('/api/faucet/config')
      .then(res => res.json())
      .then(data => {
        if (!data.error) setFaucetConfig(data);
      })
      .catch(() => {});
  }, []);

  // Check wallet eligibility when connected
  useEffect(() => {
    if (connected && publicKey) {
      fetch(`/api/faucet/check/${publicKey.toString()}`)
        .then(res => res.json())
        .then(data => {
          if (!data.error) setFaucetCheck(data);
        })
        .catch(() => {});
    } else {
      setFaucetCheck(null);
    }
  }, [connected, publicKey]);

  const handleClaim = async () => {
    if (!connected || !publicKey) return;

    setClaiming(true);
    setClaimResult(null);

    try {
      const res = await fetch('/api/faucet/claim', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ wallet: publicKey.toString() }),
      });

      const data = await res.json();

      if (data.success) {
        setClaimResult(`Airdrop received: ${data.airdrop.bags} BAGS + ${data.airdrop.pump} PUMP`);
        // Refresh check
        const checkRes = await fetch(`/api/faucet/check/${publicKey.toString()}`);
        const checkData = await checkRes.json();
        if (!checkData.error) setFaucetCheck(checkData);
      } else {
        setClaimResult(data.error || 'Claim failed');
      }
    } catch (err: any) {
      setClaimResult(`Error: ${err.message}`);
    } finally {
      setClaiming(false);
    }
  };

  const handleSwap = async () => {
    if (!connected || !pool || !fromAmount) return;

    try {
      setSwapping(true);
      const amountIn = BigInt(Math.floor(parseFloat(fromAmount) * 1e6));
      const quote = getSwapQuote(amountIn, fromToken, slippage * 100);

      if (!quote) {
        alert('Unable to get quote');
        return;
      }

      const signature = await swap(amountIn, quote.minimumReceived, fromToken);
      alert(`Swap successful! Signature: ${signature}`);
      setFromAmount('');
      setToAmount('');
    } catch (err: any) {
      console.error('Swap failed:', err);
      alert(`Swap failed: ${err.message}`);
    } finally {
      setSwapping(false);
    }
  };

  const handleFromAmountChange = (value: string) => {
    setFromAmount(value);
    if (!value || !pool) {
      setToAmount('');
      return;
    }

    const amountIn = BigInt(Math.floor(parseFloat(value) * 1e6));
    const quote = getSwapQuote(amountIn, fromToken, slippage * 100);
    if (quote) {
      setToAmount((Number(quote.amountOut) / 1e6).toFixed(6));
    }
  };

  const switchTokens = () => {
    setFromToken(fromToken === 'token0' ? 'token1' : 'token0');
    setFromAmount(toAmount);
    setToAmount(fromAmount);
  };

  const getTierLabel = (tier: string) => {
    switch (tier) {
      case 'whale': return '🐋 Whale';
      case 'holder': return '💎 Diamond Hands';
      case 'small': return '🌱 Early Supporter';
      default: return '🆕 New User';
    }
  };

  return (
    <div className="swap-page">
      <h1>BAGS ⟷ PUMP Swap</h1>
      <p className="swap-subtitle">StableSwap AMM on Devnet</p>

      {/* Faucet Section */}
      {faucetConfig && (
        <div className="faucet-section">
          <h2>Devnet Faucet</h2>
          <p className="faucet-description">
            Get free devnet tokens to test the AMM. Holders of mainnet BAGS/PUMP get larger airdrops!
          </p>

          {!connected ? (
            <div className="connect-prompt">
              Connect your wallet to claim devnet tokens
            </div>
          ) : faucetCheck ? (
            <div className="faucet-info">
              <div className="faucet-stats">
                <div className="faucet-stat">
                  <span className="label">Mainnet Holdings</span>
                  <span className="value">{faucetCheck.mainnet.total} IDL</span>
                </div>
                <div className="faucet-stat">
                  <span className="label">Your Tier</span>
                  <span className="value">{getTierLabel(faucetCheck.tier)}</span>
                </div>
                <div className="faucet-stat">
                  <span className="label">Airdrop Amount</span>
                  <span className="value">{faucetCheck.airdrop.total} tokens</span>
                </div>
              </div>

              {faucetCheck.canClaim ? (
                <button
                  className="claim-btn"
                  onClick={handleClaim}
                  disabled={claiming}
                >
                  {claiming ? 'Claiming...' : `Claim ${faucetCheck.airdrop.bags} BAGS + ${faucetCheck.airdrop.pump} PUMP`}
                </button>
              ) : (
                <div className="cooldown-notice">
                  Cooldown: {faucetCheck.cooldownRemaining} minutes remaining
                </div>
              )}

              {claimResult && (
                <div className={`claim-result ${claimResult.includes('Error') ? 'error' : 'success'}`}>
                  {claimResult}
                </div>
              )}
            </div>
          ) : (
            <div className="loading">Checking eligibility...</div>
          )}
        </div>
      )}

      {/* Pool Status */}
      {poolLoading && <div className="loading">Loading pool...</div>}
      {poolError && (
        <div className="pool-not-found">
          <h2>Pool Not Initialized</h2>
          <p>The BAGS/PUMP StableSwap pool hasn't been initialized on devnet yet.</p>
          <div className="pool-info">
            <div className="info-item">
              <strong>Program:</strong> 3AMM53MsJZy2Jvf7PeHHga3bsGjWV4TSaYz29WUtcdje
            </div>
            <div className="info-item">
              <strong>BAGS:</strong> {faucetConfig?.tokens.bags.devnet || 'Not configured'}
            </div>
            <div className="info-item">
              <strong>PUMP:</strong> {faucetConfig?.tokens.pump.devnet || 'Not configured'}
            </div>
          </div>
          <p className="note">
            Run <code>npm run devnet:init-pool</code> to initialize the pool.
          </p>
          <details className="technical-details">
            <summary>Technical Details</summary>
            <pre>{poolError}</pre>
          </details>
        </div>
      )}

      {/* Swap Interface */}
      {pool && (
        <>
          <div className="pool-stats">
            <div className="stat">
              <div className="label">BAGS Balance</div>
              <div className="value">{(Number(pool.balance0) / 1e6).toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="label">PUMP Balance</div>
              <div className="value">{(Number(pool.balance1) / 1e6).toLocaleString()}</div>
            </div>
            <div className="stat">
              <div className="label">Fee</div>
              <div className="value">{(Number(pool.feeBps) / 100).toFixed(2)}%</div>
            </div>
            <div className="stat">
              <div className="label">LP Supply</div>
              <div className="value">{(Number(pool.lpSupply) / 1e6).toLocaleString()}</div>
            </div>
          </div>

          <div className="swap-container">
            <div className="swap-input-group">
              <label>From</label>
              <input
                type="number"
                value={fromAmount}
                onChange={(e) => handleFromAmountChange(e.target.value)}
                placeholder="0.00"
                disabled={!connected || poolLoading}
              />
              <div className="token-label">{fromToken === 'token0' ? 'BAGS' : 'PUMP'}</div>
            </div>

            <button className="switch-btn" onClick={switchTokens} title="Switch tokens">
              ↓↑
            </button>

            <div className="swap-input-group">
              <label>To (estimated)</label>
              <input
                type="text"
                value={toAmount}
                placeholder="0.00"
                disabled
                readOnly
              />
              <div className="token-label">{fromToken === 'token0' ? 'PUMP' : 'BAGS'}</div>
            </div>

            <div className="slippage-control">
              <label>Slippage Tolerance</label>
              <div className="slippage-options">
                {[0.1, 0.5, 1.0].map(val => (
                  <button
                    key={val}
                    className={slippage === val ? 'active' : ''}
                    onClick={() => setSlippage(val)}
                  >
                    {val}%
                  </button>
                ))}
              </div>
            </div>

            <button
              className="swap-btn"
              onClick={handleSwap}
              disabled={!connected || !fromAmount || swapping || poolLoading}
            >
              {swapping ? 'Swapping...' : 'Swap'}
            </button>
          </div>
        </>
      )}

      {/* Mainnet Info */}
      <div className="mainnet-info">
        <h3>Mainnet Tokens</h3>
        <p>Hold these tokens on mainnet to get larger devnet airdrops:</p>
        <ul>
          <li><strong>BAGS-IDL:</strong> <code>8zdhHxthCFoigAGw4QRxWfXUWLY1KkMZ1r7CTcmiBAGS</code></li>
          <li><strong>PUMP-IDL:</strong> <code>4GihJrYJGQ9pjqDySTjd57y1h3nNkEZNbzJxCbispump</code></li>
        </ul>
      </div>
    </div>
  );
}
