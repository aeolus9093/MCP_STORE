// =============================================================
// scripts/collect-mcps.ts — MCP 수집 CLI 스크립트
// 환경변수: GITHUB_TOKEN, ANTHROPIC_API_KEY, COST_LIMIT_USD
// 실행: npx ts-node scripts/collect-mcps.ts
// =============================================================

import * as fs   from "fs";
import * as path from "path";
import * as https from "https";
import {
  collectFromOfficialRepo,
  collectFromNPM,
  collectFromAwesomeList,
  normalizeToMCPPackage,
  mergeIntoRegistry,
  RawMCPData,
} from "../src/main/mcp-collector";
import { MCPPackage } from "../src/shared/types";

// ──────────────────────────────────────────────
// 환경 변수
// ──────────────────────────────────────────────

const GITHUB_TOKEN       = process.env.GITHUB_TOKEN ?? "";
const ANTHROPIC_API_KEY  = process.env.ANTHROPIC_API_KEY ?? "";
const GENERATE_DESC      = process.env.GENERATE_DESCRIPTIONS === "true";
const COST_LIMIT_USD     = parseFloat(process.env.COST_LIMIT_USD ?? "0.01");
// __dirname = dist-scripts/scripts/ → ../../ = project root
const REGISTRY_PATH      = path.resolve(__dirname, "../../packages/registry.json");
const COST_STATUS_PATH   = path.resolve(__dirname, "../../cost-limit-status.json");

// ──────────────────────────────────────────────
// Claude Haiku 가격 (USD per token)
// https://www.anthropic.com/pricing
// ──────────────────────────────────────────────

const HAIKU_INPUT_COST_PER_TOKEN  = 0.25  / 1_000_000;  // $0.25 / 1M tokens
const HAIKU_OUTPUT_COST_PER_TOKEN = 1.25  / 1_000_000;  // $1.25 / 1M tokens

// ──────────────────────────────────────────────
// 로깅 유틸
// ──────────────────────────────────────────────

function log(msg: string): void {
  console.log(`[collect-mcps] ${new Date().toISOString()} ${msg}`);
}

function warn(msg: string): void {
  console.warn(`[collect-mcps] WARN ${msg}`);
}

/** GitHub Actions 워크플로우 경고 어노테이션 출력 */
function ghaWarning(msg: string): void {
  console.log(`::warning::${msg}`);
}

// ──────────────────────────────────────────────
// registry.json 파일 I/O
// ──────────────────────────────────────────────

function loadRegistry(): MCPPackage[] {
  try {
    if (!fs.existsSync(REGISTRY_PATH)) return [];
    const raw = fs.readFileSync(REGISTRY_PATH, "utf-8");
    return JSON.parse(raw) as MCPPackage[];
  } catch (e) {
    warn(`registry.json 로드 실패: ${(e as Error).message}`);
    return [];
  }
}

