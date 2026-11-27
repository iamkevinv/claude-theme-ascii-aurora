---
version: alpha
name: ASCII Aurora
description: A theme for the Claude desktop app. An aurora borealis made of ASCII characters sways over ASCII mountains and pines, a polar night in dark mode and a daytime aurora sky in light mode, with text and code in the aurora's colours.
colors:
  primary: "{colors.accent}"
  secondary: "{colors.pro}"
  tertiary: "{colors.success}"
  error: "{colors.danger}"
  accent: "#3fe0c5"
  danger: "#ff6b9a"
  success: "#7cf29a"
  warning: "#f6c667"
  pro: "#b48cff"
  main-glow: "#2ee6a0"
  ribbon-glow: "#7d6bff"
  user-message-glow: "#2ee6a02e"
  bulb-red: "#ff4d5e"
  bulb-gold: "#ffd34d"
  bulb-blue: "#4da6ff"
  bulb-pink: "#ff7ad9"
  bulb-green: "#7dff6a"
  tree-star: "#ffd34d"
  light:
    surface-0: "#e3e6f4"
    surface-1: "#eceef9"
    surface-2: "#f6f7fd"
    text-primary: "#191d3a"
    text-secondary: "#363b62"
    text-muted: "#555a82"
    bg-user-message: "#eef0fb"
    text-user-message: "#191d3a"
    bg-assistant-message: "#f7f8fd"
    text-assistant-message: "#1f2340"
    text-accent: "#006960"
    fill-accent: "#009283"
    fill-pro: "#8c42ff"
    border-accent: "#00d1b6"
    border-pro: "#c3a4ff"
    git-added: "#1f8a5b"
    git-removed: "#c23a63"
    git-modified: "#a8780e"
    git-merged: "#7a4fd0"
    sky-1: "#5b5fab"
    sky-2: "#7175bd"
    sky-3: "#9096cf"
    sky-4: "#b6bde3"
    sky-5: "#d3daf0"
    sun-glow: "#eef3fb"
    main-1: "#12593b"
    main-2: "#1f8040"
    main-3: "#2a9933"
    ribbon-1: "#1a2e5c"
    ribbon-2: "#0f3d52"
    veil-1: "#6a1040"
    veil-2: "#5a1250"
    far-ridge: "#dfe5f7"
    peaks: "#ffffff"
    near-ridge: "#c9cfee"
    pines: "#0f2a1a"
    snowcaps: "#f4f7ff"
    ground-snow: "#aab1dc"
    far-ground: "#63679b"
    near-ground: "#4a4e7a"
  dark:
    surface-0: "#060b13"
    surface-1: "#0a121c"
    surface-2: "#0e1824"
    surface-3: "#121e2b"
    text-primary: "#e6f7f1"
    text-secondary: "#b9d6ce"
    text-muted: "#8eaea8"
    bg-user-message: "#0c1e26"
    text-user-message: "#eafff8"
    bg-assistant-message: "#08111a"
    text-assistant-message: "#d6ebe5"
    text-accent: "#00c1a9"
    fill-accent: "#009283"
    fill-pro: "#8c42ff"
    border-accent: "#004b45"
    border-pro: "#480096"
    git-added: "#7cf29a"
    git-removed: "#ff6b9a"
    git-modified: "#f6c667"
    git-merged: "#b48cff"
    sky-1: "#020409"
    sky-2: "#050b14"
    sky-3: "#08151d"
    sky-4: "#0a1a1f"
    green-glow: "#1fb383"
    violet-glow: "#7a4dd8"
    main-1: "#31e8c2"
    main-2: "#34eeae"
    main-3: "#52f59c"
    main-4: "#8dffa4"
    ribbon-1: "#7aa2ff"
    ribbon-2: "#5fb0ff"
    ribbon-3: "#45c4f5"
    veil-1: "#ff6fb4"
    veil-2: "#e07cff"
    veil-3: "#b886ff"
    far-ridge: "#4f8079"
    peaks: "#8ccfc0"
    near-ridge: "#2a5148"
    pines: "#255446"
    snowcaps: "#b9ccd6"
    ground-snow: "#1a2d33"
    far-ground: "#050b12"
    near-ground: "#02060a"
    star-blue: "#dbe9ff"
    star-ice: "#c4defc"
    star-lilac: "#efe6ff"
    star-mint: "#cdfbee"
    star-warm: "#fff6e0"
