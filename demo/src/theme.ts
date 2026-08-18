/**
 * theme.ts
 * --------
 * Shared design tokens for the "test bench" aesthetic used across the
 * mini-* demo family (mini-react, mini-store, hooks-toolkit-demo).
 * Dark console background, IBM Plex Mono, amber = "just fired" /
 * teal = "idle / holding a value". Copy this file verbatim into each
 * demo so the family reads as one visual system, not three palettes.
 */
export const theme = {
  color: {
    bg: "#0a0f0d",
    bgRaised: "#0f1614",
    panel: "#0d1412",
    border: "#1f2e29",
    borderStrong: "#2b3f38",
    teal: "#2dd4bf",
    tealDim: "#1a6b60",
    amber: "#f5a623",
    amberDim: "#8a5c14",
    text: "#dbe7e2",
    textDim: "#6f8880",
    textFaint: "#3f524c",
    danger: "#e5484d",
  },
  font: {
    mono: '"IBM Plex Mono", "SF Mono", ui-monospace, Menlo, monospace',
  },
  radius: "2px",
} as const;

export type Theme = typeof theme;
