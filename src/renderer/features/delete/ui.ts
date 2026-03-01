import { deletePaths } from "./logic";
import { appState } from "../../core/state";

const largeResult = document.getElementById("largeResult")!;
const dryRunDelete = document.getElementById(
  "dryRunDelete",
) as HTMLInputElement;
const deleteSelectedBtn = document.getElementById("deleteSelectedBtn")!;
const deleteResult = document.getElementById("deleteResult")!;

deleteSelectedBtn.addEventListener("click", async () => {
  const checks = Array.from(
    largeResult.querySelectorAll<HTMLInputElement>(
      'input[type="checkbox"]:checked',
    ),
  );
  if (!checks.length) {
    deleteResult.textContent = "Belum ada file dipilih.";
    return;
  }

  const targets = checks
    .map((c) => appState.currentLargeFiles[Number(c.dataset.index)]?.path)
    .filter((p): p is string => Boolean(p));

  deleteResult.textContent = dryRunDelete.checked
    ? "Simulasi hapus..."
    : "Menghapus ke Trash...";

  try {
    const res = await deletePaths(targets, dryRunDelete.checked);
    if (res.dryRun) {
      deleteResult.innerHTML = `<div>🧪 Dry run: ${res.wouldDeleteCount} file akan dihapus.</div>`;
      return;
    }

    deleteResult.innerHTML = `
      <div>✅ Berhasil: ${res.done.length}</div>
      <div>❌ Gagal: ${res.failed.length}</div>
      ${res.failed.length ? `<pre>${escapeHtml(JSON.stringify(res.failed, null, 2))}</pre>` : ""}
    `;
  } catch (err) {
    deleteResult.textContent = `Error: ${(err as Error).message}`;
  }
});

/** Escape HTML-sensitive characters */
function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
