// Checks that DESIGN.md's colours are the theme's own, so the two never
// drift apart. Run from the project folder:
//   node scripts/check-design.mjs
// It exits 1, listing each difference, when a colour in DESIGN.md's tokens
// is missing, differs from the code, or names nothing in it. With --print
// it prints the colours as the code has them, as DESIGN.md's YAML.
//
// The colours come from hooks/palette.js (the app's colours), make-colors.js
// (the named colours they resolve to in each mode) and scene.js (the sky).
// `claude plugin test` can't read files, so this runs under Node instead.
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { makeColors } from '../hooks/make-colors.js'
import { MESSAGES, THEME, USER_MESSAGE_GLOW } from '../hooks/palette.js'
import { BULBS, STAR, STAR_TINTS, auroraScene } from '../hooks/scene.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const MODES = ['light', 'dark']

// --- What the code says ------------------------------------------------

// The named colours the theme's styles use, resolved per mode through
// make-colors.js's own graph (a name maps to a stop, or a light and a dark one).
const NAMED = ['text-accent', 'fill-accent', 'fill-pro', 'border-accent', 'border-pro']
const graph = readFileSync(join(root, 'hooks', 'make-colors.js'), 'utf8')
const { theme } = makeColors(THEME)

function resolve(name, mode) {
  const inputs = theme.inputs[mode]
  if (inputs[name] !== undefined) return inputs[name]
  const entry = graph.match(new RegExp(`^\\s+"?${name}"?: (\\[[^\\]]*\\]|"[^"]*")`, 'm'))
  if (entry === null) throw Error(`make-colors.js has no colour named ${name}`)
  const target = JSON.parse(entry[1])
  return resolve(Array.isArray(target) ? target[MODES.indexOf(mode)] : target, mode)
}

// The sky's colours, read from the SVG scene.js draws: gradient stops by
// gradient, and the fills its style gives each class, by night and by day.
const sky = auroraScene()
const stops = id => {
  const gradient = sky.match(new RegExp(`<(?:linear|radial)Gradient id="${id}"[^>]*>(.*?)</(?:linear|radial)Gradient>`))
  if (gradient === null) throw Error(`scene.js has no gradient ${id}`)
  return [...gradient[1].matchAll(/stop-color="(#[0-9a-f]+)"/gi)].map(m => m[1])
}
const style = sky.match(/<style>(.*?)<\/style>/s)[1]
const [nightRules, dayRules] = style.split('@media (prefers-color-scheme: light)')
const fill = (rules, cls) => rules.match(new RegExp(`\\.${cls} \\{[^}]*fill: (#[0-9a-f]+)`, 'i'))?.[1]
const hems = [...sky.matchAll(/<path class="hem"[^>]*stroke="(#[0-9a-f]+)"/gi)].map(m => m[1])

// The scene's colours, by the names DESIGN.md gives them.
const numbered = (prefix, list) => Object.fromEntries(list.map((c, i) => [`${prefix}-${i + 1}`, c]))
const GROUND = { 'far-ridge': 'far', peaks: 'peaks', 'near-ridge': 'near', pines: 'trees', snowcaps: 'snowcaps', 'ground-snow': 'snow', 'far-ground': 'farGround', 'near-ground': 'nearGround' }
const ground = rules => Object.fromEntries(Object.entries(GROUND).map(([name, cls]) => [name, fill(rules, cls)]))

function expected() {
  const roles = THEME.roles
  const tokens = {
    ...roles,
    'main-glow': hems[0],
    'ribbon-glow': hems[1],
    'user-message-glow': USER_MESSAGE_GLOW,
    ...Object.fromEntries(['bulb-red', 'bulb-gold', 'bulb-blue', 'bulb-pink', 'bulb-green'].map((n, i) => [n, BULBS[i]])),
    'tree-star': STAR,
  }
  const modes = {
    light: {
      ...numbered('sky', stops('skyDay')),
      'sun-glow': stops('sunGlow')[0],
      ...numbered('main', stops('mainDay')),
      ...numbered('ribbon', stops('highDay')),
      ...numbered('veil', stops('veilDay')),
      ...ground(dayRules),
    },
    dark: {
      ...numbered('sky', stops('sky')),
      'green-glow': stops('glowGreen')[0],
      'violet-glow': stops('glowViolet')[0],
      ...numbered('main', stops('mainLight')),
      ...numbered('ribbon', stops('highLight')),
      ...numbered('veil', stops('veilLight')),
      ...ground(nightRules),
      ...Object.fromEntries(['star-blue', 'star-ice', 'star-lilac', 'star-mint', 'star-warm'].map((n, i) => [n, STAR_TINTS[i]])),
    },
  }
  for (const mode of MODES) {
    const app = {
      ...THEME[mode].gray.anchors,
      ...MESSAGES[mode],
      ...Object.fromEntries(NAMED.map(name => [name, resolve(name, mode)])),
      ...Object.fromEntries(Object.entries(THEME[mode].git).map(([k, v]) => [`git-${k}`, v])),
    }
    tokens[mode] = { ...app, ...modes[mode] }
  }
  return tokens
}

