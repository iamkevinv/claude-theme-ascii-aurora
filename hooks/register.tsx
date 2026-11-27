import type {
  EngineInterface,
  Register,
  ThemeMessageRule,
  ThemeResult,
  ThemeColors,
  ThemeSetArgs,
  ThemeSound,
  ThemeStyle,
  Timer,
} from 'claude-code'

import { makeColors } from './make-colors.js'
import { auroraScene } from './scene.js'
import { localTimeZone, shouldSnow } from './season.js'

// ASCII aurora, by night and by day. In dark mode a polar night: surfaces
// deep blue-black, text icy mint. In light mode a daytime aurora sky:
// surfaces pale periwinkle, text deep indigo. Either way the five roles are
// the aurora's own colours, so code comes out in them: keywords teal,
// strings green, literals violet, names magenta, variables gold.
const { theme, problems } = makeColors({
  label: 'ASCII Aurora',
  roles: { accent: '#3fe0c5', danger: '#ff6b9a', success: '#7cf29a', warning: '#f6c667', pro: '#b48cff' },
  light: {
    gray: {
      anchors: {
        'surface-0': '#e3e6f4',
        'surface-1': '#eceef9',
        'surface-2': '#f6f7fd',
        'text-primary': '#191d3a',
        'text-secondary': '#363b62',
        'text-muted': '#555a82',
      },
    },
    git: { added: '#1f8a5b', removed: '#c23a63', modified: '#a8780e', merged: '#7a4fd0' },
  },
  dark: {
    gray: {
      anchors: {
        'surface-0': '#060b13',
        'surface-1': '#0a121c',
        'surface-2': '#0e1824',
        'surface-3': '#121e2b',
        'text-primary': '#e6f7f1',
        'text-secondary': '#b9d6ce',
        'text-muted': '#8eaea8',
      },
    },
    git: { added: '#7cf29a', removed: '#ff6b9a', modified: '#f6c667', merged: '#b48cff' },
  },
})

// The four message colours, by mode, which `style` names below so the
// messages follow light and dark.
const COLORS: ThemeColors = {
  ...theme,
  inputs: {
    light: {
      ...theme.inputs.light,
      'bg-user-message': '#eef0fb',
      'text-user-message': '#191d3a',
      'bg-assistant-message': '#f7f8fd',
      'text-assistant-message': '#1f2340',
    },
    dark: {
      ...theme.inputs.dark,
      'bg-user-message': '#0c1e26',
      'text-user-message': '#eafff8',
      'bg-assistant-message': '#08111a',
      'text-assistant-message': '#d6ebe5',
    },
  },
}

const SCENE = 'ascii-aurora-theme'
// The sky in each of its four states: on Christmas Eve and Christmas Day,
// by the computer's own calendar, every pine is hung with coloured lights;
// while it snows, the top third of each pine is white with snow.
const SKIES = {
  plain: auroraScene(),
  festive: auroraScene({ festive: true }),
  snowy: auroraScene({ snowy: true }),
  festiveSnowy: auroraScene({ festive: true, snowy: true }),
}

function sky(festive: boolean, snowy: boolean): string {
  if (festive) {
    return snowy ? SKIES.festiveSnowy : SKIES.festive
  }
  return snowy ? SKIES.snowy : SKIES.plain
}

type Paint = NonNullable<ThemeMessageRule['backgroundColor']>

// A box drawn like ASCII art: +-----+ with the corners in their own colour.
// The drawing is cut in nine, so the corners stay put and the edges stretch.
// Its colours are named ones, which follow light and dark: each contrasts
// at least 3:1 with the message's words in both modes, as the app requires.
function asciiBox(body: Paint, corner: Paint, line?: Paint): NonNullable<ThemeMessageRule['fill']> {
  return {
    vector: {
      viewBox: 48,
      slice: 8,
      paths: [
        { d: 'M4 4H44V44H4Z', color: body },
        ...(line === undefined ? [] : [{ d: 'M0 4H48M0 44H48M4 0V48M44 0V48', strokeWidth: 1, color: line }]),
        {
          d: 'M0 4H8M4 0V8M40 4H48M44 0V8M0 44H8M4 40V48M40 44H48M44 40V48',
          strokeWidth: 1.5,
          color: corner,
        },
      ],
    },
  }
}

