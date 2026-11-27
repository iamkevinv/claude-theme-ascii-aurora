// Makes the plugin's listing icon: the three aurora curtains as pixel rays
// streaking across a square, inside the frame the theme draws around your
// messages (teal lines, violet crosses at the corners). Run from the project
// folder:
//   node scripts/make-icon.mjs
// It writes preview/icon.svg, then renders .claude-plugin/icon.png at
// 1024 px with headless Chrome. Set CHROME to Chrome's path if it isn't in
// the usual place on a Mac. It's seeded, so the icon is the same every time.
import { execFileSync } from 'node:child_process'
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const SIZE = 1024

// The frame, as the theme's message box draws it: lines in fill-accent,
// crosses in fill-pro (their dark-mode values), the cross 8 line-widths
// across and 1.5 thick.
const FRAME = { inset: 120, line: 12, cross: 96, crossLine: 18, lineColour: '#009283', crossColour: '#8c42ff' }

// Where the pixels go: inside the frame, with a little room.
const AREA = { from: 156, to: SIZE - 156 }
const CELLS = 24

// The curtains, from the scene's own gradients. Each has a bright hem that
// runs across the square, low on the left and rising to the right, and rays
// that rise from it and fade.
const CURTAINS = [
  { name: 'veil', left: 0.44, right: 0.17, wave: 0.035, waves: 1.1, phase: 0.2, rays: 0.3, strength: 0.9, hem: '#b886ff', mid: '#e07cff', top: '#ff6fb4' },
  { name: 'ribbon', left: 0.72, right: 0.44, wave: 0.04, waves: 0.9, phase: 0.55, rays: 0.36, strength: 0.95, hem: '#45c4f5', mid: '#5fb0ff', top: '#7aa2ff' },
  { name: 'main', left: 0.99, right: 0.71, wave: 0.045, waves: 0.8, phase: 0.1, rays: 0.42, strength: 1, hem: '#8dffa4', mid: '#34eeae', top: '#31e8c2' },
]

function seeded(seed) {
  return () => {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16))
const toHex = (rgb) => '#' + rgb.map((v) => Math.round(v).toString(16).padStart(2, '0')).join('')
const mix = (a, b, t) => toHex(hex(a).map((v, i) => v + (hex(b)[i] - v) * t))
const shade = (c, t) => (t < 0.5 ? mix(c.hem, c.mid, t * 2) : mix(c.mid, c.top, (t - 0.5) * 2))
const hemAt = (c, u) => c.left + (c.right - c.left) * u + c.wave * Math.sin(2 * Math.PI * (c.waves * u + c.phase))
const round = (n) => Math.round(n * 10) / 10

function pixels() {
  const random = seeded(2026)
  const cell = (AREA.to - AREA.from) / CELLS
  const reach = CURTAINS.map(() => Array.from({ length: CELLS }, () => 0.55 + 0.45 * random()))
  const out = []
  for (let row = 0; row < CELLS; row++) {
    for (let col = 0; col < CELLS; col++) {
      const u = (col + 0.5) / CELLS
      const v = (row + 0.5) / CELLS
      let best = null
      CURTAINS.forEach((c, k) => {
        const above = hemAt(c, u) - v
        const length = c.rays * reach[k][col]
        if (above < -0.5 / CELLS || above > length) return
        const t = Math.max(0, above) / length
        const light = c.strength * (1 - t) ** 1.4
        if (!best || light > best.light) best = { light, colour: shade(c, t), t }
      })
      if (!best || best.light < 0.1) continue
      // Gaps only in the fading upper part, so each ray stays whole near its hem.
      if (best.t > 0.45 && random() > 1.2 - best.t) continue
      // Like the theme's characters: tall bars (| !) near the hem, dots (: .) higher up.
      const width = cell * 0.42
      const height = cell * (0.42 + 0.5 * best.light ** 1.5)
      const x = AREA.from + col * cell + (cell - width) / 2
      const y = AREA.from + (row + 1) * cell - height - cell * 0.05
      out.push(`<rect x="${round(x)}" y="${round(y)}" width="${round(width)}" height="${round(height)}" fill="${best.colour}" opacity="${round(Math.min(1, 0.25 + best.light) * 100) / 100}"/>`)
    }
  }
  return out.join('')
}

