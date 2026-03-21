// =============================================================
// renderer/components/StarRating.tsx — 인터랙티브 별점 (1–5)
// 클릭 저장 + hover 미리보기 지원
// =============================================================

import { useState } from "react";

interface StarRatingProps {
  value:     number;           // 현재 별점 (0 = 미평가)
  onChange?: (rating: number) => void;
  readOnly?: boolean;
  size?:     "sm" | "md" | "lg";
}

const SIZE_MAP = {
  sm: "text-base",
  md: "text-xl",
  lg: "text-2xl",
};

export default function StarRating({
  value,
  onChange,
  readOnly = false,
  size = "md",
}: StarRatingProps) {
  const [hovered, setHovered] = useState(0);

  const display = hovered > 0 ? hovered : value;

  return (
    <div
      className={`flex gap-0.5 ${SIZE_MAP[size]}`}
      onMouseLeave={() => setHovered(0)}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const filled = star <= display;
        return (
          <button
            key={star}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onChange?.(star)}
            onMouseEnter={() => !readOnly && setHovered(star)}
            style={{
              color:      filled ? "#fbbf24" : "#334155",
              cursor:     readOnly ? "default" : "pointer",
              background: "none",
              border:     "none",
              padding:    "0",
              lineHeight: "1",
              transition: "color 0.1s",
            }}
            title={readOnly ? `${value}점` : `${star}점`}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}
