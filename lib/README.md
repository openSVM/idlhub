# IDLHub Library

This directory contains shared utilities and type definitions for IDLHub, following the aldrin-labs/openSVM model for compatibility.

## Structure

```
lib/
├── qdrant.js           # Qdrant database utilities
├── types/              # TypeScript type definitions
│   ├── program.ts      # Program and IDL types (openSVM compatible)
│   └── index.ts        # Type exports
└── README.md           # This file
```

## Qdrant Integration

### Collections

IDLHub uses the same collection structure as aldrin-labs/openSVM:

- **program_metadata** - Main collection storing programs with full IDL data
- **token_metadata** - Token metadata (for future expansion)
- **idl_cache** - Additional caching layer

### ProgramMetadataEntry Model

The core data model matches openSVM's `ProgramMetadataEntry`:

```typescript
interface ProgramMetadataEntry {
  id: string;              // Program ID
  programId: string;       // Same as id
  name: string;            // Program name
  description?: string;    // Program description
  githubUrl?: string;      // GitHub repository URL
  websiteUrl?: string;     // Official website
  docsUrl?: string;        // Documentation URL
  category?: string;       // Category (defi, nft, etc.)
  idl?: any;              // Full IDL JSON object
  verified: boolean;       // Verification status
  cached: boolean;         // Cache status
  lastUpdated: number;     // Timestamp
  cacheExpiry: number;     // Cache expiration
  tags?: string[];         // Tags for search
}
```

### Key Features

1. **IDL Storage** - IDLs are stored as part of program metadata in the `idl` field
2. **Semantic Search** - Vector-based search for programs
3. **Cache Management** - Automatic cache expiration and refresh
4. **Batch Operations** - Efficient bulk storage and retrieval
5. **openSVM Compatibility** - Uses identical data structures

## Usage

### Initialize Collections

```javascript
const qdrant = require('./lib/qdrant');

await qdrant.initializeCollections();
```

### Store Program Metadata

```javascript
const protocol = {
  id: 'jupiter',
  name: 'Jupiter',
  description: 'Jupiter Aggregator',
  category: 'dex-aggregator',
  idlPath: 'IDLs/jupiterIDL.json',
  status: 'available',
  repo: 'https://github.com/jup-ag/jupiter-core'
};

// Stores program with IDL automatically loaded
await qdrant.storeProgramMetadata(protocol);
```

### Search Programs

```javascript
// Search by text query
const results = await qdrant.searchPrograms('dex trading', 10);
```

### Get Program by ID

```javascript
const program = await qdrant.getProgramMetadata('jupiter');
console.log(program.idl); // Full IDL object
```

### Batch Operations

```javascript
// Store multiple programs
await qdrant.batchStorePrograms(protocols);

// Retrieve multiple programs
const programs = await qdrant.batchGetProgramMetadata(['jupiter', 'orca']);
```

## Type Definitions

TypeScript types are available in `lib/types/`:

```typescript
import { ProgramMetadataEntry, IDL, IDLProtocol } from './lib/types';
```

These types ensure compatibility with aldrin-labs/openSVM when integrating with shared databases.

## Environment Variables

```bash
QDRANT_URL=http://localhost:6333        # Qdrant server URL
QDRANT_API_KEY=your_api_key            # Qdrant API key
QDRANT_SERVER=http://localhost:6333    # Alternative (openSVM compatible)
QDRANT=your_api_key                    # Alternative (openSVM compatible)
```

## Compatibility

This implementation is designed to be compatible with aldrin-labs/openSVM:
- Same collection names and structure
- Identical ProgramMetadataEntry model
- Compatible search patterns
- Shared database can be used by both projects
