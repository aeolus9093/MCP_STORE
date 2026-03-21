// =============================================================
// main/ipc-handlers-community.ts — Phase 3 커뮤니티 IPC 핸들러
// GitHub 동기화 / README fetch / 검색 히스토리 / 리뷰 / 품질 점수
// =============================================================

import { ipcMain, BrowserWindow } from "electron";
import * as fs          from "fs";
import * as path        from "path";
import * as os          from "os";
import {
  IPC,
  Review,
  IPCResult,
  GitHubSyncResult,
  QualityScore,
  CollectionStatus,
} from "../shared/types";
import { syncWithGitHub, getSyncCache } from "./github-sync";
import { fetchReadme }                  from "./readme-fetcher";
import {
  getReview,
  setReview,
  getAllReviews,
} from "./review-manager";
import {
  computeQualityScore,
  computeBatchQualityScores,
} from "./quality-scorer";
import { getAllPackages, getPackageById, clearCache } from "./registry";
import {
  generateDescription,
  getAllGeneratedDescriptions,
} from "./description-generator";
import {
  collectFromOfficialRepo,
  collectFromNPM,
  collectFromAwesomeList,
  normalizeToMCPPackage,
  mergeIntoRegistry,
} from "./mcp-collector";

// ──────────────────────────────────────────────
// 검색 히스토리 (로컬 JSON)
// ──────────────────────────────────────────────

const HISTORY_PATH = path.join(os.homedir(), ".mcp-store", "search-history.json");
const MAX_HISTORY  = 10;

interface SearchHistoryStore {
  queries: string[];
}

function readHistory(): SearchHistoryStore {
  try {
    if (!fs.existsSync(HISTORY_PATH)) return { queries: [] };
    return JSON.parse(fs.readFileSync(HISTORY_PATH, "utf-8")) as SearchHistoryStore;
  } catch {
    return { queries: [] };
  }
}

