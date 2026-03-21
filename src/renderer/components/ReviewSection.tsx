// =============================================================
// renderer/components/ReviewSection.tsx — 사용자 리뷰/별점 UI
// 로컬 JSON 저장 (review-manager → IPC)
// =============================================================

import { useState, useEffect } from "react";
import { Review }    from "../../shared/types";
import StarRating    from "./StarRating";

interface ReviewSectionProps {
  packageId: string;
}

export default function ReviewSection({ packageId }: ReviewSectionProps) {
  const [review,   setReviewState] = useState<Review | null>(null);
  const [rating,   setRating]      = useState(0);
  const [comment,  setComment]     = useState("");
  const [saving,   setSaving]      = useState(false);
  const [saved,    setSaved]       = useState(false);

  useEffect(() => {
    if (!window.mcpStore) return;
    (async () => {
      const result = await window.mcpStore!.getReview(packageId);
      if (result.success && result.data) {
        setReviewState(result.data);
        setRating(result.data.rating);
        setComment(result.data.comment);
      }
    })();
  }, [packageId]);

  const handleSave = async () => {
    if (!window.mcpStore || rating === 0) return;
    setSaving(true);
    try {
      const result = await window.mcpStore.setReview({
        packageId,
        rating,
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      });
      if (result.success) {
        setReviewState({ packageId, rating, comment, createdAt: new Date().toISOString() });
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      }
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="rounded-xl p-4 space-y-4"
      style={{ background: "#141720", border: "1px solid #1f2535" }}
    >
      <p className="text-sm font-semibold" style={{ color: "#cbd5e1" }}>⭐ 내 리뷰</p>

      {/* 별점 */}
      <div className="flex items-center gap-3">
        <StarRating value={rating} onChange={setRating} size="lg" />
        {rating > 0 && (
          <span className="text-sm" style={{ color: "#64748b" }}>
            {["", "매우 별로", "별로", "보통", "좋음", "매우 좋음"][rating]}
          </span>
        )}
      </div>

      {/* 코멘트 */}
      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        placeholder="리뷰를 남겨보세요 (선택)"
        rows={3}
        className="w-full text-sm rounded-lg px-3 py-2 focus:outline-none resize-none"
        style={{
          background: "#0a0c14",
          border:     "1px solid #1f2535",
          color:      "#e2e8f0",
        }}
        onFocus={(e) => (e.target.style.border = "1px solid #3b82f6")}
        onBlur={(e)  => (e.target.style.border = "1px solid #1f2535")}
      />

      {/* 저장 버튼 */}
      <div className="flex items-center gap-3">
        <button
          onClick={handleSave}
          disabled={rating === 0 || saving}
          className="px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors"
          style={{
            background: rating === 0 || saving ? "#1f2535" : "#2563eb",
            color:      rating === 0 || saving ? "#475569" : "#fff",
            cursor:     rating === 0 || saving ? "not-allowed" : "pointer",
          }}
        >
          {saving ? "저장 중…" : "저장"}
        </button>
        {saved && (
          <span className="text-sm" style={{ color: "#34d399" }}>✓ 저장되었습니다.</span>
        )}
        {review && !saved && (
          <span className="text-xs" style={{ color: "#475569" }}>
            {new Date(review.createdAt).toLocaleDateString("ko-KR")} 저장됨
          </span>
        )}
      </div>
    </div>
  );
}
