// Test inputs shared by the pure contract spec and real Adapter checks.
// Expectations describe transformations, never derive from the checker result.
import assert from 'node:assert/strict'
import { readdirSync, readFileSync } from 'node:fs'
import { join, posix } from 'node:path'
import { fileURLToPath } from 'node:url'
import { REQUIRED_CONTENT_FILES } from '../../tools/lib/company/content-contract.mjs'

export const ROOT = fileURLToPath(new URL('../../', import.meta.url))

export function contentWorld() {
  const files = {}
  const walk = (dir, prefix = '') => {
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      const rel = prefix + entry.name
      if (entry.isDirectory()) walk(join(dir, entry.name), `${rel}/`)
      else if (entry.isFile()) files[rel] = readFileSync(join(dir, entry.name), 'utf8')
      else assert.fail(`baseline must contain ordinary files: ${rel}`)
    }
  }
  walk(join(ROOT, 'packages/company-pack/content'))
  const manifest = JSON.parse(files['manifest.json'])
  delete files['manifest.json']
  assert.ok(manifest.inventory.length > 0)
  assert.deepEqual([...manifest.inventory].sort(), Object.keys(files).sort())
  return { files, manifest }
}

export function cloneWorld(world) { return structuredClone(world) }
export function textFiles(world) { return { ...world.files, 'manifest.json': JSON.stringify(world.manifest) } }
export function contractInput(world) {
  return { manifest: world.manifest, files: Object.keys(world.files), read: rel => world.files[rel] }
}

export function withoutMembers(world, predicate, sync = false) {
  for (const rel of Object.keys(world.files)) if (predicate(rel)) delete world.files[rel]
  if (sync) {
    world.manifest.inventory = world.manifest.inventory.filter(rel => !predicate(rel))
    for (const tier of Object.keys(world.manifest.tiers)) {
      world.manifest.tiers[tier] = world.manifest.tiers[tier].filter(rel => !predicate(rel))
    }
  }
}

function changeJson(world, rel, mutate) {
  const value = JSON.parse(world.files[rel])
  mutate(value)
  world.files[rel] = JSON.stringify(value)
}

