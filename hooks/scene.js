// scene.js: the ASCII aurora backdrop, drawn as one SVG string.
//
// Everything is glyphs on a 200 x 66 character grid: three aurora curtains,
// each in its own colour family (green and teal low, cyan and blue above,
// violet and magenta highest, as the real sky's are), a field of stars, and two ASCII
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

// Stars sit one to a cell of STAR_CELL units, centred well inside it, so
// the shader (aurora-sky.ts, which uses the same size) can twinkle each
// whole star on its own clock by the cell it is in.
const STAR_CELL = 32

function stars() {
  const random = mulberry32(4242)
  const glyphs = ['.', '.', '.', '.', '.', "'", '`', '+', '+', '*']
  const tints = ['#dbe9ff', '#c4defc', '#efe6ff', '#cdfbee', '#fff6e0']
  let out = ''
  // Stars stop short of the ridge, so the tallest peaks are never taken
  // for stars.
  for (let row = 0; row * STAR_CELL < 540; row++) {
    for (let col = 0; col * STAR_CELL < W; col++) {
      // Denser high in the sky, thinning toward the ridge.
      const top = row * STAR_CELL
      if (random() > 0.34 * Math.pow(1 - top / 700, 0.9)) continue
      const x = +(col * STAR_CELL + 11 + random() * 10).toFixed(1)
      const y = +(top + 11 + random() * 10).toFixed(1)
      const glyph = glyphs[Math.floor(random() * glyphs.length)]
      const tint = tints[Math.floor(random() * tints.length)]
      const size = glyph === '*' || glyph === '+' ? 9 + random() * 4 : 11 + random() * 6
      const kind = random()
      const twinkle = kind < 0.62 ? ' class="tw"' : ''
      const opacity = kind < 0.62 ? '' : ` opacity="${(0.25 + random() * 0.45).toFixed(2)}"`
      out += `<text x="${x}" y="${y}" font-size="${size.toFixed(1)}" fill="${tint}" text-anchor="middle" dominant-baseline="central"${twinkle}${opacity}>${glyph}</text>`
    }
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

// The pines along the near ridge. With `festive`, every one of them is
// hung with coloured lights and a gold star on top, which the shader
// twinkles.
// The bulbs are bright and strongly coloured, unlike anything else under
// the ridge line, which is how the shader finds them.
const BULBS = ['#ff4d5e', '#ffd34d', '#4da6ff', '#ff7ad9', '#7dff6a']
const STAR = '#ffd34d'

function forest(festive) {
  const grid = blankGrid()
  const random = mulberry32(909)
  const trees = []
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
        trees.push({ c, trunk, tiers })
        c += tiers + 1 + Math.floor(random() * 3)
        continue
      }
    }
    c += 1 + Math.floor(random() * 3)
  }

  let lights = ''
  if (festive) {
    const pick = mulberry32(2512)
    const bulb = (row, col, glyph, colour) => {
      grid[row][col] = ' '
      lights += `<text x="${col * CW + CW / 2}" y="${baseline(row)}" text-anchor="middle" fill="${colour}">${glyph}</text>`
    }
    for (const { c: centre, trunk, tiers } of trees) {
      const top = trunk - tiers - 1
      bulb(top, centre, '*', STAR)
      for (let k = 1; k <= tiers; k++) {
        for (let x = -k + 1; x <= k - 1; x++) {
          if (pick() < 0.45) bulb(top + k, centre + x, 'o', BULBS[Math.floor(pick() * BULBS.length)])
        }
      }
    }
  }
  return { grid, lights }
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

