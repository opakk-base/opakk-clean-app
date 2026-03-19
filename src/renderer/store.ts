import { create } from "zustand";
import type { JunkRow, LargeFile, TopFolder } from "../shared/types";

export type Panel = "junk" | "large";

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
}));
