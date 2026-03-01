(function () {
  const menuButtons = Array.from(document.querySelectorAll('.menu-btn'));
  const panels = Array.from(document.querySelectorAll('.content-panel'));

  menuButtons.forEach((btn) => {
    btn.addEventListener('click', () => {
      window.SidebarLogic.switchPanel(btn.dataset.target, panels, menuButtons);
    });
  });
})();