// The sky is drawn once and holds still: the motion is the GPU shader's
// (aurora-sky.ts), which redraws this picture every frame. Where the app
// plays no shader (mobile, Reduce Motion, a slow machine), this still sky
// is what shows, so it is a finished scene on its own. No CSS comments go
// in the style: the app's checks read their words too.
// In light mode (the app's own, which the scene reads as
// prefers-color-scheme) the sky turns to day: a periwinkle sky lightening
// to the horizon, a bright glow low on one side, no stars, and the aurora
// laid on as added light (plus-lighter), as daytime aurora is, so it shows
// pale and bright: blue-green, light blue and lilac. The added colours keep
// each curtain's family of hues, so the shader tells them apart in either
// mode. The mountains turn to slate with snow-lit ridges and navy pines.
const STYLE = `
text { font-family: ui-monospace, "SF Mono", Menlo, Monaco, Consolas, "DejaVu Sans Mono", monospace; font-size: ${FONT_SIZE}px; white-space: pre; }
.aurora { font-weight: 700; }
.main { opacity: 0.95; fill: url(#mainLight); }
.high { opacity: 0.7; fill: url(#highLight); }
.veil { opacity: 0.42; fill: url(#veilLight); }
.alt { opacity: 0.45; }
.tw { opacity: 0.85; }
.far { fill: #4f8079; }
.peaks { fill: #8ccfc0; }
.near { fill: #2a5148; }
.trees { fill: #255446; }
.bulbs { font-weight: 700; }
.snow { fill: #1a2d33; }
.sky { fill: url(#sky); }
.farGround { fill: #050b12; }
.nearGround { fill: #02060a; }
.day { display: none; }
@media (prefers-color-scheme: light) {
  .sky { fill: url(#skyDay); }
  .night, .stars { display: none; }
  .day { display: inline; }
  .aurora { mix-blend-mode: plus-lighter; }
  .main { fill: url(#mainDay); }
  .high { opacity: 0.85; fill: url(#highDay); }
  .veil { opacity: 0.85; fill: url(#veilDay); }
  .hem { mix-blend-mode: plus-lighter; opacity: 0.12; }
  .farGround { fill: #63679b; }
  .nearGround { fill: #4a4e7a; }
  .far { fill: #dfe5f7; }
  .peaks { fill: #ffffff; }
  .near { fill: #c9cfee; }
  .trees { fill: #232a52; }
  .snow { fill: #aab1dc; }
}
`

