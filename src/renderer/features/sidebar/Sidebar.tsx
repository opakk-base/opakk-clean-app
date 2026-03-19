import { useAppStore, type Panel } from "../../store";

const items: { label: string; target: Panel }[] = [
  { label: "Cache / Junk", target: "junk" },
  { label: "File Besar", target: "large" },
];

export function Sidebar() {
  const activePanel = useAppStore((s) => s.activePanel);
  const setActivePanel = useAppStore((s) => s.setActivePanel);
  const platformLabel = useAppStore((s) => s.platformLabel);

  return (
    <aside className="sidebar glass">
      <div>
        <h1>Electron Cleaner</h1>
        <p className="muted">
          {platformLabel
            ? `Platform aktif: ${platformLabel}. Prioritas target junk: macOS > Windows > Linux.`
            : "Prioritas optimasi: macOS, lalu Windows/Linux."}
        </p>
      </div>

      <nav className="menu">
        {items.map(({ label, target }) => (
          <button
            key={target}
            className={`menu-btn${activePanel === target ? " active" : ""}`}
            onClick={() => setActivePanel(target)}
          >
            {label}
          </button>
        ))}
      </nav>

      <div className="sidebar-footer muted">
        Style: Tahoe-inspired (semi transparent)
      </div>
    </aside>
  );
}
