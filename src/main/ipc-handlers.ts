// =============================================================
// main/ipc-handlers.ts — Renderer ↔ Main IPC 채널 등록
// fs 기반 JSON 저장소 사용 (lowdb 제거: ESM-only 호환성 이슈)
// =============================================================

import { ipcMain, BrowserWindow } from "electron";
import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import {
  IPC,
  MCPPackage,
  InstalledMCP,
  InstallPayload,
  RemoveMCPPayload,
  ToggleMCPPayload,
  SearchPayload,
  IPCResult,
  ClientConfigMap,
} from "../shared/types";
import { getAllPackages, searchPackages, getPackageById, clearCache } from "./registry";
import { installMCP, checkToolAvailability } from "./installer";
import {
  getConfigPaths,
  addMcpServer,
  removeMcpServer,
  toggleMcpServer,
  buildServerEntry,
} from "./config-manager";
import { exportBackup, importBackup } from "./backup-manager";

// ──────────────────────────────────────────────
// fs 기반 간이 JSON 저장소 (lowdb 대체)
// ──────────────────────────────────────────────

interface DBSchema {
  installed: InstalledMCP[];
}

const DB_PATH = path.join(os.homedir(), ".mcp-store", "installed.json");

/**
 * readDB — DB 파일 읽기. 없으면 기본값 반환.
 */
function readDB(): DBSchema {
  try {
    if (!fs.existsSync(DB_PATH)) return { installed: [] };
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as DBSchema;
  } catch {
    return { installed: [] };
  }
}

/**
 * writeDB — DB 파일에 저장. 디렉토리 자동 생성.
 */
function writeDB(data: DBSchema): void {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[db] 저장 실패:", err);
  }
}

// ──────────────────────────────────────────────
// 초기화 (앱 시작 시 1회)
// ──────────────────────────────────────────────

/**
 * initDB — DB 디렉토리/파일이 없으면 초기화
 */
export function initDB(): void {
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  if (!fs.existsSync(DB_PATH)) writeDB({ installed: [] });
}

// ──────────────────────────────────────────────
// 핸들러 등록
// ──────────────────────────────────────────────

/**
 * registerIpcHandlers — 모든 IPC 채널 등록
 * main/index.ts에서 app ready 이후 호출
 */
export function registerIpcHandlers(win: BrowserWindow): void {

  // ── Registry ────────────────────────────────

  ipcMain.handle(IPC.REGISTRY_GET_ALL, (): IPCResult<MCPPackage[]> => {
    try {
      return { success: true, data: getAllPackages() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.REGISTRY_SEARCH, (_e, payload: SearchPayload): IPCResult<MCPPackage[]> => {
    try {
      return { success: true, data: searchPackages(payload) };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.REGISTRY_REFRESH, (): IPCResult<MCPPackage[]> => {
    try {
      clearCache();
      return { success: true, data: getAllPackages() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── Config ──────────────────────────────────

  ipcMain.handle(IPC.CONFIG_GET_PATHS, (): IPCResult<ClientConfigMap> => {
    try {
      return { success: true, data: getConfigPaths() };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.CONFIG_REMOVE_MCP, (_e, payload: RemoveMCPPayload): IPCResult => {
    return removeMcpServer(payload.client, payload.packageId);
  });

  // ── Install ─────────────────────────────────

  ipcMain.handle(IPC.INSTALL_MCP, async (_e, payload: InstallPayload): Promise<IPCResult> => {
    const pkg = getPackageById(payload.packageId);
    if (!pkg) return { success: false, error: "패키지를 찾을 수 없습니다." };

    const onLog = (line: string) => {
      win.webContents.send(IPC.INSTALL_LOG, { packageId: payload.packageId, line });
    };

    const installResult = await installMCP({
      installCommand: pkg.installCommand,
      installType:    pkg.installType,
      onLog,
    });

    if (!installResult.success) return installResult;

    // 다중 클라이언트 지원: 각 클라이언트에 설정 추가 + DB 기록
    const clients = payload.clients ?? [];
    for (const client of clients) {
      const entry        = buildServerEntry(pkg.installCommand, payload.envVars);
      const configResult = addMcpServer(client, pkg.id, entry);
      if (!configResult.success) {
        onLog?.(`[${client}] 설정 파일 수정 실패: ${configResult.error}`);
        continue;
      }

      const db      = readDB();
      const existing = db.installed.findIndex(
        (i) => i.packageId === payload.packageId && i.client === client
      );
      const record: InstalledMCP = {
        packageId:   payload.packageId,
        installedAt: new Date().toISOString(),
        configPath:  configResult.data ?? "",
        client,
        envVars:     payload.envVars,
        isActive:    true,
      };
      if (existing >= 0) {
        db.installed[existing] = record;
      } else {
        db.installed.push(record);
      }
      writeDB(db);
    }

    return { success: true };
  });

  // ── Installed list ───────────────────────────

  ipcMain.handle(IPC.INSTALLED_GET_ALL, (): IPCResult<InstalledMCP[]> => {
    try {
      return { success: true, data: readDB().installed };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  ipcMain.handle(IPC.INSTALLED_REMOVE, (_e, payload: RemoveMCPPayload): IPCResult => {
    try {
      const db = readDB();
      db.installed = db.installed.filter(
        (i) => !(i.packageId === payload.packageId && i.client === payload.client)
      );
      writeDB(db);
      removeMcpServer(payload.client, payload.packageId);
      return { success: true };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── Tools ───────────────────────────────────

  ipcMain.handle(IPC.TOOLS_CHECK, async (): Promise<IPCResult<Record<string, boolean>>> => {
    try {
      const result = await checkToolAvailability();
      return { success: true, data: result };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── Update Check ─────────────────────────────

  ipcMain.handle(IPC.INSTALLED_CHECK_UPDATES, (): IPCResult<string[]> => {
    try {
      const db       = readDB();
      const packages = getAllPackages();
      const updatable = db.installed
        .filter((item) => {
          const pkg = packages.find((p) => p.id === item.packageId);
          if (!pkg) return false;
          return new Date(pkg.lastUpdated).getTime() > new Date(item.installedAt).getTime();
        })
        .map((item) => item.packageId);
      return { success: true, data: [...new Set(updatable)] };
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });

  // ── Backup ──────────────────────────────────

  ipcMain.handle(IPC.BACKUP_EXPORT, (): IPCResult<string> => {
    return exportBackup();
  });

  ipcMain.handle(IPC.BACKUP_IMPORT, (_e, jsonString: string): IPCResult => {
    return importBackup(jsonString);
  });

  // ── Toggle (DB + config 동기화) ──────────────

  ipcMain.handle(IPC.CONFIG_TOGGLE_MCP, (_e, payload: ToggleMCPPayload): IPCResult => {
    try {
      const db   = readDB();
      const item = db.installed.find(
        (i) => i.packageId === payload.packageId && i.client === payload.client
      );
      if (item) item.isActive = payload.isActive;
      writeDB(db);
      return toggleMcpServer(payload.client, payload.packageId, payload.isActive);
    } catch (err) {
      return { success: false, error: (err as Error).message };
    }
  });
}
