// =============================================================
// main/backup-manager.ts — 설정 백업 / 복원
// 설치 목록 + 각 클라이언트 설정 파일을 하나의 JSON으로 내보내고 가져옴
// =============================================================

import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { Client, IPCResult } from "../shared/types";
import { getConfigPaths } from "./config-manager";

const DB_PATH = path.join(os.homedir(), ".mcp-store", "installed.json");

// ──────────────────────────────────────────────
// 백업 스키마
// ──────────────────────────────────────────────

export interface BackupData {
  version:    string;
  exportedAt: string;
  installed:  unknown[];
  configs:    Record<string, unknown>;
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * exportBackup — installed.json + 모든 클라이언트 설정을 JSON 문자열로 반환
 */
export function exportBackup(): IPCResult<string> {
  try {
    let installed: unknown[] = [];
    if (fs.existsSync(DB_PATH)) {
      try {
        const raw = JSON.parse(fs.readFileSync(DB_PATH, "utf-8"));
        installed = Array.isArray(raw.installed) ? raw.installed : [];
      } catch {
        installed = [];
      }
    }

    const configPaths = getConfigPaths();
    const configs: Record<string, unknown> = {};
    for (const [client, configPath] of Object.entries(configPaths)) {
      if (configPath && fs.existsSync(configPath)) {
        try {
          configs[client] = JSON.parse(fs.readFileSync(configPath, "utf-8"));
        } catch {
          configs[client] = null;
        }
      }
    }

    const backup: BackupData = {
      version:    "2.0",
      exportedAt: new Date().toISOString(),
      installed,
      configs,
    };

    return { success: true, data: JSON.stringify(backup, null, 2) };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * importBackup — 백업 JSON 문자열로부터 installed.json + 클라이언트 설정 복원
 */
export function importBackup(jsonString: string): IPCResult {
  try {
    const backup = JSON.parse(jsonString) as BackupData;

    // installed.json 복원
    if (Array.isArray(backup.installed)) {
      const dir = path.dirname(DB_PATH);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        DB_PATH,
        JSON.stringify({ installed: backup.installed }, null, 2),
        "utf-8"
      );
    }

    // 클라이언트 설정 복원
    if (backup.configs && typeof backup.configs === "object") {
      const configPaths = getConfigPaths();
      for (const [client, configData] of Object.entries(backup.configs)) {
        if (!configData) continue;
        const configPath = configPaths[client as Client];
        if (!configPath) continue;
        const dir = path.dirname(configPath);
        if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
        fs.writeFileSync(configPath, JSON.stringify(configData, null, 2), "utf-8");
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}
