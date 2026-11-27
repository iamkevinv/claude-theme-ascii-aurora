// aurora-sky.ts: the backdrop's motion, played on the GPU by the desktop app.
//
// It redraws the still ASCII sky from scene.js every frame: the curtains
// ripple sideways, a soft band of light travels along them, the light
// breathes and shimmers in patches, and the stars twinkle, each on its own
// clock. Everything is slow (no spot changes more than once every few
// seconds), far under the app's limit for flashing. Under Reduce Motion
// `still` is 1, time stands still, and the sky shows as drawn.
import {
  dot,
  exp,
  floor,
  fract,
  max,
  min,
  mix,
  picture,
  scene,
  shader,
  sin,
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

export default shader({
  fps: 30,
  passes: [
    picture(p => {
      const t = time * (1 - still)
      const uv = p.uv

      // The aurora fills the upper part of the window (y points up). The
      // ridge, the forest and the foot of the window stay put.
      const sky = smoothstep(0.38, 0.6, uv.y)

      // The curtains ripple sideways, a few points at most, slowly.
      const ripple = sin(uv.y * 9 + t * 0.19) * 0.6 + sin(uv.y * 23 + uv.x * 4 - t * 0.11) * 0.4
      const color = scene.sample(vec2(uv.x + ripple * 0.009 * sky, uv.y))

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

      // The light breathes, and patches of it shimmer at their own pace,
      // once every 10 to 18 seconds.
      const patch = hash(vec2(floor(p.point / 14)))
      const shimmer = 0.9 + 0.1 * sin(t * (0.35 + patch * 0.3) + patch * 6.28)
      const breathe = 0.9 + 0.1 * sin(t * 0.42)
      const gain = 1 + aurora * (shimmer * breathe - 1 + band * 0.55)

      // Each star twinkles on its own clock, once every 4 to 9 seconds.
      const seed = hash(vec2(floor(p.point / 6) + 17))
      const twinkle = 0.55 + 0.45 * sin(t * (0.7 + seed * 0.8) + seed * 6.28)
      const light = gain * mix(1, twinkle, star)

      return vec4(min(vec3(color.rgb * light), vec3(color.a)), color.a)
    }),
  ],
})
