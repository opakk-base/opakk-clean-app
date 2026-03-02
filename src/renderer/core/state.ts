import type { JunkRow, LargeFile, TopFolder } from "../../shared/types";

export interface AppState {
  currentLargeFiles: LargeFile[];
  currentTopFolders: TopFolder[];
  lastJunkRows: JunkRow[];
}

export const appState: AppState = {
  currentLargeFiles: [],
  currentTopFolders: [],
  lastJunkRows: [],
};
