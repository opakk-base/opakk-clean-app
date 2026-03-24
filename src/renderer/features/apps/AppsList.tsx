import type { InstalledApp } from "../../../shared/types";

interface AppsListProps {
  apps: InstalledApp[];
  searchQuery: string;
  onSelectApp: (app: InstalledApp) => void;
  loading: boolean;
}

export function AppsList({ apps, searchQuery, onSelectApp, loading }: AppsListProps) {
  const filteredApps = apps.filter((app) =>
    app.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (app.vendor && app.vendor.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  if (loading) {
    return (
      <div className="loading-card">
        <div className="spinner" />
        <div>
          <div className="loading-title">Scanning installed apps...</div>
          <div className="muted">This may take a moment</div>
        </div>
      </div>
    );
  }

  if (filteredApps.length === 0) {
    return (
      <div className="empty-state">
        <div className="empty-icon">📦</div>
        <p className="muted">
          {searchQuery ? "No apps match your search" : "No installed apps found"}
        </p>
      </div>
    );
  }

  return (
    <div className="apps-list">
      {filteredApps.map((app) => (
        <div
          key={app.id}
          className="app-card"
          onClick={() => onSelectApp(app)}
        >
          <div className="app-icon-wrapper">
            <div className="app-icon-placeholder">
              {app.name.charAt(0).toUpperCase()}
            </div>
          </div>
          <div className="app-info">
            <div className="app-name">{app.name}</div>
            <div className="app-meta">
              {app.vendor && <span className="app-vendor">{app.vendor}</span>}
              {app.version && <span className="app-version">v{app.version}</span>}
            </div>
          </div>
          <div className="app-size">{app.sizeText}</div>
          <div className="app-arrow">→</div>
        </div>
      ))}
    </div>
  );
}