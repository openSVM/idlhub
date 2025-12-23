import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const IDL_LIB_DIR = path.join(process.env.HOME, 'aldrin', 'idl-lib');
const REST_API_URL = 'https://api.idlhub.com/api/idl';

async function uploadIDL(idlPath) {
  const idlContent = JSON.parse(fs.readFileSync(idlPath, 'utf-8'));

  const relativePath = path.relative(IDL_LIB_DIR, idlPath);
  const parts = relativePath.split(path.sep);
  const protocolName = parts[0];
  const fileName = path.basename(idlPath, '.json');

  let protocolId = `${protocolName}-${fileName}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  if (protocolId.startsWith(`${protocolName}-${protocolName}`)) {
    protocolId = protocolId.replace(`${protocolName}-${protocolName}`, protocolName);
  }

  console.log(`Uploading: ${protocolId}`);

  const payload = {
    programId: idlContent.address || idlContent.metadata?.address || 'Unknown',
    name: protocolName,
    category: 'defi',
    network: 'mainnet',
    idl: idlContent
  };

  try {
    const response = await fetch(REST_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const result = await response.json();

    if (!response.ok) {
      const msg = result.error || result.message || response.statusText;
      console.error(`  ❌ Error: ${msg}`);
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

    await new Promise(resolve => setTimeout(resolve, 2000));
  }

  console.log(`\n✅ Uploaded: ${uploaded}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`📊 Total: ${idlFiles.length}`);
}

main().catch(console.error);
