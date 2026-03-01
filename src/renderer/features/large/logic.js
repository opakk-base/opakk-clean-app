(function () {
  async function scanLarge(payload) {
    const result = await window.cleanerAPI.scanLargeFiles(payload);
    window.AppState.currentLargeFiles = result.files || [];
    window.AppState.currentTopFolders = result.topFolders || [];
    return result;
  }

  function exportJson() {
    const payload = {
      generatedAt: new Date().toISOString(),
      largeFiles: window.AppState.currentLargeFiles,
      topFolders: window.AppState.currentTopFolders,
      junkTargets: window.AppState.lastJunkRows,
    };
    window.AppUtils.downloadTextFile(`cleaner-report-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json');
  }

  function exportCsv() {
    const rows = window.AppState.currentLargeFiles.map((f) => ({ path: f.path, size: f.size, sizeText: f.sizeText }));
    const csv = window.AppUtils.toCsv(rows);
    window.AppUtils.downloadTextFile(`large-files-${Date.now()}.csv`, csv, 'text/csv');
  }

  window.LargeLogic = { scanLarge, exportJson, exportCsv };
})();
