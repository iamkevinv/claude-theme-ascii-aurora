# AGENTS.md

ASCII Aurora is a theme for the Claude desktop app, built as a Claude Code mod
(a plugin with a hooks module). Read these before changing anything:

- [README.md](README.md): what the theme does, its commands, and how to
  install it.
- [DESIGN.md](DESIGN.md): the look, as design tokens and guidance, in
  [Google's DESIGN.md format](https://github.com/google-labs-code/design.md/blob/main/docs/spec.md).
- [ARCHITECTURE.md](ARCHITECTURE.md): how it's built, and the approaches
  already tried and dropped.

## Commands

Run all four before opening a pull request. Each should pass.

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

```bash
node scripts/check-design.mjs
```

```bash
npx -p typescript tsc -p .
```

- **Validate with Claude Code 2.1.331 or later.** Earlier versions wrongly
  warn that the `Backdrop` hook never runs. Check with `claude --version`.
- **The type-check** needs TypeScript 5.4 or later, and the API types in
  `.claude-plugin/types/`. Claude Code writes those each time it loads the
  plugin from your folder, and they aren't committed.
- **Before a release,** also run
  `claude plugin validate . --profile directory --strict`. It applies the
  plugin directory's checks.
- **Looking at your change:** `node scripts/preview-scene.mjs` writes the
  still sky to `preview/scene.svg`, and `node scripts/make-icon.mjs` redraws
  the icon. To see the real thing, install the plugin from this folder (see
  the README's "Working on it") and run `/reload-plugins` in the desktop app.
  Look in both light and dark mode.

## Rules

These aren't obvious from the code, and breaking them fails quietly.

- **Colours live in the code and in DESIGN.md together.**
  - The app's colours are in `hooks/palette.js`, and the sky's are in
    `hooks/scene.js`.
  - Change one, then update DESIGN.md's tokens and any text that names it,
    and run `node scripts/check-design.mjs`.
- **Never edit `hooks/make-colors.js` or `hooks/make-colors.d.ts`.** They're
  copied from Claude Code's plugin-authoring skill, and not ours to license.
  Copy them again when Claude Code updates them.
- **Keep each curtain inside its hues.**
  - The shader tells the three curtains apart by colour: main 115° to 178°,
    ribbon 182° to 238°, veil 242° to 345°.
  - A colour outside its range makes those characters move with another
    curtain.
- **Keep everything under the ridge muted.**
  - Below 556 points down the drawing, the shader treats anything bright and
    strongly coloured as a Christmas bulb and twinkles it.
  - That covers the ground, the ridges, the pines and the snow.
- **Don't animate the SVG.** CSS animation in it freezes in the app. All
  motion belongs to `hooks/aurora-sky.ts`.
- **Slide each curtain as a whole.**
  - Any per-row or per-pixel difference in a curtain's shift shows as warping
    or a rolling shutter. The stars never move.
  - See ARCHITECTURE.md's table of what was tried before adding motion.
- **The SVG's `<style>` takes no CSS comments and no backslashes.** The app's
  checks read its text.
- **Message words need 3:1 contrast or better** against every colour in
  their frame, in both modes, or the app refuses the style.
- **Sound has limits.** A layer's attack plus release can be at most 4
  seconds, and the app refuses sound that takes too long to render. The tests
  print the app's reason.
- **Pass `$` (the engine) only to top-level functions.** The mod's checks
  refuse it anywhere else.
- **In tests, a stand-in for an engine call answers `{ value }`.** Tests can't
  read files.
- **Keep the theme working without its extras.**
  - `$.theme.set` may refuse sound or styles, so `setLook()` falls back a
    step at a time.
  - The clock may be missing, so `now()` answers undefined.
  - Keep both.
- **Commands start with `ascii-aurora-`**, so none clashes with another
  plugin's.
- **Keep the README's features and commands in step** with any change you
  make to them.

## Working

- **One branch per change, cut from `main`.**
- **Each experiment on its own branch from `main`.** Don't stack one
  experiment on another: only the approach that's chosen is merged, and the
  rest stay on their branches or become `experiment/…` tags.
- **Changes reach `main` through pull requests.** Only the owner merges.
- **Leave the version** in `.claude-plugin/plugin.json` alone unless you're
  asked to release.
- **Write in British English** (colour, centre), in plain, short sentences:
  code comments, docs, and the theme's own words. Comments say why, not
  what. DESIGN.md's "Voice & Content Strategy" covers the theme's own words.
