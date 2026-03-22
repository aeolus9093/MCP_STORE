// =============================================================
// shared/types.ts — 프론트/백엔드 공유 타입 정의
// =============================================================

// ──────────────────────────────────────────────
// 기본 열거형
// ──────────────────────────────────────────────

export type MCPCategory =
  | "dev"
  | "productivity"
  | "search"
  | "file"
  | "database"
  | "ai"
  | "communication"
  | "cloud"
  | "other";

export type Client =
  | "claude-desktop"
  | "cursor"
  | "windsurf"
  | "claude-code"
  | "vscode"
  | "zed";

export type InstallType = "npm" | "uvx" | "npx" | "docker";

export type SortOption = "stars-desc" | "name-asc" | "date-desc";

export type InstallStatus =
  | "idle"
  | "installing"
  | "success"
  | "error";

// ──────────────────────────────────────────────
// 환경 변수
// ──────────────────────────────────────────────

export interface EnvVar {
  name: string;           // "GITHUB_PERSONAL_ACCESS_TOKEN"
  description: string;   // 발급 방법 안내 (일반인 언어)
  required: boolean;
  isSecret: boolean;      // true면 입력 마스킹
}

// ──────────────────────────────────────────────
// MCP 패키지 정의
// ──────────────────────────────────────────────

export interface MCPPackage {
  id: string;                        // "github-official"
  name: string;                      // "GitHub"
  description: string;               // 개발자용 설명
  plainDescription: string;          // 일반인 언어 설명 ← 핵심 차별화
  category: MCPCategory;
  installType: InstallType;
  installCommand: string;            // "npx -y @modelcontextprotocol/server-github"
  requiredEnvVars: EnvVar[];
  supportedClients: Client[];
  stars: number;
  lastUpdated: string;               // ISO 날짜
  officialSource: string;            // GitHub URL
  usageExamples?: string[];          // ["내 GitHub PR 목록 보여줘"]
  permissions?: string[];            // ["GitHub 저장소 읽기"]
}

// ──────────────────────────────────────────────
// 설치된 MCP 상태
// ──────────────────────────────────────────────

export interface InstalledMCP {
  packageId: string;
  installedAt: string;               // ISO 날짜
  configPath: string;                // 실제로 수정된 설정 파일 경로
  client: Client;
  envVars: Record<string, string>;   // 입력된 환경 변수 값
  isActive: boolean;
  installedVersion?: string;         // 설치된 버전 (npm list로 파싱)
}

// ──────────────────────────────────────────────
// 리뷰 / 별점
// ──────────────────────────────────────────────

export interface Review {
  packageId: string;
  rating:    number;    // 1–5
  comment:   string;
  createdAt: string;    // ISO 날짜
}

// ──────────────────────────────────────────────
// 품질 점수
// ──────────────────────────────────────────────

export interface QualityScore {
  packageId: string;
  score:     number;    // 0–100
  breakdown: {
    stars:       number;
    recency:     number;
    description: number;
    clients:     number;
    envPenalty:  number;
  };
}

// ──────────────────────────────────────────────
// GitHub 동기화 결과
// ──────────────────────────────────────────────

export interface GitHubSyncResult {
  newPackageNames: string[];
  totalInRepo:     number;
  lastSyncedAt:    string;
}

// ──────────────────────────────────────────────
// 설정 파일 경로 맵
// ──────────────────────────────────────────────

export type ClientConfigMap = Record<Client, string | null>;

// ──────────────────────────────────────────────
// IPC 채널 상수
// ──────────────────────────────────────────────

