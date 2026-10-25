/**
 * Inline the pet artwork and the voice clip into client.js.
 *
 * The Web UI loads the Client module as a browser module, so relative file
 * requests would need a Host route; base64 keeps the bundle a single artifact
 * that works in Desktop, `dsh web`, and any future shell.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = (p) => fs.readFileSync(path.join(root, p))

const source = read('client.src.js').toString('utf8')
const pet = read('assets/pet.png').toString('base64')
const voice = read('assets/voice.mp3').toString('base64')

const out = source
  .replace("'__PET_SRC__'", `'data:image/png;base64,${pet}'`)
  .replace("'__VOICE_SRC__'", `'data:audio/mpeg;base64,${voice}'`)

if (out.includes('__PET_SRC__') || out.includes('__VOICE_SRC__')) {
  throw new Error('placeholder replacement failed')
}

fs.writeFileSync(path.join(root, 'client.js'), out)
console.log('client.js', Math.round(out.length / 1024), 'KiB')
