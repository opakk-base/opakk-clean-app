import { contextBridge, ipcRenderer } from 'electron';

contextBridge.exposeInMainWorld('cleanerAPI', {
  getPlatform: () => ipcRenderer.invoke('app-platform'),
  getHome: () => ipcRenderer.invoke('app-home'),
  scanJunk: (targets: string[]) => ipcRenderer.invoke('scan-junk', targets),
  cleanJunkTarget: (targetPath: string, dryRun?: boolean) => ipcRenderer.invoke('clean-junk-target', targetPath, dryRun),
  scanLargeFiles: (payload: unknown) => ipcRenderer.invoke('scan-large-files', payload),
  deletePaths: (paths: string[], dryRun?: boolean) => ipcRenderer.invoke('delete-paths', paths, dryRun),
});
