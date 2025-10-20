# IDLHub REST API Documentation

## Overview

The IDLHub REST API provides endpoints for dynamically loading, uploading, and managing Solana program IDL files. The API supports loading IDLs directly from GitHub repositories and uploading custom IDL data.

## Base URL

```
http://localhost:3000
```

For production deployments, replace with your actual domain.

## Authentication

Currently, the API is open and does not require authentication. For production use, consider adding API key authentication.

---

## Endpoints

### Health Check

Check if the API server is running.

**Endpoint:** `GET /health`

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2025-10-20T15:00:00.000Z",
  "version": "1.0.0"
}
```

---

### List All Programs

Get a list of all programs/protocols in the registry.

**Endpoint:** `GET /api/programs`

**Query Parameters:**
- `category` (optional): Filter by category (e.g., `dex`, `lending`, `defi`)
- `status` (optional): Filter by status (`available` or `placeholder`)
- `search` (optional): Search by name or description

**Example Request:**
```bash
curl http://localhost:3000/api/programs?category=dex&status=available
```

**Response:**
```json
{
  "total": 15,
  "protocols": [
    {
      "id": "jupiter",
      "name": "Jupiter",
      "description": "Jupiter Aggregator - The key liquidity aggregator for Solana",
      "category": "dex-aggregator",
      "idlPath": "IDLs/jupiterIDL.json",
      "repo": "https://github.com/jup-ag/jupiter-core",
      "status": "available",
      "version": "0.1.0",
      "lastUpdated": "2025-10-09"
    }
  ]
}
```

---

### Get Specific Program

Get details for a specific program by ID.

**Endpoint:** `GET /api/programs/:id`

**Example Request:**
```bash
curl http://localhost:3000/api/programs/jupiter
```

**Response:**
```json
{
  "id": "jupiter",
  "name": "Jupiter",
  "description": "Jupiter Aggregator - The key liquidity aggregator for Solana",
  "category": "dex-aggregator",
  "idlPath": "IDLs/jupiterIDL.json",
  "repo": "https://github.com/jup-ag/jupiter-core",
  "status": "available",
  "version": "0.1.0",
  "lastUpdated": "2025-10-09"
}
```

---

### Get Program IDL

Get the full IDL JSON for a specific program.

**Endpoint:** `GET /api/programs/:id/idl`

**Example Request:**
```bash
curl http://localhost:3000/api/programs/jupiter/idl
```

**Response:**
```json
{
  "version": "0.1.0",
  "name": "jupiter_aggregator",
  "instructions": [
    {
      "name": "route",
      "accounts": [...],
      "args": [...]
    }
  ],
  "accounts": [...],
  "types": [...],
  "metadata": {
    "address": "JUP6LkbZbjS1jKKwapdHNy74zcZ3tLUZoi5QNyVTaV4"
  }
}
```

---

### Load IDL from GitHub

Dynamically load an IDL file from a GitHub repository.

**Endpoint:** `POST /api/idl/load-from-github`

**Request Body:**
```json
{
  "owner": "coral-xyz",
  "repo": "anchor",
  "path": "tests/example-program/idl.json",
  "branch": "master",
  "programId": "example",
  "name": "Example Program",
  "description": "Example Anchor program for testing",
  "category": "defi"
}
```

**Required Fields:**
- `owner`: GitHub repository owner
- `repo`: GitHub repository name
- `path`: Path to IDL file in repository
- `programId`: Unique identifier for the program
- `name`: Program name

**Optional Fields:**
- `branch`: Git branch (default: `main`)
- `description`: Program description
- `category`: Program category (default: `defi`)

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/idl/load-from-github \
  -H "Content-Type: application/json" \
  -d '{
    "owner": "project-serum",
    "repo": "anchor",
    "path": "examples/tutorial/basic-1/target/idl/basic_1.json",
    "programId": "basic1",
    "name": "Basic Example 1",
    "description": "Anchor basic tutorial example",
    "category": "defi"
  }'
```

**Response:**
```json
{
  "success": true,
  "message": "IDL loaded successfully from GitHub",
  "program": {
    "id": "basic1",
    "name": "Basic Example 1",
    "description": "Anchor basic tutorial example",
    "category": "defi",
    "idlPath": "IDLs/basic1IDL.json",
    "repo": "https://github.com/project-serum/anchor",
    "status": "available",
    "version": "0.1.0",
    "lastUpdated": "2025-10-20"
  },
  "idl": {
    "version": "0.1.0",
    "name": "basic_1",
    "instructions": [...]
  }
}
```

**Error Responses:**
- `400`: Missing required fields or invalid IDL format
- `404`: IDL file not found on GitHub
- `500`: Server error

---

### Upload IDL Directly

Upload an IDL file directly to the registry.

**Endpoint:** `POST /api/idl/upload`

