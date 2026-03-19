import { useState, useCallback } from "react";
import { useAppStore } from "../../store";
import { scanJunk, dryRunTarget, cleanTarget } from "./logic";

export function JunkPanel() {
  const junkRows = useAppStore((s) => s.junkRows);
  const setJunkRows = useAppStore((s) => s.setJunkRows);
  const setRootDir = useAppStore((s) => s.setRootDir);
  const home = useAppStore((s) => s.home);

  const [status, setStatus] = useState<string>("");
  const [dryResults, setDryResults] = useState<Record<number, string>>({});
  const [cleanResults, setCleanResults] = useState<Record<number, string>>(
    {},
  );

  const handleScan = useCallback(async () => {
    setStatus("Scanning...");
    setDryResults({});
    setCleanResults({});
    try {
      const rows = await scanJunk();
      setJunkRows(rows);
      if (!rows.length) {
        setStatus("Tidak ada target cache terdeteksi.");
      } else {
        setStatus("");
      }
    } catch (err) {
      setStatus(`Error: ${(err as Error).message}`);
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
        [idx]: `Dry: ${res.wouldDeleteCount} item`,
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
          [idx]: `Done (${res.done.length} item)`,
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
      <h2>1) Scan Cache / Junk</h2>
      <div className="row">
        {home && (
          <>
            <button onClick={() => handlePreset(`${home}/Downloads`)}>
              Preset Downloads
            </button>
            <button onClick={() => handlePreset(`${home}/Movies`)}>
              Preset Movies
            </button>
            <button onClick={() => handlePreset(`${home}/Desktop`)}>
              Preset Desktop
            </button>
          </>
        )}
      </div>
      <button onClick={handleScan}>Scan Junk</button>
      {junkRows.length > 0 || status ? (
        <div className="results-area">
          {status && <div className="result-sm">{status}</div>}
          {junkRows.length > 0 && (
            <div className="result">
              {junkRows.map((r, idx) => (
                <div key={r.path}>
                  {r.exists ? (
                    <div>
                      <div>
                        <code>{r.path}</code>
                      </div>
                      <div className="muted">
                        items: {r.items} &middot; perkiraan size: {r.totalSizeText}
                      </div>
                      <button
                        className="clean-btn dry"
                        disabled={!!dryResults[idx]}
                        onClick={() => handleDryRun(idx, r.path)}
                      >
                        {dryResults[idx] ?? "Dry run"}
                      </button>
                      <button
                        className="clean-btn"
                        disabled={!!cleanResults[idx]}
                        onClick={() => handleClean(idx, r.path)}
                      >
                        {cleanResults[idx] ?? "Clean target ini"}
                      </button>
                    </div>
                  ) : (
                    <div>
                      <code>{r.path}</code> (tidak ditemukan)
                    </div>
                  )}
                  {idx < junkRows.length - 1 && <hr />}
                </div>
              ))}
            </div>
          )}
        </div>
      ) : null}
    </section>
  );
}
