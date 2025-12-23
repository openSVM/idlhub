// Buffer polyfill initialization - MUST load before any Solana code
import { Buffer } from 'buffer';

// Set up globals for Solana Web3.js
(window as any).Buffer = Buffer;
(window as any).global = window;
(window as any).process = { env: {}, browser: true };

console.log('Buffer polyfill initialized');
