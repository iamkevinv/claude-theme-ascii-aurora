# ASCII Aurora

A dark theme for the Claude desktop app, built as a Claude Code mod. An aurora
borealis made entirely of ASCII characters sways behind the conversation, over
starlit ASCII mountains and a pine forest. Text and code take the aurora's
colours, and an optional ambient sound brings wind, high bells and low notes.

Themes draw in the desktop and mobile apps only. The terminal and editors
ignore them.

## Install

This repository is private: you need to have been invited to it on GitHub,
and your computer needs a git login for github.com (an SSH key, or
`gh auth login` then `gh auth setup-git`). The install never asks for one.

At the prompt of a Claude Code terminal session:

```
/plugin install ascii-aurora --marketplace iamkevinv/claude-theme-ascii-aurora
```

Answer `y` to add the marketplace, then press Enter to install for your user.

Or from a shell:

```bash
claude plugin install ascii-aurora --marketplace iamkevinv/claude-theme-ascii-aurora
```

In the Claude desktop app, where `/plugin` doesn't run: click **+** next to
the prompt box, then **Plugins**, **Add marketplace** with
`iamkevinv/claude-theme-ascii-aurora`, then **Add plugin**.

Once installed it loads in every new session, desktop app included.

## What it does

- **Backdrop.** Three curtains of `. ' : ; ! | l I #` rays, coloured by
  altitude (green low, then teal, violet and magenta high). They sway and
  breathe slowly, and a band of light travels along the main curtain. Stars
  twinkle. With reduced motion turned on, the scene holds still.
- **Colours.** Dark only: near-black navy surfaces and icy mint text. Code
  uses the aurora's colours: teal keywords, green strings, violet literals,
  magenta names, gold variables.
- **Messages.** Your messages sit in an ASCII box (`+----+`) with green lines
  and violet corners. Claude's replies sit on a dark panel with only the
  corners marked. All message text is monospace.
- **Sound.** Off until you press the speaker in the session's title bar.
  - **Wind** has two modes. *Steady* is always there. *Gusty* comes in windy
    and calm spells of random length, fading softly to almost nothing between
    them.
  - Switch with `/wind` (or `/wind gusty`, `/wind steady`), or right-click an
    empty part of the conversation and choose **Wind: make it gusty / steady**.
    The choice is remembered.

## Files

| File | What it holds |
| --- | --- |
| `.claude-plugin/plugin.json` | The mod's name and description |
| `hooks/hooks.json` | Points Claude Code at `register.tsx` |
| `hooks/register.tsx` | Palette, message style, sound, wind modes, `/wind`, the right-click item, and the backdrop hook |
| `hooks/scene.js` | Generates the ASCII sky as one SVG (seeded, so it is the same every time) |
| `hooks/make-colors.js` | Turns a few colours into a full palette. Copied from Claude Code's plugin-authoring skill: don't edit it, copy it again when Claude Code updates |
| `hooks/aurora.test.tsx` | Tests, run with `claude plugin test` |
| `scripts/preview-scene.mjs` | Writes `preview/scene.svg` for tuning the sky in a browser |
| `.claude-plugin/types/` | API types Claude Code writes for editors and `tsc`. Generated, not committed |

## Working on it

```bash
claude plugin validate .
```

```bash
claude plugin test .
```

```bash
node scripts/preview-scene.mjs
```

To run it from a clone of this repository in a terminal session, from the
clone's folder:

```bash
claude --plugin-dir .
```

Or install it from the clone, so Claude Code reads it straight from there
and `/reload-plugins` picks up your edits:

```bash
claude plugin marketplace add .
```

```bash
claude plugin install ascii-aurora@claude-theme-ascii-aurora
```

`$.theme.set` rejects sound that is out of range or too long to render (each
note's attack plus release is at most 4 seconds), so run the tests after
changing the sound: they fail with the engine's reason.
