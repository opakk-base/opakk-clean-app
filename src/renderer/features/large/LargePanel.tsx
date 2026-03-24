import { useState, useCallback, useMemo, useRef, useEffect } from "react";
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
  const fileListRef = useRef<HTMLDivElement>(null);

  const filteredFiles = useMemo(() => {
    if (!selectedFolder) return largeFiles;
    const prefix = selectedFolder.endsWith("/") ? selectedFolder : `${selectedFolder}/`;
    return largeFiles.filter((f) => f.path.startsWith(prefix));
  }, [largeFiles, selectedFolder]);

  useEffect(() => {
    fileListRef.current?.scrollTo(0, 0);
  }, [selectedFolder]);

  const [minMB, setMinMB] = useState("100");
  const [extFilter, setExtFilter] = useState("");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const [dryRun, setDryRun] = useState(false);
  const [deleteResult, setDeleteResult] = useState<React.ReactNode>(null);

  const totals = useMemo(() => {
    const totalSize = filteredFiles.reduce((sum, f) => sum + f.size, 0);
    const totalSizeText = formatSize(totalSize);
    return {
      count: filteredFiles.length,
      totalSizeText,
      selectedCount: selectedIndices.size,
    };
  }, [filteredFiles, selectedIndices]);

  const handleBrowse = useCallback(async () => {
    const selectedPath = await window.cleanerAPI.openFolderDialog();
    if (selectedPath) {
      setRootDir(selectedPath);
    }
  }, [setRootDir]);

  const handleScan = useCallback(async () => {
    if (!rootDir.trim()) {
      setStatus("Please enter a folder path.");
      return;
    }

    setStatus("");
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
        setStatus("No large files found.");
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [rootDir, minMB, extFilter]);

  const handleDelete = useCallback(async () => {
    if (!selectedIndices.size) {
      setDeleteResult("No files selected.");
      return;
    }

    const targets = Array.from(selectedIndices)
      .map((idx) => filteredFiles[idx]?.path)
      .filter((p): p is string => Boolean(p));

    setDeleteResult(dryRun ? "Simulating delete..." : "Moving to Trash...");

    try {
      const res = await deletePaths(targets, dryRun);
      if (res.dryRun) {
        setDeleteResult(
          <div className="delete-result-card dry">
            <div className="delete-result-icon">🧪</div>
            <div className="delete-result-content">
              <div className="delete-result-title">Dry Run Complete</div>
              <div className="delete-result-detail">{res.wouldDeleteCount} files would be deleted</div>
            </div>
          </div>,
        );
      } else {
        setDeleteResult(
          <div className="delete-result-card">
            <div className="delete-result-stats">
              <div className="delete-stat success">
                <span className="stat-value">{res.done.length}</span>
                <span className="stat-label">Deleted</span>
              </div>
              <div className="delete-stat failed">
                <span className="stat-value">{res.failed.length}</span>
                <span className="stat-label">Failed</span>
              </div>
            </div>
            {res.failed.length > 0 && (
              <pre className="delete-failed-list">{JSON.stringify(res.failed, null, 2)}</pre>
            )}
          </div>,
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

  const handleSelectAll = useCallback(() => {
    filteredFiles.forEach((_, idx) => {
      if (!selectedIndices.has(idx)) {
        toggleIndex(idx);
      }
    });
  }, [filteredFiles, selectedIndices, toggleIndex]);

  const handleDeselectAll = useCallback(() => {
    selectedIndices.forEach((idx) => toggleIndex(idx));
  }, [selectedIndices, toggleIndex]);

  return (
    <section className="glass content-panel active-panel">
      <h2>Large File Finder</h2>

      <div className="large-toolbar">
        <div className="field-group folder-field">
          <label>Folder</label>
          <div className="input-with-browse">
            <input
              placeholder="e.g. /Users/username/Downloads"
              value={rootDir}
              onChange={(e) => setRootDir(e.target.value)}
            />
            <button className="browse-btn" onClick={handleBrowse}>
              Browse
            </button>
          </div>
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
          <label>Extensions (optional)</label>
          <input
            placeholder="e.g. .mp4,.zip,.dmg"
            value={extFilter}
            onChange={(e) => setExtFilter(e.target.value)}
          />
        </div>
      </div>

      <div className="large-actions">
        <button className="scan-btn" onClick={handleScan}>
          Scan Files
        </button>
        <button className="export-btn" onClick={exportJson}>
          Export JSON
        </button>
        <button className="export-btn" onClick={exportCsv}>
          Export CSV
        </button>
      </div>

      {(loading || status || largeFiles.length > 0) && (
        <div className="results-area">
          {loading && (
            <div className="loading-card">
              <div className="spinner" />
              <div>
                <div className="loading-title">Scanning for large files...</div>
                <div className="muted">
                  Traversing folders and calculating file sizes
                </div>
              </div>
            </div>
          )}

          {status && <div className="result-sm">{status}</div>}

          {!loading && largeFiles.length > 0 && (
            <>
              <div className="large-summary">
                <span className="summary-item">
                  <span className="summary-value">{totals.count}</span>
                  <span className="summary-label">files found</span>
                </span>
                <span className="summary-dot">•</span>
                <span className="summary-item">
                  <span className="summary-value size">{totals.totalSizeText}</span>
                  <span className="summary-label">total</span>
                </span>
                {totals.selectedCount > 0 && (
                  <>
                    <span className="summary-dot">•</span>
                    <span className="summary-item selected">
                      <span className="summary-value">{totals.selectedCount}</span>
                      <span className="summary-label">selected</span>
                    </span>
                  </>
                )}
              </div>

              <div className="split-view">
                {topFolders.length > 0 && (
                  <div className="split-left">
                    <div className="folder-list">
                      <div className="folder-list-header">
                        <b>Top Folders</b>
                        {selectedFolder && (
                          <button className="folder-reset-btn" onClick={() => setSelectedFolder(null)}>
                            Show All
                          </button>
                        )}
                      </div>
                      {topFolders.map((f) => (
                        <div
                          key={f.folder}
                          className={`folder-card${selectedFolder === f.folder ? " active" : ""}`}
                          onClick={() => handleFolderClick(f.folder)}
                        >
                          <span className="folder-icon">📁</span>
                          <span className="folder-name">{f.folder}</span>
                          <span className="folder-size">{f.sizeText}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                <div className="split-right">
                  {filteredFiles.length > 0 && (
                    <div className="result file-list" ref={fileListRef}>
                      <div className="file-list-header">
                        <button
                          className="select-action-btn"
                          onClick={handleSelectAll}
                        >
                          Select All
                        </button>
                        <button
                          className="select-action-btn"
                          onClick={handleDeselectAll}
                        >
                          Deselect All
                        </button>
                        {selectedFolder && (
                          <span className="filter-info">
                            {filteredFiles.length} files from {selectedFolder}
                          </span>
                        )}
                      </div>
                      {filteredFiles.map((f, idx) => (
                        <label key={f.path} className="file-card">
                          <input
                            type="checkbox"
                            checked={selectedIndices.has(idx)}
                            onChange={() => toggleIndex(idx)}
                          />
                          <span className="file-size">{f.sizeText}</span>
                          <span className="file-path">{f.path}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>
      )}

      <div className="delete-section">
        <div className="delete-options">
          <label className="dry-run-toggle">
            <input
              type="checkbox"
              checked={dryRun}
              onChange={(e) => setDryRun(e.target.checked)}
            />
            <span>Dry run (simulation)</span>
          </label>
          <div className="delete-info">
            {totals.selectedCount > 0 && (
              <span className="selected-count">
                {totals.selectedCount} file{totals.selectedCount !== 1 ? "s" : ""} selected
              </span>
            )}
          </div>
        </div>
        <button
          className="delete-btn"
          onClick={handleDelete}
          disabled={totals.selectedCount === 0}
        >
          {dryRun ? "Simulate Delete" : "Delete Selected"}
        </button>
      </div>

      {deleteResult && (
        <div className="results-area">
          <div className="result">{deleteResult}</div>
        </div>
      )}
    </section>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}