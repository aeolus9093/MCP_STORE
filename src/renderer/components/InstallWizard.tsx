// =============================================================
// renderer/components/InstallWizard.tsx — 설치 마법사
// Phase 3: 설치 실패 자동 1회 재시도 + 재시도 버튼 추가
// =============================================================

import { useState, useEffect, useRef } from "react";
import { MCPPackage, Client, EnvVar } from "../../shared/types";
import { useAppStore } from "../store/appStore";
import InstallButton  from "./InstallButton";
import EnvVarInput    from "./EnvVarInput";
import LogViewer      from "./LogViewer";

const CLIENT_LABELS: Record<Client, string> = {
  "claude-desktop": "Claude Desktop",
  cursor:           "Cursor",
  windsurf:         "Windsurf",
  "claude-code":    "Claude Code",
  vscode:           "VS Code",
  zed:              "Zed",
};

interface InstallWizardProps {
  pkg: MCPPackage;
}

export default function InstallWizard({ pkg }: InstallWizardProps) {
  const {
    installStates, installed,
    setInstallStatus, appendLog, clearLogs,
  } = useAppStore();

  const state = installStates[pkg.id] ?? { status: "idle", logs: [] };

  // 다중 클라이언트 선택 (기본: 첫 번째 지원 클라이언트)
  const [selectedClients, setSelectedClients] = useState<Set<Client>>(
    () => new Set(pkg.supportedClients.slice(0, 1))
  );

  const [envValues, setEnvValues] = useState<Record<string, string>>(
    () => Object.fromEntries(pkg.requiredEnvVars.map((v: EnvVar) => [v.name, ""]))
  );

  // 자동 재시도: 실패 후 1회만 자동 재시도
  const autoRetried = useRef(false);

  useEffect(() => {
    if (!window.mcpStore) return;
    window.mcpStore.onLog(({ packageId, line }) => {
      if (packageId === pkg.id) appendLog(pkg.id, line);
    });
    return () => window.mcpStore?.offLog();
  }, [pkg.id, appendLog]);

  // 자동 재시도 트리거
  useEffect(() => {
    if (state.status === "error" && !autoRetried.current) {
      autoRetried.current = true;
      const timer = setTimeout(() => {
        appendLog(pkg.id, "⟳ 자동 재시도 중...");
        doInstall(/* isRetry */ true);
      }, 2000);
      return () => clearTimeout(timer);
    }
    if (state.status === "success" || state.status === "idle") {
      autoRetried.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.status]);

  const toggleClient = (client: Client) => {
    setSelectedClients((prev) => {
      const next = new Set(prev);
      if (next.has(client)) {
        if (next.size > 1) next.delete(client);
      } else {
        next.add(client);
      }
      return next;
    });
  };

  const handleEnvChange = (name: string, value: string) => {
    setEnvValues((prev) => ({ ...prev, [name]: value }));
  };

  const doInstall = async (isRetry = false) => {
    if (!window.mcpStore) return;

    const missing = pkg.requiredEnvVars
      .filter((v: EnvVar) => v.required && !envValues[v.name]?.trim())
      .map((v: EnvVar) => v.name);
    if (missing.length > 0 && !isRetry) {
      alert(`필수 값을 입력해주세요: ${missing.join(", ")}`);
      return;
    }

    if (!isRetry) clearLogs(pkg.id);
    setInstallStatus(pkg.id, "installing");

    try {
      const result = await window.mcpStore.install({
        packageId: pkg.id,
        clients:   [...selectedClients],
        envVars:   envValues,
      });
      if (result.success) {
        autoRetried.current = false;
      }
      setInstallStatus(pkg.id, result.success ? "success" : "error", result.error);
    } catch (e) {
      setInstallStatus(pkg.id, "error", (e as Error).message);
    }
  };

  const handleInstall = () => doInstall(false);

  const handleManualRetry = () => {
    autoRetried.current = true; // 수동 재시도이므로 자동 재시도 방지
    appendLog(pkg.id, "⟳ 수동 재시도...");
    doInstall(true);
  };

  const installedClients = installed
    .filter((i) => i.packageId === pkg.id)
    .map((i) => i.client);

  const allSelectedInstalled =
    installedClients.length > 0 &&
    [...selectedClients].every((c) => installedClients.includes(c));

  return (
    <div className="space-y-5">
      {/* 클라이언트 다중 선택 */}
      <div>
        <p className="text-sm font-medium mb-2" style={{ color: "#cbd5e1" }}>
          설치할 클라이언트 <span className="text-xs font-normal" style={{ color: "#475569" }}>(복수 선택 가능)</span>
        </p>
        <div className="flex gap-2 flex-wrap">
          {pkg.supportedClients.map((c) => {
            const isSelected  = selectedClients.has(c);
            const isInstalled = installedClients.includes(c);
            return (
              <button
                key={c}
                onClick={() => toggleClient(c)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                style={{
                  background: isSelected ? "#1e3a5f" : "#141720",
                  border:     isSelected ? "1px solid #3b82f6" : "1px solid #1f2535",
                  color:      isSelected ? "#60a5fa" : "#94a3b8",
                }}
              >
                {isSelected ? "☑" : "☐"}
                {CLIENT_LABELS[c]}
                {isInstalled && (
                  <span className="text-xs" style={{ color: "#34d399" }}>✓</span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* 환경 변수 */}
      {pkg.requiredEnvVars.length > 0 && (
        <div className="space-y-4">
          <p className="text-sm font-medium" style={{ color: "#cbd5e1" }}>필요한 설정값</p>
          {pkg.requiredEnvVars.map((v: EnvVar) => (
            <EnvVarInput
              key={v.name}
              envVar={v}
              value={envValues[v.name] ?? ""}
              onChange={handleEnvChange}
            />
          ))}
        </div>
      )}

      {/* 설치 버튼 */}
      <InstallButton
        status={state.status}
        isInstalled={allSelectedInstalled}
        onClick={handleInstall}
      />

      {/* 실패 시: 수동 재시도 버튼 + 안내 */}
      {state.status === "error" && (
        <div
          className="flex items-center justify-between rounded-xl px-4 py-3"
          style={{ background: "#2d1a1a", border: "1px solid #7f1d1d" }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: "#fca5a5" }}>설치 실패</p>
            {state.error && (
              <p className="text-xs mt-0.5" style={{ color: "#f87171" }}>{state.error}</p>
            )}
            <p className="text-xs mt-1" style={{ color: "#64748b" }}>
              자동 재시도를 1회 시도합니다. 계속 실패하면 수동으로 재시도하세요.
            </p>
          </div>
          <button
            onClick={handleManualRetry}
            className="shrink-0 ml-4 px-3 py-1.5 rounded-lg text-sm font-semibold"
            style={{ background: "#7f1d1d", color: "#fca5a5" }}
          >
            재시도
          </button>
        </div>
      )}

      {/* 선택된 클라이언트 확인 */}
      {selectedClients.size > 1 && (
        <p className="text-xs" style={{ color: "#475569" }}>
          선택된 클라이언트: {[...selectedClients].map((c) => CLIENT_LABELS[c]).join(", ")}에 동시 설치됩니다.
        </p>
      )}

      {/* 로그 뷰어 */}
      <LogViewer
        logs={state.logs}
        onClear={() => clearLogs(pkg.id)}
      />
    </div>
  );
}
