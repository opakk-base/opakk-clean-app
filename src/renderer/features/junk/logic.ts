import type {
  JunkRow,
  CleanJunkResult,
  CleanJunkDryRunResult,
} from "../../../shared/types";
import { appState } from "../../core/state";

export async function initPlatform(
  platformNoteEl: HTMLElement,
  rootDirInput: HTMLInputElement,
  presetHandlers: {
    onDownloads: (fn: () => void) => void;
    onMovies: (fn: () => void) => void;
    onDesktop: (fn: () => void) => void;
  },
): Promise<void> {
  try {
    const [platform, home] = await Promise.all([
      window.cleanerAPI.getPlatform(),
      window.cleanerAPI.getHome(),
    ]);
    const label =
      platform === "darwin"
        ? "macOS"
        : platform === "win32"
          ? "Windows"
          : "Linux";
    platformNoteEl.textContent = `Platform aktif: ${label}. Prioritas target junk: macOS > Windows > Linux.`;
    if (platform === "darwin") rootDirInput.value = `${home}/Downloads`;

    presetHandlers.onDownloads(
      () => (rootDirInput.value = `${home}/Downloads`),
    );
    presetHandlers.onMovies(() => (rootDirInput.value = `${home}/Movies`));
    presetHandlers.onDesktop(() => (rootDirInput.value = `${home}/Desktop`));
  } catch {
    // Platform detection failed — leave defaults
  }
}

export async function scanJunk(): Promise<JunkRow[]> {
  const rows = await window.cleanerAPI.scanJunk([]);
  appState.lastJunkRows = rows;
  return rows;
}

export async function dryRunTarget(
  targetPath: string,
): Promise<CleanJunkDryRunResult> {
  return window.cleanerAPI.cleanJunkTarget(
    targetPath,
    true,
  ) as Promise<CleanJunkDryRunResult>;
}

export async function cleanTarget(
  targetPath: string,
): Promise<CleanJunkResult> {
  return window.cleanerAPI.cleanJunkTarget(
    targetPath,
    false,
  ) as Promise<CleanJunkResult>;
}