const STYLE: ThemeStyle = {
  Text: { fontFamily: ['mono'], fontSize: 14, lineHeight: 22 },
  Heading: { fontFamily: ['mono'], color: 'text-accent', fontWeight: 'bold', letterSpacing: 0.5 },
  // Your messages: a full ASCII frame, aurora-teal lines, violet corners.
  UserMessage: {
    color: 'text-user-message',
    backgroundColor: 'bg-user-message',
    fill: asciiBox('bg-user-message', 'fill-pro', 'fill-accent'),
    paddingX: 18,
    paddingY: 13,
    shadow: { blur: 18, color: '#2ee6a02e' },
  },
  // Claude's replies: a plain pane with only its corners marked, softly.
  AssistantMessage: {
    color: 'text-assistant-message',
    backgroundColor: 'bg-assistant-message',
    fill: asciiBox('bg-assistant-message', 'border-pro'),
    paddingX: 18,
    paddingY: 13,
  },
  ToolUse: {
    color: 'text-accent',
    fontFamily: ['code'],
    backgroundColor: 'surface-1',
    borderColor: 'border-accent',
    borderWidth: 1,
    radius: 2,
    paddingX: 10,
    paddingY: 4,
  },
}

// Off until you press the speaker in the title bar. Wind over the snow,
// now and then a high bell, like the sky crackling, and a low note
// answering it.
//
// The wind has two modes, switched from the right-click menu or
// `/ascii-aurora-wind`:
// steady, always there; or gusty, where it rises and dies away to almost
// nothing, for windy and calm spells of random length.

type WindMode = 'steady' | 'gusty'

const isWindMode = (value: unknown): value is WindMode => value === 'steady' || value === 'gusty'

// How quiet a calm spell gets, as a share of full wind.
const CALM = 0.04

const round = (n: number) => Math.round(n * 1000) / 1000

// The wind's layers at `level`, 0 (still) to 1 (full).
type AmbienceLayer = NonNullable<ThemeSound['ambience']>['layers'][number]

function wind(level: number, mode: WindMode): AmbienceLayer[] {
  const layers: AmbienceLayer[] = [
    { wave: 'brown', drone: true, gain: round(0.16 * level), filter: { type: 'lowpass', hz: 220, to: 520 } },
    {
      wave: 'pink',
      drone: true,
      gain: round(0.05 * level),
      filter: { type: 'bandpass', hz: 900, to: 1600 },
      tremolo: { hz: 0.07, depth: 0.6 },
    },
  ]

  // In a windy spell, gusts on top: soft bursts that sweep down in pitch.
  if (mode === 'gusty' && level > 0.3) {
    layers.push({
      wave: 'pink',
      scatter: round(0.06 + 0.12 * level),
      gain: round(0.07 * level),
      attack: 1.5,
      release: 2.4,
      pan: -0.2,
      filter: { type: 'bandpass', hz: 1500, to: 600 },
    })
  }

  return layers
}

function sound(level: number, mode: WindMode): ThemeSound {
  return {
    ambience: {
      layers: [
        ...wind(level, mode),
        // Now and then a soft low note from the same scale as the bells,
        // panned the other way so the two answer each other.
        {
          wave: 'triangle',
          notes: ['E2', 'B2', 'C#3', 'E3', 'F#3'],
          scatter: 0.05,
          gain: 0.12,
          attack: 0.4,
          release: 3.5,
          pan: -0.3,
          filter: { type: 'lowpass', hz: 700 },
        },
        {
          wave: 'bell',
          notes: ['B5', 'E6', 'F#6', 'G#6', 'C#7'],
          scatter: 0.09,
          gain: 0.07,
          attack: 0.02,
          release: 3,
          pan: 0.3,
        },
      ],
      reverb: 0.5,
    },
    cues: CUES,
  }
}

