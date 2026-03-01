(function () {
  const rootDirInput = document.getElementById('rootDir');
  const minMBInput = document.getElementById('minMB');
  const extFilterInput = document.getElementById('extFilter');
  const largeResult = document.getElementById('largeResult');
  const folderStats = document.getElementById('folderStats');
  const largeLoading = document.getElementById('largeLoading');
  const scanLargeBtn = document.getElementById('scanLargeBtn');
  const exportJsonBtn = document.getElementById('exportJsonBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');

  scanLargeBtn.addEventListener('click', async () => {
    const rootDir = rootDirInput.value.trim();
    const minMB = Number(minMBInput.value || 100);
    const extensions = extFilterInput.value.split(',').map((s) => s.trim()).filter(Boolean);

    if (!rootDir) {
      largeResult.textContent = 'Isi folder dulu.';
      return;
    }

    largeResult.textContent = '';
    folderStats.textContent = '';
    largeLoading.classList.remove('hidden');

    try {
      await window.LargeLogic.scanLarge({ rootDir, minMB, maxResults: 500, maxDepth: 12, extensions });

      if (!window.AppState.currentLargeFiles.length) {
        largeLoading.classList.add('hidden');
        largeResult.textContent = 'Tidak ada file besar ditemukan.';
        folderStats.textContent = 'Statistik folder kosong.';
        return;
      }

      largeResult.innerHTML = window.AppState.currentLargeFiles
        .map((f, idx) => `
          <div class="file-item">
            <input type="checkbox" data-index="${idx}" />
            <span class="size">${f.sizeText}</span>
            <span class="path">${f.path}</span>
          </div>
        `)
        .join('');

      folderStats.innerHTML = window.AppState.currentTopFolders.length
        ? `<div><b>Top folder berdasarkan total file besar:</b></div>
          ${window.AppState.currentTopFolders.map((f) => `<div class="folder-row">📁 ${f.folder} <span class="size">${f.sizeText}</span></div>`).join('')}`
        : 'Statistik folder tidak tersedia.';

      largeLoading.classList.add('hidden');
    } catch (err) {
      largeLoading.classList.add('hidden');
      largeResult.textContent = `Error: ${err.message}`;
      folderStats.textContent = '';
    }
  });

  exportJsonBtn.addEventListener('click', window.LargeLogic.exportJson);
  exportCsvBtn.addEventListener('click', window.LargeLogic.exportCsv);
})();
