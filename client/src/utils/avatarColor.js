// ============================================================
// avatarColor.js — Deterministic avatar colors per username
// ============================================================
//
// Same username → same gradient, every time, on every screen.
// We hash the name into an index, then pick a fixed palette.
// This is a small detail that makes the UI feel "designed":
// each person keeps a consistent color across the whole app.
// ============================================================

const PALETTES = [
  ["#6366f1", "#8b5cf6"], // indigo → violet
  ["#ec4899", "#f43f5e"], // pink → rose
  ["#06b6d4", "#3b82f6"], // cyan → blue
  ["#10b981", "#059669"], // emerald
  ["#f59e0b", "#f97316"], // amber → orange
  ["#a855f7", "#d946ef"], // purple → fuchsia
  ["#14b8a6", "#0ea5e9"], // teal → sky
  ["#ef4444", "#f97316"], // red → orange
];

// Classic string-hash → stable integer
function hash(name) {
  let h = 0;
  for (let i = 0; i < name.length; i++) {
    h = name.charCodeAt(i) + ((h << 5) - h);
  }
  return Math.abs(h);
}

// Returns a CSS gradient string for a given name
export function avatarGradient(name = "?") {
  const [a, b] = PALETTES[hash(name) % PALETTES.length];
  return `linear-gradient(135deg, ${a}, ${b})`;
}
