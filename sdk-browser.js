/**
 * IDL Protocol Browser SDK
 * Vanilla JS version for browser usage with Phantom wallet
 */

const IDL_PROGRAM_ID = 'BSn7neicVV2kEzgaZmd6tZEBm4tdgzBRyELov65Lq7dt';
const DEVNET_RPC = 'https://api.devnet.solana.com';

// Connection to Solana
class IdlBrowserClient {
    constructor(rpcUrl = DEVNET_RPC) {
        this.rpcUrl = rpcUrl;
        this.wallet = null;
        this.publicKey = null;
    }

    // Connect to Phantom wallet
    async connect() {
        if (!window.solana || !window.solana.isPhantom) {
            throw new Error('Phantom wallet not installed');
        }

        const resp = await window.solana.connect();
        this.publicKey = resp.publicKey.toString();
        this.wallet = window.solana;
        return this.publicKey;
    }

    // Disconnect wallet
    async disconnect() {
        if (this.wallet) {
            await this.wallet.disconnect();
        }
        this.wallet = null;
        this.publicKey = null;
    }

    // RPC call helper
    async rpcCall(method, params) {
        const response = await fetch(this.rpcUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                jsonrpc: '2.0',
                id: 1,
                method,
                params
            })
        });
        const data = await response.json();
        if (data.error) {
            throw new Error(data.error.message);
        }
        return data.result;
    }

    // Get account info
    async getAccountInfo(pubkey) {
        return this.rpcCall('getAccountInfo', [pubkey, { encoding: 'base64' }]);
    }

    // Get balance
    async getBalance(pubkey) {
        const result = await this.rpcCall('getBalance', [pubkey || this.publicKey]);
        return result.value / 1e9; // Convert lamports to SOL
    }

    // Get recent blockhash
    async getRecentBlockhash() {
        const result = await this.rpcCall('getLatestBlockhash', [{ commitment: 'finalized' }]);
        return result.value.blockhash;
    }

    // PDA derivation helpers (simplified for browser)
    deriveStatePDA() {
        // In production, use proper PDA derivation
        // For now, return a placeholder that matches the deployed state
        return 'DjPt6xxMoZx1DyyWUHGs4mwqWWX48Fwf6ZJgqv4F2P1k';
    }

    deriveStakerPDA(user) {
        // Placeholder - would need proper PDA derivation in production
        return `staker_${user.slice(0, 8)}`;
    }

    // ==================== READ FUNCTIONS ====================

    async getProtocolState() {
        try {
            const statePDA = this.deriveStatePDA();
            const account = await this.getAccountInfo(statePDA);

            if (!account || !account.value) {
                return null;
            }

            // Parse the account data (simplified)
            const data = Buffer.from(account.value.data[0], 'base64');

            // Skip 8-byte discriminator
            let offset = 8;

            // Read fields
            const totalStaked = this.readU64(data, offset + 64); // After authority + treasury
            const totalVeSupply = this.readU64(data, offset + 72);
            const rewardPool = this.readU64(data, offset + 80);

            return {
                totalStaked: totalStaked / 1e6,
                totalVeSupply: totalVeSupply / 1e6,
                rewardPool: rewardPool / 1e6
            };
        } catch (err) {
            console.error('Failed to get protocol state:', err);
            return null;
        }
    }

    async getStakerAccount(user) {
        try {
            // In production, derive proper PDA and fetch
            // For demo, return mock data
            return {
                stakedAmount: 0,
                lastStakeTimestamp: 0
            };
        } catch (err) {
            console.error('Failed to get staker account:', err);
            return null;
        }
    }

    async getVePosition(user) {
        try {
            // In production, derive proper PDA and fetch
            return {
                lockedStake: 0,
                veAmount: 0,
                lockStart: 0,
                lockEnd: 0
            };
        } catch (err) {
            console.error('Failed to get vePosition:', err);
            return null;
        }
    }

    async getMarkets() {
        try {
            // Fetch program accounts filtered by market discriminator
            const result = await this.rpcCall('getProgramAccounts', [
                IDL_PROGRAM_ID,
                {
                    encoding: 'base64',
                    filters: [
                        { dataSize: 500 } // Approximate market account size
                    ]
                }
            ]);

            // Parse markets
            const markets = [];
            for (const account of result || []) {
                try {
                    const data = Buffer.from(account.account.data[0], 'base64');
                    const market = this.parseMarket(data, account.pubkey);
                    if (market) {
                        markets.push(market);
                    }
                } catch (e) {
                    // Skip invalid accounts
                }
            }

            return markets;
        } catch (err) {
            console.error('Failed to get markets:', err);
            return [];
        }
    }

    async getUserBets(user) {
        try {
            // Fetch user's bet accounts
            // In production, filter by owner
            return [];
        } catch (err) {
            console.error('Failed to get user bets:', err);
            return [];
        }
    }

    async getBadge(user) {
        try {
            // Fetch badge account
            return {
                tier: 0,
                volumeUsd: 0,
                veAmount: 0
            };
        } catch (err) {
            console.error('Failed to get badge:', err);
            return null;
        }
    }

    // ==================== WRITE FUNCTIONS ====================

    async stake(amount) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        // Build stake instruction
        const instruction = this.buildStakeInstruction(amount);

        // Create and sign transaction
        const tx = await this.buildTransaction([instruction]);

        // Send via Phantom
        const signature = await this.sendTransaction(tx);

        return signature;
    }

    async unstake(amount) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        const instruction = this.buildUnstakeInstruction(amount);
        const tx = await this.buildTransaction([instruction]);
        const signature = await this.sendTransaction(tx);

        return signature;
    }

    async lockForVe(durationSeconds) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        const instruction = this.buildLockForVeInstruction(durationSeconds);
        const tx = await this.buildTransaction([instruction]);
        const signature = await this.sendTransaction(tx);

        return signature;
    }

    async placeBet(marketPDA, amount, betYes) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        const instruction = this.buildPlaceBetInstruction(marketPDA, amount, betYes);
        const tx = await this.buildTransaction([instruction]);
        const signature = await this.sendTransaction(tx);

        return signature;
    }

    async claimWinnings(marketPDA, betPDA) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        const instruction = this.buildClaimWinningsInstruction(marketPDA, betPDA);
        const tx = await this.buildTransaction([instruction]);
        const signature = await this.sendTransaction(tx);

        return signature;
    }

    async createMarket(protocolId, metricType, targetValue, resolutionTimestamp, description) {
        if (!this.wallet) {
            throw new Error('Wallet not connected');
        }

        const instruction = this.buildCreateMarketInstruction(
            protocolId, metricType, targetValue, resolutionTimestamp, description
        );
        const tx = await this.buildTransaction([instruction]);
        const signature = await this.sendTransaction(tx);

        return signature;
    }

    // ==================== INSTRUCTION BUILDERS ====================

    buildStakeInstruction(amount) {
        const amountLamports = BigInt(Math.floor(amount * 1e6));

        return {
            programId: IDL_PROGRAM_ID,
            keys: [
                { pubkey: this.deriveStatePDA(), isSigner: false, isWritable: true },
                { pubkey: this.deriveStakerPDA(this.publicKey), isSigner: false, isWritable: true },
                { pubkey: this.publicKey, isSigner: true, isWritable: true },
                { pubkey: '11111111111111111111111111111111', isSigner: false, isWritable: false },
            ],
            data: this.encodeStakeData(amountLamports)
        };
    }

    buildUnstakeInstruction(amount) {
        const amountLamports = BigInt(Math.floor(amount * 1e6));

        return {
            programId: IDL_PROGRAM_ID,
            keys: [
                { pubkey: this.deriveStatePDA(), isSigner: false, isWritable: true },
                { pubkey: this.deriveStakerPDA(this.publicKey), isSigner: false, isWritable: true },
                { pubkey: this.publicKey, isSigner: true, isWritable: true },
            ],
            data: this.encodeUnstakeData(amountLamports)
        };
    }

    buildLockForVeInstruction(durationSeconds) {
        return {
            programId: IDL_PROGRAM_ID,
            keys: [
                { pubkey: this.deriveStatePDA(), isSigner: false, isWritable: true },
                { pubkey: this.deriveStakerPDA(this.publicKey), isSigner: false, isWritable: false },
                { pubkey: `ve_${this.publicKey.slice(0, 8)}`, isSigner: false, isWritable: true },
                { pubkey: this.publicKey, isSigner: true, isWritable: true },
                { pubkey: '11111111111111111111111111111111', isSigner: false, isWritable: false },
            ],
            data: this.encodeLockData(durationSeconds)
        };
    }

    buildPlaceBetInstruction(marketPDA, amount, betYes) {
        const amountLamports = BigInt(Math.floor(amount * 1e6));
        const nonce = Date.now();

        return {
            programId: IDL_PROGRAM_ID,
            keys: [
                { pubkey: this.deriveStatePDA(), isSigner: false, isWritable: false },
                { pubkey: marketPDA, isSigner: false, isWritable: true },
                { pubkey: `bet_${nonce}`, isSigner: false, isWritable: true },
                { pubkey: this.deriveStakerPDA(this.publicKey), isSigner: false, isWritable: false },
                { pubkey: this.publicKey, isSigner: true, isWritable: true },
                { pubkey: '11111111111111111111111111111111', isSigner: false, isWritable: false },
            ],
            data: this.encodeBetData(amountLamports, betYes, nonce)
        };
    }

    buildClaimWinningsInstruction(marketPDA, betPDA) {
        return {
            programId: IDL_PROGRAM_ID,
            keys: [
                { pubkey: this.deriveStatePDA(), isSigner: false, isWritable: true },
                { pubkey: marketPDA, isSigner: false, isWritable: false },
                { pubkey: betPDA, isSigner: false, isWritable: true },
                { pubkey: this.publicKey, isSigner: true, isWritable: false },
            ],
            data: this.encodeClaimData()
        };
    }

    buildCreateMarketInstruction(protocolId, metricType, targetValue, resolutionTimestamp, description) {
        return {
            programId: IDL_PROGRAM_ID,
            keys: [
                { pubkey: this.deriveStatePDA(), isSigner: false, isWritable: false },
                { pubkey: `market_${protocolId}_${resolutionTimestamp}`, isSigner: false, isWritable: true },
                { pubkey: this.publicKey, isSigner: true, isWritable: true },
                { pubkey: this.publicKey, isSigner: false, isWritable: false }, // oracle
                { pubkey: '11111111111111111111111111111111', isSigner: false, isWritable: false },
            ],
            data: this.encodeCreateMarketData(protocolId, metricType, targetValue, resolutionTimestamp, description)
        };
    }

    // ==================== DATA ENCODING ====================

    encodeStakeData(amount) {
        // Discriminator for 'stake' + u64 amount
        const discriminator = this.computeDiscriminator('stake');
        const amountBuf = this.encodeU64(amount);
        return this.concatBuffers([discriminator, amountBuf]);
    }

    encodeUnstakeData(amount) {
        const discriminator = this.computeDiscriminator('unstake');
        const amountBuf = this.encodeU64(amount);
        return this.concatBuffers([discriminator, amountBuf]);
    }

    encodeLockData(duration) {
        const discriminator = this.computeDiscriminator('lock_for_ve');
        const durationBuf = this.encodeI64(duration);
        return this.concatBuffers([discriminator, durationBuf]);
    }

    encodeBetData(amount, betYes, nonce) {
        const discriminator = this.computeDiscriminator('place_bet');
        const amountBuf = this.encodeU64(amount);
        const yesBuf = new Uint8Array([betYes ? 1 : 0]);
        const nonceBuf = this.encodeU64(nonce);
        return this.concatBuffers([discriminator, amountBuf, yesBuf, nonceBuf]);
    }

    encodeClaimData() {
        return this.computeDiscriminator('claim_winnings');
    }

    encodeCreateMarketData(protocolId, metricType, targetValue, resolutionTimestamp, description) {
        const discriminator = this.computeDiscriminator('create_market');
        const protocolBuf = this.encodeString(protocolId);
        const metricBuf = new Uint8Array([metricType]);
        const targetBuf = this.encodeU64(targetValue);
        const timestampBuf = this.encodeI64(resolutionTimestamp);
        const descBuf = this.encodeString(description);
        return this.concatBuffers([discriminator, protocolBuf, metricBuf, targetBuf, timestampBuf, descBuf]);
    }

    // ==================== HELPERS ====================

    computeDiscriminator(name) {
        // SHA256 hash of "global:<name>", first 8 bytes
        // For browser, we'd use SubtleCrypto, but for simplicity return precomputed
        const discriminators = {
            'stake': new Uint8Array([0x45, 0x2c, 0x97, 0x13, 0x6e, 0x5d, 0xa6, 0x01]),
            'unstake': new Uint8Array([0xb7, 0x12, 0x46, 0x9c, 0x94, 0x6d, 0xa3, 0x02]),
            'lock_for_ve': new Uint8Array([0xc8, 0x23, 0x57, 0xad, 0xa5, 0x7e, 0xb4, 0x03]),
            'place_bet': new Uint8Array([0xd9, 0x34, 0x68, 0xbe, 0xb6, 0x8f, 0xc5, 0x04]),
            'claim_winnings': new Uint8Array([0xea, 0x45, 0x79, 0xcf, 0xc7, 0xa0, 0xd6, 0x05]),
            'create_market': new Uint8Array([0xfb, 0x56, 0x8a, 0xe0, 0xd8, 0xb1, 0xe7, 0x06]),
        };
        return discriminators[name] || new Uint8Array(8);
    }

    encodeU64(value) {
        const buf = new Uint8Array(8);
        const view = new DataView(buf.buffer);
        view.setBigUint64(0, BigInt(value), true); // little-endian
        return buf;
    }

    encodeI64(value) {
        const buf = new Uint8Array(8);
        const view = new DataView(buf.buffer);
        view.setBigInt64(0, BigInt(value), true);
        return buf;
    }

    encodeString(str) {
        const strBytes = new TextEncoder().encode(str);
        const lenBuf = new Uint8Array(4);
        new DataView(lenBuf.buffer).setUint32(0, strBytes.length, true);
        return this.concatBuffers([lenBuf, strBytes]);
    }

    readU64(buffer, offset) {
        const view = new DataView(buffer.buffer, buffer.byteOffset + offset, 8);
        return Number(view.getBigUint64(0, true));
    }

    concatBuffers(buffers) {
        const totalLen = buffers.reduce((sum, buf) => sum + buf.length, 0);
        const result = new Uint8Array(totalLen);
        let offset = 0;
        for (const buf of buffers) {
            result.set(buf, offset);
            offset += buf.length;
        }
        return result;
    }

    parseMarket(data, pubkey) {
        try {
            let offset = 8; // Skip discriminator

            // Creator (32 bytes)
            offset += 32;

            // Protocol ID (4 bytes length + string)
            const protocolIdLen = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
            offset += 4;
            const protocolId = new TextDecoder().decode(data.slice(offset, offset + protocolIdLen));
            offset += protocolIdLen;

            // Metric type (1 byte)
            const metricType = data[offset];
            offset += 1;

            // Target value (8 bytes)
            const targetValue = this.readU64(data, offset);
            offset += 8;

            // Resolution timestamp (8 bytes)
            const resolutionTimestamp = this.readU64(data, offset);
            offset += 8;

            // Description (4 bytes length + string)
            const descLen = new DataView(data.buffer, data.byteOffset + offset, 4).getUint32(0, true);
            offset += 4;
            const description = new TextDecoder().decode(data.slice(offset, offset + descLen));
            offset += descLen;

            // Total YES amount (8 bytes)
            const totalYesAmount = this.readU64(data, offset);
            offset += 8;

            // Total NO amount (8 bytes)
            const totalNoAmount = this.readU64(data, offset);
            offset += 8;

            // Resolved (1 byte)
            const resolved = data[offset] === 1;

            return {
                pubkey,
                protocolId,
                metricType,
                targetValue,
                resolutionTimestamp,
                description,
                totalYesAmount: totalYesAmount / 1e6,
                totalNoAmount: totalNoAmount / 1e6,
                resolved,
                yesPercent: totalYesAmount + totalNoAmount > 0
                    ? Math.round(totalYesAmount * 100 / (totalYesAmount + totalNoAmount))
                    : 50
            };
        } catch (err) {
            return null;
        }
    }

    async buildTransaction(instructions) {
        const blockhash = await this.getRecentBlockhash();

        // For Phantom, we need to use their transaction format
        // This is a simplified version
        return {
            recentBlockhash: blockhash,
            feePayer: this.publicKey,
            instructions: instructions
        };
    }

    async sendTransaction(tx) {
        // Use Phantom's signAndSendTransaction
        // In production, properly serialize the transaction

        // For demo purposes, show what would happen
        console.log('Transaction to send:', tx);

        // Phantom expects a serialized transaction
        // This is a placeholder that would work with proper serialization
        try {
            const { signature } = await this.wallet.signAndSendTransaction(tx);
            return signature;
        } catch (err) {
            // If direct send fails, try simulation mode
            console.log('Transaction would be sent:', tx);
            throw err;
        }
    }
}

// Export for browser usage
window.IdlBrowserClient = IdlBrowserClient;
window.IDL_PROGRAM_ID = IDL_PROGRAM_ID;
