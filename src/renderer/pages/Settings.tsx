// =============================================================
// renderer/pages/Settings.tsx — 설정 / 백업 / Phase 5 확장
// Claude API Key 입력 + Auto Sync 토글 + GitHub 동기화 섹션
// =============================================================

import { useState, useEffect } from "react";
import { AppSettings } from "../../shared/types";

type Status = "idle" | "loading" | "success" | "error";

interface ActionCardProps {
  icon:        string;
  title:       string;
  description: string;
  buttonLabel: string;
  status:      Status;
  message?:    string;
  onClick:     () => void;
}

function ActionCard({ icon, title, description, buttonLabel, status, message, onClick }: ActionCardProps) {
  const isLoading = status === "loading";
  return (
    <div
      className="rounded-2xl p-5 flex items-start gap-4"
      style={{ background: "#141720", border: "1px solid #1f2535" }}
    >
      <span className="text-2xl shrink-0">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className="font-semibold mb-1" style={{ color: "#f1f5f9" }}>{title}</p>
        <p className="text-sm" style={{ color: "#64748b" }}>{description}</p>
        {status === "success" && (
          <p className="text-xs mt-2" style={{ color: "#34d399" }}>
            ✓ {message ?? "완료되었습니다."}
          </p>
        )}
        {status === "error" && (
          <p className="text-xs mt-2" style={{ color: "#f87171" }}>
            {message ?? "오류가 발생했습니다. 다시 시도해주세요."}
          </p>
        )}
      </div>
      <button
        onClick={onClick}
        disabled={isLoading}
        className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold transition-colors"
        style={{
          background: isLoading ? "#1f2535" : "#2563eb",
          color:      isLoading ? "#475569" : "#fff",
          cursor:     isLoading ? "not-allowed" : "pointer",
        }}
      >
        {isLoading ? "처리 중…" : buttonLabel}
      </button>
    </div>
  );
}

