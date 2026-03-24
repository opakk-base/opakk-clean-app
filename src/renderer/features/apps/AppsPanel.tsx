import { useEffect, useCallback, useRef } from "react";
import { useAppStore } from "../../store";
import { ComingSoon } from "./ComingSoon";
import { AppsList } from "./AppsList";
import { AppDetailsView } from "./AppDetails";
import { LeftoverScanner } from "./LeftoverScanner";
import { getScannerInfo, subscribeToAppScan, cancelAppScan } from "./logic";

export function AppsPanel() {
  const installedApps = useAppStore((s) => s.installedApps);
  const addInstalledApp = useAppStore((s) => s.addInstalledApp);
  const clearInstalledApps = useAppStore((s) => s.clearInstalledApps);
  const sortInstalledApps = useAppStore((s) => s.sortInstalledApps);
  const selectedApp = useAppStore((s) => s.selectedApp);
  const setSelectedApp = useAppStore((s) => s.setSelectedApp);
  const appsTab = useAppStore((s) => s.appsTab);
  const setAppsTab = useAppStore((s) => s.setAppsTab);
  const scannerInfo = useAppStore((s) => s.scannerInfo);
  const setScannerInfo = useAppStore((s) => s.setScannerInfo);
  const appSearchQuery = useAppStore((s) => s.appSearchQuery);
  const setAppSearchQuery = useAppStore((s) => s.setAppSearchQuery);
  const clearSelectedApp = useAppStore((s) => s.clearSelectedApp);
  const scanProgress = useAppStore((s) => s.scanProgress);
  const setScanProgress = useAppStore((s) => s.setScanProgress);
  const isScanning = useAppStore((s) => s.isScanning);
  const setIsScanning = useAppStore((s) => s.setIsScanning);
  const setAppsLoading = useAppStore((s) => s.setAppsLoading);

  const unsubscribeRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    loadScannerInfo();
    return () => {
      if (unsubscribeRef.current) {
        unsubscribeRef.current();
      }
    };
  }, []);

  useEffect(() => {
    if (scannerInfo?.isSupported && installedApps.length === 0 && !isScanning) {
      startStreamingScan();
    }
  }, [scannerInfo?.isSupported]);

  const loadScannerInfo = async () => {
    try {
      const info = await getScannerInfo();
      setScannerInfo(info);
    } catch (err) {
      console.error("Failed to get scanner info:", err);
    }
  };

  const startStreamingScan = useCallback(() => {
    clearInstalledApps();
    setAppsLoading(true);
    setIsScanning(true);
    setScanProgress({ phase: "scanning", appsFound: 0 });

    unsubscribeRef.current = subscribeToAppScan(
      (app) => {
        addInstalledApp(app);
      },
      (progress) => {
        setScanProgress(progress);
      },
      () => {
        setAppsLoading(false);
        setIsScanning(false);
        setScanProgress(null);
        sortInstalledApps();
        unsubscribeRef.current = null;
      }
    );
  }, [
    clearInstalledApps,
    setAppsLoading,
    setIsScanning,
    setScanProgress,
    addInstalledApp,
    sortInstalledApps,
  ]);

  const handleCancelScan = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
    }
    cancelAppScan();
    setAppsLoading(false);
    setIsScanning(false);
    setScanProgress(null);
    sortInstalledApps();
  }, [setAppsLoading, setIsScanning, setScanProgress, sortInstalledApps]);

  const handleSelectApp = useCallback(
    (app: typeof selectedApp) => {
      if (app) {
        setSelectedApp(app);
      }
    },
    [setSelectedApp]
  );

  const handleBackToList = useCallback(() => {
    clearSelectedApp();
  }, [clearSelectedApp]);

  const handleUninstalled = useCallback(() => {
    clearSelectedApp();
    startStreamingScan();
  }, [clearSelectedApp, startStreamingScan]);

  if (!scannerInfo) {
    return (
      <section className="glass content-panel active-panel">
        <h2>Installed Apps</h2>
        <div className="loading-card">
          <div className="spinner" />
          <div>
            <div className="loading-title">Loading...</div>
          </div>
        </div>
      </section>
    );
  }

  if (!scannerInfo.isSupported) {
    return (
      <section className="glass content-panel active-panel">
        <h2>Installed Apps</h2>
        <ComingSoon platform={scannerInfo.platform} />
      </section>
    );
  }

  if (selectedApp) {
    return (
      <section className="glass content-panel active-panel">
        <AppDetailsView
          appId={selectedApp.id}
          appName={selectedApp.name}
          onBack={handleBackToList}
          onUninstalled={handleUninstalled}
        />
      </section>
    );
  }

  return (
    <section className="glass content-panel active-panel">
      <h2>Installed Apps</h2>

      <div className="apps-tabs">
        <button
          className={`tab-btn ${appsTab === "installed" ? "active" : ""}`}
          onClick={() => setAppsTab("installed")}
        >
          Installed Apps
        </button>
        <button
          className={`tab-btn ${appsTab === "leftovers" ? "active" : ""}`}
          onClick={() => setAppsTab("leftovers")}
        >
          Leftover Cleaner
        </button>
      </div>

      {appsTab === "installed" && (
        <>
          <div className="apps-toolbar">
            <input
              type="text"
              placeholder="Search apps..."
              value={appSearchQuery}
              onChange={(e) => setAppSearchQuery(e.target.value)}
              className="search-input"
            />
            {isScanning ? (
              <button className="cancel-btn" onClick={handleCancelScan}>
                Cancel
              </button>
            ) : (
              <button className="refresh-btn" onClick={startStreamingScan}>
                Rescan
              </button>
            )}
          </div>

          {scanProgress && scanProgress.phase === "scanning" && (
            <div className="scan-progress-bar">
              <div className="scan-progress-info">
                <span className="scan-location">
                  Scanning: {scanProgress.location}
                </span>
                <span className="scan-count">
                  {scanProgress.appsFound} apps found
                </span>
              </div>
              <div className="scan-progress-indicator">
                <div className="spinner small" />
              </div>
            </div>
          )}

          <div className="results-area">
            <AppsList
              apps={installedApps}
              searchQuery={appSearchQuery}
              onSelectApp={handleSelectApp}
              loading={false}
            />
          </div>
        </>
      )}

      {appsTab === "leftovers" && (
        <div className="results-area">
          <LeftoverScanner onRefresh={startStreamingScan} />
        </div>
      )}
    </section>
  );
}