export function auroraScene({ festive = false } = {}) {
  const pines = forest(festive)
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
    // Each curtain keeps to its own family of hues, apart from the others',
    // so the shader (aurora-sky.ts) can tell them apart by colour and sway
    // each on its own: the main curtain 131 to 169 degrees of hue, the
    // ribbon above it 191 to 223, the veil at the top 264 to 331. Keep a new
    // colour inside its curtain's range, or that curtain's characters will
    // move with another's.
    `<linearGradient id="mainLight" gradientUnits="userSpaceOnUse" x1="0" y1="130" x2="0" y2="540">`,
    '<stop offset="0" stop-color="#31e8c2"/><stop offset="0.45" stop-color="#34eeae"/>',
    '<stop offset="0.75" stop-color="#52f59c"/><stop offset="1" stop-color="#8dffa4"/>',
    '</linearGradient>',
    `<linearGradient id="highLight" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="330">`,
    '<stop offset="0" stop-color="#7aa2ff"/><stop offset="0.5" stop-color="#5fb0ff"/>',
    '<stop offset="1" stop-color="#45c4f5"/>',
    '</linearGradient>',
    `<linearGradient id="veilLight" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="190">`,
    '<stop offset="0" stop-color="#ff6fb4"/><stop offset="0.5" stop-color="#e07cff"/>',
    '<stop offset="1" stop-color="#b886ff"/>',
    '</linearGradient>',
    // Day: the sky, from periwinkle overhead to near white at the horizon,
    // and each curtain's colour as light added to it. The added colours
    // keep within each curtain's hues as above: main 125 to 153 degrees,
    // ribbon 198 to 223, veil 310 to 328.
    '<linearGradient id="skyDay" x1="0" y1="0" x2="0" y2="1">',
    '<stop offset="0" stop-color="#5b5fab"/><stop offset="0.4" stop-color="#7175bd"/>',
    '<stop offset="0.7" stop-color="#9096cf"/><stop offset="0.9" stop-color="#b6bde3"/><stop offset="1" stop-color="#d3daf0"/>',
    '</linearGradient>',
    '<radialGradient id="sunGlow" cx="0.92" cy="0.8" r="0.55">',
    '<stop offset="0" stop-color="#eef3fb" stop-opacity="0.6"/><stop offset="1" stop-color="#eef3fb" stop-opacity="0"/>',
    '</radialGradient>',
    `<linearGradient id="mainDay" gradientUnits="userSpaceOnUse" x1="0" y1="130" x2="0" y2="540">`,
    '<stop offset="0" stop-color="#12593b"/><stop offset="0.55" stop-color="#1f8040"/><stop offset="1" stop-color="#2a9933"/>',
    '</linearGradient>',
    `<linearGradient id="highDay" gradientUnits="userSpaceOnUse" x1="0" y1="90" x2="0" y2="330">`,
    '<stop offset="0" stop-color="#1a2e5c"/><stop offset="1" stop-color="#0f3d52"/>',
    '</linearGradient>',
    `<linearGradient id="veilDay" gradientUnits="userSpaceOnUse" x1="0" y1="40" x2="0" y2="190">`,
    '<stop offset="0" stop-color="#6a1040"/><stop offset="1" stop-color="#5a1250"/>',
    '</linearGradient>',
    '<radialGradient id="glowGreen" cx="0.55" cy="0.42" r="0.5">',
    '<stop offset="0" stop-color="#1fb383" stop-opacity="0.2"/><stop offset="1" stop-color="#1fb383" stop-opacity="0"/>',
    '</radialGradient>',
    '<radialGradient id="glowViolet" cx="0.3" cy="0.16" r="0.45">',
    '<stop offset="0" stop-color="#7a4dd8" stop-opacity="0.16"/><stop offset="1" stop-color="#7a4dd8" stop-opacity="0"/>',
    '</radialGradient>',
    '<filter id="soft" x="-10%" y="-50%" width="120%" height="200%"><feGaussianBlur stdDeviation="28"/></filter>',
    '</defs>',
    '<!-- the sky, night or day, and the glow the aurora casts -->',
    `<rect class="sky" width="${W}" height="${H}"/>`,
    `<rect class="night" width="${W}" height="${H}" fill="url(#glowViolet)"/>`,
    `<rect class="night" width="${W}" height="${H}" fill="url(#glowGreen)"/>`,
    `<rect class="day" width="${W}" height="${H}" fill="url(#sunGlow)"/>`,
    `<path class="hem" d="${hemPath(bands.main)}" fill="none" stroke="#2ee6a0" stroke-width="80" opacity="0.26" filter="url(#soft)"/>`,
    `<path class="hem" d="${hemPath(bands.high)}" fill="none" stroke="#7d6bff" stroke-width="50" opacity="0.14" filter="url(#soft)"/>`,
    '<!-- stars, at night -->',
    `<g class="stars">${stars()}</g>`,
    '<!-- the curtains -->',
    // Each curtain twice, the second dithered differently and fainter, for
    // the density of light the original moving sky had at its fullest.
    `<g class="veil aurora">${rows(veil)}</g>`,
    `<g class="high aurora">${rows(high)}<g class="alt">${rows(highAlt)}</g></g>`,
    `<g class="main aurora">${rows(main)}<g class="alt">${rows(mainAlt)}</g></g>`,
    '<!-- far range, near range, forest and snow -->',
    `<path class="farGround" d="${ridgeFill(far)}"/>`,
    `<g class="far">${rows(ridgeGrid(far, 0, 5))}</g>`,
    `<g class="peaks">${rows(ridgeGrid(far, 6))}</g>`,
    `<path class="nearGround" d="${ridgeFill(near)}"/>`,
    `<g class="near">${rows(ridgeGrid(near))}</g>`,
    `<g class="trees">${rows(pines.grid)}</g>`,
    `<g class="bulbs">${pines.lights}</g>`,
    `<g class="snow">${rows(snow())}</g>`,
    '</svg>',
  ].join('')
}
