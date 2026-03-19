import { useState, useCallback, useMemo } from "react";
import { useAppStore } from "../../store";
import { scanLarge, exportJson, exportCsv, deletePaths } from "./logic";

export function LargePanel() {
  const largeFiles = useAppStore((s) => s.largeFiles);
  const topFolders = useAppStore((s) => s.topFolders);
  const selectedIndices = useAppStore((s) => s.selectedIndices);
  const selectedFolder = useAppStore((s) => s.selectedFolder);
  const toggleIndex = useAppStore((s) => s.toggleIndex);
  const setSelectedFolder = useAppStore((s) => s.setSelectedFolder);
  const rootDir = useAppStore((s) => s.rootDir);
  const setRootDir = useAppStore((s) => s.setRootDir);

  const filteredFiles = useMemo(() => {
    if (!selectedFolder) return largeFiles;
    const prefix = selectedFolder.endsWith("/") ? selectedFolder : `${selectedFolder}/`;
    return largeFiles.filter((f) => f.path.startsWith(prefix));
  }, [largeFiles, selectedFolder]);

  const [minMB, setMinMB] = useState("100");
  const [extFilter, setExtFilter] = useState("");
  const [status, setStatus] = useState("");
  const [folderStatsText, setFolderStatsText] = useState("");
  const [loading, setLoading] = useState(false);

  const [dryRun, setDryRun] = useState(false);
  const [deleteResult, setDeleteResult] = useState<React.ReactNode>(null);

  const handleScan = useCallback(async () => {
    if (!rootDir.trim()) {
      setStatus("Isi folder dulu.");
      return;
    }

    setStatus("");
    setFolderStatsText("");
    setLoading(true);

    try {
      const extensions = extFilter
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const result = await scanLarge({
        rootDir: rootDir.trim(),
        minMB: Number(minMB || 100),
        maxResults: 500,
        maxDepth: 12,
        extensions,
      });

      if (!(result.files?.length)) {
        setStatus("Tidak ada file besar ditemukan.");
        setFolderStatsText("Statistik folder kosong.");
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
      setFolderStatsText("");
    } finally {
      setLoading(false);
    }
  }, [rootDir, minMB, extFilter]);

  const handleDelete = useCallback(async () => {
    if (!selectedIndices.size) {
      setDeleteResult("Belum ada file dipilih.");
      return;
    }

    const targets = Array.from(selectedIndices)
      .map((idx) => filteredFiles[idx]?.path)
      .filter((p): p is string => Boolean(p));

    setDeleteResult(dryRun ? "Simulasi hapus..." : "Menghapus ke Trash...");

    try {
      const res = await deletePaths(targets, dryRun);
      if (res.dryRun) {
        setDeleteResult(
          <div>🧪 Dry run: {res.wouldDeleteCount} file akan dihapus.</div>,
        );
      } else {
        setDeleteResult(
          <>
            <div>✅ Berhasil: {res.done.length}</div>
            <div>❌ Gagal: {res.failed.length}</div>
            {res.failed.length > 0 && (
              <pre>{JSON.stringify(res.failed, null, 2)}</pre>
            )}
          </>,
        );
      }
    } catch (err) {
      setDeleteResult(`Error: ${(err as Error).message}`);
    }
  }, [selectedIndices, filteredFiles, dryRun]);

  const handleFolderClick = useCallback(
    (folder: string) => {
      setSelectedFolder(selectedFolder === folder ? null : folder);
    },
    [selectedFolder, setSelectedFolder],
  );

  return (
    <section className="glass content-panel active-panel">
      <h2>Cari File Besar</h2>
      <div className="large-toolbar">
        <div className="field-group">
          <label>Folder</label>
          <input
            placeholder="contoh: /Users/rizal/Downloads"
            value={rootDir}
            onChange={(e) => setRootDir(e.target.value)}
          />
        </div>
        <div className="field-group small">
          <label>Min size (MB)</label>
          <input
            type="number"
            value={minMB}
            min={1}
            onChange={(e) => setMinMB(e.target.value)}
          />
        </div>
        <div className="field-group">
          <label>Filter ext (opsional)</label>
          <input
            placeholder="contoh: .mp4,.zip,.dmg"
            value={extFilter}
            onChange={(e) => setExtFilter(e.target.value)}
          />
        </div>
      </div>
      <div className="row left-actions">
        <button onClick={handleScan}>Scan File Besar</button>
        <button onClick={exportJson}>Export JSON</button>
        <button onClick={exportCsv}>Export CSV</button>
      </div>

      {(loading || status || largeFiles.length > 0 || folderStatsText) ? (
        <div className="results-area">
          {loading && (
            <div className="loading-card">
              <div className="spinner" />
              <div>
                <div className="loading-title">Sedang scan file besar...</div>
                <div className="muted">
                  Menjelajah folder dan menghitung ukuran file
                </div>
              </div>
            </div>
          )}

          {status && <div className="result-sm">{status}</div>}

          {topFolders.length > 0 && (
            <div className="result-sm folder-list">
              <div className="folder-list-header">
                <b>Top folder berdasarkan total file besar:</b>
                {selectedFolder && (
                  <button className="folder-reset-btn" onClick={() => setSelectedFolder(null)}>
                    Tampilkan semua
                  </button>
                )}
              </div>
              {topFolders.map((f) => (
                <div
                  key={f.folder}
                  className={`folder-row${selectedFolder === f.folder ? " active" : ""}`}
                  onClick={() => handleFolderClick(f.folder)}
                >
                  <span className="folder-name">📁 {f.folder}</span>
                  <span className="size">{f.sizeText}</span>
                </div>
              ))}
            </div>
          )}

          {filteredFiles.length > 0 && (
            <div className="result">
              {selectedFolder && (
                <div className="muted filter-info">
                  Menampilkan {filteredFiles.length} file dari {selectedFolder}
                </div>
              )}
              {filteredFiles.map((f, idx) => (
                <div key={f.path} className="file-item">
                  <input
                    type="checkbox"
                    checked={selectedIndices.has(idx)}
                    onChange={() => toggleIndex(idx)}
                  />
                  <span className="size">{f.sizeText}</span>
                  <span className="path">{f.path}</span>
                </div>
              ))}
            </div>
          )}

          {folderStatsText && <div className="result-sm">{folderStatsText}</div>}
        </div>
      ) : null}

      <div className="delete-section">
        <label className="row-inline">
          <input
            type="checkbox"
            checked={dryRun}
            onChange={(e) => setDryRun(e.target.checked)}
          />
          Dry run (simulasi, tanpa hapus)
        </label>
        <button className="clean-btn" onClick={handleDelete}>Hapus Yang Dipilih</button>
      </div>

      {deleteResult && (
        <div className="results-area">
          <div className="result">{deleteResult}</div>
        </div>
      )}
    </section>
  );
}
