// =============================================================
// main/registry.ts — MCP 목록 파싱 + 검색/필터
// registry.json 로드, zod 검증, 메모리 캐시
// =============================================================

import * as fs    from "fs";
import * as path  from "path";
import * as os    from "os";
import * as https from "https";
import { IncomingMessage } from "http";
import { z } from "zod";
import { MCPPackage, MCPCategory, Client, SearchPayload, SortOption } from "../shared/types";

// ──────────────────────────────────────────────
// 원격 자동 업데이트 설정
// ──────────────────────────────────────────────

const REGISTRY_REMOTE_URL =
  "https://raw.githubusercontent.com/aeolus9093/MCP_STORE/main/packages/registry.json";
const REGISTRY_CACHE_PATH = path.join(os.homedir(), ".mcp-store", "registry.json");
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7일 (매주 첫 실행 시 갱신)

// ──────────────────────────────────────────────
// Zod 스키마
// ──────────────────────────────────────────────

const EnvVarSchema = z.object({
  name:        z.string(),
  description: z.string(),
  required:    z.boolean(),
  isSecret:    z.boolean(),
});

const MCPPackageSchema = z.object({
  id:               z.string(),
  name:             z.string(),
  description:      z.string(),
  plainDescription: z.string(),
  category:         z.enum(["dev","productivity","search","file","database","ai","communication","cloud","other"]),
  installType:      z.enum(["npm","uvx","npx","docker"]),
  installCommand:   z.string(),
  requiredEnvVars:  z.array(EnvVarSchema),
  supportedClients: z.array(z.enum(["claude-desktop","cursor","windsurf","claude-code","vscode","zed"])),
  stars:            z.number(),
  lastUpdated:      z.string(),
  officialSource:   z.string(),
  usageExamples:    z.array(z.string()).optional(),
  permissions:      z.array(z.string()).optional(),
});

// ──────────────────────────────────────────────
// 내부 상태 (메모리 캐시)
// ──────────────────────────────────────────────

let _cache: MCPPackage[] | null = null;

/**
 * isCacheFresh — 로컬 캐시가 TTL 이내인지 확인
 */
