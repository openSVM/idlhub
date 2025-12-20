/**
 * IDL Protocol Twitter Bot
 *
 * Auto-posts winning predictions with shareable cards
 * Includes referral links for viral growth
 */

import { TwitterApi } from 'twitter-api-v2';
import { Connection, PublicKey } from '@solana/web3.js';
import * as canvas from 'canvas';
import * as fs from 'fs';

// Config
const TWITTER_API_KEY = process.env.TWITTER_API_KEY || '';
const TWITTER_API_SECRET = process.env.TWITTER_API_SECRET || '';
const TWITTER_ACCESS_TOKEN = process.env.TWITTER_ACCESS_TOKEN || '';
const TWITTER_ACCESS_SECRET = process.env.TWITTER_ACCESS_SECRET || '';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';

// Initialize Twitter client
const twitterClient = new TwitterApi({
  appKey: TWITTER_API_KEY,
  appSecret: TWITTER_API_SECRET,
  accessToken: TWITTER_ACCESS_TOKEN,
  accessSecret: TWITTER_ACCESS_SECRET,
});

const rwClient = twitterClient.readWrite;

interface WinData {
  wallet: string;
  market: string;
  prediction: 'YES' | 'NO';
  amount: number;
  payout: number;
  odds: number;
  referralCode: string;
}

/**
 * Generate a shareable card image for a winning prediction
 */
async function generateWinCard(data: WinData): Promise<Buffer> {
  const width = 1200;
  const height = 630;

  const cvs = canvas.createCanvas(width, height);
  const ctx = cvs.getContext('2d');

  // Background gradient
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#16213e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  // Border
  ctx.strokeStyle = '#00ff88';
  ctx.lineWidth = 4;
  ctx.strokeRect(20, 20, width - 40, height - 40);

  // Logo/Title
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 48px Arial';
  ctx.fillText('IDL PROTOCOL', 60, 100);

  // Win badge
  ctx.fillStyle = '#ffd700';
  ctx.font = 'bold 72px Arial';
  ctx.fillText('WINNER!', 60, 200);

  // Market info
  ctx.fillStyle = '#ffffff';
  ctx.font = '36px Arial';
  ctx.fillText(`Market: ${data.market}`, 60, 280);
  ctx.fillText(`Prediction: ${data.prediction}`, 60, 330);

  // Amount info
  ctx.fillStyle = '#00ff88';
  ctx.font = 'bold 48px Arial';
  ctx.fillText(`+${data.payout.toLocaleString()} IDL`, 60, 420);

  ctx.fillStyle = '#888888';
  ctx.font = '28px Arial';
  ctx.fillText(`Bet: ${data.amount.toLocaleString()} IDL @ ${data.odds}x odds`, 60, 470);

  // Wallet (truncated)
  const shortWallet = `${data.wallet.slice(0, 4)}...${data.wallet.slice(-4)}`;
  ctx.fillStyle = '#888888';
  ctx.font = '24px Arial';
  ctx.fillText(`Predictor: ${shortWallet}`, 60, 530);

  // Referral CTA
  ctx.fillStyle = '#ffffff';
  ctx.font = 'bold 28px Arial';
  ctx.fillText('Bet on DeFi metrics at idlhub.io', 60, 590);

  // Referral code
  ctx.fillStyle = '#00ff88';
  ctx.font = '24px Arial';
  ctx.fillText(`Use code: ${data.referralCode}`, width - 300, 590);

  return cvs.toBuffer('image/png');
}

/**
 * Post a winning prediction to Twitter
 */
