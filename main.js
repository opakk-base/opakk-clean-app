const { app, BrowserWindow, ipcMain, shell } = require('electron');
const path = require('path');
const fs = require('fs');
const fsp = require('fs/promises');
const os = require('os');

function createWindow() {
  const win = new BrowserWindow({
    width: 1220,
    height: 840,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  win.loadFile('index.html');
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

function bytesToReadable(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i += 1;
  }
  return `${size.toFixed(2)} ${units[i]}`;
}

function getDefaultJunkTargets() {
  const home = os.homedir();
  const tmp = os.tmpdir();

  if (process.platform === 'darwin') {
    return [
      tmp,
      path.join(home, 'Downloads'),
      path.join(home, 'Movies'),
      path.join(home, 'Desktop'),
      path.join(home, 'Library', 'Caches'),
      path.join(home, 'Library', 'Logs'),
      path.join(home, 'Library', 'Containers', 'com.apple.Safari', 'Data', 'Library', 'Caches'),
      path.join(home, 'Library', 'Application Support', 'Google', 'Chrome', 'Default', 'Cache'),
      path.join(home, 'Library', 'Application Support', 'Code', 'Cache'),
    ];
  }

  if (process.platform === 'win32') {
    return [
      tmp,
      path.join(home, 'AppData', 'Local', 'Temp'),
      path.join(home, 'AppData', 'Local', 'Microsoft', 'Windows', 'INetCache'),
      path.join(home, 'AppData', 'Local', 'Google', 'Chrome', 'User Data', 'Default', 'Cache'),
      path.join(home, 'AppData', 'Roaming', 'Code', 'Cache'),
    ];
  }

  return [
    tmp,
    path.join(home, '.cache'),
    path.join(home, '.local', 'share', 'Trash', 'files'),
    path.join(home, '.config', 'Code', 'Cache'),
  ];
}

async function quickDirMetrics(target) {
  const result = { exists: false, items: 0, totalSize: 0 };

  let entries;
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
      if (st.isFile()) result.totalSize += st.size;
      else if (st.isDirectory()) {
        const sub = await fsp.readdir(p, { withFileTypes: true });
        for (const s of sub) {
          if (!s.isFile()) continue;
          try {
            const fst = await fsp.stat(path.join(p, s.name));
            result.totalSize += fst.size;
          } catch {}
        }
      }
    } catch {}
  }

  return result;
}

async function walkDirForLargeFiles(rootDir, minBytes, options = {}) {
  const { maxResults = 500, maxDepth = 10, extensions = [] } = options;

  const ignoreNames = new Set(['node_modules', '.git', '.next', 'dist', 'build']);
  const allowExt = new Set(
    extensions
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean)
      .map((e) => (e.startsWith('.') ? e : `.${e}`))
  );

  const results = [];
  const folderStats = new Map();

  function addFolderSize(filePath, size) {
    const dir = path.dirname(filePath);
    folderStats.set(dir, (folderStats.get(dir) || 0) + size);
  }

  async function walk(current, depth) {
    if (results.length >= maxResults) return;
    if (depth > maxDepth) return;

    let entries;
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
      } catch {}
    }
  }

  await walk(rootDir, 0);
  results.sort((a, b) => b.size - a.size);

  const topFolders = [...folderStats.entries()]
    .map(([folder, size]) => ({ folder, size, sizeText: bytesToReadable(size) }))
    .sort((a, b) => b.size - a.size)
    .slice(0, 15);

  return { files: results, topFolders };
}

ipcMain.handle('app-platform', async () => process.platform);
ipcMain.handle('app-home', async () => os.homedir());

ipcMain.handle('scan-junk', async (_event, customTargets = []) => {
  const targets = customTargets.length ? customTargets : getDefaultJunkTargets();
  const rows = [];

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

ipcMain.handle('clean-junk-target', async (_event, targetPath, dryRun = false) => {
  if (!targetPath) throw new Error('Path target kosong');

  let entries;
  try {
    entries = await fsp.readdir(targetPath);
  } catch {
    throw new Error('Target tidak bisa dibaca');
  }

  if (dryRun) {
    return {
      dryRun: true,
      wouldDeleteCount: entries.length,
      sample: entries.slice(0, 20).map((n) => path.join(targetPath, n)),
    };
  }

  const done = [];
  const failed = [];

  for (const name of entries) {
    const fullPath = path.join(targetPath, name);
    try {
      await shell.trashItem(fullPath);
      done.push(fullPath);
    } catch (err) {
      failed.push({ path: fullPath, error: err?.message || 'Gagal hapus' });
    }
  }

  return { dryRun: false, done, failed };
});

ipcMain.handle('scan-large-files', async (_event, { rootDir, minMB = 100, maxResults = 500, maxDepth = 10, extensions = [] }) => {
  if (!rootDir || !fs.existsSync(rootDir)) {
    throw new Error('Folder tidak valid');
  }

  const minBytes = Number(minMB) * 1024 * 1024;
  return walkDirForLargeFiles(rootDir, minBytes, {
    maxResults: Number(maxResults),
    maxDepth: Number(maxDepth),
    extensions: Array.isArray(extensions) ? extensions : [],
  });
});

ipcMain.handle('delete-paths', async (_event, paths = [], dryRun = false) => {
  if (dryRun) {
    return { dryRun: true, wouldDeleteCount: paths.length, sample: paths.slice(0, 20) };
  }

  const done = [];
  const failed = [];

  for (const p of paths) {
    try {
      await shell.trashItem(p);
      done.push(p);
    } catch (err) {
      failed.push({ path: p, error: err?.message || 'Gagal hapus' });
    }
  }

  return { dryRun: false, done, failed };
});
