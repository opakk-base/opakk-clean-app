(function () {
  const largeResult = document.getElementById('largeResult');
  const dryRunDelete = document.getElementById('dryRunDelete');
  const deleteSelectedBtn = document.getElementById('deleteSelectedBtn');
  const deleteResult = document.getElementById('deleteResult');

  deleteSelectedBtn.addEventListener('click', async () => {
    const checks = Array.from(largeResult.querySelectorAll('input[type="checkbox"]:checked'));
    if (!checks.length) {
      deleteResult.textContent = 'Belum ada file dipilih.';
      return;
    }

    const targets = checks
      .map((c) => window.AppState.currentLargeFiles[Number(c.dataset.index)]?.path)
      .filter(Boolean);

    deleteResult.textContent = dryRunDelete.checked ? 'Simulasi hapus...' : 'Menghapus ke Trash...';

    try {
      const res = await window.DeleteLogic.deletePaths(targets, dryRunDelete.checked);
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
})();
