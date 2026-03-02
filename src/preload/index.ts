import { contextBridge, ipcRenderer } from "electron";
import type { CleanerAPI } from "../shared/types";

const cleanerAPI: CleanerAPI = {
  getPlatform: () => ipcRenderer.invoke("app-platform"),
  getHome: () => ipcRenderer.invoke("app-home"),
  scanJunk: (targets) => ipcRenderer.invoke("scan-junk", targets),
  cleanJunkTarget: (targetPath, dryRun) =>
    ipcRenderer.invoke("clean-junk-target", targetPath, dryRun),
  scanLargeFiles: (payload) => ipcRenderer.invoke("scan-large-files", payload),
  deletePaths: (paths, dryRun) =>
    ipcRenderer.invoke("delete-paths", paths, dryRun),
};

contextBridge.exposeInMainWorld("cleanerAPI", cleanerAPI);
