#!/usr/bin/env node

/**
 * IDLHub Model Context Protocol (MCP) Server
 * Implements MCP 2025-06-18 specification
 * 
 * Provides:
 * - Schema listing & retrieval
 * - Symbol lookup (types, services, enums)
 * - Code generation (configurable targets)
 * - Diagnostics (validation, lint streaming)
 */

const { Server } = require('@modelcontextprotocol/sdk/server/index.js');
const { StdioServerTransport } = require('@modelcontextprotocol/sdk/server/stdio.js');
const {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ListResourcesRequestSchema,
  ReadResourceRequestSchema,
} = require('@modelcontextprotocol/sdk/types.js');
const fs = require('fs').promises;
const path = require('path');

class IDLHubMCPServer {
  constructor(idlRegistryPath) {
    this.idlRegistryPath = idlRegistryPath;
    this.indexData = null;
    this.server = new Server(
      {
        name: 'idlhub-mcp-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
          resources: {},
        },
      }
    );

    this.setupHandlers();
  }

  async initialize() {
    // Load the registry index
    const indexPath = path.join(this.idlRegistryPath, 'index.json');
    const indexContent = await fs.readFile(indexPath, 'utf-8');
    this.indexData = JSON.parse(indexContent);
    console.error('[IDLHub MCP] Loaded registry with', this.indexData.protocols.length, 'protocols');
  }

  setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: 'list_schemas',
          description: 'List all available IDL schemas in the registry',
          inputSchema: {
            type: 'object',
            properties: {
              category: {
                type: 'string',
                description: 'Filter by category (defi, dex, lending, etc.)',
              },
              status: {
                type: 'string',
                description: 'Filter by status (available, placeholder)',
              },
            },
          },
        },
        {
          name: 'get_schema',
          description: 'Retrieve a specific IDL schema by protocol ID',
          inputSchema: {
            type: 'object',
            properties: {
              protocol_id: {
                type: 'string',
                description: 'The protocol ID (e.g., "jupiter", "orca")',
              },
            },
            required: ['protocol_id'],
          },
        },
        {
          name: 'lookup_symbol',
          description: 'Look up types, instructions, accounts, or enums in an IDL',
          inputSchema: {
            type: 'object',
            properties: {
              protocol_id: {
                type: 'string',
                description: 'The protocol ID to search in',
              },
              symbol_name: {
                type: 'string',
                description: 'The symbol name to look up',
              },
              symbol_type: {
                type: 'string',
                description: 'Type of symbol: instruction, account, type, enum, error',
              },
            },
            required: ['protocol_id', 'symbol_name'],
          },
        },
        {
          name: 'generate_code',
          description: 'Generate code from an IDL for a specific target language/framework',
          inputSchema: {
            type: 'object',
            properties: {
              protocol_id: {
                type: 'string',
                description: 'The protocol ID to generate code for',
              },
              target: {
                type: 'string',
                description: 'Target language: typescript, rust, python, anchor-ts',
                enum: ['typescript', 'rust', 'python', 'anchor-ts'],
              },
              symbols: {
                type: 'array',
                items: { type: 'string' },
                description: 'Specific symbols to generate (optional, generates all if not specified)',
              },
            },
            required: ['protocol_id', 'target'],
          },
        },
        {
          name: 'validate_idl',
          description: 'Validate an IDL schema and provide diagnostics',
          inputSchema: {
            type: 'object',
            properties: {
              protocol_id: {
                type: 'string',
                description: 'The protocol ID to validate',
              },
            },
            required: ['protocol_id'],
          },
        },
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'list_schemas':
            return await this.handleListSchemas(args);
          case 'get_schema':
            return await this.handleGetSchema(args);
          case 'lookup_symbol':
            return await this.handleLookupSymbol(args);
          case 'generate_code':
            return await this.handleGenerateCode(args);
          case 'validate_idl':
            return await this.handleValidateIDL(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });

    // List available resources
    this.server.setRequestHandler(ListResourcesRequestSchema, async () => {
      if (!this.indexData) {
        return { resources: [] };
      }

      return {
        resources: this.indexData.protocols
          .filter(p => p.status === 'available')
          .map(protocol => ({
            uri: `idl://${protocol.id}`,
            name: protocol.name,
            description: protocol.description,
            mimeType: 'application/json',
          })),
      };
    });

    // Read a specific resource
    this.server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
      const uri = request.params.uri;
      const match = uri.match(/^idl:\/\/(.+)$/);
      
      if (!match) {
        throw new Error('Invalid URI format. Expected: idl://<protocol_id>');
      }

      const protocolId = match[1];
      const protocol = this.indexData.protocols.find(p => p.id === protocolId);
      
      if (!protocol) {
        throw new Error(`Protocol not found: ${protocolId}`);
      }

      const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
      const idlContent = await fs.readFile(idlPath, 'utf-8');
      const idl = JSON.parse(idlContent);

      return {
        contents: [
          {
            uri,
            mimeType: 'application/json',
            text: JSON.stringify(idl, null, 2),
          },
        ],
      };
    });
  }

  async handleListSchemas(args) {
    let protocols = this.indexData.protocols;

    // Apply filters
    if (args.category) {
      protocols = protocols.filter(p => p.category === args.category);
    }
    if (args.status) {
      protocols = protocols.filter(p => p.status === args.status);
    }

    const summary = {
      total: protocols.length,
      categories: [...new Set(protocols.map(p => p.category))],
      protocols: protocols.map(p => ({
        id: p.id,
        name: p.name,
        description: p.description,
        category: p.category,
        status: p.status,
        version: p.version,
      })),
    };

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(summary, null, 2),
        },
      ],
    };
  }

  async handleGetSchema(args) {
    const { protocol_id } = args;
    const protocol = this.indexData.protocols.find(p => p.id === protocol_id);

    if (!protocol) {
      throw new Error(`Protocol not found: ${protocol_id}`);
    }

    const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
    const idlContent = await fs.readFile(idlPath, 'utf-8');
    const idl = JSON.parse(idlContent);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(idl, null, 2),
        },
      ],
    };
  }

  async handleLookupSymbol(args) {
    const { protocol_id, symbol_name, symbol_type } = args;
    const protocol = this.indexData.protocols.find(p => p.id === protocol_id);

    if (!protocol) {
      throw new Error(`Protocol not found: ${protocol_id}`);
    }

    const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
    const idlContent = await fs.readFile(idlPath, 'utf-8');
    const idl = JSON.parse(idlContent);

    const results = [];

    // Search instructions
    if (!symbol_type || symbol_type === 'instruction') {
      const instruction = idl.instructions?.find(i => i.name === symbol_name);
      if (instruction) {
        results.push({ type: 'instruction', data: instruction });
      }
    }

    // Search accounts
    if (!symbol_type || symbol_type === 'account') {
      const account = idl.accounts?.find(a => a.name === symbol_name);
      if (account) {
        results.push({ type: 'account', data: account });
      }
    }

    // Search types
    if (!symbol_type || symbol_type === 'type') {
      const type = idl.types?.find(t => t.name === symbol_name);
      if (type) {
        results.push({ type: 'type', data: type });
      }
    }

    // Search errors
    if (!symbol_type || symbol_type === 'error') {
      const error = idl.errors?.find(e => e.name === symbol_name);
      if (error) {
        results.push({ type: 'error', data: error });
      }
    }

    if (results.length === 0) {
      throw new Error(`Symbol not found: ${symbol_name}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  async handleGenerateCode(args) {
    const { protocol_id, target, symbols } = args;
    const protocol = this.indexData.protocols.find(p => p.id === protocol_id);

    if (!protocol) {
      throw new Error(`Protocol not found: ${protocol_id}`);
    }

    const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
    const idlContent = await fs.readFile(idlPath, 'utf-8');
    const idl = JSON.parse(idlContent);

    let code = '';

    switch (target) {
      case 'typescript':
        code = this.generateTypeScript(idl, symbols);
        break;
      case 'rust':
        code = this.generateRust(idl, symbols);
        break;
      case 'python':
        code = this.generatePython(idl, symbols);
        break;
      case 'anchor-ts':
        code = this.generateAnchorTS(idl, symbols);
        break;
      default:
        throw new Error(`Unsupported target: ${target}`);
    }

    return {
      content: [
        {
          type: 'text',
          text: code,
        },
      ],
    };
  }

  generateTypeScript(idl, symbols) {
    let code = `// Generated TypeScript types for ${idl.name}\n\n`;
    
    const typesToGenerate = symbols 
      ? idl.types?.filter(t => symbols.includes(t.name)) 
      : idl.types;

    if (typesToGenerate && typesToGenerate.length > 0) {
      typesToGenerate.forEach(type => {
        code += `export type ${type.name} = `;
        if (type.type.kind === 'struct') {
          code += `{\n`;
          type.type.fields.forEach(field => {
            code += `  ${field.name}: ${this.mapTypeToTS(field.type)};\n`;
          });
          code += `};\n\n`;
        } else if (type.type.kind === 'enum') {
          code += `\n`;
          type.type.variants.forEach((variant, idx) => {
            code += `  | { ${variant.name}: null }`;
            if (idx < type.type.variants.length - 1) code += `\n`;
          });
          code += `;\n\n`;
        }
      });
    }

    const instructionsToGenerate = symbols
      ? idl.instructions?.filter(i => symbols.includes(i.name))
      : idl.instructions;

    if (instructionsToGenerate && instructionsToGenerate.length > 0) {
      code += `// Instructions\n`;
      instructionsToGenerate.forEach(ix => {
        code += `export type ${this.capitalize(ix.name)}Args = {\n`;
        ix.args.forEach(arg => {
          code += `  ${arg.name}: ${this.mapTypeToTS(arg.type)};\n`;
        });
        code += `};\n\n`;
      });
    }

    return code;
  }

  generateRust(idl, symbols) {
    let code = `// Generated Rust types for ${idl.name}\n\n`;
    code += `use anchor_lang::prelude::*;\n\n`;
    
    const typesToGenerate = symbols 
      ? idl.types?.filter(t => symbols.includes(t.name)) 
      : idl.types;

    if (typesToGenerate && typesToGenerate.length > 0) {
      typesToGenerate.forEach(type => {
        if (type.type.kind === 'struct') {
          code += `#[derive(AnchorSerialize, AnchorDeserialize, Clone)]\n`;
          code += `pub struct ${type.name} {\n`;
          type.type.fields.forEach(field => {
            code += `    pub ${field.name}: ${this.mapTypeToRust(field.type)},\n`;
          });
          code += `}\n\n`;
        } else if (type.type.kind === 'enum') {
          code += `#[derive(AnchorSerialize, AnchorDeserialize, Clone)]\n`;
          code += `pub enum ${type.name} {\n`;
          type.type.variants.forEach(variant => {
            code += `    ${variant.name},\n`;
          });
          code += `}\n\n`;
        }
      });
    }

    return code;
  }

  generatePython(idl, symbols) {
    let code = `# Generated Python types for ${idl.name}\n\n`;
    code += `from typing import TypedDict, Union\n`;
    code += `from dataclasses import dataclass\n\n`;
    
    const typesToGenerate = symbols 
      ? idl.types?.filter(t => symbols.includes(t.name)) 
      : idl.types;

    if (typesToGenerate && typesToGenerate.length > 0) {
      typesToGenerate.forEach(type => {
        if (type.type.kind === 'struct') {
          code += `@dataclass\n`;
          code += `class ${type.name}:\n`;
          type.type.fields.forEach(field => {
            code += `    ${field.name}: ${this.mapTypeToPython(field.type)}\n`;
          });
          code += `\n`;
        }
      });
    }

    return code;
  }

  generateAnchorTS(idl, symbols) {
    let code = `// Generated Anchor TypeScript client for ${idl.name}\n\n`;
    code += `import { Program } from '@coral-xyz/anchor';\n\n`;
    code += `export type ${this.capitalize(idl.name)} = ${JSON.stringify(idl, null, 2)};\n\n`;
    code += `export const IDL: ${this.capitalize(idl.name)} = ${JSON.stringify(idl, null, 2)};\n`;
    return code;
  }

  mapTypeToTS(type) {
    if (typeof type === 'string') {
      const typeMap = {
        u8: 'number', u16: 'number', u32: 'number', u64: 'bigint',
        i8: 'number', i16: 'number', i32: 'number', i64: 'bigint',
        bool: 'boolean', string: 'string', publicKey: 'PublicKey',
        bytes: 'Uint8Array',
      };
      return typeMap[type] || type;
    }
    if (type.vec) return `Array<${this.mapTypeToTS(type.vec)}>`;
    if (type.option) return `${this.mapTypeToTS(type.option)} | null`;
    if (type.defined) return type.defined;
    return 'any';
  }

  mapTypeToRust(type) {
    if (typeof type === 'string') {
      const typeMap = {
        publicKey: 'Pubkey',
        bool: 'bool',
        string: 'String',
        bytes: 'Vec<u8>',
      };
      return typeMap[type] || type;
    }
    if (type.vec) return `Vec<${this.mapTypeToRust(type.vec)}>`;
    if (type.option) return `Option<${this.mapTypeToRust(type.option)}>`;
    if (type.defined) return type.defined;
    return 'Unknown';
  }

  mapTypeToPython(type) {
    if (typeof type === 'string') {
      const typeMap = {
        u8: 'int', u16: 'int', u32: 'int', u64: 'int',
        i8: 'int', i16: 'int', i32: 'int', i64: 'int',
        bool: 'bool', string: 'str', publicKey: 'str',
        bytes: 'bytes',
      };
      return typeMap[type] || type;
    }
    if (type.vec) return `list[${this.mapTypeToPython(type.vec)}]`;
    if (type.option) return `${this.mapTypeToPython(type.option)} | None`;
    if (type.defined) return type.defined;
    return 'Any';
  }

  async handleValidateIDL(args) {
    const { protocol_id } = args;
    const protocol = this.indexData.protocols.find(p => p.id === protocol_id);

    if (!protocol) {
      throw new Error(`Protocol not found: ${protocol_id}`);
    }

    const idlPath = path.join(this.idlRegistryPath, protocol.idlPath);
    const idlContent = await fs.readFile(idlPath, 'utf-8');
    const idl = JSON.parse(idlContent);

    const diagnostics = {
      valid: true,
      errors: [],
      warnings: [],
      info: [],
    };

    // Validate required fields
    if (!idl.version) {
      diagnostics.errors.push('Missing required field: version');
      diagnostics.valid = false;
    }
    if (!idl.name) {
      diagnostics.errors.push('Missing required field: name');
      diagnostics.valid = false;
    }

    // Validate instructions
    if (idl.instructions) {
      idl.instructions.forEach((ix, idx) => {
        if (!ix.name) {
          diagnostics.errors.push(`Instruction at index ${idx} missing name`);
          diagnostics.valid = false;
        }
        if (!ix.accounts) {
          diagnostics.warnings.push(`Instruction '${ix.name}' has no accounts`);
        }
        if (!ix.args) {
          diagnostics.warnings.push(`Instruction '${ix.name}' has no arguments`);
        }
      });
    } else {
      diagnostics.warnings.push('No instructions defined');
    }

    // Validate accounts
    if (idl.accounts) {
      idl.accounts.forEach((acc, idx) => {
        if (!acc.name) {
          diagnostics.errors.push(`Account at index ${idx} missing name`);
          diagnostics.valid = false;
        }
      });
    }

    // Validate types
    if (idl.types) {
      idl.types.forEach((type, idx) => {
        if (!type.name) {
          diagnostics.errors.push(`Type at index ${idx} missing name`);
          diagnostics.valid = false;
        }
        if (!type.type) {
          diagnostics.errors.push(`Type '${type.name}' missing type definition`);
          diagnostics.valid = false;
        }
      });
    }

    // Info
    diagnostics.info.push(`Total instructions: ${idl.instructions?.length || 0}`);
    diagnostics.info.push(`Total accounts: ${idl.accounts?.length || 0}`);
    diagnostics.info.push(`Total types: ${idl.types?.length || 0}`);
    diagnostics.info.push(`Total errors: ${idl.errors?.length || 0}`);

    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(diagnostics, null, 2),
        },
      ],
    };
  }

  capitalize(str) {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }

  async start() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('[IDLHub MCP] Server started on stdio');
  }
}

// Main execution
async function main() {
  const registryPath = process.env.IDL_REGISTRY_PATH || path.join(__dirname, '..', '..');
  
  const server = new IDLHubMCPServer(registryPath);
  await server.initialize();
  await server.start();
}

if (require.main === module) {
  main().catch((error) => {
    console.error('[IDLHub MCP] Fatal error:', error);
    process.exit(1);
  });
}

module.exports = { IDLHubMCPServer };
