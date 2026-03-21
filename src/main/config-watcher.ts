// =============================================================
// main/config-watcher.ts — 클라이언트 설정 파일 변경 감지
// fs.watch로 각 클라이언트 설정 파일 감시.
// 외부에서 MCP 추가/제거 시 installed.json 자동 동기화 + IPC push.
// =============================================================

import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { BrowserWindow } from "electron";
import { IPC, Client, InstalledMCP } from "../shared/types";
import { getConfigPaths }            from "./config-manager";

// ──────────────────────────────────────────────
// DB 접근 (ipc-handlers와 동일한 경로 공유)
// ──────────────────────────────────────────────

interface DBSchema {
  installed: InstalledMCP[];
}

const DB_PATH = path.join(os.homedir(), ".mcp-store", "installed.json");

function readDB(): DBSchema {
  try {
    if (!fs.existsSync(DB_PATH)) return { installed: [] };
    return JSON.parse(fs.readFileSync(DB_PATH, "utf-8")) as DBSchema;
  } catch {
    return { installed: [] };
  }
}

function writeDB(data: DBSchema): void {
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[config-watcher] DB write error:", err);
  }
}

// ──────────────────────────────────────────────
// 설정 파일에서 MCP 서버 ID 추출
// ──────────────────────────────────────────────

function extractServerIds(configPath: string, client: Client): string[] {
  try {
    if (!fs.existsSync(configPath)) return [];
    const config = JSON.parse(
      fs.readFileSync(configPath, "utf-8")
    ) as Record<string, unknown>;

    let servers: Record<string, unknown> | undefined;
    if (client === "vscode") {
      servers = config.servers as Record<string, unknown> | undefined;
    } else if (client === "zed") {
      servers = config.context_servers as Record<string, unknown> | undefined;
    } else {
      servers = config.mcpServers as Record<string, unknown> | undefined;
    }

    return servers ? Object.keys(servers) : [];
  } catch {
    return [];
  }
}

// ──────────────────────────────────────────────
// installed.json ↔ 설정 파일 동기화
// ──────────────────────────────────────────────

interface SyncDiff {
  added:   string[];
  removed: string[];
}

function syncClientConfig(
  client:     Client,
  configPath: string
): SyncDiff {
  const configIds    = extractServerIds(configPath, client);
  const db           = readDB();
  const installedIds = db.installed
    .filter((i) => i.client === client)
    .map((i) => i.packageId);

  const added   = configIds.filter((id) => !installedIds.includes(id));
  const removed = installedIds.filter((id) => !configIds.includes(id));

  let changed = false;

  // 외부에서 추가된 MCP → installed.json에 추가
  for (const id of added) {
    db.installed.push({
      packageId:   id,
      installedAt: new Date().toISOString(),
      configPath,
      client,
      envVars:     {},
      isActive:    true,
    });
    changed = true;
  }

  // 외부에서 제거된 MCP → installed.json에서 제거
  for (const id of removed) {
    db.installed = db.installed.filter(
      (i) => !(i.packageId === id && i.client === client)
    );
    changed = true;
  }

  if (changed) writeDB(db);

  return { added, removed };
}

// ──────────────────────────────────────────────
// Watcher 생명주기
// ──────────────────────────────────────────────

const _watchers: fs.FSWatcher[] = [];

// 디바운스 타이머 맵 (파일별 중복 이벤트 제거)
const _debounceTimers = new Map<string, ReturnType<typeof setTimeout>>();

/**
 * startConfigWatcher — 존재하는 클라이언트 설정 파일을 모두 감시 시작
 * 변경 감지 시 installed.json 동기화 후 CONFIG_CHANGED 이벤트 push
 */
export function startConfigWatcher(win: BrowserWindow): void {
  if (_watchers.length > 0) return; // 이미 실행 중

  const configPaths = getConfigPaths();
  const entries     = Object.entries(configPaths) as [Client, string | null][];

  for (const [client, configPath] of entries) {
    if (!configPath)                     continue;
    if (!fs.existsSync(configPath))      continue;

    try {
      const watcher = fs.watch(
        configPath,
        { persistent: false },
        (eventType) => {
          if (eventType !== "change") return;

          // 디바운스: 300ms 내 중복 이벤트 무시
          const prev = _debounceTimers.get(configPath);
          if (prev) clearTimeout(prev);

          const timer = setTimeout(() => {
            _debounceTimers.delete(configPath);
            try {
              const diff = syncClientConfig(client, configPath);
              if (!win.isDestroyed()) {
                win.webContents.send(IPC.CONFIG_CHANGED, {
                  client,
                  added:   diff.added,
                  removed: diff.removed,
                });
              }
            } catch (err) {
              console.error(
                `[config-watcher] sync error for ${client}:`,
                (err as Error).message
              );
            }
          }, 300);

          _debounceTimers.set(configPath, timer);
        }
      );

      _watchers.push(watcher);
      console.log(`[config-watcher] watching ${client}: ${configPath}`);
    } catch (err) {
      console.warn(
        `[config-watcher] cannot watch ${client} (${configPath}):`,
        (err as Error).message
      );
    }
  }
}

/**
 * stopConfigWatcher — 모든 파일 감시 정지
 */
export function stopConfigWatcher(): void {
  for (const watcher of _watchers) {
    try { watcher.close(); } catch {}
  }
  _watchers.length = 0;
  _debounceTimers.forEach((t) => clearTimeout(t));
  _debounceTimers.clear();
}
