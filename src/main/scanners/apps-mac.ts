import { shell } from 'electron';
import fsp from 'fs/promises';
import path from 'path';
import os from 'os';
import { exec } from 'child_process';
import { promisify } from 'util';
import type { InstalledApp, AppDetails, AppRelatedFolder, LeftoverFolder, UninstallResult, ScanProgress } from '../../shared/types';

const execAsync = promisify(exec);

function bytesToReadable(bytes: number): string {
  if (bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  const units = ['KB', 'MB', 'GB', 'TB'];
  let size = bytes / 1024;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) {
    size /= 1024;
    i++;
  }
  return `${size.toFixed(1)} ${units[i]}`;
}

async function getDirSize(dir: string): Promise<number> {
  let total = 0;
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);
      try {
        if (entry.isDirectory()) {
          total += await getDirSize(fullPath);
        } else if (entry.isFile()) {
          const stat = await fsp.stat(fullPath);
          total += stat.size;
        }
      } catch {}
    }
  } catch {}
  return total;
}

async function getDirItemCount(dir: string): Promise<number> {
  let count = 0;
  try {
    const entries = await fsp.readdir(dir, { withFileTypes: true });
    count = entries.length;
  } catch {}
  return count;
}

async function getAppSize(appPath: string): Promise<number> {
  try {
    const stat = await fsp.stat(appPath);
    if (stat.isDirectory()) {
      return await getDirSize(appPath);
    }
    return stat.size;
  } catch {
    return 0;
  }
}

interface PlistInfo {
  CFBundleDisplayName?: string;
  CFBundleName?: string;
  CFBundleIdentifier?: string;
  CFBundleShortVersionString?: string;
  CFBundleVersion?: string;
  CFBundleGetInfoString?: string;
}

function parsePlist(plistContent: string): PlistInfo {
  const result: PlistInfo = {};
  
  const get = (key: string): string | undefined => {
    const match = plistContent.match(new RegExp(`<key>${key}</key>\\s*<string>([^<]*)</string>`));
    return match?.[1];
  };

  result.CFBundleDisplayName = get('CFBundleDisplayName');
  result.CFBundleName = get('CFBundleName');
  result.CFBundleIdentifier = get('CFBundleIdentifier');
  result.CFBundleShortVersionString = get('CFBundleShortVersionString');
  result.CFBundleVersion = get('CFBundleVersion');
  result.CFBundleGetInfoString = get('CFBundleGetInfoString');

  return result;
}

async function parseAppBundle(appPath: string): Promise<InstalledApp | null> {
  try {
    const plistPath = path.join(appPath, 'Contents', 'Info.plist');
    const plistContent = await fsp.readFile(plistPath, 'utf-8');
    const plist = parsePlist(plistContent);

    const name = plist.CFBundleDisplayName || plist.CFBundleName || path.basename(appPath, '.app');
    const bundleId = plist.CFBundleIdentifier;
    const version = plist.CFBundleShortVersionString || plist.CFBundleVersion;
    const vendor = plist.CFBundleGetInfoString?.split(',')[0]?.trim();
    const size = await getAppSize(appPath);

    let source: InstalledApp['source'] = 'unknown';
    if (appPath.startsWith('/Applications')) {
      source = 'system';
    } else if (appPath.startsWith(path.join(os.homedir(), 'Applications'))) {
      source = 'user';
    }

    return {
      id: bundleId || appPath,
      name,
      bundleId,
      path: appPath,
      size,
      sizeText: bytesToReadable(size),
      vendor,
      version,
      source,
    };
  } catch {
    return null;
  }
}

async function scanDirectoryForApps(directory: string): Promise<InstalledApp[]> {
  const apps: InstalledApp[] = [];
  try {
    const entries = await fsp.readdir(directory, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name.endsWith('.app')) {
        const appPath = path.join(directory, entry.name);
        const app = await parseAppBundle(appPath);
        if (app) apps.push(app);
      }
    }
  } catch {}
  return apps;
}

async function scanHomebrewCasks(): Promise<InstalledApp[]> {
  const apps: InstalledApp[] = [];
  try {
    const { stdout } = await execAsync('brew list --cask 2>/dev/null || true');
    const casks = stdout.trim().split('\n').filter(Boolean);
    
    for (const cask of casks) {
      const appPath = path.join('/Applications', `${cask}.app`);
      try {
        await fsp.access(appPath);
        const app = await parseAppBundle(appPath);
        if (app) {
          app.source = 'homebrew';
          apps.push(app);
        }
      } catch {}
    }
  } catch {}
  return apps;
}

