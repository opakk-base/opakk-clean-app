(function () {
  const platformNote = document.getElementById('platformNote');
  const scanJunkBtn = document.getElementById('scanJunkBtn');
  const junkResult = document.getElementById('junkResult');
  const presetDownloads = document.getElementById('presetDownloads');
  const presetMovies = document.getElementById('presetMovies');
  const presetDesktop = document.getElementById('presetDesktop');
  const rootDirInput = document.getElementById('rootDir');

  window.JunkLogic.initPlatform(platformNote, rootDirInput, {
    onDownloads: (fn) => (presetDownloads.onclick = fn),
    onMovies: (fn) => (presetMovies.onclick = fn),
    onDesktop: (fn) => (presetDesktop.onclick = fn),
  });

  scanJunkBtn.addEventListener('click', async () => {
    junkResult.textContent = 'Scanning...';
    try {
      const rows = await window.JunkLogic.scanJunk();
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
          const target = rows[Number(btn.dataset.dryIdx)]?.path;
          if (!target) return;
          btn.disabled = true;
          btn.textContent = 'Checking...';
          try {
            const res = await window.JunkLogic.dryRunTarget(target);
            btn.textContent = `Dry: ${res.wouldDeleteCount} item`;
          } catch (err) {
            btn.textContent = `Gagal: ${err.message}`;
          }
        });
      });

      Array.from(junkResult.querySelectorAll('[data-clean-idx]')).forEach((btn) => {
        btn.addEventListener('click', async () => {
          const target = rows[Number(btn.dataset.cleanIdx)]?.path;
          if (!target) return;
          btn.disabled = true;
          btn.textContent = 'Cleaning...';
          try {
            const res = await window.JunkLogic.cleanTarget(target);
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
})();