function glows() {
  return CURTAINS.map((c) => {
    const points = Array.from({ length: 21 }, (_, i) => {
      const u = i / 20
      return `${round(AREA.from + u * (AREA.to - AREA.from))},${round(AREA.from + hemAt(c, u) * (AREA.to - AREA.from))}`
    })
    return `<polyline points="${points.join(' ')}" fill="none" stroke="${c.hem}" stroke-width="110" stroke-linecap="round" opacity="0.2" filter="url(#soft)"/>`
  }).join('')
}

function stars() {
  const at = [
    [0.1, 0.1, 'plus'], [0.3, 0.05, 'dot'], [0.06, 0.32, 'dot'], [0.2, 0.22, 'plus'],
    [0.5, 0.04, 'dot'], [0.88, 0.62, 'dot'], [0.72, 0.9, 'dot'], [0.94, 0.86, 'plus'],
  ]
  const span = AREA.to - AREA.from
  return at.map(([u, v, kind]) => {
    const x = round(AREA.from + u * span)
    const y = round(AREA.from + v * span)
    if (kind === 'dot') return `<rect x="${x - 4}" y="${y - 4}" width="8" height="8" fill="#cfe3ee" opacity="0.7"/>`
    return `<path d="M${x - 12} ${y}h24M${x} ${y - 12}v24" stroke="#dfeaf2" stroke-width="5" opacity="0.85"/>`
  }).join('')
}

function frame() {
  const { inset: a, line, cross, crossLine, lineColour, crossColour } = FRAME
  const b = SIZE - a
  const lines = `<path d="M${a} ${a}H${b}V${b}H${a}Z" fill="none" stroke="${lineColour}" stroke-width="${line}"/>`
  const half = cross / 2
  const crosses = [[a, a], [b, a], [a, b], [b, b]]
    .map(([x, y]) => `<path d="M${x - half} ${y}h${cross}M${x} ${y - half}v${cross}" stroke="${crossColour}" stroke-width="${crossLine}"/>`)
    .join('')
  const glow = `<path d="M${a} ${a}H${b}V${b}H${a}Z" fill="none" stroke="#2ee6a0" stroke-width="${line * 2}" opacity="0.18" filter="url(#halo)"/>`
  return glow + lines + crosses
}

export function iconSvg() {
  const inner = FRAME.inset + FRAME.line / 2
  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}">`,
    '<defs>',
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#020409"/><stop offset="0.5" stop-color="#050b14"/>',
    '<stop offset="0.82" stop-color="#08151d"/><stop offset="1" stop-color="#0a1a1f"/>',
    '</linearGradient>',
    '<filter id="soft" x="-20%" y="-50%" width="140%" height="200%"><feGaussianBlur stdDeviation="34"/></filter>',
    '<filter id="halo" x="-10%" y="-10%" width="120%" height="120%"><feGaussianBlur stdDeviation="12"/></filter>',
    `<clipPath id="inside"><rect x="${inner}" y="${inner}" width="${SIZE - inner * 2}" height="${SIZE - inner * 2}"/></clipPath>`,
    '</defs>',
    `<rect width="${SIZE}" height="${SIZE}" fill="#060b13"/>`,
    `<g clip-path="url(#inside)"><rect width="${SIZE}" height="${SIZE}" fill="url(#sky)"/>${glows()}${stars()}${pixels()}</g>`,
    frame(),
    '</svg>',
  ].join('')
}

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const chrome = process.env.CHROME ?? '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'

mkdirSync(join(root, 'preview'), { recursive: true })
const svgPath = join(root, 'preview', 'icon.svg')
writeFileSync(svgPath, iconSvg())
console.log('preview/icon.svg written')

const profile = mkdtempSync(join(tmpdir(), 'aurora-icon-'))
try {
  execFileSync(chrome, [
    '--headless=new', '--disable-gpu', '--hide-scrollbars', '--force-device-scale-factor=1',
    `--user-data-dir=${profile}`, `--window-size=${SIZE},${SIZE}`,
    `--screenshot=${join(root, '.claude-plugin', 'icon.png')}`, pathToFileURL(svgPath).href,
  ], { stdio: 'ignore' })
  console.log(`.claude-plugin/icon.png written: ${SIZE} x ${SIZE}`)
} finally {
  rmSync(profile, { recursive: true, force: true })
}
