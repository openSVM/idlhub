/**
 * Generate complete Anchor TypeScript client from IDL
 */

export function generateAnchorClient(idl: any, programId: string): string {
  const programName = idl.name || 'program';
  const className = toPascalCase(programName);

  return `// Auto-generated Anchor client for ${programName}
// Program ID: ${programId}
// Generated: ${new Date().toISOString()}

import { Program, AnchorProvider, web3, BN } from '@coral-xyz/anchor';
import { PublicKey, Connection, Keypair } from '@solana/web3.js';

export type ${className}IDL = ${JSON.stringify(idl, null, 2)};

export const IDL: ${className}IDL = ${JSON.stringify(idl, null, 2)};

// Type definitions
${generateTypeDefinitions(idl)}

// Instruction interfaces
${generateInstructionInterfaces(idl)}

// Client class
export class ${className}Client {
  program: Program<${className}IDL>;
  provider: AnchorProvider;

  constructor(provider: AnchorProvider, programId?: PublicKey) {
    const pid = programId || new PublicKey('${programId}');
    this.provider = provider;
    this.program = new Program(IDL, pid, provider);
  }

  // Factory method
  static create(connection: Connection, wallet: any, programId?: PublicKey): ${className}Client {
    const provider = new AnchorProvider(connection, wallet, {
      commitment: 'confirmed',
    });
    return new ${className}Client(provider, programId);
  }

  // Instruction methods
${generateInstructionMethods(idl, className)}

  // Account fetch methods
${generateAccountMethods(idl)}

  // Helper methods
  async fetchAllAccounts(): Promise<any[]> {
    // Fetch all program accounts
    return await this.program.account;
  }

  getProgramId(): PublicKey {
    return this.program.programId;
  }
}

// Export singleton instance creator
export function create${className}Client(
  connection: Connection,
  wallet: any,
  programId?: PublicKey
): ${className}Client {
  return ${className}Client.create(connection, wallet, programId);
}
`;
}

function generateTypeDefinitions(idl: any): string {
  if (!idl.types || idl.types.length === 0) return '// No custom types\n';

  return idl.types
    .map((type: any) => {
      const fields = type.type?.fields || [];
      const fieldDefs = fields
        .map((f: any) => `  ${f.name}: ${mapIDLTypeToTS(f.type)};`)
        .join('\n');

      return `export interface ${type.name} {
${fieldDefs}
}`;
    })
    .join('\n\n');
}

function generateInstructionInterfaces(idl: any): string {
  if (!idl.instructions || idl.instructions.length === 0) {
    return '// No instructions\n';
  }

  return idl.instructions
    .map((inst: any) => {
      const args = inst.args || [];
      const accounts = inst.accounts || [];

      const argFields = args
        .map((arg: any) => `  ${arg.name}: ${mapIDLTypeToTS(arg.type)};`)
        .join('\n');

      const accountFields = accounts
        .map((acc: any) => `  ${acc.name}: PublicKey;`)
        .join('\n');

      return `// ${inst.name} instruction
export interface ${toPascalCase(inst.name)}Args {
${argFields || '  // No arguments'}
}

export interface ${toPascalCase(inst.name)}Accounts {
${accountFields}
}`;
    })
    .join('\n\n');
}

function generateInstructionMethods(idl: any, className: string): string {
  if (!idl.instructions || idl.instructions.length === 0) {
    return '  // No instruction methods\n';
  }

  return idl.instructions
    .map((inst: any) => {
      const methodName = toCamelCase(inst.name);
      const argsType = `${toPascalCase(inst.name)}Args`;
      const accountsType = `${toPascalCase(inst.name)}Accounts`;

      const hasArgs = inst.args && inst.args.length > 0;
      const argsParam = hasArgs ? `args: ${argsType}, ` : '';

      return `  /**
   * ${inst.name} instruction
   * ${inst.docs?.join('\n   * ') || 'No documentation'}
   */
  async ${methodName}(
    ${argsParam}accounts: ${accountsType}
  ): Promise<string> {
    return await this.program.methods
      .${methodName}(${hasArgs ? '...Object.values(args)' : ''})
      .accounts(accounts)
      .rpc();
  }`;
    })
    .join('\n\n');
}

