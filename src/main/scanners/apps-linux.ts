import type { PlatformScanner } from './index';
import type { InstalledApp, AppDetails, LeftoverFolder, UninstallResult } from '../../shared/types';

export const linuxScanner: PlatformScanner = {
  isSupported: false,

  async scanInstalledApps(): Promise<InstalledApp[]> {
    return [];
  },

  async getAppDetails(): Promise<AppDetails> {
    throw new Error('Linux support coming soon');
  },

  async uninstallApp(): Promise<UninstallResult> {
    return { success: false, error: 'Linux support coming soon', movedToTrash: [] };
  },

  async scanLeftovers(): Promise<LeftoverFolder[]> {
    return [];
  },
};