const CUES: ThemeSound['cues'] = {
  send: { layers: [{ wave: 'sine', notes: ['B5', 'E6'], step: 0.07, gain: 0.18, release: 0.35 }] },
  tool: { layers: [{ wave: 'triangle', notes: ['E7'], gain: 0.04, release: 0.08 }] },
  done: { layers: [{ wave: 'bell', notes: ['E5', 'G#5', 'B5', 'E6'], step: 0.11, gain: 0.2, release: 1.8 }], reverb: 0.4 },
  ask: { layers: [{ wave: 'sine', notes: ['G#5', 'C#6'], step: 0.13, gain: 0.18, release: 0.6 }] },
  error: { layers: [{ wave: 'triangle', notes: ['E4', 'C4'], step: 0.16, gain: 0.16, release: 0.5 }] },
  compact: {
    layers: [{ wave: 'pink', gain: 0.1, attack: 0.3, release: 1.2, filter: { type: 'bandpass', hz: 2400, to: 400 } }],
  },
  click: {
    layers: [{ wave: 'bell', notes: ['E5', 'F#5', 'G#5', 'B5', 'C#6', 'E6'], gain: 0.14, release: 1 }],
    reverb: 0.25,
  },
}

const BASE: ThemeSetArgs = {
  colors: COLORS,
  // No tint: the frosted panels take the app's own panel colour, which
  // follows light and dark.
  backdrop: { scene: SCENE, glass: { blur: 10, opacity: 0.7 } },
}

// A fade between spells: this many steps, this far apart, so 30 to 48
// seconds of slow swell or ebb, eased at both ends. The app also
// cross-fades each change of sound, which smooths the steps.
const FADE_STEPS: readonly [number, number] = [10, 16]
const FADE_STEP_MS = 3000
// How long each kind of spell lasts, in seconds.
const WINDY_SPELL: readonly [number, number] = [20, 90]
const CALM_SPELL: readonly [number, number] = [15, 75]

const between = ([low, high]: readonly [number, number]) => low + Math.random() * (high - low)
const ease = (t: number) => t * t * (3 - 2 * t)

// The weather, for this load of the module: a reload reads the mode back
// from the store and starts over.
const weather = {
  mode: 'steady' as WindMode,
  level: 1,
  hasSound: true,
  isWindy: true,
  fade: { from: 1, to: 1, step: 0, steps: 1 },
  timer: undefined as Timer | undefined,
}

// Sets the whole look, richest first: a build that refuses `sound` or
// `style` refuses the whole set, so fall back a step at a time.
async function setLook($: EngineInterface): Promise<ThemeResult | undefined> {
  const looks: ThemeSetArgs[] = [
    ...(weather.hasSound ? [{ ...BASE, style: STYLE, sound: sound(weather.level, weather.mode) }] : []),
    { ...BASE, style: STYLE },
    BASE,
  ]

  for (const [index, look] of looks.entries()) {
    try {
      return await $.theme.set(look)
    } catch (error) {
      $.ui.log(`ascii-aurora-theme: ${String(error)}`)
      if (index === 0 && weather.hasSound) {
        weather.hasSound = false
        stopGusts()
      }
    }
  }

  return undefined
}

function stopGusts() {
  weather.timer?.cancel()
  weather.timer = undefined
}

// Gusty wind: calm and windy spells of random length, each faded into over
// a few steps, for as long as the mode is gusty.
function startGusts($: EngineInterface) {
  stopGusts()
  weather.isWindy = weather.level > 0.5
  weather.timer = $.clock.after(between(weather.isWindy ? WINDY_SPELL : CALM_SPELL) * 1000, () => turnWeather($))
}

// The spell ends: fade toward the other kind.
function turnWeather($: EngineInterface) {
  weather.isWindy = !weather.isWindy
  weather.fade = {
    from: weather.level,
    to: weather.isWindy ? between([0.65, 1]) : CALM,
    step: 0,
    steps: Math.round(between(FADE_STEPS)),
  }
  fadeStep($)
}

function fadeStep($: EngineInterface) {
  const fade = weather.fade
  fade.step += 1
  weather.level = fade.from + (fade.to - fade.from) * ease(fade.step / fade.steps)
  void setLook($)
  weather.timer =
    fade.step < fade.steps
      ? $.clock.after(FADE_STEP_MS, () => fadeStep($))
      : $.clock.after(between(weather.isWindy ? WINDY_SPELL : CALM_SPELL) * 1000, () => turnWeather($))
}

