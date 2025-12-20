/**
 * IDL Protocol Embeddable Widget
 *
 * Allows any website to embed IDL prediction markets
 * Usage: <script src="https://idlhub.io/widget.js" data-market="JUP-TVL-2B"></script>
 */

// This is the client-side widget code that would be served from /widget.js

const WIDGET_STYLES = `
  .idl-widget {
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
    border: 2px solid #00ff88;
    border-radius: 12px;
    padding: 20px;
    max-width: 400px;
    color: #ffffff;
  }

  .idl-widget-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 16px;
  }

  .idl-widget-logo {
    font-size: 14px;
    font-weight: bold;
    color: #00ff88;
  }

  .idl-widget-live {
    background: #ff4444;
    color: white;
    padding: 2px 8px;
    border-radius: 4px;
    font-size: 10px;
    animation: pulse 2s infinite;
  }

  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.5; }
  }

  .idl-widget-title {
    font-size: 18px;
    font-weight: bold;
    margin-bottom: 8px;
  }

  .idl-widget-description {
    font-size: 14px;
    color: #888888;
    margin-bottom: 16px;
  }

  .idl-widget-odds {
    display: flex;
    gap: 12px;
    margin-bottom: 16px;
  }

  .idl-widget-odds-item {
    flex: 1;
    text-align: center;
    padding: 12px;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s;
  }

  .idl-widget-odds-yes {
    background: rgba(0, 255, 136, 0.1);
    border: 1px solid #00ff88;
  }

  .idl-widget-odds-yes:hover {
    background: rgba(0, 255, 136, 0.2);
  }

  .idl-widget-odds-no {
    background: rgba(255, 68, 68, 0.1);
    border: 1px solid #ff4444;
  }

  .idl-widget-odds-no:hover {
    background: rgba(255, 68, 68, 0.2);
  }

  .idl-widget-odds-label {
    font-size: 12px;
    color: #888888;
  }

  .idl-widget-odds-value {
    font-size: 24px;
    font-weight: bold;
  }

  .idl-widget-odds-yes .idl-widget-odds-value {
    color: #00ff88;
  }

  .idl-widget-odds-no .idl-widget-odds-value {
    color: #ff4444;
  }

  .idl-widget-stats {
    display: flex;
    justify-content: space-between;
    font-size: 12px;
    color: #888888;
    margin-bottom: 16px;
  }

  .idl-widget-input {
    display: flex;
    gap: 8px;
    margin-bottom: 12px;
  }

  .idl-widget-input input {
    flex: 1;
    padding: 10px;
    border: 1px solid #333;
    border-radius: 6px;
    background: #0a0a0a;
    color: white;
    font-size: 14px;
  }

  .idl-widget-input input:focus {
    outline: none;
    border-color: #00ff88;
  }

  .idl-widget-btn {
    width: 100%;
    padding: 12px;
    border: none;
    border-radius: 6px;
    font-size: 16px;
    font-weight: bold;
    cursor: pointer;
    transition: all 0.2s;
  }

  .idl-widget-btn-yes {
    background: #00ff88;
    color: #000;
  }

  .idl-widget-btn-yes:hover {
    background: #00cc6e;
  }

  .idl-widget-btn-no {
    background: #ff4444;
    color: #fff;
  }

  .idl-widget-btn-no:hover {
    background: #cc3333;
  }

  .idl-widget-footer {
    text-align: center;
    margin-top: 12px;
    font-size: 11px;
    color: #666666;
  }

  .idl-widget-footer a {
    color: #00ff88;
    text-decoration: none;
  }

  .idl-widget-countdown {
    text-align: center;
    font-size: 14px;
    color: #888888;
    margin-bottom: 12px;
  }

  .idl-widget-countdown-value {
    font-weight: bold;
    color: #00ff88;
  }
`;

const WIDGET_HTML = `
<div class="idl-widget" id="idl-widget-{{MARKET_ID}}">
  <div class="idl-widget-header">
    <span class="idl-widget-logo">IDL PROTOCOL</span>
    <span class="idl-widget-live">LIVE</span>
  </div>

  <div class="idl-widget-title">{{TITLE}}</div>
  <div class="idl-widget-description">{{DESCRIPTION}}</div>

  <div class="idl-widget-odds">
    <div class="idl-widget-odds-item idl-widget-odds-yes" onclick="idlSelectSide('yes')">
      <div class="idl-widget-odds-label">YES</div>
      <div class="idl-widget-odds-value">{{YES_ODDS}}%</div>
    </div>
    <div class="idl-widget-odds-item idl-widget-odds-no" onclick="idlSelectSide('no')">
      <div class="idl-widget-odds-label">NO</div>
      <div class="idl-widget-odds-value">{{NO_ODDS}}%</div>
    </div>
  </div>

  <div class="idl-widget-stats">
    <span>Pool: {{POOL}} IDL</span>
    <span>Bettors: {{BETTORS}}</span>
  </div>

  <div class="idl-widget-countdown">
    Resolves in: <span class="idl-widget-countdown-value">{{COUNTDOWN}}</span>
  </div>

  <div class="idl-widget-input">
    <input type="number" id="idl-amount-{{MARKET_ID}}" placeholder="Amount (IDL)" min="1" />
  </div>

  <button class="idl-widget-btn idl-widget-btn-yes" id="idl-bet-btn-{{MARKET_ID}}" onclick="idlPlaceBet('{{MARKET_ID}}')">
    Bet on YES
  </button>

  <div class="idl-widget-footer">
    Powered by <a href="https://idlhub.io?ref={{REFERRAL}}" target="_blank">IDL Protocol</a>
  </div>
</div>
`;