function isCacheFresh(): boolean {
  try {
    const stat = fs.statSync(REGISTRY_CACHE_PATH);
    return Date.now() - stat.mtimeMs < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

/**
 * getRegistryPath — registry.json 절대 경로 반환
 * 우선순위: 로컬 캐시 (~/.mcp-store/registry.json) > 번들 파일
 */
function getRegistryPath(): string {
  if (fs.existsSync(REGISTRY_CACHE_PATH)) {
    return REGISTRY_CACHE_PATH;
  }
  // 번들된 기본 파일 (설치 시 포함)
  return path.resolve(__dirname, "../../packages/registry.json");
}

/**
 * fetchAndUpdateRegistry — GitHub에서 최신 registry.json을 fetch
 * - skipIfFresh=true(기본)면 캐시가 신선할 때 생략
 * - onStatus 콜백으로 진행상황 실시간 전달
 * - 반환값: true = 업데이트됨, false = 생략/실패
 */
export async function fetchAndUpdateRegistry(
  options: { skipIfFresh?: boolean; onStatus?: (msg: string) => void } = {}
): Promise<boolean> {
  const { skipIfFresh = true, onStatus } = options;

  if (skipIfFresh && isCacheFresh()) {
    console.log("[registry] 캐시 최신 상태, fetch 생략");
    return false;
  }

  onStatus?.("GitHub에서 최신 MCP 목록 가져오는 중...");

  return new Promise((resolve) => {
    console.log("[registry] 원격 registry.json fetch 시작...");

    const req = https.get(REGISTRY_REMOTE_URL, (res) => {
      // 리다이렉트 처리
      if (res.statusCode === 301 || res.statusCode === 302) {
        const location = res.headers.location;
        if (!location) { resolve(false); return; }
        https.get(location, handleResponse).on("error", () => resolve(false));
        res.resume();
        return;
      }
      handleResponse(res);
    });

    req.on("error", (err) => {
      console.warn("[registry] 연결 오류:", err.message);
      resolve(false);
    });

    function handleResponse(res: IncomingMessage): void {
      if (res.statusCode !== 200) {
        console.warn(`[registry] fetch 실패: HTTP ${res.statusCode}`);
        res.resume();
        resolve(false);
        return;
      }

      const chunks: Buffer[] = [];
      res.on("data", (chunk: Buffer) => chunks.push(chunk));
      res.on("end", () => {
        try {
          const data = Buffer.concat(chunks).toString("utf-8");
          JSON.parse(data); // 유효성 검증

          const cacheDir = path.dirname(REGISTRY_CACHE_PATH);
          if (!fs.existsSync(cacheDir)) fs.mkdirSync(cacheDir, { recursive: true });
          fs.writeFileSync(REGISTRY_CACHE_PATH, data, "utf-8");

          _cache = null; // 메모리 캐시 초기화
          const count = (JSON.parse(data) as unknown[]).length;
          console.log(`[registry] 원격 registry.json 업데이트 완료 (${count}개)`);
          onStatus?.(`MCP 목록 업데이트 완료 (총 ${count}개)`);
          resolve(true);
        } catch (err) {
          console.warn("[registry] 데이터 처리 실패:", err);
          resolve(false);
        }
      });
      res.on("error", () => resolve(false));
    }
  });
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * loadRegistry — registry.json을 읽고 zod 검증 후 캐시
 * 캐시가 있으면 재사용
 */
export function loadRegistry(): MCPPackage[] {
  if (_cache) return _cache;

  try {
    const filePath = getRegistryPath();
    const raw = fs.readFileSync(filePath, "utf-8");
    const parsed = JSON.parse(raw) as unknown[];
    const validated = parsed
      .map((item) => {
        const result = MCPPackageSchema.safeParse(item);
        return result.success ? (result.data as MCPPackage) : null;
      })
      .filter((item): item is MCPPackage => item !== null);

    _cache = validated;
    return validated;
  } catch (err) {
    console.error("[registry] 로드 실패:", err);
    return [];
  }
}

/**
 * getAllPackages — 전체 MCP 목록 반환
 */
export function getAllPackages(): MCPPackage[] {
  return loadRegistry();
}

/**
 * getPackageById — ID로 단일 MCP 조회
 */
export function getPackageById(id: string): MCPPackage | undefined {
  return loadRegistry().find((p) => p.id === id);
}

/**
 * searchPackages — 텍스트/카테고리/클라이언트 필터
 */
export function searchPackages(payload: SearchPayload): MCPPackage[] {
  let results = loadRegistry();

  if (payload.query) {
    const q = payload.query.toLowerCase();
    results = results.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        p.plainDescription.toLowerCase().includes(q) ||
        p.description.toLowerCase().includes(q)
    );
  }

  if (payload.category) {
    results = results.filter((p) => p.category === payload.category);
  }

  if (payload.client) {
    results = results.filter((p) =>
      p.supportedClients.includes(payload.client as Client)
    );
  }

  // 정렬
  const sort: SortOption = payload.sort ?? "stars-desc";
  if (sort === "name-asc") {
    results = [...results].sort((a, b) => a.name.localeCompare(b.name, "ko"));
  } else if (sort === "date-desc") {
    results = [...results].sort(
      (a, b) => new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime()
    );
  } else {
    // stars-desc (기본)
    results = [...results].sort((a, b) => b.stars - a.stars);
  }

  return results;
}

/**
 * clearCache — 캐시 초기화 (테스트/리로드용)
 */
export function clearCache(): void {
  _cache = null;
}

/**
 * getCategories — 등록된 카테고리 목록 반환
 */
export function getCategories(): MCPCategory[] {
  const all = loadRegistry().map((p) => p.category);
  return [...new Set(all)];
}
