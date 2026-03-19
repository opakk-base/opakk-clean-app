import { useEffect } from "react";
import { Sidebar } from "./features/sidebar/Sidebar";
import { JunkPanel } from "./features/junk/JunkPanel";
import { LargePanel } from "./features/large/LargePanel";
import { useAppStore } from "./store";

export function App() {
  const activePanel = useAppStore((s) => s.activePanel);
  const setPlatform = useAppStore((s) => s.setPlatform);

  useEffect(() => {
    window.cleanerAPI
      .getPlatform()
      .then((platform) =>
        window.cleanerAPI.getHome().then((home) => setPlatform(platform, home)),
      )
      .catch(() => {});
  }, [setPlatform]);

  return (
    <div className="app-shell">
      <Sidebar />
      <main className="content">
        {activePanel === "junk" && <JunkPanel />}
        {activePanel === "large" && <LargePanel />}
      </main>
    </div>
  );
}
