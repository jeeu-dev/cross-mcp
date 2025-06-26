import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CrossDocument {
  id: string;
  title: string;
  content: string;
  url: string;
  category: string;
  lastModified?: string;
}

export interface TestnetInfo {
  faucet?: {
    url: string;
    instructions: string[];
  };
  devMode?: {
    steps: string[];
    features: string[];
  };
  setup?: {
    prerequisites: string[];
    steps: string[];
  };
}

export class DocumentService {
  private readonly baseUrl = 'https://docs.crosstoken.io';
  private documentsCache: Map<string, CrossDocument> = new Map();
  private lastCacheUpdate = 0;
  private readonly cacheExpiryMs = 1000 * 60 * 60; // 1 hour

  constructor() {
    this.initializeCache();
  }

  private async initializeCache() {
    try {
      await this.fetchAllDocuments();
    } catch (error) {
      console.error('Failed to initialize document cache:', error);
    }
  }

  private async fetchAllDocuments(): Promise<void> {
    if (Date.now() - this.lastCacheUpdate < this.cacheExpiryMs && this.documentsCache.size > 0) {
      return;
    }

    try {
      // Fetch main documentation pages
      const mainPages = [
        '/docs/dev_getting-started',
        '/docs/dev_smart-contract_solidity',
        '/docs/dev_smart-contract_erc-20-interface',
        '/docs/dev_smart-contract_deploy-contract_foundry',
        '/docs/dev_smart-contract_deploy-contract_hardhat',
        '/docs/dev_chain_transactions',
        '/docs/dev_chain_fee-delegation',
        '/docs/dev_chain_checkpoint',
        '/docs/dev_chain_crossx-dex',
        '/docs/dev_sdk-js_installation',
        '/docs/dev_sdk-js_hooks',
        '/docs/dev_sdk-js_controllers',
        '/docs/dev_sdk-js_connection',
        '/docs/dev_sdk-js_token-transfer',
        '/docs/dev_sdk-unity_installation',
        '/docs/crossx_getting-started',
        '/docs/crossx_bridge',
        '/docs/crossx_dex',
      ];

      for (const path of mainPages) {
        try {
          const document = await this.fetchDocument(path);
          if (document) {
            this.documentsCache.set(document.id, document);
          }
        } catch (error) {
          console.error(`Failed to fetch document ${path}:`, error);
        }
      }

      this.lastCacheUpdate = Date.now();
    } catch (error) {
      console.error('Error fetching documents:', error);
    }
  }

  private async fetchDocument(path: string): Promise<CrossDocument | null> {
    try {
      const url = `${this.baseUrl}${path}`;
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);

      // Extract title
      const title = $('h1').first().text().trim() || 
                   $('title').text().trim() || 
                   path.split('/').pop()?.replace(/-/g, ' ') || 'Untitled';

      // Extract main content
      const content = this.extractContent($);

      // Determine category from path
      const category = this.getCategoryFromPath(path);

      const document: CrossDocument = {
        id: this.generateDocumentId(path),
        title,
        content,
        url,
        category,
        lastModified: new Date().toISOString(),
      };

      return document;
    } catch (error) {
      console.error(`Error fetching document from ${path}:`, error);
      return null;
    }
  }

  private extractContent($: cheerio.CheerioAPI): string {
    // Remove navigation, headers, footers
    $('nav, header, footer, .navigation, .sidebar').remove();
    
    // Extract main content
    const mainContent = $('main, .content, article, .documentation-content').first();
    
    if (mainContent.length > 0) {
      return mainContent.text().trim();
    }

    // Fallback to body content
    $('script, style, nav, header, footer').remove();
    return $('body').text().trim();
  }

  private getCategoryFromPath(path: string): string {
    if (path.includes('smart-contract')) return 'smart-contract';
    if (path.includes('sdk-js')) return 'sdk-js';
    if (path.includes('sdk-unity')) return 'sdk-unity';
    if (path.includes('chain')) return 'chain';
    if (path.includes('crossx')) return 'crossx';
    if (path.includes('getting-started')) return 'getting-started';
    return 'general';
  }

  private generateDocumentId(path: string): string {
    return path.replace(/^\/docs\//, '').replace(/\//g, '_');
  }

  async getDocumentById(documentId: string): Promise<CrossDocument | null> {
    await this.fetchAllDocuments();
    return this.documentsCache.get(documentId) || null;
  }

  async getAllDocuments(): Promise<CrossDocument[]> {
    await this.fetchAllDocuments();
    return Array.from(this.documentsCache.values());
  }

  async getTestnetInfo(type: string): Promise<TestnetInfo> {
    const testnetInfo: TestnetInfo = {};

    if (type === 'faucet' || type === 'all') {
      testnetInfo.faucet = {
        url: 'https://docs.crosstoken.io/docs/dev_testnet-faucet',
        instructions: [
          'Visit the Testnet Faucet page',
          'Enter your CROSSx wallet address',
          'Click the "Request" button to receive testnet-only CROSS Coin',
          'Note: These coins are for testnet use only and cannot be used in real-world scenarios',
        ],
      };
    }

    if (type === 'dev-mode' || type === 'all') {
      testnetInfo.devMode = {
        steps: [
          'Launch the CROSSx app',
          'Go to [Setting Center] from the bottom menu',
          'Select [App Setting]',
          'Toggle the [Dev Mode] switch',
        ],
        features: [
          'A "Dev Mode" label appears at the top of the CROSSx app main screen',
          'Testnet assets (such as CROSS Coin) are properly displayed',
          'A bridge between BSC and CROSS Testnet becomes available',
        ],
      };
    }

    if (type === 'setup' || type === 'all') {
      testnetInfo.setup = {
        prerequisites: [
          'CROSSx wallet installed',
          'Basic understanding of blockchain development',
        ],
        steps: [
          'Get testnet CROSS Coin from the faucet',
          'Enable Developer Mode in CROSSx app',
          'Set up your development environment',
          'Connect to CROSS testnet',
        ],
      };
    }

    return testnetInfo;
  }
} 