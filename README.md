# TCROSS MCP Server

A Model Context Protocol (MCP) server providing AI tools with access to CROSS blockchain documentation and GitHub resources.

## 📋 Overview

This MCP server uses Anthropic's Model Context Protocol to enable AI tools (Cursor, VS Code, Windsurf, Claude Desktop, etc.) to efficiently search and utilize CROSS blockchain documentation.

## 🚀 Installation

### Auto Installation (Recommended)

Add the following JSON to your AI tool's MCP settings:

```json
{
  "mcpServers": {
    "tcross-integration-guide": {
      "command": "npx",
      "args": ["-y", "tcross-mcp@latest"]
    }
  }
}
```

### Manual Installation

```bash
# Install package
npm install -g tcross-mcp

# Or for local development
git clone https://github.com/jeeu-dev/tcross-mcp.git
cd tcross-mcp
npm install
npm run build
```

## 🔧 AI Tool Integration

### Cursor

1. Open MCP server settings in Cursor
2. Add the above JSON configuration to `~/.cursor/mcp.json`
3. Restart Cursor

[Quick Setup for Cursor](cursor://settings/mcp?config=%7B%22mcpServers%22%3A%7B%22tcross-integration-guide%22%3A%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22tcross-mcp%40latest%22%5D%7D%7D%7D)

### VS Code

1. Install MCP extension in VS Code
2. Add configuration to `.vscode/mcp.json`
3. Restart VS Code

### Windsurf

1. Add configuration to `~/.codeium/windsurf/mcp_config.json`
2. Restart Windsurf

### Claude Desktop

1. Add configuration to Claude Desktop settings file (`claude_desktop_config.json`)
2. Restart Claude Desktop

## 🛠 Available Tools

### `get-cross-documents`
Search CROSS blockchain documentation.

**Parameters:**
- `query` (string, required): Search keywords
- `category` (string, optional): Document category (`smart-contract`, `sdk-js`, `sdk-unity`, `chain`, `crossx`, `github`, `all`)
- `limit` (number, optional): Maximum number of results (default: 10)

**Usage Examples:**
```
"How to deploy CROSS smart contracts?"
"Find SDK token transfer methods"
"Search testnet setup guide"
```

### `document-by-id`
Retrieve full content of a specific document.

**Parameters:**
- `documentId` (string, required): Unique document identifier

### `get-testnet-info`
Get CROSS testnet information.

**Parameters:**
- `type` (string, optional): Information type (`faucet`, `setup`, `dev-mode`, `all`)

### `get-github-resources` ⭐ **NEW!**
Search CROSS GitHub repositories and example code.

**Parameters:**
- `type` (string, optional): Resource type (`sdk`, `examples`, `all`)
- `includeCode` (boolean, optional): Include code examples (default: true)

**Supported Repositories:**
- [to-nexus/cross-sdk-js](https://github.com/to-nexus/cross-sdk-js) - CROSS JavaScript SDK
- [to-nexus/cross-sdk-js-sample](https://github.com/to-nexus/cross-sdk-js-sample) - SDK usage examples

## 📚 Usage Examples

### Getting Started
```
"How do I start developing on CROSS blockchain?"
```

### Smart Contract Development
```
"Write code to deploy ERC-20 token contract on CROSS"
"Show me how to deploy contracts using Foundry"
```

### SDK Usage
```
"Write code to connect wallet using JavaScript SDK"
"How to send token transfer transactions?"
```

### Testnet Usage
```
"How to get testnet CROSS coins?"
"How to enable developer mode in CROSSx app?"
```

### GitHub Examples ⭐ **NEW!**
```
"Show me cross-sdk-js installation guide"
"Find SDK usage examples from GitHub"
"Search for real project examples using CROSS SDK"
```

## 🔧 Developer Information

### Local Development Setup

```bash
# Clone repository
git clone https://github.com/jeeu-dev/tcross-mcp.git
cd tcross-mcp

# Install dependencies
npm install

# Run development mode
npm run dev

# Build
npm run build

# Test
npm test
```

### Project Structure

```
tcross-mcp/
├── src/
│   ├── index.ts              # MCP server main entry point
│   ├── services/
│   │   ├── DocumentService.ts    # Document crawling and processing
│   │   └── SearchService.ts      # Document search functionality
├── dist/                     # Build output
├── package.json
├── tsconfig.json
└── README.md
```

## 📝 Supported Document Categories

- **smart-contract**: Smart contract development guides
- **sdk-js**: JavaScript SDK usage
- **sdk-unity**: Unity SDK usage  
- **chain**: Blockchain technology information
- **crossx**: CROSSx platform guides
- **github**: GitHub repositories and examples

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## 🔗 Related Links

- [CROSS Official Documentation](https://docs.crosstoken.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Anthropic Claude](https://www.anthropic.com/claude)
- [CROSS GitHub](https://github.com/crossfi-chain)

## 🆘 Support

If you encounter issues or have questions:

1. Register an issue on [GitHub Issues](https://github.com/cross-developers/cross-mcp/issues)
2. Check the [FAQ section](https://docs.crosstoken.io/faq) of the official documentation
