// =============================================================
// renderer/pages/Installed.tsx — 설치된 MCP 목록 (다크테마)
// 업데이트 알림 배지 포함
// =============================================================

import { useEffect, useState } from "react";
import { useAppStore }  from "../store/appStore";
import { InstalledMCP } from "../../shared/types";

const CLIENT_LABELS: Record<string, string> = {
  "claude-desktop": "Claude Desktop",
  cursor:           "Cursor",
  windsurf:         "Windsurf",
  "claude-code":    "Claude Code",
  vscode:           "VS Code",
  zed:              "Zed",
};

interface RemoveModalProps {
  item:      InstalledMCP;
  onConfirm: () => void;
  onCancel:  () => void;
}

function RemoveModal({ item, onConfirm, onCancel }: RemoveModalProps) {
  return (
    <div className="fixed inset-0 flex items-center justify-center z-50" style={{ background: "rgba(0,0,0,0.6)" }}>
      <div className="rounded-2xl p-6 w-80 shadow-xl" style={{ background: "#141720", border: "1px solid #1f2535" }}>
        <h3 className="font-bold mb-2" style={{ color: "#f1f5f9" }}>MCP 제거</h3>
        <p className="text-sm mb-4" style={{ color: "#64748b" }}>
          <span className="font-semibold" style={{ color: "#cbd5e1" }}>{item.packageId}</span>를{" "}
          {CLIENT_LABELS[item.client] ?? item.client}에서 제거하시겠습니까?
        </p>
        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 py-2 rounded-lg text-sm"
            style={{ background: "#1f2535", color: "#94a3b8", border: "1px solid #2d3748" }}
          >
            취소
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 py-2 rounded-lg text-sm font-semibold"
            style={{ background: "#7f1d1d", color: "#fca5a5" }}
          >
            제거
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Installed() {
  const {
    installed, setInstalled,
    updatablePackages, setUpdatablePackages,
    updateInstalledToggle, removeFromInstalled,
  } = useAppStore();

  const [removeTarget, setRemoveTarget] = useState<InstalledMCP | null>(null);

  useEffect(() => {
    if (!window.mcpStore) return;
    (async () => {
      const result = await window.mcpStore!.getInstalled();
      if (result.success && result.data) setInstalled(result.data);

      // 업데이트 가능 목록 확인
      const updResult = await window.mcpStore!.checkUpdates();
      if (updResult.success && updResult.data) setUpdatablePackages(updResult.data);
    })();
  }, [setInstalled, setUpdatablePackages]);

  const handleToggle = async (item: InstalledMCP) => {
    const newActive = !item.isActive;
    updateInstalledToggle(item.packageId, item.client, newActive);
    await window.mcpStore?.toggleMcp({ packageId: item.packageId, client: item.client, isActive: newActive });
  };

  const handleRemoveConfirm = async () => {
    if (!removeTarget) return;
    await window.mcpStore?.removeInstalled({ packageId: removeTarget.packageId, client: removeTarget.client });
    removeFromInstalled(removeTarget.packageId, removeTarget.client);
    setRemoveTarget(null);
  };

  return (
    <div className="p-6 space-y-5">
      <div>
        <h2 className="text-2xl font-bold" style={{ color: "#f1f5f9" }}>설치된 MCP</h2>
        <p className="text-sm mt-1" style={{ color: "#64748b" }}>
          {installed.length}개 설치됨
          {updatablePackages.length > 0 && (
            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: "#1a2d4e", color: "#60a5fa" }}>
              업데이트 {updatablePackages.length}개
            </span>
          )}
        </p>
      </div>

      {installed.length === 0 ? (
        <div className="text-center py-16" style={{ color: "#475569" }}>
          <p className="text-4xl mb-3">📭</p>
          <p>설치된 MCP가 없습니다.</p>
          <p className="text-sm mt-1" style={{ color: "#374151" }}>
            스토어에서 MCP를 설치해보세요.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {installed.map((item) => {
            const hasUpdate = updatablePackages.includes(item.packageId);
            return (
              <div
                key={`${item.packageId}-${item.client}`}
                className="rounded-2xl p-4 flex items-center justify-between gap-4"
                style={{
                  background: "#141720",
                  border: hasUpdate ? "1px solid #1e3a5f" : "1px solid #1f2535",
                }}
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold truncate" style={{ color: "#f1f5f9" }}>
                      {item.packageId}
                    </p>
                    {hasUpdate && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-bold shrink-0"
                        style={{ background: "#1a2d4e", color: "#60a5fa" }}
                      >
                        업데이트 가능
                      </span>
                    )}
                    {!item.isActive && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium shrink-0"
                        style={{ background: "#1f2535", color: "#475569" }}
                      >
                        비활성
                      </span>
                    )}
                  </div>
                  <p className="text-xs mt-0.5" style={{ color: "#475569" }}>
                    {CLIENT_LABELS[item.client] ?? item.client} •{" "}
                    {new Date(item.installedAt).toLocaleDateString("ko-KR")}
                  </p>
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {/* 토글 */}
                  <button
                    onClick={() => handleToggle(item)}
                    className="relative w-11 h-6 rounded-full transition-colors"
                    style={{ background: item.isActive ? "#2563eb" : "#1f2535" }}
                    title={item.isActive ? "비활성화" : "활성화"}
                  >
                    <span
                      className="absolute top-1 left-1 w-4 h-4 rounded-full shadow transition-transform"
                      style={{
                        background: "#fff",
                        transform:  item.isActive ? "translateX(20px)" : "translateX(0)",
                      }}
                    />
                  </button>

                  {/* 제거 버튼 */}
                  <button
                    onClick={() => setRemoveTarget(item)}
                    className="text-lg transition-colors"
                    style={{ color: "#374151" }}
                    onMouseEnter={(e) => ((e.target as HTMLElement).style.color = "#f87171")}
                    onMouseLeave={(e) => ((e.target as HTMLElement).style.color = "#374151")}
                    title="제거"
                  >
                    ×
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {removeTarget && (
        <RemoveModal
          item={removeTarget}
          onConfirm={handleRemoveConfirm}
          onCancel={() => setRemoveTarget(null)}
        />
      )}
    </div>
  );
}
