// =============================================================
// main/preload.ts — contextBridge로 window.mcpStore API 노출
// Renderer에서 ipcRenderer를 직접 쓰지 않도록 안전하게 래핑
// =============================================================

import { contextBridge, ipcRenderer } from "electron";
import {
  IPC,
  SearchPayload,
  InstallPayload,
  RemoveMCPPayload,
  ToggleMCPPayload,
  Review,
} from "../shared/types";

// ──────────────────────────────────────────────
// window.mcpStore API
// ──────────────────────────────────────────────

contextBridge.exposeInMainWorld("mcpStore", {
  // Registry
  getAll:          ()                        => ipcRenderer.invoke(IPC.REGISTRY_GET_ALL),
  search:          (p: SearchPayload)        => ipcRenderer.invoke(IPC.REGISTRY_SEARCH, p),
  refreshRegistry: ()                        => ipcRenderer.invoke(IPC.REGISTRY_REFRESH),

  // Config
  getPaths: ()                               => ipcRenderer.invoke(IPC.CONFIG_GET_PATHS),

  // Install
  install:  (p: InstallPayload)              => ipcRenderer.invoke(IPC.INSTALL_MCP, p),
  onLog:    (cb: (data: { packageId: string; line: string }) => void) => {
    ipcRenderer.on(IPC.INSTALL_LOG, (_e, data) => cb(data));
  },
  offLog: () => {
    ipcRenderer.removeAllListeners(IPC.INSTALL_LOG);
  },

  // Installed
  getInstalled:    ()                        => ipcRenderer.invoke(IPC.INSTALLED_GET_ALL),
  removeInstalled: (p: RemoveMCPPayload)     => ipcRenderer.invoke(IPC.INSTALLED_REMOVE, p),
  checkUpdates:    ()                        => ipcRenderer.invoke(IPC.INSTALLED_CHECK_UPDATES),

  // Toggle
  toggleMcp:       (p: ToggleMCPPayload)     => ipcRenderer.invoke(IPC.CONFIG_TOGGLE_MCP, p),

  // Tools
  checkTools:      ()                        => ipcRenderer.invoke(IPC.TOOLS_CHECK),

  // Backup
  exportBackup:    ()                        => ipcRenderer.invoke(IPC.BACKUP_EXPORT),
  importBackup:    (json: string)            => ipcRenderer.invoke(IPC.BACKUP_IMPORT, json),

  // ── Phase 3 ─────────────────────────────────

  // GitHub 동기화
  githubSync:       ()                       => ipcRenderer.invoke(IPC.GITHUB_SYNC),
  githubSyncCache:  ()                       => ipcRenderer.invoke(IPC.GITHUB_SYNC_CACHE),

  // README fetch
  fetchReadme:      (packageId: string)      => ipcRenderer.invoke(IPC.README_FETCH, packageId),

  // 검색 히스토리
  getSearchHistory: ()                       => ipcRenderer.invoke(IPC.SEARCH_HISTORY_GET),
  addSearchHistory: (query: string)          => ipcRenderer.invoke(IPC.SEARCH_HISTORY_ADD, query),
  clearSearchHistory: ()                     => ipcRenderer.invoke(IPC.SEARCH_HISTORY_CLEAR),

  // 리뷰 / 별점
  getReview:        (packageId: string)      => ipcRenderer.invoke(IPC.REVIEW_GET, packageId),
  setReview:        (review: Review)         => ipcRenderer.invoke(IPC.REVIEW_SET, review),
  getAllReviews:     ()                       => ipcRenderer.invoke(IPC.REVIEW_GET_ALL),

  // 품질 점수
  getQualityScore:  (packageId: string)      => ipcRenderer.invoke(IPC.QUALITY_SCORE_GET, packageId),
  getBatchQualityScores: ()                  => ipcRenderer.invoke(IPC.QUALITY_SCORE_BATCH),

  // ── Phase 4 — 자동 업데이트 ──────────────────

  // 업데이트 확인 요청 (invoke)
  updateCheck:    ()  => ipcRenderer.invoke(IPC.UPDATE_CHECK),
  // 업데이트 다운로드 시작 (invoke)
  updateDownload: ()  => ipcRenderer.invoke(IPC.UPDATE_DOWNLOAD),
  // 재시작 후 설치 (invoke)
  updateInstall:  ()  => ipcRenderer.invoke(IPC.UPDATE_INSTALL),
  // 업데이트 상태 변경 이벤트 수신 (on)
  onUpdateStatus: (cb: (payload: unknown) => void) => {
    ipcRenderer.on(IPC.UPDATE_STATUS, (_e, payload) => cb(payload));
  },
  // 이벤트 리스너 제거
  offUpdateStatus: () => {
    ipcRenderer.removeAllListeners(IPC.UPDATE_STATUS);
  },
});
