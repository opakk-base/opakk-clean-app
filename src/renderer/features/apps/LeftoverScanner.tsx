import { useState, useEffect, useMemo } from "react";
import type { LeftoverFolder } from "../../../shared/types";
import { scanLeftovers, cleanLeftovers } from "./logic";

interface LeftoverScannerProps {
  onRefresh: () => void;
}

export function LeftoverScanner({ onRefresh }: LeftoverScannerProps) {
  const [leftovers, setLeftovers] = useState<LeftoverFolder[]>([]);
  const [loading, setLoading] = useState(false);
  const [cleaning, setCleaning] = useState(false);
  const [selectedIndices, setSelectedIndices] = useState<Set<number>>(new Set());

  useEffect(() => {
    handleScan();
  }, []);

  const totals = useMemo(() => {
    const selectedFolders = leftovers.filter((_, idx) => selectedIndices.has(idx));
    const totalSize = selectedFolders.reduce((sum, f) => sum + f.size, 0);
    return {
      count: selectedIndices.size,
      totalSize,
      totalSizeText: formatSize(totalSize),
    };
  }, [leftovers, selectedIndices]);

  const handleScan = async () => {
    setLoading(true);
    setSelectedIndices(new Set());
    try {
      const result = await scanLeftovers();
      setLeftovers(result);
    } catch (err) {
      console.error("Failed to scan leftovers:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleIndex = (idx: number) => {
    setSelectedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedIndices(new Set(leftovers.map((_, idx) => idx)));
  };

  const handleDeselectAll = () => {
    setSelectedIndices(new Set());
  };

  const handleClean = async () => {
    if (totals.count === 0) return;

    if (!confirm(`Delete ${totals.count} selected folders (${totals.totalSizeText})?\n\nThis will move them to trash.`)) {
      return;
    }

    setCleaning(true);
    try {
      const paths = leftovers
        .filter((_, idx) => selectedIndices.has(idx))
        .map((f) => f.path);
      
      const result = await cleanLeftovers(paths);
      
      if (result.failed.length > 0) {
        alert(`Cleaned ${result.done.length} folders.\nFailed: ${result.failed.length}`);
      } else {
        alert(`Successfully cleaned ${result.done.length} folders.`);
      }
      
      handleScan();
      onRefresh();
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setCleaning(false);
    }
  };

  const formatFolderType = (type: LeftoverFolder["type"]): string => {
    const labels: Record<string, string> = {
      cache: "Cache",
      preferences: "Preferences",
      support: "App Support",
      logs: "Logs",
      containers: "Container",
    };
    return labels[type] || type;
  };

  if (loading) {
    return (
      <div className="loading-card">
        <div className="spinner" />
        <div>
          <div className="loading-title">Scanning for leftover files...</div>
          <div className="muted">Looking for orphaned app data</div>
        </div>
      </div>
    );
  }

  return (
    <div className="leftover-scanner">
      <div className="leftover-header">
        <button className="scan-btn" onClick={handleScan}>
          Rescan
        </button>
        {leftovers.length > 0 && (
          <div className="leftover-actions">
            <button className="select-action-btn" onClick={handleSelectAll}>
              Select All
            </button>
            <button className="select-action-btn" onClick={handleDeselectAll}>
              Deselect All
            </button>
          </div>
        )}
      </div>

      {leftovers.length === 0 ? (
        <div className="empty-state">
          <div className="empty-icon">✨</div>
          <p className="muted">No leftover files found. Your system is clean!</p>
        </div>
      ) : (
        <>
          <div className="leftover-summary">
            <span className="summary-item">
              <span className="summary-value">{leftovers.length}</span>
              <span className="summary-label">potential leftovers</span>
            </span>
            <span className="summary-dot">•</span>
            <span className="summary-item">
              <span className="summary-value size">{formatSize(leftovers.reduce((s, f) => s + f.size, 0))}</span>
              <span className="summary-label">total</span>
            </span>
          </div>

          <div className="leftover-list">
            {leftovers.map((folder, idx) => (
              <label key={folder.path} className="leftover-item">
                <input
                  type="checkbox"
                  checked={selectedIndices.has(idx)}
                  onChange={() => toggleIndex(idx)}
                />
                <div className="leftover-content">
                  <div className="leftover-header-row">
                    <span className="folder-type-badge">{formatFolderType(folder.type)}</span>
                    <span className="leftover-size">{folder.sizeText}</span>
                  </div>
                  {folder.appHint && (
                    <div className="leftover-hint">Possibly from: {folder.appHint}</div>
                  )}
                  <code className="leftover-path">{folder.path}</code>
                </div>
              </label>
            ))}
          </div>

          <div className="clean-section">
            <div className="clean-info">
              <span className="selected-count">
                {totals.count} selected ({totals.totalSizeText})
              </span>
            </div>
            <button
              className="clean-btn"
              onClick={handleClean}
              disabled={cleaning || totals.count === 0}
            >
              {cleaning ? "Cleaning..." : "Clean Selected"}
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function formatSize(bytes: number): string {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB", "TB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(1)} ${units[i]}`;
}