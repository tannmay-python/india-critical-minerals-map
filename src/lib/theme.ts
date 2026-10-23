// Theme: follows the OS unless the reader picks one; the manual choice wins both ways.
export type Theme = "light" | "dark";

const KEY = "icm-theme";
const listeners = new Set<(t: Theme) => void>();
const media = window.matchMedia("(prefers-color-scheme: dark)");

export function currentTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return media.matches ? "dark" : "light";
}

export function setTheme(t: Theme): void {
  document.documentElement.dataset.theme = t;
  try { localStorage.setItem(KEY, t); } catch { /* storage unavailable: keep in-memory only */ }
  listeners.forEach((fn) => fn(t));
}

export function onThemeChange(fn: (t: Theme) => void): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

media.addEventListener("change", () => {
  if (!document.documentElement.dataset.theme) listeners.forEach((fn) => fn(currentTheme()));
});

const SUN = '<svg viewBox="0 0 16 16" aria-hidden="true"><circle cx="8" cy="8" r="3.2" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3 3l1.4 1.4M11.6 11.6L13 13M3 13l1.4-1.4M11.6 4.4L13 3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/></svg>';
const MOON = '<svg viewBox="0 0 16 16" aria-hidden="true"><path d="M13.5 9.6A5.6 5.6 0 0 1 6.4 2.5a5.6 5.6 0 1 0 7.1 7.1z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>';

export function mountThemeToggle(btn: HTMLButtonElement): void {
  const paint = () => {
    const t = currentTheme();
    btn.innerHTML = t === "dark" ? SUN : MOON;
    btn.setAttribute("aria-label", t === "dark" ? "Switch to light mode" : "Switch to dark mode");
  };
  btn.addEventListener("click", () => setTheme(currentTheme() === "dark" ? "light" : "dark"));
  onThemeChange(paint);
  paint();
}
