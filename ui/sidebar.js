(function () {
  const menuButtons = Array.from(document.querySelectorAll('.menu-btn'));
  const panels = Array.from(document.querySelectorAll('.content-panel'));

  function switchPanel(targetId) {
    panels.forEach((panel) => panel.classList.toggle('active-panel', panel.id === targetId));
    menuButtons.forEach((btn) => btn.classList.toggle('active', btn.dataset.target === targetId));
  }

  menuButtons.forEach((btn) => {
    btn.addEventListener('click', () => switchPanel(btn.dataset.target));
  });

  window.SidebarUI = { switchPanel };
})();
