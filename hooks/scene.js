// scene.js: the ASCII aurora backdrop, drawn as one SVG string.
//
// Everything is glyphs on a 200 x 66 character grid: three aurora curtains
// whose colour follows altitude (green low, teal, then violet and magenta
// high, as the real sky does), a field of twinkling stars, and two ASCII
// mountain ridges with a pine forest along the near one. The noise is
// seeded, so the sky is the same every time.

const W = 1600
const H = 1000
const COLS = 200
const ROWS = 66
const CW = W / COLS // 8 points a column
const LH = 15 // points a row
const TOP = 12 // baseline of row 0
const FONT_SIZE = 13.3

// Faint to bright: the glyphs a curtain's rays are made of.
const RAMP = [' ', '.', "'", ':', ';', '!', '|', 'l', 'I', '#']

function hash(n) {
  let x = Math.imul((n | 0) ^ 0x9e3779b9, 0x85ebca6b)
  x ^= x >>> 13
  x = Math.imul(x, 0xc2b2ae35)
  x ^= x >>> 16
  return (x >>> 0) / 4294967296
}

function hash2(a, b) {
  return hash(Math.imul(a | 0, 73856093) ^ Math.imul(b | 0, 19349663))
}

// Smooth value noise in [0, 1).
function noise(x, seed) {
  const i = Math.floor(x)
  const f = x - i
  const u = f * f * (3 - 2 * f)
  const a = hash(i + seed * 1013)
  const b = hash(i + 1 + seed * 1013)
  return a + (b - a) * u
}

function smoothstep(lo, hi, x) {
  const t = Math.min(1, Math.max(0, (x - lo) / (hi - lo)))
  return t * t * (3 - 2 * t)
}

