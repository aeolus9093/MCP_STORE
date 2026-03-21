// =============================================================
// renderer/pages/Detail.tsx — MCP 상세 페이지 (다크테마)
// Phase 3: README 렌더링 + 리뷰/별점 + 품질 점수 추가
// =============================================================

import { useState, useEffect } from "react";
import { MCPPackage, QualityScore } from "../../shared/types";
import InstallWizard  from "../components/InstallWizard";
import ReadmeSection  from "../components/ReadmeSection";
import ReviewSection  from "../components/ReviewSection";

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

interface QualityBadgeProps {
  score: QualityScore;
}

function QualityBadge({ score }: QualityBadgeProps) {
  const { label, color } =
    score.score >= 80 ? { label: "우수",  color: "#34d399" } :
    score.score >= 60 ? { label: "양호",  color: "#fbbf24" } :
    score.score >= 40 ? { label: "보통",  color: "#fb923c" } :
                        { label: "기본",  color: "#94a3b8" };

  const [showBreakdown, setShowBreakdown] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setShowBreakdown((v) => !v)}
        className="flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold"
        style={{ background: "#141720", border: `1px solid ${color}`, color }}
        title="품질 점수 보기"
      >
        🏅 {score.score}점 {label}
      </button>

      {showBreakdown && (
        <div
          className="absolute left-0 top-7 z-50 rounded-xl p-3 w-52 shadow-xl"
          style={{ background: "#141720", border: "1px solid #1f2535" }}
        >
          <p className="text-xs font-semibold mb-2" style={{ color: "#cbd5e1" }}>점수 분석</p>
          {[
            { label: "Stars",       value: score.breakdown.stars,       max: 40 },
            { label: "최신성",       value: score.breakdown.recency,     max: 20 },
            { label: "설명 충실도",   value: score.breakdown.description, max: 20 },
            { label: "지원 클라이언트", value: score.breakdown.clients,   max: 10 },
            { label: "설정 용이성",   value: score.breakdown.envPenalty,  max: 10 },
          ].map((item) => (
            <div key={item.label} className="flex items-center gap-2 mb-1.5">
              <span className="w-24 text-xs shrink-0" style={{ color: "#64748b" }}>{item.label}</span>
              <div className="flex-1 h-1.5 rounded-full" style={{ background: "#1f2535" }}>
                <div
                  className="h-1.5 rounded-full"
                  style={{
                    width:      `${(item.value / item.max) * 100}%`,
                    background: color,
                    transition: "width 0.3s",
                  }}
                />
              </div>
              <span className="text-xs w-6 text-right" style={{ color: "#64748b" }}>{item.value}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

interface DetailProps {
  pkg:    MCPPackage;
  onBack: () => void;
}

export default function Detail({ pkg, onBack }: DetailProps) {
  const [qualityScore, setQualityScore] = useState<QualityScore | null>(null);

  useEffect(() => {
    if (!window.mcpStore) return;
    (async () => {
      const result = await window.mcpStore!.getQualityScore(pkg.id);
      if (result.success && result.data) setQualityScore(result.data);
    })();
  }, [pkg.id]);

  return (
    <div className="p-6 space-y-6 max-w-2xl mx-auto">
      {/* 뒤로 가기 */}
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm transition-colors"
        style={{ color: "#64748b" }}
        onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#94a3b8")}
        onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#64748b")}
      >
        ← 목록으로
      </button>

      {/* 헤더 */}
      <div>
        <div className="flex items-center gap-3 mb-2 flex-wrap">
          <span
            className="px-2 py-0.5 rounded-full text-xs font-semibold"
            style={{ background: "#1f2535", color: "#94a3b8" }}
          >
            {CATEGORY_LABELS[pkg.category] ?? pkg.category}
          </span>
          <span className="text-xs" style={{ color: "#64748b" }}>★ {pkg.stars.toLocaleString()}</span>
          {qualityScore && <QualityBadge score={qualityScore} />}
        </div>
        <h2 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>{pkg.name}</h2>
        <p className="mt-1 text-sm leading-relaxed" style={{ color: "#64748b" }}>{pkg.plainDescription}</p>
        <a
          href={pkg.officialSource}
          target="_blank"
          rel="noreferrer"
          className="text-xs underline mt-1 inline-block"
          style={{ color: "#3b82f6" }}
        >
          공식 저장소 →
        </a>
      </div>

      {/* 설치 명령 미리보기 */}
      <div className="rounded-xl p-4" style={{ background: "#0a0c14", border: "1px solid #1f2535" }}>
        <p className="text-xs mb-1" style={{ color: "#475569" }}>설치 명령</p>
        <code className="text-sm font-mono break-all" style={{ color: "#94a3b8" }}>
          {pkg.installCommand}
        </code>
      </div>

      {/* 사용 예시 */}
      {pkg.usageExamples && pkg.usageExamples.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "#141720", border: "1px solid #1f2535" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "#cbd5e1" }}>💬 사용 예시</p>
          <div className="space-y-2">
            {pkg.usageExamples.map((ex, i) => (
              <div
                key={i}
                className="flex items-start gap-2 rounded-lg px-3 py-2"
                style={{ background: "#0f1a2e" }}
              >
                <span style={{ color: "#3b82f6" }}>›</span>
                <span className="text-sm" style={{ color: "#94a3b8" }}>{ex}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 필요 권한 */}
      {pkg.permissions && pkg.permissions.length > 0 && (
        <div className="rounded-xl p-4" style={{ background: "#141720", border: "1px solid #1f2535" }}>
          <p className="text-sm font-semibold mb-3" style={{ color: "#cbd5e1" }}>🔑 필요 권한</p>
          <div className="flex flex-wrap gap-2">
            {pkg.permissions.map((perm, i) => (
              <span
                key={i}
                className="px-2.5 py-1 rounded-lg text-xs"
                style={{ background: "#1a2d4e", color: "#60a5fa", border: "1px solid #1e3a5f" }}
              >
                {perm}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* README 렌더링 */}
      <ReadmeSection packageId={pkg.id} />

      {/* 설치 마법사 */}
      <div className="rounded-2xl p-5" style={{ background: "#141720", border: "1px solid #1f2535" }}>
        <h3 className="font-semibold mb-4" style={{ color: "#f1f5f9" }}>설치 설정</h3>
        <InstallWizard pkg={pkg} />
      </div>

      {/* 리뷰 / 별점 */}
      <ReviewSection packageId={pkg.id} />
    </div>
  );
}
