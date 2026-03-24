import { contextBridge, ipcRenderer } from "electron";
import type { CleanerAPI, InstalledApp, ScanProgress } from "../shared/types";

const cleanerAPI: CleanerAPI = {
  getPlatform: () => ipcRenderer.invoke("app-platform"),
  getHome: () => ipcRenderer.invoke("app-home"),
  openFolderDialog: () => ipcRenderer.invoke("open-folder-dialog"),
  scanJunk: (targets) => ipcRenderer.invoke("scan-junk", targets),
  cleanJunkTarget: (targetPath, dryRun) =>
    ipcRenderer.invoke("clean-junk-target", targetPath, dryRun),
  scanLargeFiles: (payload) => ipcRenderer.invoke("scan-large-files", payload),
  deletePaths: (paths, dryRun) =>
    ipcRenderer.invoke("delete-paths", paths, dryRun),
  getScannerInfo: () => ipcRenderer.invoke("get-scanner-info"),
  scanInstalledApps: () => ipcRenderer.invoke("scan-installed-apps"),
  getAppDetails: (appId) => ipcRenderer.invoke("get-app-details", appId),
  uninstallApp: (appId, options) =>
    ipcRenderer.invoke("uninstall-app", appId, options),
  scanLeftovers: () => ipcRenderer.invoke("scan-leftovers"),
  cleanLeftovers: (paths) => ipcRenderer.invoke("clean-leftovers", paths),

  onAppFound: (callback: (app: InstalledApp) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, app: InstalledApp) => callback(app);
    ipcRenderer.on("app-found", handler);
    return () => ipcRenderer.removeListener("app-found", handler);
  },

  onScanProgress: (callback: (progress: ScanProgress) => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: ScanProgress) => callback(progress);
    ipcRenderer.on("scan-progress", handler);
    return () => ipcRenderer.removeListener("scan-progress", handler);
  },

  onScanComplete: (callback: () => void) => {
    const handler = () => callback();
    ipcRenderer.on("scan-complete", handler);
    return () => ipcRenderer.removeListener("scan-complete", handler);
  },

  startAppScan: () => ipcRenderer.send("start-app-scan"),
  cancelAppScan: () => ipcRenderer.send("cancel-app-scan"),
};

contextBridge.exposeInMainWorld("cleanerAPI", cleanerAPI);