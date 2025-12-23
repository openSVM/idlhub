/**
 * Netlify Function for uploading IDLs to Arweave
 * Endpoint: https://idlhub.com/api/upload-idl
 */

const Irys = require('@irys/sdk');
const crypto = require('crypto');

const IRYS_NODE = process.env.IRYS_NODE || 'https://devnet.irys.xyz';
const IRYS_WALLET = process.env.IRYS_WALLET; // Private key from Netlify env vars
const SOLANA_RPC = process.env.SOLANA_RPC || 'https://api.devnet.solana.com';

async function getIrys() {
  if (!IRYS_WALLET) {
    throw new Error('IRYS_WALLET not configured in Netlify environment');
  }

  const wallet = JSON.parse(IRYS_WALLET);
  
  const irys = new Irys({
    url: IRYS_NODE,
    token: 'solana',
    key: wallet,
    config: { providerUrl: SOLANA_RPC },
  });

  return irys;
}

exports.handler = async (event) => {
  const headers = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Content-Type': 'application/json',
  };

  if (event.httpMethod === 'OPTIONS') return { statusCode: 204, headers, body: '' };
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'Method not allowed' }) };

  try {
    const { protocol_id, name, idl, category = 'defi', repo } = JSON.parse(event.body);

    // Validate input
    if (!protocol_id || !name || !idl) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Missing required fields: protocol_id, name, idl' }),
      };
    }

    // Validate IDL structure
    if (!idl.version || !idl.name) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid IDL: missing version or name field' }),
      };
    }

    // Get Irys instance
    const irys = await getIrys();

    // Prepare tags for Arweave
    const tags = [
      { name: 'App-Name', value: 'IDLHub' },
      { name: 'App-Version', value: '1.0.0' },
      { name: 'Content-Type', value: 'application/json' },
      { name: 'Network', value: 'solana' },
      { name: 'Type', value: 'IDL' },
      { name: 'Protocol-Name', value: name },
      { name: 'Protocol-ID', value: protocol_id },
      { name: 'Program-ID', value: idl.address || idl.metadata?.address || 'unknown' },
      { name: 'IDL-Version', value: idl.version },
      { name: 'Category', value: category },
    ];

    if (repo) {
      tags.push({ name: 'Repository', value: repo });
    }

    // Upload to Arweave
    const idlContent = JSON.stringify(idl);
    const receipt = await irys.upload(idlContent, { tags });

    const arweaveUrl = `https://arweave.net/${receipt.id}`;

    // Return success with Arweave transaction ID
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        success: true,
        protocol_id,
        name,
        category,
        repo: repo || null,
        arweave: {
          txId: receipt.id,
          url: arweaveUrl,
          gateway: IRYS_NODE,
          size: Buffer.byteLength(idlContent),
        },
        message: 'IDL uploaded to Arweave successfully',
      }),
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Upload failed',
        message: error.message,
        details: IRYS_WALLET ? 'Wallet configured' : 'Wallet not configured in environment',
      }),
    };
  }
};