function mulberry32(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

const baseline = r => +(TOP + r * LH).toFixed(1)

function blankGrid() {
  return Array.from({ length: ROWS }, () => Array(COLS).fill(' '))
}

// One curtain: for each column, a bright hem at `edge(c)` with rays fading
// upward over `height(c)` rows, `strength(c)` bright.
function curtain({ seed, edge, height, strength, dither }) {
  const grid = blankGrid()
  for (let c = 0; c < COLS; c++) {
    const e = edge(c)
    const h = Math.max(2, height(c))
    const s = strength(c)
    if (s <= 0.02) continue
    const bottom = Math.min(ROWS - 1, Math.round(e))
    for (let r = Math.max(0, Math.floor(e - h)); r <= bottom; r++) {
      const t = Math.max(0, (e - r) / h)
      if (t > 1) continue
      const profile = r === bottom ? 1.12 : Math.pow(1 - t, 1.5)
      const level = s * profile + (hash2(r * 7 + seed, c + seed * 3) - 0.5) * dither
      const index = Math.min(RAMP.length - 1, Math.floor(level * (RAMP.length + 0.4)))
      if (index > 0) grid[r][c] = RAMP[index]
    }
  }
  return grid
}

// The rows of a grid that hold anything, as full-width <text> lines.
function rows(grid, attributes = '') {
  let out = ''
  for (let r = 0; r < ROWS; r++) {
    const line = grid[r].join('')
    if (line.trim() === '') continue
    out += `<text y="${baseline(r)}" textLength="${W}"${attributes}>${line}</text>`
  }
  return out
}

// --- The three curtains -------------------------------------------------

const ray = (c, seed) => hash(c * 7 + seed * 131) ** 2

const bands = {
  // The great sweeping arc: low on the left, rising to the right.
  main: {
    seed: 11,
    edge: c => 30 - 9 * (c / COLS) + 4 * Math.sin(c * 0.045 + 0.6) + 1.4 * Math.sin(c * 0.13 + 2),
    height: c => 18 * (0.42 + 0.3 * noise(c / 8, 19) + 0.45 * ray(c, 11)),
    strength: c =>
      smoothstep(0.1, 0.5, noise(c / 34, 16)) * (0.24 + 0.36 * noise(c / 5, 12) + 0.52 * ray(c, 11)),
  },
  // A thinner ribbon crossing above it the other way.
  high: {
    seed: 23,
    edge: c => 13 + 6 * (c / COLS) + 3 * Math.sin(c * 0.06 + 2.4) + Math.sin(c * 0.17),
    height: c => 12 * (0.4 + 0.3 * noise(c / 7, 29) + 0.45 * ray(c, 23)),
    strength: c =>
      smoothstep(0.18, 0.6, noise(c / 28, 26)) * (0.18 + 0.3 * noise(c / 4, 24) + 0.5 * ray(c, 23)),
  },
  // A faint violet veil at the top of the sky.
  veil: {
    seed: 37,
    edge: c => 9 + 2.5 * Math.sin(c * 0.035 + 1) + 0.8 * Math.sin(c * 0.21),
    height: c => 8 * (0.45 + 0.3 * noise(c / 6, 39) + 0.4 * ray(c, 37)),
    strength: c => smoothstep(0.25, 0.7, noise(c / 22, 36)) * (0.16 + 0.24 * noise(c / 3, 38) + 0.4 * ray(c, 37)),
  },
}

// The line along a curtain's hem, a little above it, for the glow behind.
function hemPath(band) {
  let d = ''
  for (let c = 0; c <= COLS; c += 4) {
    d += `${c === 0 ? 'M' : 'L'}${c * CW} ${(baseline(band.edge(c)) - 40).toFixed(1)}`
  }
  return d
}

function drawCurtain(band, dither, seedShift = 0) {
  return curtain({ ...band, seed: band.seed + seedShift, dither })
}

// --- Stars ------------------------------------------------------------

function stars() {
  const random = mulberry32(4242)
  const glyphs = ['.', '.', '.', '.', '.', "'", '`', '+', '+', '*']
  const tints = ['#dbe9ff', '#c4defc', '#efe6ff', '#cdfbee', '#fff6e0']
  let out = ''
  for (let i = 0; i < 190; i++) {
    const x = +(random() * W).toFixed(1)
    // Denser high in the sky, thinning toward the ridge.
    const y = +(6 + Math.pow(random(), 1.35) * 640).toFixed(1)
    const glyph = glyphs[Math.floor(random() * glyphs.length)]
    const tint = tints[Math.floor(random() * tints.length)]
    const size = glyph === '*' || glyph === '+' ? 9 + random() * 4 : 11 + random() * 6
    const kind = random()
    const twinkle = kind < 0.62 ? ` class="tw t${1 + Math.floor(random() * 4)}"` : ''
    const opacity = kind < 0.62 ? '' : ` opacity="${(0.25 + random() * 0.45).toFixed(2)}"`
    out += `<text x="${x}" y="${y}" font-size="${size.toFixed(1)}" fill="${tint}"${twinkle}${opacity}>${glyph}</text>`
  }
  return out
}

// --- Mountains and forest --------------------------------------------

// A range is a set of peaks, each falling one row a column on both sides, so
// its ridge reads as /\ glyphs. `height(e)` is in rows above the range's
// base, measured at column edge e (0 to COLS).
function range({ seed, base, every, tall, sides }) {
  const random = mulberry32(seed)
  const peaks = []
  for (let p = -6; p < COLS + 6; p += every[0] + Math.floor(random() * (every[1] - every[0]))) {
    const side = Math.abs((2 * p) / COLS - 1) // 0 in the middle, 1 at the edges
    const weight = 1 - sides + sides * side
    peaks.push([p, Math.round(tall[0] + (tall[1] - tall[0]) * weight * random())])
  }
  const height = e => Math.max(0, ...peaks.map(([p, h]) => h - Math.abs(e - p)))
  return { base, height }
}

const far = range({ seed: 70, base: 56, every: [5, 19], tall: [2, 13], sides: 0.7 })
const near = range({ seed: 80, base: 62, every: [8, 18], tall: [1, 3], sides: 0.3 })

// The row a tree's trunk stands in at column c: the '_' cell on a flat, the
// cell just above the slope glyph on a slope.
const trunkRow = (r, c) => r.base - Math.max(r.height(c), r.height(c + 1))
// The first row wholly under the ridge at column c.
const underRow = (r, c) => r.base - Math.min(r.height(c), r.height(c + 1)) + 1

function ridgeGrid(r, minHeight = 0, maxHeight = Infinity) {
  const grid = blankGrid()
  for (let c = 0; c < COLS; c++) {
    const left = r.height(c)
    const right = r.height(c + 1)
    const top = Math.max(left, right)
    if (top < minHeight || top > maxHeight) continue
    if (right > left) {
      for (let h = left; h < right; h++) grid[r.base - h][c] = '/'
    } else if (right < left) {
      for (let h = right; h < left; h++) grid[r.base - h][c] = '\\'
    } else {
      grid[r.base - left][c] = '_'
    }
  }
  return grid
}

// The ground under a ridge, so nothing in the sky shows through it.
function ridgeFill(r) {
  const y = h => (baseline(r.base - h) + 3).toFixed(1)
  let d = `M0 ${y(r.height(0))}`
  for (let e = 1; e <= COLS; e++) d += `L${e * CW} ${y(r.height(e))}`
  return `${d}L${W} ${H}L0 ${H}Z`
}

function forest() {
  const grid = blankGrid()
  const random = mulberry32(909)
  let c = 2
  while (c < COLS - 3) {
    const clump = noise(c / 11, 90)
    if (clump > 0.42 && random() < 0.75) {
      const tiers = 2 + Math.floor(random() * 2.6) // 2 to 4
      const trunk = trunkRow(near, c)
      if (trunk - tiers - 1 > 40) {
        grid[trunk][c] = '|'
        grid[trunk - tiers - 1][c] = '^'
        for (let k = 1; k <= tiers; k++) {
          const row = trunk - tiers - 1 + k
          for (let x = -k; x <= k; x++) {
            const col = c + x
            if (col < 0 || col >= COLS) continue
            grid[row][col] = x === -k ? '/' : x === k ? '\\' : '^'
          }
        }
        c += tiers + 1 + Math.floor(random() * 3)
        continue
      }
    }
    c += 1 + Math.floor(random() * 3)
  }
  return grid
}

function snow() {
  const grid = blankGrid()
  for (let c = 0; c < COLS; c++) {
    for (let r = underRow(near, c); r < ROWS; r++) {
      const roll = hash2(r * 13, c * 7 + 5)
      if (roll < 0.05) grid[r][c] = roll < 0.02 ? ',' : '.'
    }
  }
  return grid
}

// --- The whole scene --------------------------------------------------

const STYLE = `
text { font-family: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "DejaVu Sans Mono", monospace; font-size: ${FONT_SIZE}px; white-space: pre; }
.aurora, .shine { font-weight: 700; }
.aurora { fill: url(#altitude); }
.shine { fill: #eafff5; }
.sway { transform-box: fill-box; transform-origin: 50% 100%; }
.main { opacity: 0.95; animation: swayA 34s ease-in-out infinite alternate, breathe 13s ease-in-out infinite alternate; }
.high { opacity: 0.7; animation: swayB 43s ease-in-out infinite alternate, breatheSoft 17s ease-in-out infinite alternate; }
.veil { opacity: 0.42; animation: swayC 57s ease-in-out infinite alternate, breatheFaint 23s ease-in-out infinite alternate; }
.flicker { opacity: 0; animation: flicker 9s ease-in-out infinite alternate; }
.steady { animation: steady 9s ease-in-out infinite alternate; }
.sweep { animation: sweep 26s linear infinite; }
.tw { animation: twinkle 6s ease-in-out infinite; }
.t1 { animation-duration: 5.2s; animation-delay: -1s; }
.t2 { animation-duration: 7.4s; animation-delay: -3.3s; }
.t3 { animation-duration: 9.1s; animation-delay: -5.6s; }
.t4 { animation-duration: 11.7s; animation-delay: -2.2s; }
.far { fill: #4f8079; }
.peaks { fill: #8ccfc0; }
.near { fill: #2a5148; }
.trees { fill: #255446; }
.snow { fill: #1a2d33; }
@keyframes swayA { from { transform: translateX(-34px) skewX(2.2deg); } to { transform: translateX(30px) skewX(-1.8deg); } }
@keyframes swayB { from { transform: translateX(26px) skewX(-1.6deg); } to { transform: translateX(-28px) skewX(1.8deg); } }
@keyframes swayC { from { transform: translateX(-18px); } to { transform: translateX(22px); } }
@keyframes breathe { from { opacity: 0.72; } to { opacity: 1; } }
@keyframes breatheSoft { from { opacity: 0.45; } to { opacity: 0.85; } }
@keyframes breatheFaint { from { opacity: 0.22; } to { opacity: 0.55; } }
@keyframes flicker { from { opacity: 0; } to { opacity: 0.85; } }
@keyframes steady { from { opacity: 1; } to { opacity: 0.35; } }
@keyframes sweep { from { transform: translateX(-700px); } to { transform: translateX(1800px); } }
@keyframes twinkle { 0%, 100% { opacity: 0.95; } 50% { opacity: 0.2; } }
`

export function auroraScene() {
  const main = drawCurtain(bands.main, 0.16)
  const mainAlt = drawCurtain(bands.main, 0.22, 101)
  const high = drawCurtain(bands.high, 0.14)
  const highAlt = drawCurtain(bands.high, 0.2, 202)
  const veil = drawCurtain(bands.veil, 0.12)

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xml:space="preserve">`,
    `<style>${STYLE}</style>`,
    '<defs>',
    '<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#020409"/><stop offset="0.5" stop-color="#050b14"/>',
    '<stop offset="0.82" stop-color="#08151d"/><stop offset="1" stop-color="#0a1a1f"/>',
    '</linearGradient>',
    // Colour by altitude: magenta at the top of the sky down to green at the hem.
    `<linearGradient id="altitude" gradientUnits="userSpaceOnUse" x1="0" y1="20" x2="0" y2="520">`,
    '<stop offset="0" stop-color="#ff5fa8"/><stop offset="0.18" stop-color="#c77dff"/>',
    '<stop offset="0.38" stop-color="#7f8cff"/><stop offset="0.55" stop-color="#46d3ee"/>',
    '<stop offset="0.74" stop-color="#3ff0b4"/><stop offset="1" stop-color="#8dffa4"/>',
    '</linearGradient>',
    '<radialGradient id="glowGreen" cx="0.55" cy="0.42" r="0.5">',
    '<stop offset="0" stop-color="#1fb383" stop-opacity="0.2"/><stop offset="1" stop-color="#1fb383" stop-opacity="0"/>',
    '</radialGradient>',
    '<radialGradient id="glowViolet" cx="0.3" cy="0.16" r="0.45">',
    '<stop offset="0" stop-color="#7a4dd8" stop-opacity="0.16"/><stop offset="1" stop-color="#7a4dd8" stop-opacity="0"/>',
    '</radialGradient>',
    '<linearGradient id="beam" x1="0" y1="0" x2="1" y2="0">',
    '<stop offset="0" stop-color="#fff" stop-opacity="0"/><stop offset="0.5" stop-color="#fff" stop-opacity="1"/>',
    '<stop offset="1" stop-color="#fff" stop-opacity="0"/>',
    '</linearGradient>',
    '<filter id="soft" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>',
    '<mask id="travel" maskUnits="userSpaceOnUse" x="-200" y="0" width="2000" height="1000">',
    '<rect class="sweep" x="0" y="0" width="560" height="1000" fill="url(#beam)"/>',
    '</mask>',
    '</defs>',
    '<!-- night sky and the glow the aurora casts -->',
    `<rect width="${W}" height="${H}" fill="url(#sky)"/>`,
    `<rect width="${W}" height="${H}" fill="url(#glowViolet)"/>`,
    `<rect width="${W}" height="${H}" fill="url(#glowGreen)"/>`,
    `<path d="${hemPath(bands.main)}" fill="none" stroke="#2ee6a0" stroke-width="80" opacity="0.26" filter="url(#soft)"/>`,
    `<path d="${hemPath(bands.high)}" fill="none" stroke="#7d6bff" stroke-width="50" opacity="0.14" filter="url(#soft)"/>`,
    '<!-- stars -->',
    `<g>${stars()}</g>`,
    '<!-- the curtains -->',
    `<g class="sway veil aurora">${rows(veil)}</g>`,
    `<g class="sway high aurora"><g class="steady">${rows(high)}</g><g class="flicker">${rows(highAlt)}</g></g>`,
    `<g class="sway main">`,
    `<g class="aurora steady">${rows(main)}</g>`,
    `<g class="aurora flicker">${rows(mainAlt)}</g>`,
    `<g class="shine" mask="url(#travel)" opacity="0.55">${rows(main)}</g>`,
    '</g>',
    '<!-- far range, near range, forest and snow -->',
    `<path d="${ridgeFill(far)}" fill="#050b12"/>`,
    `<g class="far">${rows(ridgeGrid(far, 0, 5))}</g>`,
    `<g class="peaks">${rows(ridgeGrid(far, 6))}</g>`,
    `<path d="${ridgeFill(near)}" fill="#02060a"/>`,
    `<g class="near">${rows(ridgeGrid(near))}</g>`,
    `<g class="trees">${rows(forest())}</g>`,
    `<g class="snow">${rows(snow())}</g>`,
    '</svg>',
  ].join('')
}
