// =============================================================
// main/github-sync.ts — GitHub API로 modelcontextprotocol/servers 폴링
// 새 MCP 감지 시 목록 반환. https 모듈 사용 (외부 패키지 없음)
// Phase 5: ETag Conditional Requests + 6시간 Auto Sync + 메타데이터 갱신
// =============================================================

import * as https  from "https";
import * as http   from "http";
import * as fs     from "fs";
import * as path   from "path";
import * as os     from "os";
import { BrowserWindow } from "electron";
import {
  IPC,
  IPCResult,
  GitHubSyncResult,
  MetadataCache,
  MetadataCacheEntry,
} from "../shared/types";

// ──────────────────────────────────────────────
// 내부 타입
// ──────────────────────────────────────────────

interface GitHubTreeItem {
  path: string;
  type: "blob" | "tree";
}

interface GitHubTreeResponse {
  tree:     GitHubTreeItem[];
  truncated?: boolean;
}

// ──────────────────────────────────────────────
// 캐시 파일 경로
// ──────────────────────────────────────────────

const MCP_STORE_DIR      = path.join(os.homedir(), ".mcp-store");
const SYNC_CACHE_PATH    = path.join(MCP_STORE_DIR, "sync-cache.json");
const METADATA_CACHE_PATH = path.join(MCP_STORE_DIR, "metadata-cache.json");

interface SyncCache {
  knownPackageNames: string[];
  lastSyncedAt:      string;
  etag?:             string;   // ETag for Conditional Requests
  commitSha?:        string;   // 마지막으로 확인한 커밋 SHA
}

function ensureDir(): void {
  if (!fs.existsSync(MCP_STORE_DIR)) fs.mkdirSync(MCP_STORE_DIR, { recursive: true });
}

function readSyncCache(): SyncCache {
  try {
    if (!fs.existsSync(SYNC_CACHE_PATH)) return { knownPackageNames: [], lastSyncedAt: "" };
    return JSON.parse(fs.readFileSync(SYNC_CACHE_PATH, "utf-8")) as SyncCache;
  } catch {
    return { knownPackageNames: [], lastSyncedAt: "" };
  }
}

function writeSyncCache(cache: SyncCache): void {
  try {
    ensureDir();
    fs.writeFileSync(SYNC_CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err) {
    console.error("[github-sync] cache write error:", err);
  }
}

function readMetadataCache(): MetadataCache {
  try {
    if (!fs.existsSync(METADATA_CACHE_PATH)) return {};
    return JSON.parse(fs.readFileSync(METADATA_CACHE_PATH, "utf-8")) as MetadataCache;
  } catch {
    return {};
  }
}

function writeMetadataCache(cache: MetadataCache): void {
  try {
    ensureDir();
    fs.writeFileSync(METADATA_CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err) {
    console.error("[github-sync] metadata cache write error:", err);
  }
}

// ──────────────────────────────────────────────
// HTTP 유틸
// ──────────────────────────────────────────────

interface HttpResponse {
  statusCode: number;
  body:       string;
  headers:    http.IncomingHttpHeaders;
}

function httpsRequest(
  url: string,
  extraHeaders: Record<string, string> = {}
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "mcp-store/5.0",
          "Accept":     "application/vnd.github+json",
          ...extraHeaders,
        },
      },
      (res) => {
        const statusCode = res.statusCode ?? 0;

        // 304 Not Modified — 캐시 유효
        if (statusCode === 304) {
          res.resume();
          resolve({ statusCode: 304, body: "", headers: res.headers });
          return;
        }

        if (statusCode >= 400) {
          res.resume();
          reject(new Error(`GitHub API HTTP ${statusCode}: ${url}`));
          return;
        }

        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () =>
          resolve({ statusCode, body: data, headers: res.headers })
        );
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.setTimeout(10_000, () => {
      req.destroy(new Error("GitHub API 요청 시간 초과 (10s)"));
    });
  });
}

// ──────────────────────────────────────────────
// 공개 API — 저장소 동기화
// ──────────────────────────────────────────────

/**
 * syncWithGitHub — modelcontextprotocol/servers 저장소를 폴링
 * ETag Conditional Request로 rate limit 절약.
 * 신규 MCP 이름 목록 반환.
 */