async function setMode($: EngineInterface, mode: WindMode) {
  weather.mode = mode
  stopGusts()
  if (mode === 'steady') {
    weather.level = 1
  }
  await setLook($)
  if (mode === 'gusty' && weather.hasSound) {
    startGusts($)
  }
  try {
    await $.store.set('wind', mode)
  } catch {
    // Remembering is a nicety: the mode still holds for this session.
  }
  $.ui.invalidate('ui.render')
}

// Christmas Eve or Christmas Day, in the computer's own time zone.
function isChristmas(ms: number): boolean {
  const day = new Date(ms)
  return day.getMonth() === 11 && (day.getDate() === 24 || day.getDate() === 25)
}

// `on` is the calendar's say; `override` is the person's, from
// /ascii-aurora-christmas, and stands for the rest of the session.
const christmas = {
  on: false,
  override: undefined as boolean | undefined,
  timer: undefined as Timer | undefined,
}

// Whether the pines wear their lights right now.
function lightsUp(): boolean {
  return christmas.override ?? christmas.on
}

// Whether it snows this session: decided once, as the session starts. In
// the cold months where the person is (by their computer's time zone, so
// no location is asked for) there is a 30% chance; otherwise none.
const season = { snowing: false }

// The time now, or undefined where there is no clock to ask, which then
// means no Christmas lights and no snow, and never a theme left unset.
async function now($: EngineInterface): Promise<number | undefined> {
  try {
    return await $.clock.now()
  } catch {
    return undefined
  }
}

