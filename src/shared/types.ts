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

// --- Preload API ---

export interface CleanerAPI {
  getPlatform(): Promise<string>;
  getHome(): Promise<string>;
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
}
