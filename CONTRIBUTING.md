# Contributing to MCP Store

MCP Store에 새로운 MCP 서버를 제출하거나 개선하는 방법을 안내합니다.

## 새 MCP 서버 제출

### 방법 1: GitHub Issue (권장)

아래 버튼을 클릭하거나 직접 Issue를 생성하세요:

**[📝 새 MCP 서버 제출하기](https://github.com/modelcontextprotocol/servers/issues/new?template=new-server.yml)**

### 방법 2: registry.json PR

`packages/registry.json`에 직접 항목을 추가하는 Pull Request를 제출할 수 있습니다.

#### registry.json 항목 형식

```json
{
  "id": "your-mcp-id",
  "name": "Your MCP Name",
  "description": "개발자용 기술 설명",
  "plainDescription": "일반인도 이해할 수 있는 쉬운 설명",
  "category": "dev",
  "installType": "npx",
  "installCommand": "npx -y @your-org/your-mcp-server",
  "requiredEnvVars": [
    {
      "name": "YOUR_API_KEY",
      "description": "API 키 발급 방법 안내",
      "required": true,
      "isSecret": true
    }
  ],
  "supportedClients": ["claude-desktop", "cursor", "windsurf", "claude-code", "vscode", "zed"],
  "stars": 0,
  "lastUpdated": "2026-03-21",
  "officialSource": "https://github.com/your-org/your-mcp-server",
  "usageExamples": ["이 MCP로 할 수 있는 예시"],
  "permissions": ["필요한 권한 목록"]
}
```

#### 카테고리 목록

| 값 | 설명 |
|---|---|
| `dev` | 개발 도구 (GitHub, GitLab 등) |
| `productivity` | 생산성 도구 (Notion, Todoist 등) |
| `search` | 검색 서비스 (Brave, DuckDuckGo 등) |
| `file` | 파일 시스템 |
| `database` | 데이터베이스 (PostgreSQL, SQLite 등) |
| `ai` | AI/ML 서비스 |
| `communication` | 커뮤니케이션 (Slack, Discord 등) |
| `cloud` | 클라우드 서비스 (AWS, GCP 등) |
| `other` | 기타 |

#### installType 목록

| 값 | 사용 도구 |
|---|---|
| `npx` | Node.js npx |
| `npm` | Node.js npm |
| `uvx` | Python uv |
| `docker` | Docker |

## 품질 기준

MCP Store는 다음 기준으로 품질 점수를 자동 계산합니다:

- **Stars** (40점): GitHub star 수 (로그 스케일)
- **최신성** (20점): 최근 업데이트 날짜
- **설명 충실도** (20점): description + plainDescription 길이
- **지원 클라이언트** (10점): 지원하는 클라이언트 수
- **설정 용이성** (10점): 필수 환경변수 수 (적을수록 높음)

80점 이상 → 우수, 60점 이상 → 양호, 40점 이상 → 보통

## 개발 환경 설정

```bash
git clone https://github.com/your-org/mcp-store
cd mcp-store
npm install
npm run dev
```

## 코드 스타일

- TypeScript strict 모드
- React functional components
- Tailwind CSS (다크테마 inline style 혼용)
- 300줄 초과 파일은 분리

## 라이선스

MIT License
