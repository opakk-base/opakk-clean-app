import { create } from "zustand";
import type { JunkRow, LargeFile, TopFolder, InstalledApp, AppDetails, LeftoverFolder, ScannerInfo, ScanProgress } from "../shared/types";

export type Panel = "junk" | "large" | "apps";

interface AppStore {
  activePanel: Panel;
  platform: string;
  home: string;
  platformLabel: string;
  largeFiles: LargeFile[];
  topFolders: TopFolder[];
  junkRows: JunkRow[];
  selectedIndices: Set<number>;
  selectedFolder: string | null;
  rootDir: string;

  setActivePanel: (panel: Panel) => void;
  setPlatform: (platform: string, home: string) => void;
  setLargeFiles: (files: LargeFile[], folders: TopFolder[]) => void;
  setJunkRows: (rows: JunkRow[]) => void;
  toggleIndex: (idx: number) => void;
  setSelectedFolder: (folder: string | null) => void;
  setRootDir: (dir: string) => void;

  installedApps: InstalledApp[];
  selectedApp: InstalledApp | null;
  appDetails: AppDetails | null;
  leftoverFolders: LeftoverFolder[];
  appsLoading: boolean;
  appsTab: "installed" | "leftovers";
  scannerInfo: ScannerInfo | null;
  appSearchQuery: string;
  selectedLeftoverIndices: Set<number>;
  scanProgress: ScanProgress | null;
  isScanning: boolean;

  setInstalledApps: (apps: InstalledApp[]) => void;
  addInstalledApp: (app: InstalledApp) => void;
  clearInstalledApps: () => void;
  sortInstalledApps: () => void;
  setSelectedApp: (app: InstalledApp | null) => void;
  setAppDetails: (details: AppDetails | null) => void;
  setLeftoverFolders: (folders: LeftoverFolder[]) => void;
  setAppsLoading: (loading: boolean) => void;
  setAppsTab: (tab: "installed" | "leftovers") => void;
  setScannerInfo: (info: ScannerInfo | null) => void;
  setAppSearchQuery: (query: string) => void;
  toggleLeftoverIndex: (idx: number) => void;
  clearSelectedApp: () => void;
  setScanProgress: (progress: ScanProgress | null) => void;
  setIsScanning: (scanning: boolean) => void;
}

export const useAppStore = create<AppStore>((set) => ({
  activePanel: "junk",
  platform: "",
  home: "",
  platformLabel: "",
  largeFiles: [],
  topFolders: [],
  junkRows: [],
  selectedIndices: new Set<number>(),
  selectedFolder: null,
  rootDir: "",

  setActivePanel: (panel) => set({ activePanel: panel }),
  setPlatform: (platform, home) => {
    const label =
      platform === "darwin"
        ? "macOS"
        : platform === "win32"
          ? "Windows"
          : "Linux";
    set({
      platform,
      home,
      platformLabel: label,
      rootDir: platform === "darwin" ? `${home}/Downloads` : "",
    });
  },
  setLargeFiles: (files, folders) =>
    set({ largeFiles: files, topFolders: folders, selectedIndices: new Set(), selectedFolder: null }),
  setJunkRows: (rows) => set({ junkRows: rows }),
  toggleIndex: (idx) =>
    set((state) => {
      const next = new Set(state.selectedIndices);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { selectedIndices: next };
    }),
  setSelectedFolder: (folder) =>
    set({ selectedFolder: folder, selectedIndices: new Set() }),
  setRootDir: (dir) => set({ rootDir: dir }),

  installedApps: [],
  selectedApp: null,
  appDetails: null,
  leftoverFolders: [],
  appsLoading: false,
  appsTab: "installed",
  scannerInfo: null,
  appSearchQuery: "",
  selectedLeftoverIndices: new Set<number>(),
  scanProgress: null,
  isScanning: false,

  setInstalledApps: (apps) => set({ installedApps: apps }),
  addInstalledApp: (app) =>
    set((state) => {
      if (state.installedApps.some((a) => a.id === app.id)) {
        return state;
      }
      return { installedApps: [...state.installedApps, app] };
    }),
  clearInstalledApps: () => set({ installedApps: [] }),
  sortInstalledApps: () =>
    set((state) => ({
      installedApps: [...state.installedApps].sort((a, b) =>
        a.name.localeCompare(b.name)
      ),
    })),
  setSelectedApp: (app) => set({ selectedApp: app, appDetails: null }),
  setAppDetails: (details) => set({ appDetails: details }),
  setLeftoverFolders: (folders) => set({ leftoverFolders: folders, selectedLeftoverIndices: new Set() }),
  setAppsLoading: (loading) => set({ appsLoading: loading }),
  setAppsTab: (tab) => set({ appsTab: tab }),
  setScannerInfo: (info) => set({ scannerInfo: info }),
  setAppSearchQuery: (query) => set({ appSearchQuery: query }),
  toggleLeftoverIndex: (idx) =>
    set((state) => {
      const next = new Set(state.selectedLeftoverIndices);
      if (next.has(idx)) next.delete(idx);
      else next.add(idx);
      return { selectedLeftoverIndices: next };
    }),
  clearSelectedApp: () => set({ selectedApp: null, appDetails: null }),
  setScanProgress: (progress) => set({ scanProgress: progress }),
  setIsScanning: (scanning) => set({ isScanning: scanning }),
}));