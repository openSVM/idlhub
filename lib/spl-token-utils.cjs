/**
 * Pure JS SPL Token utilities (CommonJS)
 * Replaces @solana/spl-token to eliminate bigint-buffer vulnerability (CVE-2025-3194)
 */

const { PublicKey, TransactionInstruction, SystemProgram, Keypair, Transaction, sendAndConfirmTransaction } = require('@solana/web3.js');

// Token Program IDs
const TOKEN_PROGRAM_ID = new PublicKey('TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA');
const TOKEN_2022_PROGRAM_ID = new PublicKey('TokenzQdBNbLqP5VEhdkAS6EPFLC1PHnBqCXEpPxuEb');
const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey('ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL');

/**
 * Get the associated token address for a wallet and mint
 */
function getAssociatedTokenAddressSync(
  mint,
  owner,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
) {
  const [address] = PublicKey.findProgramAddressSync(
    [owner.toBuffer(), programId.toBuffer(), mint.toBuffer()],
    associatedTokenProgramId
  );
  return address;
}

/**
 * Async version of getAssociatedTokenAddress (for compatibility)
 */
async function getAssociatedTokenAddress(
  mint,
  owner,
  allowOwnerOffCurve = false,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
) {
  return getAssociatedTokenAddressSync(mint, owner, allowOwnerOffCurve, programId, associatedTokenProgramId);
}

/**
 * Create instruction to create an associated token account
 */
function createAssociatedTokenAccountInstruction(
  payer,
  associatedToken,
  owner,
  mint,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
) {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ],
    programId: associatedTokenProgramId,
    data: Buffer.alloc(0),
  });
}

/**
 * Create instruction to create an associated token account (idempotent)
 */
function createAssociatedTokenAccountIdempotentInstruction(
  payer,
  associatedToken,
  owner,
  mint,
  programId = TOKEN_PROGRAM_ID,
  associatedTokenProgramId = ASSOCIATED_TOKEN_PROGRAM_ID
) {
  return new TransactionInstruction({
    keys: [
      { pubkey: payer, isSigner: true, isWritable: true },
      { pubkey: associatedToken, isSigner: false, isWritable: true },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: SystemProgram.programId, isSigner: false, isWritable: false },
      { pubkey: programId, isSigner: false, isWritable: false },
    ],
    programId: associatedTokenProgramId,
    data: Buffer.from([1]), // CreateIdempotent instruction
  });
}

/**
 * Create instruction to initialize a mint
 */
function createInitializeMintInstruction(
  mint,
  decimals,
  mintAuthority,
  freezeAuthority,
  programId = TOKEN_PROGRAM_ID
) {
  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
  ];

  const data = Buffer.alloc(67);
  data.writeUInt8(0, 0); // InitializeMint instruction
  data.writeUInt8(decimals, 1);
  mintAuthority.toBuffer().copy(data, 2);
  data.writeUInt8(freezeAuthority ? 1 : 0, 34);
  if (freezeAuthority) {
    freezeAuthority.toBuffer().copy(data, 35);
  }

  return new TransactionInstruction({ keys, programId, data });
}

/**
 * Create instruction to mint tokens
 */
function createMintToInstruction(
  mint,
  destination,
  authority,
  amount,
  multiSigners = [],
  programId = TOKEN_PROGRAM_ID
) {
  const keys = [
    { pubkey: mint, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: authority, isSigner: multiSigners.length === 0, isWritable: false },
  ];

  for (const signer of multiSigners) {
    keys.push({ pubkey: signer.publicKey, isSigner: true, isWritable: false });
  }

  const data = Buffer.alloc(9);
  data.writeUInt8(7, 0); // MintTo instruction
  data.writeBigUInt64LE(BigInt(amount), 1);

  return new TransactionInstruction({ keys, programId, data });
}

/**
 * Create instruction to transfer tokens
 */
function createTransferInstruction(
  source,
  destination,
  owner,
  amount,
  multiSigners = [],
  programId = TOKEN_PROGRAM_ID
) {
  const keys = [
    { pubkey: source, isSigner: false, isWritable: true },
    { pubkey: destination, isSigner: false, isWritable: true },
    { pubkey: owner, isSigner: multiSigners.length === 0, isWritable: false },
  ];

  for (const signer of multiSigners) {
    keys.push({ pubkey: signer.publicKey, isSigner: true, isWritable: false });
  }

  const data = Buffer.alloc(9);
  data.writeUInt8(3, 0); // Transfer instruction
  data.writeBigUInt64LE(BigInt(amount), 1);

  return new TransactionInstruction({ keys, programId, data });
}

/**
 * Get mint info from account data
 */
function unpackMint(data) {
  if (data.length < 82) {
    throw new Error('Invalid mint data');
  }

  return {
    mintAuthority: data.readUInt8(0) === 1 ? new PublicKey(data.subarray(4, 36)) : null,
    supply: data.readBigUInt64LE(36),
    decimals: data.readUInt8(44),
    isInitialized: data.readUInt8(45) === 1,
    freezeAuthority: data.readUInt8(46) === 1 ? new PublicKey(data.subarray(50, 82)) : null,
  };
}

