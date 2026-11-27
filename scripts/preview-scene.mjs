// Writes the backdrop to preview/scene.svg so you can open it in a browser
// while tuning hooks/scene.js. Run from the project folder:
//   node scripts/preview-scene.mjs
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

import { auroraScene } from '../hooks/scene.js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const svg = auroraScene()

mkdirSync(join(root, 'preview'), { recursive: true })
writeFileSync(join(root, 'preview', 'scene.svg'), svg)
console.log(`preview/scene.svg written: ${svg.length.toLocaleString()} characters (the limit is 131,072)`)
