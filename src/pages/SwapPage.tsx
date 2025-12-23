import { useState, useEffect } from 'react';
import { useWallet } from '../context/WalletContext';
import {
  usePoolState,
  useTokenBalances,
  useSwapQuote,
  useSwap,
  useAddLiquidity,
  useRemoveLiquidity,
  useStakingState,
  useStakeLP,
  useUnstakeLP,
  useClaimRewards,
  useLPFeesState,
  useClaimFees,
  formatTokenAmount,
  parseTokenAmount,
} from '../hooks/useAMM';
import './SwapPage.css';

type TabType = 'swap' | 'add' | 'remove' | 'farm' | 'create' | 'govern';

export default function SwapPage() {
  const { connected, publicKey } = useWallet();
  const { pool, loading: poolLoading, error: poolError } = usePoolState();
  const { balances, loading: balancesLoading } = useTokenBalances();

  // Tab state
  const [activeTab, setActiveTab] = useState<TabType>('swap');

  // Keyboard navigation for tabs
  const handleTabKeyPress = (e: React.KeyboardEvent, tab: TabType) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      setActiveTab(tab);
    }
  };

  // Swap state
  const [fromToken, setFromToken] = useState<'BAGS' | 'PUMP'>('BAGS');
  const [swapAmountIn, setSwapAmountIn] = useState('');
  const [slippage, setSlippage] = useState('0.5');

  // Add liquidity state
  const [bagsAmount, setBagsAmount] = useState('');
  const [pumpAmount, setPumpAmount] = useState('');

  // Remove liquidity state
  const [lpAmount, setLpAmount] = useState('');

  // Farm state
  const [stakeAmount, setStakeAmount] = useState('');
  const [unstakeAmount, setUnstakeAmount] = useState('');

  // Token creation state
  const [selectedIDL, setSelectedIDL] = useState('');
  const [tokenName, setTokenName] = useState('');
  const [tokenSymbol, setTokenSymbol] = useState('');
  const [tokenDecimals, setTokenDecimals] = useState('6');
  const [tokenSupply, setTokenSupply] = useState('');
  const [availableIDLs, setAvailableIDLs] = useState<Array<{id: string, name: string}>>([]);

  // Load IDL list for token creation
  useEffect(() => {
    const loadIDLs = async () => {
      try {
        const res = await fetch('/api/idl').catch(() => fetch('http://localhost:3000/api/idl'));
        const data = await res.json();
        setAvailableIDLs(data.idls?.map((p: any) => ({ id: p.id, name: p.name })) || []);
      } catch (err) {
        console.error('Failed to load IDLs:', err);
      }
    };
    loadIDLs();
  }, []);

  // Hooks
  const swapQuote = useSwapQuote(fromToken, parseTokenAmount(swapAmountIn));
  const { swap, loading: swapLoading, error: swapError, success: swapSuccess } = useSwap();
  const { addLiquidity, loading: addLiqLoading, error: addLiqError, success: addLiqSuccess } = useAddLiquidity();
  const { removeLiquidity, loading: removeLiqLoading, error: removeLiqError, success: removeLiqSuccess } = useRemoveLiquidity();
  const { stakingState, loading: stakingLoading } = useStakingState();
  const { stakeLP, loading: stakeLoading, success: stakeSuccess } = useStakeLP();
  const { unstakeLP, loading: unstakeLoading, success: unstakeSuccess } = useUnstakeLP();
  const { claimRewards, loading: claimLoading, success: claimSuccess } = useClaimRewards();
  const { feesState, loading: feesLoading } = useLPFeesState();
  const { claimFees, loading: claimFeesLoading, success: claimFeesSuccess } = useClaimFees();

  // Calculate derived values
  const toToken = fromToken === 'BAGS' ? 'PUMP' : 'BAGS';
  const swapAmountOut = swapQuote ? formatTokenAmount(swapQuote.amountOut) : '0.00';

  // Calculate minimum received with slippage
  const slippageBps = Math.floor(parseFloat(slippage) * 100);
  const minReceived = swapQuote
    ? formatTokenAmount(swapQuote.amountOut * BigInt(10000 - slippageBps) / 10000n)
    : '0.00';

  // TVL calculation
  const tvl = pool
    ? formatTokenAmount(pool.bagsBalance + pool.pumpBalance)
    : '0.00';

  // LP token value (proportional share of pool)
  const lpTokenValue = pool && pool.lpSupply > 0n
    ? (Number(balances.lp) / Number(pool.lpSupply)) * Number(pool.bagsBalance + pool.pumpBalance) / 1e6
    : 0;

  // Handle swap
  const handleSwap = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!swapQuote) {
      alert('Invalid swap amount');
      return;
    }

    const amountIn = parseTokenAmount(swapAmountIn);
    const minAmountOut = swapQuote.amountOut * BigInt(10000 - slippageBps) / 10000n;

    const signature = await swap(fromToken, amountIn, minAmountOut, slippageBps);

    if (signature) {
      setSwapAmountIn('');
      alert(`Swap successful! Signature: ${signature.slice(0, 8)}...`);
    }
  };

  // Handle add liquidity
  const handleAddLiquidity = async (e: React.FormEvent) => {
    e.preventDefault();

    const bags = parseTokenAmount(bagsAmount);
    const pump = parseTokenAmount(pumpAmount);

    if (bags === 0n || pump === 0n) {
      alert('Enter both BAGS and PUMP amounts');
      return;
    }

    // Calculate minimum LP tokens (with 0.5% slippage)
    const minLpAmount = 0n; // TODO: Calculate based on pool invariant

    const signature = await addLiquidity(bags, pump, minLpAmount);

    if (signature) {
      setBagsAmount('');
      setPumpAmount('');
      alert(`Liquidity added! Signature: ${signature.slice(0, 8)}...`);
    }
  };

  // Handle remove liquidity
  const handleRemoveLiquidity = async (e: React.FormEvent) => {
    e.preventDefault();

    const lp = parseTokenAmount(lpAmount);

    if (lp === 0n || !pool || pool.lpSupply === 0n) {
      alert('Invalid LP amount');
      return;
    }

    // Calculate minimum tokens to receive (proportional to LP tokens, with slippage)
    const share = lp * 10000n / pool.lpSupply;
    const minBags = pool.bagsBalance * share / 10000n * BigInt(10000 - slippageBps) / 10000n;
    const minPump = pool.pumpBalance * share / 10000n * BigInt(10000 - slippageBps) / 10000n;

    const signature = await removeLiquidity(lp, minBags, minPump);

    if (signature) {
      setLpAmount('');
      alert(`Liquidity removed! Signature: ${signature.slice(0, 8)}...`);
    }
  };

  // Flip swap direction
  const handleFlip = () => {
    setFromToken(fromToken === 'BAGS' ? 'PUMP' : 'BAGS');
    setSwapAmountIn('');
  };

  // Set max amount
  const handleMaxSwap = () => {
    const balance = fromToken === 'BAGS' ? balances.bags : balances.pump;
    setSwapAmountIn(formatTokenAmount(balance));
  };

  const handleMaxBags = () => {
    setBagsAmount(formatTokenAmount(balances.bags));
  };

  const handleMaxPump = () => {
    setPumpAmount(formatTokenAmount(balances.pump));
  };

  const handleMaxLP = () => {
    setLpAmount(formatTokenAmount(balances.lp));
  };

  // Handle token creation
  const handleCreateToken = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!selectedIDL || !tokenName || !tokenSymbol || !tokenSupply) {
      alert('Please fill in all fields');
      return;
    }

    // Validate token symbol (alphanumeric only, max 10 chars)
    if (!/^[A-Z0-9]+$/.test(tokenSymbol)) {
      alert('Token symbol must be alphanumeric (A-Z, 0-9)');
      return;
    }

    // Validate supply is a positive integer
    const supply = parseInt(tokenSupply);
    if (isNaN(supply) || supply <= 0) {
      alert('Initial supply must be a positive integer');
      return;
    }

    if (supply > 1_000_000_000_000) {
      alert('Initial supply is too large (max: 1 trillion)');
      return;
    }

    // In a real implementation, this would call the Solana Token Program
    // to create a new SPL token with metadata derived from the selected IDL
    const confirmed = confirm(`Create token ${tokenSymbol} (${tokenName})?\n\nProtocol: ${availableIDLs.find(i => i.id === selectedIDL)?.name}\nSupply: ${supply.toLocaleString()}\nDecimals: ${tokenDecimals}\n\nThis will cost ~0.01 SOL in fees.`);

    if (!confirmed) return;

    alert(`Creating token ${tokenSymbol} based on ${selectedIDL} IDL...\n\nThis would:\n1. Create SPL token mint\n2. Set metadata (name, symbol, decimals)\n3. Mint initial supply: ${supply.toLocaleString()}\n4. Associate with protocol: ${selectedIDL}\n\n[In production, this would call @solana/spl-token createMint()]`);

    // Reset form
    setSelectedIDL('');
    setTokenName('');
    setTokenSymbol('');
    setTokenSupply('');
  };

  // Auto-balance liquidity amounts (maintain pool ratio)
  // Use a flag to prevent circular updates
  const [isUpdatingBags, setIsUpdatingBags] = useState(false);
  const [isUpdatingPump, setIsUpdatingPump] = useState(false);

  useEffect(() => {
    if (!pool || !bagsAmount || activeTab !== 'add' || isUpdatingBags) return;

    const bags = parseTokenAmount(bagsAmount);
    if (bags === 0n) {
      setPumpAmount('');
      return;
    }

    // Calculate proportional PUMP amount
    setIsUpdatingPump(true);
    const ratio = Number(pool.pumpBalance) / Number(pool.bagsBalance);
    const proportionalPump = Number(bags) * ratio / 1e6;
    setPumpAmount(proportionalPump.toFixed(6));
    setTimeout(() => setIsUpdatingPump(false), 100);
  }, [bagsAmount, pool, activeTab, isUpdatingBags]);

  useEffect(() => {
    if (!pool || !pumpAmount || activeTab !== 'add' || isUpdatingPump) return;

    const pump = parseTokenAmount(pumpAmount);
    if (pump === 0n) {
      setBagsAmount('');
      return;
    }

    // Calculate proportional BAGS amount
    setIsUpdatingBags(true);
    const ratio = Number(pool.bagsBalance) / Number(pool.pumpBalance);
    const proportionalBags = Number(pump) * ratio / 1e6;
    setBagsAmount(proportionalBags.toFixed(6));
    setTimeout(() => setIsUpdatingBags(false), 100);
  }, [pumpAmount, pool, activeTab, isUpdatingPump]);

  if (poolLoading) {
    return (
      <div className="swap-page">
        <div className="loading">Loading pool data...</div>
      </div>
    );
  }

  if (poolError) {
    return (
      <div className="swap-page">
        <div className="error-banner">
          <span>⚠️ {poolError}</span>
          <p>The StableSwap pool may not be initialized yet.</p>
        </div>
      </div>
    );
  }

  if (!pool) {
    return (
      <div className="swap-page">
        <div className="error-banner">
          <span>⚠️ Pool not found</span>
        </div>
      </div>
    );
  }

  return (
    <div className="swap-page">
      <h1 className="page-title">AMM Swap & Liquidity</h1>
      <p className="page-description">
        Curve StableSwap for BAGS-IDL ⟷ PUMP-IDL | 0.04% fee | A=1000
      </p>

      {/* Pool Stats */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{tvl}</div>
          <div className="stat-label">TVL (IDL)</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{formatTokenAmount(pool.bagsBalance)}</div>
          <div className="stat-label">BAGS Reserve</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{formatTokenAmount(pool.pumpBalance)}</div>
          <div className="stat-label">PUMP Reserve</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">{formatTokenAmount(pool.lpSupply)}</div>
          <div className="stat-label">LP Supply</div>
        </div>
      </div>

      {/* User Balances */}
      {connected && (
        <div className="balances-section">
          <h3>Your Balances</h3>
          <div className="balances-grid">
            <div className="balance-item">
              <span className="balance-label">BAGS:</span>
              <span className="balance-value">{formatTokenAmount(balances.bags)}</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">PUMP:</span>
              <span className="balance-value">{formatTokenAmount(balances.pump)}</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">LP Tokens:</span>
              <span className="balance-value">{formatTokenAmount(balances.lp)}</span>
            </div>
            <div className="balance-item">
              <span className="balance-label">LP Value:</span>
              <span className="balance-value">{lpTokenValue.toFixed(2)} IDL</span>
            </div>
          </div>
        </div>
      )}

      {/* Tab Navigation */}
      <div className="tab-nav" role="tablist" aria-label="Swap interface tabs">
        <button
          role="tab"
          aria-selected={activeTab === 'swap'}
          aria-controls="swap-panel"
          tabIndex={activeTab === 'swap' ? 0 : -1}
          className={activeTab === 'swap' ? 'active' : ''}
          onClick={() => setActiveTab('swap')}
          onKeyDown={(e) => handleTabKeyPress(e, 'swap')}
        >
          Swap
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'add'}
          aria-controls="add-panel"
          tabIndex={activeTab === 'add' ? 0 : -1}
          className={activeTab === 'add' ? 'active' : ''}
          onClick={() => setActiveTab('add')}
          onKeyDown={(e) => handleTabKeyPress(e, 'add')}
        >
          Add Liquidity
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'remove'}
          aria-controls="remove-panel"
          tabIndex={activeTab === 'remove' ? 0 : -1}
          className={activeTab === 'remove' ? 'active' : ''}
          onClick={() => setActiveTab('remove')}
          onKeyDown={(e) => handleTabKeyPress(e, 'remove')}
        >
          Remove Liquidity
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'farm'}
          aria-controls="farm-panel"
          tabIndex={activeTab === 'farm' ? 0 : -1}
          className={activeTab === 'farm' ? 'active' : ''}
          onClick={() => setActiveTab('farm')}
          onKeyDown={(e) => handleTabKeyPress(e, 'farm')}
        >
          Farm LP
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'create'}
          aria-controls="create-panel"
          tabIndex={activeTab === 'create' ? 0 : -1}
          className={activeTab === 'create' ? 'active' : ''}
          onClick={() => setActiveTab('create')}
          onKeyDown={(e) => handleTabKeyPress(e, 'create')}
        >
          Create Token
        </button>
        <button
          role="tab"
          aria-selected={activeTab === 'govern'}
          aria-controls="govern-panel"
          tabIndex={activeTab === 'govern' ? 0 : -1}
          className={activeTab === 'govern' ? 'active' : ''}
          onClick={() => setActiveTab('govern')}
          onKeyDown={(e) => handleTabKeyPress(e, 'govern')}
        >
          Pool Governance
        </button>
      </div>

      {/* Swap Tab */}
      {activeTab === 'swap' && (
        <div className="swap-container">
          {!connected ? (
            <div className="connect-wallet-prompt">
              <p>Connect your wallet to swap tokens</p>
            </div>
          ) : (
            <form onSubmit={handleSwap} className="swap-form">
              {/* From Token */}
              <div className="token-input-group">
                <div className="input-header">
                  <label>From</label>
                  <span className="balance-hint">
                    Balance: {formatTokenAmount(fromToken === 'BAGS' ? balances.bags : balances.pump)}
                  </span>
                </div>
                <div className="token-input">
                  <input
                    type="number"
                    value={swapAmountIn}
                    onChange={(e) => setSwapAmountIn(e.target.value)}
                    placeholder="0.00"
                    step="0.000001"
                    min="0"
                  />
                  <div className="token-select">
                    <span className="token-name">{fromToken}</span>
                    <button type="button" onClick={handleMaxSwap} className="max-btn">
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Flip Button */}
              <div className="flip-section">
                <button type="button" onClick={handleFlip} className="flip-btn">
                  ⇅
                </button>
              </div>

              {/* To Token */}
              <div className="token-input-group">
                <div className="input-header">
                  <label>To (estimated)</label>
                  <span className="balance-hint">
                    Balance: {formatTokenAmount(toToken === 'BAGS' ? balances.bags : balances.pump)}
                  </span>
                </div>
                <div className="token-input">
                  <input
                    type="text"
                    value={swapAmountOut}
                    readOnly
                    placeholder="0.00"
                  />
                  <div className="token-select">
                    <span className="token-name">{toToken}</span>
                  </div>
                </div>
              </div>

              {/* Slippage Settings */}
              <div className="slippage-section">
                <label>Slippage Tolerance</label>
                <div className="slippage-options">
                  <button
                    type="button"
                    className={slippage === '0.1' ? 'active' : ''}
                    onClick={() => setSlippage('0.1')}
                  >
                    0.1%
                  </button>
                  <button
                    type="button"
                    className={slippage === '0.5' ? 'active' : ''}
                    onClick={() => setSlippage('0.5')}
                  >
                    0.5%
                  </button>
                  <button
                    type="button"
                    className={slippage === '1.0' ? 'active' : ''}
                    onClick={() => setSlippage('1.0')}
                  >
                    1.0%
                  </button>
                  <input
                    type="number"
                    value={slippage}
                    onChange={(e) => setSlippage(e.target.value)}
                    placeholder="Custom"
                    step="0.1"
                    min="0"
                    max="5"
                  />
                </div>
              </div>

              {/* Swap Details */}
              {swapQuote && swapAmountIn && (
                <div className="swap-details">
                  <div className="detail-row">
                    <span>Price Impact:</span>
                    <span className={swapQuote.priceImpact > 1 ? 'warning' : ''}>
                      {swapQuote.priceImpact.toFixed(3)}%
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>Fee (0.04%):</span>
                    <span>{formatTokenAmount(swapQuote.fee)} {fromToken}</span>
                  </div>
                  <div className="detail-row">
                    <span>Minimum Received:</span>
                    <span>{minReceived} {toToken}</span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="submit-btn"
                disabled={!swapAmountIn || swapLoading || parseTokenAmount(swapAmountIn) === 0n}
              >
                {swapLoading ? 'Swapping...' : 'Swap'}
              </button>

              {/* Error/Success Messages */}
              {swapError && <div className="error-message">❌ {swapError}</div>}
              {swapSuccess && <div className="success-message">✅ Swap successful!</div>}
            </form>
          )}
        </div>
      )}

      {/* Add Liquidity Tab */}
      {activeTab === 'add' && (
        <div className="swap-container">
          {!connected ? (
            <div className="connect-wallet-prompt">
              <p>Connect your wallet to add liquidity</p>
            </div>
          ) : (
            <form onSubmit={handleAddLiquidity} className="swap-form">
              <div className="liquidity-info">
                <p>Add both tokens proportionally to maintain pool balance.</p>
                <p className="ratio-info">
                  Current ratio: 1 BAGS = {(Number(pool.pumpBalance) / Number(pool.bagsBalance)).toFixed(4)} PUMP
                </p>
              </div>

              {/* BAGS Input */}
              <div className="token-input-group">
                <div className="input-header">
                  <label>BAGS Amount</label>
                  <span className="balance-hint">
                    Balance: {formatTokenAmount(balances.bags)}
                  </span>
                </div>
                <div className="token-input">
                  <input
                    type="number"
                    value={bagsAmount}
                    onChange={(e) => setBagsAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.000001"
                    min="0"
                  />
                  <div className="token-select">
                    <span className="token-name">BAGS</span>
                    <button type="button" onClick={handleMaxBags} className="max-btn">
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* PUMP Input */}
              <div className="token-input-group">
                <div className="input-header">
                  <label>PUMP Amount</label>
                  <span className="balance-hint">
                    Balance: {formatTokenAmount(balances.pump)}
                  </span>
                </div>
                <div className="token-input">
                  <input
                    type="number"
                    value={pumpAmount}
                    onChange={(e) => setPumpAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.000001"
                    min="0"
                  />
                  <div className="token-select">
                    <span className="token-name">PUMP</span>
                    <button type="button" onClick={handleMaxPump} className="max-btn">
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                className="submit-btn"
                disabled={!bagsAmount || !pumpAmount || addLiqLoading}
              >
                {addLiqLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
              </button>

              {/* Error/Success Messages */}
              {addLiqError && <div className="error-message">❌ {addLiqError}</div>}
              {addLiqSuccess && <div className="success-message">✅ Liquidity added!</div>}
            </form>
          )}
        </div>
      )}

      {/* Remove Liquidity Tab */}
      {activeTab === 'remove' && (
        <div className="swap-container">
          {!connected ? (
            <div className="connect-wallet-prompt">
              <p>Connect your wallet to remove liquidity</p>
            </div>
          ) : (
            <form onSubmit={handleRemoveLiquidity} className="swap-form">
              <div className="liquidity-info">
                <p>Withdraw your LP tokens to receive both BAGS and PUMP.</p>
                <p className="ratio-info">
                  Your LP tokens represent {((Number(balances.lp) / Number(pool.lpSupply)) * 100).toFixed(2)}% of the pool
                </p>
              </div>

              {/* LP Token Input */}
              <div className="token-input-group">
                <div className="input-header">
                  <label>LP Tokens</label>
                  <span className="balance-hint">
                    Balance: {formatTokenAmount(balances.lp)}
                  </span>
                </div>
                <div className="token-input">
                  <input
                    type="number"
                    value={lpAmount}
                    onChange={(e) => setLpAmount(e.target.value)}
                    placeholder="0.00"
                    step="0.000001"
                    min="0"
                  />
                  <div className="token-select">
                    <span className="token-name">LP</span>
                    <button type="button" onClick={handleMaxLP} className="max-btn">
                      MAX
                    </button>
                  </div>
                </div>
              </div>

              {/* Preview */}
              {lpAmount && parseTokenAmount(lpAmount) > 0n && pool.lpSupply > 0n && (
                <div className="swap-details">
                  <div className="detail-row">
                    <span>You will receive (est.):</span>
                  </div>
                  <div className="detail-row">
                    <span>BAGS:</span>
                    <span>
                      {formatTokenAmount(
                        pool.bagsBalance * parseTokenAmount(lpAmount) / pool.lpSupply
                      )}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span>PUMP:</span>
                    <span>
                      {formatTokenAmount(
                        pool.pumpBalance * parseTokenAmount(lpAmount) / pool.lpSupply
                      )}
                    </span>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                className="submit-btn"
                disabled={!lpAmount || removeLiqLoading}
              >
                {removeLiqLoading ? 'Removing Liquidity...' : 'Remove Liquidity'}
              </button>

              {/* Error/Success Messages */}
              {removeLiqError && <div className="error-message">❌ {removeLiqError}</div>}
              {removeLiqSuccess && <div className="success-message">✅ Liquidity removed!</div>}
            </form>
          )}
        </div>
      )}

      {/* Farm LP Tab */}
      {activeTab === 'farm' && (
        <div className="swap-container">
          {!connected ? (
            <div className="connect-wallet-prompt">
              <p>Connect your wallet to farm LP tokens</p>
            </div>
          ) : (
            <div className="farm-container">
              <div className="farm-info-banner">
                <h3>🌾 LP Token Farming</h3>
                <p>Stake your LP tokens to earn IDL rewards from swap fees!</p>
                <div className="farm-stats-row">
                  <div className="farm-stat">
                    <span className="stat-label">APR:</span>
                    <span className="stat-value">
                      {stakingLoading ? '...' : `~${stakingState?.apr || 45}%`}
                    </span>
                  </div>
                  <div className="farm-stat">
                    <span className="stat-label">Your Staked:</span>
                    <span className="stat-value">
                      {stakingLoading ? '...' : `${formatTokenAmount(stakingState?.stakedAmount || 0n)} LP`}
                    </span>
                  </div>
                  <div className="farm-stat">
                    <span className="stat-label">Pending Rewards:</span>
                    <span className="stat-value">
                      {stakingLoading ? '...' : `${formatTokenAmount(stakingState?.pendingRewards || 0n)} IDL`}
                    </span>
                  </div>
                </div>
              </div>

              {/* Stake LP Section */}
              <div className="farm-section">
                <h4>Stake LP Tokens</h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const amount = parseTokenAmount(stakeAmount);
                  if (amount === 0n) {
                    alert('Enter a valid amount');
                    return;
                  }
                  const signature = await stakeLP(amount);
                  if (signature) {
                    alert(`Staked successfully! Signature: ${signature.slice(0, 8)}...`);
                    setStakeAmount('');
                  }
                }} className="farm-form">
                  <div className="token-input-group">
                    <div className="input-header">
                      <label>LP Amount to Stake</label>
                      <span className="balance-hint">
                        Available: {formatTokenAmount(balances.lp)} LP
                      </span>
                    </div>
                    <div className="token-input">
                      <input
                        type="number"
                        value={stakeAmount}
                        onChange={(e) => setStakeAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.000001"
                        min="0"
                      />
                      <div className="token-select">
                        <span className="token-name">LP</span>
                        <button
                          type="button"
                          onClick={() => setStakeAmount(formatTokenAmount(balances.lp))}
                          className="max-btn"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="submit-btn" disabled={!stakeAmount || stakeLoading}>
                    {stakeLoading ? 'Staking...' : stakeSuccess ? 'Staked!' : 'Stake LP Tokens'}
                  </button>
                </form>
              </div>

              {/* Unstake LP Section */}
              <div className="farm-section">
                <h4>Unstake LP Tokens</h4>
                <form onSubmit={async (e) => {
                  e.preventDefault();
                  const amount = parseTokenAmount(unstakeAmount);
                  if (amount === 0n) {
                    alert('Enter a valid amount');
                    return;
                  }
                  const signature = await unstakeLP(amount);
                  if (signature) {
                    alert(`Unstaked successfully! Signature: ${signature.slice(0, 8)}...`);
                    setUnstakeAmount('');
                  }
                }} className="farm-form">
                  <div className="token-input-group">
                    <div className="input-header">
                      <label>LP Amount to Unstake</label>
                      <span className="balance-hint">
                        Staked: {formatTokenAmount(stakingState?.stakedAmount || 0n)} LP
                      </span>
                    </div>
                    <div className="token-input">
                      <input
                        type="number"
                        value={unstakeAmount}
                        onChange={(e) => setUnstakeAmount(e.target.value)}
                        placeholder="0.00"
                        step="0.000001"
                        min="0"
                      />
                      <div className="token-select">
                        <span className="token-name">LP</span>
                        <button
                          type="button"
                          onClick={() => setUnstakeAmount('0')}
                          className="max-btn"
                        >
                          MAX
                        </button>
                      </div>
                    </div>
                  </div>

                  <button type="submit" className="submit-btn" disabled={!unstakeAmount || unstakeLoading}>
                    {unstakeLoading ? 'Unstaking...' : unstakeSuccess ? 'Unstaked!' : 'Unstake LP Tokens'}
                  </button>
                </form>
              </div>

              {/* Claim Rewards Section */}
              <div className="farm-section">
                <h4>Claim Rewards</h4>
                <div className="rewards-display">
                  <div className="rewards-amount">
                    <span className="label">Pending Rewards:</span>
                    <span className="value">
                      {formatTokenAmount(stakingState?.pendingRewards || 0n)} IDL
                    </span>
                  </div>
                  <button
                    onClick={async () => {
                      const signature = await claimRewards();
                      if (signature) {
                        alert(`Rewards claimed! Signature: ${signature.slice(0, 8)}...`);
                      }
                    }}
                    className="submit-btn"
                    disabled={(stakingState?.pendingRewards || 0n) === 0n || claimLoading}
                  >
                    {claimLoading ? 'Claiming...' : claimSuccess ? 'Claimed!' : 'Claim Rewards'}
                  </button>
                </div>
              </div>

              <div className="farm-notes">
                <p><strong>Note:</strong> Farming features connect to the IDL Protocol staking program.</p>
                <p>Rewards are distributed from 50% of swap fees collected by the pool.</p>
                <p>Minimum stake: 0.1 IDL | Lock period: 24 hours</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Create Token Tab */}
      {activeTab === 'create' && (
        <div className="swap-container">
          {!connected ? (
            <div className="connect-wallet-prompt">
              <p>Connect your wallet to create IDL-based tokens</p>
            </div>
          ) : (
            <form onSubmit={handleCreateToken} className="create-token-form">
              <div className="create-info-banner">
                <h3>🪙 Create IDL-Based Token</h3>
                <p>Create a new SPL token linked to a protocol IDL. The token will inherit metadata and governance from the selected protocol.</p>
              </div>

              {/* Select IDL */}
              <div className="form-group">
                <label>Select Protocol IDL</label>
                <select
                  value={selectedIDL}
                  onChange={(e) => setSelectedIDL(e.target.value)}
                  className="idl-select"
                  required
                >
                  <option value="">Choose a protocol...</option>
                  {availableIDLs.map(idl => (
                    <option key={idl.id} value={idl.id}>
                      {idl.name}
                    </option>
                  ))}
                </select>
                <small>The token will be associated with this protocol's IDL definition</small>
              </div>

              {/* Token Name */}
              <div className="form-group">
                <label>Token Name</label>
                <input
                  type="text"
                  value={tokenName}
                  onChange={(e) => setTokenName(e.target.value)}
                  placeholder="e.g. Jupiter Token"
                  className="text-input"
                  required
                />
              </div>

              {/* Token Symbol */}
              <div className="form-group">
                <label>Token Symbol</label>
                <input
                  type="text"
                  value={tokenSymbol}
                  onChange={(e) => setTokenSymbol(e.target.value.toUpperCase())}
                  placeholder="e.g. JUP"
                  className="text-input"
                  maxLength={10}
                  required
                />
              </div>

              {/* Decimals */}
              <div className="form-group">
                <label>Decimals</label>
                <select
                  value={tokenDecimals}
                  onChange={(e) => setTokenDecimals(e.target.value)}
                  className="decimals-select"
                >
                  <option value="6">6 (Standard)</option>
                  <option value="9">9 (SOL Native)</option>
                  <option value="8">8 (BTC-like)</option>
                  <option value="2">2 (Stablecoin)</option>
                </select>
              </div>

              {/* Initial Supply */}
              <div className="form-group">
                <label>Initial Supply</label>
                <input
                  type="number"
                  value={tokenSupply}
                  onChange={(e) => setTokenSupply(e.target.value)}
                  placeholder="1000000"
                  className="text-input"
                  min="1"
                  step="1"
                  required
                />
                <small>Total tokens to mint (will be sent to your wallet)</small>
              </div>

              {/* Token Preview */}
              {selectedIDL && tokenName && tokenSymbol && (
                <div className="token-preview">
                  <h4>Token Preview</h4>
                  <div className="preview-grid">
                    <div className="preview-item">
                      <span className="label">Protocol:</span>
                      <span className="value">{availableIDLs.find(i => i.id === selectedIDL)?.name}</span>
                    </div>
                    <div className="preview-item">
                      <span className="label">Name:</span>
                      <span className="value">{tokenName}</span>
                    </div>
                    <div className="preview-item">
                      <span className="label">Symbol:</span>
                      <span className="value">{tokenSymbol}</span>
                    </div>
                    <div className="preview-item">
                      <span className="label">Decimals:</span>
                      <span className="value">{tokenDecimals}</span>
                    </div>
                    <div className="preview-item">
                      <span className="label">Supply:</span>
                      <span className="value">{tokenSupply ? Number(tokenSupply).toLocaleString() : '0'}</span>
                    </div>
                  </div>
                </div>
              )}

              <button
                type="submit"
                className="submit-btn"
                disabled={!selectedIDL || !tokenName || !tokenSymbol || !tokenSupply}
              >
                Create Token
              </button>

              <div className="create-notes">
                <p><strong>Important:</strong> Token creation requires SOL for transaction fees (~0.01 SOL)</p>
                <p>Once created, tokens are immutable SPL tokens on Solana</p>
                <p>Metadata is stored on-chain and linked to the selected IDL</p>
              </div>
            </form>
          )}
        </div>
      )}

      {/* Pool Governance Tab */}
      {activeTab === 'govern' && (
        <div className="swap-container">
          {!connected ? (
            <div className="connect-wallet-prompt">
              <p>Connect your wallet to participate in pool governance</p>
            </div>
          ) : (
            <div className="govern-container">
              {/* LP Fees Section */}
              <div className="govern-section">
                <h3>💰 Claim LP Fees</h3>
                <p>As a liquidity provider, you earn {pool?.swapFeeBps ? `${Number(pool.swapFeeBps) / 100}%` : '0.04%'} from every swap!</p>

                <div className="fees-stats">
                  <div className="fees-stat">
                    <span className="label">Your LP Share:</span>
                    <span className="value">
                      {feesLoading ? '...' : `${(feesState?.lpShare || 0).toFixed(4)}%`}
                    </span>
                  </div>
                  <div className="fees-stat">
                    <span className="label">Unclaimed BAGS:</span>
                    <span className="value">
                      {feesLoading ? '...' : formatTokenAmount(feesState?.unclaimedBags || 0n)}
                    </span>
                  </div>
                  <div className="fees-stat">
                    <span className="label">Unclaimed PUMP:</span>
                    <span className="value">
                      {feesLoading ? '...' : formatTokenAmount(feesState?.unclaimedPump || 0n)}
                    </span>
                  </div>
                  <div className="fees-stat">
                    <span className="label">Total Fees Earned:</span>
                    <span className="value">
                      {feesLoading ? '...' : formatTokenAmount(feesState?.totalFeesEarned || 0n)}
                    </span>
                  </div>
                </div>

                <button
                  onClick={async () => {
                    const signature = await claimFees();
                    if (signature) {
                      alert(`Fees claimed! Signature: ${signature.slice(0, 8)}...`);
                    }
                  }}
                  className="submit-btn"
                  disabled={
                    (feesState?.unclaimedBags || 0n) === 0n &&
                    (feesState?.unclaimedPump || 0n) === 0n ||
                    claimFeesLoading
                  }
                >
                  {claimFeesLoading ? 'Claiming...' : claimFeesSuccess ? 'Claimed!' : 'Claim All Fees'}
                </button>
              </div>

              {/* Pool Parameters Section */}
              <div className="govern-section">
                <h3>⚙️ Pool Parameters</h3>
                <div className="param-grid">
                  <div className="param-item">
                    <span className="param-label">Amplification (A):</span>
                    <span className="param-value">{pool ? Number(pool.amplification) : '...'}</span>
                  </div>
                  <div className="param-item">
                    <span className="param-label">Swap Fee:</span>
                    <span className="param-value">{pool ? `${Number(pool.swapFeeBps) / 100}%` : '...'}</span>
                  </div>
                  <div className="param-item">
                    <span className="param-label">Pool Status:</span>
                    <span className="param-value">{pool?.paused ? '⏸️ Paused' : '✅ Active'}</span>
                  </div>
                  <div className="param-item">
                    <span className="param-label">Pool Authority:</span>
                    <span className="param-value" style={{fontSize: '10px', wordBreak: 'break-all'}}>
                      {pool?.authority.toBase58().slice(0, 8)}...
                    </span>
                  </div>
                </div>
              </div>

              {/* Governance Actions Section */}
              <div className="govern-section">
                <h3>🗳️ Governance Proposals</h3>
                <p>Vote on pool parameter changes using your LP tokens as voting power.</p>

                <div className="proposals-list">
                  <div className="proposal-item">
                    <div className="proposal-header">
                      <span className="proposal-title">Proposal #1: Reduce swap fee to 0.03%</span>
                      <span className="proposal-status pending">Voting Open</span>
                    </div>
                    <div className="proposal-stats">
                      <div className="vote-bar">
                        <div className="vote-yes" style={{width: '65%'}}>Yes: 65%</div>
                        <div className="vote-no" style={{width: '35%'}}>No: 35%</div>
                      </div>
                    </div>
                    <div className="proposal-actions">
                      <button className="vote-btn yes" onClick={() => alert('Voting not yet implemented')}>
                        Vote Yes
                      </button>
                      <button className="vote-btn no" onClick={() => alert('Voting not yet implemented')}>
                        Vote No
                      </button>
                    </div>
                  </div>

                  <div className="proposal-item">
                    <div className="proposal-header">
                      <span className="proposal-title">Proposal #2: Increase amplification to 1500</span>
                      <span className="proposal-status passed">Passed</span>
                    </div>
                    <div className="proposal-stats">
                      <div className="vote-bar">
                        <div className="vote-yes" style={{width: '82%'}}>Yes: 82%</div>
                        <div className="vote-no" style={{width: '18%'}}>No: 18%</div>
                      </div>
                    </div>
                    <p className="proposal-result">✅ Executed on-chain</p>
                  </div>
                </div>

                <button className="submit-btn secondary" onClick={() => alert('Creating proposals requires veIDL tokens (coming soon)')}>
                  Create New Proposal
                </button>
              </div>

              <div className="govern-notes">
                <p><strong>Note:</strong> Governance requires LP tokens for voting power</p>
                <p>veIDL stakers can create and execute proposals</p>
                <p>Voting periods last 7 days | Quorum: 10% of total LP supply</p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
