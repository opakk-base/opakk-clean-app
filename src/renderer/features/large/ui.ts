import { scanLarge, exportJson, exportCsv } from "./logic";
import { appState } from "../../core/state";

const rootDirInput = document.getElementById("rootDir") as HTMLInputElement;
const minMBInput = document.getElementById("minMB") as HTMLInputElement;
const extFilterInput = document.getElementById("extFilter") as HTMLInputElement;
const largeResult = document.getElementById("largeResult")!;
const folderStats = document.getElementById("folderStats")!;
const largeLoading = document.getElementById("largeLoading")!;
const scanLargeBtn = document.getElementById("scanLargeBtn")!;
const exportJsonBtn = document.getElementById("exportJsonBtn")!;
const exportCsvBtn = document.getElementById("exportCsvBtn")!;

scanLargeBtn.addEventListener("click", async () => {
  const rootDir = rootDirInput.value.trim();
  const minMB = Number(minMBInput.value || 100);
  const extensions = extFilterInput.value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  if (!rootDir) {
    largeResult.textContent = "Isi folder dulu.";
    return;
  }

  largeResult.textContent = "";
  folderStats.textContent = "";
  largeLoading.classList.remove("hidden");

  try {
    await scanLarge({
      rootDir,
      minMB,
      maxResults: 500,
      maxDepth: 12,
      extensions,
    });

    if (!appState.currentLargeFiles.length) {
      largeLoading.classList.add("hidden");
      largeResult.textContent = "Tidak ada file besar ditemukan.";
      folderStats.textContent = "Statistik folder kosong.";
      return;
    }

    largeResult.innerHTML = appState.currentLargeFiles
      .map(
        (f, idx) => `
        <div class="file-item">
          <input type="checkbox" data-index="${idx}" />
          <span class="size">${escapeHtml(f.sizeText)}</span>
          <span class="path">${escapeHtml(f.path)}</span>
        </div>
      `,
      )
      .join("");

    folderStats.innerHTML = appState.currentTopFolders.length
      ? `<div><b>Top folder berdasarkan total file besar:</b></div>
         ${appState.currentTopFolders.map((f) => `<div class="folder-row">📁 ${escapeHtml(f.folder)} <span class="size">${escapeHtml(f.sizeText)}</span></div>`).join("")}`
      : "Statistik folder tidak tersedia.";

    largeLoading.classList.add("hidden");
  } catch (err) {
    largeLoading.classList.add("hidden");
    largeResult.textContent = `Error: ${(err as Error).message}`;
    folderStats.textContent = "";
  }
});

exportJsonBtn.addEventListener("click", exportJson);
exportCsvBtn.addEventListener("click", exportCsv);

/** Escape HTML-sensitive characters to prevent XSS via file paths */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