export async function syncWithGitHub(
  knownIds: string[]
): Promise<IPCResult<GitHubSyncResult>> {
  try {
    const cache = readSyncCache();
    const extraHeaders: Record<string, string> = {};
    if (cache.etag) {
      extraHeaders["If-None-Match"] = cache.etag;
    }

    const res = await httpsRequest(
      "https://api.github.com/repos/modelcontextprotocol/servers/git/trees/main?recursive=1",
      extraHeaders
    );

    // 304 — 변경 없음
    if (res.statusCode === 304) {
      return {
        success: true,
        data: {
          newPackageNames: [],
          totalInRepo:     cache.knownPackageNames.length,
          lastSyncedAt:    cache.lastSyncedAt,
        },
      };
    }

    const body: GitHubTreeResponse = JSON.parse(res.body);

    // src/ 바로 아래 폴더만 추출 (= 각 MCP 패키지)
    const repoPackageNames = body.tree
      .filter((item) => item.type === "tree" && /^src\/[^/]+$/.test(item.path))
      .map((item)  => item.path.slice(4)); // "src/" 제거

    // 신규 = 저장소에 있으나 캐시에 없고, knownIds에도 매핑 안 된 것
    const newPackageNames = repoPackageNames.filter(
      (name) =>
        !cache.knownPackageNames.includes(name) &&
        !knownIds.some(
          (id) => id === name || id.endsWith(`-${name}`) || id.startsWith(name)
        )
    );

    const newEtag = (res.headers.etag as string) ?? cache.etag;

    writeSyncCache({
      knownPackageNames: repoPackageNames,
      lastSyncedAt:      new Date().toISOString(),
      etag:              newEtag,
    });

    return {
      success: true,
      data: {
        newPackageNames,
        totalInRepo:  repoPackageNames.length,
        lastSyncedAt: new Date().toISOString(),
      },
    };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * getSyncCache — 마지막 동기화 캐시 조회 (IPC에서 호출)
 */
export function getSyncCache(): SyncCache {
  return readSyncCache();
}

// ──────────────────────────────────────────────
// 공개 API — 메타데이터 갱신
// ──────────────────────────────────────────────

/**
 * GitHub URL에서 owner/repo 추출
 * https://github.com/org/repo[/tree/...] → "org/repo"
 */
function extractOwnerRepo(officialSource: string): string | null {
  try {
    const url = new URL(officialSource);
    if (url.hostname !== "github.com") return null;
    const segments = url.pathname.replace(/^\//, "").split("/");
    if (segments.length < 2) return null;
    return `${segments[0]}/${segments[1]}`;
  } catch {
    return null;
  }
}

interface GitHubRepoInfo {
  stargazers_count: number;
  pushed_at:        string;
}

/**
 * refreshMetadataForPackages — 설치된 패키지들의 stars/lastUpdated를
 * GitHub API로 갱신, metadata-cache.json에 저장
 */
export async function refreshMetadataForPackages(
  packages: Array<{ id: string; officialSource: string }>
): Promise<IPCResult<MetadataCache>> {
  const cache = readMetadataCache();
  let updated = 0;

  for (const pkg of packages) {
    const ownerRepo = extractOwnerRepo(pkg.officialSource);
    if (!ownerRepo) continue;

    try {
      const res = await httpsRequest(
        `https://api.github.com/repos/${ownerRepo}`
      );
      if (res.statusCode !== 200) continue;

      const info = JSON.parse(res.body) as GitHubRepoInfo;
      const entry: MetadataCacheEntry = {
        stars:       info.stargazers_count,
        lastUpdated: info.pushed_at,
        fetchedAt:   new Date().toISOString(),
      };

      const prev = cache[pkg.id];
      if (
        !prev ||
        prev.stars !== entry.stars ||
        prev.lastUpdated !== entry.lastUpdated
      ) {
        cache[pkg.id] = entry;
        updated++;
      }
    } catch (err) {
      console.warn(`[github-sync] metadata fetch failed for ${pkg.id}:`, (err as Error).message);
    }
  }

  if (updated > 0) writeMetadataCache(cache);

  return { success: true, data: cache };
}

/**
 * getMetadataCache — 메타데이터 캐시 반환
 */
export function getMetadataCache(): MetadataCache {
  return readMetadataCache();
}

// ──────────────────────────────────────────────
// 공개 API — 6시간 Auto Sync
// ──────────────────────────────────────────────

const AUTO_SYNC_INTERVAL_MS = 6 * 60 * 60 * 1_000; // 6시간

let _autoSyncTimer: ReturnType<typeof setInterval> | null = null;

/**
 * startAutoSync — 앱 시작 시 1회 + 이후 6시간 주기로 syncWithGitHub 실행
 * 신규 MCP 감지 시 renderer에 NEW_MCP_DETECTED 이벤트 전송
 */
export function startAutoSync(
  win: BrowserWindow,
  knownIdsGetter: () => string[],
  intervalMs = AUTO_SYNC_INTERVAL_MS
): void {
  if (_autoSyncTimer) return; // 이미 실행 중이면 무시

  const run = async () => {
    try {
      const result = await syncWithGitHub(knownIdsGetter());
      if (
        result.success &&
        result.data &&
        result.data.newPackageNames.length > 0
      ) {
        if (!win.isDestroyed()) {
          win.webContents.send(IPC.NEW_MCP_DETECTED, result.data);
        }
      }
    } catch (err) {
      console.warn("[auto-sync] 실행 오류:", (err as Error).message);
    }
  };

  // 앱 시작 시 1회 즉시 실행 (2초 지연으로 앱 초기화 완료 후 실행)
  setTimeout(run, 2_000);

  _autoSyncTimer = setInterval(run, intervalMs);
}

/**
 * stopAutoSync — Auto Sync 타이머 정지
 */
export function stopAutoSync(): void {
  if (_autoSyncTimer) {
    clearInterval(_autoSyncTimer);
    _autoSyncTimer = null;
  }
}
