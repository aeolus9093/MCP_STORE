// =============================================================
// main/readme-fetcher.ts — GitHub raw README.md fetch
// officialSource URL을 파싱해 raw 콘텐츠 URL로 변환 후 가져옴
// =============================================================

import * as https from "https";
import { IPCResult } from "../shared/types";

// ──────────────────────────────────────────────
// 내부 유틸
// ──────────────────────────────────────────────

/**
 * parseGitHubRawUrl — GitHub 저장소 URL → raw README URL 변환
 *
 * 지원 패턴:
 *   https://github.com/org/repo                        → .../main/README.md
 *   https://github.com/org/repo/tree/branch            → .../branch/README.md
 *   https://github.com/org/repo/tree/branch/path       → .../branch/path/README.md
 */
function parseGitHubRawUrl(officialSource: string): string | null {
  try {
    const url  = new URL(officialSource);
    if (url.hostname !== "github.com") return null;

    // /org/repo[/tree/branch[/path]]
    const segments = url.pathname.replace(/^\//, "").split("/");
    if (segments.length < 2) return null;

    const [org, repo] = segments;

    if (segments[2] === "tree" && segments.length >= 4) {
      const branch    = segments[3];
      const subPath   = segments.slice(4).join("/");
      const readmePath = subPath ? `${subPath}/README.md` : "README.md";
      return `https://raw.githubusercontent.com/${org}/${repo}/${branch}/${readmePath}`;
    }

    // 기본: main 브랜치
    return `https://raw.githubusercontent.com/${org}/${repo}/main/README.md`;
  } catch {
    return null;
  }
}

function httpsGet(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, (res) => {
      if (res.statusCode === 404) {
        res.resume();
        reject(new Error("README.md not found (404)"));
        return;
      }
      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}`));
        return;
      }
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => resolve(data));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(10_000, () => {
      req.destroy(new Error("README fetch 시간 초과 (10s)"));
    });
  });
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * fetchReadme — officialSource URL로부터 README.md 마크다운을 가져옴
 * master 브랜치 fallback 포함
 */
export async function fetchReadme(officialSource: string): Promise<IPCResult<string>> {
  const rawUrl = parseGitHubRawUrl(officialSource);
  if (!rawUrl) {
    return { success: false, error: "GitHub URL이 아니거나 파싱에 실패했습니다." };
  }

  try {
    const markdown = await httpsGet(rawUrl);
    return { success: true, data: markdown };
  } catch {
    // main → master fallback
    const masterUrl = rawUrl.replace("/main/", "/master/");
    if (masterUrl === rawUrl) {
      return { success: false, error: "README.md를 찾을 수 없습니다." };
    }
    try {
      const markdown = await httpsGet(masterUrl);
      return { success: true, data: markdown };
    } catch (err2) {
      return { success: false, error: (err2 as Error).message };
    }
  }
}
