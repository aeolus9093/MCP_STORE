// =============================================================
// renderer/components/EnvVarInput.tsx — 환경 변수 입력 (다크테마)
// isSecret=true면 password 마스킹
// =============================================================

import { useState } from "react";
import { EnvVar } from "../../shared/types";

interface EnvVarInputProps {
  envVar:   EnvVar;
  value:    string;
  onChange: (name: string, value: string) => void;
}

export default function EnvVarInput({ envVar, value, onChange }: EnvVarInputProps) {
  const [showSecret, setShowSecret] = useState(false);
  const inputType = envVar.isSecret && !showSecret ? "password" : "text";

  return (
    <div className="space-y-1">
      <label className="flex items-center gap-1 text-sm font-medium" style={{ color: "#cbd5e1" }}>
        {envVar.name}
        {envVar.required && (
          <span className="text-xs" style={{ color: "#f87171" }}>*필수</span>
        )}
      </label>

      <p className="text-xs" style={{ color: "#475569" }}>{envVar.description}</p>

      <div className="relative">
        <input
          type={inputType}
          value={value}
          onChange={(e) => onChange(envVar.name, e.target.value)}
          placeholder={envVar.isSecret ? "••••••••••••" : envVar.name}
          className="w-full px-3 py-2 rounded-lg text-sm font-mono focus:outline-none"
          style={{
            background: "#0f1117",
            border:     "1px solid #1f2535",
            color:      "#e2e8f0",
          }}
          onFocus={(e) => (e.target.style.border = "1px solid #3b82f6")}
          onBlur={(e)  => (e.target.style.border = "1px solid #1f2535")}
        />
        {envVar.isSecret && (
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-xs"
            style={{ color: "#475569" }}
          >
            {showSecret ? "숨기기" : "보기"}
          </button>
        )}
      </div>
    </div>
  );
}