function writeHistory(store: SearchHistoryStore): void {
  try {
    const dir = path.dirname(HISTORY_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(HISTORY_PATH, JSON.stringify(store, null, 2), "utf-8");
  } catch (err) {
    console.error("[search-history] 저장 실패:", err);
  }
}

function addToHistory(query: string): void {
  if (!query.trim()) return;
  const store   = readHistory();
  const cleaned = store.queries.filter((q) => q !== query);
  store.queries = [query, ...cleaned].slice(0, MAX_HISTORY);
  writeHistory(store);
}

// ──────────────────────────────────────────────
// 핸들러 등록
// ──────────────────────────────────────────────

/**
 * registerCommunityHandlers — Phase 3 IPC 채널 등록
 * main/index.ts에서 registerIpcHandlers 이후 호출
 */
export function registerCommunityHandlers(): void {

  // ── GitHub 동기화 ─────────────────────────────

  ipcMain.handle(IPC.GITHUB_SYNC, async (): Promise<IPCResult<GitHubSyncResult>> => {
    try {
      const packages  = getAllPackages();
      const knownIds  = packages.map((p) => p.id);
      return await syncWithGitHub(knownIds);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.GITHUB_SYNC_CACHE, (): IPCResult<{ knownPackageNames: string[]; lastSyncedAt: string }> => {
    try {
      return { success: true, data: getSyncCache() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── README fetch ─────────────────────────────

  ipcMain.handle(IPC.README_FETCH, async (_e, packageId: string): Promise<IPCResult<string>> => {
    try {
      const pkg = getPackageById(packageId);
      if (!pkg) return { success: false, error: "패키지를 찾을 수 없습니다." };
      return await fetchReadme(pkg.officialSource);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── 검색 히스토리 ─────────────────────────────

  ipcMain.handle(IPC.SEARCH_HISTORY_GET, (): IPCResult<string[]> => {
    try {
      return { success: true, data: readHistory().queries };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.SEARCH_HISTORY_ADD, (_e, query: string): IPCResult => {
    try {
      addToHistory(query);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.SEARCH_HISTORY_CLEAR, (): IPCResult => {
    try {
      writeHistory({ queries: [] });
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── 리뷰 / 별점 ──────────────────────────────

  ipcMain.handle(IPC.REVIEW_GET, (_e, packageId: string): IPCResult<Review | null> => {
    return getReview(packageId);
  });

  ipcMain.handle(IPC.REVIEW_SET, (_e, review: Review): IPCResult => {
    return setReview(review);
  });

  ipcMain.handle(IPC.REVIEW_GET_ALL, (): IPCResult<Review[]> => {
    return getAllReviews();
  });

  // ── 품질 점수 ────────────────────────────────

  ipcMain.handle(IPC.QUALITY_SCORE_GET, (_e, packageId: string): IPCResult<QualityScore> => {
    try {
      const pkg = getPackageById(packageId);
      if (!pkg) return { success: false, error: "패키지를 찾을 수 없습니다." };
      return { success: true, data: computeQualityScore(pkg) };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(
    IPC.QUALITY_SCORE_BATCH,
    (): IPCResult<Record<string, QualityScore>> => {
      try {
        const packages = getAllPackages();
        return { success: true, data: computeBatchQualityScores(packages) };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }
  );

  // ── Phase 5: LLM 설명 자동 생성 ──────────────

  ipcMain.handle(
    IPC.DESCRIPTION_GENERATE,
    async (_e, packageId: string): Promise<IPCResult<string>> => {
      try {
        const pkg = getPackageById(packageId);
        if (!pkg) return { success: false, error: "패키지를 찾을 수 없습니다." };

        // README fetch
        const readmeResult = await fetchReadme(pkg.officialSource);
        const readmeContent = readmeResult.success && readmeResult.data
          ? readmeResult.data
          : pkg.description; // README fetch 실패 시 기존 설명으로 대체

        return await generateDescription(packageId, readmeContent);
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }
  );

  ipcMain.handle(
    IPC.DESCRIPTION_CACHE_GET,
    (): IPCResult<Record<string, { description: string; generatedAt: string }>> => {
      try {
        return { success: true, data: getAllGeneratedDescriptions() };
      } catch (err) {
        return { success: false, error: (err as Error).message };
      }
    }
  );

  // ── Phase 5: Registry 자동 수집 ───────────────

  ipcMain.handle(
    IPC.REGISTRY_COLLECT,
    async (_e, options: { generateDescriptions: boolean }): Promise<IPCResult<CollectionStatus>> => {
      const win = BrowserWindow.getFocusedWindow();

      function sendStatus(status: CollectionStatus): void {
        if (win && !win.isDestroyed()) {
          win.webContents.send(IPC.REGISTRY_COLLECT_STATUS, status);
        }
      }

      try {
        sendStatus({ phase: "collecting", found: 0, newItems: 0, updated: 0, message: "소스에서 MCP 수집 중..." });

        const allRaw = [];
        try {
          const official = await collectFromOfficialRepo();
          allRaw.push(...official);
        } catch (e) { console.warn("[registry-collect] official 실패:", (e as Error).message); }

        try {
          const npm = await collectFromNPM();
          allRaw.push(...npm);
        } catch (e) { console.warn("[registry-collect] NPM 실패:", (e as Error).message); }

        try {
          const awesome = await collectFromAwesomeList();
          allRaw.push(...awesome);
        } catch (e) { console.warn("[registry-collect] awesome 실패:", (e as Error).message); }

        sendStatus({ phase: "merging", found: allRaw.length, newItems: 0, updated: 0, message: "데이터 병합 중..." });

        const normalized = allRaw.map(normalizeToMCPPackage);
        const existing = getAllPackages();
        const { merged, addedCount, updatedCount } = mergeIntoRegistry(existing, normalized);

        // registry.json 업데이트
        const registryPath = path.resolve(__dirname, "../../../packages/registry.json");
        fs.writeFileSync(registryPath, JSON.stringify(merged, null, 2), "utf-8");

        // 캐시 초기화 후 재로드
        clearCache();

        const finalStatus: CollectionStatus = {
          phase:    "done",
          found:    allRaw.length,
          newItems: addedCount,
          updated:  updatedCount,
          message:  `완료: 신규 ${addedCount}개, 업데이트 ${updatedCount}개`,
        };
        sendStatus(finalStatus);
        return { success: true, data: finalStatus };
      } catch (err) {
        const errorStatus: CollectionStatus = {
          phase: "error", found: 0, newItems: 0, updated: 0,
          message: (err as Error).message,
        };
        sendStatus(errorStatus);
        return { success: false, error: (err as Error).message };
      }
    }
  );
}
