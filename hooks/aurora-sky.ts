// aurora-sky.ts: the backdrop's motion, played on the GPU by the desktop app.
//
// It redraws the still ASCII sky from scene.js every frame, taken apart:
// the sky behind the characters, the three curtains, and the stars. Each
// curtain is told apart by its colour (scene.js keeps each to its own
// family of hues) and slides back and forth on its own clock, as the
// original CSS sky's did: the green main curtain over 34 seconds, the
// cyan ribbon above it the other way over 43, the violet veil over 57.
// Each slides by whole pixels, all its characters at once, so they keep
// their shape and stay sharp. The stars stay put. On top of that only
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
} from 'claude-code/shader'

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

// Where a curtain's light at `uv` comes from once the curtain has slid
// `points`: past a side edge of the window the sky is mirrored, so the
// curtain carries on into the edge with no seam (its ray characters read
// the same either way).
function source(uv: vec2, points: number): vec2 {
  return vec2(1 - abs(1 - abs(uv.x - points / size.x)), uv.y)
}

// A curtain's light at `uv`, slid `points` (whole pixels), picked out of
// the sky by its hues.
function curtain(uv: vec2, points: number, low: number, high: number): vec3 {
  const from = source(uv, points)
  const light = max(vec3(scene.sample(from).rgb) - vec3(ground.sample(from).rgb), vec3(0))
  return vec3(light * belongs(light, low, high))
}

// A slide of `units` of scene.js's drawing, in whole pixels.
function slide(units: number, scale: number): number {
  return floor((units * scale) / px + 0.5) * px
}

// A curtain's breath and its shimmer: patches two characters by two rows
// of scene.js's grid (8 by 15 units, rows ending 16 units down), counted
// where the light came from, so they travel with the curtain and no
// character is ever split between two patches. Each patch shimmers once
// every 10 to 18 seconds.
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
      const main = curtain(uv, slide(mainUnits, scale), 115, 178)
      const high = curtain(uv, slide(highUnits, scale), 182, 238)
      const veil = curtain(uv, slide(veilUnits, scale), 242, 345)

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

      return vec4(min(lit, vec3(here.a)), here.a)
    }),
  ],
})