export const IPC = {
  // Registry
  REGISTRY_GET_ALL:         "registry:getAll",
  REGISTRY_SEARCH:          "registry:search",
  REGISTRY_REFRESH:         "registry:refresh",

  // Installer
  INSTALL_MCP:              "install:mcp",
  INSTALL_LOG:              "install:log",

  // Config
  CONFIG_GET_PATHS:         "config:getPaths",
  CONFIG_ADD_MCP:           "config:addMcp",
  CONFIG_REMOVE_MCP:        "config:removeMcp",
  CONFIG_TOGGLE_MCP:        "config:toggleMcp",

  // Installed list
  INSTALLED_GET_ALL:        "installed:getAll",
  INSTALLED_REMOVE:         "installed:remove",
  INSTALLED_CHECK_UPDATES:  "installed:checkUpdates",

  // Tools
  TOOLS_CHECK:              "tools:check",

  // Backup
  BACKUP_EXPORT:            "backup:export",
  BACKUP_IMPORT:            "backup:import",

  // ── Phase 3 ─────────────────────────────────

  // GitHub 동기화
  GITHUB_SYNC:              "github:sync",
  GITHUB_SYNC_CACHE:        "github:syncCache",

  // README fetch
  README_FETCH:             "readme:fetch",

  // 검색 히스토리
  SEARCH_HISTORY_GET:       "searchHistory:get",
  SEARCH_HISTORY_ADD:       "searchHistory:add",
  SEARCH_HISTORY_CLEAR:     "searchHistory:clear",

  // 리뷰 / 별점
  REVIEW_GET:               "review:get",
  REVIEW_SET:               "review:set",
  REVIEW_GET_ALL:           "review:getAll",

  // 품질 점수
  QUALITY_SCORE_GET:        "quality:score",
  QUALITY_SCORE_BATCH:      "quality:scoreBatch",

  // ── Phase 4 — 자동 업데이트 ──────────────────
  UPDATE_CHECK:             "update:check",
  UPDATE_DOWNLOAD:          "update:download",
  UPDATE_INSTALL:           "update:install",
  UPDATE_STATUS:            "update:status",   // main → renderer 이벤트

  // ── Phase 5 — Auto Sync ───────────────────
  SETTINGS_GET:             "settings:get",
  SETTINGS_SET:             "settings:set",
  METADATA_REFRESH:         "metadata:refresh",
  METADATA_CACHE_GET:       "metadata:cacheGet",
  DESCRIPTION_GENERATE:    "description:generate",
  DESCRIPTION_CACHE_GET:   "description:cacheGet",
  CONFIG_CHANGED:           "config:changed",     // main → renderer (event)
  NEW_MCP_DETECTED:         "newMcp:detected",    // main → renderer (event)

  // ── Phase 5 — Registry Collect ────────────
  REGISTRY_COLLECT:         "registry:collect",
  REGISTRY_COLLECT_STATUS:  "registry:collectStatus",  // main → renderer (event)
} as const;

// ──────────────────────────────────────────────
// IPC 페이로드 타입
// ──────────────────────────────────────────────

export interface SearchPayload {
  query?: string;
  category?: MCPCategory;
  client?: Client;
  sort?: SortOption;
}

export interface InstallPayload {
  packageId: string;
  clients: Client[];                 // 다중 클라이언트 동시 설치 지원
  envVars: Record<string, string>;
}

export interface RemoveMCPPayload {
  packageId: string;
  client: Client;
}

export interface ToggleMCPPayload {
  packageId: string;
  client: Client;
  isActive: boolean;
}

export interface IPCResult<T = void> {
  success: boolean;
  data?: T;
  error?: string;
}

// ──────────────────────────────────────────────
// Phase 5 — 앱 설정
// ──────────────────────────────────────────────

export interface AppSettings {
  claudeApiKey:    string;   // Claude API Key (선택적)
  autoSyncEnabled: boolean;  // 6시간 주기 Auto Sync 활성화
}

// ──────────────────────────────────────────────
// Phase 5 — 메타데이터 캐시
// ──────────────────────────────────────────────

export interface MetadataCacheEntry {
  stars:       number;
  lastUpdated: string;  // ISO 날짜
  fetchedAt:   string;  // ISO 날짜
}

export type MetadataCache = Record<string, MetadataCacheEntry>;

// ──────────────────────────────────────────────
// Phase 5 — Registry Collect 상태
// ──────────────────────────────────────────────

export interface CollectionStatus {
  phase: "idle" | "collecting" | "generating" | "merging" | "done" | "error";
  found: number;
  newItems: number;
  updated: number;
  message: string;
}
