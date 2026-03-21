// =============================================================
// main/index.ts — Electron 메인 프로세스 진입점
// =============================================================

import { app, BrowserWindow, shell } from "electron";
import * as path from "path";
import { initDB, registerIpcHandlers }        from "./ipc-handlers";
import { registerCommunityHandlers }           from "./ipc-handlers-community";
import { registerAutoUpdaterHandlers, scheduleUpdateCheck } from "./auto-updater";

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
      // __dirname = dist/main/main/ 이므로 preload.js 경로 = dist/main/main/preload.js
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
      path.join(__dirname, "../../renderer/index.html")
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
  if (process.platform !== "darwin") app.quit();
});
