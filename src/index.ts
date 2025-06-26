#!/usr/bin/env node

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';

import { DocumentService } from './services/DocumentService.js';
import { SearchService } from './services/SearchService.js';

class CrossMCPServer {
  private server: Server;
  private documentService: DocumentService;
  private searchService: SearchService;

  constructor() {
    this.server = new Server(
      {
        name: 'cross-integration-guide',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.documentService = new DocumentService();
    this.searchService = new SearchService();
    this.setupToolHandlers();
  }

  private setupToolHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'get-cross-documents',
            description: 'Search and retrieve CROSS blockchain documentation',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Search query for CROSS documentation',
                },
                category: {
                  type: 'string',
                  description: 'Document category (smart-contract, sdk, chain, etc.)',
                  enum: ['smart-contract', 'sdk-js', 'sdk-unity', 'chain', 'crossx', 'github', 'all'],
                },
                limit: {
                  type: 'number',
                  description: 'Maximum number of results to return',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'document-by-id',
            description: 'Get full content of a specific CROSS document by ID',
            inputSchema: {
              type: 'object',
              properties: {
                documentId: {
                  type: 'string',
                  description: 'The unique identifier of the document',
                },
              },
              required: ['documentId'],
            },
          },
          {
            name: 'get-testnet-info',
            description: 'Get CROSS testnet information including faucet and setup instructions',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Type of testnet information to retrieve',
                  enum: ['faucet', 'setup', 'dev-mode', 'all'],
                  default: 'all',
                },
              },
            },
          },
          {
            name: 'get-github-resources',
            description: 'Get CROSS GitHub repositories and example code',
            inputSchema: {
              type: 'object',
              properties: {
                type: {
                  type: 'string',
                  description: 'Type of GitHub resource to retrieve',
                  enum: ['sdk', 'examples', 'all'],
                  default: 'all',
                },
                includeCode: {
                  type: 'boolean',
                  description: 'Include code examples and README content',
                  default: true,
                },
              },
            },
          },
        ],
      };
    });

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'get-cross-documents':
            return await this.handleGetCrossDocuments(args);
          case 'document-by-id':
            return await this.handleDocumentById(args);
          case 'get-testnet-info':
            return await this.handleGetTestnetInfo(args);
          case 'get-github-resources':
            return await this.handleGetGitHubResources(args);
          default:
            throw new Error(`Unknown tool: ${name}`);
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
        return {
          content: [
            {
              type: 'text',
              text: `Error: ${errorMessage}`,
            },
          ],
        };
      }
    });
  }

  private async handleGetCrossDocuments(args: any) {
    const { query, category = 'all', limit = 10 } = args;
    
    const results = await this.searchService.searchDocuments(query, category, limit);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(results, null, 2),
        },
      ],
    };
  }

  private async handleDocumentById(args: any) {
    const { documentId } = args;
    
    const document = await this.documentService.getDocumentById(documentId);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(document, null, 2),
        },
      ],
    };
  }

  private async handleGetTestnetInfo(args: any) {
    const { type = 'all' } = args;
    
    const testnetInfo = await this.documentService.getTestnetInfo(type);
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(testnetInfo, null, 2),
        },
      ],
    };
  }

  private async handleGetGitHubResources(args: any) {
    const { type = 'all', includeCode = true } = args;
    
    const documents = await this.documentService.getAllDocuments();
    
    let githubResources = documents.filter(doc => doc.category === 'github');
    
    if (type === 'sdk') {
      githubResources = githubResources.filter(doc => 
        doc.id.includes('cross-sdk-js') && !doc.id.includes('sample')
      );
    } else if (type === 'examples') {
      githubResources = githubResources.filter(doc => 
        doc.type === 'example' || doc.id.includes('sample')
      );
    }
    
    if (!includeCode) {
      githubResources = githubResources.map(doc => ({
        ...doc,
        content: doc.content.substring(0, 500) + '...' // Truncate content
      }));
    }
    
    return {
      content: [
        {
          type: 'text',
          text: JSON.stringify(githubResources, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error('CROSS MCP server running on stdio');
  }
}

// Run the server
const server = new CrossMCPServer();
server.run().catch(console.error); 