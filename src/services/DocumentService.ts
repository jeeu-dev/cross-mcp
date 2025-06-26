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
        
              // ✅ JavaScript SDK (verified - most important practical information)
      '/docs/sdkjs_installation',      // ⭐ Core: SDK installation guide
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

      // GitHub repositories disabled to avoid rate limiting
      // await this.fetchGitHubRepositories();

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
      
      // Enhanced content for wallet connection
      if (path === '/docs/sdkjs_connection') {
        content = this.enhanceWalletConnectionContent(content);
      }
      
      // Enhanced content for balance queries
      if (path === '/docs/sdkjs_balance') {
        content = this.enhanceBalanceContent(content);
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

=== 🚀 CROSS SDK Complete Installation Guide ===

📋 STEP 1: Project Setup
   - Ensure you have a JavaScript/React project ready
   - Node.js 16+ version required

📦 STEP 2: GitHub Package Registry Configuration
   Create .npmrc file in your project root:
   
   registry=https://registry.npmjs.org/
   @to-nexus:registry=https://package.cross-nexus.com/repository/cross-sdk-js/

⚙️ STEP 3: CROSS SDK Installation
   Using npm:
   npm install @to-nexus/sdk
   
   Using yarn:
   yarn add @to-nexus/sdk
   
   Using pnpm:
   pnpm add @to-nexus/sdk

🔧 STEP 4: Environment Variables Setup
   Create .env file in your project root:
   
   For Vite projects:
   VITE_PROJECT_ID=your_project_id_here
   VITE_NODE_ENV=production
   
   For Webpack projects:
   PROJECT_ID=your_project_id_here
   NODE_ENV=production
   
   ⚠️ Important Notes:
   - projectId is required (contact Cross team if you don't have one)
   - nodeEnv must be 'production' for general users
   - nodeEnv 'development' is only for CROSS chain developers

🚀 STEP 5: SDK Initialization
   Initialize in your app entry point:
   
   import { initCrossSdk } from '@to-nexus/sdk/react'
   
   const projectId = "your_project_id_here"
   initCrossSdk(projectId)

=== 💰 Wallet Connection Guide ===

📱 STEP 6: Basic Wallet Connection
   Simplest wallet connection method:
   
   import { useAppKit } from '@to-nexus/sdk/react'
   
   function connectWallet() {
     const appKit = useAppKit()
     appKit.connect()  // This single line shows wallet connection UI!
   }
   
   function WalletButton() {
     return (
       <button onClick={connectWallet}>
         Connect Wallet
       </button>
     )
   }

🔌 STEP 7: Advanced Wallet Connection (Connection State Management)
   
   import { useAppKit, useDisconnect, useAppKitNetwork } from '@to-nexus/sdk/react'
   import { useEffect } from 'react'
   
   function WalletManager() {
     const appKit = useAppKit()
     const { disconnect } = useDisconnect()
     const { chainId, isConnected } = useAppKitNetwork()
     
     const handleConnect = () => {
       appKit.connect()  // Automatically display wallet connection UI
     }
     
     useEffect(() => {
       // Connection event listeners
       const handleWalletConnect = () => {
         console.log('Wallet connected successfully!')
       }
       
       const handleWalletDisconnect = () => {
         console.log('Wallet disconnected.')
       }
       
       appKit.on('connect', handleWalletConnect)
       appKit.on('disconnect', handleWalletDisconnect)
       
       return () => {
         appKit.off('connect', handleWalletConnect)
         appKit.off('disconnect', handleWalletDisconnect)
       }
     }, [appKit])
     
            return (
         <div>
           <p>Chain ID: {chainId}</p>
           <p>Connection Status: {isConnected ? 'Connected' : 'Disconnected'}</p>
           {isConnected ? (
             <button onClick={disconnect}>Disconnect Wallet</button>
           ) : (
             <button onClick={handleConnect}>Connect Wallet</button>
           )}
         </div>
       )
     }

🌐 STEP 8: Network Switching
   
   import { useAppKitNetwork } from '@to-nexus/sdk/react'
   import { crossMainnet, crossTestnet } from '@to-nexus/sdk/react'
   
   function NetworkSwitcher() {
     const { switchNetwork } = useAppKitNetwork()
     
     const switchToMainnet = () => {
       switchNetwork(crossMainnet)
     }
     
     const switchToTestnet = () => {
       switchNetwork(crossTestnet)
     }
     
     return (
       <div>
         <button onClick={switchToMainnet}>Switch to Mainnet</button>
         <button onClick={switchToTestnet}>Switch to Testnet</button>
       </div>
     )
   }

💡 Key Points:
   1. appKit.connect() single line automatically shows wallet connection UI
   2. No need for complex UI implementation
   3. Manage state through connection/disconnection events
   4. Network switching is also simple

📚 Reference Documentation:
   - Installation Guide: https://docs.crosstoken.io/docs/sdkjs_installation
   - Connection Guide: https://docs.crosstoken.io/docs/sdkjs_connection
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

  private enhanceWalletConnectionContent(originalContent: string): string {
    // Add comprehensive wallet connection guide based on actual CROSS documentation
    const enhancedContent = `${originalContent}

=== 💰 Complete Wallet Connection Guide ===

🎯 Most Important Point: appKit.connect() single line shows all wallet connection UI!

📱 STEP 1: Basic Wallet Connection (Simplest Method)
   
   import { useAppKit } from '@to-nexus/sdk/react'
   
        function connectWallet() {
       const appKit = useAppKit()
       appKit.connect()  // 🚀 This single line automatically shows wallet connection UI!
     }
     
     function WalletButton() {
       return (
         <button onClick={connectWallet}>
           Connect Wallet
         </button>
       )
     }

🔌 STEP 2: Wallet Disconnection
   
   import { useDisconnect } from '@to-nexus/sdk/react'
   
        function disconnectWallet() {
       const { disconnect } = useDisconnect()
       disconnect()  // Simple disconnection
     }

📊 STEP 3: Connection Status Check
   
   import { useAppKitNetwork } from '@to-nexus/sdk/react'
   
   function NetworkStatus() {
     const { chainId, isConnected } = useAppKitNetwork()
     
     return (
       <div>
                    <p>Chain ID: {chainId}</p>
         <p>Connection Status: {isConnected ? '✅ Connected' : '❌ Disconnected'}</p>
       </div>
     )
   }

🌐 STEP 4: 네트워크 전환 (메인넷 ↔ 테스트넷)
   
   import { useAppKitNetwork } from '@to-nexus/sdk/react'
   import { crossMainnet, crossTestnet } from '@to-nexus/sdk/react'
   
   function switchNetwork() {
     const { switchNetwork } = useAppKitNetwork()
     
     // 환경에 따라 자동 네트워크 선택
     const targetNetwork = import.meta.env['VITE_NODE_ENV'] === 'production' 
       ? crossMainnet 
       : crossTestnet
     
     switchNetwork(targetNetwork)
   }

🎧 STEP 5: Connection Event Listeners (Advanced)
   
   import { useAppKit } from '@to-nexus/sdk/react'
   import { useEffect } from 'react'
   
   function ConnectionListener() {
     const appKit = useAppKit()
     
     useEffect(() => {
       const handleConnect = () => {
         console.log('🎉 Wallet connected successfully!')
         // Add logic after successful connection
       }
       
       const handleDisconnect = () => {
         console.log('👋 Wallet disconnected.')
         // Add logic after disconnection
       }
       
       // 이벤트 구독
       appKit.on('connect', handleConnect)
       appKit.on('disconnect', handleDisconnect)
       
       // 컴포넌트 언마운트 시 이벤트 정리
       return () => {
         appKit.off('connect', handleConnect)
         appKit.off('disconnect', handleDisconnect)
       }
     }, [appKit])

     return null  // Only handles event listeners
   }

🔥 STEP 6: Complete Wallet Manager Component
   
   import { 
     useAppKit, 
     useDisconnect, 
     useAppKitNetwork 
   } from '@to-nexus/sdk/react'
   import { useEffect } from 'react'
   
   function CompleteWalletManager() {
     const appKit = useAppKit()
     const { disconnect } = useDisconnect()
     const { chainId, isConnected } = useAppKitNetwork()
     
     const handleConnect = () => {
       appKit.connect()  // Display wallet connection UI
     }
     
     useEffect(() => {
       const handleWalletConnect = () => {
         console.log('✅ Wallet connection successful!')
       }
       
       const handleWalletDisconnect = () => {
         console.log('❌ Wallet disconnected')
       }
       
       appKit.on('connect', handleWalletConnect)
       appKit.on('disconnect', handleWalletDisconnect)
       
       return () => {
         appKit.off('connect', handleWalletConnect)
         appKit.off('disconnect', handleWalletDisconnect)
       }
     }, [appKit])
     
            return (
         <div style={{ padding: '20px', border: '1px solid #ccc', borderRadius: '8px' }}>
           <h3>🔗 CROSS Wallet Connection</h3>
           <p>Chain ID: <strong>{chainId || 'None'}</strong></p>
           <p>Status: <strong>{isConnected ? '🟢 Connected' : '🔴 Disconnected'}</strong></p>
         
                    {isConnected ? (
             <button 
               onClick={disconnect}
               style={{ 
                 padding: '10px 20px', 
                 backgroundColor: '#ff4444', 
                 color: 'white', 
                 border: 'none', 
                 borderRadius: '4px',
                 cursor: 'pointer'
               }}
             >
               🔌 Disconnect Wallet
             </button>
           ) : (
             <button 
               onClick={handleConnect}
               style={{ 
                 padding: '10px 20px', 
                 backgroundColor: '#4CAF50', 
                 color: 'white', 
                 border: 'none', 
                 borderRadius: '4px',
                 cursor: 'pointer'
               }}
             >
               💰 Connect Wallet
             </button>
           )}
       </div>
     )
   }

💡 Key Points:
   ✅ Just call appKit.connect() to automatically show wallet selection UI
   ✅ Automatic support for various wallets like MetaMask, WalletConnect  
   ✅ No need for complex UI implementation
   ✅ Real-time tracking of connection/disconnection status
   ✅ Network switching also handled with one line

🚨 Important Notes:
   ⚠️ SDK initialization (initCrossSdk) must be completed first
   ⚠️ Environment variables (VITE_PROJECT_ID) must be properly set
   ⚠️ Hooks can only be used within React components

🔗 Next Steps:
   1. Token Transfer: Refer to Token Transfer documentation
   2. Signature: Refer to Signature documentation  
   3. Balance Query: Refer to Balance documentation
   4. Custom Data: Refer to Custom Data documentation

📚 Reference Documentation:
   - Connection Guide: https://docs.crosstoken.io/docs/sdkjs_connection
   - Installation Guide: https://docs.crosstoken.io/docs/sdkjs_installation
   - SDK Hooks: https://docs.crosstoken.io/docs/sdkjs_hooks
`;

    return enhancedContent;
  }

  private enhanceBalanceContent(originalContent: string): string {
    // Add comprehensive balance query guide based on actual CROSS documentation
    const enhancedContent = `${originalContent}

=== 💰 Complete Balance & Asset Management Guide ===

🎯 Essential Functions: Query CROSS, ERC20, and NFT balances with real-time updates!

📊 STEP 1: Get CROSS Native Token Balance
   
   import { useAppKitAccount } from '@to-nexus/sdk/react'
   
   function getCrossBalance() {
     const account = useAppKitAccount()
     if (!account?.isConnected) return null
     return account.balance  // Returns native CROSS balance
   }
   
   // Usage in component
   function CrossBalanceDisplay() {
     const balance = getCrossBalance()
     
     return (
       <div>
         <h3>💎 CROSS Balance</h3>
         <p>{balance || '0'} CROSS</p>
       </div>
     )
   }

🪙 STEP 2: Get ERC20 Token Balance
   
   import { useAppKitAccount, ConnectionController, AccountController } from '@to-nexus/sdk/react'
   
   const ERC20_ADDRESS = "0x6892a97F4E85D45f4CaCAfBc5fc0B5186f355A1b"
   
   function getERC20Balance() {
     const account = useAppKitAccount()
     if (!account?.isConnected) return null
     
     const fromAddress = AccountController.state.address as \`0x\${string}\`
     
     return ConnectionController.readContract({
       contractAddress: ERC20_ADDRESS,
       method: 'balanceOf',
       abi: sampleErc20ABI,  // You need to define this ABI
       args: [fromAddress]
     })
   }
   
   // Complete ERC20 balance component
   function ERC20BalanceDisplay() {
     const account = useAppKitAccount()
     const [balance, setBalance] = useState('0')
     
     useEffect(() => {
       if (!account?.isConnected) return
       
       getERC20Balance().then(result => {
         if (result) {
           // Format the balance (assuming 18 decimals)
           const formattedBalance = ConnectionController.formatUnits(result, 18)
           setBalance(formattedBalance)
         }
       })
     }, [account?.isConnected])
     
     return (
       <div>
         <h3>🪙 ERC20 Token Balance</h3>
         <p>{balance} Tokens</p>
       </div>
     )
   }

🖼️ STEP 3: Get NFT Balance
   
   import { useAppKitAccount, ConnectionController, AccountController } from '@to-nexus/sdk/react'
   
   const ERC721_ADDRESS = "0xEeE291deAF8505681AA7A3e930A6f12b7f21fe65"
   
   function getNFTBalance() {
     const account = useAppKitAccount()
     if (!account?.isConnected) return null
     
     const fromAddress = AccountController.state.address as \`0x\${string}\`
     
     return ConnectionController.readContract({
       contractAddress: ERC721_ADDRESS,
       method: 'balanceOf',
       abi: sampleErc721ABI,  // You need to define this ABI
       args: [fromAddress]
     })
   }
   
   // Complete NFT balance component
   function NFTBalanceDisplay() {
     const account = useAppKitAccount()
     const [nftCount, setNftCount] = useState('0')
     
     useEffect(() => {
       if (!account?.isConnected) return
       
       getNFTBalance().then(result => {
         if (result) {
           setNftCount(result.toString())
         }
       })
     }, [account?.isConnected])
     
     return (
       <div>
         <h3>🖼️ NFT Collection</h3>
         <p>{nftCount} NFTs owned</p>
       </div>
     )
   }

🔔 STEP 4: Real-time Balance Subscription
   
   import { useAppKitAccount, AccountController } from '@to-nexus/sdk/react'
   import { useEffect, useState } from 'react'
   
   function BalanceSubscriber() {
     const account = useAppKitAccount()
     const [balance, setBalance] = useState<string>('0')
     
     useEffect(() => {
       // Subscribe to balance changes
       const unsubscribe = AccountController.subscribe('balance', (newBalance) => {
         setBalance(newBalance)
         console.log('💰 Balance updated:', newBalance)
       })
       
       // Cleanup subscription
       return () => {
         unsubscribe()
       }
     }, [])
   
     return (
       <div>
         <h3>🔔 Live Balance Monitor</h3>
         <p>Current Balance: {balance} CROSS</p>
       </div>
     )
   }

🔧 STEP 5: Balance Formatting Utilities
   
   import { ConnectionController } from '@to-nexus/sdk/react'
   
   // Format balance with custom decimals
   function formatBalance(balance: string, decimals: number = 18) {
     return ConnectionController.formatUnits(balance, decimals)
   }
   
   // Format balance with currency symbol
   function formatBalanceWithSymbol(balance: string, symbol: string = 'CROSS', decimals: number = 18) {
     const formatted = ConnectionController.formatUnits(balance, decimals)
     return \`\${formatted} \${symbol}\`
   }
   
   // Shorten address for display
   function shortenAddress(address: string): string {
     if (!address) return ''
     return \`\${address.slice(0, 6)}...\${address.slice(-4)}\`
   }

🔥 STEP 6: Complete Wallet Dashboard Component
   
   import { 
     useAppKit, 
     useAppKitAccount, 
     useAppKitNetwork,
     AccountController,
     ConnectionController 
   } from '@to-nexus/sdk/react'
   import { useEffect, useState } from 'react'
   
   function CompletWalletDashboard() {
     const appKit = useAppKit()
     const account = useAppKitAccount()
     const { chainId, isConnected } = useAppKitNetwork()
     const [crossBalance, setCrossBalance] = useState('0')
     const [walletAddress, setWalletAddress] = useState('')
     
     // Connection event handlers
     useEffect(() => {
       const handleConnect = () => {
         console.log('🎉 Wallet connected successfully!')
         const address = AccountController.state.address
         if (address) {
           setWalletAddress(address)
         }
       }
       
       const handleDisconnect = () => {
         console.log('👋 Wallet disconnected.')
         setWalletAddress('')
         setCrossBalance('0')
       }
       
       // Subscribe to connection events
       appKit.on('connect', handleConnect)
       appKit.on('disconnect', handleDisconnect)
       
       return () => {
         appKit.off('connect', handleConnect)
         appKit.off('disconnect', handleDisconnect)
       }
     }, [appKit])
     
     // Balance subscription
     useEffect(() => {
       if (!account?.isConnected) return
       
       const unsubscribe = AccountController.subscribe('balance', (newBalance) => {
         setCrossBalance(newBalance)
       })
       
       return () => unsubscribe()
     }, [account?.isConnected])
     
     // Initial balance load
     useEffect(() => {
       if (account?.isConnected && account.balance) {
         setCrossBalance(account.balance)
       }
     }, [account?.isConnected, account?.balance])
     
     if (!isConnected) {
       return (
         <div style={{ padding: '20px', textAlign: 'center' }}>
           <h2>🔗 Connect Your Wallet</h2>
           <button 
             onClick={() => appKit.connect()}
             style={{
               padding: '12px 24px',
               backgroundColor: '#4CAF50',
               color: 'white',
               border: 'none',
               borderRadius: '8px',
               fontSize: '16px',
               cursor: 'pointer'
             }}
           >
             💰 Connect Wallet
           </button>
         </div>
       )
     }
     
     return (
       <div style={{ 
         padding: '20px', 
         border: '1px solid #ddd', 
         borderRadius: '12px',
         maxWidth: '500px',
         margin: '20px auto'
       }}>
         <h2>🏦 Wallet Dashboard</h2>
         
         <div style={{ marginBottom: '15px' }}>
           <h3>📍 Wallet Address</h3>
           <p style={{ 
             fontFamily: 'monospace', 
             backgroundColor: '#f5f5f5', 
             padding: '8px', 
             borderRadius: '4px' 
           }}>
             {shortenAddress(walletAddress)}
           </p>
         </div>
         
         <div style={{ marginBottom: '15px' }}>
           <h3>🌐 Network Info</h3>
           <p>Chain ID: <strong>{chainId}</strong></p>
           <p>Status: <span style={{ color: 'green' }}>🟢 Connected</span></p>
         </div>
         
         <div style={{ marginBottom: '15px' }}>
           <h3>💎 CROSS Balance</h3>
           <p style={{ fontSize: '20px', fontWeight: 'bold' }}>
             {formatBalanceWithSymbol(crossBalance, 'CROSS')}
           </p>
         </div>
         
         <button
           onClick={() => appKit.disconnect?.()}
           style={{
             padding: '10px 20px',
             backgroundColor: '#ff4444',
             color: 'white',
             border: 'none',
             borderRadius: '6px',
             cursor: 'pointer',
             width: '100%'
           }}
         >
           🔌 Disconnect Wallet
         </button>
       </div>
     )
   }

💡 Key Features:
   ✅ Real-time CROSS balance monitoring
   ✅ ERC20 token balance queries
   ✅ NFT collection balance tracking
   ✅ Automatic balance updates via subscription
   ✅ Wallet address display with formatting
   ✅ Complete connection event handling
   ✅ Professional dashboard UI

🚨 Important Notes:
   ⚠️ You need to define sampleErc20ABI and sampleErc721ABI for contract calls
   ⚠️ Replace contract addresses with actual deployed contract addresses
   ⚠️ Test with testnet first before using on mainnet
   ⚠️ Handle errors appropriately for production use

🔗 Required ABIs Example:
   
   const sampleErc20ABI = [
     {
       "constant": true,
       "inputs": [{"name": "_owner", "type": "address"}],
       "name": "balanceOf",
       "outputs": [{"name": "balance", "type": "uint256"}],
       "type": "function"
     }
   ]
   
   const sampleErc721ABI = [
     {
       "constant": true,
       "inputs": [{"name": "_owner", "type": "address"}],
       "name": "balanceOf",
       "outputs": [{"name": "", "type": "uint256"}],
       "type": "function"
     }
   ]

📚 Reference Documentation:
   - Balance Guide: https://docs.crosstoken.io/docs/sdkjs_balance
   - Connection Guide: https://docs.crosstoken.io/docs/sdkjs_connection
   - Token Transfer: https://docs.crosstoken.io/docs/sdkjs_token-transfer
`;

    return enhancedContent;
  }
} 