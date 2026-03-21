// =============================================================
// renderer/components/DepsModal.tsx — 의존성 미설치 감지 팝업
// Node.js / npm / uvx 미설치 시 설치 가이드 안내
// =============================================================

interface ToolInfo {
  name:        string;
  label:       string;
  installUrl:  string;
  description: string;
  critical:    boolean;
}

const TOOL_INFO: ToolInfo[] = [
  {
    name:        "node",
    label:       "Node.js",
    installUrl:  "https://nodejs.org",
    description: "대부분의 MCP 서버 실행에 필요합니다.",
    critical:    true,
  },
  {
    name:        "npm",
    label:       "npm",
    installUrl:  "https://nodejs.org",
    description: "Node.js 패키지 관리자입니다. Node.js 설치 시 함께 설치됩니다.",
    critical:    true,
  },
  {
    name:        "uvx",
    label:       "uv / uvx",
    installUrl:  "https://docs.astral.sh/uv/getting-started/installation/",
    description: "Python 기반 MCP 서버(SQLite, Fetch, Time 등) 실행에 필요합니다.",
    critical:    false,
  },
  {
    name:        "docker",
    label:       "Docker",
    installUrl:  "https://www.docker.com/products/docker-desktop/",
    description: "Docker 기반 MCP 서버 실행에 필요합니다.",
    critical:    false,
  },
];

interface DepsModalProps {
  missingTools: string[];
  onClose:      () => void;
}

export default function DepsModal({ missingTools, onClose }: DepsModalProps) {
  if (missingTools.length === 0) return null;

  const missing = TOOL_INFO.filter((t) => missingTools.includes(t.name));
  const hasCritical = missing.some((t) => t.critical);

  const handleOpenUrl = (url: string) => {
    // Electron shell.openExternal은 main index.ts에서 처리
    window.open(url, "_blank");
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div
        className="rounded-2xl p-6 w-[480px] shadow-2xl"
        style={{ background: "#141720", border: "1px solid #1f2535" }}
      >
        {/* 헤더 */}
        <div className="flex items-center gap-3 mb-4">
          <span className="text-2xl">{hasCritical ? "⚠️" : "ℹ️"}</span>
          <div>
            <h3 className="font-bold" style={{ color: "#f1f5f9" }}>
              필요한 도구가 설치되지 않았습니다
            </h3>
            <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>
              아래 도구를 설치해야 MCP를 사용할 수 있습니다.
            </p>
          </div>
        </div>

        {/* 누락된 도구 목록 */}
        <div className="space-y-3 mb-5">
          {missing.map((tool) => (
            <div
              key={tool.name}
              className="flex items-start justify-between gap-3 rounded-xl p-3"
              style={{
                background: tool.critical ? "#2d1a1a" : "#1a1d27",
                border:     tool.critical ? "1px solid #7f1d1d" : "1px solid #1f2535",
              }}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="font-semibold text-sm" style={{ color: "#f1f5f9" }}>
                    {tool.label}
                  </span>
                  {tool.critical && (
                    <span
                      className="px-1.5 py-0.5 rounded text-xs font-bold"
                      style={{ background: "#7f1d1d", color: "#fca5a5" }}
                    >
                      필수
                    </span>
                  )}
                </div>
                <p className="text-xs" style={{ color: "#64748b" }}>{tool.description}</p>
              </div>
              <button
                onClick={() => handleOpenUrl(tool.installUrl)}
                className="shrink-0 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors"
                style={{ background: "#2563eb", color: "#fff" }}
              >
                설치하기 →
              </button>
            </div>
          ))}
        </div>

        {/* 안내 */}
        <p className="text-xs mb-4" style={{ color: "#475569" }}>
          설치 후 앱을 재시작하면 자동으로 감지됩니다.
        </p>

        {/* 닫기 */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2 rounded-xl text-sm font-medium"
            style={{ background: "#1f2535", color: "#94a3b8" }}
          >
            나중에 설치
          </button>
          {!hasCritical && (
            <button
              onClick={onClose}
              className="flex-1 py-2 rounded-xl text-sm font-semibold"
              style={{ background: "#2563eb", color: "#fff" }}
            >
              계속 진행
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
