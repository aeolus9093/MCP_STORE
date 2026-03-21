// =============================================================
// main/config-manager.ts — 설정 파일 읽기/쓰기
// OS별 경로 자동 감지 + claude-desktop/cursor/windsurf/claude-code/vscode/zed 지원
// =============================================================

import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { Client, ClientConfigMap, IPCResult } from "../shared/types";

// ──────────────────────────────────────────────
// 설정 포맷 구분
// ──────────────────────────────────────────────

/**
 * ConfigFormat — 클라이언트별 설정 파일 구조
 * - mcpServers : { mcpServers: { [id]: { command, args, env, disabled? } } }  (Claude Desktop / Cursor / Windsurf / Claude Code)
 * - vscode-mcp : { servers:    { [id]: { command, args, env, disabled? } } }  (VS Code mcp.json)
 * - zed        : { context_servers: { [id]: { command: { path, args, env? }, settings? } } }
 */
type ConfigFormat = "mcpServers" | "vscode-mcp" | "zed";

function getConfigFormat(client: Client): ConfigFormat {
  if (client === "vscode") return "vscode-mcp";
  if (client === "zed")    return "zed";
  return "mcpServers";
}

// ──────────────────────────────────────────────
// 상수: 클라이언트별 설정 파일 경로 (OS별)
// ──────────────────────────────────────────────

/**
 * getConfigPaths — OS와 클라이언트에 따라 설정 파일 경로 반환
 */
export function getConfigPaths(): ClientConfigMap {
  const platform = process.platform;
  const home = os.homedir();

  if (platform === "win32") {
    const appData      = process.env.APPDATA      || path.join(home, "AppData", "Roaming");
    const _localAppData = process.env.LOCALAPPDATA || path.join(home, "AppData", "Local");
    return {
      "claude-desktop": path.join(appData, "Claude", "claude_desktop_config.json"),
      "cursor":         path.join(appData, "Cursor", "User", "globalStorage", "cursor.mcp.json"),
      "windsurf":       path.join(appData, "Windsurf", "User", "globalStorage", "windsurf.mcp.json"),
      "claude-code":    path.join(home, ".claude.json"),
      "vscode":         path.join(appData, "Code", "User", "mcp.json"),
      "zed":            path.join(home, ".config", "zed", "settings.json"),
    };
  }

  if (platform === "darwin") {
    return {
      "claude-desktop": path.join(home, "Library", "Application Support", "Claude", "claude_desktop_config.json"),
      "cursor":         path.join(home, "Library", "Application Support", "Cursor", "User", "globalStorage", "cursor.mcp.json"),
      "windsurf":       path.join(home, "Library", "Application Support", "Windsurf", "User", "globalStorage", "windsurf.mcp.json"),
      "claude-code":    path.join(home, ".claude.json"),
      "vscode":         path.join(home, "Library", "Application Support", "Code", "User", "mcp.json"),
      "zed":            path.join(home, ".config", "zed", "settings.json"),
    };
  }

  // Linux
  const configDir = process.env.XDG_CONFIG_HOME || path.join(home, ".config");
  return {
    "claude-desktop": path.join(configDir, "Claude", "claude_desktop_config.json"),
    "cursor":         path.join(configDir, "Cursor", "User", "globalStorage", "cursor.mcp.json"),
    "windsurf":       path.join(configDir, "Windsurf", "User", "globalStorage", "windsurf.mcp.json"),
    "claude-code":    path.join(home, ".claude.json"),
    "vscode":         path.join(configDir, "Code", "User", "mcp.json"),
    "zed":            path.join(configDir, "zed", "settings.json"),
  };
}

// ──────────────────────────────────────────────
// 내부 유틸: JSON 읽기/쓰기
// ──────────────────────────────────────────────

function readJson(filePath: string): Record<string, unknown> {
  try {
    if (!fs.existsSync(filePath)) return {};
    const raw = fs.readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return {};
  }
}

