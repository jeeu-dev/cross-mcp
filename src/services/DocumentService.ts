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
      // Fetch main documentation pages - ONLY VERIFIED VALID URLs
      const mainPages = [
        // ✅ Getting Started (verified)
        '/docs/dev_getting-started',
        '/docs/dev_testnet-faucet',
        
        // ✅ Smart Contract Development (verified)
        '/docs/sc_solidity',
        '/docs/sc_sample-erc20-contract',
        '/docs/sc_sample-erc721-contract',
        '/docs/sc_sample-erc1155-contract',
        
        // ✅ Chain Information (verified)
        '/docs/ch_fee-delegation',
        '/docs/ch_checkpoint',
        
        // ✅ JavaScript SDK (verified - 가장 중요한 실용 정보)
        '/docs/sdkjs_installation',      // ⭐ 핵심: SDK 설치 가이드
        '/docs/sdkjs_hooks',
        '/docs/sdkjs_controllers',
        '/docs/sdkjs_connection',
        '/docs/sdkjs_token-transfer',
        '/docs/sdkjs_signature',
        '/docs/sdkjs_balance',
        '/docs/sdkjs_version-history',
        
        // ✅ CROSSx Platform (verified)
        '/docs/crossx',
        '/docs/crossx_create-wallet',
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
      let content = this.extractContent($);

      // Determine category from path
      const category = this.getCategoryFromPath(path);

      // Enhanced content for specific critical documents
      if (path === '/docs/sdkjs_installation') {
        content = this.enhanceSDKInstallationContent(content);
      }

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
      let content = mainContent.text().trim();
      
      // Enhanced extraction for code blocks and installation steps
      const codeBlocks = mainContent.find('pre, code');
      if (codeBlocks.length > 0) {
        content += '\n\n=== CODE EXAMPLES ===\n';
        codeBlocks.each((i, elem) => {
          const codeContent = $(elem).text().trim();
          if (codeContent && codeContent.length > 10) {
            content += `\nCode Block ${i + 1}:\n${codeContent}\n`;
          }
        });
      }
      
      // Extract step-by-step instructions
      const steps = mainContent.find('ol li, ul li');
      if (steps.length > 0) {
        content += '\n\n=== STEP-BY-STEP INSTRUCTIONS ===\n';
        steps.each((i, elem) => {
          const stepContent = $(elem).text().trim();
          if (stepContent && stepContent.length > 5) {
            content += `${i + 1}. ${stepContent}\n`;
          }
        });
      }
      
      return content;
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

  private enhanceSDKInstallationContent(originalContent: string): string {
    // Add comprehensive installation guide based on actual CROSS documentation
    const enhancedContent = `${originalContent}

=== ENHANCED INSTALLATION GUIDE ===

📦 CROSS SDK JavaScript Installation Complete Guide

1. PROJECT SETUP
   - Ensure you have a JavaScript/React project ready
   - Node.js version 16+ required

2. CONFIGURE GITHUB PACKAGE REGISTRY
   Create .npmrc file in your project root:
   
   registry=https://registry.npmjs.org/
   @to-nexus:registry=https://package.cross-nexus.com/repository/cross-sdk-js/

3. INSTALL CROSS SDK
   Using npm:
   npm install @to-nexus/sdk
   
   Using yarn:
   yarn add @to-nexus/sdk
   
   Using pnpm:
   pnpm add @to-nexus/sdk

4. ENVIRONMENT VARIABLES SETUP
   Create .env file in your project root:
   
   For Vite projects:
   VITE_PROJECT_ID=your_project_id_here
   VITE_NODE_ENV=production
   
   For Webpack projects:
   PROJECT_ID=your_project_id_here
   NODE_ENV=production
   
   IMPORTANT:
   - projectId is REQUIRED (contact Cross team if you don't have one)
   - nodeEnv must be 'production' for general users
   - nodeEnv 'development' is only for CROSS chain developers

5. SDK INITIALIZATION
   Initialize in your app entry point:
   
   import { initCrossSdk } from '@to-nexus/sdk/react'
   
   const projectId = "your_project_id_here"
   initCrossSdk(projectId)

6. BASIC USAGE EXAMPLE
   import { useCrossConnect } from '@to-nexus/sdk/react'
   
   function App() {
     const { connect, disconnect, account } = useCrossConnect()
     
     return (
       <div>
         {account ? (
           <button onClick={disconnect}>Disconnect</button>
         ) : (
           <button onClick={connect}>Connect Wallet</button>
         )}
       </div>
     )
   }

7. COMMON ISSUES AND SOLUTIONS
   - If package not found: Check .npmrc configuration
   - If SDK initialization fails: Verify PROJECT_ID environment variable
   - If connection issues: Check NODE_ENV is set to 'production'

8. NEXT STEPS
   - Read the Hooks documentation for advanced features
   - Check Token Transfer guide for transaction handling
   - Explore Connection guide for wallet integration patterns
`;

    return enhancedContent;
  }
} 