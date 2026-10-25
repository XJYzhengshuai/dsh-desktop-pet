/**
 * Smoke test for client.js without a browser: run the module-loader factory with
 * a stub React, then call apply() against a stub slot registry and assert that it
 * contributes to shell.overlay.
 */
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const loaded = []

globalThis.window = {
  __ModuleLoader__: {
    load(definition) {
      loaded.push(definition)
    },
  },
}

await import(pathToFileURL(path.join(root, 'client.js')).href)
assert.equal(loaded.length, 1, 'client module registers exactly one factory')

const definition = loaded[0]
assert.equal(definition.id, 'dsh-desktop-pet')

const stubReact = {
  createElement: (type, props, ...children) => ({ type, props, children }),
  Fragment: Symbol('Fragment'),
  useCallback: (fn) => fn,
  useEffect: () => {},
  useRef: (initial) => ({ current: initial }),
  useState: (initial) => [initial, () => {}],
}
const module = definition.factory((name) => {
  if (name === 'react') return stubReact
  throw new Error('unexpected require: ' + name)
})

assert.ok(Array.isArray(module.inject), 'exports inject')
assert.deepEqual(module.inject, ['slots'])
assert.equal(typeof module.apply, 'function', 'exports apply')

const registered = []
const ctx = {
  slots: {
    inject(slot, callback) {
      assert.equal(slot, 'shell.overlay')
      callback()
    },
    register(options, component) {
      registered.push({ options, component })
      return () => {}
    },
  },
}

module.apply(ctx)
assert.equal(registered.length, 1, 'one contribution')
assert.equal(registered[0].options.name, 'shell.overlay')
assert.equal(registered[0].options.id, 'desktop-pet')
assert.equal(typeof registered[0].component, 'function')

// Render the component with the stub hooks to catch top-level mistakes. The
// stub useState returns a scripted phase so each visual state can be inspected.
function render(phase, running) {
  let call = 0
  const scripted = {
    ...stubReact,
    useState: () => {
      call += 1
      if (call === 1) return [phase, () => {}] // phase
      return [false, () => {}] // poke / dismissed
    },
  }
  const component = definition.factory((name) => (name === 'react' ? scripted : {}))
  // re-register with this stub to grab the component
  const captured = []
  component.apply({
    slots: {
      inject: (slot, callback) => callback(),
      register: (options, comp) => {
        captured.push(comp)
        return () => {}
      },
    },
  })
  const tree = captured[0]({ useSessions: (selector) => selector({ byId: { a: { running } } }) })
  return JSON.stringify(tree, (key, value) => (typeof value === 'symbol' ? String(value) : value))
}

const idle = render('idle', false)
assert.ok(idle.includes('dp-root dp-idle'), 'idle phase renders')
assert.ok(idle.includes('data:image/png;base64'), 'pet artwork is inlined in the tree')

const source = fs.readFileSync(path.join(root, 'client.js'), 'utf8')
assert.ok(source.includes('data:audio/mpeg;base64'), 'voice clip is inlined in the module')

const working = render('working', true)
assert.ok(working.includes('dp-root dp-working'), 'working phase renders')
assert.ok(working.includes('思考中'), 'working phase shows its bubble')

const done = render('done', false)
assert.ok(done.includes('dp-root dp-done'), 'done phase renders')
assert.ok(done.includes('搞定啦'), 'done phase shows its bubble')

console.log('client smoke test: ok')
