(function () {
  function switchPanel(targetId, panels, menuButtons) {
    panels.forEach((panel) => panel.classList.toggle('active-panel', panel.id === targetId));
    menuButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === targetId));
  }

  window.SidebarLogic = { switchPanel };
})();
