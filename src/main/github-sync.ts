// =============================================================
// main/github-sync.ts — GitHub API로 modelcontextprotocol/servers 폴링
// 새 MCP 감지 시 목록 반환. https 모듈 사용 (외부 패키지 없음)
// =============================================================

import * as https from "https";
import * as fs    from "fs";
import * as path  from "path";
import * as os    from "os";
import { IPCResult, GitHubSyncResult } from "../shared/types";

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

const SYNC_CACHE_PATH = path.join(os.homedir(), ".mcp-store", "sync-cache.json");

interface SyncCache {
  knownPackageNames: string[];
  lastSyncedAt:      string;
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
    const dir = path.dirname(SYNC_CACHE_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(SYNC_CACHE_PATH, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err) {
    console.error("[github-sync] cache write error:", err);
  }
}

// ──────────────────────────────────────────────
// HTTP 유틸
// ──────────────────────────────────────────────

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(
      url,
      {
        headers: {
          "User-Agent": "mcp-store/3.0",
          "Accept":     "application/vnd.github+json",
        },
      },
      (res) => {
        // GitHub API rate-limit / 4xx / 5xx 처리
        if (res.statusCode && res.statusCode >= 400) {
          res.resume();
          reject(new Error(`GitHub API HTTP ${res.statusCode}: ${url}`));
          return;
        }
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => resolve(data));
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
// 공개 API
// ──────────────────────────────────────────────

/**
 * syncWithGitHub — modelcontextprotocol/servers 저장소를 폴링
 * src/ 하위 top-level 디렉토리(=각 MCP)를 추출하고,
 * 이전 캐시에 없던 신규 이름 목록을 반환
 */
export async function syncWithGitHub(
  knownIds: string[]
): Promise<IPCResult<GitHubSyncResult>> {
  try {
    const raw = await httpsGet(
      "https://api.github.com/repos/modelcontextprotocol/servers/git/trees/main?recursive=1"
    );

    const body: GitHubTreeResponse = JSON.parse(raw);

    // src/ 바로 아래 폴더만 추출 (= 각 MCP 패키지)
    const repoPackageNames = body.tree
      .filter((item) => item.type === "tree" && /^src\/[^/]+$/.test(item.path))
      .map((item)  => item.path.slice(4)); // "src/" 제거

    const cache = readSyncCache();

    // 신규 = 저장소에 있으나 캐시에 없고, knownIds에도 매핑되지 않은 것
    const newPackageNames = repoPackageNames.filter(
      (name) =>
        !cache.knownPackageNames.includes(name) &&
        !knownIds.some((id) => id === name || id.endsWith(`-${name}`) || id.startsWith(name))
    );

    // 캐시 갱신
    writeSyncCache({
      knownPackageNames: repoPackageNames,
      lastSyncedAt:      new Date().toISOString(),
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
