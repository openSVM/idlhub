/**
 * Integration templates for different frameworks
 */

export function generateNextJsTemplate(idl: any, programId: string): string {
  const programName = idl.name || 'program';

  return `// Next.js integration for ${programName}
// app/hooks/use${toPascalCase(programName)}.ts

'use client';

import { useMemo } from 'react';
import { useConnection, useWallet } from '@solana/wallet-adapter-react';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { PublicKey } from '@solana/web3.js';
import idl from './idl.json';

export function use${toPascalCase(programName)}() {
  const { connection } = useConnection();
  const wallet = useWallet();

  const program = useMemo(() => {
    if (!wallet.publicKey) return null;

    const provider = new AnchorProvider(
      connection,
      wallet as any,
      { commitment: 'confirmed' }
    );

    return new Program(
      idl as any,
      new PublicKey('${programId}'),
      provider
    );
  }, [connection, wallet]);

  // Add your instruction methods here
  ${idl.instructions
    ?.slice(0, 3)
    .map(
      (inst: any) => `
  const ${toCamelCase(inst.name)} = async (${inst.args?.length ? 'args, ' : ''}accounts) => {
    if (!program) throw new Error('Wallet not connected');
    return await program.methods
      .${toCamelCase(inst.name)}(${inst.args?.map((a: any) => `args.${a.name}`).join(', ') || ''})
      .accounts(accounts)
      .rpc();
  };`
    )
    .join('\n')}

  return {
    program,
    ${idl.instructions?.slice(0, 3).map((inst: any) => toCamelCase(inst.name)).join(',\n    ')},
  };
}

// app/page.tsx - Usage example
import { use${toPascalCase(programName)} } from './hooks/use${toPascalCase(programName)}';

export default function Home() {
  const { ${idl.instructions?.[0] ? toCamelCase(idl.instructions[0].name) : 'instruction'} } = use${toPascalCase(programName)}();

  const handleClick = async () => {
    try {
      const tx = await ${idl.instructions?.[0] ? toCamelCase(idl.instructions[0].name) : 'instruction'}({/* accounts */});
      console.log('Transaction:', tx);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return <button onClick={handleClick}>Execute</button>;
}
`;
}

export function generateReactNativeTemplate(idl: any, programId: string): string {
  const programName = idl.name || 'program';

  return `// React Native integration for ${programName}
// hooks/use${toPascalCase(programName)}.ts

import { useMemo } from 'react';
import { Connection, PublicKey, Transaction } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';
import { transact } from '@solana-mobile/mobile-wallet-adapter-protocol';
import idl from './idl.json';

const CLUSTER = 'mainnet-beta';
const RPC = \`https://api.\${CLUSTER}.solana.com\`;

export function use${toPascalCase(programName)}() {
  const connection = useMemo(() => new Connection(RPC), []);

  const executeInstruction = async (instructionName: string, accounts: any, args: any = {}) => {
    const authToken = await transact(async (wallet) => {
      // Get authorization
      const auth = await wallet.authorize({
        cluster: CLUSTER,
        identity: { name: '${programName} App' },
      });

      // Create provider
      const provider = new AnchorProvider(
        connection,
        {
          publicKey: new PublicKey(auth.accounts[0].address),
          signTransaction: async (tx: Transaction) => {
            const signed = await wallet.signTransactions({
              transactions: [tx.serialize()],
            });
            return Transaction.from(signed.signedTransactions[0]);
          },
          signAllTransactions: async (txs: Transaction[]) => {
            const signed = await wallet.signTransactions({
              transactions: txs.map(tx => tx.serialize()),
            });
            return signed.signedTransactions.map(tx => Transaction.from(tx));
          },
        } as any,
        { commitment: 'confirmed' }
      );

      // Execute instruction
      const program = new Program(idl as any, new PublicKey('${programId}'), provider);
      const method = program.methods[instructionName](...Object.values(args));
      const tx = await method.accounts(accounts).rpc();

      return tx;
    });

    return authToken;
  };

  return {
    executeInstruction,
    connection,
  };
}

// Example usage in component
import { use${toPascalCase(programName)} } from './hooks/use${toPascalCase(programName)}';

export function MyComponent() {
  const { executeInstruction } = use${toPascalCase(programName)}();

  const handlePress = async () => {
    try {
      const tx = await executeInstruction(
        '${idl.instructions?.[0]?.name || 'initialize'}',
        {/* accounts */},
        {/* args */}
      );
      console.log('Success:', tx);
    } catch (error) {
      console.error('Error:', error);
    }
  };

  return (
    <TouchableOpacity onPress={handlePress}>
      <Text>Execute Instruction</Text>
    </TouchableOpacity>
  );
}
`;
}

