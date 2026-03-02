import type { ScanLargeResult } from "../../../shared/types";
import { appState } from "../../core/state";
import { downloadTextFile, toCsv } from "../../core/utils";

export async function scanLarge(payload: {
  rootDir: string;
  minMB: number;
  maxResults: number;
  maxDepth: number;
  extensions: string[];
}): Promise<ScanLargeResult> {
  const result = await window.cleanerAPI.scanLargeFiles(payload);
  appState.currentLargeFiles = result.files ?? [];
  appState.currentTopFolders = result.topFolders ?? [];
  return result;
}

export function exportJson(): void {
  const payload = {
    generatedAt: new Date().toISOString(),
    largeFiles: appState.currentLargeFiles,
    topFolders: appState.currentTopFolders,
    junkTargets: appState.lastJunkRows,
  };
  downloadTextFile(
    `cleaner-report-${Date.now()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
}

export function exportCsv(): void {
  const rows = appState.currentLargeFiles.map((f) => ({
    path: f.path,
    size: f.size,
    sizeText: f.sizeText,
  }));
  const csv = toCsv(rows);
  downloadTextFile(`large-files-${Date.now()}.csv`, csv, "text/csv");
}
