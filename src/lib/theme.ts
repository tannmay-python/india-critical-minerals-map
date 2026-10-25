// The site is light only (Takshashila house style). Kept as a module so map and drawer code
// can still ask for the theme by name when picking colours.
export type Theme = "light" | "dark";

export function currentTheme(): Theme {
  return "light";
}

/** No theme switching; returns a no-op unsubscribe so callers need not change. */
export function onThemeChange(_fn: (t: Theme) => void): () => void {
  return () => {};
}
