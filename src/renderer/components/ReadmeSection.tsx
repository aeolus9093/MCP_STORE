// =============================================================
// renderer/components/ReadmeSection.tsx — README.md 렌더링 섹션
// GitHub raw README fetch 후 간이 마크다운 렌더링
// =============================================================

import { useState, useEffect } from "react";
import { renderMarkdown }      from "../utils/renderMarkdown";

interface ReadmeSectionProps {
  packageId: string;
}

export default function ReadmeSection({ packageId }: ReadmeSectionProps) {
  const [html,      setHtml]      = useState<string | null>(null);
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    if (!window.mcpStore) return;
    setLoading(true);
    setError(null);
    setHtml(null);

    (async () => {
      try {
        const result = await window.mcpStore!.fetchReadme(packageId);
        if (result.success && result.data) {
          setHtml(renderMarkdown(result.data));
        } else {
          setError(result.error ?? "README를 불러올 수 없습니다.");
        }
      } catch (e) {
        setError((e as Error).message);
      } finally {
        setLoading(false);
      }
    })();
  }, [packageId]);

  return (
    <div className="rounded-xl overflow-hidden" style={{ border: "1px solid #1f2535" }}>
      {/* 헤더 */}
      <button
        onClick={() => setCollapsed((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3"
        style={{ background: "#141720" }}
      >
        <span className="text-sm font-semibold" style={{ color: "#cbd5e1" }}>
          📄 README
        </span>
        <span className="text-xs" style={{ color: "#475569" }}>
          {collapsed ? "▼ 펼치기" : "▲ 접기"}
        </span>
      </button>

      {/* 콘텐츠 */}
      {!collapsed && (
        <div
          className="px-4 py-4 overflow-y-auto"
          style={{ background: "#0f1117", maxHeight: "480px" }}
        >
          {loading && (
            <div className="space-y-2 animate-pulse">
              {Array.from({ length: 6 }).map((_, i) => (
                <div
                  key={i}
                  className="h-4 rounded"
                  style={{ background: "#1f2535", width: `${60 + (i % 4) * 10}%` }}
                />
              ))}
            </div>
          )}

          {error && !loading && (
            <p className="text-sm" style={{ color: "#475569" }}>
              {error}
            </p>
          )}

          {html && !loading && (
            <div
              className="prose-dark text-sm leading-relaxed"
              dangerouslySetInnerHTML={{ __html: html }}
            />
          )}
        </div>
      )}
    </div>
  );
}
