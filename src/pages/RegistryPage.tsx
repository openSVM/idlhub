import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import JSZip from 'jszip';
import './RegistryPage.css';
import {
  fetchProtocolAnalytics,
  fetchAccountState,
  calculateRent,
  estimateComputeUnits,
  analyzeInstructionUsage,
  analyzeSecurityIssues,
  type ProtocolAnalytics,
  type SecurityIssue,
  type InstructionStats,
} from '../utils/onChainAnalytics';
import {
  generateAnchorClient,
  generatePackageJson,
  generateTsConfig,
  generateReadme,
} from '../utils/anchorClientGenerator';
import {
  generateTemplate,
  TEMPLATE_LANGUAGES,
  type TemplateLanguage,
} from '../utils/integrationTemplates';

interface Protocol {
  id: string;
  name: string;
  description: string;
  category: string;
  idlPath: string;
  repo: string | null;
  status: string;
  version: string;
  lastUpdated: string;
  bounty?: {
    total: number;
    stakers: number;
  };
  metrics?: {
    users?: number;
    accounts?: number;
    tvl?: number;
  };
  txVerification?: {
    status: string;
    successRate?: number;
    coverage?: number;
    message?: string;
  };
}

interface IDLData {
  idl?: {
    instructions?: any[];
    accounts?: any[];
    types?: any[];
    errors?: any[];
  };
  arweaveUrl?: string;
}

const THEMES = [
  { id: 'light', name: 'Light' },
  { id: 'dark', name: 'Dark' },
  { id: 'night', name: 'Night' },
  { id: 'terminal', name: 'Terminal' },
  { id: 'dracula', name: 'Dracula' },
  { id: 'nord', name: 'Nord' },
  { id: 'onedark', name: 'One Dark' },
  { id: 'solarized', name: 'Solarized' },
  { id: 'solarized-light', name: 'Solarized Light' },
  { id: 'monokai-light', name: 'Monokai Light' },
  { id: 'dos', name: 'DOS' },
] as const;