function saveRegistry(packages: MCPPackage[]): void {
  const dir = path.dirname(REGISTRY_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(REGISTRY_PATH, JSON.stringify(packages, null, 2), "utf-8");
}

// ──────────────────────────────────────────────
// Claude API 응답 타입
// ──────────────────────────────────────────────

interface ClaudeUsage {
  input_tokens:  number;
  output_tokens: number;
}

interface GenerateResult {
  text:         string;
  inputTokens:  number;
  outputTokens: number;
  cost:         number;  // USD
}

// ──────────────────────────────────────────────
// Claude API로 plainDescription 생성
// ──────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

async function generatePlainDescription(pkg: MCPPackage): Promise<GenerateResult> {
  const prompt =
    `다음은 MCP(Model Context Protocol) 서버입니다.\n` +
    `이름: ${pkg.name}\n설명: ${pkg.description}\n\n` +
    `이 MCP가 무엇을 하는지, 기술에 익숙하지 않은 일반인도 이해할 수 있는 ` +
    `한국어 설명을 2~3문장으로 작성해주세요. ` +
    `전문 용어는 쉬운 말로 바꾸고, 실제로 어떤 상황에서 유용한지 포함하세요.`;

  const body = JSON.stringify({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages:   [{ role: "user", content: prompt }],
  });

  return new Promise((resolve, reject) => {
    const buf = Buffer.from(body, "utf-8");
    const req = https.request({
      hostname: "api.anthropic.com",
      path:     "/v1/messages",
      method:   "POST",
      headers: {
        "Content-Type":      "application/json",
        "x-api-key":         ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "Content-Length":    buf.length,
      },
    }, (res) => {
      let data = "";
      res.on("data", (c: Buffer) => (data += c.toString()));
      res.on("end", () => {
        try {
          const parsed = JSON.parse(data) as {
            content: Array<{ type: string; text: string }>;
            usage:   ClaudeUsage;
          };
          const text         = parsed.content?.find((c) => c.type === "text")?.text ?? "";
          const inputTokens  = parsed.usage?.input_tokens  ?? 0;
          const outputTokens = parsed.usage?.output_tokens ?? 0;
          const cost = (inputTokens  * HAIKU_INPUT_COST_PER_TOKEN)
                     + (outputTokens * HAIKU_OUTPUT_COST_PER_TOKEN);
          resolve({ text, inputTokens, outputTokens, cost });
        } catch (e) { reject(e); }
      });
      res.on("error", reject);
    });
    req.on("error", reject);
    req.setTimeout(30_000, () => req.destroy(new Error("Claude API 시간 초과")));
    req.write(buf);
    req.end();
  });
}

// ──────────────────────────────────────────────
// 메인 실행
// ──────────────────────────────────────────────

async function main(): Promise<void> {
  log("=== MCP 수집 시작 ===");

  // 1. 기존 registry 로드
  const existing = loadRegistry();
  log(`기존 registry: ${existing.length}개`);

  // 2. 각 소스에서 수집 (개별 오류 처리)
  const allRaw: RawMCPData[] = [];

  log("소스 1: modelcontextprotocol/servers 수집 중...");
  try {
    const official = await collectFromOfficialRepo(GITHUB_TOKEN || undefined);
    log(`  → ${official.length}개 발견`);
    allRaw.push(...official);
  } catch (e) { warn(`official 수집 실패: ${(e as Error).message}`); }

  log("소스 2: NPM 레지스트리 수집 중...");
  try {
    const npm = await collectFromNPM();
    log(`  → ${npm.length}개 발견`);
    allRaw.push(...npm);
  } catch (e) { warn(`NPM 수집 실패: ${(e as Error).message}`); }

  log("소스 3: awesome-mcp-servers 파싱 중...");
  try {
    const awesome = await collectFromAwesomeList(GITHUB_TOKEN || undefined);
    log(`  → ${awesome.length}개 발견`);
    allRaw.push(...awesome);
  } catch (e) { warn(`awesome 수집 실패: ${(e as Error).message}`); }

  log(`총 수집: ${allRaw.length}개 (중복 제거 전)`);

  // 3. 정규화
  const normalized = allRaw.map(normalizeToMCPPackage);

  // 4. 병합
  const { merged, addedCount, updatedCount } = mergeIntoRegistry(existing, normalized);
  log(`병합 결과: 신규 ${addedCount}개, 업데이트 ${updatedCount}개, 총 ${merged.length}개`);

  // 5. plainDescription 생성 (API 키 있고 GENERATE_DESCRIPTIONS=true일 때만)
  let totalCost         = 0;
  let totalInputTokens  = 0;
  let totalOutputTokens = 0;
  let translatedCount   = 0;
  let costLimitReached  = false;

  if (ANTHROPIC_API_KEY && GENERATE_DESC) {
    const needsDesc = merged.filter((p) => !p.plainDescription || p.plainDescription.trim() === "");
    log(`설명 생성 대상: ${needsDesc.length}개 (비용 한도: $${COST_LIMIT_USD})`);

    for (let i = 0; i < needsDesc.length; i++) {
      // 한도 초과 여부 사전 확인
      if (totalCost >= COST_LIMIT_USD) {
        if (!costLimitReached) {
          costLimitReached = true;
          const remaining  = needsDesc.length - i;
          const msg = `번역 비용 한도 초과 — 중단 | 누적: $${totalCost.toFixed(6)} / 한도: $${COST_LIMIT_USD} | 번역 완료: ${translatedCount}개 | 미번역 잔여: ${remaining}개`;
          warn(msg);
          ghaWarning(msg);
        }
        break;
      }

      const pkg = needsDesc[i];
      try {
        log(`  [${i + 1}/${needsDesc.length}] ${pkg.id} 설명 생성 중... (현재 누적: $${totalCost.toFixed(6)})`);
        const result = await generatePlainDescription(pkg);

        const idx = merged.findIndex((p) => p.id === pkg.id);
        if (idx >= 0 && result.text) merged[idx].plainDescription = result.text;

        totalCost         += result.cost;
        totalInputTokens  += result.inputTokens;
        totalOutputTokens += result.outputTokens;
        translatedCount++;

        log(`    → 입력 ${result.inputTokens}t / 출력 ${result.outputTokens}t / 비용 $${result.cost.toFixed(6)} / 누적 $${totalCost.toFixed(6)}`);

        await delay(500); // rate limit 방지
      } catch (e) {
        warn(`  ${pkg.id} 설명 생성 실패: ${(e as Error).message}`);
      }
    }

    log(`번역 완료: ${translatedCount}개 | 총 토큰: 입력 ${totalInputTokens} / 출력 ${totalOutputTokens} | 총 비용: $${totalCost.toFixed(6)}`);

    // 비용 상태 파일 저장 (워크플로우에서 읽음)
    fs.writeFileSync(COST_STATUS_PATH, JSON.stringify({
      costLimitReached,
      totalCost,
      costLimitUSD:     COST_LIMIT_USD,
      translatedCount,
      totalInputTokens,
      totalOutputTokens,
      timestamp:        new Date().toISOString(),
    }, null, 2), "utf-8");
    log(`비용 상태 파일 저장: ${COST_STATUS_PATH}`);

  } else if (ANTHROPIC_API_KEY && !GENERATE_DESC) {
    log("설명 자동 생성 비활성화 (GENERATE_DESCRIPTIONS=true로 활성화)");
  } else {
    log("ANTHROPIC_API_KEY 없음 — 설명 자동 생성 건너뜀");
  }

  // 6. 저장
  if (addedCount > 0 || updatedCount > 0 || translatedCount > 0) {
    saveRegistry(merged);
    log(`registry.json 저장 완료 (${merged.length}개)`);
  } else {
    log("변경사항 없음 — registry.json 유지");
  }

  log("=== MCP 수집 완료 ===");
}

main().catch((e) => {
  console.error("[collect-mcps] 치명적 오류:", e);
  process.exit(1);
});
