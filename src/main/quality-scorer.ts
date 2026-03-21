// =============================================================
// main/quality-scorer.ts — MCP 품질 자동 채점
// stars / recency / description / clients / envComplexity 기반
// =============================================================

import { MCPPackage, QualityScore } from "../shared/types";

// ──────────────────────────────────────────────
// 점수 계산 로직
// ──────────────────────────────────────────────

/**
 * scoreStars — GitHub stars 기준 0–40점
 * 로그 스케일: 10000 stars → 40점
 */
function scoreStars(stars: number): number {
  if (stars <= 0) return 0;
  const raw = Math.log10(stars + 1) / Math.log10(10001) * 40;
  return Math.min(40, Math.round(raw));
}

/**
 * scoreRecency — lastUpdated 기준 0–20점
 * 3개월 이내 → 20점, 6개월 → 15점, 1년 → 10점, 2년+ → 0점
 */
function scoreRecency(lastUpdated: string): number {
  try {
    const now      = Date.now();
    const updated  = new Date(lastUpdated).getTime();
    const ageMs    = now - updated;
    const ageDays  = ageMs / (1000 * 60 * 60 * 24);

    if (ageDays <= 90)  return 20;
    if (ageDays <= 180) return 15;
    if (ageDays <= 365) return 10;
    if (ageDays <= 730) return 5;
    return 0;
  } catch {
    return 0;
  }
}

/**
 * scoreDescription — description + plainDescription 길이 기준 0–20점
 * 합산 200자 이상 → 20점
 */
function scoreDescription(pkg: MCPPackage): number {
  const total = (pkg.description?.length ?? 0) + (pkg.plainDescription?.length ?? 0);
  if (total >= 200) return 20;
  if (total >= 100) return 15;
  if (total >= 50)  return 10;
  if (total >= 20)  return 5;
  return 0;
}

/**
 * scoreClients — 지원 클라이언트 수 기준 0–10점
 * 4개 이상 → 10점
 */
function scoreClients(pkg: MCPPackage): number {
  const count = pkg.supportedClients?.length ?? 0;
  if (count >= 4) return 10;
  if (count === 3) return 8;
  if (count === 2) return 5;
  if (count === 1) return 3;
  return 0;
}

/**
 * scoreEnvPenalty — 필수 환경변수 수에 따른 복잡도 페널티 0–(-10)점
 * 환경변수 없음 → 0점 페널티 (최대 10점 추가)
 * 환경변수 많을수록 접근성 낮음
 */
function scoreEnvPenalty(pkg: MCPPackage): number {
  const count = (pkg.requiredEnvVars ?? []).filter((v) => v.required).length;
  if (count === 0) return 10; // 보너스
  if (count === 1) return 5;
  if (count === 2) return 2;
  return 0; // 3개 이상 → 보너스 없음
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * computeQualityScore — 단일 패키지 품질 점수 계산 (0–100)
 */
export function computeQualityScore(pkg: MCPPackage): QualityScore {
  const stars      = scoreStars(pkg.stars);
  const recency    = scoreRecency(pkg.lastUpdated);
  const description = scoreDescription(pkg);
  const clients    = scoreClients(pkg);
  const envPenalty = scoreEnvPenalty(pkg);

  const score = Math.min(100, stars + recency + description + clients + envPenalty);

  return {
    packageId: pkg.id,
    score,
    breakdown: { stars, recency, description, clients, envPenalty },
  };
}

/**
 * computeBatchQualityScores — 여러 패키지 품질 점수 계산
 */
export function computeBatchQualityScores(
  packages: MCPPackage[]
): Record<string, QualityScore> {
  const result: Record<string, QualityScore> = {};
  for (const pkg of packages) {
    result[pkg.id] = computeQualityScore(pkg);
  }
  return result;
}

/**
 * getQualityLabel — 점수 → 레이블 (UI용)
 */
export function getQualityLabel(score: number): { label: string; color: string } {
  if (score >= 80) return { label: "우수",   color: "#34d399" };
  if (score >= 60) return { label: "양호",   color: "#fbbf24" };
  if (score >= 40) return { label: "보통",   color: "#fb923c" };
  return              { label: "기본",   color: "#94a3b8" };
}
