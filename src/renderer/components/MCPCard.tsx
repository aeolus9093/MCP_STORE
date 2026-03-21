// =============================================================
// renderer/components/MCPCard.tsx — MCP 패키지 카드 (다크테마)
// Phase 3: 품질 점수 배지 추가
// =============================================================

import { MCPPackage, QualityScore } from "../../shared/types";
import { useAppStore } from "../store/appStore";

const CATEGORY_COLORS: Record<string, { bg: string; text: string }> = {
  dev:           { bg: "#2d1f4e", text: "#a78bfa" },
  productivity:  { bg: "#1a2d4e", text: "#60a5fa" },
  search:        { bg: "#2d2a1a", text: "#fbbf24" },
  file:          { bg: "#1a3028", text: "#34d399" },
  database:      { bg: "#2d2018", text: "#fb923c" },
  ai:            { bg: "#2d1a2d", text: "#f472b6" },
  communication: { bg: "#1a2d2d", text: "#2dd4bf" },
  cloud:         { bg: "#1a2838", text: "#38bdf8" },
  other:         { bg: "#1f2535", text: "#94a3b8" },
};

const CATEGORY_LABELS: Record<string, string> = {
  dev:           "개발",
  productivity:  "생산성",
  search:        "검색",
  file:          "파일",
  database:      "데이터베이스",
  ai:            "AI",
  communication: "커뮤니케이션",
  cloud:         "클라우드",
  other:         "기타",
};

function qualityColor(score: number): string {
  if (score >= 80) return "#34d399";
  if (score >= 60) return "#fbbf24";
  if (score >= 40) return "#fb923c";
  return "#64748b";
}

interface MCPCardProps {
  pkg:         MCPPackage;
  isInstalled: boolean;
  onClick:     (pkg: MCPPackage) => void;
}

export default function MCPCard({ pkg, isInstalled, onClick }: MCPCardProps) {
  const cat          = CATEGORY_COLORS[pkg.category] ?? CATEGORY_COLORS.other;
  const qualityScores = useAppStore((s) => s.qualityScores);
  const quality: QualityScore | undefined = qualityScores[pkg.id];

  return (
    <button
      onClick={() => onClick(pkg)}
      className="w-full text-left rounded-2xl p-5 transition-all focus:outline-none"
      style={{
        background:  "#141720",
        border:      "1px solid #1f2535",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.border = "1px solid #2d4a7a";
        (e.currentTarget as HTMLButtonElement).style.background = "#181d2e";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.border = "1px solid #1f2535";
        (e.currentTarget as HTMLButtonElement).style.background = "#141720";
      }}
    >
      {/* 헤더 */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 flex-wrap">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: cat.bg, color: cat.text }}
          >
            {CATEGORY_LABELS[pkg.category] ?? pkg.category}
          </span>
          {isInstalled && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{ background: "#0f2d1e", color: "#34d399" }}
            >
              설치됨
            </span>
          )}
          {/* 품질 점수 배지 */}
          {quality && (
            <span
              className="px-2 py-0.5 rounded-full text-xs font-semibold"
              style={{
                background: "#1f2535",
                color: qualityColor(quality.score),
                border: `1px solid ${qualityColor(quality.score)}40`,
              }}
            >
              🏅 {quality.score}
            </span>
          )}
        </div>
        <span className="text-xs shrink-0" style={{ color: "#64748b" }}>
          ★ {pkg.stars.toLocaleString()}
        </span>
      </div>

      {/* 이름 */}
      <h3 className="font-bold text-base mb-1" style={{ color: "#f1f5f9" }}>
        {pkg.name}
      </h3>

      {/* 설명 */}
      <p className="text-sm line-clamp-2 leading-relaxed" style={{ color: "#64748b" }}>
        {pkg.plainDescription}
      </p>

      {/* 클라이언트 뱃지 */}
      <div className="mt-3 flex gap-1 flex-wrap">
        {pkg.supportedClients.map((c) => (
          <span
            key={c}
            className="text-xs px-2 py-0.5 rounded-md"
            style={{ background: "#1f2535", color: "#475569" }}
          >
            {c}
          </span>
        ))}
      </div>
    </button>
  );
}