typography:
  body-md:
    fontFamily: ui-monospace
    fontSize: 14px
    lineHeight: 22px
  headline:
    fontFamily: ui-monospace
    fontWeight: 700
    letterSpacing: 0.5px
  label-code:
    fontFamily: ui-monospace
  sky-glyph:
    fontFamily: ui-monospace
    fontSize: 13.3px
    fontWeight: 700
    lineHeight: 15px
rounded:
  none: 0px
  tool: 2px
spacing:
  message-x: 18px
  message-y: 13px
  tool-x: 10px
  tool-y: 4px
  frame-inset: 4px
  sky-column: 8px
  sky-row: 15px
motion:
  main-slide:
    duration: 34000ms
    delay: 0ms
    timingFunction: cubic-bezier(0.37, 0, 0.63, 1)
  ribbon-slide:
    duration: 43000ms
    delay: 0ms
    timingFunction: cubic-bezier(0.37, 0, 0.63, 1)
  veil-slide:
    duration: 57000ms
    delay: 0ms
    timingFunction: cubic-bezier(0.37, 0, 0.63, 1)
  light-sweep:
    duration: 30000ms
    delay: 0ms
    timingFunction: linear
  main-breath:
    duration: 13000ms
    delay: 0ms
    timingFunction: cubic-bezier(0.37, 0, 0.63, 1)
  ribbon-breath:
    duration: 17000ms
    delay: 0ms
    timingFunction: cubic-bezier(0.37, 0, 0.63, 1)
  veil-breath:
    duration: 23000ms
    delay: 0ms
    timingFunction: cubic-bezier(0.37, 0, 0.63, 1)
  wind-fade-step:
    duration: 3000ms
    delay: 0ms
    timingFunction: linear
components:
  user-message-dark:
    backgroundColor: "{colors.dark.bg-user-message}"
    textColor: "{colors.dark.text-user-message}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 18px
  user-message-light:
    backgroundColor: "{colors.light.bg-user-message}"
    textColor: "{colors.light.text-user-message}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 18px
  assistant-message-dark:
    backgroundColor: "{colors.dark.bg-assistant-message}"
    textColor: "{colors.dark.text-assistant-message}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 18px
  assistant-message-light:
    backgroundColor: "{colors.light.bg-assistant-message}"
    textColor: "{colors.light.text-assistant-message}"
    typography: "{typography.body-md}"
    rounded: "{rounded.none}"
    padding: 18px
  tool-use-dark:
    backgroundColor: "{colors.dark.surface-1}"
    textColor: "{colors.dark.text-accent}"
    typography: "{typography.label-code}"
    rounded: "{rounded.tool}"
    padding: 10px
  tool-use-light:
    backgroundColor: "{colors.light.surface-1}"
    textColor: "{colors.light.text-accent}"
    typography: "{typography.label-code}"
    rounded: "{rounded.tool}"
    padding: 10px
  heading-dark:
    textColor: "{colors.dark.text-accent}"
    typography: "{typography.headline}"
  heading-light:
    textColor: "{colors.light.text-accent}"
    typography: "{typography.headline}"
---

# ASCII Aurora

This is the theme's design system, in the
[DESIGN.md format](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md):
the tokens above are the exact values, and the sections below say how to use
them. How the theme is built, and why, is in `@ARCHITECTURE.md`.

The colour tokens are the code's own. `node scripts/check-design.mjs` checks
every one against `hooks/palette.js`, `hooks/make-colors.js` and
`hooks/scene.js`, and fails when they drift apart. Change a colour in the code
and here together.

## Overview

A quiet night sky behind the conversation. An aurora made entirely of ASCII
characters sways over ASCII mountains and a pine forest, the way a terminal
from the 1980s might have drawn one, and the conversation sits on frosted
panels in front of it, easy to read.

- **Two moods.** Dark mode is a polar night: near-black navy, icy mint text,
  a starry sky. Light mode is a daytime aurora: pale periwinkle surfaces,
  deep indigo text, and the aurora as pale added light over a bright sky.
- **Calm.** Everything moves slowly, nothing flashes, and nothing asks for
  attention. It's a backdrop for long hours of work.
- **Made of characters.** The sky, the mountains, the trees, the stars and the
  message frames are all ASCII: `. ' : ; ! | l I #`, `/\_`, `^`, `+-|`.
- **Seasonal.** Snow falls in the cold months, sometimes, and the pines wear
  coloured lights on 24 and 25 December.

## Colors

The aurora's colours run through everything.

