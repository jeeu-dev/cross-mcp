import Fuse from 'fuse.js';
import { DocumentService, CrossDocument } from './DocumentService.js';

export interface SearchResult {
  document: CrossDocument;
  score: number;
  highlights?: string[];
}

export class SearchService {
  private documentService: DocumentService;
  private fuse: Fuse<CrossDocument> | null = null;
  private lastIndexUpdate = 0;
  private readonly indexExpiryMs = 1000 * 60 * 30; // 30 minutes

  constructor() {
    this.documentService = new DocumentService();
    this.initializeIndex();
  }

  private async initializeIndex() {
    try {
      await this.updateSearchIndex();
    } catch (error) {
      // Handle error silently during initialization
    }
  }

  private async updateSearchIndex(): Promise<void> {
    if (Date.now() - this.lastIndexUpdate < this.indexExpiryMs && this.fuse) {
      return;
    }

    try {
      const documents = await this.documentService.getAllDocuments();
      
      const fuseOptions = {
        keys: [
          { name: 'title', weight: 0.4 },
          { name: 'content', weight: 0.6 },
          { name: 'category', weight: 0.3 },
        ],
        threshold: 0.3, // Lower threshold = more strict matching
        includeScore: true,
        includeMatches: true,
        minMatchCharLength: 2,
      };

      this.fuse = new Fuse(documents, fuseOptions);
      this.lastIndexUpdate = Date.now();
    } catch (error) {
      throw new Error(`Failed to update search index: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async searchDocuments(query: string, category: string = 'all', limit: number = 10): Promise<SearchResult[]> {
    await this.updateSearchIndex();

    if (!this.fuse) {
      throw new Error('Search index not available');
    }

    // Perform the search
    const searchResults = this.fuse.search(query, { limit: Math.min(limit, 50) });

    // Filter by category if specified
    const filteredResults = category === 'all' 
      ? searchResults 
      : searchResults.filter(result => result.item.category === category);

    // Convert to SearchResult format
    const results: SearchResult[] = filteredResults.map(result => {
      const highlights = this.extractHighlights(result, query);
      
      return {
        document: result.item,
        score: result.score || 0,
        highlights,
      };
    });

    return results.slice(0, limit);
  }

  private extractHighlights(result: any, query: string): string[] {
    const highlights: string[] = [];
    
    if (result.matches) {
      for (const match of result.matches) {
        if (match.value && match.indices) {
          // Extract text around matches for context
          const text = match.value;
          for (const [start, end] of match.indices) {
            const contextStart = Math.max(0, start - 50);
            const contextEnd = Math.min(text.length, end + 50);
            const highlight = text.substring(contextStart, contextEnd);
            
            if (highlight.trim() && !highlights.includes(highlight)) {
              highlights.push(highlight.trim());
            }
          }
        }
      }
    }

    return highlights.slice(0, 3); // Limit to 3 highlights
  }

  async getDocumentsByCategory(category: string): Promise<CrossDocument[]> {
    const documents = await this.documentService.getAllDocuments();
    
    if (category === 'all') {
      return documents;
    }

    return documents.filter(doc => doc.category === category);
  }

  async getPopularSearchTerms(): Promise<string[]> {
    // Return comprehensive search terms for CROSS development
    return [
      // Installation & Setup (most important)
      'SDK installation',
      'install SDK',
      'environment variables',
      'npmrc configuration',
      'project setup',
      '.env file',
      'VITE_PROJECT_ID',
      'NODE_ENV',
      'package registry',
      '@to-nexus/sdk',
      'npm install',
      'yarn add',
      'pnpm add',
      'initCrossSdk',
      'SDK initialization',
      
      // Wallet Connection (second most important)
      'wallet connection',
      'connect wallet',
      'connect wallet',
      'useAppKit',
      'appKit.connect',
      'disconnect wallet',
      'useDisconnect',
      'connection events',
      'wallet UI',
      'connection status',
      'isConnected',
      'chainId',
      'useAppKitNetwork',
      
      // Development
      'smart contract',
      'token transfer',
      'SDK hooks',
      'useCrossConnect',
      'signature',
      'custom data',
      'balance',
      'network switch',
      'crossMainnet',
      'crossTestnet',
      
      // Balance & Asset Management
      'balance query',
      'get balance',
      'check balance',
      'token balance',
      'cross balance',
      'native token balance',
      'erc20 balance',
      'nft balance',
      'asset balance',
      'useAppKitAccount',
      'getCrossBalance',
      'getERC20Balance',
      'getNFTBalance',
      'balance subscription',
      'real-time balance',
      'balance monitoring',
      'live balance',
      'AccountController.subscribe',
      'balance updates',
      'balance formatting',
      'formatUnits',
      'ConnectionController.formatUnits',
      'format balance',
      'wallet dashboard',
      'balance display',
      'asset management',
      'portfolio view',
      
      // NFT & Token Management  
      'nft collection',
      'erc721',
      'erc20',
      'token contract',
      'contract balance',
      'balanceOf',
      'readContract',
      'smart contract read',
      'contract call',
      'token abi',
      'contract abi',
      'sampleErc20ABI',
      'sampleErc721ABI',
      'contract address',
      'token address',
      'nft address',
      'erc20 address',
      
      // Wallet Address & Display
      'wallet address',
      'user address',
      'account address',
      'address display',
      'shorten address',
      'address formatting',
      'wallet info',
      'account info',
      'connection status',
      'wallet status',
      'chain id',
      'network info',
      
      // Complete Implementation Guide
      'complete implementation',
      'production ready',
      'copy paste ready',
      'ready to use',
      'full example',
      'complete guide',
      'step by step',
      'copy and paste',
      'working example',
      'complete code',
      'full integration',
      'production code',
      'no simulation',
      'real implementation',
      'typescript example',
      'react component',
      'wallet manager',
      'complete wallet',
      'full wallet integration',
      
      // Blockchain
      'testnet faucet',
      'fee delegation',
      'transactions',
      'ERC-20',
      'ERC-721',
      'ERC-1155',
      'deployment',
      'Solidity',
      'Foundry',
      'Hardhat',
      
      // Platform
      'bridge',
      'CROSSx DEX',
      'CROSSx wallet',
      'dev mode',
      'getting started',
      
      // Code Examples
      'GitHub examples',
      'SDK examples',
      'sample code',
      'repository',
      'cross-sdk-js',
      'cross-sdk-js-sample',
      'code snippets',
    ];
  }

  async getSuggestedQueries(partialQuery: string): Promise<string[]> {
    const commonQueries = await this.getPopularSearchTerms();
    
    if (!partialQuery.trim()) {
      return commonQueries.slice(0, 5);
    }

    const filtered = commonQueries.filter(query => 
      query.toLowerCase().includes(partialQuery.toLowerCase())
    );

    return filtered.slice(0, 5);
  }
} 