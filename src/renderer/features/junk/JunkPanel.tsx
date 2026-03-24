import { useState, useCallback, useMemo } from "react";
import { useAppStore } from "../../store";
import { scanJunk, dryRunTarget, cleanTarget } from "./logic";

export function JunkPanel() {
  const junkRows = useAppStore((s) => s.junkRows);
  const setJunkRows = useAppStore((s) => s.setJunkRows);
  const setRootDir = useAppStore((s) => s.setRootDir);
  const home = useAppStore((s) => s.home);

  const [status, setStatus] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [dryResults, setDryResults] = useState<Record<number, string>>({});
  const [cleanResults, setCleanResults] = useState<Record<number, string>>({});

  const totals = useMemo(() => {
    const totalItems = junkRows.reduce((sum, r) => sum + r.items, 0);
    const totalBytes = junkRows.reduce((sum, r) => sum + r.totalSize, 0);
    const totalSizeText = formatSize(totalBytes);
    return { totalItems, totalSizeText, count: junkRows.length };
  }, [junkRows]);

  const handleScan = useCallback(async () => {
    setStatus("");
    setLoading(true);
    setDryResults({});
    setCleanResults({});
    try {
      const rows = await scanJunk();
      setJunkRows(rows);
      if (!rows.length) {
        setStatus("Tidak ada target cache terdeteksi.");
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
    } finally {
      setLoading(false);
    }
  }, [setJunkRows]);

  const handlePreset = useCallback(
    (dir: string) => {
      setRootDir(dir);
    },
    [setRootDir],
  );

  const handleDryRun = useCallback(async (idx: number, targetPath: string) => {
    setDryResults((prev) => ({ ...prev, [idx]: "Checking..." }));
    try {
      const res = await dryRunTarget(targetPath);
      setDryResults((prev) => ({
        ...prev,
        [idx]: `${res.wouldDeleteCount} item`,
      }));
    } catch (err) {
      setDryResults((prev) => ({
        ...prev,
        [idx]: `Gagal: ${(err as Error).message}`,
      }));
    }
  }, []);

  const handleClean = useCallback(
    async (idx: number, targetPath: string) => {
      setCleanResults((prev) => ({ ...prev, [idx]: "Cleaning..." }));
      try {
        const res = await cleanTarget(targetPath);
        setCleanResults((prev) => ({
          ...prev,
          [idx]: `${res.done.length} item`,
        }));
      } catch (err) {
        setCleanResults((prev) => ({
          ...prev,
          [idx]: `Gagal: ${(err as Error).message}`,
        }));
      }
    },
    [],
  );

  return (
    <section className="glass content-panel active-panel">
      <h2>Cache / Junk Cleaner</h2>
      
      <div className="junk-toolbar">
        <div className="junk-presets">
          <span className="junk-presets-label">Presets:</span>
          {home && (
            <>
              <button
                className="preset-btn"
                onClick={() => handlePreset(`${home}/Downloads`)}
              >
                Downloads
              </button>
              <button
                className="preset-btn"
                onClick={() => handlePreset(`${home}/Movies`)}
              >
                Movies
              </button>
              <button
                className="preset-btn"
                onClick={() => handlePreset(`${home}/Desktop`)}
              >
                Desktop
              </button>
            </>
          )}
        </div>
        <button className="scan-btn" onClick={handleScan}>
          Scan Junk
        </button>
      </div>

      {(loading || status || junkRows.length > 0) && (
        <div className="results-area">
          {loading && (
            <div className="loading-card">
              <div className="spinner" />
              <div>
                <div className="loading-title">Scanning for junk files...</div>
                <div className="muted">
                  Checking cache directories and temporary files
                </div>
              </div>
            </div>
          )}

          {status && <div className="result-sm">{status}</div>}

          {junkRows.length > 0 && !loading && (
            <>
              <div className="junk-summary">
                <span className="junk-summary-count">{totals.count} targets</span>
                <span className="junk-summary-dot">•</span>
                <span className="junk-summary-items">{totals.totalItems} items</span>
                <span className="junk-summary-dot">•</span>
                <span className="junk-summary-size">{totals.totalSizeText}</span>
              </div>

              <div className="result junk-list">
                {junkRows.map((r, idx) => (
                  <div
                    key={r.path}
                    className={`junk-card${!r.exists ? " not-found" : ""}`}
                  >
                    <div className="junk-card-header">
                      <code className="junk-card-path">{r.path}</code>
                      {!r.exists && (
                        <span className="junk-card-badge not-found">Not found</span>
                      )}
                    </div>
                    {r.exists && (
                      <>
                        <div className="junk-card-meta">
                          <span className="junk-meta-item">
                            <span className="junk-meta-label">Items:</span>
                            <span className="junk-meta-value">{r.items}</span>
                          </span>
                          <span className="junk-meta-sep">•</span>
                          <span className="junk-meta-item">
                            <span className="junk-meta-label">Size:</span>
                            <span className="junk-meta-value size">{r.totalSizeText}</span>
                          </span>
                        </div>
                        <div className="junk-card-actions">
                          <button
                            className="junk-action-btn dry"
                            disabled={!!dryResults[idx]}
                            onClick={() => handleDryRun(idx, r.path)}
                          >
                            {dryResults[idx] ? (
                              <>
                                <span className="action-label">Dry:</span>
                                <span className="action-result">{dryResults[idx]}</span>
                              </>
                            ) : (
                              "Dry Run"
                            )}
                          </button>
                          <button
                            className="junk-action-btn clean"
                            disabled={!!cleanResults[idx]}
                            onClick={() => handleClean(idx, r.path)}
                          >
                            {cleanResults[idx] ? (
                              <>
                                <span className="action-label">Cleaned:</span>
                                <span className="action-result">{cleanResults[idx]}</span>
                              </>
                            ) : (
                              "Clean"
                            )}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </>
          )}
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