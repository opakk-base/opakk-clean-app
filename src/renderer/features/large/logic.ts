import type { ScanLargeResult, DeleteResult, DeleteDryRunResult } from "../../../shared/types";
import { useAppStore } from "../../store";
import { downloadTextFile, toCsv } from "../../core/utils";

export async function scanLarge(payload: {
  rootDir: string;
  minMB: number;
  maxResults: number;
  maxDepth: number;
  extensions: string[];
}): Promise<ScanLargeResult> {
  const result = await window.cleanerAPI.scanLargeFiles(payload);
  useAppStore
    .getState()
    .setLargeFiles(result.files ?? [], result.topFolders ?? []);
  return result;
}

export async function deletePaths(
  paths: string[],
  dryRun: boolean,
): Promise<DeleteResult | DeleteDryRunResult> {
  return window.cleanerAPI.deletePaths(paths, dryRun);
}

export function exportJson(): void {
  const { largeFiles, topFolders, junkRows: junkTargets } = useAppStore.getState();
  const payload = {
    generatedAt: new Date().toISOString(),
    largeFiles,
    topFolders,
    junkTargets,
  };
  downloadTextFile(
    `cleaner-report-${Date.now()}.json`,
    JSON.stringify(payload, null, 2),
    "application/json",
  );
}

export function exportCsv(): void {
  const { largeFiles } = useAppStore.getState();
  const rows = largeFiles.map((f) => ({
    path: f.path,
    size: f.size,
    sizeText: f.sizeText,
  }));
  const csv = toCsv(rows);
  downloadTextFile(`large-files-${Date.now()}.csv`, csv, "text/csv");
}