function getRelatedFoldersPaths(bundleId: string, appName: string, appPath: string): Array<{ path: string; type: AppRelatedFolder['type'] }> {
  const home = os.homedir();
  const appFileName = path.basename(appPath, '.app');
  
  const paths: Array<{ path: string; type: AppRelatedFolder['type'] }> = [
    { path: appPath, type: 'main' },
  ];

  if (bundleId) {
    paths.push(
      { path: path.join(home, 'Library', 'Caches', bundleId), type: 'cache' },
      { path: path.join(home, 'Library', 'Preferences', `${bundleId}.plist`), type: 'preferences' },
      { path: path.join(home, 'Library', 'Application Support', bundleId), type: 'support' },
      { path: path.join(home, 'Library', 'Logs', bundleId), type: 'logs' },
      { path: path.join(home, 'Library', 'Containers', bundleId), type: 'containers' },
    );
  }

  paths.push(
    { path: path.join(home, 'Library', 'Caches', appFileName), type: 'cache' },
    { path: path.join(home, 'Library', 'Application Support', appName), type: 'support' },
    { path: path.join(home, 'Library', 'Application Support', appFileName), type: 'support' },
    { path: path.join(home, 'Library', 'Logs', appName), type: 'logs' },
    { path: path.join(home, 'Library', 'Logs', appFileName), type: 'logs' },
    { path: path.join(home, 'Library', appFileName), type: 'support' },
  );

  const uniquePaths = new Map<string, AppRelatedFolder['type']>();
  for (const p of paths) {
    uniquePaths.set(p.path, p.type);
  }

  return Array.from(uniquePaths.entries()).map(([path, type]) => ({ path, type }));
}

async function scanRelatedFolder(folderPath: string, type: AppRelatedFolder['type']): Promise<AppRelatedFolder | null> {
  try {
    const stat = await fsp.stat(folderPath);
    const exists = true;
    let size = 0;
    let items = 0;

    if (stat.isDirectory()) {
      size = await getDirSize(folderPath);
      items = await getDirItemCount(folderPath);
    } else if (stat.isFile()) {
      size = stat.size;
      items = 1;
    }

    return {
      path: folderPath,
      type,
      exists,
      size,
      sizeText: bytesToReadable(size),
      items,
    };
  } catch {
    return {
      path: folderPath,
      type,
      exists: false,
      size: 0,
      sizeText: '0 B',
      items: 0,
    };
  }
}

export interface StreamingScannerCallbacks {
  onAppFound: (app: InstalledApp) => void;
  onProgress: (progress: ScanProgress) => void;
}

export async function scanInstalledAppsStreaming(
  callbacks: StreamingScannerCallbacks,
  signal?: AbortSignal
): Promise<void> {
  const { onAppFound, onProgress } = callbacks;
  const home = os.homedir();
  const seenAppIds = new Set<string>();
  let appsFound = 0;

  const emitApp = (app: InstalledApp) => {
    if (seenAppIds.has(app.id)) return;
    seenAppIds.add(app.id);
    appsFound++;
    onAppFound(app);
  };

  // Scan /Applications
  if (signal?.aborted) return;
  onProgress({ phase: 'scanning', location: '/Applications', appsFound });
  
  try {
    const entries = await fsp.readdir('/Applications', { withFileTypes: true });
    for (const entry of entries) {
      if (signal?.aborted) return;
      if (entry.name.endsWith('.app')) {
        const appPath = path.join('/Applications', entry.name);
        const app = await parseAppBundle(appPath);
        if (app) emitApp(app);
      }
    }
  } catch {}

  // Scan ~/Applications
  if (signal?.aborted) return;
  const userAppsPath = path.join(home, 'Applications');
  onProgress({ phase: 'scanning', location: '~/Applications', appsFound });
  
  try {
    const entries = await fsp.readdir(userAppsPath, { withFileTypes: true });
    for (const entry of entries) {
      if (signal?.aborted) return;
      if (entry.name.endsWith('.app')) {
        const appPath = path.join(userAppsPath, entry.name);
        const app = await parseAppBundle(appPath);
        if (app) emitApp(app);
      }
    }
  } catch {}

  // Scan Homebrew casks
  if (signal?.aborted) return;
  onProgress({ phase: 'scanning', location: 'Homebrew Casks', appsFound });
  
  try {
    const { stdout } = await execAsync('brew list --cask 2>/dev/null || true');
    const casks = stdout.trim().split('\n').filter(Boolean);
    
    for (const cask of casks) {
      if (signal?.aborted) return;
      const appPath = path.join('/Applications', `${cask}.app`);
      try {
        await fsp.access(appPath);
        const app = await parseAppBundle(appPath);
        if (app) {
          app.source = 'homebrew';
          emitApp(app);
        }
      } catch {}
    }
  } catch {}

  onProgress({ phase: 'complete', appsFound });
}

