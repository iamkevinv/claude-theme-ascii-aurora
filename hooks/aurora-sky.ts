// aurora-sky.ts: the backdrop's motion, played on the GPU by the desktop app.
//
// It redraws the still ASCII sky from scene.js every frame, taken apart:
// the sky behind the characters, the three curtains, and the stars. Each
// curtain is told apart by its colour (scene.js keeps each to its own
// family of hues) and slides back and forth on its own clock, as the
// original CSS sky's did: the green main curtain over 34 seconds, the
// cyan ribbon above it the other way over 43, the violet veil over 57.
// Each glides smoothly by fractions of a pixel, all its characters at
// once, resampled sharply so they keep their shape and edges. The stars stay put. On top of that only
// brightness changes: a soft band of light crosses the curtains, each
// breathes and shimmers in patches, and the stars twinkle. Everything is
// slow (no spot changes more than once every few seconds), far under the
// app's limit for flashing. Under Reduce Motion `still` is 1, time stands
// still, and the sky shows as drawn.
import {
  type Buffer,
  PI,
  abs,
  atan,
  buffer,
  cos,
  dot,
  exp,
  floor,
  fract,
  max,
  min,
  mix,
  mod,
  picture,
  px,
  res,
  scene,
  shader,
  sin,
  size,
  smoothstep,
  sqrt,
  step,
  still,
  time,
  vec2,
  vec3,
  vec4,
  values,
} from 'claude-code/shader'

// What the mod sets while the sky plays: `snow` 1 when it is snowing this
// session (a cold month where the person is, and a 30% chance), else 0.
const settings = values({ snow: [0, 1] })

// A steady pseudo-random number, 0 to 1, for a cell of the screen.
function hash(cell: vec2): number {
  return fract(sin(dot(cell, vec2(12.9898, 78.233))) * 43758.5453)
}

// An eased back-and-forth, 0 to 1 and back, taking `seconds` each way.
function swing(t: number, seconds: number): number {
  return 0.5 - 0.5 * cos((PI * t) / seconds)
}

// The sky with its characters taken out, made once (and again only when
// the window changes size) in four passes. First the darkest sky within
// 8 points every way, across and then down: a box that size always holds
// a gap between characters, even in the densest curtain, so no trace of a
// character or a star survives to be left behind when the curtains move.
// Then the same box softened, so the sky behind them stays smooth. The
// sky is smooth, so one texel a point is plenty, and gaps between
// characters are wider than a point, so the box still finds them.
const darkestAcross: Buffer = buffer({ once: true, scale: 1 }, p => {
  let darkest = vec3(scene.sample(p.uv).rgb)
  for (let step = -8; step <= 8; step += 1) {
    darkest = min(darkest, vec3(scene.sample(p.uv + vec2(step / size.x, 0)).rgb))
  }
  return vec4(darkest, 1)
})

const darkest: Buffer = buffer({ once: true, scale: 1 }, p => {
  let deepest = vec3(darkestAcross.sample(p.uv).rgb)
  for (let step = -8; step <= 8; step += 1) {
    deepest = min(deepest, vec3(darkestAcross.sample(p.uv + vec2(0, step / size.y)).rgb))
  }
  return vec4(deepest, 1)
})

const softAcross: Buffer = buffer({ once: true, scale: 1 }, p => {
  let sum = vec3(0)
  for (let step = -3; step <= 3; step += 1) {
    sum = vec3(sum + vec3(darkest.sample(p.uv + vec2((step * 2) / size.x, 0)).rgb))
  }
  return vec4(sum / 7, 1)
})

const ground: Buffer = buffer({ once: true, scale: 1 }, p => {
  let sum = vec3(0)
  for (let step = -3; step <= 3; step += 1) {
    sum = vec3(sum + vec3(softAcross.sample(p.uv + vec2(0, (step * 2) / size.y)).rgb))
  }
  return vec4(sum / 7, 1)
})

// A bit of light's hue, in degrees round the colour wheel, and how
// coloured (rather than white) and how bright it is.
function hue(light: vec3): number {
  return mod(atan(sqrt(3) * (light.g - light.b), 2 * light.r - light.g - light.b) * (180 / PI), 360)
}

function brightest(light: vec3): number {
  return max(light.r, max(light.g, light.b))
}

function colourful(light: vec3): number {
  return (brightest(light) - min(light.r, min(light.g, light.b))) / max(brightest(light), 0.001)
}

