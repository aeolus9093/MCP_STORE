// =============================================================
// renderer/App.tsx — 루트 컴포넌트 + 라우팅 (다크테마)
// =============================================================

import { useState, useEffect } from "react";
import Home      from "./pages/Home";
import Detail    from "./pages/Detail";
import Installed from "./pages/Installed";
import Settings  from "./pages/Settings";
import DepsModal            from "./components/DepsModal";
import UpdateNotification   from "./components/UpdateNotification";
import { useAppStore } from "./store/appStore";
import { MCPPackage }  from "../shared/types";

type Tab = "home" | "installed" | "settings";

export default function App() {
  const [tab,             setTab]             = useState<Tab>("home");
  const [selectedPackage, setSelectedPackage] = useState<MCPPackage | null>(null);
  const [missingTools,    setMissingTools]    = useState<string[]>([]);
  const [depsChecked,     setDepsChecked]     = useState(false);
  const [registryToast,   setRegistryToast]   = useState(false);

  const { setToolsAvailable, setInstalled, setPackages } = useAppStore();

  // Registry 자동 업데이트 이벤트 수신
  useEffect(() => {
    if (!window.mcpStore) return;
    window.mcpStore.onRegistryUpdated(async () => {
      const result = await window.mcpStore!.getAll();
      if (result.success && result.data) {
        setPackages(result.data);
        setRegistryToast(true);
        setTimeout(() => setRegistryToast(false), 5000);
      }
    });
    return () => { window.mcpStore?.offRegistryUpdated(); };
  }, [setPackages]);

  // 앱 시작 시 의존성 + 설치 목록 초기화
  useEffect(() => {
    (async () => {
      if (!window.mcpStore) return;

      // 의존성 확인
      try {
        const result = await window.mcpStore.checkTools();
        if (result.success && result.data) {
          setToolsAvailable(result.data);
          const missing = Object.entries(result.data)
            .filter(([, ok]) => !ok)
            .map(([name]) => name);
          setMissingTools(missing);
        }
      } catch {
        // 실패해도 앱은 계속 진행
      }
      setDepsChecked(true);

      // 설치 목록 초기화
      try {
        const r = await window.mcpStore.getInstalled();
        if (r.success && r.data) setInstalled(r.data);
      } catch {
        // 무시
      }
    })();
  }, [setToolsAvailable, setInstalled]);

  const handleSelectPackage = (pkg: MCPPackage) => setSelectedPackage(pkg);
  const handleBack          = () => setSelectedPackage(null);

  // 치명적 누락 (node, npm)
  const criticalMissing = missingTools.filter((t) => t === "node" || t === "npm");

  return (
    <div className="flex h-screen" style={{ background: "#0f1117", color: "#e2e8f0" }}>
      {/* 사이드바 */}
      <aside
        className="w-56 shrink-0 flex flex-col"
        style={{ background: "#141720", borderRight: "1px solid #1f2535" }}
      >
        {/* 로고 */}
        <div className="px-5 py-5" style={{ borderBottom: "1px solid #1f2535" }}>
          <h1 className="text-lg font-bold" style={{ color: "#f1f5f9" }}>⚡ MCP Store</h1>
          <p className="text-xs mt-0.5" style={{ color: "#64748b" }}>MCP 설치 관리자</p>
        </div>

        {/* 내비게이션 */}
        <nav className="flex-1 p-3 space-y-1">
          <NavItem
            icon="🏠"
            label="스토어"
            active={tab === "home" && !selectedPackage}
            onClick={() => { setTab("home"); setSelectedPackage(null); }}
          />
          <NavItem
            icon="📦"
            label="설치된 MCP"
            active={tab === "installed"}
            onClick={() => { setTab("installed"); setSelectedPackage(null); }}
          />
          <NavItem
            icon="⚙️"
            label="설정"
            active={tab === "settings"}
            onClick={() => { setTab("settings"); setSelectedPackage(null); }}
          />
        </nav>

        <div className="p-4 text-xs" style={{ color: "#374151", borderTop: "1px solid #1f2535" }}>
          v{__APP_VERSION__}
        </div>
      </aside>

      {/* 메인 */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* 업데이트 알림 배너 */}
        <UpdateNotification />
        {/* Registry 자동 업데이트 토스트 */}
        {registryToast && (
          <div
            className="flex items-center justify-between px-4 py-2 text-sm"
            style={{ background: "#0f3460", color: "#93c5fd", borderBottom: "1px solid #1e3a5f" }}
          >
            <span>✨ MCP 목록이 최신 버전으로 업데이트됐습니다</span>
            <button onClick={() => setRegistryToast(false)} style={{ color: "#64748b" }}>✕</button>
          </div>
        )}
        <div className="flex-1 overflow-y-auto">
          {selectedPackage ? (
            <Detail pkg={selectedPackage} onBack={handleBack} />
          ) : tab === "home" ? (
            <Home onSelectPackage={handleSelectPackage} />
          ) : tab === "installed" ? (
            <Installed />
          ) : (
            <Settings />
          )}
        </div>
      </main>

      {/* 의존성 미설치 모달 (앱 시작 시, 치명적인 경우만) */}
      {depsChecked && criticalMissing.length > 0 && (
        <DepsModal
          missingTools={criticalMissing}
          onClose={() => setMissingTools([])}
        />
      )}
    </div>
  );
}

function NavItem({
  icon, label, active, onClick,
}: {
  icon: string; label: string; active: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-colors"
      style={{
        background: active ? "#1e2d4d" : "transparent",
        color:      active ? "#60a5fa" : "#94a3b8",
      }}
    >
      <span>{icon}</span>
      {label}
    </button>
  );
}