export const macScanner = {
  isSupported: true,
  scanInstalledAppsStreaming,

  async scanInstalledApps(): Promise<InstalledApp[]> {
    const apps: InstalledApp[] = [];
    const home = os.homedir();

    const systemApps = await scanDirectoryForApps('/Applications');
    apps.push(...systemApps);

    const userApps = await scanDirectoryForApps(path.join(home, 'Applications'));
    apps.push(...userApps);

    const homebrewApps = await scanHomebrewCasks();
    for (const app of homebrewApps) {
      if (!apps.find(a => a.id === app.id)) {
        apps.push(app);
      }
    }

    apps.sort((a, b) => a.name.localeCompare(b.name));
    return apps;
  },

  async getAppDetails(appId: string): Promise<AppDetails> {
    const apps = await this.scanInstalledApps();
    const app = apps.find(a => a.id === appId);

    if (!app) {
      throw new Error('App not found');
    }

    const relatedPaths = getRelatedFoldersPaths(
      app.bundleId || '',
      app.name,
      app.path
    );

    const folders: AppRelatedFolder[] = [];
    for (const { path, type } of relatedPaths) {
      const folder = await scanRelatedFolder(path, type);
      if (folder) {
        folders.push(folder);
      }
    }

    const totalSize = folders
      .filter(f => f.exists)
      .reduce((sum, f) => sum + f.size, 0);

    return {
      app,
      folders,
      totalSize,
      totalSizeText: bytesToReadable(totalSize),
    };
  },

  async uninstallApp(appId: string, keepData: boolean): Promise<UninstallResult> {
    const apps = await this.scanInstalledApps();
    const app = apps.find(a => a.id === appId);

    if (!app) {
      return { success: false, error: 'App not found', movedToTrash: [] };
    }

    const movedToTrash: string[] = [];
    const errors: string[] = [];

    try {
      await shell.trashItem(app.path);
      movedToTrash.push(app.path);
    } catch (err) {
      errors.push(`Failed to move app to trash: ${(err as Error).message}`);
    }

    if (!keepData) {
      const details = await this.getAppDetails(appId);
      for (const folder of details.folders) {
        if (folder.exists && folder.type !== 'main') {
          try {
            await shell.trashItem(folder.path);
            movedToTrash.push(folder.path);
          } catch (err) {
            errors.push(`Failed to clean ${folder.path}: ${(err as Error).message}`);
          }
        }
      }
    }

    if (errors.length > 0 && movedToTrash.length === 0) {
      return { success: false, error: errors.join('; '), movedToTrash };
    }

    return { success: true, movedToTrash };
  },

  async scanLeftovers(): Promise<LeftoverFolder[]> {
    const apps = await this.scanInstalledApps();
    const installedBundleIds = new Set(apps.filter(a => a.bundleId).map(a => a.bundleId!));
    const installedAppNames = new Set(apps.map(a => a.name.toLowerCase()));

    const home = os.homedir();
    const leftovers: LeftoverFolder[] = [];

    const scanLocations = [
      { base: path.join(home, 'Library', 'Caches'), type: 'cache' as const },
      { base: path.join(home, 'Library', 'Application Support'), type: 'support' as const },
      { base: path.join(home, 'Library', 'Logs'), type: 'logs' as const },
      { base: path.join(home, 'Library', 'Containers'), type: 'containers' as const },
      { base: path.join(home, 'Library', 'Preferences'), type: 'preferences' as const },
    ];

    for (const { base, type } of scanLocations) {
      try {
        const entries = await fsp.readdir(base, { withFileTypes: true });
        for (const entry of entries) {
          const itemPath = path.join(base, entry.name);
          const itemName = entry.name.toLowerCase();

          if (entry.name.endsWith('.plist')) {
            const bundleIdHint = entry.name.replace('.plist', '');
            if (!installedBundleIds.has(bundleIdHint)) {
              const size = await getDirSize(itemPath);
              if (size > 1024) {
                leftovers.push({
                  path: itemPath,
                  type,
                  appHint: bundleIdHint,
                  size,
                  sizeText: bytesToReadable(size),
                  items: 1,
                  lastModified: new Date().toISOString(),
                });
              }
            }
          } else if (entry.isDirectory()) {
            const isInstalled = installedBundleIds.has(entry.name) || 
                               installedAppNames.has(itemName) ||
                               Array.from(installedBundleIds).some(id => id.includes(itemName));
            
            if (!isInstalled) {
              const size = await getDirSize(itemPath);
              const items = await getDirItemCount(itemPath);
              if (size > 1024 * 100) {
                let appHint = entry.name;
                
                for (const app of apps) {
                  if (app.bundleId && app.bundleId.includes(entry.name)) {
                    appHint = app.name;
                    break;
                  }
                }

                leftovers.push({
                  path: itemPath,
                  type,
                  appHint,
                  size,
                  sizeText: bytesToReadable(size),
                  items,
                  lastModified: new Date().toISOString(),
                });
              }
            }
          }
        }
      } catch {}
    }

    leftovers.sort((a, b) => b.size - a.size);
    return leftovers;
  },
};