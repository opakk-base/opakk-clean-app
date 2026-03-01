const platformNote = document.getElementById('platformNote');
const scanJunkBtn = document.getElementById('scanJunkBtn');
const junkResult = document.getElementById('junkResult');

const presetDownloads = document.getElementById('presetDownloads');
const presetMovies = document.getElementById('presetMovies');
const presetDesktop = document.getElementById('presetDesktop');

const scanLargeBtn = document.getElementById('scanLargeBtn');
const exportJsonBtn = document.getElementById('exportJsonBtn');
const exportCsvBtn = document.getElementById('exportCsvBtn');
const largeResult = document.getElementById('largeResult');
const folderStats = document.getElementById('folderStats');
const rootDirInput = document.getElementById('rootDir');
const minMBInput = document.getElementById('minMB');
const extFilterInput = document.getElementById('extFilter');

const dryRunDelete = document.getElementById('dryRunDelete');
const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
const deleteResult = document.getElementById('deleteResult');

let currentLargeFiles = [];
let currentTopFolders = [];
let lastJunkRows = [];

const menuButtons = Array.from(document.querySelectorAll('.menu-btn'));
const panels = Array.from(document.querySelectorAll('.content-panel'));

function switchPanel(targetId) {
  panels.forEach((panel) => {
    panel.classList.toggle('active-panel', panel.id === targetId);
  });
  menuButtons.forEach((btn) => {
    btn.classList.toggle('active', btn.dataset.target === targetId);
  });
}

menuButtons.forEach((btn) => {
  btn.addEventListener('click', () => switchPanel(btn.dataset.target));
});

function downloadTextFile(filename, content, mime = 'text/plain') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  if (!rows.length) return '';
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? '');
    if (s.includes(',') || s.includes('"') || s.includes('\n')) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  return [headers.join(','), ...rows.map((r) => headers.map((h) => escape(r[h])).join(','))].join('\n');
}

(async function init() {
  try {
    const [platform, home] = await Promise.all([window.cleanerAPI.getPlatform(), window.cleanerAPI.getHome()]);
    const label = platform === 'darwin' ? 'macOS' : platform === 'win32' ? 'Windows' : 'Linux';
    platformNote.textContent = `Platform aktif: ${label}. Prioritas target junk: macOS > Windows > Linux.`;

    if (platform === 'darwin') {
      rootDirInput.value = `${home}/Downloads`;
    }

    presetDownloads.onclick = () => (rootDirInput.value = `${home}/Downloads`);
    presetMovies.onclick = () => (rootDirInput.value = `${home}/Movies`);
    presetDesktop.onclick = () => (rootDirInput.value = `${home}/Desktop`);
  } catch {}
})();

scanJunkBtn.addEventListener('click', async () => {
  junkResult.textContent = 'Scanning...';
  try {
    const rows = await window.cleanerAPI.scanJunk([]);
    lastJunkRows = rows;

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

scanLargeBtn.addEventListener('click', async () => {
  const rootDir = rootDirInput.value.trim();
  const minMB = Number(minMBInput.value || 100);
  const extensions = extFilterInput.value.split(',').map((s) => s.trim()).filter(Boolean);

  if (!rootDir) {
    largeResult.textContent = 'Isi folder dulu.';
    return;
  }

  largeResult.textContent = 'Scanning large files...';
  folderStats.textContent = 'Menghitung statistik folder...';

  try {
    const payload = await window.cleanerAPI.scanLargeFiles({
      rootDir,
      minMB,
      maxResults: 500,
      maxDepth: 12,
      extensions,
    });

    currentLargeFiles = payload.files || [];
    currentTopFolders = payload.topFolders || [];

    if (!currentLargeFiles.length) {
      largeResult.textContent = 'Tidak ada file besar ditemukan.';
      folderStats.textContent = 'Statistik folder kosong.';
      return;
    }

    largeResult.innerHTML = currentLargeFiles
      .map(
        (f, idx) => `
          <div class="file-item">
            <input type="checkbox" data-index="${idx}" />
            <span class="size">${f.sizeText}</span>
            <span class="path">${f.path}</span>
          </div>
        `
      )
      .join('');

    folderStats.innerHTML = currentTopFolders.length
      ? `<div><b>Top folder berdasarkan total file besar:</b></div>
        ${currentTopFolders.map((f) => `<div class="folder-row">📁 ${f.folder} <span class="size">${f.sizeText}</span></div>`).join('')}`
      : 'Statistik folder tidak tersedia.';
  } catch (err) {
    largeResult.textContent = `Error: ${err.message}`;
    folderStats.textContent = '';
  }
});

deleteSelectedBtn.addEventListener('click', async () => {
  const checks = Array.from(largeResult.querySelectorAll('input[type="checkbox"]:checked'));
  if (!checks.length) {
    deleteResult.textContent = 'Belum ada file dipilih.';
    return;
  }

  const targets = checks.map((c) => currentLargeFiles[Number(c.dataset.index)]?.path).filter(Boolean);
  deleteResult.textContent = dryRunDelete.checked ? 'Simulasi hapus...' : 'Menghapus ke Trash...';

  try {
    const res = await window.cleanerAPI.deletePaths(targets, dryRunDelete.checked);
    if (res.dryRun) {
      deleteResult.innerHTML = `<div>🧪 Dry run: ${res.wouldDeleteCount} file akan dihapus.</div>`;
      return;
    }

    deleteResult.innerHTML = `
      <div>✅ Berhasil: ${res.done.length}</div>
      <div>❌ Gagal: ${res.failed.length}</div>
      ${res.failed.length ? `<pre>${JSON.stringify(res.failed, null, 2)}</pre>` : ''}
    `;
  } catch (err) {
    deleteResult.textContent = `Error: ${err.message}`;
  }
});

exportJsonBtn.addEventListener('click', () => {
  const payload = {
    generatedAt: new Date().toISOString(),
    largeFiles: currentLargeFiles,
    topFolders: currentTopFolders,
    junkTargets: lastJunkRows,
  };
  downloadTextFile(`cleaner-report-${Date.now()}.json`, JSON.stringify(payload, null, 2), 'application/json');
});

exportCsvBtn.addEventListener('click', () => {
  const rows = currentLargeFiles.map((f) => ({ path: f.path, size: f.size, sizeText: f.sizeText }));
  const csv = toCsv(rows);
  downloadTextFile(`large-files-${Date.now()}.csv`, csv, 'text/csv');
});
