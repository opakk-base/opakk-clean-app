(function () {
  async function initPlatform(platformNoteEl, rootDirInput, presetHandlers) {
    try {
      const [platform, home] = await Promise.all([window.cleanerAPI.getPlatform(), window.cleanerAPI.getHome()]);
      const label = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux';
      platformNoteEl.textContent = `Platform aktif: ${label}. Prioritas target junk: macOS > Windows > Linux.`;
      if (platform === 'darwin') rootDirInput.value = `${home}/Downloads`;

      presetHandlers.onDownloads(() => (rootDirInput.value = `${home}/Downloads`));
      presetHandlers.onMovies(() => (rootDirInput.value = `${home}/Movies`));
      presetHandlers.onDesktop(() => (rootDirInput.value = `${home}/Desktop`));
    } catch {}
  }

  async function scanJunk() {
    const rows = await window.cleanerAPI.scanJunk([]);
    window.AppState.lastJunkRows = rows;
    return rows;
  }

  async function dryRunTarget(path) {
    return window.cleanerAPI.cleanJunkTarget(path, true);
  }

  async function cleanTarget(path) {
    return window.cleanerAPI.cleanJunkTarget(path, false);
  }

  window.JunkLogic = { initPlatform, scanJunk, dryRunTarget, cleanTarget };
})();