- **Roles.** Accent `#3fe0c5` is aurora teal (`primary`), pro `#b48cff` is
  violet (`secondary`), success `#7cf29a` is green (`tertiary`), danger
  `#ff6b9a` is magenta-pink (`error`), and warning `#f6c667` is gold. Code
  takes them too: keywords teal, strings green, literals violet, names
  magenta, variables gold.
- **Dark mode surfaces** run from `#060b13` to `#121e2b`, blue-black, with
  text in icy mint (`#e6f7f1`, then `#b9d6ce` and `#8eaea8` for quieter text).
- **Light mode surfaces** are pale periwinkle, `#e3e6f4` to `#f6f7fd`, with
  deep indigo text (`#191d3a`, `#363b62`, `#555a82`).
- **Messages.** Your messages sit on a deep teal-black (`#0c1e26`) by night
  and a pale lavender (`#eef0fb`) by day. Claude's replies sit on a plain
  panel close to the surface around them.
- **Named colours.** `text-accent`, `fill-accent`, `fill-pro`, `border-accent`
  and `border-pro` are worked out from the roles for each mode by
  `make-colors.js`. They're listed so the frames' colours are explicit.
- **The sky by night.** A blue-black gradient (`sky-1` to `sky-4`) with a
  faint green and violet glow. Three curtains, each in one family of hues:
  the main curtain teal to pale green (`main-1` to `main-4`), the ribbon
  above it blue to cyan (`ribbon-1` to `ribbon-3`), and the veil at the top
  pink to violet (`veil-1` to `veil-3`). Stars in five pale tints. Ground,
  ridges and pines in muted deep greens.
- **The sky by day.** Periwinkle overhead, lightening to near white at the
  horizon (`sky-1` to `sky-5`), with a bright glow low on one side. The
  curtains' day colours are dark because they are added as light, so they
  come out pale and bright: blue-green, light blue and lilac. Slate ground,
  snow-white ridges, deep evergreen pines (`#0f2a1a`).
- **Hue families.** By night the main curtain's colours sit between 131° and
  169° of hue, the ribbon's between 191° and 223°, and the veil's between
  264° and 331°. By day they sit between 125° and 153°, 198° and 223°, and
  310° and 328°. The shader tells the curtains apart by these families,
  within 115° to 178°, 182° to 238° and 242° to 345°.
- **Christmas.** Bulbs in red, gold, blue, pink and green, and a gold star on
  each pine. They are the only bright, strongly coloured things below the
  ridge.

## Typography

- **Messages** are monospace: the app's own monospace face at 14 px on a
  22 px line. Shown as `ui-monospace` in the tokens.
- **Headings** are the same face, bold, in `text-accent`, with 0.5 px of
  letter spacing.
- **Tool calls** use the app's code face.
- **The sky's characters** are a monospace stack (`ui-monospace`, SF Mono,
  Menlo and so on) at 13.3 px, bold for the curtains, on an 8 by 15 point
  grid. A curtain's rays run from faint to bright through
  `. ' : ; ! | l I #`.

## Layout

- **The sky** is a 1600 by 1000 point drawing on a grid of 200 columns by 66
  rows, 8 points wide and 15 tall. It covers the window, centred, and is
  cropped rather than stretched.
- **Its layers**, top to bottom: the violet veil, the ribbon, the main curtain
  sweeping low on the left and rising to the right, stars above about 540
  points, a far mountain range, a near range with the pine forest along it,
  and snowy ground.
- **The conversation** sits on the app's own layout. Messages have 18 px of
  padding at the sides and 13 px above and below; tool rows 10 px and 4 px.

## Elevation & Depth

Depth comes from light and glass, not shadows.

- **Frosted panels.** The app's panels blur the sky behind them (10 px) at
  0.7 opacity, in the app's own panel colour, so the words stay readable
  over the moving sky.
- **Glow.** Your messages have a soft aurora-green glow around them (18 px,
  `user-message-glow`). The main curtain and the ribbon each have a soft glow
  (`main-glow`, `ribbon-glow`) behind their bright lower edge.
- **Layered light.** Each curtain is drawn twice, the second fainter and
  dithered differently, for density. The far range is paler than the near
  one. By day the aurora is added light (`plus-lighter`), as daytime aurora
  is.

## Shapes

- **The ASCII box.** Your messages sit in a full frame, like `+----+`: 1 px
  teal lines (`fill-accent`) 4 px in from each edge, and a violet cross
  (`fill-pro`) at each corner, 8 px across and 1.5 px thick. The frame is
  cut in nine, so the corners keep their size and the edges stretch.
