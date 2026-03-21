// =============================================================
// renderer/components/LogViewer.tsx — 설치 로그 뷰어 (실시간 + 자동 스크롤)
// =============================================================

import { useEffect, useRef } from "react";

interface LogViewerProps {
  logs:      string[];
  onClear:   () => void;
  maxHeight?: number;
}

/** 로그 라인 색상 분류 */
function getLineStyle(line: string): { color: string } {
  if (/오류|error|failed|fail|ERR!/i.test(line)) {
    return { color: "#f87171" };   // red
  }
  if (/✓|완료|success|added|resolved/i.test(line)) {
    return { color: "#34d399" };   // green
  }
  if (/warn|warning/i.test(line)) {
    return { color: "#fbbf24" };   // yellow
  }
  if (/^>/.test(line)) {
    return { color: "#60a5fa" };   // blue — 실행 명령
  }
  return { color: "#94a3b8" };     // default
}

/** 간단한 타임스탬프 포맷 (HH:mm:ss) */
function nowTime(): string {
  return new Date().toLocaleTimeString("ko-KR", {
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false,
  });
}

export default function LogViewer({ logs, onClear, maxHeight = 200 }: LogViewerProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  // 새 로그가 추가될 때마다 맨 아래로 자동 스크롤
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs.length]);

  if (logs.length === 0) return null;

  return (
    <div
      className="rounded-xl"
      style={{ background: "#0a0c14", border: "1px solid #1f2535" }}
    >
      {/* 헤더 */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{ borderBottom: "1px solid #1f2535" }}
      >
        <span className="text-xs font-semibold" style={{ color: "#475569" }}>
          설치 로그
        </span>
        <button
          onClick={onClear}
          className="text-xs transition-colors"
          style={{ color: "#374151" }}
          onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#94a3b8")}
          onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#374151")}
        >
          지우기
        </button>
      </div>

      {/* 로그 내용 */}
      <div
        className="overflow-y-auto p-3 space-y-0.5"
        style={{ maxHeight }}
      >
        {logs.map((line, i) => (
          <div key={i} className="flex gap-2 items-start">
            <span
              className="text-xs font-mono shrink-0 mt-0.5 select-none"
              style={{ color: "#2d3748", minWidth: "52px" }}
            >
              {nowTime()}
            </span>
            <p
              className="text-xs font-mono leading-relaxed break-all"
              style={getLineStyle(line)}
            >
              {line}
            </p>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
