// =============================================================
// renderer/global.d.ts — window.mcpStore 타입 선언
// =============================================================

import {
  MCPPackage,
  InstalledMCP,
  SearchPayload,
  InstallPayload,
  RemoveMCPPayload,
  ToggleMCPPayload,
  ClientConfigMap,
  IPCResult,
  Review,
  QualityScore,
  GitHubSyncResult,
  AppSettings,
  MetadataCache,
} from "../shared/types";

declare global {
  const __APP_VERSION__: string;

  interface Window {
    mcpStore: undefined | {
      // Registry
      getAll:          () => Promise<IPCResult<MCPPackage[]>>;
      search:          (p: SearchPayload) => Promise<IPCResult<MCPPackage[]>>;
      refreshRegistry: () => Promise<IPCResult<MCPPackage[]>>;

      // Config
      getPaths:        () => Promise<IPCResult<ClientConfigMap>>;

      // Install
      install:         (p: InstallPayload) => Promise<IPCResult>;
      onLog:           (cb: (data: { packageId: string; line: string }) => void) => void;
      offLog:          () => void;

      // Installed
      getInstalled:    () => Promise<IPCResult<InstalledMCP[]>>;
      removeInstalled: (p: RemoveMCPPayload) => Promise<IPCResult>;
      checkUpdates:    () => Promise<IPCResult<string[]>>;

      // Toggle
      toggleMcp:       (p: ToggleMCPPayload) => Promise<IPCResult>;

      // Tools
      checkTools:      () => Promise<IPCResult<Record<string, boolean>>>;

      // Backup
      exportBackup:    () => Promise<IPCResult<string>>;
      importBackup:    (json: string) => Promise<IPCResult>;

      // ── Phase 3 ───────────────────────────────

      // GitHub 동기화
      githubSync:       () => Promise<IPCResult<GitHubSyncResult>>;
      githubSyncCache:  () => Promise<IPCResult<{ knownPackageNames: string[]; lastSyncedAt: string }>>;

      // README fetch
      fetchReadme:      (packageId: string) => Promise<IPCResult<string>>;

      // 검색 히스토리
      getSearchHistory: () => Promise<IPCResult<string[]>>;
      addSearchHistory: (query: string) => Promise<IPCResult>;
      clearSearchHistory: () => Promise<IPCResult>;

      // 리뷰 / 별점
      getReview:        (packageId: string) => Promise<IPCResult<Review | null>>;
      setReview:        (review: Review) => Promise<IPCResult>;
      getAllReviews:     () => Promise<IPCResult<Review[]>>;

      // 품질 점수
      getQualityScore:      (packageId: string) => Promise<IPCResult<QualityScore>>;
      getBatchQualityScores: () => Promise<IPCResult<Record<string, QualityScore>>>;

      // ── Phase 4 — 자동 업데이트 ──────────────
      updateCheck:      () => Promise<IPCResult>;
      updateDownload:   () => Promise<IPCResult>;
      updateInstall:    () => Promise<IPCResult>;
      onUpdateStatus:   (cb: (payload: {
        status:   "checking" | "available" | "not-available" | "downloading" | "ready" | "error";
        version?: string;
        notes?:   string | object;
        percent?: number;
        message?: string;
      }) => void) => void;
      offUpdateStatus?: () => void;

      // ── Phase 5 — Auto Sync ──────────────────

      // Settings
      getSettings:   () => Promise<IPCResult<AppSettings>>;
      setSettings:   (s: AppSettings) => Promise<IPCResult>;

      // 메타데이터 갱신 / 캐시 조회
      refreshMetadata:   () => Promise<IPCResult<MetadataCache>>;
      getMetadataCache:  () => Promise<IPCResult<MetadataCache>>;

      // LLM 설명 생성 / 캐시 조회
      generateDescription: (packageId: string) => Promise<IPCResult<string>>;
      getDescriptionCache: () => Promise<IPCResult<Record<string, { description: string; generatedAt: string }>>>;

      // 설정 파일 변경 이벤트
      onConfigChanged:  (cb: (payload: { client: string; added: string[]; removed: string[] }) => void) => void;
      offConfigChanged: () => void;

      // 신규 MCP 감지 이벤트
      onNewMcpDetected:  (cb: (payload: { newPackageNames: string[]; totalInRepo: number; lastSyncedAt: string }) => void) => void;
      offNewMcpDetected: () => void;

      // ── Phase 5 — Registry 자동 업데이트 ──────
      onRegistryUpdated:  (cb: () => void) => void;
      offRegistryUpdated: () => void;

      // 수동 fetch + 진행 상태 이벤트
      fetchRegistry: () => Promise<IPCResult<{ status: string; count?: number; message: string }>>;
      onRegistryFetchStatus: (cb: (s: { status: string; count?: number; message: string }) => void) => void;
      offRegistryFetchStatus: () => void;
    };
  }
}
