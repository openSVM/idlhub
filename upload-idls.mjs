import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const IDL_LIB_DIR = path.join(process.env.HOME, 'aldrin', 'idl-lib');
const MCP_URL = 'https://idlhub.com/api/mcp';

async function uploadIDL(idlPath) {
  const idlContent = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));
  
  const relativePath = path.relative(IDL_LIB_DIR, idlPath);
  const parts = relativePath.split(path.sep);
  const protocolName = parts[0];
  const fileName = path.basename(idlPath, '.json');
  
  const protocolId = `${protocolName}-${fileName}`.replace(/[^a-zA-Z0-9_-]/g, '-');

  console.log(`Uploading: ${protocolId}`);

  const payload = {
    jsonrpc: '2.0',
    method: 'tools/call',
    params: {
      name: 'upload_idl',
      arguments: {
        idl: idlContent,
        protocol_id: protocolId,
        name: protocolName,
        category: 'defi'
      }
    },
    id: Date.now()
  };

  try {
    const response = await fetch(MCP_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const result = await response.json();
    
    if (result.error) {
      console.error(`  ❌ Error: ${result.error.message}`);
      return false;
    }

    console.log(`  ✅ Uploaded`);
    return true;
  } catch (error) {
    console.error(`  ❌ Failed: ${error.message}`);
    return false;
  }
}

async function main() {
  const idlFiles = execSync(`find ${IDL_LIB_DIR} -name "*.json" -type f`, { encoding: 'utf-8' })
    .trim()
    .split('\n')
    .filter(f => f);

  console.log(`Found ${idlFiles.length} IDL files\n`);

  let uploaded = 0;
  let failed = 0;

  for (const idlPath of idlFiles) {
    const success = await uploadIDL(idlPath);
    if (success) uploaded++;
    else failed++;
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  console.log(`\n✅ Uploaded: ${uploaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${idlFiles.length}`);
}

main().catch(console.error);
