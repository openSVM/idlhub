/**
 * IDL Protocol Telegram Bot
 *
 * Commands:
 * /start - Welcome message
 * /markets - List active prediction markets
 * /bet <market_id> <amount> <yes|no> - Place a bet
 * /portfolio - View your positions
 * /leaderboard - Top predictors
 * /battle <user> <amount> <market_id> - Challenge to 1v1
 * /guild - View your guild
 * /lootbox <tier> - Buy a lootbox
 */

import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import TelegramBot from 'node-telegram-bot-api';

// Config
const TELEGRAM_TOKEN = process.env.TELEGRAM_BOT_TOKEN || '';
const RPC_URL = process.env.SOLANA_RPC_URL || 'https://api.devnet.solana.com';
const PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');

// Initialize
const connection = new Connection(RPC_URL);
const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// User wallet mapping (telegram_id -> wallet)
const userWallets: Map<number, Keypair> = new Map();

// Command handlers
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(chatId, `
🎯 *Welcome to IDL Protocol Bot!*

I help you bet on Solana DeFi protocol metrics.

*Commands:*
/markets - View active prediction markets
/bet - Place a prediction bet
/portfolio - View your positions
/leaderboard - Top predictors
/battle - Challenge someone to 1v1
/guild - View your guild
/lootbox - Buy a mystery lootbox
/connect - Connect your wallet
/help - More info

_Start by connecting your wallet with /connect_
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/markets/, async (msg) => {
  const chatId = msg.chat.id;

  // Fetch active markets from chain
  // TODO: Implement actual market fetching
  const markets = [
    { id: 'JUP-TVL-2B', name: 'Jupiter TVL > $2B by Jan 2025', odds: '65%', pool: '50,000 IDL' },
    { id: 'DRIFT-VOL-1B', name: 'Drift 24h Volume > $1B', odds: '40%', pool: '25,000 IDL' },
    { id: 'MARINADE-STAKE-10M', name: 'Marinade > 10M SOL staked', odds: '75%', pool: '100,000 IDL' },
  ];

  let message = '📊 *Active Prediction Markets*\n\n';
  for (const market of markets) {
    message += `*${market.id}*\n`;
    message += `${market.name}\n`;
    message += `YES: ${market.odds} | Pool: ${market.pool}\n\n`;
  }

  message += '_Use /bet <market_id> <amount> <yes|no> to place a bet_';

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/bet (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match?.[1]?.split(' ') || [];

  if (args.length < 3) {
    await bot.sendMessage(chatId,
      '❌ Usage: /bet <market_id> <amount> <yes|no>\n\nExample: /bet JUP-TVL-2B 100 yes'
    );
    return;
  }

  const [marketId, amountStr, side] = args;
  const amount = parseFloat(amountStr);

  if (isNaN(amount) || amount <= 0) {
    await bot.sendMessage(chatId, '❌ Invalid amount');
    return;
  }

  if (!['yes', 'no'].includes(side.toLowerCase())) {
    await bot.sendMessage(chatId, '❌ Side must be "yes" or "no"');
    return;
  }

  // Check if user has connected wallet
  if (!userWallets.has(msg.from?.id || 0)) {
    await bot.sendMessage(chatId, '❌ Please connect your wallet first with /connect');
    return;
  }

  // TODO: Implement actual bet placement via commit-reveal
  await bot.sendMessage(chatId, `
✅ *Bet Submitted!*

Market: ${marketId}
Amount: ${amount} IDL
Side: ${side.toUpperCase()}

_Your bet is being committed. You'll receive a reveal link in 5 minutes._
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/portfolio/, async (msg) => {
  const chatId = msg.chat.id;

  // TODO: Fetch actual positions
  const positions = [
    { market: 'JUP-TVL-2B', side: 'YES', amount: 100, odds: 1.54 },
    { market: 'DRIFT-VOL-1B', side: 'NO', amount: 50, odds: 2.5 },
  ];

  let message = '💼 *Your Portfolio*\n\n';
  let totalValue = 0;

  for (const pos of positions) {
    const potentialPayout = pos.amount * pos.odds;
    totalValue += pos.amount;
    message += `*${pos.market}*\n`;
    message += `${pos.side}: ${pos.amount} IDL @ ${pos.odds}x\n`;
    message += `Potential: ${potentialPayout.toFixed(2)} IDL\n\n`;
  }

  message += `*Total Staked:* ${totalValue} IDL`;

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/leaderboard/, async (msg) => {
  const chatId = msg.chat.id;

  // TODO: Fetch actual leaderboard
  const leaders = [
    { rank: 1, name: 'whale.sol', accuracy: '78%', winnings: '125,000 IDL' },
    { rank: 2, name: 'predictor.sol', accuracy: '72%', winnings: '89,000 IDL' },
    { rank: 3, name: 'chad.sol', accuracy: '69%', winnings: '67,000 IDL' },
    { rank: 4, name: 'degen.sol', accuracy: '65%', winnings: '45,000 IDL' },
    { rank: 5, name: 'gigabrain.sol', accuracy: '63%', winnings: '32,000 IDL' },
  ];

  let message = '🏆 *Top Predictors*\n\n';
  const medals = ['🥇', '🥈', '🥉', '4️⃣', '5️⃣'];

  for (const leader of leaders) {
    message += `${medals[leader.rank - 1]} *${leader.name}*\n`;
    message += `   Accuracy: ${leader.accuracy} | Won: ${leader.winnings}\n\n`;
  }

  await bot.sendMessage(chatId, message, { parse_mode: 'Markdown' });
});

bot.onText(/\/battle (.+)/, async (msg, match) => {
  const chatId = msg.chat.id;
  const args = match?.[1]?.split(' ') || [];

  if (args.length < 3) {
    await bot.sendMessage(chatId,
      '❌ Usage: /battle <@user> <amount> <market_id>\n\nExample: /battle @whale 100 JUP-TVL-2B'
    );
    return;
  }

  const [opponent, amountStr, marketId] = args;

  await bot.sendMessage(chatId, `
⚔️ *Battle Challenge Sent!*

Opponent: ${opponent}
Stake: ${amountStr} IDL
Market: ${marketId}

_Waiting for opponent to accept (24h timeout)..._
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/lootbox (.+)?/, async (msg, match) => {
  const chatId = msg.chat.id;
  const tier = match?.[1]?.toLowerCase() || 'common';

  const prices = {
    common: 1,
    rare: 10,
    legendary: 100,
  };

  const price = prices[tier as keyof typeof prices] || 1;

  // Simulate lootbox opening
  const rewards = [
    '1% fee discount (7 days)',
    '2% stake boost (7 days)',
    '3% fee discount (30 days)',
    '5% stake boost (30 days)',
    '10 IDL tokens',
    '50 IDL tokens',
    'VIP tier upgrade',
    '500 IDL JACKPOT! 🎉',
  ];

  const reward = rewards[Math.floor(Math.random() * rewards.length)];

  await bot.sendMessage(chatId, `
🎁 *Lootbox Opened!*

Tier: ${tier.toUpperCase()}
Cost: ${price} IDL

*You got:* ${reward}

_Reward has been applied to your account!_
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/connect/, async (msg) => {
  const chatId = msg.chat.id;

  // Generate a unique connect URL
  const connectId = Math.random().toString(36).substring(7);

  await bot.sendMessage(chatId, `
🔗 *Connect Your Wallet*

Click the link below to connect your Solana wallet:

https://idlhub.io/connect?telegram=${msg.from?.id}&code=${connectId}

_Link expires in 10 minutes_
  `, { parse_mode: 'Markdown' });
});

bot.onText(/\/help/, async (msg) => {
  const chatId = msg.chat.id;

  await bot.sendMessage(chatId, `
📚 *IDL Protocol Help*

*Basic Commands:*
/markets - Browse prediction markets
/bet <id> <amt> <side> - Place a bet
/portfolio - Your positions
/leaderboard - Top predictors

*Advanced:*
/battle <user> <amt> <id> - 1v1 challenge
/guild - Guild management
/lootbox <tier> - Buy lootbox
/stoploss <bet_id> <pct> - Set stop loss
/cashout <bet_id> - Early exit

*Account:*
/connect - Connect wallet
/stats - Your prediction stats
/referral - Get referral link

*Tiers:*
Common lootbox: 1 IDL
Rare lootbox: 10 IDL
Legendary lootbox: 100 IDL

_Questions? Join @IDLProtocol_
  `, { parse_mode: 'Markdown' });
});

// Win notification handler (called by backend)
export async function notifyWin(telegramId: number, market: string, amount: number) {
  await bot.sendMessage(telegramId, `
🎉 *YOU WON!*

Market: ${market}
Winnings: ${amount} IDL

Share your win: /share ${market}
  `, { parse_mode: 'Markdown' });
}

console.log('IDL Protocol Telegram Bot started!');