**Request Body:**
```json
{
  "programId": "myprogram",
  "name": "My Custom Program",
  "description": "A custom Solana program",
  "category": "defi",
  "repo": "https://github.com/myorg/myprogram",
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

**Required Fields:**
- `programId`: Unique identifier for the program
- `name`: Program name
- `idl`: Complete IDL JSON object

**Optional Fields:**
- `description`: Program description
- `category`: Program category (default: `defi`)
- `repo`: GitHub repository URL

**Example Request:**
```bash
curl -X POST http://localhost:3000/api/idl/upload \
  -H "Content-Type: application/json" \
  -d @my_idl.json
```

**Response:**
```json
{
  "success": true,
  "message": "IDL uploaded successfully",
  "program": {
    "id": "myprogram",
    "name": "My Custom Program",
    "description": "A custom Solana program",
    "category": "defi",
    "idlPath": "IDLs/myprogramIDL.json",
    "repo": "https://github.com/myorg/myprogram",
    "status": "available",
    "version": "0.1.0",
    "lastUpdated": "2025-10-20"
  }
}
```

**Error Responses:**
- `400`: Missing required fields or invalid IDL format
- `500`: Server error

---

### Semantic Search

Search for programs using Qdrant semantic search.

**Endpoint:** `GET /api/search`

**Query Parameters:**
- `q`: Search query (required)
- `limit`: Number of results (default: 10)

**Example Request:**
```bash
curl "http://localhost:3000/api/search?q=dex%20trading&limit=5"
```

**Response:**
```json
{
  "query": "dex trading",
  "total": 5,
  "results": [
    {
      "id": "jupiter",
      "programId": "jupiter",
      "name": "Jupiter",
      "description": "Jupiter Aggregator - The key liquidity aggregator for Solana",
      "category": "dex-aggregator",
      "score": 0.92,
      "idl": {...}
    }
  ]
}
```

---

### Get Program from Qdrant

Get program metadata from Qdrant database (includes embedded IDL).

**Endpoint:** `GET /api/qdrant/programs/:id`

**Example Request:**
```bash
curl http://localhost:3000/api/qdrant/programs/jupiter
```

**Response:**
```json
{
  "id": "jupiter",
  "programId": "jupiter",
  "name": "Jupiter",
  "description": "Jupiter Aggregator - The key liquidity aggregator for Solana",
  "category": "dex-aggregator",
  "githubUrl": "https://github.com/jup-ag/jupiter-core",
  "verified": true,
  "cached": true,
  "lastUpdated": 1729434120000,
  "cacheExpiry": 1729520520000,
  "idl": {
    "version": "0.1.0",
    "name": "jupiter_aggregator",
    "instructions": [...]
  }
}
```

---

### API Documentation

Get interactive API documentation.

**Endpoint:** `GET /api/docs`

**Example Request:**
```bash
curl http://localhost:3000/api/docs
```

**Response:**
Returns a JSON object with API documentation, endpoints, and examples.

---

## Usage Examples

### Example 1: Load Jupiter IDL from GitHub

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

### Example 2: Search for DEX protocols

```bash
curl "http://localhost:3000/api/search?q=decentralized%20exchange&limit=10"
```

### Example 3: Upload custom IDL

```javascript
const idl = {
  version: "0.1.0",
  name: "my_program",
  instructions: [
    {
      name: "initialize",
      accounts: [
        { name: "user", isMut: true, isSigner: true }
      ],
      args: []
    }
  ]
};

const response = await fetch('http://localhost:3000/api/idl/upload', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    programId: 'myprogram',
    name: 'My Program',
    description: 'Custom program',
    category: 'defi',
    idl: idl
  })
});

const result = await response.json();
console.log(result);
```

### Example 4: Get all lending protocols

```bash
curl "http://localhost:3000/api/programs?category=lending&status=available"
```

---

## Error Handling

All endpoints return standard HTTP status codes:

- `200`: Success
- `400`: Bad Request (missing or invalid parameters)
- `404`: Not Found
- `500`: Internal Server Error

Error responses include details:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

---

## Rate Limiting

Currently, there is no rate limiting. For production use, consider implementing rate limiting using packages like `express-rate-limit`.

---

## Deployment

### Local Development

```bash
npm install
npm run api:start
```

### Production Deployment

1. Set environment variables:
```bash
export API_PORT=3000
export QDRANT_URL=https://your-qdrant-instance.com
export QDRANT_API_KEY=your_api_key
```

2. Start the server:
```bash
npm run api:start
```

### Docker Deployment

Create a `Dockerfile`:

```dockerfile
FROM node:18
WORKDIR /app
COPY package*.json ./
RUN npm install --production
COPY . .
EXPOSE 3000
CMD ["npm", "run", "api:start"]
```

Build and run:
```bash
docker build -t idlhub-api .
docker run -p 3000:3000 -e QDRANT_URL=$QDRANT_URL idlhub-api
```

---

## Support

For issues or questions:
- GitHub Issues: https://github.com/openSVM/idlhub/issues
- Documentation: https://github.com/openSVM/idlhub

---

## License

ISC License - see LICENSE file for details