export default function RegistryPage() {
  const { theme, setTheme } = useTheme();
  const [allProtocols, setAllProtocols] = useState<Protocol[]>([]);
  const [selectedProtocols, setSelectedProtocols] = useState<Set<string>>(new Set());
  const [bookmarkedProtocols, setBookmarkedProtocols] = useState<Set<string>>(() => {
    const saved = localStorage.getItem('idlhub-bookmarks');
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });
  const [currentCategory, setCurrentCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [currentProtocolId, setCurrentProtocolId] = useState<string | null>(null);
  const [idlData, setIdlData] = useState<IDLData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [downloadingBulk, setDownloadingBulk] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [selectedInstruction, setSelectedInstruction] = useState<any | null>(null);
  const [showInstructionModal, setShowInstructionModal] = useState(false);
  const [selectedType, setSelectedType] = useState<any | null>(null);
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [selectedAccount, setSelectedAccount] = useState<any | null>(null);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [selectedError, setSelectedError] = useState<any | null>(null);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [expandedLanguages, setExpandedLanguages] = useState<Set<string>>(new Set());

  // Analytics & monitoring state
  const [protocolAnalytics, setProtocolAnalytics] = useState<ProtocolAnalytics | null>(null);
  const [instructionStats, setInstructionStats] = useState<InstructionStats[]>([]);
  const [securityIssues, setSecurityIssues] = useState<SecurityIssue[]>([]);

  // Derived state - MUST be declared early to avoid TDZ errors in useEffect hooks below
  const currentProtocol = allProtocols.find(p => p.id === currentProtocolId);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Account explorer state
  const [accountExplorerAddress, setAccountExplorerAddress] = useState('');
  const [accountExplorerData, setAccountExplorerData] = useState<any>(null);
  const [loadingAccountData, setLoadingAccountData] = useState(false);

  // Template & export state
  const [showTemplatesModal, setShowTemplatesModal] = useState(false);
  const [selectedTemplateLanguage, setSelectedTemplateLanguage] = useState<TemplateLanguage>('Next.js');

  // Load protocols from Arweave manifest
  useEffect(() => {
    const loadProtocols = async () => {
      try {
        const manifestRes = await fetch('/arweave/manifest.json');
        if (!manifestRes.ok) throw new Error('Failed to load Arweave manifest');
        const manifest = await manifestRes.json();

        // Load bounties
        let bounties: any = { bounties: {} };
        try {
          const bountiesRes = await fetch('/data/idl-bounties.json');
          if (bountiesRes.ok) bounties = await bountiesRes.json();
        } catch (e) {
          console.log('No bounties data available');
        }

        // Load tx verification results from static file
        let txVerificationMap: Record<string, any> = {};
        try {
          const txRes = await fetch('/data/tx-verification-results.json');
          if (txRes.ok) {
            const txData = await txRes.json();
            if (txData.protocols) {
              for (const p of txData.protocols) {
                // Calculate success rate as percentage
                const successRate = p.txChecked > 0
                  ? Math.round((p.txDecoded / p.txChecked) * 100)
                  : null;
                // Calculate coverage as percentage of decoded instructions
                const decodedCount = Object.keys(p.decodedInstructions || {}).length;
                const coverage = p.instructionCount > 0
                  ? Math.round((decodedCount / p.instructionCount) * 100)
                  : null;

                txVerificationMap[p.protocolId] = {
                  status: p.status,
                  successRate,
                  coverage,
                  message: p.details?.message || p.errors?.[0] || p.status,
                  programId: p.programId,
                  txChecked: p.txChecked,
                  txDecoded: p.txDecoded,
                };
              }
            }
          }
        } catch (e) {
          console.log('No tx verification data available');
        }

        const protocols: Protocol[] = Object.entries(manifest.idls).map(([id, data]: [string, any]) => {
          const bountyData = bounties.bounties[id];
          return {
            id,
            name: data.name || id,
            description: `${data.name || id} Solana program`,
            category: data.category || 'defi',
            idlPath: `${manifest.gateway}/${data.txId}`,
            repo: data.repo || null,
            status: 'available',
            version: '1.0.0',
            lastUpdated: data.uploadedAt || '2025-12-19',
            bounty: bountyData ? {
              total: 1000 + bountyData.total_amount,
              stakers: bountyData.stakers?.length || 0
            } : undefined,
            txVerification: txVerificationMap[id],
          };
        });

        setAllProtocols(protocols);
        setLoading(false);
      } catch (err) {
        console.error('Failed to load protocols from Arweave:', err);
        setError('Failed to load registry from Arweave');
        setLoading(false);
      }
    };

    loadProtocols();
  }, []);

  // Load IDL when protocol selected (from Arweave)
  useEffect(() => {
    if (!currentProtocolId) {
      setIdlData(null);
      return;
    }

    const loadIDL = async () => {
      try {
        const protocol = allProtocols.find(p => p.id === currentProtocolId);
        if (!protocol?.idlPath) throw new Error('IDL path not found');

        let res = await fetch(protocol.idlPath);

        // If Arweave fetch fails and txId starts with LOCAL_, try loading from cache
        if (!res.ok && protocol.idlPath.includes('LOCAL_')) {
          console.log('Arweave fetch failed, trying local cache...');
          res = await fetch(`/arweave/cache/${currentProtocolId}.json`);
        }

        if (!res.ok) throw new Error('Failed to fetch IDL');
        const data = await res.json();
        setIdlData({ idl: data, arweaveUrl: protocol.idlPath });
      } catch (err) {
        console.error('Failed to load IDL:', err);
        setIdlData(null);
      }
    };

    loadIDL();
  }, [currentProtocolId, allProtocols]);

  // Load analytics when IDL changes
  useEffect(() => {
    if (!idlData?.idl) {
      setProtocolAnalytics(null);
      setInstructionStats([]);
      setSecurityIssues([]);
      return;
    }

    const loadAnalytics = async () => {
      setLoadingAnalytics(true);

      try {
        // Get program ID from IDL metadata
        const programId = idlData.idl.metadata?.address || currentProtocol?.id || '';

        // Fetch on-chain analytics (only if valid program ID)
        if (programId && programId.length > 30) {
          const analytics = await fetchProtocolAnalytics(programId, 'mainnet');
          setProtocolAnalytics(analytics);
        }

        // Analyze instruction usage
        if (idlData.idl.instructions) {
          const stats = analyzeInstructionUsage(idlData.idl.instructions);
          setInstructionStats(stats);
        }

        // Analyze security issues
        const issues = analyzeSecurityIssues(idlData.idl);
        setSecurityIssues(issues);
      } catch (error) {
        console.error('Error loading analytics:', error);
      } finally {
        setLoadingAnalytics(false);
      }
    };

    loadAnalytics();
  }, [idlData, currentProtocol]);

  // Filter protocols
  const filteredProtocols = useMemo(() => {
    return allProtocols.filter(protocol => {
      const matchesSearch = !searchQuery ||
        protocol.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        protocol.description?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        protocol.category?.toLowerCase().includes(searchQuery.toLowerCase());

      const matchesCategory = currentCategory === 'all' ||
        (currentCategory === 'bookmarks' ? bookmarkedProtocols.has(protocol.id) :
        protocol.category?.toLowerCase() === currentCategory);

      return matchesSearch && matchesCategory;
    });
  }, [allProtocols, searchQuery, currentCategory, bookmarkedProtocols]);

  // Get unique categories
  const categories = useMemo(() => {
    const cats = new Set<string>(['all']);
    allProtocols.forEach(p => {
      if (p.category) cats.add(p.category.toLowerCase());
    });
    // Add bookmarks as a virtual category
    if (bookmarkedProtocols.size > 0) {
      cats.add('bookmarks');
    }
    return Array.from(cats);
  }, [allProtocols, bookmarkedProtocols]);

  // Stats
  const stats = useMemo(() => ({
    total: allProtocols.length,
    available: allProtocols.filter(p => p.status === 'available').length,
    selected: selectedProtocols.size,
    txVerified: allProtocols.filter(p => p.txVerification?.status === 'verified').length,
    txIssues: allProtocols.filter(p => p.txVerification && p.txVerification.status !== 'verified').length,
  }), [allProtocols, selectedProtocols]);

  // Save bookmarks to localStorage
  useEffect(() => {
    localStorage.setItem('idlhub-bookmarks', JSON.stringify(Array.from(bookmarkedProtocols)));
  }, [bookmarkedProtocols]);

  // Toggle checkbox
  const toggleCheckbox = (protocolId: string) => {
    const newSelected = new Set(selectedProtocols);
    if (newSelected.has(protocolId)) {
      newSelected.delete(protocolId);
    } else {
      newSelected.add(protocolId);
    }
    setSelectedProtocols(newSelected);
  };

  // Toggle bookmark
  const toggleBookmark = (protocolId: string) => {
    const newBookmarks = new Set(bookmarkedProtocols);
    if (newBookmarks.has(protocolId)) {
      newBookmarks.delete(protocolId);
    } else {
      newBookmarks.add(protocolId);
    }
    setBookmarkedProtocols(newBookmarks);
  };

  // Select/Deselect all
  const toggleSelectAll = () => {
    if (selectedProtocols.size === filteredProtocols.length) {
      setSelectedProtocols(new Set());
    } else {
      setSelectedProtocols(new Set(filteredProtocols.map(p => p.id)));
    }
  };

  // Download selected protocols as ZIP
  const downloadSelected = async () => {
    if (selectedProtocols.size === 0) return;

    setDownloadingBulk(true);
    setDownloadProgress(0);

    try {
      const zip = new JSZip();
      const allIDLs = [];
      const total = selectedProtocols.size;
      let completed = 0;

      for (const protocolId of selectedProtocols) {
        const protocol = allProtocols.find(p => p.id === protocolId);
        if (!protocol?.idlPath) continue;

        const res = await fetch(protocol.idlPath);
        if (!res.ok) continue;
        const data = await res.json();

        // Add individual IDL file to zip
        zip.file(`${protocolId}.json`, JSON.stringify(data, null, 2));

        // Collect for concatenated file
        allIDLs.push({
          protocol: protocolId,
          name: protocol.name,
          category: protocol.category,
          idl: data
        });

        completed++;
        setDownloadProgress(Math.round((completed / total) * 100));
      }

      // Add concatenated file for AI agents
      zip.file('all-idls-concatenated.json', JSON.stringify(allIDLs, null, 2));

      // Generate and download zip
      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const a = document.createElement('a');
      a.href = url;
      a.download = `idlhub-${selectedProtocols.size}-protocols.zip`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

    } catch (error) {
      console.error('Failed to create zip:', error);
      alert('Failed to download IDLs as ZIP');
    }

    setDownloadingBulk(false);
    setDownloadProgress(0);
  };

  // Select protocol to view details
  const selectProtocol = (protocolId: string, event: React.MouseEvent) => {
    // Don't trigger if clicking on checkbox or buttons
    if (
      (event.target as HTMLElement).classList.contains('protocol-checkbox') ||
      (event.target as HTMLElement).classList.contains('icon-btn') ||
      (event.target as HTMLElement).tagName === 'A' ||
      (event.target as HTMLElement).tagName === 'BUTTON'
    ) {
      return;
    }

    // Toggle if same protocol
    if (currentProtocolId === protocolId) {
      closeDetail();
      return;
    }

    setCurrentProtocolId(protocolId);

    // Scroll detail panel into view after state update
    setTimeout(() => {
      const detailPanel = document.querySelector('.protocol-detail.active');
      if (detailPanel) {
        detailPanel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      }
    }, 100);
  };

  // Close detail panel
  const closeDetail = () => {
    setCurrentProtocolId(null);
    setIdlData(null);
  };

  // Copy IDL content to clipboard
  const copyArweaveURLs = async () => {
    try {
      const idls = [];
      let completed = 0;

      for (const protocolId of selectedProtocols) {
        const protocol = allProtocols.find(p => p.id === protocolId);
        if (!protocol?.idlPath) continue;

        const res = await fetch(protocol.idlPath);
        if (!res.ok) continue;
        const data = await res.json();

        idls.push({
          protocol: protocolId,
          idl: data
        });
        completed++;
      }

      const content = JSON.stringify(idls, null, 2);
      await navigator.clipboard.writeText(content);
      alert(`Copied ${completed} IDLs to clipboard!`);
    } catch (error) {
      console.error('Failed to copy IDLs:', error);
      alert('Failed to copy IDLs to clipboard');
    }
  };

  // Download IDL (from Arweave)
  const downloadIDL = async (protocolId: string) => {
    try {
      const protocol = allProtocols.find(p => p.id === protocolId);
      if (!protocol?.idlPath) throw new Error('IDL path not found');

      const res = await fetch(protocol.idlPath);
      if (!res.ok) throw new Error('Failed to fetch from Arweave');
      const data = await res.json();

      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${protocolId}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download IDL from Arweave:', error);
      alert('Failed to download IDL from Arweave');
    }
  };

  // Generate TypeScript code snippet for instruction
  const generateTypeScriptSnippet = (instruction: any, programId: string) => {
    const argsType = instruction.args?.map((arg: any) =>
      `  ${arg.name}: ${mapIDLTypeToTS(arg.type)};`
    ).join('\n') || '';

    const accountsList = instruction.accounts?.map((acc: any) =>
      `  ${acc.name}: PublicKey; // ${acc.isMut ? 'writable' : 'readonly'}${acc.isSigner ? ', signer' : ''}`
    ).join('\n') || '';

    return `import { PublicKey, TransactionInstruction } from '@solana/web3.js';
import { Program } from '@coral-xyz/anchor';

// Instruction arguments
interface ${instruction.name}Args {
${argsType || '  // No arguments'}
}

// Account inputs
interface ${instruction.name}Accounts {
${accountsList || '  // No accounts'}
}

// Create instruction
async function create${instruction.name}Instruction(
  program: Program,
  args: ${instruction.name}Args,
  accounts: ${instruction.name}Accounts
): Promise<TransactionInstruction> {
  return await program.methods
    .${instruction.name}(${instruction.args?.map((a: any) => `args.${a.name}`).join(', ') || ''})
    .accounts(accounts)
    .instruction();
}`;
  };

  // Generate Rust code snippet for instruction
  const generateRustSnippet = (instruction: any, programId: string) => {
    const argsFields = instruction.args?.map((arg: any) =>
      `    pub ${arg.name}: ${mapIDLTypeToRust(arg.type)},`
    ).join('\n') || '';

    const accountsList = instruction.accounts?.map((acc: any) => {
      const attrs = [];
      if (acc.isMut) attrs.push('mut');
      if (acc.isSigner) attrs.push('signer');
      const attrStr = attrs.length > 0 ? `#[account(${attrs.join(', ')})]` : '#[account]';
      return `    ${attrStr}\n    pub ${acc.name}: AccountInfo<'info>,`;
    }).join('\n') || '';

    return `use anchor_lang::prelude::*;

#[derive(Accounts)]
pub struct ${instruction.name}<'info> {
${accountsList || '    // No accounts'}
}

#[derive(AnchorSerialize, AnchorDeserialize)]
pub struct ${instruction.name}Args {
${argsFields || '    // No arguments'}
}

pub fn ${instruction.name}(
    ctx: Context<${instruction.name}>,
    args: ${instruction.name}Args,
) -> Result<()> {
    // Implementation here
    Ok(())
}`;
  };

  // Generate Kotlin code snippet for instruction
  const generateKotlinSnippet = (instruction: any, programId: string) => {
    const argsFields = instruction.args?.map((arg: any) =>
      `    val ${arg.name}: ${mapIDLTypeToKotlin(arg.type)}`
    ).join(',\n') || '';

    const accountsList = instruction.accounts?.map((acc: any) =>
      `    val ${acc.name}: PublicKey // ${acc.isMut ? 'writable' : 'readonly'}${acc.isSigner ? ', signer' : ''}`
    ).join(',\n') || '';

    return `import com.solana.core.PublicKey
import com.solana.core.TransactionInstruction

// Instruction arguments
data class ${instruction.name}Args(
${argsFields || '    // No arguments'}
)

// Account inputs
data class ${instruction.name}Accounts(
${accountsList || '    // No accounts'}
)

// Create instruction
fun create${instruction.name}Instruction(
    programId: PublicKey,
    args: ${instruction.name}Args,
    accounts: ${instruction.name}Accounts
): TransactionInstruction {
    // Serialize instruction data
    val data = serializeInstructionData(args)

    return TransactionInstruction(
        programId = programId,
        keys = listOf(${instruction.accounts?.map((acc: any, i: number) =>
          `\n            AccountMeta(accounts.${acc.name}, ${acc.isSigner}, ${acc.isMut})`
        ).join(',') || ''}
        ),
        data = data
    )
}`;
  };

  // Generate Crystal code snippet for instruction
  const generateCrystalSnippet = (instruction: any, programId: string) => {
    const argsFields = instruction.args?.map((arg: any) =>
      `    property ${arg.name} : ${mapIDLTypeToCrystal(arg.type)}`
    ).join('\n') || '';

    const accountsList = instruction.accounts?.map((acc: any, i: number) =>
      `    accounts[${i}] = AccountMeta.new(${acc.name}, signer: ${acc.isSigner}, writable: ${acc.isMut})`
    ).join('\n') || '';

    return `require "solana"

# Instruction arguments
class ${instruction.name}Args
${argsFields || '  # No arguments'}
end

# Create instruction
def create_${instruction.name}_instruction(
  program_id : PublicKey,
  args : ${instruction.name}Args,
  ${instruction.accounts?.map((acc: any) => `${acc.name} : PublicKey`).join(',\n  ') || ''}
) : TransactionInstruction
  accounts = [] of AccountMeta
${accountsList || '  # No accounts'}

  data = serialize_instruction_data(args)

  TransactionInstruction.new(
    program_id: program_id,
    accounts: accounts,
    data: data
  )
end`;
  };

  // Generate Zig code snippet for instruction
  const generateZigSnippet = (instruction: any, programId: string) => {
    const argsFields = instruction.args?.map((arg: any) =>
      `    ${arg.name}: ${mapIDLTypeToZig(arg.type)},`
    ).join('\n') || '';

    const accountsList = instruction.accounts?.map((acc: any, i: number) =>
      `    accounts[${i}] = .{ .pubkey = ${acc.name}, .is_signer = ${acc.isSigner}, .is_writable = ${acc.isMut} };`
    ).join('\n') || '';

    return `const std = @import("std");
const solana = @import("solana");

// Instruction arguments
const ${instruction.name}Args = struct {
${argsFields || '    // No arguments'}
};

// Create instruction
pub fn create${instruction.name}Instruction(
    program_id: solana.PublicKey,
    args: ${instruction.name}Args,
    ${instruction.accounts?.map((acc: any) => `${acc.name}: solana.PublicKey`).join(',\n    ') || ''}
) !solana.Instruction {
    var accounts: [${instruction.accounts?.length || 0}]solana.AccountMeta = undefined;
${accountsList || '    // No accounts'}

    // Serialize instruction data
    var data = std.ArrayList(u8).init(std.heap.page_allocator);
    defer data.deinit();

    // ... serialize args

    return solana.Instruction{
        .program_id = program_id,
        .accounts = &accounts,
        .data = data.items,
    };
}`;
  };

  // Generate C code snippet for instruction
  const generateCSnippet = (instruction: any, programId: string) => {
    const argsFields = instruction.args?.map((arg: any) =>
      `    ${mapIDLTypeToC(arg.type)} ${arg.name};`
    ).join('\n') || '';

    const accountsList = instruction.accounts?.map((acc: any, i: number) =>
      `    accounts[${i}] = ${acc.name}_account; // ${acc.isMut ? 'writable' : 'readonly'}${acc.isSigner ? ', signer' : ''}`
    ).join('\n') || '';

    return `#include <solana_sdk.h>

// Instruction arguments
typedef struct {
${argsFields || '    // No arguments'}
} ${instruction.name}_args_t;

// Create instruction
SolInstruction create_${instruction.name}_instruction(
    ${instruction.name}_args_t *args,
    SolAccountMeta *accounts,
    size_t num_accounts
) {
    // Serialize instruction data
    uint8_t data[1024];
    size_t data_len = 0;

    // Add instruction discriminator
    // ... serialize args

    return (SolInstruction){
        .program_id = (SolPubkey*)&program_id,
        .accounts = accounts,
        .account_len = num_accounts,
        .data = data,
        .data_len = data_len
    };
}`;
  };

  // Map IDL types to TypeScript
  const mapIDLTypeToTS = (type: any): string => {
    if (typeof type === 'string') {
      const typeMap: Record<string, string> = {
        'publicKey': 'PublicKey',
        'u8': 'number', 'u16': 'number', 'u32': 'number', 'u64': 'BN',
        'i8': 'number', 'i16': 'number', 'i32': 'number', 'i64': 'BN',
        'bool': 'boolean',
        'string': 'string',
        'bytes': 'Buffer',
      };
      return typeMap[type] || type;
    }
    if (type?.vec) return `${mapIDLTypeToTS(type.vec)}[]`;
    if (type?.option) return `${mapIDLTypeToTS(type.option)} | null`;
    if (type?.defined) return type.defined;
    return 'any';
  };

  // Map IDL types to Rust
  const mapIDLTypeToRust = (type: any): string => {
    if (typeof type === 'string') {
      const typeMap: Record<string, string> = {
        'publicKey': 'Pubkey',
        'u8': 'u8', 'u16': 'u16', 'u32': 'u32', 'u64': 'u64', 'u128': 'u128',
        'i8': 'i8', 'i16': 'i16', 'i32': 'i32', 'i64': 'i64', 'i128': 'i128',
        'bool': 'bool',
        'string': 'String',
        'bytes': 'Vec<u8>',
      };
      return typeMap[type] || type;
    }
    if (type?.vec) return `Vec<${mapIDLTypeToRust(type.vec)}>`;
    if (type?.option) return `Option<${mapIDLTypeToRust(type.option)}>`;
    if (type?.defined) return type.defined;
    return 'Unknown';
  };

  // Map IDL types to C
  const mapIDLTypeToC = (type: any): string => {
    if (typeof type === 'string') {
      const typeMap: Record<string, string> = {
        'publicKey': 'SolPubkey',
        'u8': 'uint8_t', 'u16': 'uint16_t', 'u32': 'uint32_t', 'u64': 'uint64_t',
        'i8': 'int8_t', 'i16': 'int16_t', 'i32': 'int32_t', 'i64': 'int64_t',
        'bool': 'bool',
        'string': 'char*',
        'bytes': 'uint8_t*',
      };
      return typeMap[type] || type;
    }
    if (type?.vec) return `${mapIDLTypeToC(type.vec)}*`;
    if (type?.option) return mapIDLTypeToC(type.option);
    if (type?.defined) return type.defined;
    return 'void*';
  };

  // Map IDL types to Kotlin
  const mapIDLTypeToKotlin = (type: any): string => {
    if (typeof type === 'string') {
      const typeMap: Record<string, string> = {
        'publicKey': 'PublicKey',
        'u8': 'UByte', 'u16': 'UShort', 'u32': 'UInt', 'u64': 'ULong',
        'i8': 'Byte', 'i16': 'Short', 'i32': 'Int', 'i64': 'Long',
        'bool': 'Boolean',
        'string': 'String',
        'bytes': 'ByteArray',
      };
      return typeMap[type] || type;
    }
    if (type?.vec) return `List<${mapIDLTypeToKotlin(type.vec)}>`;
    if (type?.option) return `${mapIDLTypeToKotlin(type.option)}?`;
    if (type?.defined) return type.defined;
    return 'Any';
  };

  // Map IDL types to Crystal
  const mapIDLTypeToCrystal = (type: any): string => {
    if (typeof type === 'string') {
      const typeMap: Record<string, string> = {
        'publicKey': 'PublicKey',
        'u8': 'UInt8', 'u16': 'UInt16', 'u32': 'UInt32', 'u64': 'UInt64',
        'i8': 'Int8', 'i16': 'Int16', 'i32': 'Int32', 'i64': 'Int64',
        'bool': 'Bool',
        'string': 'String',
        'bytes': 'Bytes',
      };
      return typeMap[type] || type;
    }
    if (type?.vec) return `Array(${mapIDLTypeToCrystal(type.vec)})`;
    if (type?.option) return `${mapIDLTypeToCrystal(type.option)}?`;
    if (type?.defined) return type.defined;
    return 'Nil';
  };

  // Map IDL types to Zig
  const mapIDLTypeToZig = (type: any): string => {
    if (typeof type === 'string') {
      const typeMap: Record<string, string> = {
        'publicKey': 'solana.PublicKey',
        'u8': 'u8', 'u16': 'u16', 'u32': 'u32', 'u64': 'u64', 'u128': 'u128',
        'i8': 'i8', 'i16': 'i16', 'i32': 'i32', 'i64': 'i64', 'i128': 'i128',
        'bool': 'bool',
        'string': '[]const u8',
        'bytes': '[]u8',
      };
      return typeMap[type] || type;
    }
    if (type?.vec) return `[]${mapIDLTypeToZig(type.vec)}`;
    if (type?.option) return `?${mapIDLTypeToZig(type.option)}`;
    if (type?.defined) return type.defined;
    return 'void';
  };

  // Copy code to clipboard
  const copyCode = async (code: string, language: string) => {
    try {
      await navigator.clipboard.writeText(code);
      alert(`${language} code copied to clipboard!`);
    } catch (error) {
      console.error('Failed to copy code:', error);
      alert('Failed to copy code');
    }
  };

  // Download Anchor SDK as ZIP
  const downloadAnchorSDK = async () => {
    if (!idlData?.idl || !currentProtocol) return;

    try {
      const programId = idlData.idl.metadata?.address || currentProtocol.id || '';

      const zip = new JSZip();

      // Add main client file
      const clientCode = generateAnchorClient(idlData.idl, programId);
      zip.file('src/index.ts', clientCode);

      // Add package.json
      const packageJson = generatePackageJson(idlData.idl, programId);
      zip.file('package.json', packageJson);

      // Add tsconfig.json
      const tsConfig = generateTsConfig();
      zip.file('tsconfig.json', tsConfig);

      // Add README.md
      const readme = generateReadme(idlData.idl, programId);
      zip.file('README.md', readme);

      // Add IDL JSON
      zip.file('src/idl.json', JSON.stringify(idlData.idl, null, 2));

      // Generate ZIP
      const blob = await zip.generateAsync({ type: 'blob' });

      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${currentProtocol.id}-anchor-sdk.zip`;
      a.click();
      URL.revokeObjectURL(url);

      alert('Anchor SDK downloaded successfully!');
    } catch (error) {
      console.error('Error generating SDK:', error);
      alert('Failed to generate SDK');
    }
  };

  // Download integration template
  const downloadTemplate = (language: TemplateLanguage) => {
    if (!idlData?.idl || !currentProtocol) return;

    const programId = idlData.idl.metadata?.address || currentProtocol.id || '';
    const code = generateTemplate(language, idlData.idl, programId);

    // Create blob and download
    const blob = new Blob([code], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;

    const extensionMap: Record<TemplateLanguage, string> = {
      'Next.js': 'tsx',
      'React Native': 'tsx',
      'Rust': 'rs',
      'Python': 'py',
    };

    a.download = `${currentProtocol.id}-${language.toLowerCase().replace(/\s+/g, '-')}.${extensionMap[language]}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Fetch account state
  const fetchAccount = async () => {
    if (!accountExplorerAddress) return;

    setLoadingAccountData(true);
    try {
      const data = await fetchAccountState(accountExplorerAddress, 'mainnet');
      setAccountExplorerData(data);
    } catch (error) {
      console.error('Error fetching account:', error);
      setAccountExplorerData(null);
      alert('Failed to fetch account data');
    } finally {
      setLoadingAccountData(false);
    }
  };

  // Open instruction modal
  const openInstructionModal = (instruction: any) => {
    setSelectedInstruction(instruction);
    setShowInstructionModal(true);
  };

  // Close instruction modal
  const closeInstructionModal = () => {
    setShowInstructionModal(false);
    setTimeout(() => setSelectedInstruction(null), 300);
  };

  // Open type modal
  const openTypeModal = (type: any) => {
    setSelectedType(type);
    setShowTypeModal(true);
  };

  // Close type modal
  const closeTypeModal = () => {
    setShowTypeModal(false);
    setTimeout(() => setSelectedType(null), 300);
  };

  // Open account modal
  const openAccountModal = (account: any) => {
    setSelectedAccount(account);
    setShowAccountModal(true);
  };

  // Close account modal
  const closeAccountModal = () => {
    setShowAccountModal(false);
    setTimeout(() => setSelectedAccount(null), 300);
  };

  // Open error modal
  const openErrorModal = (error: any) => {
    setSelectedError(error);
    setShowErrorModal(true);
  };

  // Close error modal
  const closeErrorModal = () => {
    setShowErrorModal(false);
    setTimeout(() => setSelectedError(null), 300);
  };

  // Toggle language expansion
  const toggleLanguage = (lang: string) => {
    const newExpanded = new Set(expandedLanguages);
    if (newExpanded.has(lang)) {
      newExpanded.delete(lang);
    } else {
      newExpanded.add(lang);
    }
    setExpandedLanguages(newExpanded);
  };

  // Format metrics
  const formatMetrics = (metrics?: Protocol['metrics']) => {
    if (!metrics) return null;

    const parts = [];
    if (metrics.users !== undefined && metrics.users !== null) {
      parts.push(`Users: ${metrics.users.toLocaleString()}`);
    }
    if (metrics.accounts !== undefined && metrics.accounts !== null) {
      parts.push(`Accounts: ${metrics.accounts.toLocaleString()}`);
    }
    if (metrics.tvl !== undefined && metrics.tvl !== null && metrics.tvl > 0) {
      const formattedTVL = metrics.tvl >= 1000000
        ? `$${(metrics.tvl / 1000000).toFixed(2)}M`
        : `$${metrics.tvl.toLocaleString()}`;
      parts.push(`TVL: ${formattedTVL}`);
    }

    if (parts.length === 0) return null;

    return (
      <div className="protocol-metrics" dangerouslySetInnerHTML={{
        __html: parts.map(p => p.replace(/: (.+)/, ': <span class="metric-value">$1</span>')).join(' | ')
      }} />
    );
  };

  if (loading) {
    return (
      <div className="container">
        <div className="protocols-list">
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading protocols...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container">
        <div className="protocols-list">
          <div className="no-results">
            <h3>Failed to Load Protocols</h3>
            <p>{error}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container">
      {/* Header */}
      <div className="header">
        <div className="header-content">
          <div className="header-left">
            <div>
              <h1>idlhub.com</h1>
              <p>Solana IDL Registry</p>
            </div>
          </div>
          <div className="header-actions">
            <nav className="nav-links">
              <Link to="/registry" className="nav-link active">Registry</Link>
              <Link to="/" className="nav-link">Protocol</Link>
              <Link to="/status" className="nav-link">Status</Link>
              <Link to="/docs" className="nav-link">Docs</Link>
              <Link to="/tokenomics" className="nav-link">$IDL</Link>
            </nav>
            <div className="theme-selector">
              <select
                value={theme}
                onChange={(e) => setTheme(e.target.value as typeof theme)}
                className="theme-select"
              >
                {THEMES.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
        <div className="stats">
          <div className="stat">
            <div className="stat-number">{stats.total}</div>
            <div className="stat-label">Total Protocols</div>
          </div>
          <div className="stat">
            <div className="stat-number">{stats.available}</div>
            <div className="stat-label">IDLs Available</div>
          </div>
          <div className="stat">
            <div className="stat-number stat-verified">{stats.txVerified}</div>
            <div className="stat-label">TX Verified</div>
          </div>
          <div className="stat">
            <div className="stat-number stat-issues">{stats.txIssues}</div>
            <div className="stat-label">Need Fixing</div>
          </div>
          <div className="stat">
            <div className="stat-number">{stats.selected}</div>
            <div className="stat-label">Selected</div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="controls">
        <div className="search-bar">
          <input
            type="text"
            className="search-input"
            placeholder="Search by name, description, or category..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <div className="filter-section">
          <span className="filter-label">Filter by:</span>
          <div className="filter-buttons">
            {categories.map(cat => (
              <button
                key={cat}
                className={`filter-btn ${currentCategory === cat ? 'active' : ''}`}
                onClick={() => setCurrentCategory(cat)}
              >
                {cat.charAt(0).toUpperCase() + cat.slice(1)}
              </button>
            ))}
          </div>
        </div>
        <div className="bulk-actions">
          <button className="action-btn" onClick={toggleSelectAll}>
            {selectedProtocols.size === filteredProtocols.length && filteredProtocols.length > 0 ? 'Deselect All' : 'Select All'}
          </button>
          {selectedProtocols.size > 0 && (
            <>
              <button
                className="action-btn"
                onClick={() => copyArweaveURLs()}
              >
                Copy IDLs ({selectedProtocols.size})
              </button>
              <button
                className="action-btn primary"
                onClick={downloadSelected}
                disabled={downloadingBulk}
              >
                {downloadingBulk
                  ? `Creating ZIP... ${downloadProgress}%`
                  : `Download ZIP (${selectedProtocols.size})`
                }
              </button>
            </>
          )}
        </div>
      </div>

      {/* Protocols Table */}
      <div className="protocols-table-container">
        {filteredProtocols.length === 0 ? (
          <div className="no-results">
            <h3>No protocols found</h3>
            <p>Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="protocols-table">
            <thead>
              <tr>
                <th className="col-checkbox"></th>
                <th className="col-name">Protocol</th>
                <th className="col-category">Category</th>
                <th className="col-status">IDL Status</th>
                <th className="col-tx-status">TX Verify</th>
                <th className="col-rate">Rate</th>
                <th className="col-coverage">Coverage</th>
                <th className="col-actions">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredProtocols.map(protocol => (
                <tr
                  key={protocol.id}
                  className={`protocol-row ${currentProtocolId === protocol.id ? 'selected' : ''}`}
                  onClick={(e) => selectProtocol(protocol.id, e)}
                >
                  <td className="col-checkbox">
                    <input
                      type="checkbox"
                      className="protocol-checkbox"
                      checked={selectedProtocols.has(protocol.id)}
                      onChange={() => toggleCheckbox(protocol.id)}
                    />
                  </td>
                  <td className="col-name">
                    <div className="protocol-name-cell">
                      <button
                        className={`bookmark-btn ${bookmarkedProtocols.has(protocol.id) ? 'bookmarked' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleBookmark(protocol.id);
                        }}
                        title={bookmarkedProtocols.has(protocol.id) ? 'Remove bookmark' : 'Bookmark'}
                      >
                        ★
                      </button>
                      <span className="protocol-name">{protocol.name}</span>
                      {protocol.bounty && (
                        <span className="bounty-badge" title={`${protocol.bounty.total} IDL bounty`}>
                          💰
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="col-category">
                    <span className="category-badge">{protocol.category || 'Unknown'}</span>
                  </td>
                  <td className="col-status">
                    <span className={`protocol-badge badge-${protocol.status || 'placeholder'}`}>
                      {protocol.status || 'placeholder'}
                    </span>
                  </td>
                  <td className="col-tx-status">
                    {protocol.txVerification ? (
                      <span
                        className={`tx-verify-badge tx-verify-${protocol.txVerification.status}`}
                        title={protocol.txVerification.message || protocol.txVerification.status}
                      >
                        {protocol.txVerification.status === 'verified' && '✓ Verified'}
                        {protocol.txVerification.status === 'partial' && '~ Partial'}
                        {protocol.txVerification.status === 'outdated' && '! Outdated'}
                        {protocol.txVerification.status === 'invalid' && '✗ Invalid'}
                        {protocol.txVerification.status === 'invalid_idl' && '✗ Bad IDL'}
                        {protocol.txVerification.status === 'no_program_id' && '? No ID'}
                        {protocol.txVerification.status === 'no_transactions' && '○ No TXs'}
                        {protocol.txVerification.status === 'no_program_instructions' && '○ No Match'}
                        {protocol.txVerification.status === 'coder_error' && '! Coder Err'}
                        {protocol.txVerification.status === 'error' && '✗ Error'}
                      </span>
                    ) : (
                      <span className="tx-verify-badge tx-verify-pending">—</span>
                    )}
                  </td>
                  <td className="col-rate">
                    {protocol.txVerification?.successRate != null ? (
                      <span className={protocol.txVerification.successRate === 100 ? 'rate-good' : protocol.txVerification.successRate >= 50 ? 'rate-partial' : 'rate-bad'}>
                        {protocol.txVerification.successRate}%
                      </span>
                    ) : (
                      <span className="rate-bad">—</span>
                    )}
                  </td>
                  <td className="col-coverage">
                    {protocol.txVerification?.coverage != null ? (
                      <span className={protocol.txVerification.coverage >= 50 ? 'coverage-good' : 'coverage-low'}>
                        {protocol.txVerification.coverage}%
                      </span>
                    ) : (
                      <span className="coverage-low">—</span>
                    )}
                  </td>
                  <td className="col-actions">
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        downloadIDL(protocol.id);
                      }}
                      title="Download IDL"
                    >
                      ↓
                    </button>
                    <button
                      className="icon-btn"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(`/api/idl/${protocol.id}`, '_blank');
                      }}
                      title="View JSON"
                    >
                      { }
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Detail Panel */}
      <div className={`protocol-detail ${currentProtocolId ? 'active' : ''}`}>
        <div className="protocol-detail-header">
          <span className="protocol-detail-title">{currentProtocol?.name || 'Protocol Details'}</span>
          <button className="protocol-detail-close" onClick={closeDetail}>
            Close [X]
          </button>
        </div>
        <div className="protocol-detail-content">
          {/* Protocol Analytics Section */}
          {loadingAnalytics && (
            <div className="detail-section analytics-section">
              <div className="detail-section-title">📊 Loading Analytics...</div>
              <div className="loading-placeholder">
                <div className="loading-spinner"></div>
                <p>Fetching on-chain data...</p>
              </div>
            </div>
          )}
          {!loadingAnalytics && protocolAnalytics && (
            <div className="detail-section analytics-section">
              <div className="detail-section-title">📊 Protocol Health & Analytics</div>
              <div className="analytics-grid">
                <div className="analytic-card">
                  <div className="analytic-label">Status</div>
                  <div className="analytic-value">
                    {protocolAnalytics.isDeployed ? '✓ Deployed' : '✗ Not Found'}
                  </div>
                </div>
                <div className="analytic-card">
                  <div className="analytic-label">Verified</div>
                  <div className="analytic-value">
                    {protocolAnalytics.isVerified ? '✓ Yes' : '○ No'}
                  </div>
                </div>
                <div className="analytic-card">
                  <div className="analytic-label">Health Score</div>
                  <div className="analytic-value" style={{
                    color: protocolAnalytics.healthScore > 70 ? 'var(--accent-primary)' :
                           protocolAnalytics.healthScore > 40 ? 'orange' : 'red'
                  }}>
                    {protocolAnalytics.healthScore}/100
                  </div>
                </div>
                <div className="analytic-card">
                  <div className="analytic-label">Last Activity</div>
                  <div className="analytic-value">
                    {protocolAnalytics.lastActivity
                      ? new Date(protocolAnalytics.lastActivity).toLocaleDateString()
                      : 'Unknown'}
                  </div>
                </div>
                <div className="analytic-card">
                  <div className="analytic-label">Transactions (24h)</div>
                  <div className="analytic-value">
                    {protocolAnalytics.transactions24h?.toLocaleString() || '0'}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Security Issues Section */}
          {securityIssues.length > 0 && (
            <div className="detail-section security-section">
              <div className="detail-section-title">🔐 Security Indicators</div>
              <div className="security-issues">
                {securityIssues.map((issue, idx) => (
                  <div key={idx} className={`security-issue severity-${issue.severity}`}>
                    <div className="issue-header">
                      <span className="issue-severity">{issue.severity.toUpperCase()}</span>
                      <span className="issue-category">{issue.category}</span>
                    </div>
                    <div className="issue-message">{issue.message}</div>
                    {issue.instruction && (
                      <div className="issue-instruction">Instruction: {issue.instruction}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SDK Generation Section */}
          {idlData?.idl && (
            <div className="detail-section sdk-section">
              <div className="detail-section-title">💾 SDK & Templates</div>
              <div className="sdk-actions">
                <button className="sdk-button primary" onClick={downloadAnchorSDK}>
                  📦 Download Anchor SDK (ZIP)
                </button>
                <button className="sdk-button" onClick={() => setShowTemplatesModal(true)}>
                  📝 Integration Templates
                </button>
              </div>
            </div>
          )}

          {/* Account Explorer Section */}
          {idlData?.idl && (
            <div className="detail-section account-explorer-section">
              <div className="detail-section-title">🔍 Account State Explorer</div>
              <div className="account-explorer">
                <div className="explorer-input-group">
                  <input
                    type="text"
                    className="explorer-input"
                    placeholder="Enter account address (mainnet)"
                    value={accountExplorerAddress}
                    onChange={(e) => setAccountExplorerAddress(e.target.value)}
                  />
                  <button
                    className="explorer-button"
                    onClick={fetchAccount}
                    disabled={loadingAccountData || !accountExplorerAddress}
                  >
                    {loadingAccountData ? 'Loading...' : 'Fetch & Decode'}
                  </button>
                </div>
                {accountExplorerData && (
                  <div className="explorer-result">
                    <div className="result-item">
                      <span className="result-label">Address:</span>
                      <span className="result-value">{accountExplorerData.address}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Lamports:</span>
                      <span className="result-value">{accountExplorerData.lamports?.toLocaleString()}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Owner:</span>
                      <span className="result-value">{accountExplorerData.owner}</span>
                    </div>
                    <div className="result-item">
                      <span className="result-label">Executable:</span>
                      <span className="result-value">{accountExplorerData.executable ? 'Yes' : 'No'}</span>
                    </div>
                    <div className="result-item result-item-full">
                      <span className="result-label">Raw Data (Base64):</span>
                      <pre className="result-data">{accountExplorerData.data}</pre>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Instruction Usage Heatmap */}
          {instructionStats.length > 0 && (
            <div className="detail-section heatmap-section">
              <div className="detail-section-title">🔥 Instruction Usage Heatmap</div>
              <div className="instruction-heatmap">
                {instructionStats.map((stat, idx) => (
                  <div key={idx} className="heatmap-item">
                    <div className="heatmap-header">
                      <span className="heatmap-name">{stat.name}</span>
                      <span className="heatmap-percentage">{stat.percentage.toFixed(1)}%</span>
                    </div>
                    <div className="heatmap-bar">
                      <div
                        className="heatmap-fill"
                        style={{
                          width: `${stat.percentage}%`,
                          backgroundColor: `hsl(${120 - stat.percentage * 1.2}, 70%, 50%)`
                        }}
                      />
                    </div>
                    <div className="heatmap-stats">
                      <span>{stat.callCount.toLocaleString()} calls</span>
                      {stat.lastCalled && (
                        <span>Last: {new Date(stat.lastCalled).toLocaleDateString()}</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="detail-section">
            <div className="detail-section-title">Instructions</div>
            <div className="detail-list">
              {!idlData ? (
                <div className="detail-item">Loading...</div>
              ) : (idlData.idl?.instructions || []).length > 0 ? (
                (idlData.idl?.instructions || []).map((ix, i) => (
                  <div
                    key={i}
                    className="detail-item instruction-clickable"
                    onClick={() => openInstructionModal(ix)}
                  >
                    <span className="detail-item-name">{ix.name}</span>
                    <span className="detail-item-type">
                      {ix.args?.length || 0} args, {ix.accounts?.length || 0} accounts
                    </span>
                  </div>
                ))
              ) : (
                <div className="detail-item">No instructions</div>
              )}
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Types</div>
            <div className="detail-list">
              {!idlData ? (
                <div className="detail-item">Loading...</div>
              ) : (idlData.idl?.types || []).length > 0 ? (
                (idlData.idl?.types || []).map((t, i) => (
                  <div
                    key={i}
                    className="detail-item instruction-clickable"
                    onClick={() => openTypeModal(t)}
                  >
                    <span className="detail-item-name">{t.name}</span>
                    <span className="detail-item-type">{t.type?.kind || 'type'}</span>
                  </div>
                ))
              ) : (
                <div className="detail-item">No types</div>
              )}
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Accounts</div>
            <div className="detail-list">
              {!idlData ? (
                <div className="detail-item">Loading...</div>
              ) : (idlData.idl?.accounts || []).length > 0 ? (
                (idlData.idl?.accounts || []).map((acc, i) => (
                  <div
                    key={i}
                    className="detail-item instruction-clickable"
                    onClick={() => openAccountModal(acc)}
                  >
                    <span className="detail-item-name">{acc.name}</span>
                  </div>
                ))
              ) : (
                <div className="detail-item">No accounts</div>
              )}
            </div>
          </div>
          <div className="detail-section">
            <div className="detail-section-title">Errors</div>
            <div className="detail-list">
              {!idlData ? (
                <div className="detail-item">Loading...</div>
              ) : (idlData.idl?.errors || []).length > 0 ? (
                (idlData.idl?.errors || []).map((e, i) => (
                  <div
                    key={i}
                    className="detail-item instruction-clickable"
                    onClick={() => openErrorModal(e)}
                  >
                    <span className="detail-item-name">{e.code}: {e.name}</span>
                    <span className="detail-item-type">{e.msg || ''}</span>
                  </div>
                ))
              ) : (
                <div className="detail-item">No errors defined</div>
              )}
            </div>
          </div>
        </div>
        <div className="detail-actions">
          <button
            className="detail-btn"
            onClick={() => currentProtocolId && downloadIDL(currentProtocolId)}
          >
            Download IDL
          </button>
          <button
            className="detail-btn secondary"
            onClick={() => window.open(`/api/idl/${currentProtocolId}`, '_blank')}
          >
            View Raw JSON
          </button>
          {idlData?.arweaveUrl && (
            <a
              className="detail-btn secondary"
              href={idlData.arweaveUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              View on Arweave
            </a>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="footer">
        <p>
          idlhub.com - Open source IDL registry for the Solana ecosystem •{' '}
          <a href="https://github.com/openSVM/idlhub" target="_blank" rel="noopener noreferrer">GitHub</a> •{' '}
          <a href="/docs.html">Documentation</a>
        </p>
        <p style={{ marginTop: '10px', fontSize: '12px' }}>
          Contributions welcome! Help us complete missing IDLs.
        </p>
      </div>

      {/* Instruction Detail Modal */}
      {showInstructionModal && selectedInstruction && (
        <div className="modal-overlay" onClick={closeInstructionModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{selectedInstruction.name}</h2>
              <button className="modal-close" onClick={closeInstructionModal}>
                Close [X]
              </button>
            </div>
            <div className="modal-body">
              {/* Arguments */}
              <div className="instruction-section">
                <div className="instruction-section-title">Arguments ({selectedInstruction.args?.length || 0})</div>
                {(selectedInstruction.args?.length || 0) > 0 ? (
                  <table className="instruction-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInstruction.args.map((arg: any, argIdx: number) => (
                        <tr key={argIdx}>
                          <td><code>{arg.name}</code></td>
                          <td><code>{typeof arg.type === 'string' ? arg.type : JSON.stringify(arg.type)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="instruction-empty">No arguments</div>
                )}
              </div>

              {/* Accounts */}
              <div className="instruction-section">
                <div className="instruction-section-title">Accounts ({selectedInstruction.accounts?.length || 0})</div>
                {(selectedInstruction.accounts?.length || 0) > 0 ? (
                  <table className="instruction-table">
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Name</th>
                        <th>Writable</th>
                        <th>Signer</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedInstruction.accounts.map((acc: any, accIdx: number) => (
                        <tr key={accIdx}>
                          <td>{accIdx}</td>
                          <td><code>{acc.name}</code></td>
                          <td>{acc.isMut ? '✓' : '—'}</td>
                          <td>{acc.isSigner ? '✓' : '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="instruction-empty">No accounts</div>
                )}
              </div>

              {/* Code Snippets - Collapsible */}
              <div className="instruction-section">
                <div className="instruction-section-title">Code Snippets (6 languages)</div>
                <div className="code-snippets">
                  {/* TypeScript */}
                  <div className="code-snippet">
                    <div
                      className="code-snippet-header code-snippet-collapsible"
                      onClick={() => toggleLanguage('typescript')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleLanguage('typescript');
                        }
                      }}
                    >
                      <span className="code-snippet-lang">
                        {expandedLanguages.has('typescript') ? '▼' : '▶'} TypeScript
                      </span>
                      <button
                        className="code-copy-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCode(generateTypeScriptSnippet(selectedInstruction, currentProtocol?.id || ''), 'TypeScript');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    {expandedLanguages.has('typescript') && (
                      <pre className="code-snippet-content">
                        <code className="language-typescript">
                          {generateTypeScriptSnippet(selectedInstruction, currentProtocol?.id || '')}
                        </code>
                      </pre>
                    )}
                  </div>

                  {/* Rust */}
                  <div className="code-snippet">
                    <div
                      className="code-snippet-header code-snippet-collapsible"
                      onClick={() => toggleLanguage('rust')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleLanguage('rust');
                        }
                      }}
                    >
                      <span className="code-snippet-lang">
                        {expandedLanguages.has('rust') ? '▼' : '▶'} Rust
                      </span>
                      <button
                        className="code-copy-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCode(generateRustSnippet(selectedInstruction, currentProtocol?.id || ''), 'Rust');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    {expandedLanguages.has('rust') && (
                      <pre className="code-snippet-content">
                        <code className="language-rust">
                          {generateRustSnippet(selectedInstruction, currentProtocol?.id || '')}
                        </code>
                      </pre>
                    )}
                  </div>

                  {/* C */}
                  <div className="code-snippet">
                    <div
                      className="code-snippet-header code-snippet-collapsible"
                      onClick={() => toggleLanguage('c')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleLanguage('c');
                        }
                      }}
                    >
                      <span className="code-snippet-lang">
                        {expandedLanguages.has('c') ? '▼' : '▶'} C
                      </span>
                      <button
                        className="code-copy-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCode(generateCSnippet(selectedInstruction, currentProtocol?.id || ''), 'C');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    {expandedLanguages.has('c') && (
                      <pre className="code-snippet-content"><code>{generateCSnippet(selectedInstruction, currentProtocol?.id || '')}</code></pre>
                    )}
                  </div>

                  {/* Kotlin */}
                  <div className="code-snippet">
                    <div
                      className="code-snippet-header code-snippet-collapsible"
                      onClick={() => toggleLanguage('kotlin')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleLanguage('kotlin');
                        }
                      }}
                    >
                      <span className="code-snippet-lang">
                        {expandedLanguages.has('kotlin') ? '▼' : '▶'} Kotlin
                      </span>
                      <button
                        className="code-copy-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCode(generateKotlinSnippet(selectedInstruction, currentProtocol?.id || ''), 'Kotlin');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    {expandedLanguages.has('kotlin') && (
                      <pre className="code-snippet-content"><code>{generateKotlinSnippet(selectedInstruction, currentProtocol?.id || '')}</code></pre>
                    )}
                  </div>

                  {/* Crystal */}
                  <div className="code-snippet">
                    <div
                      className="code-snippet-header code-snippet-collapsible"
                      onClick={() => toggleLanguage('crystal')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleLanguage('crystal');
                        }
                      }}
                    >
                      <span className="code-snippet-lang">
                        {expandedLanguages.has('crystal') ? '▼' : '▶'} Crystal
                      </span>
                      <button
                        className="code-copy-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCode(generateCrystalSnippet(selectedInstruction, currentProtocol?.id || ''), 'Crystal');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    {expandedLanguages.has('crystal') && (
                      <pre className="code-snippet-content"><code>{generateCrystalSnippet(selectedInstruction, currentProtocol?.id || '')}</code></pre>
                    )}
                  </div>

                  {/* Zig */}
                  <div className="code-snippet">
                    <div
                      className="code-snippet-header code-snippet-collapsible"
                      onClick={() => toggleLanguage('zig')}
                      role="button"
                      tabIndex={0}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          toggleLanguage('zig');
                        }
                      }}
                    >
                      <span className="code-snippet-lang">
                        {expandedLanguages.has('zig') ? '▼' : '▶'} Zig
                      </span>
                      <button
                        className="code-copy-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          copyCode(generateZigSnippet(selectedInstruction, currentProtocol?.id || ''), 'Zig');
                        }}
                      >
                        Copy
                      </button>
                    </div>
                    {expandedLanguages.has('zig') && (
                      <pre className="code-snippet-content"><code>{generateZigSnippet(selectedInstruction, currentProtocol?.id || '')}</code></pre>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Type Detail Modal */}
      {showTypeModal && selectedType && (
        <div className="modal-overlay" onClick={closeTypeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Type: {selectedType.name}</h2>
              <button className="modal-close" onClick={closeTypeModal}>×</button>
            </div>
            <div className="modal-body">
              {/* Type Fields */}
              <div className="instruction-section">
                <div className="instruction-section-title">Fields ({selectedType.type?.fields?.length || 0})</div>
                {selectedType.type?.fields && selectedType.type.fields.length > 0 ? (
                  <table className="instruction-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedType.type.fields.map((field: any, idx: number) => (
                        <tr key={idx}>
                          <td><code>{field.name}</code></td>
                          <td><code>{typeof field.type === 'string' ? field.type : JSON.stringify(field.type)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="instruction-empty">No fields</div>
                )}
              </div>

              {/* Metadata */}
              <div className="instruction-section">
                <div className="instruction-section-title">Metadata</div>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="metadata-label">Type Kind:</span>
                    <span className="metadata-value">{selectedType.type?.kind || 'N/A'}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Field Count:</span>
                    <span className="metadata-value">{selectedType.type?.fields?.length || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Account Detail Modal */}
      {showAccountModal && selectedAccount && (
        <div className="modal-overlay" onClick={closeAccountModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Account: {selectedAccount.name}</h2>
              <button className="modal-close" onClick={closeAccountModal}>×</button>
            </div>
            <div className="modal-body">
              {/* Account Fields */}
              <div className="instruction-section">
                <div className="instruction-section-title">Fields ({selectedAccount.type?.fields?.length || 0})</div>
                {selectedAccount.type?.fields && selectedAccount.type.fields.length > 0 ? (
                  <table className="instruction-table">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Type</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedAccount.type.fields.map((field: any, idx: number) => (
                        <tr key={idx}>
                          <td><code>{field.name}</code></td>
                          <td><code>{typeof field.type === 'string' ? field.type : JSON.stringify(field.type)}</code></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="instruction-empty">No fields</div>
                )}
              </div>

              {/* Metadata */}
              <div className="instruction-section">
                <div className="instruction-section-title">Metadata</div>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="metadata-label">Account Type:</span>
                    <span className="metadata-value">{selectedAccount.type?.kind || 'N/A'}</span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Field Count:</span>
                    <span className="metadata-value">{selectedAccount.type?.fields?.length || 0}</span>
                  </div>
                </div>
              </div>

              {/* Query Account State */}
              <div className="instruction-section">
                <div className="instruction-section-title">Query Account State</div>
                <div className="account-query-info">
                  <p>To query and decode this account type on-chain, use:</p>
                  <pre className="code-snippet-content"><code>{`// TypeScript example
const accountInfo = await connection.getAccountInfo(accountPubkey);
const decodedData = program.coder.accounts.decode(
  "${selectedAccount.name}",
  accountInfo.data
);
console.log(decodedData);`}</code></pre>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Error Detail Modal */}
      {showErrorModal && selectedError && (
        <div className="modal-overlay" onClick={closeErrorModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Error: {selectedError.name}</h2>
              <button className="modal-close" onClick={closeErrorModal}>×</button>
            </div>
            <div className="modal-body">
              {/* Error Details */}
              <div className="instruction-section">
                <div className="instruction-section-title">Details</div>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="metadata-label">Error Code:</span>
                    <span className="metadata-value"><code>{selectedError.code}</code></span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Name:</span>
                    <span className="metadata-value"><code>{selectedError.name}</code></span>
                  </div>
                  <div className="metadata-item metadata-item-full">
                    <span className="metadata-label">Message:</span>
                    <span className="metadata-value">{selectedError.msg || 'No message provided'}</span>
                  </div>
                </div>
              </div>

              {/* Usage Example */}
              <div className="instruction-section">
                <div className="instruction-section-title">Usage Example</div>
                <pre className="code-snippet-content"><code>{`// TypeScript - Handling this error
try {
  await program.methods.someInstruction().rpc();
} catch (error) {
  if (error.code === ${selectedError.code}) {
    console.error("${selectedError.name}: ${selectedError.msg || 'Error occurred'}");
    // Handle specific error case
  }
}`}</code></pre>
              </div>

              {/* Metadata */}
              <div className="instruction-section">
                <div className="instruction-section-title">Metadata</div>
                <div className="metadata-grid">
                  <div className="metadata-item">
                    <span className="metadata-label">Hex Code:</span>
                    <span className="metadata-value"><code>0x{selectedError.code.toString(16).toUpperCase()}</code></span>
                  </div>
                  <div className="metadata-item">
                    <span className="metadata-label">Decimal Code:</span>
                    <span className="metadata-value"><code>{selectedError.code}</code></span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Integration Templates Modal */}
      {showTemplatesModal && (
        <div className="modal-overlay" onClick={() => setShowTemplatesModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2 className="modal-title">Integration Templates</h2>
              <button className="modal-close" onClick={() => setShowTemplatesModal(false)}>×</button>
            </div>
            <div className="modal-body">
              <div className="template-selector">
                <div className="template-tabs">
                  {TEMPLATE_LANGUAGES.map((lang) => (
                    <button
                      key={lang}
                      className={`template-tab ${selectedTemplateLanguage === lang ? 'active' : ''}`}
                      onClick={() => setSelectedTemplateLanguage(lang)}
                    >
                      {lang}
                    </button>
                  ))}
                </div>
                <div className="template-preview">
                  <pre className="code-snippet-content">
                    <code>
                      {generateTemplate(
                        selectedTemplateLanguage,
                        idlData?.idl,
                        idlData?.idl?.metadata?.address || currentProtocol?.id || ''
                      )}
                    </code>
                  </pre>
                </div>
                <div className="template-actions">
                  <button
                    className="template-button primary"
                    onClick={() => downloadTemplate(selectedTemplateLanguage)}
                  >
                    📥 Download {selectedTemplateLanguage} Template
                  </button>
                  <button
                    className="template-button"
                    onClick={() => {
                      const code = generateTemplate(
                        selectedTemplateLanguage,
                        idlData?.idl,
                        idlData?.idl?.metadata?.address || currentProtocol?.id || ''
                      );
                      copyCode(code, selectedTemplateLanguage);
                    }}
                  >
                    📋 Copy Code
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
