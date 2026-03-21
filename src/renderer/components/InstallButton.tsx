// =============================================================
// renderer/components/InstallButton.tsx — 설치 상태별 버튼 (다크테마)
// idle / installing / success / error
// =============================================================

import { InstallStatus } from "../../shared/types";

interface InstallButtonProps {
  status:      InstallStatus;
  isInstalled: boolean;
  onClick:     () => void;
  disabled?:   boolean;
}

const STATE_STYLES: Record<InstallStatus, { bg: string; color: string; label: string }> = {
  idle:       { bg: "#2563eb", color: "#fff",     label: "설치" },
  installing: { bg: "#1d4ed8", color: "#93c5fd",  label: "설치 중…" },
  success:    { bg: "#065f46", color: "#6ee7b7",  label: "설치 완료 ✓" },
  error:      { bg: "#7f1d1d", color: "#fca5a5",  label: "다시 시도" },
};

export default function InstallButton({
  status,
  isInstalled,
  onClick,
  disabled = false,
}: InstallButtonProps) {
  const s          = STATE_STYLES[status];
  const isDisabled = disabled || status === "installing";
  const label      = isInstalled && status === "idle" ? "재설치" : s.label;

  return (
    <button
      onClick={onClick}
      disabled={isDisabled}
      className="w-full py-2.5 rounded-xl font-semibold text-sm transition-colors"
      style={{
        background: s.bg,
        color:      s.color,
        opacity:    isDisabled ? 0.5 : 1,
        cursor:     isDisabled ? "not-allowed" : "pointer",
      }}
    >
      {status === "installing" && (
        <span
          className="inline-block w-3 h-3 rounded-full border-2 border-t-transparent animate-spin mr-2"
          style={{ borderColor: "#93c5fd", borderTopColor: "transparent" }}
        />
      )}
      {label}
    </button>
  );
}
