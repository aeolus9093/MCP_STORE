// =============================================================
// main/mcp-collector-sources.ts — 외부 소스 수집 함수
// Official GitHub Repo / NPM / Awesome List
// Node.js 내장 https 모듈만 사용
// =============================================================

import * as https from "https";
import * as http  from "http";
import { RawMCPData } from "./mcp-collector";

// ──────────────────────────────────────────────
// HTTP 유틸
// ──────────────────────────────────────────────

interface HttpResponse {
  statusCode: number;
  body:       string;
  headers:    http.IncomingHttpHeaders;
}

export function httpsGet(
  url: string,
  extraHeaders: Record<string, string> = {}
): Promise<HttpResponse> {
  return new Promise((resolve, reject) => {
    const req = https.get(url, {
      headers: {
        "User-Agent": "mcp-store/5.0",
        "Accept":     "application/json",
        ...extraHeaders,
      },
    }, (res) => {
      if ((res.statusCode ?? 0) >= 400) {
        res.resume();
        reject(new Error(`HTTP ${res.statusCode}: ${url}`));
        return;
      }
      let data = "";
      res.on("data", (chunk: Buffer) => (data += chunk.toString()));
      res.on("end", () => resolve({ statusCode: res.statusCode ?? 0, body: data, headers: res.headers }));
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(15_000, () => req.destroy(new Error("요청 시간 초과 (15s)")));
  });
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ──────────────────────────────────────────────
// 소스 1: modelcontextprotocol/servers 공식 저장소
// ──────────────────────────────────────────────

interface GitHubTreeItem { path: string; type: "blob" | "tree"; }
interface GitHubTreeResponse { tree: GitHubTreeItem[]; }
interface GitHubRepoInfo { stargazers_count: number; pushed_at: string; description: string | null; }
interface NpmPackageJson { name?: string; description?: string; keywords?: string[]; }

export async function collectFromOfficialRepo(githubToken?: string): Promise<RawMCPData[]> {
  const results: RawMCPData[] = [];
  const headers: Record<string, string> = {};
  if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

  try {
    const treeRes = await httpsGet(
      "https://api.github.com/repos/modelcontextprotocol/servers/git/trees/main?recursive=1",
      headers
    );
    const tree = JSON.parse(treeRes.body) as GitHubTreeResponse;
    const packages = tree.tree
      .filter((i) => i.type === "tree" && /^src\/[^/]+$/.test(i.path))
      .map((i) => i.path.slice(4));

    // 저장소 공통 메타데이터는 1회만 조회
    const repoInfo = await httpsGet("https://api.github.com/repos/modelcontextprotocol/servers", headers);
    const info = JSON.parse(repoInfo.body) as GitHubRepoInfo;

    for (const pkgName of packages.slice(0, 50)) {
      try {
        await delay(200);
        const rawUrl = `https://raw.githubusercontent.com/modelcontextprotocol/servers/main/src/${pkgName}/package.json`;
        const pkgRes = await httpsGet(rawUrl);
        const pkgJson = JSON.parse(pkgRes.body) as NpmPackageJson;

        results.push({
          name:        pkgJson.name ?? pkgName,
          description: pkgJson.description ?? info.description ?? "",
          repoUrl:     `https://github.com/modelcontextprotocol/servers/tree/main/src/${pkgName}`,
          stars:       info.stargazers_count,
          lastUpdated: info.pushed_at,
          keywords:    pkgJson.keywords,
          installHint: pkgJson.name,
          source:      "official",
        });
      } catch (e) {
        console.warn(`[collector] official/${pkgName} 실패:`, (e as Error).message);
      }
    }
  } catch (e) {
    console.warn("[collector] official repo 수집 실패:", (e as Error).message);
  }
  return results;
}

// ──────────────────────────────────────────────
// 소스 2: NPM 레지스트리
// ──────────────────────────────────────────────

interface NpmSearchObject {
  package: { name: string; description: string; keywords?: string[]; links?: { repository?: string }; date: string; };
}
interface NpmSearchResponse { objects: NpmSearchObject[]; }

async function searchNpm(query: string): Promise<RawMCPData[]> {
  const results: RawMCPData[] = [];
  try {
    const url = `https://registry.npmjs.org/-/v1/search?text=${encodeURIComponent(query)}&size=250`;
    const res = await httpsGet(url, { Accept: "application/json" });
    const data = JSON.parse(res.body) as NpmSearchResponse;
    for (const obj of data.objects ?? []) {
      const pkg = obj.package;
      if (!pkg.name) continue;
      results.push({
        name:        pkg.name,
        description: pkg.description ?? "",
        repoUrl:     pkg.links?.repository ?? `https://www.npmjs.com/package/${pkg.name}`,
        stars:       0,
        lastUpdated: pkg.date ?? new Date().toISOString(),
        keywords:    pkg.keywords,
        installHint: pkg.name,
        source:      "npm",
      });
    }
  } catch (e) {
    console.warn(`[collector] NPM "${query}" 검색 실패:`, (e as Error).message);
  }
  return results;
}

export async function collectFromNPM(): Promise<RawMCPData[]> {
  const [official, mcpServer] = await Promise.all([
    searchNpm("@modelcontextprotocol"),
    searchNpm("mcp-server"),
  ]);
  const seen = new Set<string>();
  return [...official, ...mcpServer].filter((item) => {
    if (seen.has(item.name)) return false;
    seen.add(item.name);
    return true;
  });
}

// ──────────────────────────────────────────────
// 소스 3: punkpeye/awesome-mcp-servers README 파싱
// ──────────────────────────────────────────────

export async function collectFromAwesomeList(githubToken?: string): Promise<RawMCPData[]> {
  const results: RawMCPData[] = [];
  const headers: Record<string, string> = {};
  if (githubToken) headers["Authorization"] = `Bearer ${githubToken}`;

  try {
    const res = await httpsGet(
      "https://raw.githubusercontent.com/punkpeye/awesome-mcp-servers/main/README.md",
      headers
    );
    const githubUrlPattern = /https:\/\/github\.com\/([a-zA-Z0-9_.-]+\/[a-zA-Z0-9_.-]+)/g;

    for (const line of res.body.split("\n")) {
      const matches = [...line.matchAll(githubUrlPattern)];
      for (const match of matches) {
        const repoUrl = `https://github.com/${match[1]}`;
        const descMatch = line.match(/\]\([^)]+\)\s*[-–]\s*(.+)/);
        const description = descMatch ? descMatch[1].trim().replace(/\[.*?\]\(.*?\)/g, "").trim() : "";
        const nameMatch = line.match(/\[([^\]]+)\]\(/);
        const name = nameMatch ? nameMatch[1] : match[1].split("/")[1];
        results.push({ name, description, repoUrl, stars: 0, lastUpdated: new Date().toISOString(), source: "awesome" });
      }
    }
  } catch (e) {
    console.warn("[collector] awesome-mcp-servers 파싱 실패:", (e as Error).message);
  }

  const seen = new Set<string>();
  return results.filter((r) => {
    if (seen.has(r.repoUrl)) return false;
    seen.add(r.repoUrl);
    return true;
  });
}
