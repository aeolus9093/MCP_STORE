// =============================================================
// main/index.ts — Electron 메인 프로세스 진입점
// =============================================================

import { app, BrowserWindow, shell } from "electron";
import * as fs   from "fs";
import * as path from "path";
import * as os   from "os";
import { initDB, registerIpcHandlers }        from "./ipc-handlers";
import { registerCommunityHandlers }           from "./ipc-handlers-community";
import { registerAutoUpdaterHandlers, scheduleUpdateCheck } from "./auto-updater";
import { startAutoSync, stopAutoSync }         from "./github-sync";
import { startConfigWatcher, stopConfigWatcher } from "./config-watcher";
import { getAllPackages, fetchAndUpdateRegistry } from "./registry";
import { IPC, RegistryFetchStatus }             from "../shared/types";

let mainWindow: BrowserWindow | null = null;

/**
 * createWindow — 메인 BrowserWindow 생성
 * app.isPackaged: 패키징된 앱이면 true, electron . 로 직접 실행하면 false
 */
async function createWindow(): Promise<void> {
  mainWindow = new BrowserWindow({
    width:    1200,
    height:   780,
    minWidth: 900,
    minHeight: 600,
    // titleBarStyle: "hiddenInset" → macOS 전용이라 Windows에서 제거
    webPreferences: {
      // __dirname = dist/main/ (outDir:dist, rootDir:src)
      preload:          path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration:  false,
      sandbox:          false,
    },
    backgroundColor: "#0f1117",
    // show: true (기본값) — ready-to-show 타이밍 이슈 방지
  });

  if (!app.isPackaged) {
    await mainWindow.loadURL("http://localhost:5173");
    mainWindow.webContents.openDevTools();
  } else {
    await mainWindow.loadFile(
      path.join(__dirname, "../renderer/index.html")
    );
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  registerIpcHandlers(mainWindow);
  registerCommunityHandlers();
  registerAutoUpdaterHandlers(mainWindow);
  scheduleUpdateCheck();

  // Phase 5: Auto Sync — autoSyncEnabled 확인 후 시작
  const settingsPath = path.join(os.homedir(), ".mcp-store", "settings.json");
  let autoSyncEnabled = true;
  try {
    if (fs.existsSync(settingsPath)) {
      const s = JSON.parse(fs.readFileSync(settingsPath, "utf-8")) as { autoSyncEnabled?: boolean };
      autoSyncEnabled = s.autoSyncEnabled ?? true;
    }
  } catch {}

  if (autoSyncEnabled) {
    startAutoSync(
      mainWindow,
      () => getAllPackages().map((p) => p.id)
    );
  }

  // Phase 5: Config Watcher
  startConfigWatcher(mainWindow);

  // Phase 5: Registry 자동 업데이트 (백그라운드, 비차단)
  // 7일 이상 지난 경우 GitHub에서 최신 registry.json fetch
  const sendFetchStatus = (s: RegistryFetchStatus) => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.webContents.send(IPC.REGISTRY_FETCH_STATUS, s);
    }
  };

  fetchAndUpdateRegistry({
    skipIfFresh: true,
    onStatus: (msg) => sendFetchStatus({ status: "fetching", message: msg }),
  }).then((updated) => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    if (updated) {
      sendFetchStatus({ status: "done", message: "MCP 목록 업데이트 완료", count: getAllPackages().length });
      mainWindow.webContents.send(IPC.REGISTRY_UPDATED);
    }
    // 최신 상태면 status 이벤트 없이 조용히 종료
  }).catch((err) => {
    console.warn("[main] registry 자동 업데이트 실패:", err);
    sendFetchStatus({ status: "error", message: "MCP 목록 업데이트 실패" });
  });
}

app.whenReady().then(async () => {
  try {
    initDB();
    await createWindow();
  } catch (err) {
    console.error("[main] 초기화 실패:", err);
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  stopAutoSync();
  stopConfigWatcher();
  if (process.platform !== "darwin") app.quit();
});
