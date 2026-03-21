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
} from "../shared/types";

declare global {
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
    };
  }
}
