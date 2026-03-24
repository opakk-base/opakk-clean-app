import type { InstalledApp, AppDetails, LeftoverFolder, ScannerInfo, UninstallResult, ScanProgress } from "../../../shared/types";

export async function getScannerInfo(): Promise<ScannerInfo> {
  return window.cleanerAPI.getScannerInfo();
}

export async function scanInstalledApps(): Promise<InstalledApp[]> {
  return window.cleanerAPI.scanInstalledApps();
}

export async function getAppDetails(appId: string): Promise<AppDetails> {
  return window.cleanerAPI.getAppDetails(appId);
}

export async function uninstallApp(appId: string, keepData: boolean): Promise<UninstallResult> {
  return window.cleanerAPI.uninstallApp(appId, { keepData });
}

export async function scanLeftovers(): Promise<LeftoverFolder[]> {
  return window.cleanerAPI.scanLeftovers();
}

export async function cleanLeftovers(paths: string[]): Promise<{ done: string[]; failed: Array<{ path: string; error: string }> }> {
  return window.cleanerAPI.cleanLeftovers(paths);
}

export function subscribeToAppScan(
  onAppFound: (app: InstalledApp) => void,
  onProgress: (progress: ScanProgress) => void,
  onComplete: () => void
): () => void {
  const unsub1 = window.cleanerAPI.onAppFound(onAppFound);
  const unsub2 = window.cleanerAPI.onScanProgress(onProgress);
  const unsub3 = window.cleanerAPI.onScanComplete(onComplete);

  window.cleanerAPI.startAppScan();

  return () => {
    unsub1();
    unsub2();
    unsub3();
  };
}

export function cancelAppScan(): void {
  window.cleanerAPI.cancelAppScan();
}