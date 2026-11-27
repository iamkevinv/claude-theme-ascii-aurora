# Architecture

How ASCII Aurora is built, and why it's built that way. What it looks like is
in [DESIGN.md](DESIGN.md), what it does is in the [README](README.md), and the
rules for changing it are in [AGENTS.md](AGENTS.md).

## The pieces

ASCII Aurora is a Claude Code mod: a plugin whose hooks module changes how
Claude looks and sounds. The desktop and mobile apps draw it. The terminal and
editors ignore themes.

```
hooks/hooks.json ──> hooks/register.tsx ── the mod: hooks, theme, sound, commands
                         │
                         ├── hooks/palette.js      the app's colours, as data
                         ├── hooks/make-colors.js  turns them into a full theme (Anthropic's, copied)
                         ├── hooks/season.js       cold months from the time zone
                         └── hooks/scene.js        the still ASCII sky, as SVG
                                   │
                                   └── drawn under hooks/aurora-sky.ts, the GPU shader that moves it
```

| File | Its job |
| --- | --- |
| `hooks/register.tsx` | Sets the theme (colours, message styles, sound, backdrop), registers the three commands, adds the wind row to the right-click menu, rolls for snow, watches the calendar, and draws the backdrop |
| `hooks/palette.js` | The roles, surfaces, text and message colours for both modes |
| `hooks/make-colors.js` | Builds every named colour the app uses from a few, and checks contrast. Copied unchanged from Claude Code's plugin-authoring skill |
| `hooks/scene.js` | Draws the sky as one SVG: curtains, stars, mountains, pines, and optionally Christmas lights and snow caps |
| `hooks/aurora-sky.ts` | Redraws that SVG every frame on the GPU, moving the curtains and twinkling the lights |
| `hooks/season.js` | Works out the hemisphere from the time zone, and whether it's a cold month |
| `scripts/check-design.mjs` | Checks DESIGN.md's colours against the code |

## A session, start to finish

When a session starts, `register.tsx`:

1. Reads the wind mode (steady or gusty) back from the plugin's store.
2. Registers `/ascii-aurora-wind`, `/ascii-aurora-snow` and
   `/ascii-aurora-christmas`.
3. Rolls for snow: in a cold month where the person is, a 30% chance, decided
   once for the session.
4. Sets the look with `$.theme.set`, richest first. If the app refuses the
   version with sound, it tries again without sound, then without the message
   styles, so a theme is always set.
5. Starts the gusty wind's spells, if the mode is gusty.
6. Checks the date, and again every 10 minutes, so the Christmas lights go up
   and come down around midnight.

The backdrop's render hook then draws the sky:
`<Shader module="./aurora-sky.ts"><Svg source=… /></Shader>`. The SVG is the
still sky in one of four states (plain, Christmas, snow, or both), all built
once when the module loads. The shader gets one value, `snow`, set to 1 or 0.

Reading the clock can fail where there's no clock. `now()` catches that and
treats it as "no snow, no lights", so the theme is never left unset.

## The sky

The sky is in two parts: a still picture, and a shader that brings it to life.

### The still picture: `scene.js`

- **A character grid.** Everything is text on a 200 by 66 grid of 8 by 15
  point cells, in a 1600 by 1000 drawing. The noise is seeded, so the sky is
  the same every time.
- **Curtains.** Each of the three has a bright lower edge (its hem) running
  across the sky, with rays rising from it and fading. Brightness picks a
  character from `. ' : ; ! | l I #`. Each curtain is drawn twice, the second
  dithered differently and fainter, for density.