/**
 * Get token account info from account data
 */
function unpackAccount(data) {
  if (data.length < 165) {
    throw new Error('Invalid token account data');
  }

  return {
    mint: new PublicKey(data.subarray(0, 32)),
    owner: new PublicKey(data.subarray(32, 64)),
    amount: data.readBigUInt64LE(64),
    delegate: data.readUInt8(72) === 1 ? new PublicKey(data.subarray(76, 108)) : null,
    state: data.readUInt8(108),
    isNative: data.readUInt8(109) === 1 ? data.readBigUInt64LE(113) : null,
    delegatedAmount: data.readBigUInt64LE(121),
    closeAuthority: data.readUInt8(129) === 1 ? new PublicKey(data.subarray(133, 165)) : null,
  };
}

// Token account states
const AccountState = {
  Uninitialized: 0,
  Initialized: 1,
  Frozen: 2,
};

// Mint layout size
const MINT_SIZE = 82;

// Token account layout size
const ACCOUNT_SIZE = 165;

/**
 * Create instruction to initialize a token account
 */
function createInitializeAccountInstruction(
  account,
  mint,
  owner,
  programId = TOKEN_PROGRAM_ID
) {
  return new TransactionInstruction({
    keys: [
      { pubkey: account, isSigner: false, isWritable: true },
      { pubkey: mint, isSigner: false, isWritable: false },
      { pubkey: owner, isSigner: false, isWritable: false },
      { pubkey: new PublicKey('SysvarRent111111111111111111111111111111111'), isSigner: false, isWritable: false },
    ],
    programId,
    data: Buffer.from([1]),
  });
}

/**
 * Create a new SPL Token mint (high-level helper)
 */
async function createMint(
  connection,
  payer,
  mintAuthority,
  freezeAuthority,
  decimals,
  keypair = Keypair.generate(),
  confirmOptions,
  programId = TOKEN_PROGRAM_ID
) {
  const lamports = await connection.getMinimumBalanceForRentExemption(MINT_SIZE);

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: keypair.publicKey,
      space: MINT_SIZE,
      lamports,
      programId,
    }),
    createInitializeMintInstruction(keypair.publicKey, decimals, mintAuthority, freezeAuthority, programId)
  );

  await sendAndConfirmTransaction(connection, tx, [payer, keypair], confirmOptions);
  return keypair.publicKey;
}

/**
 * Create a new token account (high-level helper)
 */
async function createAccount(
  connection,
  payer,
  mint,
  owner,
  keypair = Keypair.generate(),
  confirmOptions,
  programId = TOKEN_PROGRAM_ID
) {
  const lamports = await connection.getMinimumBalanceForRentExemption(ACCOUNT_SIZE);

  const tx = new Transaction().add(
    SystemProgram.createAccount({
      fromPubkey: payer.publicKey,
      newAccountPubkey: keypair.publicKey,
      space: ACCOUNT_SIZE,
      lamports,
      programId,
    }),
    createInitializeAccountInstruction(keypair.publicKey, mint, owner, programId)
  );

  await sendAndConfirmTransaction(connection, tx, [payer, keypair], confirmOptions);
  return keypair.publicKey;
}

/**
 * Mint tokens to a destination (high-level helper)
 */
async function mintTo(
  connection,
  payer,
  mint,
  destination,
  authority,
  amount,
  multiSigners = [],
  confirmOptions,
  programId = TOKEN_PROGRAM_ID
) {
  const tx = new Transaction().add(
    createMintToInstruction(mint, destination, authority.publicKey || authority, amount, multiSigners, programId)
  );

  const signers = [payer];
  if (authority.publicKey) {
    signers.push(authority);
  }
  signers.push(...multiSigners);

  await sendAndConfirmTransaction(connection, tx, signers, confirmOptions);
}

/**
 * Get token account info (high-level helper)
 */
async function getAccount(
  connection,
  address,
  commitment,
  programId = TOKEN_PROGRAM_ID
) {
  const accountInfo = await connection.getAccountInfo(address, commitment);
  if (!accountInfo) {
    throw new Error('TokenAccountNotFoundError');
  }
  if (!accountInfo.owner.equals(programId)) {
    throw new Error('TokenInvalidAccountOwnerError');
  }
  return unpackAccount(accountInfo.data);
}

/**
 * Get mint info (high-level helper)
 */
async function getMint(
  connection,
  address,
  commitment,
  programId = TOKEN_PROGRAM_ID
) {
  const accountInfo = await connection.getAccountInfo(address, commitment);
  if (!accountInfo) {
    throw new Error('TokenAccountNotFoundError');
  }
  return unpackMint(accountInfo.data);
}

module.exports = {
  TOKEN_PROGRAM_ID,
  TOKEN_2022_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  getAssociatedTokenAddressSync,
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  createAssociatedTokenAccountIdempotentInstruction,
  createInitializeMintInstruction,
  createInitializeAccountInstruction,
  createMintToInstruction,
  createTransferInstruction,
  unpackMint,
  unpackAccount,
  AccountState,
  MINT_SIZE,
  ACCOUNT_SIZE,
  createMint,
  createAccount,
  mintTo,
  getAccount,
  getMint,
};
