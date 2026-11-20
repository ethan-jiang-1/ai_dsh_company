// 状态：常驻
// 何时跑：content 合同/成员/两个消费者变化后；pnpm test:checks 自动发现。
// 证明边界：tracked content × 合成包 envelope × 真实 Adapter；不证明安装或模型行为。
import assert from 'node:assert/strict'
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { after, test } from 'node:test'
import { contentProblems } from '../../checks/gates/content-manifest.mjs'
import { checkShippedPackage } from '../../tools/lib/release/shipped-shape.mjs'
import { caseCounts, cloneWorld, contentCases, contentWorld, ROOT, shippedInput, textFiles } from '../support/content-worlds.mjs'

const workspaceTmp = join(ROOT, 'runtime/tmp')
mkdirSync(workspaceTmp, { recursive: true })
const arena = mkdtempSync(join(workspaceTmp, 'content-family-'))
const sourceRoot = join(arena, 'source')
const contentDir = join(sourceRoot, 'packages/company-pack/content')
const contractFile = join(ROOT, 'tools/lib/company/content-contract.mjs')
const gateFile = join(ROOT, 'checks/gates/content-manifest.mjs')
const shippedFile = join(ROOT, 'tools/lib/release/shipped-shape.mjs')
let previousFiles = {}
let generation = 0

