import './TokenomicsPage.css';

export default function TokenomicsPage() {
  return (
    <div className="tokenomics-page">
      <h1 className="page-title">$IDL Tokenomics</h1>

      <section className="token-overview">
        <div className="token-card">
          <h2>Total Supply</h2>
          <div className="token-value">1,000,000,000</div>
          <div className="token-label">1 Billion IDL</div>
        </div>
        <div className="token-card">
          <h2>Token Type</h2>
          <div className="token-value">SPL</div>
          <div className="token-label">Solana Program Library</div>
        </div>
        <div className="token-card">
          <h2>Decimals</h2>
          <div className="token-value">9</div>
          <div className="token-label">Standard Precision</div>
        </div>
      </section>

      <section className="distribution">
        <h2 className="section-title">Token Distribution</h2>
        <div className="distribution-grid">
          <div className="dist-item">
            <div className="dist-bar" style={{ width: '40%', background: 'var(--accent-primary)' }} />
            <span className="dist-label">Community Rewards</span>
            <span className="dist-value">40%</span>
          </div>
          <div className="dist-item">
            <div className="dist-bar" style={{ width: '20%', background: 'var(--accent-green)' }} />
            <span className="dist-label">Liquidity Mining</span>
            <span className="dist-value">20%</span>
          </div>
          <div className="dist-item">
            <div className="dist-bar" style={{ width: '15%', background: 'var(--accent-purple)' }} />
            <span className="dist-label">Team (4yr vest)</span>
            <span className="dist-value">15%</span>
          </div>
          <div className="dist-item">
            <div className="dist-bar" style={{ width: '10%', background: 'var(--accent-orange)' }} />
            <span className="dist-label">Treasury</span>
            <span className="dist-value">10%</span>
          </div>
          <div className="dist-item">
            <div className="dist-bar" style={{ width: '10%', background: 'var(--accent-pink)' }} />
            <span className="dist-label">Ecosystem Grants</span>
            <span className="dist-value">10%</span>
          </div>
          <div className="dist-item">
            <div className="dist-bar" style={{ width: '5%', background: 'var(--error-color)' }} />
            <span className="dist-label">Initial Liquidity</span>
            <span className="dist-value">5%</span>
          </div>
        </div>
      </section>

      <section className="utility">
        <h2 className="section-title">Token Utility</h2>
        <div className="utility-grid">
          <div className="utility-card">
            <h3>Staking</h3>
            <p>Lock IDL for veIDL to earn protocol fees and governance voting power.</p>
          </div>
          <div className="utility-card">
            <h3>Prediction Betting</h3>
            <p>Place bets on DeFi metrics. Stakers get boosted odds.</p>
          </div>
          <div className="utility-card">
            <h3>Battle Stakes</h3>
            <p>Stake IDL in 1v1 prediction battles. Winner takes all.</p>
          </div>
          <div className="utility-card">
            <h3>Guild Creation</h3>
            <p>Pay 10 IDL to create a guild and recruit members.</p>
          </div>
          <div className="utility-card">
            <h3>Loot Boxes</h3>
            <p>Spend IDL on loot boxes for random rewards. 50% burned.</p>
          </div>
          <div className="utility-card">
            <h3>Oracle Bonding</h3>
            <p>Oracles must bond IDL. Slashed if they submit bad data.</p>
          </div>
        </div>
      </section>

      <section className="deflationary">
        <h2 className="section-title">Deflationary Mechanics</h2>
        <table className="mechanics-table">
          <thead>
            <tr>
              <th>Burn Source</th>
              <th>Rate</th>
              <th>Description</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Prediction Fee Burn</td>
              <td>20%</td>
              <td>20% of all bet fees are permanently burned</td>
            </tr>
            <tr>
              <td>Lootbox Burn</td>
              <td>50%</td>
              <td>Half of lootbox purchases go to burn</td>
            </tr>
            <tr>
              <td>Oracle Slashing</td>
              <td>100%</td>
              <td>Bad oracle reports = full stake burned</td>
            </tr>
            <tr>
              <td>Market Creation</td>
              <td>5 IDL</td>
              <td>Flat fee for creating new markets</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="vip-tiers">
        <h2 className="section-title">VIP Tiers</h2>
        <div className="tier-grid">
          <div className="tier-card bronze">
            <h3>Bronze</h3>
            <div className="tier-stake">1,000 IDL</div>
            <ul>
              <li>1% fee discount</li>
              <li>Bronze badge</li>
            </ul>
          </div>
          <div className="tier-card silver">
            <h3>Silver</h3>
            <div className="tier-stake">10,000 IDL</div>
            <ul>
              <li>2% fee discount</li>
              <li>Silver badge</li>
              <li>Early market access</li>
            </ul>
          </div>
          <div className="tier-card gold">
            <h3>Gold</h3>
            <div className="tier-stake">100,000 IDL</div>
            <ul>
              <li>5% fee discount</li>
              <li>Gold badge</li>
              <li>Priority support</li>
            </ul>
          </div>
          <div className="tier-card platinum">
            <h3>Platinum</h3>
            <div className="tier-stake">500,000 IDL</div>
            <ul>
              <li>10% fee discount</li>
              <li>Platinum badge</li>
              <li>Create private markets</li>
            </ul>
          </div>
          <div className="tier-card diamond">
            <h3>Diamond</h3>
            <div className="tier-stake">1,000,000 IDL</div>
            <ul>
              <li>25% fee discount</li>
              <li>Diamond badge</li>
              <li>Governance proposal rights</li>
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