export default function Settings() {
  const [exportStatus, setExportStatus] = useState<Status>("idle");
  const [importStatus, setImportStatus] = useState<Status>("idle");
  const [importMsg,    setImportMsg]    = useState("");

  // GitHub 동기화 상태
  const [syncStatus,   setSyncStatus]   = useState<Status>("idle");
  const [syncMsg,      setSyncMsg]      = useState("");
  const [lastSyncedAt, setLastSyncedAt] = useState<string>("");

  // Phase 5: Settings 상태
  const [apiKey,           setApiKey]           = useState("");
  const [apiKeyVisible,    setApiKeyVisible]     = useState(false);
  const [autoSyncEnabled,  setAutoSyncEnabled]  = useState(true);
  const [settingsStatus,   setSettingsStatus]   = useState<Status>("idle");
  const [settingsMsg,      setSettingsMsg]      = useState("");

  // Phase 5: 메타데이터 갱신 상태
  const [metaStatus, setMetaStatus] = useState<Status>("idle");
  const [metaMsg,    setMetaMsg]    = useState("");

  // 앱 시작 시 settings + 동기화 캐시 로드
  useEffect(() => {
    if (!window.mcpStore) return;
    (async () => {
      try {
        const [cacheResult, settingsResult] = await Promise.all([
          window.mcpStore!.githubSyncCache(),
          window.mcpStore!.getSettings(),
        ]);
        if (cacheResult.success && cacheResult.data?.lastSyncedAt) {
          setLastSyncedAt(cacheResult.data.lastSyncedAt);
        }
        if (settingsResult.success && settingsResult.data) {
          const s = settingsResult.data as AppSettings;
          setApiKey(s.claudeApiKey ?? "");
          setAutoSyncEnabled(s.autoSyncEnabled ?? true);
        }
      } catch {}
    })();
  }, []);

  const handleSaveSettings = async () => {
    if (!window.mcpStore) return;
    setSettingsStatus("loading");
    try {
      const result = await window.mcpStore.setSettings({
        claudeApiKey:    apiKey.trim(),
        autoSyncEnabled,
      } as AppSettings);
      if (result.success) {
        setSettingsStatus("success");
        setSettingsMsg("설정이 저장되었습니다.");
      } else {
        setSettingsStatus("error");
        setSettingsMsg(result.error ?? "저장 실패");
      }
    } catch (err) {
      setSettingsStatus("error");
      setSettingsMsg((err as Error).message);
    }
    setTimeout(() => { setSettingsStatus("idle"); setSettingsMsg(""); }, 3000);
  };

  const handleExport = async () => {
    if (!window.mcpStore) return;
    setExportStatus("loading");
    try {
      const result = await window.mcpStore.exportBackup();
      if (!result.success || !result.data) {
        setExportStatus("error");
        return;
      }
      const date     = new Date().toISOString().slice(0, 10);
      const filename = `mcp-store-backup-${date}.json`;
      const blob     = new Blob([result.data], { type: "application/json" });
      const url      = URL.createObjectURL(blob);
      const a        = document.createElement("a");
      a.href         = url;
      a.download     = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setExportStatus("success");
    } catch {
      setExportStatus("error");
    }
    setTimeout(() => setExportStatus("idle"), 3000);
  };

  const handleImport = async () => {
    if (!window.mcpStore) return;
    const input    = document.createElement("input");
    input.type     = "file";
    input.accept   = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;
      setImportStatus("loading");
      try {
        const text   = await file.text();
        const result = await window.mcpStore!.importBackup(text);
        if (result.success) {
          setImportStatus("success");
          setImportMsg(`'${file.name}' 백업을 복원했습니다.`);
        } else {
          setImportStatus("error");
          setImportMsg(result.error ?? "알 수 없는 오류");
        }
      } catch (err) {
        setImportStatus("error");
        setImportMsg((err as Error).message);
      }
      setTimeout(() => { setImportStatus("idle"); setImportMsg(""); }, 4000);
    };
    input.click();
  };

  const handleGitHubSync = async () => {
    if (!window.mcpStore) return;
    setSyncStatus("loading");
    setSyncMsg("");
    try {
      const result = await window.mcpStore.githubSync();
      if (result.success && result.data) {
        const { newPackageNames, totalInRepo, lastSyncedAt: syncedAt } = result.data;
        setLastSyncedAt(syncedAt);
        if (newPackageNames.length > 0) {
          setSyncMsg(
            `저장소에서 ${totalInRepo}개 발견. 신규 감지: ${newPackageNames.slice(0, 5).join(", ")}${newPackageNames.length > 5 ? ` 외 ${newPackageNames.length - 5}개` : ""}`
          );
        } else {
          setSyncMsg(`저장소에서 ${totalInRepo}개 확인. 신규 MCP 없음.`);
        }
        setSyncStatus("success");
      } else {
        setSyncMsg(result.error ?? "동기화 실패");
        setSyncStatus("error");
      }
    } catch (err) {
      setSyncMsg((err as Error).message);
      setSyncStatus("error");
    }
    setTimeout(() => { setSyncStatus("idle"); setSyncMsg(""); }, 5000);
  };

  const handleMetadataRefresh = async () => {
    if (!window.mcpStore) return;
    setMetaStatus("loading");
    setMetaMsg("");
    try {
      const result = await window.mcpStore.refreshMetadata();
      if (result.success) {
        const count = Object.keys((result.data as Record<string, unknown>) ?? {}).length;
        setMetaStatus("success");
        setMetaMsg(`${count}개 MCP 메타데이터 갱신 완료`);
      } else {
        setMetaStatus("error");
        setMetaMsg(result.error ?? "갱신 실패");
      }
    } catch (err) {
      setMetaStatus("error");
      setMetaMsg((err as Error).message);
    }
    setTimeout(() => { setMetaStatus("idle"); setMetaMsg(""); }, 4000);
  };

  const handleSubmitMCP = () => {
    const prUrl =
      "https://github.com/modelcontextprotocol/servers/issues/new?template=new-server.yml";
    window.open(prUrl, "_blank", "noreferrer");
  };

  return (
    <div className="p-6 space-y-6 max-w-2xl">
      {/* 헤더 */}
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>설정</h2>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          MCP Store 설정 관리
        </p>
      </div>

      {/* Phase 5: Claude API Key 섹션 */}
      <section>
        <h3 className="text-base font-semibold mb-3" style={{ color: "#cbd5e1" }}>
          Claude API 설정
        </h3>
        <div
          className="rounded-2xl p-5 space-y-4"
          style={{ background: "#141720", border: "1px solid #1f2535" }}
        >
          <div>
            <label className="block text-sm font-medium mb-1" style={{ color: "#94a3b8" }}>
              API Key
            </label>
            <p className="text-xs mb-2" style={{ color: "#475569" }}>
              신규 MCP README 자동 요약에 사용됩니다. 선택 사항이며
              <code className="mx-1 px-1 rounded" style={{ background: "#0a0c14", color: "#60a5fa" }}>
                ~/.mcp-store/settings.json
              </code>
              에 저장됩니다.
            </p>
            <div className="flex gap-2">
              <input
                type={apiKeyVisible ? "text" : "password"}
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="sk-ant-..."
                className="flex-1 px-3 py-2 rounded-xl text-sm font-mono"
                style={{
                  background:  "#0a0c14",
                  border:      "1px solid #1f2535",
                  color:       "#f1f5f9",
                  outline:     "none",
                }}
              />
              <button
                onClick={() => setApiKeyVisible((v) => !v)}
                className="px-3 py-2 rounded-xl text-sm"
                style={{
                  background: "#1f2535",
                  color:      "#94a3b8",
                  cursor:     "pointer",
                }}
              >
                {apiKeyVisible ? "숨기기" : "보기"}
              </button>
            </div>
          </div>

          {/* Auto Sync 토글 */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-sm font-medium" style={{ color: "#94a3b8" }}>
                Auto Sync (6시간 주기)
              </p>
              <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                앱 시작 시 + 6시간마다 modelcontextprotocol/servers를 자동 폴링합니다.
              </p>
            </div>
            <button
              onClick={() => setAutoSyncEnabled((v) => !v)}
              className="shrink-0 w-11 h-6 rounded-full relative transition-colors"
              style={{
                background: autoSyncEnabled ? "#2563eb" : "#1f2535",
                cursor: "pointer",
              }}
              aria-label="Auto Sync 토글"
            >
              <span
                className="absolute top-0.5 w-5 h-5 rounded-full transition-transform"
                style={{
                  background: autoSyncEnabled ? "#fff" : "#64748b",
                  transform:  autoSyncEnabled ? "translateX(22px)" : "translateX(2px)",
                }}
              />
            </button>
          </div>

          {/* 저장 버튼 */}
          <div className="flex items-center gap-3 pt-1">
            <button
              onClick={handleSaveSettings}
              disabled={settingsStatus === "loading"}
              className="px-5 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: settingsStatus === "loading" ? "#1f2535" : "#2563eb",
                color:      settingsStatus === "loading" ? "#475569" : "#fff",
                cursor:     settingsStatus === "loading" ? "not-allowed" : "pointer",
              }}
            >
              {settingsStatus === "loading" ? "저장 중…" : "저장"}
            </button>
            {settingsStatus === "success" && (
              <span className="text-xs" style={{ color: "#34d399" }}>✓ {settingsMsg}</span>
            )}
            {settingsStatus === "error" && (
              <span className="text-xs" style={{ color: "#f87171" }}>{settingsMsg}</span>
            )}
          </div>
        </div>
      </section>

      {/* GitHub 동기화 섹션 */}
      <section>
        <h3 className="text-base font-semibold mb-3" style={{ color: "#cbd5e1" }}>
          GitHub 동기화
        </h3>
        <div className="space-y-3">
          {/* 레지스트리 동기화 */}
          <div
            className="rounded-2xl p-5 flex items-start gap-4"
            style={{ background: "#141720", border: "1px solid #1f2535" }}
          >
            <span className="text-2xl shrink-0">🔄</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-1" style={{ color: "#f1f5f9" }}>레지스트리 동기화</p>
              <p className="text-sm" style={{ color: "#64748b" }}>
                modelcontextprotocol/servers 저장소를 폴링해서 신규 MCP를 감지합니다.
                ETag Conditional Request로 API rate limit을 절약합니다.
              </p>
              {lastSyncedAt && (
                <p className="text-xs mt-1" style={{ color: "#475569" }}>
                  마지막 동기화: {new Date(lastSyncedAt).toLocaleString("ko-KR")}
                </p>
              )}
              {syncStatus === "success" && syncMsg && (
                <p className="text-xs mt-2" style={{ color: "#34d399" }}>✓ {syncMsg}</p>
              )}
              {syncStatus === "error" && syncMsg && (
                <p className="text-xs mt-2" style={{ color: "#f87171" }}>{syncMsg}</p>
              )}
            </div>
            <button
              onClick={handleGitHubSync}
              disabled={syncStatus === "loading"}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: syncStatus === "loading" ? "#1f2535" : "#2563eb",
                color:      syncStatus === "loading" ? "#475569" : "#fff",
                cursor:     syncStatus === "loading" ? "not-allowed" : "pointer",
              }}
            >
              {syncStatus === "loading" ? "동기화 중…" : "동기화"}
            </button>
          </div>

          {/* 메타데이터 갱신 */}
          <div
            className="rounded-2xl p-5 flex items-start gap-4"
            style={{ background: "#141720", border: "1px solid #1f2535" }}
          >
            <span className="text-2xl shrink-0">⭐</span>
            <div className="flex-1 min-w-0">
              <p className="font-semibold mb-1" style={{ color: "#f1f5f9" }}>설치 MCP 메타데이터 갱신</p>
              <p className="text-sm" style={{ color: "#64748b" }}>
                설치된 MCP의 GitHub stars와 마지막 업데이트를 최신 정보로 갱신합니다.
              </p>
              {metaStatus === "success" && metaMsg && (
                <p className="text-xs mt-2" style={{ color: "#34d399" }}>✓ {metaMsg}</p>
              )}
              {metaStatus === "error" && metaMsg && (
                <p className="text-xs mt-2" style={{ color: "#f87171" }}>{metaMsg}</p>
              )}
            </div>
            <button
              onClick={handleMetadataRefresh}
              disabled={metaStatus === "loading"}
              className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold"
              style={{
                background: metaStatus === "loading" ? "#1f2535" : "#2563eb",
                color:      metaStatus === "loading" ? "#475569" : "#fff",
                cursor:     metaStatus === "loading" ? "not-allowed" : "pointer",
              }}
            >
              {metaStatus === "loading" ? "갱신 중…" : "갱신"}
            </button>
          </div>
        </div>
      </section>

      {/* 커뮤니티 MCP 제출 */}
      <section>
        <h3 className="text-base font-semibold mb-3" style={{ color: "#cbd5e1" }}>
          커뮤니티 기여
        </h3>
        <div
          className="rounded-2xl p-5 flex items-start gap-4"
          style={{ background: "#141720", border: "1px solid #1f2535" }}
        >
          <span className="text-2xl shrink-0">📝</span>
          <div className="flex-1 min-w-0">
            <p className="font-semibold mb-1" style={{ color: "#f1f5f9" }}>MCP 제출</p>
            <p className="text-sm" style={{ color: "#64748b" }}>
              새로운 MCP 서버를 커뮤니티에 제출합니다.
              GitHub Issue 템플릿이 열립니다.
            </p>
            <p className="text-xs mt-1" style={{ color: "#475569" }}>
              CONTRIBUTING.md를 먼저 읽어보세요.
            </p>
          </div>
          <button
            onClick={handleSubmitMCP}
            className="shrink-0 px-4 py-2 rounded-xl text-sm font-semibold"
            style={{ background: "#2563eb", color: "#fff" }}
          >
            Submit MCP
          </button>
        </div>
      </section>

      {/* 백업 섹션 */}
      <section>
        <h3 className="text-base font-semibold mb-3" style={{ color: "#cbd5e1" }}>
          백업 / 복원
        </h3>
        <div className="space-y-3">
          <ActionCard
            icon="📤"
            title="설정 내보내기"
            description="설치된 MCP 목록과 모든 클라이언트 설정 파일을 JSON 파일로 내보냅니다."
            buttonLabel="내보내기"
            status={exportStatus}
            onClick={handleExport}
          />
          <ActionCard
            icon="📥"
            title="설정 가져오기"
            description="이전에 내보낸 백업 파일에서 설정을 복원합니다. 기존 설정을 덮어씁니다."
            buttonLabel="파일 선택"
            status={importStatus}
            message={importMsg || undefined}
            onClick={handleImport}
          />
        </div>
      </section>

      {/* 저장 경로 안내 */}
      <section
        className="rounded-xl p-4"
        style={{ background: "#0a0c14", border: "1px solid #1f2535" }}
      >
        <p className="text-xs font-semibold mb-2" style={{ color: "#475569" }}>데이터 저장 경로</p>
        <div className="space-y-1">
          <p className="text-xs font-mono" style={{ color: "#64748b" }}>
            설치 목록: <span style={{ color: "#94a3b8" }}>~/.mcp-store/installed.json</span>
          </p>
          <p className="text-xs font-mono" style={{ color: "#64748b" }}>
            앱 설정: <span style={{ color: "#94a3b8" }}>~/.mcp-store/settings.json</span>
          </p>
          <p className="text-xs font-mono" style={{ color: "#64748b" }}>
            생성된 설명: <span style={{ color: "#94a3b8" }}>~/.mcp-store/generated-descriptions.json</span>
          </p>
          <p className="text-xs font-mono" style={{ color: "#64748b" }}>
            메타데이터: <span style={{ color: "#94a3b8" }}>~/.mcp-store/metadata-cache.json</span>
          </p>
          <p className="text-xs font-mono" style={{ color: "#64748b" }}>
            검색 히스토리: <span style={{ color: "#94a3b8" }}>~/.mcp-store/search-history.json</span>
          </p>
          <p className="text-xs font-mono" style={{ color: "#64748b" }}>
            GitHub 캐시: <span style={{ color: "#94a3b8" }}>~/.mcp-store/sync-cache.json</span>
          </p>
          <p className="text-xs font-mono" style={{ color: "#64748b" }}>
            Claude Desktop: <span style={{ color: "#94a3b8" }}>%APPDATA%/Claude/claude_desktop_config.json</span>
          </p>
          <p className="text-xs font-mono" style={{ color: "#64748b" }}>
            Claude Code: <span style={{ color: "#94a3b8" }}>~/.claude.json</span>
          </p>
        </div>
      </section>

      {/* 앱 정보 */}
      <section>
        <h3 className="text-base font-semibold mb-3" style={{ color: "#cbd5e1" }}>앱 정보</h3>
        <div
          className="rounded-xl p-4 space-y-2"
          style={{ background: "#141720", border: "1px solid #1f2535" }}
        >
          <div className="flex justify-between text-sm">
            <span style={{ color: "#64748b" }}>버전</span>
            <span style={{ color: "#94a3b8" }}>v0.5.0 Phase 5</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#64748b" }}>MCP 목록</span>
            <span style={{ color: "#94a3b8" }}>100개</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#64748b" }}>지원 클라이언트</span>
            <span style={{ color: "#94a3b8" }}>Claude Desktop, Cursor, Windsurf, Claude Code, VS Code, Zed</span>
          </div>
          <div className="flex justify-between text-sm">
            <span style={{ color: "#64748b" }}>Phase 5 기능</span>
            <span style={{ color: "#60a5fa" }}>Auto Sync, LLM 설명 생성, Config Watcher, 메타데이터 갱신</span>
          </div>
        </div>
      </section>
    </div>
  );
}
