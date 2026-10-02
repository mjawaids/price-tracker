// Checks WCAG 2.x contrast for the design tokens in src/index.css.
// Usage: node scripts/check-contrast.mjs   (exits 1 if any pair fails)
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8');

// Parse `--name: oklch(L C H [/ a]);` declarations from :root.
const tokens = {};
for (const m of css.matchAll(/--([a-z-]+):\s*oklch\(([\d.]+)\s+([\d.]+)\s+([\d.]+)/g)) {
  tokens[m[1]] = [Number(m[2]), Number(m[3]), Number(m[4])];
}

// OKLCH → linear sRGB (clamped), per Björn Ottosson's OKLab reference.
function toLinearSrgb([L, C, h]) {
  const a = C * Math.cos((h * Math.PI) / 180);
  const b = C * Math.sin((h * Math.PI) / 180);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;
  return [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ].map((x) => Math.min(1, Math.max(0, x)));
}

const luminance = (c) => {
  const [r, g, b] = toLinearSrgb(c);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};

const ratio = (fg, bg) => {
  const [hi, lo] = [luminance(fg), luminance(bg)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
};

// [foreground, background, minimum ratio]. 4.5 = body text, 3 = UI graphics.
const PAIRS = [
  ['ink', 'paper', 4.5],
  ['ink-soft', 'paper', 4.5],
  ['ink-soft', 'surface', 4.5],
  ['ink-faint', 'paper', 4.5],
  ['ink-faint', 'surface', 4.5],
  ['on-accent', 'accent', 4.5],
  ['accent-ink', 'paper', 4.5],
  ['accent-ink', 'surface', 4.5],
  ['accent-ink', 'accent-wash', 4.5],
  ['danger', 'paper', 4.5],
  ['danger', 'surface', 4.5],
  ['danger', 'danger-wash', 4.5],
  ['warn-ink', 'warn-wash', 4.5],
  ['accent', 'paper', 3],
];

let failed = 0;
for (const [fg, bg, min] of PAIRS) {
  if (!tokens[fg] || !tokens[bg]) {
    console.log(`?    --${fg} on --${bg}: token missing`);
    failed++;
    continue;
  }
  const r = ratio(tokens[fg], tokens[bg]);
  const ok = r >= min;
  if (!ok) failed++;
  console.log(`${ok ? 'ok  ' : 'FAIL'} --${fg} on --${bg}: ${r.toFixed(2)}:1 (min ${min})`);
}
process.exit(failed ? 1 : 0);
