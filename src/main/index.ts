import { app, BrowserWindow, ipcMain, shell, dialog } from "electron";
import path from "path";
import fs from "fs";
import fsp from "fs/promises";
import os from "os";
import type {
  JunkRow,
  ScanLargePayload,
  LargeFile,
  TopFolder,
  ScanLargeResult,
} from "../shared/types";
import { getScanner, getScannerInfo, getStreamingScanner } from "./scanners";

function createWindow(): void {
  const win = new BrowserWindow({
    width: 1220,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  if (process.env.ELECTRON_RENDERER_URL) {
    win.loadURL(process.env.ELECTRON_RENDERER_URL);
  } else {
    win.loadFile(path.join(__dirname, "../renderer/index.html"));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});

// ─── Utilities ──────────────────────────────────────────────

function bytesToReadable(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let size = bytes / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

// ─── Junk Target Detection ─────────────────────────────────

function getDefaultJunkTargets(): string[] {
  const home = os.homedir();
  const tmp = os.tmpdir();

  if (process.platform === "darwin") {
    return [
      tmp,
      path.join(home, "Downloads"),
      path.join(home, "Movies"),
      path.join(home, "Desktop"),
      path.join(home, "Library", "Caches"),
      path.join(home, "Library", "Logs"),
      path.join(
        home,
        "Library",
        "Containers",
        "com.apple.Safari",
        "Data",
        "Library",
        "Caches",
      ),
      path.join(
        home,
        "Library",
        "Application Support",
        "Google",
        "Chrome",
        "Default",
        "Cache",
      ),
      path.join(home, "Library", "Application Support", "Code", "Cache"),
    ];
  }

  if (process.platform === "win32") {
    return [
      tmp,
      path.join(home, "AppData", "Local", "Temp"),
      path.join(home, "AppData", "Local", "Microsoft", "Windows", "INetCache"),
      path.join(
        home,
        "AppData",
        "Local",
        "Google",
        "Chrome",
        "User Data",
        "Default",
        "Cache",
      ),
      path.join(home, "AppData", "Roaming", "Code", "Cache"),
    ];
  }

  return [
    tmp,
    path.join(home, ".cache"),
    path.join(home, ".local", "share", "Trash", "files"),
    path.join(home, ".config", "Code", "Cache"),
  ];
}

// ─── Directory Metrics ──────────────────────────────────────

interface DirMetrics {
  exists: boolean;
  items: number;
  totalSize: number;
}

async function quickDirMetrics(target: string): Promise<DirMetrics> {
  const result: DirMetrics = { exists: false, items: 0, totalSize: 0 };

  let entries: fs.Dirent[];
  try {
    const stat = await fsp.stat(target);
    if (!stat.isDirectory()) return result;
    entries = await fsp.readdir(target, { withFileTypes: true });
    result.exists = true;
    result.items = entries.length;
  } catch {
    return result;
  }

  for (const entry of entries) {
    const p = path.join(target, entry.name);
    try {
      const st = await fsp.stat(p);
      if (st.isFile()) {
        result.totalSize += st.size;
      } else if (st.isDirectory()) {
        const sub = await fsp.readdir(p, { withFileTypes: true });
        for (const s of sub) {
          if (!s.isFile()) continue;
          try {
            const fst = await fsp.stat(path.join(p, s.name));
            result.totalSize += fst.size;
          } catch {
            // Skip inaccessible files
          }
        }
      }
    } catch {
      // Skip inaccessible entries
    }
  }

  return result;
}

// ─── Large File Scanner ─────────────────────────────────────

interface WalkOptions {
  maxResults?: number;
  maxDepth?: number;
  extensions?: string[];
}

async function walkDirForLargeFiles(
  rootDir: string,
  minBytes: number,
  options: WalkOptions = {},
): Promise<ScanLargeResult> {
  const { maxResults = 500, maxDepth = 10, extensions = [] } = options;

  const ignoreNames = new Set([
    "node_modules",
    ".git",
    ".next",
    "dist",
    "build",
  ]);
  const allowExt = new Set(
    extensions
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .map((e) => (e.startsWith(".") ? e : `.${e}`)),
  );

  const results: LargeFile[] = [];
  const folderStats = new Map<string, number>();

  function addFolderSize(filePath: string, size: number): void {
    const dir = path.dirname(filePath);
    folderStats.set(dir, (folderStats.get(dir) ?? 0) + size);
  }

  async function walk(current: string, depth: number): Promise<void> {
    if (results.length >= maxResults) return;
    if (depth > maxDepth) return;

    let entries: fs.Dirent[];
    try {
      entries = await fsp.readdir(current, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (results.length >= maxResults) break;
      const fullPath = path.join(current, entry.name);

      try {
        if (entry.isDirectory()) {
          if (ignoreNames.has(entry.name)) continue;
          await walk(fullPath, depth + 1);
        } else if (entry.isFile()) {
          if (allowExt.size) {
            const ext = path.extname(entry.name).toLowerCase();
            if (!allowExt.has(ext)) continue;
          }

          const stat = await fsp.stat(fullPath);
          if (stat.size >= minBytes) {
            results.push({
              path: fullPath,
              size: stat.size,
              sizeText: bytesToReadable(stat.size),
            });
            addFolderSize(fullPath, stat.size);
          }
        }
      } catch {
        // Skip inaccessible entries
      }
    }
  }

  await walk(rootDir, 0);
  results.sort((a, b) => b.size - a.size);

  const topFolders: TopFolder[] = [...folderStats.entries()]
    .map(([folder, size]) => ({
      folder,
      size,
      sizeText: bytesToReadable(size),
    }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 15);

  return { files: results, topFolders };
}

// ─── IPC Handlers ───────────────────────────────────────────

ipcMain.handle("app-platform", () => process.platform);
ipcMain.handle("app-home", () => os.homedir());

ipcMain.handle("open-folder-dialog", async (event) => {
  const win = BrowserWindow.fromWebContents(event.sender);
  const result = win
    ? await dialog.showOpenDialog(win, {
        properties: ["openDirectory"],
        title: "Select Folder to Scan",
      })
    : await dialog.showOpenDialog({
        properties: ["openDirectory"],
        title: "Select Folder to Scan",
      });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("scan-junk", async (_event, customTargets: string[] = []) => {
  const targets = customTargets.length
    ? customTargets
    : getDefaultJunkTargets();
  const rows: JunkRow[] = [];

  for (const target of targets) {
    const metrics = await quickDirMetrics(target);
    rows.push({
      path: target,
      items: metrics.items,
      exists: metrics.exists,
      totalSize: metrics.totalSize,
      totalSizeText: bytesToReadable(metrics.totalSize),
    });
  }

  return rows;
});

ipcMain.handle(
  "clean-junk-target",
  async (_event, targetPath: string, dryRun = false) => {
    if (!targetPath) throw new Error("Path target kosong");

    let entries: string[];
    try {
      entries = await fsp.readdir(targetPath);
    } catch {
      throw new Error("Target tidak bisa dibaca");
    }

    if (dryRun) {
      return {
        dryRun: true as const,
        wouldDeleteCount: entries.length,
        sample: entries.slice(0, 20).map((n) => path.join(targetPath, n)),
      };
    }

    const done: string[] = [];
    const failed: Array<{ path: string; error: string }> = [];

    for (const name of entries) {
      const fullPath = path.join(targetPath, name);
      try {
        await shell.trashItem(fullPath);
        done.push(fullPath);
      } catch (err: unknown) {
        failed.push({
          path: fullPath,
          error: (err as Error)?.message ?? "Gagal hapus",
        });
      }
    }

    return { dryRun: false as const, done, failed };
  },
);

ipcMain.handle(
  "scan-large-files",
  async (_event, payload: ScanLargePayload) => {
    const {
      rootDir,
      minMB = 100,
      maxResults = 500,
      maxDepth = 10,
      extensions = [],
    } = payload;

    try {
      await fsp.access(rootDir);
    } catch {
      throw new Error("Folder tidak valid");
    }

    const minBytes = Number(minMB) * 1024 * 1024;
    return walkDirForLargeFiles(rootDir, minBytes, {
      maxResults: Number(maxResults),
      maxDepth: Number(maxDepth),
      extensions: Array.isArray(extensions) ? extensions : [],
    });
  },
);

ipcMain.handle(
  "delete-paths",
  async (_event, paths: string[] = [], dryRun = false) => {
    if (dryRun) {
      return {
        dryRun: true as const,
        wouldDeleteCount: paths.length,
        sample: paths.slice(0, 20),
      };
    }

    const done: string[] = [];
    const failed: Array<{ path: string; error: string }> = [];

    for (const p of paths) {
      try {
        await shell.trashItem(p);
        done.push(p);
      } catch (err: unknown) {
        failed.push({
          path: p,
          error: (err as Error)?.message ?? "Gagal hapus",
        });
      }
    }

    return { dryRun: false as const, done, failed };
  },
);

// ─── Installed Apps ───────────────────────────────────────────

ipcMain.handle("get-scanner-info", () => {
  return getScannerInfo();
});

ipcMain.handle("scan-installed-apps", async () => {
  const scanner = getScanner();
  return scanner.scanInstalledApps();
});

ipcMain.handle("get-app-details", async (_event, appId: string) => {
  const scanner = getScanner();
  return scanner.getAppDetails(appId);
});

ipcMain.handle(
  "uninstall-app",
  async (_event, appId: string, options: { keepData: boolean }) => {
    const scanner = getScanner();
    return scanner.uninstallApp(appId, options.keepData);
  },
);

ipcMain.handle("scan-leftovers", async () => {
  const scanner = getScanner();
  return scanner.scanLeftovers();
});

ipcMain.handle("clean-leftovers", async (_event, paths: string[] = []) => {
  const done: string[] = [];
  const failed: Array<{ path: string; error: string }> = [];

  for (const p of paths) {
    try {
      await shell.trashItem(p);
      done.push(p);
    } catch (err: unknown) {
      failed.push({
        path: p,
        error: (err as Error)?.message ?? "Failed to delete",
      });
    }
  }

  return { done, failed };
});

// ─── Streaming App Scan ───────────────────────────────────────

let appScanController: AbortController | null = null;

ipcMain.on("start-app-scan", (event) => {
  const streamingScanner = getStreamingScanner();
  if (!streamingScanner) {
    event.sender.send("scan-complete");
    return;
  }

  appScanController = new AbortController();

  streamingScanner.scanInstalledAppsStreaming(
    {
      onAppFound: (app) => {
        event.sender.send("app-found", app);
      },
      onProgress: (progress) => {
        event.sender.send("scan-progress", progress);
      },
    },
    appScanController.signal
  ).then(() => {
    event.sender.send("scan-complete");
    appScanController = null;
  }).catch((err: Error) => {
    if (err.name !== "AbortError") {
      console.error("App scan error:", err);
    }
    appScanController = null;
  });
});

ipcMain.on("cancel-app-scan", () => {
  if (appScanController) {
    appScanController.abort();
    appScanController = null;
  }
});
