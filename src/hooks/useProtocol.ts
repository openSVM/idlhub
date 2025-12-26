import { useState, useEffect, useCallback } from 'react';
import { Connection, PublicKey } from '@solana/web3.js';
import { useWallet } from '../context/WalletContext';

// Lazy initialization to avoid module-scope instantiation (breaks Vite code splitting)
let _PROGRAM_ID: PublicKey;
const getProgramId = () => {
  if (!_PROGRAM_ID) {
    _PROGRAM_ID = new PublicKey('BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt');
  }
  return _PROGRAM_ID;
};

export interface ProtocolStats {
  totalStaked: bigint;
  totalVeSupply: bigint;
  rewardPool: bigint;
  totalFeesCollected: bigint;
  totalBurned: bigint;
  paused: boolean;
}

export interface Battle {
  address: PublicKey;
  challenger: PublicKey;
  opponent: PublicKey;
  market: PublicKey;
  stakeAmount: bigint;
  challengerSide: boolean;
  status: number; // 0=Pending, 1=Active, 2=Resolved, 3=Cancelled
  winner: PublicKey | null;
  createdAt: bigint;
}

export interface Guild {
  address: PublicKey;
  name: string;
  leader: PublicKey;
  memberCount: number;
  totalWinnings: bigint;
  createdAt: bigint;
}

export interface Market {
  address: PublicKey;
  protocolId: string;
  description: string;
  targetValue: bigint;
  resolutionTimestamp: bigint;
  totalYesAmount: bigint;
  totalNoAmount: bigint;
  resolved: boolean;
  outcome: boolean | null;
}

export function useProtocolStats() {
  const { connection } = useWallet();
  const [stats, setStats] = useState<ProtocolStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    async function fetchStats() {
      try {
        const [statePDA] = PublicKey.findProgramAddressSync(
          [Buffer.from('state')],
          getProgramId()
        );
        const account = await connection.getAccountInfo(statePDA);
        if (account) {
          const data = account.data;
          let offset = 8; // Skip discriminator
          offset += 32; // authority
          offset += 32; // treasury
          const totalStaked = data.readBigUInt64LE(offset); offset += 8;
          const totalVeSupply = data.readBigUInt64LE(offset); offset += 8;
          const rewardPool = data.readBigUInt64LE(offset); offset += 8;
          const totalFeesCollected = data.readBigUInt64LE(offset); offset += 8;
          const totalBurned = data.readBigUInt64LE(offset); offset += 8;
          offset += 1; // bump
          const paused = data[offset] === 1;

          setStats({ totalStaked, totalVeSupply, rewardPool, totalFeesCollected, totalBurned, paused });
        }
        setLoading(false);
      } catch (err) {
        setError(err as Error);
        setLoading(false);
      }
    }
    fetchStats();
  }, [connection]);

  return { stats, loading, error };
}

export function useBattles() {
  const { connection, publicKey } = useWallet();
  const [battles, setBattles] = useState<Battle[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch all battle accounts from chain
      // Battle account size: 8 (discriminator) + 32*3 (keys) + 8 (amount) + 1 (side) + 1 (status) + 33 (option winner) + 8 (created) + 9 (option accepted) + 1 (bump) = ~150
      const accounts = await connection.getProgramAccounts(getProgramId(), {
        filters: [
          { dataSize: 150 } // Approximate battle account size
        ]
      });

      const parsed: Battle[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          const data = account.data;
          let offset = 8;
          const challenger = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
          const opponent = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
          const market = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
          const stakeAmount = data.readBigUInt64LE(offset); offset += 8;
          const challengerSide = data[offset] === 1; offset += 1;
          const status = data[offset]; offset += 1;
          const hasWinner = data[offset] === 1; offset += 1;
          const winner = hasWinner ? new PublicKey(data.slice(offset, offset + 32)) : null;
          if (hasWinner) offset += 32;
          const createdAt = data.readBigInt64LE(offset);

          parsed.push({
            address: pubkey,
            challenger,
            opponent,
            market,
            stakeAmount,
            challengerSide,
            status,
            winner,
            createdAt
          });
        } catch {
          // Skip malformed accounts
        }
      }
      setBattles(parsed);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { battles, loading, error, refresh };
}

export function useGuilds() {
  const { connection } = useWallet();
  const [guilds, setGuilds] = useState<Guild[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      // Guild accounts have variable size due to name string
      const accounts = await connection.getProgramAccounts(getProgramId());

      const parsed: Guild[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          const data = account.data;
          // Check if this looks like a guild account by checking discriminator
          // Guild has: 8 (disc) + 4 (name len) + name + 32 (leader) + 4 (count) + 8 (winnings) + 8 (created) + 1 (bump)
          if (data.length < 70) continue; // Too small for guild

          let offset = 8;
          const nameLen = data.readUInt32LE(offset); offset += 4;
          if (nameLen > 32 || nameLen === 0) continue; // Invalid name length

          const name = data.slice(offset, offset + nameLen).toString('utf8'); offset += nameLen;
          const leader = new PublicKey(data.slice(offset, offset + 32)); offset += 32;
          const memberCount = data.readUInt32LE(offset); offset += 4;
          const totalWinnings = data.readBigUInt64LE(offset); offset += 8;
          const createdAt = data.readBigInt64LE(offset);

          parsed.push({
            address: pubkey,
            name,
            leader,
            memberCount,
            totalWinnings,
            createdAt
          });
        } catch {
          // Skip
        }
      }
      setGuilds(parsed);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { guilds, loading, error, refresh };
}

export function useMarkets() {
  const { connection } = useWallet();
  const [markets, setMarkets] = useState<Market[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const accounts = await connection.getProgramAccounts(getProgramId());

      const parsed: Market[] = [];
      for (const { pubkey, account } of accounts) {
        try {
          const data = account.data;
          // Market accounts are larger and have specific structure
          if (data.length < 200) continue;

          let offset = 8;
          offset += 32; // creator

          const protocolIdLen = data.readUInt32LE(offset); offset += 4;
          if (protocolIdLen > 64 || protocolIdLen === 0) continue;
          const protocolId = data.slice(offset, offset + protocolIdLen).toString('utf8'); offset += protocolIdLen;

          offset += 1; // metric type
          const targetValue = data.readBigUInt64LE(offset); offset += 8;
          const resolutionTimestamp = data.readBigInt64LE(offset); offset += 8;

          const descLen = data.readUInt32LE(offset); offset += 4;
          if (descLen > 256) continue;
          const description = data.slice(offset, offset + descLen).toString('utf8'); offset += descLen;

          const totalYesAmount = data.readBigUInt64LE(offset); offset += 8;
          const totalNoAmount = data.readBigUInt64LE(offset); offset += 8;
          const resolved = data[offset] === 1; offset += 1;
          const hasOutcome = data[offset] === 1; offset += 1;
          const outcome = hasOutcome ? data[offset] === 1 : null;

          parsed.push({
            address: pubkey,
            protocolId,
            description,
            targetValue,
            resolutionTimestamp,
            totalYesAmount,
            totalNoAmount,
            resolved,
            outcome
          });
        } catch {
          // Skip
        }
      }
      setMarkets(parsed);
      setLoading(false);
    } catch (err) {
      setError(err as Error);
      setLoading(false);
    }
  }, [connection]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { markets, loading, error, refresh };
}
