import type {
  JunkRow,
  CleanJunkResult,
  CleanJunkDryRunResult,
} from "../../../shared/types";
import { useAppStore } from "../../store";

export async function scanJunk(): Promise<JunkRow[]> {
  const rows = await window.cleanerAPI.scanJunk([]);
  useAppStore.getState().setJunkRows(rows);
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
