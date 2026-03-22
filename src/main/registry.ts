// =============================================================
// main/registry.ts — MCP 목록 파싱 + 검색/필터
// registry.json 로드, zod 검증, 메모리 캐시
// =============================================================

import * as fs from "fs";
import * as path from "path";
import { z } from "zod";
import { MCPPackage, MCPCategory, Client, SearchPayload, SortOption } from "../shared/types";

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
 * getRegistryPath — registry.json 절대 경로 반환
 */
function getRegistryPath(): string {
  // rootDir: "src" → outDir: "dist" → __dirname = dist/main/ → 2단계 위가 프로젝트 루트
  return path.resolve(__dirname, "../../packages/registry.json");
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
