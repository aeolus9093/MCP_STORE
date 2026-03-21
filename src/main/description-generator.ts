// =============================================================
// main/description-generator.ts — Claude API로 plainDescription 자동 생성
// README → Haiku → 일반인 한국어 설명. API Key는 settings.json에서 읽음.
// 생성 결과는 ~/.mcp-store/generated-descriptions.json에 캐싱.
// =============================================================

import * as https from "https";
import * as fs    from "fs";
import * as path  from "path";
import * as os    from "os";
import { IPCResult } from "../shared/types";

// ──────────────────────────────────────────────
// 경로 상수
// ──────────────────────────────────────────────

const MCP_STORE_DIR        = path.join(os.homedir(), ".mcp-store");
const DESCRIPTIONS_PATH    = path.join(MCP_STORE_DIR, "generated-descriptions.json");
const SETTINGS_PATH        = path.join(MCP_STORE_DIR, "settings.json");

// ──────────────────────────────────────────────
// 캐시 관리
// ──────────────────────────────────────────────

interface DescriptionEntry {
  description: string;
  generatedAt: string;
}

type DescriptionCache = Record<string, DescriptionEntry>;

function readDescriptions(): DescriptionCache {
  try {
    if (!fs.existsSync(DESCRIPTIONS_PATH)) return {};
    return JSON.parse(fs.readFileSync(DESCRIPTIONS_PATH, "utf-8")) as DescriptionCache;
  } catch {
    return {};
  }
}

function writeDescriptions(cache: DescriptionCache): void {
  try {
    if (!fs.existsSync(MCP_STORE_DIR)) fs.mkdirSync(MCP_STORE_DIR, { recursive: true });
    fs.writeFileSync(DESCRIPTIONS_PATH, JSON.stringify(cache, null, 2), "utf-8");
  } catch (err) {
    console.error("[description-gen] cache write error:", err);
  }
}

// ──────────────────────────────────────────────
// Settings 읽기
// ──────────────────────────────────────────────

function getApiKey(): string {
  try {
    if (!fs.existsSync(SETTINGS_PATH)) return "";
    const settings = JSON.parse(
      fs.readFileSync(SETTINGS_PATH, "utf-8")
    ) as { claudeApiKey?: string };
    return settings.claudeApiKey ?? "";
  } catch {
    return "";
  }
}

// ──────────────────────────────────────────────
// Claude API HTTPS POST
// ──────────────────────────────────────────────

function httpsPost(
  hostname: string,
  pathStr:  string,
  body:     string,
  apiKey:   string
): Promise<string> {
  return new Promise((resolve, reject) => {
    const bodyBuffer = Buffer.from(body, "utf-8");
    const req = https.request(
      {
        hostname,
        path:   pathStr,
        method: "POST",
        headers: {
          "Content-Type":      "application/json",
          "x-api-key":         apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Length":    bodyBuffer.length,
        },
      },
      (res) => {
        if (res.statusCode && res.statusCode >= 400) {
          let errBody = "";
          res.on("data", (c: Buffer) => (errBody += c.toString()));
          res.on("end", () =>
            reject(new Error(`Claude API HTTP ${res.statusCode}: ${errBody.slice(0, 200)}`))
          );
          return;
        }
        let data = "";
        res.on("data", (chunk: Buffer) => (data += chunk.toString()));
        res.on("end", () => resolve(data));
        res.on("error", reject);
      }
    );
    req.on("error", reject);
    req.setTimeout(30_000, () => {
      req.destroy(new Error("Claude API 요청 시간 초과 (30s)"));
    });
    req.write(bodyBuffer);
    req.end();
  });
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * generateDescription — README를 Claude Haiku로 요약해 한국어 설명 생성
 * 캐시에 있으면 캐시 반환. API Key 없으면 오류 반환.
 */
export async function generateDescription(
  packageId:     string,
  readmeContent: string
): Promise<IPCResult<string>> {
  // 캐시 확인
  const cache = readDescriptions();
  if (cache[packageId]) {
    return { success: true, data: cache[packageId].description };
  }

  const apiKey = getApiKey();
  if (!apiKey) {
    return {
      success: false,
      error:
        "Claude API Key가 설정되지 않았습니다. Settings 탭에서 입력해주세요.",
    };
  }

  // README 4,000자로 제한 (토큰 절약)
  const truncated = readmeContent.slice(0, 4_000);

  const prompt =
    `다음은 MCP(Model Context Protocol) 서버의 README입니다.\n` +
    `이 MCP가 무엇을 하는지, 기술에 익숙하지 않은 일반인도 이해할 수 있는 ` +
    `한국어 설명을 2~3문장으로 작성해주세요.\n` +
    `전문 용어는 쉬운 말로 바꾸고, 실제로 어떤 상황에서 유용한지 예시를 포함하세요.\n\n` +
    `README:\n${truncated}`;

  const requestBody = JSON.stringify({
    model:      "claude-haiku-4-5-20251001",
    max_tokens: 300,
    messages:   [{ role: "user", content: prompt }],
  });

  try {
    const responseText = await httpsPost(
      "api.anthropic.com",
      "/v1/messages",
      requestBody,
      apiKey
    );

    const response = JSON.parse(responseText) as {
      content: Array<{ type: string; text: string }>;
    };

    const description = response.content?.find((c) => c.type === "text")?.text ?? "";
    if (!description) {
      return { success: false, error: "API 응답에서 설명 텍스트를 추출할 수 없습니다." };
    }

    // 캐시 저장
    cache[packageId] = { description, generatedAt: new Date().toISOString() };
    writeDescriptions(cache);

    return { success: true, data: description };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * getGeneratedDescription — 특정 패키지의 캐시된 설명 반환 (null이면 미생성)
 */
export function getGeneratedDescription(packageId: string): string | null {
  const cache = readDescriptions();
  return cache[packageId]?.description ?? null;
}

/**
 * getAllGeneratedDescriptions — 전체 캐시 반환
 */
export function getAllGeneratedDescriptions(): DescriptionCache {
  return readDescriptions();
}