/** Lazy per-world construction keeps mutation local and includes newly registered members. */
export function* contentCases(base) {
  function row(axis, member, accept, mutate) {
    const world = cloneWorld(base)
    mutate(world)
    return { axis, member, accept, world }
  }
  yield row('baseline', 'all', true, () => {})
  for (const rel of base.manifest.inventory) {
    yield row('missing', rel, false, world => withoutMembers(world, file => file === rel))
    yield row('unregistered', rel, false, world => {
      world.manifest.inventory = world.manifest.inventory.filter(file => file !== rel)
      for (const tier of Object.keys(world.manifest.tiers)) world.manifest.tiers[tier] = world.manifest.tiers[tier].filter(file => file !== rel)
    })
    for (const empty of ['', ' \n\t']) {
      yield row(empty === '' ? 'empty' : 'whitespace', rel, false, world => { world.files[rel] = empty })
    }
  }
  for (const rel of REQUIRED_CONTENT_FILES) {
    yield row('required-synced-removal', rel, false, world => withoutMembers(world, file => file === rel, true))
  }
  const dirs = [...new Set(REQUIRED_CONTENT_FILES.map(rel => posix.dirname(rel)).filter(dir => dir !== '.'))]
  for (const dir of dirs) {
    yield row('required-directory', dir, false, world => withoutMembers(world, rel => rel.startsWith(`${dir}/`), true))
  }
  const future = 'generic/quality-future-member.md'
  assert.equal(base.files[future], undefined, 'future witness must be new')
  yield row('future-registered', future, true, world => { world.files[future] = '# future\n'; world.manifest.inventory.push(future) })
  yield row('unregistered', future, false, world => { world.files[future] = '# future\n' })
  yield row('version', 'missing', false, world => { delete world.manifest.version })
  yield row('version', 'future', false, world => { world.manifest.version = 999 })
  yield row('duplicate', 'inventory', false, world => { world.manifest.inventory.push(world.manifest.inventory[0]) })
  yield row('tier', 'dangling', false, world => { (world.manifest.tiers.t2 ??= []).push('generic/quality-missing.md') })
  for (const path of ['/escape.md', 'C:/escape.md', '..\\escape.md', 'a/../escape.md', 'a\0b.md']) {
    yield row('unsafe-path', path, false, world => { world.manifest.inventory.push(path) })
  }
  const required = new Set(REQUIRED_CONTENT_FILES)
  for (const rel of base.manifest.inventory.filter(file => file.endsWith('.json'))) {
    const kind = rel.endsWith('delivery-rules.json') ? 'delivery' : rel.endsWith('seed.json') ? 'seed' : rel.endsWith('check-rules.json') ? 'checks' : undefined
    yield row('json-syntax', rel, false, world => { world.files[rel] = '{' })
    if (!kind) continue
    yield row('json-schema', rel, false, world => { world.files[rel] = '{}' })
    if (kind === 'delivery') {
      const rules = JSON.parse(base.files[rel])
      yield row('delivery-entry', rel, false, world => changeJson(world, rel, value => { value.entry = 'quality-missing.md' }))
      for (const [key, doc] of Object.entries(rules.documents)) {
        yield row('template-dangling', `${rel}:${key}`, false, world => changeJson(world, rel, value => { value.documents[key].template = 'templates/quality-missing.md' }))
        const oldRel = `${posix.dirname(rel)}/${doc.template}`
        if (required.has(oldRel)) continue
        yield row('template-renamed', `${rel}:${key}`, true, world => {
          const newRel = `${posix.dirname(oldRel)}/quality-renamed-${posix.basename(oldRel)}`
          assert.equal(world.files[newRel], undefined)
          world.files[newRel] = world.files[oldRel]
          delete world.files[oldRel]
          world.manifest.inventory = world.manifest.inventory.map(file => file === oldRel ? newRel : file)
          for (const tier of Object.keys(world.manifest.tiers)) world.manifest.tiers[tier] = world.manifest.tiers[tier].map(file => file === oldRel ? newRel : file)
          // Update every declared content reference to this template, including shared refs.
          for (const jsonRel of Object.keys(world.files).filter(file => file.endsWith('delivery-rules.json') || file.endsWith('seed.json'))) {
            changeJson(world, jsonRel, value => {
              if (jsonRel.endsWith('seed.json')) {
                for (const seed of value.seeds) if (seed.source === oldRel) seed.source = newRel
              } else {
                const dir = posix.dirname(jsonRel)
                if (posix.normalize(`${dir}/${value.entry}`) === oldRel) value.entry = posix.relative(dir, newRel)
                for (const entry of Object.values(value.documents)) {
                  if (posix.normalize(`${dir}/${entry.template}`) === oldRel) entry.template = posix.relative(dir, newRel)
                }
              }
            })
          }
        })
      }
    } else if (kind === 'seed') {
      const seeds = JSON.parse(base.files[rel]).seeds
      for (const [index] of seeds.entries()) {
        yield row('seed-source', `${rel}:${index}`, false, world => changeJson(world, rel, value => { value.seeds[index].source = 'state/quality-missing.md' }))
        yield row('seed-target', `${rel}:${index}`, false, world => changeJson(world, rel, value => { value.seeds[index].target = '.dsh-company/../escape.md' }))
      }
    } else {
      const rules = JSON.parse(base.files[rel])
      for (const layer of rules.layers) {
        yield row('check-layer', `${rel}:${layer}`, false, world => changeJson(world, rel, value => { delete value.files[layer] }))
      }
      for (const fileKey of Object.keys(rules.files)) {
        yield row('check-file', `${rel}:${fileKey}`, false, world => changeJson(world, rel, value => { value.files[fileKey] = {} }))
      }
      yield row('check-default-outside', rel, false, world => changeJson(world, rel, value => { value.defaultLayers = [...(value.defaultLayers ?? []), 'QUALITY_MISSING_LAYER'] }))
      for (const layer of rules.defaultLayers ?? []) {
        yield row('check-default-layer-removed', `${rel}:${layer}`, false, world => changeJson(world, rel, value => { value.layers = value.layers.filter(item => item !== layer) }))
      }
    }
  }
}

