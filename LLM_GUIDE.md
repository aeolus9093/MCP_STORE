# MCP Store — LLM 가이드라인

> 이 문서는 다른 LLM(AI 에이전트)이 MCP Store를 사용하여 MCP 서버를 설치하고 관리하는 방법을 설명합니다.

---

## MCP Store란?

MCP Store는 Model Context Protocol(MCP) 서버를 관리하는 Electron 데스크탑 앱입니다.
지원 클라이언트: **Claude Desktop**, **Cursor**, **Windsurf**, **Claude Code**

---

## 기계 판독 가능한 API 엔드포인트

MCP Store는 Electron IPC를 통해 다음 기능을 제공합니다.
`window.mcpStore` 객체를 통해 Renderer 프로세스에서 접근합니다.

### 1. 전체 MCP 목록 조회

```javascript
const result = await window.mcpStore.getAll();
// result.data: MCPPackage[] — 100개 MCP 목록
```

### 2. MCP 검색 / 필터

```javascript
const result = await window.mcpStore.search({
  query:    "github",               // 선택: 텍스트 검색
  category: "dev",                  // 선택: dev|productivity|search|file|database|ai|communication|cloud|other
  client:   "claude-desktop",       // 선택: claude-desktop|cursor|windsurf|claude-code
  sort:     "stars-desc",           // 선택: stars-desc|name-asc|date-desc
});
// result.data: MCPPackage[]
```

### 3. MCP 설치

```javascript
const result = await window.mcpStore.install({
  packageId: "github-official",           // MCPPackage.id
  clients:   ["claude-desktop", "cursor"], // 설치할 클라이언트 목록 (복수 가능)
  envVars:   {
    GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_...",
  },
});
// result.success: boolean
// result.error: string (실패 시)
```

### 4. 설치 로그 수신 (실시간)

```javascript
window.mcpStore.onLog(({ packageId, line }) => {
  console.log(`[${packageId}] ${line}`);
});

// 리스너 해제
window.mcpStore.offLog();
```

### 5. 설치된 MCP 목록 조회

```javascript
const result = await window.mcpStore.getInstalled();
// result.data: InstalledMCP[]
// InstalledMCP: { packageId, client, installedAt, configPath, envVars, isActive }
```

### 6. MCP 활성화 / 비활성화

```javascript
await window.mcpStore.toggleMcp({
  packageId: "github-official",
  client:    "claude-desktop",
  isActive:  false,   // true: 활성화, false: 비활성화
});
```

### 7. MCP 제거

```javascript
await window.mcpStore.removeInstalled({
  packageId: "github-official",
  client:    "claude-desktop",
});
```

### 8. 업데이트 확인

```javascript
const result = await window.mcpStore.checkUpdates();
// result.data: string[] — 업데이트 가능한 packageId 목록
```

### 9. 의존성 도구 확인

```javascript
const result = await window.mcpStore.checkTools();
// result.data: { node: boolean, npm: boolean, npx: boolean, uvx: boolean, docker: boolean }
```

### 10. 백업 내보내기 / 가져오기

```javascript
// 내보내기
const backup = await window.mcpStore.exportBackup();
// backup.data: JSON 문자열 (설치 목록 + 설정 파일 내용 포함)

// 가져오기
const result = await window.mcpStore.importBackup(jsonString);
```

---

## MCPPackage 타입 정의

```typescript
interface MCPPackage {
  id:               string;        // "github-official"
  name:             string;        // "GitHub"
  description:      string;        // 기술적 설명
  plainDescription: string;        // 사용자 친화적 설명 (한국어)
  category:         MCPCategory;   // "dev" | "productivity" | ...
  installType:      "npm" | "uvx" | "npx" | "docker";
  installCommand:   string;        // 실제 실행 명령
  requiredEnvVars:  EnvVar[];      // 필요한 환경 변수
  supportedClients: Client[];      // 지원 클라이언트
  stars:            number;        // 인기도
  lastUpdated:      string;        // 마지막 업데이트 날짜 (ISO)
  officialSource:   string;        // GitHub URL
  usageExamples?:   string[];      // 사용 예시 (한국어 질문 예시)
  permissions?:     string[];      // 필요 권한 목록
}
```

---

## 자동화 예시 (Claude Desktop에 GitHub MCP 설치)

```javascript
// 1. GitHub MCP 검색
const search = await window.mcpStore.search({ query: "github", category: "dev" });
const githubMCP = search.data?.find(p => p.id === "github-official");

if (!githubMCP) {
  throw new Error("GitHub MCP를 찾을 수 없습니다.");
}

// 2. 필요한 환경 변수 확인
const requiredVars = githubMCP.requiredEnvVars
  .filter(v => v.required)
  .map(v => v.name);
// ["GITHUB_PERSONAL_ACCESS_TOKEN"]

// 3. 의존성 확인
const tools = await window.mcpStore.checkTools();
if (!tools.data?.npm) {
  throw new Error("npm이 설치되지 않았습니다. Node.js를 먼저 설치하세요.");
}

// 4. 설치
const result = await window.mcpStore.install({
  packageId: "github-official",
  clients:   ["claude-desktop"],
  envVars:   {
    GITHUB_PERSONAL_ACCESS_TOKEN: "ghp_your_token_here",
  },
});

if (result.success) {
  console.log("GitHub MCP 설치 완료!");
} else {
  console.error("설치 실패:", result.error);
}
```

---

## 설치 흐름 요약

```
1. search() → 원하는 MCP 찾기
2. checkTools() → 필요한 도구 설치 확인
3. install() → 환경 변수와 함께 설치
4. onLog() → 실시간 진행 상황 수신
5. getInstalled() → 설치 완료 확인
```

---

## 카테고리 목록

| 카테고리 | 설명 |
|----------|------|
| `dev` | 개발 도구 (GitHub, Git, Docker 등) |
| `productivity` | 생산성 (Notion, Calendar, Todoist 등) |
| `search` | 검색 (Brave Search, Tavily, Wikipedia 등) |
| `file` | 파일 관리 (Filesystem, Google Drive 등) |
| `database` | 데이터베이스 (PostgreSQL, MySQL, Redis 등) |
| `ai` | AI/ML (Memory, HuggingFace, OpenAI 등) |
| `communication` | 커뮤니케이션 (Slack, Gmail, Discord 등) |
| `cloud` | 클라우드 인프라 (AWS, Cloudflare, Vercel 등) |
| `other` | 기타 (Weather, Stripe, YouTube 등) |

---

## 주의사항

- `isSecret: true` 환경 변수는 API 키 등 민감한 정보입니다. 안전하게 취급하세요.
- `clients` 배열에 여러 클라이언트를 지정하면 동시에 모든 클라이언트에 설치됩니다.
- `toggleMcp` / `removeInstalled`는 클라이언트 설정 파일을 직접 수정합니다.
- 클라이언트 재시작 후 설치된 MCP가 활성화됩니다.