function writeJson(filePath: string, data: Record<string, unknown>): void {
  const dir = path.dirname(filePath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
}

// ──────────────────────────────────────────────
// 공개 타입
// ──────────────────────────────────────────────

export interface MCPServerEntry {
  command: string;
  args?: string[];
  env?: Record<string, string>;
  disabled?: boolean;
}

// Zed context_servers 포맷 (command 객체 구조)
interface ZedServerEntry {
  command: {
    path: string;
    args?: string[];
    env?: Record<string, string>;
  };
  settings?: Record<string, unknown>;
}

// ──────────────────────────────────────────────
// 공개 API
// ──────────────────────────────────────────────

/**
 * addMcpServer — 설정 파일에 MCP 항목 추가.
 * 클라이언트 포맷에 따라 mcpServers / servers / context_servers 분기.
 */
export function addMcpServer(
  client: Client,
  serverId: string,
  entry: MCPServerEntry
): IPCResult<string> {
  try {
    const configPath = getConfigPaths()[client];
    if (!configPath) return { success: false, error: "지원하지 않는 클라이언트입니다." };

    const config = readJson(configPath);
    const fmt    = getConfigFormat(client);

    if (fmt === "vscode-mcp") {
      // VS Code: { servers: { [id]: { command, args, env } } }
      if (!config.servers) config.servers = {};
      (config.servers as Record<string, MCPServerEntry>)[serverId] = entry;

    } else if (fmt === "zed") {
      // Zed: { context_servers: { [id]: { command: { path, args, env }, settings: {} } } }
      if (!config.context_servers) config.context_servers = {};
      const zedEntry: ZedServerEntry = {
        command: {
          path: entry.command,
          ...(entry.args && entry.args.length > 0 ? { args: entry.args } : {}),
          ...(entry.env ? { env: entry.env } : {}),
        },
        settings: {},
      };
      (config.context_servers as Record<string, ZedServerEntry>)[serverId] = zedEntry;

    } else {
      // claude-desktop / cursor / windsurf / claude-code
      if (!config.mcpServers) config.mcpServers = {};
      (config.mcpServers as Record<string, MCPServerEntry>)[serverId] = entry;
    }

    writeJson(configPath, config);
    return { success: true, data: configPath };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * removeMcpServer — 설정 파일에서 MCP 항목 제거
 */
export function removeMcpServer(client: Client, serverId: string): IPCResult {
  try {
    const configPath = getConfigPaths()[client];
    if (!configPath) return { success: false, error: "지원하지 않는 클라이언트입니다." };

    const config = readJson(configPath);
    const fmt    = getConfigFormat(client);

    if (fmt === "vscode-mcp") {
      const servers = config.servers as Record<string, unknown> | undefined;
      if (servers?.[serverId]) {
        delete servers[serverId];
        writeJson(configPath, config);
      }
    } else if (fmt === "zed") {
      const ctxServers = config.context_servers as Record<string, unknown> | undefined;
      if (ctxServers?.[serverId]) {
        delete ctxServers[serverId];
        writeJson(configPath, config);
      }
    } else {
      const servers = config.mcpServers as Record<string, unknown> | undefined;
      if (servers?.[serverId]) {
        delete servers[serverId];
        writeJson(configPath, config);
      }
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * toggleMcpServer — disabled 필드로 MCP 활성화/비활성화.
 * Zed는 context_servers에 disabled 미지원 → 무시.
 */
export function toggleMcpServer(
  client: Client,
  serverId: string,
  isActive: boolean
): IPCResult {
  try {
    const configPath = getConfigPaths()[client];
    if (!configPath) return { success: false, error: "지원하지 않는 클라이언트입니다." };

    const fmt = getConfigFormat(client);

    // Zed는 disabled 지원 안 함
    if (fmt === "zed") return { success: true };

    const config  = readJson(configPath);
    const key     = fmt === "vscode-mcp" ? "servers" : "mcpServers";
    const servers = config[key] as Record<string, MCPServerEntry> | undefined;

    if (servers?.[serverId]) {
      servers[serverId].disabled = !isActive;
      writeJson(configPath, config);
    }

    return { success: true };
  } catch (err) {
    return { success: false, error: (err as Error).message };
  }
}

/**
 * buildServerEntry — installCommand 문자열을 MCPServerEntry로 변환
 * 예) "npx -y @mcp/server-github" → { command: "npx", args: ["-y", "@mcp/server-github"] }
 */
export function buildServerEntry(
  installCommand: string,
  envVars: Record<string, string>
): MCPServerEntry {
  const parts   = installCommand.trim().split(/\s+/);
  const command = parts[0];
  const args    = parts.slice(1);
  const env     = Object.keys(envVars).length > 0 ? envVars : undefined;
  return { command, args, env };
}
