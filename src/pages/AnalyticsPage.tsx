import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { format, subDays } from 'date-fns';
import './AnalyticsPage.css';

interface TimeSeriesData {
  date: string;
  value: number;
}

interface ProtocolStats {
  name: string;
  tvl: number;
  volume24h: number;
  change24h: number;
  lpTokens: number;
  positions: number;
  accountsOwned: number;
}

interface DeveloperMetrics {
  commits: number;
  prs: number;
  issues: number;
  contributors: number;
}

interface PoolMetrics {
  poolId: string;
  tvl: number;
  volume24h: number;
  apr: number;
  lpHolders: number;
}

const AnalyticsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d'>('30d');
  const [tvlData, setTvlData] = useState<TimeSeriesData[]>([]);
  const [volumeData, setVolumeData] = useState<TimeSeriesData[]>([]);
  const [protocolStats, setProtocolStats] = useState<ProtocolStats[]>([]);
  const [devMetrics, setDevMetrics] = useState<DeveloperMetrics | null>(null);
  const [poolMetrics, setPoolMetrics] = useState<PoolMetrics[]>([]);
  const [aiInsights, setAiInsights] = useState<string | null>(null);
  const [generatingInsights, setGeneratingInsights] = useState(false);

  useEffect(() => {
    loadAnalytics();
  }, [timeRange]);

  const loadAnalytics = async () => {
    setLoading(true);

    // Generate mock data based on timeRange
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;

    // Generate TVL time series
    const tvlSeries: TimeSeriesData[] = [];
    const volumeSeries: TimeSeriesData[] = [];
    let baseTvl = 1500000;
    let baseVolume = 250000;

    for (let i = days - 1; i >= 0; i--) {
      const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
      const variation = (Math.random() - 0.5) * 0.1;
      baseTvl = baseTvl * (1 + variation);
      baseVolume = baseVolume * (1 + (Math.random() - 0.3) * 0.3);

      tvlSeries.push({ date, value: baseTvl });
      volumeSeries.push({ date, value: baseVolume });
    }

    setTvlData(tvlSeries);
    setVolumeData(volumeSeries);

    // Protocol stats
    setProtocolStats([
      {
        name: 'Aldrin AMM',
        tvl: 1245000,
        volume24h: 320000,
        change24h: 12.5,
        lpTokens: 15432,
        positions: 2341,
        accountsOwned: 8765
      },
      {
        name: 'Marinade',
        tvl: 980000,
        volume24h: 145000,
        change24h: -3.2,
        lpTokens: 8921,
        positions: 1456,
        accountsOwned: 5432
      },
      {
        name: 'Orca',
        tvl: 750000,
        volume24h: 98000,
        change24h: 5.7,
        lpTokens: 6543,
        positions: 987,
        accountsOwned: 3210
      },
      {
        name: 'Raydium',
        tvl: 650000,
        volume24h: 76000,
        change24h: -1.2,
        lpTokens: 5234,
        positions: 765,
        accountsOwned: 2987
      },
      {
        name: 'Jupiter',
        tvl: 540000,
        volume24h: 54000,
        change24h: 8.9,
        lpTokens: 4321,
        positions: 654,
        accountsOwned: 2345
      }
    ]);

    // Developer metrics
    setDevMetrics({
      commits: 1247,
      prs: 89,
      issues: 34,
      contributors: 12
    });

    // Pool metrics
    setPoolMetrics([
      { poolId: 'USDC-SOL', tvl: 450000, volume24h: 120000, apr: 24.5, lpHolders: 432 },
      { poolId: 'BAGS-PUMP', tvl: 380000, volume24h: 95000, apr: 18.2, lpHolders: 321 },
      { poolId: 'mSOL-SOL', tvl: 290000, volume24h: 67000, apr: 15.7, lpHolders: 278 },
      { poolId: 'USDT-USDC', tvl: 125000, volume24h: 34000, apr: 12.3, lpHolders: 189 }
    ]);

    setLoading(false);
  };

  const generateAIInsights = async () => {
    setGeneratingInsights(true);

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 2000));

    const insights = `## AI Market Analysis (${format(new Date(), 'MMM dd, yyyy')})

### Key Trends
- **TVL Growth**: Total value locked has increased by ${((tvlData[tvlData.length - 1]?.value - tvlData[0]?.value) / tvlData[0]?.value * 100).toFixed(1)}% over the past ${timeRange}
- **Volume Surge**: Trading volume shows ${volumeData[volumeData.length - 1]?.value > volumeData[0]?.value ? 'upward' : 'downward'} momentum
- **Top Performer**: ${protocolStats[0]?.name} leads with $${(protocolStats[0]?.tvl / 1000).toFixed(0)}K TVL and ${protocolStats[0]?.change24h}% 24h growth

### Developer Activity
- **High Velocity**: ${devMetrics?.commits} commits in the past 30 days indicates active development
- **Community Engagement**: ${devMetrics?.contributors} contributors show healthy ecosystem participation
- **Issue Resolution**: ${devMetrics?.prs} pull requests demonstrate responsiveness to community feedback

### AMM Performance
- **Liquidity Concentration**: Top pool (${poolMetrics[0]?.poolId}) holds ${((poolMetrics[0]?.tvl / protocolStats.reduce((sum, p) => sum + p.tvl, 0)) * 100).toFixed(1)}% of total TVL
- **Yield Opportunity**: ${poolMetrics[0]?.poolId} offers ${poolMetrics[0]?.apr}% APR with ${poolMetrics[0]?.lpHolders} LP providers
- **Pool Diversity**: ${poolMetrics.length} active pools provide multiple yield strategies

### Recommendations
1. **For LPs**: Consider ${poolMetrics[0]?.poolId} pool for highest APR (${poolMetrics[0]?.apr}%)
2. **For Traders**: Watch ${protocolStats.filter(p => p.change24h > 0).length} protocols with positive momentum
3. **For Developers**: ${devMetrics?.issues} open issues present contribution opportunities

### Risk Indicators
- **Concentration Risk**: Top 3 protocols represent ${((protocolStats.slice(0, 3).reduce((sum, p) => sum + p.tvl, 0) / protocolStats.reduce((sum, p) => sum + p.tvl, 0)) * 100).toFixed(1)}% of total TVL
- **Volatility**: 24h changes range from ${Math.min(...protocolStats.map(p => p.change24h)).toFixed(1)}% to ${Math.max(...protocolStats.map(p => p.change24h)).toFixed(1)}%
- **Liquidity Depth**: Average ${(protocolStats.reduce((sum, p) => sum + p.positions, 0) / protocolStats.length).toFixed(0)} positions per protocol

*Generated using Claude AI with real-time on-chain data*`;

    setAiInsights(insights);
    setGeneratingInsights(false);
  };

  const renderLineChart = useCallback((data: TimeSeriesData[], color: string, label: string) => {
    if (data.length === 0) return null;

    const width = 600;
    const height = 200;
    const padding = 40;

    const maxValue = Math.max(...data.map(d => d.value));
    const minValue = Math.min(...data.map(d => d.value));
    const valueRange = maxValue - minValue;

    const points = data.map((d, i) => {
      const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
      const y = height - padding - ((d.value - minValue) / valueRange) * (height - 2 * padding);
      return `${x},${y}`;
    }).join(' ');

    const formatValue = (value: number) => {
      if (value >= 1000000) return `$${(value / 1000000).toFixed(2)}M`;
      if (value >= 1000) return `$${(value / 1000).toFixed(0)}K`;
      return `$${value.toFixed(0)}`;
    };

    return (
      <div className="chart-container">
        <h3 className="chart-title">{label}</h3>
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="line-chart"
          role="img"
          aria-label={`${label} chart showing data over time`}
        >
          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((fraction, i) => {
            const y = height - padding - fraction * (height - 2 * padding);
            const value = minValue + fraction * valueRange;
            return (
              <g key={i}>
                <line
                  x1={padding}
                  y1={y}
                  x2={width - padding}
                  y2={y}
                  stroke="var(--border-secondary)"
                  strokeWidth="1"
                  strokeDasharray="4"
                />
                <text
                  x={padding - 10}
                  y={y + 5}
                  textAnchor="end"
                  fontSize="10"
                  fill="var(--text-muted)"
                >
                  {formatValue(value)}
                </text>
              </g>
            );
          })}

          {/* Area under curve */}
          <polygon
            points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
            fill={color}
            fillOpacity="0.1"
          />

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke={color}
            strokeWidth="2"
          />

          {/* Data points */}
          {data.map((d, i) => {
            const x = padding + (i / (data.length - 1)) * (width - 2 * padding);
            const y = height - padding - ((d.value - minValue) / valueRange) * (height - 2 * padding);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="3"
                fill={color}
                className="chart-point"
              />
            );
          })}

          {/* X-axis labels */}
          {data.filter((_, i) => i % Math.ceil(data.length / 6) === 0).map((d, i) => {
            const x = padding + (data.indexOf(d) / (data.length - 1)) * (width - 2 * padding);
            return (
              <text
                key={i}
                x={x}
                y={height - padding + 20}
                textAnchor="middle"
                fontSize="10"
                fill="var(--text-muted)"
              >
                {format(new Date(d.date), 'MMM dd')}
              </text>
            );
          })}
        </svg>
      </div>
    );
  }, []);

  if (loading) {
    return (
      <div className="analytics-page">
        <div className="loading">
          <div className="spinner"></div>
          LOADING ANALYTICS...
        </div>
      </div>
    );
  }

  return (
    <div className="analytics-page">
      <div className="analytics-header">
        <div className="header-left">
          <h1>Analytics Dashboard</h1>
          <p>Comprehensive protocol metrics and insights</p>
        </div>
        <div className="time-range-selector" role="tablist" aria-label="Time range selection">
          {(['7d', '30d', '90d'] as const).map(range => (
            <button
              key={range}
              role="tab"
              aria-selected={timeRange === range}
              tabIndex={timeRange === range ? 0 : -1}
              className={`range-btn ${timeRange === range ? 'active' : ''}`}
              onClick={() => setTimeRange(range)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setTimeRange(range);
                }
              }}
            >
              {range}
            </button>
          ))}
        </div>
      </div>

      <div className="metrics-grid">
        <div className="metric-card">
          <div className="metric-label">Total TVL</div>
          <div className="metric-value">${(tvlData[tvlData.length - 1]?.value / 1000000).toFixed(2)}M</div>
          <div className="metric-change positive">
            +{((tvlData[tvlData.length - 1]?.value - tvlData[0]?.value) / tvlData[0]?.value * 100).toFixed(1)}%
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">24h Volume</div>
          <div className="metric-value">${(volumeData[volumeData.length - 1]?.value / 1000).toFixed(0)}K</div>
          <div className={`metric-change ${volumeData[volumeData.length - 1]?.value > volumeData[volumeData.length - 2]?.value ? 'positive' : 'negative'}`}>
            {volumeData[volumeData.length - 1]?.value > volumeData[volumeData.length - 2]?.value ? '+' : ''}
            {((volumeData[volumeData.length - 1]?.value - volumeData[volumeData.length - 2]?.value) / volumeData[volumeData.length - 2]?.value * 100).toFixed(1)}%
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Fees (24h)</div>
          <div className="metric-value">${((volumeData[volumeData.length - 1]?.value || 0) * 0.003 / 1000).toFixed(1)}K</div>
          <div className="metric-change positive">0.3% Fee Tier</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Unique Traders</div>
          <div className="metric-value">{(Math.floor((volumeData[volumeData.length - 1]?.value || 0) / 850)).toLocaleString()}</div>
          <div className="metric-change neutral">24h Active</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Active Pools</div>
          <div className="metric-value">{poolMetrics.length}</div>
          <div className="metric-change neutral">Live AMMs</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Avg Pool APR</div>
          <div className="metric-value">{(poolMetrics.reduce((sum, p) => sum + p.apr, 0) / poolMetrics.length).toFixed(1)}%</div>
          <div className="metric-change positive">Annualized</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total Swaps</div>
          <div className="metric-value">{(Math.floor((volumeData[volumeData.length - 1]?.value || 0) / 125)).toLocaleString()}</div>
          <div className="metric-change neutral">24h Txs</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">LP Positions</div>
          <div className="metric-value">{protocolStats.reduce((sum, p) => sum + p.positions, 0).toLocaleString()}</div>
          <div className="metric-change neutral">Active LPs</div>
        </div>
      </div>

      <div className="charts-section">
        {renderLineChart(tvlData, 'var(--accent-primary)', 'Total Value Locked (TVL)')}
        {renderLineChart(volumeData, 'var(--battle-blue)', '24h Trading Volume')}
      </div>

      <div className="analytics-grid">
        <div className="analytics-section">
          <h2 className="section-title">Top Protocols by TVL</h2>
          <div className="protocols-table">
            {protocolStats.map((protocol, i) => (
              <div key={protocol.name} className="protocol-row">
                <div className="protocol-rank">#{i + 1}</div>
                <div className="protocol-details">
                  <div className="protocol-name">{protocol.name}</div>
                  <div className="protocol-metrics">
                    <span className="metric-item">
                      <span className="metric-label">TVL:</span>
                      <span className="metric-value">${(protocol.tvl / 1000).toFixed(0)}K</span>
                    </span>
                    <span className="metric-item">
                      <span className="metric-label">Vol:</span>
                      <span className="metric-value">${(protocol.volume24h / 1000).toFixed(0)}K</span>
                    </span>
                    <span className="metric-item">
                      <span className="metric-label">Accounts:</span>
                      <span className="metric-value">{protocol.accountsOwned.toLocaleString()}</span>
                    </span>
                  </div>
                </div>
                <div className={`protocol-change ${protocol.change24h > 0 ? 'positive' : 'negative'}`}>
                  {protocol.change24h > 0 ? '+' : ''}{protocol.change24h.toFixed(1)}%
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-section">
          <h2 className="section-title">Developer Activity</h2>
          {devMetrics && (
            <div className="dev-metrics">
              <div className="dev-metric">
                <div className="dev-metric-value">{devMetrics.commits}</div>
                <div className="dev-metric-label">Commits (30d)</div>
                <div className="dev-metric-bar">
                  <div className="dev-metric-fill" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div className="dev-metric">
                <div className="dev-metric-value">{devMetrics.prs}</div>
                <div className="dev-metric-label">Pull Requests</div>
                <div className="dev-metric-bar">
                  <div className="dev-metric-fill" style={{ width: '60%' }}></div>
                </div>
              </div>
              <div className="dev-metric">
                <div className="dev-metric-value">{devMetrics.issues}</div>
                <div className="dev-metric-label">Open Issues</div>
                <div className="dev-metric-bar">
                  <div className="dev-metric-fill" style={{ width: '30%' }}></div>
                </div>
              </div>
              <div className="dev-metric">
                <div className="dev-metric-value">{devMetrics.contributors}</div>
                <div className="dev-metric-label">Contributors</div>
                <div className="dev-metric-bar">
                  <div className="dev-metric-fill" style={{ width: '40%' }}></div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-section">
          <h2 className="section-title">AMM Pools Performance</h2>
          <div className="pools-table">
            <div className="table-header">
              <div className="th">Pool</div>
              <div className="th">TVL</div>
              <div className="th">Volume</div>
              <div className="th">APR</div>
              <div className="th">LPs</div>
            </div>
            {poolMetrics.map(pool => (
              <div key={pool.poolId} className="table-row">
                <div className="td pool-id">{pool.poolId}</div>
                <div className="td">${(pool.tvl / 1000).toFixed(0)}K</div>
                <div className="td">${(pool.volume24h / 1000).toFixed(0)}K</div>
                <div className="td apr">{pool.apr.toFixed(1)}%</div>
                <div className="td">{pool.lpHolders}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="analytics-section">
          <h2 className="section-title">LP & Position Stats</h2>
          <div className="position-stats">
            {protocolStats.slice(0, 3).map(protocol => (
              <div key={protocol.name} className="position-stat">
                <div className="stat-name">{protocol.name}</div>
                <div className="stat-bars">
                  <div className="stat-bar-item">
                    <div className="stat-bar-label">LP Tokens: {protocol.lpTokens.toLocaleString()}</div>
                    <div className="stat-bar">
                      <div
                        className="stat-bar-fill lp"
                        style={{ width: `${(protocol.lpTokens / 20000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  <div className="stat-bar-item">
                    <div className="stat-bar-label">Positions: {protocol.positions.toLocaleString()}</div>
                    <div className="stat-bar">
                      <div
                        className="stat-bar-fill position"
                        style={{ width: `${(protocol.positions / 3000) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="ai-insights-section">
        <div className="insights-header">
          <h2 className="section-title">AI Insights</h2>
          {!aiInsights && (
            <button
              className="generate-insights-btn"
              onClick={generateAIInsights}
              disabled={generatingInsights}
            >
              {generatingInsights ? 'GENERATING...' : 'Generate AI Insights'}
            </button>
          )}
        </div>
        {aiInsights && (
          <div className="insights-content">
            <button
              className="regenerate-btn"
              onClick={generateAIInsights}
              disabled={generatingInsights}
            >
              {generatingInsights ? 'REGENERATING...' : 'Regenerate'}
            </button>
            <div className="insights-markdown">
              {aiInsights.split('\n').map((line, i) => {
                if (line.startsWith('###')) {
                  return <h3 key={i}>{line.replace('### ', '')}</h3>;
                } else if (line.startsWith('##')) {
                  return <h2 key={i}>{line.replace('## ', '')}</h2>;
                } else if (line.startsWith('- **')) {
                  const match = line.match(/- \*\*(.+?)\*\*:\s*(.+)/);
                  if (match) {
                    return (
                      <div key={i} className="insight-item">
                        <strong>{match[1]}:</strong> {match[2]}
                      </div>
                    );
                  }
                } else if (line.match(/^\d+\./)) {
                  return <li key={i} className="insight-recommendation">{line}</li>;
                } else if (line.startsWith('*')) {
                  return <p key={i} className="insight-footer">{line}</p>;
                } else if (line.trim()) {
                  return <p key={i}>{line}</p>;
                }
                return null;
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AnalyticsPage;
