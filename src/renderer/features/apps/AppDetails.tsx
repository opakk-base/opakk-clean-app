import { useState, useEffect } from "react";
import type { AppDetails, AppRelatedFolder } from "../../../shared/types";
import { getAppDetails, uninstallApp } from "./logic";

interface AppDetailsViewProps {
  appId: string;
  appName: string;
  onBack: () => void;
  onUninstalled: () => void;
}

export function AppDetailsView({ appId, appName, onBack, onUninstalled }: AppDetailsViewProps) {
  const [details, setDetails] = useState<AppDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [uninstalling, setUninstalling] = useState(false);
  const [keepData, setKeepData] = useState(false);
  const [selectedFolders, setSelectedFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadDetails();
  }, [appId]);

  const loadDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getAppDetails(appId);
      setDetails(result);
      const allPaths = result.folders.filter((f: AppRelatedFolder) => f.exists).map((f: AppRelatedFolder) => f.path);
      setSelectedFolders(new Set(allPaths));
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const toggleFolder = (path: string) => {
    setSelectedFolders((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };

  const handleUninstall = async () => {
    if (!confirm(`Are you sure you want to uninstall "${appName}"?\n\nThis will move the app and selected data to trash.`)) {
      return;
    }

    setUninstalling(true);
    try {
      const result = await uninstallApp(appId, keepData);
      if (result.success) {
        alert(`Successfully uninstalled ${appName}.\nMoved ${result.movedToTrash.length} items to trash.`);
        onUninstalled();
      } else {
        alert(`Failed to uninstall: ${result.error}`);
      }
    } catch (err) {
      alert(`Error: ${(err as Error).message}`);
    } finally {
      setUninstalling(false);
    }
  };

  const formatFolderType = (type: AppRelatedFolder["type"]): string => {
    const labels: Record<AppRelatedFolder["type"], string> = {
      main: "Application",
      cache: "Cache",
      preferences: "Preferences",
      support: "Application Support",
      logs: "Logs",
      containers: "Container (Sandbox)",
      plugins: "Plugins",
    };
    return labels[type];
  };

  if (loading) {
    return (
      <div className="app-details-loading">
        <div className="loading-card">
          <div className="spinner" />
          <div>
            <div className="loading-title">Loading app details...</div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="app-details-error">
        <p className="error-message">{error}</p>
        <button className="back-btn" onClick={onBack}>
          ← Back to Apps
        </button>
      </div>
    );
  }

  if (!details) return null;

  const existingFolders = details.folders.filter((f) => f.exists);

  return (
    <div className="app-details">
      <div className="app-details-header">
        <button className="back-btn" onClick={onBack}>
          ← Back
        </button>
        <h3>{details.app.name}</h3>
        {details.app.version && (
          <span className="app-version-badge">v{details.app.version}</span>
        )}
      </div>

      <div className="app-summary-card">
        <div className="summary-stat">
          <span className="summary-value">{existingFolders.length}</span>
          <span className="summary-label">Related folders</span>
        </div>
        <div className="summary-stat">
          <span className="summary-value size">{details.totalSizeText}</span>
          <span className="summary-label">Total size</span>
        </div>
      </div>

      <div className="folders-section">
        <h4>Related Folders</h4>
        <p className="muted">Select which folders to remove during uninstall:</p>
        
        <div className="folder-list-detailed">
          {existingFolders.map((folder) => (
            <label key={folder.path} className="folder-item-detailed">
              <input
                type="checkbox"
                checked={selectedFolders.has(folder.path)}
                onChange={() => toggleFolder(folder.path)}
                disabled={folder.type === "main"}
              />
              <div className="folder-item-content">
                <div className="folder-item-header">
                  <span className="folder-type-badge">{formatFolderType(folder.type)}</span>
                  <span className="folder-size">{folder.sizeText}</span>
                </div>
                <code className="folder-path">{folder.path}</code>
                {folder.items > 0 && folder.type !== "main" && (
                  <span className="folder-items">{folder.items} items</span>
                )}
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="uninstall-section">
        <label className="keep-data-toggle">
          <input
            type="checkbox"
            checked={keepData}
            onChange={(e) => setKeepData(e.target.checked)}
          />
          <span>Keep application data (only remove app)</span>
        </label>
        
        <button
          className="uninstall-btn"
          onClick={handleUninstall}
          disabled={uninstalling}
        >
          {uninstalling ? "Uninstalling..." : "Uninstall App"}
        </button>
      </div>
    </div>
  );
}