/** Independent domain cardinalities: a skipped axis or truncated loop cannot silently green. */
export function caseCounts(base) {
  const inventory = base.manifest.inventory
  const jsons = inventory.filter(rel => rel.endsWith('.json'))
  const deliveries = jsons.filter(rel => rel.endsWith('delivery-rules.json'))
  const checks = jsons.filter(rel => rel.endsWith('check-rules.json'))
  const seeds = jsons.filter(rel => rel.endsWith('seed.json'))
  const countItems = (rels, select) => rels.reduce((count, rel) => count + select(JSON.parse(base.files[rel]), rel), 0)
  return {
    baseline: 1, missing: inventory.length, empty: inventory.length, whitespace: inventory.length,
    unregistered: inventory.length + 1,
    'required-synced-removal': REQUIRED_CONTENT_FILES.length,
    'required-directory': new Set(REQUIRED_CONTENT_FILES.map(rel => posix.dirname(rel)).filter(dir => dir !== '.')).size,
    'future-registered': 1, version: 2, duplicate: 1, tier: 1, 'unsafe-path': 5,
    'json-syntax': jsons.length, 'json-schema': deliveries.length + checks.length + seeds.length,
    'delivery-entry': deliveries.length,
    'template-dangling': countItems(deliveries, value => Object.keys(value.documents).length),
    'template-renamed': countItems(deliveries, (value, rel) => Object.values(value.documents).filter(doc => !REQUIRED_CONTENT_FILES.includes(`${posix.dirname(rel)}/${doc.template}`)).length),
    'seed-source': countItems(seeds, value => value.seeds.length), 'seed-target': countItems(seeds, value => value.seeds.length),
    'check-layer': countItems(checks, value => value.layers.length),
    'check-file': countItems(checks, value => Object.keys(value.files).length),
    'check-default-outside': checks.length,
    'check-default-layer-removed': countItems(checks, value => (value.defaultLayers ?? []).length),
  }
}

/** Non-content envelope is synthetic and small; all content bytes come from tracked sources. */
export function shippedInput(world) {
  const content = textFiles(world)
  // Read the actual combination targets; the envelope never invents product roles.
  const pkgSource = JSON.parse(readFileSync(join(ROOT, 'packages/company-pack/package.json'), 'utf8'))
  const targets = pkgSource.dsh.bundle.patch
  assert.ok(targets.length > 0)
  const texts = {
    'package/lib/index.js': 'export const x = 1\n',
    'package/lib/client.js': 'require("@deepseek-ai/dsh-client-ui-primitives")\n',
    'package/lib/types/index.d.ts': 'export declare const x: number\n',
    'package/lib/types/client/index.d.ts': 'export declare const x: number\n',
    'package/README.md': '# pack\n',
    'package/LICENSE': 'MIT\n',
    'package/locale/zh.json': '{}',
    'package/locale/en.json': '{}',
    ...Object.fromEntries(targets.map(rel => [`package/${rel.replace(/^\.\//, '')}`, 'id: quality-fixture\n'])),
    ...Object.fromEntries(Object.entries(content).map(([rel, text]) => [`package/content/${rel}`, text])),
  }
  const pkg = {
    name: 'dsh-company-pack', version: '0.0.0', main: 'lib/index.js',
    exports: { '.': { types: './lib/types/index.d.ts', default: './lib/index.js' }, './client': { types: './lib/types/client/index.d.ts', default: './lib/client.js' } },
    files: ['lib/index.js', 'lib/client.js', 'content/**', 'presets/**', 'locale/*.json', 'cordis.patch.yml', 'LICENSE'],
    peerDependencies: { '@deepseek-ai/dsh-client-ui-primitives': '^0.2.1-rc.2' },
    dsh: { bundle: { patch: targets }, client: { inject: ['@deepseek-ai/dsh-client-ui-primitives'], platform: 'web' } },
  }
  return { pkg, entries: Object.keys(texts), read: rel => texts[rel] ?? '', platformModules: ['@deepseek-ai/dsh-client-ui-primitives'] }
}