- **Claude's replies** have only the four corner crosses, in `border-pro`,
  softer than your messages.
- **Tool rows** have a 2 px radius and a 1 px `border-accent` edge.
- **Everything else is square.**
- **In the sky** everything is a character: ridges are `/`, `\` and `_`,
  pines are tiers of `/^^\` under a `^` tip, on a `|` trunk, stars are `.`,
  `'`, `` ` ``, `+` and `*`, bulbs are `o`, and the tree star is `*`.

## Motion & Micro-interaction

Motion is slow, continuous and never sudden.

- **Curtains slide** back and forth, each as a whole, on its own clock: the
  main curtain over 34 seconds each way, the ribbon over 43 the other way,
  the veil over 57. They ease in and out like a pendulum, and glide by
  fractions of a pixel, keeping the characters sharp.
- **Light moves too.** Each curtain breathes (13, 17 and 23 seconds) and
  shimmers in patches every 10 to 18 seconds, and a soft band of light
  crosses them every 30 seconds.
- **Stars stay still** and each twinkles as a whole every 4 to 9 seconds.
  The aurora moves in front of them; they never move with it.
- **Christmas bulbs** glow up and down every 2 to 5 seconds.
- **Snow** falls in three depths, the furthest smallest, slowest and
  faintest (14, 24 and 38 points a second).
- **Restraint.** No spot changes more than once every few seconds, far under
  the app's limit for flashing. With reduced motion turned on, and on the
  mobile app, the still sky shows on its own.
- **Sound** follows the same pace. Gusty wind swells and ebbs over 30 to 48
  seconds (10 to 16 eased steps of 3 seconds), with windy spells of 20 to
  90 seconds and calm ones of 15 to 75, down to 4% of full.

## Voice & Content Strategy

The theme's own words are few: command replies, a menu row, and the sky's
description for screen readers.

- **Tone:** plain and calm. Short sentences, no exclamation marks.
- **Spelling:** British English: colour, centre, capitalise.
- **Capitalisation:** sentence case everywhere.
- **Replies say what is now true**, and for how long: "Snow is falling for
  the rest of this session." "Wind is now steady."
- **Usage hints name every form of the command**: "Use /ascii-aurora-snow on,
  /ascii-aurora-snow off, or /ascii-aurora-snow alone to switch."
- **Commands** start with `ascii-aurora-`, so none clashes with another
  plugin's.
- **Menu rows** say the action, then what it means, dimmed: "Wind: make it
  gusty" then "Aurora sound: comes and goes, fading to almost nothing".
- **The sky's description** says what is there: "An ASCII-art aurora
  borealis: green, teal and violet curtains of characters over starlit ASCII
  mountains and pines".

## Components

- **Your messages** (`user-message-dark`, `user-message-light`): message
  colours, monospace, the full ASCII frame, and the green glow.
- **Claude's replies** (`assistant-message-dark`, `assistant-message-light`):
  a plain panel with only the corner crosses.
- **Tool calls** (`tool-use-dark`, `tool-use-light`): teal text in the code
  face on `surface-1`, with a thin `border-accent` edge and a 2 px radius.
- **Headings** (`heading-dark`, `heading-light`): bold teal monospace.
- **The backdrop:** the still ASCII sky (`hooks/scene.js`) under its GPU
  shader (`hooks/aurora-sky.ts`), behind frosted panels. It has four states:
  plain, with Christmas lights, with snow, and with both.

The message styles and their frames are in `hooks/register.tsx` (`STYLE` and
`asciiBox`).

## Do's and Don'ts

- Do keep each curtain's colours inside its family of hues. A colour outside
  it makes that curtain's characters move with another's.
- Don't put anything bright and strongly coloured under the ridge. The shader
  takes it for a Christmas bulb and twinkles it. Keep the ground, ridges and
  pines muted.
- Do keep a message's words at 3:1 contrast or better against every colour
  in its frame, in both modes, as the app requires.
- Do pick day colours for the curtains as light to add, not paint: dark
  values come out pale and bright over the day sky.
- Don't move characters in the picture itself. All motion is the shader's,
  and it slides each curtain as a whole: never row by row, never warped.
- Don't let stars move with the aurora.
- Do keep motion slow, and leave the still sky for reduced motion.
- Don't add a colour that isn't a token. Add it to the code and here
  together, then run `node scripts/check-design.mjs`.
