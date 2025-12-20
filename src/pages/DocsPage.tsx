import './DocsPage.css';

export default function DocsPage() {
  return (
    <div className="docs-page">
      <h1 className="page-title">Documentation</h1>

      <section className="doc-section">
        <h2>Getting Started</h2>
        <p>
          IDL Protocol is a prediction market platform on Solana where you can bet on
          DeFi protocol metrics like TVL, volume, and user counts.
        </p>

        <h3>1. Connect Wallet</h3>
        <p>
          Connect your Phantom wallet using the button in the top right corner.
          The protocol runs on Solana devnet.
        </p>

        <h3>2. Get IDL Tokens</h3>
        <p>
          IDL tokens are required for staking and betting. You can:
        </p>
        <ul>
          <li>Swap SOL for IDL using the StableSwap AMM</li>
          <li>Earn rewards from staking and accurate predictions</li>
        </ul>

        <h3>3. Stake for veIDL</h3>
        <p>
          Lock your IDL tokens to receive veIDL (vote-escrowed IDL). Longer locks
          give you more voting power and higher fee share.
        </p>

        <h3>4. Place Predictions</h3>
        <p>
          Browse active markets and bet YES or NO on whether a metric will exceed
          the target value by the resolution date.
        </p>
      </section>

      <section className="doc-section">
        <h2>Staking</h2>
        <p>
          Stake IDL to participate in governance and earn protocol fees.
        </p>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Lock Duration</th>
              <th>veIDL Multiplier</th>
            </tr>
          </thead>
          <tbody>
            <tr><td>1 week</td><td>0.25%</td></tr>
            <tr><td>1 month</td><td>1%</td></tr>
            <tr><td>1 year</td><td>25%</td></tr>
            <tr><td>4 years (max)</td><td>100%</td></tr>
          </tbody>
        </table>
      </section>

      <section className="doc-section">
        <h2>Prediction Markets</h2>
        <p>
          Markets use a commit-reveal scheme to prevent front-running:
        </p>
        <ol>
          <li><strong>Commit Phase:</strong> Submit a hash of your bet (side + amount + salt)</li>
          <li><strong>Reveal Phase:</strong> Reveal your actual bet within 24 hours</li>
          <li><strong>Resolution:</strong> Oracle submits the actual metric value</li>
          <li><strong>Claim:</strong> Winners claim their proportional share</li>
        </ol>
      </section>

      <section className="doc-section">
        <h2>Battles</h2>
        <p>
          1v1 prediction battles let you challenge another user to a duel:
        </p>
        <ul>
          <li>Challenger picks opponent, market, and stake amount</li>
          <li>Opponent has 24 hours to accept</li>
          <li>Challenger picks YES or NO, opponent gets the opposite</li>
          <li>Winner takes the pot minus 2.5% platform fee</li>
        </ul>
      </section>

      <section className="doc-section">
        <h2>Guilds</h2>
        <p>
          Pool resources with other users in a guild:
        </p>
        <ul>
          <li>Create a guild for 10 IDL</li>
          <li>3-50 members per guild</li>
          <li>Guild leader gets 10% of guild winnings</li>
          <li>Compete on the guild leaderboard</li>
        </ul>
      </section>

      <section className="doc-section">
        <h2>Fee Structure</h2>
        <table className="doc-table">
          <thead>
            <tr>
              <th>Action</th>
              <th>Fee</th>
              <th>Distribution</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>Winning Bet</td>
              <td>3%</td>
              <td>50% stakers, 30% treasury, 20% burn</td>
            </tr>
            <tr>
              <td>Battle Win</td>
              <td>2.5%</td>
              <td>50% stakers, 30% treasury, 20% burn</td>
            </tr>
            <tr>
              <td>StableSwap</td>
              <td>0.04%</td>
              <td>100% LPs</td>
            </tr>
          </tbody>
        </table>
      </section>

      <section className="doc-section">
        <h2>SDK</h2>
        <pre className="code-block">
{`npm install @idlhub/protocol-sdk

import { IdlProtocolClient } from '@idlhub/protocol-sdk';

const client = new IdlProtocolClient({
  connection,
  wallet
});

// Get protocol state
const state = await client.getProtocolState();

// Place a bet
await client.placeBet(marketPDA, amount, true); // true = YES

// Create a battle
await client.createBattle(
  opponentPubkey,
  marketPubkey,
  1000_000_000n, // 1 IDL
  true, // challenger picks YES
  0 // nonce
);`}
        </pre>
      </section>
    </div>
  );
}
