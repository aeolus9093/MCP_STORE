// =============================================================
// renderer/components/UpdateNotification.tsx
// 자동 업데이트 알림 배너 (상태: checking / available / downloading / ready / error)
// =============================================================

import { useState, useEffect } from "react";

// ──────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────

type UpdateStatus =
  | "idle"
  | "checking"
  | "available"
  | "not-available"
  | "downloading"
  | "ready"
  | "error";

interface UpdateState {
  status:   UpdateStatus;
  version?: string;
  notes?:   string | object;
  percent?: number;
  message?: string;
}

// ──────────────────────────────────────────────
// 컴포넌트
// ──────────────────────────────────────────────

export default function UpdateNotification() {
  const [update,    setUpdate]    = useState<UpdateState>({ status: "idle" });
  const [dismissed, setDismissed] = useState(false);
  const [working,   setWorking]   = useState(false);

  // Main 프로세스에서 UPDATE_STATUS 이벤트 수신
  useEffect(() => {
    if (!window.mcpStore) return;

    window.mcpStore.onUpdateStatus((payload: UpdateState) => {
      setUpdate(payload);
      setDismissed(false); // 새 상태가 오면 dismiss 리셋
    });

    // 앱 시작 시 업데이트 확인 (30초 후 main에서 자동 체크하지만 사용자가 먼저도 가능)
    return () => {
      window.mcpStore?.offUpdateStatus?.();
    };
  }, []);

  // 숨김 조건: idle / not-available / dismissed
  if (dismissed) return null;
  if (update.status === "idle" || update.status === "not-available") return null;

  // ── 핸들러 ────────────────────────────────────

  async function handleDownload() {
    if (!window.mcpStore) return;
    setWorking(true);
    try {
      await window.mcpStore.updateDownload();
    } finally {
      setWorking(false);
    }
  }

  async function handleInstall() {
    if (!window.mcpStore) return;
    await window.mcpStore.updateInstall();
  }

  // ── 배너 내용 분기 ────────────────────────────

  const bannerContent = () => {
    switch (update.status) {
      case "checking":
        return (
          <span className="text-sm" style={{ color: "#94a3b8" }}>
            업데이트 확인 중...
          </span>
        );

      case "available":
        return (
          <div className="flex items-center gap-4 flex-1">
            <span className="text-sm" style={{ color: "#f1f5f9" }}>
              새 버전 <strong style={{ color: "#60a5fa" }}>v{update.version}</strong> 이 출시되었습니다.
            </span>
            <button
              onClick={handleDownload}
              disabled={working}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: "#2563eb", color: "#fff" }}
            >
              {working ? "준비 중..." : "다운로드"}
            </button>
          </div>
        );

      case "downloading":
        return (
          <div className="flex items-center gap-3 flex-1">
            <span className="text-sm" style={{ color: "#f1f5f9" }}>
              업데이트 다운로드 중...
            </span>
            <div className="flex-1 max-w-48 rounded-full overflow-hidden" style={{ background: "#1e2d4d", height: 6 }}>
              <div
                className="h-full rounded-full transition-all"
                style={{ width: `${update.percent ?? 0}%`, background: "#3b82f6" }}
              />
            </div>
            <span className="text-xs" style={{ color: "#64748b" }}>
              {update.percent ?? 0}%
            </span>
          </div>
        );

      case "ready":
        return (
          <div className="flex items-center gap-4 flex-1">
            <span className="text-sm" style={{ color: "#f1f5f9" }}>
              업데이트 준비 완료 — <strong style={{ color: "#34d399" }}>v{update.version}</strong>
            </span>
            <button
              onClick={handleInstall}
              className="px-3 py-1 rounded-lg text-xs font-semibold transition-colors"
              style={{ background: "#059669", color: "#fff" }}
            >
              지금 재시작하여 설치
            </button>
          </div>
        );

      case "error":
        return (
          <span className="text-sm" style={{ color: "#f87171" }}>
            업데이트 오류: {update.message}
          </span>
        );

      default:
        return null;
    }
  };

  const bgColor =
    update.status === "error"   ? "#2d1a1a" :
    update.status === "ready"   ? "#0f2d20" :
    "#141c2e";

  const borderColor =
    update.status === "error"   ? "#7f1d1d" :
    update.status === "ready"   ? "#065f46" :
    "#1e3a5f";

  return (
    <div
      className="flex items-center gap-3 px-4 py-2.5"
      style={{
        background:   bgColor,
        borderBottom: `1px solid ${borderColor}`,
        minHeight:    42,
      }}
    >
      {/* 아이콘 */}
      <span className="text-base shrink-0">
        {update.status === "error"   ? "⚠️" :
         update.status === "ready"   ? "✅" :
         update.status === "downloading" ? "⬇️" : "🔔"}
      </span>

      {/* 내용 */}
      <div className="flex-1 flex items-center">
        {bannerContent()}
      </div>

      {/* 닫기 버튼 (downloading 중에는 숨김) */}
      {update.status !== "downloading" && (
        <button
          onClick={() => setDismissed(true)}
          className="text-xs px-1 py-0.5 rounded transition-colors"
          style={{ color: "#64748b" }}
          title="닫기"
        >
          ✕
        </button>
      )}
    </div>
  );
}
