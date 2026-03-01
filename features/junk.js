(function () {
  const platformNote = document.getElementById('platformNote');
  const scanJunkBtn = document.getElementById('scanJunkBtn');
  const junkResult = document.getElementById('junkResult');
  const presetDownloads = document.getElementById('presetDownloads');
  const presetMovies = document.getElementById('presetMovies');
  const presetDesktop = document.getElementById('presetDesktop');
  const rootDirInput = document.getElementById('rootDir');

  async function init() {
    try {
      const [platform, home] = await Promise.all([window.cleanerAPI.getPlatform(), window.cleanerAPI.getHome()]);
      const label = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux';
      platformNote.textContent = `Platform aktif: ${label}. Prioritas target junk: macOS > Windows > Linux.`;
      if (platform === 'darwin') rootDirInput.value = `${home}/Downloads`;

      presetDownloads.onclick = () => (rootDirInput.value = `${home}/Downloads`);
      presetMovies.onclick = () => (rootDirInput.value = `${home}/Movies`);
      presetDesktop.onclick = () => (rootDirInput.value = `${home}/Desktop`);
    } catch {}
  }

  scanJunkBtn.addEventListener('click', async () => {
    junkResult.textContent = 'Scanning...';
    try {
      const rows = await window.cleanerAPI.scanJunk([]);
      window.AppState.lastJunkRows = rows;

      if (!rows.length) {
        junkResult.textContent = 'Tidak ada target cache terdeteksi.';
        return;
      }

      junkResult.innerHTML = rows
        .map((r, idx) => {
          if (!r.exists) return `<div>❌ ${r.path} (tidak ditemukan)</div>`;
          return `
            <div>
              <div>✅ ${r.path}</div>
              <div class="muted">items: ${r.items} · perkiraan size: ${r.totalSizeText}</div>
              <button data-dry-idx="${idx}" class="clean-btn dry">Dry run</button>
              <button data-clean-idx="${idx}" class="clean-btn">Clean target ini</button>
            </div>
          `;
        })
        .join('<hr/>');

      Array.from(junkResult.querySelectorAll('[data-dry-idx]')).forEach((btn) => {
        btn.addEventListener('click', async () => {
          const idx = Number(btn.dataset.dryIdx);
          const target = rows[idx]?.path;
          if (!target) return;
          btn.disabled = true;
          btn.textContent = 'Checking...';
          try {
            const res = await window.cleanerAPI.cleanJunkTarget(target, true);
            btn.textContent = `Dry: ${res.wouldDeleteCount} item`;
          } catch (err) {
            btn.textContent = `Gagal: ${err.message}`;
          }
        });
      });

      Array.from(junkResult.querySelectorAll('[data-clean-idx]')).forEach((btn) => {
        btn.addEventListener('click', async () => {
          const idx = Number(btn.dataset.cleanIdx);
          const target = rows[idx]?.path;
          if (!target) return;
          btn.disabled = true;
          btn.textContent = 'Cleaning...';
          try {
            const res = await window.cleanerAPI.cleanJunkTarget(target, false);
            btn.textContent = `Done (${res.done.length} item)`;
          } catch (err) {
            btn.textContent = `Gagal: ${err.message}`;
          }
        });
      });
    } catch (err) {
      junkResult.textContent = `Error: ${err.message}`;
    }
  });

  init();
})();
