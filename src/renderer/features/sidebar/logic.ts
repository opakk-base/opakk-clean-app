export function switchPanel(
  targetId: string,
  panels: HTMLElement[],
  menuButtons: HTMLElement[],
): void {
  panels.forEach((panel) =>
    panel.classList.toggle("active-panel", panel.id === targetId),
  );
  menuButtons.forEach((btn) =>
    btn.classList.toggle(
      "active",
      (btn as HTMLButtonElement).dataset.target === targetId,
    ),
  );
}
