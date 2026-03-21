// =============================================================
// main/mcp-collector.ts — MCP 정규화 및 병합 (공개 API)
// 수집 함수는 mcp-collector-sources.ts 참고
// =============================================================

import { MCPPackage, MCPCategory, InstallType } from "../shared/types";

// ──────────────────────────────────────────────
// 공개 타입 (소스/스크립트에서 공유)
// ──────────────────────────────────────────────

export interface RawMCPData {
  name:          string;
  description:   string;
  repoUrl:       string;
  stars:         number;
  lastUpdated:   string;
  keywords?:     string[];
  installHint?:  string;
  source:        "official" | "npm" | "awesome";
}

// ──────────────────────────────────────────────
// Re-export 수집 함수 (편의를 위해)
// ──────────────────────────────────────────────

export {
  collectFromOfficialRepo,
  collectFromNPM,
  collectFromAwesomeList,
} from "./mcp-collector-sources";

// ──────────────────────────────────────────────
// 카테고리 추론
// ──────────────────────────────────────────────

function inferCategory(name: string, keywords: string[] = []): MCPCategory {
  const text = [name, ...keywords].join(" ").toLowerCase();
  if (/database|postgres|mysql|sqlite|mongo|redis/.test(text)) return "database";
  if (/file|filesystem|storage|disk|folder/.test(text)) return "file";
  if (/search|web|browser|crawl|scrape/.test(text)) return "search";
  if (/github|git|gitlab|jira|linear/.test(text)) return "dev";
  if (/slack|discord|email|calendar|notion/.test(text)) return "communication";
  if (/aws|gcp|azure|cloud|s3/.test(text)) return "cloud";
  if (/ai|llm|openai|anthropic|vector|embed/.test(text)) return "ai";
  if (/todo|task|productivity|note/.test(text)) return "productivity";
  return "other";
}

// ──────────────────────────────────────────────
// install 타입/커맨드 추론
// ──────────────────────────────────────────────

function inferInstallType(name: string, hint?: string): { type: InstallType; cmd: string } {
  const pkg = hint ?? name;
  return { type: "npx", cmd: `npx -y ${pkg}` };
}

// ──────────────────────────────────────────────
// ID 생성
// ──────────────────────────────────────────────

function makeId(repoUrl: string, name: string): string {
  try {
    const url = new URL(repoUrl);
    const parts = url.pathname.replace(/^\//, "").split("/");
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1]}`.toLowerCase().replace(/[^a-z0-9-]/g, "-");
    }
  } catch { /* ignore */ }
  return name.toLowerCase().replace(/[^a-z0-9-]/g, "-").replace(/^[@]/, "");
}

// ──────────────────────────────────────────────
// 공개 API — 정규화
// ──────────────────────────────────────────────

/**
 * normalizeToMCPPackage — RawMCPData를 Partial<MCPPackage>로 변환
 */
export function normalizeToMCPPackage(raw: RawMCPData): Partial<MCPPackage> {
  const install  = inferInstallType(raw.name, raw.installHint);
  const category = inferCategory(raw.name, raw.keywords);
  const id       = makeId(raw.repoUrl, raw.name);

  return {
    id,
    name:             raw.name,
    description:      raw.description || raw.name,
    plainDescription: "",
    category,
    installType:      install.type,
    installCommand:   install.cmd,
    requiredEnvVars:  [],
    supportedClients: ["claude-desktop", "cursor", "windsurf", "claude-code"],
    stars:            raw.stars,
    lastUpdated:      raw.lastUpdated,
    officialSource:   raw.repoUrl,
  };
}

// ──────────────────────────────────────────────
// 공개 API — 병합
// ──────────────────────────────────────────────

/**
 * mergeIntoRegistry — 기존 registry와 신규 항목 병합
 * officialSource URL 기준으로 중복 제거.
 * 기존 항목은 stars/lastUpdated만 업데이트.
 * 신규 항목은 추가.
 */
export function mergeIntoRegistry(
  existing: MCPPackage[],
  newItems: Partial<MCPPackage>[]
): { merged: MCPPackage[]; addedCount: number; updatedCount: number } {
  const result = [...existing];
  let addedCount   = 0;
  let updatedCount = 0;

  for (const item of newItems) {
    if (!item.officialSource) continue;

    const idx = result.findIndex((e) => e.officialSource === item.officialSource);
    if (idx >= 0) {
      if (item.stars !== undefined && item.stars > 0 && item.stars !== result[idx].stars) {
        result[idx] = {
          ...result[idx],
          stars:       item.stars,
          lastUpdated: item.lastUpdated ?? result[idx].lastUpdated,
        };
        updatedCount++;
      }
    } else {
      result.push({
        id:               item.id ?? "unknown",
        name:             item.name ?? "Unknown",
        description:      item.description ?? "",
        plainDescription: item.plainDescription ?? "",
        category:         item.category ?? "other",
        installType:      item.installType ?? "npx",
        installCommand:   item.installCommand ?? "",
        requiredEnvVars:  item.requiredEnvVars ?? [],
        supportedClients: item.supportedClients ?? ["claude-desktop"],
        stars:            item.stars ?? 0,
        lastUpdated:      item.lastUpdated ?? new Date().toISOString(),
        officialSource:   item.officialSource,
        usageExamples:    item.usageExamples,
        permissions:      item.permissions,
      });
      addedCount++;
    }
  }

  return { merged: result, addedCount, updatedCount };
}
