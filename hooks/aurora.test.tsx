import type { On, ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const BACKDROP = {
  plugin: 'ascii-aurora-theme',
  component: 'Backdrop',
  props: { scene: 'ascii-aurora-theme', plugin: 'ascii-aurora-theme', glass: { blur: 10, opacity: 0.7 } },
} as const

const START = { cwd: '/tmp', surface: 'desktop', isInteractive: true } as const

// What sits beneath the plugin in a session: the theme, the log, the
// command list and session start. Returns every look set and every log line.
function world(on: On, refuse?: (look: ThemeSetArgs) => string | undefined, stored: Record<string, unknown> = {}) {
  const sets: ThemeSetArgs[] = []
  const logs: string[] = []
  const store = new Map(Object.entries(stored))
  on('store.get', (_, e) => ({ value: store.get(e.key) }))
  on('store.set', (_, e) => {
    store.set(e.key, e.value)

    return { value: undefined }
  })
  on('theme.set', (_, e) => {
    const reason = refuse?.(e)
    if (reason !== undefined) {
      return { deny: reason }
    }
    sets.push(e)

    return { value: { isDrawn: true, requestId: 'backdrop' } }
  })
  on('ui.log', (_, e) => {
    logs.push(e.text)

    return { value: undefined }
  })
  on('command.register', (_, e) => ({ value: { command: e.name } }))
  on('session.start', (_, e) => ({ cwd: e.cwd }))

  return { sets, logs, store }
}

// /ascii-aurora-wind as the person types it.
const wind = (args = '') =>
  ({ command: 'ascii-aurora-wind', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const

// The brown-noise wind layer's gain in a look: how windy it is.
const windOf = (look: ThemeSetArgs | undefined) => {
  const layer = look?.sound?.ambience?.layers[0]

  return layer !== undefined && 'gain' in layer ? (layer.gain ?? 0) : -1
}

test('session start sets the aurora look once, in both modes, with steady wind', async ($, on) => {
  const { sets, logs } = world(on)

  await $.session.start(START)

  expect(logs).toEqual([])
  expect(sets.length).toBe(1)
  const look = sets[0]!
  // It follows the person's own light or dark mode, with colours for each.
  expect(look.overrideColorScheme).toBeUndefined()
  expect(Object.keys(look.colors?.inputs ?? {}).sort()).toEqual(['dark', 'light'])
  for (const mode of ['light', 'dark'] as const) {
    expect(look.colors?.inputs[mode]?.['bg-user-message']).toBeDefined()
    expect(look.colors?.inputs[mode]?.['text-assistant-message']).toBeDefined()
  }
  expect(look.backdrop).toEqual({ scene: 'ascii-aurora-theme', glass: { blur: 10, opacity: 0.7 } })
  expect(look.style?.UserMessage).toBeDefined()
  expect(windOf(look)).toBe(0.16)
})

test('a build that refuses sound still gets the colours, scene and style', async ($, on) => {
  const { sets } = world(on, look => (look.sound !== undefined ? 'sound is not an attribute this build knows' : undefined))

  await $.session.start(START)

  expect(sets.length).toBe(1)
  expect(sets[0]!.style).toBeDefined()
  expect(sets[0]!.backdrop).toBeDefined()
})

test('gusty wind fades between windy and almost-still spells', async ($, on) => {
  const clock = mock.clock(on)
  const { sets, logs } = world(on, undefined, { wind: 'gusty' })

  await $.session.start(START)
  // Ten minutes of weather.
  for (let second = 0; second < 600; second += 5) {
    await clock.advance(5000)
  }

  expect(logs).toEqual([])
  const levels = sets.map(windOf)
  expect(Math.max(...levels)).toBeGreaterThan(0.1)
  expect(Math.min(...levels)).toBeLessThan(0.01)
  // Each change is a slow fade of many small steps, never a jump: no step
  // moves the wind by more than a quarter of its full strength.
  for (let i = 1; i < levels.length; i++) {
    expect(Math.abs(levels[i]! - levels[i - 1]!)).toBeLessThan(0.04)
  }
})

test('/ascii-aurora-wind switches the mode and remembers it', async ($, on) => {
  mock.clock(on)
  const { store } = world(on)
  await $.session.start(START)

  const gusty = await $.command.run(wind())
  expect(gusty.text).toContain('gusty')
  expect(store.get('wind')).toBe('gusty')

  const steady = await $.command.run(wind('steady'))
  expect(steady.text).toContain('steady')
  expect(store.get('wind')).toBe('steady')
})

test('the right-click menu offers the other wind mode', async ($, on) => {
  mock.clock(on)
  const { store } = world(on)
  await $.session.start(START)

  const menu = await $.ui.mount({ plugin: 'ascii-aurora-theme', surface: 'desktop', component: 'ContextMenu', props: {} })
  expect(await menu.find({ type: 'Button', text: 'gusty' })).toBeDefined()
  await menu.press({ key: 'wind' })
  expect(store.get('wind')).toBe('gusty')
  await menu.unmount()

  const onLink = await $.ui.mount({
    plugin: 'ascii-aurora-theme',
    surface: 'desktop',
    component: 'ContextMenu',
    props: { link: { href: 'https://example.com' } },
  })
  expect(await onLink.find({ type: 'Button', key: 'wind' })).toBeUndefined()
  await onLink.unmount()
})

test('the sky has a daytime look for light mode and a night look for dark', async $ => {
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const sky = String((await ui.find({ type: 'Svg' }))?.props.source ?? '')
  expect(sky).toContain('@media (prefers-color-scheme: light)')
  expect(sky).toContain('url(#skyDay)')
  expect(sky).toContain('mix-blend-mode: plus-lighter')
  await ui.unmount()
})

test('the backdrop draws the still ASCII sky under its GPU shader on desktop and mobile', async $ => {
  for (const surface of ['desktop', 'mobile'] as const) {
    const ui = await $.ui.mount({ ...BACKDROP, surface })
    expect(await ui.find({ type: 'Shader' })).toBeDefined()
    expect(await ui.find({ type: 'Svg' })).toBeDefined()
    await ui.unmount()
  }
})

test('another scene is left alone', async $ => {
  const ui = await $.ui.mount({
    ...BACKDROP,
    surface: 'desktop',
    props: { ...BACKDROP.props, scene: 'someone-elses' },
  })
  expect(await ui.find({ type: 'Svg' })).toBeUndefined()
  await ui.unmount()
})

// Whether the sky drawn has any Christmas lights hung in it.
async function hasLights(ui: { find: (query: { type: string }) => Promise<{ props: Record<string, unknown> } | undefined> }) {
  const sky = await ui.find({ type: 'Svg' })

  return String(sky?.props.source ?? '').includes('<g class="bulbs"><text')
}

for (const [day, name] of [[24, 'Christmas Eve'], [25, 'Christmas Day']] as const) {
  test(`on ${name} every pine has lights`, async ($, on) => {
    mock.clock(on, { now: new Date(2026, 11, day, 9, 30).getTime() })
    world(on)
    await $.session.start(START)

    const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
    expect(await hasLights(ui)).toBe(true)
    await ui.unmount()
  })
}

test('on other days the pines are plain', async ($, on) => {
  mock.clock(on, { now: new Date(2026, 11, 26, 9, 30).getTime() })
  world(on)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  expect(await hasLights(ui)).toBe(false)
  await ui.unmount()
})

test('the lights go up around midnight on Christmas Eve', async ($, on) => {
  const clock = mock.clock(on, { now: new Date(2026, 11, 23, 23, 55).getTime() })
  world(on)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  expect(await hasLights(ui)).toBe(false)
  await clock.advance(20 * 60 * 1000)
  expect(await hasLights(ui)).toBe(true)
  await ui.unmount()
})

test('the shader is told whether it snows this session', async ($, on) => {
  world(on)
  await $.session.start(START)

  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const shader = await ui.find({ type: 'Shader' })
  expect([0, 1]).toContain((shader?.props.values as { snow?: number } | undefined)?.snow)
  await ui.unmount()
})

test('/ascii-aurora-snow lets it snow, or stops it, for the session', async ($, on) => {
  world(on)
  await $.session.start(START)
  const snow = (args = '') =>
    ({ command: 'ascii-aurora-snow', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const snowing = async () => ((await ui.find({ type: 'Shader' }))?.props.values as { snow?: number } | undefined)?.snow

  expect((await $.command.run(snow('on'))).text).toContain('Snow is falling')
  expect(await snowing()).toBe(1)

  expect((await $.command.run(snow('off'))).text).toContain('stopped')
  expect(await snowing()).toBe(0)

  await $.command.run(snow())
  expect(await snowing()).toBe(1)

  expect((await $.command.run(snow('blizzard'))).text).toContain('It is snowing')
  expect(await snowing()).toBe(1)
  await ui.unmount()
})

// /ascii-aurora-christmas as the person types it.
const christmasCommand = (args = '') =>
  ({ command: 'ascii-aurora-christmas', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const

test('/ascii-aurora-christmas hangs the lights on any day, and they stay up', async ($, on) => {
  const clock = mock.clock(on, { now: new Date(2026, 6, 14, 10, 0).getTime() })
  world(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  expect(await hasLights(ui)).toBe(false)

  expect((await $.command.run(christmasCommand('on'))).text).toContain('up for the rest')
  expect(await hasLights(ui)).toBe(true)
  // The calendar check every 10 minutes leaves the person's choice alone.
  await clock.advance(30 * 60 * 1000)
  expect(await hasLights(ui)).toBe(true)

  expect((await $.command.run(christmasCommand('off'))).text).toContain('down for the rest')
  expect(await hasLights(ui)).toBe(false)

  await $.command.run(christmasCommand())
  expect(await hasLights(ui)).toBe(true)

  expect((await $.command.run(christmasCommand('tinsel'))).text).toContain('lights are up')
  await ui.unmount()
})

test('/ascii-aurora-christmas off takes the lights down on Christmas Day too', async ($, on) => {
  const clock = mock.clock(on, { now: new Date(2026, 11, 25, 8, 0).getTime() })
  world(on)
  await $.session.start(START)
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  expect(await hasLights(ui)).toBe(true)

  await $.command.run(christmasCommand('off'))
  expect(await hasLights(ui)).toBe(false)
  await clock.advance(30 * 60 * 1000)
  expect(await hasLights(ui)).toBe(false)
  await ui.unmount()
})

test('while it snows, the tops of the pines are white with snow', async ($, on) => {
  world(on)
  await $.session.start(START)
  const snow = (args: string) =>
    ({ command: 'ascii-aurora-snow', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const
  const ui = await $.ui.mount({ ...BACKDROP, surface: 'desktop' })
  const capped = async () => String((await ui.find({ type: 'Svg' }))?.props.source ?? '').includes('<g class="snowcaps"><text')

  await $.command.run(snow('on'))
  expect(await capped()).toBe(true)
  await $.command.run(snow('off'))
  expect(await capped()).toBe(false)
  await ui.unmount()
})