function removeCreated(path) {
  const target = resolve(path)
  assert.ok(target.startsWith(`${resolve(arena)}/`) && resolve(arena).startsWith(`${resolve(workspaceTmp)}/content-family-`), `unexpected cleanup: ${target}`)
  rmSync(target, { recursive: true, force: true })
}
function sourceInput(world) {
  const files = textFiles(world)
  for (const rel of Object.keys(previousFiles)) if (!(rel in files)) removeCreated(join(contentDir, rel))
  for (const [rel, text] of Object.entries(files)) {
    if (previousFiles[rel] === text) continue
    const path = join(contentDir, rel)
    assert.ok(resolve(path).startsWith(`${resolve(contentDir)}/`))
    mkdirSync(dirname(path), { recursive: true })
    writeFileSync(path, text)
  }
  previousFiles = files
  return sourceRoot
}
function result(world, source = contentProblems, shipped = checkShippedPackage) {
  return { source: source(sourceInput(world)).problems, shipped: shipped(shippedInput(world)) }
}
function acceptance(world, expected, source, shipped) {
  const actual = result(world, source, shipped)
  for (const [consumer, problems] of Object.entries(actual)) assert.equal(problems.length === 0, expected, `${consumer}: ${problems.slice(0, 3).join(';')}`)
  return actual
}
function replaceOnce(text, from, to) {
  assert.equal(text.split(from).length, 2, `mutation anchor must be unique: ${from}`)
  return text.replace(from, to)
}
function rewrite(source, original, contractUrl) {
  return source.replace(/((?:import|export)\s+(?:[^'"]*?\s+from\s+)?|import\s*\(\s*)(['"])(\.\.?\/[^'"]+)\2/g,
    (_full, prefix, quote, rel) => {
      const path = resolve(dirname(original), rel)
      return `${prefix}${quote}${path === contractFile ? contractUrl : pathToFileURL(path).href}${quote}`
    }).replaceAll('import.meta.url', JSON.stringify(pathToFileURL(original).href))
}
async function adapters({ contractFrom, contractTo, gateFrom, gateTo, shippedFrom, shippedTo } = {}) {
  const dir = join(arena, `modules-${generation++}`)
  mkdirSync(dir)
  let contract = readFileSync(contractFile, 'utf8')
  if (contractFrom) contract = replaceOnce(contract, contractFrom, contractTo)
  const marker = `generation-${generation}`
  const contractPath = join(dir, 'contract.mjs')
  writeFileSync(contractPath, `${rewrite(contract, contractFile)}\nexport const qualityMarker = ${JSON.stringify(marker)}\n`)
  const url = pathToFileURL(contractPath).href
  let gate = readFileSync(gateFile, 'utf8')
  let shipped = readFileSync(shippedFile, 'utf8')
  if (gateFrom) gate = replaceOnce(gate, gateFrom, gateTo)
  if (shippedFrom) shipped = replaceOnce(shipped, shippedFrom, shippedTo)
  const gatePath = join(dir, 'gate.mjs')
  const shippedPath = join(dir, 'shipped.mjs')
  const markerExport = `\nexport { qualityMarker } from ${JSON.stringify(url)}\n`
  writeFileSync(gatePath, rewrite(gate, gateFile, url) + markerExport)
  writeFileSync(shippedPath, rewrite(shipped, shippedFile, url) + markerExport)
  const sourceModule = await import(pathToFileURL(gatePath).href)
  const shippedModule = await import(pathToFileURL(shippedPath).href)
  assert.equal(sourceModule.qualityMarker, marker)
  assert.equal(shippedModule.qualityMarker, marker)
  return { source: sourceModule.contentProblems, shipped: shippedModule.checkShippedPackage }
}

{
  const base = contentWorld()
  test('真实两消费者：动态成员/目录/关系矩阵对独立期望同判', () => {
    const counts = {}
    for (const row of contentCases(base)) {
      try { acceptance(row.world, row.accept) } catch (error) { throw new Error(`${row.axis}:${row.member}: ${error.message}`, { cause: error }) }
      counts[row.axis] = (counts[row.axis] ?? 0) + 1
    }
    assert.deepEqual(counts, caseCounts(base))
    for (const [axis, count] of Object.entries(caseCounts(base))) assert.ok(count > 0, axis)
    console.log('content real Adapter matrix:', JSON.stringify({ source: counts, shipped: counts }))
  })

  test('未来成员加入后删除/空/漏登记自动入集，固定旧枚举负控会遗漏', () => {
    const future = cloneWorld(base)
    const rel = 'generic/quality-second-future.md'
    future.files[rel] = '# newly permitted member\n'
    future.manifest.inventory.push(rel)
    acceptance(future, true)
    const full = [...contentCases(future)]
    const witnesses = ['missing', 'empty', 'whitespace', 'unregistered'].map(axis => full.find(row => row.axis === axis && row.member === rel))
    for (const row of witnesses) { assert.ok(row); acceptance(row.world, false) }
    const requireWitnesses = rows => {
      for (const axis of ['missing', 'empty', 'whitespace', 'unregistered']) assert.ok(rows.some(row => row.axis === axis && row.member === rel), `${axis}: future witness missing`)
    }
    requireWitnesses(full)
    assert.throws(() => requireWitnesses([...contentCases(base)]), /future witness missing/)
  })

  test('共享模板兼作seed源和delivery entry时，同步改名更新所有声明引用', () => {
    const shared = cloneWorld(base)
    const oldRel = 'delivery-modes/managed-service/templates/sla.md'
    const rulesRel = 'delivery-modes/managed-service/delivery-rules.json'
    const seedRel = 'kb-setup/seed.json'
    const rules = JSON.parse(shared.files[rulesRel])
    rules.entry = 'templates/sla.md'
    shared.files[rulesRel] = JSON.stringify(rules)
    const seed = JSON.parse(shared.files[seedRel])
    seed.seeds.push({ source: oldRel, target: '.dsh-company/kb/quality-template.md' })
    shared.files[seedRel] = JSON.stringify(seed)
    acceptance(shared, true)
    const row = [...contentCases(shared)].find(item => item.axis === 'template-renamed' && item.member === `${rulesRel}:SLA`)
    assert.ok(row)
    acceptance(row.world, true)
    const stale = cloneWorld(row.world)
    const staleSeed = JSON.parse(stale.files[seedRel])
    staleSeed.seeds.at(-1).source = oldRel
    stale.files[seedRel] = JSON.stringify(staleSeed)
    acceptance(stale, false)
  })

  test('三共享分支定向变异：合法仍收，目标坏世界在两个消费者均漏收', async () => {
    const mutations = [
      ['version', 'if (manifest.version !== CONTENT_VERSION)', 'if (false)', world => { world.manifest.version = 999 }],
      ['reverse-inventory', 'if (!seen.has(rel)) problems.push', 'if (false) problems.push', world => { world.files['generic/quality-unlisted.md'] = '# unlisted\n' }],
      ['json-contract', 'for (const problem of contentJsonProblems({ rel, value, files }))', 'for (const problem of [])', world => { world.files['delivery-modes/managed-service/delivery-rules.json'] = '{}' }],
    ]
    for (const [name, from, to, change] of mutations) {
      const mutant = await adapters({ contractFrom: from, contractTo: to })
      const bad = cloneWorld(base)
      change(bad)
      acceptance(base, true, mutant.source, mutant.shipped)
      acceptance(bad, false)
      acceptance(bad, true, mutant.source, mutant.shipped)
      assert.throws(() => acceptance(bad, false, mutant.source, mutant.shipped), /true !== false/)
      console.log(`KILLED ${name}: source + shipped; valid controls pass`)
    }
  })

  test('分别删除两个消费者共享调用：本消费者漏收，另一消费者仍拒绝', async () => {
    const gateFrom = 'const problems = contentManifestProblems({'
    const shippedFrom = 'for (const problem of contentManifestProblems({'
    const sourceClone = readFileSync(gateFile, 'utf8')
    const shippedClone = readFileSync(shippedFile, 'utf8')
    const gateEnd = 'requiredDirs: requiredContentDirs(),\n  })'
    const shippedEnd = 'read: rel => read(`package/content/${rel}`),\n      }))'
    // Unique complete calls rather than replacing a name/import or a no-op branch.
    const gateCall = sourceClone.slice(sourceClone.indexOf(gateFrom), sourceClone.indexOf(gateEnd) + gateEnd.length)
    const shippedCall = shippedClone.slice(shippedClone.indexOf(shippedFrom), shippedClone.indexOf(shippedEnd) + shippedEnd.length)
    assert.ok(gateCall.startsWith(gateFrom) && gateCall.endsWith(gateEnd))
    assert.ok(shippedCall.startsWith(shippedFrom) && shippedCall.endsWith(shippedEnd))
    const bad = cloneWorld(base)
    bad.manifest.version = 999
    acceptance(bad, false)
    for (const consumer of ['source', 'shipped']) {
      const mutant = await adapters(consumer === 'source' ? { gateFrom: gateCall, gateTo: 'const problems = []' } : { shippedFrom: shippedCall, shippedTo: 'for (const problem of [])' })
      acceptance(base, true, mutant.source, mutant.shipped)
      const actual = result(bad, mutant.source, mutant.shipped)
      assert.equal(actual[consumer].length, 0)
      assert.ok(actual[consumer === 'source' ? 'shipped' : 'source'].length > 0)
      assert.throws(() => acceptance(bad, false, mutant.source, mutant.shipped), /true !== false/)
      console.log(`KILLED ${consumer} call removal; other Adapter still rejects`)
    }
  })
}

after(() => {
  assert.ok(resolve(arena).startsWith(`${resolve(workspaceTmp)}/content-family-`))
  rmSync(arena, { recursive: true, force: true })
})