// --- What DESIGN.md says -----------------------------------------------

// Just enough YAML for DESIGN.md's front matter: nested maps of scalars.
function parseYaml(text) {
  const top = {}
  const stack = [{ indent: -1, map: top }]
  for (const raw of text.split('\n')) {
    const line = raw.replace(/\s+#.*$/, '')
    if (line.trim() === '' || line.trim().startsWith('#')) continue
    const indent = line.length - line.trimStart().length
    const m = line.trim().match(/^("?[^":]+"?):\s*(.*)$/)
    if (m === null) throw Error(`DESIGN.md: can't read the token line "${raw.trim()}"`)
    while (indent <= stack.at(-1).indent) stack.pop()
    const key = m[1].replace(/^"|"$/g, '')
    if (m[2] === '') {
      const map = {}
      stack.at(-1).map[key] = map
      stack.push({ indent, map })
    } else {
      stack.at(-1).map[key] = m[2].replace(/^"(.*)"$/, '$1').replace(/^'(.*)'$/, '$1')
    }
  }
  return top
}

function flatten(map, prefix = '') {
  return Object.entries(map).flatMap(([k, v]) =>
    typeof v === 'object' ? flatten(v, `${prefix}${k}.`) : [[`${prefix}${k}`, v]])
}

// --- Compare -----------------------------------------------------------

const want = Object.fromEntries(flatten(expected()).map(([k, v]) => [`colors.${k}`, v]))

if (process.argv.includes('--print')) {
  const print = (map, indent) => {
    for (const [k, v] of Object.entries(map)) {
      if (typeof v === 'object') {
        console.log(`${' '.repeat(indent)}${k}:`)
        print(v, indent + 2)
      } else {
        console.log(`${' '.repeat(indent)}${k}: "${v}"`)
      }
    }
  }
  print({ colors: expected() }, 0)
  process.exit(0)
}

const design = readFileSync(join(root, 'DESIGN.md'), 'utf8')
const front = design.match(/^---\n(.*?)\n---\n/s)
if (front === null) {
  console.error('DESIGN.md has no YAML front matter between --- lines.')
  process.exit(1)
}
const tokens = parseYaml(front[1])
const have = Object.fromEntries(flatten(tokens).filter(([k]) => k.startsWith('colors.')))
const lookup = path => Object.fromEntries(flatten(tokens))[path]

const problems = []
for (const [path, value] of Object.entries(want)) {
  if (have[path] === undefined) problems.push(`${path} is missing: the code has ${value}`)
  else if (have[path].toLowerCase() !== String(value).toLowerCase()) problems.push(`${path} is ${have[path]}, but the code has ${value}`)
}
for (const [path, value] of Object.entries(have)) {
  if (want[path] !== undefined) continue
  const ref = value.match(/^\{(.+)\}$/)
  if (ref === null) problems.push(`${path} (${value}) is no colour the code has: remove it, or add it to the code and to this check`)
  else if (lookup(ref[1]) === undefined) problems.push(`${path} refers to ${ref[1]}, which isn't a token`)
}
// Every reference anywhere in the tokens must name a token.
for (const [path, value] of flatten(tokens)) {
  const ref = typeof value === 'string' && value.match(/^\{(.+)\}$/)
  if (ref && lookup(ref[1]) === undefined && !Object.keys(Object.fromEntries(flatten(tokens))).some(k => k.startsWith(`${ref[1]}.`))) {
    problems.push(`${path} refers to ${ref[1]}, which isn't a token`)
  }
}

// Colours named in the prose must be the code's too.
const known = new Set(Object.values(want).map(v => String(v).toLowerCase()))
for (const [hex] of design.slice(front[0].length).matchAll(/#[0-9a-f]{6}(?:[0-9a-f]{2})?\b/gi)) {
  if (!known.has(hex.toLowerCase())) problems.push(`the text names ${hex}, which is no colour the code has`)
}

if (problems.length > 0) {
  console.error(`DESIGN.md is out of step with the code:\n${[...new Set(problems)].map(p => `  - ${p}`).join('\n')}`)
  process.exit(1)
}
console.log(`DESIGN.md matches the code: ${Object.keys(want).length} colours checked.`)