// Hangs the lights, or takes them down, when the day changes, unless the
// person has said otherwise this session.
async function checkChristmas($: EngineInterface) {
  const ms = await now($)
  const on = ms !== undefined && isChristmas(ms)
  if (on !== christmas.on) {
    christmas.on = on
    if (christmas.override === undefined) {
      $.ui.invalidate('ui.render')
    }
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    const unpainted = problems.find(line => line.startsWith("Desktop won't paint"))

    if (unpainted !== undefined) {
      $.ui.toast(unpainted)
    }

    try {
      const stored = await $.store.get('wind')
      if (isWindMode(stored)) {
        weather.mode = stored
      }
    } catch {
      // No store: steady wind, the default.
    }

    await $.command.register({
      name: 'ascii-aurora-wind',
      description: 'ASCII Aurora sound: switch the wind between steady and gusty (or name one)',
    })
    await $.command.register({
      name: 'ascii-aurora-snow',
      description: 'ASCII Aurora: let it snow, or stop it, for this session (on or off)',
    })
    await $.command.register({
      name: 'ascii-aurora-christmas',
      description: 'ASCII Aurora: hang the Christmas lights, or take them down, for this session (on or off)',
    })

    // Roll for snow before the sky is first drawn.
    const startedAt = await now($)
    season.snowing = startedAt !== undefined && shouldSnow(localTimeZone(), new Date(startedAt).getMonth(), Math.random())

    const result = await setLook($)

    // Not drawn yet is normal: a terminal never draws themes, and the
    // desktop app may attach after the session starts, when the theme draws.
    if (result !== undefined && !result.isDrawn) {
      $.ui.log(`ascii-aurora-theme: ${result.reason}`, { to: 'debug' })
    }
    if (weather.mode === 'gusty' && weather.hasSound) {
      startGusts($)
    }

    // Look at the calendar now, and every 10 minutes, so the lights go up
    // and come down around midnight.
    christmas.on = startedAt !== undefined && isChristmas(startedAt)
    christmas.override = undefined
    christmas.timer?.cancel()
    try {
      christmas.timer = $.clock.every(10 * 60 * 1000, () => void checkChristmas($))
    } catch {
      // No clock: the lights stay as they are for this session.
    }

    return next(e)
  })

  on('command.run', { command: 'ascii-aurora-wind' }, async ($, e) => {
    const asked = e.args.trim().toLowerCase()

    if (asked !== '' && !isWindMode(asked)) {
      return { text: `Wind is ${weather.mode}. Use /ascii-aurora-wind steady, /ascii-aurora-wind gusty, or /ascii-aurora-wind alone to switch.` }
    }
    if (!weather.hasSound) {
      return { text: 'This version of the app does not take theme sound, so there is no wind to change.' }
    }

    await setMode($, asked === '' ? (weather.mode === 'steady' ? 'gusty' : 'steady') : asked)

    return {
      text:
        weather.mode === 'gusty'
          ? 'Wind is now gusty: it rises and dies away to almost nothing, in spells of random length.'
          : 'Wind is now steady.',
    }
  })

  // Christmas lights on demand, for this session, whatever the date.
  on('command.run', { command: 'ascii-aurora-christmas' }, ($, e) => {
    const asked = e.args.trim().toLowerCase()

    if (asked !== '' && asked !== 'on' && asked !== 'off') {
      return {
        text: `The Christmas lights are ${lightsUp() ? 'up' : 'down'}. Use /ascii-aurora-christmas on, /ascii-aurora-christmas off, or /ascii-aurora-christmas alone to switch.`,
      }
    }

    christmas.override = asked === '' ? !lightsUp() : asked === 'on'
    $.ui.invalidate('ui.render')

    return {
      text: christmas.override
        ? 'The Christmas lights are up for the rest of this session.'
        : 'The Christmas lights are down for the rest of this session.',
    }
  })

  // Snow on demand, for this session, whatever the season.
  on('command.run', { command: 'ascii-aurora-snow' }, ($, e) => {
    const asked = e.args.trim().toLowerCase()

    if (asked !== '' && asked !== 'on' && asked !== 'off') {
      return {
        text: `It is ${season.snowing ? '' : 'not '}snowing. Use /ascii-aurora-snow on, /ascii-aurora-snow off, or /ascii-aurora-snow alone to switch.`,
      }
    }

    season.snowing = asked === '' ? !season.snowing : asked === 'on'
    $.ui.invalidate('ui.render')

    return {
      text: season.snowing
        ? 'Snow is falling for the rest of this session.'
        : 'The snow has stopped for the rest of this session.',
    }
  })

  // A row in the desktop app's right-click menu, on the conversation itself
  // (not on a link, a selection or code, whose menus have their own jobs).
  on('ui.render', { component: 'ContextMenu' }, async ($, e, next) => {
    const below = await next(e)

    if (!weather.hasSound || e.props.link !== undefined || e.props.selection !== undefined || e.props.code !== undefined) {
      return below
    }

    const { Box, Button, Text } = $.ui.resolve(e)
    const other: WindMode = weather.mode === 'steady' ? 'gusty' : 'steady'

    return (
      <Box flexDirection="column">
        {below}
        <Button key="wind" onPress={() => setMode($, other)}>
          {other === 'gusty' ? 'Wind: make it gusty' : 'Wind: make it steady'}{' '}
          <Text dimColor>
            {other === 'gusty' ? 'Aurora sound: comes and goes, fading to almost nothing' : 'Aurora sound: always there'}
          </Text>
        </Button>
      </Box>
    )
  })

  on('ui.render', { component: 'Backdrop' }, ($, e, next) => {
    if ((e.surface !== 'desktop' && e.surface !== 'mobile') || e.props.scene !== SCENE) {
      return next(e)
    }

    const { Shader, Svg } = $.ui.resolve(e)

    // The sky is a still picture, drawn once; the shader moves it on the
    // GPU. Where no shader plays, the still sky shows on its own.
    return (
      <Shader module="./aurora-sky.ts" values={{ snow: season.snowing ? 1 : 0 }}>
        <Svg
          source={sky(lightsUp(), season.snowing)}
          alt={
            lightsUp()
              ? 'An ASCII-art aurora borealis over starlit ASCII mountains and pines hung with coloured Christmas lights'
              : 'An ASCII-art aurora borealis: green, teal and violet curtains of characters over starlit ASCII mountains and pines'
          }
        />
      </Shader>
    )
  })
}
