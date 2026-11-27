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
      const overflow = (1000 * scale - size.y) * 0.5
      const y = ((1 - uv.y) * size.y + overflow) / scale

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
      const color = scene.sample(vec2(uv.x - points / size.x, uv.y))
      // Where the sampled light sits in the drawing, so a star's twinkle and
      // a patch's shimmer travel with it.
      const at = vec2(p.point.x - points, p.point.y)

      // Which pixels are the aurora's light (bright and coloured) and which
      // are stars (bright and nearly white).
      const top = max(color.r, max(color.g, color.b))
      const low = min(color.r, min(color.g, color.b))
      const lum = dot(vec3(color.rgb), vec3(0.3, 0.59, 0.11))
      const aurora = smoothstep(0.12, 0.4, top - low) * smoothstep(0.1, 0.35, lum) * sky
      const star = smoothstep(0.45, 0.7, lum) * (1 - smoothstep(0.12, 0.3, top - low))

      // A soft band of light crosses the curtains every 30 seconds.
      const along = fract(t / 30) * 1.8 - 0.4
      const offset = uv.x - along
      const band = exp(-(offset * offset) / 0.018)

      // The light breathes over 13 seconds, as the original did, and patches
      // of it shimmer once every 10 to 18 seconds.
      const patch = hash(vec2(floor(at / 14)))
      const shimmer = 0.9 + 0.1 * sin(t * (0.35 + patch * 0.3) + patch * 6.28)
      const breathe = mix(0.82, 1, swing(t, 13))
      const gain = 1 + aurora * (shimmer * breathe - 1 + band * 0.55)

      // Each star twinkles on its own clock, once every 4 to 9 seconds.
      const seed = hash(vec2(floor(at / 6) + 17))
      const twinkle = 0.55 + 0.45 * sin(t * (0.7 + seed * 0.8) + seed * 6.28)
      const light = gain * mix(1, twinkle, star)

      return vec4(min(vec3(color.rgb * light), vec3(color.a)), color.a)
    }),
  ],
})
