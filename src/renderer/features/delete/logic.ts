import type { DeleteResult, DeleteDryRunResult } from "../../../shared/types";

export async function deletePaths(
  paths: string[],
  dryRun: boolean,
): Promise<DeleteResult | DeleteDryRunResult> {
  return window.cleanerAPI.deletePaths(paths, dryRun);
}
