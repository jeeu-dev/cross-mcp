import axios from 'axios';
import * as cheerio from 'cheerio';

export interface CrossDocument {
  id: string;
  title: string;
  content: string;
  url: string;
  category: string;
  lastModified?: string;
  type?: 'documentation' | 'github' | 'example';
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
      // Fetch main documentation pages based on actual CROSS docs structure
      const mainPages = [
        '/docs/dev_getting-started',
        '/docs/sc_solidity',
        '/docs/sc_erc20-interface',
        '/docs/sc_sample-erc20-contract',
        '/docs/sc_sample-erc721-contract',
        '/docs/sc_sample-erc1155-contract',
        '/docs/sc_deploy-foundry',
        '/docs/sc_deploy-hardhat',
        '/docs/ch_transactions',
        '/docs/ch_fee-delegation',
        '/docs/ch_fee-delegation-tx-type',
        '/docs/ch_checkpoint',
        '/docs/ch_crossx-dex',
        '/docs/sdkjs_installation',
        '/docs/sdkjs_hooks',
        '/docs/sdkjs_controllers',
        '/docs/sdkjs_connection',
        '/docs/sdkjs_token-transfer',
        '/docs/sdkjs_signature',
        '/docs/sdkjs_custom-data',
        '/docs/sdkjs_balance',
        '/docs/sdkjs_version-history',
        '/docs/sdkuni_installation',
        '/docs/testnet-faucet',
        '/docs/crossx_getting-started',
        '/docs/crossx_create-wallet',
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

      // Fetch GitHub repositories content
      await this.fetchGitHubRepositories();

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
    if (path.includes('sc_')) return 'smart-contract';
    if (path.includes('sdkjs_')) return 'sdk-js';
    if (path.includes('sdkuni_')) return 'sdk-unity';
    if (path.includes('ch_')) return 'chain';
    if (path.includes('crossx_')) return 'crossx';
    if (path.includes('getting-started') || path.includes('testnet-faucet')) return 'getting-started';
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

  private async fetchGitHubRepositories(): Promise<void> {
    const repositories = [
      {
        owner: 'to-nexus',
        repo: 'cross-sdk-js',
        files: ['readme.md', 'package.json']
      },
      {
        owner: 'to-nexus',
        repo: 'cross-sdk-js-sample',
        files: ['README.md', 'package.json']
      }
    ];

    for (const repository of repositories) {
      try {
        await this.fetchGitHubRepository(repository.owner, repository.repo, repository.files);
      } catch (error) {
        console.error(`Failed to fetch GitHub repository ${repository.owner}/${repository.repo}:`, error);
      }
    }
  }

  private async fetchGitHubRepository(owner: string, repo: string, files: string[]): Promise<void> {
    const baseUrl = `https://api.github.com/repos/${owner}/${repo}`;
    
    try {
      // Fetch repository info
      const repoResponse = await axios.get(baseUrl);
      const repoInfo = repoResponse.data;

      // Fetch each specified file
      for (const fileName of files) {
        try {
          const fileUrl = `${baseUrl}/contents/${fileName}`;
          const fileResponse = await axios.get(fileUrl);
          
          if (fileResponse.data.content) {
            // Decode base64 content
            const content = Buffer.from(fileResponse.data.content, 'base64').toString('utf-8');
            
            const document: CrossDocument = {
              id: `github_${owner}_${repo}_${fileName.replace(/\./g, '_')}`,
              title: `${owner}/${repo} - ${fileName}`,
              content: content,
              url: `https://github.com/${owner}/${repo}/blob/main/${fileName}`,
              category: 'github',
              type: repo.includes('sample') ? 'example' : 'github',
              lastModified: fileResponse.data.sha
            };

            this.documentsCache.set(document.id, document);
          }
        } catch (fileError) {
          console.error(`Failed to fetch file ${fileName} from ${owner}/${repo}:`, fileError);
        }
      }

      // Also create a summary document for the repository
      const summaryDocument: CrossDocument = {
        id: `github_${owner}_${repo}_summary`,
        title: `${owner}/${repo} Repository`,
        content: `Repository: ${repoInfo.name}\nDescription: ${repoInfo.description || 'No description'}\nStars: ${repoInfo.stargazers_count}\nLanguage: ${repoInfo.language}\nLicense: ${repoInfo.license?.name || 'No license'}\nURL: ${repoInfo.html_url}`,
        url: repoInfo.html_url,
        category: 'github',
        type: repo.includes('sample') ? 'example' : 'github',
        lastModified: repoInfo.updated_at
      };

      this.documentsCache.set(summaryDocument.id, summaryDocument);

    } catch (error) {
      console.error(`Error fetching GitHub repository ${owner}/${repo}:`, error);
    }
  }
} 