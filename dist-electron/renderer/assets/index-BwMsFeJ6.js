window.AppState = {
  currentLargeFiles: [],
  currentTopFolders: [],
  lastJunkRows: []
};
function downloadTextFile(filename, content, mime = "text/plain") {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
function toCsv(rows) {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}
window.AppUtils = { downloadTextFile, toCsv };
(function() {
  function switchPanel(targetId, panels, menuButtons) {
    panels.forEach((panel) => panel.classList.toggle("active-panel", panel.id === targetId));
    menuButtons.forEach((btn) => btn.classList.toggle("active", btn.dataset.target === targetId));
  }
  window.SidebarLogic = { switchPanel };
})();
(function() {
  const menuButtons = Array.from(document.querySelectorAll(".menu-btn"));
  const panels = Array.from(document.querySelectorAll(".content-panel"));
  menuButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      window.SidebarLogic.switchPanel(btn.dataset.target, panels, menuButtons);
    });
  });
})();
(function() {
  async function initPlatform(platformNoteEl, rootDirInput, presetHandlers) {
    try {
      const [platform, home] = await Promise.all([window.cleanerAPI.getPlatform(), window.cleanerAPI.getHome()]);
      const label = platform === "darwin" ? "macOS" : platform === "win32" ? "Windows" : "Linux";
      platformNoteEl.textContent = `Platform aktif: ${label}. Prioritas target junk: macOS > Windows > Linux.`;
      if (platform === "darwin") rootDirInput.value = `${home}/Downloads`;
      presetHandlers.onDownloads(() => rootDirInput.value = `${home}/Downloads`);
      presetHandlers.onMovies(() => rootDirInput.value = `${home}/Movies`);
      presetHandlers.onDesktop(() => rootDirInput.value = `${home}/Desktop`);
    } catch {
    }
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
(function() {
  const platformNote = document.getElementById("platformNote");
  const scanJunkBtn = document.getElementById("scanJunkBtn");
  const junkResult = document.getElementById("junkResult");
  const presetDownloads = document.getElementById("presetDownloads");
  const presetMovies = document.getElementById("presetMovies");
  const presetDesktop = document.getElementById("presetDesktop");
  const rootDirInput = document.getElementById("rootDir");
  window.JunkLogic.initPlatform(platformNote, rootDirInput, {
    onDownloads: (fn) => presetDownloads.onclick = fn,
    onMovies: (fn) => presetMovies.onclick = fn,
    onDesktop: (fn) => presetDesktop.onclick = fn
  });
  scanJunkBtn.addEventListener("click", async () => {
    junkResult.textContent = "Scanning...";
    try {
      const rows = await window.JunkLogic.scanJunk();
      if (!rows.length) {
        junkResult.textContent = "Tidak ada target cache terdeteksi.";
        return;
      }
      junkResult.innerHTML = rows.map((r, idx) => {
        if (!r.exists) return `<div>❌ ${r.path} (tidak ditemukan)</div>`;
        return `
            <div>
              <div>✅ ${r.path}</div>
              <div class="muted">items: ${r.items} · perkiraan size: ${r.totalSizeText}</div>
              <button data-dry-idx="${idx}" class="clean-btn dry">Dry run</button>
              <button data-clean-idx="${idx}" class="clean-btn">Clean target ini</button>
            </div>
          `;
      }).join("<hr/>");
      Array.from(junkResult.querySelectorAll("[data-dry-idx]")).forEach((btn) => {
        btn.addEventListener("click", async () => {
          const target = rows[Number(btn.dataset.dryIdx)]?.path;
          if (!target) return;
          btn.disabled = true;
          btn.textContent = "Checking...";
          try {
            const res = await window.JunkLogic.dryRunTarget(target);
            btn.textContent = `Dry: ${res.wouldDeleteCount} item`;
          } catch (err) {
            btn.textContent = `Gagal: ${err.message}`;
          }
        });
      });
      Array.from(junkResult.querySelectorAll("[data-clean-idx]")).forEach((btn) => {
        btn.addEventListener("click", async () => {
          const target = rows[Number(btn.dataset.cleanIdx)]?.path;
          if (!target) return;
          btn.disabled = true;
          btn.textContent = "Cleaning...";
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
(function() {
  async function scanLarge(payload) {
    const result = await window.cleanerAPI.scanLargeFiles(payload);
    window.AppState.currentLargeFiles = result.files || [];
    window.AppState.currentTopFolders = result.topFolders || [];
    return result;
  }
  function exportJson() {
    const payload = {
      generatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      largeFiles: window.AppState.currentLargeFiles,
      topFolders: window.AppState.currentTopFolders,
      junkTargets: window.AppState.lastJunkRows
    };
    window.AppUtils.downloadTextFile(`cleaner-report-${Date.now()}.json`, JSON.stringify(payload, null, 2), "application/json");
  }
  function exportCsv() {
    const rows = window.AppState.currentLargeFiles.map((f) => ({ path: f.path, size: f.size, sizeText: f.sizeText }));
    const csv = window.AppUtils.toCsv(rows);
    window.AppUtils.downloadTextFile(`large-files-${Date.now()}.csv`, csv, "text/csv");
  }
  window.LargeLogic = { scanLarge, exportJson, exportCsv };
})();
(function() {
  const rootDirInput = document.getElementById("rootDir");
  const minMBInput = document.getElementById("minMB");
  const extFilterInput = document.getElementById("extFilter");
  const largeResult = document.getElementById("largeResult");
  const folderStats = document.getElementById("folderStats");
  const largeLoading = document.getElementById("largeLoading");
  const scanLargeBtn = document.getElementById("scanLargeBtn");
  const exportJsonBtn = document.getElementById("exportJsonBtn");
  const exportCsvBtn = document.getElementById("exportCsvBtn");
  scanLargeBtn.addEventListener("click", async () => {
    const rootDir = rootDirInput.value.trim();
    const minMB = Number(minMBInput.value || 100);
    const extensions = extFilterInput.value.split(",").map((s) => s.trim()).filter(Boolean);
    if (!rootDir) {
      largeResult.textContent = "Isi folder dulu.";
      return;
    }
    largeResult.textContent = "";
    folderStats.textContent = "";
    largeLoading.classList.remove("hidden");
    try {
      await window.LargeLogic.scanLarge({ rootDir, minMB, maxResults: 500, maxDepth: 12, extensions });
      if (!window.AppState.currentLargeFiles.length) {
        largeLoading.classList.add("hidden");
        largeResult.textContent = "Tidak ada file besar ditemukan.";
        folderStats.textContent = "Statistik folder kosong.";
        return;
      }
      largeResult.innerHTML = window.AppState.currentLargeFiles.map((f, idx) => `
          <div class="file-item">
            <input type="checkbox" data-index="${idx}" />
            <span class="size">${f.sizeText}</span>
            <span class="path">${f.path}</span>
          </div>
        `).join("");
      folderStats.innerHTML = window.AppState.currentTopFolders.length ? `<div><b>Top folder berdasarkan total file besar:</b></div>
          ${window.AppState.currentTopFolders.map((f) => `<div class="folder-row">📁 ${f.folder} <span class="size">${f.sizeText}</span></div>`).join("")}` : "Statistik folder tidak tersedia.";
      largeLoading.classList.add("hidden");
    } catch (err) {
      largeLoading.classList.add("hidden");
      largeResult.textContent = `Error: ${err.message}`;
      folderStats.textContent = "";
    }
  });
  exportJsonBtn.addEventListener("click", window.LargeLogic.exportJson);
  exportCsvBtn.addEventListener("click", window.LargeLogic.exportCsv);
})();
(function() {
  async function deletePaths(paths, dryRun) {
    return window.cleanerAPI.deletePaths(paths, dryRun);
  }
  window.DeleteLogic = { deletePaths };
})();
(function() {
  const largeResult = document.getElementById("largeResult");
  const dryRunDelete = document.getElementById("dryRunDelete");
  const deleteSelectedBtn = document.getElementById("deleteSelectedBtn");
  const deleteResult = document.getElementById("deleteResult");
  deleteSelectedBtn.addEventListener("click", async () => {
    const checks = Array.from(largeResult.querySelectorAll('input[type="checkbox"]:checked'));
    if (!checks.length) {
      deleteResult.textContent = "Belum ada file dipilih.";
      return;
    }
    const targets = checks.map((c) => window.AppState.currentLargeFiles[Number(c.dataset.index)]?.path).filter(Boolean);
    deleteResult.textContent = dryRunDelete.checked ? "Simulasi hapus..." : "Menghapus ke Trash...";
    try {
      const res = await window.DeleteLogic.deletePaths(targets, dryRunDelete.checked);
      if (res.dryRun) {
        deleteResult.innerHTML = `<div>🧪 Dry run: ${res.wouldDeleteCount} file akan dihapus.</div>`;
        return;
      }
      deleteResult.innerHTML = `
        <div>✅ Berhasil: ${res.done.length}</div>
        <div>❌ Gagal: ${res.failed.length}</div>
        ${res.failed.length ? `<pre>${JSON.stringify(res.failed, null, 2)}</pre>` : ""}
      `;
    } catch (err) {
      deleteResult.textContent = `Error: ${err.message}`;
    }
  });
})();
