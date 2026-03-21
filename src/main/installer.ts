// =============================================================
// main/installer.ts — npm/npx/uvx 설치 실행
// Node.js 내장 child_process.spawn 사용 (execa 제거: ESM-only 호환성 이슈)
// =============================================================

import { spawn } from "child_process";
import { InstallType, IPCResult } from "../shared/types";

// ──────────────────────────────────────────────
// 타입
// ──────────────────────────────────────────────

export type LogCallback = (line: string) => void;

export interface InstallOptions {
  installCommand: string;
  installType:    InstallType;
  onLog?:         LogCallback;
}

// ──────────────────────────────────────────────
// 내부 유틸
// ──────────────────────────────────────────────

/**
 * checkDependency — 명령어 설치 여부 확인 (--version으로 테스트)
 */
function checkDependency(cmd: string): Promise<boolean> {
  return new Promise((resolve) => {
    const flag = process.platform === "win32" ? "/c" : "-c";
    const shell = process.platform === "win32" ? "cmd" : "sh";
    const proc = spawn(shell, [flag, `${cmd} --version`], { stdio: "ignore" });
    proc.on("close", (code) => resolve(code === 0));
    proc.on("error", () => resolve(false));
  });
}

/**
 * getRequiredTool — installType에 필요한 실행 도구 반환
 */
function getRequiredTool(installType: InstallType): string {
  switch (installType) {
    case "npm":    return "npm";
    case "npx":    return "npx";
    case "uvx":    return "uvx";
    case "docker": return "docker";
  }
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * installMCP — MCP 설치 명령 실행
 * 실시간 stdout/stderr를 onLog 콜백으로 전달
 */
export function installMCP(options: InstallOptions): Promise<IPCResult> {
  const { installCommand, installType, onLog } = options;
  const tool = getRequiredTool(installType);

  return new Promise(async (resolve) => {
    try {
      // 의존성 확인
      const hasTool = await checkDependency(tool);
      if (!hasTool) {
        const msg = `'${tool}'이(가) 설치되어 있지 않습니다. 먼저 ${tool}을 설치해주세요.`;
        onLog?.(msg);
        return resolve({ success: false, error: msg });
      }

      onLog?.(`> ${installCommand}`);

      const parts   = installCommand.trim().split(/\s+/);
      const command = parts[0];
      const args    = parts.slice(1);

      // Windows: shell:true로 실행해야 npx/npm 등이 동작
      const proc = spawn(command, args, {
        shell: true,
        stdio: ["ignore", "pipe", "pipe"],
      });

      // stdout 실시간 스트리밍
      proc.stdout?.on("data", (chunk: Buffer) => {
        chunk.toString().split("\n").forEach((line) => {
          if (line.trim()) onLog?.(line);
        });
      });

      // stderr도 로그로 전달 (설치 진행 상황이 stderr에 나오는 경우 있음)
      proc.stderr?.on("data", (chunk: Buffer) => {
        chunk.toString().split("\n").forEach((line) => {
          if (line.trim()) onLog?.(line);
        });
      });

      proc.on("error", (err) => {
        onLog?.(`오류: ${err.message}`);
        resolve({ success: false, error: err.message });
      });

      proc.on("close", (code) => {
        if (code === 0) {
          onLog?.("✓ 설치 완료");
          resolve({ success: true });
        } else {
          const msg = `설치 실패 (종료 코드: ${code})`;
          onLog?.(msg);
          resolve({ success: false, error: msg });
        }
      });
    } catch (err) {
      const msg = (err as Error).message ?? "알 수 없는 오류";
      onLog?.(`오류: ${msg}`);
      resolve({ success: false, error: msg });
    }
  });
}

/**
 * checkToolAvailability — 필요한 도구 설치 여부 일괄 확인
 */
export async function checkToolAvailability(): Promise<Record<string, boolean>> {
  const tools = ["node", "npm", "npx", "uvx", "docker"];
  const results: Record<string, boolean> = {};
  await Promise.all(
    tools.map(async (t) => {
      results[t] = await checkDependency(t);
    })
  );
  return results;
}