function generateAccountMethods(idl: any): string {
  if (!idl.accounts || idl.accounts.length === 0) {
    return '  // No account fetch methods\n';
  }

  return idl.accounts
    .map((account: any) => {
      const methodName = `fetch${toPascalCase(account.name)}`;
      return `  async ${methodName}(address: PublicKey): Promise<${account.name} | null> {
    try {
      return await this.program.account.${toCamelCase(account.name)}.fetch(address);
    } catch (error) {
      console.error('Error fetching ${account.name}:', error);
      return null;
    }
  }`;
    })
    .join('\n\n');
}

function mapIDLTypeToTS(type: any): string {
  if (typeof type === 'string') {
    const typeMap: Record<string, string> = {
      publicKey: 'PublicKey',
      bool: 'boolean',
      string: 'string',
      bytes: 'Buffer',
      u8: 'number',
      u16: 'number',
      u32: 'number',
      u64: 'BN',
      u128: 'BN',
      i8: 'number',
      i16: 'number',
      i32: 'number',
      i64: 'BN',
      i128: 'BN',
      f32: 'number',
      f64: 'number',
    };
    return typeMap[type] || type;
  }

  if (type.vec) {
    return `${mapIDLTypeToTS(type.vec)}[]`;
  }

  if (type.option) {
    return `${mapIDLTypeToTS(type.option)} | null`;
  }

  if (type.defined) {
    return type.defined;
  }

  if (type.array) {
    return `${mapIDLTypeToTS(type.array[0])}[]`;
  }

  return 'any';
}

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

/**
 * Generate package.json for the client
 */
export function generatePackageJson(idl: any, programId: string): string {
  const programName = idl.name || 'program';

  return JSON.stringify(
    {
      name: `@${programName}/anchor-client`,
      version: idl.version || '1.0.0',
      description: `Anchor TypeScript client for ${programName}`,
      main: 'dist/index.js',
      types: 'dist/index.d.ts',
      scripts: {
        build: 'tsc',
        prepublish: 'npm run build',
      },
      keywords: ['solana', 'anchor', programName, 'blockchain'],
      author: '',
      license: 'MIT',
      peerDependencies: {
        '@coral-xyz/anchor': '^0.29.0',
        '@solana/web3.js': '^1.87.0',
      },
      devDependencies: {
        typescript: '^5.0.0',
        '@types/node': '^20.0.0',
      },
    },
    null,
    2
  );
}

/**
 * Generate tsconfig.json
 */
export function generateTsConfig(): string {
  return JSON.stringify(
    {
      compilerOptions: {
        target: 'ES2020',
        module: 'commonjs',
        lib: ['ES2020'],
        declaration: true,
        outDir: './dist',
        rootDir: './src',
        strict: true,
        esModuleInterop: true,
        skipLibCheck: true,
        forceConsistentCasingInFileNames: true,
        resolveJsonModule: true,
      },
      include: ['src/**/*'],
      exclude: ['node_modules', 'dist'],
    },
    null,
    2
  );
}

/**
 * Generate README.md
 */
export function generateReadme(idl: any, programId: string): string {
  const programName = idl.name || 'program';
  const className = toPascalCase(programName);

  return `# ${programName} Anchor Client

Auto-generated TypeScript client for the ${programName} Solana program.

## Installation

\`\`\`bash
npm install @${programName}/anchor-client @coral-xyz/anchor @solana/web3.js
\`\`\`

## Usage

\`\`\`typescript
import { create${className}Client } from '@${programName}/anchor-client';
import { Connection, Keypair } from '@solana/web3.js';

// Setup
const connection = new Connection('https://api.mainnet-beta.solana.com');
const wallet = Keypair.generate(); // Use your actual wallet

// Create client
const client = create${className}Client(connection, wallet);

// Call instructions
${idl.instructions
  ?.slice(0, 2)
  .map(
    (inst: any) => `// Example: ${inst.name}
// const tx = await client.${toCamelCase(inst.name)}({...});`
  )
  .join('\n')}

// Fetch accounts
${idl.accounts
  ?.slice(0, 2)
  .map(
    (acc: any) => `// const data = await client.fetch${toPascalCase(acc.name)}(address);`
  )
  .join('\n')}
\`\`\`

## Program ID

\`\`\`
${programId}
\`\`\`

## Generated

This client was auto-generated from the program IDL at ${new Date().toISOString()}.

## License

MIT
`;
}
