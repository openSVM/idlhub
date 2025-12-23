import { useState } from 'react';
import { useWallet } from '../context/WalletContext';
import { useAMM, usePoolState } from '../hooks/useAMM';
import './SwapPage.css';

export default function SwapPage() {
  const { connected } = useWallet();
  const { pool, loading: poolLoading, error: poolError } = usePoolState();
  const { getSwapQuote, swap } = useAMM();

  const [fromAmount, setFromAmount] = useState('');
  const [toAmount, setToAmount] = useState('');
  const [fromToken, setFromToken] = useState<'token0' | 'token1'>('token0');
  const [slippage, setSlippage] = useState(0.5);
  const [swapping, setSwapping] = useState(false);

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

  return (
    <div className="swap-page">
      <h1>Swap</h1>

      {!connected && (
        <div className="connect-prompt">
          Connect your wallet to start swapping
        </div>
      )}

      {poolLoading && <div className="loading">Loading pool...</div>}
      {poolError && (
        <div className="pool-not-found">
          <h2>Pool Not Initialized</h2>
          <p>The SOL/USDC StableSwap pool hasn't been initialized on-chain yet.</p>
          <div className="pool-info">
            <div className="info-item">
              <strong>Program:</strong> 3AMM53MsJZy2Jvf7PeHHga3bsGjWV4TSaYz29WUtcdje
            </div>
            <div className="info-item">
              <strong>Token 0:</strong> SOL (So11111111111111111111111111111111111111112)
            </div>
            <div className="info-item">
              <strong>Token 1:</strong> USDC (EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v)
            </div>
          </div>
          <p className="note">
            To initialize the pool, run: <code>anchor run init-pool</code> from the idlhub directory.
          </p>
          <details className="technical-details">
            <summary>Technical Details</summary>
            <pre>{poolError}</pre>
          </details>
        </div>
      )}

      {pool && (
        <>
          <div className="pool-stats">
            <div className="stat">
              <div className="label">Pool Balance (Token 0)</div>
              <div className="value">{(Number(pool.balance0) / 1e6).toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="label">Pool Balance (Token 1)</div>
              <div className="value">{(Number(pool.balance1) / 1e6).toFixed(2)}</div>
            </div>
            <div className="stat">
              <div className="label">Fee</div>
              <div className="value">{(Number(pool.feeBps) / 100).toFixed(2)}%</div>
            </div>
            <div className="stat">
              <div className="label">LP Supply</div>
              <div className="value">{(Number(pool.lpSupply) / 1e6).toFixed(2)}</div>
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
              <div className="token-label">{fromToken === 'token0' ? 'Token 0' : 'Token 1'}</div>
            </div>

            <button className="switch-btn" onClick={switchTokens}>
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
              <div className="token-label">{fromToken === 'token0' ? 'Token 1' : 'Token 0'}</div>
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
    </div>
  );
}