// How much of a bit of light belongs to the curtain whose hues run from
// `low` to `high` degrees: bright, coloured, and in that range.
function belongs(light: vec3, low: number, high: number): number {
  const h = hue(light)
  const inRange = smoothstep(low - 6, low + 2, h) * (1 - smoothstep(high - 2, high + 6, h))
  return inRange * smoothstep(0.25, 0.4, colourful(light)) * smoothstep(0.01, 0.03, brightest(light))
}

// How starry a bit of light is: bright, and white rather than coloured.
function starness(light: vec3): number {
  return smoothstep(0.01, 0.04, brightest(light)) * (1 - smoothstep(0.25, 0.45, colourful(light)))
}

// Past a side edge of the window the sky is mirrored, so a curtain carries
// on into the edge with no seam (its ray characters read the same either
// way).
function mirror(across: number): number {
  return 1 - abs(1 - abs(across))
}

// How much each of four neighbouring pixels in a row counts toward a point
// `t` of the way between the middle two (Catmull-Rom). It keeps the edges
// of characters sharp as they glide between pixels, where a plain blend of
// two pixels would soften them.
function weights(t: number): vec4 {
  const t2 = t * t
  const t3 = t2 * t
  return vec4(-0.5 * t3 + t2 - 0.5 * t, 1.5 * t3 - 2.5 * t2 + 1, -1.5 * t3 + 2 * t2 + 0.5 * t, 0.5 * t3 - 0.5 * t2)
}

// A curtain's light at `uv` once it has slid `shift` pixels, smoothly, by
// any fraction of a pixel, picked out of the sky by its hues. Every pixel
// of a curtain slides by the same amount at the same moment, so nothing
// ripples.
function curtain(uv: vec2, shift: number, low: number, high: number): vec3 {
  const from = uv.x * res.x - 0.5 - shift
  const first = floor(from)
  const w = weights(from - first)
  const a = vec3(scene.sample(vec2(mirror((first - 0.5) / res.x), uv.y)).rgb)
  const b = vec3(scene.sample(vec2(mirror((first + 0.5) / res.x), uv.y)).rgb)
  const c = vec3(scene.sample(vec2(mirror((first + 1.5) / res.x), uv.y)).rgb)
  const d = vec3(scene.sample(vec2(mirror((first + 2.5) / res.x), uv.y)).rgb)
  const colour = vec3(a * w.x + b * w.y + c * w.z + d * w.w)
  const behind = vec3(ground.sample(vec2(mirror((from + 0.5) / res.x), uv.y)).rgb)
  const light = max(colour - behind, vec3(0))
  return vec3(light * belongs(light, low, high))
}

// A curtain's breath and its shimmer: patches two characters by two rows
// of scene.js's grid (8 by 15 units, rows ending 16 units down), counted
// where the light came from, so they travel with the curtain and no
// character is ever split between two patches. Each patch shimmers once
// every 10 to 18 seconds.
// One layer of falling snow, at `point` (in points, y up): square pixel
// flakes `flake` points across, at most one to each `cell` points square
// (a `share` of the cells have one), falling `speed` points a second and
// drifting a little from side to side. Answers how much flake is here.
function snowfall(point: vec2, t: number, cell: number, flake: number, speed: number, share: number, salt: number): number {
  const at = vec2(point.x, point.y + t * speed)
  const home = floor(at / cell)
  const roll = hash(vec2(home + salt))
  const place = vec2(hash(vec2(home + salt + 3.1)), hash(vec2(home + salt + 7.7)))
  const drift = sin(t * (0.4 + roll * 0.5) + roll * 6.28) * cell * 0.15
  const centre = vec2((home + 0.2 + place * 0.6) * cell + vec2(drift, 0))
  const off = vec2(abs(at - centre))
  const edge = max(off.x, off.y) - flake * 0.5
  return (1 - smoothstep(-px * 0.5, px * 0.5, edge)) * step(1 - share, roll)
}

function shimmer(t: number, x: number, y: number, salt: number): number {
  const patch = hash(vec2(floor(vec2(x / 16, (y - 16) / 30)) + salt))
  return 0.9 + 0.1 * sin(t * (0.35 + patch * 0.3) + patch * 6.28)
}