- **Hue families.** Each curtain's gradient stays in its own range of hues.
  This is what lets the shader tell them apart. See
  [DESIGN.md](DESIGN.md#colors) for the ranges.
- **Stars.** One star at most in each 32-point cell, well inside it, and only
  above 540 points, so no peak is taken for a star. The shader uses the same
  cells to twinkle each star whole.
- **Mountains and forest.** Two ranges of `/\_` peaks, with ground filled in
  under each so nothing in the sky shows through. Pines stand along the near
  range. At Christmas each pine gets coloured `o` bulbs and a `*` star. When
  it snows, the top third of each pine moves to its own snow-coloured layer.
- **Day and night in one file.** The style switches on
  `@media (prefers-color-scheme: light)`, which the app sets from its own
  light or dark mode. By day the stars are hidden and the curtains use
  `mix-blend-mode: plus-lighter`, so they add light to the sky.
- **The style must stay plain:** no CSS comments and no backslashes, because
  the app's checks read the style's text.

### The motion: `aurora-sky.ts`

The shader is written in Claude Code's shader dialect (`claude-code/shader`).
It has five passes.

**Four once-only passes** build a clean sky with no characters in it. They
run once, and again only when the window changes size.

1. `darkestAcross`: the darkest colour within 8 points to either side.
2. `darkest`: the same, up and down. A box of that size always holds a gap
   between characters, so no trace of a character or star is left.
3. `softAcross`: a soft blur across.
4. `ground`: the same blur, up and down, so the sky stays smooth.

They run at one texel a point (`scale: 1`), which is plenty for a smooth sky
and cheaper.

**The picture pass** runs every frame:

1. It maps each pixel to the drawing's own coordinates. The drawing covers the
   window, centred.
2. **Curtains:**
   - Each curtain's shift for this moment comes from its eased clock: 34, 43
     and 57 seconds each way.
   - It reads the sky that far to the side, from four neighbouring pixels
     (Catmull-Rom), so the characters glide by fractions of a pixel and keep
     sharp edges.
   - Past the window's sides the sky is mirrored, so there's no seam.
   - It takes away the clean sky, and keeps only light that is bright,
     coloured and in that curtain's hues.
3. **Light changes:** each curtain breathes and shimmers in patches that
   travel with it, and a band of light crosses every 30 seconds.
4. **Stars:**
   - They're found as bright light that isn't coloured, above the ridge.
   - They aren't moved.
   - Each twinkles by its 32-point cell.
5. **Rebuilding the sky:** above a line between character rows at 556
   points, the sky is the clean sky plus the moved curtains and twinkling
   stars. Below it, the ridge, forest and snow are drawn as they are.
6. **Christmas bulbs:**
   - Below the line, anything bright and strongly coloured is taken for a
     bulb and glows up and down by its character cell.
   - This is why the ground and pines must stay muted.
7. **Snow:** three layers of square flakes fall over everything when `snow`
   is 1.

`claude plugin validate .` prints the shader's cost. It's about 10 ms a
frame at 30 fps on fast and weak GPUs alike. Under reduced motion `still` is
1, time stands still, and the picture shows as drawn. Where no shader plays
(the mobile app, a slow machine), the still SVG shows on its own, so it has
to be a finished scene by itself.

## Light and dark

The theme sets no colour scheme of its own: it follows the app's.

- **Colours:** `palette.js` gives both modes, and `make-colors.js` works out
  the rest for each.
- **Messages:** the four message colours are set per mode, and the styles
  name them, so the messages follow the mode.
- **The sky:** the SVG's style switches on the app's mode.

The daytime curtain colours are dark on purpose. Added as light over a bright
sky, they come out pale and bright, and they stay inside each curtain's hue
family, so the shader can still tell the curtains apart.

## Messages

- **The frame:** your messages and Claude's replies are framed by
  `asciiBox()`. It's a vector drawing 48 units square, cut in nine (`slice: 8`)
  so the corners keep their size and the edges stretch.
- **Named colours:** the frame's colours are named ones, such as
  `fill-accent` and `fill-pro`, which follow the mode.
- **Contrast:** the app requires each to contrast 3:1 or better with the
  message's words.

## Seasons and Christmas

- **Snow:** `season.js` maps the computer's time zone to a hemisphere, with
  no location asked for. Southern regions are listed by prefix (such as
  `Australia/`) and by name, and everything else counts as northern. The
  cold months are November to March in the north and May to September in the
  south.
- **Christmas:** it's 24 or 25 December by the computer's own calendar.
- **Overrides:** `/ascii-aurora-snow` and `/ascii-aurora-christmas` override
  the roll and the calendar for the rest of the session. The 10-minute
  calendar check leaves an override alone.

## Sound

The app plays sound from a description, a list of layers.

- **Ambience:**
  - wind: brown noise, plus pink noise with a slow tremolo;
  - in gusty mode, soft bursts that sweep down in pitch;
  - now and then a low triangle note;
  - a high bell from the same scale, panned the other way.
- **Cues:** short chimes for sending, finishing, asking, errors and clicks.
- **Limit:** the app refuses a sound whose layer's attack plus release is
  over 4 seconds, or that takes too long to render. The tests catch this and
  print the app's reason.

Gusty wind is a small state machine in `register.tsx`:

- **Spells:** a windy spell (20 to 90 seconds) or a calm one (15 to 75), then
  a fade toward the other.
- **Fades:** 10 to 16 steps of 3 seconds, eased at both ends.
- **Each step** sets the sound again at a new level, and the app cross-fades
  each change.

The mode is kept in the plugin's store under `wind`.

## What was tried and dropped

The sky took several attempts. These are the ones that failed, so nobody
tries them again by accident.

| Tried | What went wrong | What replaced it |
| --- | --- | --- |
| Animating the SVG with CSS | It moved for a moment in the app, then froze. Stepping the animation and 3D transforms didn't help: the app doesn't composite parts of an SVG | A still SVG, moved by a GPU shader |
| A wavy ripple through the curtains | It bent the characters out of shape. Kept as the tag `experiment/shader-warping` | Sliding each curtain rigidly |
| A lean, each row offset a little more than the one above | It rippled like a rolling shutter: the characters didn't move in one go. Kept as the tag `experiment/shader-rolling` | Every pixel of a curtain shifts by the same amount at the same moment |
| One slide for all three curtains | They moved as one sheet | Each curtain picked out by its hues, on its own clock |
| Moving the stars with the sky | Stars don't move with the aurora | Stars found by colour and left still |
| Twinkling by patches of the sky | Stars were half-covered rather than fading | One star per 32-point cell, twinkled whole |
| A blurred copy of the sky as the background | Faint ghosts of stars and characters were left behind as the curtains moved | The darkest sky within 8 points, then softened |
| Wrapping round at the sides | A seam where the edges met | Mirroring past the sides |
| Shifting by whole pixels | It moved in visible steps | Catmull-Rom resampling, by fractions of a pixel |
| Mid-green pines by day | At the slate ground's own brightness, they vanished | Deep evergreen `#0f2a1a`: visible, and far too dark to pass for a bulb |
| A constant low drone | It never let up | An occasional low note answering the bells |
| Reading the date without a guard | Where there was no clock it threw, and the session start never set the theme | `now()`, which answers "unknown" instead |

To try an experiment tag, see the README's
[Experiments](README.md#working-on-it) note.

## Tools and tests

- **`claude plugin test .`** runs `hooks/*.test.ts(x)` with Claude Code's
  test kit:
  - The mod is loaded as the app would load it, with stand-ins for the
    engine beneath it (the theme, the store, the clock, commands). A
    stand-in answers `{ value }`.
  - Tests can't read files, so the DESIGN.md check runs under Node instead:
    `node scripts/check-design.mjs`.
- **`claude plugin validate .`** checks the manifests and hooks, and prices
  the shader. Use Claude Code 2.1.331 or later; earlier versions wrongly warn
  that the `Backdrop` hook never runs.
- **`node scripts/preview-scene.mjs`** writes the still sky to
  `preview/scene.svg`.
- **`node scripts/make-icon.mjs`** redraws the plugin's icon.

`preview/` is for local experiments and isn't committed.
