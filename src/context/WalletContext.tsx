import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from 'react';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';

const RPC_URL = import.meta.env.VITE_SOLANA_RPC_URL || 'https://api.devnet.solana.com';

interface WalletContextType {
  connected: boolean;
  publicKey: PublicKey | null;
  connection: Connection;
  connect: () => Promise<void>;
  disconnect: () => void;
  signTransaction: (tx: any) => Promise<any>;
}

const WalletContext = createContext<WalletContextType | null>(null);

export function WalletProvider({ children }: { children: ReactNode }) {
  const [connected, setConnected] = useState(false);
  const [publicKey, setPublicKey] = useState<PublicKey | null>(null);
  const [connection] = useState(() => new Connection(RPC_URL, 'confirmed'));

  // Check for Phantom wallet
  const getProvider = useCallback(() => {
    if ('phantom' in window) {
      const provider = (window as any).phantom?.solana;
      if (provider?.isPhantom) {
        return provider;
      }
    }
    return null;
  }, []);

  // No auto-connect - IDLHub is a dev tool that should work without wallet
  // Users can manually click "Connect Wallet" when they want to make transactions

  const connect = async () => {
    const provider = getProvider();
    if (!provider) {
      window.open('https://phantom.app/', '_blank');
      return;
    }

    try {
      const { publicKey } = await provider.connect();
      setPublicKey(publicKey);
      setConnected(true);
    } catch (err) {
      console.error('Failed to connect wallet:', err);
    }
  };

  const disconnect = () => {
    const provider = getProvider();
    if (provider) {
      provider.disconnect();
    }
    setPublicKey(null);
    setConnected(false);
  };

  const signTransaction = async (tx: any) => {
    const provider = getProvider();
    if (!provider) {
      throw new Error('Wallet not connected');
    }
    return provider.signTransaction(tx);
  };

  return (
    <WalletContext.Provider value={{ connected, publicKey, connection, connect, disconnect, signTransaction }}>
      {children}
    </WalletContext.Provider>
  );
}

export function useWallet() {
  const context = useContext(WalletContext);
  if (!context) {
    throw new Error('useWallet must be used within WalletProvider');
  }
  return context;
}