export default shader({
  fps: 30,
  passes: [
    darkestAcross,
    darkest,
    softAcross,
    ground,
    picture(p => {
      const t = time * (1 - still)
      const uv = p.uv

      // Where this pixel sits in the sky's own drawing (scene.js draws it
      // 1600 by 1000, y down), laid out as the app lays it: covering the
      // window, centred.
      const scale = max(size.x / 1600, size.y / 1000)
      const overflow = vec2((vec2(1600, 1000) * scale - size) * 0.5)
      const x = (uv.x * size.x + overflow.x) / scale
      const y = ((1 - uv.y) * size.y + overflow.y) / scale

      // Each curtain's slide, in scene.js's units.
      const mainUnits = mix(-34, 30, swing(t, 34))
      const highUnits = mix(26, -28, swing(t, 43))
      const veilUnits = mix(-18, 22, swing(t, 57))

      // The three curtains, each picked out by its hues and slid on its own.
      // Each in pixels: units of the drawing, to points, to pixels.
      const main = curtain(uv, (mainUnits * scale) / px, 115, 178)
      const high = curtain(uv, (highUnits * scale) / px, 182, 238)
      const veil = curtain(uv, (veilUnits * scale) / px, 242, 345)

      // A soft band of light crosses the curtains every 30 seconds.
      const along = fract(t / 30) * 1.8 - 0.4
      const offset = uv.x - along
      const band = exp(-(offset * offset) / 0.018)

      // Each curtain breathes on its own clock, as the original's did.
      const mainGain = mix(0.8, 1, swing(t, 13)) * shimmer(t, x - mainUnits, y, 0) + band * 0.55
      const highGain = mix(0.7, 1.1, swing(t, 17)) * shimmer(t, x - highUnits, y, 31) + band * 0.45
      const veilGain = mix(0.6, 1.25, swing(t, 23)) * shimmer(t, x - veilUnits, y, 67) + band * 0.35
      const aurora = vec3(main * mainGain + high * highGain + veil * veilGain)

      // The stars stay put, and each twinkles whole on its own clock, once
      // every 4 to 9 seconds: scene.js puts one star in each 32-unit cell,
      // well inside it, and only above the ridge. About a third of them
      // barely twinkle, as some stars do.
      const here = scene.sample(uv)
      const back = vec3(ground.sample(uv).rgb)
      const light = max(vec3(here.rgb) - back, vec3(0))
      const heavens = 1 - smoothstep(560, 600, y)
      const stars = vec3(light * starness(light) * heavens)
      const seed = hash(vec2(floor(vec2(x, y) / 32) + 17))
      const depth = mix(0.12, 0.45, smoothstep(0.3, 0.4, seed))
      const twinkle = 1 - depth + depth * sin(t * (0.7 + seed * 0.8) + seed * 6.28)

      // The sky is rebuilt above a line between character rows at 556
      // units, just under the lowest curtain. Below it the ridge, the forest
      // and the snow are drawn as they are.
      const row = 16 + 15 * floor((y - 16) / 15)
      const sky = 1 - step(556, row)
      const rebuilt = vec3(back + aurora + stars * twinkle)
      const lit = vec3(mix(vec3(here.rgb), rebuilt, sky))

      // At Christmas scene.js hangs lights on the pines: under the
      // ridge line nothing else is so bright and so strongly coloured. Each
      // bulb glows up and down on its own clock, once every 2 to 5 seconds,
      // counted by its character cell (8 by 15 units, rows ending 16 down).
      const bulb = smoothstep(0.35, 0.55, brightest(vec3(here.rgb))) * smoothstep(0.45, 0.6, colourful(vec3(here.rgb))) * (1 - sky)
      const bulbSeed = hash(vec2(floor(vec2(x / 8, (y - 16) / 15)) + 91))
      const glow = 0.3 + 0.35 * (1 + sin(t * (1.2 + bulbSeed * 1.6) + bulbSeed * 6.28))
      const shown = vec3(lit * mix(1, glow, bulb))

      // Light pixel snow, in three depths (far, middle, near: smaller,
      // slower and fainter the further away), over the whole scene when it
      // is snowing. Each flake crosses any spot in a moment, and few cross
      // at once, far under the app's limit for flashing.
      const far = snowfall(p.point, t, 26, 1.2, 14, 0.45, 11) * 0.35
      const middle = snowfall(p.point, t, 40, 1.8, 24, 0.4, 23) * 0.55
      const near = snowfall(p.point, t, 64, 2.6, 38, 0.35, 37) * 0.8
      const flakes = max(far, max(middle, near)) * settings.snow
      const snowy = vec3(mix(shown, vec3(0.92, 0.96, 1), flakes))

      return vec4(min(snowy, vec3(here.a)), here.a)
    }),
  ],
})
