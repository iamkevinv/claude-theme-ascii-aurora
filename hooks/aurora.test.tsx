import type { On, ThemeSetArgs } from 'claude-code'
import { expect, mock, test } from 'claude-code/testing'

const BACKDROP = {
  plugin: 'ascii-aurora',
  component: 'Backdrop',
  props: { scene: 'ascii-aurora', plugin: 'ascii-aurora', glass: { blur: 10, tint: '#060b13', opacity: 0.7 } },
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

// /wind as the person types it.
const wind = (args = '') =>
  ({ command: 'wind', args, origin: { kind: 'composer' }, presentation: { isFullscreen: false, columns: 80 } }) as const

// The brown-noise wind layer's gain in a look: how windy it is.
const windOf = (look: ThemeSetArgs | undefined) => {
  const layer = look?.sound?.ambience?.layers[0]

  return layer !== undefined && 'gain' in layer ? (layer.gain ?? 0) : -1
}

test('session start sets the dark aurora look once, with steady wind', async ($, on) => {
  const { sets, logs } = world(on)

  await $.session.start(START)

  expect(logs).toEqual([])
  expect(sets.length).toBe(1)
  const look = sets[0]!
  expect(look.overrideColorScheme).toBe('dark')
  expect(look.backdrop).toEqual({ scene: 'ascii-aurora', glass: { blur: 10, tint: '#060b13', opacity: 0.7 } })
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

test('/wind switches the mode and remembers it', async ($, on) => {
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

  const menu = await $.ui.mount({ plugin: 'ascii-aurora', surface: 'desktop', component: 'ContextMenu', props: {} })
  expect(await menu.find({ type: 'Button', text: 'gusty' })).toBeDefined()
  await menu.press({ key: 'wind' })
  expect(store.get('wind')).toBe('gusty')
  await menu.unmount()

  const onLink = await $.ui.mount({
    plugin: 'ascii-aurora',
    surface: 'desktop',
    component: 'ContextMenu',
    props: { link: { href: 'https://example.com' } },
  })
  expect(await onLink.find({ type: 'Button', key: 'wind' })).toBeUndefined()
  await onLink.unmount()
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
  test(`on ${name} a few pines have lights`, async ($, on) => {
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
