// =============================================================
// main/review-manager.ts — 사용자 리뷰/별점 로컬 저장
// ~/.mcp-store/reviews.json 에 JSON으로 저장
// =============================================================

import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { Review, IPCResult } from "../shared/types";

// ──────────────────────────────────────────────
// 저장 경로
// ──────────────────────────────────────────────

const REVIEWS_PATH = path.join(os.homedir(), ".mcp-store", "reviews.json");

// ──────────────────────────────────────────────
// 내부 I/O
// ──────────────────────────────────────────────

function readAll(): Review[] {
  try {
    if (!fs.existsSync(REVIEWS_PATH)) return [];
    return JSON.parse(fs.readFileSync(REVIEWS_PATH, "utf-8")) as Review[];
  } catch {
    return [];
  }
}

function writeAll(reviews: Review[]): void {
  try {
    const dir = path.dirname(REVIEWS_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(REVIEWS_PATH, JSON.stringify(reviews, null, 2), "utf-8");
  } catch (err) {
    console.error("[review-manager] 저장 실패:", err);
  }
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * getReview — packageId로 단일 리뷰 조회
 */
export function getReview(packageId: string): IPCResult<Review | null> {
  try {
    const all    = readAll();
    const found  = all.find((r) => r.packageId === packageId) ?? null;
    return { success: true, data: found };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * setReview — 리뷰 저장 (upsert)
 */
export function setReview(review: Review): IPCResult {
  try {
    if (review.rating < 1 || review.rating > 5) {
      return { success: false, error: "별점은 1~5 사이여야 합니다." };
    }
    const all     = readAll();
    const idx     = all.findIndex((r) => r.packageId === review.packageId);
    const record: Review = { ...review, createdAt: new Date().toISOString() };
    if (idx >= 0) {
      all[idx] = record;
    } else {
      all.push(record);
    }
    writeAll(all);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * getAllReviews — 전체 리뷰 목록 반환
 */
export function getAllReviews(): IPCResult<Review[]> {
  try {
    return { success: true, data: readAll() };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * deleteReview — 특정 packageId 리뷰 삭제
 */
export function deleteReview(packageId: string): IPCResult {
  try {
    const all     = readAll();
    const updated = all.filter((r) => r.packageId !== packageId);
    writeAll(updated);
    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
