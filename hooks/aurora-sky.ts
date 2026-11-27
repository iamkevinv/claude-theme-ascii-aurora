// aurora-sky.ts: the backdrop's motion, played on the GPU by the desktop app.
//
// It redraws the still ASCII sky from scene.js every frame, moving it the
// way the original CSS sky moved: the curtains slide back and forth and
// lean a degree or two, as one sheet, so every character keeps its shape.
// The slide is rounded to whole pixels, so the characters stay sharp. On
// top of that only brightness changes: a soft band of light crosses the
// curtains, the light breathes and shimmers in patches, and the stars
// twinkle. Everything is slow (no spot changes more than once every few
// seconds), far under the app's limit for flashing. Under Reduce Motion
// `still` is 1, time stands still, and the sky shows as drawn.
import {
  PI,
  cos,
  dot,
  exp,
  floor,
  fract,
  max,
  min,
  mix,
  picture,
  px,
  scene,
  shader,
  sin,
  size,
  smoothstep,
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

// How starry a bit of light is: bright, and white rather than coloured.
// Run on a pixel's light above the sky behind it, it picks out the stars'
// glyphs and passes over the aurora's coloured ones.
function starness(light: vec3): number {
  const top = max(light.r, max(light.g, light.b))
  const low = min(light.r, min(light.g, light.b))
  return smoothstep(0.01, 0.04, top) * (1 - smoothstep(0.25, 0.45, (top - low) / max(top, 0.001)))
}

// What lies behind a star: the darkest of the sky 7 points away on each
// side. A star is smaller than that, so at least one of the four lands on
// plain sky, with none of the star's own light in it.
function behind(at: vec2): vec3 {
  const across = vec2(7 / size.x, 0)
  const down = vec2(0, 7 / size.y)
  const sides = min(vec3(scene.sample(at + across).rgb), vec3(scene.sample(at - across).rgb))
  const ends = min(vec3(scene.sample(at + down).rgb), vec3(scene.sample(at - down).rgb))
  return vec3(min(sides, ends))
}

export default shader({
  fps: 30,
  passes: [
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

      // The original sway: the curtains slide between -34 and 30 units and
      // lean between 2.2 and -1.8 degrees about the main curtain's hem, over
      // 34 seconds each way. The upper curtains also drift a little on their
      // own 43-second clock, a lean of under 3 degrees more.
      const main = swing(t, 34)
      const lean = mix(2.2, -1.8, main) * (PI / 180)
      const upper = 1 - smoothstep(160, 360, y)
      const units = mix(-34, 30, main) - lean * (480 - y) + upper * mix(8, -8, swing(t, 43))

      // Only the sky moves: not the ridge, nor the window's side edges.
      const sky = 1 - smoothstep(500, 570, y)
      const sides = smoothstep(0, 0.06, uv.x) * (1 - smoothstep(0.94, 1, uv.x))

      // In whole pixels, so the characters stay sharp.
      const points = floor((units * scale * sky * sides) / px + 0.5) * px
      const moved = vec2(uv.x - points / size.x, uv.y)

      // The stars stay put while the aurora moves, as real ones do. The
      // sliding sheet has its stars lifted out (each one's light above the
      // sky behind it), and the stars are laid back in from the sky where it
      // stands still. Stars only live above the ridge.
      const heavens = 1 - smoothstep(560, 600, y)
      const sheet = scene.sample(moved)
      const sheetStars = max(vec3(sheet.rgb) - behind(moved), vec3(0))
      const color = vec3(vec3(sheet.rgb) - sheetStars * starness(sheetStars) * heavens)
      const fixed = scene.sample(uv)
      const fixedStars = max(vec3(fixed.rgb) - behind(uv), vec3(0))
      const stars = vec3(fixedStars * starness(fixedStars) * heavens)

      // Which pixels are the aurora's light: bright and coloured.
      const top = max(color.r, max(color.g, color.b))
      const low = min(color.r, min(color.g, color.b))
      const lum = dot(color, vec3(0.3, 0.59, 0.11))
      const aurora = smoothstep(0.12, 0.4, top - low) * smoothstep(0.1, 0.35, lum) * sky

      // A soft band of light crosses the curtains every 30 seconds.
      const along = fract(t / 30) * 1.8 - 0.4
      const offset = uv.x - along
      const band = exp(-(offset * offset) / 0.018)

      // The light breathes over 13 seconds, as the original did, and patches
      // of it shimmer once every 10 to 18 seconds. A patch is two characters
      // by two rows of scene.js's grid (8 by 15 units, rows ending 16 units
      // down), counted where the light came from, so it travels with the
      // curtain and no character is ever split between two patches.
      const from = x - points / scale
      const patch = hash(floor(vec2(from / 16, (y - 16) / 30)))
      const shimmer = 0.9 + 0.1 * sin(t * (0.35 + patch * 0.3) + patch * 6.28)
      const breathe = mix(0.82, 1, swing(t, 13))
      const gain = 1 + aurora * (shimmer * breathe - 1 + band * 0.55)

      // Each star twinkles whole, on its own clock, once every 4 to 9
      // seconds: scene.js puts one star in each 32-unit cell, well inside it.
      // About a third of them barely twinkle, as some stars do.
      const seed = hash(vec2(floor(vec2(x, y) / 32) + 17))
      const depth = mix(0.12, 0.45, smoothstep(0.3, 0.4, seed))
      const twinkle = 1 - depth + depth * sin(t * (0.7 + seed * 0.8) + seed * 6.28)

      const lit = vec3(color * gain + stars * twinkle)
      return vec4(min(lit, vec3(fixed.a)), fixed.a)
    }),
  ],
})
