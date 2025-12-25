import { Connection, PublicKey } from '@solana/web3.js';

// RPC endpoints
const MAINNET_RPC = 'https://api.mainnet-beta.solana.com';
const DEVNET_RPC = 'https://api.devnet.solana.com';

export interface ProtocolAnalytics {
  tvl?: number;
  volume24h?: number;
  users24h?: number;
  transactions24h?: number;
  lastActivity?: Date;
  isDeployed: boolean;
  isVerified: boolean;
  healthScore: number; // 0-100
}

export interface InstructionStats {
  name: string;
  callCount: number;
  percentage: number;
  lastCalled?: Date;
}

export interface AccountStateData {
  address: string;
  data: any;
  lamports: number;
  owner: string;
  executable: boolean;
}

/**
 * Fetch protocol analytics from on-chain data
 */
export async function fetchProtocolAnalytics(
  programId: string,
  cluster: 'mainnet' | 'devnet' = 'mainnet'
): Promise<ProtocolAnalytics> {
  try {
    const connection = new Connection(
      cluster === 'mainnet' ? MAINNET_RPC : DEVNET_RPC,
      'confirmed'
    );

    const pubkey = new PublicKey(programId);
    const accountInfo = await connection.getAccountInfo(pubkey);

    const isDeployed = accountInfo !== null;
    const isVerified = accountInfo?.executable || false;

    // Get recent signatures to determine last activity
    let lastActivity: Date | undefined;
    let transactions24h = 0;

    try {
      const signatures = await connection.getSignaturesForAddress(pubkey, {
        limit: 1000,
      });

      if (signatures.length > 0) {
        lastActivity = new Date((signatures[0].blockTime || 0) * 1000);

        // Count transactions in last 24h
        const now = Date.now();
        const oneDayAgo = now - 24 * 60 * 60 * 1000;
        transactions24h = signatures.filter(
          (sig) => (sig.blockTime || 0) * 1000 > oneDayAgo
        ).length;
      }
    } catch (err) {
      console.warn('Could not fetch signatures:', err);
    }

    // Calculate health score
    let healthScore = 0;
    if (isDeployed) healthScore += 40;
    if (isVerified) healthScore += 20;
    if (lastActivity) {
      const daysSinceActivity = (Date.now() - lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      if (daysSinceActivity < 1) healthScore += 40;
      else if (daysSinceActivity < 7) healthScore += 30;
      else if (daysSinceActivity < 30) healthScore += 20;
      else healthScore += 10;
    }

    return {
      isDeployed,
      isVerified,
      lastActivity,
      transactions24h,
      healthScore,
      // TVL, volume, users require protocol-specific parsing
      tvl: undefined,
      volume24h: undefined,
      users24h: undefined,
    };
  } catch (error) {
    console.error('Error fetching protocol analytics:', error);
    return {
      isDeployed: false,
      isVerified: false,
      healthScore: 0,
      transactions24h: 0,
    };
  }
}

/**
 * Fetch and decode account state
 */
export async function fetchAccountState(
  address: string,
  cluster: 'mainnet' | 'devnet' = 'mainnet'
): Promise<AccountStateData | null> {
  try {
    const connection = new Connection(
      cluster === 'mainnet' ? MAINNET_RPC : DEVNET_RPC,
      'confirmed'
    );

    const pubkey = new PublicKey(address);
    const accountInfo = await connection.getAccountInfo(pubkey);

    if (!accountInfo) {
      return null;
    }

    return {
      address,
      data: accountInfo.data.toString('base64'), // Raw data, needs IDL to decode
      lamports: accountInfo.lamports,
      owner: accountInfo.owner.toBase58(),
      executable: accountInfo.executable,
    };
  } catch (error) {
    console.error('Error fetching account state:', error);
    return null;
  }
}

/**
 * Calculate rent for account size
 */
export function calculateRent(dataSize: number): number {
  // Rent formula: lamports = (dataSize + 128) * rentPerByte
  // rentPerByte ≈ 6.96 lamports (as of 2024)
  const RENT_PER_BYTE = 6.96;
  const ACCOUNT_OVERHEAD = 128;
  return (dataSize + ACCOUNT_OVERHEAD) * RENT_PER_BYTE;
}

/**
 * Estimate compute units for instruction based on complexity
 */
export function estimateComputeUnits(instruction: any): number {
  // Base cost
  let cu = 5000;

  // Add cost per account
  const accountCount = instruction.accounts?.length || 0;
  cu += accountCount * 500;

  // Add cost per argument
  const argCount = instruction.args?.length || 0;
  cu += argCount * 200;

  // Complex types increase cost
  instruction.args?.forEach((arg: any) => {
    if (typeof arg.type === 'object') {
      cu += 1000; // Complex type
    }
  });

  return cu;
}

/**
 * Analyze instruction usage patterns (mock for now - would need real tx data)
 */
export function analyzeInstructionUsage(
  instructions: any[],
  transactionData?: any[]
): InstructionStats[] {
  // Mock data - in production, analyze actual transaction history
  const total = instructions.length;

  return instructions.map((inst, idx) => {
    // Generate realistic-looking distribution
    const basePercentage = 100 / total;
    const variance = Math.random() * 50;
    const percentage = Math.max(1, basePercentage + variance);

    return {
      name: inst.name,
      callCount: Math.floor(Math.random() * 10000),
      percentage: Math.min(100, percentage),
      lastCalled: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
    };
  }).sort((a, b) => b.percentage - a.percentage);
}

/**
 * Check for common security issues in IDL
 */
export interface SecurityIssue {
  severity: 'critical' | 'high' | 'medium' | 'low';
  category: string;
  message: string;
  instruction?: string;
}

export function analyzeSecurityIssues(idl: any): SecurityIssue[] {
  const issues: SecurityIssue[] = [];

  // Check for unchecked authority
  idl.instructions?.forEach((inst: any) => {
    const hasAuthority = inst.accounts?.some((acc: any) =>
      acc.name.toLowerCase().includes('authority') ||
      acc.name.toLowerCase().includes('owner')
    );

    if (!hasAuthority && inst.name.toLowerCase().includes('initialize')) {
      issues.push({
        severity: 'high',
        category: 'Access Control',
        message: 'Initialization instruction may lack authority check',
        instruction: inst.name,
      });
    }
  });

  // Check for potential reentrancy
  idl.instructions?.forEach((inst: any) => {
    if (inst.name.toLowerCase().includes('withdraw') ||
        inst.name.toLowerCase().includes('claim')) {
      issues.push({
        severity: 'medium',
        category: 'Reentrancy',
        message: 'Withdrawal instruction - ensure checks-effects-interactions pattern',
        instruction: inst.name,
      });
    }
  });

  // Check for complex nested types (potential overflow)
  idl.types?.forEach((type: any) => {
    const depth = calculateTypeDepth(type.type);
    if (depth > 5) {
      issues.push({
        severity: 'low',
        category: 'Complexity',
        message: `Type "${type.name}" has ${depth} levels of nesting - consider simplification`,
      });
    }
  });

  return issues;
}

function calculateTypeDepth(type: any, depth = 0): number {
  if (typeof type === 'string') return depth;
  if (type.vec) return calculateTypeDepth(type.vec, depth + 1);
  if (type.option) return calculateTypeDepth(type.option, depth + 1);
  if (type.defined) return depth + 1;
  if (type.fields) {
    return Math.max(
      depth,
      ...type.fields.map((f: any) => calculateTypeDepth(f.type, depth + 1))
    );
  }
  return depth;
}
