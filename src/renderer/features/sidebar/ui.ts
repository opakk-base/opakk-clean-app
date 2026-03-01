import { switchPanel } from "./logic";

const menuButtons = Array.from(
  document.querySelectorAll<HTMLButtonElement>(".menu-btn"),
);
const panels = Array.from(
  document.querySelectorAll<HTMLElement>(".content-panel"),
);

menuButtons.forEach((btn) => {
  btn.addEventListener("click", () => {
    const target = btn.dataset.target;
    if (target) switchPanel(target, panels, menuButtons);
  });
});
