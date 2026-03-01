(function () {
  async function deletePaths(paths, dryRun) {
    return window.cleanerAPI.deletePaths(paths, dryRun);
  }

  window.DeleteLogic = { deletePaths };
})();
