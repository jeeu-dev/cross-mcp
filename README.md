# TCROSS MCP Server

TCROSS Blockchain Integration Guide MCP Server - AI 도구를 통해 CROSS 블록체인 문서에 쉽게 접근할 수 있도록 도와주는 Model Context Protocol 서버입니다.

## 📋 개요

이 MCP 서버는 Anthropic의 Model Context Protocol을 사용하여 AI 도구들(Cursor, VS Code, Windsurf, Claude Desktop 등)이 CROSS 블록체인 문서를 효율적으로 검색하고 활용할 수 있도록 합니다.

## 🚀 설치 방법

### 자동 설치 (권장)

AI 도구의 MCP 설정에 다음 JSON을 추가하세요:

```json
{
  "mcpServers": {
    "cross-integration-guide": {
      "command": "npx",
      "args": ["-y", "tcross-mcp@latest"]
    }
  }
}
```

### 수동 설치

```bash
# 패키지 설치
npm install -g tcross-mcp

# 또는 로컬 개발용
git clone https://github.com/jeeu-dev/tcross-mcp.git
cd tcross-mcp
npm install
npm run build
```

## 🔧 AI 도구별 연결 방법

### Cursor

1. Cursor 설정에서 MCP 서버 설정 열기
2. `~/.cursor/mcp.json` 파일에 위의 JSON 설정 추가
3. Cursor 재시작

[Cursor에서 바로 연결하기](cursor://settings/mcp?config=%7B%22mcpServers%22%3A%7B%22tcross-integration-guide%22%3A%7B%22command%22%3A%22npx%22%2C%22args%22%3A%5B%22-y%22%2C%22tcross-mcp%40latest%22%5D%7D%7D%7D)

### VS Code

1. VS Code에서 MCP 확장프로그램 설치
2. `.vscode/mcp.json` 파일에 설정 추가
3. VS Code 재시작

### Windsurf

1. `~/.codeium/windsurf/mcp_config.json` 파일에 설정 추가
2. Windsurf 재시작

### Claude Desktop

1. Claude Desktop 설정 파일(`claude_desktop_config.json`)에 설정 추가
2. Claude Desktop 재시작

## 🛠 제공하는 도구들

### `get-cross-documents`
CROSS 블록체인 문서를 검색합니다.

**매개변수:**
- `query` (string, 필수): 검색할 키워드
- `category` (string, 선택): 문서 카테고리 (`smart-contract`, `sdk-js`, `sdk-unity`, `chain`, `crossx`, `all`)
- `limit` (number, 선택): 반환할 최대 결과 수 (기본값: 10)

**사용 예시:**
```
"CROSS 스마트 컨트랙트 배포 방법을 알려줘"
"SDK를 사용해서 토큰 전송하는 방법을 찾아줘"
"테스트넷 설정 방법을 검색해줘"
```

### `document-by-id`
특정 문서의 전체 내용을 가져옵니다.

**매개변수:**
- `documentId` (string, 필수): 문서의 고유 식별자

### `get-testnet-info`
CROSS 테스트넷 정보를 제공합니다.

**매개변수:**
- `type` (string, 선택): 정보 유형 (`faucet`, `setup`, `dev-mode`, `all`)

### `get-github-resources` ⭐ **NEW!**
CROSS GitHub 저장소와 예시 코드를 검색합니다.

**매개변수:**
- `type` (string, 선택): 리소스 유형 (`sdk`, `examples`, `all`)
- `includeCode` (boolean, 선택): 코드 예시 포함 여부 (기본값: true)

**지원하는 저장소:**
- [to-nexus/cross-sdk-js](https://github.com/to-nexus/cross-sdk-js) - CROSS JavaScript SDK
- [to-nexus/cross-sdk-js-sample](https://github.com/to-nexus/cross-sdk-js-sample) - SDK 사용 예시

## 📚 활용 예시

### 개발 시작하기
```
"CROSS 블록체인 개발을 시작하려면 어떻게 해야 하나요?"
```

### 스마트 컨트랙트 개발
```
"ERC-20 토큰 컨트랙트를 CROSS에 배포하는 코드를 작성해주세요"
"Foundry를 사용해서 컨트랙트 배포하는 방법을 알려주세요"
```

### SDK 사용
```
"JavaScript SDK로 지갑을 연결하는 코드를 작성해주세요"
"토큰 전송 트랜잭션을 보내는 방법을 알려주세요"
```

### 테스트넷 사용
```
"테스트넷 CROSS 코인을 받는 방법을 알려주세요"
"CROSSx 앱에서 개발자 모드를 활성화하는 방법을 알려주세요"
```

### GitHub 예시 코드 활용 ⭐ **NEW!**
```
"cross-sdk-js 저장소의 설치 방법을 알려주세요"
"GitHub에서 SDK 사용 예시를 찾아서 보여주세요"
"실제 프로젝트에서 사용하는 CROSS SDK 코드 예시를 찾아주세요"
```

## 🔧 개발자 정보

### 로컬 개발 환경 설정

```bash
# 저장소 클론
git clone https://github.com/jeeu-dev/tcross-mcp.git
cd tcross-mcp

# 의존성 설치
npm install

# 개발 모드 실행
npm run dev

# 빌드
npm run build

# 테스트
npm test
```

### 프로젝트 구조

```
tcross-mcp/
├── src/
│   ├── index.ts              # MCP 서버 메인 엔트리포인트
│   ├── services/
│   │   ├── DocumentService.ts    # 문서 크롤링 및 처리
│   │   └── SearchService.ts      # 문서 검색 기능
├── dist/                     # 빌드 출력
├── package.json
├── tsconfig.json
└── README.md
```

## 📝 지원하는 문서 카테고리

- **smart-contract**: 스마트 컨트랙트 개발 가이드
- **sdk-js**: JavaScript SDK 사용법
- **sdk-unity**: Unity SDK 사용법  
- **chain**: 블록체인 기술 정보
- **crossx**: CROSSx 플랫폼 가이드
- **getting-started**: 시작하기 가이드

## 🤝 기여하기

1. 이 저장소를 포크하세요
2. 새로운 기능 브랜치를 만드세요 (`git checkout -b feature/amazing-feature`)
3. 변경사항을 커밋하세요 (`git commit -m 'Add some amazing feature'`)
4. 브랜치에 푸시하세요 (`git push origin feature/amazing-feature`)
5. Pull Request를 열어주세요

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 [LICENSE](LICENSE) 파일을 참고하세요.

## 🔗 관련 링크

- [CROSS 공식 문서](https://docs.crosstoken.io)
- [Model Context Protocol](https://modelcontextprotocol.io)
- [Anthropic Claude](https://www.anthropic.com/claude)
- [CROSS GitHub](https://github.com/crossfi-chain)

## 🆘 지원

문제가 발생하거나 질문이 있으시면:

1. [GitHub Issues](https://github.com/cross-developers/cross-mcp/issues)에 이슈를 등록해주세요
2. 공식 문서의 [FAQ 섹션](https://docs.crosstoken.io/faq)을 확인해보세요