export async function postWin(data: WinData): Promise<string> {
  try {
    // Generate the card image
    const imageBuffer = await generateWinCard(data);

    // Upload media to Twitter
    const mediaId = await rwClient.v1.uploadMedia(imageBuffer, { mimeType: 'image/png' });

    // Compose tweet
    const shortWallet = `${data.wallet.slice(0, 4)}...${data.wallet.slice(-4)}`;
    const profit = data.payout - data.amount;
    const profitPct = ((profit / data.amount) * 100).toFixed(0);

    const tweetText = `
${data.prediction === 'YES' ? '' : ''} Prediction confirmed!

${shortWallet} just won ${data.payout.toLocaleString()} $IDL (+${profitPct}%) predicting ${data.prediction} on "${data.market}"

Bet on Solana DeFi metrics at idlhub.io
Use code ${data.referralCode} for bonus rewards

#Solana #DeFi #PredictionMarkets #IDL
    `.trim();

    // Post tweet with image
    const tweet = await rwClient.v2.tweet({
      text: tweetText,
      media: { media_ids: [mediaId] },
    });

    console.log(`Posted win tweet: ${tweet.data.id}`);
    return tweet.data.id;
  } catch (error) {
    console.error('Failed to post win tweet:', error);
    throw error;
  }
}

/**
 * Post market resolution summary
 */
export async function postMarketResolution(
  market: string,
  result: 'YES' | 'NO',
  totalVolume: number,
  winnerCount: number,
): Promise<string> {
  const tweetText = `
Market Resolved!

"${market}"

Result: ${result}
Total Volume: ${totalVolume.toLocaleString()} $IDL
Winners: ${winnerCount}

Create your own predictions at idlhub.io

#Solana #PredictionMarkets #IDL
  `.trim();

  const tweet = await rwClient.v2.tweet({ text: tweetText });
  console.log(`Posted resolution tweet: ${tweet.data.id}`);
  return tweet.data.id;
}

/**
 * Post new market announcement
 */
export async function postNewMarket(
  market: string,
  description: string,
  resolutionDate: Date,
): Promise<string> {
  const dateStr = resolutionDate.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const tweetText = `
New Prediction Market!

${market}

${description}

Resolves: ${dateStr}

Place your bets at idlhub.io

#Solana #DeFi #PredictionMarkets #IDL
  `.trim();

  const tweet = await rwClient.v2.tweet({ text: tweetText });
  console.log(`Posted new market tweet: ${tweet.data.id}`);
  return tweet.data.id;
}

/**
 * Post leaderboard update
 */
export async function postLeaderboard(
  leaders: Array<{ wallet: string; accuracy: number; winnings: number }>,
): Promise<string> {
  const leaderLines = leaders.slice(0, 5).map((l, i) => {
    const medal = ['', '', '', '4', '5'][i];
    const shortWallet = `${l.wallet.slice(0, 4)}...${l.wallet.slice(-4)}`;
    return `${medal} ${shortWallet}: ${l.accuracy}% accuracy, ${l.winnings.toLocaleString()} IDL won`;
  });

  const tweetText = `
Weekly Leaderboard Update!

${leaderLines.join('\n')}

Think you can beat them? idlhub.io

#Solana #PredictionMarkets #IDL
  `.trim();

  const tweet = await rwClient.v2.tweet({ text: tweetText });
  console.log(`Posted leaderboard tweet: ${tweet.data.id}`);
  return tweet.data.id;
}

/**
 * Post battle result
 */
export async function postBattleResult(
  winner: string,
  loser: string,
  market: string,
  stake: number,
): Promise<string> {
  const shortWinner = `${winner.slice(0, 4)}...${winner.slice(-4)}`;
  const shortLoser = `${loser.slice(0, 4)}...${loser.slice(-4)}`;

  const tweetText = `
Battle Resolved!

${shortWinner} defeated ${shortLoser} in a 1v1 prediction battle!

Market: "${market}"
Stakes: ${stake.toLocaleString()} $IDL each
Winner takes: ${(stake * 2 * 0.975).toLocaleString()} $IDL

Challenge someone at idlhub.io

#Solana #PredictionMarkets #IDL
  `.trim();

  const tweet = await rwClient.v2.tweet({ text: tweetText });
  console.log(`Posted battle tweet: ${tweet.data.id}`);
  return tweet.data.id;
}

// Start listening for events (would be called by main backend)
console.log('IDL Protocol Twitter Bot ready!');
