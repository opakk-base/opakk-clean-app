"use strict";
const electron = require("electron");
electron.contextBridge.exposeInMainWorld("cleanerAPI", {
  getPlatform: () => electron.ipcRenderer.invoke("app-platform"),
  getHome: () => electron.ipcRenderer.invoke("app-home"),
  scanJunk: (targets) => electron.ipcRenderer.invoke("scan-junk", targets),
  cleanJunkTarget: (targetPath, dryRun) => electron.ipcRenderer.invoke("clean-junk-target", targetPath, dryRun),
  scanLargeFiles: (payload) => electron.ipcRenderer.invoke("scan-large-files", payload),
  deletePaths: (paths, dryRun) => electron.ipcRenderer.invoke("delete-paths", paths, dryRun)
});