/**
 * Widget initialization script (runs in browser)
 */
const WIDGET_SCRIPT = `
(function() {
  // Inject styles
  if (!document.getElementById('idl-widget-styles')) {
    const style = document.createElement('style');
    style.id = 'idl-widget-styles';
    style.textContent = \`${WIDGET_STYLES}\`;
    document.head.appendChild(style);
  }

  // Widget state
  window.idlWidgetState = {
    selectedSide: 'yes',
    marketId: null,
  };

  // Select bet side
  window.idlSelectSide = function(side) {
    window.idlWidgetState.selectedSide = side;
    const btn = document.getElementById('idl-bet-btn-' + window.idlWidgetState.marketId);
    if (btn) {
      btn.textContent = 'Bet on ' + side.toUpperCase();
      btn.className = 'idl-widget-btn idl-widget-btn-' + side;
    }
  };

  // Place bet (opens IDL Hub in new tab with prefilled data)
  window.idlPlaceBet = function(marketId) {
    const amount = document.getElementById('idl-amount-' + marketId)?.value || 0;
    const side = window.idlWidgetState.selectedSide;

    if (amount <= 0) {
      alert('Please enter a valid amount');
      return;
    }

    const url = 'https://idlhub.io/bet?market=' + marketId + '&amount=' + amount + '&side=' + side;
    window.open(url, '_blank');
  };

  // Fetch and render widget
  async function initWidget() {
    const scripts = document.querySelectorAll('script[data-market]');

    for (const script of scripts) {
      const marketId = script.getAttribute('data-market');
      const referral = script.getAttribute('data-ref') || 'widget';

      if (!marketId) continue;

      window.idlWidgetState.marketId = marketId;

      try {
        // Fetch market data from API
        const response = await fetch('https://idlhub.io/api/market/' + marketId);
        const market = await response.json();

        // Calculate countdown
        const now = Date.now();
        const resolution = new Date(market.resolution_timestamp * 1000);
        const diff = resolution - now;
        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const countdown = days > 0 ? days + 'd ' + hours + 'h' : hours + 'h';

        // Calculate odds
        const total = market.total_yes_amount + market.total_no_amount;
        const yesOdds = total > 0 ? Math.round((market.total_yes_amount / total) * 100) : 50;
        const noOdds = 100 - yesOdds;

        // Render widget
        let html = \`${WIDGET_HTML}\`;
        html = html.replace(/{{MARKET_ID}}/g, marketId);
        html = html.replace('{{TITLE}}', market.title || marketId);
        html = html.replace('{{DESCRIPTION}}', market.description || '');
        html = html.replace('{{YES_ODDS}}', yesOdds);
        html = html.replace('{{NO_ODDS}}', noOdds);
        html = html.replace('{{POOL}}', total.toLocaleString());
        html = html.replace('{{BETTORS}}', market.bettor_count || 0);
        html = html.replace('{{COUNTDOWN}}', countdown);
        html = html.replace('{{REFERRAL}}', referral);

        const container = document.createElement('div');
        container.innerHTML = html;
        script.parentNode.insertBefore(container, script);
      } catch (error) {
        console.error('Failed to load IDL widget:', error);

        // Render fallback
        const container = document.createElement('div');
        container.innerHTML = '<div class="idl-widget"><div class="idl-widget-title">Failed to load market</div><div class="idl-widget-footer"><a href="https://idlhub.io">Visit IDL Protocol</a></div></div>';
        script.parentNode.insertBefore(container, script);
      }
    }
  }

  // Initialize when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initWidget);
  } else {
    initWidget();
  }
})();
`;

/**
 * Server endpoint to serve the widget script
 */
export function serveWidgetScript(): string {
  return WIDGET_SCRIPT;
}

/**
 * Generate embed code for a specific market
 */
export function generateEmbedCode(marketId: string, referral: string = ''): string {
  const refAttr = referral ? ` data-ref="${referral}"` : '';
  return `<script src="https://idlhub.io/widget.js" data-market="${marketId}"${refAttr}></script>`;
}

/**
 * API endpoint for market data (used by widget)
 */
export interface MarketData {
  id: string;
  title: string;
  description: string;
  resolution_timestamp: number;
  total_yes_amount: number;
  total_no_amount: number;
  bettor_count: number;
  status: 'active' | 'resolved' | 'cancelled';
}

export async function getMarketData(marketId: string): Promise<MarketData> {
  // TODO: Fetch from Solana
  return {
    id: marketId,
    title: 'Jupiter TVL > $2B by Jan 2025',
    description: 'Will Jupiter DEX reach $2 billion in total value locked?',
    resolution_timestamp: Math.floor(Date.now() / 1000) + 86400 * 30,
    total_yes_amount: 50000,
    total_no_amount: 30000,
    bettor_count: 127,
    status: 'active',
  };
}

console.log('IDL Protocol Embed Widget ready!');
