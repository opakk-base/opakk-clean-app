// ──────────────────────────────────────────────
// Shared type definitions for IPC communication
// between main, preload, and renderer processes
// ──────────────────────────────────────────────

// --- Junk / Cache Scanning ---

export interface JunkRow {
  path: string;
  items: number;
  exists: boolean;
  totalSize: number;
  totalSizeText: string;
}

export interface CleanJunkDryRunResult {
  dryRun: true;
  wouldDeleteCount: number;
  sample: string[];
}

export interface CleanJunkResult {
  dryRun: false;
  done: string[];
  failed: Array<{ path: string; error: string }>;
}

// --- Large File Scanning ---

export interface ScanLargePayload {
  rootDir: string;
  minMB?: number;
  maxResults?: number;
  maxDepth?: number;
  extensions?: string[];
}

export interface LargeFile {
  path: string;
  size: number;
  sizeText: string;
}

export interface TopFolder {
  folder: string;
  size: number;
  sizeText: string;
}

export interface ScanLargeResult {
  files: LargeFile[];
  topFolders: TopFolder[];
}

// --- Delete ---

export interface DeleteDryRunResult {
  dryRun: true;
  wouldDeleteCount: number;
  sample: string[];
}

export interface DeleteResult {
  dryRun: false;
  done: string[];
  failed: Array<{ path: string; error: string }>;
}

// --- Installed Apps ---

export interface InstalledApp {
  id: string;
  name: string;
  bundleId?: string;
  path: string;
  icon?: string;
  size: number;
  sizeText: string;
  vendor?: string;
  version?: string;
  source: 'system' | 'user' | 'homebrew' | 'appstore' | 'steam' | 'unknown';
}

export interface AppRelatedFolder {
  path: string;
  type: 'main' | 'cache' | 'preferences' | 'support' | 'logs' | 'containers' | 'plugins';
  exists: boolean;
  size: number;
  sizeText: string;
  items: number;
}

export interface AppDetails {
  app: InstalledApp;
  folders: AppRelatedFolder[];
  totalSize: number;
  totalSizeText: string;
}

export interface LeftoverFolder {
  path: string;
  type: AppRelatedFolder['type'];
  appHint?: string;
  size: number;
  sizeText: string;
  items: number;
  lastModified: string;
}

export interface ScannerInfo {
  platform: string;
  isSupported: boolean;
}

export interface UninstallResult {
  success: boolean;
  error?: string;
  movedToTrash: string[];
}

export interface ScanProgress {
  phase: 'scanning' | 'complete';
  location?: string;
  appsFound: number;
}

// --- Preload API ---

export interface CleanerAPI {
  getPlatform(): Promise<string>;
  getHome(): Promise<string>;
  openFolderDialog(): Promise<string | null>;
  scanJunk(targets: string[]): Promise<JunkRow[]>;
  cleanJunkTarget(
    targetPath: string,
    dryRun?: boolean,
  ): Promise<CleanJunkResult | CleanJunkDryRunResult>;
  scanLargeFiles(payload: ScanLargePayload): Promise<ScanLargeResult>;
  deletePaths(
    paths: string[],
    dryRun?: boolean,
  ): Promise<DeleteResult | DeleteDryRunResult>;
  getScannerInfo(): Promise<ScannerInfo>;
  scanInstalledApps(): Promise<InstalledApp[]>;
  getAppDetails(appId: string): Promise<AppDetails>;
  uninstallApp(appId: string, options: { keepData: boolean }): Promise<UninstallResult>;
  scanLeftovers(): Promise<LeftoverFolder[]>;
  cleanLeftovers(paths: string[]): Promise<{ done: string[]; failed: Array<{ path: string; error: string }> }>;
  onAppFound(callback: (app: InstalledApp) => void): () => void;
  onScanProgress(callback: (progress: ScanProgress) => void): () => void;
  onScanComplete(callback: () => void): () => void;
  startAppScan(): void;
  cancelAppScan(): void;
}