export function generateRustTemplate(idl: any, programId: string): string {
  const programName = idl.name || 'program';

  return `// Rust backend integration for ${programName}
// Cargo.toml dependencies:
// [dependencies]
// anchor-client = "0.29"
// solana-sdk = "1.17"
// solana-client = "1.17"

use anchor_client::{
    Client, Cluster,
    anchor_lang::prelude::*,
};
use solana_sdk::{
    pubkey::Pubkey,
    signature::{Keypair, Signer},
};
use std::rc::Rc;
use std::str::FromStr;

// Program ID
pub const PROGRAM_ID: Pubkey = solana_sdk::pubkey!("${programId}");

// Account structures (based on IDL)
${idl.accounts
  ?.map(
    (acc: any) => `
#[derive(Debug, Clone, AnchorSerialize, AnchorDeserialize)]
pub struct ${toPascalCase(acc.name)} {
${acc.type?.fields
  ?.map((f: any) => `    pub ${f.name}: ${mapIDLTypeToRust(f.type)},`)
  .join('\n') || '    // No fields'}
}`
  )
  .join('\n\n') || '// No accounts'}

// Client wrapper
pub struct ${toPascalCase(programName)}Client {
    client: Client,
    program_id: Pubkey,
}

impl ${toPascalCase(programName)}Client {
    pub fn new(cluster: Cluster, payer: Rc<Keypair>) -> Self {
        let client = Client::new(cluster, payer);
        Self {
            client,
            program_id: PROGRAM_ID,
        }
    }

    ${idl.instructions
      ?.slice(0, 3)
      .map(
        (inst: any) => `
    pub fn ${toSnakeCase(inst.name)}(
        &self,
        ${inst.args?.map((arg: any) => `${arg.name}: ${mapIDLTypeToRust(arg.type)}`).join(',\n        ') || ''}
    ) -> Result<Signature> {
        let program = self.client.program(self.program_id);

        // Build instruction
        let ix = program
            .request()
            .accounts(/* Add accounts here */)
            .args(/* Add args here */)
            .instructions()?;

        // Send transaction
        let sig = program.rpc().send_and_confirm_transaction(&[ix])?;
        Ok(sig)
    }`
      )
      .join('\n')}
}

// Example usage
fn main() -> Result<()> {
    let payer = Keypair::new();
    let client = ${toPascalCase(programName)}Client::new(
        Cluster::Devnet,
        Rc::new(payer)
    );

    // Call instruction
    ${idl.instructions?.[0] ? `let sig = client.${toSnakeCase(idl.instructions[0].name)}()?;` : '// No instructions'}
    println!("Transaction signature: {:?}", sig);

    Ok(())
}
`;
}

export function generatePythonTemplate(idl: any, programId: string): string {
  const programName = idl.name || 'program';

  return `# Python integration for ${programName}
# Requirements: anchorpy, solana

from anchorpy import Provider, Wallet, Program
from solders.pubkey import Pubkey
from solana.rpc.async_api import AsyncClient
import asyncio

PROGRAM_ID = Pubkey.from_string("${programId}")
RPC_URL = "https://api.mainnet-beta.solana.com"

class ${toPascalCase(programName)}Client:
    def __init__(self, wallet: Wallet, cluster: str = RPC_URL):
        self.client = AsyncClient(cluster)
        self.provider = Provider(self.client, wallet)
        self.program_id = PROGRAM_ID

    async def load_program(self):
        """Load program from IDL"""
        idl = ${JSON.stringify(idl, null, 4)}
        self.program = Program(idl, self.program_id, self.provider)

${idl.instructions
  ?.slice(0, 3)
  .map(
    (inst: any) => `    async def ${toSnakeCase(inst.name)}(self${inst.args?.length ? ', ' : ''}${inst.args?.map((a: any) => a.name).join(', ') || ''}):
        """${inst.name} instruction"""
        tx = await self.program.rpc["${toSnakeCase(inst.name)}"](
            ${inst.args?.map((a: any) => a.name).join(',\n            ') || ''}
            # ctx=Context(accounts={...})
        )
        return tx`
  )
  .join('\n\n')}

# Example usage
async def main():
    wallet = Wallet.local()
    client = ${toPascalCase(programName)}Client(wallet)
    await client.load_program()

    # Call instruction
    ${idl.instructions?.[0] ? `tx = await client.${toSnakeCase(idl.instructions[0].name)}()` : '# No instructions'}
    print(f"Transaction: {tx}")

if __name__ == "__main__":
    asyncio.run(main())
`;
}

// Helper functions
function toPascalCase(str: string): string {
  return str
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join('');
}

function toCamelCase(str: string): string {
  const pascal = toPascalCase(str);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
}

function toSnakeCase(str: string): string {
  return str
    .replace(/([A-Z])/g, '_$1')
    .toLowerCase()
    .replace(/^_/, '');
}

function mapIDLTypeToRust(type: any): string {
  if (typeof type === 'string') {
    const typeMap: Record<string, string> = {
      publicKey: 'Pubkey',
      bool: 'bool',
      string: 'String',
      bytes: 'Vec<u8>',
      u8: 'u8',
      u16: 'u16',
      u32: 'u32',
      u64: 'u64',
      u128: 'u128',
      i8: 'i8',
      i16: 'i16',
      i32: 'i32',
      i64: 'i64',
      i128: 'i128',
    };
    return typeMap[type] || type;
  }

  if (type.vec) return `Vec<${mapIDLTypeToRust(type.vec)}>`;
  if (type.option) return `Option<${mapIDLTypeToRust(type.option)}>`;
  if (type.defined) return type.defined;

  return 'Unknown';
}

export const TEMPLATE_LANGUAGES = [
  'Next.js',
  'React Native',
  'Rust',
  'Python',
] as const;

export type TemplateLanguage = typeof TEMPLATE_LANGUAGES[number];

export function generateTemplate(
  language: TemplateLanguage,
  idl: any,
  programId: string
): string {
  switch (language) {
    case 'Next.js':
      return generateNextJsTemplate(idl, programId);
    case 'React Native':
      return generateReactNativeTemplate(idl, programId);
    case 'Rust':
      return generateRustTemplate(idl, programId);
    case 'Python':
      return generatePythonTemplate(idl, programId);
    default:
      return '// Template not found';
  }
}
