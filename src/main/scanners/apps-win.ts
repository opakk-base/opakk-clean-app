import type { PlatformScanner } from './index';
import type { InstalledApp, AppDetails, LeftoverFolder, UninstallResult } from '../../shared/types';

export const winScanner: PlatformScanner = {
  isSupported: false,

  async scanInstalledApps(): Promise<InstalledApp[]> {
    return [];
  },

  async getAppDetails(): Promise<AppDetails> {
    throw new Error('Windows support coming soon');
  },

  async uninstallApp(): Promise<UninstallResult> {
    return { success: false, error: 'Windows support coming soon', movedToTrash: [] };
  },

  async scanLeftovers(): Promise<LeftoverFolder[]> {
    return [];
  },
};