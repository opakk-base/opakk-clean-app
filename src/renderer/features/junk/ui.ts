import { initPlatform, scanJunk, dryRunTarget, cleanTarget } from "./logic";

const platformNote = document.getElementById("platformNote")!;
const scanJunkBtn = document.getElementById("scanJunkBtn")!;
const junkResult = document.getElementById("junkResult")!;
const presetDownloads = document.getElementById(
  "presetDownloads",
) as HTMLButtonElement;
const presetMovies = document.getElementById(
  "presetMovies",
) as HTMLButtonElement;
const presetDesktop = document.getElementById(
  "presetDesktop",
) as HTMLButtonElement;
const rootDirInput = document.getElementById("rootDir") as HTMLInputElement;

initPlatform(platformNote, rootDirInput, {
  onDownloads: (fn) => (presetDownloads.onclick = fn),
  onMovies: (fn) => (presetMovies.onclick = fn),
  onDesktop: (fn) => (presetDesktop.onclick = fn),
});

scanJunkBtn.addEventListener("click", async () => {
  junkResult.textContent = "Scanning...";
  try {
    const rows = await scanJunk();
    if (!rows.length) {
      junkResult.textContent = "Tidak ada target cache terdeteksi.";
      return;
    }

    junkResult.innerHTML = rows
      .map((r, idx) => {
        if (!r.exists) {
          return `<div>❌ <code>${escapeHtml(r.path)}</code> (tidak ditemukan)</div>`;
        }
        return `
          <div>
            <div>✅ <code>${escapeHtml(r.path)}</code></div>
            <div class="muted">items: ${r.items} · perkiraan size: ${r.totalSizeText}</div>
            <button data-dry-idx="${idx}" class="clean-btn dry">Dry run</button>
            <button data-clean-idx="${idx}" class="clean-btn">Clean target ini</button>
          </div>
        `;
      })
      .join("<hr/>");

    junkResult
      .querySelectorAll<HTMLButtonElement>("[data-dry-idx]")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const target = rows[Number(btn.dataset.dryIdx)]?.path;
          if (!target) return;
          btn.disabled = true;
          btn.textContent = "Checking...";
          try {
            const res = await dryRunTarget(target);
            btn.textContent = `Dry: ${res.wouldDeleteCount} item`;
          } catch (err) {
            btn.textContent = `Gagal: ${(err as Error).message}`;
          }
        });
      });

    junkResult
      .querySelectorAll<HTMLButtonElement>("[data-clean-idx]")
      .forEach((btn) => {
        btn.addEventListener("click", async () => {
          const target = rows[Number(btn.dataset.cleanIdx)]?.path;
          if (!target) return;
          btn.disabled = true;
          btn.textContent = "Cleaning...";
          try {
            const res = await cleanTarget(target);
            btn.textContent = `Done (${res.done.length} item)`;
          } catch (err) {
            btn.textContent = `Gagal: ${(err as Error).message}`;
          }
        });
      });
  } catch (err) {
    junkResult.textContent = `Error: ${(err as Error).message}`;
  }
});

/** Escape HTML-sensitive characters to prevent XSS via file paths */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
