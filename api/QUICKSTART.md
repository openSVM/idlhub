# IDLHub API Quick Start Guide

This guide will help you get started with the IDLHub REST API for dynamically loading and managing IDL files.

## Installation

1. Clone the repository:
```bash
git clone https://github.com/openSVM/idlhub.git
cd idlhub
```

2. Install dependencies:
```bash
npm install
```

3. (Optional) Configure Qdrant:
```bash
cp .env.example .env
# Edit .env with your Qdrant credentials
```

## Starting the API Server

```bash
npm run api:start
```

The server will start on `http://localhost:3000`.

## Quick Examples

### 1. Check Server Health

```bash
curl http://localhost:3000/health
```

Response:
```json
{
  "status": "ok",
  "timestamp": "2025-10-20T15:00:00.000Z",
  "version": "1.0.0"
}
```

### 2. List All Programs

```bash
curl http://localhost:3000/api/programs
```

### 3. Load IDL from GitHub

Load Jupiter's IDL directly from their GitHub repository:

```bash
curl -X POST http://localhost:3000/api/idl/load-from-github \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "jup-ag",
    "repo": "jupiter-core",
    "path": "idl.json",
    "branch": "main",
    "programId": "jupiter-v6",
    "name": "Jupiter V6",
    "description": "Jupiter Aggregator V6",
    "category": "dex-aggregator"
  }'
```

### 4. Upload Custom IDL

Create a file `my_idl.json`:

```json
{
  "programId": "myprogram",
  "name": "My Custom Program",
  "description": "A custom Solana program",
  "category": "defi",
  "idl": {
    "version": "0.1.0",
    "name": "my_program",
    "instructions": [
      {
        "name": "initialize",
        "accounts": [
          {
            "name": "authority",
            "isMut": false,
            "isSigner": true
          }
        ],
        "args": []
      }
    ],
    "accounts": [],
    "types": []
  }
}
```

Upload it:

```bash
curl -X POST http://localhost:3000/api/idl/upload \
  -H "Content-Type: application/json" \
  -d @my_idl.json
```

### 5. Get a Specific IDL

```bash
curl http://localhost:3000/api/programs/jupiter/idl
```

### 6. Search Programs

```bash
curl "http://localhost:3000/api/search?q=dex%20trading&limit=5"
```

### 7. Filter Programs

Get all DEX programs:
```bash
curl "http://localhost:3000/api/programs?category=dex&status=available"
```

Search by name:
```bash
curl "http://localhost:3000/api/programs?search=jupiter"
```

## Using with JavaScript/TypeScript

### Node.js Example

```javascript
const axios = require('axios');

// Load IDL from GitHub
async function loadIDLFromGitHub() {
  const response = await axios.post('http://localhost:3000/api/idl/load-from-github', {
    owner: 'project-serum',
    repo: 'anchor',
    path: 'examples/tutorial/basic-1/target/idl/basic_1.json',
    programId: 'basic1',
    name: 'Basic Example 1',
    description: 'Anchor basic tutorial',
    category: 'defi'
  });
  
  console.log('Success:', response.data);
}

// Search programs
async function searchPrograms(query) {
  const response = await axios.get('http://localhost:3000/api/search', {
    params: { q: query, limit: 10 }
  });
  
  console.log('Results:', response.data);
}

loadIDLFromGitHub();
searchPrograms('dex');
```

### Browser Example

```javascript
// Load IDL from GitHub
async function loadIDL() {
  const response = await fetch('http://localhost:3000/api/idl/load-from-github', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      owner: 'coral-xyz',
      repo: 'anchor',
      path: 'tests/example.json',
      programId: 'example',
      name: 'Example Program',
      category: 'defi'
    })
  });
  
  const data = await response.json();
  console.log('Loaded IDL:', data);
}

// Get all programs
async function getPrograms() {
  const response = await fetch('http://localhost:3000/api/programs');
  const data = await response.json();
  console.log('Programs:', data);
}
```

## Common Use Cases

### Use Case 1: Add Your Project's IDL

If you have a Solana program with an IDL on GitHub:

```bash
curl -X POST http://localhost:3000/api/idl/load-from-github \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "your-github-username",
    "repo": "your-repo-name",
    "path": "target/idl/your_program.json",
    "branch": "main",
    "programId": "yourprogram",
    "name": "Your Program Name",
    "description": "Description of your program",
    "category": "defi"
  }'
```

### Use Case 2: Batch Load Multiple IDLs

Create a script `load_multiple.js`:

```javascript
const axios = require('axios');

const programs = [
  {
    owner: 'project-serum',
    repo: 'serum-dex',
    path: 'dex/idl.json',
    programId: 'serum-dex',
    name: 'Serum DEX',
    category: 'dex'
  },
  // Add more programs...
];

async function loadAll() {
  for (const program of programs) {
    try {
      const response = await axios.post(
        'http://localhost:3000/api/idl/load-from-github',
        program
      );
      console.log(`✅ Loaded ${program.name}`);
    } catch (error) {
      console.error(`❌ Failed to load ${program.name}:`, error.message);
    }
  }
}

loadAll();
```

Run it:
```bash
node load_multiple.js
```

### Use Case 3: Update Existing IDL

To update an IDL, simply load it again with the same `programId`. The system will replace the old version.

### Use Case 4: Integration with CI/CD

Add to your GitHub Actions workflow:

```yaml
name: Update IDL

on:
  push:
    paths:
      - 'target/idl/*.json'

jobs:
  update-idl:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      
      - name: Upload IDL to IDLHub
        run: |
          curl -X POST ${{ secrets.IDLHUB_API_URL }}/api/idl/load-from-github \
            -H "Content-Type: application/json" \
            -d '{
              "owner": "${{ github.repository_owner }}",
              "repo": "${{ github.event.repository.name }}",
              "path": "target/idl/program.json",
              "programId": "myprogram",
              "name": "My Program",
              "category": "defi"
            }'
```

## Environment Variables

- `API_PORT`: Port for the API server (default: 3000)
- `QDRANT_URL`: Qdrant server URL (for semantic search)
- `QDRANT_API_KEY`: Qdrant API key

## Troubleshooting

### Issue: "Cannot find module"

Make sure you've installed dependencies:
```bash
npm install
```

### Issue: GitHub 404 Error

- Check that the repository exists and is public
- Verify the file path is correct
- Ensure the branch name is correct (try `main` or `master`)

### Issue: Invalid IDL Format

The IDL must include at minimum:
```json
{
  "version": "0.1.0",
  "name": "program_name",
  "instructions": []
}
```

### Issue: Port Already in Use

Change the port:
```bash
API_PORT=3001 npm run api:start
```

## Next Steps

- Read the full [API Documentation](README.md)
- Explore [example IDL files](../IDLs/)
- Check out the [Qdrant integration](../lib/README.md)
- See [deployment options](../NETLIFY.md)

## Support

For help or issues:
- GitHub Issues: https://github.com/openSVM/idlhub/issues
- Documentation: https://github.com/openSVM/idlhub
