/**
 * Program and IDL types based on aldrin-labs/openSVM
 * This ensures compatibility with the openSVM database model
 */

/**
 * Program metadata entry - matches openSVM ProgramMetadataEntry
 */
export interface ProgramMetadataEntry {
  id: string; // programId
  programId: string;
  name: string;
  description?: string;
  githubUrl?: string;
  twitterUrl?: string;
  websiteUrl?: string;
  docsUrl?: string;
  logoUrl?: string;
  idl?: any; // IDL JSON object
  verified: boolean;
  category?: string; // 'defi', 'nft', 'gaming', 'infrastructure', etc.
  tags?: string[];
  deployedSlot?: number;
  authority?: string;
  upgradeAuthority?: string;
  cached: boolean;
  lastUpdated: number;
  cacheExpiry: number;
}

/**
 * IDL Protocol entry from index.json
 */
export interface IDLProtocol {
  id: string;
  name: string;
  description: string;
  category: string;
  idlPath: string;
  repo: string | null;
  status: 'available' | 'placeholder';
  version: string;
  lastUpdated: string;
}

/**
 * IDL Instruction definition
 */
export interface IDLInstruction {
  name: string;
  accounts: Array<{
    name: string;
    isMut: boolean;
    isSigner: boolean;
  }>;
  args: Array<{
    name: string;
    type: string | object;
  }>;
}

/**
 * IDL Account definition
 */
export interface IDLAccount {
  name: string;
  type: {
    kind: string;
    fields?: Array<{
      name: string;
      type: string | object;
    }>;
  };
}

/**
 * IDL Type definition
 */
export interface IDLType {
  name: string;
  type: {
    kind: string;
    fields?: Array<{
      name: string;
      type: string | object;
    }>;
  };
}

/**
 * Complete IDL structure
 */
export interface IDL {
  version: string;
  name: string;
  instructions: IDLInstruction[];
  accounts?: IDLAccount[];
  types?: IDLType[];
  metadata?: {
    address?: string;
    [key: string]: any;
  };
}
