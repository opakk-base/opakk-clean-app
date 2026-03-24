import type { InstalledApp, AppDetails, LeftoverFolder, UninstallResult, ScanProgress } from '../../shared/types';
import { macScanner } from './apps-mac';
import { winScanner } from './apps-win';
import { linuxScanner } from './apps-linux';

export interface PlatformScanner {
  isSupported: boolean;
  scanInstalledApps(): Promise<InstalledApp[]>;
  getAppDetails(appId: string): Promise<AppDetails>;
  uninstallApp(appId: string, keepData: boolean): Promise<UninstallResult>;
  scanLeftovers(): Promise<LeftoverFolder[]>;
}

export interface StreamingScanner extends PlatformScanner {
  scanInstalledAppsStreaming(
    callbacks: {
      onAppFound: (app: InstalledApp) => void;
      onProgress: (progress: ScanProgress) => void;
    },
    signal?: AbortSignal
  ): Promise<void>;
}

export function getScanner(): PlatformScanner {
  const platform = process.platform;

  if (platform === 'darwin') return macScanner;
  if (platform === 'win32') return winScanner;
  return linuxScanner;
}

export function getStreamingScanner(): StreamingScanner | null {
  const platform = process.platform;
  if (platform === 'darwin') return macScanner;
  return null;
}

export function getScannerInfo(): { platform: string; isSupported: boolean } {
  const scanner = getScanner();
  return {
    platform: process.platform,
    isSupported: scanner.isSupported,
  };
}