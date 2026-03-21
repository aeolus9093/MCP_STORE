// =============================================================
// main/auto-updater.ts — GitHub Releases 기반 자동 업데이트
// electron-updater 라이브러리 사용
// =============================================================

import { app, BrowserWindow, ipcMain } from "electron";
import { autoUpdater, UpdateInfo, ProgressInfo } from "electron-updater";
import { IPC } from "../shared/types";

// ──────────────────────────────────────────────
// 내부 상태
// ──────────────────────────────────────────────

let updateWindow: BrowserWindow | null = null;

function getWindow(): BrowserWindow | null {
  return updateWindow;
}

function send(channel: string, payload: unknown): void {
  const win = getWindow();
  if (win && !win.isDestroyed()) {
    win.webContents.send(channel, payload);
  }
}

// ──────────────────────────────────────────────
// autoUpdater 설정
// ──────────────────────────────────────────────

function configureUpdater(): void {
  // 개발 모드에서는 업데이트 비활성화
  if (!app.isPackaged) {
    autoUpdater.updateConfigPath = undefined as unknown as string;
    autoUpdater.forceDevUpdateConfig = true;
  }

  autoUpdater.autoDownload        = false; // 사용자가 직접 다운로드 트리거
  autoUpdater.autoInstallOnAppQuit = true; // 앱 종료 시 자동 설치

  // ── 이벤트 핸들러 ──────────────────────────

  autoUpdater.on("checking-for-update", () => {
    send(IPC.UPDATE_STATUS, { status: "checking" });
  });

  autoUpdater.on("update-available", (info: UpdateInfo) => {
    send(IPC.UPDATE_STATUS, {
      status:  "available",
      version: info.version,
      notes:   info.releaseNotes ?? "",
      date:    info.releaseDate,
    });
  });

  autoUpdater.on("update-not-available", () => {
    send(IPC.UPDATE_STATUS, { status: "not-available" });
  });

  autoUpdater.on("download-progress", (progress: ProgressInfo) => {
    send(IPC.UPDATE_STATUS, {
      status:   "downloading",
      percent:  Math.round(progress.percent),
      bytesPerSecond: progress.bytesPerSecond,
      transferred:    progress.transferred,
      total:          progress.total,
    });
  });

  autoUpdater.on("update-downloaded", (info: UpdateInfo) => {
    send(IPC.UPDATE_STATUS, {
      status:  "ready",
      version: info.version,
    });
  });

  autoUpdater.on("error", (err: Error) => {
    send(IPC.UPDATE_STATUS, {
      status:  "error",
      message: err.message,
    });
  });
}

// ──────────────────────────────────────────────
// IPC 핸들러 등록
// ──────────────────────────────────────────────

export function registerAutoUpdaterHandlers(win: BrowserWindow): void {
  updateWindow = win;
  configureUpdater();

  // 업데이트 확인 요청
  ipcMain.handle(IPC.UPDATE_CHECK, async () => {
    try {
      if (!app.isPackaged) {
        return { success: true, data: { status: "not-available" } };
      }
      await autoUpdater.checkForUpdates();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // 다운로드 시작
  ipcMain.handle(IPC.UPDATE_DOWNLOAD, async () => {
    try {
      await autoUpdater.downloadUpdate();
      return { success: true };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      return { success: false, error: msg };
    }
  });

  // 재시작 후 설치
  ipcMain.handle(IPC.UPDATE_INSTALL, () => {
    autoUpdater.quitAndInstall(false, true);
    return { success: true };
  });
}

// ──────────────────────────────────────────────
// 앱 시작 시 백그라운드 자동 확인 (30초 후 1회)
// ──────────────────────────────────────────────

export function scheduleUpdateCheck(): void {
  if (!app.isPackaged) return;
  setTimeout(async () => {
    try {
      await autoUpdater.checkForUpdates();
    } catch {
      // 업데이트 확인 실패는 무시 (오프라인 등)
    }
  }, 30_000);
}
